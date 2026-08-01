(function () {
  'use strict';

  const Game = window.Game = window.Game || {};

  const canvas = document.getElementById('map');
  const ctx = canvas.getContext('2d');
  const coordEl = document.getElementById('coord');
  canvas.width = Game.MAP_W * Game.CELL;
  canvas.height = Game.MAP_H * Game.CELL;

  Game.hoverCell = null;    // 鼠标悬停的格子
  Game.dragBuildingId = null;  // 拖放中的建筑物品 id（用于地图落点预览）

  // ---------- 小人（生产力）：占据一个格子的圆形，静止不动 ----------
  function hutCapacity() {
    return Game.state.buildings.filter(b => b.id === 'hut').length * Game.BUILDINGS.hut.capacity;
  }
  Game.hutCapacity = hutCapacity;
  function findVillagerSpot(existingCells) {
    const huts = Game.state.buildings.filter(b => b.id === 'hut');
    if (!huts.length) return null;
    const used = new Set();
    Game.state.buildings.forEach(b => used.add(b.x + ',' + b.y));
    existingCells.forEach(v => used.add(v.x + ',' + v.y));
    for (const hut of huts) {
      for (let r = 1; r <= 5; r++) {
        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
            const x = hut.x + dx, y = hut.y + dy;
            if (x < 0 || x >= Game.MAP_W || y < 0 || y >= Game.MAP_H) continue;
            if (Game.world.map[y][x] !== Game.TILE.LAND) continue;
            if (used.has(x + ',' + y)) continue;
            return { x, y };
          }
        }
      }
    }
    return null;
  }
  Game.findVillagerSpot = findVillagerSpot;

  // ---------- 绘制 ----------
  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // 统一圆角矩形卡通风建筑：阴影 + 主体 + 屋顶带 + 下沿高光 + 门 + 专属徽记
  function drawBuildingEntity(b) {
    const def = Game.BUILDINGS[b.id];
    const px = b.x * Game.CELL, py = b.y * Game.CELL;
    const cx = px + Game.CELL / 2;
    const bx = px + 4, by = py + 5, bw = Game.CELL - 8, bh = Game.CELL - 10, br = 7;
    const roofH = Math.round(bh * 0.42);

    ctx.lineWidth = 1;
    // 阴影
    ctx.fillStyle = 'rgba(120, 110, 90, 0.16)';
    rr(bx + 1, by + 2, bw, bh, br);
    ctx.fill();
    // 主体
    ctx.fillStyle = def.body;
    rr(bx, by, bw, bh, br);
    ctx.fill();
    ctx.strokeStyle = 'rgba(120, 110, 90, 0.35)';
    ctx.stroke();
    // 屋顶带
    ctx.fillStyle = def.roof;
    rr(bx, by, bw, roofH, br);
    ctx.fill();
    ctx.strokeStyle = 'rgba(120, 110, 90, 0.3)';
    ctx.stroke();
    // 屋顶纹理线
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.beginPath();
    ctx.moveTo(bx + 3, by + roofH - 3);
    ctx.lineTo(bx + bw - 3, by + roofH - 3);
    ctx.stroke();
    // 下沿高光
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.beginPath();
    ctx.moveTo(bx + 2, by + bh - 1.5);
    ctx.lineTo(bx + bw - 2, by + bh - 1.5);
    ctx.stroke();

    const gy = by + roofH;
    const bottom = by + bh;
    // 门（统一）
    ctx.fillStyle = def.accent;
    rr(cx - 3, bottom - 8, 6, 8, 2.5);
    ctx.fill();
    // 专属徽记
    switch (b.id) {
      case 'hut':
        // 小窗
        ctx.fillStyle = '#fffdf5';
        rr(cx + 4, gy + 4, 6, 6, 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(120, 100, 70, 0.4)';
        ctx.stroke();
        break;
      case 'lumber':
        // 原木堆
        ctx.fillStyle = def.accent;
        rr(cx - 8, gy + 5, 7, 5, 2); ctx.fill();
        rr(cx - 1, gy + 5, 7, 5, 2); ctx.fill();
        rr(cx - 4, gy + 11, 7, 5, 2); ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(cx - 8, gy + 7); ctx.lineTo(cx - 1, gy + 7); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx - 1, gy + 7); ctx.lineTo(cx + 6, gy + 7); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx - 4, gy + 13); ctx.lineTo(cx + 3, gy + 13); ctx.stroke();
        break;
      case 'mine':
        // 矿洞入口 + 碎石
        ctx.fillStyle = 'rgba(90, 88, 82, 0.85)';
        rr(cx - 5, gy + 6, 10, 8, 3);
        ctx.fill();
        ctx.fillStyle = '#8d8a80';
        rr(cx - 9, gy + 6, 3, 3, 1); ctx.fill();
        rr(cx + 6, gy + 5, 3, 3, 1); ctx.fill();
        rr(cx - 8, gy + 11, 2, 2, 1); ctx.fill();
        rr(cx + 6, gy + 12, 2, 2, 1); ctx.fill();
        break;
      case 'dock':
        // 小鱼
        ctx.fillStyle = '#e0a078';
        ctx.beginPath();
        ctx.ellipse(cx - 1, gy + 8, 5, 3.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx - 6, gy + 8);
        ctx.lineTo(cx - 9, gy + 5);
        ctx.lineTo(cx - 9, gy + 11);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#6f98a3';
        ctx.beginPath();
        ctx.arc(cx + 2, gy + 7, 0.9, 0, Math.PI * 2);
        ctx.fill();
        break;
    }
  }

  function drawVillagers() {
    Game.state.villagersCells.forEach(v => {
      const cx = v.x * Game.CELL + Game.CELL / 2;
      const cy = v.y * Game.CELL + Game.CELL / 2;
      ctx.fillStyle = '#c0a078';
      ctx.beginPath();
      ctx.arc(cx, cy, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.beginPath();
      ctx.arc(cx, cy - 2, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(120, 90, 60, 0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, 9, 0, Math.PI * 2);
      ctx.stroke();
    });
  }

  // ---------- 基地：灰色窗口，可拖动边角缩放 ----------
  function drawBase() {
    const b = Game.base;
    if (!b) return;
    const px = b.x * Game.CELL, py = b.y * Game.CELL;
    const pw = b.w * Game.CELL, ph = b.h * Game.CELL;
    const r = 8;

    // 底色（半透明灰）
    ctx.fillStyle = 'rgba(150, 148, 138, 0.28)';
    rr(px, py, pw, ph, r);
    ctx.fill();

    // 边框
    ctx.strokeStyle = 'rgba(110, 108, 100, 0.85)';
    ctx.lineWidth = 1.5;
    rr(px + 0.75, py + 0.75, pw - 1.5, ph - 1.5, r);
    ctx.stroke();

    // 纹样：对角斜线
    ctx.save();
    rr(px, py, pw, ph, r);
    ctx.clip();
    ctx.strokeStyle = 'rgba(110, 108, 100, 0.22)';
    ctx.lineWidth = 1;
    const step = 12;
    for (let d = -ph; d < pw; d += step) {
      ctx.beginPath();
      ctx.moveTo(px + d, py + ph);
      ctx.lineTo(px + d + ph, py);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
    for (let d = -ph; d < pw; d += step) {
      ctx.beginPath();
      ctx.moveTo(px + d + step / 2, py + ph);
      ctx.lineTo(px + d + ph + step / 2, py);
      ctx.stroke();
    }
    ctx.restore();

    // 四个角的调节把手
    const h = 6;
    const corners = [[px, py, 'nw'], [px + pw, py, 'ne'], [px, py + ph, 'sw'], [px + pw, py + ph, 'se']];
    corners.forEach(([cx, cy]) => {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.fillRect(cx - h / 2, cy - h / 2, h, h);
      ctx.strokeStyle = 'rgba(110, 108, 100, 0.9)';
      ctx.strokeRect(cx - h / 2 + 0.5, cy - h / 2 + 0.5, h - 1, h - 1);
    });
  }

  function terrainOf(x, y) {
    if (x < 0 || x >= Game.MAP_W || y < 0 || y >= Game.MAP_H) return null;
    return Game.world.terrain ? Game.world.terrain[y][x] : null;
  }

  // 已揭示的特殊地貌：涂地貌色 + 团边界
  function drawRevealedTerrain() {
    if (!Game.world.terrain) return;
    ctx.lineWidth = 1;
    for (let y = 0; y < Game.MAP_H; y++) {
      for (let x = 0; x < Game.MAP_W; x++) {
        const t = Game.world.terrain[y][x];
        if (t == null || t === Game.TERRAIN.PLAIN) continue;
        const px = x * Game.CELL, py = y * Game.CELL;
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = Game.TERRAIN_COLORS[t];
        ctx.fillRect(px, py, Game.CELL, Game.CELL);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = 'rgba(70, 70, 60, 0.85)';
        ctx.beginPath();
        if (terrainOf(x, y - 1) !== t) { ctx.moveTo(px, py); ctx.lineTo(px + Game.CELL, py); }
        if (terrainOf(x, y + 1) !== t) { ctx.moveTo(px, py + Game.CELL); ctx.lineTo(px + Game.CELL, py + Game.CELL); }
        if (terrainOf(x - 1, y) !== t) { ctx.moveTo(px, py); ctx.lineTo(px, py + Game.CELL); }
        if (terrainOf(x + 1, y) !== t) { ctx.moveTo(px + Game.CELL, py); ctx.lineTo(px + Game.CELL, py + Game.CELL); }
        ctx.stroke();
      }
    }
  }

  // 基地边角命中检测（像素坐标）
  const BASE_EDGE = 6;
  function baseHitTest(px, py) {
    const b = Game.base;
    if (!b) return null;
    const l = b.x * Game.CELL, t = b.y * Game.CELL;
    const r = (b.x + b.w) * Game.CELL, bot = (b.y + b.h) * Game.CELL;
    const onL = Math.abs(px - l) <= BASE_EDGE;
    const onR = Math.abs(px - r) <= BASE_EDGE;
    const onT = Math.abs(py - t) <= BASE_EDGE;
    const onB = Math.abs(py - bot) <= BASE_EDGE;
    if (onL && onT) return 'nw';
    if (onR && onT) return 'ne';
    if (onL && onB) return 'sw';
    if (onR && onB) return 'se';
    if (onL) return 'w';
    if (onR) return 'e';
    if (onT) return 'n';
    if (onB) return 's';
    return null;
  }

  function drawWorld() {
    const map = Game.world.map;
    ctx.fillStyle = '#f5efe2';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < Game.MAP_H; y++) {
      for (let x = 0; x < Game.MAP_W; x++) {
        ctx.fillStyle = map[y][x] === Game.TILE.OCEAN ? Game.OCEAN_COLOR : Game.LAND_COLOR;
        ctx.fillRect(x * Game.CELL, y * Game.CELL, Game.CELL, Game.CELL);
        ctx.strokeStyle = Game.GRID_LINE;
        ctx.lineWidth = 1;
        ctx.strokeRect(x * Game.CELL + 0.5, y * Game.CELL + 0.5, Game.CELL - 1, Game.CELL - 1);
      }
    }
    drawRevealedTerrain();
    drawBase();
    Game.state.buildings.forEach(drawBuildingEntity);
    drawVillagers();
    // 拖放建筑落点预览
    if (Game.dragBuildingId && Game.hoverCell && Game.hoverCell.x >= 0 && Game.hoverCell.x < Game.MAP_W && Game.hoverCell.y >= 0 && Game.hoverCell.y < Game.MAP_H) {
      const ok = canBuildAt(Game.dragBuildingId, Game.hoverCell.x, Game.hoverCell.y);
      ctx.fillStyle = ok ? 'rgba(94, 183, 224, 0.22)' : 'rgba(190, 84, 70, 0.22)';
      rr(Game.hoverCell.x * Game.CELL + 1, Game.hoverCell.y * Game.CELL + 1, Game.CELL - 2, Game.CELL - 2, 7);
      ctx.fill();
      ctx.strokeStyle = ok ? 'rgba(94, 183, 224, 0.7)' : 'rgba(190, 84, 70, 0.7)';
      ctx.lineWidth = 1;
      ctx.stroke();
      if (ok) {
        ctx.globalAlpha = 0.55;
        drawBuildingEntity({ id: Game.dragBuildingId, x: Game.hoverCell.x, y: Game.hoverCell.y });
        ctx.globalAlpha = 1;
      }
    }
  }
  Game.drawWorld = drawWorld;

  // 悬停显示坐标
  canvas.addEventListener('mousemove', (e) => {
    if (Game.dragBuildingId) return;
    const r = canvas.getBoundingClientRect();
    const px = e.clientX - r.left;
    const py = e.clientY - r.top;
    const gx = Math.floor(px / Game.CELL);
    const gy = Math.floor(py / Game.CELL);
    Game.hoverCell = { x: gx, y: gy };
    if (gx >= 0 && gx < Game.MAP_W && gy >= 0 && gy < Game.MAP_H) {
      coordEl.textContent = `( ${gx}, ${gy} )`;
    } else {
      coordEl.textContent = '';
    }
    if (baseResize) {
      applyBaseResize(px, py);
      return;
    }
    const side = baseHitTest(px, py);
    const cursors = { nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize', n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize' };
    canvas.style.cursor = side ? cursors[side] : 'crosshair';
  });
  canvas.addEventListener('mouseleave', () => {
    if (Game.dragBuildingId) return;
    coordEl.textContent = '';
    Game.hoverCell = null;
    if (!baseResize) canvas.style.cursor = 'crosshair';
  });

  // 基地：拖动边角缩放
  let baseResize = null; // { side, startX, startY, startBase }
  let resizeMoved = false;

  function applyBaseResize(px, py) {
    const dx = Math.round((px - baseResize.startX) / Game.CELL);
    const dy = Math.round((py - baseResize.startY) / Game.CELL);
    let { x, y, w, h } = baseResize.startBase;
    if (dx !== 0 || dy !== 0) resizeMoved = true;
    const side = baseResize.side;
    if (side.includes('w')) {
      const newW = w - dx;
      const clampedW = Math.min(Math.max(newW, Game.BASE_MIN_W), x + w - 0);
      x = Math.max(0, Math.min(x + (w - clampedW), Game.MAP_W - Game.BASE_MIN_W));
      w = Math.max(Game.BASE_MIN_W, clampedW);
    }
    if (side.includes('e')) {
      w = Math.max(Game.BASE_MIN_W, Math.min(w + dx, Game.MAP_W - x));
    }
    if (side.includes('n')) {
      const newH = h - dy;
      const clampedH = Math.min(Math.max(newH, Game.BASE_MIN_H), y + h - 0);
      y = Math.max(0, Math.min(y + (h - clampedH), Game.MAP_H - Game.BASE_MIN_H));
      h = Math.max(Game.BASE_MIN_H, clampedH);
    }
    if (side.includes('s')) {
      h = Math.max(Game.BASE_MIN_H, Math.min(h + dy, Game.MAP_H - y));
    }
    Game.base = { x, y, w, h };
    drawWorld();
  }

  canvas.addEventListener('mousedown', (e) => {
    if (Game.dragContext || Game.dragBuildingId) return;
    if (e.button !== 0) return;
    const r = canvas.getBoundingClientRect();
    const px = e.clientX - r.left;
    const py = e.clientY - r.top;
    const side = baseHitTest(px, py);
    if (!side) return;
    baseResize = { side, startX: px, startY: py, startBase: { ...Game.base } };
    resizeMoved = false;
    e.preventDefault();
  });
  document.addEventListener('mouseup', () => {
    if (baseResize) {
      if (resizeMoved) Game.saveState();
      baseResize = null;
      canvas.style.cursor = 'crosshair';
    }
  });

  // 点击地图：点选建筑显示信息栏，点空处清除选择
  canvas.addEventListener('click', (e) => {
    if (Game.dragContext || Game.dragBuildingId) return;
    if (resizeMoved) { resizeMoved = false; return; }
    const c = canvasCell(e);
    const b = Game.state.buildings.find(bd => bd.x === c.x && bd.y === c.y);
    Game.selectedBuilding = b || null;
    Game.selectedBase = !b && insideBase(c.x, c.y);
    Game.selectedTerrain = null;
    Game.updateStatus();
  });

  // 双击地块：信息栏持续显示该地块地貌的类型与产出内容
  canvas.addEventListener('dblclick', (e) => {
    if (Game.dragContext || Game.dragBuildingId) return;
    if (resizeMoved) return;
    const c = canvasCell(e);
    if (c.x < 0 || c.x >= Game.MAP_W || c.y < 0 || c.y >= Game.MAP_H) return;
    const raw = Game.world.terrain[c.y][c.x];
    const t = raw == null ? Game.TERRAIN.SEA : raw;
    Game.selectedBuilding = null;
    Game.selectedBase = false;
    Game.selectedTerrain = { t, x: c.x, y: c.y };
    Game.updateStatus();
  });

  function insideBase(x, y) {
    const b = Game.base;
    return b && x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h;
  }

  // ---------- 建造系统：从物品栏把建筑拖到地图上安装 ----------
  function canvasCell(e) {
    const r = canvas.getBoundingClientRect();
    return {
      x: Math.floor((e.clientX - r.left) / Game.CELL),
      y: Math.floor((e.clientY - r.top) / Game.CELL)
    };
  }
  function isBuildingItem(id) {
    return !!Game.BUILDINGS[id];
  }
  function canBuildAt(id, x, y) {
    if (x < 0 || x >= Game.MAP_W || y < 0 || y >= Game.MAP_H) return false;
    if (Game.world.map[y][x] !== Game.TILE.LAND) return false;
    if (Game.state.buildings.some(b => b.x === x && b.y === y)) return false;
    if (Game.state.villagersCells.some(v => v.x === x && v.y === y)) return false;
    if (id === 'dock') {
      const nearWater = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
        const nx = x + dx, ny = y + dy;
        return nx >= 0 && nx < Game.MAP_W && ny >= 0 && ny < Game.MAP_H && Game.world.map[ny][nx] === Game.TILE.OCEAN;
      });
      if (!nearWater) return false;
    }
    return true;
  }
  Game.canBuildAt = canBuildAt;

  // 初始在基地内任意一个可建格刷一个茅草屋
  function spawnStarterHut() {
    if (!Game.base) return;
    const spots = [];
    for (let y = Game.base.y; y < Game.base.y + Game.base.h; y++) {
      for (let x = Game.base.x; x < Game.base.x + Game.base.w; x++) {
        if (canBuildAt('hut', x, y)) spots.push({ x, y });
      }
    }
    if (!spots.length) return;
    const s = spots[Math.floor(Math.random() * spots.length)];
    Game.state.buildings.push({ id: 'hut', x: s.x, y: s.y });
  }
  Game.spawnStarterHut = spawnStarterHut;

  function takeOneFrom(grid, entry) {
    const idx = grid.indexOf(entry);
    if (idx < 0) return false;
    const src = grid[idx];
    src.count -= 1;
    if (src.count <= 0) grid.splice(idx, 1);
    return true;
  }
  function installBuilding(itemId, x, y) {
    const from = Game.dragContext ? Game.dragContext.from : null;
    const grid = from === 'crafting' ? Game.craftingItems : Game.placed;
    if (!takeOneFrom(grid, Game.dragContext.entry)) return;
    Game.state.buildings.push({ id: itemId, x, y });
    Game.dragContext = null;
    Game.dragBuildingId = null;
    Game.selectedBuilding = Game.state.buildings[Game.state.buildings.length - 1];
    Game.selectedBase = false;
    Game.selectedTerrain = null;
    Game.renderInventory();
    Game.renderCrafting();
    Game.updateStatus();
    Game.saveState();
    drawWorld();
  }

  canvas.addEventListener('dragover', (e) => {
    if (!Game.dragContext) return;
    const item = Game.ITEMS.find(i => i.id === Game.dragContext.id);
    if (!item || !isBuildingItem(item.id)) { Game.dragBuildingId = null; return; }
    e.preventDefault();
    const c = canvasCell(e);
    Game.hoverCell = { x: c.x, y: c.y };
    Game.dragBuildingId = item.id;
    const ok = canBuildAt(item.id, c.x, c.y);
    coordEl.textContent = ok ? '松手放置建筑' : '此处无法建造';
    drawWorld();
  });
  canvas.addEventListener('dragleave', () => {
    Game.dragBuildingId = null;
    coordEl.textContent = '';
    drawWorld();
  });
  canvas.addEventListener('drop', (e) => {
    e.preventDefault();
    Game.dragBuildingId = null;
    if (!Game.dragContext) return;
    const item = Game.ITEMS.find(i => i.id === Game.dragContext.id);
    if (!item || !isBuildingItem(item.id)) return;
    const c = canvasCell(e);
    if (!canBuildAt(item.id, c.x, c.y)) { drawWorld(); return; }
    installBuilding(item.id, c.x, c.y);
  });
})();
