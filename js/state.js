(function () {
  'use strict';

  const Game = window.Game = window.Game || {};

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  Game.store = store;

  const SEED_PREFIX = 'tw-seed-';
  const GAME_PREFIX = 'tw-game-';
  const LAST_MODE_KEY = 'tw-last';
  const SCREEN_KEY = 'tw-screen';
  Game.LAST_MODE_KEY = LAST_MODE_KEY;
  Game.setScreen = function (s) { store.set(SCREEN_KEY, s); };
  Game.getScreen = function () { return store.get(SCREEN_KEY); };
  Game.mode = null;
  Game.seed = null;
  Game.seedKey = function (mode) { return SEED_PREFIX + mode; };
  Game.gameKey = function (mode) { return GAME_PREFIX + mode; };

  Game.state = null;
  Game.displayDay = 1;

  // 迁移：旧版单一存档（tw-game / tw-seed）归入文明模式，避免历史进度丢失
  (function migrateOldSave() {
    const oldGame = store.get('tw-game');
    if (!oldGame) return;
    if (store.get(Game.gameKey('civilization'))) return;
    try {
      const s = JSON.parse(oldGame);
      if (s && s.version === 2) {
        store.set(Game.gameKey('civilization'), oldGame);
        const oldSeed = store.get('tw-seed');
        if (oldSeed) store.set(Game.seedKey('civilization'), oldSeed);
        store.set('tw-game', 'null');
        store.set('tw-seed', 'null');
      }
    } catch (e) {}
  })();

  function resetState(mode) {
    Game.mode = mode;
    Game.placed = Game.initInventory();
    Game.craftingItems = [];
    Game.state = { villagers: 0, villagersCells: [], buildings: [], civ: 0, coins: 0, food: 10, foodShortageActive: false, techs: [], tradeOrders: [], tradeRefreshes: 0, tradeSettledMonth: -1, day: 1, mode: mode || 'civilization', won: false, playerName: '', saveName: '', createdAt: Date.now() };
    Game.base = { ...Game.BASE_DEFAULT };
    Game.spawnStarterTown();
    // 初始人口 2：为每位人口分配一个站格（空闲劳动力 = 探索者）
    Game.state.villagers = 2;
    Game.state.villagersCells = [];
    for (let i = 0; i < Game.state.villagers; i++) {
      const spot = Game.findVillagerSpot(Game.state.villagersCells);
      if (!spot) break;
      Game.state.villagersCells.push(spot);
    }
    Game.displayDay = Game.state.day;
    saveState();
  }
  Game.resetState = resetState;

  function saveState() {
    store.set(Game.gameKey(Game.mode), JSON.stringify({
       version: 3,
      seed: Game.seed,
      villagers: Game.state.villagers,
      villagersCells: Game.state.villagersCells,
       buildings: Game.state.buildings.map(b => ({ id: b.id, x: b.x, y: b.y, rot: b.rot, workers: b.workers || 0, category: b.category || null, researchId: b.researchId || null, researchDays: b.researchDays || 0 })),
       civ: Game.state.civ,
       coins: Game.state.coins,
       food: Game.state.food,
       foodShortageActive: !!Game.state.foodShortageActive,
       techs: Array.isArray(Game.state.techs) ? Game.state.techs : [],
       tradeOrders: Array.isArray(Game.state.tradeOrders) ? Game.state.tradeOrders : [],
       tradeRefreshes: Game.state.tradeRefreshes || 0,
       tradeSettledMonth: Number.isInteger(Game.state.tradeSettledMonth) ? Game.state.tradeSettledMonth : -1,
      day: Game.state.day,
      mode: Game.state.mode,
      won: Game.state.won,
      playerName: Game.state.playerName || '',
      saveName: Game.state.saveName || '',
      createdAt: Game.state.createdAt || 0,
      base: Game.base,
      placed: Game.placed.map(p => ({ id: p.item.id, col: p.col, row: p.row, count: p.count })),
      crafting: Game.craftingItems.map(p => ({ id: p.item.id, col: p.col, row: p.row, count: p.count })),
      clumps: Game.world.clumps.map(c => ({ id: c.id, progress: c.progress, revealed: c.revealed }))
    }));
  }
  Game.saveState = saveState;

  function loadState() {
    let saved = null;
    try { saved = JSON.parse(store.get(Game.gameKey(Game.mode))); } catch (e) { saved = null; }
    // 旧版存档（无 version 或月制前版本）不兼容：改月制后直接重新开始
    if (saved && saved.version !== 2 && saved.version !== 3) saved = null;
    if (saved && saved.seed === Game.seed) {
      Game.state = {
        villagers: saved.villagers || 0,
        villagersCells: Array.isArray(saved.villagersCells) ? saved.villagersCells : [],
        buildings: (saved.buildings || []).filter(b => Game.BUILDINGS[b.id]).map(b => ({
          id: b.id, x: b.x, y: b.y, rot: b.rot, workers: Math.min(b.workers || 0, Game.BUILDINGS[b.id].laborCap || 0), category: b.category || null, researchId: b.researchId || null, researchDays: b.researchDays || 0
        })),
        civ: saved.civ || 0,
        coins: Math.max(0, Number(saved.coins) || 0),
        food: Math.max(0, Number.isFinite(saved.food) ? saved.food : 10),
        foodShortageActive: !!saved.foodShortageActive,
        techs: Array.isArray(saved.techs) ? saved.techs.filter(id => Game.TECHNOLOGIES[id]) : [],
        tradeOrders: Array.isArray(saved.tradeOrders) ? saved.tradeOrders : [],
        tradeRefreshes: Math.min(1, Math.max(0, saved.tradeRefreshes || 0)),
        tradeSettledMonth: Number.isInteger(saved.tradeSettledMonth) ? saved.tradeSettledMonth : -1,
        day: saved.day || 1,
        mode: ['civilization', 'technology', 'freedom', 'creative'].includes(saved.mode) ? saved.mode : 'civilization',
        won: !!saved.won,
        playerName: String(saved.playerName || ''),
        saveName: String(saved.saveName || ''),
        createdAt: saved.createdAt || 0
      };
      if (saved.towncenter) Game.state.buildings.push({ id: 'towncenter', x: saved.towncenter.x, y: saved.towncenter.y, workers: 0 });
      Game.displayDay = Game.state.day;
      Game.base = saved.base && saved.base.x !== undefined
        ? { x: saved.base.x, y: saved.base.y, w: saved.base.w, h: saved.base.h }
        : { ...Game.BASE_DEFAULT };
      Game.placed = (saved.placed || []).map(p => {
        const item = Game.ITEMS.find(i => i.id === (p.id === 'food' ? 'fish' : p.id));
        return item ? { item, col: p.col, row: p.row, count: p.count || 1 } : null;
      }).filter(Boolean);
      Game.craftingItems = (saved.crafting || []).map(p => {
        const item = Game.ITEMS.find(i => i.id === (p.id === 'food' ? 'fish' : p.id));
        return item ? { item, col: p.col, row: p.row, count: p.count || 1 } : null;
      }).filter(Boolean);
      // 恢复特殊地貌团的进度与揭示状态（世界由 seed 确定性重建，id 一一对应）
      if (Array.isArray(saved.clumps)) {
        saved.clumps.forEach(s => {
          const c = Game.world.clumps.find(c => c.id === s.id);
          if (c) {
            c.progress = s.progress || 0;
            if (s.revealed) Game.revealClump(c);
          }
        });
      }
      // 恢复地图上的自动合并：2×2 茅草屋→砖瓦屋、2×2 砖瓦屋→四合院、
      // 2×2 伐木小屋→伐木工场、2×2 采矿小屋→采矿工场、横/竖 3 连钓船小屋→钓船码头
      if (Game.mergeHuts) Game.mergeHuts();
      if (Game.mergeBrickhouses) Game.mergeBrickhouses();
      if (Game.mergeLumbermills) Game.mergeLumbermills();
      if (Game.mergeMineFactories) Game.mergeMineFactories();
      if (Game.mergeFarms) Game.mergeFarms();
      if (Game.mergeDockyards) Game.mergeDockyards();
      while (Game.state.villagersCells.length < Game.state.villagers) {
        const spot = Game.findVillagerSpot(Game.state.villagersCells);
        if (!spot) break;
        Game.state.villagersCells.push(spot);
      }
    }
  }
  Game.loadState = loadState;

  // 指定模式是否存在可继续的存档（有存档且版本、seed 匹配）
  Game.hasSave = function (mode) {
    let saved = null;
    try { saved = JSON.parse(store.get(Game.gameKey(mode))); } catch (e) { saved = null; }
    if (!saved || (saved.version !== 2 && saved.version !== 3)) return false;
    const savedSeed = parseInt(store.get(Game.seedKey(mode)), 10);
    return Number.isInteger(savedSeed) && saved.seed === savedSeed;
  };

  // 读取指定模式的存档（用于开始菜单展示历史记录），无有效存档返回 null
  Game.readSave = function (mode) {
    let saved = null;
    try { saved = JSON.parse(store.get(Game.gameKey(mode))); } catch (e) { saved = null; }
    if (!saved || (saved.version !== 2 && saved.version !== 3)) return null;
    return saved;
  };
})();
