// Логика боя: герой, атаки, способности из рецептов, рывок по стихии, враги, боссы, волны, карточки.
"use strict";
const ARENA = { w: 2400, h: 1600 };
const GS = { mode: "menu", t: 0 };
const ORDER = DATA.order, MAXLVL = DATA.maxLvl;
const RECIPE_BY_ID = {}; DATA.recipes.forEach((r) => (RECIPE_BY_ID[r.id] = r));
const recElems = (r) => r.seq || r.combo;

// ---------------------------------------------------------------- рецепты (перенос evolution.py)
const _cnt = (s) => { const c = {}; for (const ch of s) c[ch] = (c[ch] || 0) + 1; return c; };
const _subseq = (sm, big) => { let i = 0; for (const ch of big) if (ch === sm[i]) i++; return i === sm.length; };
function _fits(r, seq) {
  if (r.seq) return _subseq(r.seq, seq);
  const have = _cnt(seq), need = _cnt(r.combo);
  return Object.keys(need).every((e) => (have[e] || 0) >= need[e]);
}
const _rawC = new Map();
function resolveRaw(seq) {
  if (_rawC.has(seq)) return _rawC.get(seq);
  let res = null;
  for (const r of DATA.recipes) if (r.seq === seq) { res = [r, 1]; break; }
  if (!res) {
    const key = [...seq].sort().join("");
    for (const r of DATA.recipes) if (r.combo && [...r.combo].sort().join("") === key) { res = [r, 1]; break; }
  }
  if (!res) {
    let best = null;
    for (const r of DATA.recipes) {
      if (r.exact || !_fits(r, seq)) continue;
      const sc = (recElems(r).includes(seq[seq.length - 1]) ? 100 : 0) + recElems(r).length;
      if (!best || sc > best[0]) best = [sc, r];
    }
    const r = best ? best[1] : DATA.recipes[0];
    res = [r, 1 + seq.length - recElems(r).length];
  }
  _rawC.set(seq, res);
  return res;
}
function resolve(seq) {
  if (!seq) return [null, 0];
  let cur = null, lvl = 0;
  for (let i = 1; i <= seq.length; i++) {
    const [r, l] = resolveRaw(seq.slice(0, i));
    if (!cur || recElems(r).length > recElems(cur).length) { cur = r; lvl = l; } else lvl += 1;
  }
  return [cur, Math.min(MAXLVL, lvl)];
}
function recColor(r) {
  const es = recElems(r); let c = [0, 0, 0];
  for (const e of es) { const k = hexRGB(DATA.elements[e].color); c = [c[0] + k[0], c[1] + k[1], c[2] + k[2]]; }
  return [c[0] / es.length, c[1] / es.length, c[2] / es.length];
}

// ---------------------------------------------------------------- новая игра
function newGame(cls) {
  const H = HEROES[cls];
  GS.player = { x: 0, y: 0, r: 16, cls, face: 1, t: 0, atk: 0, hp: H.hp, maxhp: H.hp, baseSpeed: H.speed, inv: 0,
    dashCd: 0, charges: 2, dashT: 0, dvx: 0, dvy: 0, lvl: 1, xp: 0, counts: {}, perks: {}, basic: { cd: 0, count: 0, dmg: 0, rate: 0 },
    curseUntil: 0, invis: 0, hurtFlash: 0, items: [], coins: 0 };
  GS.branches = []; GS.abilities = []; GS.extra = [];
  GS.enemies = []; GS.projs = []; GS.zones = []; GS.strikes = []; GS.parts = []; GS.texts = []; GS.gems = []; GS.beams = []; GS.rings = []; GS.summons = [];
  GS.wave = 0; GS.biome = 0; GS.spawnLeft = 0; GS.spawnT = 0; GS.waveDelay = 2.5; GS.kills = 0; GS.time = 0; GS.banner = null; GS.shake = 0;
  GS.cardQueue = []; GS.cards = null; GS.boss = null; GS.combo = 0; GS.comboT = 0; GS.hitstop = 0; GS.spawnFx = [];
  setFloor(0);
  GS.cardQueue = [];
  recalc();
  GS.cardQueue.push("start");   // первая карточка — первая стихия
  GS.drone = null;
  if (!SAVE.get("storySeen", false)) { SAVE.set("storySeen", true); GS.mode = "story"; GS.storyI = 0; GS.storyT = 0; }
  else { GS.mode = "play"; openCards(); }
}
function setBiome(i) {
  GS.biome = i;
  GS.bid = DATA.biomes[i].id;
  GS.ground = makeGround(GS.bid, ARENA.w, ARENA.h);
  GS.banner = { title: nm(DATA.biomes[i]), sub: L(DATA.biomes[i].ch_ru, "Chapter " + ["I", "II", "III", "IV", "V", "VI"][i]), t: 3.5 };
}
function elemsAvail() { return ORDER.concat(GS.extra); }

// ---------------------------------------------------------------- характеристики героя
function recalc() {
  const p = GS.player, c = p.counts, pk = p.perks, H = HEROES[p.cls];
  const n = (e) => c[e] || 0;
  const old = p.maxhp;
  p.maxhp = Math.round(H.hp + 12 * n("E") + 10 * n("N") + 25 * (pk.hp || 0));
  p.hp = Math.min(p.maxhp, p.hp + Math.max(0, p.maxhp - old));
  p.dmgMult = (1 + 0.06 * n("F") + 0.03 * n("D") + 0.03 * n("L")) * (1 + 0.15 * (pk.dmg || 0)) * (p.cls === "mage" ? 1.1 : 1);
  p.speed = p.baseSpeed * 1.06 * (1 + 0.04 * n("A") + 0.1 * (pk.speed || 0));
  p.cdr = Math.max(0.4, (1 - 0.03 * n("A")) * Math.pow(0.9, pk.cdr || 0));
  p.regen = 0.25 * n("W") + 0.5 * n("N") + 0.8 * (pk.regen || 0);
  p.crit = Math.min(0.5, 0.04 * n("C") + (p.cls === "archer" ? 0.12 : 0));
  p.lifesteal = 0.012 * n("D") + 0.01 * n("K");
  p.stunChance = Math.min(0.3, 0.05 * n("L"));
  p.magnet = 110 * (1 + 0.5 * (pk.magnet || 0));
  p.dashMax = 2 + (pk.dash || 0) + (dashKind() === "A" ? 1 : 0);
  p.armor = Math.min(0.5, 0.02 * n("E") + 0.06 * (pk.armor || 0) + (p.cls === "warrior" ? 0.18 : p.cls === "duelist" ? 0.08 : 0));
  const it = (k) => (p.items || []).includes(k);
  if (it("lens")) p.dmgMult *= 1.2;
  if (it("boots")) p.speed *= 1.15;
  if (it("hourglass")) p.cdr *= 0.85;
  if (it("cat")) p.crit += 0.1;
  if (it("horn")) p.dashMax += 1;
  if (it("heart")) p.maxhp += 30;
  if (it("star")) p.maxhp += 20;
  if (it("magnet")) p.magnet *= 2.5;
  if (it("fang")) p.lifesteal += 0.04;
  for (const a of GS.abilities) refreshAbility(a);
}

// ---------------------------------------------------------------- способности
function makeAbility(seq) {
  const [r, lvl] = resolve(seq);
  const a = { seq, rec: r, lvl, id: r.id, b: r.id === "avatar" ? "avatar" : r.b, cd: rnd(0.2, 0.6), p: {}, orbA: rnd(0, 6), orbHit: new Map(),
    color: recColor(r), casts: 0 };
  refreshAbility(a);
  return a;
}
function refreshAbility(a) {
  const [r, lvl] = resolve(a.seq);
  if (r.id !== a.id) { a.rec = r; a.id = r.id; a.b = r.id === "avatar" ? "avatar" : r.b; a.color = recColor(r); }
  a.lvl = lvl;
  const p = JSON.parse(JSON.stringify(r.p));
  for (const k in r.lvl) p[k] = (p[k] || 0) + r.lvl[k] * (lvl - 1);
  const pw = (1 + 0.15 * (lvl - 1)) * GS.player.dmgMult;
  for (const k of ["dmg", "dps", "aura_dps"]) if (p[k]) p[k] *= pw;
  if (p.cd) p.cd *= GS.player.cdr;
  if (p.radius > 230) p.radius = 230;
  for (const k of ["count", "jumps", "ring_bolts", "pierce", "burst"]) if (p[k]) p[k] = Math.floor(p[k]);
  a.p = p;
}
function rebuildAbilities() {
  const old = new Map(GS.abilities.map((a) => [a.seq.slice(0, 1) + GS.abilities.indexOf(a), a]));
  GS.abilities = GS.branches.map((seq, i) => {
    const prev = GS.abilities[i];
    if (prev) { prev.seq = seq; refreshAbility(prev); return prev; }
    return makeAbility(seq);
  });
  const c = {};
  for (const s of GS.branches) for (const ch of s) c[ch] = (c[ch] || 0) + 1;
  GS.player.counts = c;
  recalc();
}

// ---------------------------------------------------------------- поиск целей
function nearestEnemy(x, y, maxR = 1e9) {
  let best = null, bd = maxR * maxR;
  for (const e of GS.enemies) { const d = (e.x - x) ** 2 + (e.y - y) ** 2; if (d < bd) { bd = d; best = e; } }
  return best;
}
function aimPoint() {
  const p = GS.player;
  if (CFG.device === "pc") return [IN.mx / zoom() + GS.cam.x, IN.my / zoom() + GS.cam.y];
  const e = nearestEnemy(p.x, p.y, 700);
  return e ? [e.x, e.y] : [p.x + p.face * 100, p.y];
}
function clusterTarget(range) {
  const p = GS.player; let best = null, bs = -1;
  for (const e of GS.enemies) {
    if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 > range * range) continue;
    let s = 0; for (const o of GS.enemies) if ((o.x - e.x) ** 2 + (o.y - e.y) ** 2 < 120 * 120) s++;
    if (s > bs) { bs = s; best = e; }
  }
  return best;
}

// ---------------------------------------------------------------- урон
function hitEnemy(e, dmg, o = {}) {
  if (e.dead) return 0;
  const p = GS.player;
  let crit = Math.random() < p.crit;
  if (crit) { dmg *= 2; GS.hitstop = Math.max(GS.hitstop, 0.025); }
  if (e.curseUntil > GS.time) dmg *= 1.3;
  dmg *= 1 + Math.min(0.3, GS.combo * 0.006);
  e.hp -= dmg; e.flash = 0.1;
  if (GS.parts.length < 600) for (let i = 0; i < 3; i++) { const a = rnd(0, 6.283); GS.parts.push({ x: e.x, y: e.y - e.r * 0.6, vx: Math.cos(a) * 220, vy: Math.sin(a) * 220, life: 0.18, max: 0.18, col: [255, 250, 220], size: 2.2, g: true }); }
  if (o.burn) { e.burnDps = Math.max(e.burnT > 0 ? e.burnDps : 0, o.burn[0] * p.dmgMult); e.burnT = Math.max(e.burnT, o.burn[1]); }
  if (o.slow) { e.slow = Math.min(e.slowT > 0 ? e.slow : 1, o.slow[0]); e.slowT = Math.max(e.slowT, o.slow[1]); }
  if (o.stun || Math.random() < p.stunChance * (o.basic ? 0.5 : 1)) e.stun = Math.max(e.stun, o.stun || 0.4);
  if (o.knock && !e.boss) { const a = Math.atan2(e.y - (o.kx ?? p.y) , e.x - (o.kxx ?? p.x)); e.kx = Math.cos(a) * o.knock; e.ky = Math.sin(a) * o.knock; }
  if (o.curse) e.curseUntil = GS.time + o.curse;
  if (p.lifesteal) p.hp = Math.min(p.maxhp, p.hp + dmg * p.lifesteal * 0.3);
  if (o.basic && p.items) {
    if (hasItem("fireheart")) { e.burnDps = Math.max(e.burnDps, 5 * p.dmgMult); e.burnT = Math.max(e.burnT, 2); }
    if (hasItem("icesoul")) { e.slow = Math.min(e.slowT > 0 ? e.slow : 1, 0.6); e.slowT = Math.max(e.slowT, 1.2); }
    if (hasItem("stormstone") && Math.random() < 0.2) { const n = nearestEnemy(e.x + 1, e.y + 1, 220); if (n && n !== e) { GS.beams.push({ x1: e.x, y1: e.y - 20, x2: n.x, y2: n.y - 20, col: [255, 236, 110], life: 0.25 }); setTimeout(() => !n.dead && hitEnemy(n, dmg * 0.5), 0); } }
    if (hasItem("mirror") && Math.random() < 0.12) setTimeout(() => !e.dead && hitEnemy(e, dmg * 0.5), 120);
  }
  if (o.basic && p.cls === "warrior") p.hp = Math.min(p.maxhp, p.hp + 0.9);
  if (o.basic && p.cls === "duelist") p.hp = Math.min(p.maxhp, p.hp + 0.5);
  text(e.x + rnd(-10, 10), e.y - e.r - 14, Math.round(dmg), crit ? [255, 214, 90] : [255, 248, 230], crit);
  if (e.hp <= 0) killEnemy(e);
  return dmg;
}
function killEnemy(e) {
  e.dead = true; GS.kills++;
  GS.combo++; GS.comboT = 2.5;
  if (e.boss || GS.combo % 25 === 0) GS.hitstop = e.boss ? 0.25 : 0.06;
  burst(e.x, e.y - e.r * 0.5, e.col, e.boss ? 60 : 18, e.boss ? 380 : 230);
  ring(e.x, e.y - e.r * 0.5, e.r * 2.2, [255, 245, 225], 0.22);
  GS.shake = Math.max(GS.shake, e.boss ? 16 : 1.6);
  const xp = (DATA.enemies[e.kind] || {}).xp || 1;
  for (let i = 0; i < Math.min(8, xp); i++) GS.gems.push({ x: e.x + rnd(-14, 14), y: e.y + rnd(-14, 14), v: Math.max(1, Math.round(xp / Math.min(8, xp))), t: 0 });
  if (Math.random() < (e.boss ? 1 : 0.015)) GS.gems.push({ x: e.x, y: e.y, heart: true, t: 0 });
  if (e.kind === "slime") for (let i = 0; i < 2; i++) spawnEnemy("slimelet", e.x + rnd(-20, 20), e.y + rnd(-20, 20));
  const rm = roomAt(e.x, e.y);
  if (rm && rm.props && Math.random() < (hasItem("clover") ? 0.2 : 0.1)) rm.props.push({ type: "coin", x: e.x, y: e.y, r: 10, hp: 0 });
  if (rm && rm.props && e.boss) for (let i = 0; i < 10; i++) rm.props.push({ type: "coin", x: e.x + rnd(-60, 60), y: e.y + rnd(-60, 60), r: 10, hp: 0 });
  if (hasItem("bomb") && !e.boss) { ring(e.x, e.y, 70, [255, 150, 70], 0.3); for (const o of GS.enemies) if (o !== e && !o.dead && (o.x - e.x) ** 2 + (o.y - e.y) ** 2 < 70 * 70) setTimeout(() => !o.dead && hitEnemy(o, 12 * GS.player.dmgMult), 0); }
  if (e.boss) {
    GS.boss = null; GS.shake = 14; AUDIO.play("boom");
    if (GS.extra.length < DATA.extra.length) GS.cardQueue.push("unlock");
    GS.bossDown = true;
  } else AUDIO.play("hit");
}
function hurtPlayer(dmg) {
  const p = GS.player;
  if (p.inv > 0 || p.dashT > 0 || GS.mode !== "play") return;
  if (hasItem("arkshield") && !p.shieldUsed) { p.shieldUsed = true; p.inv = 0.6; ring(p.x, p.y - 20, 50, [150, 210, 255], 0.4); text(p.x, p.y - 60, L("щит!", "shield!"), [170, 220, 255], true); return; }
  dmg *= 1 - p.armor;
  p.hp -= dmg; p.inv = 0.55; p.hurtFlash = 0.25; GS.shake = Math.max(GS.shake, 5);
  text(p.x, p.y - 60, "-" + Math.round(dmg), [255, 90, 90], true);
  AUDIO.play("hurt");
  if (p.hp <= 0 && hasItem("phoenix") && !p.revived) { p.revived = true; p.hp = p.maxhp * 0.5; p.inv = 2; burst(p.x, p.y - 20, [255, 170, 80], 50, 320); GS.banner = { title: L("Феникс!", "Phoenix!"), sub: L("Ты восстал из пепла", "You rose from the ashes"), t: 2 }; return; }
  if (p.hp <= 0) { p.hp = 0; GS.mode = "dead"; GS.deadT = 0; saveBest(); }
}
function saveBest() { const f = (GS.floor ? GS.floor.fi : 0) + 1, b = SAVE.get("bestFloor", 0); if (f > b) SAVE.set("bestFloor", f); }

// ---------------------------------------------------------------- эффекты
function burst(x, y, col, n, sp) {
  for (let i = 0; i < n; i++) { const a = rnd(0, 6.28), v = rnd(0.3, 1) * sp; GS.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, life: rnd(0.3, 0.8), max: 0.8, col, size: rnd(2, 5), g: true }); }
}
function text(x, y, s, col, big) { GS.texts.push({ x, y, s: String(s), col, big, life: 0.9 }); if (GS.texts.length > 70) GS.texts.shift(); }
function ring(x, y, r, col, life = 0.35) { GS.rings.push({ x, y, r, col, life, max: life }); }

// ---------------------------------------------------------------- снаряды
function shoot(x, y, ang, o) {
  const sp = o.speed || 600;
  GS.projs.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, r: o.size || 7, dmg: o.dmg || 10, life: o.life || 1.4,
    pierce: o.pierce || 1, hit: new Set(), col: o.col || [255, 200, 120], shape: o.shape || "orb", friendly: o.friendly !== false,
    explode: o.explode || 0, burn: o.burn, slow: o.slow, stun: o.stun, homing: o.homing || 0, split: o.split || 0, returning: o.returning,
    knock: o.knock || 0, basic: o.basic, t: 0, curse: o.curse });
}

// ---------------------------------------------------------------- рывок, который меняется от стихии
const DASHES = {
  "": ["Рывок", "Dash"], F: ["Огненный след", "Flame Trail"], W: ["Волна прилива", "Tidal Wave"], E: ["Таран", "Ram"],
  A: ["Порыв ветра", "Gale Step"], L: ["Молния", "Lightning Blink"], D: ["Теневой шаг", "Shadow Step"], C: ["Кристальный путь", "Crystal Path"],
  K: ["Кровавый рывок", "Blood Rush"], N: ["Цепкие корни", "Root Dash"],
  S: ["Звуковой барьер", "Sound Barrier"], O: ["Вспышка", "Flash Step"], G: ["Гравитационный удар", "Gravity Slam"],
  V: ["Лавовый след", "Lava Trail"], Y: ["Песчаный вихрь", "Sand Swirl"], M: ["Стальной шквал", "Steel Flurry"],
  P: ["Ядовитый след", "Venom Trail"], I: ["Ледяной шаг", "Frost Step"], Q: ["Сейсмоудар", "Quake Slam"],
  H: ["Дымовой шаг", "Smoke Step"], T: ["Замедление времени", "Time Warp"], X: ["Шаг пустоты", "Void Step"], U: ["Дух-хранитель", "Guardian Spirit"],
};
function dashKind() {
  const c = GS.player ? GS.player.counts : {}; let best = "", bn = 0;
  for (const e of ORDER.concat(DATA.extra)) if ((c[e] || 0) > bn) { bn = c[e]; best = e; }
  return best;
}
function doDash() {
  const p = GS.player;
  if (p.charges <= 0 || p.dashT > 0) return;
  let [mx, my] = moveVector();
  if (!mx && !my) { const [ax, ay] = aimPoint(); const a = Math.atan2(ay - p.y, ax - p.x); mx = Math.cos(a); my = Math.sin(a); }
  const k = dashKind(), col = k ? hexRGB(DATA.elements[k].color) : [230, 230, 255];
  p.charges--; p.dashCd = 1.6;
  AUDIO.play("dash");
  if (k === "L") {                      // мгновенная молния: телепорт и цепь разрядов
    const sx = p.x, sy = p.y;
    for (let d = 270; d > 0; d -= 30) { if (walkable(sx + mx * d, sy + my * d, p.r)) { p.x = sx + mx * d; p.y = sy + my * d; break; } }
    GS.beams.push({ x1: sx, y1: sy - 20, x2: p.x, y2: p.y - 20, col, life: 0.25 });
    let cur = { x: p.x, y: p.y }; const hit = new Set();
    for (let j = 0; j < 4; j++) {
      let n = null, bd = 260 * 260;
      for (const e of GS.enemies) if (!hit.has(e)) { const d = (e.x - cur.x) ** 2 + (e.y - cur.y) ** 2; if (d < bd) { bd = d; n = e; } }
      if (!n) break; hit.add(n); GS.beams.push({ x1: cur.x, y1: cur.y - 20, x2: n.x, y2: n.y - 20, col, life: 0.3 });
      hitEnemy(n, 22 * p.dmgMult, { stun: 0.5 }); cur = n;
    }
    p.inv = 0.4; AUDIO.play("zap"); return;
  }
  p.dashT = k === "A" ? 0.26 : 0.18; p.dvx = mx * (k === "A" ? 1250 : 1050); p.dvy = my * (k === "A" ? 1250 : 1050);
  p.dashKind = k; p.dashHit = new Set(); p.dashTrail = 0;
  p.inv = Math.max(p.inv, p.dashT + 0.1);
  if (k === "D") { p.invis = 1.2; p.inv = 1.2; }
  if (k === "H") { p.invis = 0.9; GS.zones.push({ x: p.x, y: p.y, r: 120, dur: 3, t: 0, dps: 8 * p.dmgMult, col: [170, 170, 185], slow: [0.5, 0.6], tick: 0, friendly: true }); }
  if (k === "O") { ring(p.x, p.y, 150, col, 0.4); for (const e of GS.enemies) if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 < 150 * 150) hitEnemy(e, 12 * p.dmgMult, { stun: 0.7 }); p.hp = Math.min(p.maxhp, p.hp + p.maxhp * 0.04); }
  if (k === "T") { ring(p.x, p.y, 260, col, 0.6); for (const e of GS.enemies) if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 < 260 * 260) { e.slow = 0.3; e.slowT = 2.5; } }
  if (k === "U") { p.hp = Math.min(p.maxhp, p.hp + p.maxhp * 0.06); ring(p.x, p.y, 70, col, 0.5); }
}
function dashTick(dt) {
  const p = GS.player, k = p.dashKind, col = k ? hexRGB(DATA.elements[k].color) : [230, 230, 255];
  moveIn(p, p.x + p.dvx * dt, p.y + p.dvy * dt, p.r);
  for (let i = 0; i < 3; i++) GS.parts.push({ x: p.x + rnd(-8, 8), y: p.y - rnd(5, 40), vx: -p.dvx * 0.05, vy: -p.dvy * 0.05, life: 0.4, max: 0.4, col, size: rnd(3, 6), g: true });
  p.dashTrail -= dt;
  if ((k === "V" || k === "P") && p.dashTrail <= 0) { p.dashTrail = 0.05; GS.zones.push({ x: p.x, y: p.y, r: 44, dur: 2.6, t: 0, dps: (k === "V" ? 24 : 18) * p.dmgMult, col, burn: k === "V" ? [6, 2] : [5, 3], tick: 0, friendly: true }); }
  if (k === "F" && p.dashTrail <= 0) { p.dashTrail = 0.045; GS.zones.push({ x: p.x, y: p.y, r: 46, dur: 2.2, t: 0, dps: 18 * p.dmgMult, col: [255, 120, 50], kind: "fire", tick: 0, friendly: true }); }
  if (k === "C" && p.dashTrail <= 0) { p.dashTrail = 0.06; GS.strikes.push({ x: p.x, y: p.y, r: 60, delay: 0.55, t: 0, dmg: 26 * p.dmgMult, col: [220, 150, 255], kind: "crystal" }); }
  for (const e of GS.enemies) {
    if (p.dashHit.has(e) || (e.x - p.x) ** 2 + (e.y - p.y) ** 2 > (e.r + 40) ** 2) continue;
    p.dashHit.add(e);
    const base = 10 * p.dmgMult;
    if (k === "W") hitEnemy(e, base, { slow: [0.5, 2], knock: 260 });
    else if (k === "E") hitEnemy(e, base * 2, { stun: 1.0 });
    else if (k === "K") { hitEnemy(e, base * 1.5); p.hp = Math.min(p.maxhp, p.hp + p.maxhp * 0.03); }
    else if (k === "N") hitEnemy(e, base, { stun: 1.5 });
    else if (k === "I") hitEnemy(e, base, { stun: 1.1, slow: [0.5, 2] });
    else if (k === "X") { if (e.hp < e.maxhp * 0.18 && !e.boss) hitEnemy(e, e.hp + 1); else hitEnemy(e, base * 2); }
    else if (k === "D") hitEnemy(e, base, { curse: 4 });
    else if (k) hitEnemy(e, base);
  }
  p.dashT -= dt;
  if (p.dashT <= 0) {                   // финал рывка
    if (k === "E") { ring(p.x, p.y, 150, col, 0.4); GS.shake = 6; for (const e of GS.enemies) if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 < 150 * 150) hitEnemy(e, 20 * p.dmgMult, { stun: 0.8 }); AUDIO.play("boom"); }
    if (k === "A") for (let i = 0; i < 10; i++) shoot(p.x, p.y - 20, i / 10 * 6.283, { dmg: 9 * p.dmgMult, speed: 700, size: 6, col: [190, 245, 230], shape: "blade", pierce: 2, life: 0.6 });
    if (k === "W") ring(p.x, p.y, 120, col, 0.4);
    if (k === "S" || k === "Q") { const R = k === "Q" ? 190 : 160; ring(p.x, p.y, R, col, 0.45); GS.shake = 7; for (const e of GS.enemies) if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 < R * R) hitEnemy(e, (k === "Q" ? 26 : 14) * p.dmgMult, { stun: k === "S" ? 1.0 : 0.6, knock: 180 }); AUDIO.play("boom"); }
    if (k === "G") { ring(p.x, p.y, 240, col, 0.5); GS.shake = 8; for (const e of GS.enemies) if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 < 260 * 260 && !e.boss) { moveIn(e, p.x + (e.x - p.x) * 0.25, p.y + (e.y - p.y) * 0.25, e.r * 0.6); hitEnemy(e, 22 * p.dmgMult, { stun: 0.5 }); } AUDIO.play("boom"); }
    if (k === "Y") { GS.zones.push({ x: p.x, y: p.y, r: 140, dur: 2.5, t: 0, dps: 14 * p.dmgMult, col, slow: [0.45, 0.8], tick: 0, friendly: true, move: 60, ang: 0 }); }
    if (k === "M") for (let i = 0; i < 8; i++) shoot(p.x, p.y - 20, i / 8 * 6.283, { dmg: 14 * p.dmgMult, speed: 820, size: 7, col: [220, 228, 240], shape: "blade", pierce: 3, life: 0.6 });
  }
}

// ---------------------------------------------------------------- основная атака
function basicAttack(dt) {
  const p = GS.player, B = p.basic;
  B.cd -= dt;
  if (B.cd > 0) return;
  const [ax, ay] = aimPoint();
  const range = p.cls === "archer" || p.cls === "mage" ? 650 : 150;
  let near = nearestEnemy(p.x, p.y, range), ang = Math.atan2(ay - (p.y - 20), ax - p.x);
  if (!near) {   // врагов нет — герой сам бьёт ящики и горшки рядом
    near = nearestProp(p.x, p.y, p.cls === "archer" || p.cls === "mage" ? 420 : 130);
    if (!near) return;
    ang = Math.atan2(near.y - 10 - (p.y - 20), near.x - p.x);
  }
  const rate = 0.85 / (1 + 0.15 * B.rate), dm = p.dmgMult * Math.pow(1.25, B.dmg);
  p.face = Math.cos(ang) >= 0 ? 1 : -1; p.atk = 1;
  if (p.cls === "warrior" || p.cls === "duelist") {
    const R = p.cls === "warrior" ? 105 : 82, arc = p.cls === "warrior" ? 1.9 : 2.4, dmg = (p.cls === "warrior" ? 30 : 13) * dm;
    const hits = p.cls === "duelist" ? 2 : 1;
    const a0 = Math.atan2(near.y - p.y, near.x - p.x);
    hitProps(p.x + Math.cos(a0) * R * 0.6, p.y + Math.sin(a0) * R * 0.6, R * 0.6);
    for (let h = 0; h < hits; h++) setTimeout(() => {
      if (GS.mode !== "play") return;
      GS.rings.push({ x: p.x, y: p.y - 18, r: R, col: p.cls === "warrior" ? [255, 240, 220] : [255, 190, 220], life: 0.18, max: 0.18, arc: [a0 - arc / 2, a0 + arc / 2] });
      for (const e of GS.enemies) {
        const d = Math.hypot(e.x - p.x, e.y - p.y);
        if (d > R + e.r) continue;
        let da = Math.atan2(e.y - p.y, e.x - p.x) - a0; da = Math.atan2(Math.sin(da), Math.cos(da));
        if (Math.abs(da) < arc / 2 + 0.3) hitEnemy(e, dmg, { knock: p.cls === "warrior" ? 160 : 60, basic: true });
      }
    }, h * 110);
    for (let i = 0; i < B.count; i++) shoot(p.x, p.y - 20, a0 + (i - (B.count - 1) / 2) * 0.25, { dmg: dmg * 0.6, speed: 650, size: 9, col: [255, 240, 210], shape: "blade", pierce: 3, life: 0.5, basic: true });
    B.cd = (p.cls === "warrior" ? 0.78 : 0.34) * rate;
    AUDIO.play("shot");
  } else if (p.cls === "archer") {
    const n = 1 + B.count;
    for (let i = 0; i < n; i++) shoot(p.x, p.y - 22, ang + (i - (n - 1) / 2) * 0.12, { dmg: 17 * dm, speed: 880, size: 6, col: [240, 230, 190], shape: "arrow", pierce: 2, life: 1.0, basic: true });
    B.cd = 0.42 * rate; AUDIO.play("shot");
  } else {
    const n = 1 + B.count;
    for (let i = 0; i < n; i++) shoot(p.x, p.y - 30, ang + (i - (n - 1) / 2) * 0.16, { dmg: 19 * dm, speed: 560, size: 9, col: [255, 170, 80], shape: "comet", explode: 55, burn: [4, 2], life: 1.3, basic: true });
    B.cd = 0.7 * rate; AUDIO.play("shot");
  }
}

// ---------------------------------------------------------------- способности (поведения рецептов)
function abilityTick(a, dt) {
  const p = GS.player, P = a.p;
  if (a.b === "orbit") return orbitTick(a, dt);
  if (a.b === "avatar") return avatarTick(a, dt);
  a.cd -= dt;
  if (a.cd > 0) return;
  const rng = P.range || 560;
  const tgt = nearestEnemy(p.x, p.y, rng);
  if (!tgt && !["shield", "summon", "nova"].includes(a.b)) { a.cd = 0.15; return; }
  const col = a.color;
  const fx = { burn: P.burn, slow: P.slow, stun: P.stun, knock: P.knock };
  if (a.b === "bolt") {
    const [ax, ay] = CFG.device === "pc" ? aimPoint() : [tgt.x, tgt.y];
    const ang = Math.atan2(ay - (p.y - 20), ax - p.x), n = P.count || 1, spr = (P.spread || (n > 1 ? 12 * (n - 1) : 0)) * Math.PI / 180;
    for (let i = 0; i < n; i++) {
      const aa = n > 1 ? ang - spr / 2 + spr * i / (n - 1) : ang;
      shoot(p.x, p.y - 22, aa, { dmg: P.dmg, speed: P.speed || 600, size: P.size || 7, col, shape: P.shape, pierce: P.pierce || 1,
        explode: P.explode, burn: P.burn, slow: P.slow, stun: P.stun, homing: P.homing ? 4 : 0, split: P.split, returning: P.returning, knock: P.knock, life: P.life || 1.4 });
    }
  } else if (a.b === "nova") {
    const R = P.radius || 140;
    ring(p.x, p.y - 10, R, col, 0.45); burst(p.x, p.y - 10, col, 24, 300);
    for (const e of GS.enemies) if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 < (R + e.r) ** 2) hitEnemy(e, P.dmg || 20, Object.assign({}, fx, { knock: P.knock || 120 }));
    const rb = P.ring_bolts || 0;
    for (let i = 0; i < rb; i++) shoot(p.x, p.y - 20, i / rb * 6.283, { dmg: (P.dmg || 20) * 0.5, speed: 520, size: 6, col, life: 0.8 });
  } else if (a.b === "zone") {
    const t = P.target === "nearest" ? tgt : (clusterTarget(rng) || tgt);
    GS.zones.push({ x: t.x, y: t.y, r: P.radius || 90, dur: P.dur || 3, t: 0, dps: P.dps || (P.dmg || 10), col, slow: P.slow, pull: P.pull, burn: P.burn,
      strikes: P.strikes, kind: P.visual || "magic", tick: 0, friendly: true, move: P.move ? 90 : 0, ang: rnd(0, 6) });
  } else if (a.b === "strike") {
    const n = P.count || 1;
    for (let i = 0; i < n; i++) {
      const t = i === 0 ? tgt : (pick(GS.enemies.filter((e) => (e.x - p.x) ** 2 + (e.y - p.y) ** 2 < rng * rng)) || tgt);
      GS.strikes.push({ x: t.x + rnd(-20, 20), y: t.y + rnd(-20, 20), r: P.radius || 70, delay: (P.delay || 0.45) + i * 0.08, t: 0, dmg: P.dmg || 30, col, stun: P.stun, burn: P.burn, kind: P.visual || "meteor" });
    }
  } else if (a.b === "chain") {
    let cur = { x: p.x, y: p.y - 20 }; const hit = new Set();
    for (let j = 0; j < (P.jumps || 3) + 1; j++) {
      let n = null, bd = (j === 0 ? rng : (P.jump_range || 200)) ** 2;
      for (const e of GS.enemies) if (!hit.has(e)) { const d = (e.x - cur.x) ** 2 + (e.y - cur.y) ** 2; if (d < bd) { bd = d; n = e; } }
      if (!n) break; hit.add(n);
      GS.beams.push({ x1: cur.x, y1: cur.y, x2: n.x, y2: n.y - n.r * 0.6, col, life: 0.25 });
      hitEnemy(n, (P.dmg || 20) * Math.pow(0.9, j), fx); cur = { x: n.x, y: n.y - n.r * 0.6 };
    }
    AUDIO.play("zap");
  } else if (a.b === "melee") {
    const R = P.radius || 100, a0 = Math.atan2(tgt.y - p.y, tgt.x - p.x), arc = (P.arc || 140) * Math.PI / 180;
    GS.rings.push({ x: p.x, y: p.y - 18, r: R, col, life: 0.22, max: 0.22, arc: [a0 - arc / 2, a0 + arc / 2] });
    for (const e of GS.enemies) {
      if (Math.hypot(e.x - p.x, e.y - p.y) > R + e.r) continue;
      let da = Math.atan2(e.y - p.y, e.x - p.x) - a0; da = Math.atan2(Math.sin(da), Math.cos(da));
      if (Math.abs(da) < arc / 2 + 0.3) hitEnemy(e, P.dmg || 25, fx);
    }
  } else if (a.b === "wave") {
    const ang = Math.atan2(tgt.y - p.y, tgt.x - p.x);
    for (let i = -2; i <= 2; i++) shoot(p.x, p.y - 16, ang + i * 0.1, { dmg: P.dmg || 20, speed: P.speed || 520, size: 16, col, shape: "wave", pierce: 99, slow: P.slow, knock: P.knock || 140, life: 0.9 });
  } else if (a.b === "summon") {
    if (GS.summons.length < 1 + Math.floor(a.lvl / 4)) GS.summons.push({ x: p.x + 40, y: p.y, hp: 1, t: P.time || 12, dmg: (P.dmg || 15), col, cd: 0, r: 18 });
  } else if (a.b === "shield") {
    p.shield = Math.max(p.shield || 0, (P.amount || 30) * (1 + 0.15 * (a.lvl - 1)));
    ring(p.x, p.y - 20, 50, col, 0.5);
  }
  a.cd = P.cd || 1.5; a.casts++;
  if (a.b === "bolt") AUDIO.play("shot");
}
function orbitTick(a, dt) {
  const p = GS.player, P = a.p, n = P.count || 3, R = P.radius || 80;
  a.orbA += dt * Math.max(3.6, P.speed ? P.speed / 100 : 0);
  for (let i = 0; i < n; i++) {
    const ang = a.orbA + i / n * 6.283, x = p.x + Math.cos(ang) * R, y = p.y - 20 + Math.sin(ang) * R * 0.8;
    for (const e of GS.enemies) {
      if ((e.x - x) ** 2 + (e.y - e.r * 0.5 - y) ** 2 > (e.r + (P.size || 10)) ** 2) continue;
      const last = a.orbHit.get(e) || 0;
      if (GS.time - last < (P.hit_cd || 0.5)) continue;
      a.orbHit.set(e, GS.time); hitEnemy(e, P.dmg || 12, { knock: P.knock || 60, burn: P.burn, slow: P.slow });
    }
  }
}
// ---- «Аватар стихий»: четыре духа на мандале, лучи в врагов и раз в три залпа — схождение стихий
function avatarTick(a, dt) {
  const p = GS.player, P = a.p;
  a.orbA += dt * 3.2;
  a.cd -= dt;
  if (a.cd > 0) return;
  const tgts = GS.enemies.filter((e) => (e.x - p.x) ** 2 + (e.y - p.y) ** 2 < 520 * 520).sort((u, v) => dist2(u, p) - dist2(v, p)).slice(0, 4);
  if (!tgts.length) { a.cd = 0.2; return; }
  a.casts++;
  const els = ["F", "W", "E", "A"], dmg = (P.dmg || 40) * 1.2;
  els.forEach((el, i) => {
    const ang = a.orbA + i * Math.PI / 2, sx = p.x + Math.cos(ang) * 64, sy = p.y - 30 + Math.sin(ang) * 40;
    const t = tgts[i % tgts.length], col = hexRGB(DATA.elements[el].color);
    GS.beams.push({ x1: sx, y1: sy, x2: t.x, y2: t.y - t.r * 0.6, col, life: 0.35, wide: true });
    hitEnemy(t, dmg, { burn: el === "F" ? [8, 2] : null, slow: el === "W" ? [0.6, 1.5] : null, stun: el === "E" ? 0.4 : 0, knock: el === "A" ? 120 : 0 });
    burst(t.x, t.y - t.r * 0.6, col, 6, 160);
  });
  if (a.casts % 3 === 0) {               // схождение стихий
    GS.avatarBloom = { x: p.x, y: p.y - 20, t: 0 };
    GS.shake = 8; AUDIO.play("boom");
    for (const e of GS.enemies) if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 < 260 * 260) hitEnemy(e, dmg * 2.2, { stun: 0.6, knock: 200 });
  } else AUDIO.play("zap");
  a.cd = Math.max(0.6, (P.cd || 2.2) * 0.9);
}

// ---------------------------------------------------------------- враги
const RANGED = new Set(["shaman", "spitter", "cultist", "summoner", "frostling", "lich"]);
function spawnEnemy(kind, x, y, boss = false) {
  const D = DATA.enemies[kind] || DATA.enemies.ghoul;
  const k = 1 + GS.wave * 0.13, A = BIOME_ART[GS.bid];
  const base = hexRGB(DATA.elements[pick(["F", "W", "E", "A"])].color);
  const e = { kind, x, y, r: boss ? Math.max(46, D.r * 1.5) : D.r * 1.15, hp: D.hp * k * (boss ? (GS.floor && GS.floor.fi === 0 ? 3 : 4.5 + GS.floor.fi) : 1), dmg: D.dmg * (1 + GS.wave * 0.05) * (boss ? 1.4 : 1),
    speed: D.speed * (boss ? 0.95 : 1.18), boss, flash: 0, stun: 0, slow: 1, slowT: 0, burnT: 0, burnDps: 0, kx: 0, ky: 0, t: rnd(0, 6), atk: rnd(1, 3),
    col: mixc(A.monster, base, 0.35), curseUntil: 0, ranged: RANGED.has(kind), pattern: 0 };
  e.maxhp = e.hp;
  unstick(e);
  GS.enemies.push(e);
  if (boss) { GS.boss = e; e.name = nm(D); }
  return e;
}
// враг не должен застрять в яме, камне или стене — иначе комнату не зачистить
function unstick(e) {
  if (!GS.floor || walkable(e.x, e.y, e.r * 0.6)) return;
  const m = roomAt(e.x, e.y) || GS.cur || GS.floor.rooms[0];
  for (let k = 0; k < 40; k++) {
    const [x, y] = randomInRoom(m, GS.player, 160);
    if (walkable(x, y, e.r * 0.6)) { e.x = x; e.y = y; return; }
  }
  e.x = m.cx; e.y = m.cy;
}
function enemyTick(e, dt) {
  const p = GS.player;
  e.t += dt; e.flash -= dt;
  if (!walkable(e.x, e.y, e.r * 0.6)) { e.stuckT = (e.stuckT || 0) + dt; if (e.stuckT > 0.8) { e.stuckT = 0; unstick(e); } } else e.stuckT = 0;
  if (e.burnT > 0) { e.burnT -= dt; e.hp -= e.burnDps * dt; if (Math.random() < 0.3) GS.parts.push({ x: e.x + rnd(-6, 6), y: e.y - e.r, vx: 0, vy: -50, life: 0.4, max: 0.4, col: [255, 140, 60], size: 3, g: true }); if (e.hp <= 0) return killEnemy(e); }
  if (e.slowT > 0) { e.slowT -= dt; if (e.slowT <= 0) e.slow = 1; }
  if (e.kx || e.ky) moveIn(e, e.x + e.kx * dt, e.y + e.ky * dt, e.r * 0.6); e.kx *= Math.pow(0.02, dt); e.ky *= Math.pow(0.02, dt);
  if (e.stun > 0) { e.stun -= dt; return; }
  const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1;
  let sp = e.speed * e.slow * (p.invis > 0 ? 0.3 : 1);
  if (e.boss) return bossTick(e, dt, dx, dy, d);
  if (e.ranged) {
    const want = d > 300 ? 1 : d < 220 ? -1 : 0;
    moveIn(e, e.x + dx / d * sp * want * dt, e.y + dy / d * sp * want * dt, e.r * 0.6);
    e.atk -= dt;
    if (e.atk <= 0 && d < 560 && p.invis <= 0) { e.atk = rnd(1.8, 2.8); shoot(e.x, e.y - e.r, Math.atan2(dy, dx), { dmg: e.dmg, speed: 260, size: 7, col: [200, 110, 255], friendly: false, life: 3 }); }
  } else {
    if (e.kind === "charger" || e.kind === "hunter") {
      e.atk -= dt;
      if (e.atk <= 0 && d < 340) { e.atk = 3; e.kx = dx / d * 620; e.ky = dy / d * 620; }
    }
    moveIn(e, e.x + dx / d * sp * dt, e.y + dy / d * sp * dt, e.r * 0.6);
  }
  if (d < e.r + p.r) {
    if (e.kind === "bomber") { ring(e.x, e.y, 90, [255, 140, 60], 0.4); hurtPlayer(e.dmg * 2); killEnemy(e); return; }
    hurtPlayer(e.dmg);
  }
}
function bossTick(e, dt, dx, dy, d) {
  const sp = e.speed * e.slow;
  moveIn(e, e.x + dx / d * sp * 0.75 * dt, e.y + dy / d * sp * 0.75 * dt, e.r * 0.6);
  e.atk -= dt;
  const phase2 = e.hp < e.maxhp * 0.5;
  if (e.atk <= 0) {
    e.pattern = (e.pattern + 1) % 4;
    e.atk = phase2 ? 2.2 : 3.0;
    const col = [255, 120, 160];
    if (e.pattern === 0) { const n = phase2 ? 22 : 16, off = rnd(0, 1); for (let i = 0; i < n; i++) shoot(e.x, e.y - e.r, (i + off) / n * 6.283, { dmg: e.dmg * 0.6, speed: 220, size: 9, col, friendly: false, life: 5 }); }
    else if (e.pattern === 1) { const a0 = Math.atan2(dy, dx); for (let i = -3; i <= 3; i++) shoot(e.x, e.y - e.r, a0 + i * 0.16, { dmg: e.dmg * 0.6, speed: 330, size: 8, col: [255, 200, 120], friendly: false, life: 4 }); }
    else if (e.pattern === 2) { for (let i = 0; i < (phase2 ? 7 : 5); i++) GS.strikes.push({ x: GS.player.x + rnd(-160, 160), y: GS.player.y + rnd(-120, 120), r: 80, delay: 0.9, t: 0, dmg: e.dmg, col: [255, 90, 90], kind: "meteor", enemy: true }); }
    else { const kinds = Object.keys(DATA.biomes[GS.biome].kinds); for (let i = 0; i < 4; i++) { const x = e.x + rnd(-90, 90), y = e.y + rnd(-90, 90); if (walkable(x, y, 10)) GS.spawnFx.push({ x, y, t: 0.5, kind: pick(kinds) }); } }
  }
  if (d < e.r + GS.player.r) hurtPlayer(e.dmg);
}

// ---------------------------------------------------------------- волны
function startWave() {
  GS.wave++;
  GS.waveStart = GS.time;
  const inBiome = (GS.wave - 1) % 5;
  const bossWave = GS.wave % 5 === 0;
  GS.spawnLeft = bossWave ? 6 : 10 + GS.wave * 4;
  GS.spawnT = 0.5;
  GS.banner = { title: L("Волна ", "Wave ") + GS.wave, sub: bossWave ? L("Идёт страж!", "A guardian approaches!") : "", t: 2.2 };
  if (bossWave) {
    const kind = DATA.bossOf[GS.bid] || "brute", a = rnd(0, 6.28);
    spawnEnemy(kind, clamp(GS.player.x + Math.cos(a) * 520, 80, ARENA.w - 80), clamp(GS.player.y + Math.sin(a) * 420, 80, ARENA.h - 80), true);
    GS.banner.sub = GS.boss.name;
  }
}
function waveTick(dt) {
  if (GS.spawnLeft > 0) {
    GS.spawnT -= dt;
    if (GS.spawnT <= 0) {
      GS.spawnT = Math.max(0.12, 0.6 - GS.wave * 0.02);
      const kinds = Object.entries(DATA.biomes[GS.biome].kinds).filter(([k, w]) => w <= (GS.wave - 1) % 5 + 2).map(([k]) => k);
      const kind = pick(kinds.length ? kinds : Object.keys(DATA.biomes[GS.biome].kinds));
      const a = rnd(0, 6.28), R = Math.hypot(V.W, V.H) * 0.55;
      spawnEnemy(kind, clamp(GS.player.x + Math.cos(a) * R, 40, ARENA.w - 40), clamp(GS.player.y + Math.sin(a) * R, 40, ARENA.h - 40));
      GS.spawnLeft--;
    }
  } else if (GS.enemies.length === 0 || (!GS.boss && GS.time - (GS.waveStart || 0) > 40)) {
    // волна заканчивается, когда враги перебиты — или через 40 секунд (темп не буксует)
    GS.waveDelay -= dt;
    if (GS.waveDelay <= 0) {
      GS.waveDelay = 2.5;
      if (GS.bossDown) {
        GS.bossDown = false;
        if (GS.wave >= 30) { GS.mode = "win"; saveBest(); return; }
        setBiome(Math.min(DATA.biomes.length - 1, GS.biome + 1));
        GS.player.hp = GS.player.maxhp;
      }
      if (GS.cardQueue.length) { openCards(); return; }
      startWave();
    }
  }
}

// ---------------------------------------------------------------- опыт и уровни
function xpNext(l) { return Math.round(5 + l * 4 + l * l * 0.6); }
function gainXp(v) {
  const p = GS.player;
  p.xp += v;
  while (p.xp >= xpNext(p.lvl)) { p.xp -= xpNext(p.lvl); p.lvl++; GS.cardQueue.push("level"); AUDIO.play("level"); ring(p.x, p.y - 20, 120, [255, 230, 150], 0.6); }
  if (GS.cardQueue.length && GS.mode === "play") openCards();
}

// ---------------------------------------------------------------- карточки
const PERKS = {
  dmg: ["Сила стихий", "Elemental Power", "+15% урона всему", "+15% damage to everything", 5],
  hp: ["Крепость", "Fortitude", "+25 к здоровью и лечение", "+25 health and a heal", 6],
  speed: ["Лёгкие ноги", "Light Feet", "+10% скорости бега", "+10% move speed", 4],
  cdr: ["Сосредоточенность", "Focus", "перезарядка способностей −10%", "ability cooldowns −10%", 5],
  regen: ["Живая вода", "Living Water", "+0.8 здоровья в секунду", "+0.8 health per second", 4],
  magnet: ["Магнит", "Magnet", "опыт притягивается на 50% дальше", "experience is pulled 50% farther", 3],
  dash: ["Ещё рывок", "Extra Dash", "+1 заряд рывка", "+1 dash charge", 2],
  armor: ["Каменная кожа", "Stone Skin", "+6% брони", "+6% armor", 4],
};
const BASIC_UPS = {
  count: ["+1 снаряд к атаке", "+1 attack projectile", 3], dmg: ["+25% урона атаки", "+25% attack damage", 6], rate: ["+15% скорости атаки", "+15% attack speed", 5],
};
function elementCard(e) {
  const br = GS.branches;
  let best = null;
  for (let i = 0; i <= br.length && i < 4; i++) {
    const old = br[i] || "", [or] = resolve(old), [nr, nl] = resolve(old + e);
    const kind = !or ? "new" : nr.id !== or.id ? "evolve" : "level";
    if (kind === "level" && nl >= MAXLVL && old) continue;
    if (br.some((s2, j) => j !== i && resolve(s2)[0].id === nr.id)) continue;
    const sc = { evolve: 3, new: i < 4 && br.length < 4 ? 2 : -1, level: 1 }[kind] + Math.random() * 0.9;
    if (kind === "new" && i !== br.length) continue;
    if (!best || sc > best.sc) best = { sc, row: i, kind, rec: nr, lvl: nl, e };
  }
  if (!best) return null;
  const k = best.kind, r = best.rec;
  return { type: "elem", e, row: best.row, rec: r, lvl: best.lvl, rar: k === "evolve" ? 2 : k === "new" ? 1 : 0,
    title: nm(r) + (k === "level" ? " " + best.lvl : ""), tag: { evolve: L("ЭВОЛЮЦИЯ", "EVOLUTION"), new: L("НОВЫЙ НАВЫК", "NEW SKILL"), level: L("УРОВЕНЬ", "LEVEL UP") }[k],
    desc: L(r.d_ru, r.d_en) };
}
function rollCards(kind) {
  const p = GS.player;
  if (kind === "start") return ORDER.slice().sort(() => Math.random() - 0.5).slice(0, 4).map((e) => elementCard(e)).filter(Boolean);
  if (kind === "chest") {
    const all = elemsAvail().map((e) => elementCard(e)).filter(Boolean).sort((a, b) => b.rar - a.rar + Math.random() - 0.5).slice(0, 3);
    all.forEach((c) => (c.rar = Math.max(c.rar, 2)));
    return all;
  }
  if (kind === "unlock") {
    const left = DATA.extra.filter((e) => !GS.extra.includes(e));
    return left.sort(() => Math.random() - 0.5).slice(0, 3).map((e) => ({ type: "unlock", e, rar: 3, title: nm(DATA.elements[e]),
      tag: L("НОВАЯ СТИХИЯ", "NEW ELEMENT"), desc: L(DATA.elements[e].passive_ru, DATA.elements[e].passive_en) }));
  }
  const pool = [];
  const els = elemsAvail().slice().sort(() => Math.random() - 0.5);
  for (const e of els) { const c = elementCard(e); if (c) pool.push(c); }
  pool.sort((a, b) => b.rar - a.rar + Math.random() - 0.5);
  const out = pool.slice(0, 2);
  const extras = [];
  for (const k in PERKS) if ((p.perks[k] || 0) < PERKS[k][4]) extras.push({ type: "perk", k, rar: 0, title: L(PERKS[k][0], PERKS[k][1]), tag: L("ГЕРОЙ", "HERO"), desc: L(PERKS[k][2], PERKS[k][3]) });
  for (const k in BASIC_UPS) if ((p.basic[k] || 0) < BASIC_UPS[k][2]) extras.push({ type: "basic", k, rar: 0, title: L(BASIC_UPS[k][0], BASIC_UPS[k][1]), tag: L("АТАКА", "ATTACK"), desc: L("Улучшает основную атаку героя.", "Improves the hero's basic attack.") });
  out.push(pick(extras));
  if (hasItem("crown") && pool[3]) out.push(pool[3]);
  if (Math.random() < 0.5 && pool[2]) out.push(pool[2]); else if (extras.length > 1) out.push(pick(extras.filter((x) => x !== out[2])));
  return out.slice(0, hasItem("crown") ? 4 : 3);
}
function openCards() {
  if (!GS.cardQueue.length) return;
  const kind = GS.cardQueue.shift();
  const cards = rollCards(kind);
  if (!cards.length) { if (GS.cardQueue.length) openCards(); return; }
  GS.cards = cards; GS.cardKind = kind; GS.cardT = 0; GS.mode = "cards";
}
function chooseCard(i) {
  const c = GS.cards[i]; if (!c) return;
  const p = GS.player;
  AUDIO.play("card");
  if (c.type === "elem") {
    if (c.row >= GS.branches.length) GS.branches.push(c.e); else GS.branches[c.row] += c.e;
    rebuildAbilities();
    text(p.x, p.y - 80, c.title, recColor(c.rec), true);
  } else if (c.type === "unlock") { GS.extra.push(c.e); GS.cardQueue.unshift("level"); }
  else if (c.type === "perk") { p.perks[c.k] = (p.perks[c.k] || 0) + 1; if (c.k === "hp") p.hp = Math.min(p.maxhp + 25, p.hp + 40); recalc(); }
  else if (c.type === "basic") { p.basic[c.k] = (p.basic[c.k] || 0) + 1; }
  recalc();
  GS.cards = null;
  if (GS.cardQueue.length) { openCards(); return; }
  GS.mode = "play";
}

// ---------------------------------------------------------------- шаг симуляции
function update(dt) {
  GS.t += dt;
  if (GS.hitstop > 0 && GS.mode === "play") { GS.hitstop -= dt; return; }
  if (GS.mode !== "play") { if (GS.mode === "story") GS.storyT += dt; if (GS.mode === "cards") GS.cardT += dt; if (GS.mode === "dead") GS.deadT += dt; return; }
  GS.time += dt;
  const p = GS.player;
  p.t += dt; p.inv -= dt; p.invis -= dt; p.atk = Math.max(0, p.atk - dt * 4); p.hurtFlash -= dt;
  p.hp = Math.min(p.maxhp, p.hp + p.regen * dt);
  p.dashCd -= dt;
  if (p.dashCd <= 0 && p.charges < p.dashMax) { p.charges++; p.dashCd = 1.6; }
  if (IN.dash) { IN.dash = false; doDash(); }
  if (p.dashT > 0) dashTick(dt);
  else {
    const [mx, my] = moveVector();
    moveIn(p, p.x + mx * p.speed * dt, p.y + my * p.speed * dt, p.r);
    if (mx) p.face = mx > 0 ? 1 : -1;
    p.moving = !!(mx || my);
  }
  basicAttack(dt);
  for (const a of GS.abilities) abilityTick(a, dt);
  for (const e of GS.enemies) if (!e.dead) enemyTick(e, dt);
  // раздвигаем врагов, чтобы не слипались
  for (let i = 0; i < GS.enemies.length; i++) {
    const a = GS.enemies[i];
    for (let j = i + 1; j < Math.min(GS.enemies.length, i + 14); j++) {
      const b = GS.enemies[j], dx = a.x - b.x, dy = a.y - b.y, rr = (a.r + b.r) * 0.9, d2 = dx * dx + dy * dy;
      if (d2 > 0 && d2 < rr * rr) { const d = Math.sqrt(d2), k = (rr - d) * 0.3 / d; a.x += dx * k; a.y += dy * k; b.x -= dx * k; b.y -= dy * k; }
    }
  }
  GS.enemies = GS.enemies.filter((e) => !e.dead);
  projTick(dt); zoneTick(dt); strikeTick(dt); summonTick(dt);
  for (const g of GS.gems) {
    g.t += dt;
    const d = Math.hypot(p.x - g.x, p.y - g.y);
    if (d < p.magnet || g.pull) { g.pull = true; g.x += (p.x - g.x) / d * 520 * dt; g.y += (p.y - g.y) / d * 520 * dt; }
    if (d < 24) { g.dead = true; if (g.heart) { p.hp = Math.min(p.maxhp, p.hp + p.maxhp * 0.25); text(p.x, p.y - 60, "+♥", [255, 120, 140], true); } else { gainXp(g.v); AUDIO.play("gem"); } }
  }
  GS.gems = GS.gems.filter((g) => !g.dead);
  for (const q of GS.parts) { q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 120 * dt; q.life -= dt; }
  GS.parts = GS.parts.filter((q) => q.life > 0); if (GS.parts.length > 700) GS.parts.splice(0, GS.parts.length - 700);
  for (const t of GS.texts) { t.y -= 40 * dt; t.life -= dt; }
  GS.texts = GS.texts.filter((t) => t.life > 0);
  for (const b of GS.beams) b.life -= dt; GS.beams = GS.beams.filter((b) => b.life > 0);
  for (const r of GS.rings) r.life -= dt; GS.rings = GS.rings.filter((r) => r.life > 0);
  if (GS.avatarBloom) { GS.avatarBloom.t += dt; if (GS.avatarBloom.t > 0.9) GS.avatarBloom = null; }
  if (GS.banner) { GS.banner.t -= dt; if (GS.banner.t <= 0) GS.banner = null; }
  GS.shake = Math.max(0, GS.shake - 30 * dt);
  roomTick(dt);
  isaacTick(dt);
  if (GS.comboT > 0) { GS.comboT -= dt; if (GS.comboT <= 0) GS.combo = 0; }
  // камера
  const Z = zoom(), vw = V.W / Z, vh = V.H / Z;
  const [lmx, lmy] = moveVector();
  GS.look = GS.look || { x: 0, y: 0 };
  GS.look.x += (lmx * 90 - GS.look.x) * Math.min(1, dt * 3); GS.look.y += (lmy * 60 - GS.look.y) * Math.min(1, dt * 3);
  const tx = p.x + GS.look.x - vw / 2, ty = p.y - 30 + GS.look.y - vh / 2;
  GS.cam.x += (tx - GS.cam.x) * Math.min(1, dt * 7); GS.cam.y += (ty - GS.cam.y) * Math.min(1, dt * 7);
  GS.cam.x = clamp(GS.cam.x, -200, GS.floor.w - vw + 200); GS.cam.y = clamp(GS.cam.y, -200, GS.floor.h - vh + 200);
}
function projTick(dt) {
  const p = GS.player;
  for (const q of GS.projs) {
    q.t += dt; q.life -= dt;
    if (q.homing && q.friendly) { const e = nearestEnemy(q.x, q.y, 300); if (e) { const a = Math.atan2(e.y - e.r * 0.5 - q.y, e.x - q.x), sp = Math.hypot(q.vx, q.vy), cur = Math.atan2(q.vy, q.vx); let da = Math.atan2(Math.sin(a - cur), Math.cos(a - cur)); const na = cur + clamp(da, -q.homing * dt, q.homing * dt); q.vx = Math.cos(na) * sp; q.vy = Math.sin(na) * sp; } }
    if (q.returning && q.t > 0.45 && !q.back) { q.back = true; }
    if (q.back) { const a = Math.atan2(p.y - 20 - q.y, p.x - q.x), sp = Math.hypot(q.vx, q.vy); q.vx = Math.cos(a) * sp; q.vy = Math.sin(a) * sp; if (Math.hypot(p.x - q.x, p.y - q.y) < 30) q.life = 0; }
    q.x += q.vx * dt; q.y += q.vy * dt;
    if (q.friendly) {
      for (const e of GS.enemies) {
        if (q.hit.has(e) || (e.x - q.x) ** 2 + (e.y - e.r * 0.5 - q.y) ** 2 > (e.r + q.r) ** 2) continue;
        q.hit.add(e);
        if (!q.explode) hitEnemy(e, q.dmg, { burn: q.burn, slow: q.slow, stun: q.stun, knock: q.knock, basic: q.basic, curse: q.curse });
        q.pierce--;
        if (q.pierce <= 0) { q.life = 0; break; }
      }
      if (q.life <= 0) {
        if (q.explode) { ring(q.x, q.y, q.explode, q.col, 0.3); burst(q.x, q.y, q.col, 12, 220); for (const e of GS.enemies) if ((e.x - q.x) ** 2 + (e.y - q.y) ** 2 < (q.explode + e.r) ** 2) hitEnemy(e, q.dmg, { burn: q.burn, slow: q.slow, stun: q.stun, basic: q.basic }); }
        if (q.split) for (let i = 0; i < q.split; i++) shoot(q.x, q.y, rnd(0, 6.28), { dmg: q.dmg * 0.4, speed: 450, size: Math.max(3, q.r * 0.6), col: q.col, life: 0.5 });
      }
    } else if ((p.x - q.x) ** 2 + (p.y - 20 - q.y) ** 2 < (p.r + q.r) ** 2) { hurtPlayer(q.dmg); q.life = 0; }
    if (q.friendly && hitProps(q.x, q.y, q.r)) { q.pierce--; if (q.pierce <= 0) q.life = 0; }
    if (!walkable(q.x, q.y, 0, true)) { if (q.life > 0 && q.explode && q.friendly) q.life = 0.0001; else q.life = 0; }
  }
  GS.projs = GS.projs.filter((q) => q.life > 0);
}
function zoneTick(dt) {
  for (const z of GS.zones) {
    z.t += dt; z.tick -= dt;
    if (z.move) { z.ang += rnd(-1, 1) * dt; z.x += Math.cos(z.ang) * z.move * dt; z.y += Math.sin(z.ang) * z.move * dt; }
    if (z.pull) for (const e of GS.enemies) { const d = Math.hypot(z.x - e.x, z.y - e.y); if (d < z.r * 1.4 && d > 8 && !e.boss) { e.x += (z.x - e.x) / d * z.pull * dt; e.y += (z.y - e.y) / d * z.pull * dt; } }
    if (z.tick <= 0) {
      z.tick = 0.25;
      for (const e of GS.enemies) if ((e.x - z.x) ** 2 + (e.y - z.y) ** 2 < (z.r + e.r) ** 2) hitEnemy(e, z.dps * 0.25, { slow: z.slow, burn: z.burn });
      if (z.strikes && Math.random() < 0.5) { const a = rnd(0, 6.28), rr = z.r * Math.sqrt(Math.random()); GS.strikes.push({ x: z.x + Math.cos(a) * rr, y: z.y + Math.sin(a) * rr, r: z.strikes[2] || 40, delay: 0.25, t: 0, dmg: z.strikes[1] || 15, col: z.col, kind: "bolt" }); }
    }
  }
  GS.zones = GS.zones.filter((z) => z.t < z.dur);
}
function strikeTick(dt) {
  const p = GS.player;
  for (const s of GS.strikes) {
    s.t += dt;
    if (!s.done && s.t >= s.delay) {
      s.done = true;
      burst(s.x, s.y, s.col, 14, 240); ring(s.x, s.y, s.r, s.col, 0.35);
      if (s.enemy) { if ((p.x - s.x) ** 2 + (p.y - s.y) ** 2 < (s.r + p.r) ** 2) hurtPlayer(s.dmg); }
      else for (const e of GS.enemies) if ((e.x - s.x) ** 2 + (e.y - s.y) ** 2 < (s.r + e.r) ** 2) hitEnemy(e, s.dmg, { stun: s.stun, burn: s.burn });
      GS.shake = Math.max(GS.shake, 3);
    }
  }
  GS.strikes = GS.strikes.filter((s) => s.t < s.delay + 0.3);
}
function summonTick(dt) {
  const p = GS.player;
  for (const s of GS.summons) {
    s.t -= dt; s.cd -= dt;
    const e = nearestEnemy(s.x, s.y, 500);
    const tx = e ? e.x : p.x + 50, ty = e ? e.y : p.y;
    const d = Math.hypot(tx - s.x, ty - s.y) || 1;
    if (d > 30) { s.x += (tx - s.x) / d * 200 * dt; s.y += (ty - s.y) / d * 200 * dt; }
    if (e && d < 50 && s.cd <= 0) { s.cd = 0.7; hitEnemy(e, s.dmg, { knock: 100 }); ring(s.x, s.y, 50, s.col, 0.2); }
  }
  GS.summons = GS.summons.filter((s) => s.t > 0);
}
