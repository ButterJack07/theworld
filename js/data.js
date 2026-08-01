(function () {
  'use strict';

  const Game = window.Game = window.Game || {};

  // ---------- 地图尺寸 ----------
  Game.MAP_W = 30;
  Game.MAP_H = 20;
  Game.CELL = 30;
  Game.TILE = { OCEAN: 0, LAND: 1 };

  // ---------- 物品 ----------
  Game.ITEMS = [
    { id: 'wood',   name: '木头', color: '#c0b283', w: 1, h: 1 },
    { id: 'stone',  name: '石头', color: '#aaa69b', w: 1, h: 1 },
    { id: 'iron',   name: '铁矿', color: '#8a9a7b', w: 1, h: 1 },
    { id: 'food',   name: '食物', color: '#d6c08f', w: 1, h: 1 },
    { id: 'grain',  name: '粮食', color: '#d8c290', w: 1, h: 1 },
    { id: 'cloth',  name: '布匹', color: '#c9b8b3', w: 1, h: 1 },
    { id: 'gold',   name: '金矿', color: '#cfa86a', w: 1, h: 1 },
    { id: 'plank',  name: '木板', color: '#b7a678', w: 2, h: 1 },
    { id: 'brick',  name: '砖块', color: '#c49a83', w: 2, h: 2 },
    { id: 'hut',    name: '茅草屋', color: '#f0e2c0', w: 1, h: 1 },
    { id: 'lumber', name: '伐木场', color: '#e9dcba', w: 1, h: 1 },
    { id: 'mine',   name: '采矿场', color: '#dbd4c6', w: 1, h: 1 },
    { id: 'dock',   name: '钓船码头', color: '#cfe3e6', w: 1, h: 1 },
  ];

  // 卡通简约物品图标（统一 viewBox 40x40）
  Game.ITEM_ICONS = {
    wood: '<rect x="9" y="14" width="20" height="6" rx="3" fill="#c49a6a"/>' +
          '<rect x="9" y="14" width="20" height="6" rx="3" fill="none" stroke="#8a6a45" stroke-width="1.2"/>' +
          '<rect x="7" y="22" width="26" height="8" rx="4" fill="#b98f5f"/>' +
          '<rect x="7" y="22" width="26" height="8" rx="4" fill="none" stroke="#8a6a45" stroke-width="1.2"/>' +
          '<path d="M13 26h14" stroke="#8a6a45" stroke-width="1" opacity="0.5"/>',
    stone: '<path d="M10 27 Q8 18 14 15 Q20 12 26 15 Q32 18 30 27 Q28 31 20 31 Q12 31 10 27 Z" fill="#b3ada2"/>' +
           '<path d="M10 27 Q8 18 14 15 Q20 12 26 15 Q32 18 30 27 Q28 31 20 31 Q12 31 10 27 Z" fill="none" stroke="#7d7a70" stroke-width="1.2"/>' +
           '<path d="M15 16 q3 -3 6 -1" stroke="#fff" stroke-width="1.4" fill="none" opacity="0.6"/>' +
           '<path d="M13 24 q6 2 12 0" stroke="#8a8378" stroke-width="1" fill="none" opacity="0.6"/>',
    iron: '<rect x="10" y="15" width="20" height="13" rx="3" fill="#a7a29a"/>' +
          '<rect x="10" y="15" width="20" height="13" rx="3" fill="none" stroke="#6f6c64" stroke-width="1.2"/>' +
          '<path d="M10 19h20" stroke="#6f6c64" stroke-width="1" opacity="0.5"/>' +
          '<path d="M16 21q2 -2 4 0q3 2 5 0" stroke="#8a9a7b" stroke-width="1.6" fill="none" opacity="0.9"/>',
    food: '<ellipse cx="19" cy="20" rx="12" ry="7" fill="#e0a078"/>' +
          '<ellipse cx="19" cy="20" rx="12" ry="7" fill="none" stroke="#b57a50" stroke-width="1.2"/>' +
          '<path d="M7 20 L3 15 L3 25 Z" fill="#e0a078" stroke="#b57a50" stroke-width="1.2"/>' +
          '<circle cx="24" cy="18" r="1.4" fill="#b57a50"/>' +
          '<path d="M12 20 q3 -2 6 0" stroke="#b57a50" stroke-width="1" fill="none" opacity="0.5"/>',
    grain: '<rect x="19" y="18" width="2" height="13" rx="1" fill="#b98f4f"/>' +
           '<ellipse cx="20" cy="17" rx="6.5" ry="4.5" fill="#e6cc6a"/>' +
           '<ellipse cx="20" cy="17" rx="6.5" ry="4.5" fill="none" stroke="#a3823f" stroke-width="1.2"/>' +
           '<path d="M13.5 17 h13" stroke="#a3823f" stroke-width="1" opacity="0.5"/>' +
           '<path d="M19 22 q-4 2 -6 5" stroke="#b98f4f" stroke-width="1.6" fill="none" stroke-linecap="round"/>' +
           '<path d="M21 22 q4 2 6 5" stroke="#b98f4f" stroke-width="1.6" fill="none" stroke-linecap="round"/>',
    cloth: '<rect x="10" y="12" width="20" height="16" rx="3" fill="#d8c6c0"/>' +
           '<rect x="10" y="12" width="20" height="16" rx="3" fill="none" stroke="#9a7f78" stroke-width="1.2"/>' +
           '<path d="M10 18 h20 M10 24 h20" stroke="#9a7f78" stroke-width="1" opacity="0.45"/>' +
           '<path d="M14 15 h12" stroke="#fff" stroke-width="1.4" opacity="0.5"/>',
    gold: '<circle cx="27" cy="13" r="3" fill="#e0b876" stroke="#a3823f" stroke-width="1.2"/>' +
          '<rect x="10" y="17" width="20" height="11" rx="3" fill="#e0b876"/>' +
          '<rect x="10" y="17" width="20" height="11" rx="3" fill="none" stroke="#a3823f" stroke-width="1.2"/>' +
          '<path d="M14 22 l12 -4" stroke="#a3823f" stroke-width="1.2" opacity="0.6"/>',
    plank: '<rect x="4" y="16" width="32" height="9" rx="3" fill="#b7a678"/>' +
           '<rect x="4" y="16" width="32" height="9" rx="3" fill="none" stroke="#8a7a4f" stroke-width="1.2"/>' +
           '<path d="M8 20.5h24" stroke="#8a7a4f" stroke-width="1" opacity="0.5"/>' +
           '<circle cx="8" cy="20.5" r="2" fill="#8a7a4f"/>' +
           '<circle cx="32" cy="20.5" r="2" fill="#8a7a4f"/>',
    brick: '<rect x="8" y="13" width="24" height="7" rx="2" fill="#c49a83"/>' +
           '<rect x="8" y="22" width="11" height="7" rx="2" fill="#b98d76"/>' +
           '<rect x="21" y="22" width="11" height="7" rx="2" fill="#c49a83"/>' +
           '<g fill="none" stroke="#8a5a45" stroke-width="1.2">' +
           '<rect x="8" y="13" width="24" height="7" rx="2"/>' +
           '<rect x="8" y="22" width="11" height="7" rx="2"/>' +
           '<rect x="21" y="22" width="11" height="7" rx="2"/></g>' +
            '<path d="M13 16.5h14 M12 25.5h3 M24 25.5h3" stroke="#8a5a45" stroke-width="1" opacity="0.5"/>',
    hut: '<rect x="5" y="13" width="30" height="22" rx="5" fill="#f0e2c0"/>' +
         '<rect x="5" y="13" width="30" height="9" rx="5" fill="#d6b078"/>' +
         '<g fill="none" stroke="#8a6a4f" stroke-width="1.3">' +
         '<rect x="5" y="13" width="30" height="9" rx="5"/>' +
         '<rect x="5" y="13" width="30" height="22" rx="5"/></g>' +
         '<rect x="17" y="24" width="7" height="11" rx="2.5" fill="#8a6a4f"/>' +
         '<rect x="26" y="16" width="6" height="6" rx="1.5" fill="#fffdf5" stroke="#8a6a4f" stroke-width="1"/>',
    lumber: '<rect x="5" y="13" width="30" height="22" rx="5" fill="#e9dcba"/>' +
            '<rect x="5" y="13" width="30" height="9" rx="5" fill="#b8c99e"/>' +
            '<g fill="none" stroke="#a9855f" stroke-width="1.3">' +
            '<rect x="5" y="13" width="30" height="9" rx="5"/>' +
            '<rect x="5" y="13" width="30" height="22" rx="5"/></g>' +
            '<rect x="8" y="24" width="7" height="5" rx="2" fill="#a9855f"/>' +
            '<rect x="16" y="24" width="7" height="5" rx="2" fill="#a9855f"/>' +
            '<rect x="24" y="24" width="7" height="5" rx="2" fill="#a9855f"/>' +
            '<rect x="12" y="30" width="7" height="5" rx="2" fill="#a9855f"/>' +
            '<path d="M8 26.5h7 M16 26.5h7 M24 26.5h7 M12 32.5h7" stroke="#fff" stroke-width="1.2" opacity="0.5"/>',
    mine: '<rect x="5" y="13" width="30" height="22" rx="5" fill="#dbd4c6"/>' +
          '<rect x="5" y="13" width="30" height="9" rx="5" fill="#b4ada0"/>' +
          '<g fill="none" stroke="#7d7a70" stroke-width="1.3">' +
          '<rect x="5" y="13" width="30" height="9" rx="5"/>' +
          '<rect x="5" y="13" width="30" height="22" rx="5"/></g>' +
          '<rect x="13" y="22" width="15" height="13" rx="3" fill="#6f6c64"/>' +
          '<rect x="8" y="23" width="4" height="3" rx="1" fill="#8d8a80"/>' +
          '<rect x="28" y="27" width="4" height="3" rx="1" fill="#8d8a80"/>' +
          '<rect x="10" y="30" width="3" height="3" rx="1" fill="#8d8a80"/>' +
          '<path d="M14 24h13" stroke="#a7a29a" stroke-width="1" opacity="0.6"/>',
    dock: '<rect x="5" y="13" width="30" height="22" rx="5" fill="#cfe3e6"/>' +
          '<rect x="5" y="13" width="30" height="9" rx="5" fill="#a9ccd4"/>' +
          '<g fill="none" stroke="#6f98a3" stroke-width="1.3">' +
          '<rect x="5" y="13" width="30" height="9" rx="5"/>' +
          '<rect x="5" y="13" width="30" height="22" rx="5"/></g>' +
          '<rect x="6" y="27" width="28" height="7" rx="3" fill="#a4becb" stroke="#6f98a3" stroke-width="1"/>' +
          '<ellipse cx="16" cy="30" rx="4" ry="2.4" fill="#e0a078"/>' +
          '<path d="M12 30 L9 28 L9 32 Z" fill="#e0a078"/>' +
          '<circle cx="18" cy="29" r="0.8" fill="#6f98a3"/>'
  };
  Game.itemIconSVG = function (id) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" preserveAspectRatio="none">' + (Game.ITEM_ICONS[id] || '') + '</svg>';
  };

  // ---------- 建筑 ----------
  Game.BUILDINGS = {
    hut: {
      id: 'hut', name: '茅草屋',
      body: '#f0e2c0', roof: '#d6b078', accent: '#8a6a4f',
      produces: [{ item: 'grain', amount: 1 }], interval: 10, capacity: 5
    },
    lumber: {
      id: 'lumber', name: '伐木场',
      body: '#e9dcba', roof: '#b8c99e', accent: '#a9855f',
      produces: [{ item: 'wood', amount: 2 }], interval: 8
    },
    mine: {
      id: 'mine', name: '采矿场',
      body: '#dbd4c6', roof: '#b4ada0', accent: '#7d7a70',
      produces: [{ item: 'stone', amount: 1 }, { item: 'iron', amount: 1 }], interval: 12
    },
    dock: {
      id: 'dock', name: '钓船码头',
      body: '#cfe3e6', roof: '#a9ccd4', accent: '#6f98a3',
      produces: [{ item: 'food', amount: 2 }], interval: 6
    }
  };

  // ---------- 物品栏 ----------
  Game.INV_COLS = 8;
  Game.INV_ROWS = 4;
  Game.INV_CELL = 42;
  Game.MAX_STACK = 100;    // 每组物品堆叠上限

  // ---------- 合成器 ----------
  Game.CRAFT_COLS = 3;
  Game.CRAFT_ROWS = 3;
  Game.CRAFT_CELL = 42;

  // ---------- 合成配方 ----------
  Game.RECIPES = [
    { out: 'plank', group: 'material', req: [{ id: 'wood', n: 2 }] },
    { out: 'cloth', group: 'material', req: [{ id: 'wood', n: 1 }, { id: 'stone', n: 1 }] },
    { out: 'brick', group: 'material', req: [{ id: 'stone', n: 2 }, { id: 'iron', n: 1 }] },
    { out: 'gold',  group: 'material', req: [{ id: 'iron', n: 2 }, { id: 'wood', n: 1 }] },
    { out: 'hut',    group: 'building', req: [{ id: 'plank', n: 2 }, { id: 'cloth', n: 1 }] },
    { out: 'lumber', group: 'building', req: [{ id: 'plank', n: 4 }, { id: 'stone', n: 1 }] },
    { out: 'mine',   group: 'building', req: [{ id: 'brick', n: 2 }, { id: 'cloth', n: 1 }] },
    { out: 'dock',   group: 'building', req: [{ id: 'plank', n: 2 }, { id: 'cloth', n: 2 }, { id: 'gold', n: 1 }] }
  ];
  Game.RECIPE_GROUPS = [
    { key: 'material', title: '材料合成' },
    { key: 'building', title: '建筑合成' }
  ];

  function reqText(req) {
    return req.map(q => `${Game.ITEMS.find(i => i.id === q.id).name}×${q.n}`).join(' + ');
  }
  Game.reqText = reqText;

  // ---------- 绘制配色 ----------
  Game.OCEAN_COLOR = '#a4becb';
  Game.LAND_COLOR  = '#b5c5a3';
  Game.GRID_LINE   = 'rgba(255, 253, 247, 0.5)';
})();
