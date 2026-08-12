(function () {
  'use strict';

  const Game = window.Game = window.Game || {};

  const dateEl = document.getElementById('date');
  const popEl = document.getElementById('pop');
  const civEl = document.getElementById('civ');
  const foodEl = document.getElementById('food');
  const coinsEl = document.getElementById('coins');
  const coinPill = document.getElementById('coinPill');
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

  const eventOverlay = document.getElementById('eventOverlay');
  const eventPanel = document.getElementById('eventPanel');
  const eventTitle = document.getElementById('eventTitle');
  const eventText = document.getElementById('eventText');
  const eventKicker = document.getElementById('eventKicker');
  const eventActions = document.getElementById('eventActions');
  const eventTabs = document.getElementById('eventTabs');
  const eventDetail = document.getElementById('eventDetail');
  let openEventId = null;
  let eventStackEl = null;
  const EVENT_META = {
    foodShortage: { title: '食物紧缺', icon: '!', tone: 'danger', kicker: '紧急事件' },
    feast: { title: '聚落庆典', icon: '★', tone: 'good', kicker: '随机事件' },
    refugees: { title: '流民抵达', icon: '＋', tone: 'good', kicker: '随机事件' },
    harvest: { title: '丰收季', icon: '✦', tone: 'good', kicker: '随机事件' },
    drought: { title: '干旱', icon: '☼', tone: 'danger', kicker: '随机事件' },
    forestFire: { title: '森林火灾', icon: '♨', tone: 'danger', kicker: '随机事件' },
    caveCollapse: { title: '矿井坍塌', icon: '!', tone: 'danger', kicker: '随机事件' },
    seaStorm: { title: '海上风暴', icon: '≈', tone: 'danger', kicker: '随机事件' },
    surprise: { title: '意外之喜', icon: '★', tone: 'good', kicker: '探索发现' },
    missingExplorer: { title: '探索者失踪', icon: '?', tone: 'warning', kicker: '紧急事件' },
    tradeLost: { title: '商队迷路', icon: '?', tone: 'warning', kicker: '贸易事件' },
    scholar: { title: '学者来访', icon: '✎', tone: 'good', kicker: '知识事件' },
    ruins: { title: '古代遗迹', icon: '◆', tone: 'good', kicker: '探索发现' },
    militaryAccident: { title: '军械试验事故', icon: '⚔', tone: 'danger', kicker: '军事事件' }
  };
  function eventMonth() { return Math.floor((Game.state.day - 1) / Game.DAYS_PER_MONTH); }
  function eventMeta(type) { return EVENT_META[type] || { title: '事件', icon: '!', tone: 'warning', kicker: '事件' }; }
  function getEvent(type) { return (Game.state.events || []).find(e => e.type === type); }
  function eventTextFor(event) {
    const s = Game.state;
    const meta = eventMeta(event.type);
    if (event.type === 'foodShortage') {
      const months = event.months || 0;
      return `食物仓已经耗尽。当前已持续 ${months} 个月。${months >= 4 ? '生产效率与探索次数已降低 50%。' : months >= 2 ? '生产效率与探索次数已降低 25%。' : '若持续缺粮，聚落的生产与探索将受到影响。'}`;
    }
    if (event.type === 'feast') return '居民希望举办一场庆典。举办后本月食物消耗翻倍，生产效率与探索次数降低 25%，但文明程度会增加。';
    if (event.type === 'refugees') return `有 ${event.count} 名流民请求加入聚落。接纳后，他们将有 3 个月不能工作，并在这段时间内消耗双倍食物。`;
    if (event.type === 'harvest') return '今年的农田迎来丰收。农田与农庄的小麦产量在本月提高 100%，无需额外操作。';
    if (event.type === 'drought') return `干旱仍在持续 ${event.months || 1} 个月。农田与农庄产量降低 50%，请用渔业、牧业或库存食物维持聚落。`;
    if (event.type === 'forestFire') return '森林火灾阻断了部分伐木生产。可以派遣探索者救火，也可以等待火势自行平息。';
    if (event.type === 'caveCollapse') return '矿井发生坍塌，相关建筑暂时无法正常生产。强行开采可能引发二次事故。';
    if (event.type === 'seaStorm') return '海上风暴正在影响渔业。可以停船避险，也可以冒险出海，但可能造成严重人员损失。';
    if (event.type === 'surprise') return '探索者在基地附近发现了额外资源，这是一份意外之喜。';
    if (event.type === 'missingExplorer') return '一名探索者在远处探索时失去联系。可以派人寻找，也可以等待他自行归来。';
    if (event.type === 'tradeLost') return `待结算商队在 ${Math.max(0, (event.deadlineMonth || eventMonth()) - eventMonth())} 个月内仍未找到。${event.searching ? '已派遣探索者寻找，但即使找到也无法挽回本次交易。' : '如果不处理，期限结束后本次交易将丢失。'}`;
    if (event.type === 'scholar') return `一位学者来到聚落，愿意带来知识、研究进度和文明奖励。${Math.max(0, (event.deadlineMonth || eventMonth()) - eventMonth())} 个月内需要作出决定。`;
    if (event.type === 'ruins') return '探索者发现了一处古代遗迹，发掘后将获得随机宝藏与文明奖励。';
    if (event.type === 'militaryAccident') return '军械试验发生事故，相关军事建筑暂时无法正常训练。';
    return meta.title;
  }
  function eventActionHint(event, action) {
    const hints = {
      feast: {
        accept: '举办庆典：本月食物消耗翻倍，生产效率与探索次数降低 25%，文明程度增加 30 + 当前人口 × 5。',
        decline: '不举办庆典：不消耗食物，不改变生产、探索和文明程度。'
      },
      refugees: {
        accept: '接纳流民：人口增加，但流民连续 3 个月不能工作，并且每名流民每月额外消耗 2 点食物；同时获得每名流民 20 点文明奖励。',
        decline: '暂不接纳：不改变人口、食物和文明程度，本次流民事件结束。'
      },
      forestFire: {
        dispatch: '派遣探索者救火：占用 1 名探索者处理 1 个月，完成后火灾结束并恢复相关伐木建筑。',
        wait: '等待火势熄灭：不占用人口、不消耗资源，但相关伐木建筑会继续停产约 2 个月。'
      },
      caveCollapse: {
        reinforce: '立即加固：立即结束坍塌并恢复采矿，但需要后续补充加固资源。',
        wait: '暂时封闭：不冒险、不额外消耗资源，等待约 2 个月后恢复生产。',
        force: '强行开采：本月继续尝试生产；有 50% 概率触发二次事故，导致该建筑内所有劳动力死亡。'
      },
      seaStorm: {
        避险: '停船避险：渔业建筑停产约 1 个月，不承担人员伤亡风险。',
        冒险: '冒险出海：尝试保留出海收益；有 50% 概率触发事故，导致该建筑内所有劳动力死亡。'
      },
      missingExplorer: {
        dispatch: '派人寻找：占用 1 名探索者处理 1 个月，完成后失踪的探索者归队。',
        wait: '等待归来：不占用其他人口，但探索次数会暂时减少，等待约 2 个月后归队。'
      },
      tradeLost: {
        dispatch: '派遣探索者寻找：占用 1 名探索者处理 1 个月；之后有 50% 概率让待结算贸易正常完成，否则继续延迟 1 个月。',
        abandon: '放弃寻找：取消本次待结算交易，已扣除的交付资源不会返还。'
      },
      scholar: {
        host: '接待学者：消耗 3 点食物和 50 金币，文明程度 +200，并随机完成一项尚未完成的研究。',
        teach: '学者授课：消耗 2 点食物和 30 金币，文明程度 +100；之后所有研究时长减半。每个存档只能使用一次。',
        decline: '礼貌拒绝：不消耗资源，本次学者来访结束。'
      },
      ruins: { excavate: '发掘遗迹：自动完成发掘，随机获得 100、200 或 300 点文明奖励。' },
      militaryAccident: {
        repair: '立即维修：消耗维修资源并立刻恢复相关军事建筑。',
        wait: '暂停试验：不消耗资源，军事建筑暂时停用，等待事故自然结束。'
      }
    };
    return (hints[event.type] && hints[event.type][action]) || '';
  }
  function finishEvent(event) {
    if (!event) return;
    Game.state.events = (Game.state.events || []).filter(e => e.id !== event.id);
    if (openEventId === event.id) openEventId = null;
    renderEventCenter();
    Game.saveState();
  }
  Game.finishEvent = finishEvent;
  Game.finishEventByType = function (type) {
    const event = getEvent(type);
    if (event) finishEvent(event);
  };
  function addEvent(type, data) {
    if (!Game.state || getEvent(type)) return null;
    const event = Object.assign({ id: `${type}-${Date.now()}-${Math.random().toString(16).slice(2)}`, type, createdMonth: eventMonth(), months: 0, searching: false }, data || {});
    Game.state.events = Game.state.events || [];
    Game.state.events.push(event);
    renderEventCenter();
    openEventId = event.id;
    showEventPopup(event);
    return event;
  }
  function maybeCreateRandomEvents() {
    if (!Game.state || Game.state.mode === 'creative') return;
    const month = eventMonth();
    if (month < 2 || Game.state.randomEventMonth === month) return;
    Game.state.randomEventMonth = month;
    if (Math.random() >= 0.2) return;
    const candidates = [];
    if (Game.state.villagers >= 5) candidates.push('feast', 'refugees');
    if (Game.state.buildings.some(b => b.id === 'farm' || b.id === 'farmstead')) candidates.push('harvest', 'drought');
    if (Game.state.buildings.some(b => b.id === 'lumber' || b.id === 'lumbermill')) candidates.push('forestFire');
    if (Game.state.buildings.some(b => b.id === 'mine' || b.id === 'minefactory')) candidates.push('caveCollapse');
    if (Game.state.buildings.some(b => b.id === 'dock' || b.id === 'dockyard')) candidates.push('seaStorm');
    if (Game.state.villagers >= 2 && Math.max(0, Game.state.villagers - totalAssigned()) >= 2) candidates.push('missingExplorer');
    if (Game.state.techs && Game.hasTech('fieldSurvey')) candidates.push('ruins');
    if (Game.state.buildings.some(b => b.id === 'institute' && b.category && availableResearchTechs().length)) candidates.push('scholar');
    if (Game.state.buildings.some(b => b.id === 'barracks' || b.id === 'stable' || b.id === 'range') && Game.hasTech('militaryReform')) candidates.push('militaryAccident');
    if (Game.state.events.length >= 3 || !candidates.length) return;
    const type = candidates[Math.floor(Math.random() * candidates.length)];
    if (getEvent(type)) return;
    const event = addEvent(type, { count: 1 + Math.floor(Math.random() * 5) });
    if (type === 'scholar') event.deadlineMonth = month + 3;
    if (type === 'harvest') Game.state.harvestMonth = month;
    if (type === 'drought') Game.state.droughtMonths = 2;
    if (type === 'forestFire') {
      const buildings = Game.state.buildings.filter(b => b.id === 'lumber' || b.id === 'lumbermill');
      Game.state.fireBuildings = buildings.slice(0, Math.max(1, Math.min(buildings.length, 1 + Math.floor(Math.random() * 2)))).map(b => b.x + ':' + b.y);
    }
    if (type === 'caveCollapse') {
      const buildings = Game.state.buildings.filter(b => b.id === 'mine' || b.id === 'minefactory');
      Game.state.caveBuildings = buildings.length ? [buildings[Math.floor(Math.random() * buildings.length)].x + ':' + buildings[Math.floor(Math.random() * buildings.length)].y] : [];
    }
    if (type === 'seaStorm') {
      const buildings = Game.state.buildings.filter(b => b.id === 'dock' || b.id === 'dockyard');
      Game.state.stormBuildings = buildings.length ? [buildings[Math.floor(Math.random() * buildings.length)].x + ':' + buildings[Math.floor(Math.random() * buildings.length)].y] : [];
    }
    if (type === 'surprise') { Game.state.civ += 50; }
    Game.saveState(); renderEventCenter();
  }
  function triggerDebugRandomEvent() {
    if (!Game.state) return;
    const month = eventMonth();
    const candidates = [];
    if (Game.state.villagers >= 5) candidates.push('feast', 'refugees');
    if (Game.state.buildings.some(b => b.id === 'farm' || b.id === 'farmstead')) candidates.push('harvest', 'drought');
    if (Game.state.buildings.some(b => b.id === 'lumber' || b.id === 'lumbermill')) candidates.push('forestFire');
    if (Game.state.buildings.some(b => b.id === 'mine' || b.id === 'minefactory')) candidates.push('caveCollapse');
    if (Game.state.buildings.some(b => b.id === 'dock' || b.id === 'dockyard')) candidates.push('seaStorm');
    if (Game.state.villagers >= 2 && Math.max(0, Game.state.villagers - totalAssigned()) >= 2) candidates.push('missingExplorer');
    if (Game.hasTech('fieldSurvey')) candidates.push('ruins');
    if (Game.state.buildings.some(b => b.id === 'institute' && b.category && availableResearchTechs().length)) candidates.push('scholar');
    if (Game.state.buildings.some(b => ['barracks', 'stable', 'range'].includes(b.id)) && Game.hasTech('militaryReform')) candidates.push('militaryAccident');
    const available = candidates.filter(type => !getEvent(type));
    if (!available.length) return;
    const type = available[Math.floor(Math.random() * available.length)];
    const event = addEvent(type, { count: 1 + Math.floor(Math.random() * 5) });
    if (!event) return;
    if (type === 'harvest') Game.state.harvestMonth = month;
    if (type === 'drought') { Game.state.droughtMonths = 2; event.months = 2; }
    if (type === 'scholar') event.deadlineMonth = month + 3;
    if (type === 'forestFire') {
      const buildings = Game.state.buildings.filter(b => ['lumber', 'lumbermill'].includes(b.id));
      Game.state.fireBuildings = buildings.slice(0, 1).map(b => b.x + ':' + b.y);
    }
    if (type === 'caveCollapse') {
      const buildings = Game.state.buildings.filter(b => ['mine', 'minefactory'].includes(b.id));
      const target = buildings[Math.floor(Math.random() * buildings.length)];
      if (target) Game.state.caveBuildings = [target.x + ':' + target.y];
    }
    if (type === 'seaStorm') {
      const buildings = Game.state.buildings.filter(b => ['dock', 'dockyard'].includes(b.id));
      const target = buildings[Math.floor(Math.random() * buildings.length)];
      if (target) Game.state.stormBuildings = [target.x + ':' + target.y];
    }
    Game.saveState();
    renderEventCenter();
  }
  function chooseEventAction(event, action) {
    const s = Game.state;
    if (!event) return;
    const month = eventMonth();
    if (event.type === 'feast' && action === 'accept') {
      s.feastActive = true; s.feastMonth = month; s.civ += 30 + s.villagers * 5; finishEvent(event);
    } else if (event.type === 'feast' && action === 'decline') finishEvent(event);
    else if (event.type === 'refugees') {
      if (action === 'accept') {
        const room = Math.max(0, Game.hutCapacity() - s.villagers); const count = Math.min(event.count, room);
        if (!count) return;
        s.villagers += count; s.civ += count * 20; s.refugees = s.refugees || []; s.refugees.push({ count, untilMonth: month + 3 });
        for (let i = 0; i < count; i++) { const spot = Game.findVillagerSpot(s.villagersCells); if (spot) s.villagersCells.push(spot); }
        finishEvent(event);
      } else if (action === 'decline') finishEvent(event);
    } else if (event.type === 'forestFire') {
      if (action === 'dispatch') { dispatchExplorer(event, '救火', 1); }
      else if (action === 'wait') { event.untilMonth = month + 2; event.waiting = true; renderEventCenter(); }
    } else if (event.type === 'caveCollapse') {
      if (action === 'reinforce') { event.untilMonth = month; finishEvent(event); }
      else if (action === 'wait') { event.untilMonth = month + 2; event.waiting = true; renderEventCenter(); }
      else if (action === 'force') { event.force = true; event.untilMonth = month + 1; event.accidentRoll = Math.random() < 0.5; renderEventCenter(); }
    } else if (event.type === 'seaStorm') {
      if (action === '避险') { event.untilMonth = month + 1; event.waiting = true; renderEventCenter(); }
      else if (action === '冒险') { event.adventure = true; event.untilMonth = month + 1; event.accidentRoll = Math.random() < 0.5; renderEventCenter(); }
    } else if (event.type === 'missingExplorer') {
      if (action === 'dispatch') dispatchExplorer(event, '寻找失踪探索者', 1);
      else if (action === 'wait') { event.untilMonth = month + 2; event.waiting = true; renderEventCenter(); }
    } else if (event.type === 'tradeLost') {
      if (action === 'dispatch') dispatchExplorer(event, '寻找商队', 1);
      else if (action === 'abandon') losePendingTrade(event);
    } else if (event.type === 'scholar') {
      if (action === 'host') {
        if (s.food < 3 || s.coins < 50) return;
        s.food -= 3; s.coins -= 50; s.civ += 200; const choices = availableResearchTechs();
        if (choices.length) { const tech = choices[Math.floor(Math.random() * choices.length)]; s.techs.push(tech.id); }
        finishEvent(event);
      } else if (action === 'teach' && !s.tutorUsed) {
        if (s.food < 2 || s.coins < 30) return;
        s.food -= 2; s.coins -= 30; s.civ += 100; s.researchBonus = 2; s.tutorUsed = true; finishEvent(event);
      } else if (action === 'decline') finishEvent(event);
    } else if (event.type === 'ruins') { s.civ += [100, 200, 300][Math.floor(Math.random() * 3)]; finishEvent(event); }
    else if (event.type === 'militaryAccident') { event.untilMonth = action === 'repair' ? month : month + 1; if (action === 'repair') finishEvent(event); else { event.waiting = true; renderEventCenter(); } }
    Game.updateStatus(); Game.renderInventory(); Game.saveState();
  }
  function availableResearchTechs() {
    return Object.values(Game.TECHNOLOGIES).filter(tech => !Game.hasTech(tech.id) && (!tech.requires || tech.requires.every(Game.hasTech)));
  }
  function dispatchExplorer(event, label, months) {
    const available = Math.max(0, Game.state.villagers - totalAssigned() - (Game.state.refugees || []).reduce((n, r) => n + r.count, 0) - (Game.state.missingExplorers || 0) - (Game.state.dispatched || []).length);
    if (!available) return;
    event.searching = true; event.untilMonth = eventMonth() + months;
    if (event.type === 'missingExplorer') Game.state.missingExplorers = Math.max(0, (Game.state.missingExplorers || 0) + 1);
    Game.state.dispatched = Game.state.dispatched || []; Game.state.dispatched.push({ eventId: event.id, label, untilMonth: event.untilMonth });
    renderEventCenter(); Game.saveState();
  }
  function losePendingTrade(event) {
    const s = Game.state;
    s.tradePending = null;
    const traderBuilding = s.buildings.find(building => building.id === 'tradepost' && (building.workers || 0) > 0);
    if (traderBuilding) traderBuilding.workers = Math.max(0, (traderBuilding.workers || 0) - 1);
    if (event) event.lost = true;
    finishEvent(event);
    Game.renderLabor();
    Game.updateStatus();
  }
  function renderEventCenter() {
    if (!eventTabs || !eventDetail || !Game.state) return;
    eventTabs.innerHTML = '';
    const events = Game.state.events || [];
    const createEventTab = (event) => {
      const meta = eventMeta(event.type); const button = document.createElement('button');
      button.className = `event-tab event-${meta.tone}` + (openEventId === event.id ? ' active' : '');
      button.innerHTML = `<span class="event-tab-icon">${meta.icon}</span><span>${meta.title}</span>`;
      button.addEventListener('click', () => { openEventId = openEventId === event.id ? null : event.id; renderEventCenter(); });
      return button;
    };
    const visibleEvents = events.slice(0, 3);
    visibleEvents.forEach(event => eventTabs.appendChild(createEventTab(event)));
    if (events.length > visibleEvents.length) {
      const stack = document.createElement('div');
      stack.className = 'event-stack';
      const stackButton = document.createElement('button');
      stackButton.className = 'event-stack-button';
      stackButton.innerHTML = `<span class="event-stack-icon">…</span><b>+${events.length - visibleEvents.length}</b>`;
      stackButton.title = '悬停展开全部事件';
      const stackItems = document.createElement('div');
      stackItems.className = 'event-stack-items';
      events.slice(visibleEvents.length).forEach(event => stackItems.appendChild(createEventTab(event)));
      stack.append(stackButton, stackItems);
      // 悬停展开：停留 1 秒后视为“固定展开”，移开后不自动收起；点击按钮或页面其他位置才收起
      stack.addEventListener('mouseenter', () => {
        stack.classList.add('stack-open');
        clearTimeout(stack.__leaveTimer);
        if (!stack.__pinTimer) {
          stack.__pinTimer = setTimeout(() => { stack.__pinned = true; stack.__pinTimer = null; }, 1000);
        }
      });
      stack.addEventListener('mouseleave', () => {
        if (stack.__pinned) return;
        clearTimeout(stack.__leaveTimer);
        stack.__leaveTimer = setTimeout(() => {
          stack.classList.remove('stack-open');
          stack.__pinned = false;
          if (stack.__pinTimer) { clearTimeout(stack.__pinTimer); stack.__pinTimer = null; }
        }, 300);
      });
      stackButton.addEventListener('click', (e) => {
        e.stopPropagation();
        stack.classList.remove('stack-open');
        stack.__pinned = false;
        if (stack.__pinTimer) { clearTimeout(stack.__pinTimer); stack.__pinTimer = null; }
      });
      eventStackEl = stack;
      eventTabs.appendChild(stack);
    } else {
      eventStackEl = null;
    }
    const event = (Game.state.events || []).find(e => e.id === openEventId);
    if (!event) { eventDetail.classList.add('hidden'); return; }
    const meta = eventMeta(event.type); eventDetail.className = `event-detail event-${meta.tone}`;
    eventDetail.innerHTML = `<b>${meta.title}</b><span>${eventTextFor(event)}</span><div class="event-detail-actions"></div>`;
    const actions = eventDetail.querySelector('.event-detail-actions');
    const addAction = (label, action, disabled) => {
      const button = document.createElement('button'); button.textContent = label; button.disabled = !!disabled;
      button.dataset.tooltip = eventActionHint(event, action);
      button.title = eventActionHint(event, action);
      button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        chooseEventAction(event, action);
      });
      actions.appendChild(button);
    };
    if (event.type === 'feast') { addAction('举办庆典', 'accept'); addAction('不举办', 'decline'); }
    if (event.type === 'refugees') { addAction(`接纳 ${event.count} 名流民`, 'accept', Game.hutCapacity() <= Game.state.villagers); addAction('暂不接纳', 'decline'); }
    if (event.type === 'forestFire') { addAction('派遣探索者救火', 'dispatch', event.searching || event.waiting); addAction('等待火势熄灭', 'wait', event.searching || event.waiting); }
    if (event.type === 'caveCollapse') { addAction('立即加固', 'reinforce', event.waiting); addAction('暂时封闭', 'wait', event.waiting); addAction('强行开采', 'force', event.waiting); }
    if (event.type === 'seaStorm') { addAction('停船避险', '避险', event.waiting); addAction('冒险出海', '冒险', event.waiting); }
    if (event.type === 'missingExplorer') { addAction('派人寻找', 'dispatch', event.searching || event.waiting); addAction('等待归来', 'wait', event.searching || event.waiting); }
    if (event.type === 'tradeLost') { addAction('派遣探索者寻找', 'dispatch', event.searching || event.searchResolved); addAction('放弃寻找', 'abandon', event.searching); }
    if (event.type === 'scholar') { addAction('接待学者', 'host', Game.state.food < 3 || Game.state.coins < 50); addAction('学者授课', 'teach', Game.state.tutorUsed || Game.state.food < 2 || Game.state.coins < 30); addAction('礼貌拒绝', 'decline'); }
    if (event.type === 'ruins') addAction('发掘遗迹', 'excavate');
    if (event.type === 'militaryAccident') { addAction('立即维修', 'repair'); addAction('暂停试验', 'wait'); }
  }
  function showEventPopup(event) {
    if (!event) return;
    const meta = eventMeta(event.type);
    if (eventKicker) eventKicker.textContent = meta.kicker;
    if (eventTitle) eventTitle.textContent = meta.title;
    if (eventText) eventText.textContent = eventTextFor(event);
    if (eventActions) {
      eventActions.innerHTML = '';
      const addAction = (label, action, disabled) => {
        const button = document.createElement('button');
        button.className = 'event-action-btn';
        button.textContent = label;
        button.disabled = !!disabled;
        button.dataset.tooltip = eventActionHint(event, action);
        button.title = eventActionHint(event, action);
        button.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          chooseEventAction(event, action);
          if (!Game.state.events.some(item => item.id === event.id)) closeEmergencyEvent();
          else showEventPopup(event);
        });
        eventActions.appendChild(button);
      };
      if (event.type === 'feast') { addAction('举办庆典', 'accept'); addAction('不举办', 'decline'); }
      if (event.type === 'refugees') { addAction(`接纳 ${event.count} 名流民`, 'accept', Game.hutCapacity() <= Game.state.villagers); addAction('暂不接纳', 'decline'); }
      if (event.type === 'forestFire') { addAction('派遣探索者救火', 'dispatch', event.searching || event.waiting); addAction('等待火势熄灭', 'wait', event.searching || event.waiting); }
      if (event.type === 'caveCollapse') { addAction('立即加固', 'reinforce', event.waiting); addAction('暂时封闭', 'wait', event.waiting); addAction('强行开采', 'force', event.waiting); }
      if (event.type === 'seaStorm') { addAction('停船避险', '避险', event.waiting); addAction('冒险出海', '冒险', event.waiting); }
      if (event.type === 'missingExplorer') { addAction('派人寻找', 'dispatch', event.searching || event.waiting); addAction('等待归来', 'wait', event.searching || event.waiting); }
      if (event.type === 'tradeLost') { addAction('派遣探索者寻找', 'dispatch', event.searching || event.searchResolved); addAction('放弃寻找', 'abandon', event.searching); }
      if (event.type === 'scholar') { addAction('接待学者', 'host', Game.state.food < 3 || Game.state.coins < 50); addAction('学者授课', 'teach', Game.state.tutorUsed || Game.state.food < 2 || Game.state.coins < 30); addAction('礼貌拒绝', 'decline'); }
      if (event.type === 'ruins') addAction('发掘遗迹', 'excavate');
      if (event.type === 'militaryAccident') { addAction('立即维修', 'repair'); addAction('暂停试验', 'wait'); }
    }
    eventOverlay.classList.remove('hidden');
    eventPanel.classList.remove('hidden');
  }
  Game.renderEventCenter = renderEventCenter;
  document.addEventListener('click', (e) => {
    if (eventStackEl && !eventStackEl.contains(e.target)) {
      eventStackEl.classList.remove('stack-open');
      eventStackEl.__pinned = false;
      if (eventStackEl.__pinTimer) { clearTimeout(eventStackEl.__pinTimer); eventStackEl.__pinTimer = null; }
    }
  });
  function showEmergencyEvent(title, text) {
    const type = Object.keys(EVENT_META).find(id => EVENT_META[id].title === title);
    if (type) { addEvent(type); openEventId = getEvent(type)?.id || null; renderEventCenter(); }
    if (eventKicker) eventKicker.textContent = '事件详情';
    if (eventTitle) eventTitle.textContent = title;
    if (eventText) eventText.textContent = text;
    if (!type) {
      if (eventActions) eventActions.innerHTML = '';
      eventOverlay.classList.remove('hidden'); eventPanel.classList.remove('hidden');
    }
  }
  function closeEmergencyEvent() { eventOverlay.classList.add('hidden'); eventPanel.classList.add('hidden'); }
  Game.showEmergencyEvent = showEmergencyEvent;
  Game.showAchievementEvent = function (title, text) { showEmergencyEvent(title, text); };
  document.getElementById('eventClose').addEventListener('click', closeEmergencyEvent);

  Game.addCoins = function (amount) {
    if (!Game.hasTech('currency') || amount <= 0) return false;
    Game.state.coins += amount;
    Game.state.civ += amount;
    Game.saveState();
    Game.updateStatus();
    return true;
  };

  const MARKET_GOODS = [
    { group: '基础原料', batch: 10, goods: [{ id: 'wood', coins: 2 }, { id: 'stone', coins: 2 }, { id: 'berry', coins: 3 }, { id: 'fish', coins: 3 }, { id: 'meat', coins: 4 }, { id: 'wheat', coins: 3 }] },
    { group: '加工材料', batch: 5, goods: [{ id: 'plank', coins: 4 }, { id: 'cloth', coins: 5 }, { id: 'brick', coins: 5 }, { id: 'bread', coins: 5 }, { id: 'clay', coins: 3 }] },
    { group: '矿物与珍品', batch: 1, goods: [{ id: 'iron', coins: 3 }, { id: 'copper', coins: 7 }, { id: 'gold', coins: 9 }, { id: 'amber', coins: 12 }, { id: 'diamond', coins: 18 }] }
  ];
  let marketBuilding = null;
  const marketOverlay = document.getElementById('marketOverlay');
  const marketPanel = document.getElementById('marketPanel');
  function closeMarketPanel() {
    marketBuilding = null;
    marketOverlay.classList.add('hidden');
    marketPanel.classList.add('hidden');
  }
  function openMarketPanel(building) {
    marketBuilding = building;
    renderMarketPanel();
    marketOverlay.classList.remove('hidden');
    marketPanel.classList.remove('hidden');
  }
  Game.openMarketPanel = openMarketPanel;
  document.getElementById('marketClose').addEventListener('click', closeMarketPanel);
  marketOverlay.addEventListener('click', closeMarketPanel);
  function sellMarketGood(good, batch) {
    if (Game.state.mode !== 'creative' && Game.countInventoryItem(good.id) < batch) return;
    if (Game.state.mode !== 'creative') Game.takeInventoryItems([{ id: good.id, n: batch }]);
    Game.addCoins(good.coins);
    Game.state.marketRevenue += good.coins;
    Game.saveState();
    Game.renderInventory();
    Game.updateStatus();
    renderMarketPanel();
  }
  function renderMarketPanel() {
    const status = document.getElementById('marketStatus');
    const groups = document.getElementById('marketGroups');
    const revenue = `累计市场收入 ${Game.state.marketRevenue} 金币。`;
    status.textContent = Game.state.mode === 'creative'
      ? `创造模式：物品可自由售卖，金币仍按市场标价获得。${revenue}`
      : `选择一批库存货物出售。市场即时结算金币，文明程度会随金币同步提升。${revenue}`;
    groups.innerHTML = '';
    MARKET_GOODS.forEach(group => {
      const section = document.createElement('section');
      section.className = 'market-group';
      const title = document.createElement('h3');
      title.textContent = `${group.group} · 每批 ${group.batch} 个`;
      const goods = document.createElement('div');
      goods.className = 'market-good-list';
      group.goods.forEach(good => {
        const item = Game.ITEMS.find(candidate => candidate.id === good.id);
        const stock = Game.countInventoryItem(good.id);
        const ready = Game.state.mode === 'creative' || stock >= group.batch;
        const row = document.createElement('div');
        row.className = 'market-good' + (ready ? ' ready' : '');
        row.innerHTML = `<span class="market-good-icon">${Game.itemIconSVG(good.id)}</span><span class="market-good-name">${item.name}<small>库存 ${stock}</small></span><span class="market-good-price">+${good.coins} 金币</span>`;
        const sell = document.createElement('button');
        sell.className = 'market-sell';
        sell.textContent = `出售 ${group.batch}`;
        sell.disabled = !ready;
        sell.addEventListener('click', () => sellMarketGood(good, group.batch));
        row.appendChild(sell);
        goods.appendChild(row);
      });
      section.append(title, goods);
      groups.appendChild(section);
    });
  }

  const TRADE_POOLS = {
    common: ['wood', 'stone', 'wheat', 'fish', 'meat', 'berry'],
    crafted: ['plank', 'cloth', 'brick', 'bread'],
    rare: ['iron', 'clay', 'copper', 'gold'],
    treasure: ['amber', 'diamond']
  };
  const TRADE_TITLES = {
    easy: ['沿岸聚落补给', '市集原料收购', '村镇民生急件', '工棚日常采购'],
    medium: ['砖窑扩建采购', '远行商队筹备', '工坊联合货单', '山道补给委托'],
    hard: ['跨境商队总单', '城邦建造合约', '大型工坊急件', '远航船队筹备']
  };
  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  const pickMany = (list, count) => {
    const pool = list.slice();
    const result = [];
    while (pool.length && result.length < count) result.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    return result;
  };
  function makeTradeOrder(level) {
    let req = [], coins = 0, bonus = [];
    if (level === 'easy') {
      const id = pick([...TRADE_POOLS.common, ...TRADE_POOLS.crafted]);
      const n = 3 + Math.floor(Math.random() * 4);
      req = [{ id, n }];
      coins = n;
    } else if (level === 'medium') {
      if (Math.random() < 0.35) {
        req = [{ id: pick(TRADE_POOLS.rare), n: 2 + Math.floor(Math.random() * 3) }];
      } else {
        req = pickMany([...TRADE_POOLS.common, ...TRADE_POOLS.crafted], 2).map(id => ({ id, n: 3 + Math.floor(Math.random() * 4) }));
      }
      coins = 9 + req.reduce((sum, item) => sum + item.n, 0);
      bonus = [{ id: pick(TRADE_POOLS.common), n: 2 + Math.floor(Math.random() * 2) }];
    } else {
      const choices = [...TRADE_POOLS.common, ...TRADE_POOLS.crafted, ...TRADE_POOLS.rare];
      req = pickMany(choices, 3).map(id => ({ id, n: 5 + Math.floor(Math.random() * 5) }));
      if (!req.some(item => TRADE_POOLS.rare.includes(item.id))) req[2] = { id: pick(TRADE_POOLS.rare), n: 2 + Math.floor(Math.random() * 3) };
      coins = 22 + req.reduce((sum, item) => sum + item.n, 0);
      bonus = pickMany([...TRADE_POOLS.rare, ...TRADE_POOLS.treasure], 1 + Math.floor(Math.random() * 3)).map(id => ({ id, n: 1 + Math.floor(Math.random() * 2) }));
    }
    return { id: `${level}-${Date.now()}-${Math.random().toString(16).slice(2)}`, level, title: pick(TRADE_TITLES[level]), req, coins, bonus };
  }
  function tradeMonthIndex() { return Math.floor((Game.state.day - 1) / Game.DAYS_PER_MONTH); }
  function generateTradeOrders(force) {
    if (!Game.hasTech('commerce') || (!force && Game.state.tradeOrders.length)) return;
    Game.state.tradeOrders = ['easy', 'medium', 'hard'].map(makeTradeOrder);
  }
  function hasActiveTrader() {
    return Game.state.buildings.some(building => building.id === 'tradepost' && building.workers > 0);
  }
  function canFulfillOrder(order) { return Game.state.mode === 'creative' || Game.hasInventoryItems(order.req); }
  function refreshTradeOrders() {
    if (!Game.state.tradeRefreshes || !hasActiveTrader()) return;
    Game.state.tradeRefreshes = 0;
    generateTradeOrders(true);
    Game.saveState();
    renderTradePanel();
  }
  function settleTradeOrder(order) {
    if (!canFulfillOrder(order) || !hasActiveTrader()) return;
    if (Game.state.mode !== 'creative') Game.takeInventoryItems(order.req);
    Game.state.tradePending = { order, settleMonth: tradeMonthIndex() + 1 };
    Game.state.tradeOrders = [];
    Game.state.tradeRefreshes = 0;
    Game.state.tradeSettledMonth = tradeMonthIndex();
    Game.saveState();
    Game.renderInventory();
    Game.updateStatus();
    renderTradePanel();
    showEmergencyEvent('贸易已交付', `“${order.title}”的货物已交付，金币和附赠物资将在下个月结算。`);
  }
  let tradeBuilding = null;
  const tradeOverlay = document.getElementById('tradeOverlay');
  const tradePanel = document.getElementById('tradePanel');
  function closeTradePanel() {
    tradeBuilding = null;
    tradeOverlay.classList.add('hidden');
    tradePanel.classList.add('hidden');
  }
  function openTradePanel(building) {
    tradeBuilding = building;
    renderTradePanel();
    tradeOverlay.classList.remove('hidden');
    tradePanel.classList.remove('hidden');
  }
  Game.openTradePanel = openTradePanel;
  document.getElementById('tradeClose').addEventListener('click', closeTradePanel);
  tradeOverlay.addEventListener('click', closeTradePanel);
  document.getElementById('tradeRefresh').addEventListener('click', refreshTradeOrders);
  function renderTradeItemList(items) {
    return items.map(entry => {
      const item = Game.ITEMS.find(candidate => candidate.id === entry.id);
      return `<span>${item ? item.name : entry.id}×${entry.n}</span>`;
    }).join('　');
  }
  function renderTradePanel() {
    const status = document.getElementById('tradeStatus');
    const orders = document.getElementById('tradeOrders');
    const refreshCount = document.getElementById('tradeRefreshCount');
    const active = hasActiveTrader();
    refreshCount.textContent = Game.state.tradeRefreshes;
    document.getElementById('tradeRefresh').disabled = !active || !Game.state.tradeRefreshes;
    status.textContent = active
      ? (Game.state.tradeOrders.length ? '选择一项达成的委托提交；完成一项后，本轮其余委托失效。' : '本月已完成贸易委托；下月将送达新的商路公报。')
      : '请先为贸易站分配 1 名贸易员，商队才会送来委托。';
    orders.innerHTML = '';
    if (!Game.state.tradeOrders.length) return;
    Game.state.tradeOrders.forEach(order => {
      const ready = active && canFulfillOrder(order);
      const card = document.createElement('article');
      card.className = `trade-order ${order.level}` + (ready ? ' ready' : '');
      card.innerHTML = `<div class="trade-order-top"><span class="trade-level">${order.level === 'easy' ? '简单' : order.level === 'medium' ? '中等' : '困难'}</span><h3>${order.title}</h3></div><div class="trade-need"><b>交付</b>${renderTradeItemList(order.req)}</div><div class="trade-reward"><b>报酬</b><span>金币 +${order.coins}</span>${order.bonus.length ? `<em>附赠：${renderTradeItemList(order.bonus)}</em>` : ''}</div>`;
      const submit = document.createElement('button');
      submit.className = 'trade-submit';
      submit.textContent = ready ? '提交委托' : (active ? '货物不足' : '等待贸易员');
      submit.disabled = !ready;
      submit.addEventListener('click', () => settleTradeOrder(order));
      card.appendChild(submit);
      orders.appendChild(card);
    });
  }

  let setupInstitute = null;
  const instituteOverlay = document.getElementById('instituteOverlay');
  const institutePanel = document.getElementById('institutePanel');
  function openInstituteSetup(building) {
    setupInstitute = building;
    const choices = document.getElementById('instituteChoices');
    choices.innerHTML = '';
    [
      { id: 'economy', name: '经济', note: '货币、贸易与商路', available: true },
      { id: 'production', name: '生产', note: '食品加工与生产工艺', available: true },
      { id: 'science', name: '科学', note: '知识与探索效率', available: true },
      { id: 'military', name: '军事', note: '军队编制与战备训练', available: true },
      { id: 'culture', name: '文化', note: '文字、教育与大学', available: true }
    ].forEach(option => {
      const button = document.createElement('button');
      button.className = 'institute-choice' + (option.available ? '' : ' locked');
      button.disabled = !option.available;
      button.innerHTML = `<b>${option.name}研究所</b><span>${option.available ? option.note : '规划中'}</span>`;
      if (option.available) button.addEventListener('click', () => {
        if (!setupInstitute) return;
        setupInstitute.category = option.id;
        setupInstitute = null;
        instituteOverlay.classList.add('hidden');
        institutePanel.classList.add('hidden');
        Game.saveState();
        Game.updateStatus();
      });
      choices.appendChild(button);
    });
    instituteOverlay.classList.remove('hidden');
    institutePanel.classList.remove('hidden');
  }
  Game.openInstituteSetup = openInstituteSetup;

  let researchInstitute = null;
  const researchOverlay = document.getElementById('researchOverlay');
  const researchPanel = document.getElementById('researchPanel');
  function closeResearchPanel() {
    researchInstitute = null;
    researchOverlay.classList.add('hidden');
    researchPanel.classList.add('hidden');
  }
  function openResearchPanel(building) {
    researchInstitute = building;
    const title = building.id === 'institute'
      ? ({ production: '生产研究所', economy: '经济研究所', science: '科学研究所', culture: '文化研究所', military: '军事研究所' }[building.category] || '研究所')
      : `${Game.BUILDINGS[building.id].name}研究`;
    document.querySelector('#researchPanel .panel-title').textContent = title;
    renderResearchPanel();
    researchOverlay.classList.remove('hidden');
    researchPanel.classList.remove('hidden');
  }
  Game.openResearchPanel = openResearchPanel;
  document.getElementById('researchClose').addEventListener('click', closeResearchPanel);
  researchOverlay.addEventListener('click', closeResearchPanel);

  function startResearch(tech) {
    const creative = Game.state && Game.state.mode === 'creative';
    if (!researchInstitute || researchInstitute.researchId || Game.hasTech(tech.id) || (!creative && !Game.hasInventoryItems(tech.req))) return;
    if (!creative) Game.takeInventoryItems(tech.req);
    researchInstitute.researchId = tech.id;
    researchInstitute.researchDays = 0;
    Game.saveState();
    Game.renderCrafting();
    renderResearchPanel();
    Game.updateStatus();
  }
  function renderResearchPanel() {
    if (!researchInstitute) return;
    const summary = document.getElementById('researchSummary');
    const list = document.getElementById('researchList');
    const creative = Game.state && Game.state.mode === 'creative';
    const workerReady = creative || (researchInstitute.workers || 0) > 0;
    const researcher = researchInstitute.id === 'institute' ? '科学家' : Game.BUILDINGS[researchInstitute.id].job;
    summary.textContent = researchInstitute.researchId
      ? (workerReady ? `${researcher}正在推进研究` : `研究已暂停：请分配 1 名${researcher}`)
      : (workerReady ? '选择一项可研究的科技' : `请先在信息面板分配 1 名${researcher}`);
    list.innerHTML = '';
    const techs = researchInstitute.id === 'institute'
      ? Object.values(Game.TECHNOLOGIES).filter(tech => tech.category === researchInstitute.category)
      : Object.values(Game.TECHNOLOGIES).filter(tech => tech.buildingId === researchInstitute.id);
    techs.forEach(tech => {
      const done = Game.hasTech(tech.id);
      const locked = tech.requires && !tech.requires.every(Game.hasTech);
      const active = researchInstitute.researchId === tech.id;
      const row = document.createElement('div');
      row.className = 'research-tech' + (done ? ' complete' : '') + (active ? ' active' : '');
      const title = document.createElement('div');
      title.className = 'research-tech-title';
      title.textContent = tech.name;
      const desc = document.createElement('div');
      desc.className = 'research-tech-desc';
      desc.textContent = tech.desc;
      const meta = document.createElement('div');
      meta.className = 'research-tech-meta';
      const progress = active ? Math.min(tech.days, researchInstitute.researchDays || 0) : 0;
      meta.textContent = done ? '已完成' : (locked ? '需先完成前置科技' : (active ? `研究中 ${progress} / ${tech.days} 天` : `耗时 ${tech.days / Game.DAYS_PER_MONTH} 个月 · ${Game.reqText(tech.req)}`));
      row.append(title, desc, meta);
      if (!done && !locked && !active) {
        const button = document.createElement('button');
        button.className = 'research-start';
        button.textContent = creative || Game.hasInventoryItems(tech.req) ? '开始研究' : '资源不足';
        button.disabled = (!creative && !Game.hasInventoryItems(tech.req)) || !!researchInstitute.researchId;
        button.addEventListener('click', () => startResearch(tech));
        row.appendChild(button);
      }
      list.appendChild(row);
    });
  }
  function tickResearch(building) {
    const canResearch = (building.id === 'institute' && ['economy', 'production', 'science', 'culture', 'military'].includes(building.category)) || !!Game.TECHNOLOGIES[building.researchId] && Game.TECHNOLOGIES[building.researchId].buildingId === building.id;
    if (!canResearch || !building.researchId || (!building.workers && Game.state.mode !== 'creative')) return;
    const tech = Game.TECHNOLOGIES[building.researchId];
    if (!tech) return;
    building.researchDays = (building.researchDays || 0) + speed * (Game.state.researchBonus || 1);
    if (building.researchDays < tech.days) return;
    if (!Game.state.techs.includes(tech.id)) Game.state.techs.push(tech.id);
    if (tech.id === 'literacy') {
      const priorTechs = Game.state.techs.filter(id => id !== 'literacy');
      Game.state.civ += 200 + priorTechs.length * 50;
      Game.state.techCivRewarded = Game.state.techs.slice();
      // 科技完成只更新状态，不再弹出提醒。
    } else if (Game.hasTech('literacy') && !Game.state.techCivRewarded.includes(tech.id)) {
      Game.state.techCivRewarded.push(tech.id);
      Game.state.civ += 100;
    }
    building.researchId = null;
    building.researchDays = 0;
    Game.renderInventory();
    Game.renderRecipeList();
    Game.renderCrafting();
    Game.saveState();
    // 研究完成后只刷新研究面板、配方与状态，不再弹出事件提醒。
    if (researchInstitute === building) renderResearchPanel();
  }

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

  const militaryToggle = document.getElementById('militaryToggle');
  const militaryPanel = document.getElementById('militaryPanel');
  militaryToggle.addEventListener('click', () => {
    militaryPanel.classList.toggle('hidden');
    militaryToggle.classList.toggle('open', !militaryPanel.classList.contains('hidden'));
    if (!militaryPanel.classList.contains('hidden')) renderMilitary();
  });

  function renderMilitary() {
    const summary = document.getElementById('militarySummary');
    const list = document.getElementById('militaryList');
    if (!summary || !list) return;
    const total = Object.values(Game.state.military || {}).reduce((sum, count) => sum + (Number(count) || 0), 0);
    summary.textContent = `现有军力 ${total} 人 · 军队生产与作战系统暂未开放`;
    list.innerHTML = '';
    Game.MILITARY_UNITS.forEach(unit => {
      const unlocked = !unit.unlock || Game.hasTech(unit.unlock);
      const building = Game.BUILDINGS[unit.building];
      const row = document.createElement('div');
      row.className = 'military-row' + (unlocked ? '' : ' locked');
      const icon = document.createElement('span');
      icon.className = 'military-icon';
      icon.innerHTML = Game.itemIconSVG(unit.building);
      const info = document.createElement('span');
      info.className = 'military-unit';
      info.innerHTML = `<b>${unit.name}</b><small>${building.name}${unlocked ? '' : ' · 尚未解锁'}</small>`;
      const count = document.createElement('span');
      count.className = 'military-count';
      count.textContent = `${unlocked ? (Game.state.military[unit.id] || 0) : '—'} 人`;
      row.append(icon, info, count);
      list.appendChild(row);
    });
  }
  Game.renderMilitary = renderMilitary;

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
    const unavailable = (Game.state.refugees || []).reduce((n, r) => n + r.count, 0) + (Game.state.missingExplorers || 0) + (Game.state.dispatched || []).length;
    const explorers = Math.max(0, total - assigned - unavailable);
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
    const refugees = (Game.state.refugees || []).reduce((n, r) => n + r.count, 0);
    if (refugees > 0) rows.push({ icon: Game.explorerIconSVG(), name: '流民', count: refugees });
    (Game.state.dispatched || []).forEach(d => rows.push({ icon: Game.explorerIconSVG(), name: `被派遣${d.label}中`, count: 1 }));
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
    if (Game.state && Game.state.mode === 'creative') return 0;
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
    const unavailable = (Game.state.refugees || []).reduce((n, r) => n + r.count, 0) + (Game.state.missingExplorers || 0) + (Game.state.dispatched || []).length;
    const idle = Math.max(0, Game.state.villagers - totalAssigned() - unavailable);

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
    if (modeId === 'creative') {
      Game.state.buildings.forEach(b => { b.workers = Game.BUILDINGS[b.id].laborCap || 0; });
      Game.saveState();
    }
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
    if (modeId === 'creative') Game.state.buildings.forEach(b => { b.workers = Game.BUILDINGS[b.id].laborCap || 0; });
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

  // 归一化：兼容旧版记录 → 统一为 { d, c, t, ts, name, save } 对象
  //（d = 历时天数, c = 文明指数, t = 存档创建时间戳[存档独一性], ts = 本次成绩提交时间, name = 玩家名, save = 存档名）
  (function normalizeRanks() {
    let changed = false;
    Game.GAME_MODES.forEach(m => {
      const list = Game.rankings[m.id];
      if (!Array.isArray(list)) return;
      Game.rankings[m.id] = list.map(e => {
        if (typeof e === 'number') { changed = true; return { d: e, c: 0, t: 0, ts: 0, name: '', save: '' }; }
        const en = {
          d: Number(e.d) || 0, c: Number(e.c) || 0,
          t: Number(e.t) || 0, ts: Number(e.ts) || Number(e.t) || 0,
          name: String(e.name || ''), save: String(e.save || e.saveName || '')
        };
        if (en.ts !== (Number(e.ts) || Number(e.t) || 0) || en.name !== (e.name || '') || en.save !== (e.save || e.saveName || '')) changed = true;
        return en;
      });
    });
    if (changed) saveRankings();
  })();

  function saveRankings() {
    Game.store.set(RANK_KEY, JSON.stringify(Game.rankings));
  }

  // 取某模式的排名列表：每个存档（以存档创建时间戳 t 标识）只保留最新一条成绩，再排序、截取前 10
  function rankEntries(mode) {
    const list = Game.rankings[mode];
    if (!Array.isArray(list)) return [];
    const entries = [];
    list.forEach(e => {
      if (typeof e === 'number') entries.push({ d: e, c: 0, t: 0, ts: 0, name: '', save: '' });
      else if (e && typeof e === 'object') entries.push({
        d: Number(e.d) || 0, c: Number(e.c) || 0,
        t: Number(e.t) || 0, ts: Number(e.ts) || Number(e.t) || 0,
        name: String(e.name || ''), save: String(e.save || e.saveName || '')
      });
    });
    const best = new Map();
    entries.forEach(en => {
      const cur = best.get(en.t);
      if (!cur || en.ts > cur.ts) best.set(en.t, en);
    });
    const deduped = Array.from(best.values());
    if (mode === 'freedom') deduped.sort((a, b) => b.c - a.c);
    else deduped.sort((a, b) => a.d - b.d);
    return deduped.slice(0, 10);
  }
  Game.rankEntries = rankEntries;

  // 记录一条成绩并持久化，返回 { list, index }：index 为刚写入条目在榜单中的位置（-1 表示未进前 10）
  // 以存档创建时间戳（Game.state.createdAt）作为存档独一性：同一存档再次记录时覆盖旧成绩，只保留最新一条
  function recordRanking(mode, day, civ) {
    const list = Game.rankings[mode] || [];
    const saveTs = (Game.state && Game.state.createdAt) || 0;
    let entry = saveTs ? list.find(e => e && e.t === saveTs) : null;
    if (entry) {
      entry.d = day;
      entry.c = civ;
      entry.ts = Date.now();
      entry.name = (Game.state && Game.state.playerName) || entry.name || '';
      entry.save = (Game.state && Game.state.saveName) || entry.save || '';
    } else {
      entry = {
        d: day,
        c: civ,
        t: saveTs,
        ts: Date.now(),
        name: (Game.state && Game.state.playerName) || '',
        save: (Game.state && Game.state.saveName) || ''
      };
      list.push(entry);
    }
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
      const nm = makeRankNameCell(e.name, e.save);
      const time = document.createElement('span');
      time.className = 'rank-score';
      time.textContent = rankScoreText(Game.state.mode, e);
      row.append(no, nm, time);
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

  let rankCountSeq = 0;
  // 在线去重后各模式条目数（按存档 save_ts 去重）
  function onlineEntryCount(rows) {
    if (!Array.isArray(rows)) return 0;
    const seen = new Set();
    rows.forEach(r => seen.add(String(r.save_ts == null ? '' : r.save_ts)));
    return seen.size;
  }
  // 排行榜按钮角标：配置了在线排行时显示在线总条数（各模式去重后合计），否则显示本地条数
  function updateRankEntry() {
    const el = document.getElementById('rankCount');
    if (!el) return;
    if (!Game.ONLINE_ENABLED()) {
      const n = rankTotalCount();
      el.textContent = n ? String(n) : '';
      return;
    }
    const seq = ++rankCountSeq;
    Promise.all(Game.GAME_MODES.map(m =>
      loadOnlineRanking(m.id).then(rows => onlineEntryCount(rows)).catch(function () { return 0; })
    )).then(counts => {
      if (seq !== rankCountSeq) return;
      const total = counts.reduce((s, n) => s + n, 0);
      el.textContent = total ? String(total) : '';
    });
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
        save_ts: Game.state.createdAt || 0,
        days: Math.max(1, day),
        civ: Math.max(0, civ),
        created_at: new Date().toISOString()
      })
    }).catch(function () {});
  }
  Game.submitOnlineRanking = submitOnlineRanking;

  // 拉取某模式在线成绩（按提交时间倒序，前端再按存档创建时间戳去重保留每存档最新一条）
  function loadOnlineRanking(mode) {
    const url = Game.SUPABASE_URL + '/rest/v1/' + Game.ONLINE_TABLE +
      '?select=player_name,save_name,save_ts,days,civ,created_at' +
      '&mode=eq.' + encodeURIComponent(mode) +
      '&order=created_at.desc';
    return fetch(url, {
      headers: { apikey: Game.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + Game.SUPABASE_ANON_KEY }
    }).then(function (res) { return res.json(); });
  }
  Game.loadOnlineRanking = loadOnlineRanking;

  // 在线成绩：每个存档（以 save_ts 标识）只保留提交时间最新的一条，再按模式规则排序取前 10
  function onlineEntries(rows) {
    if (!Array.isArray(rows)) return [];
    const best = new Map();
    rows.forEach(r => {
      const key = String(r.save_ts == null ? '' : r.save_ts);
      if (best.has(key)) return;
      best.set(key, {
        d: Number(r.days) || 0,
        c: Number(r.civ) || 0,
        name: String(r.player_name || ''),
        save: String(r.save_name || '')
      });
    });
    const list = Array.from(best.values());
    if (rankMode === 'freedom') list.sort((a, b) => b.c - a.c);
    else list.sort((a, b) => a.d - b.d);
    return list.slice(0, 10);
  }

  // 玩家名 + 存档名 展示格：存档名作为副行显示
  function makeRankNameCell(playerName, saveName) {
    const cell = document.createElement('span');
    cell.className = 'rank-name';
    const main = document.createElement('span');
    main.textContent = playerName || '匿名';
    cell.appendChild(main);
    if (saveName) {
      const sub = document.createElement('span');
      sub.className = 'rank-name-sub';
      sub.textContent = '📁 ' + saveName;
      cell.appendChild(sub);
    }
    return cell;
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
      const nm = makeRankNameCell(r.name, r.save);
      const sc = document.createElement('span');
      sc.className = 'rank-score';
      sc.textContent = rankMode === 'freedom' ? String(r.c) : formatElapsed(r.d);
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
    const hm = document.createElement('span');
    hm.textContent = '玩家';
    const hr = document.createElement('span');
    hr.textContent = rankMode === 'freedom' ? '文明指数' : '历时';
    head.append(hl, hm, hr);
    body.appendChild(head);

    list.forEach((e, i) => {
      const row = document.createElement('div');
      row.className = 'rank-row' + (i === 0 ? ' top' : '');
      const no = document.createElement('span');
      no.className = 'rank-no';
      no.textContent = String(i + 1);
      const nm = makeRankNameCell(e.name, e.save);
      const score = document.createElement('span');
      score.className = 'rank-score';
      score.textContent = rankScoreText(rankMode, e);
      row.append(no, nm, score);
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
  <li><b>核心循环</b>：基地探索 → 合成与建造 → 分配劳动力 → 研究科技 → 贸易与扩张。</li>
  <li>初始自带 1 座城镇中心（容 3 人）与 <b>2 名探索者</b>，他们会自动采集、无需时刻操作。</li>
  <li>本指南会介绍基础经营、食物、研究和贸易；军事与大学玩法仍在持续扩展。</li>
</ul>`,
      onShow(stage) {
        const n = stage.querySelector('.gs-civnum');
        if (n) animateNumber(n, 0, 120, 1400);
      }
    },
    {
      scene() {
        return `<div class="gs-scene gs-rec">
          <div class="gs-rec-title">食物储备</div>
          <div class="gs-rec-row"><span class="gs-rec-src"><i>${Game.itemIconSVG('berry')}</i><i>${Game.itemIconSVG('fish')}</i><i>${Game.itemIconSVG('meat')}</i><i>${Game.itemIconSVG('bread')}</i></span><span class="gs-rec-arrow">➜</span><span class="gs-rec-out">食物储备</span></div>
          <div class="gs-rec-note">烤肉、烤鱼需要食品加工科技后解锁</div>
        </div>`;
      },
      text: `<div class="guide-page-title">食物储备</div>
<ul>
  <li>初始拥有 <b>10 点食物储备</b>，每月每名人口消耗 1 点。</li>
  <li>浆果、鱼、生肉、面包各提供 1 点食物。拖入合成器后，点击「<b>加入食物仓</b>」统一存入。</li>
  <li>完成生产研究所的<b>食品加工</b>后，烤肉、烤鱼解锁，每份可提供 3 点食物。</li>
  <li>食物归零会触发「食物紧缺」紧急事件；当前版本只作提醒，后续将加入应对玩法。</li>
</ul>`
    },
    {
      scene() {
        return `<div class="gs-scene gs-rec">
          <div class="gs-rec-title">研究与贸易</div>
          <div class="gs-rec-row"><span class="gs-rec-src"><i>${Game.itemIconSVG('institute')}</i></span><span class="gs-rec-arrow">➜</span><span class="gs-rec-out">生产 · 经济 · 科学 · 文化 · 军事</span></div>
          <div class="gs-rec-row"><span class="gs-rec-src"><i>${Game.itemIconSVG('market')}</i></span><span class="gs-rec-arrow">➜</span><span class="gs-rec-out">金币与文明</span></div>
        </div>`;
      },
      text: `<div class="guide-page-title">研究、市场与贸易</div>
<ul>
  <li>合成并放置<b>研究所</b>后选择方向，分配 1 名科学家，消耗资源与时间完成科技。</li>
  <li>生产研究解锁食品加工、仓储管理；科学研究的野外勘察使探索抽取翻倍；文化研究可推进文字、教育与大学。</li>
  <li>经济路线为<b>货币制度 → 市场制度 → 商业契约</b>。货币制度后，金币会同步提高文明程度。</li>
  <li><b>市场</b>可稳定出售库存货物；<b>贸易站</b>由贸易员带来三档随机委托，收益更高但每月只能结算一项。</li>
  <li>完成「文字与度量」会触发成就，并为此前科技补发文明；之后每项新科技都会增加文明程度。</li>
</ul>`
    },
    {
      scene() {
        const cards = Game.GAME_MODES.map(m => `
          <div class="gs-mode-card${m.locked ? ' gs-mode-locked' : (m.id === 'civilization' ? ' gs-mode-civ' : '')}">
            <span class="gs-mode-ico">${gsModeIcon(m.id)}</span>
            <b>${m.name}</b>
            <i>${m.locked ? (m.lockNote || '尚未开放') : (m.id === 'civilization' ? '文明指数达 9999 获胜' : (m.id === 'creative' ? '无限资源 · 自由建造' : '无胜利标准 · 自由发展'))}</i>
          </div>`).join('');
        return `
        <div class="gs-scene gs-modes">
          <div class="gs-mode-list">${cards}</div>
          <div class="gs-mode-note">选择模式后进入游戏 · 各模式独立记录最佳成绩</div>
        </div>`;
      },
      text: `<div class="guide-page-title">选择游戏模式</div>
<p>开始菜单提供多种模式，各自<b>独立存档</b>并<b>独立排行</b>：</p>
<ul>
  <li><b>文明模式</b>：文明指数达到 <b>9999</b> 获胜，按游戏内历时排名。</li>
  <li><b>科技模式</b>：发展出任一项高级科技获胜 —— <b>尚未开放</b>，敬请期待。</li>
  <li><b>自由模式</b>：没有胜负标准，自由发展，返回主菜单时按文明指数留档。</li>
  <li><b>创造模式</b>：资源与食物无限；在合成列表直接点击即可创造物品，建筑自动满员。金币仍需通过市场或贸易获得。</li>
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
  <li><b>右上角状态区</b>：人口、文明程度、食物储备、金币与当前模式；劳动力、军事按钮可展开对应数据面板。</li>
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
  <li><b>物品栏（8×4 格）</b>：存放材料与合成好的建筑。研究「仓储管理」后扩展至 8×8 格；支持拖动移动、双击合并堆叠、长按约 0.5 秒整组移动。</li>
  <li><b>合成器（3×3 格）</b>：把材料拖进格子，凑齐配方后点击下方<b>成品</b>合成；食物拖入后可点击「加入食物仓」。</li>
  <li><b>信息面板</b>：点击地图上的建筑 / 地块后，这里显示详细数据。</li>
  <li>底部按钮：<b>⚙️ 设置 · 📜 合成 · 🏗️ 扩建 · ▶ 速度</b>；劳动力与军事入口位于右上角。</li>
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
           <div class="gs-g-count">基地 4 格 + 探索者 ×2 · 每月 2 次</div>
          <div class="gs-g-inv">
            ${inv.map(id => id
              ? `<span class="gs-inv-cell"><span class="gs-inv-ico">${Game.itemIconSVG(id)}</span></span>`
              : `<span class="gs-inv-cell"></span>`).join('')}
          </div>
        </div>`;
      },
      text: `<div class="guide-page-title">基地采集</div>
<p><b>基地</b>（地图上的虚线窗口）是自动探索引擎：</p>
<ul>
  <li>基地每有 <b>20 格</b>提供 1 次抽取，每名探索者额外提供 1 次。初始 2 名探索者 = 每月 2 次。</li>
  <li>各资源独立按基地覆盖地貌的<b>概率加权</b>判定：森林格多→木头概率更高，山地格多→石头与铁矿概率更高，海洋格→有鱼的概率。</li>
  <li>把基地扩到更富的地貌上，产出更丰富、地貌揭示更快。</li>
  <li>科学研究所的「野外勘察」可让每月抽取次数翻倍。</li>
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
<p>地图由多种地貌组成，颜色代表类型；每种资源按独立<b>出现概率与数量范围</b>判定：</p>
<ul>
  <li><b>森林</b>：稳定提供木头，并有少量石头、浆果机会。</li>
  <li><b>草原</b>：较高木头概率，并可能获得浆果、石头。</li>
  <li><b>山地</b>：稳定石头，并有较高铁矿机会。</li>
  <li><b>黏土山</b>：稳定黏土；<b>湿地</b>：稳定提供木头、浆果、生肉，并可能获得黏土、石头。</li>
  <li><b>矿洞</b>：稳定石头，有铁矿、金矿、铜矿与珍品机会。</li>
  <li><b>海洋</b>：稳定提供鱼；<b>平原</b>：木头、石头、铁矿、黏土、浆果均有机会。</li>
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
  <li><b>钓船小屋</b>：2 木板 + 1 布匹 —— 须临水，每月产 2 条鱼。</li>
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
  <li>工人塞太多会让探索者不足、基地探索与揭示变慢，初期注意<b>平衡</b>。</li>
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
  <li>初始最多覆盖 <b>15 格</b>；每满 1000 文明增加 15 格，最高可覆盖 300 格。</li>
  <li>覆盖更多、更富的地貌 → 探索概率更丰富、产出更多样。</li>
  <li>扩到<b>海洋</b>可产出鱼，扩到<b>湿地</b>可获生肉 / 浆果。</li>
  <li>特殊地貌需要探索抽取来<b>揭示</b>；双击地块可查看具体产出概率。</li>
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
    foodEl.textContent = Game.state.mode === 'creative' ? '无限' : Game.state.food;
    const currencyUnlocked = Game.hasTech('currency');
    coinPill.classList.toggle('hidden', !currencyUnlocked);
    coinsEl.textContent = Game.state.coins;
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
    totalVal.textContent = `共 ${total} / ${Game.baseAreaLimit()} 格`;
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
          const perWorker = buildingProduceAmount(b, p);
          const amount = perWorker * workers;
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

    if (b.id === 'institute') {
      const researchBtn = document.createElement('button');
      researchBtn.type = 'button';
      researchBtn.className = 'bi-labor-btn research-open-btn';
      if (!b.category) {
        researchBtn.textContent = '选择研究方向';
        researchBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          Game.openInstituteSetup(b);
        });
      } else {
        const active = b.researchId ? Game.TECHNOLOGIES[b.researchId] : null;
        const categoryName = { production: '生产', economy: '经济', science: '科学', culture: '文化', military: '军事' }[b.category] || '研究';
        researchBtn.textContent = active ? `研究中：${active.name}` : `查看${categoryName}研究`;
        researchBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          Game.openResearchPanel(b);
        });
      }
      card.appendChild(researchBtn);
    }

    const buildingTech = Object.values(Game.TECHNOLOGIES).find(tech => tech.buildingId === b.id);
    if (buildingTech) {
      const researchBtn = document.createElement('button');
      researchBtn.type = 'button';
      researchBtn.className = 'bi-labor-btn research-open-btn';
      researchBtn.textContent = Game.hasTech(buildingTech.id)
        ? `${buildingTech.name}：已完成`
        : (b.researchId ? `研究中：${buildingTech.name}` : `研发：${buildingTech.name}`);
      researchBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        Game.openResearchPanel(b);
      });
      card.appendChild(researchBtn);
    }

    if (b.id === 'tradepost') {
      const tradeBtn = document.createElement('button');
      tradeBtn.type = 'button';
      tradeBtn.className = 'bi-labor-btn trade-open-btn';
      tradeBtn.textContent = '查看贸易委托';
      tradeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        Game.openTradePanel(b);
      });
      card.appendChild(tradeBtn);
    }

    if (b.id === 'market') {
      const marketBtn = document.createElement('button');
      marketBtn.type = 'button';
      marketBtn.className = 'bi-labor-btn market-open-btn';
      marketBtn.textContent = '进入市场';
      marketBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        Game.openMarketPanel(b);
      });
      card.appendChild(marketBtn);
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
      if ((Game.state.fireBuildings || []).includes(b.x + ':' + b.y) || (Game.state.caveBuildings || []).includes(b.x + ':' + b.y) || (Game.state.stormBuildings || []).includes(b.x + ':' + b.y)) return;
      let produced = false;
      // 生产力建筑：n 个劳动力 → 每个劳动力按基准 x 独立产出一次（含矿物等随机产出）
      for (let i = 0; i < b.workers; i++) {
        def.produces.forEach(p => {
          const itemId = typeof p.item === 'function' ? p.item() : p.item;
          const amount = buildingProduceAmount(b, p);
          if (Game.addItemToInventory(itemId, amount)) {
            Game.state.civ += amount;
            produced = true;
          }
        });
      }
      if (produced) Game.saveState();
    }
  }

  // 基地产出：每 20 格基地提供 1 次抽取，每名探索者额外提供 1 次；野外勘察科技使总次数翻倍。
  // 每种资源独立按基地覆盖地貌的概率加权平均判定。
  // 团的揭示进度：每格每月增速 = 抽取次数。
  // 揭示阈值 = 团格数 × 2
  let baseTimer = 0;
  function getProductionPenalty() {
    const event = getEvent('foodShortage');
    if (!event) return 1;
    if ((event.months || 0) >= 4) return 0.5;
    if ((event.months || 0) >= 2) return 0.75;
    return 1;
  }
  function getExplorationPenalty() {
    const event = getEvent('foodShortage');
    if (!event) return 1;
    if ((event.months || 0) >= 4) return 0.5;
    if ((event.months || 0) >= 2) return 0.75;
    return 1;
  }
  // 基地内的生产建筑效率提升 50%；折算后一律四舍五入
  function buildingInsideBase(building) {
    const base = Game.base;
    if (!base || !building) return false;
    return building.x >= base.x && building.y >= base.y &&
      building.x < base.x + base.w && building.y < base.y + base.h;
  }
  function buildingEfficiencyMultiplier(b) {
    return buildingInsideBase(b) ? 1.5 : 1;
  }
  // 单名劳动力每月的真实产出（已折算科技、基地加成、庆典 / 丰收 / 干旱 / 缺粮影响，并四舍五入）
  function buildingProduceAmount(b, p) {
    const month = eventMonth();
    let amount = (typeof p.amount === 'function' ? p.amount() : p.amount) * Game.productionMultiplier(b.id) * buildingEfficiencyMultiplier(b);
    if (Game.state.harvestMonth === month && (b.id === 'farm' || b.id === 'farmstead')) amount *= 2;
    if (Game.state.droughtMonths > 0 && (b.id === 'farm' || b.id === 'farmstead')) amount *= 0.5;
    if (Game.state.feastActive && Game.state.feastMonth === month) amount *= 0.75;
    amount = Math.max(1, Math.round(amount));
    return Math.max(1, Math.round(amount * getProductionPenalty()));
  }
  function baseProduce() {
    const b = Game.base;
    if (!b || !Game.world) return;
    const cells = [];
    const terrainCounts = {};
    for (let y = b.y; y < b.y + b.h; y++) {
      for (let x = b.x; x < b.x + b.w; x++) {
        if (x < 0 || x >= Game.MAP_W || y < 0 || y >= Game.MAP_H) continue;
        cells.push([x, y]);
        const raw = Game.world.terrain[y][x];
        const terrain = raw == null ? Game.TERRAIN.SEA : raw;
        terrainCounts[terrain] = (terrainCounts[terrain] || 0) + 1;
      }
    }
    if (!cells.length) return;
    const unavailable = (Game.state.refugees || []).reduce((n, r) => n + r.count, 0) + (Game.state.missingExplorers || 0) + (Game.state.dispatched || []).length;
    const explorers = Math.max(0, Game.state.villagers - totalAssigned() - unavailable);
    let draws = Game.explorationDraws(cells.length, explorers);
    if (Game.state.feastActive && Game.state.feastMonth === eventMonth()) draws = Math.max(0, Math.round(draws * 0.75));
    draws = Math.max(0, Math.round(draws * getExplorationPenalty()));
    const touched = new Set();
    for (const [x, y] of cells) {
      const raw = Game.world.terrain[y][x];
      if (raw != null) {
        const ci = Game.world.clumpIndex[y][x];
        if (ci >= 0) {
          const c = Game.world.clumps[ci];
          if (!c.revealed) { c.progress += draws; touched.add(ci); }
        }
      }
    }
    for (let i = 0; i < draws; i++) {
      Game.rollExploration(terrainCounts).forEach(([id, n]) => {
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
    maybeCreateRandomEvents();
    Game.state.buildings.forEach(b => {
      tickBuilding(b, Game.BUILDINGS[b.id]);
      tickResearch(b);
    });
    baseTimer += speed;
    if (baseTimer >= Game.DAYS_PER_MONTH) { baseTimer = 0; baseProduce(); }
    popTimer += speed;
    if (popTimer >= Game.DAYS_PER_MONTH) {
      popTimer = 0;
      const requiredFood = Game.state.villagers;
      const previousFood = Game.state.food;
      const month = eventMonth();
      const refugeeFood = (Game.state.refugees || []).reduce((n, r) => n + r.count, 0);
      const feastCost = Game.state.feastActive && Game.state.feastMonth === month ? 2 : 1;
      if (Game.state.mode !== 'creative') Game.state.food = Math.max(0, Game.state.food - (requiredFood + refugeeFood) * feastCost);
      let shortage = getEvent('foodShortage');
      if (Game.state.mode !== 'creative' && Game.state.food === 0) {
        if (!shortage) shortage = addEvent('foodShortage', { months: 0 });
        shortage.months = (shortage.months || 0) + 1;
        Game.state.foodShortageActive = true;
      } else if (shortage) {
        finishEvent(shortage); Game.state.foodShortageActive = false;
      }
      if (Game.state.feastActive && Game.state.feastMonth < month) Game.state.feastActive = false;
      if (Game.state.harvestMonth !== month) Game.state.harvestMonth = -1;
      if (Game.state.droughtMonths > 0) Game.state.droughtMonths--;
      (Game.state.refugees || []).forEach(r => { if (r.untilMonth <= month) r.done = true; });
      Game.state.refugees = (Game.state.refugees || []).filter(r => !r.done);
      const cap = Game.hutCapacity();
      (Game.state.dispatched || []).filter(d => d.untilMonth <= month).forEach(d => {
        Game.state.dispatched = Game.state.dispatched.filter(x => x !== d);
        const event = (Game.state.events || []).find(e => e.id === d.eventId);
        if (event) {
          if (event.type === 'tradeLost') {
            if (Math.random() < 0.5) {
              event.searching = false; event.resolved = true;
              const pending = Game.state.tradePending;
              if (pending) {
                Game.addCoins(pending.order.coins);
                pending.order.bonus.forEach(item => Game.addItemToInventory(item.id, item.n));
                Game.state.tradePending = null;
                finishEvent(event);
              }
            } else { event.searching = false; event.untilMonth = month + 1; }
          } else {
            if (event.type === 'missingExplorer') Game.state.missingExplorers = Math.max(0, (Game.state.missingExplorers || 0) - 1);
            finishEvent(event);
          }
        }
      });
      (Game.state.events || []).slice().forEach(event => {
        if (event.untilMonth != null && event.untilMonth <= month && event.waiting) finishEvent(event);
        if (event.type === 'scholar' && event.deadlineMonth != null && event.deadlineMonth <= month) finishEvent(event);
      });
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
      Game.saveState();
    }
    if (Game.state.tradePending && tradeMonthIndex() >= Game.state.tradePending.settleMonth && !getEvent('tradeLost')) {
      const pending = Game.state.tradePending;
      if (Math.random() < 0.25) addEvent('tradeLost', { order: pending.order });
      else {
        Game.addCoins(pending.order.coins);
        pending.order.bonus.forEach(item => Game.addItemToInventory(item.id, item.n));
        Game.state.tradePending = null;
        showEmergencyEvent('贸易完成', `“${pending.order.title}”已结算，获得 ${pending.order.coins} 金币。`);
      }
    }
    const currentTradeMonth = tradeMonthIndex();
    if (hasActiveTrader() && Game.state.tradeSettledMonth !== currentTradeMonth) {
      if (!Game.state.tradeOrders.length) generateTradeOrders();
      Game.state.tradeRefreshes = 1;
      Game.saveState();
      if (tradeBuilding) renderTradePanel();
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
