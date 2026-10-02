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
  const scheduleFrame = callback => typeof requestAnimationFrame === 'function' ? requestAnimationFrame(callback) : setTimeout(callback, 16);
  const cancelScheduledFrame = frame => {
    if (frame === null || frame === undefined) return;
    if (typeof cancelAnimationFrame === 'function' && typeof requestAnimationFrame === 'function') cancelAnimationFrame(frame);
    else clearTimeout(frame);
  };

  const SHAPE_LIBRARY = [
    { id: 'dot', cells: [[0, 0]] },
    { id: 'domino-h', cells: [[0, 0], [0, 1]] },
    { id: 'domino-v', cells: [[0, 0], [1, 0]] },
    { id: 'tri-h', cells: [[0, 0], [0, 1], [0, 2]] },
    { id: 'tri-v', cells: [[0, 0], [1, 0], [2, 0]] },
    { id: 'square', cells: [[0, 0], [0, 1], [1, 0], [1, 1]] },
    { id: 'rect-2x3', cells: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2]] },
    { id: 'rect-3x3', cells: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]] },
    { id: 'l-small', cells: [[0, 0], [1, 0], [1, 1]] },
    { id: 'l-big', cells: [[0, 0], [1, 0], [2, 0], [2, 1]] },
    { id: 't', cells: [[0, 0], [0, 1], [0, 2], [1, 1]] },
    { id: 'z', cells: [[0, 0], [0, 1], [1, 1], [1, 2]] },
    { id: 'plus', cells: [[0, 1], [1, 0], [1, 1], [1, 2], [2, 1]] },
    { id: 'line-4-h', cells: [[0, 0], [0, 1], [0, 2], [0, 3]] },
    { id: 'line-4-v', cells: [[0, 0], [1, 0], [2, 0], [3, 0]] }
  ];

  const PIECE_COLORS = {
    dot: { primary: '#65e8d0', secondary: '#23b7d4', soft: 'rgba(101,232,208,.28)' },
    'domino-h': { primary: '#65e8d0', secondary: '#299bd6', soft: 'rgba(101,232,208,.28)' },
    'domino-v': { primary: '#a894ff', secondary: '#625dff', soft: 'rgba(139,124,255,.28)' },
    'tri-h': { primary: '#ffe08a', secondary: '#ff9b70', soft: 'rgba(255,209,122,.3)' },
    'tri-v': { primary: '#a6f58c', secondary: '#38cba7', soft: 'rgba(143,240,187,.28)' },
    square: { primary: '#ffadca', secondary: '#ff5d91', soft: 'rgba(255,127,158,.28)' },
    'rect-2x3': { primary: '#ffd17a', secondary: '#ff7f9e', soft: 'rgba(255,209,122,.28)' },
    'rect-3x3': { primary: '#c4f36d', secondary: '#53d99d', soft: 'rgba(196,243,109,.28)' },
    'l-small': { primary: '#91d9ff', secondary: '#558cff', soft: 'rgba(110,184,255,.28)' },
    'l-big': { primary: '#d1f878', secondary: '#54d99d', soft: 'rgba(196,243,109,.28)' },
    t: { primary: '#e4a5ff', secondary: '#9472ff', soft: 'rgba(224,154,255,.28)' },
    z: { primary: '#ffb18b', secondary: '#ff637c', soft: 'rgba(255,155,112,.28)' },
    plus: { primary: '#f4b6ff', secondary: '#b56cff', soft: 'rgba(224,154,255,.28)' },
    'line-4-h': { primary: '#75e9ff', secondary: '#4c8dff', soft: 'rgba(110,184,255,.28)' },
    'line-4-v': { primary: '#ffe28a', secondary: '#ff856e', soft: 'rgba(255,209,122,.3)' }
  };
  const getPieceColor = id => PIECE_COLORS[id] || PIECE_COLORS.dot;
  const STARTER_WAVES = [
    ['domino-h', 'square', 'tri-h'],
    ['domino-v', 'l-small', 'line-4-h']
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
      { id: 'night', name: 'Nuit profonde', price: 0, description: 'Le plateau original de Pulse Grid.', shell: '#182846', cell: '#263b5d', glow: 'rgba(101,232,208,.2)', preview: '#203452' },
      { id: 'glass', name: 'Verre fumé', price: 220, description: 'Une surface claire et réfléchissante.', shell: '#20384c', cell: '#31536a', glow: 'rgba(120,217,255,.24)', preview: '#2d4b60' },
      { id: 'carbon', name: 'Carbone', price: 300, description: 'Contraste mat, sensation arcade.', shell: '#22252d', cell: '#343a43', glow: 'rgba(255,155,112,.2)', preview: '#30343b' },
      { id: 'nebula', name: 'Nébuleuse', price: 400, description: 'Le vide spatial pour les longues séries.', shell: '#2a2550', cell: '#3b326b', glow: 'rgba(224,154,255,.24)', preview: '#3a3263' }
    ],
    effects: [
      { id: 'burst', name: 'Burst', price: 0, description: 'Éclats géométriques à chaque ligne.', icon: '✦' },
      { id: 'ring', name: 'Anneaux', price: 200, description: 'Une onde lumineuse parcourt le plateau.', icon: '◎' },
      { id: 'confetti', name: 'Confettis', price: 320, description: 'Une pluie colorée pour les grands coups.', icon: '·✦·' },
      { id: 'spark', name: 'Étincelles', price: 430, description: 'Des étincelles rapides et nerveuses.', icon: '⁕' }
    ],
    boosters: [
      { id: 'hammer', name: 'Marteau', price: 65, description: 'Retire un carré occupé pour ouvrir une nouvelle voie.', icon: '⌁' },
      { id: 'reroll', name: 'Recomposition', price: 85, description: 'Remplace les fragments encore disponibles.', icon: '⟳' },
      { id: 'pulse-core', name: 'Noyau Pulse', price: 120, description: 'Charge instantanément la prochaine Pulse Burst.', icon: '⚡' }
    ],
    packs: [
      { id: 'starter', name: 'Pack de départ', price: 210, description: 'Un petit stock pour tes premières parties.', icon: '▣', contents: { hammer: 2, reroll: 1, 'pulse-core': 1 } },
      { id: 'combo', name: 'Pack Combo', price: 390, description: 'Le kit idéal pour viser un nouveau record.', icon: '✦', contents: { hammer: 3, reroll: 2, 'pulse-core': 2 } },
      { id: 'overdrive', name: 'Pack Overdrive', price: 680, description: 'Une réserve complète pour les longues sessions.', icon: '◆', contents: { hammer: 5, reroll: 3, 'pulse-core': 4 } }
    ]
  };

  const PROGRESSION_REWARDS = [
    { level: 1, type: 'coins', amount: 60, icon: '◆', title: 'Impulsion de départ' },
    { level: 2, type: 'booster', id: 'hammer', amount: 1, icon: '⌁', title: 'Marteau' },
    { level: 3, type: 'coins', amount: 90, icon: '◆', title: 'Réserve de PulseCoins' },
    { level: 4, type: 'booster', id: 'reroll', amount: 1, icon: '⟳', title: 'Recomposition' },
    { level: 5, type: 'skin', id: 'cobalt', icon: '✦', title: 'Skin Cobalt', milestone: true },
    { level: 6, type: 'coins', amount: 120, icon: '◆', title: 'Réserve renforcée' },
    { level: 7, type: 'pack', id: 'starter', amount: 1, icon: '▣', title: 'Pack de départ' },
    { level: 8, type: 'booster', id: 'pulse-core', amount: 1, icon: '⚡', title: 'Noyau Pulse' },
    { level: 9, type: 'coins', amount: 140, icon: '◆', title: 'Réserve brillante' },
    { level: 10, type: 'board', id: 'glass', icon: '▦', title: 'Plateau Verre fumé', milestone: true },
    { level: 11, type: 'coins', amount: 150, icon: '◆', title: 'PulseCoins' },
    { level: 12, type: 'booster', id: 'hammer', amount: 2, icon: '⌁', title: 'Deux Marteaux' },
    { level: 13, type: 'effect', id: 'ring', icon: '◎', title: 'Effet Anneaux' },
    { level: 14, type: 'coins', amount: 180, icon: '◆', title: 'Réserve experte' },
    { level: 15, type: 'skin', id: 'lime', icon: '✦', title: 'Skin Lime Shift', milestone: true },
    { level: 16, type: 'pack', id: 'combo', amount: 1, icon: '▣', title: 'Pack Combo' },
    { level: 17, type: 'coins', amount: 200, icon: '◆', title: 'PulseCoins' },
    { level: 18, type: 'booster', id: 'pulse-core', amount: 2, icon: '⚡', title: 'Double Noyau Pulse' },
    { level: 19, type: 'coins', amount: 220, icon: '◆', title: 'Réserve avancée' },
    { level: 20, type: 'effect', id: 'confetti', icon: '✧', title: 'Effet Confettis', milestone: true },
    { level: 21, type: 'coins', amount: 240, icon: '◆', title: 'PulseCoins' },
    { level: 22, type: 'booster', id: 'reroll', amount: 2, icon: '⟳', title: 'Double Recomposition' },
    { level: 23, type: 'pack', id: 'starter', amount: 1, icon: '▣', title: 'Pack de départ' },
    { level: 24, type: 'coins', amount: 260, icon: '◆', title: 'Réserve architecte' },
    { level: 25, type: 'board', id: 'nebula', icon: '▦', title: 'Plateau Nébuleuse', milestone: true },
    { level: 26, type: 'booster', id: 'hammer', amount: 2, icon: '⌁', title: 'Marteaux experts' },
    { level: 27, type: 'coins', amount: 280, icon: '◆', title: 'PulseCoins' },
    { level: 28, type: 'effect', id: 'spark', icon: '⁕', title: 'Effet Étincelles' },
    { level: 29, type: 'coins', amount: 300, icon: '◆', title: 'Grande réserve' },
    { level: 30, type: 'skin', id: 'violet', icon: '✦', title: 'Skin Ultraviolet', milestone: true }
  ];

  const DEFAULT_STATS = { games: 0, totalScore: 0, totalLines: 0, bestCombo: 0, piecesPlaced: 0, pulseBursts: 0, boostersUsed: 0 };
  const defaultSave = () => ({
    best: 0,
    coins: 240,
    xp: 0,
    level: 1,
    unlocked: { skins: ['aurora'], boards: ['night'], effects: ['burst'] },
    equipped: { skin: 'aurora', board: 'night', effect: 'burst' },
    inventory: { hammer: 2, reroll: 1, 'pulse-core': 0 },
    stats: { ...DEFAULT_STATS },
    sound: true,
    music: false,
    volume: .72,
    progressionClaims: [],
    missionDate: '',
    missions: []
  });

  let profile = loadProfile();
  let state = {
    screen: 'home',
    board: createEmptyBoard(),
    queue: [],
    turn: 0,
    score: 0,
    lines: 0,
    combo: 0,
    recordAnnounced: false,
    bestComboInGame: 0,
    charge: 0,
    pulseBursts: 0,
    activeBooster: null,
    selectedPiece: null,
    drag: null,
    preview: [],
    previewNodes: [],
    previewKey: '',
    resolving: false,
    gameActive: false,
    paused: false,
    shopTab: 'skins',
    toastTimer: null,
    clearFeedbackTimer: null,
    highScoreTimer: null,
    clearVisualPending: false,
    clearVisualToken: 0,
    boardMetricsCache: null,
    suppressPieceClick: false
  };

  function loadProfile() {
    let parsed = null;
    try { parsed = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (_) { parsed = null; }
    const base = defaultSave();
    const result = { ...base, ...(parsed || {}) };
    result.unlocked = { ...base.unlocked, ...((parsed && parsed.unlocked) || {}) };
    result.equipped = { ...base.equipped, ...((parsed && parsed.equipped) || {}) };
    result.inventory = { ...base.inventory, ...((parsed && parsed.inventory) || {}) };
    result.stats = { ...DEFAULT_STATS, ...((parsed && parsed.stats) || {}) };
    result.sound = result.sound !== false;
    result.music = result.music === true;
    result.volume = clamp(Number(result.volume ?? .72), 0, 1);
    result.progressionClaims = Array.isArray(result.progressionClaims)
      ? [...new Set(result.progressionClaims.map(Number).filter(level => Number.isInteger(level) && level > 0))]
      : [];
    Object.keys(base.unlocked).forEach(category => {
      if (!Array.isArray(result.unlocked[category])) result.unlocked[category] = [...base.unlocked[category]];
    });
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
    return { id: def.id, color: getPieceColor(def.id), cells, rows: Math.max(...cells.map(c => c[0])) + 1, cols: Math.max(...cells.map(c => c[1])) + 1 };
  }

  function occupiedCount() { return state.board.flat().filter(Boolean).length; }

  function evaluateShapeOpportunity(def) {
    const piece = makePiece(def);
    let bestClear = 0; let bestNear = 0; let bestPotential = 0;
    for (let row = 0; row < GRID; row++) for (let col = 0; col < GRID; col++) {
      if (!canPlace(piece, row, col)) continue;
      let clear = 0; let near = 0;
      for (let r = 0; r < GRID; r++) {
        let filled = state.board[r].filter(Boolean).length;
        piece.cells.forEach(([dr, dc]) => { if (row + dr === r) filled += 1; });
        if (filled >= GRID) clear += 1;
        else if (filled === GRID - 1) near += 1;
      }
      for (let c = 0; c < GRID; c++) {
        let filled = state.board.reduce((sum, currentRow) => sum + (currentRow[c] ? 1 : 0), 0);
        piece.cells.forEach(([dr, dc]) => { if (col + dc === c) filled += 1; });
        if (filled >= GRID) clear += 1;
        else if (filled === GRID - 1) near += 1;
      }
      bestClear = Math.max(bestClear, clear);
      bestNear = Math.max(bestNear, near);
      bestPotential = Math.max(bestPotential, clear * 5 + near * 1.25);
    }
    return { bestClear, bestNear, bestPotential };
  }

  function chooseShapeDefinition() {
    const density = occupiedCount() / (GRID * GRID);
    const opening = state.turn < 6 && occupiedCount() < 24;
    const weights = SHAPE_LIBRARY.map(def => {
      const size = def.cells.length;
      const opportunity = evaluateShapeOpportunity(def);
      let weight = 1;
      if (density > .5 && size <= 3) weight += 2.6;
      if (density > .68 && size <= 2) weight += 2.5;
      if (!opening && density < .22 && size >= 4) weight += .8;
      if (opening && size <= 4) weight += 2.2;
      if (opening && size >= 5) weight *= .25;
      if (size >= 6 && density > .42) weight *= .32;
      if (opportunity.bestClear >= 1) weight += Math.min(4.5, opportunity.bestClear * 1.8);
      if (opportunity.bestClear >= 2) weight += 2.5;
      if (opportunity.bestNear >= 2) weight += Math.min(3, opportunity.bestNear * .55);
      if (opportunity.bestPotential === 0 && density > .58) weight *= .7;
      return Math.max(.12, weight);
    });
    const total = weights.reduce((a, b) => a + b, 0);
    let roll = Math.random() * total;
    for (let i = 0; i < SHAPE_LIBRARY.length; i++) { roll -= weights[i]; if (roll <= 0) return SHAPE_LIBRARY[i]; }
    return SHAPE_LIBRARY[0];
  }

  function getStarterQueue() {
    const wave = state.turn < 3 ? STARTER_WAVES[0] : state.turn < 6 ? STARTER_WAVES[1] : null;
    if (!wave) return null;
    return wave.map(id => makePiece(SHAPE_LIBRARY.find(def => def.id === id)));
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
      if (canAnyPlace(piece)) return piece;
    }
    const fallback = SHAPE_LIBRARY.slice(0, 3).map(makePiece).find(canAnyPlace);
    return fallback || makePiece(SHAPE_LIBRARY[0]);
  }

  function generateQueue() {
    const starterQueue = getStarterQueue();
    const pieces = starterQueue || Array.from({ length: QUEUE_SIZE }, generatePiece);
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
    renderProgression();
    bindEvents();
    setTimeout(() => $('#boot-screen')?.classList.add('done'), 650);
  }

  function bindEvents() {
    document.addEventListener('click', handleClick);
    document.addEventListener('pointerdown', handlePointerDown, { passive: false });
    document.addEventListener('pointermove', handlePointerMove, { passive: false });
    document.addEventListener('pointerup', handlePointerUp, { passive: false });
    document.addEventListener('pointercancel', cancelDrag, { passive: false });
    window.addEventListener('blur', cancelDrag);
    const invalidateBoardMetrics = () => { state.boardMetricsCache = null; };
    window.addEventListener('resize', invalidateBoardMetrics, { passive: true });
    window.addEventListener('orientationchange', invalidateBoardMetrics, { passive: true });
    window.addEventListener('scroll', invalidateBoardMetrics, { passive: true, capture: true });
    document.addEventListener('visibilitychange', () => { if (document.hidden) cancelDrag(); });
    $('#modal-backdrop').addEventListener('click', event => { if (event.target.id === 'modal-backdrop') closeModal(); });
    $('#volume-control')?.addEventListener('input', event => {
      profile.volume = clamp(Number(event.target.value) / 100, 0, 1);
      saveProfile();
      const label = $('#volume-label'); if (label) label.textContent = `${Math.round(profile.volume * 100)}%`;
    });
    document.addEventListener('keydown', event => { if (event.key === 'Escape') closeModal(); });
  }

  function handleClick(event) {
    const clickedButton = event.target.closest('button');
    if (clickedButton) retriggerClass(clickedButton, 'button-press');
    const routeButton = event.target.closest('[data-route]');
    if (routeButton) {
      playSfx('button'); vibrate(7);
      const route = routeButton.dataset.route;
      if (route === 'home' && state.gameActive && state.screen === 'game') {
        openPauseModal();
      } else {
        showScreen(route);
      }
      return;
    }

    const shopTabButton = event.target.closest('[data-shop-tab]');
    if (shopTabButton) {
      playSfx('button'); vibrate(6);
      state.shopTab = shopTabButton.dataset.shopTab;
      renderShop();
      return;
    }

    const pieceButton = event.target.closest('[data-piece-index]');
    if (pieceButton && state.screen === 'game') {
      if (state.suppressPieceClick) { state.suppressPieceClick = false; return; }
      if (state.activeBooster) { showToast('Utilise le bonus actif sur la grille.'); return; }
      selectPiece(Number(pieceButton.dataset.pieceIndex)); return;
    }
    const cell = event.target.closest('[data-cell-index]');
    if (cell && state.screen === 'game') {
      const index = Number(cell.dataset.cellIndex);
      if (state.activeBooster) { useBoosterAtCell(Math.floor(index / GRID), index % GRID); return; }
      if (state.selectedPiece !== null) {
        placeSelectedAt(Math.floor(index / GRID), index % GRID);
        return;
      }
    }

    const action = event.target.closest('[data-action]')?.dataset.action;
    if (!action) return;
    if (['pause', 'resume', 'go-home', 'close-modal', 'hint', 'progression', 'progression-current'].includes(action)) { playSfx('button'); vibrate(7); }
    switch (action) {
      case 'play': startNewGame(); break;
      case 'game-home': state.gameActive ? openPauseModal() : showScreen('home'); break;
      case 'pause': openPauseModal(); break;
      case 'resume': closeModal(); state.paused = false; break;
      case 'restart': closeModal(); startNewGame(); break;
      case 'go-home': closeModal(); state.gameActive = false; state.paused = false; showScreen('home'); break;
      case 'close-modal': closeModal(); break;
      case 'hint': giveHint(); break;
      case 'progression': closeModal(); state.gameActive = false; showScreen('progression'); break;
      case 'progression-current': scrollProgressionToCurrent(true); break;
      case 'claim-progression': claimProgressionReward(event.target.closest('[data-level]')?.dataset.level); break;
      case 'use-booster': useBooster(event.target.closest('[data-booster-id]')?.dataset.boosterId); break;
      case 'toggle-sound': toggleSound(); break;
      case 'toggle-music': toggleMusic(); break;
      case 'claim-mission': claimMission(event.target.closest('[data-mission-id]')?.dataset.missionId); break;
      case 'buy-item': buyItem(event.target.closest('[data-item]')?.dataset.category, event.target.closest('[data-item]')?.dataset.item); break;
      case 'buy-booster': buyBooster(event.target.closest('[data-booster-id]')?.dataset.boosterId); break;
      case 'buy-pack': buyPack(event.target.closest('[data-pack-id]')?.dataset.packId); break;
      case 'equip-item': equipItem(event.target.closest('[data-item]')?.dataset.category, event.target.closest('[data-item]')?.dataset.item); break;
      case 'shop-tab': state.shopTab = event.target.closest('[data-shop-tab]').dataset.shopTab; renderShop(); break;
      default: break;
    }
  }

  function cancelDrag() {
    if (!state.drag) return;
    cancelScheduledFrame(state.drag.frame);
    cancelScheduledFrame(state.drag.previewFrame);
    state.drag.sourceItem?.releasePointerCapture?.(state.drag.pointerId);
    state.drag.ghost?.remove();
    state.drag = null;
    state.suppressPieceClick = false;
    clearPreview();
  }

  function handlePointerDown(event) {
    const item = event.target.closest('.piece-item');
    if (!item || state.drag || state.activeBooster || item.classList.contains('used') || state.screen !== 'game' || state.resolving || !state.gameActive || state.paused) return;

    const index = Number(item.dataset.pieceIndex);
    const piece = state.queue[index];
    const visual = item.querySelector('.piece-shape');
    if (!piece || !visual) return;

    // Toutes les coordonnées utilisées ici sont des coordonnées viewport :
    // clientX/clientY + getBoundingClientRect(). Cela reste juste même si la
    // page défile pendant le drag, sans compensation fixe liée au navigateur.
    const visualRect = visual.getBoundingClientRect();
    // L'offset peut aussi être légèrement extérieur au visuel (padding de la
    // carte de pièce) : on le conserve brut pour éviter tout saut initial.
    const grabOffsetX = event.clientX - visualRect.left;
    const grabOffsetY = event.clientY - visualRect.top;
    const hitX = clamp(grabOffsetX, 0, visualRect.width);
    const hitY = clamp(grabOffsetY, 0, visualRect.height);
    const computedVisual = getComputedStyle(visual);
    const cssGap = parseFloat(computedVisual.gap) || 0;
    const cssCellWidth = parseFloat(computedVisual.gridTemplateColumns) || visualRect.width / piece.cols;
    const cssCellHeight = parseFloat(computedVisual.gridTemplateRows) || visualRect.height / piece.rows;
    const cellPitchX = cssCellWidth + cssGap;
    const cellPitchY = cssCellHeight + cssGap;
    const naturalWidth = cssCellWidth * piece.cols + cssGap * Math.max(0, piece.cols - 1);
    const naturalHeight = cssCellHeight * piece.rows + cssGap * Math.max(0, piece.rows - 1);
    const trayScaleX = naturalWidth ? visualRect.width / naturalWidth : 1;
    const trayScaleY = naturalHeight ? visualRect.height / naturalHeight : 1;

    // On mémorise aussi la cellule visuelle située sous le doigt. La pièce
    // peut être saisie par son centre, son bord ou son coin sans aucun saut.
    const grabCol = clamp(Math.floor(hitX / (cellPitchX * trayScaleX)), 0, piece.cols - 1);
    const grabRow = clamp(Math.floor(hitY / (cellPitchY * trayScaleY)), 0, piece.rows - 1);

    // Le fantôme utilise maintenant les dimensions réelles des carrés du
    // plateau. Une pièce de 3 cases affiche donc 3 carrés de la même taille
    // que ceux qu'elle va occuper, quelle que soit la résolution du téléphone.
    const boardMetrics = getBoardMetrics();
    const dragCellWidth = boardMetrics?.cellWidth || cssCellWidth * trayScaleX;
    const dragCellHeight = boardMetrics?.cellHeight || cssCellHeight * trayScaleY;
    const dragGapX = boardMetrics?.gapX ?? cssGap * trayScaleX;
    const dragGapY = boardMetrics?.gapY ?? cssGap * trayScaleY;
    const trayCellWidth = cssCellWidth * trayScaleX;
    const trayCellHeight = cssCellHeight * trayScaleY;
    const trayPitchX = trayCellWidth + cssGap * trayScaleX;
    const trayPitchY = trayCellHeight + cssGap * trayScaleY;
    const offsetInsideTrayCellX = hitX - grabCol * trayPitchX;
    const offsetInsideTrayCellY = hitY - grabRow * trayPitchY;
    const cellFractionX = trayCellWidth ? offsetInsideTrayCellX / trayCellWidth : .5;
    const cellFractionY = trayCellHeight ? offsetInsideTrayCellY / trayCellHeight : .5;
    const ghostOffsetX = grabCol * (dragCellWidth + dragGapX) + cellFractionX * dragCellWidth;
    const ghostOffsetY = grabRow * (dragCellHeight + dragGapY) + cellFractionY * dragCellHeight;

    event.preventDefault();
    state.suppressPieceClick = true;
    // Ne pas reconstruire le tray pendant pointerdown : l'élément touché
    // resterait alors sans cible native sur certains Android. Le fragment
    // fantôme et la sélection sont mis à jour sans interrompre le pointer.
    state.selectedPiece = index;
    $$('.piece-item.selected').forEach(pieceItem => pieceItem.classList.remove('selected'));
    item.classList.add('selected');
    vibrate(9);
    clearPreview();
    $('#game-message').textContent = 'Touche la grille pour déposer ce fragment.';

    const ghost = createPieceVisual(piece, true);
    ghost.classList.add('drag-ghost');
    ghost.style.setProperty('--drag-cell-width', `${dragCellWidth}px`);
    ghost.style.setProperty('--drag-cell-height', `${dragCellHeight}px`);
    ghost.style.setProperty('--drag-gap-x', `${dragGapX}px`);
    ghost.style.setProperty('--drag-gap-y', `${dragGapY}px`);

    state.drag = {
      pointerId: event.pointerId,
      index,
      piece,
      ghost,
      sourceItem: item,
      grabOffsetX: ghostOffsetX,
      grabOffsetY: ghostOffsetY,
      grabCol,
      grabRow,
      pendingX: event.clientX,
      pendingY: event.clientY,
      previewCellKey: '',
      frame: null,
      previewFrame: null
    };
    item.setPointerCapture?.(event.pointerId);
    document.body.appendChild(ghost);
    updateGhost(event.clientX, event.clientY);
    const playSelectSound = () => {
      if (state.drag?.pointerId === event.pointerId) playSfx('select');
    };
    scheduleFrame(playSelectSound);
  }

  function handlePointerMove(event) {
    if (!state.drag || event.pointerId !== state.drag.pointerId) return;
    event.preventDefault();
    const drag = state.drag;
    drag.pendingX = event.clientX; drag.pendingY = event.clientY;
    // Aucun calcul de layout ici : on ne fait que mémoriser la dernière
    // position. La position visuelle et la preview sont appliquées ensemble
    // juste avant le prochain paint.
    if (drag.frame !== null) return;
    const paint = () => {
      if (!state.drag || state.drag !== drag) return;
      drag.frame = null;
      const x = drag.pendingX; const y = drag.pendingY;
      updateGhost(x, y, drag);
      // La preview est volontairement reléguée à la frame suivante : le
      // fantôme est peint en priorité, même si le calcul de grille coûte plus.
      if (drag.previewFrame === null) drag.previewFrame = scheduleFrame(() => {
        if (!state.drag || state.drag !== drag) return;
        drag.previewFrame = null;
        updateDragPreview(drag, drag.pendingX, drag.pendingY);
      });
    };
    drag.frame = scheduleFrame(paint);
  }

  function updateDragPreview(drag, x, y) {
    if (!drag?.ghost || state.drag !== drag) return;
    const gridCell = getGridCellFromPoint(x, y);
    if (!gridCell) {
      drag.previewCellKey = '';
      clearPreview();
      return;
    }
    const cellKey = `${gridCell.row}:${gridCell.col}`;
    if (drag.previewCellKey === cellKey) return;
    drag.previewCellKey = cellKey;
    const placement = getPlacementFromGridCell(drag.piece, gridCell.row, gridCell.col, { row: drag.grabRow, col: drag.grabCol });
    showPreview(drag.piece, placement);
  }

  function handlePointerUp(event) {
    if (!state.drag || event.pointerId !== state.drag.pointerId) return;
    event.preventDefault();
    const drag = state.drag;
    drag.pendingX = event.clientX; drag.pendingY = event.clientY;
    cancelScheduledFrame(drag.frame);
    cancelScheduledFrame(drag.previewFrame);
    drag.frame = null;
    drag.previewFrame = null;
    updateGhost(drag.pendingX, drag.pendingY, drag);
    const placement = getDropPlacement(drag.pendingX, drag.pendingY, drag);
    drag.sourceItem?.releasePointerCapture?.(drag.pointerId);
    drag.ghost?.remove();
    state.drag = null;
    clearPreview();
    if (placement?.valid) placePiece(drag.index, placement.row, placement.col);
    else renderTray();
  }

  function updateGhost(x, y, drag = state.drag) {
    if (!drag?.ghost) return;
    // Le fantôme conserve exactement l'offset de saisie. transform est
    // composité par le GPU et évite un nouveau layout à chaque mouvement.
    const ghostX = x - drag.grabOffsetX;
    const ghostY = y - drag.grabOffsetY;
    drag.ghost.style.transform = `translate3d(${ghostX}px, ${ghostY}px, 0)`;
  }

  function getBoardMetrics() {
    if (state.boardMetricsCache) return state.boardMetricsCache.value;
    const board = $('#board');
    if (!board || !board.children.length) return null;
    const firstCell = [...board.children].find(cell => !cell.classList.contains('filled')) || board.children[0];
    if (!firstCell) return null;

    const boardRect = board.getBoundingClientRect();
    const measuredRect = firstCell.getBoundingClientRect();
    const boardStyle = getComputedStyle(board);
    const borderLeft = parseFloat(boardStyle.borderLeftWidth) || 0;
    const borderTop = parseFloat(boardStyle.borderTopWidth) || 0;
    const paddingLeft = parseFloat(boardStyle.paddingLeft) || 0;
    const paddingTop = parseFloat(boardStyle.paddingTop) || 0;
    const fallbackGap = parseFloat(boardStyle.gap) || 5;
    const gapX = parseFloat(boardStyle.columnGap) || fallbackGap;
    const gapY = parseFloat(boardStyle.rowGap) || fallbackGap;

    const value = {
      rect: boardRect,
      originX: boardRect.left + borderLeft + paddingLeft,
      originY: boardRect.top + borderTop + paddingTop,
      cellWidth: measuredRect.width,
      cellHeight: measuredRect.height,
      gapX,
      gapY
    };
    state.boardMetricsCache = { value };
    return value;
  }

  function getGridCellFromPoint(clientX, clientY) {
    const metrics = getBoardMetrics();
    if (!metrics) return null;
    const { rect, originX, originY, cellWidth, cellHeight, gapX, gapY } = metrics;
    if (clientX < rect.left - 24 || clientX > rect.right + 24 || clientY < rect.top - 24 || clientY > rect.bottom + 24) return null;

    // clientX/clientY et getBoundingClientRect() partagent le même repère
    // viewport. Le scroll éventuel est donc déjà pris en compte.
    // Les dimensions viennent directement des vrais carrés du plateau.
    const x = clientX - originX;
    const y = clientY - originY;
    const col = Math.round((x - cellWidth / 2) / (cellWidth + gapX));
    const row = Math.round((y - cellHeight / 2) / (cellHeight + gapY));
    return { row, col };
  }

  function getPieceCenterAnchor(piece) {
    return {
      row: Math.floor((piece.rows - 1) / 2),
      col: Math.floor((piece.cols - 1) / 2)
    };
  }

  // Fonction centrale : transforme une cellule ciblée et une cellule
  // d'ancrage de la pièce en position réelle de placement.
  function getPlacementFromGridCell(piece, gridRow, gridCol, anchor = getPieceCenterAnchor(piece)) {
    const row = gridRow - anchor.row;
    const col = gridCol - anchor.col;
    return { row, col, valid: canPlace(piece, row, col) };
  }

  function getPlacementFromTopLeft(piece, row, col) {
    const anchor = getPieceCenterAnchor(piece);
    return getPlacementFromGridCell(piece, row + anchor.row, col + anchor.col, anchor);
  }

  function getDropPlacement(clientX, clientY, drag) {
    const gridCell = getGridCellFromPoint(clientX, clientY);
    if (!gridCell || !drag?.piece) return null;
    return getPlacementFromGridCell(drag.piece, gridCell.row, gridCell.col, { row: drag.grabRow, col: drag.grabCol });
  }

  function selectPiece(index) {
    if (state.resolving || !state.gameActive || !state.queue[index]) return;
    state.selectedPiece = state.selectedPiece === index ? null : index;
    renderTray();
    clearPreview();
    if (state.selectedPiece !== null) {
      const piece = state.queue[state.selectedPiece];
      playSfx('select'); vibrate(9);
      $('#game-message').textContent = 'Touche la grille pour déposer ce fragment.';
      if (!canAnyPlace(piece)) showToast('Ce fragment ne trouve plus sa place.');
    } else $('#game-message').textContent = 'Choisis un fragment et fais-le glisser.';
  }

  function placeSelectedAt(row, col) {
    const index = state.selectedPiece;
    if (index === null || !state.queue[index]) return;
    const piece = state.queue[index];
    const placement = getPlacementFromGridCell(piece, row, col);
    if (!placement.valid) {
      showPreview(piece, placement);
      showToast('Cet emplacement ne peut pas accueillir ce fragment.');
      vibrate(16);
      return;
    }
    placePiece(index, placement.row, placement.col);
  }

  function showPreview(piece, placement) {
    if (!piece || !placement) return;
    const { row, col, valid } = placement;
    const previewKey = `${piece.id}:${row}:${col}:${valid ? 1 : 0}`;
    if (state.previewKey === previewKey) return;
    clearPreview();
    state.previewKey = previewKey;
    state.preview = piece.cells.map(([dr, dc]) => ({ row: row + dr, col: col + dc, valid }));
    const boardCells = $('#board')?.children;
    state.preview.forEach(({ row: r, col: c, valid: ok }) => {
      if (boardCells && r >= 0 && r < GRID && c >= 0 && c < GRID) {
        const cell = boardCells[r * GRID + c];
        cell.classList.add(ok ? 'preview-valid' : 'preview-invalid');
        state.previewNodes.push(cell);
      }
    });
  }

  function clearPreview() {
    state.previewNodes.forEach(cell => cell.classList.remove('preview-valid', 'preview-invalid'));
    state.preview = [];
    state.previewNodes = [];
    state.previewKey = '';
  }

  function createPieceVisual(piece, ghost = false) {
    const shape = document.createElement('div');
    const color = piece.color || getPieceColor(piece.id);
    shape.className = 'piece-shape' + (ghost ? ' ghost-shape' : '');
    shape.style.setProperty('--piece-cols', piece.cols);
    shape.style.setProperty('--piece-rows', piece.rows);
    shape.style.setProperty('--piece-primary', color.primary);
    shape.style.setProperty('--piece-secondary', color.secondary);
    shape.style.setProperty('--piece-soft', color.soft);
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
    state.boardMetricsCache = null;
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
      const boardPiece = state.board[r][c];
      const occupied = Boolean(boardPiece);
      const almostFull = rowDensity[r] >= 6 || colDensity[c] >= 6;
      cell.className = `cell${occupied ? ' filled' : ''}${almostFull ? ' near-line' : ''}`;
      cell.removeAttribute('style');
      if (occupied) {
        const color = boardPiece.color || getPieceColor(boardPiece.piece);
        cell.style.setProperty('--piece-primary', color.primary);
        cell.style.setProperty('--piece-secondary', color.secondary);
        cell.style.setProperty('--piece-soft', color.soft);
      }
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

  const BOOSTER_DEFS = [
    { id: 'hammer', label: 'Marteau', short: 'Retirer 1 carré', icon: '⌁' },
    { id: 'reroll', label: 'Recomp.', short: 'Changer les pièces', icon: '⟳' },
    { id: 'pulse-core', label: 'Noyau', short: 'Charger Pulse', icon: '⚡' }
  ];

  function renderBoosters() {
    const bar = $('#booster-bar');
    if (!bar) return;
    bar.innerHTML = BOOSTER_DEFS.map(def => {
      const count = profile.inventory[def.id] || 0;
      const active = state.activeBooster === def.id;
      const disabled = count <= 0 || state.resolving || !state.gameActive;
      return `<button class="booster-button${active ? ' active' : ''}" data-action="use-booster" data-booster-id="${def.id}" ${disabled && !active ? 'disabled' : ''} aria-label="${def.label}, ${count} disponible${count > 1 ? 's' : ''}"><span class="booster-symbol">${def.icon}</span><span class="booster-info"><b>${active ? 'ANNULER' : def.label}</b><small>${active ? 'Touche un carré' : def.short}</small></span><strong class="booster-count">${count}</strong></button>`;
    }).join('');
  }

  function animateTrayArrival() {
    $$('#piece-tray .piece-item').forEach((item, index) => {
      item.style.setProperty('--tray-delay', `${index * 20}ms`);
      retriggerClass(item, 'tray-arrive');
    });
  }

  function animateBoosterArrival() {
    $$('#booster-bar .booster-button').forEach((button, index) => {
      button.style.setProperty('--booster-delay', `${index * 20}ms`);
      retriggerClass(button, 'booster-arrive');
    });
  }

  function animatePlacedCells(cells) {
    cells.forEach(([row, col], index) => {
      const cell = $('#board').children[row * GRID + col];
      if (!cell) return;
      cell.style.setProperty('--landing-delay', `${Math.min(index * 8, 40)}ms`);
      retriggerClass(cell, 'landing');
      setTimeout(() => cell.style.removeProperty('--landing-delay'), 260);
    });
  }

  function animateShopItem(attribute, value, className = 'purchase-pop') {
    const item = $$(`[${attribute}]`).find(element => element.getAttribute(attribute) === value);
    retriggerClass(item, className);
  }

  function consumeBooster(id) {
    if (!profile.inventory[id] || profile.inventory[id] <= 0) {
      showToast('Ce bonus est épuisé.');
      return false;
    }
    profile.inventory[id] -= 1;
    profile.stats.boostersUsed += 1;
    saveProfile();
    renderBoosters();
    if (state.screen === 'shop') renderShop();
    return true;
  }

  function useBooster(id) {
    if (!id || !state.gameActive || state.resolving) return;
    if (id === 'hammer') {
      if (state.activeBooster === 'hammer') {
        state.activeBooster = null;
        renderBoosters();
        $('#game-message').textContent = 'Choisis un fragment et fais-le glisser.';
        return;
      }
      if (!(profile.inventory.hammer > 0)) return showToast('Tu n’as plus de Marteau.');
      state.activeBooster = 'hammer';
      state.selectedPiece = null;
      clearPreview();
      renderTray();
      renderBoosters();
      $('#game-message').textContent = 'Marteau actif : touche un carré occupé à retirer.';
      playSfx('booster'); vibrate(18);
      return;
    }

    if (!consumeBooster(id)) return;
    state.activeBooster = null;
    state.selectedPiece = null;
    clearPreview();
    renderTray();

    if (id === 'reroll') {
      state.queue = state.queue.map(piece => piece ? generatePiece() : null);
      if (!state.queue.some(piece => piece && canAnyPlace(piece))) state.queue[0] = makePiece(SHAPE_LIBRARY[0]);
      renderTray(); renderBoosters(); animateTrayArrival();
      triggerBoardImpact('place');
      spawnScorePopup('RECOMPO !', 'combo', [], true);
      showToast('Nouveaux fragments en approche.');
      playSfx('booster'); vibrate([15, 12, 24]);
    } else if (id === 'pulse-core') {
      state.charge = 100;
      renderHud(); renderBoosters();
      triggerBoardImpact('pulse');
      spawnScorePopup('CHARGE !', 'pulse', [], true);
      showToast('La prochaine ligne déclenchera une Pulse Burst.');
      playSfx('booster'); vibrate([18, 15, 32]);
    }
    saveProfile();
  }

  function useBoosterAtCell(row, col) {
    if (state.activeBooster !== 'hammer' || state.resolving || !state.gameActive) return;
    if (!state.board[row][col]) {
      showToast('Choisis un carré occupé.');
      vibrate(12);
      return;
    }
    if (!consumeBooster('hammer')) return;
    state.board[row][col] = null;
    state.activeBooster = null;
    state.selectedPiece = null;
    renderBoard(); renderTray(); renderHud(); renderBoosters();
    triggerClearEffect([[row, col]], false);
    triggerBoardImpact('clear');
    spawnScorePopup('LIBÉRÉ', 'clear', [[row, col]], true);
    $('#game-message').textContent = 'Un espace vient de se libérer. À toi de jouer.';
    showToast('Carré retiré.');
    playSfx('booster'); vibrate([18, 14, 28]);
    saveProfile();
  }

  function startNewGame() {
    cancelDrag();
    closeModal();
    clearTimeout(state.highScoreTimer);
    clearTimeout(state.clearFeedbackTimer);
    $('#high-score-feedback')?.classList.remove('show');
    $('#high-score-feedback')?.setAttribute('aria-hidden', 'true');
    $('#clear-feedback')?.classList.remove('show');
    $('#clear-feedback')?.setAttribute('aria-hidden', 'true');
    state.screen = 'game'; state.board = createEmptyBoard(); state.turn = 0; state.queue = generateQueue(); state.score = 0; state.lines = 0; state.combo = 0; state.recordAnnounced = false; state.bestComboInGame = 0; state.charge = 0; state.pulseBursts = 0; state.activeBooster = null; state.selectedPiece = null; state.resolving = false; state.clearVisualPending = false; state.clearVisualToken += 1; state.gameActive = true; state.paused = false;
    showScreen('game'); renderBoard(); renderTray(); renderHud(); renderBoosters(); animateTrayArrival(); animateBoosterArrival(); $('#game-message').textContent = 'Choisis un fragment et fais-le glisser.'; vibrate(8); playSfx('start');
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
    if (route === 'progression') {
      renderProgression();
      requestAnimationFrame(() => scrollProgressionToCurrent(false));
    }
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

  function calculatePlacementScore(piece) {
    const sizeBonus = Math.max(0, piece.cells.length - 3) * 12;
    return piece.cells.length * 10 + sizeBonus;
  }

  // Barème volontairement lisible : 100 pts par ligne, un bonus par case
  // effectivement effacée, puis un bonus de combo. Les intersections ligne /
  // colonne ne sont comptées qu'une seule fois dans completed.cells.
  function calculateClearScore(completed, combo, pulseBonus = 0) {
    const lineCount = completed.rows.length + completed.cols.length;
    const lineScore = lineCount * 100 + Math.max(0, lineCount - 1) ** 2 * 45;
    const clearedCellScore = completed.cells.length * 15;
    const comboScore = Math.max(0, combo - 1) * 80 + Math.max(0, combo - 2) * 35;
    const comboMultiplier = 1 + Math.min(.4, Math.max(0, combo - 1) * .08);
    return Math.round((lineScore + clearedCellScore + comboScore) * comboMultiplier + pulseBonus);
  }

  function placePiece(index, row, col) {
    if (state.resolving || !state.gameActive) return;
    const piece = state.queue[index]; if (!piece || !canPlace(piece, row, col)) return;
    state.resolving = true; state.selectedPiece = null; state.turn += 1;
    const scoreBeforeMove = state.score;
    const placedCells = piece.cells.map(([dr, dc]) => [row + dr, col + dc]);
    const placementScore = calculatePlacementScore(piece);
    piece.cells.forEach(([dr, dc]) => { state.board[row + dr][col + dc] = { piece: piece.id, color: piece.color || getPieceColor(piece.id) }; });
    profile.stats.piecesPlaced += 1; updateMission('pieces', 1);
    state.score += placementScore;
    state.queue[index] = null; renderBoard(); renderTray(); renderHud(); animatePlacedCells(placedCells);
    spawnScorePopup(`+${formatNumber(placementScore)}`, 'place', placedCells);
    triggerBoardImpact('place');
    playSfx('place'); vibrate(10);
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
      const clearScore = calculateClearScore(completed, state.combo, pulseBonus);
      state.score += clearScore;
      profile.stats.totalLines += clearedLines;
      if (state.combo > profile.stats.bestCombo) profile.stats.bestCombo = state.combo;
      updateMission('lines', clearedLines); updateMission('combo', state.combo); updateMission('score', state.score);
      markCellsClearing(completed.cells);
      completed.cells.forEach(([r, c]) => { state.board[r][c] = null; });
      const clearVisualToken = ++state.clearVisualToken;
      state.clearVisualPending = true;
      // Le modèle est déjà nettoyé : on libère immédiatement la prochaine
      // pièce avant les effets décoratifs et audio.
      releaseTurnAfterClear();
      const clearLevel = pulseReady || clearedLines >= 3 ? 3 : clearedLines >= 2 ? 2 : 1;
      const clearHaptic = state.combo >= 3 ? [18, 8, 18, 8, 34] : clearLevel >= 3 ? [24, 12, 42] : clearLevel === 2 ? [18, 10, 30] : 14;
      const runClearFeedback = () => {
        triggerClearEffect(completed.cells, pulseReady);
        triggerBoardImpact(pulseReady ? 'pulse' : 'clear');
        showClearFeedback(clearedLines);
        spawnScorePopup(`+${formatNumber(clearScore)}`, pulseReady ? 'pulse' : 'clear', completed.cells);
        if (state.combo > 1) {
          spawnScorePopup(`COMBO ×${state.combo}`, 'combo', completed.cells, true);
          renderHud();
          retriggerClass($('#combo-badge'), 'combo-pop');
        }
        $('#game-message').textContent = pulseReady ? 'PULSE BURST ! La grille vient de surcharger.' : `${clearedLines} ligne${clearedLines > 1 ? 's' : ''} dissoute${clearedLines > 1 ? 's' : ''} !`;
        showToast(pulseReady ? `PULSE BURST  ·  +${formatNumber(clearScore)} pts` : state.combo > 1 ? `Combo ×${state.combo}  ·  +${formatNumber(clearScore)} pts` : `Impulsion parfaite  ·  +${formatNumber(clearScore)} pts`);
        playSfx(clearLevel >= 3 ? 'multi-clear' : clearedLines >= 2 ? 'multi-clear' : 'clear', clearLevel);
        if (state.combo > 1) playSfx('combo', Math.min(4, state.combo));
        vibrate(clearHaptic);
      };
      if (typeof requestAnimationFrame === 'function') requestAnimationFrame(runClearFeedback);
      else setTimeout(runClearFeedback, 0);
      setTimeout(() => finishClear(clearVisualToken), pulseReady ? 320 : 230);
    } else {
      state.combo = 0; updateMission('score', state.score); finishTurn();
    }
    if (profile.best > 0 && !state.recordAnnounced && scoreBeforeMove <= profile.best && state.score > profile.best) {
      state.recordAnnounced = true;
      showHighScoreFeedback(state.score);
      showToast('NEW HIGH SCORE ! Continue comme ça.');
      spawnScorePopup('NEW HIGH SCORE', 'pulse', placedCells, true);
      playSfx('record');
      vibrate([28, 14, 52]);
    }
    renderHud(); saveProfile();
  }

  function markCellsClearing(cells) {
    cells.forEach(([r, c], index) => {
      const cell = $('#board').children[r * GRID + c];
      if (!cell) return;
      cell.style.setProperty('--clear-delay', `${Math.min(index * 5, 40)}ms`);
      cell.classList.add('clearing');
    });
  }

  function releaseTurnAfterClear() {
    if (!state.gameActive) return;
    if (state.queue.every(piece => !piece)) { state.queue = generateQueue(); }
    state.resolving = false;
    renderTray(); renderHud();
    const playable = state.queue.some(piece => piece && canAnyPlace(piece));
    if (!playable) endGame();
    else { $('#game-message').textContent = state.combo > 1 ? `Le rythme est lancé : combo ×${state.combo}.` : 'À toi de jouer. Trouve le prochain espace.'; saveProfile(); }
  }

  function finishClear(clearVisualToken) {
    if (clearVisualToken !== state.clearVisualToken || !state.clearVisualPending) return;
    state.clearVisualPending = false;
    renderBoard();
  }

  function finishTurn() {
    if (!state.gameActive) return;
    if (state.queue.every(piece => !piece)) { state.queue = generateQueue(); }
    state.resolving = false; state.clearVisualPending = false; renderBoard(); renderTray(); renderHud();
    const playable = state.queue.some(piece => piece && canAnyPlace(piece));
    if (!playable) endGame();
    else { $('#game-message').textContent = state.combo > 1 ? `Le rythme est lancé : combo ×${state.combo}.` : 'À toi de jouer. Trouve le prochain espace.'; saveProfile(); }
  }

  function endGame() {
    if (!state.gameActive) return;
    state.gameActive = false; state.resolving = false; state.activeBooster = null;
    renderBoosters();
    const reward = 20 + Math.floor(state.score / 250) + state.lines * 3 + Math.max(0, state.bestComboInGame - 1) * 5 + state.pulseBursts * 12;
    const xpEarned = 45 + Math.floor(state.score / 28) + state.lines * 12;
    const levelBefore = profile.level;
    const previousBest = profile.best;
    const isNewRecord = state.score > previousBest;
    profile.coins += reward; profile.stats.games += 1; profile.stats.totalScore += state.score; profile.best = Math.max(profile.best, state.score);
    updateMission('games', 1); updateMission('score', state.score);
    const levels = addXp(xpEarned);
    saveProfile(); renderHome(); renderMissions(); renderStats(); renderHud();
    playSfx(isNewRecord && !state.recordAnnounced ? 'record' : 'gameOver');
    vibrate(isNewRecord && !state.recordAnnounced ? [28, 14, 52] : [18, 12, 28]);
    openEndModal(reward, xpEarned, levels, levelBefore, isNewRecord, previousBest);
    showRewardPopup(`+${reward} ◆`, 'coins');
    setTimeout(() => { showRewardPopup(`+${xpEarned} XP`, 'xp'); playSfx('xp'); }, 90);
    setTimeout(() => playSfx('coins'), 210);
    if (levels) setTimeout(() => playSfx('unlock'), 340);
  }

  function addXp(amount) {
    let levels = 0; profile.xp += amount;
    while (profile.xp >= xpForNextLevel(profile.level)) { profile.xp -= xpForNextLevel(profile.level); profile.level += 1; levels += 1; profile.coins += 75 + profile.level * 10; }
    return levels;
  }
  function xpForNextLevel(level) { return 400 + (level - 1) * 150; }

  function getProgressionReward(level) {
    const explicit = PROGRESSION_REWARDS.find(reward => reward.level === level);
    if (explicit) return { ...explicit };
    if (level % 10 === 0) return { level, type: 'pack', id: 'overdrive', amount: 1, icon: '◆', title: 'Pack Overdrive', milestone: true };
    if (level % 5 === 0) return { level, type: 'coins', amount: 320 + level * 8, icon: '◆', title: 'Grande réserve', milestone: true };
    return { level, type: 'coins', amount: 100 + level * 8, icon: '◆', title: 'PulseCoins' };
  }

  function isProgressionClaimed(level) { return profile.progressionClaims.includes(level); }

  function progressionRewardLabel(reward) {
    if (reward.type === 'coins') return `+${formatNumber(reward.amount)} PulseCoins`;
    if (reward.type === 'booster') {
      const item = CATALOG.boosters.find(entry => entry.id === reward.id);
      return `${reward.amount > 1 ? `${reward.amount}× ` : ''}${item?.name || 'Booster'}`;
    }
    if (reward.type === 'pack') return `${reward.amount > 1 ? `${reward.amount}× ` : ''}${CATALOG.packs.find(pack => pack.id === reward.id)?.name || 'Pack'}`;
    if (reward.type === 'skin') return `Skin ${findCatalog('skins', reward.id).name}`;
    if (reward.type === 'board') return `Plateau ${findCatalog('boards', reward.id).name}`;
    if (reward.type === 'effect') return `Effet ${findCatalog('effects', reward.id).name}`;
    return reward.title || 'Récompense';
  }

  function progressionRewardDetail(reward) {
    if (reward.type === 'coins') return `+${formatNumber(reward.amount)} ◆`;
    if (reward.type === 'booster') return `${reward.amount > 1 ? `${reward.amount} × ` : ''}${CATALOG.boosters.find(item => item.id === reward.id)?.name || 'Booster'}`;
    if (reward.type === 'pack') return `${reward.amount > 1 ? `${reward.amount} × ` : ''}${CATALOG.packs.find(pack => pack.id === reward.id)?.name || 'Pack'}`;
    return progressionRewardLabel(reward);
  }

  function getNextProgressionReward() {
    for (let level = 1; level <= profile.level; level++) {
      if (!isProgressionClaimed(level)) return getProgressionReward(level);
    }
    return getProgressionReward(profile.level + 1);
  }

  function availableProgressionRewards() {
    let count = 0;
    for (let level = 1; level <= profile.level; level++) if (!isProgressionClaimed(level)) count++;
    return count;
  }

  function grantProgressionReward(reward) {
    if (reward.type === 'coins') {
      profile.coins += reward.amount;
      return { popup: `+${formatNumber(reward.amount)} ◆`, popupType: 'coins' };
    }
    if (reward.type === 'booster') {
      profile.inventory[reward.id] = (profile.inventory[reward.id] || 0) + reward.amount;
      return { popup: `+${reward.amount} ${CATALOG.boosters.find(item => item.id === reward.id)?.name || 'booster'}`, popupType: 'special' };
    }
    if (reward.type === 'pack') {
      const pack = CATALOG.packs.find(item => item.id === reward.id);
      if (pack) for (let index = 0; index < reward.amount; index++) Object.entries(pack.contents).forEach(([id, amount]) => { profile.inventory[id] = (profile.inventory[id] || 0) + amount; });
      return { popup: `${pack?.name || 'Pack'} obtenu`, popupType: 'special' };
    }
    const category = reward.type === 'skin' ? 'skins' : reward.type === 'board' ? 'boards' : 'effects';
    const alreadyUnlocked = profile.unlocked[category].includes(reward.id);
    if (!alreadyUnlocked) {
      profile.unlocked[category].push(reward.id);
      return { popup: `${progressionRewardLabel(reward)} débloqué`, popupType: 'special' };
    }
    const fallbackCoins = reward.duplicateCoins || 75;
    profile.coins += fallbackCoins;
    return { popup: `Déjà obtenu · +${fallbackCoins} ◆`, popupType: 'coins' };
  }

  function claimProgressionReward(level) {
    const rewardLevel = Number(level);
    if (!Number.isInteger(rewardLevel) || rewardLevel < 1 || rewardLevel > profile.level || isProgressionClaimed(rewardLevel)) return;
    const reward = getProgressionReward(rewardLevel);
    const result = grantProgressionReward(reward);
    profile.progressionClaims.push(rewardLevel);
    profile.progressionClaims.sort((a, b) => a - b);
    saveProfile();
    renderHome(); renderProgression(); renderShop(); renderCollection(); renderStats();
    showRewardPopup(result.popup, result.popupType);
    showToast(`Récompense du niveau ${rewardLevel} récupérée !`);
    playSfx(reward.milestone ? 'unlock' : 'coins');
    vibrate(reward.milestone ? [18, 10, 28] : 14);
  }

  function renderProgression() {
    const target = $('#progression-content');
    if (!target) return;
    const nextXp = xpForNextLevel(profile.level);
    const xpRatio = clamp(profile.xp / nextXp * 100, 0, 100);
    const nextReward = getNextProgressionReward();
    const available = availableProgressionRewards();
    const maxLevel = Math.max(PROGRESSION_REWARDS.length, profile.level + 5);
    const nodes = Array.from({ length: maxLevel }, (_, index) => {
      const level = index + 1;
      const reward = getProgressionReward(level);
      const claimed = isProgressionClaimed(level);
      const unlocked = level <= profile.level;
      const current = level === profile.level;
      const milestone = Boolean(reward.milestone || level % 5 === 0);
      const statusClass = claimed ? 'is-claimed' : unlocked ? 'is-available' : 'is-locked';
      const stateLabel = claimed ? '✓ RÉCUPÉRÉE' : current ? 'NIVEAU ACTUEL' : unlocked ? 'RÉCOMPENSE DISPONIBLE' : 'VERROUILLÉ';
      const action = claimed ? '<span class="progression-claimed">✓ RÉCUPÉRÉE</span>' : unlocked ? `<button class="progression-claim" data-action="claim-progression" data-level="${level}">RÉCUPÉRER</button>` : `<span class="progression-locked">🔒 À venir</span>`;
      return `<article class="progression-node ${statusClass}${current ? ' is-current' : ''}${milestone ? ' is-milestone' : ''}" data-progression-level="${level}"><div class="progression-rail"><span class="progression-dot">${claimed ? '✓' : milestone ? '★' : level}</span></div><div class="progression-card"><div class="progression-card-top"><span class="progression-level">NIVEAU ${level}</span><span class="progression-state">${stateLabel}</span></div><div class="progression-reward"><span class="progression-reward-icon">${reward.icon || '◆'}</span><div><strong>${progressionRewardLabel(reward)}</strong><small>${reward.title || progressionRewardDetail(reward)}${milestone ? ' · MILESTONE' : ''}</small></div></div>${action}</div></article>`;
    }).join('');
    target.innerHTML = `<article class="progression-overview"><div class="progression-overview-top"><div><span class="eyebrow accent">ROUTE DE PROGRESSION</span><h2>Niveau ${profile.level}</h2><p>${formatNumber(profile.xp)} / ${formatNumber(nextXp)} XP avant le niveau ${profile.level + 1}</p></div><button class="progression-center" data-action="progression-current">MON NIVEAU</button></div><div class="progression-xp"><span style="width:${xpRatio}%"></span></div><div class="progression-next"><span>${available ? `${available} récompense${available > 1 ? 's' : ''} disponible${available > 1 ? 's' : ''}` : 'PROCHAINE RÉCOMPENSE'}</span><strong>NIVEAU ${nextReward.level} · ${progressionRewardDetail(nextReward)}</strong></div></article><div class="progression-track">${nodes}</div>`;
  }

  function scrollProgressionToCurrent(smooth = false) {
    const level = Math.min(profile.level, Math.max(PROGRESSION_REWARDS.length, profile.level));
    document.querySelector(`[data-progression-level="${level}"]`)?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'center' });
  }

  function updateMission(type, amount) {
    ensureMissionsForToday(profile);
    const mission = profile.missions.find(item => item.type === type);
    if (!mission) return;
    if (type === 'score' || type === 'combo') mission.progress = Math.max(mission.progress, amount);
    else mission.progress = Math.min(mission.target, mission.progress + amount);
  }

  function claimMission(id) {
    const mission = profile.missions.find(item => item.id === id); if (!mission || mission.claimed || mission.progress < mission.target) return;
    mission.claimed = true; profile.coins += mission.reward; saveProfile(); renderHome(); renderMissions(); renderShop(); animateShopItem('data-mission-id', id, 'mission-claim'); showToast(`+${mission.reward} PulseCoins · mission validée`); showRewardPopup(`+${mission.reward} ◆`, 'coins'); playSfx('coins'); vibrate(24);
  }

  function renderHome() {
    const next = xpForNextLevel(profile.level); const ratio = clamp(profile.xp / next * 100, 0, 100);
    $('#home-level').textContent = profile.level; $('#home-coins').textContent = formatNumber(profile.coins); $('#home-best').textContent = formatNumber(profile.best); $('#home-xp-label').textContent = `${formatNumber(profile.xp)} / ${formatNumber(next)} XP`; $('#home-xp-fill').style.width = `${ratio}%`;
    $('#sound-icon').textContent = profile.sound ? '◖' : '◌';
    $('#music-icon').textContent = profile.music ? '♫' : '·';
    $('#sound-label').textContent = profile.sound ? 'ON' : 'OFF';
    $('#music-label').textContent = profile.music ? 'ON' : 'OFF';
    $$('[data-action="toggle-sound"]').forEach(button => button.setAttribute('aria-pressed', String(profile.sound)));
    $$('[data-action="toggle-music"]').forEach(button => button.setAttribute('aria-pressed', String(profile.music)));
    $('#volume-control').value = Math.round(profile.volume * 100);
    $('#volume-label').textContent = `${Math.round(profile.volume * 100)}%`;
    const progressionAvailable = availableProgressionRewards();
    const progressionNext = getNextProgressionReward();
    const progressionLabel = progressionAvailable ? `${progressionAvailable} récompense${progressionAvailable > 1 ? 's' : ''} à récupérer` : `Niv. ${progressionNext.level} · ${progressionRewardDetail(progressionNext)}`;
    $('#home-progression-next').textContent = progressionLabel;
    const available = profile.missions.filter(m => m.progress >= m.target && !m.claimed).length; $('#home-mission-count').textContent = available ? `${available} à réclamer` : 'Défis du jour';
    const mission = profile.missions.find(m => !m.claimed) || profile.missions[0];
    if (mission) { $('#home-mission-title').textContent = mission.title; $('#home-mission-fill').style.width = `${clamp(mission.progress / mission.target * 100, 0, 100)}%`; }
  }

  function renderShop() {
    $('#shop-coins').textContent = formatNumber(profile.coins);
    $$('[data-shop-tab]').forEach(button => button.classList.toggle('active', button.dataset.shopTab === state.shopTab));
    if (state.shopTab === 'boosters') {
      $('#shop-content').innerHTML = renderBoosterShop();
      return;
    }
    const items = CATALOG[state.shopTab];
    $('#shop-content').innerHTML = items.map(item => renderCatalogCard(state.shopTab, item, 'shop')).join('');
  }

  function renderBoosterShop() {
    const packs = CATALOG.packs.map(pack => {
      const contents = Object.entries(pack.contents).map(([id, count]) => {
        const booster = CATALOG.boosters.find(item => item.id === id);
        return `<span><b>${booster?.icon || '◆'}</b> ${count} ${booster?.name || id}</span>`;
      }).join('');
      return `<article class="catalog-card pack-card" data-pack-id="${pack.id}"><div class="catalog-preview pack-preview"><span>${pack.icon}</span></div><div class="pack-kicker">PACK DE BOOSTERS</div><h3>${pack.name}</h3><p>${pack.description}</p><div class="pack-contents">${contents}</div><button class="item-action buy" data-action="buy-pack">◆ ${pack.price}</button></article>`;
    }).join('');
    const boosters = CATALOG.boosters.map(item => {
      const count = profile.inventory[item.id] || 0;
      return `<article class="catalog-card booster-card" data-booster-id="${item.id}"><div class="catalog-preview booster-preview"><span>${item.icon}</span></div><div class="booster-card-head"><h3>${item.name}</h3><strong>${count}</strong></div><p>${item.description}</p><div class="inventory-line"><span>EN STOCK</span><b>${count}</b></div><button class="item-action buy" data-action="buy-booster">◆ ${item.price}</button></article>`;
    }).join('');
    return `<div class="booster-shop"><div class="booster-shop-intro"><div class="booster-shop-icon">⚡</div><div><span class="eyebrow accent">CONSOMMABLES</span><strong>Prépare ton prochain run.</strong><small>Les bonus achetés restent dans ton inventaire et se dépensent uniquement en partie.</small></div></div><div class="shop-section-label">PACKS AVANTAGEUX</div><div class="catalog-grid pack-grid">${packs}</div><div class="shop-section-label">À L'UNITÉ</div><div class="catalog-grid booster-grid">${boosters}</div></div>`;
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
    profile.coins -= item.price; profile.unlocked[category].push(id); saveProfile(); renderShop(); renderCollection(); renderHome(); animateShopItem('data-item', id); showToast(`${item.name} débloqué !`); playSfx('unlock'); vibrate(22);
  }

  function buyBooster(id) {
    const booster = CATALOG.boosters.find(item => item.id === id);
    if (!booster) return;
    if (profile.coins < booster.price) {
      showToast('Pas assez de PulseCoins pour ce bonus.');
      vibrate(20);
      return;
    }
    profile.coins -= booster.price;
    profile.inventory[id] = (profile.inventory[id] || 0) + 1;
    saveProfile(); renderShop(); renderHome(); renderBoosters(); animateShopItem('data-booster-id', id);
    showToast(`${booster.name} ajouté à l'inventaire.`);
    playSfx('purchase'); vibrate(22);
  }

  function buyPack(id) {
    const pack = CATALOG.packs.find(item => item.id === id);
    if (!pack) return;
    if (profile.coins < pack.price) {
      showToast('Pas assez de PulseCoins pour ce pack.');
      vibrate(20);
      return;
    }
    profile.coins -= pack.price;
    Object.entries(pack.contents).forEach(([boosterId, amount]) => {
      profile.inventory[boosterId] = (profile.inventory[boosterId] || 0) + amount;
    });
    saveProfile(); renderShop(); renderHome(); renderBoosters(); animateShopItem('data-pack-id', id);
    showToast(`${pack.name} ouvert : bonus ajoutés !`);
    playSfx('purchase'); vibrate([18, 14, 30]);
  }

  function equipItem(category, id) {
    if (!category || !id || !isUnlocked(category, id)) return;
    const key = category.slice(0, -1); profile.equipped[key] = id; applyTheme(); saveProfile(); renderShop(); renderCollection(); animateShopItem('data-item', id, 'equip-pop'); showToast(`${findCatalog(category, id).name} équipé`); playSfx('unlock');
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
    $('#stats-content').innerHTML = `<article class="stats-level-card"><div class="stats-level-top"><div><span class="eyebrow accent">NIVEAU ACTUEL</span><h2>Architecte de pulse</h2></div><strong>${profile.level}</strong></div><p>${formatNumber(profile.xp)} / ${formatNumber(next)} XP avant le niveau ${profile.level + 1}</p><div class="xp-track"><span style="width:${ratio}%"></span></div></article><div class="stats-grid"><article class="stat-box"><span>Meilleur score</span><strong>${formatNumber(profile.best)}</strong><em>record personnel</em></article><article class="stat-box"><span>Parties jouées</span><strong>${formatNumber(stats.games)}</strong><em>tentatives</em></article><article class="stat-box"><span>Lignes dissoutes</span><strong>${formatNumber(stats.totalLines)}</strong><em>total cumulé</em></article><article class="stat-box"><span>Meilleur combo</span><strong>×${formatNumber(stats.bestCombo)}</strong><em>chaîne maximale</em></article><article class="stat-box"><span>Score cumulé</span><strong>${formatNumber(stats.totalScore)}</strong><em>toutes parties</em></article><article class="stat-box"><span>Fragments posés</span><strong>${formatNumber(stats.piecesPlaced)}</strong><em>patience & précision</em></article><article class="stat-box"><span>Pulse Bursts</span><strong>${formatNumber(stats.pulseBursts)}</strong><em>surcharges parfaites</em></article><article class="stat-box"><span>Bonus utilisés</span><strong>${formatNumber(stats.boostersUsed)}</strong><em>coups de secours</em></article></div><div class="tip-card">Les scores, objets et missions sont enregistrés automatiquement sur cet appareil grâce à <strong>localStorage</strong>. Ferme le jeu sans crainte : ta progression reste là.</div>`;
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
    const index = state.queue.indexOf(piece); selectPiece(index); showPreview(piece, getPlacementFromTopLeft(piece, best.r, best.c)); showToast('Indice : cette position garde de l’espace pour la suite.');
    setTimeout(clearPreview, 1100);
  }

  function openPauseModal() {
    if (!state.gameActive) { showScreen('home'); return; }
    state.paused = true;
    openModal(`<div class="pause-icon">Ⅱ</div><span class="modal-kicker">PARTIE EN PAUSE</span><h2>Garde ton rythme.</h2><p>La partie est en sécurité. Reviens quand tu veux continuer à construire ta grille.</p><div class="modal-actions"><button class="secondary" data-action="go-home">ACCUEIL</button><button class="secondary" data-action="restart">RECOMMENCER</button><button class="primary" data-action="resume">CONTINUER</button></div>`);
  }

  function openEndModal(reward, xpEarned, levels, levelBefore, isNewRecord, previousBest) {
    const levelText = levels ? `<div class="level-up"><strong>LEVEL UP!</strong><span>NIVEAU ${levelBefore + levels} atteint · ${levels > 1 ? `${levels} récompenses` : 'une récompense'} disponible${levels > 1 ? 's' : ''}</span><button data-action="progression">VOIR LA RÉCOMPENSE</button></div>` : '';
    const recordKicker = isNewRecord ? 'NEW HIGH SCORE' : 'PARTIE TERMINÉE';
    const recordTitle = isNewRecord ? 'Tu viens de monter la barre.' : 'Bien joué.';
    const recordBanner = isNewRecord ? `<div class="end-record-banner"><span>NEW HIGH SCORE</span><strong>${formatNumber(state.score)}</strong></div>` : '';
    const recordMessage = isNewRecord ? 'Cette partie devient ton nouveau repère. Encore une pour voir jusqu\'où tu peux pousser la grille.' : previousBest > 0 ? `Il te manquait ${formatNumber(Math.max(0, previousBest - state.score))} points pour battre ton record.` : 'Chaque partie construit ton premier record. Le prochain coup peut déjà tout changer.';
    openModal(`${recordBanner}<span class="modal-kicker ${isNewRecord ? 'record-kicker' : ''}">${recordKicker}</span><h2>${recordTitle}</h2><p>${recordMessage}</p><div class="result-score ${isNewRecord ? 'record-score' : ''}"><span>SCORE</span><strong>${formatNumber(state.score)}</strong></div><div class="result-stats"><div class="result-stat"><strong>${formatNumber(state.lines)}</strong><span>lignes supprimées</span></div><div class="result-stat"><strong>×${formatNumber(Math.max(profile.stats.bestCombo, state.bestComboInGame))}</strong><span>meilleur combo</span></div><div class="result-stat"><strong>${formatNumber(state.turn)}</strong><span>pièces posées</span></div><div class="result-stat"><strong>${formatNumber(profile.best)}</strong><span>meilleur score</span></div></div><div class="reward-row"><div>◆ ${reward}<span>PulseCoins</span></div><div>✦ ${xpEarned}<span>XP gagnés</span></div></div>${levelText}<div class="modal-actions"><button class="secondary" data-action="go-home">ACCUEIL</button><button class="primary" data-action="restart">REJOUER</button></div>`);
  }

  function openModal(content) { $('#modal-card').innerHTML = content; $('#modal-backdrop').classList.add('open'); $('#modal-backdrop').setAttribute('aria-hidden', 'false'); }
  function closeModal() { $('#modal-backdrop').classList.remove('open'); $('#modal-backdrop').setAttribute('aria-hidden', 'true'); if (state.gameActive) state.paused = false; }

  function triggerClearEffect(cells, pulseBurst = false) {
    const layer = $('#fx-layer'); if (!layer) return;
    const effect = profile.equipped.effect;
    const particleCells = pulseBurst
      ? Array.from({ length: Math.min(36, cells.length * 2) }, (_, index) => cells[index % cells.length])
      : cells.slice(0, 16);
    particleCells.forEach(([r, c], index) => {
      const particle = document.createElement('i');
      const type = pulseBurst ? 'pulse-particle' : effect === 'ring' ? 'ring' : effect === 'confetti' ? 'round' : '';
      particle.className = `fx-particle ${type}`;
      const x = ((c + .5) / GRID) * 100; const y = ((r + .5) / GRID) * 100;
      particle.style.left = `${x}%`; particle.style.top = `${y}%`; particle.style.setProperty('--dx', `${(Math.random() - .5) * (pulseBurst ? 150 : 95)}px`); particle.style.setProperty('--dy', `${-15 - Math.random() * (pulseBurst ? 110 : 75)}px`); particle.style.animationDelay = `${index * (pulseBurst ? 7 : 12)}ms`; layer.appendChild(particle); setTimeout(() => particle.remove(), pulseBurst ? 1100 : 850);
    });
    if (pulseBurst || effect === 'spark') layer.animate([{ opacity: .35 }, { opacity: 1 }, { opacity: .35 }], { duration: pulseBurst ? 440 : 320, iterations: 2 });
  }

  function showClearFeedback(count) {
    if (count < 2) return;
    const panel = $('#clear-feedback');
    const text = $('#clear-feedback-text');
    const subtitle = $('#clear-feedback-subtitle');
    if (!panel || !text || !subtitle) return;

    const feedback = count >= 5
      ? { word: 'UNSTOPPABLE!', className: 'feedback-unstoppable', level: 4, duration: 1150 }
      : count === 4
        ? { word: 'INCREDIBLE!', className: 'feedback-incredible', level: 3, duration: 1100 }
        : count === 3
          ? { word: 'AWESOME!', className: 'feedback-awesome', level: 2, duration: 1050 }
          : { word: 'AMAZING!', className: 'feedback-amazing', level: 1, duration: 1000 };

    clearTimeout(state.clearFeedbackTimer);
    panel.className = `clear-feedback ${feedback.className}`;
    panel.setAttribute('aria-hidden', 'false');
    text.textContent = feedback.word;
    subtitle.textContent = `${count} LIGNES / COLONNES ÉLIMINÉES`;
    void panel.offsetWidth;
    panel.classList.add('show');
    spawnFeedbackParticles(feedback.level);
    if (feedback.level >= 3) spawnFeedbackFlash();
    speakClearFeedback(feedback.word, feedback.level);

    state.clearFeedbackTimer = setTimeout(() => {
      panel.classList.remove('show');
      panel.setAttribute('aria-hidden', 'true');
    }, feedback.duration);
  }

  function spawnFeedbackParticles(level) {
    const layer = $('#fx-layer');
    if (!layer) return;
    const amount = level >= 4 ? 14 : level === 3 ? 11 : level === 2 ? 8 : 5;
    for (let index = 0; index < amount; index++) {
      const particle = document.createElement('i');
      particle.className = `fx-particle feedback-particle${level >= 3 ? ' feedback-particle-big' : ''}${level >= 4 && index % 2 === 0 ? ' feedback-particle-hot' : ''}`;
      particle.style.left = `${50 + (Math.random() - .5) * 20}%`;
      particle.style.top = `${45 + (Math.random() - .5) * 14}%`;
      particle.style.setProperty('--dx', `${(Math.random() - .5) * (level >= 4 ? 190 : 130)}px`);
      particle.style.setProperty('--dy', `${-22 - Math.random() * (level >= 4 ? 120 : 82)}px`);
      particle.style.animationDelay = `${index * (level >= 4 ? 12 : 17)}ms`;
      layer.appendChild(particle);
      setTimeout(() => particle.remove(), 950);
    }
  }

  function spawnFeedbackFlash() {
    const layer = $('#fx-layer');
    if (!layer) return;
    const flash = document.createElement('div');
    flash.className = 'clear-feedback-flash';
    layer.appendChild(flash);
    requestAnimationFrame(() => flash.classList.add('show'));
    setTimeout(() => flash.remove(), 280);
  }

  function speakClearFeedback(word, level) {
    if (!profile.sound || profile.volume <= 0 || !('speechSynthesis' in window) || typeof window.SpeechSynthesisUtterance !== 'function') return;
    try {
      const synth = window.speechSynthesis;
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'en-US';
      // Une diction légèrement ralentie mais avec un pitch plus haut donne
      // une impression de cri de victoire plutôt que de voix monotone.
      utterance.rate = level >= 4 ? .94 : level >= 3 ? .98 : 1.02;
      utterance.pitch = level >= 4 ? 1.22 : level === 3 ? 1.17 : 1.12;
      utterance.volume = profile.volume;
      const voices = synth.getVoices();
      const englishVoice = voices.find(voice => /^en(-|_)/i.test(voice.lang) && /Google|Samantha|Microsoft|Alex/i.test(voice.name))
        || voices.find(voice => /^en(-|_)/i.test(voice.lang));
      if (englishVoice) utterance.voice = englishVoice;
      synth.cancel();
      if (typeof synth.resume === 'function') synth.resume();
      synth.speak(utterance);
    } catch (_) {
      // Le bandeau, les particules et les sons restent actifs si la synthèse vocale est bloquée.
    }
  }

  function spawnScorePopup(text, type = 'place', cells = [], raised = false) {
    const layer = $('#fx-layer');
    if (!layer) return;
    const points = cells.length ? cells : [[3, 3]];
    const averageRow = points.reduce((sum, cell) => sum + cell[0], 0) / points.length;
    const averageCol = points.reduce((sum, cell) => sum + cell[1], 0) / points.length;
    const popup = document.createElement('span');
    popup.className = `score-pop ${type}${raised ? ' raised' : ''}`;
    popup.textContent = text;
    popup.style.left = `${clamp(((averageCol + .5) / GRID) * 100, 8, 92)}%`;
    popup.style.top = `${clamp(((averageRow + .5) / GRID) * 100, 12, 88)}%`;
    layer.appendChild(popup);
    setTimeout(() => popup.remove(), type === 'pulse' ? 1150 : 900);
  }

  function showRewardPopup(text, type = 'coins') {
    const layer = $('#reward-layer');
    if (!layer) return;
    const popup = document.createElement('span');
    popup.className = `reward-pop reward-${type}`;
    popup.textContent = text;
    layer.appendChild(popup);
    setTimeout(() => popup.remove(), 1100);
  }

  function retriggerClass(element, className) {
    if (!element) return;
    element.classList.remove(className);
    void element.offsetWidth;
    element.classList.add(className);
  }

  function triggerBoardImpact(type = 'place') {
    const boardWrap = $('#board-wrap');
    if (!boardWrap) return;
    boardWrap.classList.remove('impact-place', 'impact-clear', 'impact-pulse');
    void boardWrap.offsetWidth;
    boardWrap.classList.add(`impact-${type}`);
    setTimeout(() => boardWrap.classList.remove(`impact-${type}`), type === 'pulse' ? 520 : 300);
  }

  function showHighScoreFeedback(score) {
    const panel = $('#high-score-feedback');
    const value = $('#high-score-value');
    if (!panel || !value) return;
    value.textContent = formatNumber(score);
    panel.setAttribute('aria-hidden', 'false');
    panel.classList.remove('show');
    void panel.offsetWidth;
    panel.classList.add('show');
    spawnFeedbackParticles(4);
    spawnFeedbackFlash();
    clearTimeout(state.highScoreTimer);
    state.highScoreTimer = setTimeout(() => {
      panel.classList.remove('show');
      panel.setAttribute('aria-hidden', 'true');
    }, 1900);
  }

  function showToast(message) {
    const toast = $('#toast'); toast.textContent = message; toast.classList.add('show'); clearTimeout(state.toastTimer); state.toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
  }

  function toggleSound() {
    profile.sound = !profile.sound;
    saveProfile(); renderHome();
    showToast(profile.sound ? 'Effets sonores activés' : 'Effets sonores coupés');
    if (profile.sound) playSfx('button');
  }

  function toggleMusic() {
    profile.music = !profile.music;
    saveProfile(); renderHome();
    showToast(profile.music ? 'Musique activée · aucune piste configurée' : 'Musique coupée');
    if (profile.sound) playSfx('button');
  }

  function vibrate(pattern) {
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') navigator.vibrate(pattern);
    } catch (_) { /* vibration facultative */ }
  }

  let audioContext = null;
  function getAudioContext() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      if (!audioContext) audioContext = new AudioContext();
      if (audioContext.state === 'suspended') {
        const resume = audioContext.resume();
        if (resume?.catch) resume.catch(() => {});
      }
      return audioContext;
    } catch (_) { return null; }
  }

  function playTone(frequency, duration, options = {}) {
    if (!profile.sound || profile.volume <= 0) return;
    const context = getAudioContext();
    if (!context) return;
    try {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const now = context.currentTime;
      const peak = Math.max(.001, (options.gain ?? .04) * profile.volume);
      oscillator.type = options.type || 'sine';
      oscillator.frequency.setValueAtTime(frequency, now);
      if (options.to) oscillator.frequency.exponentialRampToValueAtTime(options.to, now + duration);
      gain.gain.setValueAtTime(.001, now);
      gain.gain.exponentialRampToValueAtTime(peak, now + Math.min(.012, duration * .2));
      gain.gain.exponentialRampToValueAtTime(.001, now + duration);
      oscillator.connect(gain); gain.connect(context.destination);
      oscillator.start(now); oscillator.stop(now + duration + .015);
    } catch (_) { /* audio facultatif */ }
  }

  function playSfx(name, level = 1) {
    if (!profile.sound || profile.volume <= 0) return;
    const patterns = {
      button: [[540, .045, 'triangle', .03]],
      select: [[640, .045, 'sine', .034], [820, .055, 'triangle', .024]],
      place: [[360, .045, 'triangle', .034], [520, .065, 'sine', .026]],
      clear: [[520, .055, 'triangle', .04], [700, .08, 'sine', .03]],
      'multi-clear': [[430, .055, 'triangle', .038], [620, .065, 'triangle', .04], [860, .11, 'sine', .034]],
      combo: [[480 + level * 18, .05, 'triangle', .035], [680 + level * 35, .07, 'sine', .035], [900 + level * 55, .11, 'sine', .028]],
      booster: [[390, .05, 'square', .025], [760, .1, 'triangle', .04]],
      coins: [[620, .05, 'triangle', .03], [790, .06, 'triangle', .034], [1020, .11, 'sine', .03]],
      xp: [[460, .05, 'sine', .027], [650, .06, 'triangle', .032], [860, .1, 'sine', .028]],
      unlock: [[480, .06, 'triangle', .03], [720, .07, 'triangle', .035], [1060, .13, 'sine', .034]],
      purchase: [[420, .05, 'square', .022], [600, .07, 'triangle', .03], [820, .11, 'sine', .03]],
      record: [[560, .06, 'triangle', .03], [760, .07, 'triangle', .034], [1000, .09, 'sine', .038], [1320, .15, 'sine', .032]],
      gameOver: [[420, .08, 'sine', .03], [330, .1, 'triangle', .03], [240, .15, 'sine', .028]],
      start: [[440, .05, 'triangle', .025], [660, .09, 'sine', .032]]
    };
    (patterns[name] || patterns.button).forEach(([frequency, duration, type, gain], index) => {
      setTimeout(() => playTone(frequency, duration, { type, gain }), index * 62);
    });
  }

  init();
})();
