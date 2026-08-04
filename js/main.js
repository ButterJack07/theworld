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
  // 打开时默认暂停游戏，关闭时恢复打开前的速度设置；打开时盖上半透明遮罩
  const settingsToggle = document.getElementById('settingsToggle');
  const settingsPanel = document.getElementById('settingsPanel');
  const settingsOverlay = document.getElementById('settingsOverlay');
  const settingsClose = document.getElementById('settingsClose');
  let savedMode = 0;
  function openSettings() {
    savedMode = mode;
    mode = 2;
    applyMode();
    updateControls();
    settingsPanel.classList.remove('hidden');
    settingsOverlay.classList.remove('hidden');
    settingsToggle.classList.add('open');
  }
  function closeSettings() {
    mode = savedMode;
    applyMode();
    updateControls();
    settingsPanel.classList.add('hidden');
    settingsOverlay.classList.add('hidden');
    settingsToggle.classList.remove('open');
  }
  settingsToggle.addEventListener('click', () => {
    if (settingsPanel.classList.contains('hidden')) openSettings();
    else closeSettings();
  });
  settingsClose.addEventListener('click', closeSettings);
  settingsOverlay.addEventListener('click', closeSettings);

  // 劳动力菜单：点击「👥 劳动力」按钮展开 / 收起左侧面板（与合成列表一致），展示当前劳动力分配情况
  const laborToggle = document.getElementById('laborToggle');
  const laborPanel = document.getElementById('laborPanel');
  laborToggle.addEventListener('click', () => {
    laborPanel.classList.toggle('hidden');
    laborToggle.classList.toggle('open', !laborPanel.classList.contains('hidden'));
    if (!laborPanel.classList.contains('hidden')) renderLabor();
  });

  function laborBuildings() {
    return Game.state.buildings.filter(b => (Game.BUILDINGS[b.id].laborCap || 0) > 0);
  }
  Game.laborBuildings = laborBuildings;

  function renderLabor() {
    const summaryEl = document.getElementById('laborSummary');
    const listEl = document.getElementById('laborList');
    if (!summaryEl || !listEl) return;
    const buildings = laborBuildings();
    const assigned = buildings.reduce((s, b) => s + (b.workers || 0), 0);
    const total = Game.state.villagers;
    const explorers = Math.max(0, total - assigned);
    summaryEl.innerHTML = '';
    const line = document.createElement('div');
    line.className = 'labor-summary';
    line.innerHTML = `总人口 <b>${total}</b>　已分配 <b>${assigned}</b>　探索者 <b>${explorers}</b>`;
    summaryEl.appendChild(line);

    listEl.innerHTML = '';
    if (!buildings.length && total === 0) {
      const empty = document.createElement('div');
      empty.className = 'labor-empty';
      empty.textContent = '尚无人口与生产力建筑\n先在地图上建造茅草屋与农田 / 伐木小屋等';
      listEl.appendChild(empty);
      return;
    }

    // 劳动力类型一览：探索者（空闲劳动力）+ 各生产工种，进度条表示占总人口的比例
    const rows = [];
    if (explorers > 0) rows.push({ icon: Game.explorerIconSVG(), name: '探索者', count: explorers });
    Game.LABOR_JOBS.forEach(job => {
      const workers = buildings
        .filter(b => Game.BUILDINGS[b.id].job === job.name)
        .reduce((s, b) => s + (b.workers || 0), 0);
      if (!workers) return;
      rows.push({ icon: Game.itemIconSVG(job.icon), name: job.name, count: workers });
    });

    rows.forEach(r => {
      const row = document.createElement('div');
      row.className = 'labor-row labor-job';

      const head = document.createElement('div');
      head.className = 'labor-row-head';

      const icon = document.createElement('span');
      icon.className = 'labor-icon';
      icon.innerHTML = r.icon;

      const name = document.createElement('span');
      name.className = 'labor-name';
      name.textContent = r.name;

      const count = document.createElement('span');
      count.className = 'labor-count';
      count.textContent = `${r.count} 人`;

      head.append(icon, name, count);
      row.appendChild(head);

      const bar = document.createElement('div');
      bar.className = 'labor-bar';
      const fill = document.createElement('div');
      fill.className = 'labor-bar-fill';
      fill.style.width = Math.round((r.count / Math.max(1, total)) * 100) + '%';
      bar.appendChild(fill);
      row.appendChild(bar);

      listEl.appendChild(row);
    });

    const hint = document.createElement('div');
    hint.className = 'labor-hint';
    hint.textContent = '空闲劳动力自动担任探索者，为基地采集资源\n点击地图上的生产力建筑，在信息面板中分配劳动力';
    listEl.appendChild(hint);
  }
  Game.renderLabor = renderLabor;

  // 分配劳动力弹窗：信息面板中点击「劳动力分配」打开，显示当前 / 最多劳动力并 +/− 调整
  let assignBuilding = null;

  function totalAssigned() {
    return laborBuildings().reduce((s, b) => s + (b.workers || 0), 0);
  }
  Game.totalAssigned = totalAssigned;

  function openAssign(b) {
    assignBuilding = b;
    document.getElementById('assignOverlay').classList.remove('hidden');
    document.getElementById('assignPanel').classList.remove('hidden');
    renderAssign();
  }
  Game.openAssign = openAssign;

  function closeAssign() {
    assignBuilding = null;
    document.getElementById('assignOverlay').classList.add('hidden');
    document.getElementById('assignPanel').classList.add('hidden');
  }
  Game.closeAssign = closeAssign;
  document.getElementById('assignClose').addEventListener('click', closeAssign);
  document.getElementById('assignOverlay').addEventListener('click', closeAssign);

  function renderAssign() {
    const body = document.getElementById('assignBody');
    if (!body || !assignBuilding) return;
    const b = assignBuilding;
    const def = Game.BUILDINGS[b.id];
    const laborCap = def.laborCap || 0;
    const workers = b.workers || 0;
    const idle = Math.max(0, Game.state.villagers - totalAssigned());

    body.innerHTML = '';

    const head = document.createElement('div');
    head.className = 'assign-head';
    const icon = document.createElement('span');
    icon.className = 'assign-icon';
    icon.innerHTML = Game.itemIconSVG(b.id);
    const name = document.createElement('span');
    name.className = 'assign-name';
    name.textContent = `${def.name} · ${def.job}`;
    head.append(icon, name);
    body.appendChild(head);

    const stats = document.createElement('div');
    stats.className = 'assign-stats';
    [
      ['已分配', `${workers} / ${laborCap}`],
      ['当前空闲人口（探索者）', `${idle} 人`]
    ].forEach(([label, value]) => {
      const line = document.createElement('div');
      line.className = 'assign-line';
      const l = document.createElement('span');
      l.textContent = label;
      const v = document.createElement('span');
      v.innerHTML = `<b>${value}</b>`;
      line.append(l, v);
      stats.appendChild(line);
    });
    body.appendChild(stats);

    const ctrl = document.createElement('div');
    ctrl.className = 'assign-ctrl';
    const minus = document.createElement('button');
    minus.className = 'labor-btn';
    minus.textContent = '−';
    minus.disabled = workers <= 0;
    minus.addEventListener('click', () => {
      b.workers = Math.max(0, workers - 1);
      Game.saveState();
      Game.renderLabor();
      Game.updateStatus();
      renderAssign();
    });
    const count = document.createElement('span');
    count.className = 'assign-count';
    count.textContent = `${workers} 人`;
    const plus = document.createElement('button');
    plus.className = 'labor-btn';
    plus.textContent = '+';
    plus.disabled = workers >= laborCap || idle <= 0;
    plus.addEventListener('click', () => {
      b.workers = Math.min(laborCap, workers + 1);
      Game.saveState();
      Game.renderLabor();
      Game.updateStatus();
      renderAssign();
    });
    ctrl.append(minus, count, plus);
    body.appendChild(ctrl);

    const note = document.createElement('div');
    note.className = 'assign-note';
    note.textContent = '空闲人口不足时无法继续分配\n点击 + / − 调整此建筑的劳动力';
    body.appendChild(note);
  }
  settingsPanel.querySelectorAll('.settings-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      settingsPanel.querySelectorAll('.settings-tab').forEach(b => b.classList.toggle('active', b === btn));
      settingsPanel.querySelectorAll('.settings-page').forEach(p => p.classList.toggle('active', p.id === 'page-' + btn.dataset.tab));
    });
  });

  // 世界在进入具体模式时按该模式的种子生成（见 startNewGame / resumeGame）

  // 重新播放开场动画：标题逐字浮现 + 组件错峰浮入
  function playIntro() {
    const app = document.getElementById('app');
    if (!app) return;
    app.classList.remove('intro');
    void app.offsetWidth;
    app.classList.add('intro');
  }

  document.getElementById('restart').addEventListener('click', () => {
    // 自由模式无胜利判定：返回主菜单时以当前文明指数记录一次成绩
    if (Game.state && Game.state.mode === 'freedom' && Game.state.civ > 0) {
      recordRanking('freedom', Game.state.day, Game.state.civ);
    }
    closeSettings();
    showStartMenu();
  });

  // ---------- 开始菜单与新模式 ----------
  function showStartMenu() {
    document.getElementById('startMenu').classList.remove('hidden');
    mode = 2;
    applyMode();
    updateControls();
  }
  Game.showStartMenu = showStartMenu;

  function hideStartMenu() {
    document.getElementById('startMenu').classList.add('hidden');
  }

  // 开始菜单点选模式：该模式有历史记录 → 询问继续 / 重新开始；否则直接开新档
  let choiceMode = null;
  function onSelectMode(modeId) {
    if (Game.hasSave(modeId)) {
      showChoice(modeId, Game.readSave(modeId));
    } else {
      Game.startNewGame(modeId);
    }
  }

  function showChoice(modeId, saved) {
    choiceMode = modeId;
    document.getElementById('choiceMode').textContent = Game.modeName(modeId);
    document.getElementById('choiceInfo').textContent =
      `历时 ${formatElapsed(saved.day || 1)} · 文明指数 ${saved.civ || 0}`;
    document.getElementById('choiceOverlay').classList.remove('hidden');
    document.getElementById('choicePanel').classList.remove('hidden');
  }

  function hideChoice() {
    document.getElementById('choiceOverlay').classList.add('hidden');
    document.getElementById('choicePanel').classList.add('hidden');
  }
  document.getElementById('choiceOverlay').addEventListener('click', hideChoice);
  document.getElementById('choiceResume').addEventListener('click', () => {
    const id = choiceMode;
    hideChoice();
    if (id) Game.resumeGame(id);
  });
  document.getElementById('choiceRestart').addEventListener('click', () => {
    const id = choiceMode;
    hideChoice();
    if (id) Game.startNewGame(id);
  });

  function renderModeList() {
    const list = document.getElementById('modeList');
    if (!list) return;
    list.innerHTML = '';
    Game.GAME_MODES.forEach(m => {
      const card = document.createElement('div');
      card.className = 'mode-card' + (m.locked ? ' locked' : '');

      const icon = document.createElement('div');
      icon.className = 'mode-icon';
      icon.innerHTML = m.icon;

      const name = document.createElement('div');
      name.className = 'mode-name';
      name.textContent = m.name;

      const desc = document.createElement('div');
      desc.className = 'mode-desc';
      desc.textContent = m.desc;

      card.append(icon, name, desc);
      if (m.locked) {
        const lock = document.createElement('div');
        lock.className = 'mode-lock';
        lock.textContent = m.lockNote || '尚未开放';
        card.appendChild(lock);
        card.title = m.lockNote || '尚未开放';
      } else {
        card.addEventListener('click', () => onSelectMode(m.id));
      }
      list.appendChild(card);
    });
  }

  Game.startNewGame = function (modeId) {
    Game.mode = modeId;
    Game.seed = Math.floor(Math.random() * 1e9);
    Game.store.set(Game.seedKey(modeId), String(Game.seed));
    Game.world = Game.generateWorld(Game.seed);
    Game.resetState(modeId);
    Game.selectedBuilding = null;
    Game.selectedBase = false;
    Game.selectedTerrain = null;
    Game.selectedItem = null;
    mode = 0;
    applyMode();
    updateControls();
    Game.renderRecipeList();
    Game.renderUpgrades();
    Game.renderInventory();
    Game.renderCrafting();
    updateModeLabel();
    updateStatus();
    Game.drawWorld();
    hideStartMenu();
    playIntro();
  };

  Game.resumeGame = function (modeId) {
    Game.mode = modeId;
    Game.seed = parseInt(Game.store.get(Game.seedKey(modeId)), 10);
    Game.world = Game.generateWorld(Game.seed);
    Game.loadState();
    Game.selectedBuilding = null;
    Game.selectedBase = false;
    Game.selectedTerrain = null;
    Game.selectedItem = null;
    mode = 0;
    applyMode();
    updateControls();
    Game.renderRecipeList();
    Game.renderUpgrades();
    Game.renderInventory();
    Game.renderCrafting();
    updateModeLabel();
    updateStatus();
    Game.drawWorld();
    hideStartMenu();
    playIntro();
  };

  function updateModeLabel() {
    const el = document.getElementById('modeLabel');
    if (!el) return;
    const id = Game.state && Game.state.mode;
    const def = Game.GAME_MODES.find(m => m.id === id);
    el.textContent = def ? def.name.replace('模式', '') : '';
  }

  // ---------- 胜利与成绩排名 ----------
  const RANK_KEY = 'tw-rank';
  Game.RANK_KEY = RANK_KEY;
  Game.rankings = (() => {
    try { return JSON.parse(Game.store.get(RANK_KEY) || '{}'); } catch (e) { return {}; }
  })();

  // 归一化：兼容旧版纯天数（数字）记录 → 统一为 { d, c } 对象（d = 历时天数, c = 文明指数）
  (function normalizeRanks() {
    let changed = false;
    Game.GAME_MODES.forEach(m => {
      const list = Game.rankings[m.id];
      if (!Array.isArray(list)) return;
      Game.rankings[m.id] = list.map(e => {
        if (typeof e === 'number') { changed = true; return { d: e, c: 0 }; }
        return { d: Number(e.d) || 0, c: Number(e.c) || 0 };
      });
    });
    if (changed) saveRankings();
  })();

  function saveRankings() {
    Game.store.set(RANK_KEY, JSON.stringify(Game.rankings));
  }

  // 取某模式的排名列表（已排序、截取前 10）：文明 / 科技按历时升序，自由按文明指数降序
  function rankEntries(mode) {
    const list = Game.rankings[mode];
    if (!Array.isArray(list)) return [];
    const entries = [];
    list.forEach(e => {
      if (typeof e === 'number') entries.push({ d: e, c: 0 });
      else if (e && typeof e === 'object') entries.push({ d: Number(e.d) || 0, c: Number(e.c) || 0 });
    });
    if (mode === 'freedom') entries.sort((a, b) => b.c - a.c);
    else entries.sort((a, b) => a.d - b.d);
    return entries.slice(0, 10);
  }
  Game.rankEntries = rankEntries;

  // 记录一条成绩并持久化，返回 { list, index }：index 为刚写入条目在榜单中的位置（-1 表示未进前 10）
  function recordRanking(mode, day, civ) {
    const list = Game.rankings[mode] || [];
    const entry = { d: day, c: civ };
    list.push(entry);
    if (mode === 'freedom') list.sort((a, b) => b.c - a.c);
    else list.sort((a, b) => a.d - b.d);
    const trimmed = list.slice(0, 10);
    Game.rankings[mode] = trimmed;
    saveRankings();
    updateRankEntry();
    return { list: trimmed, index: trimmed.indexOf(entry) };
  }
  Game.recordRanking = recordRanking;

  function formatElapsed(days) {
    const y = Math.floor((days - 1) / Game.DAYS_PER_YEAR) + 1;
    const m = Math.floor(((days - 1) % Game.DAYS_PER_YEAR) / Game.DAYS_PER_MONTH) + 1;
    const d = ((days - 1) % Game.DAYS_PER_MONTH) + 1;
    return `${y} 年 ${m} 月 ${d} 天`;
  }

  // 榜单中一条成绩的展示文本：自由模式按文明指数，其余按历时
  function rankScoreText(mode, e) {
    return mode === 'freedom' ? String(e.c) : formatElapsed(e.d);
  }

  let victorySavedMode = 0;
  function showVictory() {
    victorySavedMode = mode;
    mode = 2;
    applyMode();
    updateControls();

    const rec = recordRanking(Game.state.mode, Game.state.day, Game.state.civ);
    const list = rec.list;
    const myRank = rec.index;

    document.getElementById('victoryMode').textContent = Game.modeName(Game.state.mode);
    document.getElementById('victoryTime').textContent = `历时 ${formatElapsed(Game.state.day)}`;
    document.getElementById('victoryScore').textContent = `文明指数 ${Game.state.civ}`;

    const rankEl = document.getElementById('victoryRank');
    rankEl.innerHTML = '';
    const title = document.createElement('div');
    title.className = 'victory-rank-title';
    title.textContent = `${Game.modeName(Game.state.mode)} · 历史最佳成绩`;
    rankEl.appendChild(title);

    list.forEach((e, i) => {
      const row = document.createElement('div');
      row.className = 'rank-row' + (i === myRank ? ' me' : '');
      const no = document.createElement('span');
      no.className = 'rank-no';
      no.textContent = String(i + 1);
      const time = document.createElement('span');
      time.textContent = rankScoreText(Game.state.mode, e);
      row.append(no, time);
      rankEl.appendChild(row);
    });

    document.getElementById('victoryOverlay').classList.remove('hidden');
    document.getElementById('victoryPanel').classList.remove('hidden');
  }
  Game.showVictory = showVictory;

  function hideVictory() {
    document.getElementById('victoryOverlay').classList.add('hidden');
    document.getElementById('victoryPanel').classList.add('hidden');
  }
  document.getElementById('victoryContinue').addEventListener('click', () => {
    hideVictory();
    mode = victorySavedMode;
    applyMode();
    updateControls();
  });
  document.getElementById('victoryMenu').addEventListener('click', () => {
    hideVictory();
    mode = victorySavedMode;
    applyMode();
    updateControls();
    showStartMenu();
  });

  // ---------- 排行榜 ----------
  let rankSource = 'local';
  let rankMode = 'civilization';

  function rankTotalCount() {
    return Game.GAME_MODES.reduce((s, m) => s + (Array.isArray(Game.rankings[m.id]) ? Game.rankings[m.id].length : 0), 0);
  }

  function updateRankEntry() {
    const el = document.getElementById('rankCount');
    if (!el) return;
    const n = rankTotalCount();
    el.textContent = n ? String(n) : '';
  }
  Game.updateRankEntry = updateRankEntry;

  function rankEmptyHint(mode) {
    const def = Game.GAME_MODES.find(m => m.id === mode);
    if (def && def.locked) return '该模式尚未开放 · 暂无成绩记录';
    if (mode === 'freedom') return '返回主菜单时自动记录当前文明指数';
    return '文明指数达到 9999 即获胜，自动收录成绩';
  }

  function renderRankModeTabs() {
    const wrap = document.getElementById('rankModeTabs');
    wrap.innerHTML = '';
    Game.GAME_MODES.forEach(m => {
      const btn = document.createElement('button');
      btn.className = 'rank-mode-tab' + (rankMode === m.id ? ' active' : '') + (m.locked ? ' locked' : '');
      const icon = document.createElement('span');
      icon.className = 'rank-mode-icon';
      icon.innerHTML = m.icon;
      const name = document.createElement('span');
      name.textContent = m.name.replace('模式', '');
      btn.append(icon, name);
      btn.addEventListener('click', () => {
        rankMode = m.id;
        renderRankModeTabs();
        renderRankBody();
      });
      wrap.appendChild(btn);
    });
  }

  function renderRankBody() {
    const body = document.getElementById('rankBody');
    body.innerHTML = '';
    if (rankSource === 'network') {
      const note = document.createElement('div');
      note.className = 'rank-empty';
      note.textContent = '网络排行暂未开放 · 敬请期待';
      body.appendChild(note);
      return;
    }
    const list = rankEntries(rankMode);
    if (!list.length) {
      const empty = document.createElement('div');
      empty.className = 'rank-empty';
      empty.textContent = rankEmptyHint(rankMode);
      body.appendChild(empty);
      return;
    }
    const head = document.createElement('div');
    head.className = 'rank-head';
    const hl = document.createElement('span');
    hl.textContent = '排名';
    const hr = document.createElement('span');
    hr.textContent = rankMode === 'freedom' ? '文明指数' : '历时';
    head.append(hl, hr);
    body.appendChild(head);

    list.forEach((e, i) => {
      const row = document.createElement('div');
      row.className = 'rank-row' + (i === 0 ? ' top' : '');
      const no = document.createElement('span');
      no.className = 'rank-no';
      no.textContent = String(i + 1);
      const score = document.createElement('span');
      score.textContent = rankScoreText(rankMode, e);
      row.append(no, score);
      body.appendChild(row);
    });
  }

  function renderLeaderboard() {
    document.querySelectorAll('.rank-tab').forEach(b => b.classList.toggle('active', b.dataset.source === rankSource));
    renderRankModeTabs();
    renderRankBody();
    updateRankEntry();
  }
  Game.renderLeaderboard = renderLeaderboard;

  function openLeaderboard() {
    rankSource = 'local';
    rankMode = 'civilization';
    document.getElementById('rankOverlay').classList.remove('hidden');
    document.getElementById('rankPanel').classList.remove('hidden');
    renderLeaderboard();
  }
  Game.openLeaderboard = openLeaderboard;

  function closeLeaderboard() {
    document.getElementById('rankOverlay').classList.add('hidden');
    document.getElementById('rankPanel').classList.add('hidden');
  }
  Game.closeLeaderboard = closeLeaderboard;

  document.getElementById('rankEntry').addEventListener('click', openLeaderboard);
  document.getElementById('rankOverlay').addEventListener('click', closeLeaderboard);
  document.getElementById('rankClose').addEventListener('click', closeLeaderboard);
  document.querySelectorAll('.rank-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      rankSource = btn.dataset.source;
      renderLeaderboard();
    });
  });

  // ---------- 新手指南 ----------
  function animateNumber(el, from, to, ms) {
    if (!el) return;
    const t0 = performance.now();
    function frame(t) {
      const p = Math.min(1, (t - t0) / ms);
      el.textContent = Math.round(from + (to - from) * p);
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  const GUIDE_PAGES = [
    {
      scene() {
        return `
        <div class="gs-scene gs-welcome">
          <div class="gs-hill"></div>
          <div class="gs-tree gs-t1"></div>
          <div class="gs-tree gs-t2"></div>
          <div class="gs-tree gs-t3"></div>
          <div class="gs-sea"></div>
          <div class="gs-base">
            <div class="gs-town">${Game.itemIconSVG('towncenter')}</div>
            <span class="gs-explorer gs-e1">${Game.explorerIconSVG()}</span>
            <span class="gs-explorer gs-e2">${Game.explorerIconSVG()}</span>
          </div>
          <div class="gs-civbar"><span>文明指数</span><b class="gs-civnum">0</b></div>
        </div>`;
      },
      text: `<div class="guide-page-title">欢迎来到 The World</div>
<p>这是一款<b>放置经营游戏</b>——让时间慢慢走，你的文明会自己长大。你只需要规划节奏：先建什么、把劳动力放哪里、基地往哪边扩。</p>
<ul>
  <li><b>目标</b>：从一座城镇中心起步，把文明指数发展到 <b>9999</b> 即获胜（文明模式）。</li>
  <li><b>核心循环</b>：基地采集 → 合成建筑 → 分配劳动力 → 扩张升级。</li>
  <li>初始 2 名探索者会自动采集，无需时刻操作。</li>
</ul>`,
      onShow(stage) {
        const n = stage.querySelector('.gs-civnum');
        if (n) animateNumber(n, 0, 120, 1400);
      }
    },
    {
      scene() {
        return `
        <div class="gs-scene gs-layout">
          <div class="gs-l-top">
            <span class="gs-l-date">1 年 1 月</span>
            <div class="gs-l-pills">
              <span class="gs-l-pill">人口 1/5</span>
              <span class="gs-l-pill gs-l-pill-civ">文明 0</span>
              <span class="gs-l-pill">模式</span>
            </div>
          </div>
          <div class="gs-l-main">
            <div class="gs-l-left">
              <div class="gs-l-block gs-l-info">信息面板</div>
              <div class="gs-l-block gs-l-inv">物品栏</div>
            </div>
            <div class="gs-l-block gs-l-map">地图 · 基地</div>
            <div class="gs-l-block gs-l-craft">合成器</div>
          </div>
          <div class="gs-l-btns"><i>⚙️</i><i>📜</i><i>🏗️</i><i>▶</i></div>
        </div>`;
      },
      text: `<div class="guide-page-title">认识界面</div>
<p>画面上会按顺序循环高亮每个区域，跟着它走一遍：</p>
<ul>
  <li><b>中央地图</b>：摆放建筑、拖动基地、观察地貌。</li>
  <li><b>信息面板</b>：点击建筑 / 地块后显示详细数据。</li>
  <li><b>物品栏</b>：存放材料与合成好的建筑。</li>
  <li><b>合成器</b>：放入材料，合成新物品。</li>
  <li>右上角状态胶囊：人口 / 文明程度 / 模式。</li>
  <li>左上角按钮：⚙️ 设置 · 📜 合成 · 🏗️ 扩建 · ▶ 速度。</li>
</ul>`
    },
    {
      scene() {
        const map = ['FPMF', 'PFMF', 'MMPP', 'PFFP'];
        const cells = [];
        map.forEach(r => r.split('').forEach(c => {
          const cls = c === 'F' ? 'forest' : c === 'M' ? 'mtn' : 'plain';
          cells.push(`<span class="gs-cell gs-cell-${cls}"></span>`);
        }));
        return `
        <div class="gs-scene gs-gather">
          <div class="gs-gather-grid">${cells.join('')}</div>
          <div class="gs-gather-base"></div>
          <div class="gs-gather-exp">探索者 ×2</div>
          <span class="gs-flow-icon gs-flow-wood">${Game.itemIconSVG('wood')}</span>
          <span class="gs-flow-icon gs-flow-stone">${Game.itemIconSVG('stone')}</span>
          <span class="gs-flow-icon gs-flow-iron">${Game.itemIconSVG('iron')}</span>
          <div class="gs-gather-inv">物品栏</div>
        </div>`;
      },
      text: `<div class="guide-page-title">基地采集</div>
<p><b>基地</b>（地图上的灰色窗口）是你自动采集的引擎：</p>
<ul>
  <li>每月产出次数 = <b>探索者人数</b>（空闲人口）。</li>
  <li>产出内容按基地覆盖的<b>地貌加权</b>决定：森林多→多出木头，山地多→多出石头。</li>
  <li>把基地扩到更富的地貌上，产出更丰富、揭示更快。</li>
</ul>`
    },
    {
      scene() {
        return `
        <div class="gs-scene gs-craft">
          <span class="gs-craft-ghost gs-craft-ghost-a">${Game.itemIconSVG('wood')}</span>
          <span class="gs-craft-ghost gs-craft-ghost-b">${Game.itemIconSVG('stone')}</span>
          <div class="gs-craft-src">
            <div class="gs-craft-slot">${Game.itemIconSVG('wood')}</div>
            <div class="gs-craft-slot">${Game.itemIconSVG('stone')}</div>
          </div>
          <div class="gs-craft-arrow">➜</div>
          <div class="gs-craft-grid">
            <span class="gs-craft-cell">${Game.itemIconSVG('wood')}</span>
            <span class="gs-craft-cell">${Game.itemIconSVG('stone')}</span>
            ${'<span class="gs-craft-cell"></span>'.repeat(7)}
          </div>
          <div class="gs-craft-btn">合成</div>
          <div class="gs-craft-product">
            <span class="gs-craft-product-ico">${Game.itemIconSVG('hut')}</span>
            <span>茅草屋</span>
          </div>
        </div>`;
      },
      text: `<div class="guide-page-title">合成建筑</div>
<p>把材料<b>拖进合成器</b>，点击「合成」得到成品：</p>
<ul>
  <li>先用基础材料合成<b>建材</b>：木板（2 木头）、砖块（2 石头 + 1 铁矿）…</li>
  <li>再用建材合成<b>建筑</b>：茅草屋、伐木小屋、农田…</li>
  <li>合成好的建筑会进入<b>物品栏</b>，随后拖到地图上安装。</li>
</ul>`
    },
    {
      scene() {
        const map = ['PPPPPSSP', 'FFPMMSSP', 'PPPPSSSP', 'MPPPSSSP'];
        const cells = [];
        map.forEach(r => r.split('').forEach(c => {
          const cls = c === 'F' ? 'forest' : c === 'M' ? 'mtn' : c === 'S' ? 'sea' : 'plain';
          cells.push(`<span class="gs-place-cell gs-cell-${cls}"></span>`);
        }));
        return `
        <div class="gs-scene gs-place">
          <div class="gs-place-map">${cells.join('')}</div>
          <div class="gs-place-ghost">${Game.itemIconSVG('hut')}</div>
          <div class="gs-place-legend"><i class="gs-ok"></i>可放置<i class="gs-bad"></i>不可放置</div>
        </div>`;
      },
      text: `<div class="guide-page-title">摆放建筑</div>
<p>从物品栏把建筑<b>拖到地图</b>上：</p>
<ul>
  <li><b>蓝框</b> = 可以放；<b>红框</b> = 不能放（被挡或落在海里）。</li>
  <li>部分建筑有地形要求：伐木小屋须在<b>森林</b>、采矿小屋须在<b>山地 / 矿洞</b>、钓船小屋须<b>临水</b>、牧场须在<b>已揭示草原</b>。</li>
  <li>放不下时，把基地扩到正确地形附近再放。</li>
</ul>`
    },
    {
      scene() {
        return `
        <div class="gs-scene gs-labor">
          <div class="gs-labor-card">
            <div class="gs-labor-head">
              <span class="gs-labor-ico">${Game.itemIconSVG('lumber')}</span>
              <span>伐木小屋 · 伐木工</span>
            </div>
            <div class="gs-labor-line">每月生产 <b>5 木头 / 人</b></div>
            <div class="gs-labor-ctrl"><button class="minus">−</button><b class="gs-worknum">0</b><button class="plus">+</button></div>
            <div class="gs-labor-note">点击建筑 → 分配劳动力</div>
          </div>
          <div class="gs-labor-split">
            <div class="gs-labor-part"><span class="gs-dot gs-dot-work"></span>工人 <b class="gs-worknum2">0</b></div>
            <div class="gs-labor-bar"><i class="gs-bar-work"></i></div>
            <div class="gs-labor-part"><span class="gs-dot gs-dot-exp"></span>探索者 <b class="gs-expnum">8</b></div>
            <div class="gs-labor-bar"><i class="gs-bar-exp"></i></div>
            <div class="gs-labor-note2">人口 8</div>
          </div>
        </div>`;
      },
      text: `<div class="guide-page-title">分配劳动力</div>
<p>点击生产建筑 → 点「👥 劳动力分配」，用 <b>+ / −</b> 安排工人：</p>
<ul>
  <li>每个工人每月产出一份，人越多产出越多。</li>
  <li><b>总人口 − 已分配 = 探索者</b>：探索者负责基地采集与地貌揭示。</li>
  <li>工人塞太多会让探索者不足、基地采集变慢，初期注意平衡。</li>
</ul>`,
      onShow(stage) {
        animateNumber(stage.querySelector('.gs-worknum'), 0, 4, 1200);
        animateNumber(stage.querySelector('.gs-worknum2'), 0, 4, 1200);
        animateNumber(stage.querySelector('.gs-expnum'), 8, 4, 1200);
        const bw = stage.querySelector('.gs-bar-work');
        if (bw) bw.style.width = '50%';
        const be = stage.querySelector('.gs-bar-exp');
        if (be) be.style.width = '50%';
      }
    },
    {
      scene() {
        return `
        <div class="gs-scene gs-expand">
          <div class="gs-expand-wrap">
            <div class="gs-expand-target"></div>
            <div class="gs-expand-base"></div>
            <div class="gs-expand-label">拖动边框扩张基地</div>
          </div>
          <div class="gs-expand-arrow">➜</div>
          <div class="gs-expand-merge">
            <span class="gs-merge-hut gs-mh1">${Game.itemIconSVG('hut')}</span>
            <span class="gs-merge-hut gs-mh2">${Game.itemIconSVG('hut')}</span>
            <span class="gs-merge-hut gs-mh3">${Game.itemIconSVG('hut')}</span>
            <span class="gs-merge-hut gs-mh4">${Game.itemIconSVG('hut')}</span>
            <span class="gs-merge-out">${Game.itemIconSVG('brickhouse')}</span>
          </div>
        </div>`;
      },
      text: `<div class="guide-page-title">扩张与合并升级</div>
<ul>
  <li><b>拖动基地边角</b>扩大覆盖：覆盖更多、更富的地貌，采集更快。</li>
  <li>把 <b>4 个低级建筑摆成 2×2</b>，会自动合并升级：茅草屋→砖瓦屋→四合院、伐木小屋→伐木工场、农田→农庄…</li>
  <li>合并后<b>劳动力上限提到 5</b>、产能大增，工人会自动结转。</li>
  <li>「🏗️ 扩建」面板可查看全部升级规则。</li>
</ul>`
    }
  ];

  let guideIndex = 0;
  function showGuidePage(i) {
    guideIndex = Math.max(0, Math.min(GUIDE_PAGES.length - 1, i));
    const page = GUIDE_PAGES[guideIndex];
    const stage = document.getElementById('guideStage');
    stage.innerHTML = page.scene();
    document.getElementById('guideDesc').innerHTML = page.text;
    document.getElementById('guidePrev').disabled = guideIndex === 0;
    document.getElementById('guideNext').disabled = guideIndex === GUIDE_PAGES.length - 1;
    const dots = document.getElementById('guideDots');
    dots.innerHTML = '';
    GUIDE_PAGES.forEach((_, j) => {
      const d = document.createElement('span');
      d.className = 'guide-dot' + (j === guideIndex ? ' active' : '');
      d.addEventListener('click', () => showGuidePage(j));
      dots.appendChild(d);
    });
    if (page.onShow) page.onShow(stage);
  }
  Game.showGuidePage = showGuidePage;

  function openGuide() {
    document.getElementById('guideOverlay').classList.remove('hidden');
    document.getElementById('guidePanel').classList.remove('hidden');
    showGuidePage(0);
  }
  Game.openGuide = openGuide;

  function closeGuide() {
    document.getElementById('guideOverlay').classList.add('hidden');
    document.getElementById('guidePanel').classList.add('hidden');
  }
  Game.closeGuide = closeGuide;

  document.getElementById('guideEntry').addEventListener('click', openGuide);
  document.getElementById('guideOverlay').addEventListener('click', closeGuide);
  document.getElementById('guideClose').addEventListener('click', closeGuide);
  document.getElementById('guidePrev').addEventListener('click', () => showGuidePage(guideIndex - 1));
  document.getElementById('guideNext').addEventListener('click', () => showGuidePage(guideIndex + 1));

  // ---------- 状态栏：展示点选地图上建筑的信息 ----------
  Game.selectedBuilding = null;
  Game.selectedBase = false;
  Game.selectedTerrain = null;   // 双击选择的地块地貌 { t, x, y }
  Game.selectedItem = null;      // 单击物品栏 / 合成器中的物品

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
    if (Game.selectedItem) { renderItemInfo(Game.selectedItem); return; }
  }

  // 单击物品栏 / 合成器中的物品：展示图标、名称与简介
  function renderItemInfo(item) {
    const card = document.createElement('div');
    card.className = 'build-info';

    const head = document.createElement('div');
    head.className = 'bi-head';
    const icon = document.createElement('span');
    icon.className = 'bi-icon';
    icon.innerHTML = Game.itemIconSVG(item.id);
    const title = document.createElement('div');
    title.className = 'bi-title';
    title.textContent = item.name;
    head.append(icon, title);
    card.appendChild(head);

    if (item.desc) {
      const line = document.createElement('div');
      line.className = 'bi-line';
      const val = document.createElement('span');
      val.className = 'bi-val bi-desc';
      val.textContent = item.desc;
      line.append(val);
      card.appendChild(line);
    }

    statusEl.appendChild(card);
  }
  Game.renderItemInfo = renderItemInfo;

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

    const laborCap = def.laborCap || 0;
    const workers = b.workers || 0;

    if (laborCap > 0) {
      if (!workers) {
        const line = document.createElement('div');
        line.className = 'bi-line bi-nolabor';
        const val = document.createElement('span');
        val.className = 'bi-val';
        val.textContent = '请分配劳动力到该生产建筑';
        line.append(val);
        card.appendChild(line);
      } else {
        def.produces.forEach(p => {
          const base = typeof p.amount === 'function' ? 1 : p.amount;
          const amount = base * workers;
          const itemId = typeof p.item === 'function' ? null : p.item;
          const line = document.createElement('div');
          line.className = 'bi-line';
          const label = document.createElement('span');
          label.className = 'bi-label';
          label.textContent = '每月生产';
          const val = document.createElement('span');
          val.className = 'bi-val';
          if (itemId) {
            const item = Game.ITEMS.find(i => i.id === itemId);
            const vIcon = document.createElement('span');
            vIcon.className = 'bi-icon-sm';
            vIcon.innerHTML = Game.itemIconSVG(item.id);
            const vName = document.createElement('span');
            vName.textContent = `${item.name}  +${amount}`;
            val.append(vIcon, vName);
          } else {
            val.textContent = `矿物  +${amount}`;
          }
          line.append(label, val);
          card.appendChild(line);
        });
      }
    }

    if (def.capacity) {
      const foot = document.createElement('div');
      foot.className = 'bi-foot';
      foot.textContent = `住宅容量  ${def.capacity} 人 / 座`;
      card.appendChild(foot);
    }

    if (laborCap > 0) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'bi-labor-btn';
      btn.textContent = '👥 劳动力分配';
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        Game.openAssign(b);
      });
      card.appendChild(btn);
    }

    statusEl.appendChild(card);
  }
  Game.updateStatus = updateStatus;

  // ---------- 游戏循环 ----------
  let popTimer = 0;
  let saveTick = 0;

  function tickBuilding(b, def) {
    const laborCap = def.laborCap || 0;
    if (!laborCap) return;
    b.timer = (b.timer || 0) + speed;
    if (b.timer >= def.interval * Game.DAYS_PER_MONTH) {
      b.timer = 0;
      if (!b.workers) return;
      let produced = false;
      // 生产力建筑：n 个劳动力 → 每个劳动力按基准 x 独立产出一次（含矿物等随机产出）
      for (let i = 0; i < b.workers; i++) {
        def.produces.forEach(p => {
          const itemId = typeof p.item === 'function' ? p.item() : p.item;
          const amount = typeof p.amount === 'function' ? p.amount() : p.amount;
          if (Game.addItemToInventory(itemId, amount)) {
            Game.state.civ += amount;
            produced = true;
          }
        });
      }
      if (produced) Game.saveState();
    }
  }

  // 基地产出：空闲劳动力视为探索者，每月产出次数 = 探索者人数（基地每月最大生产值）
  // 每次产出按基地覆盖地块的类型与数量加权平均决定内容（覆盖哪类地貌多，产出该类概率越高）
  // 团的揭示进度：每格每月增速 = 探索者人数，即该团每月揭示进度 = 团内覆盖格数 × 探索者人数
  // 揭示阈值 = 团格数 × 2
  let baseTimer = 0;
  function baseProduce() {
    const b = Game.base;
    if (!b || !Game.world) return;
    const cells = [];
    for (let y = b.y; y < b.y + b.h; y++) {
      for (let x = b.x; x < b.x + b.w; x++) {
        if (x < 0 || x >= Game.MAP_W || y < 0 || y >= Game.MAP_H) continue;
        cells.push([x, y]);
      }
    }
    if (!cells.length) return;
    const explorers = Math.max(0, Game.state.villagers - totalAssigned());
    const touched = new Set();
    for (const [x, y] of cells) {
      const raw = Game.world.terrain[y][x];
      if (raw != null) {
        const ci = Game.world.clumpIndex[y][x];
        if (ci >= 0) {
          const c = Game.world.clumps[ci];
          if (!c.revealed) { c.progress += explorers; touched.add(ci); }
        }
      }
    }
    for (let i = 0; i < explorers; i++) {
      const [x, y] = cells[Math.floor(Math.random() * cells.length)];
      const raw = Game.world.terrain[y][x];
      const t = raw == null ? Game.TERRAIN.SEA : raw;
      Game.terrainOutput(t).forEach(([id, n]) => {
        if (Game.addItemToInventory(id, n)) Game.state.civ += n;
      });
    }
    touched.forEach(ci => {
      const c = Game.world.clumps[ci];
      if (c.progress >= c.cells.length * 2) Game.revealClump(c);
    });
    Game.saveState();
  }
  Game.baseProduce = baseProduce;

  function tick() {
    if (!Game.state) return;
    if (paused) { Game.drawWorld(); return; }
    Game.state.buildings.forEach(b => tickBuilding(b, Game.BUILDINGS[b.id]));
    baseTimer += speed;
    if (baseTimer >= Game.DAYS_PER_MONTH) { baseTimer = 0; baseProduce(); }
    popTimer += speed;
    if (popTimer >= Game.DAYS_PER_MONTH) {
      popTimer = 0;
      const cap = Game.hutCapacity();
        if (Game.state.villagers < cap) {
          // 增长速度随当前人口基数决定：每月增长 max(1, 当前人口×10%)，直到人口上限
          const grow = Math.min(cap - Game.state.villagers, Math.max(1, Math.floor(Game.state.villagers * 0.1)));
          for (let i = 0; i < grow; i++) {
            const spot = Game.findVillagerSpot(Game.state.villagersCells);
            if (!spot) break;
            Game.state.villagersCells.push(spot);
            Game.state.villagers++;
          }
          Game.saveState();
        }
    }
    Game.state.day += speed;
    Game.displayDay += 1;
    updateStatus();
    Game.drawWorld();
    // 文明模式：文明指数达到 9999 即获胜
    if (Game.state.mode === 'civilization' && !Game.state.won && Game.state.civ >= Game.CIV_WIN) {
      Game.state.won = true;
      Game.saveState();
      showVictory();
      return;
    }
    saveTick++;
    if (saveTick >= 5) {
      saveTick = 0;
      Game.saveState();
    }
  }
  Game.tick = tick;

  // ---------- 启动 ----------
  // 进入游戏一律经过开始菜单选择模式：各模式独立存档，点选模式后如有历史记录可选「继续发展 / 重新开始」
  renderModeList();
  updateRankEntry();
  showStartMenu();
  setInterval(tick, 500);
})();
