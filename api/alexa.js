// Ponte entre a habilidade "meu portal" da Alexa e o Portal de Produtividade.
// Grava SOMENTE no usuário definido em ALEXA_USER_UID. Os demais usuários não são afetados.

import crypto from 'node:crypto';
import tls from 'node:tls';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';

// ---------- Firebase (acesso de administrador, só no servidor) ----------
function db() {
  if (!getApps().length) {
    initializeApp({
      credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
    });
  }
  return getDatabase();
}
const minhaRef = path => db().ref(`users/${process.env.ALEXA_USER_UID}/${path}`);

// Mesmo formato de data que o portal usa (toDateString), no fuso do Rio
function todayKey(offsetDias = 0) {
  const agora = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  agora.setDate(agora.getDate() + offsetDias);
  return agora.toDateString();
}

// ---------- Verificação de que o pedido veio mesmo da Amazon ----------
const certCache = new Map();

function urlDeCertificadoValida(raw) {
  try {
    const u = new URL(raw);
    return u.protocol === 'https:' &&
      u.hostname.toLowerCase() === 's3.amazonaws.com' &&
      (u.port === '' || u.port === '443') &&
      u.pathname.startsWith('/echo.api/');
  } catch { return false; }
}

async function carregarCadeia(url) {
  if (certCache.has(url)) return certCache.get(url);
  const pem = await (await fetch(url)).text();
  const blocos = pem.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g) || [];
  const cadeia = blocos.map(b => new crypto.X509Certificate(b));
  if (!cadeia.length) throw new Error('certificado vazio');

  const agora = Date.now();
  for (const c of cadeia) {
    if (agora < Date.parse(c.validFrom) || agora > Date.parse(c.validTo)) throw new Error('certificado fora da validade');
  }
  if (!(cadeia[0].subjectAltName || '').includes('DNS:echo-api.amazon.com')) throw new Error('SAN inválido');
  for (let i = 0; i < cadeia.length - 1; i++) {
    if (!cadeia[i].checkIssued(cadeia[i + 1]) || !cadeia[i].verify(cadeia[i + 1].publicKey)) throw new Error('cadeia quebrada');
  }
  const ultimo = cadeia[cadeia.length - 1];
  const confiavel = tls.rootCertificates.some(pemRaiz => {
    const raiz = new crypto.X509Certificate(pemRaiz);
    return raiz.fingerprint256 === ultimo.fingerprint256 ||
      (ultimo.checkIssued(raiz) && ultimo.verify(raiz.publicKey));
  });
  if (!confiavel) throw new Error('raiz não confiável');

  certCache.set(url, cadeia[0]);
  return cadeia[0];
}

async function pedidoDaAmazon(req, corpoBruto, corpo) {
  const url = req.headers['signaturecertchainurl'];
  const assinatura256 = req.headers['signature-256'];
  const assinatura = assinatura256 || req.headers['signature'];
  if (!url || !assinatura || !urlDeCertificadoValida(url)) return false;

  const certificado = await carregarCadeia(url);
  const ok = crypto
    .createVerify(assinatura256 ? 'RSA-SHA256' : 'RSA-SHA1')
    .update(corpoBruto)
    .verify(certificado.publicKey, assinatura, 'base64');
  if (!ok) return false;

  const idade = Math.abs(Date.now() - Date.parse(corpo?.request?.timestamp));
  return idade <= 150 * 1000;
}

function lerCorpoBruto(req) {
  return new Promise((resolve, reject) => {
    const partes = [];
    req.on('data', p => partes.push(p));
    req.on('end', () => resolve(Buffer.concat(partes).toString('utf8')));
    req.on('error', reject);
  });
}

// ---------- Respostas faladas ----------
function falar(texto, { continuar = false, pergunta } = {}) {
  const resposta = { outputSpeech: { type: 'PlainText', text: texto }, shouldEndSession: !continuar };
  if (continuar) resposta.reprompt = { outputSpeech: { type: 'PlainText', text: pergunta || 'O que você quer fazer?' } };
  return { version: '1.0', response: resposta };
}

// Depois de cada ação, a conversa continua aberta
const MAIS = 'Quer fazer mais alguma coisa?';
const feito = texto => falar(`${texto} ${MAIS}`, { continuar: true, pergunta: MAIS });

const semAcento = s => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const slot = (intent, nome) => intent?.slots?.[nome]?.value?.trim();

// ---------- O que cada comando faz ----------
async function anotarIdeia(intent) {
  const texto = slot(intent, 'texto');
  if (!texto) return falar('Qual é a ideia?', { continuar: true, pergunta: 'Diga: anota a ideia, e depois a ideia.' });
  await minhaRef('ideias').push({ texto, createdAt: Date.now() });
  return feito(`Anotei a ideia: ${texto}.`);
}

async function adicionarTarefa(intent) {
  const tarefa = slot(intent, 'tarefa');
  if (!tarefa) return falar('Qual é a tarefa?', { continuar: true, pergunta: 'Diga: adiciona a tarefa, e depois a tarefa.' });
  await minhaRef('todos').push({ text: tarefa, done: false, createdAt: Date.now() });
  return feito(`Tarefa adicionada: ${tarefa}.`);
}

async function marcarHabito(intent) {
  const pedido = semAcento(slot(intent, 'habito'));
  const snap = await minhaRef('habitos').once('value');
  const habitos = Object.entries(snap.val() || {}).map(([k, h]) => ({ k, ...h }));
  if (!habitos.length) return falar('Você ainda não tem hábitos cadastrados. Diga: cria o hábito, e o nome do hábito.', { continuar: true, pergunta: MAIS });

  const nomes = habitos.map(h => h.texto).join(', ');
  if (!pedido) return falar(`Qual hábito? Seus hábitos são: ${nomes}.`, { continuar: true, pergunta: 'Qual hábito você quer marcar?' });

  const achado = habitos.find(h => semAcento(h.texto) === pedido) ||
    habitos.find(h => semAcento(h.texto).includes(pedido) || pedido.includes(semAcento(h.texto)));
  if (!achado) return falar(`Não encontrei esse hábito. Seus hábitos são: ${nomes}.`, { continuar: true, pergunta: 'Qual hábito você quer marcar?' });

  const hoje = todayKey();
  if (achado.lastDone === hoje) return feito(`${achado.texto} já está marcado hoje. Sequência de ${achado.streak || 0} dias.`);

  const streak = achado.lastDone === todayKey(-1) ? (achado.streak || 0) + 1 : 1;
  await minhaRef(`habitos/${achado.k}`).update({ lastDone: hoje, streak });
  return feito(`Marquei ${achado.texto}. Sequência de ${streak} ${streak === 1 ? 'dia' : 'dias'}!`);
}

async function criarHabito(intent) {
  let nome = slot(intent, 'habito');
  if (!nome) return falar('Qual hábito você quer criar?', { continuar: true, pergunta: 'Diga: cria o hábito, e o nome do hábito.' });
  nome = nome.charAt(0).toUpperCase() + nome.slice(1);

  const snap = await minhaRef('habitos').once('value');
  const jaExiste = Object.values(snap.val() || {}).find(h => semAcento(h.texto) === semAcento(nome));
  if (jaExiste) return feito(`Você já tem o hábito ${jaExiste.texto}.`);

  await minhaRef('habitos').push({ texto: nome, streak: 0, lastDone: '' }); // mesmo formato do portal
  return feito(`Hábito criado: ${nome}.`);
}

// ---------- Google Agenda (leitura) ----------
// Usa uma permissão permanente (refresh token) guardada nas variáveis do Vercel:
// GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN
async function tokenGoogle() {
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
      grant_type:    'refresh_token',
    }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error('Google recusou o token: ' + JSON.stringify(j));
  return j.access_token;
}

// Data AAAA-MM-DD no fuso de São Paulo
const dataSP = (offsetDias = 0) => {
  const d = new Date(Date.now() + offsetDias * 86400000);
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
};

function horaFalada(iso) {
  const [h, m] = new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }).split(':').map(Number);
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
}

// Tira emojis e símbolos do começo do título (ex.: "📅 Dentista" → "Dentista")
const limparTitulo = t => (t || 'sem título').replace(/^[^\p{L}\p{N}]+/u, '').trim() || 'sem título';

async function consultarAgenda(intent) {
  // {dia} é um slot AMAZON.DATE: "hoje", "amanhã", "sexta"... Sem dia = hoje.
  let dia = slot(intent, 'dia');
  if (!dia || !/^\d{4}-\d{2}-\d{2}$/.test(dia)) dia = dataSP(0);

  const nomeDia = dia === dataSP(0) ? 'Hoje' : dia === dataSP(1) ? 'Amanhã'
    : new Date(dia + 'T12:00:00-03:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Sao_Paulo' });

  const token = await tokenGoogle();
  const params = new URLSearchParams({
    timeMin: `${dia}T00:00:00-03:00`,
    timeMax: `${dia}T23:59:59-03:00`,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '20',
    timeZone: 'America/Sao_Paulo',
  });
  const r = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) throw new Error('Erro do Google Agenda: ' + r.status + ' ' + await r.text());
  const itens = ((await r.json()).items || []).filter(e => e.status !== 'cancelled');

  if (!itens.length) return feito(`${nomeDia} sua agenda está livre.`);

  const partes = itens.map(e => e.start.dateTime
    ? `às ${horaFalada(e.start.dateTime)}, ${limparTitulo(e.summary)}`
    : `o dia todo, ${limparTitulo(e.summary)}`);
  const n = itens.length;
  return feito(`${nomeDia} você tem ${n} ${n === 1 ? 'compromisso' : 'compromissos'}: ${partes.join('; ')}.`);
}

const AJUDA = 'Você pode dizer: o que tenho na agenda hoje, anota a ideia, adiciona a tarefa, cria o hábito, ou marca o hábito, seguido do que quiser.';

// ---------- Entrada principal ----------
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Use POST');

  try {
    const corpoBruto = await lerCorpoBruto(req);
    const corpo = JSON.parse(corpoBruto);

    const appId = corpo?.context?.System?.application?.applicationId || corpo?.session?.application?.applicationId;
    if (appId !== process.env.ALEXA_SKILL_ID) return res.status(403).send('Habilidade não autorizada');
    if (!(await pedidoDaAmazon(req, corpoBruto, corpo))) return res.status(400).send('Assinatura inválida');

    const pedido = corpo.request;
    let resposta;

    if (pedido.type === 'LaunchRequest') {
      resposta = falar(`Oi, Josana! Seu portal está aberto. ${AJUDA}`, { continuar: true, pergunta: AJUDA });
    } else if (pedido.type === 'IntentRequest') {
      const intent = pedido.intent;
      switch (intent.name) {
        case 'AnotarIdeiaIntent':     resposta = await anotarIdeia(intent); break;
        case 'AdicionarTarefaIntent': resposta = await adicionarTarefa(intent); break;
        case 'MarcarHabitoIntent':    resposta = await marcarHabito(intent); break;
        case 'CriarHabitoIntent':     resposta = await criarHabito(intent); break;
        case 'ConsultarAgendaIntent': resposta = await consultarAgenda(intent); break;
        case 'AMAZON.YesIntent':      resposta = falar(`Pode falar. ${AJUDA}`, { continuar: true, pergunta: AJUDA }); break;
        case 'AMAZON.HelpIntent':     resposta = falar(AJUDA, { continuar: true, pergunta: AJUDA }); break;
        case 'AMAZON.NoIntent':
        case 'AMAZON.StopIntent':
        case 'AMAZON.CancelIntent':   resposta = falar('Até logo!'); break;
        default:                      resposta = falar(`Não entendi. ${AJUDA}`, { continuar: true, pergunta: AJUDA });
      }
    } else {
      resposta = { version: '1.0', response: {} }; // SessionEndedRequest e outros
    }
    return res.status(200).json(resposta);
  } catch (erro) {
    console.error('Erro na Alexa:', erro);
    return res.status(200).json(falar('Desculpe, algo deu errado no portal. Tente de novo em instantes.'));
  }
}
