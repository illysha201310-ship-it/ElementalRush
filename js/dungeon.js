// Подземелье: этаж из комнат, соединённых коридорами (как в старой версии). Двери запираются, пока идёт бой.
"use strict";
const WALL = 28, CORR_W = 200, CELL_W = 1560, CELL_H = 1140;
const WALLS_ART = {
  forest: [[122, 112, 92], [70, 62, 52], [176, 164, 128], [96, 150, 70]],
  caves: [[86, 84, 116], [40, 38, 60], [130, 132, 170], [90, 140, 160]],
  shroom: [[84, 104, 128], [42, 56, 76], [130, 156, 180], [90, 170, 160]],
  ruins: [[178, 160, 132], [104, 92, 80], [220, 204, 168], [120, 156, 80]],
  ash: [[110, 82, 70], [56, 38, 34], [160, 122, 100], [70, 50, 46]],
  ice: [[170, 186, 210], [104, 118, 150], [222, 234, 248], [246, 250, 255]],
};
const VOID_ART = { forest: [18, 30, 24], caves: [12, 10, 26], shroom: [10, 24, 34], ruins: [34, 28, 24], ash: [30, 16, 12], ice: [40, 48, 72] };

function makeFloor(fi, bid) {
  const kinds = ["start", "fight", "fight", "treasure", "fight", "fight", "boss"];
  let best = null;
  for (let attempt = 0; attempt < 40 && !best; attempt++) {
    const cells = [[0, 0]], used = new Set(["0,0"]);
    let ok = true;
    for (let i = 1; i < kinds.length; i++) {
      const [c, r] = cells[i - 1];
      const opts = [[c + 1, r], [c + 1, r], [c, r - 1], [c, r + 1]].filter(([a, b]) => !used.has(a + "," + b) && Math.abs(b) <= 2);
      if (!opts.length) { ok = false; break; }
      const n = pick(opts); cells.push(n); used.add(n[0] + "," + n[1]);
    }
    if (ok) best = cells;
  }
  const minR = Math.min(...best.map((c) => c[1]));
  const rooms = best.map(([c, r], i) => {
    const kind = kinds[i];
    const w = kind === "boss" ? 1260 : kind === "fight" ? rndi(940, 1100) : 760, h = kind === "boss" ? 860 : kind === "fight" ? rndi(620, 720) : 540;
    const cx = c * CELL_W + CELL_W / 2, cy = (r - minR) * CELL_H + CELL_H / 2;
    return { i, kind, x: Math.round(cx - w / 2), y: Math.round(cy - h / 2), w, h, cx, cy, state: kind === "start" || kind === "treasure" ? "clear" : "idle",
      seen: i === 0, waves: 0, chest: kind === "treasure" ? { open: false } : null, ground: makeGround(bid, w, h) };
  });
  const corrs = [];
  for (let i = 1; i < rooms.length; i++) {
    const a = rooms[i - 1], b = rooms[i];
    let c;
    if (Math.abs(a.cy - b.cy) < 1) {                  // по горизонтали
      const L = a.cx < b.cx ? a : b, R = a.cx < b.cx ? b : a;
      c = { x: L.x + L.w - WALL, y: L.cy - CORR_W / 2, w: R.x - (L.x + L.w) + 2 * WALL, h: CORR_W, horiz: true };
    } else {
      const T = a.cy < b.cy ? a : b, B = a.cy < b.cy ? b : a;
      c = { x: T.cx - CORR_W / 2, y: T.y + T.h - WALL, w: CORR_W, h: B.y - (T.y + T.h) + 2 * WALL, horiz: false };
    }
    c.a = a; c.b = b;
    c.ground = makeGround(bid, Math.max(1, Math.round(c.w)), Math.max(1, Math.round(c.h)));
    corrs.push(c);
  }
  const maxX = Math.max(...rooms.map((r) => r.x + r.w)), maxY = Math.max(...rooms.map((r) => r.y + r.h));
  return { fi, bid, rooms, corrs, w: maxX + 200, h: maxY + 200, portal: null };
}

const corrOpen = (c) => c.a.state !== "fight" && c.b.state !== "fight";
// точка (с радиусом r) внутри проходимой зоны: комнаты минус стены, открытые коридоры
function walkable(x, y, r = 0) {
  const F = GS.floor;
  for (const m of F.rooms) if (x - r >= m.x + WALL && x + r <= m.x + m.w - WALL && y - r >= m.y + WALL && y + r <= m.y + m.h - WALL) return true;
  for (const c of F.corrs) {
    if (!corrOpen(c)) continue;
    // коридор заходит в комнаты с запасом (r + 6), чтобы на стыке не было «невидимой стены»
    if (c.horiz) { if (x >= c.x - r - 6 && x <= c.x + c.w + r + 6 && y - r >= c.y && y + r <= c.y + c.h) return true; }
    else if (y >= c.y - r - 6 && y <= c.y + c.h + r + 6 && x - r >= c.x && x + r <= c.x + c.w) return true;
  }
  return false;
}
function moveIn(o, nx, ny, r) {
  if (walkable(nx, ny, r)) { o.x = nx; o.y = ny; return true; }
  if (walkable(nx, o.y, r)) { o.x = nx; return false; }
  if (walkable(o.x, ny, r)) { o.y = ny; return false; }
  return false;
}
function roomAt(x, y, pad = 0) {
  for (const m of GS.floor.rooms) if (x >= m.x + pad && x <= m.x + m.w - pad && y >= m.y + pad && y <= m.y + m.h - pad) return m;
  return null;
}
function randomInRoom(m, awayFrom, minD = 260) {
  for (let k = 0; k < 30; k++) {
    const x = rnd(m.x + 90, m.x + m.w - 90), y = rnd(m.y + 90, m.y + m.h - 90);
    if (!awayFrom || (x - awayFrom.x) ** 2 + (y - awayFrom.y) ** 2 > minD * minD) return [x, y];
  }
  return [m.cx, m.cy];
}

// ---------------------------------------------------------------- логика комнат
function roomTick(dt) {
  const p = GS.player, F = GS.floor;
  const m = roomAt(p.x, p.y);
  if (m) m.seen = true;
  for (const c of F.corrs) if ((p.x - c.x - c.w / 2) ** 2 + (p.y - c.y - c.h / 2) ** 2 < 900 ** 2) { c.a.seen = true; c.b.seen = true; }
  // вошёл в боевую комнату — двери закрываются
  const inner = roomAt(p.x, p.y, 110);
  if (inner && inner.state === "idle" && (inner.kind === "fight" || inner.kind === "boss")) {
    inner.state = "fight"; GS.cur = inner; GS.shake = 6; AUDIO.play("boom");
    if (inner.kind === "boss") {
      const kind = DATA.bossOf[F.bid] || "brute";
      const [x, y] = randomInRoom(inner, p, 380);
      spawnEnemy(kind, x, y, true);
      GS.banner = { title: GS.boss.name, sub: L("Страж этажа", "Floor guardian"), t: 2.5 };
      inner.waves = 0;
    } else {
      inner.waves = 2 + Math.floor(F.fi / 2);
      GS.banner = { title: L("Двери заперты!", "Doors locked!"), sub: L("Перебей всех в комнате", "Clear the room"), t: 1.8 };
      queueWave(inner);
    }
  }
  const cur = GS.cur;
  if (cur && cur.state === "fight") {
    if (GS.enemies.length === 0 && GS.spawnFx.length === 0) {
      if (cur.kind === "fight" && cur.waves > 0) { GS.waveDelay -= dt; if (GS.waveDelay <= 0) { GS.waveDelay = 0.8; queueWave(cur); } }
      else if (cur.kind === "fight" || (cur.kind === "boss" && !GS.boss)) {
        cur.state = "clear"; GS.cur = null; AUDIO.play("level");
        GS.banner = { title: L("Комната зачищена!", "Room cleared!"), sub: "", t: 1.6 };
        for (let i = 0; i < 10; i++) GS.gems.push({ x: cur.cx + rnd(-80, 80), y: cur.cy + rnd(-60, 60), v: 2 + F.fi, t: 0 });
        if (cur.kind === "boss") F.portal = { x: cur.cx, y: cur.cy, t: 0 };
        if (GS.cardQueue.length) openCards();
      }
    }
  }
  // сундук в сокровищнице
  for (const r of F.rooms) if (r.chest && !r.chest.open && (p.x - r.cx) ** 2 + (p.y - r.cy) ** 2 < 60 * 60) {
    r.chest.open = true; burst(r.cx, r.cy - 20, [255, 214, 120], 30, 260); AUDIO.play("level");
    GS.cardQueue.push("chest"); openCards();
  }
  // портал на следующий этаж
  if (F.portal) {
    F.portal.t += dt;
    if ((p.x - F.portal.x) ** 2 + (p.y - F.portal.y) ** 2 < 60 * 60 && F.portal.t > 1) {
      if (F.fi >= DATA.biomes.length - 1) { GS.mode = "win"; saveBest(); return; }
      setFloor(F.fi + 1);
    }
  }
  // появление врагов со вспышкой-предупреждением
  for (const s of GS.spawnFx) { s.t -= dt; if (s.t <= 0) { spawnEnemy(s.kind, s.x, s.y); burst(s.x, s.y - 10, [255, 120, 160], 10, 180); } }
  GS.spawnFx = GS.spawnFx.filter((s) => s.t > 0);
}
function queueWave(m) {
  m.waves--; GS.wave++;
  const F = GS.floor, n = 7 + F.fi * 3 + Math.floor(GS.wave / 2);
  const kinds = Object.entries(DATA.biomes[F.fi].kinds).filter(([k, w]) => w <= 2 + GS.wave % 5).map(([k]) => k);
  const pool = kinds.length ? kinds : Object.keys(DATA.biomes[F.fi].kinds);
  for (let i = 0; i < n; i++) {
    const [x, y] = randomInRoom(m, GS.player, 240);
    GS.spawnFx.push({ x, y, t: 0.55 + i * 0.07, kind: pick(pool) });
  }
}
function setFloor(fi) {
  const bid = DATA.biomes[fi].id;
  GS.bid = bid; GS.biome = fi;
  GS.floor = makeFloor(fi, bid);
  const s = GS.floor.rooms[0];
  GS.player.x = s.cx; GS.player.y = s.cy;
  GS.enemies = []; GS.projs = []; GS.zones = []; GS.strikes = []; GS.spawnFx = []; GS.cur = null; GS.boss = null;
  GS.player.hp = GS.player.maxhp;
  GS.cam = { x: s.cx - V.W / 2, y: s.cy - V.H / 2 };
  GS.banner = { title: nm(DATA.biomes[fi]), sub: L("Этаж ", "Floor ") + (fi + 1), t: 3 };
  if (fi > 0 && GS.extra.length < DATA.extra.length) GS.cardQueue.push("unlock");
}

// ---------------------------------------------------------------- отрисовка
function drawFloor(cx, cy, vw, vh) {
  const F = GS.floor, A = WALLS_ART[F.bid] || WALLS_ART.forest;
  const [stone, dark, lite, moss] = A;
  const vis = (x, y, w, h) => x + w > cx - 60 && x < cx + vw + 60 && y + h > cy - 80 && y < cy + vh + 60;
  // стены: каменные блоки вокруг комнат и коридоров
  ctx.fillStyle = rgb(dark);
  for (const m of F.rooms) if (vis(m.x, m.y, m.w, m.h)) { ctx.beginPath(); ctx.roundRect(m.x - 6, m.y - 26, m.w + 12, m.h + 32, 18); ctx.fill(); }
  for (const c of F.corrs) if (vis(c.x, c.y, c.w, c.h)) {
    if (c.horiz) ctx.fillRect(c.x, c.y - WALL - 18, c.w, c.h + 2 * WALL + 18); else ctx.fillRect(c.x - WALL, c.y, c.w + 2 * WALL, c.h);
  }
  ctx.fillStyle = rgb(stone);
  for (const m of F.rooms) if (vis(m.x, m.y, m.w, m.h)) { ctx.beginPath(); ctx.roundRect(m.x, m.y - 18, m.w, m.h + 18, 14); ctx.fill(); }
  // пол
  for (const c of F.corrs) if (vis(c.x, c.y, c.w, c.h)) ctx.drawImage(c.ground, c.horiz ? c.x : c.x, c.horiz ? c.y : c.y, c.w, c.h);
  for (const m of F.rooms) if (vis(m.x, m.y, m.w, m.h)) {
    ctx.drawImage(m.ground, WALL, WALL, m.w - 2 * WALL, m.h - 2 * WALL, m.x + WALL, m.y + WALL, m.w - 2 * WALL, m.h - 2 * WALL);
    // лицевая грань верхней стены и тень от неё
    const g = ctx.createLinearGradient(0, m.y + WALL, 0, m.y + WALL + 50);
    g.addColorStop(0, "rgba(0,0,0,0.32)"); g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.fillRect(m.x + WALL, m.y + WALL, m.w - 2 * WALL, 50);
    ctx.fillStyle = rgb(lite); ctx.fillRect(m.x + 4, m.y - 16, m.w - 8, 6);
    // мох / снег шапкой по верху
    for (let x = m.x + 8; x < m.x + m.w - 8; x += 14) {
      const rr = 6 + ((x * 7919) % 5);
      ctx.fillStyle = rgb(shade(moss, 0.75)); ctx.beginPath(); ctx.arc(x, m.y - 14, rr, 0, 6.283); ctx.fill();
      ctx.fillStyle = rgb(moss); ctx.beginPath(); ctx.arc(x, m.y - 16, rr - 1, 0, 6.283); ctx.fill();
    }
  }
  // запертые двери — светящиеся барьеры
  for (const c of F.corrs) {
    if (corrOpen(c) || !vis(c.x, c.y, c.w, c.h)) continue;
    const t = GS.t;
    for (const m of [c.a, c.b]) {
      if (m.state !== "fight") continue;
      let x1, y1, x2, y2;
      if (c.horiz) { const xx = m.cx < c.x + c.w / 2 ? m.x + m.w - WALL : m.x + WALL; x1 = x2 = xx; y1 = c.y; y2 = c.y + c.h; }
      else { const yy = m.cy < c.y + c.h / 2 ? m.y + m.h - WALL : m.y + WALL; y1 = y2 = yy; x1 = c.x; x2 = c.x + c.w; }
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = `rgba(255,110,140,${0.55 + 0.25 * Math.sin(t * 6)})`; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.strokeStyle = "rgba(255,230,240,0.9)"; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
    }
  }
  // сундук и портал
  for (const m of F.rooms) if (m.chest && vis(m.x, m.y, m.w, m.h)) {
    shadowAt(ctx, m.cx, m.cy + 4, 26);
    if (!m.chest.open) glow(ctx, m.cx, m.cy - 14, 50, [255, 200, 110], 0.5 + 0.2 * Math.sin(GS.t * 3));
    ctx.fillStyle = m.chest.open ? "#5a3a22" : "#8a5a2e"; ctx.beginPath(); ctx.roundRect(m.cx - 24, m.cy - 26, 48, 30, 6); ctx.fill();
    ctx.strokeStyle = "#1a0e08"; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = "#e6b450"; ctx.fillRect(m.cx - 24, m.cy - 15, 48, 4); ctx.fillRect(m.cx - 4, m.cy - 20, 8, 10);
  }
  if (F.portal) {
    const P = F.portal, k = Math.min(1, P.t);
    glow(ctx, P.x, P.y - 20, 90 * k, [170, 120, 255], 0.8);
    ctx.save(); ctx.translate(P.x, P.y - 20);
    for (let i = 0; i < 3; i++) { ctx.rotate(GS.t * (1 + i * 0.4)); ctx.strokeStyle = `rgba(${200 - i * 30},${160 + i * 20},255,0.8)`; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(0, 0, Math.max(2, 46 * k - i * 8), Math.max(2, 30 * k - i * 5), 0, 0, 5); ctx.stroke(); }
    ctx.restore();
  }
  // предупреждения о появлении врагов
  for (const s of GS.spawnFx) { const k = 1 - Math.min(1, s.t / 0.6); ctx.strokeStyle = `rgba(255,120,160,${0.8 * k})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(s.x, s.y, 26 * k + 6, 12 * k + 3, 0, 0, 6.283); ctx.stroke(); glow(ctx, s.x, s.y - 10, 30, [255, 100, 150], 0.4 * k); }
}
function drawMinimap() {
  const F = GS.floor, p = GS.player;
  const k = Math.min(200 / F.w, 120 / F.h), W = F.w * k + 16, H = F.h * k + 16, X = V.W - W - 14, Y = 64;
  ctx.fillStyle = "rgba(20,14,26,0.75)"; ctx.beginPath(); ctx.roundRect(X, Y, W, H, 10); ctx.fill();
  ctx.strokeStyle = "rgba(255,220,160,0.4)"; ctx.lineWidth = 1; ctx.stroke();
  for (const c of F.corrs) if (c.a.seen || c.b.seen) { ctx.fillStyle = "rgba(220,200,170,0.6)"; ctx.fillRect(X + 8 + c.x * k, Y + 8 + c.y * k, Math.max(2, c.w * k), Math.max(2, c.h * k)); }
  for (const m of F.rooms) {
    if (!m.seen) continue;
    ctx.fillStyle = m.state === "fight" ? "#ff6a7a" : m.state === "clear" ? "rgba(140,220,150,0.85)" : "rgba(220,210,190,0.7)";
    ctx.fillRect(X + 8 + m.x * k, Y + 8 + m.y * k, m.w * k, m.h * k);
    if (m.kind === "boss") txt("☠", X + 8 + m.cx * k, Y + 8 + m.cy * k, 12, "#2a1018", "center", FONT, false);
    if (m.chest && !m.chest.open) txt("★", X + 8 + m.cx * k, Y + 8 + m.cy * k, 11, "#7a4a10", "center", FONT, false);
  }
  ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(X + 8 + p.x * k, Y + 8 + p.y * k, 3, 0, 6.283); ctx.fill();
}
// стрелка к следующей непройденной комнате
function nextTarget() {
  const F = GS.floor;
  if (F.portal) return F.portal;
  const t = F.rooms.find((m) => m.state === "idle") || F.rooms.find((m) => m.chest && !m.chest.open);
  return t ? { x: t.cx, y: t.cy } : null;
}
