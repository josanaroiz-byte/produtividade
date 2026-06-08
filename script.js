// script.js - Lógica do app (tarefas, notas, timer, finanças) + acessibilidade de abas

/* ===================== Helpers / A11y Tabs ===================== */
const uid = (prefix='id') => `${prefix}-${Math.random().toString(36).slice(2,9)}`;
function ensureId(el, prefix){ if(!el.id) el.id = uid(prefix); return el.id; }
function escapeHtml(s){ return String(s).replace(/[&<>"]/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

function setActiveGroup(button, selector){
  const buttons = document.querySelectorAll(selector);
  buttons.forEach(b => {
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

/* ===================== App Logic ===================== */

document.addEventListener('DOMContentLoaded', () => {

  /* --------- Accessibility: main tabs --------- */
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
      // click
      btn.addEventListener('click', () => {
        setActiveGroup(btn, 'nav[role="tablist"] .tab-btn');
        activatePanelForTab(btn);
      });
    });
    // initial
    const active = mainNav.querySelector('.tab-btn.active') || mainNav.querySelector('.tab-btn[aria-selected="true"]') || navBtns[0];
    if(active){ setActiveGroup(active, 'nav[role="tablist"] .tab-btn'); activatePanelForTab(active); }
    addKeyboardNavigation('nav[role="tablist"] .tab-btn');
  }

  /* --------- Finance internal tabs --------- */
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

  /* --------- Observe lists for role=listitem --------- */
  observeListItems('#todoList');
  observeListItems('#financeList');

  /* =================== TODOS (Casa) =================== */
  let todos = JSON.parse(localStorage.getItem('prod_todos')) || [];
  const todoInput = document.getElementById('todoInput');
  const addTodoBtn = document.getElementById('addTodoBtn');
  const todoListEl = document.getElementById('todoList');
  const todoEmpty = document.getElementById('todoEmpty');

  function renderTodos(){
    if(!todoListEl) return;
    if(!todos.length){
      todoListEl.innerHTML = '';
      todoEmpty.style.display = '';
    } else {
      todoEmpty.style.display = 'none';
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
    const v = todoInput.value.trim();
    if(!v) return;
    todos.push({ text: v, done: false });
    todoInput.value = '';
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
    // keyboard toggle when span focused + Enter
    todoListEl.addEventListener('keydown', (e) => {
      if(e.target.matches('.text') && (e.key === 'Enter' || e.key === ' ')){
        const idx = parseInt(e.target.dataset.index,10);
        t
