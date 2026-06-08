// script.js — Portal de Produtividade (completo)

/* ═══════════════════════════════════════
   HELPERS
═══════════════════════════════════════ */
const uid = () => Math.random().toString(36).slice(2,9);
const esc = s => String(s||'').replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt = d => new Date(d).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
const today = () => new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});
const ls = { get:(k,d=[])=>{ try{ return JSON.parse(localStorage.getItem(k))??d; }catch{ return d; }}, set:(k,v)=>localStorage.setItem(k,JSON.stringify(v)) };

function notify(msg, timeout=2000){
  const n = document.getElementById('notification');
  if(!n) return;
  n.textContent = msg;
  n.style.opacity = '1';
  clearTimeout(n._t);
  n._t = setTimeout(()=>n.style.opacity='0', timeout);
}

/* ═══════════════════════════════════════
   TABS — NAVEGAÇÃO PRINCIPAL
═══════════════════════════════════════ */
function initTabs(tabSelector, panelActivator){
  const btns = Array.from(document.querySelectorAll(tabSelector));
  btns.forEach((btn,i)=>{
    btn.addEventListener('click',()=>{
      btns.forEach(b=>{ b.classList.remove('active'); b.setAttribute('aria-selected','false'); b.tabIndex=-1; });
      btn.classList.add('active');
      btn.setAttribute('aria-selected','true');
      btn.tabIndex=0;
      panelActivator(btn);
    });
    btn.addEventListener('keydown',e=>{
      const dir = e.key==='ArrowRight'||e.key==='ArrowDown'?1:e.key==='ArrowLeft'||e.key==='ArrowUp'?-1:null;
      if(dir){ const nb=btns[(i+dir+btns.length)%btns.length]; nb.focus(); nb.click(); e.preventDefault(); }
      if(e.key==='Home'){ btns[0].focus(); btns[0].click(); e.preventDefault(); }
      if(e.key==='End'){ btns[btns.length-1].focus(); btns[btns.length-1].click(); e.preventDefault(); }
    });
  });
}

/* ═══════════════════════════════════════
   DOMContentLoaded
═══════════════════════════════════════ */
document.addEventListener('DOMContentLoaded',()=>{

  /* ── Main tabs ── */
  initTabs('nav[role="tablist"] .tab-btn', btn=>{
    document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
    const id = btn.dataset.tab;
    const panel = document.getElementById(id);
    if(panel) panel.classList.add('active');
    if(id==='historico') renderHistorico();
  });

  /* ── Finance tabs ── */
  initTabs('.finance-tabs .ftab', btn=>{
    document.querySelectorAll('.fin-panel').forEach(p=>p.classList.remove('active'));
    const panel = document.getElementById(btn.dataset.fin);
    if(panel) panel.classList.add('active');
    if(btn.dataset.fin==='categ') renderCategChart();
  });

  /* ── Diary date ── */
  const dd = document.getElementById('diaryDate');
  if(dd) dd.textContent = today();

  initTodos();
  initNotes();
  initFinances();
  initCateg();
  initMetaFin();
  initCalc();
  initAgenda();
  initMetas();
  initHabitos();
  initIdeias();
  initDiary();
  initTimer();

});

/* ═══════════════════════════════════════
   TODOS (Casa)
═══════════════════════════════════════ */
function initTodos(){
  let todos = ls.get('todos');
  const input  = document.getElementById('todoInput');
  const addBtn = document.getElementById('addTodoBtn');
  const list   = document.getElementById('todoList');
  const empty  = document.getElementById('todoEmpty');

  function render(){
    empty.style.display = todos.length?'none':'';
    list.innerHTML = todos.map((t,i)=>`
      <div class="item-card${t.done?' done':''}" role="listitem">
        <div class="item-text">
          ${esc(t.text)}
          <div class="item-meta">${fmt(t.createdAt)}</div>
        </div>
        <div class="item-actions">
          <button onclick="todoToggle(${i})" title="${t.done?'Reabrir':'Concluir'}">${t.done?'↺':'✓'}</button>
          <button class="btn-danger" onclick="todoDelete(${i})" title="Excluir">✕</button>
        </div>
      </div>`).join('');
    ls.set('todos',todos);
  }

  window.todoToggle = i=>{ todos[i].done=!todos[i].done; render(); };
  window.todoDelete = i=>{ todos.splice(i,1); render(); notify('Tarefa removida'); };

  function add(){
    const v=input.value.trim(); if(!v) return;
    todos.unshift({id:uid(),text:v,done:false,createdAt:Date.now()});
    input.value=''; render(); notify('Tarefa adicionada ✓');
  }
  addBtn.addEventListener('click',add);
  input.addEventListener('keydown',e=>{ if(e.key==='Enter') add(); });
  render();
}

/* ═══════════════════════════════════════
   NOTES (Trabalho)
═══════════════════════════════════════ */
function initNotes(){
  let notes = ls.get('notes');
  const titleInput = document.getElementById('noteTitleInput');
  const addBtn     = document.getElementById('addNoteBtn');
  const list       = document.getElementById('noteList');
  const empty      = document.getElementById('noteEmpty');

  function render(){
    empty.style.display = notes.length?'none':'';
    list.innerHTML = notes.map((n,i)=>`
      <div class="note-card">
        <div class="note-title">
          <span>${esc(n.title)}</span>
          <button class="btn-danger" onclick="noteDelete(${i})" title="Excluir">✕</button>
        </div>
        <textarea placeholder="Escreva aqui..." rows="3" onblur="noteUpdate(${i},this.value)">${esc(n.text)}</textarea>
        <div style="font-size:11px;color:#bbb;margin-top:6px">${fmt(n.createdAt)}</div>
      </div>`).join('');
    ls.set('notes',notes);
  }

  window.noteDelete = i=>{ notes.splice(i,1); render(); notify('Nota removida'); };
  window.noteUpdate = (i,v)=>{ notes[i].text=v; ls.set('notes',notes); };

  function add(){
    const v=titleInput.value.trim(); if(!v) return;
    notes.unshift({id:uid(),title:v,text:'',createdAt:Date.now()});
    titleInput.value=''; render(); notify('Nota criada ✓');
  }
  addBtn.addEventListener('click',add);
  titleInput.addEventListener('keydown',e=>{ if(e.key==='Enter') add(); });
  render();
}

/* ═══════════════════════════════════════
   TIMER (Trabalho)
═══════════════════════════════════════ */
function initTimer(){
  let seconds=25*60, interval=null, running=false;
  const display  = document.getElementById('timerDisplay');
  const timerBtn = document.getElementById('timerBtn');
  const resetBtn = document.getElementById('resetBtn');
  const preset   = document.getElementById('timerPreset');

  const fmt2 = s=>{ const m=Math.floor(s/60),sec=s%60; return `${m}:${sec<10?'0':''}${sec}`; };
  const update = ()=>{ if(display) display.textContent=fmt2(seconds); };

  window.setTimerPreset = ()=>{ seconds=parseInt(preset.value)*60; update(); };

  function start(){
    if(running) return;
    running=true;
    timerBtn.textContent='⏸ Pausar';
    interval=setInterval(()=>{
      seconds--;
      update();
      if(seconds<=0){
        clearInterval(interval); interval=null; running=false;
        timerBtn.textContent='▶ Iniciar';
        notify('⏰ Tempo esgotado!');
      }
    },1000);
  }
  function pause(){
    clearInterval(interval); interval=null; running=false;
    timerBtn.textContent='▶ Iniciar';
  }
  function reset(){
    pause(); seconds=parseInt(preset.value)*60; update();
  }

  timerBtn.addEventListener('click',()=>running?pause():start());
  resetBtn.addEventListener('click',reset);
  update();
}

/* ═══════════════════════════════════════
   FINANCES — Fluxo de Caixa
═══════════════════════════════════════ */
function initFinances(){
  let fins = ls.get('finances');
  const desc    = document.getElementById('finDesc');
  const val     = document.getElementById('finValue');
  const addBtn  = document.getElementById('addFinBtn');
  const list    = document.getElementById('financeList');
  const empty   = document.getElementById('finEmpty');
  const balance = document.getElementById('balanceDisplay');

  function render(){
    empty.style.display = fins.length?'none':'';
    list.innerHTML = fins.map((f,i)=>`
      <div class="finance-item">
        <div>
          <div style="font-size:14px;font-weight:500">${esc(f.desc)}</div>
          <div style="font-size:11px;color:#bbb">${fmt(f.createdAt)}</div>
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          <span class="fin-val ${f.val<0?'neg':'pos'}">R$ ${Math.abs(f.val).toFixed(2)}</span>
          <button class="btn-danger" onclick="finDelete(${i})">✕</button>
        </div>
      </div>`).join('');
    const total=fins.reduce((s,x)=>s+x.val,0);
    balance.textContent=`Saldo: R$ ${total.toFixed(2)}`;
    balance.style.color=total<0?'#c0392b':'#1a7a4a';
    ls.set('finances',fins);
  }

  window.finDelete = i=>{ fins.splice(i,1); render(); notify('Removido'); };

  function add(){
    const d=desc.value.trim(), v=parseFloat(val.value);
    if(!d||isNaN(v)){ notify('Preencha descrição e valor ⚠️'); return; }
    fins.unshift({id:uid(),desc:d,val:v,createdAt:Date.now()});
    desc.value=''; val.value=''; render(); notify('Lançado ✓');
  }
  addBtn.addEventListener('click',add);
  val.addEventListener('keydown',e=>{ if(e.key==='Enter') add(); });
  render();
}

/* ═══════════════════════════════════════
   FINANCES — Categorias + Gráfico
═══════════════════════════════════════ */
let categChart=null;
function initCateg(){
  let categs = ls.get('categs');
  const desc   = document.getElementById('categDesc');
  const val    = document.getElementById('categValue');
  const cat    = document.getElementById('categCat');
  const addBtn = document.getElementById('addCategBtn');
  const list   = document.getElementById('categList');
  const empty  = document.getElementById('categEmpty');

  function render(){
    empty.style.display = categs.length?'none':'';
    list.innerHTML = categs.map((c,i)=>`
      <div class="finance-item">
        <div>
          <div style="font-size:14px;font-weight:500">${esc(c.desc)}</div>
          <div style="font-size:12px;color:#888">${esc(c.cat)}</div>
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          <span class="fin-val neg">R$ ${parseFloat(c.val).toFixed(2)}</span>
          <button class="btn-danger" onclick="categDelete(${i})">✕</button>
        </div>
      </div>`).join('');
    ls.set('categs',categs);
    renderCategChart();
  }

  window.categDelete = i=>{ categs.splice(i,1); render(); };

  function add(){
    const d=desc.value.trim(), v=parseFloat(val.value), c=cat.value;
    if(!d||isNaN(v)||v<=0){ notify('Preencha os campos ⚠️'); return; }
    categs.unshift({id:uid(),desc:d,val:v,cat:c,createdAt:Date.now()});
    desc.value=''; val.value=''; render(); notify('Gasto adicionado ✓');
  }
  addBtn.addEventListener('click',add);
  render();
}

window.renderCategChart = function(){
  const categs = ls.get('categs');
  const canvas  = document.getElementById('categChart');
  if(!canvas) return;
  const totals={};
  categs.forEach(c=>{ totals[c.cat]=(totals[c.cat]||0)+parseFloat(c.val); });
  const labels=Object.keys(totals), data=Object.values(totals);
  const colors=['#1e4d8c','#FF6B1A','#2a9d8f','#e9c46a','#e76f51','#264653','#a8dadc'];
  if(categChart) categChart.destroy();
  if(!labels.length) return;
  categChart = new Chart(canvas,{
    type:'doughnut',
    data:{ labels, datasets:[{ data, backgroundColor:colors.slice(0,labels.length), borderWidth:2, borderColor:'#fff' }] },
    options:{ plugins:{ legend:{ position:'bottom', labels:{ font:{ size:12 }, padding:12 } } }, cutout:'60%' }
  });
};

/* ═══════════════════════════════════════
   FINANCES — Meta de Economia
═══════════════════════════════════════ */
function initMetaFin(){
  let metas = ls.get('metasFin');
  const nome   = document.getElementById('metaNome');
  const alvo   = document.getElementById('metaAlvo');
  const addBtn = document.getElementById('addMetaFinBtn');
  const list   = document.getElementById('metaFinList');
  const empty  = document.getElementById('metaFinEmpty');

  function render(){
    empty.style.display = metas.length?'none':'';
    list.innerHTML = metas.map((m,i)=>{
      const pct = Math.min(100,Math.round((m.atual/m.alvo)*100));
      return `<div class="meta-fin-card">
        <div class="meta-fin-title">
          <span>🏦 ${esc(m.nome)}</span>
          <button class="btn-danger" onclick="metaFinDelete(${i})">✕</button>
        </div>
        <div style="font-size:13px;color:#555;margin-bottom:8px">
          R$ ${m.atual.toFixed(2)} / R$ ${m.alvo.toFixed(2)} — <strong>${pct}%</strong>
        </div>
        <div class="progress-bar-bg"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
        <div class="aporte-row">
          <input type="number" placeholder="Depositar R$" id="mfin-dep-${i}" style="max-width:130px"/>
          <button onclick="metaFinDeposit(${i})">+ Depositar</button>
        </div>
      </div>`;
    }).join('');
    ls.set('metasFin',metas);
  }

  window.metaFinDelete  = i=>{ metas.splice(i,1); render(); };
  window.metaFinDeposit = i=>{
    const input=document.getElementById(`mfin-dep-${i}`);
    const v=parseFloat(input.value);
    if(isNaN(v)||v<=0){ notify('Valor inválido ⚠️'); return; }
    metas[i].atual=Math.min(metas[i].alvo, metas[i].atual+v);
    render(); notify('Depósito registrado ✓');
  };

  function add(){
    const n=nome.value.trim(), a=parseFloat(alvo.value);
    if(!n||isNaN(a)||a<=0){ notify('Preencha os campos ⚠️'); return; }
    metas.unshift({id:uid(),nome:n,alvo:a,atual:0});
    nome.value=''; alvo.value=''; render(); notify('Meta criada ✓');
  }
  addBtn.addEventListener('click',add);
  render();
}

/* ═══════════════════════════════════════
   CALCULADORA (Simulador)
═══════════════════════════════════════ */
function initCalc(){
  document.getElementById('calculateBtn').addEventListener('click',()=>{
    const P = parseFloat(document.getElementById('calcInit').value)||0;
    const M = parseFloat(document.getElementById('calcMonthly').value)||0;
    const annual = (parseFloat(document.getElementById('calcRate').value)||0)/100;
    const months = Math.round(parseFloat(document.getElementById('calcTime').value)||0);
    const r = Math.pow(1+annual,1/12)-1;
    let bal=P;
    for(let i=0;i<months;i++) bal=bal*(1+r)+M;
    document.getElementById('calcResult').textContent=`Valor final em ${months} meses: R$ ${bal.toFixed(2)}`;
  });
}

/* ═══════════════════════════════════════
   AGENDA SEMANAL
═══════════════════════════════════════ */
const DIAS = ['Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado','Domingo'];

function initAgenda(){
  let eventos = ls.get('agenda');
  const diaEl    = document.getElementById('agendaDia');
  const horaEl   = document.getElementById('agendaHora');
  const eventoEl = document.getElementById('agendaEvento');
  const addBtn   = document.getElementById('addAgendaBtn');
  const view     = document.getElementById('agendaView');
  const empty    = document.getElementById('agendaEmpty');

  function render(){
    empty.style.display = eventos.length?'none':'';
    view.innerHTML = DIAS.map(dia=>{
      const evts = eventos.filter(e=>e.dia===dia).sort((a,b)=>a.hora.localeCompare(b.hora));
      if(!evts.length) return '';
      return `<div class="agenda-day">
        <div class="agenda-day-title">📅 ${dia}</div>
        ${evts.map((e,i)=>`
          <div class="agenda-event">
            <span class="evt-time">${esc(e.hora)}</span>
            <span class="evt-name">${esc(e.nome)}</span>
            <button class="btn-danger" onclick="agendaDelete('${e.id}')" style="padding:3px 8px;font-size:12px">✕</button>
          </div>`).join('')}
      </div>`;
    }).join('');
    ls.set('agenda',eventos);
  }

  window.agendaDelete = id=>{ eventos=eventos.filter(e=>e.id!==id); render(); notify('Evento removido'); };

  function add(){
    const d=diaEl.value, h=horaEl.value, n=eventoEl.value.trim();
    if(!n){ notify('Digite o nome do evento ⚠️'); return; }
    eventos.push({id:uid(),dia:d,hora:h,nome:n});
    eventoEl.value=''; render(); notify('Evento adicionado ✓');
  }
  addBtn.addEventListener('click',add);
  eventoEl.addEventListener('keydown',e=>{ if(e.key==='Enter') add(); });
  render();
}

/* ═══════════════════════════════════════
   METAS
═══════════════════════════════════════ */
function initMetas(){
  let metas = ls.get('metas');
  const texto  = document.getElementById('metaTexto');
  const total  = document.getElementById('metaTotal');
  const unid   = document.getElementById('metaUnidade');
  const addBtn = document.getElementById('addMetaBtn');
  const list   = document.getElementById('metaList');
  const empty  = document.getElementById('metaEmpty');

  function render(){
    empty.style.display = metas.length?'none':'';
    list.innerHTML = metas.map((m,i)=>{
      const pct=Math.min(100,Math.round((m.atual/m.total)*100));
      return `<div class="meta-card">
        <div class="meta-card-header">
          <span class="meta-card-title">${esc(m.texto)}</span>
          <div style="display:flex;align-items:center;gap:8px">
            <span class="meta-card-prog">${m.atual} / ${m.total} ${esc(m.unid)} (${pct}%)</span>
            <button class="btn-danger" onclick="metaDelete(${i})" style="padding:4px 8px;font-size:12px">✕</button>
          </div>
        </div>
        <div class="progress-bar-bg"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
        <div class="meta-increment">
          <input type="number" id="meta-inc-${i}" placeholder="Incrementar..." style="max-width:120px"/>
          <button onclick="metaIncrement(${i})">+ Adicionar progresso</button>
          ${pct>=100?'<span style="color:#1a7a4a;font-size:13px;font-weight:600">✓ Concluída!</span>':''}
        </div>
      </div>`;
    }).join('');
    ls.set('metas',metas);
  }

  window.metaDelete    = i=>{ metas.splice(i,1); render(); notify('Meta removida'); };
  window.metaIncrement = i=>{
    const v=parseFloat(document.getElementById(`meta-inc-${i}`).value);
    if(isNaN(v)||v<=0){ notify('Valor inválido ⚠️'); return; }
    metas[i].atual=Math.min(metas[i].total, metas[i].atual+v);
    render(); notify('Progresso atualizado ✓');
  };

  function add(){
    const t=texto.value.trim(), tot=parseFloat(total.value), u=unid.value.trim()||'un';
    if(!t||isNaN(tot)||tot<=0){ notify('Preencha os campos ⚠️'); return; }
    metas.unshift({id:uid(),texto:t,total:tot,atual:0,unid:u});
    texto.value=''; total.value=''; unid.value=''; render(); notify('Meta criada ✓');
  }
  addBtn.addEventListener('click',add);
  render();
}

/* ═══════════════════════════════════════
   HÁBITOS DIÁRIOS
═══════════════════════════════════════ */
function initHabitos(){
  let habitos = ls.get('habitos');
  const input  = document.getElementById('habitoInput');
  const addBtn = document.getElementById('addHabitoBtn');
  const list   = document.getElementById('habitoList');
  const empty  = document.getElementById('habitoEmpty');
  const todayKey = new Date().toDateString();

  function render(){
    empty.style.display = habitos.length?'none':'';
    list.innerHTML = habitos.map((h,i)=>{
      const done = h.lastDone===todayKey;
      return `<div class="habito-item${done?' done':''}">
        <input type="checkbox" ${done?'checked':''} onchange="habitoToggle(${i})" aria-label="Marcar hábito">
        <span class="hab-text">${esc(h.texto)}</span>
        <span class="habito-streak">🔥 ${h.streak} dias</span>
        <button class="btn-danger" onclick="habitoDelete(${i})" style="padding:4px 8px;font-size:12px">✕</button>
      </div>`;
    }).join('');
    ls.set('habitos',habitos);
  }

  window.habitoDelete = i=>{ habitos.splice(i,1); render(); notify('Hábito removido'); };
  window.habitoToggle = i=>{
    const h=habitos[i];
    if(h.lastDone===todayKey){
      h.lastDone=''; h.streak=Math.max(0,h.streak-1);
    } else {
      const yesterday=new Date(); yesterday.setDate(yesterday.getDate()-1);
      h.streak = h.lastDone===yesterday.toDateString() ? h.streak+1 : 1;
      h.lastDone=todayKey;
    }
    render();
  };

  function add(){
    const v=input.value.trim(); if(!v) return;
    habitos.unshift({id:uid(),texto:v,streak:0,lastDone:''});
    input.value=''; render(); notify('Hábito adicionado ✓');
  }
  addBtn.addEventListener('click',add);
  input.addEventListener('keydown',e=>{ if(e.key==='Enter') add(); });
  render();
}

/* ═══════════════════════════════════════
   IDEIAS
═══════════════════════════════════════ */
function initIdeias(){
  let ideias = ls.get('ideias');
  const input  = document.getElementById('ideiaInput');
  const addBtn = document.getElementById('addIdeiaBtn');
  const list   = document.getElementById('ideiaList');
  const empty  = document.getElementById('ideiaEmpty');

  function render(){
    empty.style.display = ideias.length?'none':'';
    list.innerHTML = ideias.map((id,i)=>`
      <div class="ideia-item">
        <div style="flex:1">
          <div class="ideia-text">${esc(id.texto)}</div>
          <div class="ideia-meta">${fmt(id.createdAt)}</div>
        </div>
        <button class="btn-danger" onclick="ideiaDelete(${i})" style="padding:4px 8px;font-size:12px;flex-shrink:0">✕</button>
      </div>`).join('');
    ls.set('ideias',ideias);
  }

  window.ideiaDelete = i=>{ ideias.splice(i,1); render(); notify('Ideia removida'); };

  function add(){
    const v=input.value.trim(); if(!v) return;
    ideias.unshift({id:uid(),texto:v,createdAt:Date.now()});
    input.value=''; render(); notify('Ideia registrada 💡');
  }
  addBtn.addEventListener('click',add);
  input.addEventListener('keydown',e=>{ if(e.key==='Enter') add(); });
  render();
}

/* ═══════════════════════════════════════
   DIÁRIO PESSOAL
═══════════════════════════════════════ */
function initDiary(){
  let entries = ls.get('diary');
  const addBtn = document.getElementById('addDiaryBtn');
  const list   = document.getElementById('diaryList');
  const empty  = document.getElementById('diaryEmpty');

  function render(){
    empty.style.display = entries.length?'none':'';
    list.innerHTML = entries.map((e,i)=>`
      <div class="diary-entry">
        <div class="diary-entry-header">
          <div>
            <div class="diary-entry-title">${esc(e.title)}</div>
            <div class="diary-entry-date">${fmt(e.createdAt)}</div>
          </div>
          <button class="btn-danger" onclick="diaryDelete(${i})" style="padding:4px 8px;font-size:12px">✕</button>
        </div>
        <div class="diary-entry-text">${esc(e.text).replace(/\n/g,'<br>')}</div>
      </div>`).join('');
    ls.set('diary',entries);
  }

  window.diaryDelete = i=>{ entries.splice(i,1); render(); notify('Entrada removida'); };

  addBtn.addEventListener('click',()=>{
    document.getElementById('diaryTitleInput').value='';
    document.getElementById('diaryTextInput').value='';
    document.getElementById('diaryModal').style.display='flex';
  });

  window.closeDiaryModal = ()=>{ document.getElementById('diaryModal').style.display='none'; };

  window.saveDiaryEntry = ()=>{
    const t=document.getElementById('diaryTitleInput').value.trim();
    const x=document.getElementById('diaryTextInput').value.trim();
    if(!t&&!x){ notify('Escreva algo ⚠️'); return; }
    entries.unshift({id:uid(),title:t||'Sem título',text:x,createdAt:Date.now()});
    render(); window.closeDiaryModal(); notify('Entrada salva 📔');
  };

  render();
}

/* ═══════════════════════════════════════
   HISTÓRICO DE PRODUTIVIDADE
═══════════════════════════════════════ */
function renderHistorico(){
  const todos   = ls.get('todos');
  const habitos = ls.get('habitos');
  const ideias  = ls.get('ideias');
  const diary   = ls.get('diary');
  const fins    = ls.get('finances');
  const metas   = ls.get('metas');
  const notes   = ls.get('notes');

  const todayKey = new Date().toDateString();
  const tarefasConcluidas = todos.filter(t=>t.done).length;
  const habitosHoje = habitos.filter(h=>h.lastDone===todayKey).length;
  const melhorStreak = habitos.reduce((m,h)=>Math.max(m,h.streak),0);
  const totalIdeias = ideias.length;
  const totalDiario = diary.length;
  const saldo = fins.reduce((s,f)=>s+f.val,0);
  const metasConcluidas = metas.filter(m=>m.atual>=m.total).length;

  const grid = document.getElementById('histGrid');
  const details = document.getElementById('histDetails');

  grid.innerHTML = [
    { val: tarefasConcluidas,  label: 'Tarefas concluídas' },
    { val: habitosHoje,        label: 'Hábitos hoje' },
    { val: melhorStreak+'d',   label: 'Melhor sequência' },
    { val: totalIdeias,        label: 'Ideias registradas' },
    { val: totalDiario,        label: 'Entradas no diário' },
    { val: metasConcluidas,    label: 'Metas concluídas' },
    { val: notes.length,       label: 'Notas criadas' },
    { val: `R$${saldo.toFixed(0)}`, label: 'Saldo financeiro' },
  ].map(c=>`
    <div class="hist-card">
      <div class="hist-val">${c.val}</div>
      <div class="hist-label">${c.label}</div>
    </div>`).join('');

  details.innerHTML = `
    <h3 class="sub-title" style="margin-top:8px">📋 Hábitos em andamento</h3>
    ${habitos.length ? habitos.map(h=>`
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f5f5f5;font-size:14px">
        <span>${esc(h.texto)}</span>
        <span style="color:#FF6B1A;font-weight:600">🔥 ${h.streak} dias</span>
      </div>`).join('') : '<p class="empty-msg">Nenhum hábito ainda.</p>'}
    <h3 class="sub-title" style="margin-top:20px">🎯 Metas em andamento</h3>
    ${metas.filter(m=>m.atual<m.total).length ? metas.filter(m=>m.atual<m.total).map(m=>{
      const pct=Math.min(100,Math.round((m.atual/m.total)*100));
      return `<div style="margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:5px">
          <span>${esc(m.texto)}</span><span style="color:#666">${pct}%</span>
        </div>
        <div class="progress-bar-bg"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
      </div>`;
    }).join('') : '<p class="empty-msg">Nenhuma meta em andamento.</p>'}
  `;
}
