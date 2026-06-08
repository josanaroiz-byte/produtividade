// Tarefas
const todoInput = document.getElementById('todoInput');
const todoList = document.getElementById('todoList');

function addTodo() {
  const todoText = todoInput.value.trim();
  if (todoText !== '') {
    const todoItem = document.createElement('li');
    const todoLabel = document.createElement('label');
    const todoCheckbox = document.createElement('input');
    todoCheckbox.type = 'checkbox';
    todoCheckbox.addEventListener('change', toggleTodo);
    todoLabel.textContent = todoText;
    todoItem.appendChild(todoCheckbox);
    todoItem.appendChild(todoLabel);
    todoList.appendChild(todoItem);
    todoInput.value = '';
  }
}

function toggleTodo(event) {
  event.target.parentElement.classList.toggle('completed');
}

// Notas
const noteEditor = document.getElementById('noteEditor');

function saveNote() {
  localStorage.setItem('note', noteEditor.value);
}

function clearEditor() {
  noteEditor.value = '';
  saveNote();
}

window.addEventListener('load', () => {
  noteEditor.value = localStorage.getItem('note') || '';
});

// Timer
let timerInterval;
let timerSeconds = 25 * 60;
const timerDisplay = document.getElementById('timerDisplay');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');

function startTimer() {
  timerInterval = setInterval(updateTimer, 1000);
  startBtn.disabled = true;
  pauseBtn.disabled = false;
}

function pauseTimer() {
  clearInterval(timerInterval);
  startBtn.disabled = false;
  pauseBtn.disabled = true;
}

function resetTimer() {
  clearInterval(timerInterval);
  timerSeconds = 25 * 60;
  updateTimer();
  startBtn.disabled = false;
  pauseBtn.disabled = true;
}

function updateTimer() {
  timerSeconds--;
  const minutes = Math.floor(timerSeconds / 60);
  const seconds = timerSeconds % 60;
  timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  if (timerSeconds === 0) {
    clearInterval(timerInterval);
    alert('O timer chegou ao fim!');
    resetTimer();
  }
}

// Finanças
const incomeTabs = document.getElementsByClassName('finance-tab');
const financeContents = document.getElementsByClassName('finance-content');
let totalIncome = 0;
let totalExpense = 0;

function showFinanceTab(index) {
  for (let i = 0; i < incomeTabs.length; i++) {
    incomeTabs[i].classList.remove('active');
    financeContents[i].classList.remove('active');
  }
  incomeTabs[index].classList.add('active');
  financeContents[index].classList.add('active');
}

function addIncome() {
  const incomeInput = document.getElementById('incomeInput');
  const incomeAmount = document.getElementById('incomeAmount');
  const incomeDescription = incomeInput.value.trim();
  const incomeValue = parseFloat(incomeAmount.value);
  if (incomeDescription !== '' && !isNaN(incomeValue)) {
    const incomeItem = document.createElement('li');
    incomeItem.textContent = `${incomeDescription}: R$ ${incomeValue.toFixed(2)}`;
    document.getElementById('incomeList').appendChild(incomeItem);
    totalIncome += incomeValue;
    updateBalance();
    incomeInput.value = '';
    incomeAmount.value = '';
  }
}

function addExpense() {
  const expenseInput = document.getElementById('expenseInput');
  const expenseAmount = document.getElementById('expenseAmount');
  const expenseDescription = expenseInput
