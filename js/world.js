(function () {
  'use strict';

  const Game = window.Game = window.Game || {};

  const canvas = document.getElementById('map');
  const ctx = canvas.getContext('2d');
  const coordEl = document.getElementById('coord');
  canvas.width = Game.MAP_W * Game.CELL;
  canvas.height = Game.MAP_H * Game.CELL;

  Game.hoverCell = null;    // 鼠标悬停的格子
  Game.dragBuildingId = null;  // 拖放中的建筑物品 id（用于地图落点预览）

  // ---------- 建筑尺寸与占格辅助 ----------
  function buildingSize(id) {
    const item = Game.ITEMS.find(i => i.id === id);
    return { w: item ? (item.w || 1) : 1, h: item ? (item.h || 1) : 1 };
  }
  Game.buildingSize = buildingSize;
  function buildingCells(b) {
    const { w, h } = buildingSize(b.id);
    const cells = [];
    for (let dy = 0; dy < h; dy++)
      for (let dx = 0; dx < w; dx++)
        cells.push({ x: b.x + dx, y: b.y + dy });
    return cells;
  }
  Game.buildingCells = buildingCells;

  // ---------- 小人（生产力）：占据一个格子的圆形，静止不动 ----------
  function hutCapacity() {
    return Game.state.buildings.reduce((s, b) => s + (Game.BUILDINGS[b.id].capacity || 0), 0);
  }
  Game.hutCapacity = hutCapacity;
  function findVillagerSpot(existingCells) {
    const homes = Game.state.buildings.filter(b => Game.BUILDINGS[b.id].capacity);
    if (!homes.length) return null;
    const used = new Set();
    Game.state.buildings.forEach(b => buildingCells(b).forEach(c => used.add(c.x + ',' + c.y)));
    existingCells.forEach(v => used.add(v.x + ',' + v.y));
    for (const home of homes) {
      for (let r = 1; r <= 5; r++) {
        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
            const x = home.x + dx, y = home.y + dy;
            if (x < 0 || x >= Game.MAP_W || y < 0 || y >= Game.MAP_H) continue;
            if (Game.world.map[y][x] !== Game.TILE.LAND) continue;
            if (used.has(x + ',' + y)) continue;
            return { x, y };
          }
        }
      }
    }
    return null;
  }
  Game.findVillagerSpot = findVillagerSpot;

  // ---------- 绘制 ----------
  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // 砖瓦屋专属建模：瓦片屋檐宽出砖墙房体，突出「砖瓦」质感
  function drawBrickhouseEntity(b, px, py, pw, ph) {
    const cx = px + pw / 2;
    const wallL = px + 9, wallT = py + 16, wallW = pw - 18, wallH = ph - 19;
    const wallR = wallL + wallW, wallB = wallT + wallH;

    ctx.lineWidth = 1;
    // 阴影
    ctx.fillStyle = 'rgba(120, 110, 90, 0.16)';
    rr(px + 2, py + 3, pw, ph, 10);
    ctx.fill();

    // ---- 砖墙房体 ----
    ctx.fillStyle = '#d9c1a6';
    rr(wallL, wallT, wallW, wallH, 4);
    ctx.fill();
    ctx.strokeStyle = 'rgba(120, 90, 60, 0.45)';
    ctx.stroke();
    const stepY = 7;
    for (let yy = wallT + 4; yy < wallB; yy += stepY) {
      ctx.beginPath();
      ctx.moveTo(wallL + 2, yy);
      ctx.lineTo(wallR - 2, yy);
      ctx.stroke();
    }
    let alt = 0;
    for (let xx = wallL + 11; xx < wallR - 2; xx += 11) {
      const y0 = wallT + 4 + (alt % 2) * Math.floor(stepY / 2);
      for (let yy = y0; yy < wallB - 1; yy += stepY) {
        ctx.beginPath();
        ctx.moveTo(xx, yy);
        ctx.lineTo(xx, yy + 2.5);
        ctx.stroke();
      }
      alt++;
    }

    // ---- 瓦片屋檐（双坡梯形，宽出房体） ----
    const evL = px + 2, evR = px + pw - 2, evW = evR - evL;
    const evT = py + 4, evH = 16, evB = evT + evH;
    const topInset = 8;
    ctx.fillStyle = '#b05a45';
    ctx.beginPath();
    ctx.moveTo(evL + topInset, evT);
    ctx.lineTo(evR - topInset, evT);
    ctx.lineTo(evR, evB);
    ctx.lineTo(evL, evB);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(110, 60, 40, 0.55)';
    ctx.stroke();
    // 下沿一排半圆瓦
    ctx.strokeStyle = 'rgba(150, 80, 55, 0.65)';
    ctx.lineWidth = 1.3;
    const nTiles = 8;
    const tileW = evW / nTiles;
    for (let i = 0; i < nTiles; i++) {
      const tx = evL + i * tileW;
      ctx.beginPath();
      ctx.arc(tx + tileW / 2, evB - 1, tileW / 2 - 0.6, Math.PI, 0);
      ctx.stroke();
    }
    // 瓦片横线
    for (let row = 1; row <= 2; row++) {
      const yy = evB - row * 5;
      ctx.beginPath();
      ctx.moveTo(evL + 3, yy);
      ctx.lineTo(evR - 3, yy);
      ctx.stroke();
    }

    // ---- 烟囱（穿过屋顶） ----
    ctx.fillStyle = '#8a4a3a';
    rr(px + pw - 21, py + 1, 8, 12, 2);
    ctx.fill();
    ctx.fillStyle = '#9a5a4a';
    rr(px + pw - 23, py - 1.5, 12, 3, 1.5);
    ctx.fill();

    // ---- 门 ----
    const doorW = 10, doorH = 17;
    ctx.fillStyle = '#7a3f2f';
    rr(cx - doorW / 2, wallB - doorH, doorW, doorH, 3);
    ctx.fill();

    // ---- 双窗 ----
    const winW = 8, winH = 8;
    const winY = wallT + 5;
    ctx.fillStyle = '#fffdf5';
    rr(cx - winW - 10, winY, winW, winH, 2);
    ctx.fill();
    rr(cx + 10, winY, winW, winH, 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(120, 90, 60, 0.55)';
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - winW - 10, winY, winW, winH);
    ctx.strokeRect(cx + 10, winY, winW, winH);
  }

  // 四合院专属建模：一点透视大宅（4×4）——庭院近宽远窄、正房居后、左右厢房带
  // 半圆瓦檐沿院展开、前墙两角各一间山墙小屋、正中门楼，突出纵深与房屋质感
  function drawCourtyardEntity(b, px, py, pw, ph) {
    const cx = px + pw / 2;
    const roof = '#7a7a72';
    const wall = '#b8b4aa';
    const wallDark = '#9c988d';
    const floor = '#e2dccf';
    const dark = '#5f5f58';
    const tile = 'rgba(130, 90, 65, 0.6)';
    const ridgeC = 'rgba(238, 235, 222, 0.6)';
    const wallEdge = 'rgba(90, 90, 82, 0.45)';

    const poly = pts => { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); };
    const line = (x1, y1, x2, y2) => { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
    // 水平檐口：一排半圆瓦
    const tileEave = (x1, x2, y) => {
      const n = Math.max(4, Math.round((x2 - x1) / 6));
      const w = (x2 - x1) / n;
      ctx.strokeStyle = tile;
      ctx.lineWidth = 1.2;
      for (let i = 0; i < n; i++) { ctx.beginPath(); ctx.arc(x1 + w * (i + 0.5), y, w / 2 - 0.4, Math.PI, 0); ctx.stroke(); }
    };
    // 斜檐口：沿斜面一排瓦
    const tileEaveDiag = (x1, y1, x2, y2) => {
      const len = Math.hypot(x2 - x1, y2 - y1);
      const n = Math.max(4, Math.round(len / 6));
      ctx.strokeStyle = tile;
      ctx.lineWidth = 1.2;
      for (let i = 0; i < n; i++) { const t = (i + 0.5) / n; ctx.beginPath(); ctx.arc(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, len / n / 2 - 0.4, Math.PI, 0); ctx.stroke(); }
    };

    ctx.lineWidth = 1;
    // 阴影
    ctx.fillStyle = 'rgba(120, 110, 90, 0.16)';
    rr(px + 4, py + 6, pw - 8, ph - 8, 12);
    ctx.fill();

    // ---- 庭院地面（近宽远窄的梯形 = 一点透视） ----
    ctx.fillStyle = floor;
    poly([[px + 16, py + 98], [px + 104, py + 98], [px + 80, py + 32], [px + 40, py + 32]]);
    ctx.fill();
    // 地面透视纹（向纵深收拢）
    ctx.strokeStyle = 'rgba(150, 140, 120, 0.4)';
    line(px + 60, py + 98, px + 60, py + 32);
    line(px + 43, py + 98, px + 50, py + 32);
    line(px + 77, py + 98, px + 70, py + 32);

    // ---- 西厢（左翼）：沿院展开、带瓦檐与窗 ----
    ctx.fillStyle = roof;
    poly([[px + 40, py + 24], [px + 16, py + 90], [px + 11, py + 94], [px + 35, py + 28]]);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    line(px + 37, py + 26, px + 14, py + 91);
    tileEaveDiag(px + 35, py + 28, px + 11, py + 94);
    ctx.fillStyle = wallDark;
    poly([[px + 35, py + 28], [px + 11, py + 94], [px + 13, py + 98], [px + 37, py + 32]]);
    ctx.fill();
    ctx.fillStyle = '#fffdf5';
    ctx.fillRect(px + 30, py + 34, 4, 5);
    ctx.fillRect(px + 26, py + 46, 4, 5);
    ctx.fillRect(px + 22, py + 58, 4, 5);
    ctx.fillRect(px + 18, py + 70, 4, 5);

    // ---- 东厢（右翼，镜像） ----
    ctx.fillStyle = roof;
    poly([[px + 80, py + 24], [px + 104, py + 90], [px + 109, py + 94], [px + 85, py + 28]]);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    line(px + 83, py + 26, px + 106, py + 91);
    tileEaveDiag(px + 85, py + 28, px + 109, py + 94);
    ctx.fillStyle = wallDark;
    poly([[px + 85, py + 28], [px + 109, py + 94], [px + 107, py + 98], [px + 83, py + 32]]);
    ctx.fill();
    ctx.fillStyle = '#fffdf5';
    ctx.fillRect(px + 86, py + 34, 4, 5);
    ctx.fillRect(px + 90, py + 46, 4, 5);
    ctx.fillRect(px + 94, py + 58, 4, 5);
    ctx.fillRect(px + 98, py + 70, 4, 5);

    // ---- 正房（后殿，居中最远） ----
    ctx.fillStyle = roof;
    poly([[px + 38, py + 26], [px + 82, py + 26], [px + 76, py + 16], [px + 44, py + 16]]);
    ctx.fill();
    ctx.strokeStyle = ridgeC;
    ctx.lineWidth = 2;
    line(px + 45, py + 18, px + 75, py + 18);
    ctx.lineWidth = 1;
    tileEave(px + 38, px + 82, py + 26);
    ctx.fillStyle = wall;
    ctx.fillRect(px + 46, py + 26, 28, 20);
    ctx.strokeStyle = wallEdge;
    ctx.strokeRect(px + 46, py + 26, 28, 20);
    ctx.fillStyle = dark;
    ctx.fillRect(px + 55, py + 37, 10, 9);
    ctx.fillStyle = '#fffdf5';
    ctx.fillRect(px + 49, py + 30, 5, 5);
    ctx.fillRect(px + 66, py + 30, 5, 5);

    // ---- 庭树（院中偏前） ----
    ctx.fillStyle = '#6a5a3f';
    ctx.fillRect(cx - 1.5, py + 72, 3, 7);
    ctx.fillStyle = '#8fae7f';
    ctx.beginPath();
    ctx.arc(cx, py + 66, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.beginPath();
    ctx.arc(cx - 3, py + 63, 3.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#5f7a52';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(cx, py + 66, 10, 0, Math.PI * 2);
    ctx.stroke();

    // ---- 前墙（院落前壁） ----
    ctx.fillStyle = wall;
    ctx.fillRect(px + 12, py + 98, 96, 16);
    ctx.strokeStyle = wallEdge;
    ctx.strokeRect(px + 12, py + 98, 96, 16);
    ctx.strokeStyle = 'rgba(90, 90, 82, 0.25)';
    line(px + 12, py + 106, px + 108, py + 106);

    // ---- 前墙两角的山墙小屋 ----
    // 左角房
    ctx.fillStyle = roof;
    poly([[px + 10, py + 84], [px + 28, py + 84], [px + 19, py + 76]]);
    ctx.fill();
    tileEave(px + 10, px + 28, py + 84);
    ctx.fillStyle = wall;
    ctx.fillRect(px + 12, py + 84, 16, 14);
    ctx.strokeStyle = wallEdge;
    ctx.strokeRect(px + 12, py + 84, 16, 14);
    ctx.fillStyle = dark;
    ctx.fillRect(px + 17, py + 91, 6, 7);
    // 右角房
    ctx.fillStyle = roof;
    poly([[px + 92, py + 84], [px + 110, py + 84], [px + 101, py + 76]]);
    ctx.fill();
    tileEave(px + 92, px + 110, py + 84);
    ctx.fillStyle = wall;
    ctx.fillRect(px + 92, py + 84, 16, 14);
    ctx.strokeStyle = wallEdge;
    ctx.strokeRect(px + 92, py + 84, 16, 14);
    ctx.fillStyle = dark;
    ctx.fillRect(px + 97, py + 91, 6, 7);

    // ---- 门楼（前墙正中，最近层） ----
    ctx.fillStyle = roof;
    poly([[px + 46, py + 95], [px + 74, py + 95], [px + 70, py + 85], [px + 50, py + 85]]);
    ctx.fill();
    ctx.strokeStyle = ridgeC;
    ctx.lineWidth = 2;
    line(px + 51, py + 87, px + 69, py + 87);
    ctx.lineWidth = 1;
    tileEave(px + 46, px + 74, py + 95);
    ctx.fillStyle = '#8a5a4a';
    ctx.fillRect(px + 50, py + 95, 20, 21);
    ctx.fillStyle = dark;
    ctx.fillRect(px + 56, py + 104, 8, 12);
    ctx.strokeStyle = 'rgba(90, 70, 60, 0.7)';
    ctx.strokeRect(px + 56, py + 104, 8, 12);
    ctx.fillStyle = '#c8a85a';
    ctx.beginPath(); ctx.arc(px + 58, py + 108, 1.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(px + 62, py + 108, 1.4, 0, Math.PI * 2); ctx.fill();
  }

  // 伐木工场专属建模（2×2，格宽 30）：内容框约 px+3..px+57、py+4..py+58，居中对称——
  // 双坡屋顶下主厂房居中，前立面挂圆锯盘标志、两侧小窗、居中大门、屋顶烟囱，
  // 底角对称的原木堆与圆木横截面
  function drawLumbermillEntity(b, px, py, pw, ph) {
    const cx = px + pw / 2;
    const roof = '#8a7a4f';
    const body = '#c9b889';
    const accent = '#6a5a3a';
    const edge = 'rgba(120, 95, 55, 0.5)';

    ctx.lineWidth = 1;
    // 阴影
    ctx.fillStyle = 'rgba(120, 110, 90, 0.16)';
    rr(px + 3, py + 4, 54, 53, 9);
    ctx.fill();

    // ---- 居中主厂房 ----
    // 双坡屋顶（对称，宽出墙体）
    ctx.fillStyle = roof;
    ctx.beginPath();
    ctx.moveTo(px + 6, py + 22);
    ctx.lineTo(px + 54, py + 22);
    ctx.lineTo(px + 45, py + 9);
    ctx.lineTo(px + 15, py + 9);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = edge;
    ctx.stroke();
    // 屋脊高光
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(px + 16, py + 11); ctx.lineTo(px + 44, py + 11); ctx.stroke();
    ctx.lineWidth = 1;
    // 瓦线
    ctx.strokeStyle = 'rgba(110, 85, 45, 0.5)';
    ctx.beginPath(); ctx.moveTo(px + 8, py + 18); ctx.lineTo(px + 52, py + 18); ctx.stroke();

    // 厂房墙
    ctx.fillStyle = body;
    rr(px + 12, py + 22, 36, 26, 4);
    ctx.fill();
    ctx.strokeStyle = edge;
    ctx.stroke();
    // 墙板横线
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath(); ctx.moveTo(px + 14, py + 31); ctx.lineTo(px + 46, py + 31); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(px + 14, py + 39); ctx.lineTo(px + 46, py + 39); ctx.stroke();

    // 圆锯盘（墙上居中，工场标志）
    ctx.save();
    ctx.translate(cx, py + 29);
    ctx.fillStyle = '#e2e2da';
    ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#7a7a72';
    ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#9a9a92';
    ctx.lineWidth = 1.1;
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 2.4, Math.sin(a) * 2.4);
      ctx.lineTo(Math.cos(a) * 7, Math.sin(a) * 7);
      ctx.stroke();
    }
    ctx.fillStyle = '#6a6a62';
    ctx.beginPath(); ctx.arc(0, 0, 2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // 窗户（锯盘两侧对称）
    ctx.fillStyle = '#fffdf5';
    rr(px + 14, py + 25, 5, 5, 2); ctx.fill();
    rr(px + 41, py + 25, 5, 5, 2); ctx.fill();
    ctx.strokeStyle = 'rgba(120, 90, 60, 0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(px + 14, py + 25, 5, 5);
    ctx.strokeRect(px + 41, py + 25, 5, 5);

    // 大门（居中）
    ctx.fillStyle = accent;
    rr(cx - 6, py + 38, 12, 10, 3);
    ctx.fill();
    ctx.strokeStyle = 'rgba(80, 60, 30, 0.6)';
    ctx.stroke();

    // 烟囱（屋顶右坡）
    ctx.fillStyle = '#8a5a3a';
    rr(px + 41, py + 11, 5, 8, 1.5);
    ctx.fill();
    ctx.fillStyle = '#9a6a4a';
    rr(px + 39, py + 9, 9, 3, 1.5);
    ctx.fill();

    // ---- 原木堆（底角对称） ----
    ctx.fillStyle = '#a08a58';
    rr(px + 3, py + 40, 10, 6, 2); ctx.fill();
    rr(px + 47, py + 40, 10, 6, 2); ctx.fill();
    ctx.fillStyle = '#8a6a45';
    rr(px + 3, py + 48, 10, 6, 2); ctx.fill();
    rr(px + 47, py + 48, 10, 6, 2); ctx.fill();
    // 原木顶面高光
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(px + 4, py + 42); ctx.lineTo(px + 12, py + 42); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(px + 4, py + 50); ctx.lineTo(px + 12, py + 50); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(px + 48, py + 42); ctx.lineTo(px + 56, py + 42); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(px + 48, py + 50); ctx.lineTo(px + 56, py + 50); ctx.stroke();

    // ---- 圆木横截面（底角对称） ----
    ctx.fillStyle = '#c9b889';
    ctx.beginPath(); ctx.arc(px + 6, py + 55, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = edge;
    ctx.stroke();
    ctx.fillStyle = '#e8dcbe';
    ctx.beginPath(); ctx.arc(px + 6, py + 55, 1.6, 0, Math.PI * 2); ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#c9b889';
    ctx.beginPath(); ctx.arc(px + 54, py + 55, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = edge;
    ctx.stroke();
    ctx.fillStyle = '#e8dcbe';
    ctx.beginPath(); ctx.arc(px + 54, py + 55, 1.6, 0, Math.PI * 2); ctx.fill();
    ctx.stroke();
  }

  // 采矿工场专属建模（2×2，格宽 30）：内容框约 px+2..px+57、py+4..py+57，居中——
  // 左侧采矿车间（坡顶 + 矿洞口，主体较宽、贴近井架），右侧井架塔楼与天轮，
  // 前景矿车沿与车间同宽的轨道驶出，右前矿石堆与车间墙面齿轮
  function drawMineFactoryEntity(b, px, py, pw, ph) {
    const roof = '#6f6c64';
    const body = '#9a968c';
    const accent = '#4a4a44';
    const edge = 'rgba(80, 80, 75, 0.5)';

    ctx.lineWidth = 1;
    // 阴影
    ctx.fillStyle = 'rgba(120, 110, 90, 0.16)';
    rr(px + 3, py + 4, 54, 53, 9);
    ctx.fill();

    // ---- 左侧采矿车间（主体加大、右移靠近井架塔楼） ----
    // 车间墙
    ctx.fillStyle = body;
    rr(px + 9, py + 30, 28, 20, 3);
    ctx.fill();
    ctx.strokeStyle = edge;
    ctx.stroke();
    // 车间坡顶
    ctx.fillStyle = roof;
    rr(px + 9, py + 25, 28, 7, 3);
    ctx.fill();
    ctx.strokeStyle = edge;
    ctx.stroke();
    // 矿洞口
    ctx.fillStyle = '#3f3f3a';
    rr(px + 16, py + 36, 14, 14, 5);
    ctx.fill();
    ctx.strokeStyle = 'rgba(60, 60, 55, 0.7)';
    ctx.stroke();
    // 洞顶木撑与洞内微光
    ctx.strokeStyle = '#7a5a35';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(px + 17, py + 38); ctx.lineTo(px + 29, py + 38); ctx.stroke();
    ctx.lineWidth = 1;
    ctx.fillStyle = '#e0b876';
    ctx.beginPath(); ctx.arc(px + 23, py + 42, 1.3, 0, Math.PI * 2); ctx.fill();

    // ---- 右侧井架塔楼 ----
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(px + 40, py + 28);
    ctx.lineTo(px + 56, py + 28);
    ctx.lineTo(px + 52, py + 8);
    ctx.lineTo(px + 44, py + 8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = edge;
    ctx.stroke();
    // 塔柱横撑
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath(); ctx.moveTo(px + 42, py + 14); ctx.lineTo(px + 54, py + 14); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(px + 41, py + 20); ctx.lineTo(px + 55, py + 20); ctx.stroke();
    // 天轮（提升轮，塔顶）
    ctx.fillStyle = '#c8c8c0';
    ctx.beginPath(); ctx.arc(px + 48, py + 10, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#5a5a52';
    ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.arc(px + 48, py + 10, 3.5, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(px + 48, py + 10, 1.4, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 1;

    // 烟囱与烟气（车间顶右侧）
    ctx.fillStyle = '#5a5a52';
    rr(px + 31, py + 21, 5, 7, 1.5); ctx.fill();
    ctx.fillStyle = 'rgba(160, 160, 150, 0.6)';
    ctx.beginPath(); ctx.arc(px + 33, py + 18, 2.5, 0, Math.PI * 2); ctx.fill();

    // ---- 前景轨道与矿车（轨道与车间同宽，矿车居轨道中部） ----
    ctx.strokeStyle = '#6a6a62';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(px + 9, py + 52); ctx.lineTo(px + 36, py + 52); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(px + 9, py + 49.5); ctx.lineTo(px + 36, py + 49.5); ctx.stroke();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(90, 80, 65, 0.6)';
    for (let tx = px + 12; tx <= px + 33; tx += 5) {
      ctx.beginPath(); ctx.moveTo(tx, py + 49); ctx.lineTo(tx, py + 52.5); ctx.stroke();
    }
    // 矿车
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.moveTo(px + 17, py + 44);
    ctx.lineTo(px + 25, py + 44);
    ctx.lineTo(px + 24, py + 51);
    ctx.lineTo(px + 18, py + 51);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(60, 60, 55, 0.7)';
    ctx.stroke();
    // 矿车里的矿石
    ctx.fillStyle = '#7a5a35';
    ctx.beginPath(); ctx.arc(px + 19, py + 43, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(px + 22, py + 42.5, 1.5, 0, Math.PI * 2); ctx.fill();
    // 车轮
    ctx.fillStyle = '#4a4a44';
    ctx.beginPath(); ctx.arc(px + 19, py + 52, 1.7, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(px + 23, py + 52, 1.7, 0, Math.PI * 2); ctx.fill();

    // ---- 右前矿石堆与齿轮 ----
    ctx.fillStyle = '#7a5a35';
    ctx.beginPath(); ctx.arc(px + 44, py + 38, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(px + 48, py + 36, 2.8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(px + 46, py + 33, 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(90, 65, 35, 0.6)';
    ctx.beginPath(); ctx.arc(px + 44, py + 38, 3.5, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(px + 48, py + 36, 2.8, 0, Math.PI * 2); ctx.stroke();
    // 齿轮（车间墙面右下）
    ctx.fillStyle = '#c8c8c0';
    ctx.beginPath(); ctx.arc(px + 27, py + 43, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#5a5a52';
    ctx.stroke();
    ctx.fillStyle = '#6a6a62';
    ctx.beginPath(); ctx.arc(px + 27, py + 43, 1.1, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#8a8a82';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(px + 24.5, py + 43); ctx.lineTo(px + 29.5, py + 43); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(px + 27, py + 40.5); ctx.lineTo(px + 27, py + 45.5); ctx.stroke();
  }

  // 统一圆角矩形卡通风建筑：阴影 + 主体 + 屋顶带 + 下沿高光 + 门 + 专属徽记（支持 1×1 / 2×2）
  function drawBuildingEntity(b) {
    const def = Game.BUILDINGS[b.id];
    const { w, h } = buildingSize(b.id);
    const px = b.x * Game.CELL, py = b.y * Game.CELL;
    const pw = w * Game.CELL, ph = h * Game.CELL;
    if (b.id === 'brickhouse') { drawBrickhouseEntity(b, px, py, pw, ph); return; }
    if (b.id === 'courtyard') { drawCourtyardEntity(b, px, py, pw, ph); return; }
    if (b.id === 'lumbermill') { drawLumbermillEntity(b, px, py, pw, ph); return; }
    if (b.id === 'minefactory') { drawMineFactoryEntity(b, px, py, pw, ph); return; }
    const cx = px + pw / 2;
    const bx = px + 4, by = py + 5, bw = pw - 8, bh = ph - 10, br = 10;
    const roofH = Math.round(bh * 0.42);

    ctx.lineWidth = 1;
    // 阴影
    ctx.fillStyle = 'rgba(120, 110, 90, 0.16)';
    rr(bx + 1, by + 2, bw, bh, br);
    ctx.fill();
    // 主体
    ctx.fillStyle = def.body;
    rr(bx, by, bw, bh, br);
    ctx.fill();
    ctx.strokeStyle = 'rgba(120, 110, 90, 0.35)';
    ctx.stroke();
    // 屋顶带
    ctx.fillStyle = def.roof;
    rr(bx, by, bw, roofH, br);
    ctx.fill();
    ctx.strokeStyle = 'rgba(120, 110, 90, 0.3)';
    ctx.stroke();
    // 屋顶纹理线
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.beginPath();
    ctx.moveTo(bx + 3, by + roofH - 3);
    ctx.lineTo(bx + bw - 3, by + roofH - 3);
    ctx.stroke();
    // 下沿高光
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.beginPath();
    ctx.moveTo(bx + 2, by + bh - 1.5);
    ctx.lineTo(bx + bw - 2, by + bh - 1.5);
    ctx.stroke();

    const gy = by + roofH;
    const bottom = by + bh;
    const multi = w > 1 || h > 1;
    const doorW = multi ? Math.max(8, Math.round(bw * 0.2)) : 6;
    const doorH = multi ? Math.max(14, Math.round(bh * 0.42)) : 8;
    // 门（统一）
    ctx.fillStyle = def.accent;
    rr(cx - doorW / 2, bottom - doorH, doorW, doorH, 3);
    ctx.fill();
    // 专属徽记
    switch (b.id) {
      case 'hut':
        // 小窗
        ctx.fillStyle = '#fffdf5';
        rr(cx + 4, gy + 4, 6, 6, 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(120, 100, 70, 0.4)';
        ctx.stroke();
        break;
      case 'lumber':
        // 原木堆
        ctx.fillStyle = def.accent;
        rr(cx - 8, gy + 5, 7, 5, 2); ctx.fill();
        rr(cx - 1, gy + 5, 7, 5, 2); ctx.fill();
        rr(cx - 4, gy + 11, 7, 5, 2); ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(cx - 8, gy + 7); ctx.lineTo(cx - 1, gy + 7); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx - 1, gy + 7); ctx.lineTo(cx + 6, gy + 7); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx - 4, gy + 13); ctx.lineTo(cx + 3, gy + 13); ctx.stroke();
        break;
      case 'mine':
        // 矿洞入口 + 碎石
        ctx.fillStyle = 'rgba(90, 88, 82, 0.85)';
        rr(cx - 5, gy + 6, 10, 8, 3);
        ctx.fill();
        ctx.fillStyle = '#8d8a80';
        rr(cx - 9, gy + 6, 3, 3, 1); ctx.fill();
        rr(cx + 6, gy + 5, 3, 3, 1); ctx.fill();
        rr(cx - 8, gy + 11, 2, 2, 1); ctx.fill();
        rr(cx + 6, gy + 12, 2, 2, 1); ctx.fill();
        break;
      case 'dock':
        // 小鱼
        ctx.fillStyle = '#e0a078';
        ctx.beginPath();
        ctx.ellipse(cx - 1, gy + 8, 5, 3.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx - 6, gy + 8);
        ctx.lineTo(cx - 9, gy + 5);
        ctx.lineTo(cx - 9, gy + 11);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#6f98a3';
        ctx.beginPath();
        ctx.arc(cx + 2, gy + 7, 0.9, 0, Math.PI * 2);
        ctx.fill();
        break;
    }
  }

  function drawVillagers() {
    Game.state.villagersCells.forEach(v => {
      const cx = v.x * Game.CELL + Game.CELL / 2;
      const cy = v.y * Game.CELL + Game.CELL / 2;
      ctx.fillStyle = '#c0a078';
      ctx.beginPath();
      ctx.arc(cx, cy, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.beginPath();
      ctx.arc(cx, cy - 2, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(120, 90, 60, 0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, 9, 0, Math.PI * 2);
      ctx.stroke();
    });
  }

  // ---------- 基地：灰色窗口，可拖动边角缩放 ----------
  function drawBase() {
    const b = Game.base;
    if (!b) return;
    const px = b.x * Game.CELL, py = b.y * Game.CELL;
    const pw = b.w * Game.CELL, ph = b.h * Game.CELL;
    const r = 8;

    // 底色（半透明灰）
    ctx.fillStyle = 'rgba(150, 148, 138, 0.28)';
    rr(px, py, pw, ph, r);
    ctx.fill();

    // 边框
    ctx.strokeStyle = 'rgba(110, 108, 100, 0.85)';
    ctx.lineWidth = 1.5;
    rr(px + 0.75, py + 0.75, pw - 1.5, ph - 1.5, r);
    ctx.stroke();

    // 纹样：对角斜线
    ctx.save();
    rr(px, py, pw, ph, r);
    ctx.clip();
    ctx.strokeStyle = 'rgba(110, 108, 100, 0.22)';
    ctx.lineWidth = 1;
    const step = 12;
    for (let d = -ph; d < pw; d += step) {
      ctx.beginPath();
      ctx.moveTo(px + d, py + ph);
      ctx.lineTo(px + d + ph, py);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
    for (let d = -ph; d < pw; d += step) {
      ctx.beginPath();
      ctx.moveTo(px + d + step / 2, py + ph);
      ctx.lineTo(px + d + ph + step / 2, py);
      ctx.stroke();
    }
    ctx.restore();

    // 四个角的调节把手
    const h = 6;
    const corners = [[px, py, 'nw'], [px + pw, py, 'ne'], [px, py + ph, 'sw'], [px + pw, py + ph, 'se']];
    corners.forEach(([cx, cy]) => {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.fillRect(cx - h / 2, cy - h / 2, h, h);
      ctx.strokeStyle = 'rgba(110, 108, 100, 0.9)';
      ctx.strokeRect(cx - h / 2 + 0.5, cy - h / 2 + 0.5, h - 1, h - 1);
    });
  }

  function terrainOf(x, y) {
    if (x < 0 || x >= Game.MAP_W || y < 0 || y >= Game.MAP_H) return null;
    return Game.world.terrain ? Game.world.terrain[y][x] : null;
  }

  // 已揭示的特殊地貌：涂地貌色 + 团边界
  function drawRevealedTerrain() {
    if (!Game.world.terrain) return;
    ctx.lineWidth = 1;
    for (let y = 0; y < Game.MAP_H; y++) {
      for (let x = 0; x < Game.MAP_W; x++) {
        const t = Game.world.terrain[y][x];
        if (t == null || t === Game.TERRAIN.PLAIN) continue;
        const px = x * Game.CELL, py = y * Game.CELL;
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = Game.TERRAIN_COLORS[t];
        ctx.fillRect(px, py, Game.CELL, Game.CELL);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = 'rgba(70, 70, 60, 0.85)';
        ctx.beginPath();
        if (terrainOf(x, y - 1) !== t) { ctx.moveTo(px, py); ctx.lineTo(px + Game.CELL, py); }
        if (terrainOf(x, y + 1) !== t) { ctx.moveTo(px, py + Game.CELL); ctx.lineTo(px + Game.CELL, py + Game.CELL); }
        if (terrainOf(x - 1, y) !== t) { ctx.moveTo(px, py); ctx.lineTo(px, py + Game.CELL); }
        if (terrainOf(x + 1, y) !== t) { ctx.moveTo(px + Game.CELL, py); ctx.lineTo(px + Game.CELL, py + Game.CELL); }
        ctx.stroke();
      }
    }
  }

  // 基地边角命中检测（像素坐标）
  const BASE_EDGE = 6;
  function baseHitTest(px, py) {
    const b = Game.base;
    if (!b) return null;
    const l = b.x * Game.CELL, t = b.y * Game.CELL;
    const r = (b.x + b.w) * Game.CELL, bot = (b.y + b.h) * Game.CELL;
    const onL = Math.abs(px - l) <= BASE_EDGE;
    const onR = Math.abs(px - r) <= BASE_EDGE;
    const onT = Math.abs(py - t) <= BASE_EDGE;
    const onB = Math.abs(py - bot) <= BASE_EDGE;
    if (onL && onT) return 'nw';
    if (onR && onT) return 'ne';
    if (onL && onB) return 'sw';
    if (onR && onB) return 'se';
    if (onL) return 'w';
    if (onR) return 'e';
    if (onT) return 'n';
    if (onB) return 's';
    return null;
  }

  function drawWorld() {
    const map = Game.world.map;
    ctx.fillStyle = '#f5efe2';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < Game.MAP_H; y++) {
      for (let x = 0; x < Game.MAP_W; x++) {
        ctx.fillStyle = map[y][x] === Game.TILE.OCEAN ? Game.OCEAN_COLOR : Game.LAND_COLOR;
        ctx.fillRect(x * Game.CELL, y * Game.CELL, Game.CELL, Game.CELL);
        ctx.strokeStyle = Game.GRID_LINE;
        ctx.lineWidth = 1;
        ctx.strokeRect(x * Game.CELL + 0.5, y * Game.CELL + 0.5, Game.CELL - 1, Game.CELL - 1);
      }
    }
    drawRevealedTerrain();
    drawBase();
    Game.state.buildings.forEach(drawBuildingEntity);
    drawVillagers();
    // 拖放建筑落点预览
    if (Game.dragBuildingId && Game.hoverCell && Game.hoverCell.x >= 0 && Game.hoverCell.x < Game.MAP_W && Game.hoverCell.y >= 0 && Game.hoverCell.y < Game.MAP_H) {
      const { w, h } = buildingSize(Game.dragBuildingId);
      const ok = canBuildAt(Game.dragBuildingId, Game.hoverCell.x, Game.hoverCell.y);
      const hx = Game.hoverCell.x * Game.CELL, hy = Game.hoverCell.y * Game.CELL;
      ctx.fillStyle = ok ? 'rgba(94, 183, 224, 0.22)' : 'rgba(190, 84, 70, 0.22)';
      rr(hx + 1, hy + 1, w * Game.CELL - 2, h * Game.CELL - 2, 8);
      ctx.fill();
      ctx.strokeStyle = ok ? 'rgba(94, 183, 224, 0.7)' : 'rgba(190, 84, 70, 0.7)';
      ctx.lineWidth = 1;
      ctx.stroke();
      if (ok) {
        ctx.globalAlpha = 0.55;
        drawBuildingEntity({ id: Game.dragBuildingId, x: Game.hoverCell.x, y: Game.hoverCell.y });
        ctx.globalAlpha = 1;
      }
    }
  }
  Game.drawWorld = drawWorld;

  // 悬停显示坐标
  canvas.addEventListener('mousemove', (e) => {
    if (Game.dragBuildingId) return;
    const r = canvas.getBoundingClientRect();
    const px = e.clientX - r.left;
    const py = e.clientY - r.top;
    const gx = Math.floor(px / Game.CELL);
    const gy = Math.floor(py / Game.CELL);
    Game.hoverCell = { x: gx, y: gy };
    if (gx >= 0 && gx < Game.MAP_W && gy >= 0 && gy < Game.MAP_H) {
      coordEl.textContent = `( ${gx}, ${gy} )`;
    } else {
      coordEl.textContent = '';
    }
    if (baseResize) {
      applyBaseResize(px, py);
      return;
    }
    const side = baseHitTest(px, py);
    const cursors = { nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize', n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize' };
    canvas.style.cursor = side ? cursors[side] : 'crosshair';
  });
  canvas.addEventListener('mouseleave', () => {
    if (Game.dragBuildingId) return;
    coordEl.textContent = '';
    Game.hoverCell = null;
    if (!baseResize) canvas.style.cursor = 'crosshair';
  });

  // 基地：拖动边角缩放
  let baseResize = null; // { side, startX, startY, startBase }
  let resizeMoved = false;

  function applyBaseResize(px, py) {
    const dx = Math.round((px - baseResize.startX) / Game.CELL);
    const dy = Math.round((py - baseResize.startY) / Game.CELL);
    let { x, y, w, h } = baseResize.startBase;
    if (dx !== 0 || dy !== 0) resizeMoved = true;
    const side = baseResize.side;
    if (side.includes('w')) {
      const newW = w - dx;
      const clampedW = Math.min(Math.max(newW, Game.BASE_MIN_W), x + w - 0);
      x = Math.max(0, Math.min(x + (w - clampedW), Game.MAP_W - Game.BASE_MIN_W));
      w = Math.max(Game.BASE_MIN_W, clampedW);
    }
    if (side.includes('e')) {
      w = Math.max(Game.BASE_MIN_W, Math.min(w + dx, Game.MAP_W - x));
    }
    if (side.includes('n')) {
      const newH = h - dy;
      const clampedH = Math.min(Math.max(newH, Game.BASE_MIN_H), y + h - 0);
      y = Math.max(0, Math.min(y + (h - clampedH), Game.MAP_H - Game.BASE_MIN_H));
      h = Math.max(Game.BASE_MIN_H, clampedH);
    }
    if (side.includes('s')) {
      h = Math.max(Game.BASE_MIN_H, Math.min(h + dy, Game.MAP_H - y));
    }
    Game.base = { x, y, w, h };
    drawWorld();
  }

  canvas.addEventListener('mousedown', (e) => {
    if (Game.dragContext || Game.dragBuildingId) return;
    if (e.button !== 0) return;
    const r = canvas.getBoundingClientRect();
    const px = e.clientX - r.left;
    const py = e.clientY - r.top;
    const side = baseHitTest(px, py);
    if (!side) return;
    baseResize = { side, startX: px, startY: py, startBase: { ...Game.base } };
    resizeMoved = false;
    e.preventDefault();
  });
  document.addEventListener('mouseup', () => {
    if (baseResize) {
      if (resizeMoved) Game.saveState();
      baseResize = null;
      canvas.style.cursor = 'crosshair';
    }
  });

  // 点击地图：点选建筑显示信息栏，点空处清除选择
  canvas.addEventListener('click', (e) => {
    if (Game.dragContext || Game.dragBuildingId) return;
    if (resizeMoved) { resizeMoved = false; return; }
    const c = canvasCell(e);
    const b = Game.state.buildings.find(bd => buildingCells(bd).some(cell => cell.x === c.x && cell.y === c.y));
    Game.selectedBuilding = b || null;
    Game.selectedBase = !b && insideBase(c.x, c.y);
    Game.selectedTerrain = null;
    Game.updateStatus();
  });

  // 双击地块：信息栏持续显示该地块地貌的类型与产出内容
  canvas.addEventListener('dblclick', (e) => {
    if (Game.dragContext || Game.dragBuildingId) return;
    if (resizeMoved) return;
    const c = canvasCell(e);
    if (c.x < 0 || c.x >= Game.MAP_W || c.y < 0 || c.y >= Game.MAP_H) return;
    const raw = Game.world.terrain[c.y][c.x];
    const t = raw == null ? Game.TERRAIN.SEA : raw;
    Game.selectedBuilding = null;
    Game.selectedBase = false;
    Game.selectedTerrain = { t, x: c.x, y: c.y };
    Game.updateStatus();
  });

  function insideBase(x, y) {
    const b = Game.base;
    return b && x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h;
  }

  // ---------- 建造系统：从物品栏把建筑拖到地图上安装 ----------
  function canvasCell(e) {
    const r = canvas.getBoundingClientRect();
    return {
      x: Math.floor((e.clientX - r.left) / Game.CELL),
      y: Math.floor((e.clientY - r.top) / Game.CELL)
    };
  }
  function isBuildingItem(id) {
    return !!Game.BUILDINGS[id];
  }
  function canBuildAt(id, x, y) {
    const { w, h } = buildingSize(id);
    if (x < 0 || y < 0 || x + w > Game.MAP_W || y + h > Game.MAP_H) return false;
    const occupied = new Set();
    Game.state.buildings.forEach(bd => buildingCells(bd).forEach(c => occupied.add(c.x + ',' + c.y)));
    Game.state.villagersCells.forEach(v => occupied.add(v.x + ',' + v.y));
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        const cx = x + dx, cy = y + dy;
        if (Game.world.map[cy][cx] !== Game.TILE.LAND) return false;
        if (occupied.has(cx + ',' + cy)) return false;
      }
    }
    const t = Game.world.terrain[y][x];
    if (id === 'lumber' && t !== Game.TERRAIN.FOREST) return false;
    if (id === 'mine' && t !== Game.TERRAIN.MOUNTAIN && t !== Game.TERRAIN.MINE) return false;
    if (id === 'dock') {
      const nearWater = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
        const nx = x + dx, ny = y + dy;
        return nx >= 0 && nx < Game.MAP_W && ny >= 0 && ny < Game.MAP_H && Game.world.map[ny][nx] === Game.TILE.OCEAN;
      });
      if (!nearWater) return false;
    }
    return true;
  }
  Game.canBuildAt = canBuildAt;

  // 初始在基地内任意一个可建格刷一个茅草屋
  function spawnStarterHut() {
    if (!Game.base) return;
    const spots = [];
    for (let y = Game.base.y; y < Game.base.y + Game.base.h; y++) {
      for (let x = Game.base.x; x < Game.base.x + Game.base.w; x++) {
        if (canBuildAt('hut', x, y)) spots.push({ x, y });
      }
    }
    if (!spots.length) return;
    const s = spots[Math.floor(Math.random() * spots.length)];
    Game.state.buildings.push({ id: 'hut', x: s.x, y: s.y });
  }
  Game.spawnStarterHut = spawnStarterHut;

  // 通用合并：地图上 4 个 srcId（1×1）摆成 2×2 → 合并为 1 个 outId（2×2，位于窗口左上角）
  // 返回最后一个合并出的建筑，无则 null
  function mergeGrid(srcId, outId) {
    let last = null;
    for (let y = 0; y < Game.MAP_H - 1; y++) {
      for (let x = 0; x < Game.MAP_W - 1; x++) {
        const cells = [[x, y], [x + 1, y], [x, y + 1], [x + 1, y + 1]];
        let ok = true;
        for (const [cx, cy] of cells) {
          if (!Game.state.buildings.some(bd => bd.id === srcId && bd.x === cx && bd.y === cy)) { ok = false; break; }
        }
        if (!ok) continue;
        cells.forEach(([cx, cy]) => {
          const i = Game.state.buildings.findIndex(bd => bd.id === srcId && bd.x === cx && bd.y === cy);
          Game.state.buildings.splice(i, 1);
        });
        last = { id: outId, x, y };
        Game.state.buildings.push(last);
      }
    }
    return last;
  }
  Game.mergeGrid = mergeGrid;

  // 4 个茅草屋 → 砖瓦屋
  function mergeHuts() { return mergeGrid('hut', 'brickhouse'); }
  Game.mergeHuts = mergeHuts;
  // 4 个伐木小屋 → 伐木工场
  function mergeLumbermills() { return mergeGrid('lumber', 'lumbermill'); }
  Game.mergeLumbermills = mergeLumbermills;
  // 4 个采矿小屋 → 采矿工场
  function mergeMineFactories() { return mergeGrid('mine', 'minefactory'); }
  Game.mergeMineFactories = mergeMineFactories;

  // 地图上 4 个砖瓦屋（每个 2×2）拼成 2×2 一块（合计覆盖 4×4）→ 自动合并为 1 个四合院
  // （砖瓦屋左上角按间隔 2 摆放，即 (x,y),(x+2,y),(x,y+2),(x+2,y+2)，互不重叠才可由玩家摆出）
  function mergeBrickhouses() {
    let last = null;
    for (let y = 0; y <= Game.MAP_H - 4; y++) {
      for (let x = 0; x <= Game.MAP_W - 4; x++) {
        const cells = [[x, y], [x + 2, y], [x, y + 2], [x + 2, y + 2]];
        let ok = true;
        for (const [cx, cy] of cells) {
          if (!Game.state.buildings.some(bd => bd.id === 'brickhouse' && bd.x === cx && bd.y === cy)) { ok = false; break; }
        }
        if (!ok) continue;
        cells.forEach(([cx, cy]) => {
          const i = Game.state.buildings.findIndex(bd => bd.id === 'brickhouse' && bd.x === cx && bd.y === cy);
          Game.state.buildings.splice(i, 1);
        });
        last = { id: 'courtyard', x, y };
        Game.state.buildings.push(last);
      }
    }
    return last;
  }
  Game.mergeBrickhouses = mergeBrickhouses;

  function takeOneFrom(grid, entry) {
    const idx = grid.indexOf(entry);
    if (idx < 0) return false;
    const src = grid[idx];
    src.count -= 1;
    if (src.count <= 0) grid.splice(idx, 1);
    return true;
  }
  function installBuilding(itemId, x, y) {
    const from = Game.dragContext ? Game.dragContext.from : null;
    const grid = from === 'crafting' ? Game.craftingItems : Game.placed;
    if (!takeOneFrom(grid, Game.dragContext.entry)) return;
    Game.state.buildings.push({ id: itemId, x, y });
    Game.dragContext = null;
    Game.dragBuildingId = null;
    Game.selectedBuilding = Game.state.buildings[Game.state.buildings.length - 1];
    Game.selectedBase = false;
    Game.selectedTerrain = null;
    Game.renderInventory();
    Game.renderCrafting();
    Game.updateStatus();
    Game.saveState();
    drawWorld();
    // 放下的低级建筑若拼成 2×2，自动合并升级为对应的工场/砖瓦屋/四合院
    let merged = mergeHuts();
    const mergedCourtyard = mergeBrickhouses();
    if (mergedCourtyard) merged = mergedCourtyard;
    const mergedLumbermill = mergeLumbermills();
    const mergedMineFactory = mergeMineFactories();
    if (mergedLumbermill) merged = mergedLumbermill;
    if (mergedMineFactory) merged = mergedMineFactory;
    if (merged) {
      Game.selectedBuilding = merged;
      Game.saveState();
      Game.updateStatus();
      drawWorld();
    }
  }
  Game.installBuilding = installBuilding;

  canvas.addEventListener('dragover', (e) => {
    if (!Game.dragContext) return;
    const item = Game.ITEMS.find(i => i.id === Game.dragContext.id);
    if (!item || !isBuildingItem(item.id)) { Game.dragBuildingId = null; return; }
    e.preventDefault();
    const c = canvasCell(e);
    Game.hoverCell = { x: c.x, y: c.y };
    Game.dragBuildingId = item.id;
    const ok = canBuildAt(item.id, c.x, c.y);
    coordEl.textContent = ok ? '松手放置建筑' : '此处无法建造';
    drawWorld();
  });
  canvas.addEventListener('dragleave', () => {
    Game.dragBuildingId = null;
    coordEl.textContent = '';
    drawWorld();
  });
  canvas.addEventListener('drop', (e) => {
    e.preventDefault();
    Game.dragBuildingId = null;
    if (!Game.dragContext) return;
    const item = Game.ITEMS.find(i => i.id === Game.dragContext.id);
    if (!item || !isBuildingItem(item.id)) return;
    const c = canvasCell(e);
    if (!canBuildAt(item.id, c.x, c.y)) { drawWorld(); return; }
    installBuilding(item.id, c.x, c.y);
  });
})();
