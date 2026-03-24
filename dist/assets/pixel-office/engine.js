/* ============================================================
 *  Pixel Office Engine v3 — Rex AI HQ (Phase 2)
 *  Vanilla JS, no dependencies. Loaded via <script src="...">.
 *  Exposes window.PixelOffice = { init, updateAgent, destroy }
 *
 *  Sprite sheet: 128x192 PNG = 4 cols × 4 rows of 32×48px frames
 *  Row 0: DOWN (front) — col 0-3 walk
 *  Row 1: UP (back)    — col 0-3 walk
 *  Row 2: RIGHT (side) — col 0-3 walk (LEFT = flip)
 *  Row 3: ACTIVITY     — col 0-1 seated work loop, col 2-3 standing activities
 * ============================================================ */
(function () {
  'use strict';

  // ── Constants ──────────────────────────────────────────────
  var TILE = 16, ZOOM = 2, COLS = 24, ROWS = 14;
  var CANVAS_W = COLS * TILE * ZOOM;   // 768
  var CANVAS_H = ROWS * TILE * ZOOM;   // 448
  var T = TILE * ZOOM;                 // 32 — one tile on screen
  var BASE = '/assets/pixel-office/';

  var CHAR_FW = 32, CHAR_FH = 48;  // frame size in sprite sheet
  var CHAR_COLS = 4;
  var CHAR_SCALE = 0.9;            // character render scale (smaller to fit inside furniture)
  var DIR_DOWN = 0, DIR_UP = 1, DIR_RIGHT = 2;
  var DIR_LEFT = 3; // virtual direction, uses RIGHT row + flip
  var ROW_ACTIVITY = 3;
  var WALK_SEQUENCE = [0, 1, 2, 3];
  var WORK_SEQUENCE = [0, 1];
  var STATE_FRAME = {
    idle: 0,
    offline: 0,
    error: 0,
    walk: WALK_SEQUENCE,
    busy: WORK_SEQUENCE,
    activity: [2, 3]
  };

  // Delta-time animation constants
  var MOVE_SPEED = 54;       // pixels per second (at ZOOM=2)
  var WALK_FRAME_DUR = 0.18; // seconds per walk frame
  var WORK_FRAME_DUR = 1.2; // seconds per work frame cycle (slow typing)
  var IDLE_TURN_MIN = 1.5;   // seconds
  var IDLE_TURN_MAX = 4.0;
  var IDLE_DESK_MIN = 3.0;
  var IDLE_DESK_MAX = 8.0;
  var IDLE_ACTIVITY_MIN = 4.0;
  var IDLE_ACTIVITY_MAX = 8.0;

  // ── Tile Map (24×14) ──────────────────────────────────────
  var MAP = [
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
    [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
    [0,2,2,2,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
    [0,2,2,2,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
    [0,2,2,2,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
    [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
    [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
    [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
    [0,3,3,3,3,3,3,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
    [0,3,3,3,3,3,3,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
    [0,3,3,3,3,3,3,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
    [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  ];

  // ── Agents ─────────────────────────────────────────────────
  var AGENTS_CFG = [
    { id:'main',       name:'Samantha', emoji:'🧡', sprite:'char_0.png', hc:11, hr:5,  dir:DIR_DOWN,  tint:null },
    { id:'writer',     name:'Loki',     emoji:'🐍', sprite:'char_1.png', hc:7,  hr:8,  dir:DIR_DOWN,  tint:null },
    { id:'researcher', name:'Vision',   emoji:'👁️', sprite:'char_2.png', hc:12, hr:8,  dir:DIR_DOWN,  tint:null },
    { id:'coder',      name:'Jarvis',   emoji:'⚙️', sprite:'char_3.png', hc:17, hr:8,  dir:DIR_DOWN,  tint:null },
    { id:'designer',   name:'Shuri',    emoji:'🎨', sprite:'char_4.png', hc:9,  hr:11, dir:DIR_DOWN,  tint:null },
    { id:'analyst',    name:'Friday',   emoji:'📊', sprite:'char_5.png', hc:15, hr:11, dir:DIR_DOWN,  tint:null },
  ];

  // ── Furniture layout ───────────────────────────────────────
  var FURNITURE = [
    // Wall decor strip
    { type:'DOUBLE_BOOKSHELF', col:1,  row:1, file:'DOUBLE_BOOKSHELF/DOUBLE_BOOKSHELF.png', w:2, h:2, blocks:false },
    { type:'WHITEBOARD',       col:4,  row:1, file:'WHITEBOARD/WHITEBOARD.png',             w:2, h:2, blocks:false },
    { type:'CLOCK',            col:7,  row:1, file:'CLOCK/CLOCK.png',                       w:1, h:2, blocks:false },
    { type:'LARGE_PAINTING',   col:9,  row:1, file:'LARGE_PAINTING/LARGE_PAINTING.png',     w:2, h:2, blocks:false },
    { type:'SMALL_PAINTING',   col:12, row:1, file:'SMALL_PAINTING/SMALL_PAINTING.png',     w:1, h:2, blocks:false },
    { type:'SMALL_PAINTING_2', col:14, row:1, file:'SMALL_PAINTING_2/SMALL_PAINTING_2.png', w:1, h:2, blocks:false },
    { type:'BOOKSHELF',        col:16, row:1, file:'BOOKSHELF/BOOKSHELF.png',               w:2, h:1, blocks:false },
    { type:'HANGING_PLANT',    col:19, row:1, file:'HANGING_PLANT/HANGING_PLANT.png',       w:1, h:2, blocks:false },
    { type:'BOOKSHELF',        col:20, row:1, file:'BOOKSHELF/BOOKSHELF.png',               w:2, h:1, blocks:false },

    // Lounge / rest area (upper-left)
    { type:'SOFA',             col:1,  row:4, file:'SOFA/SOFA_BACK.png',                    w:2, h:1 },
    { type:'SOFA',             col:1,  row:5, file:'SOFA/SOFA_FRONT.png',                   w:2, h:1 },
    { type:'COFFEE_TABLE',     col:4,  row:4, file:'COFFEE_TABLE/COFFEE_TABLE.png',         w:2, h:2 },
    { type:'COFFEE',           col:4,  row:4, file:'COFFEE/COFFEE.png',                     w:1, h:1, blocks:false },
    { type:'COFFEE',           col:5,  row:4, file:'COFFEE/COFFEE.png',                     w:1, h:1, blocks:false },
    { type:'CUSHIONED_BENCH',  col:3,  row:5, file:'CUSHIONED_BENCH/CUSHIONED_BENCH.png',   w:1, h:1, blocks:true },
    { type:'CUSHIONED_BENCH',  col:4,  row:6, file:'CUSHIONED_BENCH/CUSHIONED_BENCH.png',   w:1, h:1, blocks:true },

    // Samantha command station (top-center)
    { type:'DESK',             col:10, row:3, file:'DESK/DESK_FRONT.png',                   w:3, h:2 },
    { type:'PC',               col:11, row:3, file:'PC/PC_FRONT_ON_1.png',                  w:1, h:2, blocks:false },
    { type:'CUSHIONED_CHAIR',  col:11, row:4, file:'CUSHIONED_CHAIR/CUSHIONED_CHAIR_FRONT.png', w:1, h:1, blocks:false },

    // Workstation row 1: Loki / Vision / Jarvis
    { type:'DESK',             col:6,  row:6, file:'DESK/DESK_FRONT.png',                   w:3, h:2 },
    { type:'PC',               col:7,  row:6, file:'PC/PC_FRONT_ON_1.png',                  w:1, h:2, blocks:false },
    { type:'CUSHIONED_CHAIR',  col:7,  row:7, file:'CUSHIONED_CHAIR/CUSHIONED_CHAIR_FRONT.png', w:1, h:1, blocks:false },

    { type:'DESK',             col:11, row:6, file:'DESK/DESK_FRONT.png',                   w:3, h:2 },
    { type:'PC',               col:12, row:6, file:'PC/PC_FRONT_ON_1.png',                  w:1, h:2, blocks:false },
    { type:'CUSHIONED_CHAIR',  col:12, row:7, file:'CUSHIONED_CHAIR/CUSHIONED_CHAIR_FRONT.png', w:1, h:1, blocks:false },

    { type:'DESK',             col:16, row:6, file:'DESK/DESK_FRONT.png',                   w:3, h:2 },
    { type:'PC',               col:17, row:6, file:'PC/PC_FRONT_ON_1.png',                  w:1, h:2, blocks:false },
    { type:'CUSHIONED_CHAIR',  col:17, row:7, file:'CUSHIONED_CHAIR/CUSHIONED_CHAIR_FRONT.png', w:1, h:1, blocks:false },

    // Workstation row 2: Shuri / Friday
    { type:'DESK',             col:8,  row:9, file:'DESK/DESK_FRONT.png',                   w:3, h:2 },
    { type:'PC',               col:9,  row:9, file:'PC/PC_FRONT_ON_1.png',                  w:1, h:2, blocks:false },
    { type:'CUSHIONED_CHAIR',  col:9,  row:10, file:'CUSHIONED_CHAIR/CUSHIONED_CHAIR_FRONT.png', w:1, h:1, blocks:false },

    { type:'DESK',             col:14, row:9, file:'DESK/DESK_FRONT.png',                   w:3, h:2 },
    { type:'PC',               col:15, row:9, file:'PC/PC_FRONT_ON_1.png',                  w:1, h:2, blocks:false },
    { type:'CUSHIONED_CHAIR',  col:15, row:10, file:'CUSHIONED_CHAIR/CUSHIONED_CHAIR_FRONT.png', w:1, h:1, blocks:false },

    // Entertainment zone (lower-left)
    { type:'SMALL_TABLE',      col:2,  row:9, file:'SMALL_TABLE/SMALL_TABLE_FRONT.png',     w:2, h:2 },
    { type:'WOODEN_CHAIR',     col:1,  row:10, file:'WOODEN_CHAIR/WOODEN_CHAIR_FRONT.png',  w:1, h:2 },
    { type:'WOODEN_CHAIR',     col:4,  row:10, file:'WOODEN_CHAIR/WOODEN_CHAIR_FRONT.png',  w:1, h:2 },

    // Greenery / decor accents
    { type:'LARGE_PLANT',      col:20, row:4, file:'LARGE_PLANT/LARGE_PLANT.png',           w:2, h:3 },
    { type:'PLANT',            col:21, row:8, file:'PLANT/PLANT.png',                       w:1, h:2 },
    { type:'PLANT_2',          col:19, row:10,file:'PLANT_2/PLANT_2.png',                   w:1, h:2 },
    { type:'CACTUS',           col:18, row:11,file:'CACTUS/CACTUS.png',                     w:1, h:2 },
    { type:'POT',              col:20, row:11,file:'POT/POT.png',                           w:1, h:1, blocks:true },
    { type:'BIN',              col:22, row:12,file:'BIN/BIN.png',                           w:1, h:1, blocks:true },
  ];

  // ── State ──────────────────────────────────────────────────
  var ctx, canvas, rafId, agents, images, tick, lastTime;
  var hoveredAgent = null;
  var dayOverlayState = null;
  var socialBubble = null;
  var greetingBubble = null;
  var nextSocialBubbleAt = 0;
  var nextGreetingAt = 0;
  var particles = [];
  var audioCtx = null;
  var entryOverlay = null;
  var bgmCtx = null;
  var bgmPlaying = false;
  var bgmGain = null;
  var bgmMuted = false;
  var bgmLoopTimer = null;

  var SOCIAL_LINES_EN = [
    // Greetings
    'Hey!', 'Gm!', "What's up?", 'Yo!', 'Hi there 👋',
    // Work
    'Ship it!', 'LGTM 👍', 'PR ready?', 'Merge it!', 'On it!',
    'Almost done', 'Quick sync?', 'Blocked?', 'New task!', 'Build time!',
    'Deploying...', 'Tests pass ✅', 'Refactor?', 'Hot fix 🔥', 'Code review?',
    "What's the plan?", 'Standup?', 'Deadline?', 'Deploy today?', 'Tech debt...',
    // Crypto/Alpha
    'Any alpha?', 'Wagmi 🚀', 'Bullish 📈', 'DYOR!', 'NFA but...',
    'Wen moon?', 'Stack sats!', 'On-chain 👀', 'Bearish?', 'Pump it!',
    // Social
    'Coffee? ☕', 'Nice!', 'Hmm...', 'Sick design 🎨', 'Stack overflow 😅',
    'Touch grass?', 'Break time!', 'Lunch?', 'Need help?', 'Great work!',
    'Focus mode', 'In the zone 🎯', 'Pair up?', 'Brainstorm?', 'Whiteboard?',
    // Fun
    'GG 🎮', 'Vibes ✨', '1000x incoming', 'Wen lambo?', 'Stay humble',
    'Pixel perfect!', 'Clean code!', 'Zero bugs!', 'Ship > perfect', '📊'
  ];
  var SOCIAL_LINES_ZH = [
    // 问候
    '嘿！', '早安！', '在忙啥？', 'Yo！', '你好 👋',
    // 工作
    '发布！', '不错 👍', 'PR写完了？', '合进去！', '搞定了！',
    '快好了', '开个会？', '卡住了？', '新任务！', '开干！',
    '部署中...', '测试通过 ✅', '要重构吗？', '紧急修复 🔥', 'Review一下？',
    '计划是啥？', '站会？', '截止日期？', '今天上线？', '技术债...',
    // 加密/Alpha
    '有Alpha吗？', '冲 🚀', '看涨 📈', 'DYOR！', '不构成建议...',
    '啥时候起飞？', '囤币！', '链上数据 👀', '看跌？', '拉盘！',
    // 社交
    '喝杯咖啡 ☕', '不错！', '嗯...', '设计很棒 🎨', '脑子烧了 😅',
    '出去走走？', '休息一下！', '吃饭？', '需要帮忙吗？', '干得漂亮！',
    '专注模式', '在状态 🎯', '结对？', '头脑风暴？', '画白板？',
    // 有趣
    'GG 🎮', '氛围到了 ✨', '千倍在路上', '啥时候买兰博基尼？', '保持谦逊',
    '像素完美！', '代码很干净！', '零Bug！', '先发 > 完美', '📊'
  ];

  var POI_LIST = [
    { col:3,  row:3,  type:'coffee' },
    { col:6,  row:4,  type:'lounge' },
    { col:6,  row:5,  type:'lounge' },
    { col:5,  row:10, type:'game' },
    { col:5,  row:11, type:'game' },
    { col:19, row:4,  type:'plants' },
    { col:22, row:9,  type:'plants' },
    { col:10, row:12, type:'walk' },
    { col:15, row:12, type:'walk' },
    { col:16, row:12, type:'walk' }
  ];

  // ── Image Loader ───────────────────────────────────────────
  function loadImg(src) {
    return new Promise(function (ok, fail) {
      var img = new Image();
      img.onload = function () { ok(img); };
      img.onerror = function () { fail(new Error('Failed: ' + src)); };
      img.src = src;
    });
  }

  function loadAllImages(onProgress) {
    var manifest = {};
    for (var i = 0; i <= 8; i++) manifest['floor_' + i] = BASE + 'floors/floor_' + i + '.png';
    manifest['wall_0'] = BASE + 'walls/wall_0.png';
    for (var c = 0; c < 6; c++) manifest['char_' + c] = BASE + 'characters/char_' + c + '.png';
    var seen = {};
    FURNITURE.forEach(function (f) {
      if (!seen[f.file]) { seen[f.file] = 1; manifest['fur_' + f.file] = BASE + 'furniture/' + f.file; }
    });

    var keys = Object.keys(manifest);
    var total = keys.length, loaded = 0;
    images = {};

    return Promise.all(keys.map(function (k) {
      return loadImg(manifest[k]).then(function (img) {
        images[k] = img;
        loaded++;
        if (onProgress) onProgress(loaded, total);
      });
    }));
  }

  // ── Occupancy + BFS Pathfinding ────────────────────────────
  function isHomeTile(c, r) {
    for (var i = 0; i < AGENTS_CFG.length; i++) {
      if (AGENTS_CFG[i].hc === c && AGENTS_CFG[i].hr === r) return true;
    }
    return false;
  }

  function furnitureBlocksTile(c, r) {
    for (var i = 0; i < FURNITURE.length; i++) {
      var f = FURNITURE[i];
      var blocks = (typeof f.blocks === 'boolean')
        ? f.blocks
        : /DESK|PC|BOOKSHELF|WHITEBOARD|SOFA|COFFEE_TABLE|SMALL_TABLE|PLANT|CACTUS|WOODEN_CHAIR/i.test(f.type);
      if (!blocks) continue;
      if (c >= f.col && c < f.col + (f.w || 1) && r >= f.row && r < f.row + (f.h || 1)) {
        return true;
      }
    }
    return false;
  }

  function agentBlocksTile(c, r, selfId) {
    if (!agents) return false;
    for (var i = 0; i < agents.length; i++) {
      var a = agents[i];
      if (a.id === selfId || a.status === 'offline') continue;
      if ((a.col === c && a.row === r) || (a.targetCol === c && a.targetRow === r)) return true;
    }
    return false;
  }

  function isWalkable(c, r, selfId, allowTarget) {
    if (!(c >= 0 && c < COLS && r >= 0 && r < ROWS) || MAP[r][c] === 0) return false;
    if (!allowTarget && furnitureBlocksTile(c, r)) return false;
    if (!allowTarget && agentBlocksTile(c, r, selfId)) return false;
    return true;
  }

  function bfs(sc, sr, ec, er, selfId) {
    if (sc === ec && sr === er) return [];
    var key = function (c, r) { return c + ',' + r; };
    var visited = {}, queue = [[sc, sr]], prev = {};
    visited[key(sc, sr)] = true;
    var dirs = [[0,-1],[0,1],[-1,0],[1,0]];
    while (queue.length) {
      var cur = queue.shift(), cc = cur[0], cr = cur[1];
      for (var d = 0; d < 4; d++) {
        var nc = cc + dirs[d][0], nr = cr + dirs[d][1];
        var isTarget = (nc === ec && nr === er);
        if (!isWalkable(nc, nr, selfId, isTarget)) continue;
        var nk = key(nc, nr);
        if (visited[nk]) continue;
        visited[nk] = true;
        prev[nk] = [cc, cr];
        if (isTarget) {
          var path = [[ec, er]], p = prev[key(ec, er)];
          while (p) { path.unshift(p); p = prev[key(p[0], p[1])]; }
          return path.slice(1);
        }
        queue.push([nc, nr]);
      }
    }
    return [];
  }

  // ── Utility ────────────────────────────────────────────────
  function randInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function randFloat(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeToward(value, target, step) {
    if (value < target) return Math.min(value + step, target);
    if (value > target) return Math.max(value - step, target);
    return target;
  }

  function getTaskIcon(task) {
    var t = String(task || '').toLowerCase();
    if (/(code|coding|script|deploy|build|fix|bug)/.test(t)) return '⌨️';
    if (/(research|scan|intel|alpha|analysis)/.test(t)) return '🔍';
    if (/(write|draft|content|blog|tweet)/.test(t)) return '✍️';
    if (/(design|image|sprite|pixel)/.test(t)) return '🎨';
    if (/(data|portfolio|finance|snek|sync)/.test(t)) return '📊';
    return '💼';
  }

  function playStartupJingle() {
    try {
      var ctx8 = new (window.AudioContext || window.webkitAudioContext)();
      var notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
      var t = ctx8.currentTime + 0.05;
      notes.forEach(function(freq, i) {
        var osc = ctx8.createOscillator();
        var gain = ctx8.createGain();
        osc.type = 'square';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.06, t + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.15);
        osc.connect(gain);
        gain.connect(ctx8.destination);
        osc.start(t + i * 0.12);
        osc.stop(t + i * 0.12 + 0.15);
      });
    } catch(e) {}
  }

  function playHoverClick() {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (!audioCtx) return;
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.type = 'square';
      osc.frequency.value = 800;
      gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.05);
    } catch (err) {}
  }

  function clearBGMLoopTimer() {
    if (bgmLoopTimer) {
      clearTimeout(bgmLoopTimer);
      bgmLoopTimer = null;
    }
  }

  function setBGMGain(value) {
    if (!bgmCtx || !bgmGain) return;
    try {
      bgmGain.gain.cancelScheduledValues(bgmCtx.currentTime);
      bgmGain.gain.setValueAtTime(Math.max(0.0001, bgmGain.gain.value || 0.0001), bgmCtx.currentTime);
      bgmGain.gain.exponentialRampToValueAtTime(Math.max(0.0001, value), bgmCtx.currentTime + 0.12);
    } catch (err) {
      bgmGain.gain.value = value;
    }
  }

  function startBGM() {
    if (bgmPlaying && !bgmMuted) {
      if (bgmCtx && bgmCtx.state === 'suspended') {
        try { bgmCtx.resume(); } catch (err) {}
      }
      return;
    }
    try {
      if (!bgmCtx) {
        bgmCtx = new (window.AudioContext || window.webkitAudioContext)();
        bgmGain = bgmCtx.createGain();
        bgmGain.gain.value = 0.0001;
        bgmGain.connect(bgmCtx.destination);

        var notes = [262, 330, 392, 523, 392, 330];
        var noteLen = 0.4;
        var loopLen = notes.length * noteLen;

        function scheduleLoop(startTime) {
          if (!bgmCtx || !bgmGain) return;
          for (var i = 0; i < notes.length; i++) {
            var osc = bgmCtx.createOscillator();
            var noteGain = bgmCtx.createGain();
            osc.type = 'triangle';
            osc.frequency.value = notes[i];
            noteGain.gain.setValueAtTime(0.08, startTime + i * noteLen);
            noteGain.gain.exponentialRampToValueAtTime(0.001, startTime + i * noteLen + noteLen * 0.9);
            osc.connect(noteGain);
            noteGain.connect(bgmGain);
            osc.start(startTime + i * noteLen);
            osc.stop(startTime + i * noteLen + noteLen);
          }
          clearBGMLoopTimer();
          bgmLoopTimer = setTimeout(function () {
            if (bgmPlaying && bgmCtx) scheduleLoop(bgmCtx.currentTime + 0.05);
          }, (loopLen - 0.1) * 1000);
        }

        scheduleLoop(bgmCtx.currentTime + 0.1);
      }
      if (bgmCtx.state === 'suspended') {
        try { bgmCtx.resume(); } catch (err2) {}
      }
      bgmMuted = false;
      bgmPlaying = true;
      setBGMGain(0.03);
    } catch(e) {}
  }

  function stopBGM() {
    bgmMuted = true;
    bgmPlaying = false;
    if (bgmGain) setBGMGain(0.0001);
  }

  function toggleBGM() {
    if (!bgmCtx || !bgmPlaying || bgmMuted) startBGM();
    else stopBGM();
  }

  function spawnDust(a) {
    if (particles.length >= 30) return;
    var count = randInt(1, 2);
    for (var i = 0; i < count && particles.length < 30; i++) {
      var life = randFloat(0.3, 0.5);
      particles.push({
        x: a.px + randFloat(-4, 4),
        y: a.py + randFloat(-2, 2),
        vx: randFloat(-8, 8),
        vy: randFloat(-15, -5),
        life: life,
        maxLife: life,
        size: randFloat(1, 2),
        alpha: 1
      });
    }
  }

  function updateParticles(dt) {
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha = clamp(p.life / p.maxLife, 0, 1);
    }
  }

  function drawParticles() {
    if (!particles.length) return;
    ctx.save();
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      ctx.fillStyle = 'rgba(180,170,150,' + (p.alpha * 0.7).toFixed(3) + ')';
      ctx.fillRect(Math.round(p.x), Math.round(p.y), Math.max(1, Math.round(p.size)), Math.max(1, Math.round(p.size)));
    }
    ctx.restore();
  }

  function drawHoverCard(a, drawX, drawY, dw) {
    if (a !== hoveredAgent) return;
    var title = (a.emoji || '🙂') + ' ' + a.name;
    var statusText = 'status: ' + a.status;
    var taskText = a.status === 'busy' && a.task ? a.task : '';
    var lines = [title, statusText];
    if (taskText) lines.push(taskText);
    ctx.save();
    ctx.font = 'bold 11px sans-serif';
    var maxWidth = ctx.measureText(title).width;
    ctx.font = '10px sans-serif';
    maxWidth = Math.max(maxWidth, ctx.measureText(statusText).width);
    if (taskText) maxWidth = Math.max(maxWidth, ctx.measureText(taskText).width);
    var padX = 10, padY = 8, lineH = 14;
    var bw = Math.ceil(maxWidth + padX * 2);
    var bh = padY * 2 + lines.length * lineH - 2;
    var bx = drawX + dw + 10;
    if (bx + bw > CANVAS_W - 8) bx = drawX - bw - 10;
    var by = Math.max(8, drawY - 6);
    if (by + bh > CANVAS_H - 8) by = CANVAS_H - bh - 8;
    var colors = { idle: '#4ade80', busy: '#f59e0b', offline: '#9ca3af', error: '#a78bfa' };
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = 'rgba(10,10,18,0.84)';
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 8);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(title, bx + padX, by + padY);
    ctx.font = '10px sans-serif';
    ctx.fillStyle = colors[a.status] || '#4ade80';
    ctx.fillText(statusText, bx + padX, by + padY + lineH);
    if (taskText) {
      ctx.fillStyle = '#b8bcc8';
      ctx.fillText(taskText, bx + padX, by + padY + lineH * 2);
    }
    ctx.restore();
  }

  // ── Agent class ────────────────────────────────────────────
  function getEntryCol(homeCol) {
    // col 0 and COLS-1 are walls, so use col 1 or COLS-2 as entry points
    return homeCol <= Math.floor((COLS - 1) / 2) ? 1 : COLS - 2;
  }

  function Agent(cfg) {
    this.id = cfg.id; this.name = cfg.name;
    this.emoji = cfg.emoji || '🙂';
    this.spriteKey = 'char_' + AGENTS_CFG.indexOf(cfg);
    this.hc = cfg.hc; this.hr = cfg.hr;
    this.entryCol = getEntryCol(cfg.hc);
    this.entryDelay = AGENTS_CFG.indexOf(cfg) * 0.3;
    this.entryDone = false;
    this.entryStarted = false;
    // Entry from bottom walkway (row 12) at left or right edge
    this.col = this.entryCol; this.row = 12;
    this.px = this.entryCol * T + T / 2; this.py = 12 * T + T / 2;
    this.dir = cfg.dir;
    this.homeDir = cfg.dir;
    this.tint = cfg.tint || null;
    this.status = 'idle'; this.task = '';
    this.path = []; this.moving = false;
    this.targetX = this.px; this.targetY = this.py;
    this.targetCol = this.col; this.targetRow = this.row;
    this.frame = STATE_FRAME.idle;
    this.walkCycleIndex = 0;
    this.animTimer = 0;       // dt-based animation accumulator
    this.workTimer = 0;       // dt-based work animation accumulator
    this.idleTurnTimer = randFloat(IDLE_TURN_MIN, IDLE_TURN_MAX);
    this.idleState = 'AT_DESK';
    this.idleActivityTimer = 0;
    this.idleDeskTimer = randFloat(IDLE_DESK_MIN, IDLE_DESK_MAX);
    this.activityFrame = 0;
    this.activityTimer = 0;
    this.idlePoi = null;
    this.zzzPhase = 0;
    this.errorFlicker = 0;    // for error blink effect
    this.fadeAlpha = (cfg.initialStatus === 'offline') ? 0.35 : 1.0;
    this.fadeTarget = this.fadeAlpha;
    this.walkDustTimer = 0;
    this.greeting = 0;
    this.greetingResumeMoving = false;
    this.greetingResumeTargetX = this.targetX;
    this.greetingResumeTargetY = this.targetY;
    this.celebrateTimer = 0;
    this.matrixEffect = null;
  }

  Agent.prototype.resetIdleBehavior = function () {
    this.idleState = 'AT_DESK';
    this.idleActivityTimer = 0;
    this.idleDeskTimer = randFloat(IDLE_DESK_MIN, IDLE_DESK_MAX);
    this.activityFrame = 0;
    this.activityTimer = 0;
    this.idlePoi = null;
  };

  function isPoiClaimed(poi) {
    // Check if any other agent is heading to or sitting at this POI
    if (!agents) return false;
    for (var i = 0; i < agents.length; i++) {
      var a = agents[i];
      if (a.idleState === 'AT_POI' && a.idlePoi && a.idlePoi.col === poi.col && a.idlePoi.row === poi.row) return true;
      if ((a.idleState === 'WALKING_TO_POI') && a.idlePoi && a.idlePoi.col === poi.col && a.idlePoi.row === poi.row) return true;
    }
    return false;
  }

  Agent.prototype.pickIdlePoi = function () {
    var options = [];
    for (var i = 0; i < POI_LIST.length; i++) {
      var poi = POI_LIST[i];
      if (!isWalkable(poi.col, poi.row, this.id, false)) continue;
      if (isPoiClaimed(poi)) continue; // skip already-claimed POIs
      var path = bfs(this.col, this.row, poi.col, poi.row, this.id);
      if (path.length) options.push({ poi: poi, path: path });
    }
    if (!options.length) return null;
    return options[randInt(0, options.length - 1)];
  };

  Agent.prototype.setStatus = function (s, task) {
    var prevStatus = this.status;
    if (prevStatus === s) { this.task = task || ''; return; }
    this.status = s; this.task = task || '';
    if (prevStatus === 'busy' && s === 'idle') this.celebrateTimer = 0.8;
    if (prevStatus === 'offline' && s !== 'offline') {
      this.fadeAlpha = 0;
      this.startMatrixEffect();
    }
    this.fadeTarget = (s === 'offline') ? 0.35 : 1.0;
    if (s !== 'idle') this.resetIdleBehavior();
    if (s === 'busy') {
      this.path = bfs(this.col, this.row, this.hc, this.hr, this.id);
      if (this.path.length) {
        this.idleState = 'WALKING_HOME';
        this.startMove();
      } else {
        this.dir = DIR_DOWN; // face front at desk
      }
    }
    if (s === 'offline') {
      this.dir = DIR_DOWN;
      this.frame = STATE_FRAME.offline;
    }
  };

  Agent.prototype.startMatrixEffect = function () {
    var img = images[this.spriteKey];
    if (!img) return;
    var tempCanvas = document.createElement('canvas');
    tempCanvas.width = CHAR_FW;
    tempCanvas.height = CHAR_FH;
    var tc = tempCanvas.getContext('2d');
    if (!tc) return;
    tc.clearRect(0, 0, CHAR_FW, CHAR_FH);
    tc.drawImage(img, 0, 0, CHAR_FW, CHAR_FH, 0, 0, CHAR_FW, CHAR_FH);
    var data = tc.getImageData(0, 0, CHAR_FW, CHAR_FH).data;
    var particlesLocal = [];
    var dw = Math.round(CHAR_FW * CHAR_SCALE);
    var dh = Math.round(CHAR_FH * CHAR_SCALE);
    var drawX = this.px - dw / 2;
    var drawY = this.py - dh;
    for (var y = 0; y < CHAR_FH; y += 2) {
      for (var x = 0; x < CHAR_FW; x += 2) {
        var idx = (y * CHAR_FW + x) * 4;
        if (data[idx + 3] > 30) {
          particlesLocal.push({
            x: drawX + (x / CHAR_FW) * dw + randFloat(-80, 80),
            y: drawY + (y / CHAR_FH) * dh + randFloat(-120, -20),
            tx: drawX + (x / CHAR_FW) * dw,
            ty: drawY + (y / CHAR_FH) * dh,
            r: data[idx],
            g: data[idx + 1],
            b: data[idx + 2],
            size: 2
          });
        }
      }
    }
    this.matrixEffect = { particles: particlesLocal, timer: 0, duration: 1.5 };
  };

  Agent.prototype.startMove = function () {
    this.walkDustTimer = 0;
    if (!this.path.length) { this.moving = false; return; }
    var next = this.path.shift();
    var dx = next[0] - this.col, dy = next[1] - this.row;
    this.targetCol = next[0]; this.targetRow = next[1];
    this.targetX = next[0] * T + T / 2; this.targetY = next[1] * T + T / 2;
    this.moving = true;
    this.walkCycleIndex = 0;
    this.frame = STATE_FRAME.walk[this.walkCycleIndex];
    if (dx > 0) this.dir = DIR_RIGHT;
    else if (dx < 0) this.dir = DIR_LEFT;
    else if (dy > 0) this.dir = DIR_DOWN;
    else if (dy < 0) this.dir = DIR_UP;
  };

  Agent.prototype.update = function (dt) {
    this.fadeAlpha = easeToward(this.fadeAlpha, this.fadeTarget, dt);

    if (this.matrixEffect) {
      this.matrixEffect.timer += dt;
      if (this.matrixEffect.timer >= this.matrixEffect.duration) this.matrixEffect = null;
    }

    if (this.celebrateTimer > 0) this.celebrateTimer = Math.max(0, this.celebrateTimer - dt);

    if (!this.entryDone) {
      if (!this.entryStarted) {
        this.entryDelay -= dt;
        this.frame = STATE_FRAME.idle;
        if (this.entryDelay > 0) return;
        this.entryStarted = true;
        this.path = bfs(this.col, this.row, this.hc, this.hr, this.id);
        if (this.path.length) this.startMove();
        else {
          this.col = this.hc; this.row = this.hr;
          this.px = this.hc * T + T / 2; this.py = this.hr * T + T / 2;
          this.targetCol = this.hc; this.targetRow = this.hr;
          this.targetX = this.px; this.targetY = this.py;
          this.entryDone = true;
          this.dir = DIR_DOWN;
        }
      }
      if (!this.entryDone && !this.moving && !this.path.length) {
        this.entryDone = true;
        this.col = this.hc; this.row = this.hr;
        this.px = this.hc * T + T / 2; this.py = this.hr * T + T / 2;
        this.targetCol = this.hc; this.targetRow = this.hr;
        this.targetX = this.px; this.targetY = this.py;
        this.dir = DIR_DOWN;
      }
    }

    if (this.greeting > 0) {
      this.greeting -= dt;
      this.walkDustTimer = 0;
      this.frame = STATE_FRAME.idle;
      if (this.greeting <= 0) {
        this.greeting = 0;
        if (this.greetingResumeMoving) {
          this.greetingResumeMoving = false;
          // Resume: restore target and restart movement
          this.targetX = this.greetingResumeTargetX;
          this.targetY = this.greetingResumeTargetY;
          this.moving = true;
          this.walkCycleIndex = 0;
          this.animTimer = 0;
          // Recalculate direction toward target
          var gdx = this.targetX - this.px, gdy = this.targetY - this.py;
          if (Math.abs(gdx) > Math.abs(gdy)) this.dir = gdx > 0 ? DIR_RIGHT : DIR_LEFT;
          else if (gdy !== 0) this.dir = gdy > 0 ? DIR_DOWN : DIR_UP;
        }
      }
      return;
    }

    // ── OFFLINE: grey, frame 0 facing down, ZZZ ──
    if (this.status === 'offline') {
      this.dir = DIR_DOWN;
      this.frame = STATE_FRAME.error;
      this.zzzPhase += dt * 1.8; // ~0.03 per frame at 60fps
      return;
    }

    // ── ERROR: frame 0 facing down, flicker ──
    if (this.status === 'error') {
      this.dir = DIR_DOWN;
      this.frame = 0;
      this.errorFlicker += dt * 9; // for blink calc in drawAgent
      return;
    }

    // ── MOVING (path active, walking to target) ──
    if (this.moving) {
      var speed = MOVE_SPEED * dt;
      var dx = this.targetX - this.px, dy = this.targetY - this.py;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= speed) {
        this.px = this.targetX; this.py = this.targetY;
        this.col = this.targetCol; this.row = this.targetRow;
        this.moving = false;
        if (this.path.length) {
          this.startMove();
        } else if (!this.entryDone) {
          this.entryDone = true;
          this.dir = DIR_DOWN;
        } else if (this.status === 'idle') {
          if (this.idleState === 'WALKING_TO_POI') {
            this.idleState = 'AT_POI';
            this.idleActivityTimer = randFloat(IDLE_ACTIVITY_MIN, IDLE_ACTIVITY_MAX);
            this.activityFrame = 0;
            this.activityTimer = 0;
            this.dir = DIR_DOWN;
          } else if (this.idleState === 'WALKING_HOME') {
            this.resetIdleBehavior();
            this.dir = DIR_DOWN;
          }
        }
      } else {
        this.px += (dx / dist) * speed;
        this.py += (dy / dist) * speed;
      }
      this.animTimer += dt;
      this.walkDustTimer += dt;
      while (this.walkDustTimer >= 0.3) {
        this.walkDustTimer -= 0.3;
        spawnDust(this);
      }
      while (this.animTimer >= WALK_FRAME_DUR) {
        this.animTimer -= WALK_FRAME_DUR;
        this.walkCycleIndex = (this.walkCycleIndex + 1) % STATE_FRAME.walk.length;
      }
      this.frame = STATE_FRAME.walk[this.walkCycleIndex];
      return;
    }

    // ── BUSY at home desk: typing animation (col 4-5) ──
    if (this.status === 'busy' && this.col === this.hc && this.row === this.hr) {
      this.walkDustTimer = 0;
      this.dir = DIR_DOWN; // face front
      this.workTimer += dt;
      if (this.workTimer >= WORK_FRAME_DUR) {
        this.workTimer -= WORK_FRAME_DUR;
      }
      this.frame = this.workTimer < WORK_FRAME_DUR / 2 ? STATE_FRAME.busy[0] : STATE_FRAME.busy[1];
      return;
    }

    // ── IDLE loop: desk wait → walk to POI → activity → walk home ──
    this.frame = STATE_FRAME.idle;
    if (this.status !== 'idle') {
      this.walkDustTimer = 0;
      this.dir = DIR_DOWN;
      return;
    }

    if (this.idleState === 'AT_POI') {
      this.dir = DIR_DOWN;
      this.idleActivityTimer -= dt;
      this.activityTimer += dt;
      if (this.activityTimer >= WORK_FRAME_DUR) {
        this.activityTimer -= WORK_FRAME_DUR;
        this.activityFrame = (this.activityFrame + 1) % STATE_FRAME.activity.length;
      }
      if (this.idleActivityTimer <= 0) {
        this.path = bfs(this.col, this.row, this.hc, this.hr, this.id);
        this.idlePoi = null;
        if (this.path.length) {
          this.idleState = 'WALKING_HOME';
          this.startMove();
        } else {
          this.resetIdleBehavior();
          this.dir = DIR_DOWN;
        }
      }
      return;
    }

    this.dir = DIR_DOWN;
    this.idleDeskTimer -= dt;
    if (this.idleState === 'AT_DESK' && this.idleDeskTimer <= 0) {
      var nextPoi = this.pickIdlePoi();
      this.idleDeskTimer = randFloat(IDLE_DESK_MIN, IDLE_DESK_MAX);
      if (nextPoi) {
        this.idlePoi = nextPoi.poi;
        this.path = nextPoi.path;
        this.idleState = 'WALKING_TO_POI';
        this.startMove();
      }
    }
  };

  // ── Render helpers ─────────────────────────────────────────
  function drawFloorAndWalls() {
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var v = MAP[r][c], x = c * T, y = r * T;
        if (v === 0) {
          var wi = images['wall_0'];
          if (wi) ctx.drawImage(wi, 0, 0, 16, 16, x, y, T, T);
          else { ctx.fillStyle = '#2d2d3d'; ctx.fillRect(x, y, T, T); }
        } else {
          var floorIndex = (v === 2 ? 7 : (v === 3 ? 4 : 0));
          var fi = images['floor_' + floorIndex];
          if (fi) ctx.drawImage(fi, 0, 0, 16, 16, x, y, T, T);
        }
      }
    }
  }

  function drawPCScreen(f, agent) {
    if (!agent || agent.status !== 'busy' || agent.moving) return;
    var sx = f.col * T + 4;
    var sy = f.row * T + 6;
    var sw = T - 8;
    var sh = T - 12;
    ctx.save();
    ctx.fillStyle = '#0a1628';
    ctx.fillRect(sx, sy, sw, sh);
    var phase = Math.floor(tick * 0.03) % 4;
    ctx.fillStyle = '#4ade80';
    ctx.font = '4px monospace';
    if (phase === 0) {
      for (var line = 0; line < 4; line++) {
        var w = 6 + Math.floor(Math.sin(tick * 0.02 + line) * 4 + 4);
        ctx.fillRect(sx + 2, sy + 2 + line * 4, w, 2);
      }
    } else if (phase === 1) {
      for (var bar = 0; bar < 5; bar++) {
        var bh = 3 + Math.floor(Math.abs(Math.sin(tick * 0.04 + bar * 1.2)) * 8);
        ctx.fillRect(sx + 2 + bar * 4, sy + sh - bh - 2, 3, bh);
      }
    } else if (phase === 2) {
      ctx.fillStyle = '#60a5fa';
      for (var tl = 0; tl < 5; tl++) {
        var tw = 4 + Math.floor(Math.sin(tick * 0.01 + tl) * 3 + 5);
        ctx.fillRect(sx + 2, sy + 2 + tl * 3, tw, 1);
      }
    } else {
      ctx.fillStyle = '#4ade80';
      ctx.fillText('>', sx + 2, sy + 8);
      if (Math.floor(tick * 0.06) % 2 === 0) ctx.fillRect(sx + 8, sy + 4, 4, 6);
    }
    ctx.restore();
  }

  function drawFurniture(f) {
    var img = images['fur_' + f.file]; if (!img) return;
    var dw = f.w * T;
    var dh = (img.height / 16) * T;
    var x = f.col * T;
    var y = (f.row + (f.h || 1)) * T - dh;
    ctx.drawImage(img, x, y, dw, dh);
    if (f.type === 'PC' && agents) {
      var pcAgent = null;
      for (var i = 0; i < agents.length; i++) {
        if (agents[i].hc === f.col) {
          pcAgent = agents[i];
          break;
        }
      }
      drawPCScreen(f, pcAgent);
    }
  }

  function updateDayOverlay(force) {
    var now = Date.now();
    if (!force && dayOverlayState && now - dayOverlayState.updatedAt < 60000) return;

    var parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Singapore',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).formatToParts(new Date(now));
    var hour = 0, minute = 0;
    for (var i = 0; i < parts.length; i++) {
      if (parts[i].type === 'hour') hour = parseInt(parts[i].value, 10) || 0;
      if (parts[i].type === 'minute') minute = parseInt(parts[i].value, 10) || 0;
    }

    var hm = hour + minute / 60;
    var alpha = 0;
    var top = null;
    var bottom = null;

    if (hm >= 6 && hm < 8) {
      var morningT = clamp((hm - 6) / 2, 0, 1);
      alpha = lerp(0.08, 0, morningT);
      top = [255, 200, 100];
      bottom = [255, 225, 170];
    } else if (hm >= 8 && hm < 17) {
      alpha = 0;
    } else if (hm >= 17 && hm < 19) {
      var sunsetT = clamp((hm - 17) / 2, 0, 1);
      alpha = lerp(0.05, 0.25, sunsetT);
      top = [255, 130, 40];
      bottom = [255, 180, 100];
    } else if (hm >= 19 && hm < 22) {
      var duskT = clamp((hm - 19) / 3, 0, 1);
      alpha = lerp(0.25, 0.45, duskT);
      top = [lerp(200, 15, duskT), lerp(120, 20, duskT), lerp(40, 60, duskT)];
      bottom = [lerp(200, 30, duskT), lerp(150, 40, duskT), lerp(80, 90, duskT)];
    } else {
      alpha = 0.50;
      top = [10, 15, 40];
      bottom = [20, 25, 60];
    }

    dayOverlayState = {
      updatedAt: now,
      alpha: alpha,
      top: top,
      bottom: bottom
    };
  }

  function drawDeskGlow(a) {
    if (!a || a.status !== 'busy' || a.moving || a.col !== a.hc || a.row !== a.hr) return;
    var pulse = 0.4 + 0.15 * Math.sin(tick * 0.04);
    var centerX = a.hc * T + T * 1.5;
    var centerY = a.hr * T - T * 0.5;
    var radius = T * 1.2;
    var gradient = ctx.createRadialGradient(centerX, centerY, 2, centerX, centerY, radius);
    ctx.save();
    ctx.globalAlpha = pulse * 0.45;
    gradient.addColorStop(0, 'rgba(200,230,255,0.6)');
    gradient.addColorStop(0.5, 'rgba(100,180,255,0.2)');
    gradient.addColorStop(1, 'rgba(74,158,255,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, radius, T * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawHeadquartersSign() {
    // Fits within wall row (row 0, height = 1 tile = T)
    var x = 8 * T, y = 4;
    var w = 8 * T, h = T - 6;
    ctx.save();
    // Background - dark with gradient
    var bg = ctx.createLinearGradient(x, y, x + w, y);
    bg.addColorStop(0, '#12122a');
    bg.addColorStop(0.5, '#1a1a3a');
    bg.addColorStop(1, '#12122a');
    ctx.fillStyle = bg;
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(x, y + 2, w, h - 2, 6);
    } else {
      ctx.beginPath();
      ctx.rect(x, y + 2, w, h - 2);
    }
    ctx.fill();
    // Purple border + glow
    ctx.strokeStyle = '#8953d1';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.shadowColor = '#8953d1';
    ctx.shadowBlur = 12;
    ctx.stroke();
    ctx.shadowBlur = 0;
    // Main text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('REX AI HQ', x + w / 2, y + h / 2 + 1);
    // Decorative dots on each side
    ctx.fillStyle = '#8953d1';
    ctx.beginPath(); ctx.arc(x + 12, y + h / 2 + 1, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + w - 12, y + h / 2 + 1, 3, 0, Math.PI * 2); ctx.fill();
    // Subtle underline glow
    ctx.strokeStyle = 'rgba(137,83,209,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 20, y + h);
    ctx.lineTo(x + w - 20, y + h);
    ctx.stroke();
    ctx.restore();
  }

  function getSocialLines() {
    var lang = document && document.documentElement ? document.documentElement.lang : '';
    return lang === 'zh' ? SOCIAL_LINES_ZH : SOCIAL_LINES_EN;
  }

  function distancePx(a, b) {
    var dx = a.px - b.px;
    var dy = a.py - b.py;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function triggerGreetingBubble(agent, nowMs) {
    if (nowMs < nextGreetingAt) return;
    var lines = getSocialLines();
    greetingBubble = {
      agentId: agent.id,
      text: lines[randInt(0, lines.length - 1)],
      startsAt: nowMs,
      endsAt: nowMs + 2800,
      fadeMs: 220
    };
    nextGreetingAt = nowMs + 30000;
  }

  function checkGreetingEncounters(nowMs) {
    if (!agents) return;
    for (var i = 0; i < agents.length; i++) {
      for (var j = i + 1; j < agents.length; j++) {
        var a1 = agents[i], a2 = agents[j];
        if (a1.status !== 'idle' || a2.status !== 'idle') continue;
        if (!a1.entryDone || !a2.entryDone) continue;
        if (!a1.moving || !a2.moving) continue;
        if (a1.greeting > 0 || a2.greeting > 0) continue;
        if (distancePx(a1, a2) >= 48) continue;
        a1.greeting = 3.0;
        a2.greeting = 3.0;
        a1.greetingResumeMoving = true;
        a2.greetingResumeMoving = true;
        a1.greetingResumeTargetX = a1.targetX;
        a1.greetingResumeTargetY = a1.targetY;
        a2.greetingResumeTargetX = a2.targetX;
        a2.greetingResumeTargetY = a2.targetY;
        a1.dir = (a2.px > a1.px) ? DIR_RIGHT : DIR_LEFT;
        a2.dir = (a1.px > a2.px) ? DIR_RIGHT : DIR_LEFT;
        a1.moving = false;
        a2.moving = false;
        triggerGreetingBubble(Math.random() < 0.5 ? a1 : a2, nowMs);
      }
    }
  }

  function updateSocialBubble(nowMs) {
    if (greetingBubble && nowMs >= greetingBubble.endsAt) greetingBubble = null;
    if (socialBubble && nowMs >= socialBubble.endsAt) socialBubble = null;
    if (socialBubble || !agents || nowMs < nextSocialBubbleAt) return;

    var idleAgents = [];
    for (var i = 0; i < agents.length; i++) {
      var agent = agents[i];
      if (agent.status === 'idle' && !agent.moving) idleAgents.push(agent);
    }

    if (idleAgents.length < 2) return;

    var nearbyPairs = [];
    for (var a = 0; a < idleAgents.length; a++) {
      for (var b = a + 1; b < idleAgents.length; b++) {
        if (distancePx(idleAgents[a], idleAgents[b]) < T * 3) {
          nearbyPairs.push([idleAgents[a], idleAgents[b]]);
        }
      }
    }

    if (!nearbyPairs.length) {
      nextSocialBubbleAt = nowMs + randInt(2000, 5000);
      return;
    }

    if (Math.random() >= 0.3) {
      nextSocialBubbleAt = nowMs + randInt(8000, 15000);
      return;
    }

    var pair = nearbyPairs[randInt(0, nearbyPairs.length - 1)];
    var speaker = pair[randInt(0, 1)];
    var lines = getSocialLines();
    var duration = randInt(3000, 4500);
    socialBubble = {
      agentId: speaker.id,
      text: lines[randInt(0, lines.length - 1)],
      startsAt: nowMs,
      endsAt: nowMs + duration,
      fadeMs: 280
    };
    nextSocialBubbleAt = socialBubble.endsAt + randInt(10000, 18000);
  }

  function drawRoundRect(x, y, w, h, radius) {
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, radius);
      return;
    }
    var r = Math.min(radius, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
  }

  function drawSocialBubble() {
    if (!agents) return;
    var bubble = greetingBubble || socialBubble;
    if (!bubble) return;
    var speaker = null;
    for (var i = 0; i < agents.length; i++) {
      if (agents[i].id === bubble.agentId) {
        speaker = agents[i];
        break;
      }
    }
    if (!speaker) return;

    var nowMs = Date.now();
    var fadeMs = bubble.fadeMs;
    var opacity = 1;
    if (nowMs < bubble.startsAt + fadeMs) opacity = clamp((nowMs - bubble.startsAt) / fadeMs, 0, 1);
    else if (nowMs > bubble.endsAt - fadeMs) opacity = clamp((bubble.endsAt - nowMs) / fadeMs, 0, 1);

    var dw = Math.round(CHAR_FW * CHAR_SCALE);
    var dh = Math.round(CHAR_FH * CHAR_SCALE);
    var bubbleText = bubble.text;
    var bubbleX = speaker.px + dw * 0.15;
    var bubbleY = speaker.py - dh - 20;

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    var padX = 8;
    var padY = 6;
    var textW = ctx.measureText(bubbleText).width;
    var bubbleW = Math.max(36, textW + padX * 2);
    var bubbleH = 24;
    var bx = clamp(bubbleX - bubbleW / 2, 8, CANVAS_W - bubbleW - 8);
    var by = Math.max(8, bubbleY - bubbleH);
    var tailX = clamp(speaker.px, bx + 10, bx + bubbleW - 10);

    ctx.fillStyle = 'rgba(255,255,255,0.96)';
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 1;
    drawRoundRect(bx, by, bubbleW, bubbleH, 8);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(tailX - 6, by + bubbleH - 1);
    ctx.lineTo(tailX + 2, by + bubbleH - 1);
    ctx.lineTo(tailX - 2, by + bubbleH + 7);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#111';
    ctx.fillText(bubbleText, bx + bubbleW / 2, by + bubbleH / 2 + 1);
    ctx.restore();
  }

  function drawDayOverlay() {
    if (!dayOverlayState || !dayOverlayState.alpha || !dayOverlayState.top) return;
    var top = dayOverlayState.top;
    var bottom = dayOverlayState.bottom || top;
    var gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    gradient.addColorStop(0, 'rgba(' + Math.round(top[0]) + ',' + Math.round(top[1]) + ',' + Math.round(top[2]) + ',' + dayOverlayState.alpha.toFixed(3) + ')');
    gradient.addColorStop(1, 'rgba(' + Math.round(bottom[0]) + ',' + Math.round(bottom[1]) + ',' + Math.round(bottom[2]) + ',0)');
    ctx.save();
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.restore();
  }

  // Offscreen canvas for per-character tint compositing
  var _tintCanvas = null, _tintCtx = null;
  function getTintCanvas(w, h) {
    if (!_tintCanvas) { _tintCanvas = document.createElement('canvas'); _tintCtx = _tintCanvas.getContext('2d'); }
    _tintCanvas.width = w; _tintCanvas.height = h;
    return { cv: _tintCanvas, cx: _tintCtx };
  }

  function drawAgent(a) {
    var img = images[a.spriteKey]; if (!img) return;
    var dw = Math.round(CHAR_FW * CHAR_SCALE), dh = Math.round(CHAR_FH * CHAR_SCALE);
    // Sitting offset: busy at desk, shift down 4px * ZOOM
    var sittingOffset = (a.status === 'busy' && !a.moving && a.col === a.hc && a.row === a.hr) ? 8 * CHAR_SCALE : 0;
    var drawX = a.px - dw / 2;
    var drawY = a.py - dh + sittingOffset;

    if (a.matrixEffect) {
      var progress = clamp(a.matrixEffect.timer / a.matrixEffect.duration, 0, 1);
      var eased = progress * progress;
      var effectParticles = a.matrixEffect.particles;
      ctx.save();
      ctx.globalAlpha = Math.max(0.2, a.fadeAlpha);
      for (var pi = 0; pi < effectParticles.length; pi++) {
        var p = effectParticles[pi];
        var cx = lerp(p.x, p.tx, eased);
        var cy = lerp(p.y, p.ty, eased);
        var r = Math.round(lerp(0, p.r, progress));
        var g = Math.round(lerp(255, p.g, progress));
        var b = Math.round(lerp(0, p.b, progress));
        ctx.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
        ctx.fillRect(Math.round(cx), Math.round(cy), p.size, p.size);
      }
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.globalAlpha = a.fadeAlpha;
    if (a.status === 'error') ctx.globalAlpha = a.fadeAlpha * (0.3 + 0.7 * Math.abs(Math.sin(a.errorFlicker)));

    var isDeskBusy = a.status === 'busy' && !a.moving && a.col === a.hc && a.row === a.hr;
    var isPoiActivity = a.status === 'idle' && a.idleState === 'AT_POI';
    var isCelebrating = a.celebrateTimer > 0 && !a.moving && a.status === 'idle';
    var dirRow = (isDeskBusy || isCelebrating) ? ROW_ACTIVITY : a.dir;
    var flip = false;
    if (isPoiActivity) {
      dirRow = ROW_ACTIVITY;
    } else if (!isDeskBusy && a.dir === DIR_LEFT) {
      dirRow = DIR_RIGHT;
      flip = true;
    }
    var frame = isPoiActivity ? STATE_FRAME.activity[a.activityFrame] : Math.max(0, Math.min(a.frame, CHAR_COLS - 1));
    if (isCelebrating) {
      var celebrateProgress = clamp((0.8 - a.celebrateTimer) / 0.8, 0, 0.999);
      frame = [2, 3, 2][Math.floor(celebrateProgress * 9) % 3];
    }
    var sx = frame * CHAR_FW, sy = dirRow * CHAR_FH;

    // ── Hover outline ──
    if (a === hoveredAgent) {
      // Draw white outline by rendering sprite offset in 4 directions
      ctx.globalAlpha = (ctx.globalAlpha || 1) * 0.8;
      var offsets = [[-1,0],[1,0],[0,-1],[0,1]];
      ctx.globalCompositeOperation = 'source-over';
      // Use a temp canvas for the outline
      var oc = getTintCanvas(dw + 4, dh + 4);
      oc.cx.clearRect(0, 0, dw + 4, dh + 4);
      oc.cx.imageSmoothingEnabled = false;
      for (var oi = 0; oi < offsets.length; oi++) {
        oc.cx.save();
        if (flip) {
          oc.cx.translate(dw + 2, 2);
          oc.cx.scale(-1, 1);
          oc.cx.drawImage(img, sx, sy, CHAR_FW, CHAR_FH, offsets[oi][0], offsets[oi][1], dw, dh);
        } else {
          oc.cx.drawImage(img, sx, sy, CHAR_FW, CHAR_FH, 2 + offsets[oi][0], 2 + offsets[oi][1], dw, dh);
        }
        oc.cx.restore();
      }
      // Recolor to white
      oc.cx.globalCompositeOperation = 'source-atop';
      oc.cx.fillStyle = '#ffffff';
      oc.cx.fillRect(0, 0, dw + 4, dh + 4);
      oc.cx.globalCompositeOperation = 'source-over';
      ctx.drawImage(oc.cv, drawX - 2, drawY - 2);
      // Reset alpha for actual sprite
      if (a.status === 'error') ctx.globalAlpha = a.fadeAlpha * (0.3 + 0.7 * Math.abs(Math.sin(a.errorFlicker)));
      else ctx.globalAlpha = a.fadeAlpha;
    }

    if (a.tint) {
      var tc = getTintCanvas(dw, dh);
      tc.cx.clearRect(0, 0, dw, dh);
      tc.cx.imageSmoothingEnabled = false;
      if (flip) {
        tc.cx.save(); tc.cx.translate(dw, 0); tc.cx.scale(-1, 1);
        tc.cx.drawImage(img, sx, sy, CHAR_FW, CHAR_FH, 0, 0, dw, dh);
        tc.cx.restore();
      } else {
        tc.cx.drawImage(img, sx, sy, CHAR_FW, CHAR_FH, 0, 0, dw, dh);
      }
      tc.cx.globalCompositeOperation = 'source-atop';
      tc.cx.fillStyle = a.tint;
      tc.cx.fillRect(0, 0, dw, dh);
      tc.cx.globalCompositeOperation = 'source-over';
      ctx.drawImage(tc.cv, drawX, drawY);
    } else {
      if (flip) {
        ctx.translate(drawX + dw, drawY); ctx.scale(-1, 1);
        ctx.drawImage(img, sx, sy, CHAR_FW, CHAR_FH, 0, 0, dw, dh);
      } else {
        ctx.drawImage(img, sx, sy, CHAR_FW, CHAR_FH, drawX, drawY, dw, dh);
      }
    }
    ctx.restore();

    // Name label
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    var labelX = drawX + dw / 2, labelY = drawY - 9;
    var colors = { idle: '#4ade80', busy: '#f59e0b', offline: '#555555', error: '#a78bfa' };
    var dotColor = colors[a.status] || '#4ade80';
    var dotR = 4;
    if (a.status === 'busy') dotR = 3 + 2 * Math.abs(Math.sin(tick * 0.08));
    if (a === hoveredAgent) {
      var hoverLabel = (a.emoji || '🙂') + ' ' + a.name;
      ctx.font = 'bold 11px sans-serif';
      var hoverWidth = ctx.measureText(hoverLabel).width;
      ctx.fillStyle = 'rgba(0,0,0,0.62)';
      ctx.fillText(hoverLabel, labelX + 1, labelY + 1);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(hoverLabel, labelX, labelY);
      ctx.fillStyle = dotColor;
      ctx.beginPath();
      ctx.arc(labelX - hoverWidth / 2 - 10, labelY, dotR, 0, Math.PI * 2);
      ctx.fill();
    }
    // Non-hover: show nothing (clean view)
    ctx.restore();

    if (a.status === 'busy' && a.task) drawTaskBubble(a, drawX, drawY, dw);
    // drawHoverCard(a, drawX, drawY, dw); // disabled per Rex
    if (a.status === 'offline') drawZzz(a);
  }

  function drawTaskBubble(a, drawX, drawY, dw) {
    var baseText = a.task.length > 18 ? a.task.slice(0, 18) + '\u2026' : a.task;
    var text = getTaskIcon(a.task) + ' ' + baseText;
    ctx.save();
    ctx.font = '8px sans-serif';
    var tw = ctx.measureText(text).width;
    var pad = 4, bh = 14;
    var bw = tw + pad * 2;
    var bx = drawX + dw / 2 - bw / 2;
    var by = drawY - bh - 6;
    ctx.fillStyle = 'rgba(10,10,30,0.85)';
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 3);
    ctx.fill();
    var bubbleColors = { main:'#ff6b35', writer:'#4a9e4a', researcher:'#4a8ab5', coder:'#7a7a8a', designer:'#c54ab5', analyst:'#4ac5c5' };
    ctx.strokeStyle = (bubbleColors[a.id] || '#8953d1') + 'aa';
    ctx.lineWidth = 0.75;
    ctx.stroke();
    ctx.fillStyle = 'rgba(10,10,30,0.85)';
    var cx = bx + bw / 2;
    ctx.beginPath();
    ctx.moveTo(cx - 3, by + bh);
    ctx.lineTo(cx + 3, by + bh);
    ctx.lineTo(cx, by + bh + 4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.textAlign = 'center';
    ctx.fillText(text, bx + bw / 2, by + bh - 3);
    ctx.restore();
  }

  function drawZzz(a) {
    ctx.save();
    ctx.font = 'bold 13px monospace';
    ctx.fillStyle = '#8888cc';
    var bx = a.px + T + 4;
    for (var i = 0; i < 3; i++) {
      var phase = a.zzzPhase + i * 0.7;
      var ox = Math.sin(phase * 2) * 4;
      var oy = -i * 14 - Math.sin(phase) * 6;
      var alpha = 0.4 + 0.6 * Math.abs(Math.sin(phase));
      ctx.globalAlpha = alpha;
      ctx.fillText('z', bx + ox, a.py - Math.round(CHAR_FH * CHAR_SCALE) + oy);
    }
    ctx.restore();
  }

  // ── Loading screen ─────────────────────────────────────────
  function drawLoading(loaded, total) {
    if (!ctx) return;
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    var bw = 300, bh = 20, bx = (CANVAS_W - bw) / 2, by = CANVAS_H / 2;
    ctx.strokeStyle = '#4ade80'; ctx.lineWidth = 2;
    ctx.strokeRect(bx, by, bw, bh);
    ctx.fillStyle = '#4ade80';
    ctx.fillRect(bx + 2, by + 2, (bw - 4) * (loaded / total), bh - 4);
    ctx.fillStyle = '#fff'; ctx.font = '14px monospace'; ctx.textAlign = 'center';
    ctx.fillText('Loading Rex AI HQ... ' + loaded + '/' + total, CANVAS_W / 2, by - 12);
  }

  // ── Mouse hover tracking ──────────────────────────────────
  function getCanvasPoint(e) {
    var rect = canvas.getBoundingClientRect();
    var scaleX = CANVAS_W / rect.width, scaleY = CANVAS_H / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  function getAgentFromCanvasPoint(mx, my) {
    if (!agents) return null;
    for (var i = agents.length - 1; i >= 0; i--) {
      var a = agents[i];
      var dw = Math.round(CHAR_FW * CHAR_SCALE), dh = Math.round(CHAR_FH * CHAR_SCALE);
      var ax = a.px - dw / 2, ay = a.py - dh;
      if (mx >= ax && mx <= ax + dw && my >= ay && my <= ay + dh + 14) return a;
    }
    return null;
  }

  function onMouseMove(e) {
    if (!agents || !canvas) { hoveredAgent = null; return; }
    var prevHovered = hoveredAgent;
    var point = getCanvasPoint(e);
    hoveredAgent = getAgentFromCanvasPoint(point.x, point.y);
    if (hoveredAgent && hoveredAgent !== prevHovered) playHoverClick();
    canvas.style.cursor = hoveredAgent ? 'pointer' : 'default';
  }

  function onCanvasClick(e) {
    if (!canvas) return;
    var point = getCanvasPoint(e);
    var clickedAgent = getAgentFromCanvasPoint(point.x, point.y);
    if (!clickedAgent) toggleBGM();
  }

  // ── Main loop (delta-time driven) ──────────────────────────
  function drawBGMIcon() {
    if (!ctx) return;
    var x = CANVAS_W - 18;
    var y = CANVAS_H - 18;
    var color = bgmPlaying && !bgmMuted ? '#4ade80' : '#6b7280';
    ctx.save();
    ctx.fillStyle = 'rgba(10,10,18,0.55)';
    ctx.fillRect(x - 4, y - 4, 16, 16);
    ctx.fillStyle = color;
    ctx.fillRect(x + 1, y + 5, 2, 6);
    ctx.fillRect(x + 3, y + 3, 3, 2);
    ctx.fillRect(x + 5, y + 1, 2, 2);
    ctx.fillRect(x + 6, y + 1, 1, 8);
    ctx.beginPath();
    ctx.arc(x + 4, y + 12, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 9, y + 9, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function gameLoop(timestamp) {
    var dt = lastTime ? Math.min((timestamp - lastTime) / 1000, 0.1) : 0;
    var nowMs = Date.now();
    lastTime = timestamp;
    tick++;

    updateDayOverlay(false);
    updateSocialBubble(nowMs);
    checkGreetingEncounters(nowMs);

    // Update agents with delta-time
    agents.forEach(function (a) { a.update(dt); });
    updateParticles(dt);

    // Render
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.imageSmoothingEnabled = false;
    drawFloorAndWalls();
    drawParticles();

    // ── Z-Sort: unified furniture + agents, sorted by bottom Y ──
    var drawables = [];

    // Furniture sorted by footprint bottom edge
    var furSorted = FURNITURE.slice().sort(function (a, b) {
      return (a.row + (a.h || 1)) - (b.row + (b.h || 1));
    });
    furSorted.forEach(function (f) {
      drawables.push({
        y: (f.row + (f.h || 1)) * T,
        draw: function () { drawFurniture(f); }
      });
    });

    // Busy desk screen glows between furniture and agents
    agents.forEach(function (a) {
      if (a.status === 'busy' && !a.moving && a.col === a.hc && a.row === a.hr) {
        drawables.push({
          y: a.hr * T + T * 0.5,
          draw: function () { drawDeskGlow(a); }
        });
      }
    });

    // Agents
    agents.forEach(function (a) {
      drawables.push({
        y: a.py, // character foot position
        draw: function () { drawAgent(a); }
      });
    });

    // Sort by Y ascending (further back drawn first)
    drawables.sort(function (a, b) { return a.y - b.y; });
    drawables.forEach(function (d) { d.draw(); });

    drawSocialBubble();
    drawHeadquartersSign();
    drawDayOverlay();
    drawBGMIcon();
    if (entryOverlay && !entryOverlay.done) {
      entryOverlay.alpha -= dt / 0.8;
      if (entryOverlay.alpha <= 0) { entryOverlay.alpha = 0; entryOverlay.done = true; }
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,' + entryOverlay.alpha + ')';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.restore();
    }

    rafId = requestAnimationFrame(gameLoop);
  }

  // ── Public API ─────────────────────────────────────────────
  window.PixelOffice = {
    init: function (canvasEl) {
      canvas = canvasEl;
      canvas.width = CANVAS_W;
      canvas.height = CANVAS_H;
      canvas.style.imageRendering = 'pixelated';
      ctx = canvas.getContext('2d');
      tick = 0;
      lastTime = 0;
      hoveredAgent = null;
      dayOverlayState = null;
      socialBubble = null;
      greetingBubble = null;
      nextSocialBubbleAt = Date.now() + randInt(4000, 9000);
      nextGreetingAt = 0;
      particles = [];
      audioCtx = null;
      entryOverlay = null;
      bgmCtx = null;
      bgmPlaying = false;
      bgmGain = null;
      bgmMuted = false;
      clearBGMLoopTimer();
      updateDayOverlay(true);

      // Mouse hover listener
      canvas.addEventListener('mousemove', onMouseMove);
      canvas.addEventListener('click', onCanvasClick);

      drawLoading(0, 1);

      loadAllImages(function (loaded, total) {
        drawLoading(loaded, total);
      }).then(function () {
        agents = AGENTS_CFG.map(function (cfg) { return new Agent(cfg); });
        entryOverlay = { alpha: 0.95, done: false };
        setTimeout(function () { playStartupJingle(); }, 100);
        rafId = requestAnimationFrame(gameLoop);
      }).catch(function (err) {
        console.error('[PixelOffice] Asset load failed:', err);
        ctx.fillStyle = '#ff4444'; ctx.font = '16px monospace'; ctx.textAlign = 'center';
        ctx.fillText('Failed to load assets :(', CANVAS_W / 2, CANVAS_H / 2);
      });
    },

    updateAgent: function (agentId, status, currentTask) {
      if (!agents) return;
      var a = agents.find(function (a) { return a.id === agentId; });
      if (a) a.setStatus(status, currentTask);
    },

    destroy: function () {
      if (rafId) cancelAnimationFrame(rafId);
      if (canvas) canvas.removeEventListener('mousemove', onMouseMove);
      if (canvas) canvas.removeEventListener('click', onCanvasClick);
      stopBGM();
      if (bgmCtx) { try { bgmCtx.close(); } catch (err) {} }
      clearBGMLoopTimer();
      rafId = null; agents = null; ctx = null; canvas = null;
      hoveredAgent = null;
      dayOverlayState = null;
      socialBubble = null;
      greetingBubble = null;
      nextSocialBubbleAt = 0;
      nextGreetingAt = 0;
      particles = [];
      audioCtx = null;
      entryOverlay = null;
      bgmCtx = null;
      bgmPlaying = false;
      bgmGain = null;
      bgmMuted = false;
    },

    getAgentAt: function (cx, cy) {
      if (!agents) return null;
      var foundAgent = getAgentFromCanvasPoint(cx, cy);
      return foundAgent ? foundAgent.id : null;
    }
  };
})();
