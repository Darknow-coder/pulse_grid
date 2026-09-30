/* Pulse Grid — jeu mobile autonome, sans dépendance externe. */
(() => {
  'use strict';

  const GRID = 8;
  const QUEUE_SIZE = 3;
  const SAVE_KEY = 'pulse-grid-save-v1';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const formatNumber = value => new Intl.NumberFormat('fr-FR').format(Math.round(value || 0));

  const SHAPE_LIBRARY = [
    { id: 'dot', cells: [[0, 0]] },
    { id: 'domino-h', cells: [[0, 0], [0, 1]] },
    { id: 'domino-v', cells: [[0, 0], [1, 0]] },
    { id: 'tri-h', cells: [[0, 0], [0, 1], [0, 2]] },
    { id: 'tri-v', cells: [[0, 0], [1, 0], [2, 0]] },
    { id: 'square', cells: [[0, 0], [0, 1], [1, 0], [1, 1]] },
    { id: 'l-small', cells: [[0, 0], [1, 0], [1, 1]] },
    { id: 'l-big', cells: [[0, 0], [1, 0], [2, 0], [2, 1]] },
    { id: 't', cells: [[0, 0], [0, 1], [0, 2], [1, 1]] },
    { id: 'z', cells: [[0, 0], [0, 1], [1, 1], [1, 2]] },
    { id: 'plus', cells: [[0, 1], [1, 0], [1, 1], [1, 2], [2, 1]] },
    { id: 'line-4-h', cells: [[0, 0], [0, 1], [0, 2], [0, 3]] },
    { id: 'line-4-v', cells: [[0, 0], [1, 0], [2, 0], [3, 0]] }
  ];

  const CATALOG = {
    skins: [
      { id: 'aurora', name: 'Aurora', price: 0, description: 'Le calme électrique des premières parties.', primary: '#65e8d0', secondary: '#8b7cff', soft: 'rgba(101,232,208,.18)', contrast: '#07141b' },
      { id: 'ember', name: 'Ember', price: 180, description: 'Une chaleur vive pour jouer sans trembler.', primary: '#ff9b70', secondary: '#ff4f92', soft: 'rgba(255,126,112,.18)', contrast: '#261016' },
      { id: 'cobalt', name: 'Cobalt', price: 260, description: 'Froid, net, précis. Chaque coup compte.', primary: '#6eb8ff', secondary: '#6673ff', soft: 'rgba(110,184,255,.18)', contrast: '#081426' },
      { id: 'lime', name: 'Lime Shift', price: 340, description: 'Une énergie acide qui attire les combos.', primary: '#c4f36d', secondary: '#53d99d', soft: 'rgba(196,243,109,.18)', contrast: '#12210f' },
      { id: 'violet', name: 'Ultraviolet', price: 460, description: 'Le mode nuit des architectes de grille.', primary: '#e09aff', secondary: '#766cff', soft: 'rgba(224,154,255,.18)', contrast: '#1a0c24' }
    ],
    boards: [
      { id: 'night', name: 'Nuit profonde', price: 0, description: 'Le plateau original de Pulse Grid.', shell: '#101a2e', cell: '#18233b', glow: 'rgba(101,232,208,.16)', preview: '#17233c' },
      { id: 'glass', name: 'Verre fumé', price: 220, description: 'Une surface claire et réfléchissante.', shell: '#172536', cell: '#26384c', glow: 'rgba(120,217,255,.2)', preview: '#223548' },
      { id: 'carbon', name: 'Carbone', price: 300, description: 'Contraste mat, sensation arcade.', shell: '#161719', cell: '#26282c', glow: 'rgba(255,155,112,.16)', preview: '#232426' },
      { id: 'nebula', name: 'Nébuleuse', price: 400, description: 'Le vide spatial pour les longues séries.', shell: '#1b1734', cell: '#2a2350', glow: 'rgba(224,154,255,.19)', preview: '#2b2250' }
    ],
    effects: [
      { id: 'burst', name: 'Burst', price: 0, description: 'Éclats géométriques à chaque ligne.', icon: '✦' },
      { id: 'ring', name: 'Anneaux', price: 200, description: 'Une onde lumineuse parcourt le plateau.', icon: '◎' },
      { id: 'confetti', name: 'Confettis', price: 320, description: 'Une pluie colorée pour les grands coups.', icon: '·✦·' },
      { id: 'spark', name: 'Étincelles', price: 430, description: 'Des étincelles rapides et nerveuses.', icon: '⁕' }
    ]
  };

  const DEFAULT_STATS = { games: 0, totalScore: 0, totalLines: 0, bestCombo: 0, piecesPlaced: 0, pulseBursts: 0 };
  const defaultSave = () => ({
    best: 0,
    coins: 240,
    xp: 0,
    level: 1,
    unlocked: { skins: ['aurora'], boards: ['night'], effects: ['burst'] },
    equipped: { skin: 'aurora', board: 'night', effect: 'burst' },
    stats: { ...DEFAULT_STATS },
    sound: true,
    missionDate: '',
    missions: []
  });

  let profile = loadProfile();
  let state = {
    screen: 'home',
    board: createEmptyBoard(),
    queue: [],
    score: 0,
    lines: 0,
    combo: 0,
    bestComboInGame: 0,
    charge: 0,
    pulseBursts: 0,
    selectedPiece: null,
    drag: null,
    preview: [],
    resolving: false,
    gameActive: false,
    paused: false,
    shopTab: 'skins',
    toastTimer: null,
    suppressPieceClick: false
  };

  function loadProfile() {
    let parsed = null;
    try { parsed = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (_) { parsed = null; }
    const base = defaultSave();
    const result = { ...base, ...(parsed || {}) };
    result.unlocked = { ...base.unlocked, ...((parsed && parsed.unlocked) || {}) };
    result.equipped = { ...base.equipped, ...((parsed && parsed.equipped) || {}) };
    result.stats = { ...DEFAULT_STATS, ...((parsed && parsed.stats) || {}) };
    ensureMissionsForToday(result);
    return result;
  }

  function saveProfile() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(profile)); } catch (_) { /* localStorage peut être désactivé en mode privé */ }
  }

  function dateKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  function ensureMissionsForToday(target = profile) {
    if (target.missionDate === dateKey() && Array.isArray(target.missions) && target.missions.length) {
      if (!target.missions.some(mission => mission.type === 'pulse')) target.missions.push({ id: 'pulse', type: 'pulse', title: 'Déclencher 1 Pulse Burst', detail: 'Atteins la charge maximale', target: 1, progress: 0, reward: 90, icon: '⚡', claimed: false });
      return;
    }
    target.missionDate = dateKey();
    target.missions = [
      { id: 'score', type: 'score', title: 'Atteindre 1 500 points', detail: 'En une seule partie', target: 1500, progress: 0, reward: 55, icon: '↗', claimed: false },
      { id: 'lines', type: 'lines', title: 'Dissoudre 10 lignes', detail: 'Lignes ou colonnes', target: 10, progress: 0, reward: 65, icon: '▦', claimed: false },
      { id: 'combo', type: 'combo', title: 'Atteindre un combo de 3', detail: 'Sans quitter la partie', target: 3, progress: 0, reward: 80, icon: '✦', claimed: false },
      { id: 'games', type: 'games', title: 'Jouer 2 parties', detail: 'Chaque tentative compte', target: 2, progress: 0, reward: 45, icon: '◉', claimed: false },
      { id: 'pieces', type: 'pieces', title: 'Poser 18 fragments', detail: 'Toutes parties confondues', target: 18, progress: 0, reward: 50, icon: '◆', claimed: false },
      { id: 'pulse', type: 'pulse', title: 'Déclencher 1 Pulse Burst', detail: 'Atteins la charge maximale', target: 1, progress: 0, reward: 90, icon: '⚡', claimed: false }
    ];
  }

  function createEmptyBoard() { return Array.from({ length: GRID }, () => Array(GRID).fill(null)); }
  function cloneShape(shape) { return shape.map(([r, c]) => [r, c]); }
  function makePiece(def) {
    const cells = cloneShape(def.cells);
    return { id: def.id, cells, rows: Math.max(...cells.map(c => c[0])) + 1, cols: Math.max(...cells.map(c => c[1])) + 1 };
  }

  function occupiedCount() { return state.board.flat().filter(Boolean).length; }

  function chooseShapeDefinition() {
    const density = occupiedCount() / (GRID * GRID);
    const weights = SHAPE_LIBRARY.map(def => {
      const size = def.cells.length;
      let weight = 1;
      if (density > .5 && size <= 3) weight += 2.6;
      if (density > .68 && size <= 2) weight += 2.5;
      if (density < .22 && size >= 4) weight += .8;
      if (size === 5 && density > .4) weight -= .35;
      return Math.max(.15, weight);
    });
    const total = weights.reduce((a, b) => a + b, 0);
    let roll = Math.random() * total;
    for (let i = 0; i < SHAPE_LIBRARY.length; i++) { roll -= weights[i]; if (roll <= 0) return SHAPE_LIBRARY[i]; }
    return SHAPE_LIBRARY[0];
  }

  function canPlace(piece, row, col) {
    return piece.cells.every(([dr, dc]) => {
      const r = row + dr; const c = col + dc;
      return r >= 0 && r < GRID && c >= 0 && c < GRID && !state.board[r][c];
    });
  }

  function canAnyPlace(piece) {
    for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID; c++) if (canPlace(piece, r, c)) return true;
    return false;
  }

  function generatePiece() {
    for (let attempt = 0; attempt < 12; attempt++) {
      const piece = makePiece(chooseShapeDefinition());
      if (occupiedCount() < 46 || canAnyPlace(piece)) return piece;
    }
    const fallback = SHAPE_LIBRARY.slice(0, 3).map(makePiece).find(canAnyPlace);
    return fallback || makePiece(SHAPE_LIBRARY[0]);
  }

  function generateQueue() {
    const pieces = Array.from({ length: QUEUE_SIZE }, generatePiece);
    if (!pieces.some(canAnyPlace) && occupiedCount() < GRID * GRID) {
      pieces[0] = makePiece(SHAPE_LIBRARY[0]);
    }
    return pieces;
  }

  function applyTheme() {
    const skin = CATALOG.skins.find(item => item.id === profile.equipped.skin) || CATALOG.skins[0];
    const board = CATALOG.boards.find(item => item.id === profile.equipped.board) || CATALOG.boards[0];
    document.documentElement.style.setProperty('--skin-primary', skin.primary);
    document.documentElement.style.setProperty('--skin-secondary', skin.secondary);
    document.documentElement.style.setProperty('--skin-soft', skin.soft);
    document.documentElement.style.setProperty('--skin-contrast', skin.contrast);
    document.documentElement.style.setProperty('--board-shell', board.shell);
    document.documentElement.style.setProperty('--cell-bg', board.cell);
    document.documentElement.style.setProperty('--board-glow', board.glow);
    document.body.dataset.effect = profile.equipped.effect;
  }

  function init() {
    applyTheme();
    renderBoard();
    renderHome();
    renderMissions();
    renderShop();
    renderCollection();
    renderStats();
    bindEvents();
    setTimeout(() => $('#boot-screen')?.classList.add('done'), 650);
  }

  function bindEvents() {
    document.addEventListener('click', handleClick);
    document.addEventListener('pointerdown', handlePointerDown, { passive: false });
    document.addEventListener('pointermove', handlePointerMove, { passive: false });
    document.addEventListener('pointerup', handlePointerUp, { passive: false });
    document.addEventListener('pointercancel', handlePointerUp, { passive: false });
    $('#modal-backdrop').addEventListener('click', event => { if (event.target.id === 'modal-backdrop') closeModal(); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape') closeModal(); });
  }

  function handleClick(event) {
    const routeButton = event.target.closest('[data-route]');
    if (routeButton) {
      const route = routeButton.dataset.route;
      if (route === 'home' && state.gameActive && state.screen === 'game') {
        openPauseModal();
      } else {
        showScreen(route);
      }
      return;
    }

    const pieceButton = event.target.closest('[data-piece-index]');
    if (pieceButton && state.screen === 'game') {
      if (state.suppressPieceClick) { state.suppressPieceClick = false; return; }
      selectPiece(Number(pieceButton.dataset.pieceIndex)); return;
    }
    const cell = event.target.closest('[data-cell-index]');
    if (cell && state.screen === 'game' && state.selectedPiece !== null) {
      const index = Number(cell.dataset.cellIndex);
      placeSelectedAt(Math.floor(index / GRID), index % GRID);
      return;
    }

    const action = event.target.closest('[data-action]')?.dataset.action;
    if (!action) return;
    switch (action) {
      case 'play': startNewGame(); break;
      case 'game-home': state.gameActive ? openPauseModal() : showScreen('home'); break;
      case 'pause': openPauseModal(); break;
      case 'resume': closeModal(); state.paused = false; break;
      case 'restart': closeModal(); startNewGame(); break;
      case 'go-home': closeModal(); state.gameActive = false; state.paused = false; showScreen('home'); break;
      case 'close-modal': closeModal(); break;
      case 'hint': giveHint(); break;
      case 'toggle-sound': toggleSound(); break;
      case 'claim-mission': claimMission(event.target.closest('[data-mission-id]')?.dataset.missionId); break;
      case 'buy-item': buyItem(event.target.closest('[data-item]')?.dataset.category, event.target.closest('[data-item]')?.dataset.item); break;
      case 'equip-item': equipItem(event.target.closest('[data-item]')?.dataset.category, event.target.closest('[data-item]')?.dataset.item); break;
      case 'shop-tab': state.shopTab = event.target.closest('[data-shop-tab]').dataset.shopTab; renderShop(); break;
      default: break;
    }
  }

  function handlePointerDown(event) {
    const item = event.target.closest('.piece-item');
    if (!item || item.classList.contains('used') || state.screen !== 'game' || state.resolving || !state.gameActive || state.paused) return;
    event.preventDefault();
    state.suppressPieceClick = true;
    const index = Number(item.dataset.pieceIndex);
    selectPiece(index);
    state.drag = { index, piece: state.queue[index], ghost: createPieceVisual(state.queue[index], true) };
    state.drag.ghost.classList.add('drag-ghost');
    document.body.appendChild(state.drag.ghost);
    updateGhost(event.clientX, event.clientY);
  }

  function handlePointerMove(event) {
    if (!state.drag) return;
    event.preventDefault();
    updateGhost(event.clientX, event.clientY);
    const target = getDropCell(event.clientX, event.clientY, state.drag.piece);
    if (target) showPreview(state.drag.piece, target.row, target.col);
    else clearPreview();
  }

  function handlePointerUp(event) {
    if (!state.drag) return;
    event.preventDefault();
    const drag = state.drag;
    const target = getDropCell(event.clientX, event.clientY, drag.piece);
    drag.ghost?.remove();
    state.drag = null;
    clearPreview();
    if (target && canPlace(drag.piece, target.row, target.col)) placePiece(drag.index, target.row, target.col);
  }

  function updateGhost(x, y) {
    if (!state.drag?.ghost) return;
    state.drag.ghost.style.left = `${x}px`;
    state.drag.ghost.style.top = `${y - 48}px`;
  }

  function getDropCell(clientX, clientY, piece) {
    const board = $('#board'); if (!board) return null;
    const rect = board.getBoundingClientRect();
    if (clientX < rect.left - 24 || clientX > rect.right + 24 || clientY < rect.top - 24 || clientY > rect.bottom + 24) return null;
    const inner = rect.width - parseFloat(getComputedStyle(board).paddingLeft) * 2;
    const gap = parseFloat(getComputedStyle(board).gap) || 5;
    const padding = parseFloat(getComputedStyle(board).paddingLeft) || 8;
    const cellSize = (inner - gap * (GRID - 1)) / GRID;
    const x = clientX - rect.left - padding;
    const y = clientY - rect.top - padding;
    const centerCol = x / (cellSize + gap);
    const centerRow = y / (cellSize + gap);
    const col = Math.round(centerCol - (piece.cols - 1) / 2);
    const row = Math.round(centerRow - (piece.rows - 1) / 2);
    return { row, col };
  }

  function selectPiece(index) {
    if (state.resolving || !state.gameActive || !state.queue[index]) return;
    state.selectedPiece = state.selectedPiece === index ? null : index;
    renderTray();
    clearPreview();
    if (state.selectedPiece !== null) {
      const piece = state.queue[state.selectedPiece];
      $('#game-message').textContent = 'Touche la grille pour déposer ce fragment.';
      if (!canAnyPlace(piece)) showToast('Ce fragment ne trouve plus sa place.');
    } else $('#game-message').textContent = 'Choisis un fragment et fais-le glisser.';
  }

  function placeSelectedAt(row, col) {
    const index = state.selectedPiece;
    if (index === null || !state.queue[index]) return;
    const piece = state.queue[index];
    // En mode "toucher puis toucher", le doigt indique le centre du fragment,
    // ce qui est beaucoup plus naturel qu'un ancrage sur le coin supérieur gauche.
    const anchorRow = row - Math.floor((piece.rows - 1) / 2);
    const anchorCol = col - Math.floor((piece.cols - 1) / 2);
    if (!canPlace(piece, anchorRow, anchorCol)) {
      showPreview(piece, anchorRow, anchorCol);
      showToast('Cet emplacement ne peut pas accueillir ce fragment.');
      vibrate(16);
      return;
    }
    placePiece(index, anchorRow, anchorCol);
  }

  function showPreview(piece, row, col) {
    clearPreview();
    const valid = canPlace(piece, row, col);
    state.preview = piece.cells.map(([dr, dc]) => ({ row: row + dr, col: col + dc, valid }));
    state.preview.forEach(({ row: r, col: c, valid: ok }) => {
      if (r >= 0 && r < GRID && c >= 0 && c < GRID) $('#board').children[r * GRID + c].classList.add(ok ? 'preview-valid' : 'preview-invalid');
    });
  }

  function clearPreview() {
    state.preview = [];
    $$('.cell.preview-valid, .cell.preview-invalid').forEach(cell => cell.classList.remove('preview-valid', 'preview-invalid'));
  }

  function createPieceVisual(piece, ghost = false) {
    const shape = document.createElement('div');
    shape.className = 'piece-shape' + (ghost ? ' ghost-shape' : '');
    shape.style.setProperty('--piece-cols', piece.cols);
    shape.style.setProperty('--piece-rows', piece.rows);
    for (let r = 0; r < piece.rows; r++) for (let c = 0; c < piece.cols; c++) {
      const mini = document.createElement('i');
      mini.className = 'mini-cell' + (piece.cells.some(([pr, pc]) => pr === r && pc === c) ? '' : ' empty');
      shape.appendChild(mini);
    }
    return shape;
  }

  function renderBoard() {
    const board = $('#board');
    if (!board) return;
    if (board.children.length !== GRID * GRID) {
      board.innerHTML = '';
      for (let i = 0; i < GRID * GRID; i++) {
        const cell = document.createElement('div');
        cell.className = 'cell'; cell.dataset.cellIndex = i; cell.setAttribute('role', 'gridcell');
        board.appendChild(cell);
      }
    }
    const rowDensity = state.board.map(row => row.filter(Boolean).length);
    const colDensity = Array.from({ length: GRID }, (_, c) => state.board.filter(row => row[c]).length);
    [...board.children].forEach((cell, index) => {
      const r = Math.floor(index / GRID); const c = index % GRID;
      const occupied = Boolean(state.board[r][c]);
      const almostFull = rowDensity[r] >= 6 || colDensity[c] >= 6;
      cell.className = `cell${occupied ? ' filled' : ''}${almostFull ? ' near-line' : ''}`;
      cell.removeAttribute('style');
    });
  }

  function renderTray() {
    const tray = $('#piece-tray'); if (!tray) return;
    tray.innerHTML = '';
    state.queue.forEach((piece, index) => {
      const item = document.createElement('div');
      item.className = 'piece-item' + (!piece ? ' used' : '') + (state.selectedPiece === index ? ' selected' : '');
      item.dataset.pieceIndex = index; item.setAttribute('role', 'button'); item.setAttribute('aria-label', piece ? `Fragment ${index + 1}` : 'Fragment utilisé');
      if (piece) item.appendChild(createPieceVisual(piece));
      else { const empty = document.createElement('span'); empty.className = 'piece-index'; empty.textContent = '✓'; item.appendChild(empty); }
      const label = document.createElement('span'); label.className = 'piece-index'; label.textContent = piece ? `${index + 1} / 3` : 'PLACÉ'; item.appendChild(label);
      tray.appendChild(item);
    });
  }

  function renderHud() {
    $('#game-score').textContent = formatNumber(state.score);
    $('#game-best').textContent = formatNumber(Math.max(profile.best, state.score));
    const badge = $('#combo-badge');
    if (state.combo > 1) { badge.classList.remove('hidden'); badge.querySelector('b').textContent = state.combo; } else badge.classList.add('hidden');
    renderCharge();
  }

  function renderCharge() {
    const fill = $('#charge-fill'); const value = $('#charge-value'); const message = $('#charge-message');
    if (!fill || !value || !message) return;
    const ready = state.charge >= 100;
    fill.style.width = `${clamp(state.charge, 0, 100)}%`;
    fill.classList.toggle('ready', ready);
    value.textContent = ready ? 'PRÊT' : `${Math.round(state.charge)}%`;
    value.classList.toggle('ready', ready);
    message.textContent = ready ? 'La prochaine ligne déclenche une Pulse Burst !' : 'Dissous des lignes pour charger une rafale.';
  }

  function startNewGame() {
    closeModal();
    state.screen = 'game'; state.board = createEmptyBoard(); state.queue = generateQueue(); state.score = 0; state.lines = 0; state.combo = 0; state.bestComboInGame = 0; state.charge = 0; state.pulseBursts = 0; state.selectedPiece = null; state.resolving = false; state.gameActive = true; state.paused = false;
    showScreen('game'); renderBoard(); renderTray(); renderHud(); $('#game-message').textContent = 'Choisis un fragment et fais-le glisser.'; vibrate(10); playTone(440, .05);
  }

  function showScreen(route) {
    if (route === 'game' && !state.gameActive) { startNewGame(); return; }
    if (state.screen === 'game' && route !== 'game' && state.gameActive) { openPauseModal(); return; }
    state.screen = route;
    $$('.screen').forEach(screen => screen.classList.toggle('active', screen.id === `screen-${route}`));
    $('#bottom-nav').classList.toggle('hidden', route === 'game');
    $$('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.route === route));
    if (route === 'home') renderHome();
    if (route === 'shop') renderShop();
    if (route === 'collection') renderCollection();
    if (route === 'missions') renderMissions();
    if (route === 'stats') renderStats();
  }

  function clearCompletedLines() {
    const fullRows = []; const fullCols = [];
    for (let r = 0; r < GRID; r++) if (state.board[r].every(Boolean)) fullRows.push(r);
    for (let c = 0; c < GRID; c++) if (state.board.every(row => row[c])) fullCols.push(c);
    const cells = new Set();
    fullRows.forEach(r => { for (let c = 0; c < GRID; c++) cells.add(`${r},${c}`); });
    fullCols.forEach(c => { for (let r = 0; r < GRID; r++) cells.add(`${r},${c}`); });
    return { rows: fullRows, cols: fullCols, cells: [...cells].map(value => value.split(',').map(Number)) };
  }

  function placePiece(index, row, col) {
    if (state.resolving || !state.gameActive) return;
    const piece = state.queue[index]; if (!piece || !canPlace(piece, row, col)) return;
    state.resolving = true; state.selectedPiece = null;
    piece.cells.forEach(([dr, dc]) => { state.board[row + dr][col + dc] = { piece: piece.id }; });
    profile.stats.piecesPlaced += 1; updateMission('pieces', 1);
    state.score += piece.cells.length * 10;
    state.queue[index] = null; renderBoard(); renderTray(); renderHud(); vibrate(18); playTone(580, .06);
    const completed = clearCompletedLines();
    if (completed.cells.length) {
      const clearedLines = completed.rows.length + completed.cols.length;
      const pulseReady = state.charge >= 100;
      state.lines += clearedLines; state.combo += 1; state.bestComboInGame = Math.max(state.bestComboInGame, state.combo);
      const chargeGain = clearedLines * 16 + completed.cells.length * 0.7 + state.combo * 3;
      let pulseBonus = 0;
      if (pulseReady) {
        state.charge = 0; state.pulseBursts += 1; profile.stats.pulseBursts += 1; pulseBonus = 250 + clearedLines * 75;
        updateMission('pulse', 1);
      } else state.charge = Math.min(100, state.charge + chargeGain);
      const clearScore = completed.rows.length * 100 + completed.cols.length * 100 + completed.cells.length * 15 + Math.max(0, state.combo - 1) * 70 + pulseBonus;
      state.score += clearScore;
      profile.stats.totalLines += clearedLines;
      if (state.combo > profile.stats.bestCombo) profile.stats.bestCombo = state.combo;
      updateMission('lines', clearedLines); updateMission('combo', state.combo); updateMission('score', state.score);
      markCellsClearing(completed.cells);
      triggerClearEffect(completed.cells, pulseReady);
      $('#game-message').textContent = pulseReady ? 'PULSE BURST ! La grille vient de surcharger.' : `${clearedLines} ligne${clearedLines > 1 ? 's' : ''} dissoute${clearedLines > 1 ? 's' : ''} !`;
      showToast(pulseReady ? `PULSE BURST  ·  +${formatNumber(clearScore)} pts` : state.combo > 1 ? `Combo ×${state.combo}  ·  +${formatNumber(clearScore)} pts` : `Impulsion parfaite  ·  +${formatNumber(clearScore)} pts`);
      vibrate(pulseReady ? 70 : 35); playTone(pulseReady ? 1040 : 760 + state.combo * 35, pulseReady ? .2 : .12);
      setTimeout(() => finishClear(completed), pulseReady ? 440 : 300);
    } else {
      state.combo = 0; updateMission('score', state.score); setTimeout(finishTurn, 110);
    }
    renderHud(); saveProfile();
  }

  function markCellsClearing(cells) {
    cells.forEach(([r, c], index) => {
      const cell = $('#board').children[r * GRID + c];
      if (!cell) return;
      cell.style.setProperty('--clear-delay', `${Math.min(index * 12, 120)}ms`);
      cell.classList.add('clearing');
    });
  }

  function finishClear(completed) {
    completed.cells.forEach(([r, c]) => { state.board[r][c] = null; });
    finishTurn();
  }

  function finishTurn() {
    if (!state.gameActive) return;
    if (state.queue.every(piece => !piece)) { state.queue = generateQueue(); }
    state.resolving = false; renderBoard(); renderTray(); renderHud();
    const playable = state.queue.some(piece => piece && canAnyPlace(piece));
    if (!playable) endGame();
    else { $('#game-message').textContent = state.combo > 1 ? `Le rythme est lancé : combo ×${state.combo}.` : 'À toi de jouer. Trouve le prochain espace.'; saveProfile(); }
  }

  function endGame() {
    if (!state.gameActive) return;
    state.gameActive = false; state.resolving = false;
    const reward = 20 + Math.floor(state.score / 250) + state.lines * 3 + Math.max(0, state.bestComboInGame - 1) * 5 + state.pulseBursts * 12;
    const xpEarned = 45 + Math.floor(state.score / 28) + state.lines * 12;
    const levelBefore = profile.level;
    profile.coins += reward; profile.stats.games += 1; profile.stats.totalScore += state.score; profile.best = Math.max(profile.best, state.score);
    updateMission('games', 1); updateMission('score', state.score);
    const levels = addXp(xpEarned);
    saveProfile(); renderHome(); renderMissions(); renderStats(); renderHud();
    openEndModal(reward, xpEarned, levels, levelBefore);
  }

  function addXp(amount) {
    let levels = 0; profile.xp += amount;
    while (profile.xp >= xpForNextLevel(profile.level)) { profile.xp -= xpForNextLevel(profile.level); profile.level += 1; levels += 1; profile.coins += 75 + profile.level * 10; }
    return levels;
  }
  function xpForNextLevel(level) { return 400 + (level - 1) * 150; }

  function updateMission(type, amount) {
    ensureMissionsForToday(profile);
    const mission = profile.missions.find(item => item.type === type);
    if (!mission) return;
    if (type === 'score' || type === 'combo') mission.progress = Math.max(mission.progress, amount);
    else mission.progress = Math.min(mission.target, mission.progress + amount);
  }

  function claimMission(id) {
    const mission = profile.missions.find(item => item.id === id); if (!mission || mission.claimed || mission.progress < mission.target) return;
    mission.claimed = true; profile.coins += mission.reward; saveProfile(); renderHome(); renderMissions(); renderShop(); showToast(`+${mission.reward} PulseCoins · mission validée`); playTone(880, .12); vibrate(25);
  }

  function renderHome() {
    const next = xpForNextLevel(profile.level); const ratio = clamp(profile.xp / next * 100, 0, 100);
    $('#home-level').textContent = profile.level; $('#home-coins').textContent = formatNumber(profile.coins); $('#home-best').textContent = formatNumber(profile.best); $('#home-xp-label').textContent = `${formatNumber(profile.xp)} / ${formatNumber(next)} XP`; $('#home-xp-fill').style.width = `${ratio}%`;
    $('#sound-icon').textContent = profile.sound ? '◖' : '◌';
    const available = profile.missions.filter(m => m.progress >= m.target && !m.claimed).length; $('#home-mission-count').textContent = available ? `${available} à réclamer` : 'Défis du jour';
    const mission = profile.missions.find(m => !m.claimed) || profile.missions[0];
    if (mission) { $('#home-mission-title').textContent = mission.title; $('#home-mission-fill').style.width = `${clamp(mission.progress / mission.target * 100, 0, 100)}%`; }
  }

  function renderShop() {
    $('#shop-coins').textContent = formatNumber(profile.coins);
    $$('[data-shop-tab]').forEach(button => button.classList.toggle('active', button.dataset.shopTab === state.shopTab));
    const items = CATALOG[state.shopTab];
    $('#shop-content').innerHTML = items.map(item => renderCatalogCard(state.shopTab, item, 'shop')).join('');
  }

  function renderCollection() {
    const skin = findCatalog('skins', profile.equipped.skin); const board = findCatalog('boards', profile.equipped.board); const effect = findCatalog('effects', profile.equipped.effect);
    $('#collection-content').innerHTML = `
      <article class="collection-hero"><div class="collection-swatch"><i></i><i></i><i></i><i></i></div><div><span class="eyebrow accent">ÉQUIPEMENT ACTUEL</span><h2>${skin.name}</h2><p>${board.name} · ${effect.name}</p></div></article>
      <div class="collection-section"><h3>Fragments</h3><div class="catalog-grid">${CATALOG.skins.map(item => renderCatalogCard('skins', item, 'collection')).join('')}</div></div>
      <div class="collection-section"><h3>Plateaux</h3><div class="catalog-grid">${CATALOG.boards.map(item => renderCatalogCard('boards', item, 'collection')).join('')}</div></div>
      <div class="collection-section"><h3>Impulsions</h3><div class="catalog-grid">${CATALOG.effects.map(item => renderCatalogCard('effects', item, 'collection')).join('')}</div></div>`;
  }

  function findCatalog(category, id) { return CATALOG[category].find(item => item.id === id) || CATALOG[category][0]; }
  function isUnlocked(category, id) { return profile.unlocked[category].includes(id); }

  function renderCatalogCard(category, item, mode) {
    const unlocked = isUnlocked(category, item.id); const equipped = profile.equipped[category.slice(0, -1)] === item.id;
    const preview = category === 'skins' ? `<div class="catalog-preview" style="--sample-a:${item.primary};--sample-b:${item.secondary};--preview-bg:linear-gradient(135deg,${item.primary}18,${item.secondary}22)"><span class="sample-grid"><i></i><i></i><i></i><i></i><i></i><i></i></span></div>` : category === 'boards' ? `<div class="catalog-preview" style="--preview-bg:${item.preview}"><span class="sample-grid"><i style="background:${item.cell}"></i><i style="background:${item.cell}"></i><i style="background:${item.cell}"></i><i style="background:${item.cell}"></i><i style="background:${item.cell}"></i><i style="background:${item.cell}"></i></span></div>` : `<div class="catalog-preview effect-preview" style="--preview-bg:linear-gradient(135deg,rgba(101,232,208,.08),rgba(139,124,255,.12))"><span class="effect-symbol">${item.icon}</span></div>`;
    let action = '';
    if (equipped) action = `<button class="item-action equipped" disabled>ÉQUIPÉ</button>`;
    else if (unlocked) action = `<button class="item-action" data-action="equip-item">ÉQUIPER</button>`;
    else action = `<button class="item-action buy" data-action="buy-item">${item.price === 0 ? 'GRATUIT' : `◆ ${item.price}`}</button>`;
    return `<article class="catalog-card ${unlocked ? '' : 'locked'}" data-category="${category}" data-item="${item.id}">${!unlocked ? '<span class="lock-label">VERROUILLÉ</span>' : ''}${preview}<h3>${item.name}</h3><p>${item.description}</p>${action}</article>`;
  }

  function buyItem(category, id) {
    if (!category || !id) return; const item = findCatalog(category, id); if (isUnlocked(category, id)) { equipItem(category, id); return; }
    if (profile.coins < item.price) { showToast('Pas assez de PulseCoins pour cet élément.'); vibrate(20); return; }
    profile.coins -= item.price; profile.unlocked[category].push(id); saveProfile(); renderShop(); renderCollection(); renderHome(); showToast(`${item.name} débloqué !`); playTone(700, .1); vibrate(22);
  }

  function equipItem(category, id) {
    if (!category || !id || !isUnlocked(category, id)) return;
    const key = category.slice(0, -1); profile.equipped[key] = id; applyTheme(); saveProfile(); renderShop(); renderCollection(); showToast(`${findCatalog(category, id).name} équipé`); playTone(600, .07);
  }

  function renderMissions() {
    ensureMissionsForToday(profile);
    $('#missions-content').innerHTML = profile.missions.map(mission => {
      const percent = clamp(mission.progress / mission.target * 100, 0, 100); const ready = mission.progress >= mission.target && !mission.claimed;
      return `<article class="mission-card ${mission.claimed ? 'done' : ''}" data-mission-id="${mission.id}"><div class="mission-head"><div class="mission-icon">${mission.icon}</div><div class="mission-main"><strong>${mission.title}</strong><small>${mission.detail}</small></div><div class="mission-reward">◆ ${mission.reward}</div></div><div class="mission-progress-row"><div class="mini-progress"><span style="width:${percent}%"></span></div><span class="mission-count">${Math.min(mission.progress, mission.target)} / ${mission.target}</span></div>${mission.claimed ? '<button class="claim-button" disabled>RÉCOMPENSE RÉCUPÉRÉE</button>' : `<button class="claim-button" data-action="claim-mission" ${ready ? '' : 'disabled'}>${ready ? 'RÉCUPÉRER LA RÉCOMPENSE' : 'ENCORE UN PEU'}</button>`}</article>`;
    }).join('');
  }

  function renderStats() {
    const next = xpForNextLevel(profile.level); const ratio = clamp(profile.xp / next * 100, 0, 100); const stats = profile.stats;
    $('#stats-content').innerHTML = `<article class="stats-level-card"><div class="stats-level-top"><div><span class="eyebrow accent">NIVEAU ACTUEL</span><h2>Architecte de pulse</h2></div><strong>${profile.level}</strong></div><p>${formatNumber(profile.xp)} / ${formatNumber(next)} XP avant le niveau ${profile.level + 1}</p><div class="xp-track"><span style="width:${ratio}%"></span></div></article><div class="stats-grid"><article class="stat-box"><span>Meilleur score</span><strong>${formatNumber(profile.best)}</strong><em>record personnel</em></article><article class="stat-box"><span>Parties jouées</span><strong>${formatNumber(stats.games)}</strong><em>tentatives</em></article><article class="stat-box"><span>Lignes dissoutes</span><strong>${formatNumber(stats.totalLines)}</strong><em>total cumulé</em></article><article class="stat-box"><span>Meilleur combo</span><strong>×${formatNumber(stats.bestCombo)}</strong><em>chaîne maximale</em></article><article class="stat-box"><span>Score cumulé</span><strong>${formatNumber(stats.totalScore)}</strong><em>toutes parties</em></article><article class="stat-box"><span>Fragments posés</span><strong>${formatNumber(stats.piecesPlaced)}</strong><em>patience & précision</em></article><article class="stat-box"><span>Pulse Bursts</span><strong>${formatNumber(stats.pulseBursts)}</strong><em>surcharges parfaites</em></article></div><div class="tip-card">Les scores, objets et missions sont enregistrés automatiquement sur cet appareil grâce à <strong>localStorage</strong>. Ferme le jeu sans crainte : ta progression reste là.</div>`;
  }

  function giveHint() {
    if (!state.gameActive || state.resolving) return;
    const piece = state.queue.find(item => item && canAnyPlace(item)); if (!piece) return showToast('Aucun fragment ne peut être posé.');
    let best = null; let bestValue = -Infinity;
    for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID; c++) if (canPlace(piece, r, c)) {
      let value = 0; piece.cells.forEach(([dr, dc]) => { const rr = r + dr; const cc = c + dc; if (rr === 0 || rr === GRID - 1) value += .5; if (cc === 0 || cc === GRID - 1) value += .5; });
      const nearFull = [...Array(GRID)].map((_, i) => state.board[r + i]?.filter(Boolean).length || 0).reduce((a, b) => a + b, 0); value += nearFull * .01;
      if (value > bestValue) { bestValue = value; best = { r, c }; }
    }
    const index = state.queue.indexOf(piece); selectPiece(index); showPreview(piece, best.r, best.c); showToast('Indice : cette position garde de l’espace pour la suite.');
    setTimeout(clearPreview, 1100);
  }

  function openPauseModal() {
    if (!state.gameActive) { showScreen('home'); return; }
    state.paused = true;
    openModal(`<div class="pause-icon">Ⅱ</div><span class="modal-kicker">PARTIE EN PAUSE</span><h2>Garde ton rythme.</h2><p>La partie est en sécurité. Reviens quand tu veux continuer à construire ta grille.</p><div class="modal-actions"><button class="secondary" data-action="go-home">ACCUEIL</button><button class="secondary" data-action="restart">RECOMMENCER</button><button class="primary" data-action="resume">CONTINUER</button></div>`);
  }

  function openEndModal(reward, xpEarned, levels, levelBefore) {
    const levelText = levels ? `<div class="level-up">NIVEAU ${levelBefore + levels} atteint · bonus de progression ajouté</div>` : '';
    openModal(`<span class="modal-kicker">LA GRILLE S'EST ÉTEINTE</span><h2>Bien joué.</h2><p>Chaque partie prépare le prochain record. Ton énergie récoltée rejoint ta collection.</p><div class="result-score"><span>SCORE FINAL</span><strong>${formatNumber(state.score)}</strong></div><div class="result-stats"><div class="result-stat"><strong>${formatNumber(state.lines)}</strong><span>lignes</span></div><div class="result-stat"><strong>×${formatNumber(Math.max(profile.stats.bestCombo, state.bestComboInGame))}</strong><span>combo max</span></div><div class="result-stat"><strong>${formatNumber(state.pulseBursts)}</strong><span>bursts</span></div><div class="result-stat"><strong>${formatNumber(profile.best)}</strong><span>meilleur</span></div></div><div class="reward-row"><div>◆ ${reward}<span>PulseCoins</span></div><div>✦ ${xpEarned}<span>XP gagnés</span></div></div>${levelText}<div class="modal-actions"><button class="secondary" data-action="game-home">ACCUEIL</button><button class="primary" data-action="restart">REJOUER</button></div>`);
  }

  function openModal(content) { $('#modal-card').innerHTML = content; $('#modal-backdrop').classList.add('open'); $('#modal-backdrop').setAttribute('aria-hidden', 'false'); }
  function closeModal() { $('#modal-backdrop').classList.remove('open'); $('#modal-backdrop').setAttribute('aria-hidden', 'true'); if (state.gameActive) state.paused = false; }

  function triggerClearEffect(cells, pulseBurst = false) {
    const layer = $('#fx-layer'); if (!layer) return;
    const effect = profile.equipped.effect;
    const particleCells = pulseBurst
      ? Array.from({ length: Math.min(64, cells.length * 3) }, (_, index) => cells[index % cells.length])
      : cells.slice(0, 24);
    particleCells.forEach(([r, c], index) => {
      const particle = document.createElement('i');
      const type = pulseBurst ? 'pulse-particle' : effect === 'ring' ? 'ring' : effect === 'confetti' ? 'round' : '';
      particle.className = `fx-particle ${type}`;
      const x = ((c + .5) / GRID) * 100; const y = ((r + .5) / GRID) * 100;
      particle.style.left = `${x}%`; particle.style.top = `${y}%`; particle.style.setProperty('--dx', `${(Math.random() - .5) * (pulseBurst ? 150 : 95)}px`); particle.style.setProperty('--dy', `${-15 - Math.random() * (pulseBurst ? 110 : 75)}px`); particle.style.animationDelay = `${index * (pulseBurst ? 7 : 12)}ms`; layer.appendChild(particle); setTimeout(() => particle.remove(), pulseBurst ? 1100 : 850);
    });
    if (pulseBurst || effect === 'spark') layer.animate([{ opacity: .35 }, { opacity: 1 }, { opacity: .35 }], { duration: pulseBurst ? 440 : 320, iterations: 2 });
  }

  function showToast(message) {
    const toast = $('#toast'); toast.textContent = message; toast.classList.add('show'); clearTimeout(state.toastTimer); state.toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
  }

  function toggleSound() { profile.sound = !profile.sound; saveProfile(); renderHome(); showToast(profile.sound ? 'Sons activés' : 'Sons coupés'); if (profile.sound) playTone(660, .07); }
  function vibrate(duration) { if (navigator.vibrate) navigator.vibrate(duration); }
  function playTone(frequency, duration) {
    if (!profile.sound) return;
    try { const AudioContext = window.AudioContext || window.webkitAudioContext; if (!AudioContext) return; const context = new AudioContext(); const oscillator = context.createOscillator(); const gain = context.createGain(); oscillator.type = 'sine'; oscillator.frequency.value = frequency; gain.gain.setValueAtTime(.035, context.currentTime); gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + duration); oscillator.connect(gain); gain.connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + duration); } catch (_) { /* audio facultatif */ }
  }

  init();
})();
