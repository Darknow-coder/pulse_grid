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

  // Réglages du drag (à tester sur téléphone) :
  // - false : on écoute pointermove (aligné sur les frames, moins de travail pour le téléphone)
  // - true  : on écoute pointerrawupdate (plus d'événements, peut saturer un téléphone modeste)
  const DRAG_USE_RAW_UPDATES = false;
  // - true  : la pièce est dessinée légèrement en avance sur la trajectoire du doigt
  //   (compense la latence de l'écran tactile) ; false : position exacte du doigt.
  const DRAG_USE_PREDICTION = false;

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
  const getPieceColor = id => skinColorForShape(CATALOG.skins.find(item => item.id === profile.equipped.skin), id);
  const STARTER_WAVES = [
    ['domino-h', 'square', 'tri-h'],
    ['domino-v', 'l-small', 'line-4-h']
  ];

  const CATALOG = {
    skins: [
      { id: 'aurora', name: 'Aurora', price: 0, description: 'Le bloc de référence : brillant, net, lumineux.', primary: '#65e8d0', secondary: '#8b7cff', soft: 'rgba(101,232,208,.18)', contrast: '#07141b' },
      { id: 'ember', name: 'Ember', price: 180, description: 'Des blocs de lave : cœur sombre, braise qui couve dessous.', primary: '#ff9b70', secondary: '#ff4f92', soft: 'rgba(255,126,112,.18)', contrast: '#261016',
        palette: [['#ffd36e', '#ff7a1a'], ['#ff9a52', '#e8321e'], ['#ffb347', '#d6281f'], ['#ff6b4a', '#b3122d'], ['#ffe08a', '#ff8a3d'], ['#ff5a36', '#8f0f2a']] },
      { id: 'pixel', name: 'Pixel Arcade', price: 240, description: 'Relief 8 bits et couleurs pleines, comme sur une vraie borne.', primary: '#4dff88', secondary: '#4da6ff', soft: 'rgba(77,255,136,.18)', contrast: '#04140a',
        palette: [['#ff5d5d', '#b30000'], ['#4dff88', '#00a844'], ['#4da6ff', '#0050c8'], ['#ffe14d', '#c89a00'], ['#ff5dff', '#a000a0'], ['#ff9a3d', '#c24b00']] },
      { id: 'cobalt', name: 'Cobalt', price: 260, description: 'Des blocs de verre glacé, taillés pour refléter la lumière.', primary: '#6eb8ff', secondary: '#6673ff', soft: 'rgba(110,184,255,.18)', contrast: '#081426',
        palette: [['#d9f4ff', '#5bb8ff'], ['#a8e3ff', '#3a7bff'], ['#c7e9ff', '#6a8dff'], ['#8fd2ff', '#2e5fe0'], ['#e6f7ff', '#7ec8ff'], ['#b4c0ff', '#4a58e8']] },
      { id: 'lime', name: 'Lime Shift', price: 340, description: 'Des bonbons gélifiés rebondis, avec leurs reflets mouillés.', primary: '#c4f36d', secondary: '#53d99d', soft: 'rgba(196,243,109,.18)', contrast: '#12210f',
        palette: [['#d7ff6e', '#3fd97a'], ['#ffe75e', '#ffa81f'], ['#ff8fc4', '#ff4e9a'], ['#7ee8ff', '#2fb4ff'], ['#c9a6ff', '#8a5bff'], ['#ffb07a', '#ff6a4f']] },
      { id: 'violet', name: 'Ultraviolet', price: 460, description: 'Des tubes néon : contour électrique, cœur incandescent.', primary: '#e09aff', secondary: '#766cff', soft: 'rgba(224,154,255,.18)', contrast: '#1a0c24',
        palette: [['#f0a5ff', '#b34dff'], ['#8fa6ff', '#5a4dff'], ['#ff8ad8', '#ff3fa9'], ['#76f0ff', '#2fa5ff'], ['#c4a0ff', '#7b4dff'], ['#ff9bd0', '#d13fff']] },
      { id: 'prism', name: 'Prism Shift', price: 520, description: 'Des gemmes taillées en facettes qui captent chaque reflet.', primary: '#f5a8ff', secondary: '#65e8ff', soft: 'rgba(186,151,255,.2)', contrast: '#160d28',
        palette: [['#ff9bd2', '#b06cff'], ['#7ff3ff', '#4a8bff'], ['#9bffb3', '#2fd6a5'], ['#fff08a', '#ffb03f'], ['#ffa8a8', '#ff4f7a'], ['#c3a8ff', '#6a6bff']] },
      { id: 'solaris', name: 'Solaris', price: 620, description: 'De l’or massif brossé, serti de rivets polis.', primary: '#ffe28a', secondary: '#ff6e89', soft: 'rgba(255,186,116,.2)', contrast: '#29130f',
        palette: [['#fff0a0', '#e0a020'], ['#ffe27a', '#c98512'], ['#ffd2b0', '#d6703a'], ['#f4f6ff', '#a9b4d6'], ['#ffc85a', '#d4691f'], ['#ffc1b0', '#d0788a']] }
    ],
    boards: [
      { id: 'night', name: 'Nuit profonde', price: 0, description: 'Le plateau original de Pulse Grid.', shell: '#182846', cell: '#263b5d', glow: 'rgba(101,232,208,.2)', preview: '#203452' },
      { id: 'glass', name: 'Verre fumé', price: 220, description: 'Une vitre givrée aux reflets de lumière.', shell: '#20384c', cell: '#31536a', glow: 'rgba(120,217,255,.28)', preview: '#2d4b60' },
      { id: 'carbon', name: 'Carbone', price: 300, description: 'Fibre tressée, mate et dense. Sensation arcade.', shell: '#1c1f26', cell: '#2f343d', glow: 'rgba(255,155,112,.26)', preview: '#30343b' },
      { id: 'sunset', name: 'Synthwave', price: 380, description: 'Un coucher de soleil rétro-futuriste sous la grille.', shell: '#3a1170', cell: 'rgba(26,8,56,.66)', glow: 'rgba(255,92,160,.34)', preview: '#4a1685' },
      { id: 'nebula', name: 'Nébuleuse', price: 400, description: 'Un ciel d’étoiles et de gaz cosmiques derrière chaque case.', shell: '#2a2550', cell: 'rgba(40,30,92,.62)', glow: 'rgba(224,154,255,.3)', preview: '#3a3263' },
      { id: 'gridline', name: 'Gridline', price: 520, description: 'Une grille de néon turquoise, tracée au laser.', shell: '#071e26', cell: 'rgba(8,38,46,.92)', glow: 'rgba(101,232,208,.36)', preview: '#164149' },
      { id: 'void', name: 'Void', price: 600, description: 'Un vortex violet qui aspire la lumière de la grille.', shell: '#100a20', cell: 'rgba(20,11,40,.88)', glow: 'rgba(190,110,255,.4)', preview: '#26183e' }
    ],
    effects: [
      { id: 'burst', name: 'Burst', price: 0, description: 'Éclats géométriques à chaque ligne.', icon: '✦' },
      { id: 'ring', name: 'Anneaux', price: 200, description: 'Des ondes de choc concentriques traversent le plateau.', icon: '◎' },
      { id: 'confetti', name: 'Confettis', price: 320, description: 'Une explosion de confettis pour fêter chaque grand coup.', icon: '·✦·' },
      { id: 'spark', name: 'Étincelles', price: 430, description: 'Des traînées dorées qui fusent comme un feu d’artifice.', icon: '⁕' },
      { id: 'nova', name: 'Nova', price: 550, description: 'Un éclair blanc, une onde de choc : la ligne devient supernova.', icon: '✺' },
      { id: 'magnet', name: 'Magnétisme', price: 600, description: 'Les débris sont aspirés en spirale vers un cœur lumineux.', icon: '◉' }
    ],
    boosters: [
      { id: 'hammer', name: 'Éclateur', price: 75, description: 'Retire un carré précis sans casser ton rythme.', icon: '⌁', tag: 'PRÉCISION', howTo: 'Active puis touche un carré occupé.' },
      { id: 'reroll', name: 'Recomposition', price: 95, description: 'Change les fragments disponibles quand la main ne répond plus.', icon: '⟳', tag: 'OPTIONS', howTo: 'Remplace les fragments encore libres.' },
      { id: 'pulse-core', name: 'Surcharge Pulse', price: 135, description: 'Remplit la charge pour préparer une Pulse Burst immédiate.', icon: '⚡', tag: 'COMBO', howTo: 'La prochaine ligne déclenche la Burst.' },
      { id: 'scanner', name: 'Scanner Tactique', price: 60, description: 'Révèle une position forte sans jouer à ta place.', icon: '⌕', tag: 'INTEL', howTo: 'Active pour afficher le meilleur fragment.' },
      { id: 'line-breaker', name: 'Lame de Ligne', price: 145, description: 'Ouvre une ligne horizontale au point faible de ta grille.', icon: '╾', tag: 'SECOURS', howTo: 'Active puis touche une case de la ligne.' }
    ],
    packs: [
      { id: 'starter', name: 'Kit Ouverture', price: 220, description: 'Les outils essentiels pour sortir d’une grille serrée.', icon: '▣', badge: 'DÉPART', savings: '−10%', contents: { hammer: 1, scanner: 2, reroll: 1 } },
      { id: 'combo', name: 'Kit Combo', price: 440, description: 'Un stock équilibré pour préparer et prolonger les séries.', icon: '✦', badge: 'POPULAIRE', savings: '−15%', contents: { hammer: 2, scanner: 1, 'pulse-core': 2, 'line-breaker': 1 } },
      { id: 'overdrive', name: 'Kit Overdrive', price: 760, description: 'La réserve complète pour les runs où chaque espace compte.', icon: '◆', badge: 'VALEUR MAX', savings: '−20%', contents: { hammer: 3, reroll: 2, scanner: 2, 'pulse-core': 3, 'line-breaker': 2 } }
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
    inventory: { hammer: 2, reroll: 1, 'pulse-core': 0, scanner: 0, 'line-breaker': 0 },
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
    shopTab: 'themes',
    preview: null,
    toastTimer: null,
    clearFeedbackTimer: null,
    highScoreTimer: null,
    clearVisualPending: false,
    clearVisualToken: 0,
    boardMetricsCache: null,
    packOpening: false,
    packOpeningTimer: null,
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
    ['#board-wrap', '#piece-tray'].forEach(selector => { const el = $(selector); if (el) { el.dataset.skin = skin.id; el.dataset.board = board.id; } });
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
    const moveEvent = DRAG_USE_RAW_UPDATES && typeof window !== 'undefined' && 'onpointerrawupdate' in window ? 'pointerrawupdate' : 'pointermove';
    // Réveille l'audio dès la première interaction (et non au moment de prendre
    // une pièce) : créer l'AudioContext à ce moment-là provoque un à-coup.
    const warmAudio = () => { if (profile.sound) getAudioContext(); };
    document.addEventListener('pointerup', warmAudio, { once: true, passive: true });
    document.addEventListener('click', warmAudio, { once: true, passive: true });
    document.addEventListener(moveEvent, handlePointerMove, { passive: false });
    document.addEventListener('pointerup', handlePointerUp, { passive: false });
    document.addEventListener('pointercancel', cancelDrag, { passive: false });
    window.addEventListener('blur', cancelDrag);
    const invalidateBoardMetrics = () => { state.boardMetricsCache = null; };
    window.addEventListener('resize', invalidateBoardMetrics, { passive: true });
    window.addEventListener('orientationchange', invalidateBoardMetrics, { passive: true });
    window.addEventListener('scroll', invalidateBoardMetrics, { passive: true, capture: true });
    document.addEventListener('visibilitychange', () => { if (document.hidden) cancelDrag(); });
    $('#modal-backdrop').addEventListener('click', event => { if (event.target.id === 'modal-backdrop' && !state.packOpening) closeModal(); });
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
      case 'preview-item': { const card = event.target.closest('[data-item]'); playSfx('button'); vibrate(8); openCosmeticPreview('item', card?.dataset.category, card?.dataset.item); break; }
      case 'preview-theme': { const card = event.target.closest('[data-theme]'); playSfx('button'); vibrate(8); openCosmeticPreview('theme', null, card?.dataset.theme); break; }
      case 'buy-theme': buyTheme(event.target.closest('[data-theme]')?.dataset.theme); break;
      case 'equip-theme': equipTheme(event.target.closest('[data-theme]')?.dataset.theme); break;
      case 'finish-pack-opening': finishPackOpening(); break;
      case 'equip-item': equipItem(event.target.closest('[data-item]')?.dataset.category, event.target.closest('[data-item]')?.dataset.item); break;
      case 'shop-tab': state.shopTab = event.target.closest('[data-shop-tab]').dataset.shopTab; renderShop(); break;
      default: break;
    }
  }

  function setDragMode(active) {
    document.documentElement.classList.toggle('is-dragging', active);
  }

  function removeDragGhost(ghost) {
    if (!ghost) return;
    ghost.style.willChange = 'auto';
    ghost.remove();
  }

  function cancelDrag() {
    if (!state.drag) return;
    cancelScheduledFrame(state.drag.previewFrame);
    state.drag.sourceItem?.releasePointerCapture?.(state.drag.pointerId);
    removeDragGhost(state.drag.ghost);
    state.drag = null;
    setDragMode(false);
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
    clearPreview();
    $('#game-message').textContent = 'Touche la grille pour déposer ce fragment.';

    // Ghost mobile ultra-léger : un seul canvas au lieu d'un arbre de divs.
    // Le canvas est dessiné une seule fois au début du drag ; ensuite seul son
    // transform change, ce qui réduit fortement le travail de paint du navigateur.
    const ghost = createDragGhostCanvas(piece, dragCellWidth, dragCellHeight, dragGapX, dragGapY);

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
      previewFrame: null
    };
    item.setPointerCapture?.(event.pointerId);
    setDragMode(true);
    document.body.appendChild(ghost);
    updateGhost(event.clientX, event.clientY);
    // Vibration et son sont reportés après l'affichage de la première frame du
    // drag, pour qu'ils ne retardent jamais l'apparition de la pièce.
    scheduleFrame(() => setTimeout(() => {
      if (state.drag?.pointerId !== event.pointerId) return;
      vibrate(9);
      playSfx('select');
    }, 0));
  }

  function handlePointerMove(event) {
    const drag = state.drag;
    if (!drag || event.pointerId !== drag.pointerId) return;

    // Utilise uniquement le point le plus récent disponible, puis effectue
    // UNE seule écriture de transform. Aucun smoothing ni interpolation.
    let latestEvent = event;
    try {
      const coalesced = event.getCoalescedEvents?.();
      if (coalesced?.length) latestEvent = coalesced[coalesced.length - 1];
    } catch (_) { /* API facultative */ }

    // Priorité absolue : le ghost bouge dans le même événement que le doigt.
    let visualEvent = latestEvent;
    if (DRAG_USE_PREDICTION) {
      try {
        const predicted = event.getPredictedEvents?.();
        if (predicted?.length) visualEvent = predicted[0];
      } catch (_) { /* API facultative */ }
    }
    updateGhost(visualEvent.clientX, visualEvent.clientY, drag);
    drag.pendingX = latestEvent.clientX;
    drag.pendingY = latestEvent.clientY;
    event.preventDefault();

    // La preview est secondaire et ne peut jamais retarder le déplacement.
    if (drag.previewFrame !== null) return;
    drag.previewFrame = scheduleFrame(() => {
      if (!state.drag || state.drag !== drag) return;
      drag.previewFrame = null;
      updateDragPreview(drag, drag.pendingX, drag.pendingY);
    });
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
    cancelScheduledFrame(drag.previewFrame);
    drag.previewFrame = null;
    updateGhost(drag.pendingX, drag.pendingY, drag);
    const placement = getDropPlacement(drag.pendingX, drag.pendingY, drag);
    drag.sourceItem?.releasePointerCapture?.(drag.pointerId);
    removeDragGhost(drag.ghost);
    state.drag = null;
    clearPreview();
    setDragMode(false);
    if (placement?.valid) placePiece(drag.index, placement.row, placement.col);
    else renderTray();
  }

  // Le dessin du fantôme (dégradés + ombres) est coûteux sur un téléphone
  // modeste : on garde en mémoire les canvas déjà dessinés pour les réutiliser.
  const ghostCanvasCache = new Map();

  function createDragGhostCanvas(piece, cellWidth, cellHeight, gapX, gapY) {
    const pieceColor = getPieceColor(piece.id);
    const cacheKey = [piece.id, pieceColor.primary, pieceColor.secondary, cellWidth.toFixed(2), cellHeight.toFixed(2), gapX.toFixed(2), gapY.toFixed(2), window.devicePixelRatio || 1].join('|');
    const cached = ghostCanvasCache.get(cacheKey);
    if (cached) { cached.style.willChange = 'transform'; return cached; }
    const canvas = buildDragGhostCanvas(piece, cellWidth, cellHeight, gapX, gapY);
    if (ghostCanvasCache.size > 40) ghostCanvasCache.clear();
    ghostCanvasCache.set(cacheKey, canvas);
    return canvas;
  }

  function buildDragGhostCanvas(piece, cellWidth, cellHeight, gapX, gapY) {
    const canvas = document.createElement('canvas');
    canvas.className = 'drag-ghost';
    const cssWidth = piece.cols * cellWidth + Math.max(0, piece.cols - 1) * gapX;
    const cssHeight = piece.rows * cellHeight + Math.max(0, piece.rows - 1) * gapY;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;
    canvas.style.willChange = 'transform';
    canvas.width = Math.max(1, Math.round(cssWidth * dpr));
    canvas.height = Math.max(1, Math.round(cssHeight * dpr));

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return canvas;
    ctx.scale(dpr, dpr);
    const color = getPieceColor(piece.id);
    const radius = Math.min(10, Math.max(6, cellWidth * 0.28));

    for (const [r, c] of piece.cells) {
      const x = c * (cellWidth + gapX);
      const y = r * (cellHeight + gapY);
      const gradient = ctx.createLinearGradient(x, y, x + cellWidth, y + cellHeight);
      gradient.addColorStop(0, color.primary);
      gradient.addColorStop(1, color.secondary);
      ctx.save();
      ctx.shadowColor = color.soft;
      ctx.shadowBlur = Math.min(9, cellWidth * 0.32);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, cellWidth, cellHeight, radius);
      else {
        const rr = Math.min(radius, cellWidth / 2, cellHeight / 2);
        ctx.moveTo(x + rr, y);
        ctx.arcTo(x + cellWidth, y, x + cellWidth, y + cellHeight, rr);
        ctx.arcTo(x + cellWidth, y + cellHeight, x, y + cellHeight, rr);
        ctx.arcTo(x, y + cellHeight, x, y, rr);
        ctx.arcTo(x, y, x + cellWidth, y, rr);
      }
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = 'rgba(255,255,255,.2)';
      ctx.lineWidth = Math.max(1, Math.min(1.5, cellWidth * 0.06));
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.16)';
      ctx.fillRect(x + cellWidth * .08, y + cellHeight * .07, cellWidth * .84, Math.max(1, cellHeight * .055));
      ctx.restore();
    }
    return canvas;
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
    const color = getPieceColor(piece.id);
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
        const color = getPieceColor(boardPiece.piece);
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
    { id: 'hammer', label: 'Éclateur', short: 'Retirer 1 carré', active: 'Touche un carré', icon: '⌁' },
    { id: 'reroll', label: 'Recomp.', short: 'Changer la main', active: 'En cours…', icon: '⟳' },
    { id: 'pulse-core', label: 'Surcharge', short: 'Charger Pulse', active: 'Prêt au prochain clear', icon: '⚡' },
    { id: 'scanner', label: 'Scanner', short: 'Révéler un coup', active: 'Analyse…', icon: '⌕' },
    { id: 'line-breaker', label: 'Lame', short: 'Ouvrir une ligne', active: 'Touche une ligne', icon: '╾' }
  ];

  function renderBoosters() {
    const bar = $('#booster-bar');
    if (!bar) return;
    bar.innerHTML = BOOSTER_DEFS.map(def => {
      const count = profile.inventory[def.id] || 0;
      const active = state.activeBooster === def.id;
      const disabled = count <= 0 || state.resolving || !state.gameActive;
      return `<button class="booster-button booster-${def.id}${active ? ' active' : ''}" data-action="use-booster" data-booster-id="${def.id}" ${disabled && !active ? 'disabled' : ''} aria-label="${def.label}, ${count} disponible${count > 1 ? 's' : ''}"><span class="booster-symbol">${def.icon}</span><span class="booster-info"><b>${active ? 'ANNULER' : def.label}</b><small>${active ? def.active : def.short}</small></span><strong class="booster-count">${count}</strong></button>`;
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
    const item = $$(`[${attribute}]`).find(element => element.getAttribute(attribute) === value && (!element.closest('.screen') || element.closest('.screen').classList.contains('active')));
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

    if (id === 'line-breaker') {
      if (state.activeBooster === 'line-breaker') {
        state.activeBooster = null;
        renderBoosters();
        $('#game-message').textContent = 'Choisis un fragment et fais-le glisser.';
        return;
      }
      if (!(profile.inventory['line-breaker'] > 0)) return showToast('Tu n’as plus de Lame de Ligne.');
      state.activeBooster = 'line-breaker';
      state.selectedPiece = null;
      clearPreview();
      renderTray();
      renderBoosters();
      $('#game-message').textContent = 'Lame active : touche une case de la ligne à ouvrir.';
      playSfx('booster'); vibrate(18);
      return;
    }

    if (id === 'scanner') {
      if (!profile.inventory.scanner) return showToast('Tu n’as plus de Scanner Tactique.');
      if (!state.queue.some(piece => piece && canAnyPlace(piece))) return showToast('Le Scanner ne trouve aucun fragment jouable.');
      if (!consumeBooster('scanner')) return;
      state.activeBooster = null;
      state.selectedPiece = null;
      clearPreview();
      renderTray();
      giveHint({ fromScanner: true });
      playSfx('booster'); vibrate([10, 8, 18]);
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
    const boosterId = state.activeBooster;
    if (!boosterId || state.resolving || !state.gameActive) return;
    if (boosterId === 'hammer') {
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
      return;
    }

    if (boosterId === 'line-breaker') {
      const rowCells = state.board[row].map((cell, index) => cell ? [row, index] : null).filter(Boolean);
      if (!rowCells.length) {
        showToast('Choisis une ligne qui contient des carrés.');
        vibrate(12);
        return;
      }
      if (!consumeBooster('line-breaker')) return;
      rowCells.forEach(([r, c]) => { state.board[r][c] = null; });
      state.activeBooster = null;
      state.selectedPiece = null;
      renderBoard(); renderTray(); renderHud(); renderBoosters();
      triggerClearEffect(rowCells, true);
      triggerBoardImpact('clear');
      spawnScorePopup('LIGNE OUVERTE', 'clear', rowCells, true);
      $('#game-message').textContent = 'Une ligne a été ouverte. Le rythme repart.';
      showToast('Lame de Ligne · espace libéré.');
      playSfx('multi-clear', 2); vibrate([20, 10, 32]);
      saveProfile();
    }
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
    piece.cells.forEach(([dr, dc]) => { state.board[row + dr][col + dc] = { piece: piece.id, color: getPieceColor(piece.id) }; });
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

  /* ===== Boutique cosmétique : métadonnées, thèmes, aperçus ===== */
  const SHOP_META = {
    skins: {
      aurora: { rarity: 'ORIGINAL', tag: 'CLASSIQUE', note: 'Le bloc Pulse Grid, brillant et net.' },
      ember: { rarity: 'RARE', tag: 'MAGMA', note: 'Cœur sombre, braise incandescente et fissure de lave.' },
      pixel: { rarity: 'RARE', tag: 'PIXEL', note: 'Relief 8 bits, esprit borne d’arcade.' },
      cobalt: { rarity: 'RARE', tag: 'CRISTAL', note: 'Verre glacé et reflets coupants.' },
      lime: { rarity: 'ÉPIQUE', tag: 'GELÉE', note: 'Bonbons rebondis, reflets mouillés.' },
      violet: { rarity: 'ÉPIQUE', tag: 'NÉON', note: 'Contours lumineux, cœur électrique.' },
      prism: { rarity: 'MYTHIQUE', tag: 'GEMME', note: 'Facettes taillées qui captent la lumière.' },
      solaris: { rarity: 'MYTHIQUE', tag: 'OR MASSIF', note: 'Plaques d’or brossé, rivets polis.' }
    },
    boards: {
      night: { rarity: 'ORIGINAL', tag: 'CLASSIQUE', note: 'Le plateau Pulse Grid.' },
      glass: { rarity: 'RARE', tag: 'VERRE', note: 'Surface givrée, reflets diagonaux.' },
      carbon: { rarity: 'RARE', tag: 'CARBONE', note: 'Fibre tressée, liseré orange.' },
      sunset: { rarity: 'ÉPIQUE', tag: 'SYNTHWAVE', note: 'Dégradé coucher de soleil, halo rose.' },
      nebula: { rarity: 'ÉPIQUE', tag: 'COSMOS', note: 'Étoiles et gaz cosmiques en fond.' },
      gridline: { rarity: 'MYTHIQUE', tag: 'NÉON GRID', note: 'Cases tracées au laser turquoise.' },
      void: { rarity: 'MYTHIQUE', tag: 'VORTEX', note: 'Vortex violet, cases sombres cerclées de lumière.' }
    },
    effects: {
      burst: { rarity: 'ORIGINAL', tag: 'ÉCLAT', note: 'Le feedback Pulse Grid.' },
      ring: { rarity: 'RARE', tag: 'ONDE', note: 'Ondes de choc concentriques.' },
      confetti: { rarity: 'ÉPIQUE', tag: 'FÊTE', note: 'Pluie de confettis multicolores.' },
      spark: { rarity: 'ÉPIQUE', tag: 'FEU D’ARTIFICE', note: 'Traînées dorées nerveuses.' },
      nova: { rarity: 'MYTHIQUE', tag: 'SUPERNOVA', note: 'Flash blanc et onde de choc.' },
      magnet: { rarity: 'MYTHIQUE', tag: 'TROU NOIR', note: 'Aspiration en spirale vers le centre.' }
    }
  };

  const RARITY_KEY = { 'ORIGINAL': 'original', 'RARE': 'rare', 'ÉPIQUE': 'epic', 'MYTHIQUE': 'mythic' };
  const CATEGORY_LABEL = { skins: 'Fragment', boards: 'Plateau', effects: 'Impulsion' };
  const THEME_DISCOUNT = .25;
  const THEMES = [
    { id: 'eclipse', name: 'Éclipse Solaire', skin: 'solaris', board: 'void', effect: 'nova', rarity: 'MYTHIQUE', tagline: 'De l’or fondu sur le vide. Chaque ligne devient une supernova.' },
    { id: 'cosmos', name: 'Cosmos Prismatique', skin: 'prism', board: 'nebula', effect: 'magnet', rarity: 'MYTHIQUE', tagline: 'Des gemmes dans la nébuleuse, aspirées par un trou noir.' },
    { id: 'neon', name: 'Nuit Néon', skin: 'violet', board: 'gridline', effect: 'spark', rarity: 'ÉPIQUE', tagline: 'Tubes néon sur grille laser, feux d’artifice à chaque combo.' },
    { id: 'arcade', name: 'Arcade 88', skin: 'pixel', board: 'sunset', effect: 'confetti', rarity: 'ÉPIQUE', tagline: 'Pixels, soleil couchant et confettis : la borne de tes rêves.' },
    { id: 'magma', name: 'Cœur de Magma', skin: 'ember', board: 'carbon', effect: 'spark', rarity: 'RARE', tagline: 'Lave et fibre de carbone. Ça chauffe à chaque ligne.' },
    { id: 'glacier', name: 'Glacier', skin: 'cobalt', board: 'glass', effect: 'ring', rarity: 'RARE', tagline: 'Cristal, verre givré et ondes de choc glacées.' }
  ];

  const toRgba = (hex, alpha) => { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`; };
  const AURORA_IDS = ['dot', 'domino-v', 'tri-h', 'tri-v', 'square', 't'];
  function paletteColor(skin, index) {
    if (!skin || !skin.palette) return PIECE_COLORS[AURORA_IDS[index % AURORA_IDS.length]];
    const [primary, secondary] = skin.palette[index % skin.palette.length];
    return { primary, secondary, soft: toRgba(secondary, .34) };
  }
  function skinColorForShape(skin, shapeId) {
    if (!skin || !skin.palette) return PIECE_COLORS[shapeId] || PIECE_COLORS.dot;
    return paletteColor(skin, Math.max(0, SHAPE_LIBRARY.findIndex(shape => shape.id === shapeId)));
  }

  const DEMO5 = [[-1, -1, -1, -1, -1], [0, 0, -1, 3, -1], [0, -1, -1, 3, 3], [1, 1, 1, -1, 2], [4, 4, -1, 4, 2]];
  const DEMO5_BOARD = [[-1, -1, -1, -1, -1], [-1, 0, 0, -1, -1], [-1, -1, -1, 3, -1], [1, -1, -1, 3, 3], [1, 1, -1, -1, -1]];
  const DEMO5_FX = [[-1, 0, -1, -1, -1], [-1, 0, -1, 3, 3], [4, 4, 4, 4, 4], [1, 1, -1, 2, -1], [1, -1, -1, 2, 5]];
  const DEMO7 = [
    [-1, -1, -1, -1, -1, -1, -1], [-1, 0, 0, -1, -1, 3, -1], [-1, 0, -1, -1, -1, 3, 3], [4, 4, 4, 4, 4, 4, 4],
    [5, 5, -1, 2, 2, -1, 1], [5, -1, -1, -1, 2, -1, 1], [1, 1, -1, -1, -1, -1, 0]
  ];

  const FX_COLORS = { burst: ['#65e8d0', '#8b7cff'], ring: ['#78d9ff', '#65e8d0'], confetti: ['#ff7f9e', '#ffd17a'], spark: ['#ffd17a', '#fff2b3'], nova: ['#fff2b3', '#ff9b70'], magnet: ['#e09aff', '#65e8ff'] };
  const CONFETTI_COLORS = ['#ff7f9e', '#ffd17a', '#65e8d0', '#8b7cff', '#78d9ff', '#c4f36d'];

  function fxHTML(effectId, rowCenterPercent) {
    const [c1, c2] = FX_COLORS[effectId] || FX_COLORS.burst;
    const parts = [];
    const add = (vars, cls = '') => parts.push(`<i${cls ? ` class="${cls}"` : ''} style="${vars}"></i>`);
    if (effectId === 'burst') for (let i = 0; i < 14; i++) add(`--a:${i * 360 / 14}deg;--r:${58 + (i % 3) * 14};--s:7;--c:${i % 2 ? c2 : c1};--d:${(i % 4) * .02}s`);
    else if (effectId === 'ring') for (let i = 0; i < 3; i++) add(`--s:34;--g:${3 + i * .9};--c:${i % 2 ? c2 : c1};--d:${i * .12}s`);
    else if (effectId === 'confetti') for (let i = 0; i < 18; i++) add(`--x:${((i * 47) % 100) - 50};--u:${-(40 + (i * 13) % 46)};--f:${52 + (i * 7) % 26};--rot:${(i % 2 ? 1 : -1) * (240 + i * 22)}deg;--s:6;--c:${CONFETTI_COLORS[i % 6]};--d:${(i % 5) * .025}s`);
    else if (effectId === 'spark') for (let i = 0; i < 12; i++) add(`--a:${i * 30 + 15}deg;--r:${72 + (i % 3) * 18};--c:${i % 2 ? c2 : c1};--d:${(i % 3) * .02}s`);
    else if (effectId === 'nova') {
      add(`--s:38;--c:${c1}`, 'nv-core');
      add(`--s:30;--g:3.6;--c:${c2}`, 'nv-wave');
      for (let i = 0; i < 10; i++) add(`--a:${i * 36}deg;--r:${52 + (i % 2) * 20};--s:6;--c:${i % 2 ? c2 : c1}`, 'nv-dot');
    } else if (effectId === 'magnet') {
      add(`--s:16;--c:${c1}`, 'mg-core');
      for (let i = 0; i < 12; i++) add(`--a:${i * 30}deg;--r:${62 + (i % 3) * 14};--s:6;--c:${i % 2 ? c2 : c1};--d:${(i % 4) * .05}s`, 'mg-dot');
    }
    return `<div class="fxp fx-${effectId}" style="--fy:${rowCenterPercent}%">${parts.join('')}</div>`;
  }

  function themeVarsStyle(skin, board) {
    return `--skin-primary:${skin.primary};--skin-secondary:${skin.secondary};--skin-soft:${skin.soft};--skin-contrast:${skin.contrast};--board-shell:${board.shell};--cell-bg:${board.cell};--board-glow:${board.glow};`;
  }

  function miniBoardHTML(skinId, boardId, opts = {}) {
    const skin = findCatalog('skins', skinId); const board = findCatalog('boards', boardId);
    const size = opts.size || 5; const layout = opts.layout || DEMO5; const clearRow = opts.clearRow ?? -1;
    let cells = '';
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
      const value = layout[r][c];
      if (value < 0) { cells += '<i class="cell"></i>'; continue; }
      const color = paletteColor(skin, value);
      cells += `<i class="cell filled${r === clearRow ? ' demo-line' : ''}" style="--piece-primary:${color.primary};--piece-secondary:${color.secondary};--piece-soft:${color.soft};--dl:${c * 28}ms"></i>`;
    }
    const fx = opts.effect && clearRow >= 0 ? fxHTML(opts.effect, ((clearRow + .5) / size) * 100) : '';
    return `<div class="mini-board${opts.big ? ' big' : ''}" data-skin="${skin.id}" data-board="${board.id}" style="${themeVarsStyle(skin, board)}"><div class="board" style="grid-template-columns:repeat(${size},1fr);grid-template-rows:repeat(${size},1fr)">${cells}</div>${fx}</div>`;
  }

  function demoTrayHTML(skinId) {
    const skin = findCatalog('skins', skinId);
    const shapes = [[[0, 0], [1, 0], [1, 1]], [[0, 0], [0, 1], [1, 0], [1, 1]], [[0, 0], [0, 1], [0, 2]]];
    const indexes = [2, 4, 0];
    return `<div class="cp-tray" data-skin="${skin.id}">${shapes.map((cells, k) => {
      const color = paletteColor(skin, indexes[k]);
      const rows = Math.max(...cells.map(cell => cell[0])) + 1; const cols = Math.max(...cells.map(cell => cell[1])) + 1;
      let html = '';
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) html += `<i class="mini-cell${cells.some(([pr, pc]) => pr === r && pc === c) ? '' : ' empty'}"></i>`;
      return `<div class="piece-shape" style="--piece-cols:${cols};--piece-rows:${rows};--piece-primary:${color.primary};--piece-secondary:${color.secondary};--piece-soft:${color.soft}">${html}</div>`;
    }).join('')}</div>`;
  }

  function themeInfo(theme) {
    const parts = [['skins', theme.skin], ['boards', theme.board], ['effects', theme.effect]];
    const missing = parts.filter(([category, id]) => !isUnlocked(category, id));
    const missingSum = missing.reduce((sum, [category, id]) => sum + findCatalog(category, id).price, 0);
    return {
      parts, missing, full: missingSum, price: Math.round(missingSum * (1 - THEME_DISCOUNT) / 5) * 5,
      complete: missing.length === 0, equipped: parts.every(([category, id]) => profile.equipped[category.slice(0, -1)] === id)
    };
  }

  function refreshGameVisuals() {
    try { renderBoard(); renderTray(); } catch (_) { /* l'écran de jeu n'est pas encore prêt */ }
  }

  function stageHTML(category, item) {
    const equipped = profile.equipped;
    if (category === 'skins') return miniBoardHTML(item.id, equipped.board, { size: 5, layout: DEMO5 });
    if (category === 'boards') return miniBoardHTML(equipped.skin, item.id, { size: 5, layout: DEMO5_BOARD });
    return miniBoardHTML(equipped.skin, equipped.board, { size: 5, layout: DEMO5_FX, clearRow: 2, effect: item.id });
  }

  function needBlock(price) {
    const short = Math.max(0, price - profile.coins);
    if (!short) return '';
    return `<div class="cos-need-wrap"><span class="cos-need"><span style="width:${Math.min(100, Math.round(profile.coins / price * 100))}%"></span></span><small class="cos-need-label">Il te manque <b>◆ ${formatNumber(short)}</b></small></div>`;
  }

  function renderCatalogCard(category, item) {
    const unlocked = isUnlocked(category, item.id); const equipped = profile.equipped[category.slice(0, -1)] === item.id;
    const meta = SHOP_META[category]?.[item.id] || { rarity: 'RARE', tag: 'COLLECTION', note: item.description };
    const short = item.price > profile.coins;
    let action;
    if (equipped) action = '<button class="cos-btn on" disabled>✓ ÉQUIPÉ</button>';
    else if (unlocked) action = '<button class="cos-btn equip" data-action="equip-item">ÉQUIPER</button>';
    else action = `<button class="cos-btn buy${short ? ' short' : ''}" data-action="buy-item">◆ ${formatNumber(item.price)}</button>${needBlock(item.price)}`;
    const state = equipped ? '<span class="cos-state on">ÉQUIPÉ</span>' : unlocked ? '<span class="cos-state own">✓ POSSÉDÉ</span>' : '';
    return `<article class="cos-card ${unlocked ? 'owned' : 'locked'}${equipped ? ' equipped-card' : ''}" data-r="${RARITY_KEY[meta.rarity]}" data-category="${category}" data-item="${item.id}">
      <button class="cos-stage" data-action="preview-item" aria-label="Aperçu de ${item.name}">${stageHTML(category, item)}<span class="cos-rarity">${meta.rarity}</span>${state}<span class="cos-try">◉ APERÇU EN JEU</span></button>
      <div class="cos-body"><div class="cos-name"><em>${meta.tag}</em><h3>${item.name}</h3></div><p class="cos-note">${meta.note}</p>${action}</div></article>`;
  }

  function themeCardHTML(theme) {
    const info = themeInfo(theme); const rk = RARITY_KEY[theme.rarity];
    const skin = findCatalog('skins', theme.skin); const board = findCatalog('boards', theme.board);
    const chips = info.parts.map(([category, id]) => {
      const own = isUnlocked(category, id);
      return `<span class="tc-chip${own ? ' own' : ''}"><b>${own ? '✓' : '◆'}</b>${CATEGORY_LABEL[category]} · ${findCatalog(category, id).name}</span>`;
    }).join('');
    const short = info.price > profile.coins;
    let action;
    if (info.equipped) action = '<button class="cos-btn on" disabled>✓ THÈME ÉQUIPÉ</button>';
    else if (info.complete) action = '<button class="cos-btn equip" data-action="equip-theme">ÉQUIPER LE THÈME</button>';
    else action = `<button class="cos-btn buy${short ? ' short' : ''}" data-action="buy-theme"><span>OBTENIR</span>${info.full > info.price ? `<s>◆ ${formatNumber(info.full)}</s>` : ''}<b>◆ ${formatNumber(info.price)}</b></button>${needBlock(info.price)}`;
    return `<article class="theme-card" data-r="${rk}" data-theme="${theme.id}">
      <button class="theme-stage" data-action="preview-theme" aria-label="Aperçu du thème ${theme.name}" style="--tg1:${toRgba(skin.palette ? skin.palette[0][1] : skin.primary, .42)};--tg2:${toRgba(skin.palette ? skin.palette[2][1] : skin.secondary, .34)}">
        <span class="theme-copy"><span class="cos-rarity static">${theme.rarity}</span><strong>${theme.name}</strong><small>${theme.tagline}</small></span>
        ${miniBoardHTML(theme.skin, theme.board, { size: 5, layout: DEMO5_FX, clearRow: 2, effect: theme.effect })}
        ${!info.complete && info.full > info.price ? '<span class="theme-save">−25%</span>' : ''}<span class="cos-try">◉ APERÇU EN JEU</span>
      </button>
      <div class="theme-body"><div class="tc-chips">${chips}</div>${action}</div></article>`;
  }

  function renderThemeShop() {
    const complete = THEMES.filter(theme => themeInfo(theme).complete).length;
    return `<section class="shop-hero shop-hero-themes"><div class="shop-hero-icon">❖</div><div class="shop-hero-copy"><span class="eyebrow accent">COLLECTIONS ASSORTIES</span><h2>Un look. Un tap.</h2><p>Fragments, plateau et impulsion pensés ensemble, −25% par rapport à l’unité.</p></div><div class="shop-hero-stat"><strong>${complete}/${THEMES.length}</strong><small>complets</small></div></section><div class="theme-list">${THEMES.map(themeCardHTML).join('')}</div>`;
  }

  /* ----- Aperçu en jeu (fenêtre) ----- */
  function previewConfig(request) {
    const equipped = profile.equipped;
    if (request.kind === 'theme') {
      const theme = THEMES.find(entry => entry.id === request.id); if (!theme) return null;
      return { kind: 'theme', id: theme.id, theme, skin: theme.skin, board: theme.board, effect: theme.effect, name: theme.name, desc: theme.tagline, rarity: theme.rarity, highlight: ['skin', 'board', 'effect'] };
    }
    const item = findCatalog(request.category, request.id); const key = request.category.slice(0, -1);
    const config = { kind: 'item', category: request.category, id: request.id, item, skin: equipped.skin, board: equipped.board, effect: equipped.effect, name: item.name, desc: item.description, rarity: SHOP_META[request.category][request.id].rarity, highlight: [key] };
    config[key] = request.id;
    return config;
  }

  function buyBlockHTML(price, strike, action, label) {
    const short = Math.max(0, price - profile.coins);
    return `<button class="cp-cta buy${short ? ' short' : ''}" data-action="${action}"><span>${label}</span><span class="cp-price">${strike > price ? `<s>◆ ${formatNumber(strike)}</s>` : ''}<b>◆ ${formatNumber(price)}</b></span></button>${short
      ? `<div class="cp-short"><span class="cos-need"><span style="width:${Math.min(100, Math.round(profile.coins / price * 100))}%"></span></span><small>Il te manque <b>◆ ${formatNumber(short)}</b> · chaque partie en rapporte</small></div>`
      : '<div class="cp-ready">✓ Tu as assez de PulseCoins</div>'}`;
  }

  function previewActionHTML(config) {
    if (config.kind === 'theme') {
      const info = themeInfo(config.theme);
      if (info.equipped) return '<button class="cp-cta on" disabled>✓ THÈME ÉQUIPÉ</button>';
      if (info.complete) return '<button class="cp-cta equip" data-action="equip-theme">ÉQUIPER LE THÈME</button>';
      return buyBlockHTML(info.price, info.full, 'buy-theme', 'OBTENIR LE THÈME');
    }
    const unlocked = isUnlocked(config.category, config.id); const equipped = profile.equipped[config.category.slice(0, -1)] === config.id;
    if (equipped) return '<button class="cp-cta on" disabled>✓ ÉQUIPÉ</button>';
    if (unlocked) return '<button class="cp-cta equip" data-action="equip-item">ÉQUIPER</button>';
    return buyBlockHTML(config.item.price, 0, 'buy-item', 'DÉBLOQUER');
  }

  function openCosmeticPreview(kind, category, id) {
    state.preview = { kind, category, id };
    const config = previewConfig(state.preview); if (!config) return;
    const skin = findCatalog('skins', config.skin); const board = findCatalog('boards', config.board); const effect = findCatalog('effects', config.effect);
    const rows = [['skin', 'Fragment', skin.name], ['board', 'Plateau', board.name], ['effect', 'Impulsion', effect.name]]
      .map(([key, label, name]) => `<span class="cp-chip${config.highlight.includes(key) ? ' hl' : ''}"><small>${label}</small>${name}</span>`).join('');
    const owner = config.kind === 'theme' ? `data-theme="${config.id}"` : `data-category="${config.category}" data-item="${config.id}"`;
    openModal(`<div class="cp" data-r="${RARITY_KEY[config.rarity]}" ${owner}>
      <button class="cp-close" data-action="close-modal" aria-label="Fermer">✕</button>
      <div class="cp-stage"><span class="cp-live">● APERÇU EN JEU</span>${miniBoardHTML(config.skin, config.board, { size: 7, layout: DEMO7, clearRow: 3, effect: config.effect, big: true })}${demoTrayHTML(config.skin)}</div>
      <div class="cp-info"><div class="cp-meta"><span class="cp-rarity">${config.rarity}</span><span class="cp-kind">${config.kind === 'theme' ? 'THÈME COMPLET' : CATEGORY_LABEL[config.category].toUpperCase()}</span></div><h2>${config.name}</h2><p>${config.desc}</p><div class="cp-chips">${rows}</div>${previewActionHTML(config)}</div></div>`, 'cosmetic-modal');
  }

  function refreshPreview() {
    if (state.preview && $('#modal-backdrop').classList.contains('open')) openCosmeticPreview(state.preview.kind, state.preview.category, state.preview.id);
  }

  function buyTheme(id) {
    const theme = THEMES.find(entry => entry.id === id); if (!theme) return;
    const info = themeInfo(theme);
    if (info.complete) { equipTheme(id); return; }
    if (profile.coins < info.price) { showToast('Pas assez de PulseCoins pour ce thème.'); vibrate(20); return; }
    profile.coins -= info.price;
    info.missing.forEach(([category, itemId]) => { if (!profile.unlocked[category].includes(itemId)) profile.unlocked[category].push(itemId); });
    info.parts.forEach(([category, itemId]) => { profile.equipped[category.slice(0, -1)] = itemId; });
    applyTheme(); refreshGameVisuals(); saveProfile(); renderShop(); renderCollection(); renderHome(); refreshPreview();
    showToast(`${theme.name} débloqué et équipé !`); playSfx('unlock'); vibrate(30);
  }

  function equipTheme(id) {
    const theme = THEMES.find(entry => entry.id === id); if (!theme) return;
    const info = themeInfo(theme); if (!info.complete) return;
    info.parts.forEach(([category, itemId]) => { profile.equipped[category.slice(0, -1)] = itemId; });
    applyTheme(); refreshGameVisuals(); saveProfile(); renderShop(); renderCollection(); refreshPreview();
    showToast(`${theme.name} équipé`); playSfx('unlock');
  }

  const SHOP_COPY = {
    skins: { kicker: 'FORME DES BLOCS', title: 'Change la matière.', detail: 'Lave, cristal, néon, or : chaque skin redessine tous tes blocs, sur la grille comme dans ta main.', icon: '✦' },
    boards: { kicker: 'ESPACE DE JEU', title: 'Choisis ton terrain.', detail: 'Des matières et des ambiances qui transforment la grille, sans gêner la lecture.', icon: '▦' },
    effects: { kicker: 'SIGNATURE DE COMBO', title: 'Fais sentir tes coups.', detail: 'Touche une carte pour voir l’effet jouer sur une vraie ligne.', icon: '✺' }
  };

  function renderShop() {
    $('#shop-coins').textContent = formatNumber(profile.coins);
    $$('[data-shop-tab]').forEach(button => button.classList.toggle('active', button.dataset.shopTab === state.shopTab));
    const target = $('#shop-content');
    if (!target) return;
    target.className = 'shop-content-shell';
    if (state.shopTab === 'boosters') {
      target.innerHTML = renderBoosterShop();
      return;
    }
    if (state.shopTab === 'themes') {
      target.innerHTML = renderThemeShop();
      return;
    }
    const items = CATALOG[state.shopTab] || [];
    const copy = SHOP_COPY[state.shopTab];
    const key = state.shopTab.slice(0, -1);
    const equipped = findCatalog(state.shopTab, profile.equipped[key]);
    const owned = items.filter(item => isUnlocked(state.shopTab, item.id)).length;
    target.innerHTML = `<section class="shop-hero shop-hero-${state.shopTab}"><div class="shop-hero-icon">${copy.icon}</div><div class="shop-hero-copy"><span class="eyebrow accent">${copy.kicker}</span><h2>${copy.title}</h2><p>${copy.detail}</p></div><div class="shop-hero-stat"><strong>${owned}/${items.length}</strong><small>possédés</small></div></section><div class="shop-current"><span>ÉQUIPÉ</span><strong>${equipped.name}</strong><small>${SHOP_META[state.shopTab]?.[equipped.id]?.note || equipped.description}</small></div><div class="shop-section-label">COLLECTION ${owned === items.length ? 'COMPLÈTE' : `${items.length - owned} À DÉBLOQUER`}</div><div class="cos-grid">${items.map(item => renderCatalogCard(state.shopTab, item)).join('')}</div>`;
  }

  function renderBoosterShop() {
    const packs = CATALOG.packs.map(pack => {
      const rewardCount = Object.values(pack.contents).reduce((sum, count) => sum + count, 0);
      return `<article class="catalog-card pack-card" data-pack-id="${pack.id}"><div class="catalog-preview pack-preview"><span>${pack.icon}</span><em>${pack.badge || 'PACK'}</em><b class="pack-question">?</b></div><div class="pack-kicker">${pack.badge || 'PACK DE BOOSTERS'} <b>${pack.savings || ''}</b></div><h3>${pack.name}</h3><p>${pack.description}</p><div class="pack-mystery"><span>?</span><div><strong>CONTENU MYSTÈRE</strong><small>${rewardCount} bonus garantis · révélés à l’ouverture</small></div></div><div class="pack-value"><span>VALEUR RUN</span><strong>${pack.savings || 'STOCK'}</strong></div><button class="item-action buy" data-action="buy-pack">◆ ${pack.price}</button></article>`;
    }).join('');
    const boosters = CATALOG.boosters.map(item => renderBoosterShopCard(item)).join('');
    return `<div class="booster-shop"><section class="shop-hero shop-hero-boosters"><div class="shop-hero-icon">⚡</div><div class="shop-hero-copy"><span class="eyebrow accent">OUTILS DE RUN</span><h2>Achète un vrai avantage.</h2><p>Chaque bonus a un moment précis où il peut sauver ta grille. Pas de décoration inutile.</p></div><div class="shop-hero-stat"><strong>${Object.values(profile.inventory).reduce((sum, count) => sum + (Number(count) || 0), 0)}</strong><small>en stock</small></div></section><div class="booster-shop-intro"><div class="booster-shop-icon">◎</div><div><span class="eyebrow accent">CONSOMMABLES</span><strong>Choisis ton style de secours.</strong><small>Précision, information, tempo ou ouverture : les packs combinent des usages différents.</small></div></div><div class="shop-section-label">PACKS AVANTAGEUX</div><div class="catalog-grid pack-grid">${packs}</div><div class="shop-section-label">À L'UNITÉ · CHOISIS TON OUTIL</div><div class="catalog-grid booster-grid">${boosters}</div></div>`;
  }

  function renderBoosterShopCard(item) {
    const count = profile.inventory[item.id] || 0;
    const rarity = item.id === 'line-breaker' || item.id === 'pulse-core' ? 'ÉPIQUE' : item.id === 'scanner' || item.id === 'hammer' ? 'RARE' : 'TACTIQUE';
    return `<article class="catalog-card booster-card booster-shop-card" data-booster-id="${item.id}"><div class="catalog-preview booster-preview"><span>${item.icon}</span><em>${item.tag}</em></div><div class="product-head"><span class="product-rarity" data-rarity="${rarity}">${rarity}</span><span class="product-tag">${item.tag}</span></div><div class="booster-card-head"><h3>${item.name}</h3><strong>${count}</strong></div><p>${item.description}</p><div class="booster-how"><span>UTILISATION</span>${item.howTo}</div><div class="inventory-line"><span>EN STOCK</span><b>${count}</b></div><button class="item-action buy" data-action="buy-booster">◆ ${item.price}</button></article>`;
  }

  function renderCollection() {
    const skin = findCatalog('skins', profile.equipped.skin); const board = findCatalog('boards', profile.equipped.board); const effect = findCatalog('effects', profile.equipped.effect);
    $('#collection-content').innerHTML = `
      <article class="collection-hero">${miniBoardHTML(skin.id, board.id, { size: 5, layout: DEMO5 })}<div><span class="eyebrow accent">ÉQUIPEMENT ACTUEL</span><h2>${skin.name}</h2><p>${board.name} · ${effect.name}</p></div></article>
      <div class="collection-section"><h3>Fragments</h3><div class="cos-grid">${CATALOG.skins.map(item => renderCatalogCard('skins', item, 'collection')).join('')}</div></div>
      <div class="collection-section"><h3>Plateaux</h3><div class="cos-grid">${CATALOG.boards.map(item => renderCatalogCard('boards', item, 'collection')).join('')}</div></div>
      <div class="collection-section"><h3>Impulsions</h3><div class="cos-grid">${CATALOG.effects.map(item => renderCatalogCard('effects', item, 'collection')).join('')}</div></div>`;
  }

  function findCatalog(category, id) { return CATALOG[category].find(item => item.id === id) || CATALOG[category][0]; }
  function isUnlocked(category, id) { return profile.unlocked[category].includes(id); }

  function buyItem(category, id) {
    if (!category || !id) return; const item = findCatalog(category, id); if (isUnlocked(category, id)) { equipItem(category, id); return; }
    if (profile.coins < item.price) { showToast('Pas assez de PulseCoins pour cet élément.'); vibrate(20); return; }
    profile.coins -= item.price; profile.unlocked[category].push(id); saveProfile(); renderShop(); renderCollection(); renderHome(); animateShopItem('data-item', id); showToast(`${item.name} débloqué !`); playSfx('unlock'); vibrate(22); refreshPreview();
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

  function buildPackRewards(pack) {
    const rewards = Object.entries(pack.contents).flatMap(([id, amount]) => Array.from({ length: amount }, () => id));
    for (let index = rewards.length - 1; index > 0; index--) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [rewards[index], rewards[swapIndex]] = [rewards[swapIndex], rewards[index]];
    }
    return rewards;
  }

  function buyPack(id) {
    const pack = CATALOG.packs.find(item => item.id === id);
    if (!pack || state.packOpening) return;
    if (profile.coins < pack.price) {
      showToast('Pas assez de PulseCoins pour ce pack.');
      vibrate(20);
      return;
    }
    const rewards = buildPackRewards(pack);
    profile.coins -= pack.price;
    rewards.forEach(boosterId => { profile.inventory[boosterId] = (profile.inventory[boosterId] || 0) + 1; });
    saveProfile(); renderShop(); renderHome(); renderBoosters(); animateShopItem('data-pack-id', id);
    openPackOpening(pack, rewards);
  }

  /* ===== Ouverture de pack : cinématique plein écran ===== */
  const PACK_RARITY = {
    common: { key: 'common', label: 'COMMUN', rank: 0 },
    rare: { key: 'rare', label: 'RARE', rank: 1 },
    epic: { key: 'epic', label: 'ÉPIQUE', rank: 2 }
  };
  const BOOSTER_RARITY = { scanner: 'common', hammer: 'common', reroll: 'rare', 'pulse-core': 'epic', 'line-breaker': 'epic' };
  const packRarityOf = id => PACK_RARITY[BOOSTER_RARITY[id] || 'common'];
  let packTimers = [];
  const packLater = (callback, delay) => { const id = setTimeout(callback, delay); packTimers.push(id); return id; };
  const clearPackTimers = () => { packTimers.forEach(clearTimeout); packTimers = []; };

  function packSound(kind) {
    if (kind === 'charge') playTone(140, 1.1, { type: 'sawtooth', gain: .022, to: 720 });
    else if (kind === 'burst') {
      playTone(120, .42, { type: 'square', gain: .05, to: 40 });
      [523, 784, 1047].forEach((frequency, i) => packLater(() => playTone(frequency, .22, { type: 'sine', gain: .04 }), 90 + i * 80));
    }
    else if (kind === 'whoosh') playTone(280, .22, { type: 'triangle', gain: .022, to: 900 });
    else if (kind === 'common') playSfx('booster');
    else if (kind === 'rare') playSfx('unlock');
    else if (kind === 'epic') {
      playTone(100, .35, { type: 'square', gain: .045, to: 45 });
      [523, 659, 784, 1047, 1319].forEach((frequency, i) => packLater(() => playTone(frequency, .2, { type: 'sine', gain: .04 }), 60 + i * 75));
    }
  }

  function spawnPackParticles(container, count, tone, inward = false) {
    if (!container) return;
    const layer = document.createElement('span');
    layer.className = `pc-particles${tone === 'blue' ? ' blue' : ''}${inward ? ' inward' : ''}`;
    let html = '';
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * 360 + Math.random() * 12;
      const distance = 90 + Math.random() * 140;
      const size = 4 + Math.random() * 7;
      const time = .7 + Math.random() * .55;
      html += `<i style="--a:${angle.toFixed(1)}deg;--d:${distance.toFixed(0)}px;--s:${size.toFixed(1)}px;--t:${time.toFixed(2)}s"></i>`;
    }
    layer.innerHTML = html;
    container.appendChild(layer);
    packLater(() => layer.remove(), 1500);
  }

  function openPackOpening(pack, rewards) {
    closePackCinema(true);
    state.packOpening = true;
    // Les meilleurs bonus sortent en dernier, pour le suspense.
    const ordered = rewards.map((id, order) => ({ id, order }))
      .sort((a, b) => packRarityOf(a.id).rank - packRarityOf(b.id).rank || a.order - b.order)
      .map(item => item.id);
    const total = ordered.length;
    const face = `<div class="pc-face"><span class="pc-face-icon">${pack.icon}</span><b>${pack.badge || 'PACK'}</b><em>PULSE GRID</em><i class="pc-shine"></i></div>`;
    const root = document.createElement('div');
    root.id = 'pack-cinema';
    root.className = 'pc';
    root.dataset.phase = 'sealed';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', `Ouverture : ${pack.name}`);
    root.innerHTML = `
      <div class="pc-bg"><i class="pc-rays"></i><i class="pc-vignette"></i></div>
      <div class="pc-ambient">${Array.from({ length: 16 }, (_, i) => `<i style="left:${(i * 37 + 7) % 100}%;--s:${3 + (i * 5) % 6}px;--t:${5 + (i * 7) % 6}s;--dl:-${(i * 13) % 9}s"></i>`).join('')}</div>
      <button class="pc-skip" type="button">PASSER ›</button>
      <div class="pc-top"><span class="pc-kicker">${pack.name}</span><div class="pc-dots">${ordered.map(() => '<i></i>').join('')}</div></div>
      <div class="pc-stage">
        <div class="pc-pack">
          <i class="pc-glow"></i><i class="pc-wave"></i><i class="pc-wave w2"></i><i class="pc-ring"></i><i class="pc-ring r2"></i><i class="pc-ring r3"></i>
          <div class="pc-orbit"><i></i><i></i><i></i></div><div class="pc-orbit o2"><i></i><i></i></div>
          <div class="pc-sway"><div class="pc-box">
            <div class="pc-half top">${face}</div>
            <div class="pc-half bottom">${face}</div>
            <i class="pc-seam"></i><i class="pc-beam"></i>
          </div></div>
        </div>
        <div class="pc-card-slot"></div>
        <i class="pc-shock"></i>
        <i class="pc-flash"></i>
      </div>
      <div class="pc-hint on">TOUCHE POUR OUVRIR</div>
      <div class="pc-summary"></div>`;
    ($('#app') || document.body).appendChild(root);

    const stage = root.querySelector('.pc-stage');
    const slot = root.querySelector('.pc-card-slot');
    const hint = root.querySelector('.pc-hint');
    const flash = root.querySelector('.pc-flash');
    const summary = root.querySelector('.pc-summary');
    const dots = [...root.querySelectorAll('.pc-dots i')];
    const openedAt = Date.now();
    let current = 0;
    let cardState = 'locked';
    let currentCard = null;

    const setHint = text => { if (text) hint.textContent = text; hint.classList.toggle('on', !!text); };
    const updateDots = () => dots.forEach((dot, index) => {
      dot.classList.toggle('on', index < current);
      dot.classList.toggle('cur', index === current);
    });
    const fireFlash = () => { flash.classList.remove('go'); void flash.offsetWidth; flash.classList.add('go'); };
    const shakeStage = () => {
      stage.classList.remove('shake'); void stage.offsetWidth; stage.classList.add('shake');
      packLater(() => stage.classList.remove('shake'), 540);
    };

    function startOpening() {
      root.dataset.phase = 'opening';
      setHint('');
      root.classList.add('is-charging');
      packSound('charge');
      vibrate([10, 50, 14, 50, 20, 50, 28, 50, 36]);
      [0, 380, 760].forEach(delay => packLater(() => spawnPackParticles(stage, 14, 'gold', true), delay));
      packLater(() => {
        root.classList.add('is-burst');
        packSound('burst');
        vibrate([40, 20, 80]);
        spawnPackParticles(stage, 30, 'gold');
      }, 1150);
      packLater(() => showCard(0), 1500);
    }

    function showCard(index) {
      const id = ordered[index];
      const booster = CATALOG.boosters.find(item => item.id === id);
      if (!booster) { showSummary(); return; }
      const rarity = packRarityOf(id);
      root.removeAttribute('data-rarity');
      root.dataset.phase = 'card';
      current = index;
      cardState = 'busy';
      slot.insertAdjacentHTML('beforeend', `<div class="pc-card rar-${rarity.key} ${index === 0 ? 'enter-first' : 'enter'}"><i class="pc-aura"></i><div class="pc-float"><div class="pc-tilt"><div class="pc-card-inner">
        <div class="pc-back"><span>✦</span><small>BONUS ${index + 1} / ${total}</small></div>
        <div class="pc-front"><i class="pc-foil"></i><span class="pc-rarity">${rarity.label}</span><div class="pc-icon-wrap"><span class="pc-icon">${booster.icon}</span></div><strong>${booster.name}</strong><small class="pc-tag">${booster.tag}</small><p>${booster.description}</p><b class="pc-plus">+1</b></div>
      </div></div></div></div>`);
      currentCard = slot.lastElementChild;
      updateDots();
      setHint('');
      packSound('whoosh');
      vibrate(8);
      packLater(() => { cardState = 'back'; setHint('TOUCHE POUR RÉVÉLER'); }, 480);
    }

    function flipCard() {
      const rarity = packRarityOf(ordered[current]);
      cardState = 'busy';
      setHint('');
      currentCard.classList.add('flipped');
      playSfx('select');
      packLater(() => {
        root.dataset.rarity = rarity.key;
        currentCard.classList.add('revealed');
        packSound(rarity.key);
        if (rarity.key === 'epic') { spawnPackParticles(stage, 34, 'gold'); fireFlash(); shakeStage(); vibrate([24, 16, 46, 16, 70]); }
        else if (rarity.key === 'rare') { spawnPackParticles(stage, 16, 'blue'); fireFlash(); vibrate([16, 10, 30]); }
        else { spawnPackParticles(stage, 8, 'blue'); vibrate(14); }
      }, 320);
      packLater(() => {
        cardState = 'front';
        setHint(current >= total - 1 ? 'TOUCHE POUR VOIR TON BUTIN' : 'TOUCHE POUR CONTINUER');
      }, 820);
    }

    function nextCard() {
      cardState = 'busy';
      setHint('');
      const old = currentCard;
      resetTilt();
      old.classList.remove('enter', 'enter-first');
      old.classList.add('leave');
      packLater(() => old.remove(), 340);
      if (current >= total - 1) packLater(showSummary, 300);
      else packLater(() => showCard(current + 1), 140);
    }

    function showSummary() {
      clearPackTimers();
      cardState = 'locked';
      root.removeAttribute('data-rarity');
      const counts = new Map();
      ordered.forEach(id => counts.set(id, (counts.get(id) || 0) + 1));
      const entries = [...counts.entries()].sort((a, b) => packRarityOf(b[0]).rank - packRarityOf(a[0]).rank);
      const tiles = entries.map(([id, count], index) => {
        const booster = CATALOG.boosters.find(item => item.id === id);
        const rarity = packRarityOf(id);
        return `<div class="pc-tile rar-${rarity.key}" style="--d:${120 + index * 90}ms"><b class="t-count">×${count}</b><span class="t-icon">${booster.icon}</span><strong>${booster.name}</strong><small>${rarity.label}</small></div>`;
      }).join('');
      summary.innerHTML = `<span class="pc-sum-kicker">BUTIN DU PACK</span><h2>${pack.name}</h2><div class="pc-sum-grid">${tiles}</div><p class="pc-sum-total">${total} bonus ajoutés à ton inventaire</p><button class="pc-done" type="button">TERMINER</button>`;
      summary.scrollTop = 0;
      root.dataset.phase = 'summary';
      summary.querySelector('.pc-done').addEventListener('click', finishPackOpening);
      playSfx('unlock');
      vibrate([14, 8, 26]);
    }

    let tiltFrame = 0;
    let tiltX = 0;
    let tiltY = 0;
    function resetTilt() {
      const el = currentCard && currentCard.querySelector('.pc-tilt');
      if (el) { el.classList.remove('live'); el.style.transform = ''; }
    }
    function applyTilt() {
      tiltFrame = 0;
      const el = currentCard && currentCard.querySelector('.pc-tilt');
      if (!el || root.dataset.phase !== 'card') return;
      const rect = stage.getBoundingClientRect();
      const nx = clamp((tiltX - (rect.left + rect.width / 2)) / (rect.width / 2), -1, 1);
      const ny = clamp((tiltY - (rect.top + rect.height / 2)) / (rect.height / 2), -1, 1);
      el.classList.add('live');
      el.style.transform = `rotateY(${(nx * 18).toFixed(1)}deg) rotateX(${(-ny * 18).toFixed(1)}deg)`;
    }
    const onTilt = event => { tiltX = event.clientX; tiltY = event.clientY; if (!tiltFrame) tiltFrame = scheduleFrame(applyTilt); };
    root.addEventListener('pointerdown', onTilt);
    root.addEventListener('pointermove', onTilt);
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(name => root.addEventListener(name, resetTilt));

    root.addEventListener('click', event => {
      if (event.target.closest('button') || Date.now() - openedAt < 350) return;
      const phase = root.dataset.phase;
      if (phase === 'sealed') startOpening();
      else if (phase === 'card' && cardState === 'back') flipCard();
      else if (phase === 'card' && cardState === 'front') nextCard();
    });
    root.querySelector('.pc-skip').addEventListener('click', event => { event.stopPropagation(); showSummary(); });

    playSfx('purchase');
    vibrate([18, 12, 30]);
  }

  function closePackCinema(immediate = false) {
    clearPackTimers();
    const root = $('#pack-cinema');
    if (root) {
      if (immediate) root.remove();
      else { root.classList.add('closing'); setTimeout(() => root.remove(), 260); }
    }
    state.packOpening = false;
  }

  function finishPackOpening() {
    if (!state.packOpening) return;
    closePackCinema();
  }

  function equipItem(category, id) {
    if (!category || !id || !isUnlocked(category, id)) return;
    const key = category.slice(0, -1); profile.equipped[key] = id; applyTheme(); refreshGameVisuals(); saveProfile(); renderShop(); renderCollection(); refreshPreview(); animateShopItem('data-item', id, 'equip-pop'); showToast(`${findCatalog(category, id).name} équipé`); playSfx('unlock');
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

  function giveHint(options = {}) {
    if (!state.gameActive || state.resolving) return false;
    const piece = state.queue.find(item => item && canAnyPlace(item));
    if (!piece) { showToast('Aucun fragment ne peut être posé.'); return false; }
    let best = null; let bestValue = -Infinity;
    for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID; c++) if (canPlace(piece, r, c)) {
      let value = 0; piece.cells.forEach(([dr, dc]) => { const rr = r + dr; const cc = c + dc; if (rr === 0 || rr === GRID - 1) value += .5; if (cc === 0 || cc === GRID - 1) value += .5; });
      const nearFull = [...Array(GRID)].map((_, i) => state.board[r + i]?.filter(Boolean).length || 0).reduce((a, b) => a + b, 0); value += nearFull * .01;
      if (value > bestValue) { bestValue = value; best = { r, c }; }
    }
    const index = state.queue.indexOf(piece);
    selectPiece(index);
    showPreview(piece, getPlacementFromTopLeft(piece, best.r, best.c));
    showToast(options.fromScanner ? 'Scanner : position forte révélée.' : 'Indice : cette position garde de l’espace pour la suite.');
    setTimeout(clearPreview, 1100);
    return true;
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

  function openModal(content, variant = '') {
    const modalCard = $('#modal-card');
    modalCard.className = `modal-card${variant ? ` ${variant}` : ''}`;
    modalCard.innerHTML = content;
    $('#modal-backdrop').classList.add('open');
    $('#modal-backdrop').setAttribute('aria-hidden', 'false');
  }

  function closeModal() {
    state.preview = null;
    if (state.packOpeningTimer !== null) clearTimeout(state.packOpeningTimer);
    state.packOpeningTimer = null;
    state.packOpening = false;
    $('#modal-card').className = 'modal-card';
    $('#modal-backdrop').classList.remove('open');
    $('#modal-backdrop').setAttribute('aria-hidden', 'true');
    if (state.gameActive) state.paused = false;
  }

  function triggerClearEffect(cells, pulseBurst = false) {
    const layer = $('#fx-layer'); if (!layer) return;
    const effect = profile.equipped.effect;
    const particleCells = pulseBurst
      ? Array.from({ length: Math.min(36, cells.length * 2) }, (_, index) => cells[index % cells.length])
      : cells.slice(0, 16);
    particleCells.forEach(([r, c], index) => {
      const particle = document.createElement('i');
      const type = pulseBurst ? 'pulse-particle' : effect === 'ring' ? 'ring' : effect === 'confetti' ? 'round' : effect === 'nova' ? 'nova-particle' : effect === 'magnet' ? 'magnet-particle' : '';
      particle.className = `fx-particle ${type}`;
      const x = ((c + .5) / GRID) * 100; const y = ((r + .5) / GRID) * 100;
      particle.style.left = `${x}%`; particle.style.top = `${y}%`; particle.style.setProperty('--dx', `${(Math.random() - .5) * (pulseBurst ? 150 : 95)}px`); particle.style.setProperty('--dy', `${-15 - Math.random() * (pulseBurst ? 110 : 75)}px`); particle.style.animationDelay = `${index * (pulseBurst ? 7 : 12)}ms`; layer.appendChild(particle); setTimeout(() => particle.remove(), pulseBurst ? 1100 : 850);
    });
    if (pulseBurst || effect === 'spark' || effect === 'nova' || effect === 'magnet') layer.animate([{ opacity: .35 }, { opacity: 1 }, { opacity: .35 }], { duration: pulseBurst ? 440 : effect === 'nova' ? 260 : 360, iterations: 2 });
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
