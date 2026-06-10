// script.js — Portal de Produtividade (com login Google + Firebase + Google Calendar)

/* ═══════════════════════════════════════
   CONFIGURAÇÃO
═══════════════════════════════════════ */
const GCAL_API_KEY   = "AIzaSyAdCoTdFQ6vMdqAwlANNxd_vz90Ii6qvxs";
const GCAL_CLIENT_ID = "510073834567-ossj5sqfbetoj7glofqpmm4raqvduic2.apps.googleusercontent.com";

/* ═══════════════════════════════════════
   FIREBASE INIT
═══════════════════════════════════════ */
firebase.initializeApp({
  apiKey:            "AIzaSyCvAV2ypyjNeoV-f2e5_NQWTSJmwf6NWqs",
  authDomain:        "portal-produtividade.firebaseapp.com",
  databaseURL:       "https://portal-produtividade-default-rtdb.firebaseio.com",
  projectId:         "portal-produtividade",
  storageBucket:     "portal-produtividade.firebasestorage.app",
  messagingSenderId: "652975111490",
  appId:             "1:652975111490:web:2d9f3b216a5b44a8819cdb"
});
const auth = firebase.auth();
const db   = firebase.database();
let uid    = null;

/* ═══════════════════════════════════════
   HELPERS
═══════════════════════════════════════ */
const esc  = s => String(s||'').replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmtD = d => new Date(d).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
const today = () => new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});
const genId = () => Math.random().toString(36).slice(2,9);
const todayKey = () => new Date().toDateString();

function notify(msg, timeout=2200){
  const n = document.getElementById('notification');
  if(!n) return;
  n.textContent = msg;
  n.style.opacity = '1';
  clearTimeout(n._t);
  n._t = setTimeout(()=>n.style.opacity='0', timeout);
}

/* DB helpers */
const ref  = path => db.ref(`users/${uid}/${path}`);
const save = (path, val) => ref(path).set(val);
const push = (path, val) => ref(path).push(val);
const del  = path => ref(path).remove();

function listen(path, cb){
  ref(path).on('value', snap => cb(snap.val() || {}));
}

function objToArr(obj){ return Object.entries(obj||{}).map(([k,v])=>({_key:k,...v})); }

/* Moeda */
let moedaAtual = 'BRL';
const simbolo  = () => moedaAtual === 'BRL' ? 'R$' : 'US$';

window.setMoeda = m => {
  moedaAtual = m;
  document.getElementById('btnReal').classList.toggle('active', m==='BRL');
  document.getElementById('btnDolar').classList.toggle('active', m==='USD');
};

/* ═══════════════════════════════════════
   TABS
═══════════════════════════════════════ */
function initTabs(tabSel, panelFn){
  const btns = Array.from(document.querySelectorAll(tabSel));
  btns.forEach((btn,i)=>{
    btn.addEventListener('click',()=>{
      btns.forEach(b=>{ b.classList.remove('active'); b.setAttribute('aria-selected','false'); b.tabIndex=-1; });
      btn.classList.add('active'); btn.setAttribute('aria-selected','true'); btn.tabIndex=0;
      panelFn(btn);
    });
    btn.addEventListener('keydown',e=>{
      const dir = e.key==='ArrowRight'||e.key==='ArrowDown'?1:e.key==='ArrowLeft'||e.key==='ArrowUp'?-1:0;
      if(dir){ const nb=btns[(i+dir+btns.length)%btns.length]; nb.focus(); nb.click(); e.preventDefault(); }
    });
  });
}

/* ═══════════════════════════════════════
   LOGIN / AUTH
═══════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {

  const provider = new firebase.auth.GoogleAuthProvider();
  provider.addScope('https://www.googleapis.com/auth/calendar.events');

  document.getElementById('loginBtn').addEventListener('click', () => {
    auth.signInWithPopup(provider).catch(e => notify('Erro ao entrar: ' + e.message));
  });

  document.getElementById('logoutBtn').addEventListener('click', () => {
    auth.signOut().then(()=>{ location.reload(); });
  });

  auth.onAuthStateChanged(user => {
    if(user){
      uid = user.uid;
      document.getElementById('screen-login').style.display = 'none';
      document.getElementById('screen-app').style.display   = 'block';
      document.getElementById('userInfo').textContent = user.displayName + ' · ' + user.email;
      initApp();
    } else {
      document.getElementById('screen-login').style.display = '';
      document.getElementById('screen-app').style.display   = 'none';
    }
  });

});

/* ═══════════════════════════════════════
   INIT APP
═══════════════════════════════════════ */
function initApp(){
  initTabs('nav[role="tablist"] .tab-btn', btn => {
    document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
    const panel = document.getElementById(btn.dataset.tab);
    if(panel) panel.classList.add('active');
    if(btn.dataset.tab==='historico') renderHistorico();
  });

  initTabs('.finance-tabs .ftab', btn => {
    document.querySelectorAll('.fin-panel').forEach(p=>p.classList.remove('active'));
    const panel = document.getElementById(btn.dataset.fin);
    if(panel) panel.classList.add('active');
    if(btn.dataset.fin==='categ') setTimeout(renderCategChart, 100);
  });

  const dd = document.getElementById('diaryDate');
  if(dd) dd.textContent = today();

  initTodos();
  initPrestadores();
  initNotes();
  initTimer();
  initFinances();
  initCateg();
  initMetaFin();
  initCalc();
  initAgenda();
  initMetas();
  initHabitos();
  initIdeias();
  initDiary();
  loadGoogleLibs();
}

/* ═══════════════════════════════════════
   PRESTADORES
═══════════════════════════════════════ */
function initPrestadores(){
  const addBtn = document.getElementById('addPrestadorBtn');
  const list   = document.getElementById('prestadorList');
  const empty  = document.getElementById('prestadorEmpty');

  const espColor = { Encanador:'blue',Eletricista:'amber',Pintor:'coral',Diarista:'teal',Jardineiro:'green',Marceneiro:'amber',Pedreiro:'gray',Outros:'gray' };
  const badgeStyle = {
    blue:'background:#E6F1FB;color:#185FA5', amber:'background:#FAEEDA;color:#854F0B',
    coral:'background:#FAECE7;color:#993C1D', teal:'background:#E1F5EE;color:#0F6E56',
    green:'background:#EAF3DE;color:#3B6D11', gray:'background:#F1EFE8;color:#5F5E5A'
  };

  listen('prestadores', data => {
    const prestadores = objToArr(data).reverse();
    empty.style.display = prestadores.length?'none':'';
    list.innerHTML = prestadores.map(p=>{
      const ini = p.nome.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase();
      const bc  = badgeStyle[espColor[p.especialidade]||'gray'];
      return `<div class="item-card" style="cursor:pointer" onclick="detalhePrestador('${p._key}')">
        <div style="width:38px;height:38px;border-radius:50%;background:#E1F5EE;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:500;color:#0F6E56;flex-shrink:0">${ini}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:14px;font-weight:500;color:#000;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(p.nome)}</div>
          <div style="display:flex;gap:6px;margin-top:4px;flex-wrap:wrap">
            <span style="font-size:11px;padding:2px 8px;border-radius:20px;${bc}">${esc(p.especialidade)}</span>
            ${p.pixChave?'<span style="font-size:11px;padding:2px 8px;border-radius:20px;background:#EAF3DE;color:#3B6D11">Pix</span>':''}
            ${p.banco?'<span style="font-size:11px;padding:2px 8px;border-radius:20px;background:#E6F1FB;color:#185FA5">Banco</span>':''}
          </div>
        </div>
        <span style="font-size:18px;color:#aaa">›</span>
      </div>`;
    }).join('');
  });

  addBtn.addEventListener('click', () => {
    document.getElementById('prestadorModalTitle').textContent = 'Novo prestador';
    limparFormPrestador();
    window._editPrestadorKey = null;
    document.getElementById('prestadorModal').style.display = 'flex';
  });

  window.closePrestadorModal = () => document.getElementById('prestadorModal').style.display = 'none';

  window.detalhePrestador = k => {
    ref(`prestadores/${k}`).once('value', snap => {
      const p = snap.val();
      if(!p) return;
      const row = (label, val) => val ? `<div style="margin-bottom:10px"><div style="font-size:11px;color:#888;margin-bottom:2px">${label}</div><div style="font-size:14px;color:#000">${esc(val)}</div></div>` : '';
      const ini = p.nome.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase();

      document.getElementById('prestadorModal').style.display = 'flex';
      document.getElementById('prestadorModalTitle').textContent = p.nome;
      document.getElementById('prestadorModal').querySelector('.modal-box').innerHTML = `
        <div class="modal-header">
          <span class="modal-title">${esc(p.nome)}</span>
          <button class="modal-close" onclick="closePrestadorModal()">✕</button>
        </div>
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
          <div style="width:46px;height:46px;border-radius:50%;background:#E1F5EE;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:500;color:#0F6E56">${ini}</div>
          <span style="font-size:12px;padding:3px 10px;border-radius:20px;background:#E1F5EE;color:#0F6E56">${esc(p.especialidade)}</span>
        </div>
        ${row('Telefone / WhatsApp', p.telefone)}
        ${row('E-mail', p.email)}
        ${row('Endereço', p.endereco)}
        ${row('Bairro', p.bairro)}
        ${row('Cidade', p.cidade)}
        ${row('Observações', p.obs)}
        ${(p.pixChave||p.banco)?`
        <div style="background:#EAF3DE;border-radius:10px;padding:12px;margin-top:8px">
          <div style="font-size:12px;font-weight:700;color:#3B6D11;margin-bottom:8px">Dados financeiros</div>
          ${p.pixChave?`<div style="font-size:13px;color:#27500A;margin-bottom:4px"><strong>Pix (${esc(p.pixTipo||'')}):</strong> ${esc(p.pixChave)}</div>`:''}
          ${p.banco?`<div style="font-size:13px;color:#27500A;margin-bottom:2px">Banco: ${esc(p.banco)}</div>`:''}
          ${p.agencia?`<div style="font-size:13px;color:#27500A;margin-bottom:2px">Agência: ${esc(p.agencia)}</div>`:''}
          ${p.conta?`<div style="font-size:13px;color:#27500A">Conta: ${esc(p.conta)}</div>`:''}
        </div>`:''}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:16px">
          <button onclick="editarPrestador('${k}')" style="cursor:pointer">Editar</button>
          <button class="btn-danger" onclick="deletarPrestador('${k}')">Excluir</button>
        </div>`;
    });
  };

  window.editarPrestador = k => {
    ref(`prestadores/${k}`).once('value', snap => {
      const p = snap.val();
      if(!p) return;
      window._editPrestadorKey = k;
      document.getElementById('prestadorModal').style.display = 'none';
      setTimeout(()=>{
        limparFormPrestador();
        document.getElementById('pNome').value         = p.nome||'';
        document.getElementById('pEspecialidade').value= p.especialidade||'Outros';
        document.getElementById('pTelefone').value     = p.telefone||'';
        document.getElementById('pEmail').value        = p.email||'';
        document.getElementById('pEndereco').value     = p.endereco||'';
        document.getElementById('pBairro').value       = p.bairro||'';
        document.getElementById('pCidade').value       = p.cidade||'';
        document.getElementById('pPixTipo').value      = p.pixTipo||'CPF';
        document.getElementById('pPixChave').value     = p.pixChave||'';
        document.getElementById('pBanco').value        = p.banco||'';
        document.getElementById('pAgencia').value      = p.agencia||'';
        document.getElementById('pConta').value        = p.conta||'';
        document.getElementById('pObs').value          = p.obs||'';
        document.getElementById('prestadorModalTitle').textContent = 'Editar prestador';

        const box = document.getElementById('prestadorModal').querySelector('.modal-box');
        if(!box.querySelector('#pNome')) location.reload();
        document.getElementById('prestadorModal').style.display = 'flex';
      }, 100);
    });
  };

  window.deletarPrestador = k => {
    del(`prestadores/${k}`).then(()=>{ closePrestadorModal(); notify('Prestador removido'); });
  };

  window.salvarPrestador = () => {
    const nome = document.getElementById('pNome').value.trim();
    if(!nome){ notify('Digite o nome do prestador ⚠️'); return; }
    const dados = {
      nome,
      especialidade: document.getElementById('pEspecialidade').value,
      telefone:      document.getElementById('pTelefone').value.trim(),
      email:         document.getElementById('pEmail').value.trim(),
      endereco:      document.getElementById('pEndereco').value.trim(),
      bairro:        document.getElementById('pBairro').value.trim(),
      cidade:        document.getElementById('pCidade').value.trim(),
      pixTipo:       document.getElementById('pPixTipo').value,
      pixChave:      document.getElementById('pPixChave').value.trim(),
      banco:         document.getElementById('pBanco').value.trim(),
      agencia:       document.getElementById('pAgencia').value.trim(),
      conta:         document.getElementById('pConta').value.trim(),
      obs:           document.getElementById('pObs').value.trim(),
    };
    if(window._editPrestadorKey){
      ref(`prestadores/${window._editPrestadorKey}`).update(dados);
      notify('Prestador atualizado ✓');
    } else {
      push('prestadores', dados);
      notify('Prestador salvo ✓');
    }
    closePrestadorModal();
    window._editPrestadorKey = null;
  };
}

function limparFormPrestador(){
  ['pNome','pTelefone','pEmail','pEndereco','pBairro','pCidade','pPixChave','pBanco','pAgencia','pConta','pObs'].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.value='';
  });
}

/* ═══════════════════════════════════════
   TODOS
═══════════════════════════════════════ */
function initTodos(){
  const input  = document.getElementById('todoInput');
  const addBtn = document.getElementById('addTodoBtn');
  const list   = document.getElementById('todoList');
  const empty  = document.getElementById('todoEmpty');

  listen('todos', data => {
    const todos = objToArr(data).reverse();
    empty.style.display = todos.length?'none':'';
    list.innerHTML = todos.map(t=>`
      <div class="item-card${t.done?' done':''}">
        <div class="item-text">${esc(t.text)}<div class="item-meta">${fmtD(t.createdAt)}</div></div>
        <div class="item-actions">
          <button onclick="todoToggle('${t._key}',${!t.done})">${t.done?'↺':'✓'}</button>
          <button class="btn-danger" onclick="todoDelete('${t._key}')">✕</button>
        </div>
      </div>`).join('');
  });

  window.todoToggle = (k,v) => ref(`todos/${k}/done`).set(v);
  window.todoDelete = k => del(`todos/${k}`).then(()=>notify('Tarefa removida'));

  function add(){
    const v=input.value.trim(); if(!v) return;
    push('todos',{text:v,done:false,createdAt:Date.now()});
    input.value=''; notify('Tarefa adicionada ✓');
  }
  addBtn.addEventListener('click',add);
  input.addEventListener('keydown',e=>{ if(e.key==='Enter') add(); });
}

/* ═══════════════════════════════════════
   NOTES
═══════════════════════════════════════ */
function initNotes(){
  const titleInput = document.getElementById('noteTitleInput');
  const addBtn     = document.getElementById('addNoteBtn');
  const list       = document.getElementById('noteList');
  const empty      = document.getElementById('noteEmpty');

  listen('notes', data => {
    const notes = objToArr(data).reverse();
    empty.style.display = notes.length?'none':'';
    list.innerHTML = notes.map(n=>`
      <div class="note-card">
        <div class="note-title">
          <span>${esc(n.title)}</span>
          <button class="btn-danger" onclick="noteDelete('${n._key}')">✕</button>
        </div>
        <textarea rows="3" onblur="noteUpdate('${n._key}',this.value)">${esc(n.text||'')}</textarea>
        <div style="font-size:11px;color:#bbb;margin-top:6px">${fmtD(n.createdAt)}</div>
      </div>`).join('');
  });

  window.noteDelete = k => del(`notes/${k}`).then(()=>notify('Nota removida'));
  window.noteUpdate = (k,v) => ref(`notes/${k}/text`).set(v);

  function add(){
    const v=titleInput.value.trim(); if(!v) return;
    push('notes',{title:v,text:'',createdAt:Date.now()});
    titleInput.value=''; notify('Nota criada ✓');
  }
  addBtn.addEventListener('click',add);
  titleInput.addEventListener('keydown',e=>{ if(e.key==='Enter') add(); });
}

/* ═══════════════════════════════════════
   TIMER
═══════════════════════════════════════ */
function initTimer(){
  let seconds=25*60, interval=null, running=false;
  const display  = document.getElementById('timerDisplay');
  const timerBtn = document.getElementById('timerBtn');
  const resetBtn = document.getElementById('resetBtn');
  const preset   = document.getElementById('timerPreset');

  const fmt2 = s=>{ const m=Math.floor(s/60),sc=s%60; return `${m}:${sc<10?'0':''}${sc}`; };
  const upd  = () => display.textContent = fmt2(seconds);

  window.setTimerPreset = () => { seconds=parseInt(preset.value)*60; upd(); };

  function start(){
    if(running) return;
    running=true; timerBtn.textContent='⏸ Pausar';
    interval=setInterval(()=>{
      seconds--; upd();
      if(seconds<=0){
        clearInterval(interval); interval=null; running=false;
        timerBtn.textContent='▶ Iniciar';
        notify('⏰ Tempo esgotado!');
      }
    },1000);
  }
  function pause(){ clearInterval(interval); interval=null; running=false; timerBtn.textContent='▶ Iniciar'; }
  function reset(){ pause(); seconds=parseInt(preset.value)*60; upd(); }

  timerBtn.addEventListener('click',()=>running?pause():start());
  resetBtn.addEventListener('click',reset);
  upd();
}

/* ═══════════════════════════════════════
   FINANCES — Fluxo
═══════════════════════════════════════ */
function initFinances(){
  const desc    = document.getElementById('finDesc');
  const val     = document.getElementById('finValue');
  const addBtn  = document.getElementById('addFinBtn');
  const list    = document.getElementById('financeList');
  const empty   = document.getElementById('finEmpty');
  const balance = document.getElementById('balanceDisplay');

  listen('finances', data => {
    const fins = objToArr(data).reverse();
    empty.style.display = fins.length?'none':'';
    const total = fins.reduce((s,f)=>s+f.val,0);
    list.innerHTML = fins.map(f=>`
      <div class="finance-item">
        <div>
          <div class="fin-desc">${esc(f.desc)}</div>
          <div style="font-size:11px;color:#999">${fmtD(f.createdAt)} · ${esc(f.moeda||'BRL')}</div>
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          <span class="fin-val ${f.val<0?'neg':'pos'}">${f.val<0?'-':''}${f.moeda==='USD'?'US$':'R$'} ${Math.abs(f.val).toFixed(2)}</span>
          <button class="btn-danger" onclick="finDelete('${f._key}')">✕</button>
        </div>
      </div>`).join('');
    balance.textContent = `Saldo: ${simbolo()} ${total.toFixed(2)}`;
    balance.style.color = total<0?'#c0392b':'#1a7a4a';
  });

  window.finDelete = k => del(`finances/${k}`).then(()=>notify('Removido'));

  function add(){
    const d=desc.value.trim(), v=parseFloat(val.value);
    if(!d||isNaN(v)){ notify('Preencha descrição e valor ⚠️'); return; }
    push('finances',{desc:d,val:v,moeda:moedaAtual,createdAt:Date.now()});
    desc.value=''; val.value=''; notify('Lançado ✓');
  }
  addBtn.addEventListener('click',add);
  val.addEventListener('keydown',e=>{ if(e.key==='Enter') add(); });
}

/* ═══════════════════════════════════════
   FINANCES — Categorias + Gráfico
═══════════════════════════════════════ */
let categChartInst = null;
function initCateg(){
  const desc   = document.getElementById('categDesc');
  const val    = document.getElementById('categValue');
  const cat    = document.getElementById('categCat');
  const addBtn = document.getElementById('addCategBtn');
  const list   = document.getElementById('categList');
  const empty  = document.getElementById('categEmpty');

  listen('categs', data => {
    const categs = objToArr(data).reverse();
    empty.style.display = categs.length?'none':'';
    list.innerHTML = categs.map(c=>`
      <div class="finance-item">
        <div>
          <div class="fin-desc">${esc(c.desc)}</div>
          <div style="font-size:12px;color:#888">${esc(c.cat)} · ${esc(c.moeda||'BRL')}</div>
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          <span class="fin-val neg">${c.moeda==='USD'?'US$':'R$'} ${parseFloat(c.val).toFixed(2)}</span>
          <button class="btn-danger" onclick="categDelete('${c._key}')">✕</button>
        </div>
      </div>`).join('');
    renderCategChart(categs);
  });

  window.categDelete = k => del(`categs/${k}`).then(()=>notify('Removido'));

  function add(){
    const d=desc.value.trim(), v=parseFloat(val.value), c=cat.value;
    if(!d||isNaN(v)||v<=0){ notify('Preencha os campos ⚠️'); return; }
    push('categs',{desc:d,val:v,cat:c,moeda:moedaAtual,createdAt:Date.now()});
    desc.value=''; val.value=''; notify('Gasto adicionado ✓');
  }
  addBtn.addEventListener('click',add);
}

window.renderCategChart = function(categs){
  if(!categs){ ref('categs').once('value', snap => renderCategChart(objToArr(snap.val()||{}))); return; }
  const canvas = document.getElementById('categChart');
  if(!canvas) return;
  const totals={};
  categs.forEach(c=>{ totals[c.cat]=(totals[c.cat]||0)+parseFloat(c.val); });
  const labels=Object.keys(totals), data=Object.values(totals);
  const colors=['#0d1f3c','#FF6B1A','#2a9d8f','#e9c46a','#e76f51','#264653','#a8dadc'];
  if(categChartInst) categChartInst.destroy();
  if(!labels.length) return;
  categChartInst = new Chart(canvas,{
    type:'doughnut',
    data:{ labels, datasets:[{ data, backgroundColor:colors.slice(0,labels.length), borderWidth:2, borderColor:'#fff' }] },
    options:{ plugins:{ legend:{ position:'bottom', labels:{ font:{size:12}, padding:12, color:'#000' } } }, cutout:'60%' }
  });
};

/* ═══════════════════════════════════════
   FINANCES — Meta de Economia
═══════════════════════════════════════ */
function initMetaFin(){
  const nome   = document.getElementById('metaNome');
  const alvo   = document.getElementById('metaAlvo');
  const addBtn = document.getElementById('addMetaFinBtn');
  const list   = document.getElementById('metaFinList');
  const empty  = document.getElementById('metaFinEmpty');

  listen('metasFin', data => {
    const metas = objToArr(data).reverse();
    empty.style.display = metas.length?'none':'';
    list.innerHTML = metas.map(m=>{
      const pct=Math.min(100,Math.round(((m.atual||0)/m.alvo)*100));
      return `<div class="meta-fin-card">
        <div class="meta-fin-title">
          <span>🏦 ${esc(m.nome)} <small style="font-weight:400;color:#555">(${esc(m.moeda||'BRL')})</small></span>
          <button class="btn-danger" onclick="metaFinDelete('${m._key}')">✕</button>
        </div>
        <div style="font-size:13px;color:#000;margin-bottom:8px">
          ${m.moeda==='USD'?'US$':'R$'} ${(m.atual||0).toFixed(2)} / ${m.moeda==='USD'?'US$':'R$'} ${m.alvo.toFixed(2)} — <strong>${pct}%</strong>
        </div>
        <div class="progress-bar-bg"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
        <div class="aporte-row">
          <input type="number" id="mfin-dep-${m._key}" placeholder="Depositar..." style="max-width:130px"/>
          <button onclick="metaFinDeposit('${m._key}',${m.alvo},${m.atual||0})">+ Depositar</button>
        </div>
      </div>`;
    }).join('');
  });

  window.metaFinDelete  = k => del(`metasFin/${k}`).then(()=>notify('Meta removida'));
  window.metaFinDeposit = (k,alvo,atual) => {
    const v=parseFloat(document.getElementById(`mfin-dep-${k}`).value);
    if(isNaN(v)||v<=0){ notify('Valor inválido ⚠️'); return; }
    ref(`metasFin/${k}/atual`).set(Math.min(alvo, atual+v));
    notify('Depósito registrado ✓');
  };

  function add(){
    const n=nome.value.trim(), a=parseFloat(alvo.value);
    if(!n||isNaN(a)||a<=0){ notify('Preencha os campos ⚠️'); return; }
    push('metasFin',{nome:n,alvo:a,atual:0,moeda:moedaAtual});
    nome.value=''; alvo.value=''; notify('Meta criada ✓');
  }
  addBtn.addEventListener('click',add);
}

/* ═══════════════════════════════════════
   CALCULADORA + CONVERSOR
═══════════════════════════════════════ */
function initCalc(){
  document.getElementById('calculateBtn').addEventListener('click',()=>{
    const P=parseFloat(document.getElementById('calcInit').value)||0;
    const M=parseFloat(document.getElementById('calcMonthly').value)||0;
    const r=Math.pow(1+(parseFloat(document.getElementById('calcRate').value)||0)/100,1/12)-1;
    const months=Math.round(parseFloat(document.getElementById('calcTime').value)||0);
    let bal=P;
    for(let i=0;i<months;i++) bal=bal*(1+r)+M;
    const s=simbolo();
    document.getElementById('calcResult').textContent=`Valor final em ${months} meses: ${s} ${bal.toFixed(2)}`;
  });

  document.getElementById('convertBtn').addEventListener('click',()=>{
    const v=parseFloat(document.getElementById('convValor').value)||0;
    const cot=parseFloat(document.getElementById('convCotacao').value)||1;
    const de=document.getElementById('convDe').value;
    const para=document.getElementById('convPara').value;
    const result=v*cot;
    const simDe  = de==='BRL'?'R$':de==='USD'?'US$':'€';
    const simPara = para==='BRL'?'R$':para==='USD'?'US$':'€';
    document.getElementById('convResult').textContent=`${simDe} ${v.toFixed(2)} = ${simPara} ${result.toFixed(2)}`;
  });
}

/* ═══════════════════════════════════════
   AGENDA + GOOGLE CALENDAR
═══════════════════════════════════════ */
const DIAS = ['Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado','Domingo'];

function initAgenda(){
  const diaEl    = document.getElementById('agendaDia');
  const horaEl   = document.getElementById('agendaHora');
  const eventoEl = document.getElementById('agendaEvento');
  const addBtn   = document.getElementById('addAgendaBtn');
  const syncBtn  = document.getElementById('syncCalBtn');
  const view     = document.getElementById('agendaView');
  const empty    = document.getElementById('agendaEmpty');

  listen('agenda', data => {
    const eventos = objToArr(data);
    empty.style.display = eventos.length?'none':'';
    view.innerHTML = DIAS.map(dia=>{
      const evts = eventos.filter(e=>e.dia===dia).sort((a,b)=>a.hora.localeCompare(b.hora));
      if(!evts.length) return '';
      return `<div class="agenda-day">
        <div class="agenda-day-title">📅 ${dia}</div>
        ${evts.map(e=>`
          <div class="agenda-event">
            <span class="evt-time">${esc(e.hora)}</span>
            <span class="evt-name">${esc(e.nome)}</span>
            <button class="btn-danger" onclick="agendaDelete('${e._key}')" style="padding:3px 8px;font-size:12px">✕</button>
          </div>`).join('')}
      </div>`;
    }).join('');
  });

  window.agendaDelete = k => del(`agenda/${k}`).then(()=>notify('Evento removido'));

  function add(){
    const d=diaEl.value, h=horaEl.value, n=eventoEl.value.trim();
    if(!n){ notify('Digite o nome do evento ⚠️'); return; }
    push('agenda',{dia:d,hora:h,nome:n,createdAt:Date.now()});
    eventoEl.value=''; notify('Evento adicionado ✓');
  }
  addBtn.addEventListener('click',add);
  eventoEl.addEventListener('keydown',e=>{ if(e.key==='Enter') add(); });

  syncBtn.addEventListener('click', sincronizarCalendar);
}

async function sincronizarCalendar(){
  if(!window._gapiReady||!window._gisReady){ notify('Aguarde o carregamento do Google...'); return; }
  notify('Autenticando com Google...');
  return new Promise(resolve=>{
    window._tokenClient.callback = async resp => {
      if(resp.error){ notify('Erro ao autenticar ⚠️'); resolve(); return; }
      ref('agenda').once('value', async snap => {
        const eventos = objToArr(snap.val()||{});
        if(!eventos.length){ notify('Nenhum evento para sincronizar'); resolve(); return; }
        let ok=0;
        for(const e of eventos){
          try{
            const diaIdx = DIAS.indexOf(e.dia);
            const hoje = new Date();
            const diff = (diaIdx - hoje.getDay() + 8) % 7 || 7;
            const d = new Date(hoje); d.setDate(hoje.getDate()+diff);
            const ds = d.toISOString().slice(0,10);
            const hh = parseInt(e.hora.split(':')[0]);
            const mm = e.hora.split(':')[1];
            const start = `${ds}T${e.hora}:00`;
            const end   = `${ds}T${String(hh+1).padStart(2,'0')}:${mm}:00`;
            await gapi.client.calendar.events.insert({
              calendarId:'primary',
              resource:{
                summary:`📅 ${e.nome}`,
                start:{ dateTime:start, timeZone:'America/Sao_Paulo' },
                end:  { dateTime:end,   timeZone:'America/Sao_Paulo' }
              }
            });
            ok++;
          }catch(err){ console.error(err); }
        }
        notify(`${ok} evento(s) enviados ao Google Calendar! 📅`);
        resolve();
      });
    };
    if(gapi.client.getToken()===null) window._tokenClient.requestAccessToken({prompt:'consent'});
    else window._tokenClient.requestAccessToken({prompt:''});
  });
}

/* ═══════════════════════════════════════
   GOOGLE LIBS (Calendar)
═══════════════════════════════════════ */
window._gapiReady = false;
window._gisReady  = false;

function loadGoogleLibs(){
  const s1=document.createElement('script');
  s1.src='https://apis.google.com/js/api.js';
  s1.onload=()=>gapi.load('client',async()=>{
    await gapi.client.init({ apiKey:GCAL_API_KEY, discoveryDocs:['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'] });
    window._gapiReady=true;
  });
  document.body.appendChild(s1);
  const s2=document.createElement('script');
  s2.src='https://accounts.google.com/gsi/client';
  s2.onload=()=>{
    window._tokenClient=google.accounts.oauth2.initTokenClient({
      client_id:GCAL_CLIENT_ID,
      scope:'https://www.googleapis.com/auth/calendar.events',
      callback:''
    });
    window._gisReady=true;
  };
  document.body.appendChild(s2);
}

/* ═══════════════════════════════════════
   METAS
═══════════════════════════════════════ */
function initMetas(){
  const texto  = document.getElementById('metaTexto');
  const total  = document.getElementById('metaTotal');
  const unid   = document.getElementById('metaUnidade');
  const addBtn = document.getElementById('addMetaBtn');
  const list   = document.getElementById('metaList');
  const empty  = document.getElementById('metaEmpty');

  listen('metas', data => {
    const metas = objToArr(data).reverse();
    empty.style.display = metas.length?'none':'';
    list.innerHTML = metas.map(m=>{
      const pct=Math.min(100,Math.round(((m.atual||0)/m.total)*100));
      return `<div class="meta-card">
        <div class="meta-card-header">
          <span class="meta-card-title">${esc(m.texto)}</span>
          <div style="display:flex;align-items:center;gap:8px">
            <span class="meta-card-prog">${m.atual||0} / ${m.total} ${esc(m.unid)} (${pct}%)</span>
            <button class="btn-danger" onclick="metaDelete('${m._key}')" style="padding:4px 8px;font-size:12px">✕</button>
          </div>
        </div>
        <div class="progress-bar-bg"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
        <div class="meta-increment">
          <input type="number" id="meta-inc-${m._key}" placeholder="Incrementar..." style="max-width:120px"/>
          <button onclick="metaIncrement('${m._key}',${m.total},${m.atual||0})">+ Progresso</button>
          ${pct>=100?'<span style="color:#1a7a4a;font-weight:700">✓ Concluída!</span>':''}
        </div>
      </div>`;
    }).join('');
  });

  window.metaDelete    = k => del(`metas/${k}`).then(()=>notify('Meta removida'));
  window.metaIncrement = (k,tot,atual) => {
    const v=parseFloat(document.getElementById(`meta-inc-${k}`).value);
    if(isNaN(v)||v<=0){ notify('Valor inválido ⚠️'); return; }
    ref(`metas/${k}/atual`).set(Math.min(tot, atual+v));
    notify('Progresso atualizado ✓');
  };

  function add(){
    const t=texto.value.trim(), tot=parseFloat(total.value), u=unid.value.trim()||'un';
    if(!t||isNaN(tot)||tot<=0){ notify('Preencha os campos ⚠️'); return; }
    push('metas',{texto:t,total:tot,atual:0,unid:u});
    texto.value=''; total.value=''; unid.value=''; notify('Meta criada ✓');
  }
  addBtn.addEventListener('click',add);
}

/* ═══════════════════════════════════════
   HÁBITOS
═══════════════════════════════════════ */
function initHabitos(){
  const input  = document.getElementById('habitoInput');
  const addBtn = document.getElementById('addHabitoBtn');
  const list   = document.getElementById('habitoList');
  const empty  = document.getElementById('habitoEmpty');
  const tk     = todayKey();

  listen('habitos', data => {
    const habitos = objToArr(data).reverse();
    empty.style.display = habitos.length?'none':'';
    list.innerHTML = habitos.map(h=>{
      const done=h.lastDone===tk;
      return `<div class="habito-item${done?' done':''}">
        <input type="checkbox" ${done?'checked':''} onchange="habitoToggle('${h._key}','${h.lastDone||''}',${h.streak||0})">
        <span class="hab-text">${esc(h.texto)}</span>
        <span class="habito-streak">🔥 ${h.streak||0} dias</span>
        <button class="btn-danger" onclick="habitoDelete('${h._key}')" style="padding:4px 8px;font-size:12px">✕</button>
      </div>`;
    }).join('');
  });

  window.habitoDelete = k => del(`habitos/${k}`).then(()=>notify('Hábito removido'));
  window.habitoToggle = (k,lastDone,streak) => {
    if(lastDone===tk){
      ref(`habitos/${k}`).update({lastDone:'',streak:Math.max(0,streak-1)});
    } else {
      const yesterday=new Date(); yesterday.setDate(yesterday.getDate()-1);
      const ns = lastDone===yesterday.toDateString() ? streak+1 : 1;
      ref(`habitos/${k}`).update({lastDone:tk,streak:ns});
    }
  };

  function add(){
    const v=input.value.trim(); if(!v) return;
    push('habitos',{texto:v,streak:0,lastDone:''});
    input.value=''; notify('Hábito adicionado ✓');
  }
  addBtn.addEventListener('click',add);
  input.addEventListener('keydown',e=>{ if(e.key==='Enter') add(); });
}

/* ═══════════════════════════════════════
   IDEIAS
═══════════════════════════════════════ */
function initIdeias(){
  const input  = document.getElementById('ideiaInput');
  const addBtn = document.getElementById('addIdeiaBtn');
  const list   = document.getElementById('ideiaList');
  const empty  = document.getElementById('ideiaEmpty');

  listen('ideias', data => {
    const ideias = objToArr(data).reverse();
    empty.style.display = ideias.length?'none':'';
    list.innerHTML = ideias.map(id=>`
      <div class="ideia-item">
        <div style="flex:1">
          <div class="ideia-text">${esc(id.texto)}</div>
          <div class="ideia-meta">${fmtD(id.createdAt)}</div>
        </div>
        <button class="btn-danger" onclick="ideiaDelete('${id._key}')" style="padding:4px 8px;font-size:12px;flex-shrink:0">✕</button>
      </div>`).join('');
  });

  window.ideiaDelete = k => del(`ideias/${k}`).then(()=>notify('Ideia removida'));

  function add(){
    const v=input.value.trim(); if(!v) return;
    push('ideias',{texto:v,createdAt:Date.now()});
    input.value=''; notify('Ideia registrada 💡');
  }
  addBtn.addEventListener('click',add);
  input.addEventListener('keydown',e=>{ if(e.key==='Enter') add(); });
}

/* ═══════════════════════════════════════
   DIÁRIO
═══════════════════════════════════════ */
function initDiary(){
  const addBtn = document.getElementById('addDiaryBtn');
  const list   = document.getElementById('diaryList');
  const empty  = document.getElementById('diaryEmpty');

  listen('diary', data => {
    const entries = objToArr(data).reverse();
    empty.style.display = entries.length?'none':'';
    list.innerHTML = entries.map(e=>`
      <div class="diary-entry">
        <div class="diary-entry-header">
          <div>
            <div class="diary-entry-title">${esc(e.title)}</div>
            <div class="diary-entry-date">${fmtD(e.createdAt)}</div>
          </div>
          <button class="btn-danger" onclick="diaryDelete('${e._key}')" style="padding:4px 8px;font-size:12px">✕</button>
        </div>
        <div class="diary-entry-text">${esc(e.text).replace(/\n/g,'<br>')}</div>
      </div>`).join('');
  });

  window.diaryDelete = k => del(`diary/${k}`).then(()=>notify('Entrada removida'));

  addBtn.addEventListener('click',()=>{
    document.getElementById('diaryTitleInput').value='';
    document.getElementById('diaryTextInput').value='';
    document.getElementById('diaryModal').style.display='flex';
  });

  window.closeDiaryModal = () => document.getElementById('diaryModal').style.display='none';
  window.saveDiaryEntry  = () => {
    const t=document.getElementById('diaryTitleInput').value.trim();
    const x=document.getElementById('diaryTextInput').value.trim();
    if(!t&&!x){ notify('Escreva algo ⚠️'); return; }
    push('diary',{title:t||'Sem título',text:x,createdAt:Date.now()});
    window.closeDiaryModal(); notify('Entrada salva 📔');
  };
}

/* ═══════════════════════════════════════
   HISTÓRICO
═══════════════════════════════════════ */
function renderHistorico(){
  const todos   = [];
  const habitos = [];
  const tk      = todayKey();
  let tarefasConcluidas=0, habitosHoje=0, melhorStreak=0;
  let totalIdeias=0, totalDiario=0, metasConcluidas=0, totalNotas=0;
  let saldo=0;

  Promise.all([
    ref('todos').once('value').then(s=>{ objToArr(s.val()).forEach(t=>{ if(t.done) tarefasConcluidas++; }); }),
    ref('habitos').once('value').then(s=>{ objToArr(s.val()).forEach(h=>{ if(h.lastDone===tk) habitosHoje++; melhorStreak=Math.max(melhorStreak,h.streak||0); }); }),
    ref('ideias').once('value').then(s=>{ totalIdeias=objToArr(s.val()).length; }),
    ref('diary').once('value').then(s=>{ totalDiario=objToArr(s.val()).length; }),
    ref('finances').once('value').then(s=>{ objToArr(s.val()).forEach(f=>saldo+=f.val); }),
    ref('metas').once('value').then(s=>{ objToArr(s.val()).forEach(m=>{ if((m.atual||0)>=m.total) metasConcluidas++; }); }),
    ref('notes').once('value').then(s=>{ totalNotas=objToArr(s.val()).length; }),
  ]).then(()=>{
    document.getElementById('histGrid').innerHTML = [
      { val:tarefasConcluidas, label:'Tarefas concluídas' },
      { val:habitosHoje,       label:'Hábitos hoje' },
      { val:melhorStreak+'d',  label:'Melhor sequência' },
      { val:totalIdeias,       label:'Ideias registradas' },
      { val:totalDiario,       label:'Entradas no diário' },
      { val:metasConcluidas,   label:'Metas concluídas' },
      { val:totalNotas,        label:'Notas criadas' },
      { val:`${simbolo()} ${saldo.toFixed(0)}`, label:'Saldo financeiro' },
    ].map(c=>`<div class="hist-card"><div class="hist-val">${c.val}</div><div class="hist-label">${c.label}</div></div>`).join('');

    ref('habitos').once('value').then(s=>{
      const habitos=objToArr(s.val()).reverse();
      ref('metas').once('value').then(sm=>{
        const metas=objToArr(sm.val()).filter(m=>(m.atual||0)<m.total);
        document.getElementById('histDetails').innerHTML = `
          <h3 class="sub-title" style="margin-top:8px">📋 Hábitos em andamento</h3>
          ${habitos.length ? habitos.map(h=>`
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f5f5f5;font-size:14px;color:#000">
              <span>${esc(h.texto)}</span>
              <span style="color:#FF6B1A;font-weight:700">🔥 ${h.streak||0} dias</span>
            </div>`).join('') : '<p class="empty-msg">Nenhum hábito.</p>'}
          <h3 class="sub-title" style="margin-top:20px">🎯 Metas em andamento</h3>
          ${metas.length ? metas.map(m=>{
            const pct=Math.min(100,Math.round(((m.atual||0)/m.total)*100));
            return `<div style="margin-bottom:12px">
              <div style="display:flex;justify-content:space-between;font-size:13px;color:#000;margin-bottom:5px">
                <span>${esc(m.texto)}</span><span>${pct}%</span>
              </div>
              <div class="progress-bar-bg"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
            </div>`;
          }).join('') : '<p class="empty-msg">Nenhuma meta em andamento.</p>'}`;
      });
    });
  });
}