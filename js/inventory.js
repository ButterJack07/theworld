(function () {
  'use strict';

  const Game = window.Game = window.Game || {};

  const inventoryEl = document.getElementById('inventory');

  Game.placed = [];
  Game.dragContext = null;   // { id, from: 'inventory' | 'crafting', whole: boolean, entry }
  let longPress = false;    // 长按 0.5s 后拖动 = 整组
  let pressTimer = null;
  let pressing = false;     // 鼠标左键是否按住

  document.addEventListener('mouseup', () => {
    pressing = false;
    clearTimeout(pressTimer);
    document.querySelectorAll('.inv-item.longpress').forEach(n => {
      n.classList.remove('longpress');
      const b = n.querySelector('.whole-badge');
      if (b) b.remove();
    });
  });

  function occupancy(list, cols, rows) {
    const occ = Array.from({ length: rows }, () => Array(cols).fill(null));
    list.forEach((p, i) => {
      for (let r = p.row; r < p.row + p.item.h; r++)
        for (let c = p.col; c < p.col + p.item.w; c++) occ[r][c] = i;
    });
    return occ;
  }
  function canPlace(item, col, row, list, cols, rows, ignoreIdx) {
    if (col < 0 || row < 0 || col + item.w > cols || row + item.h > rows) return false;
    const occ = occupancy(list, cols, rows);
    for (let r = row; r < row + item.h; r++)
      for (let c = col; c < col + item.w; c++)
        if (occ[r][c] !== null && occ[r][c] !== ignoreIdx) return false;
    return true;
  }
  function findFreeSpot(item, list, cols, rows) {
    for (let row = 0; row <= rows - item.h; row++)
      for (let col = 0; col <= cols - item.w; col++)
        if (canPlace(item, col, row, list, cols, rows)) return { col, row };
    return null;
  }
  Game.findFreeSpot = findFreeSpot;
  function initInventory() {
    const list = [];
    const add = (id, count) => {
      const item = Game.ITEMS.find(i => i.id === id);
      const spot = findFreeSpot(item, list, Game.INV_COLS, Game.INV_ROWS);
      if (spot) list.push({ item, col: spot.col, row: spot.row, count });
    };
    add('wood', 10);
    add('stone', 6);
    add('iron', 3);
    add('cloth', 2);
    return list;
  }
  Game.initInventory = initInventory;

  function addItemToInventory(id, amount) {
    const item = Game.ITEMS.find(i => i.id === id);
    let remaining = amount;
    const added = [];
    for (const p of Game.placed) {
      if (p.item.id === id && p.count < Game.MAX_STACK) {
        const take = Math.min(remaining, Game.MAX_STACK - p.count);
        p.count += take;
        added.push({ p, n: take });
        remaining -= take;
        if (remaining === 0) break;
      }
    }
    if (remaining > 0) {
      const spot = findFreeSpot(item, Game.placed, Game.INV_COLS, Game.INV_ROWS);
      if (!spot) {
        added.forEach(a => { a.p.count -= a.n; });
        return false;
      }
      const take = Math.min(remaining, Game.MAX_STACK);
      Game.placed.push({ item, col: spot.col, row: spot.row, count: take });
      remaining -= take;
      if (remaining > 0) return false;
    }
    flashInventory();
    renderInventory();
    return true;
  }
  Game.addItemToInventory = addItemToInventory;

  // 双击：把同种物品的所有堆合并到当前堆上（每堆上限 MAX_STACK）
  function mergeStacks(target, from) {
    const grid = from === 'inventory' ? Game.placed : Game.craftingItems;
    const same = grid.filter(g => g !== target && g.item.id === target.item.id);
    for (const s of same) {
      const take = Math.min(s.count, Game.MAX_STACK - target.count);
      if (take <= 0) break;
      target.count += take;
      s.count -= take;
      if (s.count <= 0) {
        const idx = grid.indexOf(s);
        if (idx >= 0) grid.splice(idx, 1);
      }
      if (target.count >= Game.MAX_STACK) break;
    }
    if (from === 'inventory') renderInventory();
    else Game.renderCrafting();
    Game.saveState();
  }
  Game.mergeStacks = mergeStacks;

  let gainTimer = null;
  function flashInventory() {
    inventoryEl.classList.add('gain');
    clearTimeout(gainTimer);
    gainTimer = setTimeout(() => inventoryEl.classList.remove('gain'), 500);
  }

  const previewEl = document.createElement('div');
  previewEl.className = 'preview';
  inventoryEl.appendChild(previewEl);

  function cellAt(e) {
    const r = inventoryEl.getBoundingClientRect();
    return {
      col: Math.floor((e.clientX - r.left) / Game.INV_CELL),
      row: Math.floor((e.clientY - r.top) / Game.INV_CELL)
    };
  }
  function showPreview(col, row, w, h) {
    previewEl.style.display = 'block';
    previewEl.style.left = col * Game.INV_CELL + 'px';
    previewEl.style.top = row * Game.INV_CELL + 'px';
    previewEl.style.width = w * Game.INV_CELL + 'px';
    previewEl.style.height = h * Game.INV_CELL + 'px';
  }
  function hidePreview() { previewEl.style.display = 'none'; }

  // 绑定物品元素的长按与拖拽：默认拖动 1 个，长按 0.5s 后拖动整组
  function bindDrag(el, p, from) {
    el.addEventListener('mousedown', () => {
      pressing = true;
      longPress = false;
      clearTimeout(pressTimer);
      pressTimer = setTimeout(() => {
        if (!pressing) return;
        longPress = true;
        el.classList.add('longpress');
        if (!el.querySelector('.whole-badge')) {
          const b = document.createElement('span');
          b.className = 'whole-badge';
          b.textContent = '整组';
          el.appendChild(b);
        }
      }, 500);
    });
    el.addEventListener('dblclick', () => {
      mergeStacks(p, from);
    });
    el.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', p.item.id);
      e.dataTransfer.setDragImage(el, 20, 20);
      Game.dragContext = { id: p.item.id, from, whole: longPress, entry: p };
      el.classList.add('dragging');
      pressing = false;
      clearTimeout(pressTimer);
      el.classList.remove('longpress');
      const b = el.querySelector('.whole-badge');
      if (b) b.remove();
    });
    el.addEventListener('dragend', () => {
      Game.dragContext = null;
      longPress = false;
      pressing = false;
      el.classList.remove('dragging');
      el.classList.remove('longpress');
      const b = el.querySelector('.whole-badge');
      if (b) b.remove();
      hidePreview();
      Game.hideCraftPreview();
    });
  }
  Game.bindDrag = bindDrag;

  // 判断当前拖动能否放入物品栏 (col,row)
  function overlap(aCol, aRow, aItem, b) {
    return aCol < b.col + b.item.w && aCol + aItem.w > b.col &&
           aRow < b.row + b.item.h && aRow + aItem.h > b.row;
  }
  function mergeTargetIn(grid, excludeEntry, item, col, row) {
    return grid.find(g => g !== excludeEntry && g.item.id === item.id && overlap(col, row, item, g));
  }
  Game.mergeTargetIn = mergeTargetIn;
  function canDropInventory(item, col, row) {
    if (mergeTargetIn(Game.placed, Game.dragContext.from === 'inventory' ? Game.dragContext.entry : null, item, col, row)) return true;
    if (Game.dragContext.from === 'inventory') {
      const idx = Game.placed.indexOf(Game.dragContext.entry);
      if (idx < 0) return false;
      const srcCount = Game.placed[idx].count;
      if (Game.dragContext.whole || srcCount === 1)
        return canPlace(item, col, row, Game.placed, Game.INV_COLS, Game.INV_ROWS, idx);
      return canPlace(item, col, row, Game.placed, Game.INV_COLS, Game.INV_ROWS);
    }
    return canPlace(item, col, row, Game.placed, Game.INV_COLS, Game.INV_ROWS);
  }
  Game.canDropInventory = canDropInventory;

  // 判断当前拖动能否放入合成器 (col,row)；建筑成品不能放进合成器
  function canDropCrafting(item, col, row) {
    if (Game.BUILDINGS[item.id]) return false;
    if (mergeTargetIn(Game.craftingItems, Game.dragContext.from === 'crafting' ? Game.dragContext.entry : null, item, col, row)) return true;
    if (Game.dragContext.from === 'crafting') {
      const idx = Game.craftingItems.indexOf(Game.dragContext.entry);
      if (idx < 0) return false;
      const srcCount = Game.craftingItems[idx].count;
      if (Game.dragContext.whole || srcCount === 1)
        return canPlace(item, col, row, Game.craftingItems, Game.CRAFT_COLS, Game.CRAFT_ROWS, idx);
      return canPlace(item, col, row, Game.craftingItems, Game.CRAFT_COLS, Game.CRAFT_ROWS);
    }
    return canPlace(item, col, row, Game.craftingItems, Game.CRAFT_COLS, Game.CRAFT_ROWS);
  }
  Game.canDropCrafting = canDropCrafting;

  function renderInventory() {
    inventoryEl.querySelectorAll('.inv-item').forEach(n => n.remove());
    Game.placed.forEach(p => {
      const el = document.createElement('div');
      el.className = 'inv-item';
      el.draggable = true;
      el.title = p.item.name;
      el.innerHTML = Game.itemIconSVG(p.item.id);
      el.style.left = p.col * Game.INV_CELL + 1 + 'px';
      el.style.top = p.row * Game.INV_CELL + 1 + 'px';
      el.style.width = p.item.w * Game.INV_CELL - 2 + 'px';
      el.style.height = p.item.h * Game.INV_CELL - 2 + 'px';
      if (p.count > 1) {
        const b = document.createElement('span');
        b.className = 'count';
        b.textContent = p.count;
        el.appendChild(b);
      }
      bindDrag(el, p, 'inventory');
      el.addEventListener('click', () => {
        Game.selectedItem = p.item;
        Game.selectedBuilding = null;
        Game.selectedBase = false;
        Game.selectedTerrain = null;
        Game.updateStatus();
      });
      inventoryEl.appendChild(el);
    });
  }
  Game.renderInventory = renderInventory;

  inventoryEl.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (!Game.dragContext) return;
    const item = Game.ITEMS.find(i => i.id === Game.dragContext.id);
    if (!item) return;
    const { col, row } = cellAt(e);
    if (canDropInventory(item, col, row)) showPreview(col, row, item.w, item.h);
    else hidePreview();
  });

  inventoryEl.addEventListener('drop', (e) => {
    e.preventDefault();
    if (!Game.dragContext) return;
    const item = Game.ITEMS.find(i => i.id === Game.dragContext.id);
    if (!item) return;
    const { col, row } = cellAt(e);
    if (Game.dragContext.from === 'inventory') {
      const idx = Game.placed.indexOf(Game.dragContext.entry);
      if (idx < 0) { hidePreview(); return; }
      if (!canDropInventory(item, col, row)) { hidePreview(); return; }
      const src = Game.placed[idx];
      const moveAmt = Game.dragContext.whole ? src.count : 1;
      src.count -= moveAmt;
      if (src.count <= 0) Game.placed.splice(idx, 1);
      const mt = mergeTargetIn(Game.placed, src, item, col, row);
      if (mt) mt.count += moveAmt;
      else Game.placed.push({ item, col, row, count: moveAmt });
      renderInventory();
      Game.saveState();
    } else if (Game.dragContext.from === 'crafting') {
      const cIdx = Game.craftingItems.indexOf(Game.dragContext.entry);
      if (cIdx < 0) { hidePreview(); return; }
      if (!canDropInventory(item, col, row)) { hidePreview(); return; }
      const src = Game.craftingItems[cIdx];
      const moveAmt = Game.dragContext.whole ? src.count : 1;
      src.count -= moveAmt;
      if (src.count <= 0) Game.craftingItems.splice(cIdx, 1);
      const mt = mergeTargetIn(Game.placed, null, item, col, row);
      if (mt) mt.count += moveAmt;
      else Game.placed.push({ item, col, row, count: moveAmt });
      renderInventory();
      Game.renderCrafting();
      Game.saveState();
    }
    hidePreview();
  });
})();
