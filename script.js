// script.js - corrigido

/* ================= Helpers ================= */
const uid = (prefix='id') => `${prefix}-${Math.random().toString(36).slice(2,9)}`;
function ensureId(el, prefix='id'){ if(!el.id) el.id = uid(prefix); return el.id; }
function escapeHtml(s){ return String(s).replace(/[&<>"]/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function notify(msg, timeout=1600){
  const n = document.getElementById('notification');
  if(!n) return;
  n.textContent = msg;
  n.style.opacity = '1';
  clearTimeout(n._t);
  n._t = setTimeout(()=>{ n.style.opacity = '0'; }, timeout);
}

/* ================= Accessibility: Tabs Utilities ================= */
function setActiveGroup(button, selector){
  document.querySelectorAll(selector).forEach(b=>{
    const active = (b === button);
    b.classList.toggle('active', active);
    b.setAttribute('aria-selected', active ? 'true' : 'false');
    b.tabIndex = active ? 0 : -1;
  });
}

function activatePanelForTab(button){
  const targetId = button.getAttribute('aria-controls') || button.dataset.tab || button.dataset.target;
  if(!targetId) return;
  document.querySelectorAll('[role="tabpanel"]').forEach(p => p.classList.remove('active'));
  const panel = document.getElementById(targetId);
  if(panel){
    panel.classList.add('active');
    ensureId(button, 'tab');
    panel.setAttribute('aria-labelledby', button.id);
  }
}

function addKeyboardNavigation(selector){
  const buttons = Array.from(document.querySelectorAll(selector));
  if(!buttons.length) return;
  buttons.forEach((btn, idx) => {
    btn.addEventListener('keydown', (e) => {
      if(['ArrowRight','ArrowDown','ArrowLeft','ArrowUp','Home','End','Enter',' '].includes(e.key)){
        e.preventDefault();
      }
      if(e.key === 'ArrowRight' || e.key === 'ArrowDown'){
        const next = buttons[(idx+1) % buttons.length]; next.focus(); next.click();
      } else if(e.key === 'ArrowLeft' || e.key === 'ArrowUp'){
        const prev = buttons[(idx-1 + buttons.length) % buttons.length]; prev.focus(); prev.click();
      } else if(e.key === 'Home'){
        buttons[0].focus(); buttons[0].click();
      } else if(e.key === 'End'){
        buttons[buttons.length-1].focus(); buttons[buttons.length-1].click();
      } else if(e.key === 'Enter' || e.key === ' '){
        btn.click();
      }
    });
  });
}

function observeListItems(selector){
  const root = document.querySelector(selector);
  if(!root) return;
  const markAll = () => Array.from(root.children).forEach(ch => { if(!ch.hasAttribute('role')) ch.setAttribute('role','listitem'); });
  markAll();
  const mo = new MutationObserver(markAll);
  mo.observe(root, { childList: true });
}

/* ================= App Initialization ================= */
document.addEventListener('DOMContentLoaded', () => {

  /* -------- Main tabs (nav role=tablist) -------- */
  const mainNav = document.querySelector('nav[role="tablist"]');
  if(mainNav){
    const navBtns = Array.from(mainNav.querySelectorAll('.tab-btn'));
    navBtns.forEach(btn => {
      btn.setAttribute('role','tab');
      ensureId(btn, 'tab');
      let target = btn.getAttribute('aria-controls') || btn.dataset.tab || btn.dataset.target;
      if(!target){
        target = btn.textContent.trim().toLowerCase().replace(/\s+/g,'-');
        btn.dataset.target = target;
      }
      btn.setAttribute('aria-controls', target);
      const panel = document.getElementById(target);
      if(panel) panel.setAttribute('role','tabpanel');
      btn.addEventListener('click', () => {
        setActiveGroup(btn, 'nav[role="tablist"] .tab-btn');
        activatePanelForTab(btn);
      });
    });
    const active = mainNav.querySelector('.tab-btn.active') || navBtns[0];
    if(active){ setActiveGroup(active, 'nav[role="tablist"] .tab-btn'); activatePanelForTab(active); }
    addKeyboardNavigation('nav[role="tablist"] .tab-btn');
  }

  /* -------- Finance internal tabs -------- */
  // CORRIGIDO: usa data-finance-tab em vez de data-fin
  const financeTablist = document.querySelector('.finance-tabs');
  if(financeTablist){
    const fBtns = Array.from(financeTablist.querySelectorAll('[data-finance-tab]'));
    fBtns.forEach(btn => {
      btn.setAttribute('role','tab');
      ensureId(btn, 'finance-tab');
      const target = btn.getAttribute('aria-controls') || btn.dataset.financeTab;
      if(target) btn.setAttribute('aria-controls', target);
      btn.addEventListener('click', () => {
        fBtns.forEach(b => {
          const isActive = b === btn;
          b.classList.toggle('active', isActive);
          b.setAttribute('aria-selected', isActive ? 'true' : 'false');
          b.tabIndex = isActive ? 0 : -1;
          const tgt = b.getAttribute('aria-controls') || b.dataset.financeTab;
          if(tgt){
            const panel = document.getElementById(tgt);
            if(panel){
              panel.style.display = isActive ? 'block' : 'none';
              if(isActive) panel.setAttribute('aria-labelledby', b.id);
            }
          }
        });
      });
    });
    // Ativa o primeiro por padrão
    const activeF = financeTablist.querySelector('[data-finance-tab].active') || fBtns[0];
    if(activeF) activeF.click();
    addKeyboardNavigation('.finance-tabs [data-finance-tab]');
  }

  /* -------- Observe lists para role=listitem -------- */
  observeListItems('#todoList');
  observeListItems('#financeList');

  /* ================= TODOS (Casa) ================= */
  let todos = JSON.parse(localStorage.getItem('prod_todos')) || [];
  const todoInput   = document.getElementById('todoInput');
  const addTodoBtn  = document.getElementById('addTodoBtn');
  const todoListEl  = document.getElementById('todoList');
  const todoEmpty   = document.getElementById('todoEmpty');

  function renderTodos(){
    if(!todoListEl) return;
    if(!todos.length){
      todoListEl.innerHTML = '';
      if(todoEmpty) todoEmpty.style.display = '';
    } else {
      if(todoEmpty) todoEmpty.style.display = 'none';
      todoListEl.innerHTML = todos.map((t,i) => {
        const doneClass = t.done ? 'completed' : '';
        return `<div class="todo-item ${doneClass}" data-index="${i}" role="listitem">
          <span class="text" tabindex="0" data-index="${i}">${escapeHtml(t.text)}</span>
          <div style="display:flex;gap:8px">
            <button aria-label="${t.done? 'Desmarcar tarefa' : 'Marcar tarefa'}" data-action="toggle" data-index="${i}">${t.done? '↺':'✓'}</button>
            <button aria-label="Remover tarefa" data-action="delete" data-index="${i}">✖</button>
          </div>
        </div>`;
      }).join('');
    }
    localStorage.setItem('prod_todos', JSON.stringify(todos));
  }

  function addTodo(){
    const v = todoInput && todoInput.value.trim();
    if(!v) return;
    todos.push({ text: v, done: false });
    if(todoInput) todoInput.value = '';
    renderTodos();
    notify('Tarefa adicionada');
  }

  function toggleTodo(idx){ if(todos[idx]) todos[idx].done = !todos[idx].done; renderTodos(); }
  function deleteTodo(idx){ todos.splice(idx,1); renderTodos(); }

  if(addTodoBtn) addTodoBtn.addEventListener('click', addTodo);
  if(todoInput)  todoInput.addEventListener('keydown', e => { if(e.key==='Enter') addTodo(); });

  if(todoListEl){
    todoListEl.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action]');
      if(!btn) return;
      const action = btn.dataset.action;
      const idx = parseInt(btn.dataset.index,10);
      if(action === 'toggle') toggleTodo(idx);
      else if(action === 'delete') deleteTodo(idx);
    });
    todoListEl.addEventListener('keydown', (e) => {
      if(e.target.matches('.text') && (e.key === 'Enter' || e.key === ' ')){
        toggleTodo(parseInt(e.target.dataset.index,10));
      }
    });
  }
  renderTodos();

  /* ================= NOTES (Trabalho) ================= */
  const noteEditor  = document.getElementById('noteEditor');
  const wordCountEl = document.getElementById('wordCount');
  if(noteEditor) noteEditor.value = localStorage.getItem('prod_note') || '';

  function updateWordCount(){
    if(!noteEditor || !wordCountEl) return;
    const v = noteEditor.value.trim();
    wordCountEl.textContent = `Palavras: ${v ? v.split(/\s+/).filter(Boolean).length : 0}`;
  }
  if(noteEditor){
    noteEditor.addEventListener('input', () => {
      localStorage.setItem('prod_note', noteEditor.value);
      updateWordCount();
    });
  }
  updateWordCount();

  window.saveNote  = function(){ if(noteEditor) localStorage.setItem('prod_note', noteEditor.value||''); notify('Nota salva'); };
  window.clearNote = function(){ if(confirm('Limpar notas?')){ if(noteEditor) noteEditor.value=''; localStorage.removeItem('prod_note'); updateWordCount(); notify('Editor limpo'); } };

  /* ================= TIMER (Trabalho) ================= */
  // CORRIGIDO: usa os IDs corretos do HTML (timerBtn e resetBtn)
  let timerInterval = null;
  let timerRunning  = false;
  let timerSeconds  = 25 * 60;

  const timerDisplay = document.getElementById('timerDisplay');
  const timerBtn     = document.getElementById('timerBtn');   // "Iniciar Timer" no HTML
  const resetBtn     = document.getElementById('resetBtn');   // "Reset" no HTML

  function formatTimer(s){ const m = Math.floor(s/60); const sec = s%60; return `${m}:${sec<10?'0':''}${sec}`; }
  function updateTimerUI(){ if(timerDisplay) timerDisplay.textContent = formatTimer(timerSeconds); }

  function startTimer(){
    if(timerRunning) return;
    timerRunning = true;
    if(timerBtn) timerBtn.textContent = 'Pausar Timer';
    timerInterval = setInterval(() => {
      timerSeconds--;
      updateTimerUI();
      if(timerSeconds <= 0){
        clearInterval(timerInterval);
        timerInterval = null;
        timerRunning  = false;
        if(timerBtn) timerBtn.textContent = 'Iniciar Timer';
        notify('⏰ Tempo esgotado!');
      }
    }, 1000);
  }

  function pauseTimer(){
    clearInterval(timerInterval);
    timerInterval = null;
    timerRunning  = false;
    if(timerBtn) timerBtn.textContent = 'Iniciar Timer';
  }

  function resetTimer(){
    pauseTimer();
    timerSeconds = 25 * 60;
    updateTimerUI();
  }

  if(timerBtn) timerBtn.addEventListener('click', () => { timerRunning ? pauseTimer() : startTimer(); });
  if(resetBtn) resetBtn.addEventListener('click', resetTimer);

  updateTimerUI();

  /* ================= FINANCES ================= */
  // CORRIGIDO: todos os IDs agora batem com o HTML
  let finances = JSON.parse(localStorage.getItem('prod_finances')) || [];

  const finDesc        = document.getElementById('finDesc');
  const finAmount      = document.getElementById('finValue');      // id correto do HTML
  const addFinBtn      = document.getElementById('addFinanceBtn');
  const finListEl      = document.getElementById('financeList');
  const finEmpty       = document.getElementById('financeEmpty');
  const balanceDisplay = document.getElementById('balanceDisplay');

  function renderFinances(){
    if(!finListEl) return;
    if(!finances.length){
      finListEl.innerHTML = '';
      if(finEmpty) finEmpty.style.display = '';
    } else {
      if(finEmpty) finEmpty.style.display = 'none';
      finListEl.innerHTML = finances.map((f,i) => `
        <div class="finance-item" data-index="${i}" role="listitem">
          <div><strong>${escapeHtml(f.desc)}</strong></div>
          <div style="display:flex;gap:8px;align-items:center">
            <div style="font-weight:700;color:${f.val < 0 ? '#dc2626' : '#007a3d'}">R$ ${f.val.toFixed(2)}</div>
            <button aria-label="Remover transação" data-action="delete-fin" data-index="${i}">✖</button>
          </div>
        </div>`).join('');
    }
    const total = finances.reduce((s,x)=>s+(x.val||0), 0);
    if(balanceDisplay) balanceDisplay.textContent = `Saldo: R$ ${total.toFixed(2)}`;
    localStorage.setItem('prod_finances', JSON.stringify(finances));
  }

  function addFinance(){
    const d = finDesc   && finDesc.value.trim();
    const v = finAmount && parseFloat(finAmount.value);
    if(!d || isNaN(v)){ notify('Preencha descrição e valor válidos'); return; }
    finances.push({ desc: d, val: v });
    if(finDesc)   finDesc.value   = '';
    if(finAmount) finAmount.value = '';
    renderFinances();
    notify('Transação adicionada');
  }

  function deleteFinance(idx){ finances.splice(idx,1); renderFinances(); }

  if(addFinBtn) addFinBtn.addEventListener('click', addFinance);
  if(finDesc)   finDesc.addEventListener('keydown',   e => { if(e.key==='Enter') finAmount && finAmount.focus(); });
  if(finAmount) finAmount.addEventListener('keydown', e => { if(e.key==='Enter') addFinance(); });

  if(finListEl){
    finListEl.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action="delete-fin"]');
      if(!btn) return;
      deleteFinance(parseInt(btn.dataset.index,10));
    });
  }
  renderFinances();

  /* ================= CALCULADORA (Simulador Renda Fixa) ================= */
  // CORRIGIDO: IDs agora batem com o HTML (calcInit, calcMonthly, calcRate, calcTime)
  const principalEl  = document.getElementById('calcInit');     // era 'principal'
  const monthlyEl    = document.getElementById('calcMonthly');  // era 'monthly'
  const annualRateEl = document.getElementById('calcRate');     // era 'annualRate'
  const yearsEl      = document.getElementById('calcTime');     // era 'years' (agora em meses)
  const calcBtn      = document.getElementById('calculateBtn');
  const calcResult   = document.getElementById('calcResult');

  function simulate(){
    const P       = parseFloat(principalEl  && principalEl.value)  || 0;
    const M       = parseFloat(monthlyEl    && monthlyEl.value)    || 0;
    const annual  = (parseFloat(annualRateEl && annualRateEl.value) || 0) / 100;
    const months  = Math.round(parseFloat(yearsEl && yearsEl.value) || 0); // agora direto em meses
    const r       = Math.pow(1 + annual, 1/12) - 1;
    let balance   = P;
    for(let i=0; i<months; i++){ balance = balance * (1 + r) + M; }
    if(calcResult) calcResult.textContent = `Valor final em ${months} meses: R$ ${balance.toFixed(2)}`;
  }

  if(calcBtn) calcBtn.addEventListener('click', simulate);

  /* Notificação */
  const notif = document.getElementById('notification');
  if(notif){ notif.style.transition = 'opacity .25s'; notif.style.opacity = '0'; }

}); // DOMContentLoaded end
