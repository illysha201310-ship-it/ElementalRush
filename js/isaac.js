// В духе The Binding of Isaac: разные комнаты с препятствиями, артефакты, монеты и лавка, тайные комнаты, пасхалки, сюжет.
"use strict";
const STORY = [
  { ru: "2387 год. Ковчег «Надежда» с последними колонистами садится на планету Элария.", en: "The year 2387. The ark “Hope” lands on the planet Elaria with the last colonists." },
  { ru: "Но у Эларии есть хозяева — древние боги стихий. Они не хотят делиться миром с людьми.", en: "But Elaria has masters — the ancient gods of the elements. They will not share their world with humans." },
  { ru: "Боги заперли планету в подземельях и выставили стражей на каждом этаже.", en: "The gods sealed the planet in dungeons and set a guardian on every floor." },
  { ru: "Ты — первый колонист, впитавший силу стихий. Отвоюй мир у богов, этаж за этажом.", en: "You are the first colonist to absorb the power of the elements. Take the world back from the gods, floor by floor." },
];

// ---------------------------------------------------------------- артефакты
const ITEMS = {
  tear: { i: "💧", ru: "Слеза богини", en: "Goddess's Tear", d_ru: "+1 снаряд к атаке", d_en: "+1 attack projectile" },
  heart: { i: "❤️", ru: "Кровавое сердце", en: "Blood Heart", d_ru: "+30 к здоровью", d_en: "+30 max health" },
  boots: { i: "👢", ru: "Сапоги ветров", en: "Wind Boots", d_ru: "+15% скорости", d_en: "+15% speed" },
  lens: { i: "🔍", ru: "Линза фокуса", en: "Focus Lens", d_ru: "+20% урона", d_en: "+20% damage" },
  hourglass: { i: "⏳", ru: "Песочные часы", en: "Hourglass", d_ru: "перезарядка навыков −15%", d_en: "skill cooldowns −15%" },
  magnet: { i: "🧲", ru: "Магнит колониста", en: "Colonist's Magnet", d_ru: "кристаллы и монеты летят к тебе", d_en: "gems and coins fly to you" },
  cat: { i: "🐈‍⬛", ru: "Чёрный кот", en: "Black Cat", d_ru: "+10% шанс крита", d_en: "+10% crit chance" },
  arkshield: { i: "🛡️", ru: "Щит ковчега", en: "Ark Shield", d_ru: "в каждой комнате блокирует первый удар", d_en: "blocks the first hit in every room" },
  horn: { i: "📯", ru: "Рог странника", en: "Wanderer's Horn", d_ru: "+1 заряд рывка", d_en: "+1 dash charge" },
  fireheart: { i: "🔥", ru: "Пылающее сердце", en: "Burning Heart", d_ru: "атаки поджигают", d_en: "attacks burn" },
  icesoul: { i: "❄️", ru: "Ледяная душа", en: "Ice Soul", d_ru: "атаки замедляют", d_en: "attacks slow" },
  stormstone: { i: "⚡", ru: "Грозовой камень", en: "Storm Stone", d_ru: "атаки иногда бьют цепной молнией", d_en: "attacks sometimes chain lightning" },
  fang: { i: "🦷", ru: "Кольцо вампира", en: "Vampire Ring", d_ru: "удары лечат", d_en: "hits heal you" },
  phoenix: { i: "🪶", ru: "Перо феникса", en: "Phoenix Feather", d_ru: "один раз спасает от смерти", d_en: "saves you from death once" },
  compass: { i: "🧭", ru: "Компас", en: "Compass", d_ru: "видны все комнаты и тайники", d_en: "reveals all rooms and secrets" },
  drone: { i: "🛸", ru: "Дрон колонистов", en: "Colony Drone", d_ru: "дрон летает рядом и стреляет", d_en: "a drone flies beside you and shoots" },
  crown: { i: "👑", ru: "Корона выбора", en: "Crown of Choice", d_ru: "4 карточки вместо 3", d_en: "4 cards instead of 3" },
  star: { i: "🌟", ru: "Сердце звезды", en: "Star Heart", d_ru: "+20 здоровья и полное лечение", d_en: "+20 health and a full heal" },
  clover: { i: "🍀", ru: "Клевер", en: "Clover", d_ru: "больше монет и сердец", d_en: "more coins and hearts" },
  eye: { i: "👁️", ru: "Глаз бури", en: "Storm Eye", d_ru: "глаз кружит вокруг и бьёт врагов", d_en: "an eye orbits you and hits enemies" },
  bomb: { i: "💣", ru: "Гнев колонии", en: "Colony's Wrath", d_ru: "враги взрываются при смерти", d_en: "enemies explode on death" },
  mirror: { i: "🪞", ru: "Зеркало", en: "Mirror", d_ru: "иногда атака повторяется", d_en: "attacks sometimes repeat" },
};
const hasItem = (k) => GS.player && GS.player.items && GS.player.items.includes(k);
function giveItem(k) {
  const p = GS.player; p.items.push(k);
  if (k === "heart") p.hp += 30;
  if (k === "star") { recalc(); p.hp = p.maxhp + 20; }
  if (k === "tear") p.basic.count = (p.basic.count || 0) + 1;
  recalc(); p.hp = Math.min(p.hp, p.maxhp);
  if (k === "compass") for (const m of GS.floor.rooms) m.seen = true;
  GS.itemBanner = { k, t: 3 };
  AUDIO.play("level"); burst(p.x, p.y - 30, [255, 230, 150], 30, 260);
}
function randomItem() {
  const left = Object.keys(ITEMS).filter((k) => !GS.player.items.includes(k));
  return left.length ? pick(left) : "star";
}

// ---------------------------------------------------------------- препятствия и планировки комнат
// координаты в долях комнаты (0..1): rock — камень, pillar — колонна, pit — яма, spikes — шипы, pot — горшок
const LAYOUTS = [
  [],                                                                        // пустая арена
  [["pillar", 0.25, 0.3], ["pillar", 0.75, 0.3], ["pillar", 0.25, 0.7], ["pillar", 0.75, 0.7]],
  [["pit", 0.5, 0.5, 0.16]],
  [["rock", 0.2, 0.5], ["rock", 0.28, 0.5], ["rock", 0.72, 0.5], ["rock", 0.8, 0.5], ["rock", 0.5, 0.22], ["rock", 0.5, 0.78]],
  [["spikes", 0.5, 0.5, 0.18, 0.1], ["pillar", 0.2, 0.5], ["pillar", 0.8, 0.5]],
  [["pit", 0.3, 0.5, 0.1], ["pit", 0.7, 0.5, 0.1], ["rock", 0.5, 0.3], ["rock", 0.5, 0.7]],
  [["rock", 0.35, 0.35], ["rock", 0.4, 0.35], ["rock", 0.6, 0.65], ["rock", 0.65, 0.65], ["spikes", 0.5, 0.5, 0.08, 0.08]],
  [["pillar", 0.5, 0.35], ["pillar", 0.5, 0.65], ["pit", 0.2, 0.5, 0.08], ["pit", 0.8, 0.5, 0.08]],
  [["spikes", 0.3, 0.3, 0.1, 0.08], ["spikes", 0.7, 0.7, 0.1, 0.08], ["rock", 0.7, 0.3], ["rock", 0.3, 0.7]],
  [["rock", 0.15, 0.25], ["rock", 0.85, 0.25], ["rock", 0.15, 0.75], ["rock", 0.85, 0.75], ["pit", 0.5, 0.5, 0.07]],
];
function decorateRoom(m, fi) {
  m.obst = []; m.props = [];
  if (m.kind === "fight") {
    for (const o of pick(LAYOUTS)) {
      const [type, fx, fy, a, b] = o;
      const x = m.x + m.w * fx, y = m.y + m.h * fy;
      if (type === "pit") m.obst.push({ type, x, y, r: Math.min(m.w, m.h) * a });
      else if (type === "spikes") m.obst.push({ type, x: x - m.w * a, y: y - m.h * b, w: m.w * a * 2, h: m.h * b * 2 });
      else m.obst.push({ type, x, y, r: type === "pillar" ? 30 : 24, v: rndi(0, 2) });
    }
  }
  if (m.kind !== "boss" && m.kind !== "start") {      // разрушаемые горшки и ящики по углам
    const n = rndi(2, 5);
    for (let i = 0; i < n; i++) {
      const cx = Math.random() < 0.5 ? m.x + 70 + rnd(0, 60) : m.x + m.w - 70 - rnd(0, 60), cy = Math.random() < 0.5 ? m.y + 80 + rnd(0, 50) : m.y + m.h - 70 - rnd(0, 50);
      m.props.push({ type: Math.random() < 0.6 ? "pot" : "crate", x: cx, y: cy, r: 16, hp: 1 });
    }
  }
  if (m.kind === "treasure") m.pedestals = [{ x: m.cx, y: m.cy - 20, item: null }];
  if (m.kind === "shop") m.pedestals = [{ x: m.cx - 130, y: m.cy, item: null, price: 15 }, { x: m.cx, y: m.cy, heart: true, price: 5 }, { x: m.cx + 130, y: m.cy, item: null, price: 15 }];
  if (m.kind === "secret") {
    m.pedestals = [{ x: m.cx, y: m.cy - 10, item: null }];
    if (Math.random() < 0.3) m.golden = { x: m.cx, y: m.cy - 90, used: false };      // пасхалка: золотая статуя
    for (let i = 0; i < 8; i++) m.props.push({ type: "coin", x: m.cx + rnd(-120, 120), y: m.cy + rnd(30, 120), r: 10, hp: 0 });
  }
  if (m.kind === "start" && Math.random() < 0.35) m.cat = { x: m.x + m.w * 0.75, y: m.y + m.h * 0.65, pet: false };   // пасхалка: кот
}
// блокирует ли препятствие точку (proj — снаряд: ямы не мешают, как в Isaac)
function obstacleBlocks(m, x, y, r, proj) {
  if (!m.obst) return false;
  for (const o of m.obst) {
    if (o.type === "spikes") continue;
    if (o.type === "pit" && proj) continue;
    if ((x - o.x) ** 2 + (y - o.y) ** 2 < (o.r + r) ** 2) return true;
  }
  return false;
}

// ---------------------------------------------------------------- тайные комнаты: трещина в стене
function addSideRooms(F, bid) {
  const used = new Set(F.rooms.map((m) => Math.round(m.cx / CELL_W) + "," + Math.round(m.cy / CELL_H)));
  const mkSide = (kind) => {
    const cands = F.rooms.filter((m) => m.kind === "fight" || m.kind === "treasure");
    for (let t = 0; t < 40; t++) {
      const base = pick(cands), dir = pick([[0, -1], [0, 1], [1, 0], [-1, 0]]);
      const gx = Math.round((base.cx - CELL_W / 2) / CELL_W) + dir[0], gy = Math.round((base.cy - CELL_H / 2) / CELL_H) + dir[1];
      if (gy < 0 || gx < 0 || used.has(gx + "," + gy) || [...used].some((k) => k === gx + "," + gy)) continue;
      const cx = gx * CELL_W + CELL_W / 2, cy = gy * CELL_H + CELL_H / 2;
      if (F.rooms.some((m) => Math.abs(m.cx - cx) < 10 && Math.abs(m.cy - cy) < 10)) continue;
      used.add(gx + "," + gy);
      const w = 700, h = 520;
      const m = { i: F.rooms.length, kind, x: cx - w / 2, y: cy - h / 2, w, h, cx, cy, state: "clear", seen: false, waves: 0, ground: makeGround(bid, w, h), side: true };
      F.rooms.push(m);
      let c;
      if (dir[1] === 0) { const L = dir[0] > 0 ? base : m, R = dir[0] > 0 ? m : base; c = { x: L.x + L.w - WALL, y: L.cy - CORR_W / 2, w: R.x - (L.x + L.w) + 2 * WALL, h: CORR_W, horiz: true }; }
      else { const T = dir[1] > 0 ? base : m, B = dir[1] > 0 ? m : base; c = { x: T.cx - CORR_W / 2, y: T.y + T.h - WALL, w: CORR_W, h: B.y - (T.y + T.h) + 2 * WALL, horiz: false }; }
      c.a = base; c.b = m; c.hidden = kind === "secret";
      c.ground = makeGround(bid, Math.max(1, Math.round(c.w)), Math.max(1, Math.round(c.h)));
      // место трещины — середина стены у базовой комнаты
      c.crack = dir[1] === 0 ? { x: dir[0] > 0 ? base.x + base.w - WALL : base.x + WALL, y: base.cy } : { x: base.cx, y: dir[1] > 0 ? base.y + base.h - WALL : base.y + WALL };
      F.corrs.push(c);
      return m;
    }
    return null;
  };
  mkSide("shop");
  mkSide("secret");
  F.w = Math.max(...F.rooms.map((r) => r.x + r.w)) + 200; F.h = Math.max(...F.rooms.map((r) => r.y + r.h)) + 200;
}

// ---------------------------------------------------------------- игровой тик предметов и комнат
function isaacTick(dt) {
  const p = GS.player, F = GS.floor;
  // шипы ранят
  const m = roomAt(p.x, p.y);
  if (m && m.obst && p.dashT <= 0) for (const o of m.obst) if (o.type === "spikes" && p.x > o.x && p.x < o.x + o.w && p.y > o.y && p.y < o.y + o.h) hurtPlayer(8 + F.fi * 2);
  // пьедесталы
  for (const r of F.rooms) if (r.pedestals) for (const pd of r.pedestals) {
    if (!pd.item && !pd.heart && !pd.taken) pd.item = randomItem();
    if (pd.taken || (p.x - pd.x) ** 2 + (p.y - pd.y) ** 2 > 40 * 40) continue;
    if (pd.price) { if (p.coins < pd.price) { if (!pd.warn || GS.time - pd.warn > 1.5) { pd.warn = GS.time; text(pd.x, pd.y - 60, L("нужно монет: ", "coins needed: ") + pd.price, [255, 220, 120], true); } continue; } p.coins -= pd.price; }
    pd.taken = true;
    if (pd.heart) { p.hp = Math.min(p.maxhp, p.hp + p.maxhp * 0.4); text(pd.x, pd.y - 50, "+♥", [255, 120, 140], true); AUDIO.play("gem"); }
    else giveItem(pd.item);
  }
  // монеты и горшки
  for (const r of F.rooms) if (r.props) for (const o of r.props) {
    if (o.type === "coin" && !o.dead) {
      const d = Math.hypot(p.x - o.x, p.y - o.y);
      if (d < (hasItem("magnet") ? 260 : 90)) { o.x += (p.x - o.x) / d * 420 * dt; o.y += (p.y - o.y) / d * 420 * dt; }
      if (d < 22) { o.dead = true; p.coins++; AUDIO.play("gem"); }
    }
  }
  for (const r of F.rooms) if (r.props) r.props = r.props.filter((o) => !o.dead);
  // тайник: рывок в треснувшую стену
  if (p.dashT > 0) for (const c of F.corrs) if (c.hidden && (p.x - c.crack.x) ** 2 + (p.y - c.crack.y) ** 2 < 90 * 90) {
    c.hidden = false; c.b.seen = true; GS.shake = 10; AUDIO.play("boom");
    burst(c.crack.x, c.crack.y, [200, 180, 150], 40, 300);
    GS.banner = { title: L("Тайная комната!", "Secret room!"), sub: L("Стена рассыпалась", "The wall crumbled"), t: 2.2 };
  }
  // пасхалки
  for (const r of F.rooms) {
    if (r.cat && !r.cat.pet && (p.x - r.cat.x) ** 2 + (p.y - r.cat.y) ** 2 < 50 * 50) {
      r.cat.pet = true; p.hp = Math.min(p.maxhp, p.hp + 20); text(r.cat.x, r.cat.y - 50, L("Мяу! ♥", "Meow! ♥"), [255, 200, 220], true); AUDIO.play("card");
      if (Math.random() < 0.2) giveItem("cat");
    }
    if (r.golden && !r.golden.used && (p.x - r.golden.x) ** 2 + (p.y - r.golden.y) ** 2 < 60 * 60) {
      r.golden.used = true; GS.banner = { title: L("Золотой колонист", "The Golden Colonist"), sub: L("«Ты нашёл меня. Возьми всё.»", "“You found me. Take it all.”"), t: 3 };
      for (let i = 0; i < 3; i++) giveItem(randomItem());
    }
  }
  // дрон колонистов и глаз бури
  if (hasItem("drone")) {
    GS.drone = GS.drone || { x: p.x, y: p.y, cd: 0 };
    const D = GS.drone; D.x += (p.x - 40 * p.face - D.x) * Math.min(1, dt * 6); D.y += (p.y - 70 - D.y) * Math.min(1, dt * 6); D.cd -= dt;
    const e = nearestEnemy(D.x, D.y, 520);
    if (e && D.cd <= 0) { D.cd = 0.55; shoot(D.x, D.y, Math.atan2(e.y - e.r * 0.5 - D.y, e.x - D.x), { dmg: 9 * p.dmgMult, speed: 760, size: 5, col: [150, 230, 255], life: 0.9 }); }
  }
  if (hasItem("eye")) {
    GS.eyeA = (GS.eyeA || 0) + dt * 3;
    const ex = p.x + Math.cos(GS.eyeA) * 90, ey = p.y - 25 + Math.sin(GS.eyeA) * 70;
    for (const e of GS.enemies) if ((e.x - ex) ** 2 + (e.y - e.r * 0.5 - ey) ** 2 < (e.r + 14) ** 2 && (!e.eyeT || GS.time - e.eyeT > 0.4)) { e.eyeT = GS.time; hitEnemy(e, 14 * p.dmgMult, { knock: 80 }); }
  }
  if (GS.itemBanner) { GS.itemBanner.t -= dt; if (GS.itemBanner.t <= 0) GS.itemBanner = null; }
}
// снаряд/удар по горшкам и ящикам
function hitProps(x, y, r) {
  const F = GS.floor, m = roomAt(x, y);
  if (!m || !m.props) return false;
  for (const o of m.props) {
    if (o.dead || o.type === "coin" || (o.x - x) ** 2 + (o.y - y) ** 2 > (o.r + r) ** 2) continue;
    o.dead = true; burst(o.x, o.y - 10, o.type === "pot" ? [200, 120, 80] : [170, 130, 80], 12, 180); AUDIO.play("hit");
    const luck = hasItem("clover") ? 2 : 1;
    if (Math.random() < 0.55 * luck) for (let i = 0; i < rndi(1, 3); i++) m.props.push({ type: "coin", x: o.x + rnd(-14, 14), y: o.y + rnd(-14, 14), r: 10, hp: 0 });
    if (Math.random() < 0.12 * luck) GS.gems.push({ x: o.x, y: o.y, heart: true, t: 0 });
    return true;
  }
  return false;
}

// ---------------------------------------------------------------- отрисовка
function drawRoomExtras(m) {
  if (m.obst) for (const o of m.obst) {
    if (o.type === "pit") {
      const g = ctx.createRadialGradient(o.x, o.y, o.r * 0.2, o.x, o.y, o.r);
      g.addColorStop(0, "#05030a"); g.addColorStop(0.8, "#120c18"); g.addColorStop(1, "rgba(30,20,30,0.9)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(o.x, o.y, o.r, o.r * 0.85, 0, 0, 6.283); ctx.fill();
      ctx.strokeStyle = "rgba(255,240,220,0.18)"; ctx.lineWidth = 3; ctx.stroke();
    } else if (o.type === "spikes") {
      ctx.fillStyle = "rgba(60,40,40,0.5)"; ctx.fillRect(o.x, o.y, o.w, o.h);
      const up = Math.sin(GS.t * 3) > -0.3;
      for (let x = o.x + 10; x < o.x + o.w - 4; x += 18) for (let y = o.y + 14; y < o.y + o.h; y += 18) {
        ctx.fillStyle = up ? "#d8dce6" : "#6a6470"; ctx.beginPath(); ctx.moveTo(x - 5, y); ctx.lineTo(x, y - (up ? 12 : 4)); ctx.lineTo(x + 5, y); ctx.fill();
      }
    } else {
      shadowAt(ctx, o.x, o.y + o.r * 0.5, o.r * 1.1);
      if (o.type === "pillar") {
        ctx.fillStyle = "#7a7480"; ctx.beginPath(); ctx.roundRect(o.x - o.r * 0.8, o.y - o.r * 2.6, o.r * 1.6, o.r * 2.8, 6); ctx.fill();
        ctx.strokeStyle = "rgba(10,6,12,0.8)"; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = "#a8a2ae"; ctx.fillRect(o.x - o.r, o.y - o.r * 2.8, o.r * 2, 10); ctx.fillStyle = "#5a5460"; ctx.fillRect(o.x - o.r * 0.8 + 6, o.y - o.r * 2.4, 5, o.r * 2.2);
      } else {
        blob(ctx, o.x, o.y - o.r * 0.4, o.r * 1.15, o.r * 0.9, [104, 98, 108], [168, 160, 170]);
      }
    }
  }
  if (m.props) for (const o of m.props) {
    if (o.type === "coin") { glow(ctx, o.x, o.y - 6, 16, [255, 210, 90], 0.5); ctx.fillStyle = "#ffd25a"; ctx.beginPath(); ctx.ellipse(o.x, o.y - 6, 6 * Math.abs(Math.cos(GS.t * 4 + o.x)) + 1.5, 7, 0, 0, 6.283); ctx.fill(); continue; }
    shadowAt(ctx, o.x, o.y + 4, 16);
    if (o.type === "pot") { blob(ctx, o.x, o.y - 12, 13, 15, [176, 100, 64], [230, 160, 110]); ctx.fillStyle = "#6a3a22"; ctx.fillRect(o.x - 7, o.y - 30, 14, 5); }
    else { ctx.fillStyle = "#8a5a2e"; ctx.beginPath(); ctx.roundRect(o.x - 16, o.y - 28, 32, 28, 4); ctx.fill(); ctx.strokeStyle = "#2a160c"; ctx.lineWidth = 2; ctx.stroke(); ctx.beginPath(); ctx.moveTo(o.x - 16, o.y - 28); ctx.lineTo(o.x + 16, o.y); ctx.stroke(); }
  }
  if (m.pedestals) for (const pd of m.pedestals) {
    shadowAt(ctx, pd.x, pd.y + 6, 26);
    ctx.fillStyle = "#6a6070"; ctx.beginPath(); ctx.roundRect(pd.x - 22, pd.y - 16, 44, 22, 5); ctx.fill(); ctx.strokeStyle = "rgba(10,6,12,0.8)"; ctx.lineWidth = 2; ctx.stroke();
    if (!pd.taken) {
      const b = Math.sin(GS.t * 3 + pd.x) * 5;
      glow(ctx, pd.x, pd.y - 44 + b, 40, [255, 230, 160], 0.55);
      ctx.font = "30px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(pd.heart ? "❤️" : ITEMS[pd.item] ? ITEMS[pd.item].i : "?", pd.x, pd.y - 44 + b);
      if (pd.price) txt(pd.price + " ●", pd.x, pd.y + 22, 15, "#ffd25a", "center");
      if ((GS.player.x - pd.x) ** 2 + (GS.player.y - pd.y) ** 2 < 150 * 150 && pd.item) {
        txt(nm(ITEMS[pd.item]), pd.x, pd.y - 86, 16, "#fff0d0", "center");
        txt(L(ITEMS[pd.item].d_ru, ITEMS[pd.item].d_en), pd.x, pd.y - 68, 12, "#e6dac4", "center");
      }
    }
  }
  if (m.cat) {
    const c = m.cat; shadowAt(ctx, c.x, c.y + 2, 14);
    ctx.font = "30px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("🐈", c.x, c.y - 14 + Math.sin(GS.t * 2) * 1.5);
    if (!c.pet && (GS.player.x - c.x) ** 2 + (GS.player.y - c.y) ** 2 < 200 * 200) txt(L("погладь", "pet me"), c.x, c.y - 44, 12, "#ffe0f0", "center");
  }
  if (m.golden && !m.golden.used) { glow(ctx, m.golden.x, m.golden.y - 30, 70, [255, 210, 90], 0.7); ctx.font = "54px sans-serif"; ctx.textAlign = "center"; ctx.fillText("🗿", m.golden.x, m.golden.y - 30); }
  if (m.kind === "shop") txt(L("ЛАВКА", "SHOP"), m.cx, m.y + 60, 22, "#ffd98a", "center", TITLE);
}
function drawCracks() {
  for (const c of GS.floor.corrs) if (c.hidden) {
    const show = hasItem("compass") ? 0.9 : 0.35;
    ctx.strokeStyle = `rgba(20,14,10,${show})`; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(c.crack.x - 14, c.crack.y - 18); ctx.lineTo(c.crack.x - 2, c.crack.y - 4); ctx.lineTo(c.crack.x - 10, c.crack.y + 6);
    ctx.moveTo(c.crack.x - 2, c.crack.y - 4); ctx.lineTo(c.crack.x + 12, c.crack.y - 10); ctx.moveTo(c.crack.x + 2, c.crack.y + 2); ctx.lineTo(c.crack.x + 10, c.crack.y + 16); ctx.stroke();
  }
}
function drawItemsHUD() {
  const p = GS.player;
  txt("● " + (p.coins || 0), 30, 92, 17, "#ffd25a", "left");
  ctx.font = "20px sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
  p.items.forEach((k, i) => ctx.fillText(ITEMS[k].i, 90 + (i % 12) * 26, 92 + Math.floor(i / 12) * 26));
  if (GS.itemBanner) {
    const it = ITEMS[GS.itemBanner.k], a = Math.min(1, GS.itemBanner.t);
    ctx.globalAlpha = a;
    panel(V.W / 2 - 220, V.H - 230, 440, 70);
    ctx.font = "36px sans-serif"; ctx.textAlign = "center"; ctx.fillText(it.i, V.W / 2 - 180, V.H - 195);
    txt(nm(it), V.W / 2 + 20, V.H - 208, 22, "#ffd98a", "center", TITLE);
    txt(L(it.d_ru, it.d_en), V.W / 2 + 20, V.H - 180, 14, "#f2e6d0", "center");
    ctx.globalAlpha = 1;
  }
}
function drawStory() {
  ctx.fillStyle = "#07050c"; ctx.fillRect(0, 0, V.W, V.H);
  const i = Math.min(STORY.length - 1, GS.storyI), k = Math.min(1, GS.storyT * 1.5);
  // звёзды и планета
  for (let s = 0; s < 120; s++) { const x = (s * 137.5) % V.W, y = (s * 91.7) % V.H; ctx.fillStyle = `rgba(255,255,255,${0.3 + 0.5 * Math.abs(Math.sin(GS.t + s))})`; ctx.fillRect(x, y, 2, 2); }
  const px = V.W * 0.72, py = V.H * 0.45, pr = 170;
  const g = ctx.createRadialGradient(px - 60, py - 60, 20, px, py, pr);
  g.addColorStop(0, "#7ac08a"); g.addColorStop(0.6, "#2e6a52"); g.addColorStop(1, "#0c2420");
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, pr, 0, 6.283); ctx.fill();
  glow(ctx, px, py, pr * 1.4, [120, 200, 160], 0.25);
  if (i === 0) { const sx = lerp(-100, px - 120, Math.min(1, GS.storyT / 3)), sy = lerp(80, py - 40, Math.min(1, GS.storyT / 3)); glow(ctx, sx, sy, 30, [255, 200, 120], 0.9); ctx.fillStyle = "#e8eef6"; ctx.beginPath(); ctx.ellipse(sx, sy, 22, 8, 0.4, 0, 6.283); ctx.fill(); }
  if (i >= 1) ["F", "W", "E", "A"].forEach((e, j) => { const a = GS.t * 0.4 + j * 1.57; elemIcon(ctx, e, px + Math.cos(a) * 230, py + Math.sin(a) * 120, 18); });
  ctx.globalAlpha = k;
  wrapText(L(STORY[i].ru, STORY[i].en), 70, V.H * 0.38, V.W * 0.45, 26, "#f2e6d0", 1.4);
  ctx.globalAlpha = 1;
  txt(L("клик / пробел — дальше", "click / space — next"), 70, V.H - 50, 14, "#bfb2a0", "left");
  button(V.W - 190, V.H - 74, 160, 48, L("Пропустить", "Skip"), () => { GS.mode = "play"; openCards(); }, { size: 16 });
  BUTTONS.unshift([0, 0, V.W, V.H, () => { GS.storyI++; GS.storyT = 0; if (GS.storyI >= STORY.length) { GS.mode = "play"; openCards(); } }, "click"]);
}
