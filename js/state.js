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
    Game.displayDay = Game.state.day;
    saveState();
  }
  Game.resetState = resetState;

  function saveState() {
    store.set(GAME_KEY, JSON.stringify({
      seed: Game.seed,
      villagers: Game.state.villagers,
      villagersCells: Game.state.villagersCells,
      buildings: Game.state.buildings.map(b => ({ id: b.id, x: b.x, y: b.y })),
      civ: Game.state.civ,
      day: Game.state.day,
      placed: Game.placed.map(p => ({ id: p.item.id, col: p.col, row: p.row, count: p.count })),
      crafting: Game.craftingItems.map(p => ({ id: p.item.id, col: p.col, row: p.row, count: p.count }))
    }));
  }
  Game.saveState = saveState;

  function loadState() {
    let saved = null;
    try { saved = JSON.parse(store.get(GAME_KEY)); } catch (e) { saved = null; }
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
      Game.placed = (saved.placed || []).map(p => {
        const item = Game.ITEMS.find(i => i.id === p.id);
        return item ? { item, col: p.col, row: p.row, count: p.count || 1 } : null;
      }).filter(Boolean);
      Game.craftingItems = (saved.crafting || []).map(p => {
        const item = Game.ITEMS.find(i => i.id === p.id);
        return item ? { item, col: p.col, row: p.row, count: p.count || 1 } : null;
      }).filter(Boolean);
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
