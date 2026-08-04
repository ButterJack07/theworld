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
    if (Game.state) {
      const sp = document.getElementById('setPlayerName');
      const ss = document.getElementById('setSaveName');
      if (sp) sp.value = Game.state.playerName || '';
      if (ss) ss.value = Game.state.saveName || '';
    }
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

  document.getElementById('setNameSave').addEventListener('click', () => {
    if (!Game.state) return;
    const sp = document.getElementById('setPlayerName');
    const ss = document.getElementById('setSaveName');
    Game.state.playerName = sp ? sp.value.trim() : '';
    Game.state.saveName = ss ? ss.value.trim() : '';
    Game.saveState();
  });

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
    Game.setScreen('menu');
    mode = 2;
    applyMode();
    updateControls();
  }
  Game.showStartMenu = showStartMenu;

  function hideStartMenu() {
    document.getElementById('startMenu').classList.add('hidden');
  }

  // 开始菜单点选模式：该模式有历史记录 → 询问继续 / 重新开始；否则开新档前先设置玩家名
  let choiceMode = null;
  function onSelectMode(modeId) {
    if (Game.hasSave(modeId)) {
      showChoice(modeId, Game.readSave(modeId));
    } else {
      promptName(modeId);
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
    if (id) promptName(id);
  });

  // 新游戏起名：玩家名（在线排行用）与可选存档名；确认后开始新游戏
  let pendingNameMode = null;
  function promptName(modeId) {
    pendingNameMode = modeId;
    document.getElementById('nameMode').textContent = Game.modeName(modeId);
    const saved = Game.readSave(modeId);
    document.getElementById('namePlayer').value = (saved && saved.playerName) ? saved.playerName : '';
    document.getElementById('nameSave').value = (saved && saved.saveName) ? saved.saveName : '';
    document.getElementById('nameOverlay').classList.remove('hidden');
    document.getElementById('namePanel').classList.remove('hidden');
    document.getElementById('namePlayer').focus();
  }

  function hideName() {
    document.getElementById('nameOverlay').classList.add('hidden');
    document.getElementById('namePanel').classList.add('hidden');
  }
  document.getElementById('nameOverlay').addEventListener('click', hideName);
  document.getElementById('nameCancel').addEventListener('click', hideName);
  document.getElementById('nameConfirm').addEventListener('click', () => {
    const id = pendingNameMode;
    hideName();
    if (id) Game.startNewGame(id, false, {
      playerName: document.getElementById('namePlayer').value.trim(),
      saveName: document.getElementById('nameSave').value.trim()
    });
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

  Game.startNewGame = function (modeId, skipIntro, meta) {
    Game.mode = modeId;
    Game.setScreen('game');
    Game.store.set(Game.LAST_MODE_KEY, modeId);
    Game.seed = Math.floor(Math.random() * 1e9);
    Game.store.set(Game.seedKey(modeId), String(Game.seed));
    Game.world = Game.generateWorld(Game.seed);
    Game.resetState(modeId);
    if (meta && (meta.playerName || meta.saveName)) {
      Game.state.playerName = meta.playerName || '';
      Game.state.saveName = meta.saveName || '';
      Game.saveState();
    }
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
    if (!skipIntro) playIntro();
  };

  Game.resumeGame = function (modeId, skipIntro) {
    Game.mode = modeId;
    Game.setScreen('game');
    Game.store.set(Game.LAST_MODE_KEY, modeId);
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
    if (!skipIntro) playIntro();
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
    submitOnlineRanking(mode, day, civ);
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

  // ---------- 在线排行（Supabase REST）----------
  function onlineHeaders() {
    return {
      apikey: Game.SUPABASE_ANON_KEY,
      Authorization: 'Bearer ' + Game.SUPABASE_ANON_KEY,
      'Content-Type': 'application/json'
    };
  }

  // 把一条成绩异步提交到在线榜单（静默失败，不影响本地）
  function submitOnlineRanking(mode, day, civ) {
    if (!Game.ONLINE_ENABLED()) return;
    if (!Game.state || !Game.state.playerName) return;
    fetch(Game.SUPABASE_URL + '/rest/v1/' + Game.ONLINE_TABLE, {
      method: 'POST',
      headers: onlineHeaders(),
      body: JSON.stringify({
        mode,
        player_name: Game.state.playerName,
        save_name: Game.state.saveName || '',
        days: Math.max(1, day),
        civ: Math.max(0, civ),
        created_at: new Date().toISOString()
      })
    }).catch(function () {});
  }
  Game.submitOnlineRanking = submitOnlineRanking;

  // 拉取某模式在线成绩（按时间戳倒序，前端再按玩家去重保留最新记录）
  function loadOnlineRanking(mode) {
    const url = Game.SUPABASE_URL + '/rest/v1/' + Game.ONLINE_TABLE +
      '?select=player_name,save_name,days,civ,created_at' +
      '&mode=eq.' + encodeURIComponent(mode) +
      '&order=created_at.desc';
    return fetch(url, {
      headers: { apikey: Game.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + Game.SUPABASE_ANON_KEY }
    }).then(function (res) { return res.json(); });
  }
  Game.loadOnlineRanking = loadOnlineRanking;

  // 在线成绩：同一玩家多次存档只保留最新一条，再按模式规则排序取前 10
  function onlineEntries(rows) {
    if (!Array.isArray(rows)) return [];
    const latest = new Map();
    rows.forEach(r => {
      const name = r.player_name || '';
      if (!name || latest.has(name)) return;
      latest.set(name, r);
    });
    const list = Array.from(latest.values());
    if (rankMode === 'freedom') list.sort((a, b) => (b.civ || 0) - (a.civ || 0));
    else list.sort((a, b) => (a.days || 99999) - (b.days || 99999));
    return list.slice(0, 10);
  }

  function renderNetworkRows(body, rows) {
    const entries = onlineEntries(rows);
    if (!entries.length) {
      const empty = document.createElement('div');
      empty.className = 'rank-empty';
      empty.textContent = '暂无在线成绩 · 快去创造第一个纪录吧';
      body.appendChild(empty);
      return;
    }
    const head = document.createElement('div');
    head.className = 'rank-head';
    const h0 = document.createElement('span');
    h0.textContent = '排名';
    const h1 = document.createElement('span');
    h1.textContent = '玩家';
    const h2 = document.createElement('span');
    h2.textContent = rankMode === 'freedom' ? '文明指数' : '历时';
    head.append(h0, h1, h2);
    body.appendChild(head);

    entries.forEach((r, i) => {
      const row = document.createElement('div');
      row.className = 'rank-row' + (i === 0 ? ' top' : '');
      const no = document.createElement('span');
      no.className = 'rank-no';
      no.textContent = String(i + 1);
      const nm = document.createElement('span');
      nm.className = 'rank-name';
      nm.textContent = r.player_name || '匿名';
      const sc = document.createElement('span');
      sc.className = 'rank-score';
      sc.textContent = rankMode === 'freedom' ? String(r.civ || 0) : formatElapsed(r.days || 1);
      row.append(no, nm, sc);
      body.appendChild(row);
    });
  }

  function renderRankBody() {
    const body = document.getElementById('rankBody');
    body.innerHTML = '';
    if (rankSource === 'network') {
      if (!Game.ONLINE_ENABLED()) {
        const note = document.createElement('div');
        note.className = 'rank-empty';
        note.textContent = '在线排行未配置\n请在 js/data.js 填入 Supabase URL 与 anon key';
        body.appendChild(note);
        return;
      }
      const loading = document.createElement('div');
      loading.className = 'rank-loading';
      loading.textContent = '加载中';
      body.appendChild(loading);
      loadOnlineRanking(rankMode).then(function (rows) {
        if (rankSource !== 'network') return;
        body.innerHTML = '';
        renderNetworkRows(body, rows);
      }).catch(function () {
        if (rankSource !== 'network') return;
        body.innerHTML = '';
        const note = document.createElement('div');
        note.className = 'rank-empty';
        note.textContent = '在线排行加载失败\n请检查网络后重试';
        body.appendChild(note);
      });
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
    rankSource = 'network';
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

  const GT = Game.TERRAIN;
  const TC = Game.TERRAIN_COLORS;
  const TN = Game.TERRAIN_NAMES;

  function gsCell(t, extra) {
    return `<i class="gs-cell ${extra || ''}" style="background:${TC[t]}"></i>`;
  }

  function gsGrid(rows, size) {
    const cols = rows[0].length;
    const cells = [];
    rows.forEach(r => r.forEach(t => cells.push(gsCell(t))));
    return `<div class="gs-grid" style="grid-template-columns:repeat(${cols},${size}px);grid-template-rows:repeat(${rows.length},${size}px)">${cells.join('')}</div>`;
  }

  function gsModeIcon(id) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" style="width:100%;height:100%">${Game.MODE_ICONS[id] || ''}</svg>`;
  }

  const GUIDE_PAGES = [
    {
      scene() {
        const map = [
          [GT.FOREST, GT.FOREST, GT.GRASSLAND, GT.GRASSLAND, GT.PLAIN, GT.PLAIN, GT.PLAIN, GT.SEA, GT.SEA, GT.SEA],
          [GT.FOREST, GT.FOREST, GT.GRASSLAND, GT.GRASSLAND, GT.GRASSLAND, GT.PLAIN, GT.MOUNTAIN, GT.MOUNTAIN, GT.SEA, GT.SEA],
          [GT.PLAIN, GT.GRASSLAND, GT.GRASSLAND, GT.GRASSLAND, GT.GRASSLAND, GT.MOUNTAIN, GT.MOUNTAIN, GT.MOUNTAIN, GT.PLAIN, GT.PLAIN],
          [GT.PLAIN, GT.PLAIN, GT.GRASSLAND, GT.GRASSLAND, GT.GRASSLAND, GT.PLAIN, GT.PLAIN, GT.PLAIN, GT.PLAIN, GT.PLAIN],
          [GT.PLAIN, GT.PLAIN, GT.PLAIN, GT.PLAIN, GT.PLAIN, GT.PLAIN, GT.PLAIN, GT.PLAIN, GT.PLAIN, GT.PLAIN],
          [GT.SEA, GT.SEA, GT.PLAIN, GT.PLAIN, GT.PLAIN, GT.PLAIN, GT.SEA, GT.SEA, GT.SEA, GT.SEA]
        ];
        return `
        <div class="gs-scene gs-welcome">
          <div class="gs-w-map">${gsGrid(map, 30)}</div>
          <div class="gs-w-base">
            <span class="gs-w-town">${Game.itemIconSVG('towncenter')}</span>
            <span class="gs-explorer gs-w-e1">${Game.explorerIconSVG()}</span>
            <span class="gs-explorer gs-w-e2">${Game.explorerIconSVG()}</span>
          </div>
          <div class="gs-w-civ"><span>文明指数</span><b class="gs-civnum">0</b></div>
        </div>`;
      },
      text: `<div class="guide-page-title">欢迎来到 The World</div>
<p>这是一款<b>放置经营游戏</b>——时间流逝，文明自动成长。你只需要规划节奏：先建什么、把劳动力放哪里、基地往哪边扩。</p>
<ul>
  <li><b>目标</b>：从一座城镇中心起步，把文明指数发展到 <b>9999</b> 即获胜（文明模式）。</li>
  <li><b>核心循环</b>：基地采集 → 合成建筑 → 摆放建筑 → 分配劳动力 → 扩张合并升级。</li>
  <li>初始自带 1 座城镇中心（容 3 人）与 <b>2 名探索者</b>，他们会自动采集、无需时刻操作。</li>
  <li>本指南共 14 页，跟着箭头逐页看，很快就能上手。</li>
</ul>`,
      onShow(stage) {
        const n = stage.querySelector('.gs-civnum');
        if (n) animateNumber(n, 0, 120, 1400);
      }
    },
    {
      scene() {
        const cards = Game.GAME_MODES.map(m => `
          <div class="gs-mode-card${m.locked ? ' gs-mode-locked' : (m.id === 'civilization' ? ' gs-mode-civ' : '')}">
            <span class="gs-mode-ico">${gsModeIcon(m.id)}</span>
            <b>${m.name}</b>
            <i>${m.locked ? (m.lockNote || '尚未开放') : (m.id === 'civilization' ? '文明指数达 9999 获胜' : '无胜利标准 · 自由发展')}</i>
          </div>`).join('');
        return `
        <div class="gs-scene gs-modes">
          <div class="gs-mode-list">${cards}</div>
          <div class="gs-mode-note">选择模式后进入游戏 · 各模式独立记录最佳成绩</div>
        </div>`;
      },
      text: `<div class="guide-page-title">选择游戏模式</div>
<p>开始菜单提供 <b>3 种模式</b>，各自<b>独立存档</b>并<b>独立排行</b>：</p>
<ul>
  <li><b>文明模式</b>：文明指数达到 <b>9999</b> 获胜，按游戏内历时排名。</li>
  <li><b>科技模式</b>：发展出任一项高级科技获胜 —— <b>尚未开放</b>，敬请期待。</li>
  <li><b>自由模式</b>：没有胜负标准，自由发展，返回主菜单时按文明指数留档。</li>
  <li>已有存档时再次选择，会询问<b>继续发展</b>还是<b>重新开始</b>。</li>
</ul>`
    },
    {
      scene() {
        const map = [
          [GT.FOREST, GT.GRASSLAND, GT.GRASSLAND, GT.PLAIN, GT.PLAIN, GT.SEA, GT.SEA, GT.SEA],
          [GT.FOREST, GT.GRASSLAND, GT.GRASSLAND, GT.PLAIN, GT.MOUNTAIN, GT.MOUNTAIN, GT.SEA, GT.SEA],
          [GT.GRASSLAND, GT.GRASSLAND, GT.GRASSLAND, GT.GRASSLAND, GT.MOUNTAIN, GT.MOUNTAIN, GT.PLAIN, GT.PLAIN],
          [GT.PLAIN, GT.PLAIN, GT.PLAIN, GT.PLAIN, GT.PLAIN, GT.PLAIN, GT.PLAIN, GT.PLAIN],
          [GT.PLAIN, GT.PLAIN, GT.PLAIN, GT.PLAIN, GT.SEA, GT.SEA, GT.SEA, GT.SEA]
        ];
        return `
        <div class="gs-scene gs-ui">
          <div class="gs-ui-top">
            <span class="gs-ui-date">1 年 1 月</span>
            <div class="gs-ui-pills">
              <span class="gs-ui-pill">人口 <b>1/5</b></span>
              <span class="gs-ui-pill gs-ui-pill-civ">文明 <b>0</b></span>
              <span class="gs-ui-pill gs-ui-pill-mode">模式 文明</span>
            </div>
          </div>
          <div class="gs-ui-map">${gsGrid(map, 30)}</div>
          <div class="gs-ui-base"></div>
          <div class="gs-ui-coord">地图 · 双击地块查看地貌</div>
        </div>`;
      },
      text: `<div class="guide-page-title">认识界面 · 顶部与地图</div>
<p>画面上会按顺序循环高亮每个区域：</p>
<ul>
  <li><b>右上角状态胶囊</b>：人口（当前/上限）、文明程度、当前模式。</li>
  <li><b>中央地图</b>：核心操作区，彩色方格 = 地貌。摆放建筑、拖动基地、观察地形都在这里。</li>
  <li><b>虚线窗口</b>是你的基地，拖动其边框可<b>扩张覆盖</b>。</li>
  <li>单击建筑 / 地块在<b>信息面板</b>看数据，<b>双击</b>地块查看该格地貌。</li>
</ul>`
    },
    {
      scene() {
        const icons = ['wood', 'stone', 'plank', 'iron', 'hut', 'lumber', 'mine', 'farm'];
        const inv = [];
        for (let i = 0; i < 32; i++) {
          const id = icons[i];
          inv.push(id
            ? `<span class="gs-inv-cell"><span class="gs-inv-ico">${Game.itemIconSVG(id)}</span></span>`
            : `<span class="gs-inv-cell"></span>`);
        }
        const craft = [];
        const cicons = ['wood', 'wood', 'stone', '', 'plank', '', '', '', ''];
        for (let i = 0; i < 9; i++) {
          const id = cicons[i];
          craft.push(id
            ? `<span class="gs-craft-cell"><span class="gs-inv-ico">${Game.itemIconSVG(id)}</span></span>`
            : `<span class="gs-craft-cell"></span>`);
        }
        return `
        <div class="gs-scene gs-ui2">
          <div class="gs-ui2-info">信息面板 · 点击建筑查看详细数据</div>
          <div class="gs-ui2-left">
            <div class="gs-ui2-label">物品栏</div>
            <div class="gs-ui2-inv">${inv.join('')}</div>
          </div>
          <div class="gs-ui2-right">
            <div class="gs-ui2-label">合成器</div>
            <div class="gs-ui2-craft">${craft.join('')}</div>
          </div>
          <div class="gs-ui2-btns"><i>⚙️</i><i>📜</i><i>🏗️</i><i>👥</i><i>▶</i></div>
        </div>`;
      },
      text: `<div class="guide-page-title">认识界面 · 物品栏与合成器</div>
<ul>
  <li><b>物品栏（8×4 格）</b>：存放材料与合成好的建筑。支持拖动移动、双击合并堆叠、长按约 0.5 秒整组移动。</li>
  <li><b>合成器（3×3 格）</b>：把材料拖进格子，凑齐配方后点击下方<b>成品</b>合成。</li>
  <li><b>信息面板</b>：点击地图上的建筑 / 地块后，这里显示详细数据。</li>
  <li>底部按钮：<b>⚙️ 设置 · 📜 合成 · 🏗️ 扩建 · 👥 劳动力 · ▶ 速度</b>。</li>
</ul>`
    },
    {
      scene() {
        const map = [
          [GT.FOREST, GT.FOREST, GT.GRASSLAND, GT.GRASSLAND, GT.PLAIN, GT.PLAIN, GT.SEA, GT.SEA],
          [GT.FOREST, GT.GRASSLAND, GT.GRASSLAND, GT.GRASSLAND, GT.PLAIN, GT.MOUNTAIN, GT.MOUNTAIN, GT.SEA],
          [GT.PLAIN, GT.GRASSLAND, GT.GRASSLAND, GT.GRASSLAND, GT.MOUNTAIN, GT.MOUNTAIN, GT.PLAIN, GT.PLAIN],
          [GT.PLAIN, GT.PLAIN, GT.PLAIN, GT.PLAIN, GT.PLAIN, GT.PLAIN, GT.PLAIN, GT.PLAIN]
        ];
        const inv = ['wood', 'wood', 'stone', 'iron', '', 'berry', '', ''];
        return `
        <div class="gs-scene gs-gather">
          <div class="gs-g-map">${gsGrid(map, 30)}</div>
          <div class="gs-g-base">
            <span class="gs-g-town">${Game.itemIconSVG('towncenter')}</span>
            <span class="gs-explorer gs-g-e1">${Game.explorerIconSVG()}</span>
            <span class="gs-explorer gs-g-e2">${Game.explorerIconSVG()}</span>
          </div>
          <span class="gs-g-flow gs-g-fw">${Game.itemIconSVG('wood')}</span>
          <span class="gs-g-flow gs-g-fs">${Game.itemIconSVG('stone')}</span>
          <span class="gs-g-flow gs-g-fi">${Game.itemIconSVG('iron')}</span>
          <div class="gs-g-count">探索者 ×2 · 每月采集 2 次</div>
          <div class="gs-g-inv">
            ${inv.map(id => id
              ? `<span class="gs-inv-cell"><span class="gs-inv-ico">${Game.itemIconSVG(id)}</span></span>`
              : `<span class="gs-inv-cell"></span>`).join('')}
          </div>
        </div>`;
      },
      text: `<div class="guide-page-title">基地采集</div>
<p><b>基地</b>（地图上的虚线窗口）是自动采集引擎，每月按<b>探索者人数</b>产出：</p>
<ul>
  <li>每月产出<b>次数</b> = 探索者人数（空闲人口）。初始 2 名探索者 = 每月 2 次。</li>
  <li>产出<b>内容</b>按基地覆盖的<b>地貌加权</b>：森林格多→多出木头，山地格多→多出石头，海洋格→出鱼。</li>
  <li>把基地扩到更富的地貌上，产出更丰富、地貌揭示更快。</li>
  <li>点击基地可查看各地貌格数与<b>产出概率</b>。</li>
</ul>`
    },
    {
      scene() {
        const list = [GT.FOREST, GT.GRASSLAND, GT.MOUNTAIN, GT.CLAY_MOUNTAIN, GT.WETLAND, GT.MINE, GT.SEA, GT.PLAIN];
        const items = list.map(t => `
          <div class="gs-terr-item">
            <span class="gs-terr-swatch" style="background:${TC[t]}"></span>
            <span class="gs-terr-name">${TN[t]}</span>
            <span class="gs-terr-out">${Game.TERRAIN_TABLE[t].desc}</span>
          </div>`).join('');
        return `
        <div class="gs-scene gs-terr">
          <div class="gs-terr-grid">${items}</div>
        </div>`;
      },
      text: `<div class="guide-page-title">地貌与产出</div>
<p>地图由多种地貌组成，颜色代表类型，每种地貌的<b>每月产出</b>不同：</p>
<ul>
  <li><b>森林</b>：3~6 木头，木材主力。</li>
  <li><b>草原</b>：3 木头 / 浆果 / 石头。</li>
  <li><b>山地</b>：3~5 石头 + 0~2 铁矿。</li>
  <li><b>黏土山</b>：2~4 黏土；<b>湿地</b>：木头 / 浆果 / 生肉 / 黏土。</li>
  <li><b>矿洞</b>：石头 + 铁矿，小概率金 / 铜 / 琥珀 / 钻石。</li>
  <li><b>海洋</b>：1 条鱼；<b>平原</b>：随机 2 木头 / 石头 / 铁矿 / 黏土 / 浆果。</li>
</ul>`
    },
    {
      scene() {
        const rows = [
          { src: ['wood', 'wood'], out: 'plank', name: '木板' },
          { src: ['stone', 'stone', 'iron'], out: 'brick', name: '砖块' },
          { src: ['wood', 'stone'], out: 'cloth', name: '布匹' },
          { src: ['iron', 'iron', 'wood'], out: 'gold', name: '金矿' }
        ];
        const html = rows.map(r => `
          <div class="gs-rec-row">
            <span class="gs-rec-src">${r.src.map(id => `<i>${Game.itemIconSVG(id)}</i>`).join('<b>+</b>')}</span>
            <span class="gs-rec-arrow">➜</span>
            <span class="gs-rec-out"><i>${Game.itemIconSVG(r.out)}</i>${r.name}</span>
          </div>`).join('');
        return `
        <div class="gs-scene gs-rec">
          <div class="gs-rec-title">材料合成</div>
          ${html}
        </div>`;
      },
      text: `<div class="guide-page-title">合成材料</div>
<p>把材料<b>拖进合成器</b>，凑齐配方后点击「合成」得到<b>建材</b>：</p>
<ul>
  <li><b>木板</b>：2 木头 —— 最常用建材，几乎所有建筑都要。</li>
  <li><b>砖块</b>：2 石头 + 1 铁矿 —— 高级建筑与城镇中心需要。</li>
  <li><b>布匹</b>：1 木头 + 1 石头 —— 造船与牧场的必需材料。</li>
  <li><b>金矿</b>：2 铁矿 + 1 木头 —— 经济路线的基础。</li>
  <li>合成好的建材自动进入<b>物品栏</b>。</li>
</ul>`
    },
    {
      scene() {
        const rows = [
          { src: ['plank', 'stone'], out: 'hut', name: '茅草屋' },
          { src: ['plank', 'stone'], out: 'lumber', name: '伐木小屋' },
          { src: ['wood', 'stone', 'stone'], out: 'mine', name: '采矿小屋' },
          { src: ['plank', 'stone'], out: 'farm', name: '农田' },
          { src: ['plank', 'plank', 'cloth'], out: 'dock', name: '钓船小屋' }
        ];
        const html = rows.map(r => `
          <div class="gs-rec-row">
            <span class="gs-rec-src">${r.src.map(id => `<i>${Game.itemIconSVG(id)}</i>`).join('<b>+</b>')}</span>
            <span class="gs-rec-arrow">➜</span>
            <span class="gs-rec-out"><i>${Game.itemIconSVG(r.out)}</i>${r.name}</span>
          </div>`).join('');
        return `
        <div class="gs-scene gs-rec">
          <div class="gs-rec-title">建筑合成</div>
          ${html}
          <div class="gs-rec-note">合成后进入物品栏 · 拖到地图安装</div>
        </div>`;
      },
      text: `<div class="guide-page-title">合成建筑</div>
<p>再用<b>建材</b>合成<b>建筑</b>，建筑会进入物品栏，随后拖到地图上安装：</p>
<ul>
  <li><b>茅草屋</b>：1 木板 + 1 石头 —— 住宅，容 1 人。</li>
  <li><b>伐木小屋</b>：1 木板 + 1 石头 —— 须建在森林，每月产 5 木头。</li>
  <li><b>采矿小屋</b>：1 木头 + 2 石头 —— 须建在山地 / 矿洞。</li>
  <li><b>农田</b>：1 木板 + 1 石头 —— 任意陆地，每月产 5 小麦。</li>
  <li><b>钓船小屋</b>：2 木板 + 1 布匹 —— 须临水，每月产 2 食物。</li>
  <li>点右上角 <b>📜 合成</b> 可随时查看全部配方。</li>
</ul>`
    },
    {
      scene() {
        const map = [
          [GT.FOREST, GT.GRASSLAND, GT.GRASSLAND, GT.PLAIN, GT.PLAIN, GT.SEA, GT.SEA, GT.SEA],
          [GT.FOREST, GT.GRASSLAND, GT.GRASSLAND, GT.PLAIN, GT.MOUNTAIN, GT.MOUNTAIN, GT.SEA, GT.SEA],
          [GT.GRASSLAND, GT.GRASSLAND, GT.GRASSLAND, GT.GRASSLAND, GT.MOUNTAIN, GT.MOUNTAIN, GT.PLAIN, GT.PLAIN],
          [GT.PLAIN, GT.PLAIN, GT.PLAIN, GT.PLAIN, GT.PLAIN, GT.PLAIN, GT.PLAIN, GT.PLAIN]
        ];
        return `
        <div class="gs-scene gs-place">
          <div class="gs-p-map">${gsGrid(map, 30)}</div>
          <div class="gs-p-ghost">${Game.itemIconSVG('hut')}</div>
          <div class="gs-p-legend"><i class="gs-ok"></i>可放置<i class="gs-bad"></i>不可放置</div>
        </div>`;
      },
      text: `<div class="guide-page-title">摆放建筑</div>
<p>从物品栏把建筑<b>拖到地图</b>上释放即安装：</p>
<ul>
  <li><b>蓝框</b> = 可以放；<b>红框</b> = 不能放（与建筑重叠 / 落在海里 / 地形不符）。</li>
  <li>拖到地图边缘会<b>自动弹回</b>物品栏，不会丢失。</li>
  <li>建筑是<b>占地格子</b>的：茅草屋占 1×1、砖瓦屋占 2×2、四合院占 4×4。</li>
  <li>放不下时，把基地扩到正确地形附近再放（地形要求见下一页）。</li>
</ul>`
    },
    {
      scene() {
        const rows = [
          { id: 'lumber', name: '伐木小屋', terr: [GT.FOREST] },
          { id: 'mine', name: '采矿小屋', terr: [GT.MOUNTAIN, GT.MINE] },
          { id: 'dock', name: '钓船小屋', terr: [GT.SEA], note: '须临水' },
          { id: 'pasture', name: '牧场', terr: [GT.GRASSLAND], note: '4 格全草原' },
          { id: 'farm', name: '农田', terr: [GT.PLAIN, GT.GRASSLAND, GT.FOREST], note: '任意陆地' }
        ];
        const html = rows.map(r => `
          <div class="gs-req-row">
            <span class="gs-req-ico">${Game.itemIconSVG(r.id)}</span>
            <b>${r.name}</b>
            <span class="gs-req-terr">${r.terr.map(t => `<i style="background:${TC[t]}" title="${TN[t]}"></i>`).join('')}</span>
            <em>${r.note || '须建在' + r.terr.map(t => TN[t]).join(' / ')}</em>
          </div>`).join('');
        return `
        <div class="gs-scene gs-req">
          ${html}
        </div>`;
      },
      text: `<div class="guide-page-title">建筑的地形要求</div>
<p>摆放建筑时常遇到<b>红框</b>，多半是地形不符：</p>
<ul>
  <li><b>伐木小屋</b> → 必须建在<b>森林</b>上。</li>
  <li><b>采矿小屋</b> → 必须建在<b>山地 / 矿洞</b>上。</li>
  <li><b>钓船小屋</b> → 必须<b>临水</b>（相邻一格是海洋）。</li>
  <li><b>牧场</b> → 必须建在<b>草原</b>上（覆盖 4 格全为草原）。</li>
  <li><b>农田</b> → 任意陆地均可，最灵活。</li>
  <li>双击地块确认地貌，再把基地扩到目标地形附近即可摆放。</li>
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
<p>点击地图上的生产建筑 → 点「<b>👥 劳动力分配</b>」，用 <b>+ / −</b> 安排工人：</p>
<ul>
  <li>每个工人每月产出一份，<b>工人越多产出越多</b>（伐木小屋 5 木头/人/月）。</li>
  <li><b>总人口 − 已分配工人 = 探索者</b>：探索者负责基地采集与地貌揭示。</li>
  <li>住宅决定人口上限：城镇中心 3、茅草屋 1、砖瓦屋 5、四合院 25。</li>
  <li>工人塞太多会让探索者不足、基地采集变慢，初期注意<b>平衡</b>。</li>
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
        const map = [
          [GT.GRASSLAND, GT.FOREST, GT.FOREST, GT.GRASSLAND, GT.PLAIN, GT.PLAIN, GT.SEA, GT.SEA],
          [GT.GRASSLAND, GT.FOREST, GT.GRASSLAND, GT.GRASSLAND, GT.PLAIN, GT.MOUNTAIN, GT.MOUNTAIN, GT.SEA],
          [GT.PLAIN, GT.GRASSLAND, GT.GRASSLAND, GT.GRASSLAND, GT.MOUNTAIN, GT.MOUNTAIN, GT.PLAIN, GT.PLAIN],
          [GT.PLAIN, GT.PLAIN, GT.PLAIN, GT.PLAIN, GT.PLAIN, GT.PLAIN, GT.PLAIN, GT.PLAIN]
        ];
        return `
        <div class="gs-scene gs-expand2">
          <div class="gs-e-map">${gsGrid(map, 30)}</div>
          <div class="gs-e-base"></div>
          <div class="gs-e-label">拖动基地边框扩张</div>
        </div>`;
      },
      text: `<div class="guide-page-title">扩张基地</div>
<ul>
  <li>基地默认 <b>2×2</b>，拖动<b>基地窗口的边框</b>可向外扩张。</li>
  <li>覆盖更多、更富的地貌 → 采集更快、产出更丰富。</li>
  <li>扩到<b>海洋</b>可产出鱼，扩到<b>湿地</b>可获生肉 / 浆果。</li>
  <li>覆盖的每一格地貌都会<b>自动揭示</b>，双击地块可查看具体产出。</li>
</ul>`
    },
    {
      scene() {
        return `
        <div class="gs-scene gs-merge">
          <div class="gs-merge-wrap">
            <span class="gs-merge-hut gs-mh1">${Game.itemIconSVG('hut')}</span>
            <span class="gs-merge-hut gs-mh2">${Game.itemIconSVG('hut')}</span>
            <span class="gs-merge-hut gs-mh3">${Game.itemIconSVG('hut')}</span>
            <span class="gs-merge-hut gs-mh4">${Game.itemIconSVG('hut')}</span>
            <span class="gs-merge-out">${Game.itemIconSVG('brickhouse')}</span>
          </div>
          <div class="gs-merge-arrow">➜</div>
          <div class="gs-merge-next">
            <span class="gs-merge-next-ico">${Game.itemIconSVG('courtyard')}</span>
            <span class="gs-merge-next-label">砖瓦屋 ×4 → 四合院</span>
          </div>
        </div>`;
      },
      text: `<div class="guide-page-title">合并升级</div>
<ul>
  <li>把 <b>4 个低级建筑摆成 2×2</b>，会自动合并为高级建筑。</li>
  <li>合并链：<b>茅草屋 ×4 → 砖瓦屋 → 四合院</b>；伐木小屋 ×4 → 伐木工场；农田 ×4 → 农庄；采矿小屋 ×4 → 采矿工场。</li>
  <li><b>3 座钓船小屋排成直线</b> → 钓船码头（横向 / 竖向均可）。</li>
  <li>合并后<b>劳动力上限提升</b>、产能大增，已分配工人自动结转。</li>
  <li>「🏗️ 扩建」面板可查看全部合并规则。</li>
</ul>`
    },
    {
      scene() {
        return `
        <div class="gs-scene gs-win">
          <span class="gs-win-ico">${Game.itemIconSVG('courtyard')}</span>
          <div class="gs-win-civ"><span>文明指数</span><b class="gs-win-num">0</b><i>/ 9999</i></div>
          <div class="gs-win-bar"><i></i></div>
          <div class="gs-win-tips">🏆 采集 · 合成 · 摆放 · 分配 · 合并</div>
        </div>`;
      },
      text: `<div class="guide-page-title">胜利条件与小贴士</div>
<ul>
  <li><b>文明模式</b>：文明指数达到 <b>9999</b> 弹出胜利面板，可选择继续发展或返回菜单。</li>
  <li><b>科技模式</b>：发展出任一项高级科技获胜（尚未开放）。</li>
  <li><b>自由模式</b>：没有胜负，尽情扩张文明。</li>
  <li><b>小贴士</b>：前期先扩基地多采集 → 合木板砖块 → 建住宅提人口 → 建伐木/采矿小屋分配工人 → 合并升级放大产能。</li>
  <li>随时可点 <b>⚙️ 设置</b> 查看操作说明，或在开始菜单查看<b>排行榜</b>。</li>
</ul>`,
      onShow(stage) {
        const n = stage.querySelector('.gs-win-num');
        if (n) animateNumber(n, 0, 9999, 2200);
        const bar = stage.querySelector('.gs-win-bar i');
        if (bar) setTimeout(() => { bar.style.width = '100%'; }, 300);
      }
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
  // 刷新页面时保持当前所在界面不变：主菜单刷新仍停留在主菜单，游戏中刷新则直接恢复到上次玩到的模式，不播放开场动画；
  // 仅从主菜单选择模式进入游戏时才播放开场动画
  renderModeList();
  updateRankEntry();
  const lastMode = Game.store.get(Game.LAST_MODE_KEY);
  const validModes = Game.GAME_MODES.map(m => m.id);
  if (Game.getScreen() === 'game' && validModes.includes(lastMode) && Game.hasSave(lastMode)) {
    Game.resumeGame(lastMode);
  } else {
    Game.mode = null;
    showStartMenu();
  }
  const boot = document.getElementById('bootScreen');
  if (boot) boot.remove();
  setInterval(tick, 500);
})();
