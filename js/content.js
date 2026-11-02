// Новые стихии веб-версии: Звук, Свет, Гравитация (+ Молния доступна с начала) и их рецепты.
"use strict";
Object.assign(DATA.elements, {
  S: { ru: "Звук", en: "Sound", color: "#ff6fc8", light: "#ffc2ea", dark: "#6a1e52", passive_ru: "+5% шанс оглушить ударом", passive_en: "+5% chance to stun on hit" },
  O: { ru: "Свет", en: "Light", color: "#ffe680", light: "#fffbe0", dark: "#7a6420", passive_ru: "+4% крит и лечение от убийств", passive_en: "+4% crit and healing on kills" },
  G: { ru: "Гравитация", en: "Gravity", color: "#8a6cff", light: "#d2c6ff", dark: "#2c1e70", passive_ru: "враги рядом медленнее на 6%", passive_en: "nearby enemies are 6% slower" },
});
// с самого начала: Огонь, Вода, Земля, Воздух, Молния, Звук; трофеи боссов открывают остальные
DATA.order = ["F", "W", "E", "A", "L", "S"];
DATA.extra = ["O", "G", "D", "C", "K", "N"];
const NEWREC = [
  // ---- Звук
  { id: "sonic", ru: "Звуковая волна", en: "Sonic Wave", d_ru: "Расходящаяся волна звука пробивает всех и замедляет.", d_en: "A spreading sound wave pierces everything and slows.",
    b: "wave", combo: "S", p: { dmg: 16, cd: 1.3, speed: 560, slow: [0.6, 1.2], knock: 90 } },
  { id: "roar", ru: "Рёв пламени", en: "Flame Roar", d_ru: "Оглушающий рёв поджигает всех вокруг.", d_en: "A deafening roar sets everyone around on fire.",
    b: "nova", combo: "SF", p: { dmg: 34, cd: 2.4, radius: 170, burn: [8, 3], stun: 0.5, knock: 160 } },
  { id: "echo", ru: "Эхо глубин", en: "Echo of the Deep", d_ru: "Пульсирующая зона эха вязнет и гудит.", d_en: "A pulsing echo zone that bogs enemies down.",
    b: "zone", combo: "SW", p: { cd: 3.2, radius: 120, dur: 4, dps: 22, slow: [0.45, 0.6], target: "cluster", visual: "echo" } },
  { id: "quakebell", ru: "Колокол земли", en: "Earth Bell", d_ru: "Гулкие удары колокола оглушают толпу.", d_en: "Booming bell strikes stun the crowd.",
    b: "strike", combo: "SE", p: { dmg: 46, cd: 2.2, count: 3, radius: 80, delay: 0.4, stun: 0.9 } },
  { id: "banshee", ru: "Крик бури", en: "Storm Scream", d_ru: "Крик отбрасывает врагов широким веером.", d_en: "A scream knocks enemies back in a wide fan.",
    b: "wave", combo: "SA", p: { dmg: 26, cd: 1.6, speed: 700, knock: 260 } },
  { id: "thunderclap", ru: "Раскат грома", en: "Thunderclap", d_ru: "Молния с громом перескакивает и надолго оглушает.", d_en: "Thundering lightning jumps and stuns for long.",
    b: "chain", combo: "SL", p: { dmg: 40, cd: 1.8, jumps: 6, jump_range: 240, stun: 0.8 } },
  // ---- Свет
  { id: "ray", ru: "Луч света", en: "Ray of Light", d_ru: "Быстрый луч пронзает врагов насквозь.", d_en: "A fast ray pierces right through enemies.",
    b: "bolt", combo: "O", p: { dmg: 18, cd: 0.8, speed: 1100, size: 6, pierce: 4, shape: "shard" } },
  { id: "sunspear", ru: "Солнечное копьё", en: "Sun Spear", d_ru: "Копьё солнца взрывается ослепительной вспышкой.", d_en: "A sun spear bursts in a blinding flash.",
    b: "bolt", combo: "OF", p: { dmg: 48, cd: 1.5, speed: 900, size: 11, explode: 90, burn: [6, 2], shape: "comet" } },
  { id: "rainbow", ru: "Радуга", en: "Rainbow", d_ru: "Радужный снаряд рассыпается на семь лучей.", d_en: "A rainbow shot splits into seven rays.",
    b: "bolt", combo: "OW", p: { dmg: 24, cd: 1.3, speed: 700, size: 10, split: 7, slow: [0.7, 1] } },
  { id: "prismguard", ru: "Сияющие призмы", en: "Shining Prisms", d_ru: "Призмы света кружат вокруг и режут врагов.", d_en: "Prisms of light circle you and cut enemies.",
    b: "orbit", combo: "OE", p: { dmg: 22, count: 4, radius: 90, size: 11, hit_cd: 0.4 } },
  { id: "heavenray", ru: "Луч небес", en: "Heaven's Ray", d_ru: "С неба бьют столпы света.", d_en: "Pillars of light strike from the sky.",
    b: "strike", combo: "OA", p: { dmg: 58, cd: 2.0, count: 4, radius: 70, delay: 0.5 } },
  { id: "eclipse", ru: "Затмение", en: "Eclipse", d_ru: "Свет и тьма: зона проклинает и выжигает врагов.", d_en: "Light and dark: a zone that curses and burns enemies.",
    b: "zone", combo: "OD", p: { cd: 3.6, radius: 140, dur: 4, dps: 40, target: "cluster" } },
  // ---- Гравитация
  { id: "well", ru: "Гравитационный колодец", en: "Gravity Well", d_ru: "Колодец стягивает врагов в одну точку.", d_en: "A well drags enemies into one point.",
    b: "zone", combo: "G", p: { cd: 3.0, radius: 130, dur: 3, dps: 14, pull: 220, target: "cluster" } },
  { id: "meteorfall", ru: "Метеорный дождь", en: "Meteor Fall", d_ru: "Притянутые метеоры падают на врагов.", d_en: "Pulled-in meteors fall on enemies.",
    b: "strike", combo: "GE", p: { dmg: 64, cd: 2.4, count: 5, radius: 85, delay: 0.6, stun: 0.4 } },
  { id: "singularity", ru: "Сингулярность", en: "Singularity", d_ru: "Чёрная воронка засасывает и рвёт врагов.", d_en: "A black vortex sucks in and tears enemies apart.",
    b: "zone", combo: "GA", p: { cd: 3.8, radius: 160, dur: 4, dps: 46, pull: 300, target: "cluster" } },
  { id: "fallingstar", ru: "Падающая звезда", en: "Falling Star", d_ru: "Огромная звезда падает и сжигает всё вокруг.", d_en: "A huge star falls and burns everything around.",
    b: "strike", combo: "GF", p: { dmg: 140, cd: 3.4, count: 1, radius: 170, delay: 0.9, burn: [12, 3] } },
  { id: "tidepull", ru: "Приливная сила", en: "Tidal Force", d_ru: "Гравитационная волна сминает ряды врагов.", d_en: "A gravity wave crushes enemy ranks.",
    b: "wave", combo: "GW", p: { dmg: 38, cd: 1.9, speed: 480, slow: [0.4, 1.5], knock: 60 } },
];
for (const r of NEWREC) { r.lvl = r.lvl || { dmg: 0 }; DATA.recipes.push(r); }

// ---- ещё 10 стихий (в духе техник аниме, свои названия)
Object.assign(DATA.elements, {
  V: { ru: "Лава", en: "Lava", color: "#ff5a1f", light: "#ffb27a", dark: "#5a1608", passive_ru: "горение сильнее на 10%", passive_en: "burning 10% stronger" },
  Y: { ru: "Песок", en: "Sand", color: "#d9b56a", light: "#f6e2b0", dark: "#6a5220", passive_ru: "+4% брони", passive_en: "+4% armor" },
  M: { ru: "Металл", en: "Metal", color: "#a9b4c6", light: "#eef2fa", dark: "#3a4250", passive_ru: "+1 пробивание снарядов", passive_en: "+1 projectile pierce" },
  P: { ru: "Яд", en: "Poison", color: "#8fdc3a", light: "#d6ff9a", dark: "#2c5010", passive_ru: "удары отравляют", passive_en: "hits poison" },
  I: { ru: "Лёд", en: "Ice", color: "#8fe6ff", light: "#e6fbff", dark: "#1e5a70", passive_ru: "замедления сильнее", passive_en: "stronger slows" },
  Q: { ru: "Сейсмо", en: "Quake", color: "#c98a4a", light: "#f2cfa0", dark: "#5a3416", passive_ru: "+6% урона по площади", passive_en: "+6% area damage" },
  H: { ru: "Дым", en: "Smoke", color: "#9a9aa8", light: "#e4e4ee", dark: "#34343e", passive_ru: "враги чаще промахиваются", passive_en: "enemies miss more often" },
  T: { ru: "Время", en: "Time", color: "#7fd6c8", light: "#d8fff8", dark: "#1e5650", passive_ru: "перезарядка −4%", passive_en: "cooldowns −4%" },
  X: { ru: "Пустота", en: "Void", color: "#5a2a8a", light: "#c79cff", dark: "#14061f", passive_ru: "добивает слабых врагов", passive_en: "finishes off weak enemies" },
  U: { ru: "Дух", en: "Spirit", color: "#b8f0ff", light: "#ffffff", dark: "#3a6a80", passive_ru: "+0.5 здоровья в секунду", passive_en: "+0.5 health per second" },
});
DATA.extra = DATA.extra.concat(["V", "Y", "M", "P", "I", "Q", "H", "T", "X", "U"]);
const NEWREC2 = [
  { id: "lavaball", ru: "Лавовая бомба", en: "Lava Bomb", d_ru: "Сгусток лавы взрывается и оставляет пылающую лужу.", d_en: "A lava blob explodes and leaves a burning pool.", b: "bolt", combo: "V", p: { dmg: 30, cd: 1.4, speed: 520, size: 12, explode: 80, burn: [10, 3], shape: "comet" } },
  { id: "eruption", ru: "Извержение", en: "Eruption", d_ru: "Лава и земля: из-под ног врагов бьют вулканы.", d_en: "Lava and earth: volcanoes burst under enemies.", b: "strike", combo: "VE", p: { dmg: 70, cd: 2.4, count: 4, radius: 90, delay: 0.55, burn: [12, 3] } },
  { id: "sandcoffin", ru: "Песчаный гроб", en: "Sand Coffin", d_ru: "Песок сжимает врага и надолго оглушает.", d_en: "Sand crushes an enemy and stuns it for long.", b: "strike", combo: "Y", p: { dmg: 40, cd: 1.8, count: 2, radius: 70, delay: 0.5, stun: 1.2 } },
  { id: "sandstormY", ru: "Пустынная буря", en: "Desert Storm", d_ru: "Песок и ветер: бродящая буря режет и слепит.", d_en: "Sand and wind: a roaming storm cuts and blinds.", b: "zone", combo: "YA", p: { cd: 3.2, radius: 120, dur: 5, dps: 30, slow: [0.6, 0.8], move: 1 } },
  { id: "steelfan", ru: "Стальной веер", en: "Steel Fan", d_ru: "Веер стальных лезвий пробивает ряды врагов.", d_en: "A fan of steel blades pierces enemy ranks.", b: "bolt", combo: "M", p: { dmg: 16, cd: 1.0, speed: 900, size: 7, count: 5, spread: 40, pierce: 3, shape: "blade" } },
  { id: "magnetstorm", ru: "Магнитная буря", en: "Magnet Storm", d_ru: "Металл и молния: кружащие диски бьют током.", d_en: "Metal and lightning: whirling discs that shock.", b: "orbit", combo: "ML", p: { dmg: 26, count: 5, radius: 100, size: 10, hit_cd: 0.35, stun: 0.2 } },
  { id: "venomfang", ru: "Ядовитый клык", en: "Venom Fang", d_ru: "Ядовитые иглы долго точат врагов.", d_en: "Venom needles eat at enemies for long.", b: "bolt", combo: "P", p: { dmg: 10, cd: 0.7, speed: 750, size: 6, count: 2, spread: 14, burn: [9, 4], shape: "shard" } },
  { id: "plaguecloud", ru: "Чумное облако", en: "Plague Cloud", d_ru: "Яд и вода: облако отравы растекается по комнате.", d_en: "Poison and water: a toxic cloud spreads through the room.", b: "zone", combo: "PW", p: { cd: 3.0, radius: 150, dur: 5, dps: 26, slow: [0.75, 0.5] } },
  { id: "icespikes", ru: "Ледяные пики", en: "Ice Spikes", d_ru: "Пики льда пронзают и замораживают.", d_en: "Ice spikes pierce and freeze.", b: "strike", combo: "I", p: { dmg: 34, cd: 1.6, count: 3, radius: 60, delay: 0.35, stun: 0.6 } },
  { id: "absolutezero", ru: "Абсолютный ноль", en: "Absolute Zero", d_ru: "Лёд и ветер: ледяная буря вокруг героя.", d_en: "Ice and wind: a frost storm around the hero.", b: "nova", combo: "IA", p: { dmg: 40, cd: 2.6, radius: 200, slow: [0.35, 2.5], stun: 0.4, ring_bolts: 10 } },
  { id: "groundshock", ru: "Сотрясение", en: "Ground Shock", d_ru: "Удар по воздуху раскалывает пространство волной.", d_en: "A blow to the air cracks space with a wave.", b: "wave", combo: "Q", p: { dmg: 34, cd: 1.6, speed: 620, knock: 220, stun: 0.3 } },
  { id: "worldquake", ru: "Мировой толчок", en: "World Quake", d_ru: "Сейсмо и земля: вся комната ходит ходуном.", d_en: "Quake and earth: the whole room shakes.", b: "nova", combo: "QE", p: { dmg: 70, cd: 3.2, radius: 260, stun: 1.0, knock: 200 } },
  { id: "smokescreen", ru: "Дымовая завеса", en: "Smoke Screen", d_ru: "Клубы дыма душат и сбивают врагов с толку.", d_en: "Smoke clouds choke and confuse enemies.", b: "zone", combo: "H", p: { cd: 2.8, radius: 130, dur: 4, dps: 16, slow: [0.5, 0.6] } },
  { id: "smokedragon", ru: "Дымный змей", en: "Smoke Serpent", d_ru: "Дым и огонь: змей из дыма сам охотится за врагами.", d_en: "Smoke and fire: a smoke serpent hunts enemies.", b: "summon", combo: "HF", p: { dmg: 30, cd: 6, time: 10 } },
  { id: "timestop", ru: "Остановка времени", en: "Time Stop", d_ru: "Враги рядом застывают во времени.", d_en: "Nearby enemies freeze in time.", b: "nova", combo: "T", p: { dmg: 14, cd: 3.4, radius: 220, stun: 1.6 } },
  { id: "rewind", ru: "Петля времени", en: "Time Loop", d_ru: "Время и вода: снаряды возвращаются и бьют снова.", d_en: "Time and water: projectiles return and hit again.", b: "bolt", combo: "TW", p: { dmg: 22, cd: 1.1, speed: 640, size: 9, returning: 1, pierce: 99, shape: "orb" } },
  { id: "voidorb", ru: "Сфера пустоты", en: "Void Orb", d_ru: "Медленная сфера стирает всё на пути.", d_en: "A slow orb erases everything in its path.", b: "bolt", combo: "X", p: { dmg: 40, cd: 2.2, speed: 260, size: 18, pierce: 99, life: 3, shape: "orb" } },
  { id: "blackstar", ru: "Чёрная звезда", en: "Black Star", d_ru: "Пустота и гравитация: звезда засасывает и рвёт врагов.", d_en: "Void and gravity: a star sucks in and tears enemies.", b: "zone", combo: "XG", p: { cd: 4.0, radius: 170, dur: 4, dps: 60, pull: 340 } },
  { id: "spiritwolf", ru: "Дух-волк", en: "Spirit Wolf", d_ru: "Призрачный волк сражается рядом с героем.", d_en: "A ghostly wolf fights beside the hero.", b: "summon", combo: "U", p: { dmg: 24, cd: 5, time: 12 } },
  { id: "spiritshield", ru: "Щит предков", en: "Ancestral Shield", d_ru: "Дух и земля: щит из душ гасит удары.", d_en: "Spirit and earth: a shield of souls absorbs hits.", b: "shield", combo: "UE", p: { amount: 45, cd: 6 } },
];
for (const r of NEWREC2) { r.lvl = r.lvl || { dmg: 0 }; DATA.recipes.push(r); }
