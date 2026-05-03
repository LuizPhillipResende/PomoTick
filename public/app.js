/* ═══════════════════════════════════════════════════════════════════════════
   PomoTick — Frontend App
   ═══════════════════════════════════════════════════════════════════════════ */
'use strict';

// ─── State ───────────────────────────────────────────────────────────────────
const state = {
  timer: {
    running:    false,
    phase:      'work',
    remaining:  25 * 60,
    total:      25 * 60,
    interval:   null,
    sessions:   0
  },
  jam: {
    active:   false,
    code:     null,
    data:     null,
    pollInt:  null
  },
  music: false,
  kanban: {
    boards:         [],
    activeBoardId:  null,
    addCardTarget:  null  // { boardId, columnId }
  }
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const $  = id  => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

function api(url, opts = {}) {
  return fetch(url, {
    headers: { 'Content-Type': 'application/json', ...opts.headers },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined
  }).then(r => r.json());
}

function fmtTime(seconds) {
  const m = Math.floor(Math.max(0, seconds) / 60).toString().padStart(2, '0');
  const s = (Math.max(0, seconds) % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function showMsg(id, text, type) {
  const el = $(id);
  if (!el) return;
  el.textContent = text;
  el.className   = `msg-box ${type}`;
  if (type === 'success') setTimeout(() => el.className = 'msg-box hidden', 3000);
}

function avatar(name) {
  return `<div class="jam-member-avatar">${(name || '?').charAt(0).toUpperCase()}</div>`;
}

// ─── Clock ────────────────────────────────────────────────────────────────────
function updateClock() {
  const now  = new Date();
  const el   = $('clockDisplay');
  if (el) el.textContent = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function updateGreeting() {
  const h  = new Date().getHours();
  const gr = $('greeting');
  if (!gr) return;
  if (h < 12)      gr.textContent = 'Bom dia ☀️';
  else if (h < 18) gr.textContent = 'Boa tarde 🌤️';
  else             gr.textContent = 'Boa noite 🌙';
}

// ─── Navigation ──────────────────────────────────────────────────────────────
function initNav() {
  $$('[data-panel]').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('[data-panel]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      $$('.panel').forEach(p => p.classList.remove('active'));
      const panel = $(`panel-${btn.dataset.panel}`);
      if (panel) panel.classList.add('active');
    });
  });
}

// ═══ PROFILE ═════════════════════════════════════════════════════════════════
async function loadProfile() {
  try {
    const { success, profile } = await api('/api/profile');
    if (!success) return;

    const src = profile.profilePicture || '/default-avatar.svg';
    [$('topAvatar'), $('profileAvatar')].forEach(img => { if (img) img.src = src; });
    if ($('profileName')) $('profileName').value = profile.name || '';
    if ($('profileBio'))  $('profileBio').value  = profile.bio  || '';
  } catch {}
}

function openProfile() { $('profileModal').classList.remove('hidden'); loadProfile(); }
function closeProfileFn() { $('profileModal').classList.add('hidden'); }

async function saveProfile() {
  const name = $('profileName').value.trim();
  const bio  = $('profileBio').value.trim();
  if (!name) return showMsg('profileMsg', 'Nome é obrigatório.', 'error');

  const { success, error } = await api('/api/profile', { method: 'PUT', body: { name, bio } });
  if (success) { showMsg('profileMsg', 'Perfil salvo!', 'success'); loadProfile(); }
  else          showMsg('profileMsg', error || 'Erro ao salvar.', 'error');
}

function initProfilePicture() {
  const input = $('avatarInput');
  if (!input) return;

  $('btnChangeAvatar').addEventListener('click', () => input.click());

  input.addEventListener('change', async () => {
    const file = input.files[0];
    if (!file) return;
    if (file.size > 600000) return showMsg('profileMsg', 'Imagem muito grande (máx 500 KB).', 'error');

    const reader = new FileReader();
    reader.onload = async e => {
      const { success, error } = await api('/api/profile/picture', {
        method: 'PUT',
        body: { pictureData: e.target.result }
      });
      if (success) { showMsg('profileMsg', 'Foto atualizada!', 'success'); loadProfile(); }
      else          showMsg('profileMsg', error || 'Erro ao enviar foto.', 'error');
    };
    reader.readAsDataURL(file);
  });
}

// ═══ TODO ════════════════════════════════════════════════════════════════════
async function loadTodo() {
  const { success, todoList } = await api('/api/todo');
  if (!success) return;
  renderTodo(todoList);
}

function renderTodo(items) {
  const ul    = $('todoList');
  const empty = $('todoEmpty');
  if (!ul) return;

  ul.innerHTML = '';
  if (!items.length) { empty.style.display = ''; return; }
  empty.style.display = 'none';

  items.forEach(item => {
    const li = document.createElement('li');
    li.className  = 'todo-item';
    li.dataset.id = item._id;
    li.innerHTML  = `
      <button class="todo-check ${item.checked ? 'checked' : ''}" data-id="${item._id}" title="Marcar"></button>
      <span class="todo-text ${item.checked ? 'done' : ''}">${escHtml(item.text)}</span>
      ${item.inReport ? '<span class="todo-badge material-symbols-rounded" title="No relatório">bookmark</span>' : ''}
      <button class="todo-del" data-id="${item._id}" title="Excluir">
        <span class="material-symbols-rounded">close</span>
      </button>`;
    ul.appendChild(li);
  });
}

async function addTodo() {
  const input    = $('todoInput');
  const inReport = $('todoInReport');
  const text     = input.value.trim();
  if (!text) return;

  const { success, item } = await api('/api/todo', {
    method: 'POST',
    body:   { text, inReport: inReport.checked }
  });

  if (success) {
    input.value      = '';
    inReport.checked = false;
    loadTodo();
  }
}

async function toggleTodo(id, checked) {
  await api(`/api/todo/${id}`, { method: 'PATCH', body: { checked } });
  loadTodo();
}

async function deleteTodo(id) {
  await api(`/api/todo/${id}`, { method: 'DELETE' });
  loadTodo();
}

function initTodo() {
  $('todoInput').addEventListener('keydown', e => { if (e.key === 'Enter') addTodo(); });
  $('btnAddTodo').addEventListener('click', addTodo);

  $('todoList').addEventListener('click', e => {
    const checkBtn = e.target.closest('.todo-check');
    const delBtn   = e.target.closest('.todo-del');

    if (checkBtn) {
      const id      = checkBtn.dataset.id;
      const checked = !checkBtn.classList.contains('checked');
      toggleTodo(id, checked);
    }
    if (delBtn) {
      const id = delBtn.dataset.id;
      deleteTodo(id);
    }
  });

  // Report modal
  $('btnOpenReport').addEventListener('click', openReport);
  $('closeReport').addEventListener('click', () => $('reportModal').classList.add('hidden'));
}

async function openReport() {
  const { success, report } = await api('/api/todo/report');
  const content = $('reportContent');
  $('reportModal').classList.remove('hidden');

  if (!success || !report.length) {
    content.innerHTML = '<p class="empty-state">Nenhuma tarefa marcada para o relatório.</p>';
    return;
  }

  content.innerHTML = report.map(i => `
    <div class="report-item ${i.checked ? 'done' : ''}">
      <span class="material-symbols-rounded">${i.checked ? 'task_alt' : 'radio_button_unchecked'}</span>
      ${escHtml(i.text)}
    </div>`).join('');
}

// ═══ KANBAN ══════════════════════════════════════════════════════════════════
async function loadKanban() {
  const { success, boards } = await api('/api/kanban');
  if (!success) return;
  state.kanban.boards = boards;
  renderBoards();
}

function renderBoards() {
  const container = $('kanbanBoards');
  const empty     = $('kanbanEmpty');
  if (!container) return;

  const boards = state.kanban.boards;
  container.innerHTML = '';

  if (!boards.length) { empty.style.display = ''; return; }
  empty.style.display = 'none';

  boards.forEach(board => {
    const totalCards = (board.columns || []).reduce((s, c) => s + c.cards.length, 0);
    const div        = document.createElement('div');
    div.className    = 'board-card';
    div.dataset.id   = board._id;
    div.innerHTML    = `
      <div class="board-card-head">
        <span class="board-card-title">${escHtml(board.title)}</span>
        <button class="board-del" data-id="${board._id}" title="Excluir quadro">
          <span class="material-symbols-rounded">delete</span>
        </button>
      </div>
      ${board.description ? `<p class="board-card-desc">${escHtml(board.description)}</p>` : ''}
      <div class="board-card-stats">
        <span class="board-stat"><span class="material-symbols-rounded">view_column</span> ${(board.columns || []).length} colunas</span>
        <span class="board-stat"><span class="material-symbols-rounded">sticky_note_2</span> ${totalCards} cards</span>
      </div>`;
    container.appendChild(div);
  });
}

async function createBoard() {
  const title = $('boardTitleInput').value.trim();
  const desc  = $('boardDescInput').value.trim();
  if (!title) return showMsg('boardModalMsg', 'Título é obrigatório.', 'error');

  const { success, error } = await api('/api/kanban', { method: 'POST', body: { title, description: desc } });
  if (success) {
    $('boardModal').classList.add('hidden');
    $('boardTitleInput').value = '';
    $('boardDescInput').value  = '';
    loadKanban();
  } else {
    showMsg('boardModalMsg', error || 'Erro ao criar quadro.', 'error');
  }
}

async function deleteBoard(id) {
  if (!confirm('Excluir este quadro?')) return;
  await api(`/api/kanban/${id}`, { method: 'DELETE' });
  loadKanban();
}

function openBoardDetail(id) {
  const board = state.kanban.boards.find(b => b._id === id);
  if (!board) return;

  state.kanban.activeBoardId = id;
  $('boardTitle').textContent = board.title;
  $('boardDesc').textContent  = board.description || '';

  renderBoardColumns(board);
  $('boardOverlay').classList.remove('hidden');
}

function renderBoardColumns(board) {
  const container = $('boardColumns');
  container.innerHTML = '';

  (board.columns || []).forEach(col => {
    const div = document.createElement('div');
    div.className  = 'kanban-col';
    div.dataset.id = col._id;

    div.innerHTML = `
      <div class="kanban-col-head">
        <span class="kanban-col-title">${escHtml(col.title)}</span>
        <span class="kanban-col-count">${col.cards.length}</span>
      </div>
      <div class="col-cards" data-col-id="${col._id}">
        ${col.cards.map(card => renderCard(card, board._id, col._id, board.columns)).join('')}
      </div>
      <button class="btn-add-card" data-board-id="${board._id}" data-col-id="${col._id}">
        <span class="material-symbols-rounded">add</span> Adicionar card
      </button>`;
    container.appendChild(div);
  });
}

function renderCard(card, boardId, colId, columns) {
  const otherCols = columns.filter(c => c._id !== colId);
  const moveOpts  = otherCols.map(c =>
    `<button class="kcard-move-btn" data-board="${boardId}" data-from="${colId}" data-to="${c._id}" data-card="${card._id}"
      title="Mover para ${c.title}">→ ${c.title}</button>`).join('');

  return `
    <div class="kanban-card" data-card-id="${card._id}">
      <div class="kcard-title">${escHtml(card.title)}</div>
      ${card.description ? `<div class="kcard-desc">${escHtml(card.description)}</div>` : ''}
      <div class="kcard-meta">
        <div class="kcard-priority">
          <span class="priority-dot ${card.priority}"></span>
          ${card.priority}
        </div>
        <div class="kcard-actions">
          ${moveOpts}
          <button class="kcard-del" data-board="${boardId}" data-col="${colId}" data-card="${card._id}" title="Excluir">
            <span class="material-symbols-rounded">close</span>
          </button>
        </div>
      </div>
    </div>`;
}

async function addCard() {
  const { boardId, columnId } = state.kanban.addCardTarget || {};
  if (!boardId || !columnId) return;

  const title    = $('cardTitleInput').value.trim();
  const desc     = $('cardDescInput').value.trim();
  const priority = $('cardPriority').value;

  if (!title) return showMsg('cardModalMsg', 'Título é obrigatório.', 'error');

  const { success, error } = await api(`/api/kanban/${boardId}/card`, {
    method: 'POST',
    body:   { columnId, title, description: desc, priority }
  });

  if (success) {
    $('cardModal').classList.add('hidden');
    $('cardTitleInput').value = '';
    $('cardDescInput').value  = '';
    await loadKanban();
    // Refresh board overlay
    const board = state.kanban.boards.find(b => b._id === boardId);
    if (board) renderBoardColumns(board);
  } else {
    showMsg('cardModalMsg', error || 'Erro ao criar card.', 'error');
  }
}

async function moveCard(boardId, fromColumnId, toColumnId, cardId) {
  await api(`/api/kanban/${boardId}/card/${cardId}/move`, {
    method: 'PATCH',
    body:   { fromColumnId, toColumnId }
  });
  await loadKanban();
  const board = state.kanban.boards.find(b => b._id === boardId);
  if (board) renderBoardColumns(board);
}

async function deleteCard(boardId, colId, cardId) {
  await api(`/api/kanban/${boardId}/card/${cardId}`, { method: 'DELETE' });
  await loadKanban();
  const board = state.kanban.boards.find(b => b._id === boardId);
  if (board) renderBoardColumns(board);
}

function initKanban() {
  // Open new board modal
  $('btnNewBoard').addEventListener('click', () => {
    $('boardModal').classList.remove('hidden');
    $('boardTitleInput').focus();
  });

  $('closeBoardModal').addEventListener('click', () => $('boardModal').classList.add('hidden'));
  $('btnConfirmNewBoard').addEventListener('click', createBoard);
  $('boardTitleInput').addEventListener('keydown', e => { if (e.key === 'Enter') createBoard(); });

  // Board card click
  $('kanbanBoards').addEventListener('click', e => {
    const delBtn  = e.target.closest('.board-del');
    const boardCard = e.target.closest('.board-card');
    if (delBtn) { e.stopPropagation(); deleteBoard(delBtn.dataset.id); return; }
    if (boardCard) openBoardDetail(boardCard.dataset.id);
  });

  // Close board overlay
  $('closeBoardOverlay').addEventListener('click', () => $('boardOverlay').classList.add('hidden'));

  // Board column interactions (delegated)
  $('boardColumns').addEventListener('click', e => {
    const addBtn  = e.target.closest('.btn-add-card');
    const moveBtn = e.target.closest('.kcard-move-btn');
    const delBtn  = e.target.closest('.kcard-del');

    if (addBtn) {
      state.kanban.addCardTarget = { boardId: addBtn.dataset.boardId, columnId: addBtn.dataset.colId };
      $('cardTitleInput').value  = '';
      $('cardDescInput').value   = '';
      $('cardModal').classList.remove('hidden');
      $('cardTitleInput').focus();
    }

    if (moveBtn) {
      moveCard(moveBtn.dataset.board, moveBtn.dataset.from, moveBtn.dataset.to, moveBtn.dataset.card);
    }

    if (delBtn) {
      deleteCard(delBtn.dataset.board, delBtn.dataset.col, delBtn.dataset.card);
    }
  });

  $('closeCardModal').addEventListener('click', () => $('cardModal').classList.add('hidden'));
  $('btnConfirmCard').addEventListener('click', addCard);
}

// ═══ POMODORO ════════════════════════════════════════════════════════════════
const CIRCUMFERENCE = 326.7;

function updateTimerRing(remaining, total, ringId, isRest) {
  const ring = $(ringId);
  if (!ring) return;
  const progress  = remaining / total;
  const dashoffset = CIRCUMFERENCE * (1 - progress);
  ring.style.strokeDashoffset = dashoffset;
  ring.classList.toggle('ring-rest', isRest);
}

function updateTimerDisplay(remaining, displayId, phaseId, ringId, total, phase) {
  if ($(displayId)) $(displayId).textContent = fmtTime(remaining);
  if ($(phaseId))   $(phaseId).textContent   = phase === 'rest' ? 'pausa' : 'foco';
  updateTimerRing(remaining, total, ringId, phase === 'rest');
}

function getPomSettings() {
  return {
    work: parseInt($('inputPomMin').value)  || 25,
    rest: parseInt($('inputRestMin').value) || 5
  };
}

function startLocalTimer() {
  if (state.timer.interval) return;

  const s = getPomSettings();
  if (!state.timer.running) {
    state.timer.total     = (state.timer.phase === 'work' ? s.work : s.rest) * 60;
    state.timer.remaining = state.timer.total;
    state.timer.running   = true;
  }

  $('pomIcon').textContent = 'pause';
  $('pomPhaseLabel').textContent = state.timer.phase === 'work' ? 'Foco — concentre-se na tarefa' : 'Pausa — descanse um pouco';

  state.timer.interval = setInterval(() => {
    state.timer.remaining--;
    updateTimerDisplay(state.timer.remaining, 'timerDisplay', 'timerPhaseSmall', 'ringProgress', state.timer.total, state.timer.phase);

    if (state.timer.remaining <= 0) {
      clearInterval(state.timer.interval);
      state.timer.interval = null;

      const alertSound = $('alertSound');
      if (alertSound) alertSound.play().catch(() => {});

      if (state.timer.phase === 'work') {
        state.timer.sessions++;
        renderSessionDots();
        state.timer.phase = 'rest';
      } else {
        state.timer.phase = 'work';
      }

      const ns = getPomSettings();
      state.timer.total     = (state.timer.phase === 'work' ? ns.work : ns.rest) * 60;
      state.timer.remaining = state.timer.total;
      state.timer.running   = false;
      $('pomIcon').textContent = 'play_arrow';
      updateTimerDisplay(state.timer.remaining, 'timerDisplay', 'timerPhaseSmall', 'ringProgress', state.timer.total, state.timer.phase);
    }
  }, 1000);
}

function pauseLocalTimer() {
  if (state.timer.interval) {
    clearInterval(state.timer.interval);
    state.timer.interval = null;
    $('pomIcon').textContent = 'play_arrow';
  }
}

function resetLocalTimer() {
  pauseLocalTimer();
  state.timer.running   = false;
  state.timer.phase     = 'work';
  const s               = getPomSettings();
  state.timer.total     = s.work * 60;
  state.timer.remaining = state.timer.total;
  updateTimerDisplay(state.timer.remaining, 'timerDisplay', 'timerPhaseSmall', 'ringProgress', state.timer.total, state.timer.phase);
  $('pomIcon').textContent = 'play_arrow';
}

function renderSessionDots() {
  const dots  = $('sessionDots');
  const count = $('sessionCount');
  if (!dots) return;
  dots.innerHTML = Array.from({ length: state.timer.sessions }, () =>
    '<span class="session-dot"></span>').join('');
  if (count) count.textContent = `${state.timer.sessions} sessão(ões) concluída(s)`;
}

function initPomodoro() {
  $('btnPomStart').addEventListener('click', () => {
    if (state.timer.interval) pauseLocalTimer();
    else startLocalTimer();
  });

  $('btnPomReset').addEventListener('click', resetLocalTimer);

  $('inputPomMin').addEventListener('change', () => {
    if (!state.timer.running && state.timer.phase === 'work') {
      state.timer.total     = (parseInt($('inputPomMin').value) || 25) * 60;
      state.timer.remaining = state.timer.total;
      updateTimerDisplay(state.timer.remaining, 'timerDisplay', 'timerPhaseSmall', 'ringProgress', state.timer.total, state.timer.phase);
    }
  });

  $$('.focus-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.focus-opt').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const env   = btn.dataset.env;
      const music = $('bgMusic');
      if (env === 'lofi' && music) {
        music.play().catch(() => {});
        state.music = true;
        $('musicIcon').textContent = 'music_note';
      } else if (music) {
        music.pause();
        state.music = false;
        $('musicIcon').textContent = 'music_off';
      }
    });
  });

  // Initial display
  const s = getPomSettings();
  state.timer.total     = s.work * 60;
  state.timer.remaining = state.timer.total;
  updateTimerDisplay(state.timer.remaining, 'timerDisplay', 'timerPhaseSmall', 'ringProgress', state.timer.total, state.timer.phase);
}

// ═══ JAM ═════════════════════════════════════════════════════════════════════
async function createJam() {
  const code        = $('jamCodeInput').value.trim().toUpperCase();
  const name        = $('jamNameInput').value.trim() || 'Jam Session';
  const duration    = parseInt($('jamDurInput').value) || 25;
  const restDuration = parseInt($('jamRestInput').value) || 5;

  if (!code) { alert('Informe um código para o JAM.'); return; }

  const { success, jam, error } = await api('/api/jam/create', {
    method: 'POST',
    body:   { code, name, duration, restDuration }
  });

  if (success) activateJam(jam);
  else alert(error || 'Erro ao criar JAM.');
}

async function joinJam() {
  const code = $('jamCodeInput').value.trim().toUpperCase();
  if (!code) { alert('Informe o código do JAM.'); return; }

  const { success, jam, error } = await api('/api/jam/join', {
    method: 'POST',
    body:   { code }
  });

  if (success) activateJam(jam);
  else alert(error || 'JAM não encontrado.');
}

function activateJam(jam) {
  state.jam.active = true;
  state.jam.code   = jam.code;
  state.jam.data   = jam;

  localStorage.setItem('pomotickJam', jam.code);
  $('jamBadge').classList.remove('hidden');

  $('jamJoinView').classList.add('hidden');
  $('jamActiveView').classList.remove('hidden');

  renderJamState(jam);
  startJamPoll();
}

function renderJamState(jam) {
  if (!jam) return;

  $('activeJamCode').textContent    = jam.code;
  $('activeJamName').textContent    = jam.name || '';
  $('jamMemberCount').textContent   = (jam.members || []).length;
  $('jamTimerDisplay').textContent  = fmtTime(jam.remaining);
  $('jamPhaseSmall').textContent    = jam.phase === 'rest' ? 'pausa' : 'foco';
  $('jamIcon').textContent          = jam.running ? 'pause' : 'play_arrow';

  updateTimerRing(jam.remaining, jam.phase === 'work' ? jam.duration : jam.restDuration,
    'jamRingProgress', jam.phase === 'rest');

  // Members
  const ml = $('jamMembersList');
  if (ml) {
    ml.innerHTML = (jam.members || []).map(m => `
      <div class="jam-member-chip">
        ${avatar(m.name || m.email)}
        <span>${escHtml(m.name || m.email)}</span>
      </div>`).join('');
  }

  // Jam kanban
  renderJamKanban(jam);
}

function renderJamKanban(jam) {
  const container = $('jamKanban');
  if (!container || !jam.kanbanBoard) return;

  container.innerHTML = (jam.kanbanBoard.columns || []).map(col => `
    <div class="kanban-col">
      <div class="kanban-col-head">
        <span class="kanban-col-title">${escHtml(col.title)}</span>
        <span class="kanban-col-count">${col.cards.length}</span>
      </div>
      ${col.cards.map(card => `
        <div class="kanban-card">
          <div class="kcard-title">${escHtml(card.title)}</div>
          ${card.assignee ? `<div class="kcard-desc">👤 ${escHtml(card.assignee)}</div>` : ''}
        </div>`).join('')}
      <button class="btn-add-card" onclick="promptJamCard('${jam.code}','${col._id}')">
        <span class="material-symbols-rounded">add</span> Card
      </button>
    </div>`).join('');
}

window.promptJamCard = async function(code, columnId) {
  const title = prompt('Título do card:');
  if (!title) return;
  const desc = prompt('Descrição (opcional):') || '';
  await api('/api/jam/kanban/card', { method: 'POST', body: { code, columnId, title, description: desc } });
  pollJamState();
};

function startJamPoll() {
  if (state.jam.pollInt) clearInterval(state.jam.pollInt);
  state.jam.pollInt = setInterval(pollJamState, 3000);
}

async function pollJamState() {
  if (!state.jam.code) return;
  const { success, jam } = await api(`/api/jam/state?code=${state.jam.code}`);
  if (success) { state.jam.data = jam; renderJamState(jam); }
}

async function startJamTimer() {
  const dur  = parseInt($('jamDurInput')  ? $('jamDurInput').value  : 25);
  const rest = parseInt($('jamRestInput') ? $('jamRestInput').value : 5);
  const { success, jam, error } = await api('/api/jam/start', {
    method: 'POST',
    body:   { code: state.jam.code, duration: dur, restDuration: rest }
  });
  if (success) renderJamState(jam);
  else alert(error || 'Erro ao iniciar.');
}

async function stopJamTimer() {
  const { success, jam } = await api('/api/jam/stop', {
    method: 'POST',
    body:   { code: state.jam.code }
  });
  if (success) renderJamState(jam);
}

async function leaveJam() {
  if (!confirm('Sair do JAM?')) return;
  if (state.jam.pollInt) clearInterval(state.jam.pollInt);

  await api('/api/jam/leave', { method: 'POST', body: { code: state.jam.code } });

  state.jam.active = false;
  state.jam.code   = null;
  state.jam.data   = null;
  localStorage.removeItem('pomotickJam');
  $('jamBadge').classList.add('hidden');
  $('jamJoinView').classList.remove('hidden');
  $('jamActiveView').classList.add('hidden');
}

function initJam() {
  $('btnCreateJam').addEventListener('click', createJam);
  $('btnJoinJam').addEventListener('click', joinJam);
  $('btnJamStart').addEventListener('click', startJamTimer);
  $('btnJamStop').addEventListener('click', stopJamTimer);
  $('btnLeaveJam').addEventListener('click', leaveJam);
  $('jamCodeInput').addEventListener('input', e => {
    e.target.value = e.target.value.toUpperCase();
  });

  // Restore saved jam
  const saved = localStorage.getItem('pomotickJam');
  if (saved) {
    api(`/api/jam/state?code=${saved}`).then(({ success, jam }) => {
      if (success) activateJam(jam);
      else localStorage.removeItem('pomotickJam');
    }).catch(() => {});
  }
}

// ═══ MUSIC ═══════════════════════════════════════════════════════════════════
function initMusic() {
  $('btnMusic').addEventListener('click', toggleMusic);
  if ($('btnProfile2')) $('btnProfile2').addEventListener('click', openProfile);
}

function toggleMusic() {
  const music = $('bgMusic');
  const icon  = $('musicIcon');
  if (!music) return;

  if (state.music) {
    music.pause();
    state.music = false;
    if (icon) icon.textContent = 'music_off';
  } else {
    music.play().catch(() => {});
    state.music = true;
    if (icon) icon.textContent = 'music_note';
  }
}

// ─── Util: HTML escape ────────────────────────────────────────────────────────
function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ═══ INIT ════════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  updateGreeting();
  updateClock();
  setInterval(updateClock, 1000);

  initNav();
  initTodo();
  initKanban();
  initPomodoro();
  initJam();
  initMusic();
  initProfilePicture();

  loadTodo();
  loadKanban();
  loadProfile();

  // Profile modal
  $('btnProfile').addEventListener('click', openProfile);
  $('closeProfile').addEventListener('click', closeProfileFn);
  $('btnSaveProfile').addEventListener('click', saveProfile);

  // Close overlays on backdrop click
  $$('.overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.classList.add('hidden');
    });
  });

  // Keyboard shortcut: Escape closes any open overlay
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      $$('.overlay').forEach(o => o.classList.add('hidden'));
    }
  });
});
