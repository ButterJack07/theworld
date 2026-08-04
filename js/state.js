(function () {
  'use strict';

  const Game = window.Game = window.Game || {};

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  Game.store = store;

  const SEED_KEY = 'tw-seed';
  const GAME_KEY = 'tw-game';
  Game.SEED_KEY = SEED_KEY;
  Game.GAME_KEY = GAME_KEY;

  let seed = parseInt(store.get(SEED_KEY), 10);
  if (!Number.isInteger(seed) || seed < 0) {
    seed = Math.floor(Math.random() * 1e9);
    store.set(SEED_KEY, String(seed));
  }
  Game.seed = seed;

  Game.state = null;
  Game.displayDay = 1;

  function resetState() {
    Game.placed = Game.initInventory();
    Game.craftingItems = [];
    Game.state = { villagers: 0, villagersCells: [], buildings: [], civ: 0, day: 1 };
    Game.base = { ...Game.BASE_DEFAULT };
    Game.spawnStarterHut();
    Game.displayDay = Game.state.day;
    saveState();
  }
  Game.resetState = resetState;

  function saveState() {
    store.set(GAME_KEY, JSON.stringify({
      version: 2,
      seed: Game.seed,
      villagers: Game.state.villagers,
      villagersCells: Game.state.villagersCells,
      buildings: Game.state.buildings.map(b => ({ id: b.id, x: b.x, y: b.y, rot: b.rot })),
      civ: Game.state.civ,
      day: Game.state.day,
      base: Game.base,
      placed: Game.placed.map(p => ({ id: p.item.id, col: p.col, row: p.row, count: p.count })),
      crafting: Game.craftingItems.map(p => ({ id: p.item.id, col: p.col, row: p.row, count: p.count })),
      clumps: Game.world.clumps.map(c => ({ id: c.id, progress: c.progress, revealed: c.revealed }))
    }));
  }
  Game.saveState = saveState;

  function loadState() {
    let saved = null;
    try { saved = JSON.parse(store.get(GAME_KEY)); } catch (e) { saved = null; }
    // 旧版存档（无 version）不兼容：改月制后直接重新开始
    if (saved && saved.version !== 2) saved = null;
    if (saved && saved.seed === Game.seed) {
      Game.state = {
        villagers: saved.villagers || 0,
        villagersCells: Array.isArray(saved.villagersCells) ? saved.villagersCells : [],
        buildings: (saved.buildings || []).filter(b => Game.BUILDINGS[b.id]),
        civ: saved.civ || 0,
        day: saved.day || 1
      };
      if (saved.hut) Game.state.buildings.push({ id: 'hut', x: saved.hut.x, y: saved.hut.y });
      Game.displayDay = Game.state.day;
      Game.base = saved.base && saved.base.x !== undefined
        ? { x: saved.base.x, y: saved.base.y, w: saved.base.w, h: saved.base.h }
        : { ...Game.BASE_DEFAULT };
      Game.placed = (saved.placed || []).map(p => {
        const item = Game.ITEMS.find(i => i.id === p.id);
        return item ? { item, col: p.col, row: p.row, count: p.count || 1 } : null;
      }).filter(Boolean);
      Game.craftingItems = (saved.crafting || []).map(p => {
        const item = Game.ITEMS.find(i => i.id === p.id);
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
    } else {
      resetState();
    }
  }
  Game.loadState = loadState;
})();
