// Графика в стиле «как у Миядзаки»: мягкие заливки, тонкий тёплый контур, акварельная земля, свечение.
"use strict";
const OUTLINE = "rgba(40,24,22,0.85)";
const _glowCache = new Map();
function glowSprite(r, c) {
  r = Math.max(4, Math.round(r / 4) * 4);
  const key = r + "|" + c.join(",");
  let g = _glowCache.get(key);
  if (!g) {
    g = document.createElement("canvas"); g.width = g.height = r * 2;
    const x = g.getContext("2d"), gr = x.createRadialGradient(r, r, 0, r, r, r);
    gr.addColorStop(0, rgb(c, 0.9)); gr.addColorStop(0.35, rgb(c, 0.45)); gr.addColorStop(1, rgb(c, 0));
    x.fillStyle = gr; x.fillRect(0, 0, r * 2, r * 2);
    if (_glowCache.size > 600) _glowCache.clear();
    _glowCache.set(key, g);
  }
  return g;
}
function glow(c2, x, y, r, col, a = 1) {
  const g = glowSprite(r, col);
  const op = c2.globalCompositeOperation, ga = c2.globalAlpha;
  c2.globalCompositeOperation = "lighter"; c2.globalAlpha = a;
  c2.drawImage(g, x - g.width / 2, y - g.height / 2);
  c2.globalCompositeOperation = op; c2.globalAlpha = ga;
}
function blob(c2, x, y, rx, ry, col, light, outline = true) {
  const g = c2.createRadialGradient(x - rx * 0.35, y - ry * 0.4, 1, x, y, Math.max(rx, ry) * 1.1);
  g.addColorStop(0, rgb(light)); g.addColorStop(1, rgb(col));
  c2.fillStyle = g; c2.beginPath(); c2.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c2.fill();
  if (outline) { c2.strokeStyle = OUTLINE; c2.lineWidth = 2; c2.stroke(); }
}
function shadowAt(c2, x, y, w) {
  c2.fillStyle = "rgba(30,40,40,0.28)"; c2.beginPath(); c2.ellipse(x, y, w, w * 0.35, 0, 0, Math.PI * 2); c2.fill();
}

// ================================================================ герои (стильные, чуть мрачнее, без кукольности)
const HEROES = {
  warrior: { ru: "Страж пепла", en: "Ash Warden", main: [74, 78, 92], trim: [176, 150, 96], cape: [128, 28, 34], eye: [255, 150, 60], weapon: "sword",
    d_ru: "Тяжёлый двуручник. Медленно, но каждый удар сносит толпу и лечит.", d_en: "A heavy greatsword. Slow, but every swing clears the crowd and heals.", hp: 160, speed: 228 },
  archer: { ru: "Охотница сумрака", en: "Dusk Huntress", main: [38, 58, 52], trim: [150, 120, 70], cape: [26, 40, 36], eye: [90, 255, 200], weapon: "bow",
    d_ru: "Тихая смерть издалека: пробивающие стрелы и высокий крит.", d_en: "Silent death from afar: piercing arrows and high crit.", hp: 120, speed: 248 },
  mage: { ru: "Чернокнижник стихий", en: "Element Warlock", main: [44, 36, 78], trim: [214, 170, 80], cape: [30, 24, 56], eye: [160, 200, 255], weapon: "staff",
    d_ru: "Повелевает стихиями: навыки сильнее, огненные шары взрываются.", d_en: "Commands the elements: stronger skills, exploding fireballs.", hp: 112, speed: 234 },
  duelist: { ru: "Клинок луны", en: "Moon Blade", main: [30, 26, 40], trim: [200, 60, 80], cape: [90, 20, 44], eye: [255, 90, 140], weapon: "twin",
    d_ru: "Парные катаны: молниеносные серии и рывки сквозь врагов.", d_en: "Twin katanas: lightning-fast combos and dashes through enemies.", hp: 128, speed: 256 },
};
const SKIN = [236, 206, 184];

function drawHero(c2, cls, x, y, t, face, atk, s = 1, glowCol = null) {
  const H = HEROES[cls];
  const gc = glowCol || H.eye;
  c2.save(); c2.translate(x, y); c2.scale(face * s, s);
  const bob = Math.sin(t * 10) * 1.4, wind = Math.sin(t * 6) * 4;
  c2.lineJoin = "round";
  c2.strokeStyle = "rgba(10,6,12,0.95)"; c2.lineWidth = 2.2;
  // рваный плащ за спиной
  c2.fillStyle = rgb(H.cape);
  c2.beginPath(); c2.moveTo(-9, -46 + bob); c2.quadraticCurveTo(-24 - wind, -22, -22 - wind, 2);
  for (let i = 0; i < 4; i++) c2.lineTo(-18 - wind + i * 7, (i % 2 ? -4 : 4));
  c2.lineTo(8, -2); c2.quadraticCurveTo(6, -24, 8, -46 + bob); c2.closePath(); c2.fill(); c2.stroke();
  c2.fillStyle = rgb(mixc(H.cape, [255, 255, 255], 0.12)); c2.beginPath(); c2.moveTo(-6, -44 + bob); c2.quadraticCurveTo(-14 - wind, -24, -12 - wind, -6); c2.lineTo(-8, -8); c2.quadraticCurveTo(-8, -26, -2, -44 + bob); c2.fill();
  // ноги (шаг)
  const st = Math.sin(t * 13) * 4;
  c2.fillStyle = rgb(shade(H.main, 0.7));
  c2.beginPath(); c2.moveTo(-7, -18); c2.lineTo(-9 + st, 0); c2.lineTo(-3 + st, 0); c2.lineTo(-1, -18); c2.closePath(); c2.fill(); c2.stroke();
  c2.beginPath(); c2.moveTo(1, -18); c2.lineTo(3 - st, 0); c2.lineTo(9 - st, 0); c2.lineTo(7, -18); c2.closePath(); c2.fill(); c2.stroke();
  // торс: вытянутый, с поясом и окантовкой
  const body = c2.createLinearGradient(-10, -48, 10, -14);
  body.addColorStop(0, rgb(mixc(H.main, [255, 255, 255], 0.22))); body.addColorStop(1, rgb(shade(H.main, 0.75)));
  c2.fillStyle = body;
  c2.beginPath(); c2.moveTo(-11, -46 + bob); c2.lineTo(11, -46 + bob); c2.lineTo(9, -16); c2.lineTo(-9, -16); c2.closePath(); c2.fill(); c2.stroke();
  c2.fillStyle = rgb(H.trim); c2.fillRect(-9, -22, 18, 3);
  c2.strokeStyle = rgb(H.trim, 0.8); c2.lineWidth = 1.2; c2.beginPath(); c2.moveTo(0, -45 + bob); c2.lineTo(0, -23); c2.stroke();
  c2.strokeStyle = "rgba(10,6,12,0.95)"; c2.lineWidth = 2.2;
  if (cls === "warrior") {             // массивные наплечники с шипом
    for (const k of [-1, 1]) {
      c2.fillStyle = rgb(shade(H.main, 1.15)); c2.beginPath(); c2.ellipse(k * 12, -44 + bob, 8, 6, k * 0.3, 0, 6.283); c2.fill(); c2.stroke();
      c2.fillStyle = rgb(H.trim); c2.beginPath(); c2.moveTo(k * 14, -49 + bob); c2.lineTo(k * 19, -56 + bob); c2.lineTo(k * 11, -50 + bob); c2.fill();
    }
  }
  if (cls === "duelist") { c2.fillStyle = rgb(H.trim); c2.beginPath(); c2.moveTo(-9, -24); c2.lineTo(9, -27); c2.lineTo(9, -23); c2.lineTo(-9, -20); c2.fill(); }
  // голова: меньше, взрослее; лицо в тени капюшона / шлема
  const hy = -56 + bob;
  if (cls === "warrior") {             // рогатый шлем с забралом
    c2.fillStyle = rgb(shade(H.main, 1.1)); c2.beginPath(); c2.moveTo(-9, hy + 6); c2.quadraticCurveTo(-11, hy - 10, 0, hy - 12); c2.quadraticCurveTo(11, hy - 10, 9, hy + 6); c2.closePath(); c2.fill(); c2.stroke();
    c2.fillStyle = rgb(H.trim);
    for (const k of [-1, 1]) { c2.beginPath(); c2.moveTo(k * 8, hy - 6); c2.quadraticCurveTo(k * 18, hy - 12, k * 16, hy - 22); c2.quadraticCurveTo(k * 13, hy - 12, k * 6, hy - 9); c2.fill(); c2.stroke(); }
    c2.fillStyle = "#0b0810"; c2.fillRect(-1, hy - 3, 10, 3);
  } else if (cls === "archer") {       // острый капюшон и маска
    c2.fillStyle = rgb(SKIN); c2.beginPath(); c2.ellipse(1, hy, 7.5, 8.5, 0, 0, 6.283); c2.fill();
    c2.fillStyle = rgb(shade(H.main, 1.15)); c2.beginPath(); c2.moveTo(-10, hy + 9); c2.quadraticCurveTo(-12, hy - 12, 2, hy - 18 - wind * 0.2); c2.quadraticCurveTo(12, hy - 8, 10, hy + 2);
    c2.quadraticCurveTo(4, hy - 6, -4, hy - 3); c2.closePath(); c2.fill(); c2.stroke();
    c2.fillStyle = rgb(shade(H.main, 0.6)); c2.beginPath(); c2.moveTo(-2, hy + 2); c2.lineTo(9, hy + 1); c2.lineTo(8, hy + 7); c2.lineTo(0, hy + 8); c2.fill();
  } else if (cls === "mage") {         // глубокий капюшон, лицо в тени
    c2.fillStyle = rgb(shade(H.main, 1.2)); c2.beginPath(); c2.moveTo(-11, hy + 9); c2.quadraticCurveTo(-13, hy - 13, 1, hy - 16); c2.quadraticCurveTo(14, hy - 12, 11, hy + 9); c2.closePath(); c2.fill(); c2.stroke();
    c2.fillStyle = "#0d0a16"; c2.beginPath(); c2.ellipse(2, hy + 1, 7, 7.5, 0, 0, 6.283); c2.fill();
    c2.strokeStyle = rgb(H.trim); c2.lineWidth = 1.4; c2.beginPath(); c2.moveTo(-10, hy + 8); c2.quadraticCurveTo(-12, hy - 11, 1, hy - 14); c2.stroke();
    c2.strokeStyle = "rgba(10,6,12,0.95)"; c2.lineWidth = 2.2;
  } else {                             // длинные белые волосы и хвост
    c2.fillStyle = rgb(SKIN); c2.beginPath(); c2.ellipse(1, hy, 7.5, 8.5, 0, 0, 6.283); c2.fill(); c2.stroke();
    c2.fillStyle = "#e8e4f0";
    c2.beginPath(); c2.moveTo(-8, hy + 4); c2.quadraticCurveTo(-10, hy - 12, 2, hy - 11); c2.quadraticCurveTo(10, hy - 10, 9, hy - 2); c2.lineTo(6, hy - 5); c2.lineTo(3, hy - 1); c2.lineTo(-1, hy - 5); c2.closePath(); c2.fill(); c2.stroke();
    c2.strokeStyle = "#e8e4f0"; c2.lineWidth = 4.5; c2.lineCap = "round";
    c2.beginPath(); c2.moveTo(-7, hy - 6); c2.quadraticCurveTo(-22 - wind, hy - 2, -20 - wind * 1.5, hy + 18); c2.stroke();
    c2.lineCap = "butt"; c2.strokeStyle = "rgba(10,6,12,0.95)"; c2.lineWidth = 2.2;
    c2.fillStyle = rgb(H.trim); c2.beginPath(); c2.arc(-7, hy - 6, 2.4, 0, 6.283); c2.fill();
  }
  // светящиеся глаза — главный акцент
  const ey = cls === "warrior" ? hy - 1.5 : hy;
  glow(c2, 5, ey, 9, gc, 0.9);
  c2.fillStyle = rgb(mixc(gc, [255, 255, 255], 0.5));
  c2.beginPath(); c2.moveTo(2, ey - 1); c2.lineTo(5, ey - 1.8); c2.lineTo(5, ey + 0.6); c2.closePath(); c2.fill();
  c2.beginPath(); c2.moveTo(6.5, ey - 1.8); c2.lineTo(9.5, ey - 1); c2.lineTo(6.5, ey + 0.6); c2.closePath(); c2.fill();
  // оружие, светится цветом стихии
  const a = atk > 0 ? -1.5 + (1 - atk) * 2.8 : 0.35;
  c2.save(); c2.translate(9, -34 + bob); c2.rotate(a);
  if (H.weapon === "sword") {
    glow(c2, 0, -30, 26, gc, 0.45);
    c2.fillStyle = "#c9ced8"; c2.beginPath(); c2.moveTo(-4, 0); c2.lineTo(-5, -44); c2.lineTo(0, -54); c2.lineTo(5, -44); c2.lineTo(4, 0); c2.closePath(); c2.fill(); c2.stroke();
    c2.strokeStyle = rgb(gc, 0.9); c2.lineWidth = 1.5; c2.beginPath(); c2.moveTo(0, -6); c2.lineTo(0, -46); c2.stroke();
    c2.strokeStyle = "rgba(10,6,12,0.95)"; c2.lineWidth = 2.2;
    c2.fillStyle = rgb(H.trim); c2.beginPath(); c2.moveTo(-10, -1); c2.lineTo(10, -1); c2.lineTo(7, 3); c2.lineTo(-7, 3); c2.closePath(); c2.fill(); c2.stroke();
    c2.fillStyle = "#3a2420"; c2.fillRect(-2, 3, 4, 10);
  } else if (H.weapon === "bow") {
    c2.strokeStyle = "#2c1f18"; c2.lineWidth = 4; c2.beginPath(); c2.arc(5, -8, 19, -1.35, 1.35); c2.stroke();
    c2.strokeStyle = rgb(H.trim); c2.lineWidth = 1.5; c2.beginPath(); c2.arc(5, -8, 19, -1.35, 1.35); c2.stroke();
    const sx = 5 + 19 * Math.cos(1.35), sy = 19 * Math.sin(1.35);
    glow(c2, sx, -8, 14, gc, 0.5);
    c2.strokeStyle = rgb(mixc(gc, [255, 255, 255], 0.4)); c2.lineWidth = 1.2; c2.beginPath(); c2.moveTo(sx, -8 - sy); c2.lineTo(sx, -8 + sy); c2.stroke();
  } else if (H.weapon === "staff") {
    c2.strokeStyle = "#2a1c18"; c2.lineWidth = 4; c2.beginPath(); c2.moveTo(0, 14); c2.lineTo(0, -40); c2.stroke();
    c2.strokeStyle = rgb(H.trim); c2.lineWidth = 2; c2.beginPath(); c2.moveTo(-5, -40); c2.quadraticCurveTo(0, -52, 5, -40); c2.stroke();
    glow(c2, 0, -46, 28, gc, 0.95); blob(c2, 0, -46, 5, 5, gc, [255, 255, 255], false);
    for (let i = 0; i < 3; i++) { const aa = t * 3 + i * 2.1; c2.fillStyle = rgb(gc, 0.8); c2.beginPath(); c2.arc(Math.cos(aa) * 10, -46 + Math.sin(aa) * 6, 1.6, 0, 6.283); c2.fill(); }
  } else {
    for (const k of [-1, 1]) {
      c2.save(); c2.rotate(k * 0.4);
      glow(c2, 0, -22, 18, gc, 0.4);
      c2.fillStyle = "#dde2ee"; c2.beginPath(); c2.moveTo(-1.5, 0); c2.quadraticCurveTo(-3.5, -26, 2, -42); c2.lineTo(1.5, 0); c2.closePath(); c2.fill(); c2.stroke();
      c2.strokeStyle = rgb(gc, 0.8); c2.lineWidth = 1; c2.beginPath(); c2.moveTo(0, -4); c2.quadraticCurveTo(-1.5, -24, 1.5, -38); c2.stroke();
      c2.strokeStyle = "rgba(10,6,12,0.95)"; c2.lineWidth = 2.2;
      c2.fillStyle = rgb(H.trim); c2.fillRect(-3.5, -1, 7, 3); c2.fillStyle = "#1a1018"; c2.fillRect(-1.5, 2, 3, 8);
      c2.restore();
    }
  }
  c2.restore();
  c2.restore();
}

// эмблема игры: тёмный медальон, четыре стихии, светящееся сердце и острые лучи
function drawEmblem(c2, cx, cy, R, t = 0) {
  c2.save(); c2.translate(cx, cy);
  glow(c2, 0, 0, R * 1.6, [255, 170, 80], 0.35);
  const g = c2.createRadialGradient(0, -R * 0.3, R * 0.1, 0, 0, R);
  g.addColorStop(0, "#3a2c4e"); g.addColorStop(1, "#120c1a");
  c2.fillStyle = g; c2.beginPath(); c2.arc(0, 0, R, 0, 6.283); c2.fill();
  c2.lineWidth = R * 0.06; c2.strokeStyle = "#c79a4c"; c2.stroke();
  c2.lineWidth = R * 0.02; c2.strokeStyle = "rgba(255,220,150,0.5)"; c2.beginPath(); c2.arc(0, 0, R * 0.86, 0, 6.283); c2.stroke();
  const els = ["F", "W", "E", "A"];
  els.forEach((e, i) => {
    const a = -Math.PI / 2 + i * Math.PI / 2 + t * 0.2;
    const col = hexRGB(DATA.elements[e].color);
    c2.fillStyle = rgb(col, 0.85);
    c2.beginPath(); c2.moveTo(Math.cos(a - 0.22) * R * 0.25, Math.sin(a - 0.22) * R * 0.25);
    c2.lineTo(Math.cos(a) * R * 0.8, Math.sin(a) * R * 0.8); c2.lineTo(Math.cos(a + 0.22) * R * 0.25, Math.sin(a + 0.22) * R * 0.25); c2.closePath(); c2.fill();
    glow(c2, Math.cos(a) * R * 0.62, Math.sin(a) * R * 0.62, R * 0.28, col, 0.6);
  });
  for (let i = 0; i < 4; i++) {
    const a = -Math.PI / 4 + i * Math.PI / 2 + t * 0.2;
    c2.fillStyle = "rgba(255,230,180,0.55)";
    c2.beginPath(); c2.moveTo(Math.cos(a - 0.12) * R * 0.22, Math.sin(a - 0.12) * R * 0.22); c2.lineTo(Math.cos(a) * R * 0.55, Math.sin(a) * R * 0.55);
    c2.lineTo(Math.cos(a + 0.12) * R * 0.22, Math.sin(a + 0.12) * R * 0.22); c2.closePath(); c2.fill();
  }
  glow(c2, 0, 0, R * 0.5, [255, 220, 150], 0.9);
  c2.fillStyle = "#fff4dc"; c2.beginPath(); c2.moveTo(0, -R * 0.2); c2.lineTo(R * 0.13, 0); c2.lineTo(0, R * 0.2); c2.lineTo(-R * 0.13, 0); c2.closePath(); c2.fill();
  c2.restore();
}

// ================================================================ монстры (кэш кадров)
const ARCH = {
  ghoul: "humanoid", cultist: "humanoid", shaman: "humanoid", summoner: "humanoid", binder: "humanoid", guardian: "humanoid",
  reaper: "humanoid", lich: "humanoid", shieldbearer: "humanoid", hunter: "beast", charger: "beast", yeti: "beast", frostling: "soot",
  imp: "soot", cinder: "soot", wisp: "wisp", slime: "blob", slimelet: "blob", sporeling: "shroom", sporequeen: "shroom",
  spiderling: "spider", spiderqueen: "spider", sapling: "plant", treant: "plant", lasher: "plant", brute: "golem", colossus: "golem",
  magmaw: "golem", bomber: "soot", spitter: "blob", shifter: "wisp", mimic: "mimic", ashphoenix: "bird", frostwyrm: "serpent",
};
const _sprCache = new Map();
function enemySprite(kind, col, r, frame, flip, flash) {
  const key = kind + col.join() + r + frame + flip + (flash ? 1 : 0);
  let s = _sprCache.get(key);
  if (s) return s;
  const n = Math.ceil(r * 3.6);
  s = document.createElement("canvas"); s.width = s.height = n;
  const c2 = s.getContext("2d");
  c2.translate(n / 2, n * 0.62);
  if (flip) c2.scale(-1, 1);
  drawMonster(c2, ARCH[kind] || "blob", col, r, frame / 4 * Math.PI * 2);
  if (flash) { c2.setTransform(1, 0, 0, 1, 0, 0); c2.globalCompositeOperation = "source-atop"; c2.fillStyle = "rgba(255,255,255,0.75)"; c2.fillRect(0, 0, n, n); }
  if (_sprCache.size > 1500) _sprCache.clear();
  _sprCache.set(key, s);
  return s;
}
function eyes(c2, x, y, r, col = "#2b1d1d", glowc = null) {
  if (glowc) { glow(c2, x - r * 0.8, y, r * 2, glowc, 0.8); glow(c2, x + r * 0.8, y, r * 2, glowc, 0.8); }
  c2.fillStyle = glowc ? rgb(glowc) : "#fff";
  c2.beginPath(); c2.ellipse(x - r * 0.8, y, r * 0.55, r * 0.7, 0, 0, Math.PI * 2); c2.ellipse(x + r * 0.8, y, r * 0.55, r * 0.7, 0, 0, Math.PI * 2); c2.fill();
  if (!glowc) { c2.fillStyle = col; c2.beginPath(); c2.arc(x - r * 0.7, y + r * 0.1, r * 0.3, 0, Math.PI * 2); c2.arc(x + r * 0.9, y + r * 0.1, r * 0.3, 0, Math.PI * 2); c2.fill(); }
}
function drawMonster(c2, arch, col, r, ph) {
  const lt = mixc(col, [255, 255, 255], 0.45), dk = shade(col, 0.6), b = Math.sin(ph) * r * 0.06;
  c2.strokeStyle = OUTLINE; c2.lineWidth = Math.max(1.5, r * 0.08);
  if (arch === "blob") {
    const sq = 1 + Math.sin(ph) * 0.08;
    blob(c2, 0, -r * 0.55, r * 1.05 * sq, r * 0.8 / sq, col, lt);
    c2.fillStyle = "rgba(255,255,255,0.5)"; c2.beginPath(); c2.ellipse(-r * 0.35, -r * 0.9, r * 0.25, r * 0.14, -0.4, 0, Math.PI * 2); c2.fill();
    eyes(c2, r * 0.15, -r * 0.6, r * 0.28);
  } else if (arch === "soot") {           // пушистый «чернушка» с глазками
    c2.fillStyle = rgb(shade(col, 0.35));
    c2.beginPath();
    for (let i = 0; i < 18; i++) {
      const a = i / 18 * Math.PI * 2, rr = r * (0.85 + (i % 2) * 0.22 + Math.sin(ph + i) * 0.04);
      c2.lineTo(Math.cos(a) * rr, -r * 0.7 + b + Math.sin(a) * rr);
    }
    c2.closePath(); c2.fill();
    eyes(c2, 0, -r * 0.75 + b, r * 0.3);
    for (const k of [-1, 1]) { c2.strokeStyle = rgb(shade(col, 0.3)); c2.beginPath(); c2.moveTo(k * r * 0.3, -r * 0.05); c2.lineTo(k * r * 0.45, r * 0.25); c2.stroke(); }
    glow(c2, 0, -r * 0.7, r * 1.6, shade(col, 0.6), 0.25);
  } else if (arch === "wisp") {
    glow(c2, 0, -r + b, r * 2.4, col, 0.8);
    blob(c2, 0, -r + b, r * 0.7, r * 0.8, lt, [255, 255, 255], false);
    c2.fillStyle = rgb(lt, 0.7); c2.beginPath(); c2.moveTo(-r * 0.6, -r + b); c2.quadraticCurveTo(0, r * 0.4, r * 0.6, -r + b); c2.fill();
    eyes(c2, 0, -r * 1.05 + b, r * 0.22);
  } else if (arch === "shroom") {
    blob(c2, 0, -r * 0.35, r * 0.45, r * 0.5, [240, 232, 210], [255, 252, 240]);
    blob(c2, 0, -r * 0.85 + b, r * 1.0, r * 0.55, col, lt);
    for (let i = 0; i < 4; i++) { c2.fillStyle = "rgba(255,255,240,0.85)"; c2.beginPath(); c2.arc(-r * 0.5 + i * r * 0.33, -r * 0.95 + b + (i % 2) * r * 0.15, r * 0.1, 0, Math.PI * 2); c2.fill(); }
    eyes(c2, 0, -r * 0.35, r * 0.18);
  } else if (arch === "humanoid") {
    c2.fillStyle = rgb(dk); c2.beginPath(); c2.moveTo(-r * 0.7, 0); c2.quadraticCurveTo(-r * 0.8, -r * 1.2, 0, -r * 1.35 + b); c2.quadraticCurveTo(r * 0.8, -r * 1.2, r * 0.7, 0); c2.closePath(); c2.fill(); c2.stroke();
    blob(c2, 0, -r * 1.4 + b, r * 0.5, r * 0.48, col, lt);
    eyes(c2, r * 0.1, -r * 1.4 + b, r * 0.18, "#2b1d1d", [255, 220, 120]);
    for (const k of [-1, 1]) { c2.strokeStyle = rgb(dk); c2.lineWidth = r * 0.18; c2.beginPath(); c2.moveTo(k * r * 0.55, -r * 0.8); c2.lineTo(k * r * 0.9, -r * 0.35 + Math.sin(ph + k) * r * 0.1); c2.stroke(); }
  } else if (arch === "beast") {
    blob(c2, 0, -r * 0.6, r * 1.1, r * 0.7, col, lt);
    blob(c2, r * 0.85, -r * 0.8 + b, r * 0.5, r * 0.45, col, lt);
    c2.fillStyle = "#f6efe0"; c2.beginPath(); c2.moveTo(r * 1.15, -r * 0.65); c2.lineTo(r * 1.45, -r * 0.95); c2.lineTo(r * 1.2, -r * 0.55); c2.fill();
    eyes(c2, r * 0.95, -r * 0.9 + b, r * 0.16);
    for (const k of [-0.6, 0.4]) { c2.fillStyle = rgb(dk); c2.fillRect(k * r - r * 0.12, -r * 0.2, r * 0.24, r * 0.25 + Math.sin(ph * 2 + k * 3) * r * 0.06); }
  } else if (arch === "spider") {
    for (let i = 0; i < 4; i++) for (const k of [-1, 1]) {
      c2.strokeStyle = rgb(dk); c2.lineWidth = r * 0.12; c2.beginPath(); c2.moveTo(0, -r * 0.5);
      c2.quadraticCurveTo(k * r * 0.9, -r * 0.9 - i * r * 0.1, k * r * (1.1 + i * 0.1), -r * 0.1 + Math.sin(ph + i) * r * 0.08); c2.stroke();
    }
    blob(c2, 0, -r * 0.55 + b, r * 0.75, r * 0.6, col, lt);
    eyes(c2, 0, -r * 0.6 + b, r * 0.18, "#2b1d1d", [255, 90, 90]);
  } else if (arch === "plant") {
    c2.fillStyle = rgb([110, 80, 50]); c2.beginPath(); c2.roundRect(-r * 0.3, -r * 1.2, r * 0.6, r * 1.2, r * 0.2); c2.fill(); c2.stroke();
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + ph * 0.2; blob(c2, Math.cos(a) * r * 0.6, -r * 1.35 + Math.sin(a) * r * 0.35 + b, r * 0.5, r * 0.4, col, lt, i % 2 === 0); }
    eyes(c2, 0, -r * 0.7, r * 0.18, "#2b1d1d", [190, 255, 150]);
  } else if (arch === "golem") {
    blob(c2, 0, -r * 0.75 + b, r * 1.05, r * 0.85, shade(col, 0.85), lt);
    blob(c2, -r * 0.95, -r * 0.6, r * 0.38, r * 0.42, col, lt); blob(c2, r * 0.95, -r * 0.6, r * 0.38, r * 0.42, col, lt);
    c2.strokeStyle = rgb(shade(col, 0.5)); c2.lineWidth = r * 0.06; c2.beginPath(); c2.moveTo(-r * 0.4, -r * 1.2); c2.lineTo(-r * 0.1, -r * 0.8); c2.lineTo(-r * 0.3, -r * 0.4); c2.stroke();
    eyes(c2, 0, -r * 1.0 + b, r * 0.2, "#2b1d1d", [255, 200, 110]);
  } else if (arch === "bird") {
    glow(c2, 0, -r, r * 2.6, [255, 140, 60], 0.6);
    for (const k of [-1, 1]) { c2.fillStyle = rgb([255, 150, 70]); c2.beginPath(); c2.moveTo(0, -r); c2.quadraticCurveTo(k * r * 1.6, -r * (1.6 + Math.sin(ph) * 0.4), k * r * 1.9, -r * 0.6); c2.quadraticCurveTo(k * r * 0.9, -r * 0.7, 0, -r * 0.6); c2.fill(); c2.stroke(); }
    blob(c2, 0, -r * 0.9, r * 0.5, r * 0.6, [255, 190, 90], [255, 240, 190]);
    eyes(c2, 0, -r * 1.1, r * 0.16);
  } else if (arch === "serpent") {
    for (let i = 5; i >= 0; i--) blob(c2, -i * r * 0.35, -r * 0.6 + Math.sin(ph + i) * r * 0.2, r * (0.55 - i * 0.04), r * (0.5 - i * 0.04), col, lt);
    eyes(c2, r * 0.1, -r * 0.7 + Math.sin(ph) * r * 0.2, r * 0.18, "#2b1d1d", [170, 230, 255]);
  } else if (arch === "mimic") {
    c2.fillStyle = "#a8743c"; c2.beginPath(); c2.roundRect(-r, -r * 1.1, r * 2, r * 1.1, r * 0.2); c2.fill(); c2.stroke();
    c2.fillStyle = "#3a1a14"; c2.beginPath(); c2.moveTo(-r * 0.9, -r * 0.8); c2.lineTo(r * 0.9, -r * 0.8); c2.lineTo(r * 0.9, -r * 0.6 - Math.abs(Math.sin(ph)) * r * 0.3); c2.lineTo(-r * 0.9, -r * 0.6 - Math.abs(Math.sin(ph)) * r * 0.3); c2.fill();
    eyes(c2, 0, -r * 0.95, r * 0.2, "#2b1d1d", [255, 220, 90]);
  }
}

// ================================================================ акварельная земля биомов
const BIOME_ART = {
  forest: { wash: [[104, 150, 74], [88, 138, 70], [126, 164, 82], [74, 120, 66], [140, 170, 90]], shadow: [52, 96, 62], light: [214, 220, 130],
    blades: [[70, 120, 60], [104, 152, 72], [150, 186, 92]], flowers: [[250, 248, 236], [255, 226, 110], [244, 168, 186], [176, 196, 255]], mote: [255, 240, 160], monster: [120, 150, 90], outdoor: true },
  caves: { wash: [[78, 74, 112], [66, 64, 100], [92, 86, 128], [60, 70, 104]], shadow: [40, 38, 66], light: [150, 210, 230],
    blades: null, flowers: [[130, 240, 255], [200, 160, 255]], crystals: true, mote: [150, 230, 255], monster: [120, 110, 170], outdoor: false },
  shroom: { wash: [[64, 112, 120], [54, 98, 112], [78, 128, 132], [60, 92, 120]], shadow: [32, 62, 80], light: [170, 240, 230],
    blades: [[60, 110, 110], [80, 140, 130], [130, 190, 170]], flowers: [[170, 255, 240], [255, 200, 240]], mote: [170, 255, 230], monster: [90, 160, 170], outdoor: false },
  ruins: { wash: [[176, 160, 128], [160, 148, 120], [190, 172, 136], [150, 150, 112]], shadow: [104, 96, 84], light: [255, 236, 180],
    blades: [[96, 130, 70], [124, 156, 82], [164, 186, 100]], flowers: [[255, 246, 220], [255, 214, 120]], slabs: true, mote: [255, 230, 170], monster: [170, 140, 110], outdoor: true },
  ash: { wash: [[128, 108, 98], [108, 94, 90], [146, 118, 98], [96, 86, 84]], shadow: [70, 56, 54], light: [255, 196, 130],
    blades: null, flowers: [[255, 160, 80]], embers: true, mote: [255, 150, 80], monster: [190, 100, 70], outdoor: true },
  ice: { wash: [[214, 226, 240], [200, 214, 236], [226, 234, 246], [196, 204, 232]], shadow: [150, 160, 206], light: [255, 255, 255],
    blades: null, flowers: [[255, 255, 255], [200, 230, 255]], snow: true, mote: [255, 255, 255], monster: [140, 170, 220], outdoor: true },
};
function makeGround(bid, w, h) {
  const A = BIOME_ART[bid] || BIOME_ART.forest;
  const g = document.createElement("canvas"); g.width = w; g.height = h;
  const c2 = g.getContext("2d");
  c2.fillStyle = rgb(A.wash[0]); c2.fillRect(0, 0, w, h);
  // акварельные пятна: много мягких кругов с низкой прозрачностью
  for (let i = 0; i < w * h / 9000; i++) {
    const x = rnd(0, w), y = rnd(0, h), r = rnd(60, 220), c = pick(A.wash.concat([A.shadow, A.light]));
    const gr = c2.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, rgb(c, 0.32)); gr.addColorStop(1, rgb(c, 0));
    c2.fillStyle = gr; c2.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // мазки кисти
  for (let i = 0; i < w * h / 2200; i++) {
    const x = rnd(0, w), y = rnd(0, h), c = pick(A.wash);
    c2.fillStyle = rgb(mixc(c, A.light, rnd(0, 0.35)), 0.28);
    c2.beginPath(); c2.ellipse(x, y, rnd(6, 16), rnd(2, 4), rnd(-0.4, 0.4), 0, Math.PI * 2); c2.fill();
  }
  if (A.slabs) for (let i = 0; i < w * h / 50000; i++) {
    c2.strokeStyle = rgb(A.shadow, 0.35); c2.lineWidth = 3; c2.fillStyle = rgb(A.light, 0.18);
    c2.beginPath(); c2.roundRect(rnd(0, w), rnd(0, h), rnd(50, 110), rnd(36, 70), 8); c2.fill(); c2.stroke();
  }
  if (A.snow) for (let i = 0; i < w * h / 26000; i++) {
    const x = rnd(0, w), y = rnd(0, h), r = rnd(30, 90);
    c2.fillStyle = rgb(mixc(A.shadow, [255, 255, 255], 0.6), 0.3); c2.beginPath(); c2.ellipse(x, y, r, r * 0.45, 0, 0, Math.PI * 2); c2.fill();
    c2.fillStyle = "rgba(250,252,255,0.5)"; c2.beginPath(); c2.ellipse(x - 4, y - r * 0.15, r * 0.7, r * 0.12, 0, 0, Math.PI * 2); c2.fill();
  }
  if (A.crystals) for (let i = 0; i < w * h / 14000; i++) {
    const x = rnd(0, w), y = rnd(0, h), col = pick(A.flowers);
    glow(c2, x, y - 8, 30, col, 0.35);
    for (let k = 0; k < rndi(2, 4); k++) {
      const hh = rnd(8, 18), dx = rnd(-8, 8), le = rnd(-0.4, 0.4);
      c2.fillStyle = rgb(shade(col, 0.75)); c2.beginPath(); c2.moveTo(x + dx - 3, y); c2.lineTo(x + dx + le * hh, y - hh); c2.lineTo(x + dx + 3, y); c2.fill();
      c2.fillStyle = rgb(mixc(col, [255, 255, 255], 0.5)); c2.beginPath(); c2.moveTo(x + dx - 1, y - 1); c2.lineTo(x + dx + le * hh, y - hh); c2.lineTo(x + dx + 1, y - 2); c2.fill();
    }
  }
  if (A.embers) for (let i = 0; i < w * h / 12000; i++) { const x = rnd(0, w), y = rnd(0, h); glow(c2, x, y, 20, [255, 120, 50], 0.6); c2.fillStyle = "#ffbe6e"; c2.fillRect(x - 1, y - 1, 2, 2); }
  if (A.blades) for (let i = 0; i < w * h / 4500; i++) {        // пучки травы
    const x = rnd(0, w), y = rnd(0, h), n = rndi(4, 8);
    for (let k = 0; k < n; k++) {
      const c = pick(A.blades), hgt = rnd(8, 18), le = rnd(-0.8, 0.8), x0 = x + rnd(-5, 5);
      c2.fillStyle = rgb(shade(c, 0.8)); c2.beginPath(); c2.moveTo(x0 - 2, y); c2.quadraticCurveTo(x0 + le * hgt * 0.3, y - hgt * 0.6, x0 + le * hgt * 0.6, y - hgt);
      c2.quadraticCurveTo(x0 + le * hgt * 0.3 + 1, y - hgt * 0.5, x0 + 2, y); c2.fill();
      c2.fillStyle = rgb(mixc(c, [255, 255, 230], 0.35), 0.8); c2.beginPath(); c2.moveTo(x0, y - hgt * 0.4); c2.lineTo(x0 + le * hgt * 0.6, y - hgt); c2.lineTo(x0 + 1, y - hgt * 0.45); c2.fill();
    }
  }
  const nf = { forest: 300, ruins: 160, shroom: 100 }[bid] || 50;      // цветы островками
  for (let i = 0; i < nf * w * h / (2400 * 1600); i++) {
    const cx = rnd(0, w), cy = rnd(0, h), col = pick(A.flowers);
    for (let k = 0; k < rndi(4, 10); k++) {
      const x = cx + rnd(-40, 40), y = cy + rnd(-26, 26), r = rnd(2.5, 4.5);
      for (let p = 0; p < 5; p++) { const a = p / 5 * Math.PI * 2; c2.fillStyle = rgb(col); c2.beginPath(); c2.arc(x + Math.cos(a) * r * 0.75, y + Math.sin(a) * r * 0.75, r * 0.6, 0, Math.PI * 2); c2.fill(); }
      c2.fillStyle = "#ffd65a"; c2.beginPath(); c2.arc(x, y, r * 0.4, 0, Math.PI * 2); c2.fill();
    }
  }
  return g;
}

// ================================================================ облака, лучи, тёплая дымка
let _clouds = null;
function cloudTile() {
  if (_clouds) return _clouds;
  _clouds = document.createElement("canvas"); _clouds.width = _clouds.height = 1024;
  const c2 = _clouds.getContext("2d");
  c2.fillStyle = "#fff"; c2.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 26; i++) {
    const x = rnd(0, 1024), y = rnd(0, 1024), r = rnd(120, 280);
    for (const ox of [-1024, 0, 1024]) for (const oy of [-1024, 0, 1024]) {
      const gr = c2.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
      gr.addColorStop(0, "rgba(150,160,175,0.33)"); gr.addColorStop(1, "rgba(150,160,175,0)");
      c2.fillStyle = gr; c2.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
    }
  }
  return _clouds;
}
function drawAtmosphere(c2, camx, camy, t, bid) {
  const A = BIOME_ART[bid] || BIOME_ART.forest;
  if (A.outdoor) {
    const ct = cloudTile(), ox = ((camx * 0.9 + t * 14) % 1024 + 1024) % 1024, oy = ((camy * 0.9 + t * 6) % 1024 + 1024) % 1024;
    c2.globalCompositeOperation = "multiply";
    for (let y = -oy; y < V.H; y += 1024) for (let x = -ox; x < V.W; x += 1024) c2.drawImage(ct, x, y);
    c2.globalCompositeOperation = "lighter";
    for (let i = 0; i < 5; i++) {                        // лучи солнца
      const x = ((i * 397 + t * 8 - camx * 0.15) % (V.W + 400) + V.W + 400) % (V.W + 400) - 200, w = 90 + (i * 53) % 90;
      const gr = c2.createLinearGradient(0, 0, 0, V.H);
      gr.addColorStop(0, rgb(A.light, 0.10)); gr.addColorStop(1, rgb(A.light, 0));
      c2.fillStyle = gr; c2.beginPath(); c2.moveTo(x, 0); c2.lineTo(x + w, 0); c2.lineTo(x + w - V.H * 0.45, V.H); c2.lineTo(x - V.H * 0.45, V.H); c2.fill();
    }
  }
  c2.globalCompositeOperation = "source-over";
  const v = c2.createRadialGradient(V.W / 2, V.H / 2, V.H * 0.45, V.W / 2, V.H / 2, V.W * 0.75);
  v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(20,14,30,0.35)");
  c2.fillStyle = v; c2.fillRect(0, 0, V.W, V.H);
}
const MOTES = [];
function drawMotes(c2, camx, camy, t, dt, bid) {
  const A = BIOME_ART[bid] || BIOME_ART.forest;
  if (MOTES.length === 0) for (let i = 0; i < 55; i++) MOTES.push({ x: rnd(0, 1700), y: rnd(0, 1000), d: rnd(0.4, 1), p: rnd(0, 6) });
  const snow = A.snow, ember = A.embers;
  for (const m of MOTES) {
    m.x += ((snow ? -14 : ember ? 10 : 6) + Math.sin(t * 0.8 + m.p) * 8) * dt * m.d;
    m.y += (snow ? 34 : ember ? -26 : -10) * dt * m.d;
    const x = ((m.x - camx * 0.25 * m.d) % V.W + V.W) % V.W, y = ((m.y - camy * 0.25 * m.d) % V.H + V.H) % V.H;
    const tw = 0.6 + 0.4 * Math.sin(t * 2.3 + m.p * 3);
    if (!snow) glow(c2, x, y, 10 * m.d + 4, A.mote, 0.5 * tw);
    c2.fillStyle = rgb(A.mote, snow ? 0.9 : tw); c2.beginPath(); c2.arc(x, y, snow ? 2.2 * m.d + 0.6 : 1.6 * m.d + 0.4, 0, Math.PI * 2); c2.fill();
  }
}

// иконка стихии: мягкий кружок с символом
function elemIcon(c2, e, x, y, r) {
  const E = DATA.elements[e]; if (!E) return;
  const col = hexRGB(E.color), lt = hexRGB(E.light);
  glow(c2, x, y, r * 1.8, col, 0.4);
  blob(c2, x, y, r, r, shade(col, 0.85), lt);
  c2.fillStyle = "rgba(255,255,255,0.9)"; c2.font = `bold ${Math.round(r * 1.05)}px sans-serif`; c2.textAlign = "center"; c2.textBaseline = "middle";
  c2.fillText({ F: "🔥", W: "💧", E: "⛰", A: "🌀", L: "⚡", D: "🌑", C: "💎", K: "🩸", N: "🌿", S: "♪", O: "☀", G: "🪐", V: "🌋", Y: "⏳",
    M: "⚙", P: "☠", I: "❄", Q: "💥", H: "💨", T: "⌛", X: "🕳", U: "👻" }[e] || e, x, y + 1);
}
