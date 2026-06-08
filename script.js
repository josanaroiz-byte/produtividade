// script.js - arquivo completo: abas A11y + tarefas + notas + timer + finanças

/* ================= Helpers ================= */
const uid = (prefix='id') => `${prefix}-${Math.random().toString(36).slice(2,9)}`;
function ensureId(el, prefix='id'){ if(!el) el.id = uid(prefix); return el.id; }
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
  const financeTablist = document.querySelector('.finance-tabs');
  if(financeTablist){
    const fBtns = Array.from(financeTablist.querySelectorAll('.finance-tab'));
    fBtns.forEach(btn => {
      btn.setAttribute('role','tab');
      ensureId(btn, 'finance-tab');
      const target = btn.getAttribute('aria-controls') || btn.dataset.fin;
      if(target) btn.setAttribute('aria-controls', target);
      btn.addEventListener('click', () => {
        fBtns.forEach(b => {
          const active = b === btn;
          b.classList.toggle('active', active);
          b.setAttribute('aria-selected', active ? 'true' : 'false');
          b.tabIndex = active ? 0 : -1;
          const tgt = b.getAttribute('aria-controls') || b.dataset.fin;
          if(tgt){
            const panel = document.getElementById(tgt);
            if(panel) panel.style.display = active ? 'block' : 'none';
            if(active && panel) panel.setAttribute('aria-labelledby', b.id);
          }
        });
      });
    });
    const activeF = financeTablist.querySelector('.finance-tab.active') || fBtns[0];
    if(activeF) activeF.click();
    addKeyboardNavigation('.finance-tabs .finance-tab');
  }

  /* -------- Observe lists for role=listitem -------- */
  observeListItems('#todoList');
  observeListItems('#financeList');

  /* ================= TODOS (Casa) ================= */
  let todos = JSON.parse(localStorage.getItem('prod_todos')) || [];
  const todoInput = document.getElementById('todoInput');
  const addTodoBtn = document.getElementById('addTodoBtn');
  const todoListEl = document.getElementById('todoList');
  const todoEmpty = document.getElementById('todoEmpty');

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

  function toggleTodo(idx){
    if(todos[idx]) todos[idx].done = !todos[idx].done;
    renderTodos();
  }
  function deleteTodo(idx){
    todos.splice(idx,1); renderTodos();
  }

  if(addTodoBtn) addTodoBtn.addEventListener('click', addTodo);
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
        const idx = parseInt(e.target.dataset.index,10);
        toggleTodo(idx);
      }
    });
  }
  renderTodos();

  /* ================= NOTES (Trabalho) ================= */
  const noteEditor = document.getElementById('noteEditor');
  const wordCountEl = document.getElementById('wordCount');
  if(noteEditor) noteEditor.value = localStorage.getItem('prod_note') || '';
  function updateWordCount(){
    if(!noteEditor || !wordCountEl) return;
    const v = noteEditor.value.trim();
    const count = v ? v.split(/\s+/).filter(Boolean).length : 0;
    wordCountEl.textContent = `Palavras: ${count}`;
  }
  if(noteEditor){
    noteEditor.addEventListener('input', () => {
      localStorage.setItem('prod_note', noteEditor.value);
      updateWordCount();
    });
  }
  updateWordCount();
  window.saveNote = function(){ if(noteEditor) localStorage.setItem('prod_note', noteEditor.value || ''); notify('Nota salva'); };
  window.clearNote = function(){ if(confirm('Limpar notas?')){ if(noteEditor) noteEditor.value=''; localStorage.removeItem('prod_note'); updateWordCount(); notify('Editor limpo'); } };

  /* ================= TIMER (Trabalho) ================= */
  let timerInterval = null;
  let timerSeconds = 25 * 60;
  const timerDisplay = document.getElementById('timerDisplay');
  const startBtn = document.getElementById('startBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const timerPreset = document.getElementById('timerPreset');

  function formatTimer(s){ const m = Math.floor(s/60); const sec = s%60; return `${m}:${sec<10? '0':''}${sec}`; }
  function updateTimerUI(){ if(timerDisplay) timerDisplay.textContent = formatTimer(timerSeconds); }

  window.startTimer = function(){
    if(timerInterval) return;
    if(startBtn) startBtn.disabled = true;
    if(pauseBtn) pauseBtn.disabled = false;
    timerInterval = setInterval(() => {
      timerSeconds--;
      updateTimerUI();
      if(timerSeconds <= 0){
        clearInterval(timerInterval);
        timerInterval = null;
        notify('⏰ Tempo esgotado');
        if(startBtn) startBtn.disabled = false;
        if(pauseBtn) pauseBtn.disabled = true;
      }
    }, 1000);
  };

  window.pauseTimer = function(){
    if(timerInterval){ clearInterval(timerInterval); timerInterval = null; if(startBtn) startBtn.disabled = false; if(pauseBtn) pauseBtn.disabled = true; }
  };

  window.resetTimer = function(){
    window.pauseTimer();
    timerSeconds = parseInt((timerPreset && timerPreset.value) || 25) * 60;
    updateTimerUI();
  };

  window.setPreset = function(){
    timerSeconds = parseInt((timerPreset && timerPreset.value) || 25) * 60;
    updateTimerUI();
  };

  if(!timerPreset){
    // create a basic preset select if missing
    const sel = document.createElement('select');
    sel.id = 'timerPreset';
    sel.innerHTML = '<option value="25">25</option><option value="15">15</option><option value="45">45</option><option value="5">5</option>';
    sel.addEventListener('change', window.setPreset);
    const tb = document.querySelector('.timer-box');
    if(tb) tb.appendChild(sel);
  }
  updateTimerUI();

  /* ================= FINANCES ================= */
  let finances = JSON.parse(localStorage.getItem('prod_finances')) || [];
  const finDesc = document.getElementById('finDesc');        // matches HTML
  const finAmount = document.getElementById('finValue');     // matches HTML
  const addFinBtn = document.getElementById('addFinanceBtn'); 
  const finListEl = document.getElementById('financeList');
  const finEmpty = document.getElementById('financeEmpty');
  const balanceDisplay = document.getElementById('balanceDisplay');

  function renderFinances(){
    if(!finListEl) return;
    if(!finances.length){
      finListEl.innerHTML = '';
      if(finEmpty) finEmpty.style.display = '';
    } else {
      if(finEmpty) finEmpty.style.display = 'none';
      finListEl.innerHTML = finances.map((f,i) => {
        return `<div class="finance-item" data-index="${i}" role="listitem">
          <div><strong>${escapeHtml(f.desc)}</strong></div>
          <div style="display:flex;gap:8px;align-items:center">
            <div style="font-weight:700;color:${f.val < 0 ? '#dc2626' : '#007a3d'}">R$ ${f.val.toFixed(2)}</div>
            <button aria-label="Remover transação" data-action="delete-fin" data-index="${i}">✖</button>
          </div>
        </div>`;
      }).join('');
    }
    const total = finances.reduce((s,x)=>s + (x.val || 0), 0);
    if(balanceDisplay) balanceDisplay.textContent = `Saldo: R$ ${total.toFixed(2)}`;
    localStorage.setItem('prod_finances', JSON.stringify(finances));
  }

  function addFinance(){
    const d = finDesc && finDesc.value.trim();
    const v = finAmount && parseFloat(finAmount.value);
    if(!d || isNaN(v)){ alert('Preencha descrição e valor válidos'); return; }
    finances.push({ desc: d, val: v });
    if(finDesc) finDesc.value = '';
    if(finAmount) finAmount.value = '';
    renderFinances();
    notify('Transação adicionada');
  }

  function deleteFinance(idx){
    finances.splice(idx,1); renderFinances();
  }

  if(addFinBtn) addFinBtn.addEventListener('click', addFinance);
  if(finListEl){
    finListEl.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action="delete-fin"]');
      if(!btn) return;
      const idx = parseInt(btn.dataset.index,10);
      deleteFinance(idx);
    });
  }
  renderFinances();


  /* Calculadora */
  const principalEl = document.getElementById('principal');
  const monthlyEl = document.getElementById('monthly');
  const annualRateEl = document.getElementById('annualRate');
  const yearsEl = document.getElementById('years');
  const calcBtn = document.getElementById('calculateBtn');
  const calcResult = document.getElementById('calcResult');

  function simulate(){
    const P = parseFloat(principalEl && principalEl.value) || 0;
    const M = parseFloat(monthlyEl && monthlyEl.value) || 0;
    const annual = (parseFloat(annualRateEl && annualRateEl.value) || 0) / 100;
    const yrs = parseFloat(yearsEl && yearsEl.value) || 0;
    const months = Math.round(yrs * 12);
    const r = Math.pow(1 + annual, 1/12) - 1;
    let balance = P;
    for(let i=0;i<months;i++){ balance = balance * (1 + r) + M; }
    if(calcResult) calcResult.textContent = `Valor final em ${months} meses: R$ ${balance.toFixed(2)}`;
  }
  if(calcBtn) calcBtn.addEventListener('click', simulate);

  /* helpers for Enter key on finance inputs */
  if(finDesc) finDesc.addEventListener('keydown', e => { if(e.key === 'Enter') (finAmount || {}).focus && finAmount.focus(); });
  if(finAmount) finAmount.addEventListener('keydown', e => { if(e.key === 'Enter') addFinance(); });

  /* observe lists so listitems get role set */
  observeListItems('#todoList');
  observeListItems('#financeList');

  /* init notification element style (if exists) */
  const notif = document.getElementById('notification');
  if(notif){ notif.style.transition = 'opacity .25s'; notif.style.opacity = '0'; }

}); // DOMContentLoaded end
