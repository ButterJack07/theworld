(function () {
  'use strict';

  const Game = window.Game = window.Game || {};

  const craftingEl = document.getElementById('crafting');
  const craftResultEl = document.getElementById('craftResult');

  Game.craftingItems = [];

  function canAddToInventory(id, amount) {
    if (Game.placed.find(p => p.item.id === id)) return true;
    const item = Game.ITEMS.find(i => i.id === id);
    return !!Game.findFreeSpot(item, Game.placed, Game.INV_COLS, Game.INV_ROWS);
  }
  Game.canAddToInventory = canAddToInventory;

  function countInGrid(list, id) {
    return list.filter(p => p.item.id === id).reduce((s, p) => s + p.count, 0);
  }
  function matchingRecipes() {
    return Game.RECIPES.filter(r => r.req.every(q => countInGrid(Game.craftingItems, q.id) >= q.n));
  }
  Game.matchingRecipes = matchingRecipes;

  function craftRecipe(r) {
    if (!matchingRecipes().includes(r)) return;
    if (!canAddToInventory(r.out, 1)) return;
    r.req.forEach(q => {
      let need = q.n;
      for (let i = 0; i < Game.craftingItems.length && need > 0; i++) {
        const p = Game.craftingItems[i];
        if (p.item.id !== q.id) continue;
        const take = Math.min(need, p.count);
        p.count -= take;
        need -= take;
        if (p.count <= 0) { Game.craftingItems.splice(i, 1); i--; }
      }
    });
    Game.addItemToInventory(r.out, 1);
    renderCrafting();
    Game.saveState();
  }
  Game.craftRecipe = craftRecipe;

  function renderCraftResult() {
    craftResultEl.innerHTML = '';
    const list = matchingRecipes();
    if (!list.length) {
      const hint = document.createElement('span');
      hint.className = 'craft-hint';
      hint.textContent = '未组合出配方';
      craftResultEl.appendChild(hint);
      return;
    }
    list.forEach(r => {
      const out = Game.ITEMS.find(i => i.id === r.out);
      const row = document.createElement('div');
      row.className = 'craft-option';
      row.title = '点击合成';
      const icon = document.createElement('span');
      icon.className = 'rc-icon';
      icon.innerHTML = Game.itemIconSVG(out.id);
      const name = document.createElement('span');
      name.className = 'co-name';
      name.textContent = out.name;
      row.append(icon, name);
      row.addEventListener('click', () => craftRecipe(r));
      craftResultEl.appendChild(row);
    });
  }
  Game.renderCraftResult = renderCraftResult;

  // 合成列表（左上角）：材料合成 / 建筑合成 两组
  function renderRecipeList() {
    const listEl = document.getElementById('recipeList');
    listEl.innerHTML = '';
    Game.RECIPE_GROUPS.forEach(g => {
      const title = document.createElement('div');
      title.className = 'recipe-group-title';
      title.textContent = g.title;
      listEl.appendChild(title);
      Game.RECIPES.filter(r => r.group === g.key).forEach(r => {
        const out = Game.ITEMS.find(i => i.id === r.out);
        const row = document.createElement('div');
        row.className = 'recipe-row';
        const left = document.createElement('div');
        left.className = 'rc-left';
        const icon = document.createElement('span');
        icon.className = 'rc-icon';
        icon.innerHTML = Game.itemIconSVG(out.id);
        const name = document.createElement('span');
        name.className = 'rc-name';
        name.textContent = out.name;
        left.append(icon, name);
        const req = document.createElement('span');
        req.className = 'rc-req';
        req.textContent = Game.reqText(r.req);
        row.append(left, req);
        listEl.appendChild(row);
      });
    });
  }
  Game.renderRecipeList = renderRecipeList;

  // 扩建面板：展示建筑自动升级（合并）规则
  function renderUpgrades() {
    const listEl = document.getElementById('expandList');
    listEl.innerHTML = '';
    Game.UPGRADES.forEach(u => {
      const src = Game.BUILDINGS[u.src];
      const out = Game.BUILDINGS[u.out];
      const row = document.createElement('div');
      row.className = 'expand-row';

      const line = document.createElement('div');
      line.className = 'expand-line';
      const left = document.createElement('div');
      left.className = 'expand-side';
      const icon = document.createElement('span');
      icon.className = 'rc-icon';
      icon.innerHTML = Game.itemIconSVG(u.src);
      const name = document.createElement('span');
      name.className = 'expand-name';
      name.textContent = `${src.name} ×${u.n}`;
      left.append(icon, name);
      const arrow = document.createElement('span');
      arrow.className = 'expand-arrow';
      arrow.textContent = '→';
      const right = document.createElement('div');
      right.className = 'expand-side';
      const rIcon = document.createElement('span');
      rIcon.className = 'rc-icon';
      rIcon.innerHTML = Game.itemIconSVG(u.out);
      const rName = document.createElement('span');
      rName.className = 'expand-name';
      rName.textContent = out.name;
      right.append(rIcon, rName);
      line.append(left, arrow, right);

      const note = document.createElement('div');
      note.className = 'expand-note';
      note.textContent = `${u.n} 个 ${src.name} 摆成 ${u.pattern} 自动合并`;

      row.append(line, note);
      listEl.appendChild(row);
    });
  }
  Game.renderUpgrades = renderUpgrades;

  const craftPreviewEl = document.createElement('div');
  craftPreviewEl.className = 'preview';
  craftingEl.appendChild(craftPreviewEl);

  function craftCellAt(e) {
    const r = craftingEl.getBoundingClientRect();
    return {
      col: Math.floor((e.clientX - r.left) / Game.CRAFT_CELL),
      row: Math.floor((e.clientY - r.top) / Game.CRAFT_CELL)
    };
  }
  function showCraftPreview(col, row, w, h) {
    craftPreviewEl.style.display = 'block';
    craftPreviewEl.style.left = col * Game.CRAFT_CELL + 'px';
    craftPreviewEl.style.top = row * Game.CRAFT_CELL + 'px';
    craftPreviewEl.style.width = w * Game.CRAFT_CELL + 'px';
    craftPreviewEl.style.height = h * Game.CRAFT_CELL + 'px';
  }
  function hideCraftPreview() { craftPreviewEl.style.display = 'none'; }
  Game.showCraftPreview = showCraftPreview;
  Game.hideCraftPreview = hideCraftPreview;

  function renderCrafting() {
    craftingEl.querySelectorAll('.inv-item').forEach(n => n.remove());
    Game.craftingItems.forEach(p => {
      const el = document.createElement('div');
      el.className = 'inv-item';
      el.draggable = true;
      el.title = p.item.name;
      el.innerHTML = Game.itemIconSVG(p.item.id);
      el.style.left = p.col * Game.CRAFT_CELL + 1 + 'px';
      el.style.top = p.row * Game.CRAFT_CELL + 1 + 'px';
      el.style.width = p.item.w * Game.CRAFT_CELL - 2 + 'px';
      el.style.height = p.item.h * Game.CRAFT_CELL - 2 + 'px';
      if (p.count > 1) {
        const b = document.createElement('span');
        b.className = 'count';
        b.textContent = p.count;
        el.appendChild(b);
      }
      Game.bindDrag(el, p, 'crafting');
      el.addEventListener('click', () => {
        Game.selectedItem = p.item;
        Game.selectedBuilding = null;
        Game.selectedBase = false;
        Game.selectedTerrain = null;
        Game.updateStatus();
      });
      craftingEl.appendChild(el);
    });
    renderCraftResult();
  }
  Game.renderCrafting = renderCrafting;

  craftingEl.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (!Game.dragContext) return;
    const item = Game.ITEMS.find(i => i.id === Game.dragContext.id);
    if (!item) return;
    const { col, row } = craftCellAt(e);
    if (Game.canDropCrafting(item, col, row)) showCraftPreview(col, row, item.w, item.h);
    else hideCraftPreview();
  });

  craftingEl.addEventListener('drop', (e) => {
    e.preventDefault();
    if (!Game.dragContext) return;
    const item = Game.ITEMS.find(i => i.id === Game.dragContext.id);
    if (!item) return;
    const { col, row } = craftCellAt(e);
    if (Game.dragContext.from === 'inventory') {
      const iIdx = Game.placed.indexOf(Game.dragContext.entry);
      if (iIdx < 0 || !Game.canDropCrafting(item, col, row)) { hideCraftPreview(); return; }
      const src = Game.placed[iIdx];
      const moveAmt = Game.dragContext.whole ? src.count : 1;
      src.count -= moveAmt;
      if (src.count <= 0) Game.placed.splice(iIdx, 1);
      const mt = Game.mergeTargetIn(Game.craftingItems, null, item, col, row);
      if (mt) mt.count += moveAmt;
      else Game.craftingItems.push({ item, col, row, count: moveAmt });
      Game.renderInventory();
      renderCrafting();
      Game.saveState();
    } else if (Game.dragContext.from === 'crafting') {
      const cIdx = Game.craftingItems.indexOf(Game.dragContext.entry);
      if (cIdx < 0 || !Game.canDropCrafting(item, col, row)) { hideCraftPreview(); return; }
      const src = Game.craftingItems[cIdx];
      const moveAmt = Game.dragContext.whole ? src.count : 1;
      src.count -= moveAmt;
      if (src.count <= 0) Game.craftingItems.splice(cIdx, 1);
      const mt = Game.mergeTargetIn(Game.craftingItems, src, item, col, row);
      if (mt) mt.count += moveAmt;
      else Game.craftingItems.push({ item, col, row, count: moveAmt });
      renderCrafting();
      Game.saveState();
    }
    hideCraftPreview();
  });
})();
