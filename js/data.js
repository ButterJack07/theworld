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

  // 各地貌探索资源：每种资源独立按概率判定，基地覆盖的地貌数量决定概率加权平均。
  Game.TERRAIN_TABLE = {
    [Game.TERRAIN.PLAIN]: {
      desc: '木头 35%×2 · 石头 35%×2 · 铁矿 15%×1 · 黏土 15%×1 · 浆果 25%×1',
      resources: [{ id: 'wood', chance: 0.35, min: 2, max: 2 }, { id: 'stone', chance: 0.35, min: 2, max: 2 }, { id: 'iron', chance: 0.15, min: 1, max: 1 }, { id: 'clay', chance: 0.15, min: 1, max: 1 }, { id: 'berry', chance: 0.25, min: 1, max: 1 }]
    },
    [Game.TERRAIN.GRASSLAND]: {
      desc: '木头 65%×3 · 石头 20%×1 · 浆果 40%×1',
      resources: [{ id: 'wood', chance: 0.65, min: 3, max: 3 }, { id: 'stone', chance: 0.20, min: 1, max: 1 }, { id: 'berry', chance: 0.40, min: 1, max: 1 }]
    },
    [Game.TERRAIN.FOREST]: {
      desc: '木头 100%×3~6 · 石头 10%×1 · 浆果 30%×1',
      resources: [{ id: 'wood', chance: 1, min: 3, max: 6 }, { id: 'stone', chance: 0.10, min: 1, max: 1 }, { id: 'berry', chance: 0.30, min: 1, max: 1 }]
    },
    [Game.TERRAIN.CLAY_MOUNTAIN]: {
      desc: '木头 10%×1 · 石头 35%×1~2 · 铁矿 15%×1 · 黏土 100%×2~4',
      resources: [{ id: 'wood', chance: 0.10, min: 1, max: 1 }, { id: 'stone', chance: 0.35, min: 1, max: 2 }, { id: 'iron', chance: 0.15, min: 1, max: 1 }, { id: 'clay', chance: 1, min: 2, max: 4 }]
    },
    [Game.TERRAIN.WETLAND]: {
      desc: '木头 100%×2~3 · 石头 50%×1 · 黏土 50%×1 · 浆果 100%×1~2 · 生肉 100%×1~2',
      resources: [{ id: 'wood', chance: 1, min: 2, max: 3 }, { id: 'stone', chance: 0.50, min: 1, max: 1 }, { id: 'clay', chance: 0.50, min: 1, max: 1 }, { id: 'berry', chance: 1, min: 1, max: 2 }, { id: 'meat', chance: 1, min: 1, max: 2 }]
    },
    [Game.TERRAIN.MOUNTAIN]: {
      desc: '石头 100%×3~5 · 铁矿 65%×1~2 · 黏土 15%×1',
      resources: [{ id: 'stone', chance: 1, min: 3, max: 5 }, { id: 'iron', chance: 0.65, min: 1, max: 2 }, { id: 'clay', chance: 0.15, min: 1, max: 1 }]
    },
    [Game.TERRAIN.MINE]: {
      desc: '石头 100%×2~3 · 铁矿 70%×2~4 · 金矿 10%×1 · 铜矿 15%×1 · 琥珀/钻石 5%×1',
      resources: [{ id: 'stone', chance: 1, min: 2, max: 3 }, { id: 'iron', chance: 0.70, min: 2, max: 4 }, { id: 'gold', chance: 0.10, min: 1, max: 1 }, { id: 'copper', chance: 0.15, min: 1, max: 1 }, { id: 'rareMine', chance: 0.05, min: 1, max: 1 }]
    },
    [Game.TERRAIN.SEA]: {
      desc: '鱼 100%×1',
      resources: [{ id: 'fish', chance: 1, min: 1, max: 1 }]
    }
  };
  Game.rollExploration = function (terrainCounts) {
    const total = Object.values(terrainCounts).reduce((sum, count) => sum + count, 0);
    if (!total) return [];
    const weighted = {};
    Object.entries(terrainCounts).forEach(([type, count]) => {
      const def = Game.TERRAIN_TABLE[type];
      if (!def) return;
      def.resources.forEach(resource => {
        const id = resource.id === 'rareMine' ? Game.TERRAIN_MINE_RARE[Math.floor(Math.random() * Game.TERRAIN_MINE_RARE.length)] : resource.id;
        const entry = weighted[id] || (weighted[id] = { chance: 0, amount: 0 });
        entry.chance += resource.chance * count;
        entry.amount += ((resource.min + resource.max) / 2) * resource.chance * count;
      });
    });
    return Object.entries(weighted).flatMap(([id, value]) => {
      const chance = value.chance / total;
      if (Math.random() >= chance) return [];
      const amount = Math.max(1, Math.round(value.amount / Math.max(value.chance, 0.0001)));
      return [[id, amount]];
    });
  };

  // ---------- 基地：地图上的可拖动边角缩放的灰色窗口 ----------
  Game.BASE_DEFAULT = { x: Math.floor((Game.MAP_W - 2) / 2), y: Math.floor((Game.MAP_H - 2) / 2), w: 2, h: 2 };
  Game.BASE_MIN_W = 2;
  Game.BASE_MIN_H = 2;

  // ---------- 物品 ----------
  Game.ITEMS = [
    { id: 'wood',   name: '木头', color: '#c0b283', w: 1, h: 1, desc: '基础材料，基地产出。用于合成木板、建造与冶炼燃料' },
    { id: 'stone',  name: '石头', color: '#aaa69b', w: 1, h: 1, desc: '基础材料，基地与山地产出。用于建造、合成砖块与玻璃' },
    { id: 'iron',   name: '铁矿', color: '#8a9a7b', w: 1, h: 1, desc: '常见矿石，采矿产出。可冶炼铁锭，或合成砖块与金矿' },
    { id: 'wheat',  name: '小麦', color: '#d8c290', w: 1, h: 1, desc: '农田与农庄产出的粮食，可合成面包' },
    { id: 'bread',  name: '面包', color: '#e3b877', w: 1, h: 1, desc: '精制食物，由 2 小麦合成，价值高于原粮' },
    { id: 'cloth',  name: '布匹', color: '#c9b8b3', w: 1, h: 1, desc: '布料，由木头与石头合成。造船与牧场的必需材料' },
    { id: 'gold',   name: '金矿', color: '#cfa86a', w: 1, h: 1, desc: '贵金属矿，由铁矿与木头合成，经济之路的基础' },
    { id: 'clay',   name: '黏土', color: '#c9a98a', w: 1, h: 1, desc: '黏土山产出，用于制砖、烧玻璃与建造农田' },
    { id: 'berry',  name: '浆果', color: '#d08a7a', w: 1, h: 1, desc: '草原与湿地可采集的野果' },
    { id: 'copper', name: '铜矿', color: '#cf9a6a', w: 1, h: 1, desc: '稀有矿石，矿洞产出。与铁锭合成青铜' },
    { id: 'meat',   name: '生肉', color: '#d06a5a', w: 1, h: 1, desc: '湿地可猎得，牧场每月稳定产出' },
    { id: 'cookedMeat', name: '烤肉', color: '#bb704e', w: 1, h: 1, desc: '由生肉和木头烹制而成，可加入 3 点食物' },
    { id: 'cookedFish', name: '烤鱼', color: '#7faeb4', w: 1, h: 1, desc: '由鱼和木头烹制而成，可加入 3 点食物' },
    { id: 'amber',  name: '琥珀', color: '#e0a64f', w: 1, h: 1, desc: '矿洞的稀有矿物，珍贵收藏品' },
    { id: 'diamond', name: '钻石', color: '#a8d8e8', w: 1, h: 1, desc: '矿洞的稀有矿物，最珍贵的存在' },
    { id: 'fish',   name: '鱼', color: '#a8c9cf', w: 1, h: 1, desc: '基地覆盖海洋时每月产出' },
    { id: 'plank',  name: '木板', color: '#b7a678', w: 1, h: 1, desc: '加工木材，由 2 木头合成。建造建筑的常用材料' },
    { id: 'brick',  name: '砖块', color: '#c49a83', w: 1, h: 1, desc: '烧制的建材，由 2 石头 + 1 铁矿合成' },
    { id: 'hut',    name: '茅草屋', color: '#f0e2c0', w: 1, h: 1, desc: '一级住宅，可容纳 1 人。4 座摆成 2×2 可合并为砖瓦屋' },
    { id: 'towncenter', name: '城镇中心', color: '#e8dcc0', w: 1, h: 1, desc: '城镇核心，可容纳 3 人。初始自带一座' },
    { id: 'brickhouse', name: '砖瓦屋', color: '#d9c1a6', w: 2, h: 2, desc: '二级住宅，可容纳 5 人。由 4 座茅草屋合并而成' },
    { id: 'courtyard', name: '四合院', color: '#7a7a72', w: 4, h: 4, desc: '三级住宅，可容纳 25 人。由 4 座砖瓦屋合并而成' },
    { id: 'lumber', name: '伐木小屋', color: '#e9dcba', w: 1, h: 1, desc: '须建在森林上，每月生产 5 木头' },
    { id: 'mine',   name: '采矿小屋', color: '#dbd4c6', w: 1, h: 1, desc: '须建在山地或矿洞上，每月生产 4 石头 + 1 矿物（铁 60% / 金 15% / 铜 15% / 稀有 10%）' },
    { id: 'lumbermill', name: '伐木工场', color: '#c9b889', w: 2, h: 2, desc: '由 4 座伐木小屋合并而成，至多 5 劳动力，满员每月生产 25 木头' },
    { id: 'minefactory', name: '采矿工场', color: '#8d8a80', w: 2, h: 2, desc: '由 4 座采矿小屋合并而成，至多 5 劳动力，满员每月生产 20 石头 + 5 矿物（铁 60% / 金 15% / 铜 15% / 稀有 10%）' },
    { id: 'dock',   name: '钓船小屋', color: '#cfe3e6', w: 1, h: 1, desc: '须临水建造，每月生产 2 食物' },
    { id: 'dockyard', name: '钓船码头', color: '#c9b889', w: 3, h: 1, desc: '由 3 座钓船小屋排成一线合并而成，至多 5 劳动力，满员每月生产 10 食物' },
    { id: 'farm',      name: '农田', color: '#d9cba0', w: 1, h: 1, desc: '可建在任意陆地，每月生产 5 小麦。4 座摆成 2×2 合并为农庄' },
    { id: 'farmstead', name: '农庄', color: '#cdbf95', w: 2, h: 2, desc: '由 4 座农田合并而成，至多 5 劳动力，满员每月生产 25 小麦' },
    { id: 'pasture',   name: '牧场', color: '#cfe0b0', w: 2, h: 2, desc: '须建在草原上（覆盖 4 格全为草原），至多 5 劳动力，满员每月生产 10 生肉' },
    { id: 'institute', name: '研究所', color: '#b8c4c8', w: 1, h: 1, desc: '建立时选择研究方向。当前开放经济研究所，可安排 1 名科学家进行研究' },
    { id: 'tradepost', name: '贸易站', color: '#d4b676', w: 1, h: 1, desc: '完成商业契约后可建造。安排 1 名贸易员以接取并结算贸易委托' },
    { id: 'market', name: '市场', color: '#dcb877', w: 1, h: 1, desc: '完成市场制度后可建造。用于出售物品栏中的货物，获得金币' },
    { id: 'barracks', name: '兵营', color: '#a8b2a0', w: 1, h: 1, desc: '基础军事建筑，可训练步兵' },
    { id: 'stable', name: '马厩', color: '#c6a273', w: 1, h: 1, desc: '完成军制改革后可建造，可训练轻骑兵与重骑兵' },
    { id: 'range', name: '靶场', color: '#b4a478', w: 1, h: 1, desc: '完成军制改革后可建造，可训练弓箭手；火药科技后解锁火枪兵' },
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
    bread: '<ellipse cx="20" cy="27" rx="13" ry="7" fill="#e3b877"/>' +
           '<ellipse cx="20" cy="27" rx="13" ry="7" fill="none" stroke="#a57a3f" stroke-width="1.2"/>' +
           '<path d="M7 27 Q7 16 20 16 Q33 16 33 27 Q33 31 20 31 Q7 31 7 27 Z" fill="#e3b877" stroke="#a57a3f" stroke-width="1.2"/>' +
           '<path d="M9 25 Q14 20 20 21 Q27 22 31 19" stroke="#a57a3f" stroke-width="1.1" fill="none" opacity="0.65"/>' +
           '<path d="M12 28 q4 1 8 0 q4 -1 8 0" stroke="#a57a3f" stroke-width="1" fill="none" opacity="0.5"/>',
    wheat: '<g fill="none" stroke="#b98f4f" stroke-width="1.3" stroke-linecap="round">' +
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
    towncenter: '<rect x="5" y="15" width="30" height="20" rx="4" fill="#e8dcc0" stroke="#8a6a4f" stroke-width="1.3"/>' +
                '<path d="M12 15 L20 7 L28 15 Z" fill="#b05a45" stroke="#7a3f2f" stroke-width="1.3"/>' +
                '<path d="M12 7 L20 3 L28 7 Z" fill="#d6b078" stroke="#8a6a4f" stroke-width="1.2"/>' +
                '<path d="M14 15 v5 M26 15 v5" stroke="#8a6a4f" stroke-width="1.2" opacity="0.5"/>' +
                '<rect x="16" y="20" width="8" height="15" rx="2" fill="#8a6a4f"/>' +
                '<rect x="25" y="18" width="6" height="6" rx="1.5" fill="#fffdf5" stroke="#8a6a4f" stroke-width="1"/>' +
                '<path d="M12 35 v3 M20 35 v3 M28 35 v3" stroke="#8a6a4f" stroke-width="1.2" opacity="0.5"/>',
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
    farm: '<rect x="6" y="23" width="28" height="13" rx="3" fill="#d9cba0" stroke="#9a8a5a" stroke-width="1.2"/>' +
          '<path d="M9 26h22 M9 30h22 M9 34h22" stroke="#8a7a4a" stroke-width="1" opacity="0.4"/>' +
          '<g stroke="#a3823f" stroke-width="1.2" fill="none" stroke-linecap="round">' +
          '<path d="M12 23 L12 17 M17 23 L17 16 M22 23 L22 17 M27 23 L27 16"/>' +
          '<path d="M11 16 q2 -3 4 0 M16 15 q2 -3 4 0 M21 16 q2 -3 4 0 M26 15 q2 -3 4 0"/>' +
          '</g>' +
          '<ellipse cx="12" cy="15" rx="2" ry="3" fill="#e6cc6a"/>' +
          '<ellipse cx="17" cy="14" rx="2" ry="3" fill="#e6cc6a"/>' +
          '<ellipse cx="22" cy="15" rx="2" ry="3" fill="#e6cc6a"/>' +
          '<ellipse cx="27" cy="14" rx="2" ry="3" fill="#e6cc6a"/>',
    farmstead: '<rect x="4" y="20" width="32" height="16" rx="3" fill="#cdbf95" stroke="#8a7a4a" stroke-width="1.2"/>' +
               '<path d="M7 23h26 M7 27h26 M7 31h26" stroke="#8a7a4a" stroke-width="1" opacity="0.4"/>' +
               '<path d="M10 20 L14 11 L22 11 L26 20 Z" fill="#a06a45" stroke="#7a4f2f" stroke-width="1.2"/>' +
               '<path d="M11 17h10 M12 14h8" stroke="#8a4a3a" stroke-width="1" opacity="0.6"/>' +
               '<rect x="16.5" y="24" width="7" height="7" rx="1.5" fill="#7a4f2f"/>' +
               '<g stroke="#a3823f" stroke-width="1.1" fill="none" stroke-linecap="round">' +
               '<path d="M8 20 L8 15 M31 20 L31 15"/>' +
               '</g>' +
               '<ellipse cx="8" cy="14" rx="2" ry="3" fill="#e6cc6a"/>' +
               '<ellipse cx="31" cy="14" rx="2" ry="3" fill="#e6cc6a"/>',
    pasture: '<rect x="4" y="23" width="32" height="13" rx="3" fill="#cfe0b0" stroke="#8a9a5a" stroke-width="1.2"/>' +
             '<path d="M6 31h28" stroke="#8a9a5a" stroke-width="1" opacity="0.5"/>' +
             '<rect x="7" y="13" width="3" height="10" fill="#b0a878"/>' +
             '<rect x="18" y="13" width="3" height="10" fill="#b0a878"/>' +
             '<rect x="29" y="13" width="3" height="10" fill="#b0a878"/>' +
             '<rect x="9.5" y="11.5" width="13" height="3" rx="1.5" fill="#b0a878"/>' +
             '<rect x="20.5" y="11.5" width="13" height="3" rx="1.5" fill="#b0a878"/>' +
             '<ellipse cx="20" cy="28" rx="7" ry="4.6" fill="#fffdf5" stroke="#9a8a6a" stroke-width="1"/>' +
             '<circle cx="17.5" cy="26.8" r="1" fill="#6a5a3f"/>' +
             '<path d="M20 31.5 q0 2.6 2.4 2.6 M13.4 31.5 q0 2.6 2.4 2.6" stroke="#9a8a6a" stroke-width="1" fill="none"/>',
    institute: '<rect x="5" y="16" width="30" height="19" fill="#c9d4d2" stroke="#526e71" stroke-width="1.2"/>' +
               '<rect x="8" y="11" width="24" height="5" fill="#718d90" stroke="#526e71" stroke-width="1.2"/>' +
               '<rect x="11" y="7" width="18" height="4" fill="#dbe5e0" stroke="#526e71" stroke-width="1.1"/>' +
               '<rect x="9" y="20" width="5" height="6" fill="#e9f0e9" stroke="#60777a" stroke-width="0.9"/>' +
               '<rect x="26" y="20" width="5" height="6" fill="#e9f0e9" stroke="#60777a" stroke-width="0.9"/>' +
               '<rect x="17" y="24" width="6" height="11" fill="#536b6c"/>' +
               '<path d="M5 30h30 M20 16v8" stroke="#526e71" stroke-width="1" opacity="0.55"/>',
    tradepost: '<rect x="5" y="17" width="30" height="18" fill="#e6d4a4" stroke="#927444" stroke-width="1.2"/>' +
               '<path d="M4 18 L20 8 L36 18 Z" fill="#a87945" stroke="#795831" stroke-width="1.2"/>' +
               '<rect x="8" y="12" width="24" height="4" fill="#c79d5e" stroke="#927444" stroke-width="1"/>' +
               '<rect x="17" y="24" width="6" height="11" fill="#795831"/>' +
               '<path d="M8 23h6 M26 23h6" stroke="#fff5d8" stroke-width="2"/>' +
               '<circle cx="29" cy="28" r="3" fill="#e0bd68" stroke="#9a743b" stroke-width="1"/>',
    market: '<rect x="5" y="18" width="30" height="17" fill="#eddaa3" stroke="#9b713b" stroke-width="1.2"/>' +
            '<path d="M4 18 L10 10 L16 18 L22 10 L28 18 L34 10 L38 18 Z" fill="#c56e4e" stroke="#91503c" stroke-width="1.1"/>' +
            '<rect x="17" y="25" width="6" height="10" fill="#845933"/>' +
            '<path d="M8 24h6 M26 24h6" stroke="#fff5d8" stroke-width="2"/>' +
            '<circle cx="11" cy="29" r="2.5" fill="#e0bd68" stroke="#9a743b" stroke-width="0.8"/>',
    barracks: '<rect x="5" y="16" width="30" height="19" fill="#b9c1b0" stroke="#687262" stroke-width="1.2"/>' +
              '<path d="M4 16 L20 7 L36 16 Z" fill="#727d6c" stroke="#596350" stroke-width="1.2"/>' +
              '<rect x="17" y="24" width="6" height="11" fill="#596350"/>' +
              '<path d="M12 28 h16 M20 17 v10" stroke="#d9c995" stroke-width="1.4"/>',
    stable: '<rect x="5" y="18" width="30" height="17" fill="#d9bf8a" stroke="#8c7042" stroke-width="1.2"/>' +
            '<path d="M4 18 L20 8 L36 18 Z" fill="#9b7145" stroke="#704d2d" stroke-width="1.2"/>' +
            '<rect x="17" y="25" width="6" height="10" fill="#704d2d"/>' +
            '<path d="M10 29 q4 -7 8 0 q4 -7 8 0" stroke="#6e5033" stroke-width="1.4" fill="none"/>',
    range: '<rect x="5" y="17" width="30" height="18" fill="#cdbf91" stroke="#80734d" stroke-width="1.2"/>' +
           '<path d="M4 17 L20 8 L36 17 Z" fill="#8e8259" stroke="#6d613e" stroke-width="1.2"/>' +
           '<rect x="17" y="25" width="6" height="10" fill="#6d613e"/>' +
           '<circle cx="28" cy="25" r="4" fill="none" stroke="#d85e49" stroke-width="1.5"/>' +
           '<circle cx="28" cy="25" r="1.2" fill="#d85e49"/>',
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
    cookedMeat: '<path d="M11 26 Q8 20 12 16 Q16 12 22 14 Q30 17 29 24 Q28 30 20 30 Q14 30 11 26 Z" fill="#bb704e" stroke="#7d3f2f" stroke-width="1.2"/>' +
                '<path d="M14 18 l2 3 l2 -4 l2 4 l2 -3" stroke="#f4c17e" stroke-width="1.2" fill="none"/>' +
                '<path d="M14 26 q6 3 12 0" stroke="#fff3d5" stroke-width="1.4" fill="none" opacity="0.65"/>',
    cookedFish: '<ellipse cx="20" cy="20" rx="14" ry="8" fill="#7faeb4" stroke="#4e7780" stroke-width="1.2"/>' +
                '<path d="M34 20 L40 14 L40 26 Z" fill="#7faeb4" stroke="#4e7780" stroke-width="1.2"/>' +
                '<path d="M13 17 q3 3 6 0 q3 -3 6 0" stroke="#f3c47c" stroke-width="1.3" fill="none"/>' +
                '<circle cx="14" cy="18" r="1.5" fill="#3f5f6a"/>',
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

  // 探索者图标：简单的行进小人
  Game.explorerIconSVG = function () {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" preserveAspectRatio="none">' +
      '<circle cx="20" cy="13" r="6.5" fill="#a8b89a" stroke="#5e6e55" stroke-width="1.4"/>' +
      '<path d="M20 21 Q14 25 12 34 Q20 37 20 30 Q20 37 28 34 Q26 25 20 21 Z" fill="#a8b89a" stroke="#5e6e55" stroke-width="1.4"/>' +
      '<path d="M14 30 Q17 33 20 30" stroke="#fff" stroke-width="1.2" fill="none" opacity="0.5"/>' +
      '</svg>';
  };

  // ---------- 建筑 ----------
  Game.BUILDINGS = {
    hut: {
      id: 'hut', name: '茅草屋',
      body: '#f0e2c0', roof: '#d6b078', accent: '#8a6a4f',
      produces: [], interval: 1, capacity: 1
    },
    towncenter: {
      id: 'towncenter', name: '城镇中心',
      body: '#e8dcc0', roof: '#b05a45', accent: '#8a6a4f',
      produces: [], interval: 1, capacity: 3
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
      id: 'lumber', name: '伐木小屋', job: '伐木工',
      body: '#e9dcba', roof: '#b8c99e', accent: '#a9855f',
      produces: [{ item: 'wood', amount: 5 }], interval: 1, laborCap: 1
    },
    mine: {
      id: 'mine', name: '采矿小屋', job: '采矿工',
      body: '#dbd4c6', roof: '#b4ada0', accent: '#7d7a70',
      produces: [
        { item: 'stone', amount: 4 },
        { item: Game.rollMineMineral, amount: 1 }
      ],
      desc: '4 石头 + 1 矿物（铁 60% / 金 15% / 铜 15% / 稀有 10%）',
      interval: 1, laborCap: 1
    },
    lumbermill: {
      id: 'lumbermill', name: '伐木工场', job: '伐木工',
      body: '#c9b889', roof: '#8a7a4f', accent: '#6a5a3a',
      produces: [{ item: 'wood', amount: 5 }],
      desc: '至多 5 劳动力，满员每月生产 25 木头',
      interval: 1, laborCap: 5
    },
    minefactory: {
      id: 'minefactory', name: '采矿工场', job: '采矿工',
      body: '#9a968c', roof: '#6f6c64', accent: '#4a4a44',
      produces: [
        { item: 'stone', amount: 4 },
        { item: Game.rollMineMineral, amount: 1 }
      ],
      desc: '至多 5 劳动力，满员每月生产 20 石头 + 5 矿物（铁 60% / 金 15% / 铜 15% / 稀有 10%）',
      interval: 1, laborCap: 5
    },
    dock: {
      id: 'dock', name: '钓船小屋', job: '渔夫',
      body: '#cfe3e6', roof: '#a9ccd4', accent: '#6f98a3',
      produces: [{ item: 'fish', amount: 2 }], interval: 1, laborCap: 1
    },
    dockyard: {
      id: 'dockyard', name: '钓船码头', job: '渔夫',
      body: '#c9b889', roof: '#8a7a4f', accent: '#6a5a3a',
      produces: [{ item: 'fish', amount: 2 }],
      desc: '至多 5 劳动力，满员每月生产 10 食物。无直接配方：地图上 3 个钓船小屋排成横 / 竖直线自动合并，船坞在岸、木制浮台伸向水域',
      interval: 1, laborCap: 5
    },
    farm: {
      id: 'farm', name: '农田', job: '农民',
      body: '#d9cba0', roof: '#b8c99e', accent: '#7a7a3f',
      produces: [{ item: 'wheat', amount: 5 }], interval: 1, laborCap: 1
    },
    farmstead: {
      id: 'farmstead', name: '农庄', job: '农民',
      body: '#cdbf95', roof: '#8a9a5a', accent: '#5f6a3a',
      produces: [{ item: 'wheat', amount: 5 }],
      desc: '至多 5 劳动力，满员每月生产 25 小麦。无直接配方：地图上 4 个农田摆成 2×2 自动合并',
      interval: 1, laborCap: 5
    },
    pasture: {
      id: 'pasture', name: '牧场', job: '牧民',
      body: '#cfe0b0', roof: '#9aae6a', accent: '#6a7a45',
      produces: [{ item: 'meat', amount: 2 }],
      desc: '至多 5 劳动力，满员每月生产 10 生肉',
      interval: 1, laborCap: 5
    },
    institute: {
      id: 'institute', name: '研究所', job: '科学家',
      body: '#c9d4d2', roof: '#718d90', accent: '#526e71',
      produces: [], interval: 1, laborCap: 1
    },
    tradepost: {
      id: 'tradepost', name: '贸易站', job: '贸易员',
      body: '#e6d4a4', roof: '#a87945', accent: '#795831',
      produces: [], interval: 1, laborCap: 1
    },
    market: {
      id: 'market', name: '市场',
      body: '#eddaa3', roof: '#c56e4e', accent: '#845933',
      produces: [], interval: 1, laborCap: 0
    },
    barracks: {
      id: 'barracks', name: '兵营', job: '教官',
      body: '#b9c1b0', roof: '#727d6c', accent: '#596350',
      produces: [], interval: 1, laborCap: 1
    },
    stable: {
      id: 'stable', name: '马厩', job: '骑兵教官',
      body: '#d9bf8a', roof: '#9b7145', accent: '#704d2d',
      produces: [], interval: 1, laborCap: 1
    },
    range: {
      id: 'range', name: '靶场', job: '射击教官',
      body: '#cdbf91', roof: '#8e8259', accent: '#6d613e',
      produces: [], interval: 1, laborCap: 1
    }
  };

  // 工种一览：劳动力面板按工种统计总人数（icon 用该类建筑的代表图标）
  Game.LABOR_JOBS = [
    { name: '伐木工', icon: 'lumber' },
    { name: '采矿工', icon: 'mine' },
    { name: '渔夫',   icon: 'dock' },
    { name: '农民',   icon: 'farm' },
    { name: '牧民',   icon: 'pasture' }
    , { name: '科学家', icon: 'institute' }
    , { name: '贸易员', icon: 'tradepost' }
    , { name: '教官', icon: 'barracks' }
    , { name: '骑兵教官', icon: 'stable' }
    , { name: '射击教官', icon: 'range' }
  ];
  Game.jobName = function (id) {
    const def = Game.BUILDINGS[id];
    return def && def.job ? def.job : (def ? def.name : '');
  };

  // ---------- 物品栏 ----------
  Game.INV_COLS = 8;
  Game.INV_ROWS = 4;
  Game.INV_EXPANDED_ROWS = 8;
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
    { out: 'bread', group: 'material', req: [{ id: 'wheat', n: 2 }] },
    { out: 'cookedMeat', group: 'food', requires: ['foodProcessing'], req: [{ id: 'meat', n: 1 }, { id: 'wood', n: 1 }] },
    { out: 'cookedFish', group: 'food', requires: ['foodProcessing'], req: [{ id: 'fish', n: 1 }, { id: 'wood', n: 1 }] },
    { out: 'hut',    group: 'building', req: [{ id: 'plank', n: 1 }, { id: 'stone', n: 1 }] },
    { out: 'towncenter', group: 'building', req: [{ id: 'stone', n: 3 }, { id: 'plank', n: 2 }, { id: 'brick', n: 4 }] },
    { out: 'lumber', group: 'building', req: [{ id: 'plank', n: 1 }, { id: 'stone', n: 1 }] },
    { out: 'mine',   group: 'building', req: [{ id: 'wood', n: 1 }, { id: 'stone', n: 2 }] },
    { out: 'dock',   group: 'building', req: [{ id: 'plank', n: 2 }, { id: 'cloth', n: 1 }] },
    { out: 'farm',   group: 'building', req: [{ id: 'plank', n: 1 }, { id: 'stone', n: 1 }] },
    { out: 'pasture', group: 'building', req: [{ id: 'plank', n: 2 }, { id: 'cloth', n: 1 }] }
    , { out: 'institute', group: 'building', req: [{ id: 'plank', n: 3 }, { id: 'stone', n: 3 }, { id: 'brick', n: 1 }] }
    , { out: 'tradepost', group: 'building', requires: ['commerce'], req: [{ id: 'plank', n: 3 }, { id: 'cloth', n: 2 }, { id: 'gold', n: 1 }] }
    , { out: 'market', group: 'building', requires: ['marketSystem'], req: [{ id: 'plank', n: 3 }, { id: 'stone', n: 2 }, { id: 'cloth', n: 2 }] }
    , { out: 'barracks', group: 'building', req: [{ id: 'plank', n: 3 }, { id: 'stone', n: 3 }, { id: 'iron', n: 1 }] }
    , { out: 'stable', group: 'building', requires: ['militaryReform'], req: [{ id: 'plank', n: 3 }, { id: 'cloth', n: 2 }, { id: 'iron', n: 1 }] }
    , { out: 'range', group: 'building', requires: ['militaryReform'], req: [{ id: 'plank', n: 3 }, { id: 'cloth', n: 2 }, { id: 'iron', n: 1 }] }
  ];
  Game.RECIPE_GROUPS = [
    { key: 'material', title: '材料合成' },
    { key: 'food', title: '食物加工' },
    { key: 'building', title: '建筑合成' }
  ];
  Game.FOOD_VALUES = {
    berry: 1,
    fish: 1,
    meat: 1,
    bread: 1,
    cookedMeat: 3,
    cookedFish: 3
  };

  Game.TECHNOLOGIES = {
    currency: {
      id: 'currency', category: 'economy', name: '货币制度', days: 30,
      req: [{ id: 'plank', n: 2 }, { id: 'stone', n: 2 }, { id: 'copper', n: 1 }],
      desc: '确立统一货币。解锁金币，获得 1 金币时文明指数 +1。'
    },
    marketSystem: {
      id: 'marketSystem', category: 'economy', name: '市场制度', days: 30,
      req: [{ id: 'plank', n: 2 }, { id: 'cloth', n: 2 }, { id: 'gold', n: 1 }],
      requires: ['currency'],
      desc: '建立市场制度，解锁市场建筑与商品售卖。'
    },
    commerce: {
      id: 'commerce', category: 'economy', name: '商业契约', days: 60,
      req: [{ id: 'cloth', n: 2 }, { id: 'gold', n: 1 }, { id: 'bread', n: 2 }],
      requires: ['marketSystem'],
      desc: '建立规范的商业契约，解锁贸易站建造配方。'
    },
    foodProcessing: {
      id: 'foodProcessing', category: 'production', name: '食品加工', days: 30,
      req: [{ id: 'plank', n: 2 }, { id: 'meat', n: 2 }, { id: 'fish', n: 2 }],
      desc: '掌握烹制技术，解锁烤肉与烤鱼配方。'
    },
    warehousing: {
      id: 'warehousing', category: 'production', name: '仓储管理', days: 60,
      req: [{ id: 'plank', n: 3 }, { id: 'stone', n: 3 }, { id: 'cloth', n: 2 }],
      desc: '建立规范仓储体系，物品栏行数翻倍。'
    },
    forestry: {
      id: 'forestry', category: 'building', buildingId: 'lumbermill', name: '林业机械', days: 60,
      req: [{ id: 'plank', n: 4 }, { id: 'iron', n: 2 }, { id: 'stone', n: 2 }],
      desc: '伐木小屋与伐木工场的木头产出翻倍。'
    },
    extraction: {
      id: 'extraction', category: 'building', buildingId: 'minefactory', name: '采掘工艺', days: 60,
      req: [{ id: 'plank', n: 3 }, { id: 'iron', n: 3 }, { id: 'stone', n: 4 }],
      desc: '采矿小屋与采矿工场的石头、矿物产出翻倍。'
    },
    fishery: {
      id: 'fishery', category: 'building', buildingId: 'dockyard', name: '远洋渔业', days: 60,
      req: [{ id: 'plank', n: 4 }, { id: 'cloth', n: 2 }, { id: 'iron', n: 2 }],
      desc: '钓船小屋与钓船码头的鱼产出翻倍。'
    },
    agriculture: {
      id: 'agriculture', category: 'building', buildingId: 'farmstead', name: '精耕农业', days: 60,
      req: [{ id: 'plank', n: 3 }, { id: 'brick', n: 2 }, { id: 'wheat', n: 6 }],
      desc: '农田与农庄的小麦产出翻倍。'
    },
    fieldSurvey: {
      id: 'fieldSurvey', category: 'science', name: '野外勘察', days: 60,
      req: [{ id: 'plank', n: 3 }, { id: 'cloth', n: 2 }, { id: 'copper', n: 1 }],
      desc: '研发野外勘察科技，使得探索者能够获得的资源量翻倍。'
    },
    literacy: {
      id: 'literacy', category: 'culture', name: '文字与度量', days: 60,
      req: [{ id: 'plank', n: 3 }, { id: 'cloth', n: 3 }, { id: 'copper', n: 2 }],
      desc: '建立文字记录与统一度量体系，开启科技文明奖励。'
    },
    education: {
      id: 'education', category: 'culture', name: '教育制度', days: 60,
      req: [{ id: 'plank', n: 4 }, { id: 'cloth', n: 3 }, { id: 'stone', n: 3 }],
      requires: ['literacy'],
      desc: '建立系统教育制度，解锁大学建筑。'
    },
    militaryReform: {
      id: 'militaryReform', category: 'military', name: '军制改革', days: 60,
      req: [{ id: 'plank', n: 3 }, { id: 'cloth', n: 2 }, { id: 'iron', n: 2 }],
      desc: '确立军队编制与训练制度，解锁马厩与靶场。'
    },
    gunpowder: {
      id: 'gunpowder', category: 'military', name: '火药技术', days: 60,
      req: [{ id: 'plank', n: 3 }, { id: 'iron', n: 3 }, { id: 'copper', n: 2 }],
      requires: ['militaryReform'],
      desc: '掌握火药技术，解锁靶场中的火枪兵。'
    }
  };
  Game.MILITARY_UNITS = [
    { id: 'infantry', name: '步兵', building: 'barracks', unlock: null },
    { id: 'lightCavalry', name: '轻骑兵', building: 'stable', unlock: 'militaryReform' },
    { id: 'heavyCavalry', name: '重骑兵', building: 'stable', unlock: 'militaryReform' },
    { id: 'archer', name: '弓箭手', building: 'range', unlock: 'militaryReform' },
    { id: 'musketeer', name: '火枪兵', building: 'range', unlock: 'gunpowder' }
  ];
  Game.hasTech = function (id) {
    return !!(Game.state && Game.state.techs && Game.state.techs.includes(id));
  };
  Game.productionMultiplier = function (buildingId) {
    const techByBuilding = {
      lumber: 'forestry', lumbermill: 'forestry',
      mine: 'extraction', minefactory: 'extraction',
      dock: 'fishery', dockyard: 'fishery',
      farm: 'agriculture', farmstead: 'agriculture'
    };
    return Game.hasTech(techByBuilding[buildingId]) ? 2 : 1;
  };
  Game.explorationDraws = function (explorers) {
    const perUnit = Game.hasTech('fieldSurvey') ? 4 : 2;
    return perUnit * (Math.max(0, explorers) + 1);
  };

  // ---------- 扩建（建筑自动升级规则） ----------
  // 地图上按指定形状摆放多个低级建筑，自动合并升级为高级建筑（无直接合成配方）
  Game.UPGRADES = [
    { src: 'hut', n: 4, out: 'brickhouse', pattern: '2×2' },
    { src: 'brickhouse', n: 4, out: 'courtyard', pattern: '2×2' },
    { src: 'lumber', n: 4, out: 'lumbermill', pattern: '2×2' },
    { src: 'mine', n: 4, out: 'minefactory', pattern: '2×2' },
    { src: 'farm', n: 4, out: 'farmstead', pattern: '2×2' },
    { src: 'dock', n: 3, out: 'dockyard', pattern: '横 / 竖直线' }
  ];

  function reqText(req) {
    return req.map(q => `${Game.ITEMS.find(i => i.id === q.id).name}×${q.n}`).join(' + ');
  }
  Game.reqText = reqText;

  // ---------- 游戏模式 ----------
  Game.CIV_WIN = 9999;

  Game.MODE_ICONS = {
    civilization: '<path d="M14 33 h12 M15 33 v-14 q0 -5 5 -5 q5 0 5 5 v14 M20 14 q3 -3 6 0" fill="none" stroke="#8a6a4f" stroke-width="1.6"/>' +
                  '<circle cx="20" cy="8" r="3" fill="#a3823f"/>' +
                  '<path d="M17 8 h6 M20 5 v6" stroke="#a3823f" stroke-width="1.3"/>' +
                  '<rect x="10" y="34" width="20" height="3" rx="1.5" fill="#8a6a4f"/>',
    technology: '<circle cx="20" cy="20" r="7" fill="none" stroke="#7d7a70" stroke-width="2.6"/>' +
                '<circle cx="20" cy="20" r="2.4" fill="#7d7a70"/>' +
                '<path d="M20 12 v-4 M20 28 v4 M12 20 h-4 M28 20 h4 M14 14 l-3 -3 M26 26 l3 3 M26 14 l3 -3 M14 26 l-3 3" stroke="#7d7a70" stroke-width="2" stroke-linecap="round"/>',
    freedom: '<rect x="8" y="25" width="24" height="5" rx="2" fill="#c9b889" stroke="#8a7a4f" stroke-width="1"/>' +
             '<path d="M16 25 L16 11 L27 25 Z" fill="#fffdf5" stroke="#8a7a4f" stroke-width="1.2"/>' +
             '<path d="M16 25 L20 13 L25 25" stroke="#e0b876" stroke-width="1.2" fill="none"/>' +
              '<path d="M18 25 L16 31 M24 25 L26 31 M12 31 h16" stroke="#8a7a4f" stroke-width="1.2" fill="none"/>',
    creative: '<rect x="9" y="9" width="22" height="22" fill="none" stroke="#718d90" stroke-width="2"/>' +
              '<path d="M20 4 v7 M20 29 v7 M4 20 h7 M29 20 h7" stroke="#718d90" stroke-width="2" stroke-linecap="round"/>' +
              '<path d="M14 20 h12 M20 14 v12" stroke="#d2a85b" stroke-width="2.2" stroke-linecap="round"/>'
  };

  Game.GAME_MODES = [
    {
      id: 'civilization', name: '文明模式', icon: Game.MODE_ICONS.civilization,
      desc: '文明指数达到 9999 即获胜\n按游戏内历时计算成绩排名',
      locked: false
    },
    {
      id: 'technology', name: '科技模式', icon: Game.MODE_ICONS.technology,
      desc: '发展出任一项高级科技即获胜\n按游戏内历时计算成绩排名',
      locked: true, lockNote: '尚未开放 · 高级科技设计中'
    },
    {
      id: 'freedom', name: '自由模式', icon: Game.MODE_ICONS.freedom,
      desc: '没有胜利标准\n自由发展你的文明',
      locked: false
    },
    {
      id: 'creative', name: '创造模式', icon: Game.MODE_ICONS.creative,
      desc: '无限资源与食物\n自由建造、研究与规划',
      locked: false
    }
  ];
  Game.modeName = function (id) {
    const def = Game.GAME_MODES.find(m => m.id === id);
    return def ? def.name : '';
  };

  // ---------- 绘制配色 ----------
  Game.OCEAN_COLOR = '#a4becb';
  Game.LAND_COLOR  = '#b5c5a3';
  Game.GRID_LINE   = 'rgba(255, 253, 247, 0.5)';

  // ---------- 在线排行（Supabase）配置 ----------
  // 在 Supabase 建表并填入 URL 与 anon key 后即可启用（建表 SQL 见 README「在线排行接入」）。
  Game.SUPABASE_URL = 'https://tvunqhfwetecjmjvuldu.supabase.co';
  Game.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2dW5xaGZ3ZXRlY2ptanZ1bGR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4MjY3MjgsImV4cCI6MjEwMTQwMjcyOH0.PSsza0qLGn-M7WZIep2-1kaKmIg0CMPktC_0Z4WvYXE';
  Game.ONLINE_ENABLED = function () {
    return Boolean(Game.SUPABASE_URL && Game.SUPABASE_ANON_KEY);
  };
  Game.ONLINE_TABLE = 'scores';
})();
