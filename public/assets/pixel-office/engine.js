/* ============================================================
 *  Pixel Office Engine v2 — Rex AI HQ
 *  Vanilla JS, no dependencies. Loaded via <script src="...">.
 *  Exposes window.PixelOffice = { init, updateAgent, destroy }
 * ============================================================ */
(function () {
  'use strict';

  // ── Constants ──────────────────────────────────────────────
  var TILE = 16, ZOOM = 3, COLS = 20, ROWS = 11;
  var CANVAS_W = COLS * TILE * ZOOM;   // 960
  var CANVAS_H = ROWS * TILE * ZOOM;   // 528
  var T = TILE * ZOOM;                 // 48 — one tile on screen
  var BASE = '/assets/pixel-office/';
  var FPS = 60, FRAME_MS = 1000 / FPS;

  // Sprite sheet: 112x96 PNG = 7 cols × 3 rows of 16×32px frames
  // Row 0=DOWN, Row 1=UP, Row 2=RIGHT (LEFT = flip RIGHT)
  var CHAR_FW = 16, CHAR_FH = 32;  // frame size in sprite sheet
  var DIR_DOWN = 0, DIR_UP = 1, DIR_RIGHT = 2;
  // LEFT has no own row — we flip RIGHT
  var DIR_LEFT = 3; // virtual direction, uses RIGHT row + flip

  // ── Tile Map (20×11) ──────────────────────────────────────
  // 0=wall  1=floor_0  2=floor_2
  var MAP = [
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
    [0,1,1,1,1,2,1,1,1,1,1,1,1,1,2,1,1,1,1,0],
    [0,1,1,1,1,2,1,1,1,1,1,1,1,1,2,1,1,1,1,0],
    [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
    [0,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,0],
    [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
    [0,1,1,1,1,2,1,1,1,1,1,1,1,1,2,1,1,1,1,0],
    [0,1,1,1,1,2,1,1,1,1,1,1,1,1,2,1,1,1,1,0],
    [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  ];

  // ── Agents ─────────────────────────────────────────────────
  var AGENTS_CFG = [
    { id:'main',       name:'Samantha', sprite:'char_0.png', hc:9,  hr:3,  dir:DIR_DOWN,  tint:'rgba(255,107,53,0.25)' },
    { id:'writer',     name:'Loki',     sprite:'char_1.png', hc:3,  hr:3,  dir:DIR_RIGHT, tint:'rgba(74,158,74,0.25)' },
    { id:'researcher', name:'Vision',   sprite:'char_2.png', hc:16, hr:3,  dir:DIR_LEFT,  tint:'rgba(74,138,181,0.25)' },
    { id:'coder',      name:'Jarvis',   sprite:'char_3.png', hc:3,  hr:8,  dir:DIR_RIGHT, tint:'rgba(122,122,138,0.20)' },
    { id:'designer',   name:'Shuri',    sprite:'char_4.png', hc:16, hr:8,  dir:DIR_LEFT,  tint:'rgba(197,74,181,0.25)' },
    { id:'analyst',    name:'Friday',   sprite:'char_5.png', hc:9,  hr:9,  dir:DIR_UP,    tint:'rgba(74,197,197,0.25)' },
  ];

  // ── Furniture layout ───────────────────────────────────────
  var FURNITURE = [
    // Samantha — centre top
    { type:'DESK',  col:8,  row:2, file:'DESK/DESK_FRONT.png',  w:1, h:1 },
    { type:'DESK',  col:9,  row:2, file:'DESK/DESK_FRONT.png',  w:1, h:1 },
    { type:'DESK',  col:10, row:2, file:'DESK/DESK_FRONT.png',  w:1, h:1 },
    { type:'PC',    col:9,  row:2, file:'PC/PC_FRONT_ON_1.png', w:1, h:1 },
    // Loki — left
    { type:'DESK',  col:2,  row:2, file:'DESK/DESK_FRONT.png',  w:1, h:1 },
    { type:'PC',    col:2,  row:2, file:'PC/PC_FRONT_ON_1.png', w:1, h:1 },
    // Vision — right
    { type:'DESK',  col:17, row:2, file:'DESK/DESK_FRONT.png',  w:1, h:1 },
    { type:'PC',    col:17, row:2, file:'PC/PC_FRONT_ON_1.png', w:1, h:1 },
    // Jarvis — bottom-left
    { type:'DESK',  col:2,  row:7, file:'DESK/DESK_FRONT.png',  w:1, h:1 },
    { type:'PC',    col:2,  row:7, file:'PC/PC_FRONT_ON_1.png', w:1, h:1 },
    // Shuri — bottom-right
    { type:'DESK',  col:17, row:7, file:'DESK/DESK_FRONT.png',  w:1, h:1 },
    { type:'PC',    col:17, row:7, file:'PC/PC_FRONT_ON_1.png', w:1, h:1 },
    // Friday — bottom centre
    { type:'DESK',  col:8,  row:8, file:'DESK/DESK_FRONT.png',  w:1, h:1 },
    { type:'DESK',  col:9,  row:8, file:'DESK/DESK_FRONT.png',  w:1, h:1 },
    { type:'PC',    col:9,  row:8, file:'PC/PC_FRONT_ON_1.png', w:1, h:1 },
    // Decorations
    { type:'WHITEBOARD',      col:6,  row:1, file:'WHITEBOARD/WHITEBOARD.png',         w:2, h:1 },
    { type:'BOOKSHELF',       col:1,  row:1, file:'BOOKSHELF/BOOKSHELF.png',           w:1, h:1 },
    { type:'DOUBLE_BOOKSHELF',col:18, row:1, file:'DOUBLE_BOOKSHELF/DOUBLE_BOOKSHELF.png', w:1, h:1 },
    { type:'PLANT',           col:1,  row:5, file:'PLANT/PLANT.png',                   w:1, h:1 },
    { type:'LARGE_PLANT',     col:18, row:5, file:'LARGE_PLANT/LARGE_PLANT.png',       w:1, h:1 },
    { type:'CACTUS',          col:12, row:1, file:'CACTUS/CACTUS.png',                 w:1, h:1 },
    // Coffee corner — bottom-right
    { type:'SOFA',            col:14, row:9, file:'SOFA/SOFA_FRONT.png',               w:1, h:1 },
    { type:'SOFA',            col:15, row:9, file:'SOFA/SOFA_FRONT.png',               w:1, h:1 },
    { type:'COFFEE_TABLE',    col:14, row:8, file:'COFFEE_TABLE/COFFEE_TABLE.png',     w:1, h:1 },
    { type:'COFFEE',          col:15, row:8, file:'COFFEE/COFFEE.png',                 w:1, h:1 },
    // Extra touches
    { type:'CLOCK',           col:10, row:1, file:'CLOCK/CLOCK.png',                   w:1, h:1 },
    { type:'SMALL_TABLE',     col:6,  row:5, file:'SMALL_TABLE/SMALL_TABLE_FRONT.png', w:1, h:1 },
    // Meeting area — center
    { type:'WOODEN_CHAIR', col:7,  row:5, file:'WOODEN_CHAIR/WOODEN_CHAIR_FRONT.png', w:1, h:1 },
    { type:'WOODEN_CHAIR', col:11, row:5, file:'WOODEN_CHAIR/WOODEN_CHAIR_FRONT.png', w:1, h:1 },
  ];

  // ── State ──────────────────────────────────────────────────
  var ctx, canvas, rafId, agents, images, tick;

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
    // floors
    for (var i = 0; i <= 8; i++) manifest['floor_' + i] = BASE + 'floors/floor_' + i + '.png';
    // wall
    manifest['wall_0'] = BASE + 'walls/wall_0.png';
    // characters
    for (var c = 0; c < 6; c++) manifest['char_' + c] = BASE + 'characters/char_' + c + '.png';
    // furniture
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
      var blocks = /DESK|PC|BOOKSHELF|WHITEBOARD|SOFA|COFFEE_TABLE|SMALL_TABLE|PLANT|CACTUS|WOODEN_CHAIR/i.test(f.type);
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

  // ── Agent class ────────────────────────────────────────────
  function Agent(cfg) {
    this.id = cfg.id; this.name = cfg.name;
    this.spriteKey = 'char_' + AGENTS_CFG.indexOf(cfg);
    this.hc = cfg.hc; this.hr = cfg.hr;
    this.col = cfg.hc; this.row = cfg.hr;
    // Pixel Agents anchors characters at the CENTER of the tile, not top-left
    this.px = cfg.hc * T + T / 2; this.py = cfg.hr * T + T / 2;
    this.dir = cfg.dir;
    this.homeDir = cfg.dir;
    this.tint = cfg.tint || null;
    this.status = 'idle'; this.task = '';
    this.path = []; this.moving = false;
    this.targetX = this.px; this.targetY = this.py;
    this.targetCol = this.col; this.targetRow = this.row;
    this.frame = 0; this.animTick = 0;
    this.nextWander = randInt(45, 220); // stagger movement timings for more natural behavior
    this.idleTurnTick = randInt(20, 90);
    this.zzzPhase = 0;
  }

  function randInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }

  Agent.prototype.setStatus = function (s, task) {
    if (this.status === s) { this.task = task || ''; return; }
    this.status = s; this.task = task || '';
    if (s === 'busy') {
      this.path = bfs(this.col, this.row, this.hc, this.hr, this.id);
      if (this.path.length) this.startMove();
      else this.dir = this.homeDir;
    }
  };

  Agent.prototype.startMove = function () {
    if (!this.path.length) { this.moving = false; return; }
    var next = this.path.shift();
    var dx = next[0] - this.col, dy = next[1] - this.row;
    this.targetCol = next[0]; this.targetRow = next[1];
    this.targetX = next[0] * T + T / 2; this.targetY = next[1] * T + T / 2;
    this.moving = true;
    // set direction
    if (dx > 0) this.dir = DIR_RIGHT;
    else if (dx < 0) this.dir = DIR_LEFT;
    else if (dy > 0) this.dir = DIR_DOWN;
    else if (dy < 0) this.dir = DIR_UP;
  };

  Agent.prototype.update = function () {
    this.animTick++;

    if (this.status === 'offline') { this.zzzPhase += 0.03; return; }

    // Smooth movement
    if (this.moving) {
      var speed = 0.9 * ZOOM; // slower, more natural movement
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
      // walk cycle: frames 0,1,2,1 (4步循环)
      var walkSeq = [0, 1, 2, 1];
      this.frame = walkSeq[Math.floor(this.animTick / 6) % 4];
      return;
    }

    if (this.status === 'busy' && this.col === this.hc && this.row === this.hr) {
      // typing frames 3/4, face desk direction
      this.dir = this.homeDir;
      this.frame = 3 + (Math.floor(this.animTick / 15) % 2);
      return;
    }

    // idle: subtle breathing / look-alive animation
    this.frame = (Math.floor(this.animTick / 28) % 2 === 0) ? 0 : 1;

    if (this.status === 'idle') {
      this.idleTurnTick--;
      if (this.idleTurnTick <= 0) {
        this.idleTurnTick = randInt(40, 120);
        if (Math.random() < 0.35) {
          var dirs = [DIR_DOWN, DIR_UP, DIR_LEFT, DIR_RIGHT];
          this.dir = dirs[randInt(0, dirs.length - 1)];
        }
      }

      this.nextWander--;
      if (this.nextWander <= 0) {
        this.nextWander = randInt(60, 260);
        // sometimes just linger/turn instead of always moving, to avoid feeling scripted
        if (Math.random() < 0.35) return;
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
    var x = f.col * T, y = f.row * T + T - dh; // align bottom to tile
    ctx.drawImage(img, x, y, dw, dh);
  }

  function drawAgent(a) {
    var img = images[a.spriteKey]; if (!img) return;
    var dw = CHAR_FW * ZOOM, dh = CHAR_FH * ZOOM; // 48 x 96
    // Pixel Agents anchor: character bottom-center sits on tile center point
    var drawX = a.px - dw / 2, drawY = a.py - dh;

    ctx.save();

    // offline: translucent
    if (a.status === 'offline') ctx.globalAlpha = 0.35;
    // error: flicker
    if (a.status === 'error') ctx.globalAlpha = 0.3 + 0.7 * Math.abs(Math.sin(a.animTick * 0.15));

    // Sprite rows: 0=DOWN, 1=UP, 2=RIGHT. LEFT = flip RIGHT.
    var dirRow = a.dir;
    var flip = false;
    if (a.dir === DIR_LEFT) { dirRow = DIR_RIGHT; flip = true; }

    var sx = a.frame * CHAR_FW, sy = dirRow * CHAR_FH;

    if (flip) {
      ctx.translate(drawX + dw, drawY);
      ctx.scale(-1, 1);
      ctx.drawImage(img, sx, sy, CHAR_FW, CHAR_FH, 0, 0, dw, dh);
      // Color tint overlay (flip coords)
      if (a.tint) {
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = a.tint;
        ctx.fillRect(0, 0, dw, dh);
        ctx.globalCompositeOperation = 'source-over';
      }
    } else {
      ctx.drawImage(img, sx, sy, CHAR_FW, CHAR_FH, drawX, drawY, dw, dh);
      // Color tint overlay
      if (a.tint) {
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = a.tint;
        ctx.fillRect(drawX, drawY, dw, dh);
        ctx.globalCompositeOperation = 'source-over';
      }
    }
    ctx.restore();

    // Name label
    ctx.save();
    ctx.font = 'bold 11px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    var labelX = drawX + dw / 2, labelY = drawY - 6;

    // status dot
    var colors = { idle: '#4ade80', busy: '#f59e0b', offline: '#555555', error: '#a78bfa' };
    var dotColor = colors[a.status] || '#4ade80';
    var dotR = 4;
    // pulse for busy
    if (a.status === 'busy') dotR = 3 + 2 * Math.abs(Math.sin(tick * 0.08));
    ctx.fillStyle = dotColor;
    ctx.beginPath();
    ctx.arc(labelX - ctx.measureText(a.name).width / 2 - 8, labelY - 3, dotR, 0, Math.PI * 2);
    ctx.fill();

    // text shadow
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillText(a.name, labelX + 1, labelY + 1);
    ctx.fillStyle = '#fff';
    ctx.fillText(a.name, labelX, labelY);
    ctx.restore();

    // Task bubble for busy
    if (a.status === 'busy' && a.task) drawTaskBubble(a, drawX, drawY, dw);

    // ZZZ for offline
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
    // bubble body
    ctx.fillStyle = 'rgba(10,10,30,0.85)';
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 3);
    ctx.fill();
    // bubble border with agent color
    var colors = { main:'#ff6b35', writer:'#4a9e4a', researcher:'#4a8ab5', coder:'#7a7a8a', designer:'#c54ab5', analyst:'#4ac5c5' };
    ctx.strokeStyle = (colors[a.id] || '#8953d1') + 'aa';
    ctx.lineWidth = 0.75;
    ctx.stroke();
    // tail
    ctx.fillStyle = 'rgba(10,10,30,0.85)';
    var cx = bx + bw / 2;
    ctx.beginPath();
    ctx.moveTo(cx - 3, by + bh);
    ctx.lineTo(cx + 3, by + bh);
    ctx.lineTo(cx, by + bh + 4);
    ctx.closePath();
    ctx.fill();
    // text
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

  // ── Main loop ──────────────────────────────────────────────
  function gameLoop() {
    tick++;
    // update agents
    agents.forEach(function (a) { a.update(); });
    // render
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.imageSmoothingEnabled = false;
    drawFloorAndWalls();

    // Render order: ALL furniture first (sorted by row), then ALL agents (sorted by Y)
    // This ensures characters are NEVER occluded by furniture
    var furSorted = FURNITURE.slice().sort(function (a, b) { return a.row - b.row; });
    furSorted.forEach(function (f) { drawFurniture(f); });

    var agentsSorted = agents.slice().sort(function (a, b) { return a.py - b.py; });
    agentsSorted.forEach(function (a) { drawAgent(a); });

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
      rafId = null; agents = null; ctx = null; canvas = null;
    },

    /** Hit-test: returns agentId at canvas (x,y) or null */
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
