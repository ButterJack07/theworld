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
    const gx = Math.floor((e.clientX - r.left) / Game.CELL);
    const gy = Math.floor((e.clientY - r.top) / Game.CELL);
    Game.hoverCell = { x: gx, y: gy };
    if (gx >= 0 && gx < Game.MAP_W && gy >= 0 && gy < Game.MAP_H) {
      coordEl.textContent = `( ${gx}, ${gy} )`;
    } else {
      coordEl.textContent = '';
    }
  });
  canvas.addEventListener('mouseleave', () => {
    if (Game.dragBuildingId) return;
    coordEl.textContent = '';
    Game.hoverCell = null;
  });

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
