(function () {
  'use strict';

  const Game = window.Game = window.Game || {};

  // ---------- 噪声 ----------
  function hash(x, y) {
    let h = (x * 374761393 + y * 668265263) | 0;
    h = (h ^ (h >> 13)) | 0;
    h = Math.imul(h, 1274126177);
    return ((h ^ (h >> 16)) >>> 0) / 4294967296;
  }
  function noise2(x, y) {
    const ix = Math.floor(x), iy = Math.floor(y);
    const fx = x - ix, fy = y - iy;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const a = hash(ix, iy), b = hash(ix + 1, iy);
    const c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
    const top = a + (b - a) * sx, bot = c + (d - c) * sx;
    return top + (bot - top) * sy;
  }

  // ---------- 地图生成 ----------
  function edgeDist(x, y) {
    return Math.min(x, y, Game.MAP_W - 1 - x, Game.MAP_H - 1 - y);
  }
  function removeLakes(map) {
    const seen = Array.from({ length: Game.MAP_H }, () => Array(Game.MAP_W).fill(false));
    const q = [];
    const push = (x, y) => {
      if (map[y][x] !== Game.TILE.OCEAN || seen[y][x]) return;
      seen[y][x] = true;
      q.push([x, y]);
    };
    for (let x = 0; x < Game.MAP_W; x++) { push(x, 0); push(x, Game.MAP_H - 1); }
    for (let y = 0; y < Game.MAP_H; y++) { push(0, y); push(Game.MAP_W - 1, y); }
    let head = 0;
    while (head < q.length) {
      const [x, y] = q[head++];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || nx >= Game.MAP_W || ny < 0 || ny >= Game.MAP_H) continue;
        push(nx, ny);
      }
    }
    for (let y = 0; y < Game.MAP_H; y++)
      for (let x = 0; x < Game.MAP_W; x++)
        if (map[y][x] === Game.TILE.OCEAN && !seen[y][x]) map[y][x] = Game.TILE.LAND;
    return map;
  }
  function oceanPct(map) {
    return map.reduce((s, r) => s + r.filter(v => v === Game.TILE.OCEAN).length, 0) / (Game.MAP_W * Game.MAP_H);
  }
  function generateMap(seed) {
    const ox = hash(seed, 13) * 1000;
    const oy = hash(seed, 29) * 1000;
    let lo = 0, hi = 1.2, best = null;
    for (let attempt = 0; attempt < 30; attempt++) {
      const threshold = (lo + hi) / 2;
      let map = Array.from({ length: Game.MAP_H }, (_, y) =>
        Array.from({ length: Game.MAP_W }, (_, x) => {
          const bias = 1 - edgeDist(x, y) / 9 + (noise2((x + ox) / 4, (y + oy) / 4) - 0.5) * 1.2;
          return bias > threshold ? Game.TILE.OCEAN : Game.TILE.LAND;
        }));
      removeLakes(map);
      const pct = oceanPct(map);
      if (pct >= 0.15 && pct <= 0.30) return map;
      if (best === null || Math.abs(pct - 0.225) < Math.abs(best.pct - 0.225)) best = { map, pct };
      if (pct < 0.15) hi = threshold; else lo = threshold;
    }
    return best.map;
  }
  Game.generateMap = generateMap;

  // 确定性随机数（同一 seed 生成的团完全一致）
  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function pickStart(rand, land, reserved) {
    const n = land.length;
    const startIdx = Math.floor(rand() * n);
    for (let i = 0; i < n; i++) {
      const [x, y] = land[(startIdx + i) % n];
      if (!reserved[y][x]) return { x, y };
    }
    return null;
  }

  // 从一个随机陆地块开始，BFS 随机游走长出一团
  function growClump(rand, size, terrain, reserved, land) {
    const start = pickStart(rand, land, reserved);
    if (start === null) return [];
    const cells = [[start.x, start.y]];
    reserved[start.y][start.x] = true;
    let head = 0;
    while (cells.length < size && head < cells.length) {
      const [cx, cy] = cells[head++];
      const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]].sort(() => rand() - 0.5);
      for (const [dx, dy] of dirs) {
        if (cells.length >= size) break;
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || nx >= Game.MAP_W || ny < 0 || ny >= Game.MAP_H) continue;
        if (reserved[ny][nx]) continue;
        if (terrain[ny][nx] === null) continue;
        reserved[ny][nx] = true;
        cells.push([nx, ny]);
      }
    }
    return cells;
  }

  // 生成世界：map + 地块地貌（未揭示的特殊团 = 平原）+ 团列表 + 团索引
  function generateWorld(seed) {
    const map = generateMap(seed);
    const rand = mulberry32((seed ^ 0x9E3779B9) >>> 0);
    const terrain = map.map(row => row.map(v => v === Game.TILE.OCEAN ? null : Game.TERRAIN.PLAIN));
    const land = [];
    for (let y = 0; y < Game.MAP_H; y++)
      for (let x = 0; x < Game.MAP_W; x++)
        if (terrain[y][x] !== null) land.push([x, y]);
    const reserved = Array.from({ length: Game.MAP_H }, () => Array(Game.MAP_W).fill(false));
    const clumps = [];

    // 矿洞：每张地图固定刷一个，大小 6~12
    const mineSize = 6 + Math.floor(rand() * 7);
    const mineCells = growClump(rand, mineSize, terrain, reserved, land);
    clumps.push({ id: 0, type: Game.TERRAIN.MINE, cells: mineCells, revealed: false, progress: 0 });

    // 森林：每张地图至少刷一团
    const forestCells = growClump(rand, 3 + Math.floor(rand() * 18), terrain, reserved, land);
    if (forestCells.length) {
      clumps.push({ id: 1, type: Game.TERRAIN.FOREST, cells: forestCells, revealed: false, progress: 0 });
    }

    // 本次刷新哪些特殊地貌（除矿洞、平原外并非每张图都会出现；森林已保证一团）
    const present = Game.TERRAIN_SPECIALS.filter(s => rand() < s.appear);
    const totalWeight = present.reduce((s, t) => s + t.weight, 0);

    const target = Math.round(land.length * 0.5); // 特殊地貌总面积约占 50%
    let covered = mineCells.length + (forestCells.length || 0);
    let clumpId = forestCells.length ? 2 : 1;
    let guard = 0;
    while (covered < target && present.length && guard < 120) {
      guard++;
      let r = rand() * totalWeight;
      let type = present[present.length - 1].type;
      for (const s of present) {
        if (r < s.weight) { type = s.type; break; }
        r -= s.weight;
      }
      const size = 3 + Math.floor(rand() * 18); // 一团 3~20 格
      const cells = growClump(rand, size, terrain, reserved, land);
      if (!cells.length) break;
      clumps.push({ id: clumpId++, type, cells, revealed: false, progress: 0 });
      covered += cells.length;
    }

    const clumpIndex = Array.from({ length: Game.MAP_H }, () => Array(Game.MAP_W).fill(-1));
    clumps.forEach((c, i) => c.cells.forEach(([x, y]) => { clumpIndex[y][x] = i; }));

    return { map, terrain, clumps, clumpIndex };
  }
  Game.generateWorld = generateWorld;

  // 揭示一团特殊地貌：将团内地块涂成对应地貌
  function revealClump(c) {
    if (c.revealed || !Game.world) return;
    c.revealed = true;
    c.cells.forEach(([x, y]) => { Game.world.terrain[y][x] = c.type; });
  }
  Game.revealClump = revealClump;
})();
