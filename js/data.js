(function () {
  'use strict';

  const Game = window.Game = window.Game || {};

  // ---------- 地图尺寸 ----------
  Game.MAP_W = 30;
  Game.MAP_H = 20;
  Game.CELL = 30;
  Game.TILE = { OCEAN: 0, LAND: 1 };

  // ---------- 时间制：1 tick = 1 天，一年 12 个月 × 30 天 = 360 天 ----------
  Game.DAYS_PER_MONTH = 30;
  Game.MONTHS_PER_YEAR = 12;
  Game.DAYS_PER_YEAR = 360;

  // ---------- 地貌属性 ----------
  Game.TERRAIN = {
    PLAIN: 0,          // 平原：未揭示 / 无特殊地貌的地块
    GRASSLAND: 1,      // 草原（最常见）
    FOREST: 2,         // 森林
    CLAY_MOUNTAIN: 3,  // 黏土山
    WETLAND: 4,        // 湿地（最少见）
    MOUNTAIN: 5,       // 山地
    MINE: 6,           // 矿洞（每张地图固定刷一个）
    SEA: 7             // 海洋地貌：基地覆盖到海洋时按此计算，产 1 条鱼
  };
  Game.TERRAIN_NAMES = {
    [Game.TERRAIN.PLAIN]: '平原',
    [Game.TERRAIN.GRASSLAND]: '草原',
    [Game.TERRAIN.FOREST]: '森林',
    [Game.TERRAIN.CLAY_MOUNTAIN]: '黏土山',
    [Game.TERRAIN.WETLAND]: '湿地',
    [Game.TERRAIN.MOUNTAIN]: '山地',
    [Game.TERRAIN.MINE]: '矿洞',
    [Game.TERRAIN.SEA]: '海洋'
  };
  Game.TERRAIN_COLORS = {
    [Game.TERRAIN.PLAIN]: '#c8c4a8',
    [Game.TERRAIN.GRASSLAND]: '#a9c896',
    [Game.TERRAIN.FOREST]: '#5f8f5a',
    [Game.TERRAIN.CLAY_MOUNTAIN]: '#d0a878',
    [Game.TERRAIN.WETLAND]: '#7aa6a8',
    [Game.TERRAIN.MOUNTAIN]: '#9a8f80',
    [Game.TERRAIN.MINE]: '#6b6b70',
    [Game.TERRAIN.SEA]: '#a4becb'
  };

  // 特殊地貌：成块随机刷新（一团 3~20 格，矿洞固定一个 6~12 格），总覆盖率约 50%
  Game.TERRAIN_SPECIALS = [
    { type: Game.TERRAIN.GRASSLAND,     weight: 10, appear: 1.00 },
    { type: Game.TERRAIN.FOREST,        weight: 6,  appear: 0.85 },
    { type: Game.TERRAIN.CLAY_MOUNTAIN, weight: 5,  appear: 0.75 },
    { type: Game.TERRAIN.MOUNTAIN,      weight: 5,  appear: 0.75 },
    { type: Game.TERRAIN.WETLAND,       weight: 2,  appear: 0.45 }
  ];

  // 矿洞 5% 稀有矿物池（未来新增矿物在此追加，均分该概率）
  Game.TERRAIN_MINE_RARE = ['amber', 'diamond'];

  // 采矿小屋每月的矿物产出：铁 60% / 金 15% / 铜 15% / 稀有矿物 10%
  Game.rollMineMineral = function () {
    const r = Math.random();
    if (r < 0.60) return 'iron';
    if (r < 0.75) return 'gold';
    if (r < 0.90) return 'copper';
    return Game.TERRAIN_MINE_RARE[Math.floor(Math.random() * Game.TERRAIN_MINE_RARE.length)];
  };

  // 各地貌产出（一个阶段 = 1 个月；每个单位 1 份，基地覆盖该地貌多格则叠加）
  Game.TERRAIN_TABLE = {
    [Game.TERRAIN.PLAIN]: {
      desc: '2 木头 或 2 石头 或 1 铁矿 或 1 黏土 或 1 浆果',
      output(rand) {
        const opt = [['wood', 2], ['stone', 2], ['iron', 1], ['clay', 1], ['berry', 1]][Math.floor(rand() * 5)];
        return [opt];
      }
    },
    [Game.TERRAIN.GRASSLAND]: {
      desc: '3 木头 或 1 浆果 或 1 石头',
      output(rand) {
        const opt = [['wood', 3], ['berry', 1], ['stone', 1]][Math.floor(rand() * 3)];
        return [opt];
      }
    },
    [Game.TERRAIN.FOREST]: {
      desc: '3~6 木头',
      output(rand) { return [['wood', 3 + Math.floor(rand() * 4)]]; }
    },
    [Game.TERRAIN.CLAY_MOUNTAIN]: {
      desc: '2~4 黏土',
      output(rand) { return [['clay', 2 + Math.floor(rand() * 3)]]; }
    },
    [Game.TERRAIN.WETLAND]: {
      desc: '2~3 木头 + 1~2 浆果 + 1~2 生肉 + 0~1 黏土 + 0~1 石头',
      output(rand) {
        return [
          ['wood', 2 + (rand() < 0.5 ? 1 : 0)],
          ['berry', 1 + (rand() < 0.5 ? 1 : 0)],
          ['meat', 1 + (rand() < 0.5 ? 1 : 0)],
          ['clay', rand() < 0.5 ? 1 : 0],
          ['stone', rand() < 0.5 ? 1 : 0]
        ].filter(q => q[1] > 0);
      }
    },
    [Game.TERRAIN.MOUNTAIN]: {
      desc: '3~5 石头 + 0~2 铁矿',
      output(rand) {
        const out = [['stone', 3 + Math.floor(rand() * 3)]];
        const iron = Math.floor(rand() * 3);
        if (iron > 0) out.push(['iron', iron]);
        return out;
      }
    },
    [Game.TERRAIN.MINE]: {
      desc: '2~3 石头 + 2~4 铁矿(70%) 或 金(10%) 或 铜(15%) 或 琥珀·钻石(5%)',
      output(rand) {
        const out = [['stone', 2 + Math.floor(rand() * 2)]];
        const r = rand();
        if (r < 0.70) out.push(['iron', 2 + Math.floor(rand() * 3)]);
        else if (r < 0.80) out.push(['gold', 1]);
        else if (r < 0.95) out.push(['copper', 1]);
        else out.push([Game.TERRAIN_MINE_RARE[Math.floor(rand() * Game.TERRAIN_MINE_RARE.length)], 1]);
        return out;
      }
    },
    [Game.TERRAIN.SEA]: {
      desc: '1 条鱼',
      output() { return [['fish', 1]]; }
    }
  };
  Game.terrainOutput = function (type) {
    const def = Game.TERRAIN_TABLE[type];
    return def ? def.output(Math.random) : [];
  };

  // ---------- 基地：地图上的可拖动边角缩放的灰色窗口 ----------
  Game.BASE_DEFAULT = { x: Math.floor((Game.MAP_W - 2) / 2), y: Math.floor((Game.MAP_H - 2) / 2), w: 2, h: 2 };
  Game.BASE_MIN_W = 2;
  Game.BASE_MIN_H = 2;
  // 基地地貌产出概率：每月每块覆盖格只有 10% 概率完成一次产出
  Game.BASE_PRODUCE_CHANCE = 0.10;

  // ---------- 物品 ----------
  Game.ITEMS = [
    { id: 'wood',   name: '木头', color: '#c0b283', w: 1, h: 1 },
    { id: 'stone',  name: '石头', color: '#aaa69b', w: 1, h: 1 },
    { id: 'iron',   name: '铁矿', color: '#8a9a7b', w: 1, h: 1 },
    { id: 'food',   name: '食物', color: '#d6c08f', w: 1, h: 1 },
    { id: 'grain',  name: '粮食', color: '#d8c290', w: 1, h: 1 },
    { id: 'cloth',  name: '布匹', color: '#c9b8b3', w: 1, h: 1 },
    { id: 'gold',   name: '金矿', color: '#cfa86a', w: 1, h: 1 },
    { id: 'clay',   name: '黏土', color: '#c9a98a', w: 1, h: 1 },
    { id: 'berry',  name: '浆果', color: '#d08a7a', w: 1, h: 1 },
    { id: 'copper', name: '铜矿', color: '#cf9a6a', w: 1, h: 1 },
    { id: 'meat',   name: '生肉', color: '#d06a5a', w: 1, h: 1 },
    { id: 'amber',  name: '琥珀', color: '#e0a64f', w: 1, h: 1 },
    { id: 'diamond', name: '钻石', color: '#a8d8e8', w: 1, h: 1 },
    { id: 'fish',   name: '鱼', color: '#a8c9cf', w: 1, h: 1 },
    { id: 'plank',  name: '木板', color: '#b7a678', w: 1, h: 1 },
    { id: 'brick',  name: '砖块', color: '#c49a83', w: 1, h: 1 },
    { id: 'hut',    name: '茅草屋', color: '#f0e2c0', w: 1, h: 1 },
    { id: 'brickhouse', name: '砖瓦屋', color: '#d9c1a6', w: 2, h: 2 },
    { id: 'courtyard', name: '四合院', color: '#7a7a72', w: 4, h: 4 },
    { id: 'lumber', name: '伐木小屋', color: '#e9dcba', w: 1, h: 1 },
    { id: 'mine',   name: '采矿小屋', color: '#dbd4c6', w: 1, h: 1 },
    { id: 'lumbermill', name: '伐木工场', color: '#c9b889', w: 2, h: 2 },
    { id: 'minefactory', name: '采矿工场', color: '#8d8a80', w: 2, h: 2 },
    { id: 'dock',   name: '钓船小屋', color: '#cfe3e6', w: 1, h: 1 },
    { id: 'dockyard', name: '钓船码头', color: '#c9b889', w: 3, h: 1 },
  ];

  // 卡通简约物品图标（统一 viewBox 40x40）
  Game.ITEM_ICONS = {
    wood: '<rect x="8" y="13" width="25" height="14" fill="#b98f5f"/>' +
          '<path d="M8 13h25 M8 27h25" stroke="#8a6a45" stroke-width="1.2"/>' +
          '<ellipse cx="11" cy="20" rx="4" ry="7" fill="#c49a6a" stroke="#8a6a45" stroke-width="1.2"/>' +
          '<ellipse cx="29" cy="20" rx="4" ry="7" fill="#c49a6a" stroke="#8a6a45" stroke-width="1.2"/>' +
          '<ellipse cx="29" cy="20" rx="2" ry="3.5" fill="none" stroke="#8a6a45" stroke-width="1" opacity="0.6"/>' +
          '<ellipse cx="29" cy="20" rx="0.8" ry="1.4" fill="#8a6a45" opacity="0.55"/>' +
          '<path d="M14 16h13 M14 20h13 M14 24h13" stroke="#8a6a45" stroke-width="1" opacity="0.35"/>',
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
    grain: '<g fill="none" stroke="#b98f4f" stroke-width="1.3" stroke-linecap="round">' +
           '<path d="M20 31 L13 17 M20 31 L16 14 M20 31 L20 12 M20 31 L24 14 M20 31 L27 17"/></g>' +
           '<ellipse cx="13" cy="15.5" rx="2" ry="3.4" fill="#e6cc6a" stroke="#a3823f" stroke-width="1"/>' +
           '<ellipse cx="16" cy="12.5" rx="2" ry="3.4" fill="#e6cc6a" stroke="#a3823f" stroke-width="1"/>' +
           '<ellipse cx="20" cy="10.5" rx="2" ry="3.4" fill="#e6cc6a" stroke="#a3823f" stroke-width="1"/>' +
           '<ellipse cx="24" cy="12.5" rx="2" ry="3.4" fill="#e6cc6a" stroke="#a3823f" stroke-width="1"/>' +
           '<ellipse cx="27" cy="15.5" rx="2" ry="3.4" fill="#e6cc6a" stroke="#a3823f" stroke-width="1"/>' +
           '<rect x="16.5" y="25.5" width="7" height="3" rx="1.5" fill="#c49a6a" stroke="#8a6a45" stroke-width="1"/>',
    cloth: '<rect x="10" y="12" width="20" height="16" rx="3" fill="#d8c6c0"/>' +
           '<rect x="10" y="12" width="20" height="16" rx="3" fill="none" stroke="#9a7f78" stroke-width="1.2"/>' +
           '<path d="M10 18 h20 M10 24 h20" stroke="#9a7f78" stroke-width="1" opacity="0.45"/>' +
           '<path d="M14 15 h12" stroke="#fff" stroke-width="1.4" opacity="0.5"/>',
    gold: '<circle cx="27" cy="13" r="3" fill="#e0b876" stroke="#a3823f" stroke-width="1.2"/>' +
          '<rect x="10" y="17" width="20" height="11" rx="3" fill="#e0b876"/>' +
          '<rect x="10" y="17" width="20" height="11" rx="3" fill="none" stroke="#a3823f" stroke-width="1.2"/>' +
          '<path d="M14 22 l12 -4" stroke="#a3823f" stroke-width="1.2" opacity="0.6"/>',
    plank: '<path d="M8 24 L20 16 L34 24 L22 32 Z" fill="#b7a678"/>' +
           '<path d="M8 24 L22 32 L22 38 L8 30 Z" fill="#a3946a"/>' +
           '<path d="M34 24 L22 32 L22 38 L34 30 Z" fill="#c2ae7e"/>' +
           '<path d="M12 22.5 L20 18.5 M25 23 L32 27" stroke="#8a7a4f" stroke-width="1" opacity="0.4"/>' +
           '<g fill="none" stroke="#8a7a4f" stroke-width="1.1">' +
           '<path d="M8 24 L20 16 L34 24 L22 32 Z"/>' +
           '<path d="M8 24 L22 32 L22 38 L8 30 Z"/>' +
           '<path d="M34 24 L22 32 L22 38 L34 30 Z"/></g>',
    brick: '<rect x="8" y="15" width="24" height="14" rx="2" fill="#c49a83"/>' +
           '<rect x="8" y="15" width="24" height="14" rx="2" fill="none" stroke="#8a5a45" stroke-width="1.2"/>' +
           '<path d="M8 22h24" stroke="#8a5a45" stroke-width="1" opacity="0.5"/>' +
           '<path d="M20 15v14" stroke="#8a5a45" stroke-width="1" opacity="0.5"/>' +
           '<path d="M12 17h8" stroke="#fff" stroke-width="1" opacity="0.35"/>',
    hut: '<rect x="5" y="13" width="30" height="22" rx="5" fill="#f0e2c0"/>' +
         '<rect x="5" y="13" width="30" height="9" rx="5" fill="#d6b078"/>' +
         '<g fill="none" stroke="#8a6a4f" stroke-width="1.3">' +
         '<rect x="5" y="13" width="30" height="9" rx="5"/>' +
         '<rect x="5" y="13" width="30" height="22" rx="5"/></g>' +
         '<rect x="17" y="24" width="7" height="11" rx="2.5" fill="#8a6a4f"/>' +
         '<rect x="26" y="16" width="6" height="6" rx="1.5" fill="#fffdf5" stroke="#8a6a4f" stroke-width="1"/>',
    brickhouse: '<path d="M11 10 L29 10 L34 22 L6 22 Z" fill="#b05a45" stroke="#7a3f2f" stroke-width="1.2"/>' +
                '<path d="M12 14h16 M13 18h14" stroke="#8a4a3a" stroke-width="1" opacity="0.7"/>' +
                '<path d="M17 10q2 6 2 12 M23 10q2 6 2 12" stroke="#8a4a3a" stroke-width="1" opacity="0.5"/>' +
                '<rect x="8" y="21" width="24" height="15" rx="3" fill="#d9c1a6" stroke="#8a5a45" stroke-width="1.2"/>' +
                '<path d="M10 26h20 M10 31h20" stroke="#9a6f4f" stroke-width="1" opacity="0.5"/>' +
                '<path d="M16 21v5 M24 26v5 M16 31v5" stroke="#9a6f4f" stroke-width="1" opacity="0.35"/>' +
                '<rect x="12" y="23" width="5" height="5" rx="1.2" fill="#fffdf5" stroke="#7a3f2f" stroke-width="1"/>' +
                '<rect x="23" y="23" width="5" height="5" rx="1.2" fill="#fffdf5" stroke="#7a3f2f" stroke-width="1"/>' +
                '<rect x="16" y="30" width="8" height="6" rx="1.5" fill="#7a3f2f"/>' +
                '<rect x="27" y="12" width="5" height="7" rx="1.5" fill="#8a4a3a"/>' +
                '<rect x="26" y="10.5" width="7" height="2.5" rx="1" fill="#9a5a4a"/>',
    courtyard: '<rect x="5" y="5" width="30" height="30" rx="3" fill="#c4c0b6"/>' +
               '<rect x="5" y="5" width="30" height="30" rx="3" fill="none" stroke="#7a7a72" stroke-width="1.2"/>' +
               '<rect x="7" y="7" width="26" height="8" fill="#7a7a72"/>' +
               '<rect x="7" y="25" width="26" height="8" fill="#7a7a72"/>' +
               '<rect x="7" y="7" width="8" height="26" fill="#7a7a72"/>' +
               '<rect x="25" y="7" width="8" height="26" fill="#7a7a72"/>' +
               '<rect x="7" y="9.5" width="26" height="1.2" fill="#9a9a92"/>' +
               '<rect x="7" y="27.5" width="26" height="1.2" fill="#9a9a92"/>' +
               '<rect x="9.5" y="7" width="1.2" height="26" fill="#9a9a92"/>' +
               '<rect x="27.5" y="7" width="1.2" height="26" fill="#9a9a92"/>' +
               '<rect x="15" y="15" width="10" height="10" fill="#e2dccf" stroke="#9a9a92" stroke-width="1"/>' +
               '<rect x="15" y="20" width="10" height="1" fill="#c4c0b6"/>' +
               '<rect x="19" y="20.5" width="1" height="3.5" fill="#6a5a3f"/>' +
               '<circle cx="19.5" cy="18.5" r="3.2" fill="#8fae7f" stroke="#5f7a52" stroke-width="0.9"/>' +
               '<circle cx="18.2" cy="17.5" r="1" fill="#fff" opacity="0.35"/>' +
               '<rect x="17" y="25" width="6" height="8" rx="1.5" fill="#6a4a3f" stroke="#4a3530" stroke-width="0.8"/>' +
               '<rect x="18.7" y="26.2" width="2.6" height="3.4" rx="0.9" fill="#fffdf5" opacity="0.85"/>' +
               '<circle cx="19" cy="29" r="0.9" fill="#c8a85a"/>' +
               '<rect x="8.5" y="10" width="2.4" height="1.8" fill="#fffdf5" opacity="0.75"/>' +
               '<rect x="11.8" y="10" width="2.4" height="1.8" fill="#fffdf5" opacity="0.75"/>' +
               '<rect x="8.5" y="28.5" width="2.4" height="1.8" fill="#fffdf5" opacity="0.75"/>' +
               '<rect x="11.8" y="28.5" width="2.4" height="1.8" fill="#fffdf5" opacity="0.75"/>' +
               '<rect x="29" y="10" width="2.4" height="1.8" fill="#fffdf5" opacity="0.75"/>' +
               '<rect x="29" y="28.5" width="2.4" height="1.8" fill="#fffdf5" opacity="0.75"/>',
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
    lumbermill: '<rect x="5" y="13" width="30" height="22" rx="5" fill="#c9b889"/>' +
                '<rect x="5" y="13" width="30" height="9" rx="5" fill="#8a7a4f"/>' +
                '<g fill="none" stroke="#8a6a45" stroke-width="1.3">' +
                '<rect x="5" y="13" width="30" height="9" rx="5"/>' +
                '<rect x="5" y="13" width="30" height="22" rx="5"/></g>' +
                '<circle cx="20" cy="23" r="4.8" fill="#d8d8d0" stroke="#6a6a62" stroke-width="1.2"/>' +
                '<circle cx="20" cy="23" r="1.6" fill="#6a6a62"/>' +
                '<path d="M20 18.2 l1.7 -2.3 M20 18.2 l-1.7 -2.3" stroke="#6a6a62" stroke-width="1.2" stroke-linecap="round"/>' +
                '<path d="M20 27.8 l1.7 2.3 M20 27.8 l-1.7 2.3" stroke="#6a6a62" stroke-width="1.2" stroke-linecap="round"/>' +
                '<path d="M15.2 23 l-2.3 1.7 M15.2 23 l-2.3 -1.7" stroke="#6a6a62" stroke-width="1.2" stroke-linecap="round"/>' +
                '<path d="M24.8 23 l2.3 1.7 M24.8 23 l2.3 -1.7" stroke="#6a6a62" stroke-width="1.2" stroke-linecap="round"/>' +
                '<rect x="8" y="29" width="8" height="5" rx="2" fill="#a08a58" stroke="#8a6a45" stroke-width="0.8"/>' +
                '<rect x="17" y="29" width="8" height="5" rx="2" fill="#a08a58" stroke="#8a6a45" stroke-width="0.8"/>' +
                '<rect x="26" y="29" width="8" height="5" rx="2" fill="#a08a58" stroke="#8a6a45" stroke-width="0.8"/>',
    minefactory: '<rect x="5" y="13" width="30" height="22" rx="5" fill="#9a968c"/>' +
                 '<rect x="5" y="13" width="30" height="9" rx="5" fill="#6f6c64"/>' +
                 '<g fill="none" stroke="#5a5a52" stroke-width="1.3">' +
                 '<rect x="5" y="13" width="30" height="9" rx="5"/>' +
                 '<rect x="5" y="13" width="30" height="22" rx="5"/></g>' +
                 '<path d="M12 26 v-4 h4 a4 4 0 0 1 8 0 h4 v4 Z" fill="#3f3f3a"/>' +
                 '<path d="M12 22 h4 M24 22 h4" stroke="#7a5a35" stroke-width="1.6"/>' +
                 '<path d="M12 22 v4 M28 22 v4" stroke="#7a5a35" stroke-width="1.6"/>' +
                 '<circle cx="20" cy="26.5" r="1.1" fill="#e0b876"/>' +
                 '<rect x="7" y="28" width="11" height="5" rx="1.5" fill="#7a5a35" stroke="#5a4025" stroke-width="0.8"/>' +
                 '<rect x="9" y="29" width="7" height="3" fill="#9a968c"/>' +
                 '<circle cx="9.5" cy="33.5" r="1.5" fill="none" stroke="#5a4025" stroke-width="1.1"/>' +
                 '<circle cx="15.5" cy="33.5" r="1.5" fill="none" stroke="#5a4025" stroke-width="1.1"/>' +
                 '<path d="M22 31 l2 2 l-2 2 M24 33 l4 0 M20 33 l3 1 l-2 2" fill="none" stroke="#6a6a62" stroke-width="1.2" stroke-linecap="round"/>',
    dock: '<rect x="5" y="13" width="30" height="22" rx="5" fill="#cfe3e6"/>' +
          '<rect x="5" y="13" width="30" height="9" rx="5" fill="#a9ccd4"/>' +
          '<g fill="none" stroke="#6f98a3" stroke-width="1.3">' +
          '<rect x="5" y="13" width="30" height="9" rx="5"/>' +
          '<rect x="5" y="13" width="30" height="22" rx="5"/></g>' +
          '<rect x="6" y="27" width="28" height="7" rx="3" fill="#a4becb" stroke="#6f98a3" stroke-width="1"/>' +
          '<ellipse cx="16" cy="30" rx="4" ry="2.4" fill="#e0a078"/>' +
           '<path d="M12 30 L9 28 L9 32 Z" fill="#e0a078"/>' +
           '<circle cx="18" cy="29" r="0.8" fill="#6f98a3"/>',
    dockyard: '<rect x="3" y="5" width="34" height="30" rx="4" fill="#cfe3e6"/>' +
              '<rect x="3" y="17" width="34" height="6" fill="#d9c2a0" stroke="#9a7a50" stroke-width="1"/>' +
              '<rect x="6" y="23" width="3" height="10" fill="#7a5a35"/>' +
              '<rect x="15" y="23" width="3" height="10" fill="#7a5a35"/>' +
              '<rect x="24" y="23" width="3" height="10" fill="#7a5a35"/>' +
              '<rect x="33" y="23" width="3" height="10" fill="#7a5a35"/>' +
              '<rect x="3" y="11" width="10" height="9" fill="#c9b889" stroke="#8a7a4f" stroke-width="1"/>' +
              '<path d="M2 11 L8 5 L14 11 Z" fill="#8a7a4f" stroke="#6a5a3a" stroke-width="1"/>' +
              '<rect x="6" y="15" width="3" height="5" fill="#6a5a3a"/>' +
              '<path d="M28 15 q-3 5 0 5 q3 0 0 -5" fill="#9a5a3a" stroke="#6a4028" stroke-width="1"/>' +
              '<rect x="29" y="11" width="1.5" height="5" fill="#5a4a32"/>' +
              '<path d="M30 12 L36 15 L30 16 Z" fill="#e8e2d2"/>',
    clay: '<ellipse cx="20" cy="24" rx="12" ry="9" fill="#c9a98a"/>' +
          '<ellipse cx="20" cy="24" rx="12" ry="9" fill="none" stroke="#9a6f4f" stroke-width="1.2"/>' +
          '<path d="M9 21q11 -5 22 0" stroke="#fff" stroke-width="1.4" fill="none" opacity="0.5"/>' +
          '<path d="M12 27q8 3 16 0" stroke="#9a6f4f" stroke-width="1" fill="none" opacity="0.5"/>',
    berry: '<circle cx="14" cy="25" r="6" fill="#d05a5a" stroke="#a03a3a" stroke-width="1"/>' +
           '<circle cx="24" cy="27" r="6" fill="#d05a5a" stroke="#a03a3a" stroke-width="1"/>' +
           '<circle cx="19" cy="18" r="6" fill="#e06a5a" stroke="#a03a3a" stroke-width="1"/>' +
           '<path d="M19 13 q3 -7 9 -6 q-1 6 -7 7 Z" fill="#5f8f5a" stroke="#3f6a3f" stroke-width="1"/>' +
           '<path d="M22 10 q5 -3 8 1" stroke="#3f6a3f" stroke-width="1" fill="none"/>',
    copper: '<rect x="10" y="16" width="20" height="12" rx="3" fill="#cf9a6a"/>' +
            '<rect x="10" y="16" width="20" height="12" rx="3" fill="none" stroke="#9a6a3f" stroke-width="1.2"/>' +
            '<path d="M10 20h20 M10 24h20" stroke="#9a6a3f" stroke-width="1" opacity="0.5"/>' +
            '<path d="M16 26 q4 -3 8 0" stroke="#fff" stroke-width="1.3" fill="none" opacity="0.55"/>',
    meat: '<path d="M11 26 Q8 20 12 16 Q16 12 22 14 Q30 17 29 24 Q28 30 20 30 Q14 30 11 26 Z" fill="#d06a5a"/>' +
          '<path d="M11 26 Q8 20 12 16 Q16 12 22 14 Q30 17 29 24 Q28 30 20 30 Q14 30 11 26 Z" fill="none" stroke="#9a3f3f" stroke-width="1.2"/>' +
          '<path d="M15 16 q2 -2 5 -1 M21 19 q4 -1 6 2" stroke="#9a3f3f" stroke-width="1.2" fill="none" opacity="0.7"/>' +
          '<path d="M14 26 q6 3 12 0" stroke="#fff" stroke-width="1.4" fill="none" opacity="0.5"/>',
    amber: '<path d="M20 9 Q27 16 27 22 A7 7 0 1 1 13 22 Q13 16 20 9 Z" fill="#e0a64f"/>' +
           '<path d="M20 9 Q27 16 27 22 A7 7 0 1 1 13 22 Q13 16 20 9 Z" fill="none" stroke="#a86f2f" stroke-width="1.2"/>' +
           '<path d="M18 18 q2 -3 5 -2 q-1 3 -4 3" fill="#c88a35" opacity="0.8"/>' +
           '<path d="M16 15 q4 -4 9 -1" stroke="#fff" stroke-width="1.3" fill="none" opacity="0.45"/>',
    diamond: '<path d="M20 8 L31 15 L20 33 L9 15 Z" fill="#a8d8e8"/>' +
             '<path d="M20 8 L31 15 L20 33 L9 15 Z" fill="none" stroke="#6f9fb0" stroke-width="1.2"/>' +
             '<path d="M9 15 L20 12.5 L31 15 L20 33 Z" fill="none" stroke="#6f9fb0" stroke-width="0.8" opacity="0.6"/>' +
             '<path d="M20 12.5 L20 33" stroke="#6f9fb0" stroke-width="0.8" opacity="0.5"/>' +
             '<path d="M13 11 q3 -3 7 -3" stroke="#fff" stroke-width="1.4" fill="none" opacity="0.6"/>',
    fish: '<ellipse cx="20" cy="20" rx="14" ry="8" fill="#a9ccd4"/>' +
          '<ellipse cx="20" cy="20" rx="14" ry="8" fill="none" stroke="#6f98a3" stroke-width="1.2"/>' +
          '<path d="M34 20 L40 14 L40 26 Z" fill="#a9ccd4" stroke="#6f98a3" stroke-width="1.2"/>' +
          '<circle cx="14" cy="18" r="1.6" fill="#3f5f6a"/>' +
          '<path d="M10 20 q6 4 12 2" stroke="#fff" stroke-width="1.2" fill="none" opacity="0.5"/>' +
          '<path d="M20 14 q2 2 2 5" stroke="#6f98a3" stroke-width="1" fill="none"/>'
  };
  Game.itemIconSVG = function (id) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" preserveAspectRatio="none">' + (Game.ITEM_ICONS[id] || '') + '</svg>';
  };

  // ---------- 建筑 ----------
  Game.BUILDINGS = {
    hut: {
      id: 'hut', name: '茅草屋',
      body: '#f0e2c0', roof: '#d6b078', accent: '#8a6a4f',
      produces: [], interval: 1, capacity: 1
    },
    brickhouse: {
      id: 'brickhouse', name: '砖瓦屋',
      body: '#d9c1a6', roof: '#b05a45', accent: '#7a3f2f',
      produces: [], interval: 1, capacity: 5
    },
    courtyard: {
      id: 'courtyard', name: '四合院',
      body: '#b8b4aa', roof: '#7a7a72', accent: '#5f5f58',
      produces: [], interval: 1, capacity: 25
    },
    lumber: {
      id: 'lumber', name: '伐木小屋',
      body: '#e9dcba', roof: '#b8c99e', accent: '#a9855f',
      produces: [{ item: 'wood', amount: 5 }], interval: 1
    },
    mine: {
      id: 'mine', name: '采矿小屋',
      body: '#dbd4c6', roof: '#b4ada0', accent: '#7d7a70',
      produces: [
        { item: 'stone', amount: 4 },
        { item: Game.rollMineMineral, amount: 1 }
      ],
      desc: '4 石头 + 1 矿物（铁 60% / 金 15% / 铜 15% / 稀有 10%）',
      interval: 1
    },
    lumbermill: {
      id: 'lumbermill', name: '伐木工场',
      body: '#c9b889', roof: '#8a7a4f', accent: '#6a5a3a',
      produces: [{ item: 'wood', amount: 25 }], interval: 1
    },
    minefactory: {
      id: 'minefactory', name: '采矿工场',
      body: '#9a968c', roof: '#6f6c64', accent: '#4a4a44',
      produces: [
        { item: 'stone', amount: 20 },
        { item: Game.rollMineMineral, amount: 5 }
      ],
      desc: '20 石头 + 5 矿物（铁 60% / 金 15% / 铜 15% / 稀有 10%）',
      interval: 1
    },
    dock: {
      id: 'dock', name: '钓船小屋',
      body: '#cfe3e6', roof: '#a9ccd4', accent: '#6f98a3',
      produces: [{ item: 'food', amount: 2 }], interval: 1
    },
    dockyard: {
      id: 'dockyard', name: '钓船码头',
      body: '#c9b889', roof: '#8a7a4f', accent: '#6a5a3a',
      produces: [{ item: 'food', amount: 10 }],
      desc: '10 食物（无直接配方：地图上 3 个钓船小屋排成横 / 竖直线自动合并，船坞在岸、木制浮台伸向水域）',
      interval: 1
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
    { out: 'hut',    group: 'building', req: [{ id: 'plank', n: 1 }, { id: 'stone', n: 1 }] },
    { out: 'lumber', group: 'building', req: [{ id: 'plank', n: 1 }, { id: 'stone', n: 1 }] },
    { out: 'mine',   group: 'building', req: [{ id: 'wood', n: 1 }, { id: 'stone', n: 2 }] },
    { out: 'dock',   group: 'building', req: [{ id: 'plank', n: 2 }, { id: 'cloth', n: 1 }] }
  ];
  Game.RECIPE_GROUPS = [
    { key: 'material', title: '材料合成' },
    { key: 'building', title: '建筑合成' }
  ];

  // ---------- 扩建（建筑自动升级规则） ----------
  // 地图上按指定形状摆放多个低级建筑，自动合并升级为高级建筑（无直接合成配方）
  Game.UPGRADES = [
    { src: 'hut', n: 4, out: 'brickhouse', pattern: '2×2' },
    { src: 'brickhouse', n: 4, out: 'courtyard', pattern: '2×2' },
    { src: 'lumber', n: 4, out: 'lumbermill', pattern: '2×2' },
    { src: 'mine', n: 4, out: 'minefactory', pattern: '2×2' },
    { src: 'dock', n: 3, out: 'dockyard', pattern: '横 / 竖直线' }
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
