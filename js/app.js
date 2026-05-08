// Helpers
const $ = id => document.getElementById(id);
const store = {
  get: (k, fallback = null) => { try { return JSON.parse(localStorage.getItem(k)) ?? fallback; } catch { return fallback; } },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
};
const getFavicon = url => { try { return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`; } catch { return ''; } };

// Theme
let theme = localStorage.getItem('dash_theme') || 'light';

function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  $('theme-btn').textContent = t === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
}
applyTheme(theme);

$('theme-btn').addEventListener('click', () => {
  theme = theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('dash_theme', theme);
  applyTheme(theme);
});

// Clock & Greeting
const GREETINGS = [
  [5, 12, 'Good Morning'],
  [12, 17, 'Good Afternoon'],
  [17, 21, 'Good Evening'],
];

function updateClock() {
  const now = new Date();
  const h = now.getHours();
  const pad = n => String(n).padStart(2, '0');
  $('clock').textContent = `${pad(h)}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  $('greeting-label').textContent = GREETINGS.find(([a, b]) => h >= a && h < b)?.[2] ?? 'Good Night';
  $('greeting-date').textContent = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}
setInterval(updateClock, 1000);
updateClock();

// Focus Timer
let timerInterval = null;
let timerRunning = false;
let totalSecs = 25 * 60;
let remainSecs = 25 * 60;

const fmtTime = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

function updateTimerUI() {
  $('timer-display').textContent = fmtTime(remainSecs);
  $('progress-bar').style.width = (totalSecs > 0 ? (remainSecs / totalSecs) * 100 : 0) + '%';
}

$('timer-input').addEventListener('input', function () {
  if (!timerRunning) {
    totalSecs = remainSecs = (parseInt(this.value) || 25) * 60;
    updateTimerUI();
  }
});

$('start-btn').addEventListener('click', () => {
  if (timerRunning) return;
  timerRunning = true;
  $('timer-status').textContent = 'Focus mode on!';
  timerInterval = setInterval(() => {
    if (remainSecs <= 0) {
      clearInterval(timerInterval);
      timerRunning = false;
      $('timer-status').textContent = 'Session complete! Great job!';
      return;
    }
    remainSecs--;
    updateTimerUI();
  }, 1000);
});

$('pause-btn').addEventListener('click', () => {
  clearInterval(timerInterval);
  timerRunning = false;
  $('timer-status').textContent = 'Paused, click Start to resume';
});

$('reset-btn').addEventListener('click', () => {
  clearInterval(timerInterval);
  timerRunning = false;
  totalSecs = remainSecs = (parseInt($('timer-input').value) || 25) * 60;
  updateTimerUI();
  $('timer-status').textContent = 'Ready to focus!';
});

updateTimerUI();

// To-Do List
let tasks = store.get('dash_tasks', []);
let currentFilter = 'all';

const saveTasks = () => store.set('dash_tasks', tasks);

function getVisibleTasks() {
  if (currentFilter === 'done') return tasks.filter(t => t.done);
  if (currentFilter === 'active') return tasks.filter(t => !t.done);
  return tasks;
}

function renderTasks() {
  const ul = $('task-list');
  const list = getVisibleTasks();
  $('empty-tasks').style.display = list.length === 0 ? 'block' : 'none';
  ul.innerHTML = '';

  list.forEach(task => {
    const li = document.createElement('li');
    li.className = 'task-item';
    li.innerHTML = `
      <div class="task-check ${task.done ? 'done' : ''}" data-id="${task.id}"></div>
      <span class="task-text ${task.done ? 'done' : ''}" data-id="${task.id}">${task.text}</span>
      <div class="task-actions">
        <button class="icon-btn edit-btn" data-id="${task.id}" title="Edit">✏️</button>
        <button class="icon-btn del-btn" data-id="${task.id}" title="Delete">🗑️</button>
      </div>`;
    ul.appendChild(li);
  });

  ul.querySelectorAll('.task-check').forEach(el => {
    el.addEventListener('click', () => {
      const t = tasks.find(x => x.id === el.dataset.id);
      if (t) { t.done = !t.done; saveTasks(); renderTasks(); }
    });
  });

  ul.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const task = tasks.find(x => x.id === id);
      if (!task) return;
      const span = ul.querySelector(`.task-text[data-id="${id}"]`);
      const input = document.createElement('input');
      input.className = 'task-edit-input';
      input.value = task.text;
      span.replaceWith(input);
      input.focus();

      const finish = () => {
        const val = input.value.trim();
        if (val && val !== task.text) {
          if (tasks.some(x => x.id !== id && x.text.toLowerCase() === val.toLowerCase())) {
            alert('Duplicate task!');
            return;
          }
          task.text = val;
        }
        saveTasks();
        renderTasks();
      };
      input.addEventListener('blur', finish);
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') input.blur();
        if (e.key === 'Escape') { input.removeEventListener('blur', finish); renderTasks(); }
      });
    });
  });

  ul.querySelectorAll('.del-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      tasks = tasks.filter(x => x.id !== btn.dataset.id);
      saveTasks();
      renderTasks();
    });
  });
}

function addTask() {
  const input = $('task-input');
  const val = input.value.trim();
  if (!val) return;
  if (tasks.some(t => t.text.toLowerCase() === val.toLowerCase())) {
    input.style.borderColor = 'rgba(252,53,76,0.8)';
    input.placeholder = '⚠️ Duplicate task!';
    setTimeout(() => { input.style.borderColor = ''; input.placeholder = 'Add a new task…'; }, 1800);
    return;
  }
  tasks.push({ id: Date.now().toString(), text: val, done: false });
  input.value = '';
  saveTasks();
  renderTasks();
}

$('add-task-btn').addEventListener('click', addTask);
$('task-input').addEventListener('keydown', e => { if (e.key === 'Enter') addTask(); });

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    currentFilter = btn.dataset.f;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderTasks();
  });
});

renderTasks();

// Quick Links
let links = store.get('dash_links') ?? [
  { id: '1', name: 'GitHub', url: 'https://github.com' },
  { id: '2', name: 'Google', url: 'https://google.com' },
  { id: '3', name: 'YouTube', url: 'https://youtube.com' },
];
store.set('dash_links', links);

const saveLinks = () => store.set('dash_links', links);

function renderLinks() {
  const grid = $('links-grid');
  $('empty-links').style.display = links.length === 0 ? 'block' : 'none';
  grid.innerHTML = '';

  links.forEach(link => {
    const a = document.createElement('a');
    a.className = 'link-chip';
    a.href = link.url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    const favicon = getFavicon(link.url);
    a.innerHTML = `${favicon ? `<img class="link-favicon" src="${favicon}" alt="" onerror="this.style.display='none'" />` : '🔗'} ${link.name} <span class="del-link" data-id="${link.id}">×</span>`;
    a.querySelector('.del-link').addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      links = links.filter(x => x.id !== link.id);
      saveLinks();
      renderLinks();
    });
    grid.appendChild(a);
  });
}

$('add-link-btn').addEventListener('click', () => {
  const name = $('link-name').value.trim();
  const url = $('link-url').value.trim();
  if (!name || !url) return;
  links.push({ id: Date.now().toString(), name, url: url.startsWith('http') ? url : 'https://' + url });
  $('link-name').value = '';
  $('link-url').value = '';
  saveLinks();
  renderLinks();
});

renderLinks();
