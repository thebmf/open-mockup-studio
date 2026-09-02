/* =========================================================================
   Mockup Studio — локальный генератор видео-мокапов
   Всё рисуется в один <canvas> на экспортном разрешении, поэтому превью
   и итоговый файл совпадают пиксель в пиксель.
   ========================================================================= */

'use strict';

const $  = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp  = (a, b, t) => a + (b - a) * t;
const RAD   = Math.PI / 180;

/* ---------------------------------------------------------------- девайсы */
/* Все размеры — в условных единицах, где ширина корпуса = 1000.            */

const DEVICES = {
  iphone16pro: {
    name: 'iPhone 16 Pro',
    h: 2093, bodyR: 152, bezel: 30, screenInset: 7, thick: 115,
    cutout: { type: 'island', w: 322, h: 96, top: 36 },
    buttons: [
      { side: 'left',  t0: 0.164, t1: 0.207 },   // Action — короткая
      { side: 'left',  t0: 0.241, t1: 0.321 },   // Volume +
      { side: 'left',  t0: 0.338, t1: 0.418 },   // Volume −
      { side: 'right', t0: 0.244, t1: 0.404 },   // Power — длинная, напротив обеих громкости
    ],
  },
  iphone16: {
    name: 'iPhone 16',
    h: 2086, bodyR: 158, bezel: 36, screenInset: 7, thick: 109,
    cutout: { type: 'island', w: 330, h: 99, top: 36 },
    buttons: [
      { side: 'left',  t0: 0.165, t1: 0.210 },
      { side: 'left',  t0: 0.243, t1: 0.325 },
      { side: 'left',  t0: 0.342, t1: 0.424 },
      { side: 'right', t0: 0.246, t1: 0.408 },
    ],
  },
  iphone13: {
    name: 'iPhone 13/14 (чёлка)',
    h: 2065, bodyR: 150, bezel: 34, screenInset: 7, thick: 107,
    cutout: { type: 'notch', w: 430, h: 68 },
    buttons: [
      { side: 'left',  t0: 0.150, t1: 0.178 },   // переключатель звонка
      { side: 'left',  t0: 0.205, t1: 0.278 },
      { side: 'left',  t0: 0.295, t1: 0.368 },
      { side: 'right', t0: 0.225, t1: 0.375 },
    ],
  },
  /* iPhone 17 из Figma-сообщества: «iPhone 17 — All 3D and Flat Mockups».
     Лицевая сторона — экспорт ×4 с вырезанным экраном; вырез и «остров»
     построены по точной геометрии слоёв Screen/cntr, кнопки — по слою Btns.
     Толщина и торцы по-прежнему считаются в 3D.                            */
  fig17pro: {
    name: 'iPhone 17 Pro · Figma',
    h: 2087, bodyR: 154, bezel: 35, screenInset: 6, thick: 122,
    cutout: { type: 'none' },
    frame: { files: { black17: 'frames/frame_17pro_black.png', slate: 'frames/frame_17pro_natural.png' },
             body: [12, 0, 1847, 3823], screen: [76, 63, 1783, 3760], island: [684, 111, 1175, 253] },
    colors: ['black17', 'slate'],
    buttons: [
      { side: 'left',  t0: 0.1795, t1: 0.2178 },   // Action
      { side: 'left',  t0: 0.2490, t1: 0.3185 },   // Volume +
      { side: 'left',  t0: 0.3371, t1: 0.4066 },   // Volume −
      { side: 'right', t0: 0.2967, t1: 0.4066 },   // Power
    ],
  },
  fig17promax: {
    name: 'iPhone 17 Pro Max · Figma',
    h: 2142, bodyR: 154, bezel: 27, screenInset: 6, thick: 112,
    cutout: { type: 'none' },
    frame: { files: { black17: 'frames/frame_17promax_black.png', slate: 'frames/frame_17promax_gold.png' },
             body: [20, 20, 1827, 3891], screen: [44, 44, 1803, 3867], island: [658, 93, 1157, 239] },
    colors: ['black17', 'slate'],
    buttons: [
      { side: 'left',  t0: 0.1795, t1: 0.2178 },   // Action
      { side: 'left',  t0: 0.2490, t1: 0.3185 },   // Volume +
      { side: 'left',  t0: 0.3371, t1: 0.4066 },   // Volume −
      { side: 'right', t0: 0.2967, t1: 0.4066 },   // Power
    ],
  },
  fig17: {
    name: 'iPhone 17 · Figma',
    h: 2087, bodyR: 154, bezel: 35, screenInset: 6, thick: 111,
    cutout: { type: 'none' },
    frame: { files: { black17: 'frames/frame_17_black.png', silvery: 'frames/frame_17_natural.png' },
             body: [10, 0, 1503, 3111], screen: [61, 52, 1452, 3059], island: [556, 90, 957, 206] },
    colors: ['black17', 'silvery'],
    buttons: [
      { side: 'left',  t0: 0.1795, t1: 0.2178 },   // Action
      { side: 'left',  t0: 0.2490, t1: 0.3185 },   // Volume +
      { side: 'left',  t0: 0.3371, t1: 0.4066 },   // Volume −
      { side: 'right', t0: 0.2967, t1: 0.4066 },   // Power
    ],
  },
  fig17air: {
    name: 'iPhone Air · Figma',
    h: 2087, bodyR: 154, bezel: 35, screenInset: 6, thick: 75,
    cutout: { type: 'none' },
    frame: { files: { black17: 'frames/frame_air_black.png', silvery: 'frames/frame_air.png' },
             body: [12, 0, 1847, 3823], screen: [76, 63, 1783, 3760], island: [684, 111, 1175, 253] },
    colors: ['black17', 'silvery'],
    buttons: [
      { side: 'left',  t0: 0.1795, t1: 0.2178 },   // Action
      { side: 'left',  t0: 0.2490, t1: 0.3185 },   // Volume +
      { side: 'left',  t0: 0.3371, t1: 0.4066 },   // Volume −
      { side: 'right', t0: 0.2967, t1: 0.4066 },   // Power
    ],
  },
  androidflat: {
    name: 'Android (дырка в экране)',
    h: 2160, bodyR: 120, bezel: 26, screenInset: 6, thick: 122,
    cutout: { type: 'hole', d: 62, top: 46 },
    buttons: [
      { side: 'right', t0: 0.185, t1: 0.295 },   // качель громкости
      { side: 'right', t0: 0.318, t1: 0.388 },   // питание
    ],
  },
};

/* Цвета корпуса: [тёмная база, светлая база, блик канта, тень канта] */
const FRAMES = {
  black:   { name: 'Чёрный титан', a: '#26262a', b: '#0d0d10', hi: '#6c6c76', lo: '#050506' },
  natural: { name: 'Титан',        a: '#a09a92', b: '#5d5852', hi: '#efe9df', lo: '#3a3733' },
  silver:  { name: 'Серебро',      a: '#e6e7ea', b: '#9ea1a8', hi: '#ffffff', lo: '#6d7076' },
  gold:    { name: 'Золото',       a: '#e5cfa8', b: '#a2865c', hi: '#fff3dc', lo: '#6d5836' },
  natural: { name: 'Натуральный титан', a: '#9aa3af', b: '#5b6470', hi: '#e6ebf2', lo: '#2b313a' },
  /* Цвета торца сняты пипеткой с самих рамок: если торец светлее лицевой
     стороны, телефон разваливается на две детали.                          */
  slate:   { name: 'Тёмный титан',  a: '#5a6478', b: '#2c3342', hi: '#9aa6bd', lo: '#161a22' },
  black17: { name: 'Чёрный',        a: '#3a3a3d', b: '#161618', hi: '#8b8b8f', lo: '#08080a' },
  silvery: { name: 'Серебро',       a: '#c9cbd2', b: '#8f939c', hi: '#f2f4f8', lo: '#4a4d55' },
  /* цвета алюминиевого корпуса iPhone 17 Pro — под фото-рамки */
  deepblue:{ name: 'Тёмно-синий',  a: '#2d3f6b', b: '#141d3a', hi: '#7a90d6', lo: '#0a0f20' },
  orange:  { name: 'Космический оранжевый', a: '#dd7530', b: '#8f4114', hi: '#ffbd80', lo: '#4c2108' },
};

/* Подгрузка фото-рамок. Пока файл не готов, рисуем процедурный корпус. */
const frameImgs = {};
function frameImage(dev, color) {
  if (!dev.frame) return null;
  const src = dev.frame.files[color] || dev.frame.files[dev.colors[0]];
  let img = frameImgs[src];
  if (!img) { img = new Image(); img.src = src; frameImgs[src] = img; }
  return (img.complete && img.naturalWidth > 0) ? img : null;
}
const deviceColors = dev => dev.colors || ['black', 'natural', 'silver', 'gold'];

/* --------------------------------------------------------------- пресеты */

const POSES = [
  { id: 'flat',   name: 'Фронтально', rx: 0,   ry: 0,   rz: 0 },
  { id: 'hero',   name: 'Герой',      rx: 6,   ry: -13, rz: -3 },
  { id: 'left',   name: 'Влево',      rx: 4,   ry: -24, rz: -2 },
  { id: 'right',  name: 'Вправо',     rx: 4,   ry: 24,  rz: 2 },
  { id: 'iso',    name: 'Изометрия',  rx: 14,  ry: -30, rz: -6 },
  { id: 'desk',   name: 'На столе',   rx: 38,  ry: -8,  rz: 5 },
  { id: 'low',    name: 'Снизу',      rx: -22, ry: 10,  rz: -2 },
  { id: 'hand',   name: 'В руке',     rx: 11,  ry: -17, rz: -7 },
];

const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
const easeOutExpo  = t => t >= 1 ? 1 : 1 - Math.pow(2, -9 * t);
const easeInOut    = t => t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2;
const TAU = Math.PI * 2;

/* Псевдослучайный шум для «съёмки с рук» */
function h1(n){ const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); }
function n1(x){ const i = Math.floor(x), f = x - i, u = f*f*(3-2*f); return h1(i)*(1-u) + h1(i+1)*u; }
function nz(x){ return (n1(x)*0.55 + n1(x*2.13+7.7)*0.3 + n1(x*4.37+19.1)*0.15) * 2 - 1; }

const EASES = {
  lin:   t => t,
  smooth: t => t * t * t * (t * (t * 6 - 15) + 10),   // нулевая скорость И ускорение на концах
  out:   easeOutCubic,
  expo:  easeOutExpo,
  inout: easeInOut,
  in:    t => t * t * t,
};

/* Сценарий — один приём продуктовой съёмки: медленный проход камеры между
   двумя позами, где масштаб, поворот и сдвиг меняются ОДНОВРЕМЕННО — одна
   ось в движении всегда выглядит дёшево. Телефон крупный, часто обрезан краями.
   Ключи задают смещение от твоего положения; после последнего ключа камера
   замирает. dx/dy — доли кадра, ds — прибавка к масштабу, drx/dry/drz —
   градусы, lx/ly — куда уезжает пятно света на студийном заднике.          */
const SCENARIOS = [
  { id: 'none', name: 'Без сценария', dur: 0, hint: 'камера стоит там, где ты её поставил', keys: [] },

  { id: 'revealLow', name: 'Взгляд снизу → общий план', dur: 10, tag: 'раскрытие',
    hint: 'макро на «острове», глядя на телефон снизу, потом долгий отъезд до общего плана.',
    keys: [
      { t: 0,  drx: 30, dry: -3, drz: 0, ds: 1.60, dy: 0.60, lx: -0.06 },
      { t: 10, drx: 1,  dry: 0,  drz: 0, ds: -0.38, dy: 0.02, lx: 0.04, e: 'smooth' },
    ] },

  { id: 'panDown', name: 'Экран сверху вниз', dur: 10, tag: 'детали',
    hint: 'камера вплотную и медленно едет по интерфейсу — видно каждую часть экрана.',
    keys: [
      { t: 0,  drx: 2, dry: -7, drz: 0, ds: 0.95, dy: 0.46 },
      { t: 10, drx: 0, dry: 3,  drz: 0, ds: 0.95, dy: -0.46, e: 'smooth' },
    ] },

  { id: 'panUp', name: 'Экран снизу вверх', dur: 10, tag: 'детали',
    hint: 'тот же проезд по экрану, но снизу к «острову».',
    keys: [
      { t: 0,  drx: -2, dry: 6,  drz: 0, ds: 0.95, dy: -0.46 },
      { t: 10, drx: 0,  dry: -4, drz: 0, ds: 0.95, dy: 0.46, e: 'smooth' },
    ] },

  { id: 'deckSlide', name: 'На столе', dur: 8, tag: 'герой',
    hint: 'лежит по диагонали и медленно скользит; по стеклу пробегает блик.',
    keys: [
      { t: 0, drx: 55, dry: 9,  drz: -46, ds: 0.95, dx: -0.11, dy: 0.04, lx: -0.10 },
      { t: 8, drx: 49, dry: -3, drz: -36, ds: 0.85, dx: 0.09,  dy: -0.03, lx: 0.08, e: 'smooth' },
    ] },

  { id: 'truckReveal', name: 'Проезд с разворотом', dur: 10, tag: 'раскрытие',
    hint: 'слева крупно вполоборота → едет вправо, разворачивается во фронт и отъезжает.',
    keys: [
      { t: 0,  dx: -0.26, dry: -36, drx: 9, drz: -7, ds: 0.75, lx: -0.12 },
      { t: 10, dx: 0.16,  dry: 0,   drx: 2, drz: 0,  ds: -0.22, lx: 0.10, e: 'smooth' },
    ] },

  { id: 'turn34', name: 'Полуоборот', dur: 6, tag: 'герой',
    hint: 'стоит вполоборота и еле заметно доворачивается — спокойный кадр под голос.',
    keys: [
      { t: 0, dry: -24, drx: 6, drz: -3, ds: 0.36 },
      { t: 6, dry: -7,  drx: 3, drz: -1, ds: 0.44, e: 'smooth' },
    ] },

  { id: 'lowFlare', name: 'Снизу с бликом', dur: 6.3, tag: 'герой',
    hint: 'наклонён к зрителю, по низу экрана горит блик; медленно выпрямляется.',
    keys: [
      { t: 0,   drx: 26, dry: -12, drz: -14, ds: 0.78, dy: 0.16, dx: 0.05 },
      { t: 6.3, drx: 9,  dry: -4,  drz: -5,  ds: 0.70, dy: 0.05, dx: 0.02, e: 'smooth' },
    ] },

  { id: 'studioLight', name: 'Витрина со светом', dur: 8, tag: 'витрина',
    hint: 'телефон маленький и почти неподвижен — движется пятно света по студии.',
    keys: [
      { t: 0, ds: -0.42, dry: -4, lx: -0.22, ly: -0.04 },
      { t: 8, ds: -0.40, dry: 4,  lx: 0.22,  ly: 0.02, e: 'smooth' },
    ] },

  { id: 'topMacro', name: 'Макро сверху', dur: 10, tag: 'детали',
    hint: 'очень крупно верх экрана и «остров», лёгкий дрейф вбок.',
    keys: [
      { t: 0,  ds: 1.70, dy: 0.55, drx: 4, dry: -6, dx: -0.04 },
      { t: 10, ds: 1.62, dy: 0.50, drx: 2, dry: 6,  dx: 0.04, e: 'smooth' },
    ] },

  { id: 'heroHold', name: 'Герой (финал)', dur: 6, tag: 'финал',
    hint: 'ровный крупный кадр с едва заметным движением — под логотип или призыв.',
    keys: [
      { t: 0, drx: 5, dry: -9, drz: -2, ds: 0.36 },
      { t: 6, drx: 3, dry: -5, drz: -1, ds: 0.40, e: 'smooth' },
    ] },
];

/* Ролик — готовая последовательность сцен с уходом в чёрное между ними.
   Так снимают промо: раскрытие → детали экрана → герой → витрина.          */
const REELS = [
  { id: 'promo30', name: 'Промо · 30 с',
    seq: [['revealLow', 8], ['panDown', 8], ['deckSlide', 6], ['studioLight', 8]] },
  { id: 'short15', name: 'Короткий · 15 с',
    seq: [['revealLow', 6], ['panDown', 5], ['heroHold', 4]] },
  { id: 'details20', name: 'Детали · 20 с',
    seq: [['topMacro', 6], ['panDown', 8], ['lowFlare', 6]] },
  { id: 'cinema25', name: 'Кино · 25 с',
    seq: [['truckReveal', 8], ['deckSlide', 6], ['panUp', 6], ['heroHold', 5]] },
];
const REEL_GAP = 0.45;      // уход в чёрное между сценами, с

const KEYF = ['dx', 'dy', 'ds', 'drx', 'dry', 'drz', 'lx', 'ly'];

/* Кривая скорости. У «мягких» кривых пик скорости в середине в 1.9 раза выше
   средней — на длинном отъезде это читается как «сначала еле ползёт, потом
   улетает». Поэтому кривая смешивается с равномерной: ползунок «Плавность»
   0 — постоянная скорость, 1 — полностью мягкая.                           */
function easeMix(u) {
  const k = clamp(S.scene.ease, 0, 1);
  return (1 - k) * u + k * (u * u * u * (u * (u * 6 - 15) + 10));
}

function evalScenario(t, sc) {
  if (!sc || !sc.keys.length) return null;
  const K = sc.keys;
  const last = K[K.length - 1];
  if (t >= last.t) return last;              // после финала — покой
  if (t <= K[0].t) return K[0];
  let i = 0;
  while (i < K.length - 1 && K[i + 1].t <= t) i++;
  const a = K[i], b = K[i + 1];
  const e = easeMix((t - a.t) / Math.max(1e-6, b.t - a.t));
  const out = {};
  for (const k of KEYF) {
    if (k === 'ds') {
      /* Масштаб интерполируем в логарифме: зрительно приближение — это
         отношение, а не разность. Линейный ds на отъезде от 2.6× к 0.6×
         в конце ускоряется втрое — и выглядит неестественно.              */
      const ma = Math.log(Math.max(0.05, 1 + (a.ds || 0))), mb = Math.log(Math.max(0.05, 1 + (b.ds || 0)));
      out.ds = Math.exp(lerp(ma, mb, e)) - 1;
    } else out[k] = lerp(a[k] || 0, b[k] || 0, e);
  }
  return out;
}

/* Темп: растянуть или сжать все сцены на дорожке, сохранив их порядок и
   промежутки. Длина блока и есть скорость сцены.                           */
function applyTempo(k) {
  const list = sortedScenes();
  if (!list.length) { toast('На дорожке нет сцен'); return; }
  let cursor = 0, prevEnd = 0;
  for (const b of list) {
    const gap = Math.max(0, b.t0 - prevEnd) * k;
    prevEnd = sceneEnd(b);
    b.t0 = Math.round((cursor + gap) * 100) / 100;
    b.dur = Math.round(Math.max(0.3, b.dur * k) * 100) / 100;
    cursor = sceneEnd(b);
  }
  S.exp.dur = 0;
  renderTimeline(); save();
  toast(k > 1 ? `Все сцены медленнее в ${k.toFixed(2)}×` : `Все сцены быстрее в ${(1 / k).toFixed(2)}×`);
}

/* Лёгкое «дыхание» камеры поверх сценария — чтобы кадр не был мёртвым. */
function idleDrift(t) {
  return {
    dx:  nz(t * 0.31)          * 0.0040,
    dy:  nz(t * 0.27 + 53.1)   * 0.0050,
    drx: nz(t * 0.23 + 311.7)  * 0.55,
    dry: nz(t * 0.29 + 407.2)  * 0.80,
    drz: nz(t * 0.25 + 121.4)  * 0.32,
    ds:  nz(t * 0.21 + 199.3)  * 0.0045,
  };
}

const BG_PRESETS = [
  { id:'studioLight', type:'studio', a:'#fbf8f3', b:'#cfc8bd', angle:0 },
  { id:'studioWarm',  type:'studio', a:'#fdf3e6', b:'#b9ab99', angle:0 },
  { id:'studioDark',  type:'studio', a:'#8e8f96', b:'#15161b', angle:0 },
  { id:'ink',      type:'linear', a:'#12141b', b:'#05060a', angle:135 },
  { id:'graphite', type:'linear', a:'#3b3f4a', b:'#14161c', angle:160 },
  { id:'indigo',   type:'linear', a:'#5b6cff', b:'#0b1030', angle:150 },
  { id:'grape',    type:'linear', a:'#8b5cf6', b:'#2563eb', angle:135 },
  { id:'sunset',   type:'linear', a:'#ff8a3d', b:'#b3123f', angle:145 },
  { id:'peach',    type:'linear', a:'#ffd9a8', b:'#ff8fb1', angle:150 },
  { id:'mint',     type:'linear', a:'#4fd1c5', b:'#053b3a', angle:150 },
  { id:'forest',   type:'linear', a:'#2f855a', b:'#08211a', angle:160 },
  { id:'paper',    type:'solid',  a:'#f4f4f7', b:'#f4f4f7', angle:0 },
  { id:'void',     type:'solid',  a:'#000000', b:'#000000', angle:0 },
  { id:'aurora',   type:'mesh',   a:'#5b8cff', b:'#0a0b12', angle:0 },
  { id:'glow',     type:'radial', a:'#3a4a8f', b:'#07080d', angle:0 },
];

const SIZE_PRESETS = [
  { id:'p1080',  name:'Вертикаль 1080×1920 (Reels/Shorts)', w:1080, h:1920 },
  { id:'p1440',  name:'Вертикаль 1440×2560',                w:1440, h:2560 },
  { id:'sq',     name:'Квадрат 1080×1080',                  w:1080, h:1080 },
  { id:'ls1080', name:'Горизонт 1920×1080',                 w:1920, h:1080 },
  { id:'ls4k',   name:'Горизонт 3840×2160 (4K)',            w:3840, h:2160 },
  { id:'appsp',  name:'App Store 886×1920',                 w:886,  h:1920 },
  { id:'og',     name:'OG-картинка 1200×630',               w:1200, h:630 },
  { id:'custom', name:'Свой размер',                        w:0,    h:0 },
];

/* ========================================================== состояние ==== */

const S = {
  cw: 1080, ch: 1920,
  device: 'iphone16pro',
  frame: 'black17',
  showButtons: true,
  glare: { on: true, amt: 0.10 },
  sb: { on: false, style: 'light', time: '9:41' },
  screen: { fit: 'cover', zoom: 1, offX: 0, offY: 0, bg: '#000000' },
  pose: { x: 0, y: 0, scale: 1, rx: 0, ry: 0, rz: 0, persp: 2600 },
  poseId: 'flat',
  scene: { amount: 1, idle: 0.12, ease: 0.55 },   // ease: 0 — равномерно, 1 — максимально мягко
  scenes: [{ id: 's1', sc: 'revealLow', t0: 0, dur: 10 }],   // сцены на дорожке
  selScene: null,
  loop: false,
  thickK: 0.88,
  bg: { preset: 'studioLight', type: 'studio', a: '#fbf8f3', b: '#cfc8bd', angle: 135, blur: 0, dim: 0 },
  vignette: 0.25,
  grain: 0,
  shadow: { on: true, opacity: 0.5, blur: 90, x: 0, y: 60, spread: 1.02 },
  text: { on: false, title: 'Твоё приложение', sub: 'Уже в App Store', pos: 'top', size: 66, color: '#ffffff' },
  dof:     { on: true,  amt: 0.5 },     // размытие задника, когда телефон близко
  reflect: { on: true,  amt: 0.32 },    // отражение в полу студии
  fx:      { islandShadow: true, glow: true, glowAmt: 0.45 },
  media: [],                 // видео на дорожке: [{id,name,t0,dur,inPoint}]
  selMedia: null,
  clips: [],                 // наезды: [{id,t0,dur,ramp,fill,u0,v0,u1,v1}]
  sel: null,                 // id выбранного наезда
  exp: { fps: 30, bitrate: 14, audio: false, dur: 0 },
  sizePreset: 'p1080',
};

const canvas = $('#c');
const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
const video = $('#v');

let bgImage = null;         // Image для фонового изображения
/* Несколько видео на дорожке: у каждого свой <video>. Сам элемент в S не
   хранится — только запись клипа; blob-ссылки не переживают перезагрузку,
   поэтому при восстановлении состояния клипы без источника отбрасываются.  */
const mediaPool = {};            // id → {video, url, name, natDur, w, h, ready}
let mediaSeq = 1;
const newMediaId = () => 'm' + (mediaSeq++);
let hasVideo = false;            // есть хотя бы одно готовое видео

function mediaEnd(m) { return m.t0 + m.dur; }
function sortedMedia() { return S.media.slice().sort((a, b) => a.t0 - b.t0); }
function getMedia(id) { return S.media.find(m => m.id === id) || null; }

/* Какой клип звучит и виден в момент t. */
function mediaAt(t) {
  for (const m of sortedMedia()) {
    if (t >= m.t0 && t < mediaEnd(m)) {
      const p = mediaPool[m.id];
      if (p && p.ready) return { clip: m, pool: p, local: (t - m.t0) + (m.inPoint || 0) };
    }
  }
  return null;
}
function activeVideo(t) { const a = mediaAt(t); return a ? a.pool.video : null; }

/* Ставим активному клипу нужное время. Клок — ведущий: догонять его текущим
   временем видео нельзя, между клипами и в разрывах видео просто нет.
   Перематываем, только когда расхождение заметно, иначе рвётся плавность.  */
function syncMedia(t, wantPlay) {
  const a = mediaAt(t);
  for (const id in mediaPool) {
    const p = mediaPool[id];
    if (!p.ready) continue;
    if (!a || p !== a.pool) { if (!p.video.paused) p.video.pause(); }
  }
  if (!a) return;
  const v = a.pool.video, want = clamp(a.local, 0, Math.max(0, a.pool.natDur - 0.03));
  if (Math.abs(v.currentTime - want) > 0.2 || v.seeking === undefined) {
    try { v.currentTime = want; } catch (_) {}
  }
  if (wantPlay) { if (v.paused) v.play().catch(() => {}); }
  else if (!v.paused) v.pause();
}


let playing = false;
let clock = 0;              // время сцены, с
let lastTs = 0;
let recording = false;
let grainTile = null;

/* off-screen холст, куда рисуется сам телефон «плоско» */
const off = document.createElement('canvas');
const octx = off.getContext('2d');

/* ================================================= геометрия / матрицы == */

/* Поворот точки: сначала X, затем Y, затем Z.
   rx > 0 — верх уезжает от зрителя; ry > 0 — правый край уезжает;
   rz > 0 — вращение по часовой стрелке.                                    */
function rot3(p, rx, ry, rz) {
  let { x, y, z } = p;
  if (rx) { const c = Math.cos(rx), s = Math.sin(rx); const y1 = y*c - z*s, z1 = y*s + z*c; y = y1; z = z1; }
  if (ry) { const c = Math.cos(ry), s = Math.sin(ry); const x1 = x*c + z*s, z1 = -x*s + z*c; x = x1; z = z1; }
  if (rz) { const c = Math.cos(rz), s = Math.sin(rz); const x1 = x*c - y*s, y1 = x*s + y*c; x = x1; y = y1; }
  return { x, y, z };
}

/* Проецируем прямоугольник w×h с центром (cx,cy) в 4 экранные точки. */
function projectQuad(w, h, cx, cy, rx, ry, rz, d) {
  const hw = w / 2, hh = h / 2;
  const src = [
    { x: -hw, y: -hh, z: 0 },   // 0: левый-верх   (u=0,v=0)
    { x:  hw, y: -hh, z: 0 },   // 1: правый-верх  (u=1,v=0)
    { x:  hw, y:  hh, z: 0 },   // 2: правый-низ   (u=1,v=1)
    { x: -hw, y:  hh, z: 0 },   // 3: левый-низ    (u=0,v=1)
  ];
  const out = [];
  for (const p of src) {
    const r = rot3(p, rx, ry, rz);
    const zc = clamp(r.z, -d * 0.95, d * 0.82);   // не даём точке уйти за камеру
    const k = d / (d - zc);
    out.push([cx + r.x * k, cy + r.y * k]);
  }
  return out;
}

/* Гомография: единичный квадрат (u,v) → четырёхугольник q[0..3]. */
function homography(q) {
  const [x0, y0] = q[0], [x1, y1] = q[1], [x2, y2] = q[2], [x3, y3] = q[3];
  const sx = x0 - x1 + x2 - x3;
  const sy = y0 - y1 + y2 - y3;
  if (Math.abs(sx) < 1e-9 && Math.abs(sy) < 1e-9) {
    return { a: x1-x0, b: x3-x0, c: x0, d: y1-y0, e: y3-y0, f: y0, g: 0, h: 0 };
  }
  const dx1 = x1 - x2, dx2 = x3 - x2, dy1 = y1 - y2, dy2 = y3 - y2;
  const den = dx1 * dy2 - dx2 * dy1;
  if (Math.abs(den) < 1e-9) {
    return { a: x1-x0, b: x3-x0, c: x0, d: y1-y0, e: y3-y0, f: y0, g: 0, h: 0 };
  }
  const g = (sx * dy2 - dx2 * sy) / den;
  const h = (dx1 * sy - sx * dy1) / den;
  return {
    a: x1 - x0 + g * x1, b: x3 - x0 + h * x3, c: x0,
    d: y1 - y0 + g * y1, e: y3 - y0 + h * y3, f: y0, g, h,
  };
}
const hmap = (H, u, v) => {
  const w = H.g * u + H.h * v + 1;
  return [(H.a*u + H.b*v + H.c) / w, (H.d*u + H.e*v + H.f) / w];
};

/* Аффинное преобразование по трём парам точек + рисование куска картинки. */
function texTri(g, img, s0, s1, s2, d0, d1, d2, clipPoly, sx, sy, sw, sh) {
  const p = s1[0]-s0[0], q = s1[1]-s0[1], r = s2[0]-s0[0], t = s2[1]-s0[1];
  const det = p*t - q*r;
  if (!det) return;
  const A = ((d1[0]-d0[0])*t - (d2[0]-d0[0])*q) / det;
  const C = (p*(d2[0]-d0[0]) - r*(d1[0]-d0[0])) / det;
  const E = d0[0] - A*s0[0] - C*s0[1];
  const B = ((d1[1]-d0[1])*t - (d2[1]-d0[1])*q) / det;
  const D = (p*(d2[1]-d0[1]) - r*(d1[1]-d0[1])) / det;
  const F = d0[1] - B*s0[0] - D*s0[1];

  g.save();
  g.beginPath();
  g.moveTo(clipPoly[0][0], clipPoly[0][1]);
  for (let i = 1; i < clipPoly.length; i++) g.lineTo(clipPoly[i][0], clipPoly[i][1]);
  g.closePath();
  g.clip();
  g.setTransform(A, B, C, D, E, F);
  g.drawImage(img, sx, sy, sw, sh, sx, sy, sw, sh);
  g.restore();
}

/* Растянуть многоугольник от центра на n пикселей — прячет швы между ячейками. */
function expand(poly, n) {
  let cx = 0, cy = 0;
  for (const p of poly) { cx += p[0]; cy += p[1]; }
  cx /= poly.length; cy /= poly.length;
  return poly.map(([x, y]) => {
    const dx = x - cx, dy = y - cy, L = Math.hypot(dx, dy) || 1;
    return [x + dx / L * n, y + dy / L * n];
  });
}

/* Нарисовать img в перспективный четырёхугольник q.

   Внутри ячейки текстура кладётся аффинно, а это лишь приближение к настоящей
   гомографии — на контрастной границе (край экрана, «остров») ошибка видна
   ступеньками. Но дробить сетку равномерно незачем: у гомографии знаменатель
   w = g·u + h·v + 1, и если h ≈ 0, то при фиксированном u отображение вдоль v
   строго аффинно. То есть при повороте только вокруг Y достаточно делить по
   горизонтали. Считаем число шагов по каждой оси из своего коэффициента —
   получается и точнее, и дешевле равномерной сетки.                        */
let forceGrid = null;                    // только для отладочных замеров

function drawPerspective(g, img, q) {
  const W = img.width, H = img.height;
  const Hm = homography(q);

  const side = (a, b) => Math.hypot(q[b][0] - q[a][0], q[b][1] - q[a][1]);
  const wpx = Math.max(side(0, 1), side(3, 2));
  const hpx = Math.max(side(0, 3), side(1, 2));

  /* Ячейку режем на два треугольника, у каждого своя аффинная матрица, и
     ошибка приближения растёт как persp × (сторона ячейки)². Замер на реальных
     позах дал коэффициент ≈8e-4, отсюда сторона под допуск в четверть пикселя.
     Ячейки держим квадратными: вытянутая ячейка даёт большую ошибку по своей
     диагонали, сколько бы шагов ни было по короткой стороне.               */
  const persp = Math.max(Math.abs(Hm.g), Math.abs(Hm.h));
  let Nu = 1, Nv = 1;
  if (persp > 0.002) {
    const cell = clamp(Math.sqrt(0.25 / (8e-4 * persp)), 16, 400);
    Nu = clamp(Math.ceil(wpx / cell), 1, 64);
    Nv = clamp(Math.ceil(hpx / cell), 1, 64);
    while (Nu * Nv > 4000) { if (Nu > Nv) Nu--; else Nv--; }
  }
  if (forceGrid) { Nu = forceGrid.Nu; Nv = forceGrid.Nv; }

  const cu = 1 / Nu, cv = 1 / Nv;
  for (let i = 0; i < Nu; i++) {
    for (let j = 0; j < Nv; j++) {
      const u0 = i * cu, u1 = u0 + cu, v0 = j * cv, v1 = v0 + cv;
      const P00 = hmap(Hm, u0, v0), P10 = hmap(Hm, u1, v0);
      const P11 = hmap(Hm, u1, v1), P01 = hmap(Hm, u0, v1);
      const poly = expand([P00, P10, P11, P01], 0.5);
      const sx = Math.max(0, u0 * W - 1), sy = Math.max(0, v0 * H - 1);
      const sw = Math.min(W - sx, cu * W + 2), sh = Math.min(H - sy, cv * H + 2);
      const S00 = [u0 * W, v0 * H], S10 = [u1 * W, v0 * H], S11 = [u1 * W, v1 * H], S01 = [u0 * W, v1 * H];
      texTri(g, img, S00, S10, S01, P00, P10, P01, poly, sx, sy, sw, sh);
      texTri(g, img, S10, S11, S01, P10, P11, P01, poly, sx, sy, sw, sh);
    }
  }
  return { Nu, Nv };
}

/* ================================================= рисование примитивов = */

/* Контур скруглённого прямоугольника в Path2D — чтобы складывать несколько
   контуров в один путь (кольцо = внешний минус внутренний, evenodd).      */
function rrPath(p, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  p.moveTo(x + r, y);
  p.arcTo(x + w, y,     x + w, y + h, r);
  p.arcTo(x + w, y + h, x,     y + h, r);
  p.arcTo(x,     y + h, x,     y,     r);
  p.arcTo(x,     y,     x + w, y,     r);
  p.closePath();
}
function ringClip(g, ox, oy, ow, oh, orad, ix, iy, iw, ih, irad) {
  const p = new Path2D();
  rrPath(p, ox, oy, ow, oh, orad);
  rrPath(p, ix, iy, iw, ih, irad);
  g.clip(p, 'evenodd');
}

function roundRect(g, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y,     x + w, y + h, r);
  g.arcTo(x + w, y + h, x,     y + h, r);
  g.arcTo(x,     y + h, x,     y,     r);
  g.arcTo(x,     y,     x + w, y,     r);
  g.closePath();
}

/* ============================================== экран телефона (контент) = */

function drawScreenContent(g, x, y, w, h) {
  g.fillStyle = S.screen.bg;
  g.fillRect(x, y, w, h);

  const av = activeVideo(drawTime);
  if (av && av.readyState >= 2 && av.videoWidth) {
    const video = av;
    const vw = video.videoWidth, vh = video.videoHeight;
    let dw, dh;
    if (S.screen.fit === 'stretch') { dw = w; dh = h; }
    else {
      const k = S.screen.fit === 'contain' ? Math.min(w / vw, h / vh) : Math.max(w / vw, h / vh);
      dw = vw * k; dh = vh * k;
    }
    dw *= S.screen.zoom; dh *= S.screen.zoom;
    const dx = x + (w - dw) / 2 + S.screen.offX * w;
    const dy = y + (h - dh) / 2 + S.screen.offY * h;
    try { g.drawImage(video, dx, dy, dw, dh); } catch (e) { /* кадр ещё не готов */ }
  } else {
    drawPlaceholder(g, x, y, w, h);
  }
}

/* Демо-экран, пока видео не загружено — чтобы сразу было видно композицию. */
function drawPlaceholder(g, x, y, w, h) {
  const gr = g.createLinearGradient(x, y, x + w * 0.4, y + h);
  gr.addColorStop(0, '#171a24'); gr.addColorStop(1, '#0a0b11');
  g.fillStyle = gr; g.fillRect(x, y, w, h);

  const gl = g.createRadialGradient(x + w * 0.5, y + h * 0.22, 0, x + w * 0.5, y + h * 0.22, w * 0.9);
  gl.addColorStop(0, 'rgba(91,140,255,.35)'); gl.addColorStop(1, 'rgba(91,140,255,0)');
  g.fillStyle = gl; g.fillRect(x, y, w, h);

  const P = w / 100;
  g.fillStyle = 'rgba(255,255,255,.90)';
  g.font = `700 ${P * 8}px -apple-system,"SF Pro Display","Helvetica Neue",Arial,sans-serif`;
  g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  g.fillText('Привет 👋', x + P * 8, y + h * 0.155);
  g.fillStyle = 'rgba(255,255,255,.45)';
  g.font = `500 ${P * 4.4}px -apple-system,"SF Pro Text","Helvetica Neue",Arial,sans-serif`;
  g.fillText('загрузи своё видео слева', x + P * 8, y + h * 0.195);

  const cardH = h * 0.105;
  for (let i = 0; i < 4; i++) {
    const cy = y + h * 0.245 + i * (cardH + h * 0.022);
    g.fillStyle = `rgba(255,255,255,${0.075 - i * 0.012})`;
    roundRect(g, x + P * 6, cy, w - P * 12, cardH, P * 4.5); g.fill();
    g.fillStyle = 'rgba(255,255,255,.16)';
    roundRect(g, x + P * 11, cy + cardH * 0.24, cardH * 0.52, cardH * 0.52, cardH * 0.16); g.fill();
    g.fillStyle = 'rgba(255,255,255,.24)';
    roundRect(g, x + P * 11 + cardH * 0.72, cy + cardH * 0.3, w * 0.42, cardH * 0.15, cardH * 0.075); g.fill();
    g.fillStyle = 'rgba(255,255,255,.13)';
    roundRect(g, x + P * 11 + cardH * 0.72, cy + cardH * 0.56, w * 0.28, cardH * 0.13, cardH * 0.065); g.fill();
  }

  // нижняя панель вкладок
  const tb = y + h * 0.895;
  g.fillStyle = 'rgba(255,255,255,.05)';
  g.fillRect(x, tb, w, h - (tb - y));
  for (let i = 0; i < 4; i++) {
    g.fillStyle = i === 0 ? 'rgba(91,140,255,.95)' : 'rgba(255,255,255,.22)';
    roundRect(g, x + w * (0.14 + i * 0.24) - P * 3.2, tb + h * 0.028, P * 6.4, P * 6.4, P * 2); g.fill();
  }
  // home indicator
  g.fillStyle = 'rgba(255,255,255,.5)';
  roundRect(g, x + w / 2 - w * 0.17, y + h - h * 0.012, w * 0.34, Math.max(2, h * 0.0045), h * 0.003); g.fill();
}

/* -------------------------------------------------------- статус-бар ---- */
function drawStatusBar(g, x, y, w, h, u) {
  const c = S.sb.style === 'dark' ? '#000' : '#fff';
  const fs = w * 0.048;
  const cy = y + h * 0.0215;
  g.fillStyle = c;
  g.font = `600 ${fs}px -apple-system,"SF Pro Text","Helvetica Neue",Arial,sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(S.sb.time, x + w * 0.155, cy + fs * 0.06);

  let rx = x + w - w * 0.075;
  // батарея
  const bw = w * 0.062, bh = bw * 0.48;
  g.globalAlpha = 0.42;
  roundRect(g, rx - bw, cy - bh / 2, bw, bh, bh * 0.32); g.lineWidth = Math.max(1, u * 3); g.strokeStyle = c; g.stroke();
  g.fillStyle = c; roundRect(g, rx + u * 1.5, cy - bh * 0.16, u * 4, bh * 0.32, u * 2); g.fill();
  g.globalAlpha = 1;
  g.fillStyle = c;
  roundRect(g, rx - bw + u * 3, cy - bh / 2 + u * 3, (bw - u * 6) * 0.82, bh - u * 6, bh * 0.2); g.fill();
  rx -= bw + w * 0.028;

  // wi-fi
  g.strokeStyle = c; g.lineCap = 'round';
  const wr = w * 0.026;
  for (let i = 0; i < 3; i++) {
    g.beginPath(); g.lineWidth = Math.max(1.2, u * 3.4);
    g.arc(rx - wr * 0.55, cy + wr * 0.55, wr * (0.32 + i * 0.32), -Math.PI * 0.78, -Math.PI * 0.22);
    g.stroke();
  }
  rx -= wr * 1.5 + w * 0.026;

  // сигнал
  const bwid = w * 0.011, gap = w * 0.006, base = cy + w * 0.019;
  for (let i = 0; i < 4; i++) {
    const bh2 = w * (0.011 + i * 0.0072);
    g.fillStyle = c; g.globalAlpha = i === 3 ? 0.4 : 1;
    roundRect(g, rx - (3 - i) * (bwid + gap) - bwid, base - bh2, bwid, bh2, bwid * 0.35); g.fill();
  }
  g.globalAlpha = 1;
}

/* ================================================= телефон целиком ====== */

/* Рисует телефон «в лоб» в offscreen-холст. pxW — ширина корпуса в пикселях. */
function renderPhoneFlat(pxW, ry, rx) {
  const dev = DEVICES[S.device];
  const F = FRAMES[S.frame];
  const u = pxW / 1000;
  const pad = 0;                       // кнопки и торцы рисуются в 3D отдельно
  const bw = Math.round(pxW), bh = Math.round(dev.h * u);
  const W = bw, H = bh;

  if (off.width !== W || off.height !== H) { off.width = W; off.height = H; }
  const g = octx;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, W, H);

  const R   = dev.bodyR * u;
  const bez = dev.bezel * u;
  const rim = dev.screenInset * u;
  let sx = pad + bez, sy = pad + bez, sw = bw - bez * 2, sh = bh - bez * 2;
  let SR = Math.max(2, R - bez);

  const fimg = frameImage(dev, S.frame);
  if (fimg) {
    /* Лицевая сторона из фото-рамки: видео под вырез, поверх — сама рамка.
       Прямоугольник экрана берём из промеров файла, а не из bezel.        */
    const fb = dev.frame.body, fs = dev.frame.screen, fi = dev.frame.island;
    const kx = bw / (fb[2] - fb[0] + 1), ky = bh / (fb[3] - fb[1] + 1);
    sx = (fs[0] - fb[0]) * kx; sy = (fs[1] - fb[1]) * ky;
    sw = (fs[2] - fs[0] + 1) * kx; sh = (fs[3] - fs[1] + 1) * ky;
    SR = Math.max(2, (R - bez) * 0.9);

    g.save();
    roundRect(g, sx, sy, sw, sh, SR); g.clip();
    drawScreenContent(g, sx, sy, sw, sh);
    if (S.fx.islandShadow) {                       // тень под запечённым «островом»
      const ix = (fi[0] - fb[0]) * kx, iy = (fi[1] - fb[1]) * ky, iw = (fi[2] - fi[0] + 1) * kx, ih = (fi[3] - fi[1] + 1) * ky;
      g.save(); g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = Math.max(2, u * 14); g.shadowOffsetY = u * 2;
      g.fillStyle = '#000'; roundRect(g, ix, iy, iw, ih, ih / 2); g.fill(); g.restore();
    }
    if (S.sb.on) drawStatusBar(g, sx, sy, sw, sh, u);
    if (S.glare.on && S.glare.amt > 0) drawGlare(g, sx, sy, sw, sh, ry, rx);
    g.restore();

    g.drawImage(fimg, fb[0], fb[1], fb[2] - fb[0] + 1, fb[3] - fb[1] + 1, 0, 0, bw, bh);

    if (S.fx.glow && S.fx.glowAmt > 0) {
      const [r, gg, b] = screenAvgColor();
      g.save();
      ringClip(g, 0, 0, bw, bh, R, sx, sy, sw, sh, SR);
      g.shadowColor = `rgba(${r | 0},${gg | 0},${b | 0},${S.fx.glowAmt})`;
      g.shadowBlur = Math.max(4, u * 22);
      g.fillStyle = 'rgba(0,0,0,0.001)'; roundRect(g, sx, sy, sw, sh, SR); g.fill();
      g.restore();
    }
    return { W, H, pad, bw, bh, sx, sy, sw, sh, u, R };
  }

  /* --- корпус --- */
  const body = g.createLinearGradient(pad, pad, pad + bw, pad + bh);
  body.addColorStop(0, F.a); body.addColorStop(0.5, F.b); body.addColorStop(1, F.a);
  roundRect(g, pad, pad, bw, bh, R);
  g.fillStyle = body; g.fill();

  /* блик по канту — имитация полированного металла */
  g.save();
  roundRect(g, pad + rim * 0.35, pad + rim * 0.35, bw - rim * 0.7, bh - rim * 0.7, R - rim * 0.35);
  const shift = clamp(ry / 45, -1, 1) * 0.22;
  const glareG = g.createLinearGradient(pad, pad, pad + bw, pad + bh * 0.35);
  glareG.addColorStop(clamp(0.02 + shift, 0, 1), F.hi);
  glareG.addColorStop(clamp(0.20 + shift, 0.01, 1), 'rgba(255,255,255,0)');
  glareG.addColorStop(clamp(0.52 + shift, 0.02, 1), F.hi);
  glareG.addColorStop(clamp(0.72 + shift, 0.03, 1), 'rgba(255,255,255,0)');
  glareG.addColorStop(1, F.hi);
  g.globalAlpha = 0.75;
  g.lineWidth = Math.max(1, rim * 0.75);
  g.strokeStyle = glareG; g.stroke();
  g.globalAlpha = 1;
  g.restore();

  /* --- чёрное стекло вокруг экрана --- */
  roundRect(g, pad + rim, pad + rim, bw - rim * 2, bh - rim * 2, R - rim);
  g.fillStyle = '#050506'; g.fill();

  /* --- экран --- */
  g.save();
  roundRect(g, sx, sy, sw, sh, SR);
  g.clip();
  drawScreenContent(g, sx, sy, sw, sh);
  if (S.fx.islandShadow) {
    g.save(); g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = Math.max(2, u * 14); g.shadowOffsetY = u * 2;
    drawCutout(g, dev, sx, sy, sw, sh, u);
    g.restore();
  } else drawCutout(g, dev, sx, sy, sw, sh, u);
  if (S.sb.on) drawStatusBar(g, sx, sy, sw, sh, u);
  if (S.glare.on && S.glare.amt > 0) drawGlare(g, sx, sy, sw, sh, ry, rx);
  g.restore();

  /* внутренняя тень по краю экрана */
  return finishProcedural(g, dev, pad, bw, bh, R, rim, sx, sy, sw, sh, SR, u, W, H);
}

function drawGlare(g, sx, sy, sw, sh, ry, rx) {
  {
    /* Зайчик: отражение источника света, которое вспыхивает, когда телефон
       проходит через определённый угол, и едет по стеклу вместе с поворотом.
       Именно он делает поворот «дорогим» — мягкой полосы для этого мало.   */
    const RX0 = 14, RY0 = -16, SIG = 21;
    const dr = ((ry - RY0) / SIG) ** 2 + (((rx || 0) - RX0) / SIG) ** 2;
    const I = Math.exp(-dr) * S.glare.amt * 4.2;
    if (I > 0.01) {
      const px = sx + sw * clamp(0.5 + (ry - RY0) * 0.011, 0.08, 0.92);
      const py = sy + sh * clamp(0.40 - ((rx || 0) - RX0) * 0.009, 0.08, 0.92);
      const r = sw * 0.62;
      const hg = g.createRadialGradient(px, py, 0, px, py, r);
      hg.addColorStop(0, `rgba(255,255,255,${clamp(I, 0, 0.85)})`);
      hg.addColorStop(0.35, `rgba(255,255,255,${clamp(I * 0.35, 0, 0.5)})`);
      hg.addColorStop(1, 'rgba(255,255,255,0)');
      g.save(); g.globalCompositeOperation = 'screen';
      g.fillStyle = hg; g.fillRect(sx, sy, sw, sh);
      g.restore();
    }
    const off2 = clamp(ry / 40, -1.1, 1.1);
    g.save();
    g.translate(sx + sw / 2, sy + sh / 2);
    g.rotate(-0.42);
    const L = Math.max(sw, sh) * 1.7;
    const gg = g.createLinearGradient(-L / 2, 0, L / 2, 0);
    const p = clamp(0.5 + off2 * 0.35, 0.06, 0.94);
    gg.addColorStop(Math.max(0, p - 0.20), 'rgba(255,255,255,0)');
    gg.addColorStop(p, `rgba(255,255,255,${S.glare.amt})`);
    gg.addColorStop(Math.min(1, p + 0.06), `rgba(255,255,255,${S.glare.amt * 0.35})`);
    gg.addColorStop(Math.min(1, p + 0.22), 'rgba(255,255,255,0)');
    g.fillStyle = gg;
    g.fillRect(-L / 2, -L / 2, L, L);
    g.restore();
  }
}

function finishProcedural(g, dev, pad, bw, bh, R, rim, sx, sy, sw, sh, SR, u, W, H) {
  g.save();
  roundRect(g, sx, sy, sw, sh, SR);
  g.lineWidth = Math.max(1, u * 3.5);
  g.strokeStyle = 'rgba(0,0,0,.55)';
  g.stroke();
  g.restore();

  /* Засветка: цвет экрана мягко ложится на чёрное стекло вокруг него.
     Без этого экран выглядит наклейкой, а не источником света.           */
  if (S.fx.glow && S.fx.glowAmt > 0) {
    const [r, gg, b] = screenAvgColor();
    g.save();
    ringClip(g, pad + rim, pad + rim, bw - rim * 2, bh - rim * 2, R - rim, sx, sy, sw, sh, SR);   // стекло минус экран
    g.shadowColor = `rgba(${r | 0},${gg | 0},${b | 0},${S.fx.glowAmt})`;
    g.shadowBlur = Math.max(4, u * 22);
    g.fillStyle = 'rgba(0,0,0,0.001)';
    roundRect(g, sx, sy, sw, sh, SR); g.fill();      // тень от «экрана» наружу = засветка
    g.restore();
  }

  return { W, H, pad, bw, bh, sx, sy, sw, sh, u, R };
}

function drawCutout(g, dev, sx, sy, sw, sh, u) {
  const cu = dev.cutout;
  g.fillStyle = '#000';
  if (cu.type === 'island') {
    const w = cu.w * u, h = cu.h * u;
    const x = sx + (sw - w) / 2, y = sy + cu.top * u;
    roundRect(g, x, y, w, h, h / 2); g.fill();
    // объектив
    g.fillStyle = '#0d1016';
    g.beginPath(); g.arc(x + w - h * 0.5, y + h / 2, h * 0.26, 0, TAU); g.fill();
    g.fillStyle = 'rgba(40,60,110,.5)';
    g.beginPath(); g.arc(x + w - h * 0.5, y + h / 2, h * 0.13, 0, TAU); g.fill();
  } else if (cu.type === 'notch') {
    const w = cu.w * u, h = cu.h * u, r = h * 0.55;
    const x = sx + (sw - w) / 2, y = sy;
    g.beginPath();
    g.moveTo(x - r, y);
    g.quadraticCurveTo(x, y, x, y + r * 0.9);
    g.lineTo(x, y + h - r);
    g.arcTo(x, y + h, x + r, y + h, r);
    g.lineTo(x + w - r, y + h);
    g.arcTo(x + w, y + h, x + w, y + h - r, r);
    g.lineTo(x + w, y + r * 0.9);
    g.quadraticCurveTo(x + w, y, x + w + r, y);
    g.closePath(); g.fill();
  } else if (cu.type === 'hole') {
    const d = cu.d * u;
    g.beginPath(); g.arc(sx + sw / 2, sy + cu.top * u + d / 2, d / 2, 0, TAU); g.fill();
    g.fillStyle = 'rgba(40,60,110,.45)';
    g.beginPath(); g.arc(sx + sw / 2, sy + cu.top * u + d / 2, d * 0.22, 0, TAU); g.fill();
  }
}

/* ================================================= 3D-корпус =========== */
/* Телефон — не плоскость, а скруглённая коробка толщиной dev.thick.
   Рисуем: задний контур → боковые грани (с бликами металла) → передний
   контур → текстура лицевой стороны. Кнопки — выступы того же торца.      */

function makeXform(rx, ry, rz, d, cx, cy, cam) {
  return {
    d,
    p3: (x, y, z) => rot3({ x, y, z }, rx, ry, rz),
    n3: (x, y, z) => rot3({ x, y, z }, rx, ry, rz),
    proj: (r) => {
      const zc = clamp(r.z, -d * 0.95, d * 0.82);
      const k = d / (d - zc);
      return [(cx + r.x * k - cam.cx) * cam.s + cam.ox,
              (cy + r.y * k - cam.cy) * cam.s + cam.oy];
    },
  };
}

/* Контур корпуса в локальных координатах (центр в 0) + внешние нормали. */
function outlinePoints(dev, bw, bh, R, u) {
  const hw = bw / 2, hh = bh / 2, r = Math.min(R, hw, hh);
  const CS = 14;                       // точек на скругление угла
  const pts = [];
  const push = (x, y, nx, ny) => pts.push({ x, y, nx, ny });
  const arc = (ccx, ccy, a0, a1) => {
    for (let i = 0; i <= CS; i++) {
      const a = a0 + (a1 - a0) * i / CS;
      push(ccx + Math.cos(a) * r, ccy + Math.sin(a) * r, Math.cos(a), Math.sin(a));
    }
  };
  const sideYs = (side) => {
    const ys = new Set();
    // Частая выборка обязательна: сегмент заливается ОДНИМ градиентом по своей
    // средней линии, и на длинном сегменте при перспективе он расходится с
    // реальным сечением торца — стыки начинают читаться как грани.
    const DIV = 12;
    for (let i = 1; i < DIV; i++) ys.add(-hh + r + (bh - 2 * r) * i / DIV);
    if (S.showButtons) {
      // скругление торца длиннее выступа, поэтому выборка идёт по большему из них
      const span = capRadius(dev) * bh;
      const STEPS = 8;
      for (const b of dev.buttons) {
        if (b.side !== side) continue;
        const y0 = -hh + b.t0 * bh, y1 = -hh + b.t1 * bh;
        for (let k = 0; k <= STEPS; k++) {
          const o = span * k / STEPS;
          [y0 - 0.4, y0 + o, y1 - o, y1 + 0.4].forEach(v => {
            if (v > -hh + r && v < hh - r) ys.add(v);
          });
        }
      }
    }
    return [...ys].sort((a, b) => a - b);
  };

  arc(-hw + r, -hh + r, Math.PI, Math.PI * 1.5);
  for (let i = 1; i < 6; i++) push(-hw + r + (bw - 2 * r) * i / 6, -hh, 0, -1);
  arc(hw - r, -hh + r, -Math.PI / 2, 0);
  for (const y of sideYs('right')) push(hw, y, 1, 0);
  arc(hw - r, hh - r, 0, Math.PI / 2);
  for (let i = 1; i < 6; i++) push(hw - r - (bw - 2 * r) * i / 6, hh, 0, 1);
  arc(-hw + r, hh - r, Math.PI / 2, Math.PI);
  for (const y of sideYs('left').reverse()) push(-hw, y, -1, 0);
  return pts;
}

/* Выступ боковой кнопки. У настоящего айфона торцы кнопок скруглены, а не
   обрублены, поэтому профиль идёт по четверти окружности, а не ступенькой.  */
/* У кнопки два независимых профиля.
   push — насколько она выходит наружу: нарастает быстро, за доли миллиметра.
   cap  — высота площадки на торце: её концы скруглены радиусом в ПОЛОВИНУ
          высоты самой кнопки (~2,5 мм), а не в величину выступа. Если считать
          их одним профилем, «таблетка» получается обрубленной.               */
/* Перспектива увеличивает лицевую сторону (она ближе), и она съедает
   примерно 5 юнитов выступа. Чтобы спереди кнопка читалась как выступ на
   силуэте, а не как волосок, выступ берём с этим запасом.                 */
const BTN_OUT  = 19;
const BTN_HALF = 0.19;   // полувысота площадки в долях толщины (≈3 мм в ширину)

const capRadius = dev => (BTN_HALF * dev.thick * S.thickK) / dev.h;

/* Выступ идёт ровно по тому же профилю, что и площадка. Раньше у них были
   разные рампы, и на концах кнопки оставался выдвинутый наружу кусок рамки,
   на котором никакой кнопки не нарисовано, — те самые чёрные полоски.      */
function buttonAt(dev, p, bh) {
  if (!S.showButtons || Math.abs(p.nx) < 0.99) return null;
  const side = p.nx < 0 ? 'left' : 'right';
  const ty = (p.y + bh / 2) / bh;
  const cr = capRadius(dev);
  for (const b of dev.buttons) {
    if (b.side !== side || ty <= b.t0 || ty >= b.t1) continue;
    const k = Math.min(ty - b.t0, b.t1 - ty) / cr;
    const cap = k >= 1 ? 1 : Math.sqrt(1 - (1 - k) * (1 - k));
    return { push: cap, cap };
  }
  return null;
}

/* Слои по толщине: передняя фаска, основной торец, задняя фаска. */
/* Торец заливается ОДНИМ градиентом поперёк толщины, а не полосами: плоские
   ступени давали резкие продольные линии вдоль всего корпуса — те самые
   «бортики». Стопы повторяют профиль: светлая передняя фаска, ровная середина,
   затемнение к задней грани.                                              */
/* Профиль торца — почти плоский. Яркая передняя фаска и тёмная задняя
   читались как два рельса по бокам кнопок; на живом корпусе торец ровный,
   с едва заметным градиентом.                                              */
const EDGE_STOPS = [[0, 0.10], [0.18, 0.04], [0.5, 0], [0.82, -0.04], [1, -0.11]];
const EDGE_BANDS = 26;                  // полос поперёк торца
const BTN_BANDS  = 12;

/* Полосы идут ТОЧНО по геометрии торца, поэтому не расходятся на стыках.
   Один градиент на сегмент так не умеет: его ось — средняя линия сегмента, а
   сечение торца вдоль сегмента меняется, и на границах расхождение
   переворачивается — торец рассыпается на плитки.                          */
function profileAt(stops, t) {
  if (t <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) {
      const [p0, v0] = stops[i - 1], [p1, v1] = stops[i];
      return lerp(v0, v1, (t - p0) / Math.max(1e-6, p1 - p0));
    }
  }
  return stops[stops.length - 1][1];
}
/* Кнопка — выпуклая: блик собран к середине, а по самым краям площадка уходит
   в тень. Это даёт мягкий шов вместо нарисованной обводки: отдельной линии
   нет, но кнопка отделяется от рамки.                                      */
/* Кнопка: только выпуклость — блик к середине, без тёмной обводки по краям. */
const BTN_STOPS  = [[0, 0.02], [0.28, 0.20], [0.50, 0.27], [0.72, 0.16], [1, 0.00]];

/* Двухточечный свет: ключевой сверху-слева и заливка справа, чтобы торец
   был читаемым при любом повороте, плюс два блика — полированный металл. */
const nrm = (x, y, z) => { const m = Math.hypot(x, y, z) || 1; return { x: x/m, y: y/m, z: z/m }; };
const L_KEY  = nrm(-0.45, -0.55, 0.70);
const L_FILL = nrm( 0.78, -0.22, 0.55);
const H_KEY  = nrm(L_KEY.x,  L_KEY.y,  L_KEY.z  + 1);
const H_FILL = nrm(L_FILL.x, L_FILL.y, L_FILL.z + 1);
const dot3 = (a, b) => a.x*b.x + a.y*b.y + a.z*b.z;

/* Блик широкий и мягкий. С показателями 30 и 60 отражение занимало пару
   градусов: при повороте торец вспыхивал из тёмного в белое за один кадр —
   отсюда резкая смена цвета кнопок. Анодированный алюминий бликует широко.  */
function shadeNormal(n) {
  const d1 = Math.max(0, dot3(n, L_KEY));
  const d2 = Math.max(0, dot3(n, L_FILL));
  const s1 = Math.pow(Math.max(0, dot3(n, H_KEY)),  8) * 0.26;
  const s2 = Math.pow(Math.max(0, dot3(n, H_FILL)), 12) * 0.16;
  return clamp(0.18 + 0.44 * d1 + 0.28 * d2 + s1 + s2, 0, 1);
}

let lutCache = { key: null, lut: null };
function frameLUT(F, key) {
  if (lutCache.key === key) return lutCache.lut;
  const lut = [];
  for (let i = 0; i <= 128; i++) {          // мелкий шаг: иначе видны полосы
    const t = i / 128;
    lut.push(t < 0.5 ? mix(F.lo, F.a, t * 2) : mix(F.a, F.hi, (t - 0.5) * 2));
  }
  lutCache = { key, lut };
  return lut;
}

function buildBody(xf, outline, dev, info, T) {
  const N = outline.length;
  /* Торец идёт по НЕвыдвинутому контуру — он ровный по всей длине. Наружу
     выступает только площадка кнопки (bx/by): если выдвигать весь торец в
     зоне кнопки, получается широкий уступ, на котором лежит овал, — и этот
     уступ читается как бортик.                                             */
  const ox = new Array(N), oy = new Array(N), bx = new Array(N), by = new Array(N), cap = new Array(N);
  for (let i = 0; i < N; i++) {
    const p = outline[i];
    const b = buttonAt(dev, p, info.bh);
    cap[i] = b ? b.cap : 0;
    const push = (b ? b.push : 0) * BTN_OUT * info.u;
    ox[i] = p.x; oy[i] = p.y;
    bx[i] = p.x + p.nx * push; by[i] = p.y + p.ny * push;
  }
  // уровни поперёк торца: полосы следуют реальной геометрии
  const rows = [];
  for (let k = 0; k <= EDGE_BANDS; k++) {
    const z = T / 2 - (k / EDGE_BANDS) * T;
    const out = new Array(N);
    for (let i = 0; i < N; i++) out[i] = xf.proj(xf.p3(ox[i], oy[i], z));
    rows.push(out);
  }
  // нормали и видимость граней
  const vis = new Array(N), shade = new Array(N);
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N;
    const p = outline[i], q = outline[j];
    let nx = (p.nx + q.nx) / 2, ny = (p.ny + q.ny) / 2;
    const m = Math.hypot(nx, ny) || 1; nx /= m; ny /= m;
    const n = xf.n3(nx, ny, 0);
    const mid = xf.p3((ox[i] + ox[j]) / 2, (oy[i] + oy[j]) / 2, 0);
    const vx = -mid.x, vy = -mid.y, vz = xf.d - mid.z;
    const vm = Math.hypot(vx, vy, vz) || 1;
    vis[i] = (n.x * vx + n.y * vy + n.z * vz) / vm > 0.02;
    shade[i] = shadeNormal(n);
  }
  // уровни площадки кнопки
  const bRows = [];
  for (let k = 0; k <= BTN_BANDS; k++) bRows.push(new Array(N));
  for (let i = 0; i < N; i++) {
    if (cap[i] <= 0.015) continue;
    const h = BTN_HALF * cap[i];
    for (let k = 0; k <= BTN_BANDS; k++)
      bRows[k][i] = xf.proj(xf.p3(bx[i], by[i], T / 2 - (0.5 - h + 2 * h * k / BTN_BANDS) * T));
  }

  /* Стенки кнопки: полоска между контуром корпуса и выдвинутой площадкой на
     уровне её верхней/нижней кромки. Именно передняя стенка видна, когда
     смотришь на телефон спереди — площадка в этот момент ребро.            */
  const wTop = new Array(N), wBot = new Array(N);
  for (let i = 0; i < N; i++) {
    if (cap[i] <= 0.015) continue;
    const h = BTN_HALF * cap[i];
    wTop[i] = xf.proj(xf.p3(ox[i], oy[i], T / 2 - (0.5 - h) * T));
    wBot[i] = xf.proj(xf.p3(ox[i], oy[i], T / 2 - (0.5 + h) * T));
  }
  const nFront = xf.n3(0, 0, 1);
  const frontVis = nFront.z > 0.02;
  const frontShade = shadeNormal(nFront);

  const hw = info.bw / 2, hh = info.bh / 2;
  const frontQuad = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]]
    .map(([x, y]) => xf.proj(xf.p3(x, y, T / 2)));

  return { N, rows, vis, shade, cap, bRows, wTop, wBot, frontVis, frontShade, uu: info.u, frontQuad, silhouette: hull(rows[0].concat(rows[rows.length - 1], bRows[0].filter(Boolean), bRows[BTN_BANDS].filter(Boolean))) };
}

/* Выпуклая оболочка — нужна только тени, поэтому упрощение допустимо. */
function hull(pts) {
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const cross = (o, a, b) => (a[0]-o[0])*(b[1]-o[1]) - (a[1]-o[1])*(b[0]-o[0]);
  const lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length-2], lo[lo.length-1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cross(up[up.length-2], up[up.length-1], q) <= 0) up.pop(); up.push(q); }
  lo.pop(); up.pop();
  return lo.concat(up);
}

function polyPath(g, pts) {
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  g.closePath();
}

function drawBody3D(g, geo, F) {
  const { N, rows, vis, shade } = geo;
  const lut = frameLUT(F, S.frame);
  const pick = v => lut[clamp(Math.round(v * 128), 0, 128)];

  // задняя крышка — база, чтобы между гранями не просвечивал фон
  polyPath(g, rows[rows.length - 1]); g.fillStyle = F.lo; g.fill();

  bandStrips(g, rows, N, vis, shade, pick, EDGE_STOPS, F.lo, null);

  // подложка лицевой стороны — убирает волосяные швы у скруглений
  polyPath(g, rows[0]); g.fillStyle = F.b; g.fill();

  // кнопки поверх подложки: их передняя площадка частично заходит внутрь
  // силуэта лицевой стороны, и подложка иначе закрасила бы её целиком
  drawButtonFaces(g, geo, pick);
}

/* Четырёхугольник a0→a1→b1→b0 с нахлёстом вдоль и поперёк: без него между
   соседними полосами просвечивает подложка волосяными линиями.            */
function quadPath(g, a0, a1, b1, b0) {
  let dx = a1[0] - a0[0], dy = a1[1] - a0[1];
  const len = Math.hypot(dx, dy);
  if (len > 1e-4) { const e = Math.min(0.35, len * 0.5) / len; dx *= e; dy *= e; } else { dx = dy = 0; }
  let ex0 = b0[0] - a0[0], ey0 = b0[1] - a0[1];
  const l0 = Math.hypot(ex0, ey0);
  if (l0 > 1e-4) { const e = Math.min(0.35, l0 * 0.45) / l0; ex0 *= e; ey0 *= e; } else { ex0 = ey0 = 0; }
  let ex1 = b1[0] - a1[0], ey1 = b1[1] - a1[1];
  const l1 = Math.hypot(ex1, ey1);
  if (l1 > 1e-4) { const e = Math.min(0.35, l1 * 0.45) / l1; ex1 *= e; ey1 *= e; } else { ex1 = ey1 = 0; }
  g.beginPath();
  g.moveTo(a0[0] - dx - ex0, a0[1] - dy - ey0);
  g.lineTo(a1[0] + dx - ex1, a1[1] + dy - ey1);
  g.lineTo(b1[0] + dx + ex1, b1[1] + dy + ey1);
  g.lineTo(b0[0] - dx + ex0, b0[1] - dy + ey0);
  g.closePath();
}

/* Кольцо между кромками заливается полосами по уровням: каждая полоса —
   настоящий четырёхугольник торца, поэтому стыки сходятся точно.          */
function bandStrips(g, rows, N, vis, shade, pick, stops, hiddenColor, only) {
  const L = rows.length - 1;
  for (let k = 0; k < L; k++) {
    const A = rows[k], B = rows[k + 1];
    const d = profileAt(stops, (k + 0.5) / L);
    for (let i = 0; i < N; i++) {
      const j = (i + 1) % N;
      if (only && !(only[i] && only[j])) continue;
      const a0 = A[i], a1 = A[j], b1 = B[j], b0 = B[i];
      if (!a0 || !a1 || !b1 || !b0) continue;
      if (!vis[i] && !hiddenColor) continue;
      quadPath(g, a0, a1, b1, b0);
      g.fillStyle = vis[i] ? pick(shade[i] + d) : hiddenColor;
      g.fill();
    }
  }
}

/* Кнопка = выступающий скруглённый брусок: спереди видна его стенка, сбоку —
   площадка. Площадка не «торец + константа» и не переключатель «светлее /
   темнее» по порогу (тот давал скачок цвета на повороте): это форма —
   светлый центр и тёмные края ОТНОСИТЕЛЬНО торца. На тёмном торце читается
   центр, на светлом — края, и всё меняется непрерывно.                    */
const BTN_CONVEX = [[0, -0.14], [0.22, 0.02], [0.50, 0.20], [0.78, 0.02], [1, -0.14]];   // смещение к торцу

function drawButtonFaces(g, geo, pick) {
  const { N, cap, bRows, wTop, wBot, vis, shade, frontVis, frontShade } = geo;
  if (!S.showButtons) return;
  const on = cap.map(c => c > 0.015);
  const L = bRows.length - 1;

  /* Стенка — та, что обращена к зрителю. Она полированная и ловит свет,
     поэтому светлая; тонкий тёмный шов отделяет её от канта корпуса — без
     шва серое на сером спереди не читается вовсе.                         */
  const wall = frontVis ? wTop : wBot, edge = frontVis ? bRows[0] : bRows[L];
  const wallColor = pick(clamp(0.70 + frontShade * 0.28, 0, 1));
  const seamW = Math.max(0.8, geo.uu * 1.6);
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N;
    if (!(on[i] && on[j])) continue;
    const a0 = wall[i], a1 = wall[j], b1 = edge[j], b0 = edge[i];
    if (!a0 || !a1 || !b1 || !b0) continue;
    quadPath(g, a0, a1, b1, b0);
    g.fillStyle = wallColor; g.fill();
  }
  g.save();
  g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = seamW; g.lineCap = 'round';
  g.beginPath();
  let open = false;
  for (let i = 0; i < N; i++) {
    const p = (on[i] && wall[i]) ? wall[i] : null;
    if (p) { open ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); open = true; }
    else open = false;
  }
  g.stroke(); g.restore();

  // площадка: выпуклая, с контрастом к торцу в нужную сторону
  for (let k = 0; k < L; k++) {
    const A = bRows[k], B = bRows[k + 1];
    const dv = profileAt(BTN_CONVEX, (k + 0.5) / L);
    for (let i = 0; i < N; i++) {
      const j = (i + 1) % N;
      if (!(on[i] && on[j]) || !vis[i]) continue;
      const a0 = A[i], a1 = A[j], b1 = B[j], b0 = B[i];
      if (!a0 || !a1 || !b1 || !b0) continue;
      quadPath(g, a0, a1, b1, b0);
      g.fillStyle = pick(clamp(shade[i] + dv, 0, 1)); g.fill();
    }
  }
}

/* ========================================================= фон ========== */

function drawBackground(g, cam) {
  const W = S.cw, H = S.ch, B = S.bg;
  if (B.type === 'none') return;
  const par = cam && cam.s > 1.0001;
  if (par) {
    const ps = 1 + (cam.s - 1) * 0.10;
    g.save();
    g.translate(W / 2, H / 2); g.scale(ps, ps); g.translate(-W / 2, -H / 2);
    g.translate(-(cam.cx - W / 2) * 0.10, -(cam.cy - H / 2) * 0.10);
  }

  if (B.type === 'image' && bgImage) {
    const k = Math.max(W / bgImage.width, H / bgImage.height);
    const dw = bgImage.width * k, dh = bgImage.height * k;
    g.save();
    if (B.blur > 0) { g.filter = `blur(${B.blur}px)`; g.translate(W / 2, H / 2); g.scale(1.12, 1.12); g.translate(-W / 2, -H / 2); }
    g.drawImage(bgImage, (W - dw) / 2, (H - dh) / 2, dw, dh);
    g.restore();
  } else if (B.type === 'solid') {
    g.fillStyle = B.a; g.fillRect(0, 0, W, H);
  } else if (B.type === 'radial') {
    g.fillStyle = B.b; g.fillRect(0, 0, W, H);
    const gr = g.createRadialGradient(W * 0.5, H * 0.38, 0, W * 0.5, H * 0.38, Math.max(W, H) * 0.75);
    gr.addColorStop(0, B.a); gr.addColorStop(1, B.b);
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
  } else if (B.type === 'studio') {
    /* Циклорама: пол переходит в стену без стыка, сверху — мягкое пятно
       света, снизу лёгкое затемнение. Именно это даёт «продуктовый» вид. */
    const base = g.createLinearGradient(0, 0, 0, H);
    base.addColorStop(0, mix(B.b, '#000000', 0.18));
    base.addColorStop(0.52, B.b);
    base.addColorStop(1, mix(B.b, '#000000', 0.30));
    g.fillStyle = base; g.fillRect(0, 0, W, H);

    const lx = W * (0.5 + lightPos.x), ly = H * (0.40 + lightPos.y);
    const sp = g.createRadialGradient(lx, ly, 0, lx, ly, Math.max(W, H) * 0.60);
    sp.addColorStop(0, hexA(B.a, 0.95));
    sp.addColorStop(0.42, hexA(B.a, 0.34));
    sp.addColorStop(1, hexA(B.a, 0));
    g.fillStyle = sp; g.fillRect(0, 0, W, H);

    const fl = g.createLinearGradient(0, H * 0.60, 0, H);
    fl.addColorStop(0, 'rgba(0,0,0,0)');
    fl.addColorStop(1, 'rgba(0,0,0,.20)');
    g.fillStyle = fl; g.fillRect(0, H * 0.60, W, H * 0.40);
  } else if (B.type === 'mesh') {
    g.fillStyle = B.b; g.fillRect(0, 0, W, H);
    const blobs = [
      [0.18, 0.16, 0.72, B.a, 0.85],
      [0.86, 0.30, 0.62, mix(B.a, '#ff5ea8', 0.55), 0.55],
      [0.28, 0.82, 0.70, mix(B.a, '#38d39f', 0.5), 0.45],
      [0.78, 0.92, 0.58, mix(B.a, '#ffd166', 0.45), 0.35],
    ];
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const [px, py, rr, col, al] of blobs) {
      const gr = g.createRadialGradient(W * px, H * py, 0, W * px, H * py, Math.max(W, H) * rr);
      gr.addColorStop(0, hexA(col, al)); gr.addColorStop(1, hexA(col, 0));
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
    }
    g.restore();
  } else {
    const a = B.angle * RAD;
    const L = Math.abs(W * Math.cos(a)) + Math.abs(H * Math.sin(a));
    const cx = W / 2, cy = H / 2;
    const gr = g.createLinearGradient(cx - Math.cos(a) * L / 2, cy - Math.sin(a) * L / 2,
                                      cx + Math.cos(a) * L / 2, cy + Math.sin(a) * L / 2);
    gr.addColorStop(0, B.a); gr.addColorStop(1, B.b);
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
  }

  if (par) g.restore();
  if (B.dim > 0) { g.fillStyle = `rgba(0,0,0,${B.dim})`; g.fillRect(0, 0, W, H); }
}

function drawVignette(g) {
  if (S.vignette <= 0) return;
  const W = S.cw, H = S.ch;
  const gr = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.28, W / 2, H / 2, Math.max(W, H) * 0.78);
  gr.addColorStop(0, 'rgba(0,0,0,0)');
  gr.addColorStop(1, `rgba(0,0,0,${S.vignette})`);
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
}

function makeGrain() {
  const t = document.createElement('canvas');
  t.width = t.height = 220;
  const tc = t.getContext('2d');
  const d = tc.createImageData(220, 220);
  for (let i = 0; i < d.data.length; i += 4) {
    const v = 110 + Math.random() * 90;
    d.data[i] = d.data[i+1] = d.data[i+2] = v; d.data[i+3] = 255;
  }
  tc.putImageData(d, 0, 0);
  return t;
}
function drawGrain(g) {
  if (S.grain <= 0) return;
  if (!grainTile) grainTile = makeGrain();
  g.save();
  g.globalAlpha = S.grain;
  g.globalCompositeOperation = 'overlay';
  g.fillStyle = g.createPattern(grainTile, 'repeat');
  g.fillRect(0, 0, S.cw, S.ch);
  g.restore();
}

/* --------------------------------------------------------- цветовые утилиты */
function hex2rgb(h) {
  h = h.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function hexA(h, a) { const [r, g, b] = hex2rgb(h); return `rgba(${r},${g},${b},${a})`; }
function mix(h1, h2, t) {
  const a = hex2rgb(h1), b = hex2rgb(h2);
  return '#' + [0,1,2].map(i => Math.round(lerp(a[i], b[i], t)).toString(16).padStart(2, '0')).join('');
}

/* ========================================================= тень ========= */

function drawShadow(g, poly0) {
  const sh = S.shadow;
  if (!sh.on || sh.opacity <= 0 || !poly0 || poly0.length < 3) return;
  let cx = 0, cy = 0;
  for (const p of poly0) { cx += p[0]; cy += p[1]; }
  cx /= poly0.length; cy /= poly0.length;
  const k = Math.max(0.05, sh.spread);
  const sc = S.ch / 1920;
  const poly = poly0.map(([x, y]) => [cx + (x - cx) * k + sh.x * sc, cy + (y - cy) * k + sh.y * sc]);

  g.save();
  const blur = sh.blur * sc;
  if (blur > 0.5) g.filter = `blur(${blur}px)`;
  g.globalAlpha = sh.opacity;
  g.fillStyle = '#000';
  polyPath(g, poly); g.fill();
  g.filter = `blur(${Math.max(1, blur * 0.28)}px)`;
  g.globalAlpha = sh.opacity * 0.55;
  polyPath(g, poly0.map(([x, y]) => [cx + (x - cx) * 0.985 + sh.x * sc * 0.25, cy + (y - cy) * 0.985 + sh.y * sc * 0.25]));
  g.fill();
  g.restore();
}

/* ========================================================= текст ======== */

function wrapText(g, text, maxW) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = []; let cur = '';
  for (const w of words) {
    const test = cur ? cur + ' ' + w : w;
    if (g.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; }
    else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}

function drawTextLayer(g) {
  const T = S.text;
  if (!T.on) return;
  const W = S.cw, H = S.ch;
  const size = T.size * (H / 1920) * 1.6;
  const maxW = W * 0.84;
  g.save();
  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';
  g.shadowColor = 'rgba(0,0,0,.35)';
  g.shadowBlur = size * 0.35;
  g.shadowOffsetY = size * 0.06;

  g.font = `800 ${size}px -apple-system,"SF Pro Display","Helvetica Neue",Arial,sans-serif`;
  const tl = T.title ? wrapText(g, T.title, maxW) : [];
  const subSize = size * 0.44;
  g.font = `500 ${subSize}px -apple-system,"SF Pro Text","Helvetica Neue",Arial,sans-serif`;
  const sl = T.sub ? wrapText(g, T.sub, maxW) : [];

  const lh = size * 1.1, slh = subSize * 1.35;
  const block = tl.length * lh + (sl.length ? sl.length * slh + size * 0.35 : 0);
  let y = T.pos === 'top' ? H * 0.085 + size * 0.85 : H - H * 0.075 - block + size * 0.85;

  g.fillStyle = T.color;
  g.font = `800 ${size}px -apple-system,"SF Pro Display","Helvetica Neue",Arial,sans-serif`;
  for (const line of tl) { g.fillText(line, W / 2, y); y += lh; }
  if (sl.length) {
    y += size * 0.35 - lh + slh * 0.2;
    g.globalAlpha = 0.72;
    g.font = `500 ${subSize}px -apple-system,"SF Pro Text","Helvetica Neue",Arial,sans-serif`;
    for (const line of sl) { g.fillText(line, W / 2, y); y += slh; }
  }
  g.restore();
}

/* Прямоугольник экрана телефона в пикселях холста (только в плоском режиме). */
function screenRectPx(quad, info) {
  const kx = (quad[1][0] - quad[0][0]) / info.W;
  const ky = (quad[3][1] - quad[0][1]) / info.H;
  return { x: quad[0][0] + info.sx * kx, y: quad[0][1] + info.sy * ky, w: info.sw * kx, h: info.sh * ky };
}

/* ================================================= главный кадр ========= */

function scenarioById(id) { return SCENARIOS.find(x => x.id === id) || SCENARIOS[0]; }
function sceneEnd(b) { return b.t0 + b.dur; }
function sortedScenes() { return S.scenes.slice().sort((a, b) => a.t0 - b.t0); }

/* Какой блок сцены действует в момент t: внутри блока — он сам, в промежутке
   между блоками — предыдущий (камера замирает в его финале), до первого —
   первый в стартовой позе.                                                 */
function sceneAt(t) {
  const list = sortedScenes();
  if (!list.length) return null;
  let cur = null;
  for (const b of list) { if (t >= b.t0) cur = b; else break; }
  if (!cur) return { block: list[0], local: 0 };
  const sc = scenarioById(cur.sc);
  const local = (t - cur.t0) / Math.max(0.1, cur.dur) * sc.dur;
  return { block: cur, local };
}

/* Уход в чёрное на стыках соседних сцен: последняя доля секунды одной и
   первая — следующей. Между несмежными блоками затемнения нет.             */
function sceneFade(t) {
  const list = sortedScenes();
  let f = 0;
  for (let i = 0; i < list.length; i++) {
    const b = list[i];
    const prev = list[i - 1], next = list[i + 1];
    const half = REEL_GAP / 2;
    if (next && Math.abs(next.t0 - sceneEnd(b)) < 0.05) {
      const dt = sceneEnd(b) - t;                       // конец блока
      if (dt >= 0 && dt < half) f = Math.max(f, 1 - dt / half);
    }
    if (prev && Math.abs(b.t0 - sceneEnd(prev)) < 0.05) {
      const dt = t - b.t0;                              // начало блока
      if (dt >= 0 && dt < half) f = Math.max(f, 1 - dt / half);
    }
  }
  return smoother(clamp(f, 0, 1));
}

function composedPose(t) {
  const p = S.pose;
  const A = S.scene.amount;
  const d = { dx: 0, dy: 0, ds: 0, drx: 0, dry: 0, drz: 0, lx: 0, ly: 0 };

  const at = sceneAt(t);
  if (at) {
    const k = evalScenario(at.local, scenarioById(at.block.sc));
    if (k) for (const f of KEYF) d[f] += (k[f] || 0) * (f === 'lx' || f === 'ly' ? 1 : A);
  }

  if (S.scene.idle > 0) {
    const i = idleDrift(t);
    for (const f of ['dx', 'dy', 'ds', 'drx', 'dry', 'drz']) d[f] += i[f] * S.scene.idle;
  }

  return {
    x: p.x + d.dx, y: p.y + d.dy,
    scale: Math.max(0.05, p.scale * (1 + d.ds)),
    rx: p.rx + d.drx, ry: p.ry + d.dry, rz: p.rz + d.drz,
    persp: p.persp,
    lx: d.lx, ly: d.ly,
  };
}

/* ------------------------------------------------------ наезды (клипы) -- */

let clipSeq = 1;

function clipEnd(c) { return c.t0 + c.dur; }
function getClip(id) { return S.clips.find(c => c.id === id) || null; }
/* Блок сценария живёт на своей дорожке, но двигается и режется тем же кодом. */
const isSceneId = id => typeof id === 'string' && id.startsWith('s');
const isMediaId = id => typeof id === 'string' && id.startsWith('m');
function getScene(id) { return S.scenes.find(b => b.id === id) || null; }
function dragTarget(id) { return isSceneId(id) ? getScene(id) : isMediaId(id) ? getMedia(id) : getClip(id); }
let sceneSeq = 1;
function newSceneId() { return 's' + (sceneSeq++); }
function selectedClip() { return getClip(S.sel); }

/* Пятого порядка: в отличие от кубической, у неё на концах нулевая не только
   скорость, но и ускорение — наезд трогается и останавливается без толчка. */
const smoother = t => t * t * t * (t * (t * 6 - 15) + 10);

/* Клипы не пересекаются, поэтому в каждый момент активен максимум один. */
function focusAt(t) {
  for (const c of S.clips) {
    if (t < c.t0 || t > clipEnd(c)) continue;
    const ramp = Math.min(c.ramp, c.dur / 2);
    const l = t - c.t0, r = clipEnd(c) - t;
    let k = 1;
    if (ramp > 0.01) {
      if (l < ramp) k = smoother(l / ramp);
      else if (r < ramp) k = smoother(r / ramp);
    }
    return { k, clip: c };
  }
  return { k: 0, clip: null };
}

let lastRender = null, lastGrid = null;
let drawTime = 0;          // время кадра: по нему выбирается активный видеоклип
let lightPos = { x: 0, y: 0 };      // смещение пятна света в текущем кадре

/* Слои для отражения: телефон рисуется отдельно, чтобы его можно было
   зеркалить. Холсты переиспользуются и растут только при смене размера.  */
let layerCanvas = null, reflCanvas = null;
function layerCtx(W, H) {
  if (!layerCanvas) layerCanvas = document.createElement('canvas');
  if (layerCanvas.width !== W || layerCanvas.height !== H) { layerCanvas.width = W; layerCanvas.height = H; }
  return layerCanvas.getContext('2d');
}
function reflCtx(W, H) {
  if (!reflCanvas) reflCanvas = document.createElement('canvas');
  if (reflCanvas.width !== W || reflCanvas.height !== H) { reflCanvas.width = W; reflCanvas.height = H; }
  return reflCanvas.getContext('2d');
}

/* Средний цвет экрана — для засветки рамки. Считается раз в несколько
   кадров через холст 4×4, чтобы не читать большой буфер каждый кадр.     */
const avgCv = document.createElement('canvas'); avgCv.width = avgCv.height = 4;
let avgColor = [40, 60, 120], avgTick = 0;
function screenAvgColor() {
  if ((avgTick++ % 6) !== 0) return avgColor;
  try {
    const g = avgCv.getContext('2d', { willReadFrequently: true });
    const av = activeVideo(drawTime);
    if (av && av.readyState >= 2) g.drawImage(av, 0, 0, 4, 4);
    else { g.fillStyle = '#1a2040'; g.fillRect(0, 0, 4, 4); }
    const d = g.getImageData(0, 0, 4, 4).data;
    let r = 0, gg = 0, b = 0;
    for (let i = 0; i < d.length; i += 4) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; }
    avgColor = [r / 16, gg / 16, b / 16];
  } catch (_) {}
  return avgColor;
}

function draw(t) {
  drawTime = t;
  const W = S.cw, H = S.ch;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.filter = 'none';
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.clearRect(0, 0, W, H);

  const sel = selecting;
  const P = sel
    ? { x: 0, y: 0, scale: Math.min(S.pose.scale, 1.12), rx: 0, ry: 0, rz: 0, persp: S.pose.persp }
    : composedPose(t);
  const dev = DEVICES[S.device];
  const F = FRAMES[S.frame];

  /* Базовый размер ограничен и высотой, и шириной кадра. Если считать только
     от высоты, один и тот же сценарий в вертикальном кадре раздувает телефон
     во весь экран, а в горизонтальном оставляет его мелким.               */
  const bodyH = Math.min(H * 0.74, W * 0.55 * dev.h / 1000) * P.scale;
  const bodyW = bodyH * (1000 / dev.h);
  lightPos = { x: P.lx || 0, y: P.ly || 0 };
  const info = renderPhoneFlat(clamp(bodyW, 24, 4000), P.ry, P.rx);
  const T = info.bw * (dev.thick || 110) / 1000 * S.thickK;

  const cx = W / 2 + P.x * W, cy = H / 2 + P.y * H;
  const d = P.persp * (H / 1920);
  const rx = P.rx * RAD, ry = P.ry * RAD, rz = P.rz * RAD;

  /* --- камера наезда на выделенный участок экрана --- */
  const idc = { s: 1, cx: W / 2, cy: H / 2, ox: W / 2, oy: H / 2 };
  let cam = idc;
  const fa = sel ? { k: 0, clip: null } : focusAt(t);
  const k = fa.k;
  if (k > 0.0005 && fa.clip) {
    const xf0 = makeXform(rx, ry, rz, d, cx, cy, idc);
    const hw = info.bw / 2, hh = info.bh / 2;
    const q0 = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(([x, y]) => xf0.proj(xf0.p3(x, y, T / 2)));
    const Hm = homography(q0);
    const f = fa.clip;
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const [u, v] of [[f.u0, f.v0], [f.u1, f.v0], [f.u1, f.v1], [f.u0, f.v1]]) {
      const [px, py] = hmap(Hm, (info.sx + u * info.sw) / info.W, (info.sy + v * info.sh) / info.H);
      x0 = Math.min(x0, px); y0 = Math.min(y0, py);
      x1 = Math.max(x1, px); y1 = Math.max(y1, py);
    }
    const need = Math.min(W * f.fill / Math.max(1, x1 - x0), H * f.fill / Math.max(1, y1 - y0));
    cam = {
      s: lerp(1, Math.max(1, need), k),
      cx: lerp(W / 2, (x0 + x1) / 2, k),
      cy: lerp(H / 2, (y0 + y1) / 2, k),
      ox: W / 2, oy: H / 2,
    };
  }

  /* Глубина резкости: чем ближе телефон (крупнее масштаб), тем сильнее размыт
     задник. Самый сильный «киношный» признак — и самый дешёвый.            */
  const dofPx = (S.dof.on && !sel)
    ? S.dof.amt * 34 * (H / 1920) * clamp((P.scale * cam.s - 1.05) / 1.3, 0, 1) : 0;
  if (dofPx > 0.4) {
    ctx.save(); ctx.filter = `blur(${dofPx.toFixed(1)}px)`;
    // рисуем с запасом по краям, иначе blur подтягивает прозрачное за границей
    ctx.translate(W / 2, H / 2); ctx.scale(1 + dofPx * 3 / W, 1 + dofPx * 3 / H); ctx.translate(-W / 2, -H / 2);
    drawBackground(ctx, cam);
    ctx.restore(); ctx.filter = 'none';
  } else drawBackground(ctx, cam);

  const xf = makeXform(rx, ry, rz, d, cx, cy, cam);
  const outline = outlinePoints(dev, info.bw, info.bh, info.R, info.u);
  const geo = buildBody(xf, outline, dev, info, T);

  drawShadow(ctx, geo.silhouette);
  drawTextLayer(ctx);

  const wantReflect = S.reflect.on && !sel && S.bg.type === 'studio' && Math.abs(P.rx) < 30;
  const target = wantReflect ? layerCtx(W, H) : ctx;
  if (wantReflect) target.clearRect(0, 0, W, H);

  drawBody3D(target, geo, F);

  lastGrid = drawPerspective(target, off, geo.frontQuad);

  if (wantReflect) {
    /* Зеркалим слой относительно нижней точки силуэта, гасим книзу и чуть
       размываем — так пол читается как полированный, а не как зеркало.     */
    let floorY = 0;
    for (const p of geo.silhouette) floorY = Math.max(floorY, p[1]);
    const phoneH = Math.max(40, floorY - Math.min(...geo.silhouette.map(p => p[1])));
    const rc = reflCtx(W, H);
    rc.clearRect(0, 0, W, H);
    rc.save();
    rc.translate(0, 2 * floorY); rc.scale(1, -1);
    rc.filter = `blur(${(1.2 * H / 1920).toFixed(1)}px)`;
    rc.drawImage(layerCanvas, 0, 0);
    rc.restore();
    rc.globalCompositeOperation = 'destination-in';
    const fadeG = rc.createLinearGradient(0, floorY, 0, floorY + phoneH * 0.55);
    fadeG.addColorStop(0, 'rgba(0,0,0,1)'); fadeG.addColorStop(1, 'rgba(0,0,0,0)');
    rc.fillStyle = fadeG; rc.fillRect(0, floorY, W, H - floorY);
    rc.globalCompositeOperation = 'source-over';
    ctx.save(); ctx.globalAlpha = S.reflect.amt; ctx.drawImage(reflCanvas, 0, 0); ctx.restore();
    ctx.drawImage(layerCanvas, 0, 0);
  }

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.filter = 'none';
  ctx.globalAlpha = 1;

  lastRender = { quad: geo.frontQuad, info, cam, k, grid: lastGrid, geo, outline };
  if (sel) drawSelectionOverlay(ctx, geo.frontQuad, info);

  drawVignette(ctx);
  drawGrain(ctx);

  // уход в чёрное на стыке сцен
  const fade = sel ? 0 : sceneFade(t);
  if (fade > 0.002) { ctx.fillStyle = `rgba(0,0,0,${fade})`; ctx.fillRect(0, 0, W, H); }
}

/* ================================================= режим выделения ===== */

let selecting = false;     // id клипа, для которого обводим участок
let selDrag = null;

function uvRectPx(info, quad, f) {
  const r = screenRectPx(quad, info);
  return [r.x + f.u0 * r.w, r.y + f.v0 * r.h, r.x + f.u1 * r.w, r.y + f.v1 * r.h];
}

function drawSelectionOverlay(g, quad, info) {
  const W = S.cw, H = S.ch;
  const r = screenRectPx(quad, info);
  const target = getClip(selecting);
  const f = selDrag || target || { u0: 0.15, v0: 0.2, u1: 0.85, v1: 0.55 };
  const [x0, y0, x1, y1] = uvRectPx(info, quad, f);

  g.save();
  g.fillStyle = 'rgba(4,5,9,.62)';
  g.fillRect(0, 0, W, y0);
  g.fillRect(0, y1, W, H - y1);
  g.fillRect(0, y0, x0, y1 - y0);
  g.fillRect(x1, y0, W - x1, y1 - y0);

  const lw = Math.max(2, W / 420);
  g.strokeStyle = '#5b8cff'; g.lineWidth = lw;
  g.strokeRect(x0, y0, x1 - x0, y1 - y0);
  g.setLineDash([lw * 4, lw * 4]);
  g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = lw * 0.6;
  g.strokeRect(r.x, r.y, r.w, r.h);
  g.setLineDash([]);

  g.fillStyle = '#5b8cff';
  const hs = lw * 3.2;
  for (const [hx, hy] of [[x0, y0], [x1, y0], [x1, y1], [x0, y1]])
    g.fillRect(hx - hs / 2, hy - hs / 2, hs, hs);

  const fs = W * 0.028;
  g.font = `600 ${fs}px -apple-system,"SF Pro Text","Helvetica Neue",Arial,sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = 'rgba(255,255,255,.92)';
  g.fillText('Обведи участок экрана — на него и наедет камера', W / 2, H * 0.055);
  g.font = `500 ${fs * 0.8}px -apple-system,"SF Pro Text","Helvetica Neue",Arial,sans-serif`;
  g.fillStyle = 'rgba(255,255,255,.55)';
  g.fillText('Esc — отмена', W / 2, H * 0.055 + fs * 1.5);
  g.restore();
}

function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return [(e.clientX - r.left) / r.width * S.cw, (e.clientY - r.top) / r.height * S.ch];
}

function pxToUV(px, py) {
  if (!lastRender) return [0, 0];
  const r = screenRectPx(lastRender.quad, lastRender.info);
  return [clamp((px - r.x) / r.w, 0, 1), clamp((py - r.y) / r.h, 0, 1)];
}

function startSelect(clipId) {
  const c = getClip(clipId);
  if (!c) { toast('Сначала добавь наезд на дорожке'); return; }
  if (!hasVideo) toast('Совет: сначала загрузи видео — так проще выбрать участок');
  selecting = clipId;
  selDrag = null;
  $('#btnSelect').textContent = 'Отменить выделение';
  $('#btnSelect').classList.add('primary');
}

function endSelect() {
  selecting = false;
  selDrag = null;
  $('#btnSelect').textContent = 'Переобвести участок';
  $('#btnSelect').classList.remove('primary');
  updateFocusMeta();
  save();
}

function updateFocusMeta() {
  const c = selectedClip();
  const el = $('#fcMeta');
  const has = !!c;
  ['fcFill', 'fcRamp'].forEach(id => { $('#' + id).disabled = !has; });
  $('#btnSelect').disabled = !has;
  $('#fcDelete').disabled = !has;
  if (!has) {
    el.textContent = S.clips.length
      ? 'Выбери наезд на дорожке снизу, чтобы настроить.'
      : 'Наездов нет. Добавь кнопкой «+ Наезд» под холстом.';
    return;
  }
  $('#fcFill').value = c.fill; $('#fcFill').parentElement.querySelector('output').textContent = Math.round(c.fill * 100) + '%';
  $('#fcRamp').value = c.ramp; $('#fcRamp').parentElement.querySelector('output').textContent = c.ramp.toFixed(2) + 'с';
  el.innerHTML = `Наезд <b style="color:#c6ccdc">${c.t0.toFixed(1)}–${clipEnd(c).toFixed(1)} с</b> · ` +
    `участок ${Math.round((c.u1 - c.u0) * 100)}% × ${Math.round((c.v1 - c.v0) * 100)}% экрана · ` +
    `зум ~${(1 / Math.max(c.u1 - c.u0, c.v1 - c.v0)).toFixed(1)}×`;
}

/* ================================================= UI: утилиты ========== */

const FMT = {
  pScale: v => v.toFixed(2) + '×', screenZoom: v => v.toFixed(2) + '×',
  pX: v => (v * 100).toFixed(0) + '%', pY: v => (v * 100).toFixed(0) + '%',
  screenOffX: v => (v * 100).toFixed(0) + '%', screenOffY: v => (v * 100).toFixed(0) + '%',
  pRx: v => v.toFixed(0) + '°', pRy: v => v.toFixed(0) + '°', pRz: v => v.toFixed(0) + '°',
  bgAngle: v => v.toFixed(0) + '°', pPersp: v => v.toFixed(0),
  mAmount: v => v.toFixed(2) + '×', mSpeed: v => v.toFixed(2) + '×', mLoop: v => v.toFixed(1) + 'с',
  bitrate: v => v.toFixed(0) + ' Мбит',
  fcFill: v => (v * 100).toFixed(0) + '%', fcRamp: v => (+v).toFixed(2) + 'с',
  mIdle: v => (+v).toFixed(2) + '×', thickK: v => (+v).toFixed(2) + '×',
  scEase: v => (+v * 100).toFixed(0) + '%', dofAmt: v => (+v * 100).toFixed(0) + '%',
  reflAmt: v => (+v * 100).toFixed(0) + '%', fxGlowAmt: v => (+v * 100).toFixed(0) + '%',
};
const fmt = (id, v) => (FMT[id] || (x => (+x).toFixed(2)))(+v);

function setPath(obj, path, val) {
  const ks = path.split('.');
  let o = obj;
  for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]];
  o[ks[ks.length - 1]] = val;
}
function getPath(obj, path) {
  return path.split('.').reduce((o, k) => o[k], obj);
}

function bind(id, path, kind, after) {
  const el = document.getElementById(id);
  if (!el) return;
  const out = el.parentElement && el.parentElement.querySelector('output');
  const read = () => {
    if (kind === 'num') return +el.value;
    if (kind === 'bool') return el.checked;
    return el.value;
  };
  const write = () => {
    const v = getPath(S, path);
    if (kind === 'bool') el.checked = !!v; else el.value = v;
    if (out) out.textContent = fmt(id, el.value);
  };
  el.addEventListener('input', () => {
    setPath(S, path, read());
    if (out) out.textContent = fmt(id, el.value);
    if (after) after();
    save();
  });
  el._sync = write;
  write();
}

let toastT = 0;
function toast(msg, ms = 2600) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('on'), ms);
}

/* ================================================= размер холста ======== */

function setCanvasSize(w, h) {
  // Смена разрешения на лету рвёт поток H.264 — итоговый mp4 окажется битым.
  if (recording) {
    toast('Размер кадра нельзя менять во время записи');
    $('#cw').value = S.cw; $('#ch').value = S.ch;
    return;
  }
  S.cw = clamp(Math.round(w / 2) * 2, 120, 4096);
  S.ch = clamp(Math.round(h / 2) * 2, 120, 4096);
  canvas.width = S.cw; canvas.height = S.ch;
  $('#cw').value = S.cw; $('#ch').value = S.ch;
  $('#dims').textContent = `${S.cw}×${S.ch}`;
  fitCanvas();
}

function fitCanvas() {
  const stage = $('#stage');
  const pad = 44;
  const aw = stage.clientWidth - pad, ah = stage.clientHeight - pad;
  if (aw <= 0 || ah <= 0) return;
  const k = Math.min(aw / S.cw, ah / S.ch);
  canvas.style.width  = Math.round(S.cw * k) + 'px';
  canvas.style.height = Math.round(S.ch * k) + 'px';
  $('#canvasWrap').style.width  = Math.round(S.cw * k) + 'px';
  $('#canvasWrap').style.height = Math.round(S.ch * k) + 'px';
}
window.addEventListener('resize', fitCanvas);
if (window.ResizeObserver) new ResizeObserver(fitCanvas).observe($('#stage'));
window.addEventListener('resize', () => { renderTimeline(); scheduleStrip(); });

/* Полосу кадров пересобираем, когда дорожка реально меняет ширину:
   на первой отрисовке макет ещё не устоялся, и кадры лягут не на всю длину. */
let stripT = 0, stripW = 0;
function scheduleStrip() {
  clearTimeout(stripT);
  stripT = setTimeout(buildFilmstrip, 220);
}
if (window.ResizeObserver) new ResizeObserver(es => {
  const w = Math.round(es[0].contentRect.width);
  if (Math.abs(w - stripW) < 4) return;
  stripW = w; scheduleStrip();
}).observe($('#trkVideo'));

/* ================================================= загрузка медиа ======= */

/* Каждое видео живёт в своём <video>. Клипы кладём встык в конец дорожки,
   чтобы добавление нескольких файлов сразу давало смонтированный ряд.      */
function addVideoFile(file, atEnd) {
  return new Promise(resolve => {
    if (!file) return resolve(null);
    const id = newMediaId();
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url;
    const fail = () => {
      URL.revokeObjectURL(url);
      toast(`Не читается: ${file.name} — попробуй mp4/H.264 или webm`);
      resolve(null);
    };
    v.addEventListener('error', fail, { once: true });
    v.addEventListener('loadedmetadata', () => {
      const nat = isFinite(v.duration) && v.duration > 0 ? v.duration : 0;
      if (!nat) return fail();
      mediaPool[id] = { video: v, url, name: file.name, natDur: nat, w: v.videoWidth, h: v.videoHeight, ready: true };
      S.media.push({ id, name: file.name, t0: Math.round(atEnd * 100) / 100, dur: Math.round(nat * 100) / 100, inPoint: 0 });
      hasVideo = true;
      resolve(id);
    }, { once: true });
  });
}

async function addVideoFiles(files) {
  const list = [...files].filter(f => f.type.startsWith('video/'));
  if (!list.length) return;
  let at = mediaDur();
  let added = 0;
  for (const f of list) {
    const id = await addVideoFile(f, at);
    if (id) { at = mediaDur(); added++; }
  }
  if (!added) return;
  S.selMedia = S.media[S.media.length - 1].id;
  updateVideoMeta();
  renderTimeline();
  scheduleStrip();
  if (added === list.length) toast(added > 1 ? `Добавлено видео: ${added}` : 'Видео добавлено');
  save();
}

function loadVideoUrl(url) {
  const id = newMediaId();
  const v = document.createElement('video');
  v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url;
  v.addEventListener('loadedmetadata', () => {
    const nat = isFinite(v.duration) && v.duration > 0 ? v.duration : 0;
    if (!nat) return;
    mediaPool[id] = { video: v, url: null, name: url, natDur: nat, w: v.videoWidth, h: v.videoHeight, ready: true };
    S.media.push({ id, name: url, t0: mediaDur(), dur: Math.round(nat * 100) / 100, inPoint: 0 });
    hasVideo = true;
    S.selMedia = id;
    updateVideoMeta(); renderTimeline(); scheduleStrip(); setPlaying(true);
  }, { once: true });
}

function deleteMedia(id) {
  const i = S.media.findIndex(m => m.id === id);
  if (i < 0) return;
  const name = S.media[i].name;
  S.media.splice(i, 1);
  const p = mediaPool[id];
  if (p) {
    try { p.video.pause(); p.video.removeAttribute('src'); p.video.load(); } catch (_) {}
    if (p.url) URL.revokeObjectURL(p.url);
    delete mediaPool[id];
  }
  if (S.selMedia === id) S.selMedia = null;
  hasVideo = S.media.some(m => mediaPool[m.id]);
  updateVideoMeta(); renderTimeline(); scheduleStrip(); save();
  toast(`Видео убрано: ${name.length > 22 ? name.slice(0, 22) + '…' : name}`);
}

function clearVideo() {
  if (!S.media.length) { toast('Видео и так нет'); return; }
  setPlaying(false);
  for (const m of S.media.slice()) deleteMedia(m.id);
  seekTo(0);
}

function selectMedia(id) {
  S.selMedia = id;
  [...$('#trkVideo').querySelectorAll('.clip')].forEach(el => el.classList.toggle('sel', el.dataset.id === id));
  updateVideoMeta(); save();
}

function updateVideoMeta() {
  const el = $('#videoMeta');
  $('#btnClearVideo').disabled = !S.media.length;
  if (!S.media.length) { el.textContent = 'Видео нет — показан демо-экран. Можно выбрать сразу несколько файлов.'; return; }
  const cur = getMedia(S.selMedia) || sortedMedia()[0];
  const p = mediaPool[cur.id];
  el.innerHTML = `<b style="color:#c6ccdc">${cur.name}</b><br>` +
    (p ? `${p.w}×${p.h} · ` : '') + `${cur.t0.toFixed(1)}–${mediaEnd(cur).toFixed(1)} с` +
    (S.media.length > 1 ? `<br><span style="color:#8b93a7">Всего роликов: ${S.media.length}, общая длина ${mediaDur().toFixed(1)} с</span>` : '');
}

$('#btnClearVideo').addEventListener('click', clearVideo);
$('#fileVideo').addEventListener('change', e => { addVideoFiles(e.target.files); e.target.value = ''; });
$('#fileBg').addEventListener('change', e => {
  const f = e.target.files[0]; if (!f) return;
  const img = new Image();
  img.onload = () => { bgImage = img; S.bg.type = 'image'; $('#bgType').value = 'image'; save(); toast('Фон загружен'); };
  img.src = URL.createObjectURL(f);
});

/* drag & drop по всему окну */
['dragenter', 'dragover'].forEach(ev => window.addEventListener(ev, e => {
  e.preventDefault(); $('#drop').classList.add('over');
}));
['dragleave', 'drop'].forEach(ev => window.addEventListener(ev, e => {
  e.preventDefault(); $('#drop').classList.remove('over');
}));
window.addEventListener('drop', e => {
  const f = [...(e.dataTransfer.files || [])][0];
  if (!f) return;
  if ([...(e.dataTransfer.files || [])].some(x => x.type.startsWith('video/'))) addVideoFiles(e.dataTransfer.files);
  else if (f.type.startsWith('image/')) {
    const img = new Image();
    img.onload = () => { bgImage = img; S.bg.type = 'image'; $('#bgType').value = 'image'; save(); toast('Фон загружен'); };
    img.src = URL.createObjectURL(f);
  }
});

/* ================================================= мышь на холсте ======= */

let drag = null;
canvas.addEventListener('pointerdown', e => {
  try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
  if (selecting) {
    const [px, py] = canvasPoint(e);
    const [u, v] = pxToUV(px, py);
    selDrag = { u0: u, v0: v, u1: u, v1: v, ax: u, ay: v };
    return;
  }
  canvas.classList.add('drag');
  drag = { x: e.clientX, y: e.clientY, px: S.pose.x, py: S.pose.y, rx: S.pose.rx, ry: S.pose.ry, shift: e.shiftKey };
});
canvas.addEventListener('pointermove', e => {
  if (selecting) {
    if (!selDrag) return;
    const [px, py] = canvasPoint(e);
    const [u, v] = pxToUV(px, py);
    selDrag.u0 = Math.min(selDrag.ax, u); selDrag.u1 = Math.max(selDrag.ax, u);
    selDrag.v0 = Math.min(selDrag.ay, v); selDrag.v1 = Math.max(selDrag.ay, v);
    return;
  }
  if (!drag) return;
  const r = canvas.getBoundingClientRect();
  const dx = (e.clientX - drag.x) / r.width;
  const dy = (e.clientY - drag.y) / r.height;
  if (drag.shift || e.shiftKey) {
    S.pose.ry = clamp(drag.ry + dx * 140, -55, 55);
    S.pose.rx = clamp(drag.rx - dy * 140, -55, 55);
    S.poseId = '';
    syncPoseUI();
  } else {
    S.pose.x = clamp(drag.px + dx, -0.6, 0.6);
    S.pose.y = clamp(drag.py + dy, -0.6, 0.6);
    $('#pX')._sync(); $('#pY')._sync();
  }
});
['pointerup', 'pointercancel'].forEach(ev => canvas.addEventListener(ev, () => {
  if (selecting) {
    const c = getClip(selecting);
    if (c && selDrag && (selDrag.u1 - selDrag.u0) > 0.04 && (selDrag.v1 - selDrag.v0) > 0.02) {
      Object.assign(c, { u0: selDrag.u0, v0: selDrag.v0, u1: selDrag.u1, v1: selDrag.v1 });
      endSelect();
      renderTimeline();
      toast('Участок задан');
    } else {
      selDrag = null;
    }
    return;
  }
  if (drag) save();
  drag = null; canvas.classList.remove('drag');
}));
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  S.pose.scale = clamp(S.pose.scale * (1 - e.deltaY * 0.0015), 0.25, 2.2);
  $('#pScale')._sync(); save();
}, { passive: false });

/* ================================================= время =============== */
/* Один источник истины — клок. Видеоклипов может быть несколько, между ними
   бывают разрывы, поэтому вести время по currentTime активного элемента
   нельзя: в разрыве активного просто нет. Клок идёт по стенным часам, а
   активный клип подтягивается перемоткой при заметном расхождении.        */

/* Длина медиа = конец последнего клипа на дорожке. */
function mediaDur() { let d = 0; for (const m of S.media) d = Math.max(d, mediaEnd(m)); return d; }

function sceneDuration() {
  if (S.exp.dur > 0) return S.exp.dur;
  let d = Math.max(mediaDur(), 3);
  for (const b of S.scenes) d = Math.max(d, sceneEnd(b));
  for (const c of S.clips) d = Math.max(d, clipEnd(c));
  return Math.round(d * 10) / 10;
}

function setPlaying(v) {
  playing = v;
  $('#btnPlay').textContent = v ? '❚❚' : '▶';
  if (v && clock >= sceneDuration() - 0.02) seekTo(0);
  syncMedia(clock, v);
}

function seekTo(t) {
  clock = clamp(t, 0, sceneDuration());
  syncMedia(clock, playing);
}

$('#btnPlay').addEventListener('click', () => setPlaying(!playing));
$('#btnStart').addEventListener('click', () => { seekTo(0); });

window.addEventListener('keydown', e => {
  const tag = (e.target.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
  if (e.code === 'Escape' && selecting) { endSelect(); return; }
  if (e.code === 'Space') { e.preventDefault(); setPlaying(!playing); }
  if (e.key === 'r' || e.key === 'к') resetPose();
  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (S.sel) { e.preventDefault(); deleteClip(S.sel); }
    else if (S.selScene) { e.preventDefault(); deleteScene(S.selScene); }
    else if (S.selMedia) { e.preventDefault(); deleteMedia(S.selMedia); }
  }
});

/* ================================================= таймлайн ============ */

const trackEl = () => $('#trkZoom');
const tlDur   = () => Math.max(0.1, sceneDuration());
const tToPct  = t => clamp(t / tlDur(), 0, 1) * 100;

function xToT(clientX) {
  const r = trackEl().getBoundingClientRect();
  return clamp((clientX - r.left) / Math.max(1, r.width), 0, 1) * tlDur();
}

/* Для перетаскивания курсор не обрезаем: иначе, уведя мышь за край дорожки,
   клип не доезжает до самого начала — дельта перестаёт расти. */
function xToTraw(clientX) {
  const r = trackEl().getBoundingClientRect();
  return ((clientX - r.left) / Math.max(1, r.width)) * tlDur();
}

function newClipId() { return 'z' + (clipSeq++); }

function sortedClips() { return S.clips.slice().sort((a, b) => a.t0 - b.t0); }

/* Свободное окно вокруг позиции — клипы не пересекаются по требованию UI. */
function freeSlot(at, want) {
  const D = tlDur();
  const cs = sortedClips();
  let lo = 0, hi = D;
  for (const c of cs) {
    if (clipEnd(c) <= at) lo = Math.max(lo, clipEnd(c));
    if (c.t0 >= at) { hi = Math.min(hi, c.t0); break; }
    if (at > c.t0 && at < clipEnd(c)) return null;      // прямо внутри чужого
  }
  const room = hi - lo;
  if (room < 0.5) return null;
  const dur = Math.min(want, room);
  const t0 = clamp(at - dur * 0.15, lo, hi - dur);
  return { t0, dur };
}

function addClip() {
  const slot = freeSlot(clock, 2.6);
  if (!slot) { toast('Здесь уже есть наезд — поставь плейхед в свободное место'); return; }
  const prev = S.clips[S.clips.length - 1];
  const c = {
    id: newClipId(), t0: slot.t0, dur: slot.dur, ramp: 0.9, fill: 0.82,
    u0: prev ? prev.u0 : 0.15, v0: prev ? prev.v0 : 0.22,
    u1: prev ? prev.u1 : 0.85, v1: prev ? prev.v1 : 0.58,
  };
  S.clips.push(c);
  S.sel = c.id;
  renderTimeline(); updateFocusMeta(); save();
  startSelect(c.id);
}

function deleteClip(id) {
  const i = S.clips.findIndex(c => c.id === id);
  if (i < 0) return;
  S.clips.splice(i, 1);
  if (S.sel === id) S.sel = null;
  if (selecting === id) endSelect();
  renderTimeline(); updateFocusMeta(); save();
  toast('Наезд удалён');
}

/* Свободное окно на дорожке сцен — та же логика, что у наездов. */
function freeSceneSlot(at, want) {
  const D = tlDur();
  const list = sortedScenes();
  let lo = 0, hi = Infinity;
  for (const b of list) {
    if (sceneEnd(b) <= at + 1e-6) lo = Math.max(lo, sceneEnd(b));
    else if (b.t0 >= at - 1e-6) { hi = Math.min(hi, b.t0); break; }
    else return null;
  }
  if (hi - lo < 0.5) return null;
  const dur = Math.min(want, hi - lo);
  const t0 = clamp(at, lo, Math.max(lo, hi - dur));
  return { t0, dur };
}

function addScene(scId, at, want) {
  const sc = scenarioById(scId);
  if (!sc.dur) return null;
  const slot = freeSceneSlot(at === undefined ? clock : at, want || sc.dur);
  if (!slot) { toast('Здесь уже стоит сцена — поставь плейхед в свободное место'); return null; }
  const b = { id: newSceneId(), sc: scId, t0: Math.round(slot.t0 * 100) / 100, dur: Math.round(slot.dur * 100) / 100 };
  S.scenes.push(b);
  S.selScene = b.id;
  renderTimeline(); save();
  return b;
}

/* Ролик: очищает дорожку и раскладывает сцены встык, начиная с нуля. */
function applyReel(reel) {
  S.scenes.length = 0;
  let t = 0;
  for (const [scId, dur] of reel.seq) {
    S.scenes.push({ id: newSceneId(), sc: scId, t0: Math.round(t * 100) / 100, dur });
    t += dur;
  }
  S.selScene = S.scenes[0] ? S.scenes[0].id : null;
  S.exp.dur = 0;
  seekTo(0);
  renderTimeline(); save();
  toast(`Ролик «${reel.name}»: ${S.scenes.length} сцен, ${t.toFixed(0)} с`);
}

function deleteScene(id) {
  const i = S.scenes.findIndex(b => b.id === id);
  if (i < 0) return;
  S.scenes.splice(i, 1);
  if (S.selScene === id) S.selScene = null;
  renderTimeline(); save();
  toast('Сцена удалена');
}

function selectScene(id) {
  S.selScene = id;
  [...$('#trkScene').querySelectorAll('.clip')].forEach(el => el.classList.toggle('sel', el.dataset.id === id));
  updateSceneMeta();
  save();
}

function selectClip(id) {
  S.sel = id;
  [...trackEl().querySelectorAll('.clip')].forEach(el => el.classList.toggle('sel', el.dataset.id === id));
  updateFocusMeta();
  save();
}

/* --- перетаскивание и растягивание --- */
let clipDrag = null;

function onClipDown(e, id, mode) {
  e.stopPropagation();
  e.preventDefault();
  const c = dragTarget(id);
  if (!c) return;
  if (isSceneId(id)) selectScene(id); else if (isMediaId(id)) selectMedia(id); else selectClip(id);
  clipDrag = { id, mode, t: xToTraw(e.clientX), t0: c.t0, dur: c.dur, inPoint: c.inPoint || 0 };
  try { e.target.setPointerCapture(e.pointerId); } catch (_) {}
}

window.addEventListener('pointermove', e => {
  if (!clipDrag) return;
  const c = dragTarget(clipDrag.id);
  if (!c) return;
  const D = tlDur();
  const d = xToTraw(e.clientX) - clipDrag.t;
  const pool = isSceneId(clipDrag.id) ? S.scenes : isMediaId(clipDrag.id) ? S.media : S.clips;
  const others = pool.filter(x => x.id !== c.id).sort((a, b) => a.t0 - b.t0);
  const loBound = Math.max(0, ...others.filter(x => clipEnd(x) <= clipDrag.t0 + 1e-6).map(clipEnd), 0);
  const hiCand = others.filter(x => x.t0 >= clipDrag.t0 + clipDrag.dur - 1e-6).map(x => x.t0);
  const hiBound = hiCand.length ? Math.min(D, ...hiCand) : D;

  if (clipDrag.mode === 'move') {
    c.t0 = clamp(clipDrag.t0 + d, loBound, hiBound - c.dur);
  } else if (clipDrag.mode === 'l') {
    const end = clipDrag.t0 + clipDrag.dur;
    const before = c.t0;
    c.t0 = clamp(clipDrag.t0 + d, loBound, end - 0.3);
    c.dur = end - c.t0;
    if (isMediaId(clipDrag.id)) {                 // тянем начало = двигаем точку входа
      const p = mediaPool[c.id];
      const inp = (clipDrag.inPoint || 0) + (c.t0 - clipDrag.t0);
      c.inPoint = clamp(inp, 0, p ? Math.max(0, p.natDur - 0.3) : 0);
    }
  } else {
    c.dur = clamp(clipDrag.dur + d, 0.3, hiBound - c.t0);
  }
  c.t0 = Math.round(c.t0 * 100) / 100;
  c.dur = Math.round(c.dur * 100) / 100;
  if (isSceneId(clipDrag.id)) { layoutScene(c); updateSceneMeta(); }
  else if (isMediaId(clipDrag.id)) {
    // обрезка справа не должна выйти за исходную длину файла
    const p = mediaPool[c.id];
    if (p) c.dur = Math.min(c.dur, p.natDur - (c.inPoint || 0));
    layoutMedia(c); updateVideoMeta();
  }
  else { layoutClip(c); updateFocusMeta(); }
});

window.addEventListener('pointerup', () => {
  if (clipDrag) { clipDrag = null; renderTimeline(); save(); }
});

/* --- скраб по дорожкам --- */
let scrubbing = false;
function scrubFrom(e) { seekTo(xToT(e.clientX)); }
for (const id of ['#tlruler', '#trkVideo', '#trkScene', '#trkZoom']) {
  const el = $(id);
  el.addEventListener('pointerdown', e => {
    if (e.target.closest('.clip')) return;
    scrubbing = true; scrubFrom(e);
    try { el.setPointerCapture(e.pointerId); } catch (_) {}
    if (id === '#trkZoom') selectClip(null);
    if (id === '#trkVideo') selectMedia(null);
  });
  el.addEventListener('pointermove', e => { if (scrubbing) scrubFrom(e); });
  ['pointerup', 'pointercancel'].forEach(ev => el.addEventListener(ev, () => scrubbing = false));
}

/* --- отрисовка --- */
function layoutMedia(m) {
  const el = $('#trkVideo').querySelector(`.clip.media[data-id="${m.id}"]`);
  if (!el) return;
  const D = tlDur();
  el.style.left = tToPct(m.t0) + '%';
  el.style.width = Math.max(0.4, (m.dur / D) * 100) + '%';
  const short = m.name.length > 18 ? m.name.slice(0, 18) + '…' : m.name;
  el.querySelector('b').textContent = `${short} · ${m.dur.toFixed(1)} с`;
  el.classList.toggle('sel', m.id === S.selMedia);
}

function layoutScene(b) {
  const el = $('#trkScene').querySelector(`.clip.scene[data-id="${b.id}"]`);
  if (!el) return;
  const sc = scenarioById(b.sc);
  const D = tlDur();
  el.style.left = tToPct(b.t0) + '%';
  el.style.width = Math.max(0.4, (b.dur / D) * 100) + '%';
  const rate = sc.dur ? b.dur / sc.dur : 1;
  el.querySelector('b').textContent =
    `${sc.name.split(' → ')[0].split(' · ')[0]} · ${b.dur.toFixed(1)} с` + (Math.abs(rate - 1) > 0.05 ? ` (${rate.toFixed(2)}×)` : '');
  el.classList.toggle('sel', b.id === S.selScene);
  updateSceneMeta();
}

function layoutClip(c) {
  const el = trackEl().querySelector(`.clip[data-id="${c.id}"]`);
  if (!el) return;
  el.style.left = tToPct(c.t0) + '%';
  el.style.width = Math.max(0.4, (c.dur / tlDur()) * 100) + '%';
  const rp = Math.min(c.ramp, c.dur / 2) / c.dur * 100;
  el.querySelector('.ramp.l').style.width = rp + '%';
  el.querySelector('.ramp.r').style.width = rp + '%';
  el.querySelector('b').textContent = `Наезд ${c.dur.toFixed(1)} с`;
}

function renderTimeline() {
  const D = tlDur();

  // линейка
  const ruler = $('#tlruler');
  ruler.innerHTML = '';
  const step = D <= 6 ? 1 : D <= 16 ? 2 : D <= 40 ? 5 : 10;
  for (let t = 0; t <= D + 1e-6; t += step) {
    const i = document.createElement('i');
    i.style.left = tToPct(t) + '%';
    i.textContent = t.toFixed(0) + 'с';
    ruler.appendChild(i);
  }

  // сцены — такие же клипы на своей дорожке
  const trkS = $('#trkScene');
  [...trkS.querySelectorAll('.clip')].forEach(el => el.remove());
  for (const b of S.scenes) {
    const el = document.createElement('div');
    el.className = 'clip scene' + (b.id === S.selScene ? ' sel' : '');
    el.dataset.id = b.id;
    el.innerHTML = '<b></b><div class="h l"></div><div class="h r"></div><div class="x">×</div>';
    el.addEventListener('pointerdown', e => onClipDown(e, b.id, 'move'));
    el.querySelector('.h.l').addEventListener('pointerdown', e => onClipDown(e, b.id, 'l'));
    el.querySelector('.h.r').addEventListener('pointerdown', e => onClipDown(e, b.id, 'r'));
    el.querySelector('.x').addEventListener('pointerdown', e => { e.stopPropagation(); deleteScene(b.id); });
    trkS.appendChild(el);
    layoutScene(b);
  }

  // видео — клипы на своей дорожке
  const trkV = $('#trkVideo');
  [...trkV.querySelectorAll('.clip')].forEach(el => el.remove());
  for (const m of S.media) {
    const el = document.createElement('div');
    el.className = 'clip media' + (m.id === S.selMedia ? ' sel' : '');
    el.dataset.id = m.id;
    el.innerHTML = '<b></b><div class="h l"></div><div class="h r"></div><div class="x">×</div>';
    el.addEventListener('pointerdown', e => onClipDown(e, m.id, 'move'));
    el.querySelector('.h.l').addEventListener('pointerdown', e => onClipDown(e, m.id, 'l'));
    el.querySelector('.h.r').addEventListener('pointerdown', e => onClipDown(e, m.id, 'r'));
    el.querySelector('.x').addEventListener('pointerdown', e => { e.stopPropagation(); deleteMedia(m.id); });
    trkV.appendChild(el);
    layoutMedia(m);
  }

  // конец видео
  const md = mediaDur();
  const vEnd = $('#vEnd');
  if (md > 0 && md < D - 0.05) { vEnd.hidden = false; vEnd.style.left = tToPct(md) + '%'; }
  else vEnd.hidden = true;

  // клипы
  const trk = trackEl();
  [...trk.querySelectorAll('.clip')].forEach(el => el.remove());
  for (const c of S.clips) {
    const el = document.createElement('div');
    el.className = 'clip' + (c.id === S.sel ? ' sel' : '');
    el.dataset.id = c.id;
    el.innerHTML = '<div class="ramp l"></div><div class="ramp r"></div><b></b><div class="h l"></div><div class="h r"></div><div class="x">×</div>';
    el.addEventListener('pointerdown', e => onClipDown(e, c.id, 'move'));
    el.querySelector('.h.l').addEventListener('pointerdown', e => onClipDown(e, c.id, 'l'));
    el.querySelector('.h.r').addEventListener('pointerdown', e => onClipDown(e, c.id, 'r'));
    el.querySelector('.x').addEventListener('pointerdown', e => { e.stopPropagation(); deleteClip(c.id); });
    el.addEventListener('dblclick', e => { e.stopPropagation(); startSelect(c.id); });
    trk.appendChild(el);
    layoutClip(c);
  }
  $('#tDur').textContent = D.toFixed(1);
}

function updatePlayhead() {
  const wrap = $('#tlwrap');
  const trk = trackEl();
  const r = trk.getBoundingClientRect(), w = wrap.getBoundingClientRect();
  $('#playhead').style.left = (r.left - w.left + (clock / tlDur()) * r.width) + 'px';
  $('#tCur').textContent = clock.toFixed(1);
}

/* --- киноплёнка: кадры тянем ВТОРЫМ video, чтобы не дёргать основной --- */
let stripToken = 0;
async function buildFilmstrip() {
  const token = ++stripToken;
  const cv = $('#strip');
  const g = cv.getContext('2d');
  const rect = cv.getBoundingClientRect();
  cv.width = Math.max(120, Math.round(rect.width * 2));
  cv.height = Math.max(40, Math.round(rect.height * 2));
  g.clearRect(0, 0, cv.width, cv.height);
  if (!S.media.length) return;

  const D = tlDur();
  for (const m of sortedMedia()) {
    if (token !== stripToken) return;
    const p = mediaPool[m.id];
    if (!p) continue;
    // окно клипа в пикселях холста полосы
    const x0 = Math.round(m.t0 / D * cv.width), x1 = Math.round(mediaEnd(m) / D * cv.width);
    const cw = Math.max(4, x1 - x0);
    let thumbW = Math.round(cv.height * (p.w / Math.max(1, p.h)));
    thumbW = Math.max(thumbW, Math.ceil(cw / 12));
    const n = clamp(Math.ceil(cw / Math.max(8, thumbW)), 1, 16);

    const fv = document.createElement('video');
    fv.muted = true; fv.playsInline = true; fv.preload = 'auto'; fv.src = p.video.currentSrc || p.video.src;
    try { await new Promise((res, rej) => { fv.onloadeddata = res; fv.onerror = rej; setTimeout(rej, 8000); }); }
    catch (_) { continue; }

    for (let i = 0; i < n; i++) {
      if (token !== stripToken) { try { fv.src = ''; } catch (_) {} return; }
      const t = (m.inPoint || 0) + (i + 0.5) / n * m.dur;
      try {
        await new Promise(res => {
          let done = false;
          const ok = () => { if (!done) { done = true; res(); } };
          fv.onseeked = () => {
            if (fv.requestVideoFrameCallback) { fv.requestVideoFrameCallback(ok); setTimeout(ok, 160); }
            else ok();
          };
          fv.onerror = ok;
          fv.currentTime = clamp(t, 0, Math.max(0, p.natDur - 0.03));
          setTimeout(ok, 900);
        });
        g.drawImage(fv, x0 + i * (cw / n), 0, cw / n + 1, cv.height);
      } catch (_) { continue; }
      await new Promise(r => setTimeout(r, 0));
    }
    try { fv.src = ''; } catch (_) {}
  }
  if (token === stripToken) {
    g.fillStyle = 'rgba(8,10,16,.45)';
    g.fillRect(0, 0, cv.width, cv.height);
  }
}

/* ================================================= главный цикл ========= */

let recElapsed = 0, recTarget = 0, recStart = 0, recWatch = 0;

/* Ход записи считает таймер, а не rAF. Если вкладка уходит в фон, rAF
   останавливается совсем — и запись, завязанная на него, не завершилась бы
   никогда. Таймеры браузер лишь притормаживает, но не выключает.          */
function recTick() {
  if (!recording) return;
  recElapsed = (performance.now() - recStart) / 1000;   // стенные часы, без накопления
  clock = recElapsed;
  $('#ovBar').style.width = (clamp(recElapsed / recTarget, 0, 1) * 100).toFixed(1) + '%';
  $('#ovSub').textContent = `${recElapsed.toFixed(1)} / ${recTarget.toFixed(1)} с — не переключай вкладку.`;
  if (recElapsed >= recTarget) stopRecording();
}

let loopErr = 0;

function loop(ts) {
  try { frame(ts); }
  catch (err) {
    // Одна битая отрисовка не должна убивать rAF и оставлять запись висеть.
    if (loopErr++ < 3) { console.error('кадр не отрисован:', err); window.__loopErr = String(err && err.stack || err); }
    if (recording) { try { stopRecording(); } catch (_) {} }
  }
  requestAnimationFrame(loop);
}

function frame(ts) {
  const dt = clamp(lastTs ? (ts - lastTs) / 1000 : 0, 0, 0.25);
  lastTs = ts;
  const D = sceneDuration();
  const md = mediaDur();

  if (recording) {
    // время и остановку ведёт recTick по таймеру — см. комментарий там
  } else if (playing) {
    clock += dt;                       // клок ведущий: клипов может быть много
    if (clock >= D) {
      if (S.loop) seekTo(0);
      else { clock = D; setPlaying(false); }
    } else syncMedia(clock, true);
  }
  if (recording) syncMedia(clock, true);

  draw(clock);
  updatePlayhead();
}

/* ================================================= экспорт ============== */

/* Браузер врёт: MediaRecorder.isTypeSupported() отвечает true для кодеков,
   которые на деле выдают 0 байт (частый случай для mp4/vp9 без аппаратного
   энкодера). Поэтому каждый кандидат реально проверяется коротким тестовым
   роликом 64×64 — и результат кэшируется.                                   */

const MIME_CANDS = [
  'video/mp4;codecs=avc1.640028,mp4a.40.2',
  'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
  'video/mp4;codecs=avc1',
  'video/mp4',
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8,opus',
  'video/webm;codecs=vp8',
  'video/webm',
];

const MIME_KEY = 'mockup-studio-mime-v2';

/* Ненулевой размер ещё не значит «рабочий файл»: MediaRecorder умеет отдавать
   mp4 без метаданных длительности — он играет, но не перематывается и не
   импортируется в монтажку. Поэтому пробу проверяем обратным декодом.      */
function decodes(blob) {
  return new Promise(res => {
    const url = URL.createObjectURL(blob);
    const v = document.createElement('video');
    let done = false;
    const fin = ok => { if (done) return; done = true; URL.revokeObjectURL(url); res(ok); };
    v.muted = true; v.preload = 'metadata';
    v.onloadedmetadata = () => fin(isFinite(v.duration) && v.duration > 0 && v.videoWidth > 0);
    v.onerror = () => fin(false);
    setTimeout(() => fin(false), 3500);
    v.src = url;
  });
}
let cachedMime = null;

function probeMime(mime) {
  return new Promise(resolve => {
    let cv, stream, rec, spin = 0, t1 = 0, t2 = 0, bytes = 0, done = false;
    const parts = [];
    const finish = ok => {
      if (done) return;
      done = true;
      clearInterval(spin); clearTimeout(t1); clearTimeout(t2);
      try { if (rec && rec.state !== 'inactive') rec.stop(); } catch (_) {}
      try { if (stream) stream.getTracks().forEach(t => t.stop()); } catch (_) {}
      resolve(ok);
    };
    try {
      cv = document.createElement('canvas');
      cv.width = cv.height = 64;
      const g = cv.getContext('2d');
      let i = 0;
      // Холст крутим таймером, а не rAF: в фоновой вкладке rAF остановлен,
      // кадры бы не менялись, кодировщик отдал бы ноль и проба зря забраковала
      // бы все кодеки, перебирая их по нескольку секунд каждый.
      const tick = () => {
        i++;
        g.fillStyle = i % 2 ? '#fff' : '#101010'; g.fillRect(0, 0, 64, 64);
        g.fillStyle = '#f0f'; g.fillRect((i * 5) % 64, 0, 14, 64);
      };
      tick();
      spin = setInterval(tick, 33);
      stream = cv.captureStream(30);
      rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 1e6 });
      rec.ondataavailable = e => { if (e.data) { bytes += e.data.size; parts.push(e.data); } };
      rec.onstop = async () => finish(bytes > 0 && await decodes(new Blob(parts, { type: mime })));
      rec.onerror = () => finish(false);
      rec.start(100);
      t1 = setTimeout(() => { try { rec.stop(); } catch (_) { finish(false); } }, 450);
      t2 = setTimeout(() => finish(false), 6000);   // страховка от зависания
    } catch (_) { finish(false); }
  });
}

async function resolveMime() {
  if (cachedMime !== null) return cachedMime;
  try {
    const c = JSON.parse(localStorage.getItem(MIME_KEY) || 'null');
    if (c && c.ua === navigator.userAgent) { cachedMime = c.mime; return cachedMime; }
  } catch (_) {}

  for (const m of MIME_CANDS) {
    let declared = false;
    try { declared = MediaRecorder.isTypeSupported(m); } catch (_) {}
    if (!declared) continue;
    if (await probeMime(m)) { cachedMime = m; break; }
  }
  if (cachedMime === null) cachedMime = '';   // пусть браузер выберет сам
  try { localStorage.setItem(MIME_KEY, JSON.stringify({ ua: navigator.userAgent, mime: cachedMime })); } catch (_) {}
  return cachedMime;
}

let recorder = null, chunks = [], recStream = null, wasMuted = true, hidDuringRec = false;
let audioCtx = null, audioDest = null;
document.addEventListener('visibilitychange', () => { if (recording && document.hidden) hidDuringRec = true; });

let starting = false;

async function startRecording() {
  if (recording || starting) return;
  starting = true;
  try { await beginRecording(); } finally { starting = false; }
}

async function beginRecording() {
  if (!window.MediaRecorder) { toast('Браузер не умеет MediaRecorder. Открой в Chrome или Safari.'); return; }

  const fps = +S.exp.fps;
  recTarget = sceneDuration();
  recElapsed = 0;

  recStream = canvas.captureStream(fps);

  if (S.exp.audio && S.media.length) {
    /* Клипов может быть несколько, поэтому звук не берём с одного элемента, а
       сводим все через WebAudio: молчащие в этот момент дают тишину сами.  */
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (!audioDest) audioDest = audioCtx.createMediaStreamDestination();
      for (const m of S.media) {
        const p = mediaPool[m.id];
        if (!p || p.srcNode) continue;
        p.video.muted = false;
        p.srcNode = audioCtx.createMediaElementSource(p.video);
        p.srcNode.connect(audioDest);
        p.srcNode.connect(audioCtx.destination);
      }
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const at = audioDest.stream.getAudioTracks();
      at.forEach(t => recStream.addTrack(t));
      if (!at.length) toast('Звуковая дорожка не найдена — пишу без звука');
    } catch (err) { toast('Звук недоступен в этом браузере — пишу без звука'); }
  }

  $('#overlay').hidden = false;
  $('#ovBar').style.width = '0%';
  $('#ovSub').textContent = 'Готовлю кодировщик…';
  const mime = await resolveMime();
  const opts = { videoBitsPerSecond: S.exp.bitrate * 1e6 };
  if (mime) opts.mimeType = mime;

  try { recorder = new MediaRecorder(recStream, opts); }
  catch (err) { $('#overlay').hidden = true; toast('Не удалось начать запись: ' + err.message); return; }
  if (!mime) toast('Рабочий кодек не найден — пишу тем, что выберет браузер', 5000);

  chunks = [];
  recorder.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
  recorder.onstop = finishRecording;

  clock = 0; lastTs = 0;
  seekTo(0);
  syncMedia(0, true);
  recStart = performance.now();
  hidDuringRec = document.hidden;

  $('#btnRecord').classList.add('rec');
  $('#btnRecord2').classList.add('on');
  $('#btnRecord2').textContent = '■ Стоп';
  recording = true;
  recorder.start(250);
  clearInterval(recWatch);
  recWatch = setInterval(recTick, 100);
}

function stopRecording() {
  if (!recording) return;
  recording = false;
  clearInterval(recWatch); recWatch = 0;
  $('#ovBar').style.width = '100%';
  $('#ovSub').textContent = 'Собираю файл… это занимает пару секунд.';
  $('#ovCancel').disabled = true;
  try { recorder.stop(); } catch (_) {}
  for (const id in mediaPool) { const p = mediaPool[id]; if (!p.srcNode) p.video.muted = true; }
  $('#btnRecord').classList.remove('rec');
  $('#btnRecord2').classList.remove('on');
  $('#btnRecord2').textContent = '● Записать';
}

function finishRecording() {
  try { recStream.getTracks().forEach(t => { if (t.kind === 'video') t.stop(); }); } catch (_) {}
  $('#overlay').hidden = true;
  $('#ovCancel').disabled = false;
  const type = recorder.mimeType || 'video/webm';
  const blob = new Blob(chunks, { type });
  if (!blob.size) {
    if (hidDuringRec) {
      // Не вина кодека: в фоновой вкладке браузер не перерисовывает холст,
      // и записывать попросту нечего. Сбрасывать кодек тут неправильно.
      $('#expMeta').innerHTML = '<b style="color:#ff5f6d">Записывать было нечего.</b><br>' +
        'Вкладка была в фоне — браузер останавливает отрисовку холста. Оставь вкладку открытой и повтори.';
      toast('Вкладка была в фоне — холст не рисовался, запись пустая', 6000);
    } else {
      cachedMime = null;
      try { localStorage.removeItem(MIME_KEY); } catch (_) {}
      $('#expMeta').innerHTML = '<b style="color:#ff5f6d">Кодировщик вернул пустой файл.</b><br>' +
        'Кодек сброшен — нажми «Записать» ещё раз, студия подберёт другой.';
      toast('Пустая запись — кодек сброшен, попробуй ещё раз', 5000);
    }
    chunks = [];
    return;
  }
  const ext = type.includes('mp4') ? 'mp4' : 'webm';
  const name = `mockup-${S.cw}x${S.ch}-${Math.round(recTarget)}s.${ext}`;
  download(blob, name);
  $('#expMeta').innerHTML =
    `Сохранено: <b style="color:#c6ccdc">${name}</b><br>${(blob.size / 1048576).toFixed(1)} МБ · ${type.split(';')[0]}`;
  if (hidDuringRec) {
    $('#expMeta').innerHTML += '<br><b style="color:#ffb454">Вкладка уходила в фон во время записи —' +
      ' браузер останавливает отрисовку, и часть кадров могла застыть. Перезапиши, не переключаясь.</b>';
    toast('Вкладка уходила в фон — кадры могли застыть, лучше перезаписать', 6000);
  }
  decodes(blob).then(ok => {
    if (!ok) $('#expMeta').innerHTML += '<br><b style="color:#ff5f6d">Файл не читается обратно —' +
      ' кодек сброшен, перезапиши.</b>';
    if (!ok) { cachedMime = null; try { localStorage.removeItem(MIME_KEY); } catch (_) {} }
  });
  toast(ext === 'mp4' ? 'Готово — mp4 в Загрузках' : 'Готово — webm в Загрузках (./to-mp4.sh для mp4)', 4200);
  chunks = [];
}

function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

$('#btnRecord').addEventListener('click', () => recording ? stopRecording() : startRecording());
$('#ovCancel').addEventListener('click', () => { stopRecording(); });
$('#btnPng').addEventListener('click', () => {
  canvas.toBlob(b => { download(b, `mockup-${S.cw}x${S.ch}.png`); toast('Кадр сохранён'); }, 'image/png');
});

/* ================================================= сборка UI =========== */

function buildChips(host, items, isOn, onPick) {
  host.innerHTML = '';
  for (const it of items) {
    const b = document.createElement('button');
    b.className = 'chip' + (isOn(it) ? ' on' : '');
    b.textContent = it.name;
    b.dataset.id = it.id;
    b.addEventListener('click', () => { onPick(it); save(); });
    host.appendChild(b);
  }
}
const markChips = (host, id) =>
  [...host.children].forEach(c => c.classList.toggle('on', c.dataset.id === id));

function syncPoseUI() {
  ['pRx', 'pRy', 'pRz', 'pScale', 'pX', 'pY', 'pPersp'].forEach(k => { const e = document.getElementById(k); if (e && e._sync) e._sync(); });
  markChips($('#poses'), S.poseId);
}

function applyPose(p) {
  S.pose.rx = p.rx; S.pose.ry = p.ry; S.pose.rz = p.rz;
  S.poseId = p.id;
  syncPoseUI();
}

function resetPose() {
  Object.assign(S.pose, { x: 0, y: 0, scale: 1, rx: 0, ry: 0, rz: 0, persp: 2600 });
  S.poseId = 'flat';
  syncPoseUI();
  save();
  toast('Положение сброшено');
}
$('#resetPose').addEventListener('click', resetPose);

function buildUI() {
  // устройства
  const dsel = $('#device');
  dsel.innerHTML = '';
  for (const [id, d] of Object.entries(DEVICES)) {
    const o = document.createElement('option'); o.value = id; o.textContent = d.name; dsel.appendChild(o);
  }
  dsel.value = S.device;
  dsel.addEventListener('change', () => { S.device = dsel.value; buildFrameChips(); save(); });

  // цвет корпуса — у фото-рамок свой набор
  const buildFrameChips = () => {
    const allowed = deviceColors(DEVICES[S.device]);
    if (!allowed.includes(S.frame)) S.frame = allowed[0];
    buildChips($('#frameColors'),
      allowed.map(id => ({ id, name: FRAMES[id].name })),
      it => it.id === S.frame,
      it => { S.frame = it.id; markChips($('#frameColors'), it.id); });
  };
  buildFrameChips();

  // позы
  buildChips($('#poses'), POSES, p => p.id === S.poseId, applyPose);

  // сценарии
  buildChips($('#scenarios'), SCENARIOS.filter(x => x.dur > 0), () => false, m => {
    const b = addScene(m.id);
    if (b) toast(`Сцена «${m.name}» добавлена на ${b.t0.toFixed(1)} с`);
  });
  buildChips($('#reels'), REELS, () => false, applyReel);
  $('#scClear').addEventListener('click', () => {
    S.scenes.length = 0; S.selScene = null; renderTimeline(); save(); toast('Дорожка сцен очищена');
  });

  // фоны
  const host = $('#bgPresets');
  host.innerHTML = '';
  for (const p of BG_PRESETS) {
    const b = document.createElement('button');
    b.className = 'sw' + (p.id === S.bg.preset ? ' on' : '');
    b.dataset.id = p.id;
    b.title = p.id;
    b.style.background = p.type === 'solid' ? p.a
      : p.type === 'studio' ? `radial-gradient(circle at 50% 38%, ${p.a}, ${p.b})`
      : `linear-gradient(${p.angle || 135}deg, ${p.a}, ${p.b})`;
    b.addEventListener('click', () => {
      Object.assign(S.bg, { preset: p.id, type: p.type, a: p.a, b: p.b, angle: p.angle || S.bg.angle });
      [...host.children].forEach(c => c.classList.toggle('on', c.dataset.id === p.id));
      $('#bgA').value = p.a; $('#bgB').value = p.b;
      $('#bgType').value = p.type; $('#bgAngle')._sync();
      save();
    });
    host.appendChild(b);
  }

  // размеры кадра
  const ssel = $('#sizePreset');
  ssel.innerHTML = '';
  for (const p of SIZE_PRESETS) {
    const o = document.createElement('option'); o.value = p.id; o.textContent = p.name; ssel.appendChild(o);
  }
  ssel.value = S.sizePreset;
  ssel.addEventListener('change', () => {
    S.sizePreset = ssel.value;
    const p = SIZE_PRESETS.find(x => x.id === ssel.value);
    if (p && p.w) setCanvasSize(p.w, p.h);
    save();
  });
  const onCustom = () => {
    S.sizePreset = 'custom'; ssel.value = 'custom';
    setCanvasSize(+$('#cw').value, +$('#ch').value); save();
  };
  $('#cw').addEventListener('change', onCustom);
  $('#ch').addEventListener('change', onCustom);

  // остальные контролы
  bind('screenFit',  'screen.fit',  'str');
  bind('screenZoom', 'screen.zoom', 'num');
  bind('screenOffX', 'screen.offX', 'num');
  bind('screenOffY', 'screen.offY', 'num');
  bind('screenBg',   'screen.bg',   'str');

  bind('showButtons','showButtons', 'bool');
  bind('glareOn',    'glare.on',    'bool');
  bind('glareAmt',   'glare.amt',   'num');
  bind('sbOn',       'sb.on',       'bool');
  bind('sbStyle',    'sb.style',    'str');
  bind('sbTime',     'sb.time',     'str');

  bind('pScale', 'pose.scale', 'num');
  bind('pX',     'pose.x',     'num');
  bind('pY',     'pose.y',     'num');
  bind('pRx',    'pose.rx',    'num', () => { S.poseId = ''; markChips($('#poses'), ''); });
  bind('pRy',    'pose.ry',    'num', () => { S.poseId = ''; markChips($('#poses'), ''); });
  bind('pRz',    'pose.rz',    'num', () => { S.poseId = ''; markChips($('#poses'), ''); });
  bind('pPersp', 'pose.persp', 'num');

  bind('mAmount', 'scene.amount', 'num');
  bind('mIdle',   'scene.idle',    'num');
  bind('scEase',  'scene.ease',    'num');
  $('#tempoSlow').addEventListener('click', () => applyTempo(1.25));
  $('#tempoFast').addEventListener('click', () => applyTempo(0.8));

  bind('dofOn',     'dof.on',          'bool');
  bind('dofAmt',    'dof.amt',         'num');
  bind('reflOn',    'reflect.on',      'bool');
  bind('reflAmt',   'reflect.amt',     'num');
  bind('fxIsland',  'fx.islandShadow', 'bool');
  bind('fxGlow',    'fx.glow',         'bool');
  bind('fxGlowAmt', 'fx.glowAmt',      'num');
  bind('thickK',  'thickK',        'num');

  bind('bgA',     'bg.a',     'str', () => S.bg.preset = '');
  bind('bgB',     'bg.b',     'str', () => S.bg.preset = '');
  bind('bgType',  'bg.type',  'str');
  bind('bgAngle', 'bg.angle', 'num');
  bind('bgBlur',  'bg.blur',  'num');
  bind('bgDim',   'bg.dim',   'num');
  bind('vignette','vignette', 'num');
  bind('grain',   'grain',    'num');

  bind('shOn',      'shadow.on',      'bool');
  bind('shOpacity', 'shadow.opacity', 'num');
  bind('shBlur',    'shadow.blur',    'num');
  bind('shX',       'shadow.x',       'num');
  bind('shY',       'shadow.y',       'num');
  bind('shSpread',  'shadow.spread',  'num');

  bind('txOn',    'text.on',    'bool');
  bind('txTitle', 'text.title', 'str');
  bind('txSub',   'text.sub',   'str');
  bind('txPos',   'text.pos',   'str');
  bind('txSize',  'text.size',  'num');
  bind('txColor', 'text.color', 'str');

  $('#btnSelect').addEventListener('click', () => selecting ? endSelect() : startSelect(S.sel));
  $('#fcDelete').addEventListener('click', () => S.sel && deleteClip(S.sel));
  $('#btnAddZoom').addEventListener('click', addClip);
  const syncLoop = () => {
    $('#btnLoop').classList.toggle('on', !!S.loop);
    $('#btnLoop').title = S.loop ? 'Повтор включён' : 'Повтор выключен — в конце остановится';
  };
  $('#btnLoop').addEventListener('click', () => {
    S.loop = !S.loop; syncLoop(); save();
    toast(S.loop ? 'Повтор включён' : 'Повтор выключен — ролик остановится в конце');
  });
  syncLoop();
  $('#btnRecord2').addEventListener('click', () => recording ? stopRecording() : startRecording());
  const clipParam = (id, key, fmt) => {
    const el = $('#' + id), out = el.parentElement.querySelector('output');
    el.addEventListener('input', () => {
      const c = selectedClip(); if (!c) return;
      c[key] = +el.value;
      if (out) out.textContent = fmt(+el.value);
      layoutClip(c); save();
    });
  };
  clipParam('fcFill', 'fill', v => Math.round(v * 100) + '%');
  clipParam('fcRamp', 'ramp', v => v.toFixed(2) + 'с');

  bind('fps',      'exp.fps',     'num');
  bind('bitrate',  'exp.bitrate', 'num');
  bind('withAudio','exp.audio',   'bool');
  bind('expDur',   'exp.dur',     'num', () => renderTimeline());
}

function updateSceneMeta() {
  const el = $('#scMeta');
  const b = getScene(S.selScene) || sortedScenes()[0];
  if (!b) { el.textContent = 'Сцен нет. Нажми на приём — он встанет на дорожку в место плейхеда, или выбери готовый ролик.'; return; }
  const sc = scenarioById(b.sc);
  const rate = sc.dur ? b.dur / sc.dur : 1;
  el.innerHTML =
    `<b style="color:#c6ccdc">${sc.name}</b> · ${b.t0.toFixed(1)}–${sceneEnd(b).toFixed(1)} с` +
    (Math.abs(rate - 1) > 0.05 ? ` · темп ${rate.toFixed(2)}×` : '') +
    `<br>${sc.hint}` +
    (S.scenes.length > 1 ? `<br><span style="color:#8b93a7">Всего сцен: ${S.scenes.length}, между соседними — уход в чёрное.</span>` : '');
}

/* ================================================= сохранение ========== */

const KEY = 'mockup-studio-v1';
let saveT = 0;
function save() {
  clearTimeout(saveT);
  saveT = setTimeout(() => {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (_) {}
  }, 250);
}
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const o = JSON.parse(raw);
    const deep = (dst, src) => {
      for (const k of Object.keys(dst)) {
        if (!(k in src) || src[k] === undefined || src[k] === null) continue;
        if (Array.isArray(dst[k])) { if (Array.isArray(src[k])) dst[k] = src[k]; }
        else if (dst[k] && typeof dst[k] === 'object') deep(dst[k], src[k]);
        else dst[k] = src[k];
      }
    };
    deep(S, o);
    if (!DEVICES[S.device]) S.device = 'fig17pro';
    if (!FRAMES[S.frame]) S.frame = 'black';
    if (DEVICES[S.device] && !deviceColors(DEVICES[S.device]).includes(S.frame)) S.frame = deviceColors(DEVICES[S.device])[0];
    if (S.bg.type === 'image') S.bg.type = 'linear';   // картинку заново не восстановить
    S.media = [];  S.selMedia = null;      // blob-ссылки не переживают перезагрузку
    if (!Array.isArray(S.scenes)) S.scenes = [];
    S.scenes = S.scenes.filter(b => b && SCENARIOS.some(x => x.id === b.sc && x.dur > 0) && isFinite(b.t0) && b.dur > 0);
    for (const b of S.scenes) {
      if (!b.id) b.id = newSceneId();
      const n = +String(b.id).replace(/\D/g, ''); if (n >= sceneSeq) sceneSeq = n + 1;
    }
    if (S.selScene && !S.scenes.some(b => b.id === S.selScene)) S.selScene = null;
    if (!Array.isArray(S.clips)) S.clips = [];
    S.clips = S.clips.filter(c => c && isFinite(c.t0) && isFinite(c.dur) && c.dur > 0);
    for (const c of S.clips) {
      if (!c.id) c.id = 'z' + (clipSeq++);
      const n = +String(c.id).replace(/\D/g, '');
      if (n >= clipSeq) clipSeq = n + 1;
    }
    if (S.sel && !S.clips.some(c => c.id === S.sel)) S.sel = null;
  } catch (_) {}
}

/* ================================================= старт =============== */

function init() {
  load();
  buildUI();
  setCanvasSize(S.cw, S.ch);
  syncPoseUI();
  updateSceneMeta();
  updateFocusMeta();
  updateVideoMeta();
  renderTimeline();

  const q = new URLSearchParams(location.search);
  if (q.get('video')) loadVideoUrl(q.get('video'));

  requestAnimationFrame(loop);
  setTimeout(fitCanvas, 60);
}
init();

/* хук для отладки/автотестов */
window.__ms = { S, draw, setCanvasSize, loadVideoUrl, DEVICES, SCENARIOS, REELS, POSES, addClip, deleteClip,
  addVideoFiles, deleteMedia, clearVideo, mediaDur, mediaAt, syncMedia, mediaPool,
  addScene, applyReel, deleteScene, sceneFade, sceneAt,
  renderTimeline, buildFilmstrip, evalScenario, focusAt, sceneDuration, selectClip, seekTo,
  homography, hmap, setForceGrid: v => { forceGrid = v; },
  get last(){ return lastRender }, get selecting(){ return selecting }, startSelect, endSelect,
  setPose: p => { Object.assign(S.pose, p); syncPoseUI(); },
  setPlaying: v => setPlaying(v) };
