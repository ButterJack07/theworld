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
})();
