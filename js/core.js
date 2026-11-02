// Ядро: холст, ввод (клавиатура / мышь / касания), звук, сохранения, язык.
"use strict";
const V = { W: 1280, H: 720 };          // логическое разрешение кадра
const cv = document.getElementById("game");
const ctx = cv.getContext("2d");
let SCALE = 1, OFFX = 0, OFFY = 0, DPR = 1;
const zoom = () => (CFG.device === "phone" ? 1.6 : 1);   // на телефоне камера ближе — герой и враги крупнее

function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  const w = window.innerWidth, h = window.innerHeight;
  // логическая высота 720; ширина подстраивается под экран (телефон в альбомной ориентации шире)
  V.H = 720;
  V.W = Math.max(960, Math.min(1700, Math.round(720 * w / h)));
  if (w / h < 1) { V.W = 960; V.H = Math.round(960 * h / w); }   // портрет: больше высоты
  SCALE = Math.min(w / V.W, h / V.H);
  OFFX = (w - V.W * SCALE) / 2; OFFY = (h - V.H * SCALE) / 2;
  cv.width = Math.round(w * DPR); cv.height = Math.round(h * DPR);
  cv.style.width = w + "px"; cv.style.height = h + "px";
}
window.addEventListener("resize", resize);
resize();

// ---------------------------------------------------------------- утилиты
const rnd = (a, b) => a + Math.random() * (b - a);
const rndi = (a, b) => Math.floor(rnd(a, b + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const dist2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
const lerp = (a, b, k) => a + (b - a) * k;
function hexRGB(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function rgb(c, a) { return a === undefined ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})` : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`; }
function mixc(a, b, k) { return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)]; }
function shade(c, k) { return [clamp(c[0] * k, 0, 255), clamp(c[1] * k, 0, 255), clamp(c[2] * k, 0, 255)]; }

// ---------------------------------------------------------------- сохранения и настройки
const SAVE = {
  get(k, d) { try { const v = localStorage.getItem("stihii_" + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem("stihii_" + k, JSON.stringify(v)); } catch (e) { /* приватный режим */ } },
};
const CFG = Object.assign({ lang: (navigator.language || "ru").startsWith("ru") || (navigator.language || "").startsWith("uk") ? "ru" : "en",
  device: ("ontouchstart" in window || navigator.maxTouchPoints > 0) ? "phone" : "pc", sound: 0.7, music: 0.5 }, SAVE.get("cfg", {}));
function saveCfg() { SAVE.set("cfg", CFG); }

// ---------------------------------------------------------------- язык
function L(ru, en) { return CFG.lang === "ru" ? ru : en; }
function nm(o) { return CFG.lang === "ru" ? o.ru : (o.en || o.ru); }

// ---------------------------------------------------------------- ввод
const IN = { keys: {}, mx: 0, my: 0, mdown: false, clicks: [], dash: false, joy: null, touches: {}, aimTouch: null, tap: null, wheel: 0 };
function toLogical(cx, cy) { return [(cx - OFFX) / SCALE, (cy - OFFY) / SCALE]; }
window.addEventListener("keydown", (e) => {
  IN.keys[e.code] = true;
  if (e.code === "Space") { IN.dash = true; e.preventDefault(); }
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
  if (typeof onKey === "function") onKey(e.code);
});
window.addEventListener("keyup", (e) => { IN.keys[e.code] = false; });
cv.addEventListener("mousemove", (e) => { [IN.mx, IN.my] = toLogical(e.clientX, e.clientY); });
cv.addEventListener("mousedown", (e) => { [IN.mx, IN.my] = toLogical(e.clientX, e.clientY); IN.mdown = true; IN.clicks.push([IN.mx, IN.my]); AUDIO.unlock(); });
window.addEventListener("mouseup", () => { IN.mdown = false; });
cv.addEventListener("wheel", (e) => { IN.wheel += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });
cv.addEventListener("contextmenu", (e) => e.preventDefault());
// касания: левая половина — джойстик, кнопки — по зонам интерфейса, остальное — «клик»
cv.addEventListener("touchstart", (e) => {
  AUDIO.unlock();
  for (const t of e.changedTouches) {
    const [x, y] = toLogical(t.clientX, t.clientY);
    IN.mx = x; IN.my = y;
    if (typeof touchButton === "function" && touchButton(x, y)) continue;   // кнопка интерфейса
    if (typeof inBattle === "function" && inBattle() && x < V.W * 0.5) {
      IN.joy = { id: t.identifier, ox: x, oy: y, x, y };
    } else IN.clicks.push([x, y]);
  }
  e.preventDefault();
}, { passive: false });
cv.addEventListener("touchmove", (e) => {
  for (const t of e.changedTouches) {
    const [x, y] = toLogical(t.clientX, t.clientY);
    if (IN.joy && t.identifier === IN.joy.id) { IN.joy.x = x; IN.joy.y = y; }
  }
  e.preventDefault();
}, { passive: false });
const endTouch = (e) => { for (const t of e.changedTouches) if (IN.joy && t.identifier === IN.joy.id) IN.joy = null; e.preventDefault(); };
cv.addEventListener("touchend", endTouch, { passive: false });
cv.addEventListener("touchcancel", endTouch, { passive: false });

function moveVector() {
  let dx = 0, dy = 0;
  if (IN.keys.KeyA || IN.keys.ArrowLeft) dx -= 1;
  if (IN.keys.KeyD || IN.keys.ArrowRight) dx += 1;
  if (IN.keys.KeyW || IN.keys.ArrowUp) dy -= 1;
  if (IN.keys.KeyS || IN.keys.ArrowDown) dy += 1;
  if (IN.joy) {
    const jx = (IN.joy.x - IN.joy.ox) / 60, jy = (IN.joy.y - IN.joy.oy) / 60;
    const l = Math.hypot(jx, jy);
    if (l > 0.15) { dx = jx / Math.max(1, l); dy = jy / Math.max(1, l); }
  }
  const l = Math.hypot(dx, dy);
  return l > 1 ? [dx / l, dy / l] : [dx, dy];
}

// ---------------------------------------------------------------- звук (синтез WebAudio, без файлов)
const AUDIO = {
  ac: null, master: null,
  unlock() {
    if (this.ac) { if (this.ac.state === "suspended") this.ac.resume(); return; }
    try {
      this.ac = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ac.createGain(); this.master.gain.value = CFG.sound; this.master.connect(this.ac.destination);
      MUSIC.start();
    } catch (e) { this.ac = null; }
  },
  last: {},
  play(kind) {
    if (!this.ac || CFG.sound <= 0) return;
    const now = this.ac.currentTime;
    if (now - (this.last[kind] || 0) < 0.05) return;
    this.last[kind] = now;
    const S = {
      shot: [520, 260, 0.08, "triangle", 0.12], hit: [180, 90, 0.07, "square", 0.08], dash: [300, 700, 0.18, "sine", 0.15],
      gem: [880, 1320, 0.09, "sine", 0.1], level: [523, 1046, 0.5, "triangle", 0.2], boom: [120, 40, 0.35, "sawtooth", 0.2],
      zap: [900, 200, 0.12, "square", 0.1], hurt: [220, 110, 0.2, "sawtooth", 0.18], card: [660, 990, 0.12, "sine", 0.12],
    }[kind] || [440, 440, 0.1, "sine", 0.1];
    const o = this.ac.createOscillator(), g = this.ac.createGain();
    o.type = S[3]; o.frequency.setValueAtTime(S[0], now); o.frequency.exponentialRampToValueAtTime(Math.max(30, S[1]), now + S[2]);
    g.gain.setValueAtTime(S[4], now); g.gain.exponentialRampToValueAtTime(0.0008, now + S[2]);
    o.connect(g); g.connect(this.master); o.start(now); o.stop(now + S[2] + 0.02);
  },
  setVol(v) { CFG.sound = v; if (this.master) this.master.gain.value = v; saveCfg(); },
};
// спокойная музыка: мягкие аккорды (в духе пасторальных саундтреков), генерируется на лету
const MUSIC = {
  gain: null, t: 0, chords: [[57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 67], [52, 55, 59, 64]],
  start() {
    const ac = AUDIO.ac; if (!ac) return;
    this.gain = ac.createGain(); this.gain.gain.value = CFG.music * 0.18; this.gain.connect(ac.destination);
    let i = 0;
    const step = () => {
      if (!AUDIO.ac) return;
      const now = ac.currentTime, ch = this.chords[i++ % this.chords.length];
      ch.forEach((n, k) => {
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = k === 0 ? "sine" : "triangle";
        o.frequency.value = 440 * Math.pow(2, (n - 69 - (k === 0 ? 12 : 0)) / 12);
        g.gain.setValueAtTime(0.0001, now); g.gain.linearRampToValueAtTime(0.5 / (k + 1.5), now + 0.8);
        g.gain.linearRampToValueAtTime(0.0001, now + 3.9);
        o.connect(g); g.connect(this.gain); o.start(now); o.stop(now + 4);
      });
      // колокольчик мелодии
      const mel = [76, 79, 81, 79, 76, 74, 72, 74];
      for (let b = 0; b < 2; b++) {
        if (Math.random() < 0.6) {
          const o = ac.createOscillator(), g = ac.createGain(), t0 = now + b * 2 + rnd(0, 0.5);
          o.type = "sine"; o.frequency.value = 440 * Math.pow(2, (pick(mel) - 69) / 12);
          g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.18, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.6);
          o.connect(g); g.connect(this.gain); o.start(t0); o.stop(t0 + 1.7);
        }
      }
      setTimeout(step, 4000);
    };
    step();
  },
  setVol(v) { CFG.music = v; if (this.gain) this.gain.gain.value = v * 0.18; saveCfg(); },
};
