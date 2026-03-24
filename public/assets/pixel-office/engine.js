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
    { id:'main',       name:'Samantha', sprite:'char_0.png', hc:11, hr:5,  dir:DIR_DOWN,  tint:null },
    { id:'writer',     name:'Loki',     sprite:'char_1.png', hc:7,  hr:8,  dir:DIR_DOWN,  tint:null },
    { id:'researcher', name:'Vision',   sprite:'char_2.png', hc:12, hr:8,  dir:DIR_DOWN,  tint:null },
    { id:'coder',      name:'Jarvis',   sprite:'char_3.png', hc:17, hr:8,  dir:DIR_DOWN,  tint:null },
    { id:'designer',   name:'Shuri',    sprite:'char_4.png', hc:9,  hr:11, dir:DIR_DOWN,  tint:null },
    { id:'analyst',    name:'Friday',   sprite:'char_5.png', hc:15, hr:11, dir:DIR_DOWN,  tint:null },
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
    { type:'CUSHIONED_BENCH',  col:3,  row:5, file:'CUSHIONED_BENCH/CUSHIONED_BENCH.png',   w:1, h:1, blocks:false },
    { type:'CUSHIONED_BENCH',  col:4,  row:6, file:'CUSHIONED_BENCH/CUSHIONED_BENCH.png',   w:1, h:1, blocks:false },

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
    { type:'POT',              col:20, row:11,file:'POT/POT.png',                           w:1, h:1, blocks:false },
    { type:'BIN',              col:22, row:12,file:'BIN/BIN.png',                           w:1, h:1, blocks:false },
  ];

  // ── State ──────────────────────────────────────────────────
  var ctx, canvas, rafId, agents, images, tick, lastTime;
  var hoveredAgent = null;
  var dayOverlayState = null;
  var socialBubble = null;
  var nextSocialBubbleAt = 0;

  var SOCIAL_LINES_EN = ['Coffee?', 'Ship it!', 'LGTM 👍', 'Nice!', 'Bug?', 'Review?', "Let's go!", 'Almost done', 'Hmm...', '📊'];
  var SOCIAL_LINES_ZH = ['喝杯咖啡？', '发布！', '不错！', '有Bug？', '帮我review？', '冲！', '快好了', '嗯...', '📊'];

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

  // ── Agent class ────────────────────────────────────────────
  function Agent(cfg) {
    this.id = cfg.id; this.name = cfg.name;
    this.spriteKey = 'char_' + AGENTS_CFG.indexOf(cfg);
    this.hc = cfg.hc; this.hr = cfg.hr;
    this.col = cfg.hc; this.row = cfg.hr;
    this.px = cfg.hc * T + T / 2; this.py = cfg.hr * T + T / 2;
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
  }

  Agent.prototype.resetIdleBehavior = function () {
    this.idleState = 'AT_DESK';
    this.idleActivityTimer = 0;
    this.idleDeskTimer = randFloat(IDLE_DESK_MIN, IDLE_DESK_MAX);
    this.activityFrame = 0;
    this.activityTimer = 0;
    this.idlePoi = null;
  };

  Agent.prototype.pickIdlePoi = function () {
    var options = [];
    for (var i = 0; i < POI_LIST.length; i++) {
      var poi = POI_LIST[i];
      if (!isWalkable(poi.col, poi.row, this.id, false)) continue;
      var path = bfs(this.col, this.row, poi.col, poi.row, this.id);
      if (path.length) options.push({ poi: poi, path: path });
    }
    if (!options.length) return null;
    return options[randInt(0, options.length - 1)];
  };

  Agent.prototype.setStatus = function (s, task) {
    if (this.status === s) { this.task = task || ''; return; }
    this.status = s; this.task = task || '';
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

  Agent.prototype.startMove = function () {
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
      while (this.animTimer >= WALK_FRAME_DUR) {
        this.animTimer -= WALK_FRAME_DUR;
        this.walkCycleIndex = (this.walkCycleIndex + 1) % STATE_FRAME.walk.length;
      }
      this.frame = STATE_FRAME.walk[this.walkCycleIndex];
      return;
    }

    // ── BUSY at home desk: typing animation (col 4-5) ──
    if (this.status === 'busy' && this.col === this.hc && this.row === this.hr) {
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

  function drawFurniture(f) {
    var img = images['fur_' + f.file]; if (!img) return;
    var dw = f.w * T;
    var dh = (img.height / 16) * T;
    var x = f.col * T;
    var y = (f.row + (f.h || 1)) * T - dh;
    ctx.drawImage(img, x, y, dw, dh);
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
      alpha = lerp(0, 0.12, sunsetT);
      top = [255, 150, 50];
      bottom = [255, 200, 120];
    } else if (hm >= 19 && hm < 22) {
      var duskT = clamp((hm - 19) / 3, 0, 1);
      alpha = lerp(0.12, 0.15, duskT);
      top = [lerp(255, 30, duskT), lerp(150, 40, duskT), lerp(50, 80, duskT)];
      bottom = [lerp(255, 70, duskT), lerp(200, 90, duskT), lerp(120, 130, duskT)];
    } else {
      alpha = 0.25;
      top = [15, 20, 50];
      bottom = [30, 40, 80];
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
    var pulse = 0.5 + 0.3 * Math.sin(tick * 0.05);
    var color = a.tint || '#4a9eff';
    var centerX = a.hc * T + T * 1.5;
    var centerY = a.hr * T - T * 0.35;
    var radius = T * 1.5;
    var gradient = ctx.createRadialGradient(centerX, centerY, T * 0.15, centerX, centerY, radius);

    ctx.save();
    ctx.globalAlpha = clamp(pulse, 0, 1);
    ctx.shadowBlur = 16 + pulse * 18;
    ctx.shadowColor = color;
    gradient.addColorStop(0, 'rgba(255,255,255,0.22)');
    gradient.addColorStop(0.35, color);
    gradient.addColorStop(1, 'rgba(74,158,255,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, radius, T * 0.95, 0, 0, Math.PI * 2);
    ctx.fill();
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

  function updateSocialBubble(nowMs) {
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
    var duration = randInt(2000, 3000);
    socialBubble = {
      agentId: speaker.id,
      text: lines[randInt(0, lines.length - 1)],
      startsAt: nowMs,
      endsAt: nowMs + duration,
      fadeMs: 280
    };
    nextSocialBubbleAt = socialBubble.endsAt + randInt(8000, 15000);
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
    if (!socialBubble || !agents) return;
    var speaker = null;
    for (var i = 0; i < agents.length; i++) {
      if (agents[i].id === socialBubble.agentId) {
        speaker = agents[i];
        break;
      }
    }
    if (!speaker) return;

    var nowMs = Date.now();
    var fadeMs = socialBubble.fadeMs;
    var opacity = 1;
    if (nowMs < socialBubble.startsAt + fadeMs) opacity = clamp((nowMs - socialBubble.startsAt) / fadeMs, 0, 1);
    else if (nowMs > socialBubble.endsAt - fadeMs) opacity = clamp((socialBubble.endsAt - nowMs) / fadeMs, 0, 1);

    var dw = Math.round(CHAR_FW * CHAR_SCALE);
    var dh = Math.round(CHAR_FH * CHAR_SCALE);
    var bubbleText = socialBubble.text;
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

    ctx.save();
    if (a.status === 'offline') ctx.globalAlpha = 0.35;
    if (a.status === 'error') ctx.globalAlpha = 0.3 + 0.7 * Math.abs(Math.sin(a.errorFlicker));

    var isDeskBusy = a.status === 'busy' && !a.moving && a.col === a.hc && a.row === a.hr;
    var isPoiActivity = a.status === 'idle' && a.idleState === 'AT_POI';
    var dirRow = isDeskBusy ? ROW_ACTIVITY : a.dir;
    var flip = false;
    if (isPoiActivity) {
      dirRow = ROW_ACTIVITY;
    } else if (!isDeskBusy && a.dir === DIR_LEFT) {
      dirRow = DIR_RIGHT;
      flip = true;
    }
    var frame = isPoiActivity ? STATE_FRAME.activity[a.activityFrame] : Math.max(0, Math.min(a.frame, CHAR_COLS - 1));
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
      if (a.status === 'offline') ctx.globalAlpha = 0.35;
      else if (a.status === 'error') ctx.globalAlpha = 0.3 + 0.7 * Math.abs(Math.sin(a.errorFlicker));
      else ctx.globalAlpha = 1;
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
    ctx.font = 'bold 11px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    var labelX = drawX + dw / 2, labelY = drawY - 8;

    var colors = { idle: '#4ade80', busy: '#f59e0b', offline: '#555555', error: '#a78bfa' };
    var dotColor = colors[a.status] || '#4ade80';
    var dotR = 4;
    if (a.status === 'busy') dotR = 3 + 2 * Math.abs(Math.sin(tick * 0.08));
    ctx.fillStyle = dotColor;
    ctx.beginPath();
    ctx.arc(labelX - ctx.measureText(a.name).width / 2 - 8, labelY - 3, dotR, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillText(a.name, labelX + 1, labelY + 1);
    ctx.fillStyle = '#fff';
    ctx.fillText(a.name, labelX, labelY);
    ctx.restore();

    if (a.status === 'busy' && a.task) drawTaskBubble(a, drawX, drawY, dw);
    if (a.status === 'offline') drawZzz(a);
  }

  function drawTaskBubble(a, drawX, drawY, dw) {
    var text = a.task.length > 18 ? a.task.slice(0, 18) + '\u2026' : a.task;
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
  function onMouseMove(e) {
    if (!agents || !canvas) { hoveredAgent = null; return; }
    var rect = canvas.getBoundingClientRect();
    var scaleX = CANVAS_W / rect.width, scaleY = CANVAS_H / rect.height;
    var mx = (e.clientX - rect.left) * scaleX;
    var my = (e.clientY - rect.top) * scaleY;
    hoveredAgent = null;
    for (var i = agents.length - 1; i >= 0; i--) {
      var a = agents[i];
      var dw = Math.round(CHAR_FW * CHAR_SCALE), dh = Math.round(CHAR_FH * CHAR_SCALE);
      var ax = a.px - dw / 2, ay = a.py - dh;
      if (mx >= ax && mx <= ax + dw && my >= ay && my <= ay + dh + 14) {
        hoveredAgent = a;
        break;
      }
    }
    canvas.style.cursor = hoveredAgent ? 'pointer' : 'default';
  }

  // ── Main loop (delta-time driven) ──────────────────────────
  function gameLoop(timestamp) {
    var dt = lastTime ? Math.min((timestamp - lastTime) / 1000, 0.1) : 0;
    var nowMs = Date.now();
    lastTime = timestamp;
    tick++;

    updateDayOverlay(false);
    updateSocialBubble(nowMs);

    // Update agents with delta-time
    agents.forEach(function (a) { a.update(dt); });

    // Render
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.imageSmoothingEnabled = false;
    drawFloorAndWalls();

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
    drawDayOverlay();

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
      nextSocialBubbleAt = Date.now() + randInt(4000, 9000);
      updateDayOverlay(true);

      // Mouse hover listener
      canvas.addEventListener('mousemove', onMouseMove);

      drawLoading(0, 1);

      loadAllImages(function (loaded, total) {
        drawLoading(loaded, total);
      }).then(function () {
        agents = AGENTS_CFG.map(function (cfg) { return new Agent(cfg); });
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
      rafId = null; agents = null; ctx = null; canvas = null;
      hoveredAgent = null;
      dayOverlayState = null;
      socialBubble = null;
      nextSocialBubbleAt = 0;
    },

    getAgentAt: function (cx, cy) {
      if (!agents) return null;
      for (var i = agents.length - 1; i >= 0; i--) {
        var a = agents[i];
        var dw = Math.round(CHAR_FW * CHAR_SCALE), dh = Math.round(CHAR_FH * CHAR_SCALE);
        var ax = a.px - dw / 2, ay = a.py - dh;
        if (cx >= ax && cx <= ax + dw && cy >= ay && cy <= ay + dh + 14) {
          return a.id;
        }
      }
      return null;
    }
  };
})();
