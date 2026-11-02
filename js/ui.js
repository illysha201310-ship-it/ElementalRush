// Отрисовка мира и интерфейса, меню (выбор устройства, героя, языка), карточки, кнопки для телефона, главный цикл.
"use strict";
const FONT = "'Segoe UI', 'Trebuchet MS', system-ui, sans-serif";
const TITLE = "Georgia, 'Times New Roman', serif";
let BUTTONS = [];       // [x, y, w, h, fn] — кликабельные зоны текущего кадра
let MENU = { sel: "warrior", screen: "title" };

function inBattle() { return GS.mode === "play"; }
function touchButton(x, y) {
  for (const b of BUTTONS) if (b[5] === "touch" && x >= b[0] && x <= b[0] + b[2] && y >= b[1] && y <= b[1] + b[3]) { b[4](); return true; }
  return false;
}
function button(x, y, w, h, label, fn, o = {}) {
  const hot = CFG.device === "pc" && IN.mx >= x && IN.mx <= x + w && IN.my >= y && IN.my <= y + h;
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  const base = o.col || [70, 54, 96];
  g.addColorStop(0, rgb(mixc(base, [255, 255, 255], hot ? 0.3 : 0.15))); g.addColorStop(1, rgb(shade(base, hot ? 1.05 : 0.85)));
  ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(x, y, w, h, Math.min(16, h / 2)); ctx.fill();
  ctx.strokeStyle = o.sel ? "#ffd56e" : "rgba(255,230,180,0.55)"; ctx.lineWidth = o.sel ? 3 : 1.5; ctx.stroke();
  txt(label, x + w / 2, y + h / 2 + 1, o.size || 22, o.tc || "#fff4e0", "center", o.font || FONT, true);
  BUTTONS.push([x, y, w, h, fn, o.touch ? "touch" : "click"]);
}
function txt(s, x, y, size, col, align = "left", font = FONT, shadow = true, weight = "bold") {
  if (CFG.device === "phone" && size < 20) size = Math.round(size * 1.3);   // мелкий текст на телефоне крупнее
  ctx.font = `${weight} ${size}px ${font}`; ctx.textAlign = align; ctx.textBaseline = "middle";
  if (shadow) { ctx.fillStyle = "rgba(20,10,20,0.55)"; ctx.fillText(s, x + 2, y + 2); }
  ctx.fillStyle = col; ctx.fillText(s, x, y);
}
function wrapText(s, x, y, w, size, col, lh = 1.3, align = "left") {
  ctx.font = `600 ${size}px ${FONT}`;
  const words = s.split(" "); let line = "", yy = y;
  for (const wd of words) {
    const t = line ? line + " " + wd : wd;
    if (ctx.measureText(t).width > w && line) { txt(line, x, yy, size, col, align, FONT, false, "600"); line = wd; yy += size * lh; } else line = t;
  }
  if (line) txt(line, x, yy, size, col, align, FONT, false, "600");
  return yy + size * lh;
}
function panel(x, y, w, h, a = 0.82) {
  ctx.fillStyle = `rgba(28,20,36,${a})`; ctx.beginPath(); ctx.roundRect(x, y, w, h, 14); ctx.fill();
  ctx.strokeStyle = "rgba(255,220,160,0.45)"; ctx.lineWidth = 1.5; ctx.stroke();
}

// ================================================================ мир
function drawWorld(dt) {
  const p = GS.player, sx = GS.shake ? rnd(-GS.shake, GS.shake) : 0, sy = GS.shake ? rnd(-GS.shake, GS.shake) : 0;
  const cx = Math.round(GS.cam.x + sx), cy = Math.round(GS.cam.y + sy);
  const Z = zoom(), vw = V.W / Z, vh = V.H / Z;
  const vc = VOID_ART[GS.bid] || [16, 20, 18];
  const bg = ctx.createRadialGradient(V.W / 2, V.H / 2, 100, V.W / 2, V.H / 2, V.W * 0.8);
  bg.addColorStop(0, rgb(shade(vc, 1.5))); bg.addColorStop(1, rgb(vc));
  ctx.fillStyle = bg; ctx.fillRect(0, 0, V.W, V.H);
  ctx.save(); ctx.scale(Z, Z);
  ctx.translate(-cx, -cy);
  drawFloor(cx, cy, vw, vh);
  for (const z of GS.zones) drawZone(z);
  for (const s of GS.strikes) if (!s.done) {
    const k = s.t / s.delay;
    ctx.strokeStyle = rgb(s.col, 0.8); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.stroke();
    ctx.fillStyle = rgb(s.col, 0.18 + 0.25 * k); ctx.beginPath(); ctx.arc(s.x, s.y, s.r * k, 0, 6.283); ctx.fill();
  }
  for (const g of GS.gems) {
    const b = Math.sin(g.t * 5) * 2;
    if (g.heart) { glow(ctx, g.x, g.y - 6 + b, 20, [255, 100, 130], 0.7); txt("♥", g.x, g.y - 6 + b, 18, "#ff6a8a", "center"); continue; }
    glow(ctx, g.x, g.y - 4 + b, 14, [140, 220, 255], 0.6);
    ctx.fillStyle = "#bff0ff"; ctx.beginPath(); ctx.moveTo(g.x, g.y - 10 + b); ctx.lineTo(g.x + 5, g.y - 4 + b); ctx.lineTo(g.x, g.y + 2 + b); ctx.lineTo(g.x - 5, g.y - 4 + b); ctx.fill();
  }
  // объекты по глубине
  const objs = GS.enemies.map((e) => [e.y, e]);
  objs.push([p.y, p]);
  for (const s of GS.summons) objs.push([s.y, s]);
  objs.sort((a, b) => a[0] - b[0]);
  for (const [, o] of objs) {
    if (o === p) drawPlayer();
    else if (o.cd !== undefined && o.t !== undefined && o.kind === undefined) drawSummon(o);
    else drawEnemy(o, cx, cy);
  }
  for (const a of GS.abilities) if (a.b === "orbit") drawOrbit(a); else if (a.b === "avatar") drawAvatar(a);
  for (const q of GS.projs) drawProj(q);
  ctx.globalCompositeOperation = "lighter";
  for (const b of GS.beams) {
    const k = b.life / 0.3;
    ctx.strokeStyle = rgb(b.col, 0.5 * k); ctx.lineWidth = b.wide ? 12 : 8; ctx.beginPath(); ctx.moveTo(b.x1, b.y1);
    const mx = (b.x1 + b.x2) / 2 + rnd(-12, 12), my = (b.y1 + b.y2) / 2 + rnd(-12, 12); ctx.quadraticCurveTo(mx, my, b.x2, b.y2); ctx.stroke();
    ctx.strokeStyle = `rgba(255,255,255,${0.8 * k})`; ctx.lineWidth = 2.5; ctx.stroke();
  }
  for (const q of GS.parts) { const k = q.life / q.max; if (q.g) glow(ctx, q.x, q.y, q.size * 3, q.col, 0.5 * k); ctx.fillStyle = rgb(q.col, k); ctx.beginPath(); ctx.arc(q.x, q.y, q.size * k + 0.5, 0, 6.283); ctx.fill(); }
  for (const r of GS.rings) {
    const k = 1 - r.life / r.max;
    ctx.strokeStyle = rgb(r.col, 0.8 * (1 - k)); ctx.lineWidth = r.arc ? 14 * (1 - k) + 2 : 5 * (1 - k) + 1;
    ctx.beginPath(); if (r.arc) ctx.arc(r.x, r.y, r.r * (0.7 + 0.3 * k), r.arc[0], r.arc[1]); else ctx.arc(r.x, r.y, r.r * (0.4 + 0.6 * k), 0, 6.283); ctx.stroke();
  }
  ctx.globalCompositeOperation = "source-over";
  if (GS.avatarBloom) drawBloom(GS.avatarBloom);
  for (const t of GS.texts) { ctx.globalAlpha = Math.min(1, t.life * 2.5); txt(t.s, t.x, t.y, t.big ? 22 : 15, rgb(t.col), "center"); ctx.globalAlpha = 1; }
  ctx.restore();
  drawAtmosphere(ctx, cx, cy, GS.t, GS.bid);
  drawMotes(ctx, cx, cy, GS.t, dt, GS.bid);
  if (p.hurtFlash > 0) { ctx.fillStyle = `rgba(200,30,40,${p.hurtFlash})`; ctx.fillRect(0, 0, V.W, V.H); }
}
function drawPlayer() {
  const p = GS.player;
  shadowAt(ctx, p.x, p.y + 2, 18);
  if (p.invis > 0) ctx.globalAlpha = 0.45;
  if (p.inv > 0 && p.dashT <= 0 && Math.floor(GS.t * 20) % 2) ctx.globalAlpha *= 0.6;
  const dk = dashKind();
  drawHero(ctx, p.cls, p.x, p.y, p.moving ? p.t : p.t * 0.25, p.face, p.atk, 1.0, dk ? hexRGB(DATA.elements[dk].color) : null);
  if (p.dashT > 0) for (let i = 1; i <= 3; i++) { ctx.globalAlpha = 0.18 / i; drawHero(ctx, p.cls, p.x - p.dvx * 0.012 * i, p.y - p.dvy * 0.012 * i, p.t, p.face, 0, 1.0, null); ctx.globalAlpha = 1; }
  ctx.globalAlpha = 1;
  if (p.shield > 0) { ctx.strokeStyle = "rgba(170,220,255,0.7)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p.x, p.y - 26, 34, 0, 6.283); ctx.stroke(); }
}
function drawEnemy(e, cx, cy) {
  if (e.x < cx - 120 || e.x > cx + V.W / zoom() + 120 || e.y < cy - 120 || e.y > cy + V.H / zoom() + 160) return;
  shadowAt(ctx, e.x, e.y + 2, e.r);
  const fr = Math.floor(e.t * 6) % 4, flip = GS.player.x < e.x;
  const spr = enemySprite(e.kind, e.col.map((v) => Math.round(v / 8) * 8), Math.round(e.r * 1.35), fr, flip, e.flash > 0);
  ctx.drawImage(spr, e.x - spr.width / 2, e.y - spr.height * 0.62);
  if (e.curseUntil > GS.time) glow(ctx, e.x, e.y - e.r, e.r * 1.5, [150, 80, 220], 0.4);
  if (e.stun > 0) for (let i = 0; i < 3; i++) { const a = GS.t * 5 + i * 2.1; ctx.fillStyle = "#ffe68a"; ctx.beginPath(); ctx.arc(e.x + Math.cos(a) * e.r * 0.7, e.y - e.r * 2.1 + Math.sin(a) * 4, 2.5, 0, 6.283); ctx.fill(); }
  if (!e.boss && e.hp < e.maxhp) {
    ctx.fillStyle = "rgba(20,10,10,0.6)"; ctx.fillRect(e.x - 16, e.y - e.r * 2 - 8, 32, 4);
    ctx.fillStyle = "#ff6a5a"; ctx.fillRect(e.x - 16, e.y - e.r * 2 - 8, 32 * Math.max(0, e.hp / e.maxhp), 4);
  }
}
function drawSummon(s) {
  shadowAt(ctx, s.x, s.y + 2, 18);
  blob(ctx, s.x, s.y - 18, 16, 18, shade(s.col, 0.8), mixc(s.col, [255, 255, 255], 0.4));
  eyes(ctx, s.x + 3, s.y - 22, 5, "#2b1d1d", [255, 240, 180]);
}
function drawZone(z) {
  const k = Math.min(1, z.t * 4) * Math.min(1, (z.dur - z.t) * 2);
  const g = ctx.createRadialGradient(z.x, z.y, 0, z.x, z.y, z.r);
  g.addColorStop(0, rgb(z.col, 0.32 * k)); g.addColorStop(0.75, rgb(z.col, 0.2 * k)); g.addColorStop(1, rgb(z.col, 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(z.x, z.y, z.r, z.r * 0.8, 0, 0, 6.283); ctx.fill();
  ctx.strokeStyle = rgb(mixc(z.col, [255, 255, 255], 0.4), 0.45 * k); ctx.lineWidth = 2; ctx.setLineDash([10, 8]); ctx.lineDashOffset = -GS.t * 30;
  ctx.beginPath(); ctx.ellipse(z.x, z.y, z.r, z.r * 0.8, 0, 0, 6.283); ctx.stroke(); ctx.setLineDash([]);
  if (Math.random() < 0.4) { const a = rnd(0, 6.28), rr = z.r * Math.sqrt(Math.random()); GS.parts.push({ x: z.x + Math.cos(a) * rr, y: z.y + Math.sin(a) * rr * 0.8, vx: 0, vy: -40, life: 0.6, max: 0.6, col: z.col, size: 2.5, g: true }); }
}
function drawProj(q) {
  const ang = Math.atan2(q.vy, q.vx);
  ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(ang);
  glow(ctx, 0, 0, q.r * 3.2, q.col, q.friendly ? 0.7 : 0.9);
  if (q.shape === "arrow") { ctx.strokeStyle = "#f6ecd2"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(8, 0); ctx.stroke(); ctx.fillStyle = "#eee"; ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(5, -4); ctx.lineTo(5, 4); ctx.fill(); }
  else if (q.shape === "blade" || q.shape === "wave") { ctx.fillStyle = rgb(mixc(q.col, [255, 255, 255], 0.5), 0.9); ctx.beginPath(); ctx.ellipse(0, 0, q.r * 0.5, q.r * 1.4, 0, -1.4, 1.4); ctx.fill(); }
  else if (q.shape === "shard") { ctx.fillStyle = rgb(mixc(q.col, [255, 255, 255], 0.4)); ctx.beginPath(); ctx.moveTo(q.r * 1.6, 0); ctx.lineTo(-q.r, -q.r * 0.6); ctx.lineTo(-q.r * 0.5, 0); ctx.lineTo(-q.r, q.r * 0.6); ctx.fill(); }
  else {
    ctx.fillStyle = rgb(q.col, 0.5); ctx.beginPath(); ctx.ellipse(-q.r * 1.2, 0, q.r * 1.6, q.r * 0.6, 0, 0, 6.283); ctx.fill();
    blob(ctx, 0, 0, q.r, q.r, q.col, mixc(q.col, [255, 255, 255], 0.7), false);
  }
  ctx.restore();
}
function drawOrbit(a) {
  const p = GS.player, P = a.p, n = P.count || 3, R = P.radius || 80;
  for (let i = 0; i < n; i++) {
    const ang = a.orbA + i / n * 6.283, x = p.x + Math.cos(ang) * R, y = p.y - 20 + Math.sin(ang) * R * 0.8;
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    for (let k = 1; k <= 6; k++) { const aa = ang - k * 0.09; ctx.fillStyle = rgb(a.color, 0.28 * (1 - k / 7)); ctx.beginPath(); ctx.arc(p.x + Math.cos(aa) * R, p.y - 20 + Math.sin(aa) * R * 0.8, (P.size || 10) * (1 - k / 9), 0, 6.283); ctx.fill(); }
    ctx.restore();
    glow(ctx, x, y, (P.size || 10) * 3, a.color, 0.6);
    blob(ctx, x, y, P.size || 10, P.size || 10, a.color, mixc(a.color, [255, 255, 255], 0.6), false);
  }
}
// «Аватар стихий»: мандала под героем и четыре духа стихий
function drawAvatar(a) {
  const p = GS.player, t = GS.t;
  ctx.save(); ctx.translate(p.x, p.y);
  ctx.globalCompositeOperation = "lighter";
  const els = ["F", "W", "E", "A"];
  for (let ring2 = 0; ring2 < 2; ring2++) {
    const R = 52 + ring2 * 22, rot = (ring2 ? -1 : 1) * t * 0.6;
    ctx.strokeStyle = `rgba(255,236,190,${0.35 - ring2 * 0.12})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, 0, R, R * 0.42, 0, 0, 6.283); ctx.stroke();
    for (let i = 0; i < 8; i++) {
      const aa = rot + i / 8 * 6.283, x = Math.cos(aa) * R, y = Math.sin(aa) * R * 0.42;
      ctx.fillStyle = rgb(hexRGB(DATA.elements[els[i % 4]].color), 0.55); ctx.beginPath(); ctx.arc(x, y, 3, 0, 6.283); ctx.fill();
    }
  }
  ctx.globalCompositeOperation = "source-over";
  ctx.restore();
  els.forEach((el, i) => {
    const ang = a.orbA + i * Math.PI / 2, x = p.x + Math.cos(ang) * 64, y = p.y - 30 + Math.sin(ang) * 40 + Math.sin(t * 3 + i) * 4;
    const col = hexRGB(DATA.elements[el].color), lt = hexRGB(DATA.elements[el].light);
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    for (let k = 1; k <= 7; k++) { const aa = ang - k * 0.1; ctx.fillStyle = rgb(col, 0.3 * (1 - k / 8)); ctx.beginPath(); ctx.arc(p.x + Math.cos(aa) * 64, p.y - 30 + Math.sin(aa) * 40, 7 * (1 - k / 9), 0, 6.283); ctx.fill(); }
    ctx.restore();
    glow(ctx, x, y, 34, col, 0.75);
    if (el === "F") { ctx.fillStyle = rgb(lt); ctx.beginPath(); ctx.moveTo(x, y - 14); ctx.quadraticCurveTo(x + 9, y - 2, x, y + 8); ctx.quadraticCurveTo(x - 9, y - 2, x, y - 14); ctx.fill(); }
    else if (el === "W") { blob(ctx, x, y, 8, 9, col, lt, false); }
    else if (el === "E") { ctx.fillStyle = rgb(lt); ctx.beginPath(); for (let k = 0; k < 6; k++) { const aa = k / 6 * 6.283 + t; ctx.lineTo(x + Math.cos(aa) * 9, y + Math.sin(aa) * 9); } ctx.fill(); }
    else { ctx.strokeStyle = rgb(lt); ctx.lineWidth = 2.5; ctx.beginPath(); for (let k = 0; k < 14; k++) { const aa = k * 0.6 + t * 6; ctx.lineTo(x + Math.cos(aa) * k * 0.7, y + Math.sin(aa) * k * 0.7); } ctx.stroke(); }
    if (Math.random() < 0.5) GS.parts.push({ x, y, vx: rnd(-20, 20), vy: rnd(-40, -10), life: 0.5, max: 0.5, col, size: 2.5, g: true });
  });
}
function drawBloom(b) {
  const k = b.t / 0.9, R = 40 + 230 * k;
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  ["F", "W", "E", "A"].forEach((el, i) => {
    const col = hexRGB(DATA.elements[el].color);
    for (let j = 0; j < 3; j++) {
      const aa = i * Math.PI / 2 + j * 0.25 - 0.25 + k * 1.5;
      ctx.fillStyle = rgb(col, 0.35 * (1 - k));
      ctx.beginPath(); ctx.moveTo(b.x, b.y);
      ctx.quadraticCurveTo(b.x + Math.cos(aa - 0.4) * R * 0.7, b.y + Math.sin(aa - 0.4) * R * 0.5, b.x + Math.cos(aa) * R, b.y + Math.sin(aa) * R * 0.75);
      ctx.quadraticCurveTo(b.x + Math.cos(aa + 0.4) * R * 0.7, b.y + Math.sin(aa + 0.4) * R * 0.5, b.x, b.y); ctx.fill();
    }
  });
  glow(ctx, b.x, b.y, R * 0.8, [255, 240, 210], 0.6 * (1 - k));
  ctx.strokeStyle = `rgba(255,245,220,${0.8 * (1 - k)})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(b.x, b.y + 20, R, R * 0.45, 0, 0, 6.283); ctx.stroke();
  ctx.restore();
}

// ================================================================ интерфейс боя
function drawHUD() {
  const p = GS.player, phone = CFG.device === "phone";
  // здоровье и опыт
  panel(14, 12, 330, 64);
  txt(String(p.lvl), 46, 44, 26, "#ffe7b0", "center", TITLE);
  ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.beginPath(); ctx.roundRect(80, 24, 250, 18, 9); ctx.fill();
  const hg = ctx.createLinearGradient(80, 0, 330, 0); hg.addColorStop(0, "#e2524a"); hg.addColorStop(1, "#ff8a6a");
  ctx.fillStyle = hg; ctx.beginPath(); ctx.roundRect(80, 24, 250 * Math.max(0, p.hp / p.maxhp), 18, 9); ctx.fill();
  txt(`${Math.ceil(p.hp)} / ${p.maxhp}`, 205, 33, 13, "#fff", "center");
  ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.fillRect(80, 50, 250, 8);
  ctx.fillStyle = "#8fd8ff"; ctx.fillRect(80, 50, 250 * p.xp / xpNext(p.lvl), 8);
  // волна и биом
  panel(V.W / 2 - 130, 10, 260, 48);
  const cleared = GS.floor.rooms.filter((m) => m.state === "clear" && (m.kind === "fight" || m.kind === "boss")).length;
  txt(L("Этаж ", "Floor ") + (GS.floor.fi + 1) + "  ·  " + cleared + "/5", V.W / 2, 28, 22, "#ffe7b0", "center", TITLE);
  txt(nm(DATA.biomes[GS.biome]), V.W / 2, 48, 12, "#d8cbb4", "center");
  if (GS.boss) {
    const e = GS.boss; panel(V.W / 2 - 260, 64, 520, 34);
    txt(e.name, V.W / 2, 75, 14, "#ffd9e0", "center");
    ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(V.W / 2 - 240, 84, 480, 8);
    ctx.fillStyle = "#ff5a7a"; ctx.fillRect(V.W / 2 - 240, 84, 480 * Math.max(0, e.hp / e.maxhp), 8);
  }
  // навыки
  const n = GS.abilities.length, sw = 58, x0 = phone ? 24 : V.W / 2 - (n * (sw + 8)) / 2 - 40;
  const y0 = V.H - (phone ? 150 : 84);
  GS.abilities.forEach((a, i) => {
    const x = x0 + i * (sw + 8);
    panel(x, y0, sw, sw, 0.9);
    const es = recElems(a.rec);
    glow(ctx, x + sw / 2, y0 + sw / 2, 30, a.color, 0.5);
    elemIcon(ctx, es[es.length - 1], x + sw / 2, y0 + sw / 2 - 4, 15);
    txt(String(a.lvl), x + sw - 8, y0 + sw - 9, 13, "#ffe7b0", "center");
    const cdf = a.p.cd ? Math.max(0, a.cd / a.p.cd) : 0;
    if (cdf > 0.02) { ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.fillRect(x, y0 + sw * (1 - cdf), sw, sw * cdf); }
    if (!phone) { const nmx = nm(a.rec); txt(nmx.length > 10 ? nmx.slice(0, 9) + "…" : nmx, x + sw / 2, y0 - 9, 11, "#efe2c8", "center"); }
  });
  // рывок: имя зависит от главной стихии
  const k = dashKind(), dn = DASHES[k] || DASHES[""];
  const dx = phone ? V.W - 170 : x0 + n * (sw + 8) + 20, dy = phone ? V.H - 170 : y0;
  const dr = phone ? 70 : 29, dcx = dx + (phone ? 70 : 29), dcy = dy + (phone ? 70 : 29);
  const dcol = k ? hexRGB(DATA.elements[k].color) : [220, 220, 255];
  glow(ctx, dcx, dcy, dr * 1.6, dcol, 0.45);
  ctx.fillStyle = "rgba(28,20,36,0.85)"; ctx.beginPath(); ctx.arc(dcx, dcy, dr, 0, 6.283); ctx.fill();
  ctx.strokeStyle = rgb(dcol); ctx.lineWidth = 3; ctx.stroke();
  if (k) elemIcon(ctx, k, dcx, dcy - (phone ? 10 : 2), phone ? 22 : 13); else txt("➶", dcx, dcy, phone ? 40 : 26, "#fff", "center");
  for (let i = 0; i < p.dashMax; i++) { ctx.fillStyle = i < p.charges ? "#ffe7b0" : "rgba(255,255,255,0.2)"; ctx.beginPath(); ctx.arc(dcx - (p.dashMax - 1) * 7 + i * 14, dcy + dr - 10, 4, 0, 6.283); ctx.fill(); }
  txt(L(dn[0], dn[1]) + (phone ? "" : "  [Space]"), dcx, dcy + dr + 12, phone ? 16 : 11, "#ffe7b0", "center");
  if (phone) { BUTTONS.push([dx, dy, 140, 140, () => { IN.dash = true; }, "touch"]); }
  drawMinimap();
  drawItemsHUD();
  const tg = nextTarget();
  if (tg && !GS.cur) {
    const Z = zoom(), sx2 = (tg.x - GS.cam.x) * Z, sy2 = (tg.y - GS.cam.y) * Z;
    if (sx2 < 40 || sx2 > V.W - 40 || sy2 < 40 || sy2 > V.H - 40) {
      const a = Math.atan2(sy2 - V.H / 2, sx2 - V.W / 2), ax = V.W / 2 + Math.cos(a) * Math.min(V.W, V.H) * 0.4, ay = V.H / 2 + Math.sin(a) * Math.min(V.W, V.H) * 0.4;
      ctx.save(); ctx.translate(ax, ay); ctx.rotate(a); ctx.fillStyle = "rgba(255,220,140,0.85)";
      ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(-10, -11); ctx.lineTo(-4, 0); ctx.lineTo(-10, 11); ctx.fill(); ctx.restore();
    }
  }
  if (GS.combo >= 5) {
    const k = Math.min(1, GS.comboT / 2.5);
    ctx.globalAlpha = 0.4 + 0.6 * k;
    txt("x" + GS.combo, V.W - 150, V.H * 0.42, 40 + Math.min(20, GS.combo / 3), GS.combo > 50 ? "#ff7a9a" : "#ffd98a", "center", TITLE);
    txt(L("комбо  +", "combo  +") + Math.round(Math.min(30, GS.combo * 0.6)) + "%", V.W - 150, V.H * 0.42 + 34, 14, "#f2e6d0", "center");
    ctx.globalAlpha = 1;
  }
  // пауза
  button(V.W - 70, 12, 56, 46, "II", () => { GS.mode = "pause"; }, { touch: phone, size: 20 });
  // джойстик
  if (phone && IN.joy) {
    ctx.fillStyle = "rgba(255,255,255,0.12)"; ctx.beginPath(); ctx.arc(IN.joy.ox, IN.joy.oy, 64, 0, 6.283); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.4)"; ctx.lineWidth = 2; ctx.stroke();
    const jx = clamp(IN.joy.x - IN.joy.ox, -60, 60), jy = clamp(IN.joy.y - IN.joy.oy, -60, 60);
    ctx.fillStyle = "rgba(255,240,210,0.6)"; ctx.beginPath(); ctx.arc(IN.joy.ox + jx, IN.joy.oy + jy, 28, 0, 6.283); ctx.fill();
  } else if (phone && GS.time < 8) txt(L("← палец здесь — ходьба", "← thumb here to move"), 40, V.H / 2, 18, "rgba(255,240,210,0.8)", "left");
  if (GS.banner) {
    const b = GS.banner, a = Math.min(1, b.t * 1.5);
    ctx.globalAlpha = a;
    txt(b.title, V.W / 2, V.H * 0.3, 54, "#ffe7b0", "center", TITLE);
    if (b.sub) txt(b.sub, V.W / 2, V.H * 0.3 + 44, 22, "#f2e6d0", "center");
    ctx.globalAlpha = 1;
  }
}

// ================================================================ карточки
function drawCards() {
  ctx.fillStyle = "rgba(14,10,20,0.72)"; ctx.fillRect(0, 0, V.W, V.H);
  const title = GS.cardKind === "start" ? L("Выбери первую стихию", "Choose your first element") : GS.cardKind === "unlock" ? L("Трофей стража", "Guardian's trophy") : L("Новый уровень · ", "Level up · ") + GS.player.lvl;
  txt(title, V.W / 2, 70, 40, "#ffd98a", "center", TITLE);
  const cs = GS.cards, n = cs.length, portrait = V.H > V.W;
  const cw = portrait ? Math.min(V.W - 60, 520) : Math.min(260, (V.W - 80) / n - 20), ch = portrait ? Math.min(150, (V.H - 200) / n - 16) : 360;
  cs.forEach((c, i) => {
    const pop = Math.min(1, GS.cardT * 4 - i * 0.3);
    if (pop <= 0) return;
    let x, y;
    if (portrait) { x = V.W / 2 - cw / 2; y = 130 + i * (ch + 16); } else { x = V.W / 2 - (n * (cw + 20) - 20) / 2 + i * (cw + 20); y = 130 + (1 - pop) * 40; }
    ctx.globalAlpha = pop;
    const rc = [[176, 182, 198], [111, 211, 224], [190, 120, 255], [232, 176, 74]][c.rar];
    const col = c.e ? hexRGB(DATA.elements[c.e].color) : c.type === "basic" ? [255, 180, 90] : [130, 220, 150];
    const g = ctx.createLinearGradient(0, y, 0, y + ch);
    g.addColorStop(0, rgb(mixc(col, [30, 20, 40], 0.55))); g.addColorStop(1, "rgb(26,18,34)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(x, y, cw, ch, 18); ctx.fill();
    ctx.strokeStyle = rgb(rc); ctx.lineWidth = 3; ctx.stroke();
    const hot = IN.mx >= x && IN.mx <= x + cw && IN.my >= y && IN.my <= y + ch && CFG.device === "pc";
    if (hot) { ctx.strokeStyle = "#ffe7b0"; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(x - 4, y - 4, cw + 8, ch + 8, 20); ctx.stroke(); }
    if (portrait) {
      if (c.e) elemIcon(ctx, c.e, x + 50, y + ch / 2, 28); else txt(c.type === "basic" ? "⚔" : "✦", x + 50, y + ch / 2, 40, rgb(col), "center");
      txt(c.tag, x + 100, y + 24, 13, rgb(mixc(col, [255, 255, 255], 0.4)), "left");
      txt(c.title, x + 100, y + 50, 22, "#fff4e0", "left", TITLE);
      wrapText(c.desc, x + 100, y + 80, cw - 120, 14, "#e6dac4");
    } else {
      txt(c.tag, x + cw / 2, y + 26, 14, rgb(mixc(col, [255, 255, 255], 0.45)), "center");
      glow(ctx, x + cw / 2, y + 110, 80, col, 0.5);
      if (c.e) elemIcon(ctx, c.e, x + cw / 2, y + 110, 40); else txt(c.type === "basic" ? "⚔" : "✦", x + cw / 2, y + 110, 64, rgb(col), "center");
      if (c.rec) { const es = recElems(c.rec); es.split("").forEach((e, k) => elemIcon(ctx, e, x + cw / 2 - (es.length - 1) * 14 + k * 28, y + 170, 11)); }
      txt(c.title, x + cw / 2, y + 205, 22, "#fff4e0", "center", TITLE);
      wrapText(c.desc, x + cw / 2, y + 240, cw - 30, 14, "#e6dac4", 1.35, "center");
      txt(["", L("Редкая", "Rare"), L("Эпическая", "Epic"), L("Легендарная", "Legendary")][c.rar] || L("Обычная", "Common"), x + cw / 2, y + ch - 22, 13, rgb(rc), "center");
    }
    ctx.globalAlpha = 1;
    if (pop >= 1) BUTTONS.push([x, y, cw, ch, () => chooseCard(i), "click"]);
  });
  if (CFG.device === "pc") txt(L("клик или 1–3", "click or 1–3"), V.W / 2, V.H - 30, 15, "#bfb2a0", "center");
}

// ================================================================ меню
function drawMenuBg() {
  if (!MENU.bg || MENU.bg.width < V.W + 260 || MENU.bg.height < V.H + 140) { MENU.bg = makeGround("forest", Math.max(1800, V.W + 300), Math.max(1100, V.H + 200)); }
  const t = GS.t;
  ctx.drawImage(MENU.bg, 200 + Math.sin(t * 0.05) * 120, 100 + Math.cos(t * 0.04) * 60, V.W, V.H, 0, 0, V.W, V.H);
  drawAtmosphere(ctx, t * 20, 0, t, "forest");
  drawMotes(ctx, t * 20, 0, t, 1 / 60, "forest");
  ctx.fillStyle = "rgba(20,14,26,0.35)"; ctx.fillRect(0, 0, V.W, V.H);
}
function drawTitle() {
  drawMenuBg();
  const t = GS.t, cx = V.W / 2;
  ["F", "W", "E", "A", "L", "S"].forEach((e, i) => { const a = t * 0.4 + i * 1.0472; elemIcon(ctx, e, cx + Math.cos(a) * 170, 112 + Math.sin(a) * 78, 15); });
  drawEmblem(ctx, cx, 112, 64, t);
  txt("ELEMENTAL RUSH", cx, 214, 64, "#ffd98a", "center", TITLE);
  txt(L("Стихии · эволюция стихий", "combine the elements"), cx, 254, 20, "#fff0d6", "center", TITLE);
  // выбор устройства
  txt(L("Где играешь?", "Where do you play?"), cx, 290, 20, "#f2e6d0", "center");
  button(cx - 250, 310, 240, 64, L("💻  Компьютер", "💻  Computer"), () => { CFG.device = "pc"; saveCfg(); }, { sel: CFG.device === "pc", size: 24 });
  button(cx + 10, 310, 240, 64, L("📱  Телефон", "📱  Phone"), () => { CFG.device = "phone"; saveCfg(); tryFullscreen(); }, { sel: CFG.device === "phone", size: 24 });
  txt(CFG.device === "pc" ? L("WASD — ходьба · мышь — прицел · Пробел — рывок", "WASD — move · mouse — aim · Space — dash")
    : L("палец слева — ходьба · кнопка справа — рывок · атаки сами", "left thumb — move · right button — dash · attacks are automatic"), cx, 392, 15, "#d8cbb4", "center");
  button(cx - 160, 420, 320, 80, L("ИГРАТЬ", "PLAY"), () => { MENU.screen = "heroes"; }, { col: [150, 96, 40], size: 34, font: TITLE, touch: false });
  button(cx - 160, 525, 150, 50, CFG.lang === "ru" ? "English" : "Русский", () => { CFG.lang = CFG.lang === "ru" ? "en" : "ru"; saveCfg(); }, { size: 18 });
  button(cx + 10, 525, 150, 50, L("Звук: ", "Sound: ") + (CFG.sound > 0 ? L("вкл", "on") : L("выкл", "off")), () => { AUDIO.setVol(CFG.sound > 0 ? 0 : 0.7); MUSIC.setVol(CFG.sound > 0 ? 0.5 : 0); }, { size: 18 });
  const best = SAVE.get("bestFloor", 0);
  if (best) txt(L("Лучший результат: этаж ", "Best: floor ") + best, cx, 605, 16, "#ffe7b0", "center");
  if (IS_IOS && !STANDALONE) txt(L("Во весь экран: Safari → «Поделиться» → «На экран Домой»", "Fullscreen: Safari → Share → Add to Home Screen"), cx, 640, 15, "#ffe7b0", "center");
  txt("v0.6 · web", V.W - 14, V.H - 16, 12, "#bfb2a0", "right");
}
function drawHeroes() {
  drawMenuBg();
  const cx = V.W / 2, ids = Object.keys(HEROES), portrait = V.H > V.W;
  txt(L("Выбери героя", "Choose your hero"), cx, 60, 42, "#ffd98a", "center", TITLE);
  const cw = portrait ? (V.W - 80) / 2 - 10 : Math.min(230, (V.W - 60) / ids.length - 18), ch = portrait ? 300 : 360;
  ids.forEach((id, i) => {
    const H = HEROES[id];
    const x = portrait ? 40 + (i % 2) * (cw + 20) : cx - (ids.length * (cw + 18) - 18) / 2 + i * (cw + 18);
    const y = portrait ? 110 + Math.floor(i / 2) * (ch + 20) : 110;
    const sel = MENU.sel === id;
    const g = ctx.createLinearGradient(0, y, 0, y + ch);
    g.addColorStop(0, rgb(mixc(H.cape, [20, 14, 24], 0.3))); g.addColorStop(1, "rgb(16,12,22)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(x, y, cw, ch, 18); ctx.fill();
    ctx.strokeStyle = sel ? "#ffd56e" : "rgba(255,220,160,0.4)"; ctx.lineWidth = sel ? 4 : 1.5; ctx.stroke();
    glow(ctx, x + cw / 2, y + ch * 0.32, 90, H.eye, sel ? 0.45 : 0.18);
    shadowAt(ctx, x + cw / 2, y + ch * 0.52, 30);
    drawHero(ctx, id, x + cw / 2, y + ch * 0.52, sel ? GS.t : 0, 1, sel ? (Math.sin(GS.t * 2) > 0.7 ? 0.5 : 0) : 0, 2.0);
    let fs = 24; ctx.font = `bold ${fs}px ${TITLE}`; while (fs > 13 && ctx.measureText(nm(H)).width > cw - 16) { fs--; ctx.font = `bold ${fs}px ${TITLE}`; }
    txt(nm(H), x + cw / 2, y + ch * 0.62, fs, "#fff4e0", "center", TITLE);
    wrapText(L(H.d_ru, H.d_en), x + cw / 2, y + ch * 0.72, cw - 30, 14, "#e6dac4", 1.35, "center");
    BUTTONS.push([x, y, cw, ch, () => { if (MENU.sel === id && CFG.device === "phone") startRun(); MENU.sel = id; }, "click"]);
  });
  button(cx - 150, V.H - 100, 300, 70, L("В БОЙ!", "FIGHT!"), startRun, { col: [150, 96, 40], size: 30, font: TITLE });
  button(30, V.H - 90, 140, 52, L("Назад", "Back"), () => { MENU.screen = "title"; }, { size: 18 });
}
function startRun() { AUDIO.unlock(); if (CFG.device === "phone") tryFullscreen(); newGame(MENU.sel); }
function tryFullscreen() {
  const el = document.documentElement;
  if (document.fullscreenElement || document.webkitFullscreenElement) return;
  const f = el.requestFullscreen || el.webkitRequestFullscreen;
  if (f) { try { const r = f.call(el); if (r && r.catch) r.catch(() => {}); } catch (e) {} }
  if (screen.orientation && screen.orientation.lock) screen.orientation.lock("landscape").catch(() => {});
}
const IS_IOS = /iPhone|iPod/.test(navigator.userAgent);
const STANDALONE = window.navigator.standalone || (window.matchMedia && matchMedia("(display-mode: standalone), (display-mode: fullscreen)").matches);
function drawPause() {
  ctx.fillStyle = "rgba(14,10,20,0.7)"; ctx.fillRect(0, 0, V.W, V.H);
  txt(L("Пауза", "Paused"), V.W / 2, 160, 52, "#ffd98a", "center", TITLE);
  button(V.W / 2 - 150, 230, 300, 62, L("Продолжить", "Resume"), () => { GS.mode = "play"; }, { size: 22 });
  button(V.W / 2 - 150, 310, 300, 62, CFG.lang === "ru" ? "English" : "Русский", () => { CFG.lang = CFG.lang === "ru" ? "en" : "ru"; saveCfg(); }, { size: 20 });
  button(V.W / 2 - 150, 390, 300, 62, L("В главное меню", "Main menu"), () => { saveBest(); GS.mode = "menu"; MENU.screen = "title"; }, { size: 20 });
  // что собрано
  let y = 480;
  GS.abilities.forEach((a) => { txt(`${nm(a.rec)}  ·  ${L("ур.", "lv.")} ${a.lvl}`, V.W / 2, y, 16, rgb(mixc(a.color, [255, 255, 255], 0.4)), "center"); y += 24; });
}
function drawEnd(win) {
  ctx.fillStyle = "rgba(14,10,20,0.75)"; ctx.fillRect(0, 0, V.W, V.H);
  txt(win ? L("ПОБЕДА!", "VICTORY!") : L("Ты пал…", "You fell…"), V.W / 2, 170, 64, win ? "#ffd98a" : "#ff8a8a", "center", TITLE);
  txt(L(`Волна ${GS.wave} · уровень ${GS.player.lvl} · врагов ${GS.kills}`, `Wave ${GS.wave} · level ${GS.player.lvl} · ${GS.kills} enemies`), V.W / 2, 240, 22, "#f2e6d0", "center");
  if (GS.deadT > 0.8 || win) {
    button(V.W / 2 - 150, 300, 300, 66, L("Ещё раз", "Try again"), () => newGame(GS.player.cls), { size: 24, col: [150, 96, 40] });
    button(V.W / 2 - 150, 385, 300, 60, L("В меню", "Menu"), () => { GS.mode = "menu"; MENU.screen = "title"; }, { size: 20 });
  }
}

// ================================================================ клавиши
function onKey(code) {
  if (GS.mode === "cards" && /^Digit[1-4]$/.test(code) && GS.cardT > 0.5) chooseCard(+code.slice(5) - 1);
  if (code === "Escape") { if (GS.mode === "play") GS.mode = "pause"; else if (GS.mode === "pause") GS.mode = "play"; }
  if (GS.mode === "story" && (code === "Space" || code === "Enter")) { GS.storyI++; GS.storyT = 0; IN.dash = false; if (GS.storyI >= STORY.length) { GS.mode = "play"; openCards(); } }
  if (GS.mode === "menu" && code === "Enter") { if (MENU.screen === "title") MENU.screen = "heroes"; else startRun(); }
}

// ================================================================ главный цикл
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = "#120e18"; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.setTransform(SCALE * DPR, 0, 0, SCALE * DPR, OFFX * DPR, OFFY * DPR);
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, V.W, V.H); ctx.clip();
  BUTTONS = [];
  if (GS.mode === "menu") { GS.t += dt; MENU.screen === "heroes" ? drawHeroes() : drawTitle(); }
  else {
    update(dt);
    if (GS.mode === "story") drawStory();
    else { drawWorld(dt); drawHUD(); }
    if (GS.mode === "cards") drawCards();
    if (GS.mode === "pause") drawPause();
    if (GS.mode === "dead") drawEnd(false);
    if (GS.mode === "win") drawEnd(true);
  }
  ctx.restore();
  // клики
  while (IN.clicks.length) {
    const [x, y] = IN.clicks.shift();
    for (let i = BUTTONS.length - 1; i >= 0; i--) { const b = BUTTONS[i]; if (x >= b[0] && x <= b[0] + b[2] && y >= b[1] && y <= b[1] + b[3]) { b[4](); break; } }
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
