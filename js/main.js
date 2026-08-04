(function () {
  'use strict';

  const Game = window.Game = window.Game || {};

  const dateEl = document.getElementById('date');
  const popEl = document.getElementById('pop');
  const civEl = document.getElementById('civ');
  const statusEl = document.getElementById('status');
  const playBtn = document.getElementById('playBtn');
  const playIcon = document.getElementById('playIcon');
  const speedLabel = document.getElementById('speedLabel');
  const recipeToggle = document.getElementById('recipeToggle');
  const recipePanel = document.getElementById('recipePanel');

  // 模式: 0 = 1倍速运行, 1 = 2倍速运行, 2 = 暂停
  let mode = 0;
  let paused = false;
  let speed = 1;

  function applyMode() {
    if (mode === 0) { paused = false; speed = 1; }
    else if (mode === 1) { paused = false; speed = 2; }
    else { paused = true; speed = 1; }
  }
  function updateControls() {
    if (mode === 2) {
      playIcon.textContent = '❚❚';
      speedLabel.textContent = '已暂停';
      playBtn.title = '已暂停 · 点击开始';
    } else {
      playIcon.textContent = '▶';
      speedLabel.textContent = (mode === 1 ? '2x' : '1x');
      playBtn.title = mode === 1 ? '2倍速 · 点击暂停' : '1倍速 · 点击加速';
    }
    playBtn.classList.toggle('active', mode === 1);
  }
  playBtn.addEventListener('click', () => {
    mode = (mode + 1) % 3;
    applyMode();
    updateControls();
    Game.saveState();
  });
  updateControls();

  // 合成列表：点击圆形按钮展开 / 收起
  recipeToggle.addEventListener('click', () => {
    recipePanel.classList.toggle('hidden');
    recipeToggle.classList.toggle('open', !recipePanel.classList.contains('hidden'));
  });

  // 扩建规则：点击圆形按钮展开 / 收起
  const expandToggle = document.getElementById('expandToggle');
  const expandPanel = document.getElementById('expandPanel');
  expandToggle.addEventListener('click', () => {
    expandPanel.classList.toggle('hidden');
    expandToggle.classList.toggle('open', !expandPanel.classList.contains('hidden'));
  });

  // 设置菜单：点击圆形按钮展开 / 收起（选项卡：操作说明 / 游戏）
  // 打开时默认暂停游戏，关闭时恢复打开前的速度设置
  const settingsToggle = document.getElementById('settingsToggle');
  const settingsPanel = document.getElementById('settingsPanel');
  let savedMode = 0;
  function openSettings() {
    savedMode = mode;
    mode = 2;
    applyMode();
    updateControls();
    settingsPanel.classList.remove('hidden');
    settingsToggle.classList.add('open');
  }
  function closeSettings() {
    mode = savedMode;
    applyMode();
    updateControls();
    settingsPanel.classList.add('hidden');
    settingsToggle.classList.remove('open');
  }
  settingsToggle.addEventListener('click', () => {
    if (settingsPanel.classList.contains('hidden')) openSettings();
    else closeSettings();
  });
  settingsPanel.querySelectorAll('.settings-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      settingsPanel.querySelectorAll('.settings-tab').forEach(b => b.classList.toggle('active', b === btn));
      settingsPanel.querySelectorAll('.settings-page').forEach(p => p.classList.toggle('active', p.id === 'page-' + btn.dataset.tab));
    });
  });

  Game.world = Game.generateWorld(Game.seed);

  document.getElementById('restart').addEventListener('click', () => {
    Game.seed = Math.floor(Math.random() * 1e9);
    Game.store.set(Game.SEED_KEY, String(Game.seed));
    Game.world = Game.generateWorld(Game.seed);
    Game.resetState();
    Game.selectedBuilding = null;
    Game.selectedBase = false;
    Game.selectedTerrain = null;
    Game.renderInventory();
    Game.renderCrafting();
    updateStatus();
    Game.drawWorld();
    closeSettings();
  });

  // ---------- 状态栏：展示点选地图上建筑的信息 ----------
  Game.selectedBuilding = null;
  Game.selectedBase = false;
  Game.selectedTerrain = null;   // 双击选择的地块地貌 { t, x, y }

  // 统计基地覆盖区域各地貌的格子数
  function baseTerrainCounts() {
    const counts = {};
    const b = Game.base;
    for (let y = b.y; y < b.y + b.h; y++) {
      for (let x = b.x; x < b.x + b.w; x++) {
        if (x < 0 || x >= Game.MAP_W || y < 0 || y >= Game.MAP_H) continue;
        const t = Game.world.terrain[y][x];
        if (t == null) {
          counts[Game.TERRAIN.SEA] = (counts[Game.TERRAIN.SEA] || 0) + 1;
          continue;
        }
        counts[t] = (counts[t] || 0) + 1;
      }
    }
    return counts;
  }

  function updateStatus() {
    popEl.textContent = Game.state.villagers + ' / ' + Game.hutCapacity();
    civEl.textContent = Game.state.civ;
    const year = Math.floor((Game.displayDay - 1) / Game.DAYS_PER_YEAR) + 1;
    const month = Math.floor(((Game.displayDay - 1) % Game.DAYS_PER_YEAR) / Game.DAYS_PER_MONTH) + 1;
    dateEl.textContent = `${year} 年 ${month} 月`;
    statusEl.innerHTML = '';
    const b = Game.selectedBuilding;
    if (b) { renderBuildingInfo(b); return; }
    if (Game.selectedBase) { renderBaseInfo(); return; }
    if (Game.selectedTerrain) {
      showTerrainInfo(Game.selectedTerrain.t, Game.selectedTerrain.x, Game.selectedTerrain.y);
      return;
    }
    const hint = document.createElement('div');
    hint.className = 'info-hint';
    hint.textContent = '点击地图上的建筑查看信息';
    statusEl.appendChild(hint);
  }

  function renderBaseInfo() {
    const card = document.createElement('div');
    card.className = 'build-info bi-base';

    const counts = baseTerrainCounts();
    const total = Object.values(counts).reduce((s, n) => s + n, 0);

    // 第一列：基地基础信息
    const main = document.createElement('div');
    main.className = 'bi-base-main';
    const head = document.createElement('div');
    head.className = 'bi-head';
    const icon = document.createElement('span');
    icon.className = 'bi-icon';
    icon.innerHTML = Game.itemIconSVG('stone');
    const title = document.createElement('div');
    title.className = 'bi-title';
    title.textContent = '基地';
    head.append(icon, title);
    main.appendChild(head);

    const sizeLine = document.createElement('div');
    sizeLine.className = 'bi-line bi-base-center';
    const sizeVal = document.createElement('span');
    sizeVal.className = 'bi-val';
    sizeVal.textContent = `${Game.base.w} × ${Game.base.h}`;
    sizeLine.append(sizeVal);
    main.appendChild(sizeLine);

    const totalLine = document.createElement('div');
    totalLine.className = 'bi-line bi-base-center';
    const totalVal = document.createElement('span');
    totalVal.className = 'bi-val bi-total';
    totalVal.textContent = `共 ${total} 格`;
    totalLine.append(totalVal);
    main.appendChild(totalLine);

    // 第一、二列之间的分割线
    const divider = document.createElement('div');
    divider.className = 'bi-base-divider';

    // 第二、三列：地貌竖排罗列（先填满一列再进下一列），只显示数量不带「格」
    const grid = document.createElement('div');
    grid.className = 'bi-base-terrains';
    const cols = document.createElement('div');
    cols.className = 'bi-base-cols';
    const order = Object.values(Game.TERRAIN);
    order.forEach(t => {
      if (!counts[t]) return;
      const row = document.createElement('div');
      row.className = 'bt-row';
      const swatch = document.createElement('span');
      swatch.className = 'swatch';
      swatch.style.background = Game.TERRAIN_COLORS[t];
      const name = document.createElement('span');
      name.className = 'bt-row-name';
      name.textContent = Game.TERRAIN_NAMES[t];
      const val = document.createElement('span');
      val.className = 'bt-row-count';
      val.textContent = String(counts[t]);
      row.append(swatch, name, val);
      cols.appendChild(row);
    });
    grid.appendChild(cols);

    card.append(main, divider, grid);
    statusEl.appendChild(card);
  }

  // 双击地块：显示该地块地貌的类型与产出内容
  function showTerrainInfo(t, x, y) {
    const def = Game.TERRAIN_TABLE[t];
    const card = document.createElement('div');
    card.className = 'build-info';

    const head = document.createElement('div');
    head.className = 'bi-head';
    const icon = document.createElement('span');
    icon.className = 'bi-icon';
    icon.style.background = Game.TERRAIN_COLORS[t];
    icon.style.borderRadius = '8px';
    icon.style.border = '1px solid rgba(110, 108, 100, 0.6)';
    const title = document.createElement('div');
    title.className = 'bi-title';
    title.textContent = Game.TERRAIN_NAMES[t] + ' · 地貌';
    head.append(icon, title);
    card.appendChild(head);

    if (def && def.desc) {
      const line = document.createElement('div');
      line.className = 'bi-line';
      const label = document.createElement('span');
      label.className = 'bi-label';
      label.textContent = '每 1 个月产出';
      const val = document.createElement('span');
      val.className = 'bi-val';
      val.textContent = def.desc;
      line.append(label, val);
      card.appendChild(line);
    }

    statusEl.appendChild(card);
  }
  Game.showTerrainInfo = showTerrainInfo;

  function renderBuildingInfo(b) {
    const def = Game.BUILDINGS[b.id];
    const card = document.createElement('div');
    card.className = 'build-info';

    const head = document.createElement('div');
    head.className = 'bi-head';
    const icon = document.createElement('span');
    icon.className = 'bi-icon';
    icon.innerHTML = Game.itemIconSVG(b.id);
    const title = document.createElement('div');
    title.className = 'bi-title';
    title.textContent = def.name;
    head.append(icon, title);
    card.appendChild(head);

    if (def.desc) {
      const line = document.createElement('div');
      line.className = 'bi-line';
      const label = document.createElement('span');
      label.className = 'bi-label';
      label.textContent = `每 ${def.interval} 个月产出`;
      const val = document.createElement('span');
      val.className = 'bi-val';
      val.textContent = def.desc;
      line.append(label, val);
      card.appendChild(line);
    } else {
      def.produces.forEach(p => {
        const item = Game.ITEMS.find(i => i.id === p.item);
        const line = document.createElement('div');
        line.className = 'bi-line';
        const label = document.createElement('span');
        label.className = 'bi-label';
        label.textContent = `每 ${def.interval} 个月产出`;
        const val = document.createElement('span');
        val.className = 'bi-val';
        const vIcon = document.createElement('span');
        vIcon.className = 'bi-icon-sm';
        vIcon.innerHTML = Game.itemIconSVG(item.id);
        const vName = document.createElement('span');
        vName.textContent = `${item.name}  +${p.amount}`;
        val.append(vIcon, vName);
        line.append(label, val);
        card.appendChild(line);
      });
    }

    const timer = b.timer || 0;
    const cycle = def.interval * Game.DAYS_PER_MONTH;
    const pct = Math.min(100, Math.round((timer / cycle) * 100));
    const prog = document.createElement('div');
    prog.className = 'bi-progress';
    const fill = document.createElement('div');
    fill.className = 'bi-progress-fill';
    fill.style.width = pct + '%';
    prog.appendChild(fill);
    card.appendChild(prog);

    if (def.capacity) {
      const foot = document.createElement('div');
      foot.className = 'bi-foot';
      foot.textContent = `住宅容量  ${def.capacity} 人 / 座`;
      card.appendChild(foot);
    }

    statusEl.appendChild(card);
  }
  Game.updateStatus = updateStatus;

  // ---------- 游戏循环 ----------
  let popTimer = 0;
  let saveTick = 0;

  function tickBuilding(b, def) {
    b.timer = (b.timer || 0) + speed;
    if (b.timer >= def.interval * Game.DAYS_PER_MONTH) {
      b.timer = 0;
      let produced = false;
      def.produces.forEach(p => {
        const itemId = typeof p.item === 'function' ? p.item() : p.item;
        const amount = typeof p.amount === 'function' ? p.amount() : p.amount;
        if (Game.addItemToInventory(itemId, amount)) {
          Game.state.civ += amount;
          produced = true;
        }
      });
      if (produced) Game.saveState();
    }
  }

  // 基地产出：每个阶段（1 个月 = 30 天）每块覆盖格只有一定概率完成一次产出
  // （BASE_PRODUCE_CHANCE，默认 10%）；覆盖格所属未揭示团的 progress 每次正常累计
  let baseTimer = 0;
  function baseProduce() {
    const b = Game.base;
    if (!b || !Game.world) return;
    const touched = new Set();
    for (let y = b.y; y < b.y + b.h; y++) {
      for (let x = b.x; x < b.x + b.w; x++) {
        if (x < 0 || x >= Game.MAP_W || y < 0 || y >= Game.MAP_H) continue;
        const raw = Game.world.terrain[y][x];
        const t = raw == null ? Game.TERRAIN.SEA : raw;
        if (raw != null) {
          const ci = Game.world.clumpIndex[y][x];
          if (ci >= 0) {
            const c = Game.world.clumps[ci];
            if (!c.revealed) { c.progress += 1; touched.add(ci); }
          }
        }
        if (Math.random() >= Game.BASE_PRODUCE_CHANCE) continue;
        Game.terrainOutput(t).forEach(([id, n]) => {
          if (Game.addItemToInventory(id, n)) Game.state.civ += n;
        });
      }
    }
    touched.forEach(ci => {
      const c = Game.world.clumps[ci];
      if (c.progress >= c.cells.length * 2) Game.revealClump(c);
    });
    Game.saveState();
  }
  Game.baseProduce = baseProduce;

  function tick() {
    if (paused) { Game.drawWorld(); return; }
    Game.state.buildings.forEach(b => tickBuilding(b, Game.BUILDINGS[b.id]));
    baseTimer += speed;
    if (baseTimer >= Game.DAYS_PER_MONTH) { baseTimer = 0; baseProduce(); }
    popTimer += speed;
    if (popTimer >= Game.DAYS_PER_MONTH && Game.state.villagers < Game.hutCapacity()) {
      const spot = Game.findVillagerSpot(Game.state.villagersCells);
      if (spot) {
        Game.state.villagersCells.push(spot);
        Game.state.villagers++;
      }
      popTimer = 0;
      Game.saveState();
    }
    Game.state.day += speed;
    Game.displayDay += 1;
    updateStatus();
    Game.drawWorld();
    saveTick++;
    if (saveTick >= 5) {
      saveTick = 0;
      Game.saveState();
    }
  }
  Game.tick = tick;

  // ---------- 启动 ----------
  Game.loadState();
  Game.renderRecipeList();
  Game.renderUpgrades();
  Game.renderInventory();
  Game.renderCrafting();
  updateStatus();
  Game.drawWorld();
  setInterval(tick, 500);
})();
