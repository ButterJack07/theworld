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

  Game.world = { map: Game.generateMap(Game.seed) };

  document.getElementById('restart').addEventListener('click', () => {
    Game.seed = Math.floor(Math.random() * 1e9);
    Game.store.set(Game.SEED_KEY, String(Game.seed));
    Game.world.map = Game.generateMap(Game.seed);
    Game.resetState();
    Game.renderInventory();
    Game.renderCrafting();
    updateStatus();
    Game.drawWorld();
  });

  // ---------- 状态栏 ----------
  function updateStatus() {
    popEl.textContent = Game.state.villagers + ' / ' + Game.hutCapacity();
    civEl.textContent = Game.state.civ;
    const year = Math.floor((Game.displayDay - 1) / 365) + 1;
    const day = (Game.displayDay - 1) % 365 + 1;
    dateEl.textContent = `${year} 年 ${day} 天`;
    statusEl.innerHTML = '';
    const buildings = Game.state.buildings.map(b => ({ b, def: Game.BUILDINGS[b.id] }));
    buildings.forEach(({ def }) => {
      const row = document.createElement('div');
      row.className = 'info-row';
      const label = document.createElement('span');
      const items = def.produces.map(p => Game.ITEMS.find(i => i.id === p.item).name).join(' + ');
      label.textContent = `${def.name} · 每 ${def.interval}s 产出${items}`;
      const amt = document.createElement('b');
      amt.textContent = '+' + def.produces.reduce((s, p) => s + p.amount, 0);
      row.append(label, amt);
      statusEl.appendChild(row);
    });
  }
  Game.updateStatus = updateStatus;

  // ---------- 游戏循环 ----------
  let popTimer = 0;
  let saveTick = 0;

  function tickBuilding(b, def) {
    b.timer = (b.timer || 0) + speed;
    if (b.timer >= def.interval) {
      b.timer = 0;
      let produced = false;
      def.produces.forEach(p => {
        if (Game.addItemToInventory(p.item, p.amount)) {
          Game.state.civ += p.amount;
          produced = true;
        }
      });
      if (produced) Game.saveState();
    }
  }

  function tick() {
    if (paused) { Game.drawWorld(); return; }
    Game.state.buildings.forEach(b => tickBuilding(b, Game.BUILDINGS[b.id]));
    popTimer += speed;
    if (popTimer >= 20 && Game.state.villagers < Game.hutCapacity()) {
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
  Game.renderInventory();
  Game.renderCrafting();
  updateStatus();
  Game.drawWorld();
  setInterval(tick, 500);
})();
