/* ============================================================
 *  Pixel Office Engine v3 — Rex AI HQ (Phase 2)
 *  Vanilla JS, no dependencies. Loaded via <script src="...">.
 *  Exposes window.PixelOffice = { init, updateAgent, destroy }
 *
 *  Sprite sheet: 224x192 PNG = 7 cols × 4 rows of 32×48px frames
 *  Row 0: DOWN (front) — col 0-3 walk, col 4-5 typing
 *  Row 1: UP (back)    — col 0-3 walk
 *  Row 2: RIGHT (side) — col 0-3 walk (LEFT = flip)
 *  Row 3: WORK poses   — col 0-3 various activities
 * ============================================================ */
(function () {
  'use strict';

  // ── Constants ──────────────────────────────────────────────
  var TILE = 16, ZOOM = 2, COLS = 20, ROWS = 11;
  var CANVAS_W = COLS * TILE * ZOOM;   // 960
  var CANVAS_H = ROWS * TILE * ZOOM;   // 528
  var T = TILE * ZOOM;                 // 48 — one tile on screen
  var BASE = '/assets/pixel-office/';

  var CHAR_FW = 32, CHAR_FH = 48;  // frame size in sprite sheet
  var DIR_DOWN = 0, DIR_UP = 1, DIR_RIGHT = 2;
  var DIR_LEFT = 3; // virtual direction, uses RIGHT row + flip

  // Delta-time animation constants
  var MOVE_SPEED = 54;       // pixels per second (at ZOOM=2)
  var WALK_FRAME_DUR = 0.10; // seconds per walk frame
  var WORK_FRAME_DUR = 0.33; // seconds per work frame cycle
  var IDLE_TURN_MIN = 1.5;   // seconds
  var IDLE_TURN_MAX = 4.0;
  var WANDER_MIN = 2.0;      // seconds
  var WANDER_MAX = 8.0;

  // ── Tile Map (20×11) ──────────────────────────────────────
  var MAP = [
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
    [0,1,2,2,2,1,1,1,2,2,2,1,1,1,1,2,2,2,1,0],
    [0,1,1,2,1,1,1,1,1,2,1,1,1,1,1,1,2,1,1,0],
    [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
    [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
    [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
    [0,1,2,2,2,1,1,1,1,1,1,1,1,1,1,2,2,2,1,0],
    [0,1,1,2,1,1,1,1,2,2,2,1,1,1,1,1,2,1,1,0],
    [0,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  ];

  // ── Agents ─────────────────────────────────────────────────
  var AGENTS_CFG = [
    { id:'main',       name:'Samantha', sprite:'char_0.png', hc:9,  hr:3,  dir:DIR_DOWN,  tint:null },
    { id:'writer',     name:'Loki',     sprite:'char_1.png', hc:3,  hr:3,  dir:DIR_RIGHT, tint:null },
    { id:'researcher', name:'Vision',   sprite:'char_2.png', hc:16, hr:3,  dir:DIR_LEFT,  tint:null },
    { id:'coder',      name:'Jarvis',   sprite:'char_3.png', hc:3,  hr:8,  dir:DIR_RIGHT, tint:null },
    { id:'designer',   name:'Shuri',    sprite:'char_4.png', hc:16, hr:8,  dir:DIR_LEFT,  tint:null },
    { id:'analyst',    name:'Friday',   sprite:'char_5.png', hc:9,  hr:9,  dir:DIR_UP,    tint:null },
  ];

  // ── Furniture layout ───────────────────────────────────────
  // Map: 20×11, walls at row 0/10 col 0/19.  Usable: col 1-18, row 1-9.
  // w = render width in tiles (source px / 16).  h = collision height in tiles.
  // Render height is auto-derived from image: (img.height / 16) * T.
  var FURNITURE = [
    // ── Wall decorations (Row 1) ─────────────────────────────
    { type:'BOOKSHELF',        col:1,  row:1, file:'BOOKSHELF/BOOKSHELF.png',               w:2, h:1 },
    { type:'SMALL_PAINTING',   col:4,  row:1, file:'SMALL_PAINTING/SMALL_PAINTING.png',     w:1, h:1 },
    { type:'WHITEBOARD',       col:6,  row:1, file:'WHITEBOARD/WHITEBOARD.png',             w:2, h:1 },
    { type:'CLOCK',            col:9,  row:1, file:'CLOCK/CLOCK.png',                       w:1, h:1 },
    { type:'LARGE_PAINTING',   col:11, row:1, file:'LARGE_PAINTING/LARGE_PAINTING.png',     w:2, h:1 },
    { type:'HANGING_PLANT',    col:14, row:1, file:'HANGING_PLANT/HANGING_PLANT.png',       w:1, h:1 },
    { type:'SMALL_PAINTING_2', col:16, row:1, file:'SMALL_PAINTING_2/SMALL_PAINTING_2.png', w:1, h:1 },
    { type:'DOUBLE_BOOKSHELF', col:17, row:1, file:'DOUBLE_BOOKSHELF/DOUBLE_BOOKSHELF.png', w:2, h:1 },

    // ── Loki workstation (hc:3, hr:3 — left-upper) ──────────
    { type:'DESK',             col:2,  row:2, file:'DESK/DESK_FRONT.png',                          w:3, h:1 },
    { type:'PC',               col:3,  row:2, file:'PC/PC_FRONT_ON_1.png',                         w:1, h:1 },
    { type:'CUSHIONED_CHAIR',  col:3,  row:3, file:'CUSHIONED_CHAIR/CUSHIONED_CHAIR_FRONT.png',    w:1, h:1 },

    // ── Samantha command center (hc:9, hr:3 — centre-upper) ──
    { type:'DESK',             col:8,  row:2, file:'DESK/DESK_FRONT.png',                          w:3, h:1 },
    { type:'PC',               col:9,  row:2, file:'PC/PC_FRONT_ON_1.png',                         w:1, h:1 },
    { type:'CUSHIONED_CHAIR',  col:9,  row:3, file:'CUSHIONED_CHAIR/CUSHIONED_CHAIR_FRONT.png',    w:1, h:1 },

    // ── Vision workstation (hc:16, hr:3 — right-upper) ──────
    { type:'DESK',             col:15, row:2, file:'DESK/DESK_FRONT.png',                          w:3, h:1 },
    { type:'PC',               col:16, row:2, file:'PC/PC_FRONT_ON_1.png',                         w:1, h:1 },
    { type:'CUSHIONED_CHAIR',  col:16, row:3, file:'CUSHIONED_CHAIR/CUSHIONED_CHAIR_FRONT.png',    w:1, h:1 },

    // ── Rest area (left, row 5) ──────────────────────────────
    { type:'SOFA',             col:1,  row:5, file:'SOFA/SOFA_FRONT.png',                          w:2, h:1 },
    { type:'COFFEE_TABLE',     col:3,  row:5, file:'COFFEE_TABLE/COFFEE_TABLE.png',                w:2, h:1 },
    { type:'COFFEE',           col:5,  row:5, file:'COFFEE/COFFEE.png',                            w:1, h:1 },

    // ── Entertainment / meeting area (centre-right, row 5) ──
    { type:'SMALL_TABLE',      col:12, row:5, file:'SMALL_TABLE/SMALL_TABLE_FRONT.png',            w:2, h:1 },
    { type:'WOODEN_CHAIR',     col:11, row:5, file:'WOODEN_CHAIR/WOODEN_CHAIR_FRONT.png',          w:1, h:1 },
    { type:'WOODEN_CHAIR',     col:14, row:5, file:'WOODEN_CHAIR/WOODEN_CHAIR_FRONT.png',          w:1, h:1 },

    // ── Jarvis workstation (hc:3, hr:8 — left-lower) ────────
    { type:'DESK',             col:2,  row:7, file:'DESK/DESK_FRONT.png',                          w:3, h:1 },
    { type:'PC',               col:3,  row:7, file:'PC/PC_FRONT_ON_1.png',                         w:1, h:1 },
    { type:'CUSHIONED_CHAIR',  col:3,  row:8, file:'CUSHIONED_CHAIR/CUSHIONED_CHAIR_FRONT.png',    w:1, h:1 },

    // ── Friday workstation (hc:9, hr:9 — centre-lower) ──────
    { type:'DESK',             col:8,  row:8, file:'DESK/DESK_FRONT.png',                          w:3, h:1 },
    { type:'PC',               col:9,  row:8, file:'PC/PC_FRONT_ON_1.png',                         w:1, h:1 },
    { type:'CUSHIONED_CHAIR',  col:9,  row:9, file:'CUSHIONED_CHAIR/CUSHIONED_CHAIR_FRONT.png',    w:1, h:1 },

    // ── Shuri workstation (hc:16, hr:8 — right-lower) ───────
    { type:'DESK',             col:15, row:7, file:'DESK/DESK_FRONT.png',                          w:3, h:1 },
    { type:'PC',               col:16, row:7, file:'PC/PC_FRONT_ON_1.png',                         w:1, h:1 },
    { type:'CUSHIONED_CHAIR',  col:16, row:8, file:'CUSHIONED_CHAIR/CUSHIONED_CHAIR_FRONT.png',    w:1, h:1 },

    // ── Plants & small decorations ───────────────────────────
    { type:'POT',              col:1,  row:4, file:'POT/POT.png',                                  w:1, h:1 },
    { type:'PLANT_2',          col:18, row:4, file:'PLANT_2/PLANT_2.png',                          w:1, h:1 },
    { type:'PLANT',            col:1,  row:9, file:'PLANT/PLANT.png',                              w:1, h:1 },
    { type:'LARGE_PLANT',      col:6,  row:9, file:'LARGE_PLANT/LARGE_PLANT.png',                  w:2, h:1 },
    { type:'CACTUS',           col:18, row:9, file:'CACTUS/CACTUS.png',                            w:1, h:1 },
    { type:'BIN',              col:5,  row:3, file:'BIN/BIN.png',                                  w:1, h:1 },
    { type:'BIN',              col:14, row:8, file:'BIN/BIN.png',                                  w:1, h:1 },
  ];

  // ── State ──────────────────────────────────────────────────
  var ctx, canvas, rafId, agents, images, tick, lastTime;
  var hoveredAgent = null;

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
      var blocks = /DESK|PC|BOOKSHELF|DOUBLE_BOOKSHELF|WHITEBOARD|SOFA|COFFEE_TABLE|SMALL_TABLE|PLANT|LARGE_PLANT|PLANT_2|CACTUS|WOODEN_CHAIR|CUSHIONED_CHAIR|CUSHIONED_BENCH|BIN|POT|TABLE_FRONT/i.test(f.type);
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
    this.frame = 0;
    this.animTimer = 0;       // dt-based animation accumulator
    this.workTimer = 0;       // dt-based work animation accumulator
    this.idleTurnTimer = randFloat(IDLE_TURN_MIN, IDLE_TURN_MAX);
    this.wanderTimer = randFloat(WANDER_MIN, WANDER_MAX);
    this.zzzPhase = 0;
    this.errorFlicker = 0;    // for error blink effect
  }

  Agent.prototype.setStatus = function (s, task) {
    if (this.status === s) { this.task = task || ''; return; }
    this.status = s; this.task = task || '';
    if (s === 'busy') {
      this.path = bfs(this.col, this.row, this.hc, this.hr, this.id);
      if (this.path.length) this.startMove();
      else this.dir = DIR_DOWN; // face front at desk
    }
    if (s === 'offline') {
      this.dir = DIR_DOWN;
      this.frame = 0;
    }
  };

  Agent.prototype.startMove = function () {
    if (!this.path.length) { this.moving = false; return; }
    var next = this.path.shift();
    var dx = next[0] - this.col, dy = next[1] - this.row;
    this.targetCol = next[0]; this.targetRow = next[1];
    this.targetX = next[0] * T + T / 2; this.targetY = next[1] * T + T / 2;
    this.moving = true;
    if (dx > 0) this.dir = DIR_RIGHT;
    else if (dx < 0) this.dir = DIR_LEFT;
    else if (dy > 0) this.dir = DIR_DOWN;
    else if (dy < 0) this.dir = DIR_UP;
  };

  Agent.prototype.update = function (dt) {
    // ── OFFLINE: grey, frame 0 facing down, ZZZ ──
    if (this.status === 'offline') {
      this.dir = DIR_DOWN;
      this.frame = 0;
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
        if (this.path.length) this.startMove();
      } else {
        this.px += (dx / dist) * speed;
        this.py += (dy / dist) * speed;
      }
      // Walk cycle: 4 frames [0,1,2,3]
      this.animTimer += dt;
      if (this.animTimer >= WALK_FRAME_DUR) {
        this.animTimer -= WALK_FRAME_DUR;
        this.frame = (this.frame + 1) % 4;
      }
      // Keep frame in walk range
      if (this.frame > 3) this.frame = 0;
      return;
    }

    // ── BUSY at home desk: typing animation (col 4-5) ──
    if (this.status === 'busy' && this.col === this.hc && this.row === this.hr) {
      this.dir = DIR_DOWN; // face front
      this.workTimer += dt;
      if (this.workTimer >= WORK_FRAME_DUR) {
        this.workTimer -= WORK_FRAME_DUR;
      }
      this.frame = 4 + (this.workTimer < WORK_FRAME_DUR / 2 ? 0 : 1);
      return;
    }

    // ── IDLE (standing still) ──
    this.frame = 0; // FIXED frame 0, no breathing animation

    // Occasional direction turn
    this.idleTurnTimer -= dt;
    if (this.idleTurnTimer <= 0) {
      this.idleTurnTimer = randFloat(IDLE_TURN_MIN, IDLE_TURN_MAX);
      if (Math.random() < 0.35) {
        var dirs = [DIR_DOWN, DIR_UP, DIR_LEFT, DIR_RIGHT];
        this.dir = dirs[randInt(0, 3)];
      }
    }

    // Idle wander (only when truly idle, not busy-waiting)
    if (this.status === 'idle') {
      this.wanderTimer -= dt;
      if (this.wanderTimer <= 0) {
        this.wanderTimer = randFloat(WANDER_MIN, WANDER_MAX);
        if (Math.random() < 0.35) return; // sometimes skip
        var choices = [];
        for (var dc = -2; dc <= 2; dc++) {
          for (var dr = -2; dr <= 2; dr++) {
            var nc = this.hc + dc, nr = this.hr + dr;
            if ((Math.abs(dc) + Math.abs(dr)) === 0) continue;
            if (Math.abs(dc) + Math.abs(dr) > 3) continue;
            if (isWalkable(nc, nr, this.id, false)) choices.push([nc, nr]);
          }
        }
        if (choices.length) {
          var t = choices[randInt(0, choices.length - 1)];
          this.path = bfs(this.col, this.row, t[0], t[1], this.id);
          if (this.path.length) this.startMove();
        }
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
          var fi = images['floor_' + (v === 2 ? 2 : 0)];
          if (fi) ctx.drawImage(fi, 0, 0, 16, 16, x, y, T, T);
        }
      }
    }
  }

  function drawFurniture(f) {
    var img = images['fur_' + f.file]; if (!img) return;
    var dw = f.w * T, dh = (img.height / 16) * T;
    var x = f.col * T, y = f.row * T + T - dh;
    ctx.drawImage(img, x, y, dw, dh);
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
    var dw = CHAR_FW * ZOOM, dh = CHAR_FH * ZOOM;
    // Sitting offset: busy at desk, shift down 4px * ZOOM
    var sittingOffset = (a.status === 'busy' && !a.moving && a.col === a.hc && a.row === a.hr) ? 4 * ZOOM : 0;
    var drawX = a.px - dw / 2;
    var drawY = a.py - dh + sittingOffset;

    ctx.save();
    if (a.status === 'offline') ctx.globalAlpha = 0.35;
    if (a.status === 'error') ctx.globalAlpha = 0.3 + 0.7 * Math.abs(Math.sin(a.errorFlicker));

    var dirRow = a.dir;
    var flip = false;
    if (a.dir === DIR_LEFT) { dirRow = DIR_RIGHT; flip = true; }
    var sx = a.frame * CHAR_FW, sy = dirRow * CHAR_FH;

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
      ctx.fillText('z', bx + ox, a.py - CHAR_FH * ZOOM + oy);
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
      var dw = CHAR_FW * ZOOM, dh = CHAR_FH * ZOOM;
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
    lastTime = timestamp;
    tick++;

    // Update agents with delta-time
    agents.forEach(function (a) { a.update(dt); });

    // Render
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.imageSmoothingEnabled = false;
    drawFloorAndWalls();

    // ── Z-Sort: unified furniture + agents, sorted by bottom Y ──
    var drawables = [];

    // Furniture sorted by row
    var furSorted = FURNITURE.slice().sort(function (a, b) { return a.row - b.row; });
    furSorted.forEach(function (f) {
      drawables.push({
        y: f.row * T + T, // bottom edge of tile
        draw: function () { drawFurniture(f); }
      });
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
    },

    getAgentAt: function (cx, cy) {
      if (!agents) return null;
      for (var i = agents.length - 1; i >= 0; i--) {
        var a = agents[i];
        var dw = CHAR_FW * ZOOM, dh = CHAR_FH * ZOOM;
        var ax = a.px - dw / 2, ay = a.py - dh;
        if (cx >= ax && cx <= ax + dw && cy >= ay && cy <= ay + dh + 14) {
          return a.id;
        }
      }
      return null;
    }
  };
})();
