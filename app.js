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

/* Плавный проезд: короткий разгон и торможение, постоянная скорость
   в середине. Интеграл smoothstep даёт нулевые скорость и ускорение
   на обоих концах, без рывка при переходе в неподвижный кадр. */
function easeGlide(t) {
  const ramp = .2, speed = 1 / (1 - ramp);
  const area = u => u * u * u - .5 * u * u * u * u;
  if (t < ramp) return speed * ramp * area(t / ramp);
  if (t > 1 - ramp) return 1 - speed * ramp * area((1 - t) / ramp);
  return speed * (t - ramp / 2);
}

const EASES = {
  lin:   t => t,
  glide: easeGlide,
  smooth: t => t * t * t * (t * (t * 6 - 15) + 10),   // нулевая скорость И ускорение на концах
  out:   easeOutCubic,
  expo:  easeOutExpo,
  inout: easeInOut,
  in:    t => t * t * t,
};

/* Режиссёрские сцены: читаемый первый кадр, мотивированное движение,
   выдержка в конце. Ключ e принадлежит ВХОДЯЩЕМУ сегменту. Старые ID
   сохранены, чтобы проекты продолжали открываться. */
const SCENARIOS = [
  { id: 'none', name: 'Без сценария', dur: 0, hint: 'Свободная камера.', keys: [] },
  { id: 'revealLow', name: 'Первое появление', dur: 4.5, tag: 'Раскрытие',
    hint: 'Крупная деталь → уверенный отъезд → чистый фронт. Открывающий кадр запуска продукта.',
    keys: [
      { t: 0, ds: 1.15, dy: .36, drx: 14, dry: -18, drz: -4, lx: -.16 },
      { t: 3.6, ds: .03, dy: -.02, drx: 0, dry: 0, drz: 0, lx: .06, e: 'smooth' },
      { t: 4.5, ds: .03, dy: -.02, drx: 0, dry: 0, drz: 0, lx: .06, e: 'smooth' },
    ] },
  { id: 'panDown', name: 'Интерфейс · сверху вниз', dur: 5, tag: 'Продукт',
    hint: 'Спокойный проезд по экрану без вращения: интерфейс остаётся читаемым.',
    keys: [
      { t: 0, ds: .68, dy: .24, dry: -3, drx: 1 },
      { t: 5, ds: .68, dy: -.24, dry: -3, drx: 1, e: 'glide' },
    ] },
  { id: 'panUp', name: 'Интерфейс · снизу вверх', dur: 5, tag: 'Продукт',
    hint: 'Обратный проезд по экрану. Подходит для показа результата действия.',
    keys: [
      { t: 0, ds: .68, dy: -.24, dry: 3, drx: -1 },
      { t: 5, ds: .68, dy: .24, dry: 3, drx: -1, e: 'glide' },
    ] },
  { id: 'deckSlide', name: 'Скульптура', dur: 4, tag: 'Форма',
    hint: 'Диагональная композиция и боковой свет подчёркивают объём корпуса.',
    keys: [
      { t: 0, drx: 32, dry: -12, drz: -24, ds: .15, dx: -.055, lx: -.18 },
      { t: 4, drx: 27, dry: 6, drz: -20, ds: .19, dx: .035, lx: .15, e: 'glide' },
    ] },
  { id: 'truckReveal', name: 'Из профиля во фронт', dur: 3.5, tag: 'Раскрытие',
    hint: 'Тонкий силуэт раскрывается в экран. Быстрый акцент с мягкой посадкой.',
    keys: [
      { t: 0, dry: -54, drx: 5, drz: -3, dx: -.13, ds: .12, lx: -.2 },
      { t: 2.8, dry: 0, drx: 0, drz: 0, dx: 0, ds: .04, lx: .08, e: 'smooth' },
      { t: 3.5, dry: 0, drx: 0, drz: 0, dx: 0, ds: .04, lx: .08, e: 'smooth' },
    ] },
  { id: 'turn34', name: 'Орбита', dur: 4, tag: 'Форма',
    hint: 'Сдержанная дуга камеры вокруг устройства. Объём без случайного покачивания.',
    keys: [
      { t: 0, dry: -22, drx: 6, ds: .08, lx: -.14 },
      { t: 4, dry: 14, drx: 6, ds: .08, lx: .14, e: 'smooth' },
    ] },
  { id: 'lowFlare', name: 'Свет по стеклу', dur: 3.5, tag: 'Форма',
    hint: 'Низкий ракурс и небольшой доворот ловят мягкое отражение на стекле.',
    keys: [
      { t: 0, drx: 20, dry: -22, drz: -8, ds: .25, dy: .06, lx: -.15 },
      { t: 3.5, drx: 8, dry: -5, drz: -3, ds: .22, dy: .01, lx: .16, e: 'smooth' },
    ] },
  { id: 'studioLight', name: 'Тихий финал', dur: 4, tag: 'Финал',
    hint: 'Неподвижный фронт, воздух для заголовка и медленно движущийся свет.',
    keys: [
      { t: 0, ds: -.10, dy: .045, lx: -.12 },
      { t: 4, ds: -.10, dy: .045, lx: .12, e: 'smooth' },
    ] },
  { id: 'topMacro', name: 'Точная деталь', dur: 2.5, tag: 'Деталь',
    hint: 'Крупный верх экрана, остров и фаска. Короткая перебивка между общими планами.',
    keys: [
      { t: 0, ds: 1.12, dy: .38, dry: -9, drx: 5, dx: -.025, lx: -.12 },
      { t: 2.5, ds: 1.08, dy: .37, dry: -2, drx: 5, dx: .025, lx: .08, e: 'glide' },
    ] },
  { id: 'heroHold', name: 'Главный кадр', dur: 4, tag: 'Финал',
    hint: 'Медленное приближение, ровный экран и остановка под финальную фразу.',
    keys: [
      { t: 0, ds: -.04, dy: .015, dry: -4, drx: 2, lx: -.05 },
      { t: 3, ds: .04, dy: .015, dry: 0, drx: 0, lx: .04, e: 'smooth' },
      { t: 4, ds: .04, dy: .015, dry: 0, drx: 0, lx: .04, e: 'smooth' },
    ] },
  { id: 'screenProof', name: 'Покажи, как работает', dur: 5, tag: 'Продукт',
    hint: 'Фронтальный экран без бликовой акробатики: место для демонстрации главной функции.',
    keys: [
      { t: 0, ds: .12, dy: -.015 },
      { t: 4, ds: .18, dy: -.015, e: 'smooth' },
      { t: 5, ds: .18, dy: -.015, e: 'smooth' },
    ] },
  { id: 'edgeSignature', name: 'Линия корпуса', dur: 2, tag: 'Деталь',
    hint: 'Крупный ракурс в три четверти: материал, кнопки и тонкая грань.',
    keys: [
      { t: 0, dry: -42, drx: 7, ds: .48, dx: -.04, dy: .08, lx: -.2 },
      { t: 2, dry: -32, drx: 7, ds: .46, dx: .01, dy: .08, lx: .12, e: 'glide' },
    ] },
  { id: 'loopOrbit', name: 'Бесшовная орбита', dur: 8, tag: 'Петля',
    hint: 'Замкнутая дуга: первый и последний кадры совпадают, включая свет.',
    keys: [
      { t: 0, dry: -16, drx: 5, ds: .06, lx: -.12 },
      { t: 4, dry: 16, drx: 5, ds: .06, lx: .12, e: 'smooth' },
      { t: 8, dry: -16, drx: 5, ds: .06, lx: -.12, e: 'smooth' },
    ] },
];

/* Монтажные истории. Длительности включают все стыки, без скрытых пауз.
   cut — прямая склейка; dip — короткий уход через чёрное. */
const REELS = [
  { id: 'short15', name: 'Запуск', eyebrow: 'LAUNCH FILM', duration: 15, look: 'pearl',
    hint: 'Первое впечатление → главная функция → желание попробовать.',
    beats: 'Раскрыть · Показать · Запомниться',
    seq: [['truckReveal', 3], ['topMacro', 2], ['screenProof', 6], ['heroHold', 4]] },
  { id: 'impact8', name: 'Стоп-скролл', eyebrow: 'SOCIAL TEASER', duration: 8, look: 'graphite',
    hint: 'Контраст крупностей с первой секунды. Для короткого анонса.',
    beats: 'Грань · Разворот · Продукт · Финал',
    seq: [['edgeSignature', 1.2], ['truckReveal', 1.8], ['screenProof', 3], ['heroHold', 2]] },
  { id: 'details20', name: 'Всё в деталях', eyebrow: 'DESIGN STORY', duration: 20, look: 'pearl',
    hint: 'Материал, стекло, точность интерфейса. Спокойная история о качестве.',
    beats: 'Деталь · Форма · Экран · Свет · Финал',
    seq: [['topMacro', 3], ['deckSlide', 4], ['panDown', 5], ['lowFlare', 3], ['studioLight', 5]] },
  { id: 'cinema25', name: 'Премьера', eyebrow: 'SIGNATURE FILM', duration: 25, look: 'graphite',
    hint: 'Выразительное раскрытие и размеренный монтаж для большого анонса.',
    beats: 'Интрига · Силуэт · Деталь · Демо · Финал',
    seq: [['revealLow', 5], ['turn34', 4], ['edgeSignature', 3], ['screenProof', 8], ['heroHold', 5, 'dip']] },
  { id: 'promo30', name: 'Продукт в действии', eyebrow: 'PRODUCT DEMO', duration: 30, look: 'pearl',
    hint: 'Больше времени на реальный сценарий использования и объяснение ценности.',
    beats: 'Знакомство · Демо · Детали · Результат · CTA',
    seq: [['truckReveal', 4], ['screenProof', 10], ['panDown', 5], ['panUp', 5], ['studioLight', 6]] },
  { id: 'loop8', name: 'Бесконечный кадр', eyebrow: 'SEAMLESS LOOP', duration: 8, look: 'graphite',
    hint: 'Медленная орбита без заметного шва. Для атмосферного ролика на повторе.',
    beats: 'Один кадр · Замкнутое движение',
    seq: [['loopOrbit', 8]] },
];
const REEL_LOOKS = {
  pearl: { bg: { preset: 'studioLight', type: 'studio', a: '#fbf8f3', b: '#cfc8bd', angle: 135, blur: 0, dim: 0 }, glare: .055, vignette: .10 },
  graphite: { bg: { preset: 'studioDark', type: 'studio', a: '#8e8f96', b: '#15161b', angle: 135, blur: 0, dim: 0 }, glare: .08, vignette: .20 },
};
const REEL_GAP = 0.24;

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
  const u = (t - a.t) / Math.max(1e-6, b.t - a.t);
  // Авторская кривая работает на каждом сегменте; старые ключи без e — через регулятор.
  const e = b.e && EASES[b.e] ? lerp(u, EASES[b.e](u), clamp(S.scene.ease, 0, 1)) : easeMix(u);
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
  pushHist();
  const sel = getScene(S.selScene);
  if (sel) {
    // Темп только выбранной сцены: она удлиняется или укорачивается на месте,
    // а всё, что стоит правее, сдвигается на ту же разницу — промежутки и
    // порядок остаются прежними. Без выбора — как раньше, вся история.
    const oldEnd = sceneEnd(sel);
    const dur = Math.round(Math.max(0.3, sel.dur * k) * 100) / 100;
    const delta = dur - sel.dur;
    sel.dur = dur;
    for (const b of list) if (b !== sel && b.t0 >= oldEnd - 1e-3) b.t0 = Math.round((b.t0 + delta) * 100) / 100;
    S.exp.dur = 0;
    renderTimeline(); updateSceneMeta(); save();
    const name = sceneDefinition(sel).name.split(' → ')[0].split(' · ')[0];
    toast(k > 1 ? `«${name}» медленнее в ${k.toFixed(2)}×` : `«${name}» быстрее в ${(1 / k).toFixed(2)}×`);
    return;
  }
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
/* Дрейф включается плавно за первые 2 с: у шума на t=0 фазы ненулевые, и
   без этого первый кадр был бы чуть повёрнут случайным образом — телефон
   выглядел «криво направленным», хотя поза сценария ровная.              */
function idleDrift(t) {
  const k = EASES.smooth(clamp(t / 2, 0, 1));
  return {
    dx:  nz(t * 0.31)          * 0.0040 * k,
    dy:  nz(t * 0.27 + 53.1)   * 0.0050 * k,
    drx: nz(t * 0.23 + 311.7)  * 0.55   * k,
    dry: nz(t * 0.29 + 407.2)  * 0.80   * k,
    drz: nz(t * 0.25 + 121.4)  * 0.32   * k,
    ds:  nz(t * 0.21 + 199.3)  * 0.0045 * k,
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
  scene: { amount: 1, idle: 0, ease: 1, transition: 'cut', artDirection: true },   // ease: 0 — равномерно, 1 — максимально мягко
  scenes: [{ id: 's1', sc: 'truckReveal', t0: 0, dur: 3.5 }],   // сцены на дорожке
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
  media: [],                 // видео на дорожке: [{id,name,t0,dur,inPoint,src}]
  selMedia: null,
  trans: [],                 // переходы между соседними клипами: [{id,after,dur}]
  selTrans: null,
  clips: [],                 // наезды: [{id,t0,dur,ramp,fill,u0,v0,u1,v1}]
  sel: null,                 // id выбранного наезда
  exp: { fps: 30, bitrate: 14, audio: false, dur: 0, autoDurationVersion: 1 },
  sizePreset: 'p1080',
  tl: { pps: 0 },             // масштаб таймлайна, пикселей на секунду; 0 — ещё не инициализирован
};

const canvas = $('#c');
const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
const video = $('#v');

let bgImage = null;         // Image для фонового изображения
/* Несколько видео/фото на дорожке: у каждого своя запись в пуле — видео
   держит <video> (kind:'video'), фото — <img> (kind:'image', natDur:Infinity,
   без звука). Сам элемент в S не хранится — только запись клипа; blob-URL из
   мировой памяти вкладки не переживают перезагрузку, но сам файл переживает —
   он лежит в IndexedDB по ключу srcId (= m.src у клипа, см. store ниже) и
   пересоздаётся в restoreMedia() при старте. После split две S.media-записи
   (m.id и rightId) делят один и тот же объект в пуле и один и тот же src —
   см. splitMediaAt.                                                       */
const mediaPool = {};            // id → {kind, video|img, url, name, natDur, w, h, ready, srcId, frame?, frameTime?, pendingSeek?}
let mediaSeq = 1;
const newMediaId = () => 'm' + (mediaSeq++);
let hasVideo = false;            // есть хотя бы одно готовое медиа (видео или фото)
const stats = { seeks: 0 };      // счётчик реальных назначений video.currentTime — для отладки скраба

/* Переходы — просто уход в чёрное, без собственного медиа-содержимого,
   поэтому им не нужен pool. Каждый переход сидит на краю ('in'|'out') одного
   клипа; вид (стык / затемнение в начале / в конце) считается на лету при
   отрисовке — см. isStitch() и transFade() ниже (брифинг, раздел C).       */
let transSeq = 1;
const newTransId = () => 't' + (transSeq++);
function getTrans(id) { return S.trans.find(x => x.id === id) || null; }
function transOnEdge(clipId, edge) { return S.trans.find(x => x.clip === clipId && x.edge === edge) || null; }

function mediaEnd(m) { return m.t0 + m.dur; }
function sortedMedia() { return S.media.slice().sort((a, b) => a.t0 - b.t0); }
function getMedia(id) { return S.media.find(m => m.id === id) || null; }
/* Вид клипа берём из пула, а не храним в самом клипе — так split/undo не
   должны его туда-сюда копировать: у обеих половин split один и тот же pool
   объект, значит и один и тот же kind автоматически. Пока pool ещё не готов
   (только что добавили файл), считаем клип видео — это временное состояние
   до loadedmetadata/onload.                                               */
function mediaKind(m) { return (mediaPool[m.id] || {}).kind || 'video'; }
/* Стоп-кадр (см. бриф «Стоп-кадр»): клип можно тянуть за край дальше, чем
   реально снято в исходнике — тогда inPoint уходит в минус (заморозка у
   начала) или dur уходит за (natDur − inPoint) (заморозка у конца). Обе
   функции возвращают, сколько «виртуальных» секунд с этого края клипа —
   застывший крайний кадр, а не настоящее видео; 0, когда края не выходят
   за исходник или pool ещё не готов (natDur неизвестен). У фото natDur
   бесконечен и кадр всегда один и тот же — стоп-кадра как понятия для него
   просто нет, поэтому обе функции сразу отдают 0, не считая формулу (при
   отрицательном inPoint от левой ручки формула дала бы ненулевое число).  */
function holdHead(m) {
  if (mediaKind(m) === 'image') return 0;
  return Math.max(0, Math.min(m.dur, -(m.inPoint || 0)));
}
function holdTail(m) {
  if (mediaKind(m) === 'image') return 0;
  const p = mediaPool[m.id];
  if (!p) return 0;
  return Math.max(0, Math.min(m.dur, m.dur - (p.natDur - (m.inPoint || 0))));
}
/* Следующий по времени клип после m — или null, если m последний. */
function nextMediaOf(m) {
  const list = sortedMedia();
  const i = list.findIndex(x => x.id === m.id);
  return i >= 0 ? (list[i + 1] || null) : null;
}
/* 'out'-край клипа — стык, если сразу за ним (без зазора) стоит другой клип:
   тогда затемнение рисуется как двусторонний «нырок» на границе, а не внутрь
   одного клипа. 'in'-край стыком не бывает — см. C.1 в брифе.              */
function isStitch(m) {
  const n = nextMediaOf(m);
  return !!(n && Math.abs(n.t0 - mediaEnd(m)) < 0.05);
}

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
/* Только видео — null и для пустой сцены, и для активного клипа-фото. */
function activeVideo(t) { const a = mediaAt(t); return (a && a.pool.video) ? a.pool.video : null; }

/* Что сейчас рисовать на экране телефона: активный клип, приведённый к
   {kind, el, w, h} независимо от того, видео это, фото или живой кадр видео
   подменён последним снятым слепком (см. syncMedia/p.frame — брифинг,
   «Живой скраб»). null — только когда на плейхеде вообще нет клипа; в
   отличие от него, «кадр ещё не готов» (видео есть, но ни живого readyState,
   ни p.frame) — это тоже null, но временно, на следующий тик обычно найдётся
   хоть что-то. Placeholder рисуется только в самом первом случае.         */
function activeMedia(t) {
  const a = mediaAt(t);
  if (!a) return null;
  const p = a.pool;
  if (p.kind === 'image') return { kind: 'image', el: p.img, w: p.w, h: p.h };
  const v = p.video;
  if (v.readyState >= 2 && !v.seeking && v.videoWidth) return { kind: 'video', el: v, w: v.videoWidth, h: v.videoHeight };
  if (p.frame) return { kind: 'frame', el: p.frame, w: p.frame.width, h: p.frame.height };
  return null;
}

/* Снимок последнего валидного кадра видео — на offscreen-канвас в пуле.
   Вызывается только на перемотку (см. syncMedia), не на каждый кадр
   воспроизведения — иначе это была бы лишняя копия по вх кадру.          */
function snapshotFrame(p, v) {
  const vw = v.videoWidth, vh = v.videoHeight;
  if (!vw || !vh) return;
  if (!p.frame) p.frame = document.createElement('canvas');
  if (p.frame.width !== vw || p.frame.height !== vh) { p.frame.width = vw; p.frame.height = vh; }
  try { p.frame.getContext('2d').drawImage(v, 0, 0, vw, vh); p.frameTime = v.currentTime; } catch (_) {}
}

/* Ставим активному клипу нужное время. Клок — ведущий: догонять его текущим
   временем видео нельзя, между клипами и в разрывах видео просто нет.
   Перематываем, только когда расхождение заметно, иначе рвётся плавность.  */
function syncMedia(t, wantPlay) {
  const a = mediaAt(t);
  for (const id in mediaPool) {
    const p = mediaPool[id];
    if (!p.ready || !p.video) continue;    // фото паузить нечего
    if (!a || p !== a.pool) { if (!p.video.paused) p.video.pause(); }
  }
  if (!a) return;
  if (a.pool.kind === 'image') return;     // фото рисуется всегда одинаково — синкать нечего
  const v = a.pool.video, p = a.pool, edge = Math.max(0, p.natDur - 0.03);

  // Перемотка «последний позвал — тот и победил»: если видео уже в процессе
  // предыдущего seek(), второй currentTime= браузер либо проигнорирует, либо
  // поставит в очередь непредсказуемо — вместо этого запоминаем желаемое
  // время и досылаем его на событии 'seeked' (слушатель — в addVideoFile/
  // loadVideoUrl), когда предыдущая перемотка гарантированно завершилась.
  // Снимок кадра — здесь, а не безусловно на каждый вызов syncMedia: снимаем
  // ДО того, как потрогаем currentTime (перемотка почти всегда на миг роняет
  // readyState ниже 2, и без этого снимка drawScreenContent на этот миг
  // откатился бы к заглушке вместо картинки видео — см. «Живой скраб» в
  // брифинге), но именно тогда, когда мы вот-вот реально позовём seek, а не
  // на каждом кадре воспроизведения/записи — иначе это лишняя полноразмерная
  // копия видео в канвас на КАЖДЫЙ кадр рендера (см. находку по snapshotFrame:
  // ~10× по времени кадра, ниже 60fps в обычном сценарии «нажал play»).
  // Снимаем только когда кадр валиден и не в процессе уже идущей перемотки,
  // иначе рискуем закэшировать смазанный кадр.
  const seekTo_ = (want) => {
    if (v.readyState >= 2 && !v.seeking) snapshotFrame(p, v);
    if (v.seeking) { p.pendingSeek = want; return; }
    try { v.currentTime = want; stats.seeks++; } catch (_) {}
  };

  // Стоп-кадр: local вне [0, natDur) — клип растянут дальше исходника, и
  // этот край сейчас должен показывать застывший крайний кадр, а не живое
  // видео. Держим currentTime у самого края и ставим на паузу НЕЗАВИСИМО
  // от wantPlay: video.play() у уже закончившегося (ended) видео по
  // спецификации сам перематывает currentTime на 0 — если бы мы вызвали
  // play() в хвостовом стоп-кадре, вместо застывшего последнего кадра
  // тут же поехало бы воспроизведение сначала. Поэтому в этой ветке play()
  // не вызывается вообще. Порог перемотки ниже, чем в живой зоне (0.05
  // вместо 0.2) — здесь currentTime сам не течёт (видео на паузе), так что
  // даже небольшой снос уже заметен и не требует «гасить» дрожание.
  if (a.local < 0 || a.local >= edge) {
    const want = a.local < 0 ? 0 : edge;
    if (Math.abs(v.currentTime - want) > 0.05) seekTo_(want);
    if (!v.paused) v.pause();
    return;
  }
  const want = clamp(a.local, 0, edge);
  // На паузе (в том числе во время скраба — там wantPlay=false) держим
  // кадр точнее: порог ниже, чем во время воспроизведения (0.04 вместо
  // 0.2), иначе видно, что плейхед и картинка на экране разъехались на
  // заметную долю секунды. При игре порог оставляем широким — иначе рвётся
  // плавность мелким дрожанием от одного лишь дрейфа между clock и currentTime.
  const thresh = wantPlay ? 0.2 : 0.04;
  if (Math.abs(v.currentTime - want) > thresh || v.seeking === undefined) seekTo_(want);
  if (wantPlay) { if (v.paused) v.play().catch(() => {}); }
  else if (!v.paused) v.pause();
}


let playing = false;
let clock = 0;              // время сцены, с
let lastTs = 0;
let recording = false;
let rendering = false;      // офлайн-рендер (см. renderOffline) — rAF-цикл ниже на время рендера холостой
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

  // activeMedia уже сам решает видео/фото/застывший кадр (см. функцию выше) —
  // заглушка рисуется только когда на плейхеде вообще нет активного клипа,
  // а не всякий раз, когда видео на миг теряет readyState во время скраба.
  const am = activeMedia(drawTime);
  if (!am) { drawPlaceholder(g, x, y, w, h); return; }
  const vw = am.w, vh = am.h;
  let dw, dh;
  if (S.screen.fit === 'stretch') { dw = w; dh = h; }
  else {
    const k = S.screen.fit === 'contain' ? Math.min(w / vw, h / vh) : Math.max(w / vw, h / vh);
    dw = vw * k; dh = vh * k;
  }
  dw *= S.screen.zoom; dh *= S.screen.zoom;
  const dx = x + (w - dw) / 2 + S.screen.offX * w;
  const dy = y + (h - dh) / 2 + S.screen.offY * h;
  try { g.drawImage(am.el, dx, dy, dw, dh); } catch (e) { /* кадр ещё не готов */ }
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
const POSE_FIELDS = ['x', 'y', 'scale', 'rx', 'ry', 'rz', 'persp', 'lx', 'ly'];
function validCustomScene(b) {
  return b.sc === 'custom' && [b.from, b.to].every(p => p &&
    POSE_FIELDS.every(k => Number.isFinite(p[k])) && p.scale > 0 && p.persp > 0);
}
function sceneDefinition(b) {
  return b.sc === 'custom'
    ? { name: 'Свой кадр', dur: b.dur, hint: 'Плавный переход к твоей позе. Положение задаёт конечный кадр; длину перехода меняй за край блока.' }
    : scenarioById(b.sc);
}
/* «Полная» длина плана — только для подписей (темп/фрагмент в layoutScene и
   updateSceneMeta). У сценариев это фиксированный sc.dur из SCENARIOS — не
   меняется split'ом/тримом. У 'custom' sceneDefinition() намеренно отдаёт
   dur:b.dur (это нужно sceneAt/customPose для их взаимного сокращения —
   трогать нельзя), поэтому после split b.dur — это уже длина ОДНОЙ половины,
   а не всей дуги: rate/фрагмент по нему получались бы самореферентными (см.
   находку). arcDur, если он есть (выставляется в splitSceneAt), хранит
   длину дуги до первого разреза — вот его и используем здесь.            */
function sceneTotalDur(b) {
  return b.sc === 'custom' ? (Number.isFinite(b.arcDur) ? b.arcDur : b.dur) : sceneDefinition(b).dur;
}
function customPose(b, t) {
  const list = sortedScenes();
  /* Дуга — цепочка смежных фрагментов ОДНОГО «Своего кадра»: после split/trim
     у соседей s1 предыдущего равно s0 следующего. Точку from берём у первого
     фрагмента дуги, а если тот сцеплен с предыдущим custom-планом — у того
     prev.to. Иначе правая половина разрезанного плана оставалась бы со
     старой копией from, и правка конца предыдущего плана давала бы скачок
     ровно в точке среза (см. находку верификатора). Настоящие раздельные
     планы (оба «+ Свой кадр», не резались) имеют s1=1 / s0=0 — в одну дугу
     они не склеиваются.                                                   */
  const sameArc = (p, q) => !!p && !!q && p.sc === 'custom' && q.sc === 'custom' &&
    sceneS0(q) > 0 && Math.abs(sceneS1(p) - sceneS0(q)) < 1e-6 && Math.abs(sceneEnd(p) - q.t0) < .01;
  let i = list.findIndex(x => x.id === b.id);
  while (i > 0 && sameArc(list[i - 1], list[i])) i--;
  const first = list[i], prev = list[i - 1];
  const chained = !!prev && prev.sc === 'custom' && sceneS0(first) === 0 && sceneS1(prev) === 1 &&
    Math.abs(sceneEnd(prev) - first.t0) < .01;
  const from = chained ? prev.to : first.from;
  const u = EASES.smooth(clamp(t / b.dur, 0, 1)), pose = {};
  for (const k of POSE_FIELDS) {
    pose[k] = k === 'scale' || k === 'persp'
      ? Math.exp(lerp(Math.log(from[k]), Math.log(b.to[k]), u))
      : lerp(from[k], b.to[k], u);
  }
  return pose;
}
function poseEditBlock() {
  const selected = S.scenes.find(b => b.id === S.selScene && b.sc === 'custom');
  if (selected && Math.abs(clock - sceneEnd(selected)) < .001) return selected;
  const at = sceneAt(clock);
  return at && at.block.sc === 'custom' ? at.block : null;
}
function editablePose() {
  const b = poseEditBlock();
  return b ? b.to : S.pose;
}
function beginPoseEdit(history = true) {
  const b = poseEditBlock();
  if (b) {
    if (history) pushHist();
    setPlaying(false);
    seekTo(sceneEnd(b));
  }
  return b ? b.to : S.pose;
}

function sceneEnd(b) { return b.t0 + b.dur; }
function sortedScenes() { return S.scenes.slice().sort((a, b) => a.t0 - b.t0); }

/* Доля сценария, которую реально играет блок: по умолчанию весь сценарий
   (0..1). После splitSceneAt/trimSceneToPlayhead блок играет только свой
   вырезанный кусок — s0/s1 держат его границы в долях длины sc.dur.        */
function sceneS0(b) { return Number.isFinite(b.s0) ? b.s0 : 0; }
function sceneS1(b) { return Number.isFinite(b.s1) ? b.s1 : 1; }

/* Какой блок сцены действует в момент t: внутри блока — он сам, в промежутке
   между блоками — предыдущий (камера замирает в его финале, но в точке
   среза s1, а не обязательно в конце сценария — см. sceneS0/sceneS1), до
   первого — первый блок в его СТАРТОВОЙ позе (тоже с учётом среза s0).     */
function sceneAt(t) {
  const list = sortedScenes();
  if (!list.length) return null;
  let cur = null;
  for (const b of list) { if (t >= b.t0) cur = b; else break; }
  if (!cur) {
    const first = list[0];
    return { block: first, local: sceneS0(first) * sceneDefinition(first).dur };
  }
  const sc = sceneDefinition(cur);
  const s0 = sceneS0(cur), s1 = sceneS1(cur);
  const u = clamp((t - cur.t0) / Math.max(0.1, cur.dur), 0, 1);
  const local = (s0 + u * (s1 - s0)) * sc.dur;
  return { block: cur, local };
}

/* Опциональный уход в чёрное на стыках сцен: последняя доля секунды одной и
   первая — следующей. Между несмежными блоками затемнения нет.             */
function sceneFade(t) {
  const list = sortedScenes();
  let f = 0;
  for (let i = 0; i < list.length; i++) {
    const b = list[i];
    const prev = list[i - 1], next = list[i + 1];
    const half = Math.min(REEL_GAP / 2, b.dur / 2, prev ? prev.dur / 2 : Infinity, next ? next.dur / 2 : Infinity);
    if (next && (next.transition || S.scene.transition) === 'dip' && Math.abs(next.t0 - sceneEnd(b)) < 0.05) {
      const dt = sceneEnd(b) - t;                       // конец блока
      if (dt >= 0 && dt < half) f = Math.max(f, 1 - dt / half);
    }
    if (prev && (b.transition || S.scene.transition) === 'dip' && Math.abs(b.t0 - sceneEnd(prev)) < 0.05) {
      const dt = t - b.t0;                              // начало блока
      if (dt >= 0 && dt < half) f = Math.max(f, 1 - dt / half);
    }
  }
  return smoother(clamp(f, 0, 1));
}

/* Затемнение переходов. Три вида, максимум по всем — сглаживается один раз
   в конце (см. C.1 в брифе):
   - 'out' на стыке (сразу за клипом стоит другой) — крестфейд-«нырок»:
     чёрное ровно на границе, спад по dur/2 в обе стороны;
   - 'out' без соседа (последний клип или зазор дальше) — уход в чёрное
     ВНУТРИ клипа, [end-dur, end], от 0 к 1;
   - 'in' — затемнение внутри начала клипа, [t0, t0+dur], от 1 к 0.        */
function transFade(t) {
  let f = 0;
  for (const tr of S.trans) {
    const a = getMedia(tr.clip);
    if (!a) continue;
    if (tr.edge === 'out') {
      if (isStitch(a)) {
        const e = mediaEnd(a);
        const half = tr.dur / 2;
        const dt = Math.abs(t - e);
        if (dt < half) f = Math.max(f, 1 - dt / half);
      } else {
        const e = mediaEnd(a), start = e - tr.dur;
        if (t >= start && t <= e) f = Math.max(f, (t - start) / tr.dur);
      }
    } else {   // 'in'
      const start = a.t0, e = a.t0 + tr.dur;
      if (t >= start && t <= e) f = Math.max(f, 1 - (t - start) / tr.dur);
    }
  }
  return smoother(clamp(f, 0, 1));
}

function composedPose(t) {
  const p = S.pose;
  const A = S.scene.amount;
  const d = { dx: 0, dy: 0, ds: 0, drx: 0, dry: 0, drz: 0, lx: 0, ly: 0 };

  const at = sceneAt(t);
  if (at && at.block.sc === 'custom') return customPose(at.block, at.local);
  if (at) {
    const k = evalScenario(at.local, scenarioById(at.block.sc));
    if (k) for (const f of KEYF) d[f] += (k[f] || 0) * (f === 'lx' || f === 'ly' ? 1 : A);
  }

  if (S.scene.idle > 0 && (!at || at.block.sc !== 'loopOrbit')) {
    const i = idleDrift(at ? Math.min(at.local, scenarioById(at.block.sc).dur) : t);
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
/* Клип на дорожке «наезды» бывает двух видов: 'region' — наезд на обведённый
   участок экрана (исходный режим), 'scale' — просто push-in всего кадра.
   Старые сохранённые клипы поля kind не имеют — такие всегда 'region'.      */
function clipKind(c) { return c && c.kind === 'scale' ? 'scale' : 'region'; }
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
let lastCam = null;        // камера последнего draw() — для отладки/автотестов (__ms.lastCam)
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
    const a = mediaAt(drawTime);
    if (!a) { g.fillStyle = '#1a2040'; g.fillRect(0, 0, 4, 4); }
    else {
      // То же «видео / фото / застывший кадр», что и в drawScreenContent.
      // Если прямо сейчас ничего из этого не готово (редкий миг посреди
      // скраба) — просто не трогаем цвет в этот тик, а не подсовываем
      // мимолётную черноту в засветку рамки.
      const am = activeMedia(drawTime);
      if (!am) return avgColor;
      g.drawImage(am.el, 0, 0, 4, 4);
    }
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
    const f = fa.clip;
    if (clipKind(f) === 'scale') {
      /* Масштаб — push-in всего кадра целиком, а не отдельно телефона: без
         homography по силуэту, просто камера едет к точке (ax,ay) от центра
         кадра. cam.s ниже уходит и в drawBackground(), и в формулу DOF —
         фон размывается и уезжает совершенно так же, как при наезде на
         участок экрана, разница только в том, что тут нет области.        */
      cam = {
        s: lerp(1, f.k, k),
        cx: lerp(W / 2, W / 2 + f.ax * W, k),
        cy: lerp(H / 2, H / 2 + f.ay * H, k),
        ox: W / 2, oy: H / 2,
      };
    } else {
      const xf0 = makeXform(rx, ry, rz, d, cx, cy, idc);
      const hw = info.bw / 2, hh = info.bh / 2;
      const q0 = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(([x, y]) => xf0.proj(xf0.p3(x, y, T / 2)));
      const Hm = homography(q0);
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
  }
  lastCam = cam;

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
  const fade = sel ? 0 : Math.max(sceneFade(t), transFade(t));
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
  const isScale = has && clipKind(c) === 'scale';
  // Область (fcFill, «переобвести участок») имеет смысл только у 'region';
  // увеличение и сдвиг (fcK/fcAX/fcAY) — только у 'scale'. fcRamp и fcDelete общие.
  $('#fcFill').disabled = !has || isScale;
  ['fcK', 'fcAX', 'fcAY'].forEach(id => { $('#' + id).disabled = !has || !isScale; });
  $('#fcRamp').disabled = !has;
  // Пока идёт обводка участка (selecting), кнопка её отмены должна быть
  // видима и активна независимо от того, какой клип сейчас выбран в
  // таймлайне — иначе клик по масштабу под рукой прятал единственный
  // способ выйти из режима обводки, кроме Escape (см. E.3 в брифе).
  if (selecting) {
    $('#btnSelect').hidden = false;
    $('#btnSelect').disabled = false;
    $('#btnSelect').textContent = 'Отменить выделение';
  } else {
    $('#btnSelect').disabled = !has || isScale;
    $('#btnSelect').hidden = isScale;
  }
  $('#fcFillRow').hidden = isScale;
  ['fcKRow', 'fcAXRow', 'fcAYRow'].forEach(id => { $('#' + id).hidden = !isScale; });
  $('#fcDelete').disabled = !has;
  if (!has) {
    el.textContent = S.clips.length
      ? 'Выбери наезд или масштаб на дорожке снизу, чтобы настроить.'
      : 'Наездов и масштабов нет. Добавь кнопками «+ Наезд» или «+ Масштаб» под холстом.';
    return;
  }
  if (isScale) {
    $('#fcK').value = c.k; $('#fcK').parentElement.querySelector('output').textContent = fmt('fcK', c.k);
    $('#fcAX').value = c.ax; $('#fcAX').parentElement.querySelector('output').textContent = fmt('fcAX', c.ax);
    $('#fcAY').value = c.ay; $('#fcAY').parentElement.querySelector('output').textContent = fmt('fcAY', c.ay);
    $('#fcRamp').value = c.ramp; $('#fcRamp').parentElement.querySelector('output').textContent = c.ramp.toFixed(2) + 'с';
    let shift = '';
    if (Math.abs(c.ax) > 0.001 || Math.abs(c.ay) > 0.001) {
      shift = ` · сдвиг X ${fmt('fcAX', c.ax)}, Y ${fmt('fcAY', c.ay)}`;
    }
    el.innerHTML = `Масштаб <b style="color:#c6ccdc">${c.t0.toFixed(1)}–${clipEnd(c).toFixed(1)} с</b> · ×${c.k.toFixed(2)}${shift}`;
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
  fcK: v => (+v).toFixed(2) + '×', fcAX: v => ((+v) >= 0 ? '+' : '') + Math.round(+v * 100) + '%',
  fcAY: v => ((+v) >= 0 ? '+' : '') + Math.round(+v * 100) + '%',
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
    const v = path.startsWith('pose.') ? editablePose()[path.slice(5)] : getPath(S, path);
    if (kind === 'bool') el.checked = !!v; else el.value = v;
    if (out) out.textContent = fmt(id, el.value);
  };
  let poseGesture = false;
  el.addEventListener('change', () => { poseGesture = false; });
  el.addEventListener('input', () => {
    const value = read();
    if (path.startsWith('pose.')) {
      const target = beginPoseEdit(!poseGesture);
      poseGesture = true;
      target[path.slice(5)] = value;
      el.value = value;
    } else setPath(S, path, value);
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
  if (recording || rendering) {
    toast(rendering ? 'Размер кадра нельзя менять во время рендера' : 'Размер кадра нельзя менять во время записи');
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

/* Хранилище файлов (IndexedDB). localStorage у save()/load() ниже хранит
   только JSON S — сами File/Blob туда не лезут и, что важнее, не должны:
   это разом убило бы синхронный save() на каждый чих. Файлы кладём в
   отдельную базу mockup-studio/media по ключу src (= id клипа при
   добавлении, см. srcId у pool-записи и m.src у клипа) и достаём обратно в
   restoreMedia() при старте. Любая ошибка (нет IndexedDB в приватном окне,
   переполнена квота и т.п.) не должна ронять монтаж — тайминги и так уже
   в localStorage, теряется только сам файл; поэтому все функции тут ловят
   исключения сами и никогда не бросают наружу.                            */
const IDB_NAME = 'mockup-studio', IDB_VERSION = 1, IDB_STORE = 'media';
let idbDB = null, idbWarned = false;

function idbWarn(err) {
  console.warn('IndexedDB недоступен, файл не сохранён в браузере:', err);
  if (idbWarned) return;
  idbWarned = true;   // тост — не чаще раза за сессию, дальше молча деградируем
  toast('Не удалось сохранить файл в браузере — после перезагрузки его придётся добавить снова');
}

function idbOpen() {
  if (idbDB) return Promise.resolve(idbDB);
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) { reject(new Error('indexedDB недоступен')); return; }
    let req;
    try { req = indexedDB.open(IDB_NAME, IDB_VERSION); } catch (err) { reject(err); return; }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE, { keyPath: 'src' });
    };
    req.onsuccess = () => { idbDB = req.result; resolve(idbDB); };
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('indexedDB заблокирован другой вкладкой'));
  });
}
/* rec: {src, name, type, blob} для файла с диска, {src, name, url} для
   loadVideoUrl (там своего File нет — есть только чужой url).             */
function idbPut(rec) {
  return idbOpen().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(rec);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  })).catch(idbWarn);
}
function idbGet(src) {
  return idbOpen().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).get(src);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  })).catch(err => { idbWarn(err); return null; });
}
function idbDelete(src) {
  return idbOpen().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).delete(src);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  })).catch(idbWarn);
}
function idbKeys() {
  return idbOpen().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).getAllKeys();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  })).catch(err => { idbWarn(err); return []; });
}
function idbClear() {
  return idbOpen().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  })).catch(idbWarn);
}

/* Слушатель 'seeked' вешается на <video> один раз, сразу при создании
   элемента (и тут, и в loadVideoUrl) — досылает отложенную «последний
   позвал — тот и победил» перемотку из syncMedia, когда предыдущий seek()
   гарантированно завершился (см. p.pendingSeek там же).                   */
function attachSeekLatch(id, v) {
  v.addEventListener('seeked', () => {
    // split() отдаёт обе половины на одну pool-запись под разными id
    // (mediaPool[rightId] = mediaPool[m.id], см. splitMediaAt) — если id,
    // на который замкнулся этот листенер, потом вычищается из пула
    // (удалили эту половину, а снимок с её id вытеснился из истории —
    // gcPool), запись всё ещё жива под другим ключом. Без запасного поиска
    // по ссылке на само видео латч тут молча зависал бы навсегда (см.
    // находку) — pendingSeek выставлен на тот же объект, просто по id его
    // больше не найти.
    const p = mediaPool[id] || Object.values(mediaPool).find(x => x.video === v);
    if (!p || p.pendingSeek == null) return;
    const want = p.pendingSeek;
    p.pendingSeek = null;
    if (Math.abs(v.currentTime - want) > 0.04) {
      try { v.currentTime = want; stats.seeks++; } catch (_) {}
    }
  });
}

/* Общий конструктор pool-записи — единая точка, которой пользуются и
   addVideoFile/addImageFile при первом добавлении файла, и restoreMedia()
   при восстановлении после перезагрузки (см. A.3/B.2 в брифе), чтобы не
   держать логику «дождаться loadedmetadata/onload и собрать {kind,...}» в
   двух местах. ownsUrl — можно ли револьвить url при неудаче/выгрузке: true
   для blob-URL, которые создали мы сами (свежий файл или File из
   IndexedDB), false для чужого url (loadVideoUrl — путь вроде /demo.mp4,
   revokeObjectURL по нему не делаем, как и раньше). seekId — id, на который
   вешается attachSeekLatch для видео; неважно, какой именно из клипов,
   которые в итоге будут ссылаться на эту запись, — латч всё равно найдёт её
   и по ссылке на <video>, если понадобится (см. attachSeekLatch). Резолвит
   null, если файл не читается — тост об этом решает вызывающий, тут разный
   текст на разные случаи (добавили файл / не нашли при восстановлении).   */
function makePool(kind, url, name, ownsUrl, seekId) {
  return new Promise(resolve => {
    const fail = () => {
      if (ownsUrl) { try { URL.revokeObjectURL(url); } catch (_) {} }
      resolve(null);
    };
    if (kind === 'image') {
      const img = new Image();
      img.onerror = fail;
      img.onload = () => {
        if (!img.naturalWidth || !img.naturalHeight) return fail();
        // Выгрузка (gcPool/clearVideo) освобождает фото через img.src = '' —
        // это штатно бьёт по 'error', и если onerror всё ещё висит, следом за
        // успешным удалением вылезал бы ложный тост да ещё и повторный
        // revokeObjectURL уже освобождённого blob-URL (см. находку). Дальше
        // error у этого <img> может быть только от такой выгрузки, не от
        // чтения файла — снимаем обработчик, как только файл прочитан.
        img.onerror = null;
        resolve({ kind: 'image', img, url: ownsUrl ? url : null, name, natDur: Infinity, w: img.naturalWidth, h: img.naturalHeight, ready: true });
      };
      img.src = url;
    } else {
      const v = document.createElement('video');
      v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url;
      if (seekId != null) attachSeekLatch(seekId, v);
      v.addEventListener('error', fail, { once: true });
      v.addEventListener('loadedmetadata', () => {
        const nat = isFinite(v.duration) && v.duration > 0 ? v.duration : 0;
        if (!nat) return fail();
        resolve({ kind: 'video', video: v, url: ownsUrl ? url : null, name, natDur: nat, w: v.videoWidth, h: v.videoHeight, ready: true });
      }, { once: true });
    }
  });
}

/* Каждое видео живёт в своём <video>. Клипы кладём встык в конец дорожки,
   чтобы добавление нескольких файлов сразу давало смонтированный ряд. id —
   он же srcId пул-записи и src клипа (см. makePool/store выше) — сам файл
   уходит в IndexedDB, чтобы после перезагрузки его нашла restoreMedia().  */
function addVideoFile(file, atEnd) {
  if (!file) return Promise.resolve(null);
  const id = newMediaId();
  const url = URL.createObjectURL(file);
  return makePool('video', url, file.name, true, id).then(entry => {
    if (!entry) {
      toast(`Не читается: ${file.name} — попробуй mp4/H.264 или webm`);
      return null;
    }
    entry.srcId = id;
    mediaPool[id] = entry;
    S.media.push({ id, name: file.name, t0: Math.round(atEnd * 100) / 100, dur: Math.round(entry.natDur * 100) / 100, inPoint: 0, src: id });
    hasVideo = true;
    idbPut({ src: id, name: file.name, type: file.type, blob: file });
    return id;
  });
}

/* Фото живёт как <img> на blob-URL — своя запись в пуле с kind:'image' и
   natDur:Infinity (стоп-кадра как понятия для фото нет, см. holdHead/
   holdTail), клип по умолчанию 3 с и дальше тянется на любую длину так же,
   как видео тянется за исходник (правая ручка ничем не ограничена — см.
   D.4 в pointermove выше, там граница берётся из соседей/D, а не из natDur). */
function addImageFile(file, atEnd) {
  if (!file) return Promise.resolve(null);
  const id = newMediaId();
  const url = URL.createObjectURL(file);
  return makePool('image', url, file.name, true).then(entry => {
    if (!entry) {
      toast(`Не читается: ${file.name} — попробуй jpg/png/webp`);
      return null;
    }
    entry.srcId = id;
    mediaPool[id] = entry;
    S.media.push({ id, name: file.name, t0: Math.round(atEnd * 100) / 100, dur: 3, inPoint: 0, src: id });
    hasVideo = true;
    idbPut({ src: id, name: file.name, type: file.type, blob: file });
    return id;
  });
}

async function addVideoFiles(files) {
  const list = [...files].filter(f => f.type.startsWith('video/') || f.type.startsWith('image/'));
  if (!list.length) return;
  const preSnap = snap();     // снимок до добавления — чтобы undo убрал добавленное целиком
  const wasEmpty = !S.media.length;
  let at = mediaDur();
  let added = 0;
  for (const f of list) {
    const id = f.type.startsWith('image/') ? await addImageFile(f, at) : await addVideoFile(f, at);
    if (id) { at = mediaDur(); added++; }
  }
  if (!added) return;
  pushHist(preSnap);
  S.selMedia = S.media[S.media.length - 1].id;
  // Первое медиа на пустой дорожке — масштаб таймлайна ещё не подобран под
  // реальную длину (или это вообще самый первый рендер), поэтому подгоняем
  // его сразу; дальше зум трогают только явные действия (см. A.5 в брифе).
  if (wasEmpty || !S.tl.pps) fitZoom();
  updateVideoMeta();
  renderTimeline();
  scheduleStrip();
  if (added === list.length) toast(added > 1 ? `Добавлено: ${added}` : 'Добавлено');
  save();
}

function loadVideoUrl(url) {
  const id = newMediaId();
  const preSnap = snap();     // снимок до добавления — чтобы undo убрал добавленное целиком
  const wasEmpty = !S.media.length;
  // url чужой (например /demo.mp4 из query ?video=) — не наш blob, ownsUrl:false
  // (как и раньше, revokeObjectURL по нему не делаем, см. makePool). В
  // IndexedDB кладём саму url-ссылку, а не файл — restoreMedia() её же и
  // подставит обратно (см. A.1/A.3 в брифе).
  makePool('video', url, url, false, id).then(entry => {
    if (!entry) return;
    pushHist(preSnap);
    entry.srcId = id;
    mediaPool[id] = entry;
    S.media.push({ id, name: url, t0: mediaDur(), dur: Math.round(entry.natDur * 100) / 100, inPoint: 0, src: id });
    hasVideo = true;
    S.selMedia = id;
    idbPut({ src: id, name: url, url });
    if (wasEmpty || !S.tl.pps) fitZoom();
    updateVideoMeta(); renderTimeline(); scheduleStrip(); setPlaying(true);
  });
}

/* ================================================= undo/redo ============ */
/* Снимок держит то, что реально правится монтажом: три дорожки, переходы,
   что сейчас выбрано, и клок — иначе после undo плейхед остаётся там, где
   его застала операция, а не там, где он был до неё (см. B.1 в брифе).
   Постановка и длительность тоже входят в снимок: применение ролика
   должно отменяться вместе с его светом и камерой.                                             */
const hist = { undo: [], redo: [] };
function snap() {
  return JSON.stringify({
    media: S.media, clips: S.clips, scenes: S.scenes, trans: S.trans,
    selMedia: S.selMedia, sel: S.sel, selScene: S.selScene, selTrans: S.selTrans,
    clock, direction: { pose: S.pose, poseId: S.poseId, scene: S.scene, bg: S.bg, glare: S.glare, vignette: S.vignette, exportDuration: S.exp.dur },
  });
}
function updateHistButtons() {
  $('#btnUndo').disabled = !hist.undo.length;
  $('#btnRedo').disabled = !hist.redo.length;
}
function pushHist(s = snap()) {
  hist.undo.push(s);
  if (hist.undo.length > 60) hist.undo.shift();
  hist.redo = [];
  updateHistButtons();
}
function applySnap(s) {
  const o = JSON.parse(s);
  S.media = o.media; S.clips = o.clips; S.scenes = o.scenes; S.trans = o.trans || [];
  S.selMedia = o.selMedia; S.sel = o.sel; S.selScene = o.selScene; S.selTrans = o.selTrans || null;
  if (o.direction) {
    const d = o.direction;
    Object.assign(S.pose, d.pose); S.poseId = d.poseId;
    Object.assign(S.scene, d.scene); Object.assign(S.bg, d.bg); Object.assign(S.glare, d.glare);
    S.vignette = d.vignette; S.exp.dur = d.exportDuration;
  }
  if (isFinite(o.clock)) clock = o.clock;
  if (o.direction) syncDirectionUI();
}
function undo() {
  if (!hist.undo.length) return;
  hist.redo.push(snap());
  applySnap(hist.undo.pop());
  clock = clamp(clock, 0, sceneDuration());
  syncMedia(clock, playing);
  renderTimeline(); updateVideoMeta(); updateFocusMeta(); updateSceneMeta(); scheduleStrip(); save(); gcPool();
  updateHistButtons();
  updatePlayhead();
  toast('Отменено');
}
function redo() {
  if (!hist.redo.length) return;
  hist.undo.push(snap());
  applySnap(hist.redo.pop());
  clock = clamp(clock, 0, sceneDuration());
  syncMedia(clock, playing);
  renderTimeline(); updateVideoMeta(); updateFocusMeta(); updateSceneMeta(); scheduleStrip(); save(); gcPool();
  updateHistButtons();
  updatePlayhead();
  toast('Повторено');
}

/* Уборка пула видео. Живой считается pool-запись, на которую ссылается id
   либо из S.media (дорожка сейчас), либо из любого снимка в hist.undo/redo:
   после deleteMedia сам клип пропадает из S.media, но его pushHist-снимок
   «до удаления» держит id живым — поэтому undo возвращает играющий клип, а
   не пустую запись, и <video>/blob-URL для него не выгружаются заранее.
   После split два id могут указывать на один и тот же объект {video,url,…}
   — сравниваем по ссылке на объект, а не по id, чтобы не выгрузить видео,
   которое всё ещё нужно другой половине клипа. Та же логика живости — для
   src в IndexedDB (см. A.1 в брифе): пока хоть один живой id (в S.media или
   в истории) ссылается на этот src, файл в базе не трогаем.               */
function gcPool() {
  const liveIds = new Set(S.media.map(m => m.id));
  const liveSrcs = new Set(S.media.map(m => m.src).filter(Boolean));
  for (const s of [...hist.undo, ...hist.redo]) {
    try {
      const o = JSON.parse(s);
      if (Array.isArray(o.media)) for (const m of o.media) {
        liveIds.add(m.id);
        if (m.src) liveSrcs.add(m.src);
      }
    } catch (_) {}
  }
  const liveObjs = new Set();
  for (const id of liveIds) if (mediaPool[id]) liveObjs.add(mediaPool[id]);
  for (const id of Object.keys(mediaPool)) {
    if (liveIds.has(id)) continue;
    const p = mediaPool[id];
    if (!liveObjs.has(p)) {
      try {
        if (p.video) {
          p.video.pause();
          if (p.srcNode) { try { p.srcNode.disconnect(); } catch (_) {} }
          p.video.removeAttribute('src');
          p.video.load();
        } else if (p.img) {
          p.img.src = '';
        }
        if (p.url) URL.revokeObjectURL(p.url);
      } catch (_) {}
      if (p.srcId && !liveSrcs.has(p.srcId)) idbDelete(p.srcId);
    }
    delete mediaPool[id];
  }
  hasVideo = S.media.some(m => mediaPool[m.id]);
}

/* ================================================= разделение и обрезка = */

/* Клип, над которым сейчас стоит плейхед — с отступом 0.15с от его краёв:
   слишком близко к краю резать/делить бессмысленно (получился бы огрызок). */
function clipUnderPlayhead(t = clock) {
  return sortedMedia().find(x => t >= x.t0 + 0.15 && t <= mediaEnd(x) - 0.15) || null;
}

function splitMediaAt(t = clock) {
  const list = sortedMedia();
  const m = clipUnderPlayhead(t);
  if (!m) {
    const inside = list.some(x => t >= x.t0 && t <= mediaEnd(x));
    toast(inside ? 'Слишком близко к краю клипа' : 'Поставь плейхед внутрь видео');
    return;
  }
  pushHist();
  const oldEnd = mediaEnd(m);
  const rightId = newMediaId();
  const right = {
    id: rightId, name: m.name,
    t0: Math.round(t * 100) / 100,
    dur: Math.round((oldEnd - t) * 100) / 100,
    inPoint: Math.round(((m.inPoint || 0) + (t - m.t0)) * 100) / 100,
    src: m.src,   // тот же файл, что у левой половины — см. mediaPool[rightId] ниже
  };
  m.dur = Math.round((t - m.t0) * 100) / 100;
  S.media.splice(S.media.indexOf(m) + 1, 0, right);
  /* Разделение делит одну pool-запись на двоих: mediaPool[rightId] — та же
     ссылка на объект {video,url,...}, что и у левой половины (m.id), один
     <video> и один blob на обе половины. Это безопасно, потому что клок —
     ведущий и в любой момент времени активен максимум один клип (mediaAt),
     а на стыке половин левая заканчивается ровно там, где начинается правая
     (inPoint у правой продолжает inPoint левой без разрыва) — поэтому
     syncMedia не перематывает video при переходе через границу раздела.   */
  mediaPool[rightId] = mediaPool[m.id];
  // 'out' (затемнение у конца m) уезжает вместе с концом — теперь это правая
  // половина; 'in' (у начала m) остаётся на месте — начало не сдвинулось.
  for (const tr of S.trans) if (tr.clip === m.id && tr.edge === 'out') tr.clip = rightId;
  S.selMedia = rightId;
  S.selTrans = null;
  // Клок не трогаем — split режет ровно по плейхеду, ему двигаться некуда
  // (см. B.1 в брифе). Клэмп/синк/апдейт всё равно проговариваем явно —
  // так же, как в trim/delete — чтобы кадр под плейхедом не разошёлся с DOM.
  clock = clamp(clock, 0, sceneDuration());
  syncMedia(clock, playing);
  updateVideoMeta(); renderTimeline(); scheduleStrip(); save();
  updatePlayhead();
  toast('Разделено');
}

/* 'head' — отрезать всё до плейхеда (клип остаётся на месте, обрезается
   содержимое слева через inPoint); 'tail' — отрезать всё после плейхеда.
   В обоих случаях клипы правее подтягиваются влево на вырезанную длину. */
function trimToPlayhead(side) {
  const t = clock;
  const list = sortedMedia();
  const m = clipUnderPlayhead(t);
  if (!m) {
    const inside = list.some(x => t >= x.t0 && t <= mediaEnd(x));
    toast(inside ? 'Слишком близко к краю клипа' : 'Поставь плейхед внутрь видео');
    return;
  }
  pushHist();
  const oldEnd = mediaEnd(m);
  let cut;
  if (side === 'head') {
    cut = t - m.t0;
    m.inPoint = Math.round(((m.inPoint || 0) + cut) * 100) / 100;
    m.dur = Math.round((m.dur - cut) * 100) / 100;
  } else {
    cut = oldEnd - t;
    m.dur = Math.round((t - m.t0) * 100) / 100;
  }
  for (const other of S.media) {
    if (other !== m && other.t0 >= oldEnd - 1e-3) other.t0 = Math.round((other.t0 - cut) * 100) / 100;
  }
  S.selMedia = m.id;
  S.selTrans = null;
  // 'head': кадр, что был под плейхедом, теперь оказывается в самом начале
  // клипа (t0 у m не сдвигается, см. комментарий выше про inPoint) — значит
  // и клок ставим на t0, чтобы дальше показывался тот же кадр, а не другой
  // (см. B.1 в брифе). 'tail': плейхед и так уже на новом конце — не трогаем.
  if (side === 'head') clock = m.t0;
  clock = clamp(clock, 0, sceneDuration());
  syncMedia(clock, playing);
  updateVideoMeta(); renderTimeline(); scheduleStrip(); save();
  updatePlayhead();
  toast(side === 'head' ? 'Обрезано до плейхеда' : 'Обрезано после плейхеда');
}

/* Блок сцены, что сейчас выбран и стоит под плейхедом — с тем же отступом
   0.15 с от краёв, что и у клипов (см. clipUnderPlayhead): резать/делить
   у самого края означало бы оставить огрызок в доли секунды.              */
function sceneUnderPlayhead(t = clock) {
  const b = getScene(S.selScene);
  if (!b) return null;
  return (t >= b.t0 + 0.15 && t <= sceneEnd(b) - 0.15) ? b : null;
}

/* Разрезать выбранный план по плейхеду на два блока. Оба продолжают играть
   ОДИН и тот же исходный сценарий (b.sc не меняется) — просто каждый теперь
   отвечает только за свою долю [s0,s1]. f — то же самое u, что считает
   sceneAt для точки t внутри блока, поэтому отображение t→local до и после
   разреза совпадает: план распался на два куска без скачка позы.          */
function splitSceneAt(t = clock) {
  const b = getScene(S.selScene);
  if (!b) return;
  pushHist();
  const t0 = b.t0, dur = b.dur, end = sceneEnd(b);
  const f = clamp((t - t0) / Math.max(0.1, dur), 0, 1);
  const s0 = sceneS0(b), s1 = sceneS1(b);
  const mid = Math.round((s0 + f * (s1 - s0)) * 1e4) / 1e4;
  // Копия остальных полей блока (transition, from/to у 'custom' и т.п.) —
  // кроме id/t0/dur/s0/s1, которые правая половина получает свои.
  const right = { ...b, id: newSceneId(),
    t0: Math.round(t * 100) / 100, dur: Math.round((end - t) * 100) / 100,
    s0: mid, s1 };
  // Новый внутренний стык не должен ничего менять визуально: если раньше
  // тут не было затемнения — не появится и после разреза, даже если стыки
  // сцен сейчас выставлены на «с затемнением» (см. находку). Внешние
  // границы блока трогать незачем — они хранятся в самом b и остаются как
  // были: у b (левая половина) — тот же b.transition, что и до разреза, у
  // правой границы (после right) ничего не появилось.
  right.transition = 'cut';
  if (b.sc === 'custom') {
    // from/to у 'custom' — объекты, а не примитивы: без глубокой копии обе
    // половины держат ОДИН и тот же объект, и правка позы одной половины
    // молча меняет другую (см. находку). arcDur замораживает длину дуги
    // ДО этого (первого) разреза — используется только в подписях
    // (sceneTotalDur); сама поза (customPose/sceneAt) по-прежнему считается
    // через b.dur, его не трогаем.
    right.from = { ...b.from };
    right.to = { ...b.to };
    right.arcDur = b.arcDur = Number.isFinite(b.arcDur) ? b.arcDur : dur;
  }
  b.dur = Math.round((t - t0) * 100) / 100;
  b.s0 = s0; b.s1 = mid;
  S.scenes.splice(S.scenes.indexOf(b) + 1, 0, right);
  S.selScene = right.id;
  renderTimeline(); save();
  toast('План разделён');
}

/* Обрезать выбранный план по плейхеду — без ripple: сцены оверлей по
   времени, соседние блоки на дорожке не двигаются, и плейхед остаётся на
   месте. 'head' режет начало (t0 сдвигается к плейхеду, s0 растёт до точки
   среза), 'tail' — конец (s1 падает до точки среза, dur укорачивается).
   Отрезанная доля нигде не хранится — вернуть её можно только через undo,
   план заново от начала до конца после этого не проигрывается (см. бриф). */
function trimSceneToPlayhead(side) {
  const b = getScene(S.selScene);
  if (!b) return;
  const t = clock;
  pushHist();
  const t0 = b.t0, dur = b.dur, end = sceneEnd(b);
  const f = clamp((t - t0) / Math.max(0.1, dur), 0, 1);
  const s0 = sceneS0(b), s1 = sceneS1(b);
  const mid = Math.round((s0 + f * (s1 - s0)) * 1e4) / 1e4;
  // У «Своего кадра» длина дуги — это dur целого плана; после обрезки она
  // нужна подписям и темпу, поэтому замораживаем её так же, как в split.
  if (b.sc === 'custom') b.arcDur = Number.isFinite(b.arcDur) ? b.arcDur : dur;
  if (side === 'head') {
    b.s0 = mid; b.s1 = s1;
    b.t0 = Math.round(t * 100) / 100;
    b.dur = Math.round((end - t) * 100) / 100;
  } else {
    b.s0 = s0; b.s1 = mid;
    b.dur = Math.round((t - t0) * 100) / 100;
  }
  renderTimeline(); save();
  toast(side === 'head' ? 'План обрезан до плейхеда' : 'План обрезан после плейхеда');
}

/* Диспетчеры для клавиш s/q/w и кнопок ✂/⇤/⇥: если под плейхедом стоит
   выбранный план — режем план, иначе — как раньше, клип на видеодорожке. */
/* Плейхед внутри ВЫБРАННОГО плана, но ближе 0.15 с к его краю: молча уйти
   на видеодорожку нельзя — пользователь выбрал план и нажал «Разделить». */
function sceneEdgeBlocked() {
  const b = getScene(S.selScene);
  return !!b && clock > b.t0 && clock < sceneEnd(b) && !sceneUnderPlayhead();
}
function splitAtPlayhead() {
  if (sceneEdgeBlocked()) { toast('Слишком близко к краю плана'); return; }
  return sceneUnderPlayhead() ? splitSceneAt() : splitMediaAt();
}
function trimAtPlayhead(side) {
  if (sceneEdgeBlocked()) { toast('Слишком близко к краю плана'); return; }
  return sceneUnderPlayhead() ? trimSceneToPlayhead(side) : trimToPlayhead(side);
}

/* Удаление с подтяжкой (ripple) — только видеодорожка: клипы правее места
   удаления сдвигаются влево на длину убранного куска. Наезды и сцены не
   трогаем — они, как оверлеи в CapCut, привязаны к времени ролика, а не
   к соседнему клипу, и сдвигать их при монтаже видео было бы неожиданно. */
function deleteMedia(id) {
  const i = S.media.findIndex(m => m.id === id);
  if (i < 0) return;
  pushHist();
  const m = S.media[i];
  const name = m.name, t0 = m.t0, end = mediaEnd(m), dur = m.dur;
  const isPhoto = mediaKind(m) === 'image';   // для тоста ниже — берём до gcPool(), пока запись точно жива
  S.media.splice(i, 1);
  // Было ли вообще что подтягивать? Если удалённый клип был последним, ripple
  // никого не двигает — тогда плейхед, стоявший на его конце или дальше,
  // трогать незачем (там и так уже ничего нет, до и после удаления).
  const hadFollowing = S.media.some(other => other.t0 >= end - 1e-3);
  for (const other of S.media) {
    if (other.t0 >= end - 1e-3) other.t0 = Math.round((other.t0 - dur) * 100) / 100;
  }
  S.trans = S.trans.filter(tr => tr.clip !== id);   // удаление клипа убирает все его переходы
  if (S.selMedia === id) S.selMedia = null;
  gcPool();
  // Ripple сдвигает всё, что было правее удалённого куска, — плейхед должен
  // поехать вместе с содержимым, которое теперь под ним, иначе он «прыгнет»
  // на другой кадр без видимой причины (см. B.1 в брифе):
  //  - плейхед был правее удалённого клипа, и что-то реально подтянулось →
  //    едет вместе с этим содержимым (та же секунда того же ролика);
  //  - плейхед был правее, но дальше и так было пусто (клип последний) →
  //    двигать некуда и незачем, оставляем как есть;
  //  - плейхед стоял внутри удалённого клипа → показывать больше нечего,
  //    ставим на его бывшее начало (там теперь то, что раньше шло следом);
  //  - плейхед был левее — его вообще не касается.
  if (clock >= end - 1e-6) { if (hadFollowing) clock -= dur; }
  else if (clock >= t0) clock = t0;
  clock = clamp(clock, 0, sceneDuration());
  syncMedia(clock, playing);
  updateVideoMeta(); renderTimeline(); scheduleStrip(); save();
  updatePlayhead();
  toast(`${isPhoto ? 'Фото' : 'Видео'} убрано: ${name.length > 22 ? name.slice(0, 22) + '…' : name}`);
}

function clearVideo() {
  if (!S.media.length) { toast('Видео и фото нет'); return; }
  setPlaying(false);
  hist.undo = []; hist.redo = [];   // не отменяется — история чистится вместе с пулом
  updateHistButtons();
  for (const id of Object.keys(mediaPool)) {
    const p = mediaPool[id];
    try {
      if (p.video) {
        p.video.pause();
        if (p.srcNode) { try { p.srcNode.disconnect(); } catch (_) {} }
        p.video.removeAttribute('src');
        p.video.load();
      } else if (p.img) {
        p.img.src = '';
      }
      if (p.url) URL.revokeObjectURL(p.url);
    } catch (_) {}
    delete mediaPool[id];
  }
  S.media = []; S.trans = [];
  S.selMedia = null; S.selTrans = null;
  hasVideo = false;
  idbClear();   // сами файлы тоже стёрты — держать их в IndexedDB дальше незачем (см. A в брифе)
  fitZoom();   // видео пропало — масштаб таймлайна должен снова влезать в оставшийся контент
  updateVideoMeta(); renderTimeline(); scheduleStrip(); save();
  seekTo(0);
  $('#tlwrap').scrollLeft = 0;
  toast('Все видео и фото убраны');
}

function selectMedia(id) {
  S.selMedia = id;
  S.selTrans = null;
  trPopPreSnap = null;   // снимаем выбор перехода в обход selectTrans() — снимок протяжки #trPopRange тоже надо сбросить (см. находку)
  [...$('#trkVideo').querySelectorAll('.clip')].forEach(el => el.classList.toggle('sel', el.dataset.id === id));
  [...$('#trkVideo').querySelectorAll('.tr')].forEach(el => el.classList.remove('sel'));
  updateVideoMeta(); save();
}

/* Подпись вида перехода для панели — «на стыке» (крестфейд между двумя
   клипами), «в начале»/«в конце» (уход в чёрное внутрь одного клипа, когда
   соседа нет) — см. C.7 в брифе.                                          */
function transKindLabel(tr) {
  const a = getMedia(tr.clip);
  if (!a) return '';
  if (tr.edge === 'out') return isStitch(a) ? 'на стыке' : 'в конце';
  return 'в начале';
}

/* Ползунок, чьё СОБСТВЕННОЕ событие 'input' сейчас обрабатывается — тот
   выставляет этот флаг на себя перед вызовом syncTransDurUI() и снимает
   сразу после (см. оба addEventListener('input', ...) ниже). Раньше вместо
   этого проверяли document.activeElement !== range, но фокус — не то же
   самое, что «активная протяжка именно сейчас»: после программного undo()
   фокус мог остаться на #trPopRange, хотя никакого 'input' от него не
   было, и проверка ошибочно пропускала запись настоящего значения —
   ползунок расходился с подписью (см. находку). */
let syncingRangeSelf = null;

/* Короткая форма длительности перехода — «0.5», «1.05», «3»: без хвостовых
   нулей и без точки, если дробной части не осталось (см. B в брифе). Шаг
   ползунков — 0.05, поэтому двух знаков после запятой достаточно с запасом. */
function fmtDur(v) { return (+v).toFixed(2).replace(/\.?0+$/, ''); }

/* Единая точка, которая обновляет ВСЁ, что показывает tr.dur, кроме самого
   маркера на дорожке (тот уже обновлён внутри setTransDur → layoutJunctions):
   подпись и ползунок в левой панели (если панель сейчас в режиме перехода) и
   во всплывающей панели над маркером (#trPop) — чтобы протяжка ручки,
   клавиши ,/. и любой из двух ползунков не расходились между собой. Ползунок,
   который сейчас реально тянет пользователь (syncingRangeSelf), не трогаем —
   иначе `input` от setTransDur() дёргал бы его же собственный ползунок под курсором.*/
function syncTransDurUI(tr) {
  const label = $('#transDurLabel');
  if (label) label.textContent = fmtDur(tr.dur);
  const range = $('#transDurRange');
  if (range && range !== syncingRangeSelf) range.value = tr.dur;
  const popVal = $('#trPopVal');
  if (popVal) popVal.textContent = fmtDur(tr.dur) + ' с';
  const popRange = $('#trPopRange');
  if (popRange && popRange !== syncingRangeSelf) popRange.value = tr.dur;
}

/* Снимок истории для протяжки #trPopRange — на уровне модуля, а не внутри
   buildUI(), потому что сбрасывать его должен ещё и selectTrans() при любой
   смене/снятии выбора перехода. Без этого прерванная без 'change' протяжка
   (потеря фокуса, Escape) оставляла тут снимок с самого начала протяжки, и
   следующая ЗАВЕРШЁННАЯ протяжка того же (или другого) перехода клала в
   историю этот устаревший снимок вместо своего собственного — один undo
   откатывал сразу несколько правок (см. находку).                        */
let trPopPreSnap = null;

/* Всплывающая панель длительности перехода прямо над маркером (см. B в
   брифе) — левую панель со ползунком «1 · Видео» надо сначала найти и
   прокрутить до неё, а маркер обычно уже перед глазами. Внутрь самой
   дорожки её не поместить: у .trk overflow:hidden, у #tlwrap —
   overflow-x:auto, поэтому #trPop — fixed-элемент в body, а не потомок
   маркера, и координаты считаются заново при каждом вызове.
   Дёргается из layoutJunctions (маркер сдвинулся — драг/зум/скролл клипов)
   и updateVideoMeta (сменился выбор — undo/redo/deleteTransition/clearVideo
   тоже проходят через неё), плюс из scroll/resize таймлайна отдельно. */
function layoutTrPop() {
  const pop = $('#trPop');
  const tr = getTrans(S.selTrans);
  const marker = tr ? $('#trkVideo .tr.sel') : null;
  const wrap = $('#tlwrap');
  let visible = false, rect = null;
  if (tr && marker && marker.dataset.id === tr.id) {
    rect = marker.getBoundingClientRect();
    const wr = wrap.getBoundingClientRect();
    visible = rect.width > 0 && rect.right > wr.left && rect.left < wr.right;
  }
  if (!visible) { pop.hidden = true; return; }
  pop.hidden = false;
  syncTransDurUI(tr);
  const pw = pop.offsetWidth, ph = pop.offsetHeight;
  const left = clamp(rect.left + rect.width / 2 - pw / 2, 8, innerWidth - pw - 8);
  let top = rect.top - ph - 8, flip = false;
  if (top < 4) { top = rect.bottom + 8; flip = true; }
  pop.style.left = left + 'px';
  pop.style.top = top + 'px';
  pop.classList.toggle('flip', flip);
}

function updateVideoMeta() {
  const el = $('#videoMeta');
  $('#btnClearVideo').disabled = !S.media.length;
  $('#btnTrans').disabled = !S.media.length;

  const tr = getTrans(S.selTrans);
  layoutTrPop();
  if (tr) {
    // Панель не перестраиваем на каждый 'input' — иначе ползунок пересоздаётся
    // прямо под курсором во время протяжки. Обновляем только текст подписи.
    el.innerHTML = `Переход · ${transKindLabel(tr)} · <span id="transDurLabel">${fmtDur(tr.dur)}</span> с` +
      `<div class="row" style="margin-top:6px"><input type="range" id="transDurRange" min="0.1" max="3" step="0.05" value="${tr.dur}"></div>` +
      `<button class="ghost" id="btnTransDelete" style="margin-top:6px">Удалить переход</button>`;
    const range = $('#transDurRange');
    const label = $('#transDurLabel');
    const preSnap = snap();   // состояние до перетаскивания ползунка — снимок сделаем один раз
    range.addEventListener('input', () => {
      syncingRangeSelf = range;
      setTransDur(tr.id, +range.value); label.textContent = fmtDur(tr.dur); syncTransDurUI(tr);
      syncingRangeSelf = null;
    });
    range.addEventListener('change', () => {
      if (snap() !== preSnap) pushHist(preSnap);
      setTransDur(tr.id, +range.value);
      label.textContent = fmtDur(tr.dur);
      syncTransDurUI(tr);
    });
    $('#btnTransDelete').addEventListener('click', () => deleteTransition(tr.id));
    return;
  }

  if (!S.media.length) { el.textContent = 'Видео и фото нет — показан демо-экран. Можно выбрать сразу несколько файлов.'; return; }
  const cur = getMedia(S.selMedia) || sortedMedia()[0];
  const p = mediaPool[cur.id];
  const isPhoto = mediaKind(cur) === 'image';
  // Стоп-кадр: если клип растянут за исходник хоть с одной стороны — отдельная
  // строка в панели, называет только реально присутствующие края (см. D в брифе).
  // У фото holdHead/holdTail всегда 0 (см. определение) — строка сама не появится.
  const hh = holdHead(cur), ht = holdTail(cur);
  const holdBits = [];
  if (hh > 0.005) holdBits.push(`в начале ${fmtDur(hh)} с`);
  if (ht > 0.005) holdBits.push(`в конце ${fmtDur(ht)} с`);
  const holdLine = holdBits.length ? `<br><span style="color:#8b93a7">Стоп-кадр: ${holdBits.join(', ')}</span>` : '';
  el.innerHTML = `<b style="color:#c6ccdc">${cur.name}</b><br>` +
    (isPhoto ? 'Фото · ' : '') +
    (p ? `${p.w}×${p.h} · ` : '') + `${cur.t0.toFixed(1)}–${mediaEnd(cur).toFixed(1)} с` +
    (S.media.length > 1 ? `<br><span style="color:#8b93a7">Всего роликов: ${S.media.length}, общая длина ${mediaDur().toFixed(1)} с</span>` : '') +
    holdLine +
    `<div class="row" style="margin-top:8px;gap:6px">` +
    `<button class="ghost" id="btnClipSplit" title="S — разделить по плейхеду">✂ Разделить по плейхеду</button>` +
    `<button class="ghost" id="btnClipDelete">Удалить клип</button>` +
    `</div>`;
  $('#btnClipSplit').addEventListener('click', () => splitMediaAt());
  $('#btnClipDelete').addEventListener('click', () => deleteMedia(cur.id));
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
// Всё, что уронили в окно — видео и/или фото, — идёт на дорожку через
// addVideoFiles (сама фильтрует и роутит по типу — см. её определение).
// Раньше единственная картинка без единого видео уходила в фон сцены
// (старое поведение «перетащи фон сюда») — с тех пор, как фото научились
// класть на дорожку, эта ветка только путала (см. C в брифе): фото на
// дорожке теперь предсказуемо всегда фото на дорожке. Фон по-прежнему
// загружается только явно, через выбор файла #fileBg в панели «6 · Фон» —
// этот дроп его не трогает.
window.addEventListener('drop', e => {
  const files = [...(e.dataTransfer.files || [])];
  if (!files.length) return;
  addVideoFiles(files);
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
  const target = beginPoseEdit();
  canvas.classList.add('drag');
  drag = { x: e.clientX, y: e.clientY, target, px: target.x, py: target.y, rx: target.rx, ry: target.ry, shift: e.shiftKey };
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
    drag.target.ry = clamp(drag.ry + dx * 140, -55, 55);
    drag.target.rx = clamp(drag.rx - dy * 140, -55, 55);
    S.poseId = '';
    syncPoseUI();
  } else {
    drag.target.x = clamp(drag.px + dx, -0.6, 0.6);
    drag.target.y = clamp(drag.py + dy, -0.6, 0.6);
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
  const target = beginPoseEdit();
  target.scale = clamp(target.scale * (1 - e.deltaY * 0.0015), 0.25, 2.2);
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
  if (!v) syncPoseUI();
}

function seekTo(t) {
  clock = clamp(t, 0, sceneDuration());
  syncMedia(clock, playing);
  syncPoseUI();
}

$('#btnPlay').addEventListener('click', () => setPlaying(!playing));
// «В начало» — единственное место, где seekTo(0) ещё и возвращает прокрутку
// таймлайна к нулю (см. A.4 в брифе); во всех остальных случаях scrollLeft
// трогает только автослежение во время playing/recording внутри updatePlayhead().
$('#btnStart').addEventListener('click', () => { seekTo(0); $('#tlwrap').scrollLeft = 0; updatePlayhead(); });

window.addEventListener('keydown', e => {
  const tag = (e.target.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
  if (e.code === 'Escape' && selecting) { endSelect(); return; }
  // Приоритет у обводки участка (проверка выше); Escape для перехода — только
  // когда обводки нет (см. B.4 в брифе).
  if (e.code === 'Escape' && S.selTrans) { e.preventDefault(); selectTrans(null); return; }
  if (e.code === 'Space') { e.preventDefault(); setPlaying(!playing); }
  const mod = e.metaKey || e.ctrlKey;
  if (mod && (e.key === 'z' || e.key === 'Z' || e.key === 'я')) {
    e.preventDefault();
    if (e.shiftKey) redo(); else undo();
    return;
  }
  if (mod && (e.key === 'y' || e.key === 'Y' || e.key === 'н')) { e.preventDefault(); redo(); return; }
  if (!mod && !e.altKey) {
    if (e.key === 's' || e.key === 'ы') { e.preventDefault(); splitAtPlayhead(); return; }
    if (e.key === 'q' || e.key === 'й') { e.preventDefault(); trimAtPlayhead('head'); return; }
    if (e.key === 'w' || e.key === 'ц') { e.preventDefault(); trimAtPlayhead('tail'); return; }
    if (e.key === 't' || e.key === 'е') { e.preventDefault(); addTransitionAtPlayhead(); return; }
    if (e.key === '-' || e.key === '_') { e.preventDefault(); setZoom(S.tl.pps / 1.25, clock); return; }
    if (e.key === '=' || e.key === '+') { e.preventDefault(); setZoom(S.tl.pps * 1.25, clock); return; }
    if (e.key === '0') { e.preventDefault(); fitZoom(); return; }
    // Длительность выбранного перехода: , / б — короче, . / ю — длиннее
    // (см. D в брифе); каждое нажатие — свой шаг истории. Снимок берём ДО
    // setTransDur и кладём в историю только если что-то реально изменилось
    // (тот же приём, что у ползунков, snap()!==preSnap) — иначе повтор на
    // границе клампа (0.1 или maxTransDur) плодил пустые шаги в hist.undo.
    if (S.selTrans && (e.key === ',' || e.key === 'б')) {
      const tr = getTrans(S.selTrans);
      if (tr) {
        e.preventDefault();
        const s = snap();
        setTransDur(tr.id, tr.dur - 0.1);
        if (snap() !== s) pushHist(s);
        syncTransDurUI(tr);
      }
      return;
    }
    if (S.selTrans && (e.key === '.' || e.key === 'ю')) {
      const tr = getTrans(S.selTrans);
      if (tr) {
        e.preventDefault();
        const s = snap();
        setTransDur(tr.id, tr.dur + 0.1);
        if (snap() !== s) pushHist(s);
        syncTransDurUI(tr);
      }
      return;
    }
  }
  if (e.key === 'r' || e.key === 'к') resetPose();
  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (S.sel) { e.preventDefault(); deleteClip(S.sel); }
    else if (S.selScene) { e.preventDefault(); deleteScene(S.selScene); }
    else if (S.selTrans) { e.preventDefault(); deleteTransition(S.selTrans); }
    else if (S.selMedia) { e.preventDefault(); deleteMedia(S.selMedia); }
  }
});

/* ================================================= таймлайн ============ */
/* Масштаб полосы фиксирован в пикселях на секунду (S.tl.pps), а не растянут
   на всю ширину #tlwrap — иначе любая обрезка меняла масштаб ВСЕЙ полосы, и
   плейхед «прыгал» при неизменном clock (жалоба из брифа, раздел A). tlDur()
   пересчитан в «сколько секунд условно занимает вся ширина #tlcontent» —
   tToPct/xToT/layoutMedia/layoutScene/layoutClip/freeSlot/snapT продолжают работать без переписывания,
   потому что явно завязаны только на tlDur(), а не на sceneDuration().     */

const trackEl = () => $('#trkZoom');

/* Видимая ширина #tlwrap без его собственных левых/правых паддингов —
   именно столько пикселей контента реально помещается в один экран. */
function tlViewW() {
  const wrap = $('#tlwrap');
  const cs = getComputedStyle(wrap);
  const pl = parseFloat(cs.paddingLeft) || 0, pr = parseFloat(cs.paddingRight) || 0;
  return Math.max(50, wrap.clientWidth - pl - pr);
}

/* Ширина #tlcontent в px: контент плюс запас справа (tailSec), чтобы при
   укорачивании ролика (trim/delete) ширина не схлопывалась резко и
   scrollLeft не сбрасывался куда-то в середину видимой области.          */
function contentW() {
  const pps = S.tl.pps || 1;
  const viewW = tlViewW();
  const tailSec = Math.max(2, 0.25 * viewW / pps);
  return Math.max(viewW, (sceneDuration() + tailSec) * pps);
}

const tlDur  = () => contentW() / (S.tl.pps || 1);
const tToPct = t => clamp(t / tlDur(), 0, 1) * 100;

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

/* Прилипание при перетаскивании: тянемся к плейхеду, к краям холста и к
   границам чужих клипов на всех трёх дорожках — порог в 6 экранных px,
   переведённых в секунды через текущую ширину дорожки.                    */
function snapT(t, excludeId) {
  const D = tlDur();
  const w = trackEl().getBoundingClientRect().width || 1;
  const thresh = 6 / w * D;
  const cands = [clock, 0, D];
  for (const m of S.media)  if (m.id !== excludeId) cands.push(m.t0, mediaEnd(m));
  for (const c of S.clips)  if (c.id !== excludeId) cands.push(c.t0, clipEnd(c));
  for (const b of S.scenes) if (b.id !== excludeId) cands.push(b.t0, sceneEnd(b));
  let best = t, bestD = thresh;
  for (const cand of cands) {
    const d = Math.abs(cand - t);
    if (d < bestD) { bestD = d; best = cand; }
  }
  return best;
}

/* --------------------------------------------- зум и прокрутка (раздел A) */

/* Минимальный масштаб — весь ролик влезает в экран целиком (плюс запас 2с),
   максимальный — 400 px/с. Используется и как нижняя граница setZoom(), и
   как проверка в layoutTimeline() на случай, если pps ещё не инициализирован. */
function ppsFitMin() { return tlViewW() / Math.max(3, sceneDuration() + 2); }

/* Меняет масштаб, сохраняя экранную позицию времени anchorT (по умолчанию —
   плейхед): секунда под курсором/плейхедом остаётся под тем же пикселем.   */
function setZoom(pps, anchorT) {
  const wrap = $('#tlwrap');
  const t = anchorT === undefined ? clock : anchorT;
  const oldPps = S.tl.pps || ppsFitMin() || 1;
  const anchorScreenX = t * oldPps - wrap.scrollLeft;
  S.tl.pps = clamp(pps, Math.max(1, ppsFitMin()), 400);
  layoutTimeline();
  scheduleStrip();   // кадры пока растянуты CSS-ом — перерисовать под новую ширину (с дебаунсом)
  wrap.scrollLeft = clamp(t * S.tl.pps - anchorScreenX, 0, Math.max(0, contentW() - tlViewW()));
  save();
}

/* «По размеру» — весь ролик виден целиком, без горизонтальной прокрутки.
   Только эта функция и явный вызов кнопкой/при первом видео/при очистке
   меняют масштаб сами по себе — монтажные операции (split/trim/delete/drag)
   его никогда не трогают, см. раздел A.5 в брифе.
   pps=(viewW-8)/(sceneDuration()*1.04) в лоб не годится: contentW() поверх
   sceneDuration() всегда добавляет свой хвост tailSec (не меньше 2с, см.
   contentW() выше), а этот хвост от выбранного pps и сам зависит — поэтому
   решаем численно (бисекция по contentW(pps) <= viewW), иначе после fitZoom
   полоса прокрутки всё равно остаётся (см. AC-Z2 в брифе).                */
function fitZoom() {
  // В фоновой вкладке ширины ещё нет (clientWidth 0, tlViewW() отдаёт
  // заглушку 50) — масштаб от неё был бы мусорным и, что хуже, сохранился бы.
  // Оставляем pps=0: layoutTimeline() подберёт его сам при resize/появлении
  // вкладки (см. проверку clientWidth > 120 там).
  if ($('#tlwrap').clientWidth <= 120) { S.tl.pps = 0; return; }
  const wrap = $('#tlwrap');
  // contentW() сам содержит max(viewW, …) — раз он никогда не бывает МЕНЬШЕ
  // viewW, целиться нужно ровно в viewW (+0.5 запаса на плавающую точку), а
  // не в viewW-N: такая цель недостижима в принципе, из-за чего бисекция
  // схлопывалась к нижней границе (pps=1) вместо реального решения.
  const target = tlViewW() + 0.5;
  let lo = 1, hi = 400;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    S.tl.pps = mid;
    if (contentW() <= target) lo = mid; else hi = mid;
  }
  S.tl.pps = clamp(lo, 1, 400);
  layoutTimeline();
  scheduleStrip();
  wrap.scrollLeft = 0;
  save();
}

/* Шаг линейки — первый из фиксированного набора, у которого расстояние между
   соседними метками на экране не меньше 64px (см. A.8 в брифе).           */
const RULER_STEPS = [0.1, 0.2, 0.5, 1, 2, 5, 10, 30, 60];
function rulerStep(pps) {
  for (const s of RULER_STEPS) if (s * pps >= 64) return s;
  return RULER_STEPS[RULER_STEPS.length - 1];
}
function rulerLabel(t, step) {
  if (t < 60) return (step < 1 ? t.toFixed(1) : t.toFixed(0)) + 'с';
  const mm = Math.floor(t / 60 + 1e-9), ss = Math.round(t - mm * 60);
  return mm + ':' + String(ss).padStart(2, '0');
}

/* Подписи дорожек живут в #tlgutter — вне скроллящегося #tlwrap (см. A.3) —
   поэтому им нужны только вертикальные офсеты, посчитанные от реальных
   прямоугольников дорожек; сам #tlgutter садится поверх верхнего левого угла
   #tlwrap так же через getBoundingClientRect, независимо от разметки.     */
function syncGutter() {
  const wrap = $('#tlwrap'), gutter = $('#tlgutter');
  gutter.style.left = wrap.offsetLeft + 'px';
  gutter.style.top = wrap.offsetTop + 'px';
  const wrapRect = wrap.getBoundingClientRect();
  // #tlgutter в CSS без своей высоты — все дети position:absolute, в
  // авто-высоту родителя не идут, и без явного height ниже она схлопнулась
  // бы в 0: тогда bottom у лейблов мерил бы от той же точки, что и top
  // (низ нулевой рамки совпадает с её верхом), и лейблы легли бы на верх
  // дорожки, а не на низ (см. A.5 в брифе).
  gutter.style.height = wrapRect.height + 'px';
  for (const lbl of gutter.querySelectorAll('.trklabel')) {
    const trk = document.getElementById(lbl.dataset.for);
    if (!trk) continue;
    const r = trk.getBoundingClientRect();
    // Раньше подпись сидела у верхнего края дорожки (top:4px) — в узкой
    // видеодорожке она заезжала в полоску переходов (см. A.5 в брифе).
    // Теперь bottom:4px от нижнего края дорожки: #vEnd не трогаем — его
    // подпись («конец видео») своя, живёт внутри #trkVideo (см. style.css).
    lbl.style.bottom = (wrapRect.bottom - r.bottom + 4) + 'px';
  }
}

/* Единственное место, которое кладёт пиксельные позиции на дорожку. Не
   пересоздаёт DOM (см. A.6 в брифе) — только считает размеры и переносит уже
   существующие элементы; renderTimeline() зовёт её в конце после того, как
   сама пересобрала список DOM-узлов.                                      */
function layoutTimeline() {
  // Масштаб подбираем только по настоящей ширине: у фоновой вкладки при
  // старте она нулевая, и от заглушки tlViewW()=50 получался pps≈4 — полоса
  // «на три минуты» под 10-секундный ролик, причём навсегда, S сохраняется.
  // Пока ширины нет, pps остаётся 0, а при resize/появлении вкладки
  // layoutTimeline() вызовется снова.
  if (!S.tl.pps && $('#tlwrap').clientWidth > 120)
    S.tl.pps = clamp((tlViewW() - 8) / Math.max(3, sceneDuration() * 1.04), 4, 400);

  const D = tlDur();
  $('#tlcontent').style.width = contentW() + 'px';

  // линейка
  const ruler = $('#tlruler');
  ruler.innerHTML = '';
  const step = rulerStep(S.tl.pps);
  for (let i = 0; step * i <= D + 1e-6; i++) {
    const t = Math.round(i * step * 1000) / 1000;
    const el = document.createElement('i');
    el.style.left = tToPct(t) + '%';
    el.textContent = rulerLabel(t, step);
    ruler.appendChild(el);
  }

  for (const m of S.media) layoutMedia(m);
  for (const b of S.scenes) layoutScene(b);
  for (const c of S.clips) layoutClip(c);
  layoutJunctions();

  // конец видео
  const md = mediaDur();
  const vEnd = $('#vEnd');
  if (md > 0 && md < D - 0.05) { vEnd.hidden = false; vEnd.style.left = tToPct(md) + '%'; }
  else vEnd.hidden = true;

  $('#tDur').textContent = sceneDuration().toFixed(1);
  syncGutter();
  updatePlayhead();
}

window.addEventListener('resize', () => layoutTimeline());
document.addEventListener('visibilitychange', () => { if (!document.hidden) layoutTimeline(); });

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
  if (!slot) { toast('Здесь уже стоит другой блок — поставь плейхед в свободное место'); return; }
  pushHist();
  const prev = S.clips[S.clips.length - 1];
  // Предыдущий клип мог оказаться масштабом — у него нет u0..v1, поэтому
  // сид для новой области берём только у соседа того же вида ('region').
  const prevRegion = prev && clipKind(prev) === 'region' ? prev : null;
  const c = {
    id: newClipId(), kind: 'region', t0: slot.t0, dur: slot.dur, ramp: 0.9, fill: 0.82,
    u0: prevRegion ? prevRegion.u0 : 0.15, v0: prevRegion ? prevRegion.v0 : 0.22,
    u1: prevRegion ? prevRegion.u1 : 0.85, v1: prevRegion ? prevRegion.v1 : 0.58,
  };
  S.clips.push(c);
  S.sel = c.id;
  renderTimeline(); updateFocusMeta(); save();
  startSelect(c.id);
}

/* «+ Масштаб» — тот же блок на той же дорожке, но без обводки области:
   телефон целиком плавно увеличивается и уменьшается обратно (см. draw()). */
function addScaleClip() {
  const slot = freeSlot(clock, 2.6);
  if (!slot) { toast('Здесь уже стоит другой блок — поставь плейхед в свободное место'); return; }
  pushHist();
  const c = { id: newClipId(), kind: 'scale', t0: slot.t0, dur: slot.dur, ramp: 0.9, k: 1.4, ax: 0, ay: 0 };
  S.clips.push(c);
  S.sel = c.id;
  renderTimeline(); updateFocusMeta(); save();
  toast('Масштаб добавлен');
}

function deleteClip(id) {
  const i = S.clips.findIndex(c => c.id === id);
  if (i < 0) return;
  const wasScale = clipKind(S.clips[i]) === 'scale';   // тост зависит от вида блока (см. E.1 в брифе)
  pushHist();
  S.clips.splice(i, 1);
  if (S.sel === id) S.sel = null;
  if (selecting === id) endSelect();
  renderTimeline(); updateFocusMeta(); save();
  toast(wasScale ? 'Масштаб удалён' : 'Наезд удалён');
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
  pushHist();
  const b = { id: newSceneId(), sc: scId, t0: Math.round(slot.t0 * 100) / 100, dur: Math.round(slot.dur * 100) / 100 };
  S.scenes.push(b);
  S.selScene = b.id;
  renderTimeline(); save();
  return b;
}

function addCustomScene(duration = 3) {
  const dur = clamp(Number(duration) || 3, .3, 120);
  const t0 = Math.round(Math.max(clock, 0, ...S.scenes.map(sceneEnd)) * 100) / 100;
  const pose = composedPose(t0);
  pushHist();
  const b = { id: newSceneId(), sc: 'custom', t0, dur,
    from: { ...pose }, to: { ...pose }, transition: 'cut' };
  S.scenes.push(b);
  S.selScene = b.id;
  // Пользователь явно продлевает ролик: экспорт должен включать новый кадр.
  if (S.exp.dur > 0) S.exp.dur = Math.max(S.exp.dur, sceneEnd(b));
  setPlaying(false);
  seekTo(sceneEnd(b));
  syncPoseUI();
  if ($('#expDur')._sync) $('#expDur')._sync();
  fitZoom(); renderTimeline(); save();
  toast('Свой кадр добавлен. Задай конечную позу мышью или в разделе «Положение».');
  return b;
}

/* Ролик: очищает дорожку и раскладывает сцены встык, начиная с нуля. */
function applyReel(reel) {
  pushHist();
  S.scenes.length = 0;
  let t = 0;
  for (const [scId, dur, transition = 'cut'] of reel.seq) {
    S.scenes.push({ id: newSceneId(), sc: scId, t0: Math.round(t * 100) / 100, dur, transition });
    t += dur;
  }
  S.selScene = S.scenes[0] ? S.scenes[0].id : null;
  if (S.scene.artDirection) {
    const look = REEL_LOOKS[reel.look];
    Object.assign(S.pose, { x: 0, y: 0, scale: 1, rx: 0, ry: 0, rz: 0, persp: 2600 });
    S.poseId = 'flat';
    Object.assign(S.scene, { amount: 1, idle: 0, ease: 1, transition: 'cut' });
    Object.assign(S.bg, look.bg);
    Object.assign(S.glare, { on: true, amt: look.glare });
    S.vignette = look.vignette;
    syncDirectionUI();
  }
  // Сценарий управляет камерой, а не обрезает исходное видео.
  S.exp.dur = 0;
  if ($('#expDur')._sync) $('#expDur')._sync();
  seekTo(0);
  renderTimeline(); save();
  toast(`Ролик «${reel.name}»: ${S.scenes.length} сцен, ${t.toFixed(0)} с`);
}

function deleteScene(id) {
  const i = S.scenes.findIndex(b => b.id === id);
  if (i < 0) return;
  pushHist();
  S.scenes.splice(i, 1);
  if (S.selScene === id) S.selScene = null;
  renderTimeline(); save();
  toast('Сцена удалена');
}

function selectScene(id) {
  S.selScene = id;
  const b = getScene(id);
  if (b && b.sc === 'custom') { setPlaying(false); seekTo(sceneEnd(b)); }
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

/* ---------------------------------------------------------- переходы --- */

function selectTrans(id) {
  trPopPreSnap = null;   // сменился/снялся выбор — незавершённая протяжка #trPopRange больше не в счёт
  S.selTrans = id;
  S.selMedia = null;
  [...$('#trkVideo').querySelectorAll('.clip')].forEach(el => el.classList.remove('sel'));
  [...$('#trkVideo').querySelectorAll('.tr')].forEach(el => el.classList.toggle('sel', el.dataset.id === id));
  updateVideoMeta();
  save();
}

/* Максимум длительности затемнения для края clipId/edge — общая для
   addTransitionAt() (дефолт при создании) и setTransDur() (протяжка
   ползунком), чтобы они не расходились: без этого клип короче дефолтных
   0.5с получал переход длиннее себя самого при создании, и затемнение
   выплёскивалось в соседний клип, пока пользователь не трогал ползунок
   (см. finding #4). На стыке — не больше короткого из двух склеиваемых
   клипов; у одиночного края ('in'/'out' без соседа) — не больше длины
   самого клипа (см. C.5 в брифе).                                        */
function maxTransDur(clipId, edge) {
  const a = getMedia(clipId);
  let maxDur = 3.0;
  if (a) {
    maxDur = Math.min(maxDur, a.dur);
    if (edge === 'out' && isStitch(a)) {
      const next = nextMediaOf(a);
      if (next) maxDur = Math.min(maxDur, next.dur);
    }
  }
  return maxDur;
}

/* Какие ручки показывать на маркере перехода (см. A.1 в брифе): 'in' —
   маркер прижат к началу клипа, тянуть можно только вправо; одиночный
   'out' (соседа нет) — маркер у конца клипа, тянуть можно только влево;
   стык ('out' + isStitch) — маркер сидит на границе, обе стороны свободны. */
function transHandleSides(tr) {
  if (tr.edge === 'in') return { l: false, r: true };
  const a = getMedia(tr.clip);
  if (a && isStitch(a)) return { l: true, r: true };
  return { l: true, r: false };
}

/* Низкоуровневый конструктор — ставит переход на конкретный край конкретного
   клипа. Используется и стыковыми кнопками «+» (edge:'out' у левого клипа),
   и addTransitionAtPlayhead() ниже. Если такой переход уже есть — просто
   выбирает его, без второго одинакового перехода на одном крае.           */
function addTransitionAt(clipId, edge, dur = 0.5) {
  const exists = transOnEdge(clipId, edge);
  if (exists) { selectTrans(exists.id); return exists; }
  if (!getMedia(clipId)) return null;
  pushHist();
  const maxDur = maxTransDur(clipId, edge);
  const clampedDur = Math.round(clamp(dur, 0.2, Math.max(0.2, maxDur)) * 100) / 100;
  const tr = { id: newTransId(), clip: clipId, edge, dur: clampedDur };
  S.trans.push(tr);
  S.selTrans = tr.id;
  S.selMedia = null;
  trPopPreSnap = null;   // выбор перехода сменился в обход selectTrans() — снимок протяжки старого #trPopRange больше не в счёт (см. находку)
  renderTimeline(); updateVideoMeta(); save();
  toast('Переход добавлен');
  return tr;
}

/* Ближайший край (начало или конец) любого клипа к моменту t, в пределах
   `within` секунд — для addTransitionAtPlayhead(), когда плейхед стоит не
   строго внутри клипа, а рядом с его границей.                            */
function nearestClipEdge(t, within) {
  let best = null;
  for (const m of S.media) {
    const dStart = Math.abs(t - m.t0), dEnd = Math.abs(t - mediaEnd(m));
    if (dStart <= within && (!best || dStart < best.dist)) best = { clip: m, edge: 'in', dist: dStart };
    if (dEnd <= within && (!best || dEnd < best.dist)) best = { clip: m, edge: 'out', dist: dEnd };
  }
  return best;
}

/* Кнопка «◆ Переход» / хоткей T — явный способ поставить затемнение, раз уж
   пользователи не находят кружки «+» на стыках (см. C.2 в брифе). Берёт клип
   под плейхедом (ближайший из его двух краёв) или ближайший край в пределах
   секунды; начало клипа, вплотную к которому слева стоит другой, превращается
   в 'out' у соседа — это тот же стык, что рисует кнопка «+» на границе.    */
function addTransitionAtPlayhead() {
  const t = clock;
  let target = null;
  const under = clipUnderPlayhead(t);
  if (under) {
    const dStart = Math.abs(t - under.t0), dEnd = Math.abs(t - mediaEnd(under));
    target = { clip: under, edge: dStart <= dEnd ? 'in' : 'out' };
  } else {
    const near = nearestClipEdge(t, 1);
    if (!near) { toast('Поставь плейхед рядом с краем клипа'); return; }
    target = { clip: near.clip, edge: near.edge };
  }
  if (target.edge === 'in') {
    const list = sortedMedia();
    const idx = list.findIndex(x => x.id === target.clip.id);
    const prev = idx > 0 ? list[idx - 1] : null;
    if (prev && Math.abs(target.clip.t0 - mediaEnd(prev)) < 0.05) target = { clip: prev, edge: 'out' };
  }
  const exists = transOnEdge(target.clip.id, target.edge);
  if (exists) { selectTrans(exists.id); toast('Переход уже есть — выбран'); return; }
  addTransitionAt(target.clip.id, target.edge);
}

function deleteTransition(id) {
  const i = S.trans.findIndex(t => t.id === id);
  if (i < 0) return;
  pushHist();
  S.trans.splice(i, 1);
  if (S.selTrans === id) S.selTrans = null;
  renderTimeline(); updateVideoMeta(); save();
  toast('Переход удалён');
}

/* Длительность затемнения не может быть больше того, что в клипе (клипах)
   реально есть: на стыке — не больше короткого из двух склеиваемых клипов;
   у одиночного края ('in'/'out' без соседа) — не больше длины самого клипа
   (см. C.5 в брифе).                                                      */
function setTransDur(id, dur) {
  const tr = getTrans(id);
  if (!tr) return;
  const maxDur = maxTransDur(tr.clip, tr.edge);
  tr.dur = Math.round(clamp(dur, 0.1, Math.max(0.1, maxDur)) * 100) / 100;
  // Панель #videoMeta тут намеренно не перестраиваем: это дёргает ползунок
  // прямо во время протяжки (input срабатывает на каждый шаг) — обновляем
  // только маркер на дорожке и подпись значения, см. вызов в updateVideoMeta.
  layoutJunctions();
  save();
}

/* --- перетаскивание и растягивание --- */
let clipDrag = null;

function onClipDown(e, id, mode) {
  e.stopPropagation();
  e.preventDefault();
  const c = dragTarget(id);
  if (!c) return;
  if (isSceneId(id)) selectScene(id);
  else if (isMediaId(id)) {
    // Если у ЭТОГО клипа уже выбран его собственный переход (маркер .sel,
    // открыт #trPop) — обычный selectMedia() тут же обнулил бы S.selTrans и
    // прятал поповер ещё на pointerdown, до первого движения мыши, хотя
    // маркер и так честно едет вместе с клипом на каждом кадре драга
    // (layoutJunctions вызывается из обработчика ниже) — см. находку, AC-D5.
    // Оставляем выбор перехода как есть; клик по любому другому клипу (или
    // без выбранного своего перехода) работает как раньше.
    const curTr = getTrans(S.selTrans);
    if (!(curTr && curTr.clip === id)) selectMedia(id);
  }
  else selectClip(id);
  clipDrag = { id, mode, t: xToTraw(e.clientX), t0: c.t0, dur: c.dur, inPoint: c.inPoint || 0, snap: snap() };
  // При обрезке видео замораживаем плёнку в исходных px — иначе кадры растягиваются
  // вместе с div, а должны обрезаться (см. D.4 в брифе).
  if (isMediaId(id) && mode !== 'move') {
    const clipEl = e.target.closest('.clip');
    const th = clipEl ? clipEl.querySelector('canvas.thumbs') : null;
    if (th) { clipDrag.thumbsEl = th; clipDrag.thumbsW = th.getBoundingClientRect().width; }
  }
  // Перестановка перетаскиванием (дорожка видео, режим 'move'): вместо
  // клампа по соседям запоминаем раскладку слотов на старте драга — order
  // (id по t0) и gaps (промежутки между соседями, они не меняются свопом,
  // меняются только его "жильцы"), idx — место перетаскиваемого клипа в
  // order, home — слот, куда он встанет, если его отпустить прямо сейчас.
  // См. pointermove ниже и README.
  if (isMediaId(id) && mode === 'move') {
    const order = sortedMedia().map(m => m.id);
    const gaps = [];
    for (let i = 0; i < order.length - 1; i++) {
      gaps.push(getMedia(order[i + 1]).t0 - mediaEnd(getMedia(order[i])));
    }
    clipDrag.order = order;
    clipDrag.gaps = gaps;
    clipDrag.idx = order.indexOf(id);
    clipDrag.idx0 = clipDrag.idx;         // стартовый слот — чтобы на pointerup отличить
                                           // реальный своп от драга без перестановки (см. ниже)
    clipDrag.home = c.t0;
    const el = e.target.closest('.clip.media');
    if (el) el.classList.add('dragging');
  }
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
  const snapOn = !e.altKey;

  if (clipDrag.mode === 'move' && isMediaId(clipDrag.id)) {
    // Перестановка (см. onClipDown выше и README): клип свободно едет за
    // курсором — clamp по соседям тут больше не делаем, вместо него ниже
    // свопаем его с соседом, когда середина одного проходит середину
    // другого. Снизу всё равно ограничиваем нулём — влезть в отрицательное
    // время нельзя, а вправо клип может временно уйти за соседа/за край
    // (это нормально, см. .dragging и "может временно перекрывать" в
    // брифе) — фактическое место внутри слота дожимается на pointerup.
    const rawT0 = clipDrag.t0 + d;
    let cur = rawT0;
    if (snapOn) {
      const s0 = snapT(rawT0, c.id);
      if (s0 !== rawT0) cur = s0;
      else {
        const rawEnd = rawT0 + clipDrag.dur;
        const sEnd = snapT(rawEnd, c.id);
        if (sEnd !== rawEnd) cur = sEnd - clipDrag.dur;
      }
    }
    // centerD — от «сырого» cur, ДО пола в 0: иначе центр клипа длиннее
    // первого соседа физически не может опуститься ниже c.dur/2 и никогда
    // не пересечёт центр слота 0, сколько его ни тащи влево (см. находку).
    // На саму позицию клипа (c.t0 = cur ниже) пол по-прежнему действует.
    const centerD = cur + c.dur / 2;
    cur = Math.max(0, cur);
    const order = clipDrag.order, gaps = clipDrag.gaps;
    // Вправо: пока следующий в order-слоте сосед N существует и середина
    // перетаскиваемого клипа перескочила его середину — меняем местами.
    // Промежуток gap (тот, что был между слотами) сохраняется — двигается
    // только "жилец" каждого слота, поэтому клипы за пределами пары не
    // трогаются (см. D.2 в брифе). Цикл while — можно перепрыгнуть сразу
    // нескольких соседей за одно движение мыши.
    while (clipDrag.idx < order.length - 1) {
      const N = getMedia(order[clipDrag.idx + 1]);
      if (!N || centerD <= N.t0 + N.dur / 2) break;
      const gap = gaps[clipDrag.idx];
      N.t0 = Math.round(clipDrag.home * 100) / 100;
      clipDrag.home = Math.round((N.t0 + N.dur + gap) * 100) / 100;
      order[clipDrag.idx] = N.id; order[clipDrag.idx + 1] = c.id;
      clipDrag.idx++;
      layoutMedia(N);
    }
    // Влево — симметрично: сосед P занимает слот сразу после нового
    // положения перетаскиваемого клипа, с тем же промежутком gap.
    while (clipDrag.idx > 0) {
      const P = getMedia(order[clipDrag.idx - 1]);
      // Нестрогая граница (с эпсилоном, не строгое >=): иначе своп не
      // срабатывает на точном тай-брейке центров — например, когда
      // перетаскиваемый клип и сосед слева одной длины (см. находку, AC-O4).
      if (!P || centerD - (P.t0 + P.dur / 2) > 1e-6) break;
      const gap = gaps[clipDrag.idx - 1];
      clipDrag.home = Math.round(P.t0 * 100) / 100;
      P.t0 = Math.round((clipDrag.home + c.dur + gap) * 100) / 100;
      order[clipDrag.idx - 1] = c.id; order[clipDrag.idx] = P.id;
      clipDrag.idx--;
      layoutMedia(P);
    }
    c.t0 = cur;
  } else if (clipDrag.mode === 'move') {
    const rawT0 = clipDrag.t0 + d;
    let newT0 = rawT0;
    if (snapOn) {
      const s0 = snapT(rawT0, c.id);
      if (s0 !== rawT0) newT0 = s0;
      else {
        const rawEnd = rawT0 + clipDrag.dur;
        const sEnd = snapT(rawEnd, c.id);
        if (sEnd !== rawEnd) newT0 = sEnd - clipDrag.dur;
      }
    }
    c.t0 = clamp(newT0, loBound, hiBound - c.dur);
  } else if (clipDrag.mode === 'l') {
    const end = clipDrag.t0 + clipDrag.dur;
    const rawT0 = clipDrag.t0 + d;
    const newT0 = snapOn ? snapT(rawT0, c.id) : rawT0;
    c.t0 = clamp(newT0, loBound, end - 0.3);
    c.dur = end - c.t0;
    if (isMediaId(clipDrag.id)) {                 // тянем начало = двигаем точку входа
      const p = mediaPool[c.id];
      const inp = (clipDrag.inPoint || 0) + (c.t0 - clipDrag.t0);
      // Нижнего клампа в 0 больше нет: inPoint может уйти в минус — это и
      // есть стоп-кадр у начала (см. holdHead). Ограничивать его отдельно
      // не нужно — насколько влево можно уехать, и так решает t0 (clamp
      // выше по loBound: сосед слева или 0), а inp — просто его производная.
      // Верхний край (natDur − 0.3) оставляем: край живого видео не должен
      // сжаться до нуля целиком в стоп-кадр только с одной стороны.
      c.inPoint = p ? Math.min(inp, Math.max(0, p.natDur - 0.3)) : 0;
    }
  } else {
    const rawEnd = clipDrag.t0 + clipDrag.dur + d;
    const newEnd = snapOn ? snapT(rawEnd, c.id) : rawEnd;
    c.dur = clamp(newEnd - c.t0, 0.3, hiBound - c.t0);
  }
  c.t0 = Math.round(c.t0 * 100) / 100;
  c.dur = Math.round(c.dur * 100) / 100;
  if (isSceneId(clipDrag.id)) { layoutScene(c); updateSceneMeta(); }
  else if (isMediaId(clipDrag.id)) {
    // Стоп-кадр: обрезка/растяжка вправо больше не зажата длиной исходника —
    // клип можно тянуть за p.natDur, тогда хвост (см. holdTail) держит
    // застывший последний кадр вместо реального видео (см. syncMedia).
    layoutMedia(c); updateVideoMeta(); layoutJunctions();
    if (clipDrag.thumbsEl) {
      clipDrag.thumbsEl.style.width = clipDrag.thumbsW + 'px';
      if (clipDrag.mode === 'l') {
        const w = trackEl().getBoundingClientRect().width || 1;
        const deltaPx = (c.t0 - clipDrag.t0) / D * w;
        clipDrag.thumbsEl.style.left = (-deltaPx) + 'px';
      }
    }
  }
  else { layoutClip(c); updateFocusMeta(); }
});

function endClipDrag() {
  if (clipDrag) {
    const wasMedia = isMediaId(clipDrag.id);
    const c = wasMedia ? getMedia(clipDrag.id) : null;
    if (wasMedia && clipDrag.mode === 'move' && c && clipDrag.order) {
      // Приземление после перестановки: клип во время драга мог временно
      // перекрывать соседей — тут его дожимаем в свободное место внутри
      // актуального слота (order/idx уже отражают все свопы этого драга),
      // а если места не хватает — прижимаем к соседу (см. D.3 в брифе).
      const order = clipDrag.order, idx = clipDrag.idx;
      const prev = idx > 0 ? getMedia(order[idx - 1]) : null;
      const next = idx < order.length - 1 ? getMedia(order[idx + 1]) : null;
      const prevEnd = prev ? mediaEnd(prev) : 0;
      // Последний слот (next нет): если в этом драге реально был своп (idx
      // сместился от стартового idx0), верхнюю границу берём из clipDrag.home
      // — он уже несёт сохранённый промежуток до места, где раньше кончался
      // контент (см. находку — было tlDur(), т.е. видимая длина ВСЕЙ
      // дорожки, а не конец контента, из-за чего верхний клам не работал и
      // клип оставался там, где его бросили, с дырой перед ним). Если свопа
      // не было (клип и так был последним/единственным) — это обычное
      // перемещение, а не перестановка: оставляем свободный ход до конца
      // дорожки, как раньше.
      const swapped = idx !== clipDrag.idx0;
      const nextStart = next ? next.t0 : (swapped ? clipDrag.home + c.dur : tlDur());
      c.t0 = clamp(c.t0, prevEnd, Math.max(prevEnd, nextStart - c.dur));
      c.t0 = Math.round(c.t0 * 100) / 100;
    }
    const changed = !!c && (c.inPoint !== clipDrag.inPoint || c.dur !== clipDrag.dur);
    if (snap() !== clipDrag.snap) pushHist(clipDrag.snap);
    clipDrag = null;
    renderTimeline();
    if (wasMedia && changed) scheduleStrip();
    save();
  }
}
// pointercancel — не только pointerup: без него отменённый жест (потеря
// capture, системный жест поверх) оставлял clipDrag висеть, а класс
// .dragging (см. onClipDown) — на элементе до следующего renderTimeline
// (см. находку).
['pointerup', 'pointercancel'].forEach(ev => window.addEventListener(ev, endClipDrag));

/* --- ручки на маркере перехода: протяжка длительности прямо на дорожке
   (см. A в брифе) --- */
let trDrag = null;

function onTransHandleDown(e, id, side) {
  e.stopPropagation();
  e.preventDefault();
  const tr = getTrans(id);
  if (!tr) return;
  selectTrans(id);
  trDrag = { id, side, x0: e.clientX, dur0: tr.dur, snap: snap() };
  try { e.target.setPointerCapture(e.pointerId); } catch (_) {}
}

window.addEventListener('pointermove', e => {
  if (!trDrag) return;
  const tr = getTrans(trDrag.id);
  if (!tr) { trDrag = null; return; }
  const pps = S.tl.pps || 1;
  const dt = (e.clientX - trDrag.x0) / pps;
  const a = getMedia(tr.clip);
  const stitch = tr.edge === 'out' && !!(a && isStitch(a));
  let dur;
  if (stitch) {
    // Маркер стыка стоит по центру границы — тянуть одну ручку двигает
    // обе половины симметрично, поэтому шаг вдвое больше сдвига мыши.
    dur = trDrag.side === 'r' ? trDrag.dur0 + 2 * dt : trDrag.dur0 - 2 * dt;
  } else if (tr.edge === 'in') {
    dur = trDrag.dur0 + dt;         // маркер прижат к началу клипа, растёт вправо
  } else {
    dur = trDrag.dur0 - dt;         // одиночный 'out' прижат к концу клипа, растёт влево
  }
  setTransDur(tr.id, dur);
  syncTransDurUI(tr);
});

function endTrDrag() {
  if (trDrag) {
    if (snap() !== trDrag.snap) pushHist(trDrag.snap);
    trDrag = null;
    save();
  }
}
// pointercancel — не только pointerup: без него отменённый жест (потеря
// capture, системный жест поверх) оставлял trDrag висеть, и следующий
// pointermove без нажатой кнопки продолжал менять длительность (см. находку).
['pointerup', 'pointercancel'].forEach(ev => window.addEventListener(ev, endTrDrag));

/* --- скраб по дорожкам --- */
let scrubbing = false;
function scrubFrom(e) { seekTo(xToT(e.clientX)); }
for (const id of ['#tlruler', '#trkVideo', '#trkScene', '#trkZoom']) {
  const el = $(id);
  el.addEventListener('pointerdown', e => {
    if (e.target.closest('.clip, .jn, .tr')) return;
    scrubbing = true; scrubFrom(e);
    try { el.setPointerCapture(e.pointerId); } catch (_) {}
    if (id === '#trkZoom') selectClip(null);
    if (id === '#trkVideo') selectMedia(null);
  });
  el.addEventListener('pointermove', e => { if (scrubbing) scrubFrom(e); });
  ['pointerup', 'pointercancel'].forEach(ev => el.addEventListener(ev, () => scrubbing = false));
}

/* Колесо на таймлайне (A.7): ⌘/Ctrl — зум вокруг курсора; обычное вертикальное
   колесо — горизонтальная прокрутка (мышь без трекпада не крутит по X сама);
   горизонтальный deltaX (трекпад) — отдаём нативной прокрутке #tlwrap.       */
$('#tlwrap').addEventListener('wheel', e => {
  const wrap = $('#tlwrap');
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault();
    const r = wrap.getBoundingClientRect();
    const anchorT = (e.clientX - r.left + wrap.scrollLeft) / (S.tl.pps || 1);
    setZoom(S.tl.pps * Math.exp(-e.deltaY * 0.0025), anchorT);
    return;
  }
  if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
    e.preventDefault();
    wrap.scrollLeft += e.deltaY;
  }
}, { passive: false });

/* --- отрисовка --- */
function layoutMedia(m) {
  const el = $('#trkVideo').querySelector(`.clip.media[data-id="${m.id}"]`);
  if (!el) return;
  const D = tlDur();
  el.style.left = tToPct(m.t0) + '%';
  el.style.width = Math.max(0.4, (m.dur / D) * 100) + '%';
  const hh = holdHead(m), ht = holdTail(m);
  // Сумма стоп-кадра в подписи — без ложного округления (fmtDur обрезает
  // лишние нули, а не toFixed(1), который "0.05" превратил бы в "0.1").
  const holdSuffix = (hh + ht) > 0.005 ? ` · стоп-кадр ${fmtDur(hh + ht)} с` : '';
  const short = m.name.length > 18 ? m.name.slice(0, 18) + '…' : m.name;
  el.querySelector('b').textContent = `${short} · ${m.dur.toFixed(1)} с${holdSuffix}`;
  el.classList.toggle('sel', m.id === S.selMedia);

  // Штриховка стоп-кадра: ширина в px = holdHead/holdTail * pps — столько
  // же пикселей на секунду, во сколько на самом деле рендерится сам клип
  // (его % ширины посчитан от tlDur()=contentW()/pps, то есть его px-ширина
  // на экране всегда равна m.dur*pps — см. D в брифе). Подпись «стоп-кадр»
  // внутри штриховки показываем, только если она реально помещается.
  const pps = S.tl.pps || 1;
  const holdL = el.querySelector('.hold.l'), holdR = el.querySelector('.hold.r');
  const wL = hh * pps, wR = ht * pps;
  holdL.style.display = wL > 0.5 ? 'block' : 'none';
  holdL.style.width = wL + 'px';
  holdL.querySelector('span').style.display = wL > 40 ? '' : 'none';
  holdR.style.display = wR > 0.5 ? 'block' : 'none';
  holdR.style.width = wR + 'px';
  holdR.querySelector('span').style.display = wR > 40 ? '' : 'none';
}

function layoutScene(b) {
  const el = $('#trkScene').querySelector(`.clip.scene[data-id="${b.id}"]`);
  if (!el) return;
  const sc = sceneDefinition(b);
  const D = tlDur();
  el.style.left = tToPct(b.t0) + '%';
  el.style.width = Math.max(0.4, (b.dur / D) * 100) + '%';
  const s0 = sceneS0(b), s1 = sceneS1(b);
  const rate = b.dur / Math.max(0.1, (s1 - s0) * sceneTotalDur(b));
  const frag = (s0 > 0 || s1 < 1) ? ' · фрагмент' : '';
  el.querySelector('b').textContent =
    `${sc.name.split(' → ')[0].split(' · ')[0]} · ${b.dur.toFixed(1)} с` + (Math.abs(rate - 1) > 0.05 ? ` (${rate.toFixed(2)}×)` : '') + frag;
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
  el.querySelector('b').textContent = clipKind(c) === 'scale'
    ? `Масштаб ×${c.k.toFixed(1)} · ${c.dur.toFixed(1)} с`
    : `Наезд ${c.dur.toFixed(1)} с`;
}

/* .clip создаёт свой стекинговый контекст (position+z-index), поэтому её
   ручки обрезки .h (z-index:2 внутри .clip) физически не могут оказаться
   выше .jn/.tr (z-index:6) через z-index — они сравниваются с соседями по
   z-index самой .clip (2, или 5 у .sel), который меньше 6 в любом случае
   (см. finding #1). Раньше это чинили запасом по X и точечными разъездами
   ручек на стыке — теперь полоска переходов и клипы разведены по высоте
   дорожки (см. #trkVideo/.clip.media/.jn/.tr в style.css): они физически
   не перекрываются, и координаты ниже можно ставить без всякого запаса.   */
const JN_RADIUS = 7;       // половина .jn (14px, border-radius:6px, style.css)
const EDGE_JN_MIN_W = 2 * JN_RADIUS + 8;   // узко — крайнюю «+» прячем, чтобы не наложилась на стыковую «+» рядом

/* Позиции «+»-кнопок и маркеров переходов — отдельно от renderTimeline(),
   чтобы во время перетаскивания клипа они ехали вместе с ним без пересборки
   всей дорожки (см. C.3 в брифе). Тоже вызывается из layoutTimeline().    */
function layoutJunctions() {
  const D = tlDur();
  const trkV = $('#trkVideo');
  const rectW = trkV.getBoundingClientRect().width || 1;
  const pps = S.tl.pps || 1;
  const list = sortedMedia();
  for (const jn of [...trkV.querySelectorAll('.jn')]) {
    if (jn.classList.contains('edge')) {
      const edgeClip = jn.dataset.role === 'start' ? list[0] : list[list.length - 1];
      if (!edgeClip) { jn.remove(); continue; }
      // Слишком узкий крайний клип — краевая «+» может наложиться на
      // стыковую «+» соседа (обе теперь в одной узкой полоске переходов) —
      // прячем; переход туда всё равно ставится клавишей T или кнопкой
      // «Переход».
      jn.style.display = edgeClip.dur * pps < EDGE_JN_MIN_W ? 'none' : '';
      // Кнопку на самом краю дорожки прижимаем внутрь на радиус: .trk режет
      // всё за своей границей (overflow:hidden), и в нуле осталась бы половина.
      const px = jn.dataset.role === 'start'
        ? Math.max(edgeClip.t0 * pps, JN_RADIUS)
        : Math.min(mediaEnd(edgeClip) * pps, rectW - JN_RADIUS);
      jn.style.left = (px / rectW * 100) + '%';
      continue;
    }
    const a = getMedia(jn.dataset.after);
    if (!a) { jn.remove(); continue; }
    jn.style.left = tToPct(mediaEnd(a)) + '%';
  }
  for (const el of [...trkV.querySelectorAll('.tr')]) {
    const tr = getTrans(el.dataset.id);
    const a = tr ? getMedia(tr.clip) : null;
    if (!tr || !a) { el.remove(); continue; }
    const wPx = Math.max(26, (tr.dur / D) * rectW);
    // Полоска переходов не делит высоту с ручками клипа (см. комментарий
    // выше), поэтому центрируем без всякого запаса: на стыке — точно на
    // границе, у одиночного края — своим краем вплотную к краю клипа.
    let centerPx;
    if (tr.edge === 'out') {
      const endPx = mediaEnd(a) * pps;
      centerPx = isStitch(a) ? endPx : endPx - wPx / 2;
    } else {
      const startPx = a.t0 * pps;
      centerPx = startPx + wPx / 2;
    }
    el.style.left = (centerPx / rectW * 100) + '%';
    el.style.width = wPx + 'px';
    el.classList.toggle('sel', tr.id === S.selTrans);
    const lbl = el.querySelector('.x');
    if (lbl) lbl.textContent = `◆ ${fmtDur(tr.dur)}с`;
    // Какая сторона стыка — может смениться на лету: перетаскивание клипа
    // способно и создать стык (соседа подтянули впритык), и разорвать его
    // (см. A.1 в брифе) — пересчитываем при каждой раскладке, не только при
    // создании маркера в renderTimeline().
    const sides = transHandleSides(tr);
    const hl = el.querySelector('.h.l'), hr = el.querySelector('.h.r');
    if (hl) hl.hidden = !sides.l;
    if (hr) hr.hidden = !sides.r;
  }
  layoutTrPop();
}

function renderTimeline() {
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

  // видео — клипы на своей дорожке, у каждого своя плёнка кадров
  const trkV = $('#trkVideo');
  [...trkV.querySelectorAll('.clip, .jn, .tr')].forEach(el => el.remove());
  let needStrip = false;
  for (const m of S.media) {
    const el = document.createElement('div');
    el.className = 'clip media' + (m.id === S.selMedia ? ' sel' : '');
    el.dataset.id = m.id;
    // .hold.l/.hold.r — застывшие края стоп-кадра (см. holdHead/holdTail),
    // рисуются поверх плёнки, но под подписью .b (z-index у неё выше) —
    // порядок в DOM важен: после thumbs (лежат над плёнкой), до b/.h/.x.
    el.innerHTML = '<canvas class="thumbs"></canvas>' +
      '<div class="hold l"><span>стоп-кадр</span></div><div class="hold r"><span>стоп-кадр</span></div>' +
      '<b></b><div class="h l"></div><div class="h r"></div><div class="x">×</div>';
    el.addEventListener('pointerdown', e => onClipDown(e, m.id, 'move'));
    el.querySelector('.h.l').addEventListener('pointerdown', e => onClipDown(e, m.id, 'l'));
    el.querySelector('.h.r').addEventListener('pointerdown', e => onClipDown(e, m.id, 'r'));
    el.querySelector('.x').addEventListener('pointerdown', e => { e.stopPropagation(); deleteMedia(m.id); });
    trkV.appendChild(el);
    layoutMedia(m);
    // если под текущий размер/обрезку уже есть готовая плёнка — рисуем сразу,
    // без ожидания buildFilmstrip (см. D.3 в брифе)
    const cached = thumbCache[m.id];
    const w = Math.max(8, el.clientWidth);
    if (cached && cached.key === thumbKey(m, w)) {
      const th = el.querySelector('canvas.thumbs');
      th.width = cached.canvas.width; th.height = cached.canvas.height;
      th.getContext('2d').drawImage(cached.canvas, 0, 0);
    } else needStrip = true;
  }

  // стыки между соседними по времени клипами: «+» там, где перехода ещё нет,
  // маркер — там, где уже есть (переход рисуется, даже если клип успел
  // отъехать и стык распался — это просто уход в чёрное на его конце).
  // Плюс отдельные кнопки-«+» в самом начале первого клипа и в самом конце
  // последнего — затемнение внутрь клипа, а не стык (см. C.3 в брифе).
  const sm = sortedMedia();
  for (let i = 0; i < sm.length - 1; i++) {
    const a = sm[i], b = sm[i + 1];
    if (Math.abs(b.t0 - mediaEnd(a)) >= 0.05) continue;
    if (transOnEdge(a.id, 'out')) continue;
    const jn = document.createElement('div');
    jn.className = 'jn';
    jn.dataset.after = a.id;
    jn.textContent = '+';
    jn.title = 'Добавить затемнение';
    jn.addEventListener('pointerdown', e => e.stopPropagation());
    jn.addEventListener('click', e => { e.stopPropagation(); addTransitionAt(a.id, 'out'); });
    trkV.appendChild(jn);
  }
  const first = sm[0], last = sm[sm.length - 1];
  if (first && !transOnEdge(first.id, 'in')) {
    const jn = document.createElement('div');
    jn.className = 'jn edge';
    jn.dataset.role = 'start';
    jn.textContent = '+';
    jn.title = 'Добавить затемнение';
    jn.addEventListener('pointerdown', e => e.stopPropagation());
    jn.addEventListener('click', e => { e.stopPropagation(); addTransitionAt(first.id, 'in'); });
    trkV.appendChild(jn);
  }
  if (last && !transOnEdge(last.id, 'out')) {
    const jn = document.createElement('div');
    jn.className = 'jn edge';
    jn.dataset.role = 'end';
    jn.textContent = '+';
    jn.title = 'Добавить затемнение';
    jn.addEventListener('pointerdown', e => e.stopPropagation());
    jn.addEventListener('click', e => { e.stopPropagation(); addTransitionAt(last.id, 'out'); });
    trkV.appendChild(jn);
  }
  for (const tr of S.trans) {
    const el = document.createElement('div');
    el.className = 'tr' + (tr.id === S.selTrans ? ' sel' : '');
    el.dataset.id = tr.id;
    el.title = 'Переход · затемнение';
    // Ручки — прямое управление длительностью прямо на маркере (см. A в
    // брифе), а не только через ползунок в левой панели, который надо
    // сперва найти. Какие из них показывать — решает layoutJunctions()
    // (там же, где известно, стык это или одиночный край, и она вызывается
    // при любом сдвиге клипов, не только при создании маркера).
    el.innerHTML = `<div class="h l"></div><div class="x">◆ ${fmtDur(tr.dur)}с</div><div class="h r"></div>`;
    el.addEventListener('pointerdown', e => { e.stopPropagation(); selectTrans(tr.id); });
    el.querySelector('.h.l').addEventListener('pointerdown', e => onTransHandleDown(e, tr.id, 'l'));
    el.querySelector('.h.r').addEventListener('pointerdown', e => onTransHandleDown(e, tr.id, 'r'));
    trkV.appendChild(el);
  }
  if (needStrip) scheduleStrip();

  // клипы
  const trk = trackEl();
  [...trk.querySelectorAll('.clip')].forEach(el => el.remove());
  for (const c of S.clips) {
    const el = document.createElement('div');
    const kind = clipKind(c);
    el.className = 'clip' + (kind === 'scale' ? ' scale' : '') + (c.id === S.sel ? ' sel' : '');
    el.dataset.id = c.id;
    el.innerHTML = '<div class="ramp l"></div><div class="ramp r"></div><b></b><div class="h l"></div><div class="h r"></div><div class="x">×</div>';
    el.addEventListener('pointerdown', e => onClipDown(e, c.id, 'move'));
    el.querySelector('.h.l').addEventListener('pointerdown', e => onClipDown(e, c.id, 'l'));
    el.querySelector('.h.r').addEventListener('pointerdown', e => onClipDown(e, c.id, 'r'));
    el.querySelector('.x').addEventListener('pointerdown', e => { e.stopPropagation(); deleteClip(c.id); });
    // У блока масштаба нет области экрана, которую можно переобвести.
    if (kind !== 'scale') el.addEventListener('dblclick', e => { e.stopPropagation(); startSelect(c.id); });
    trk.appendChild(el);
    layoutClip(c);
  }

  // Единая точка, которая знает про масштаб/прокрутку: ширина #tlcontent,
  // линейка, финальные позиции всего перечисленного выше, «конец видео»,
  // подписи в #tlgutter и плейхед (см. A.6 в брифе).
  layoutTimeline();
}

/* Кэш булева «есть клип под плейхедом» — чтобы не трогать disabled на DOM
   каждый кадр (updatePlayhead вызывается из frame() безусловно).          */
let editBtnsEnabled = null;
let lastPhLeft = null;
/* При фиксированном масштабе позиция плейхеда — просто clock*pps, без всякой
   геометрии дорожек: это и убирает «прыжки» при монтаже (раздел B в брифе) —
   пока clock не меняется, красная линия стоит на месте при любой обрезке.  */
function updatePlayhead() {
  const pps = S.tl.pps || 1;
  const x = clock * pps;
  const left = x + 'px';
  if (left !== lastPhLeft) { $('#playhead').style.left = left; lastPhLeft = left; }
  $('#tCur').textContent = clock.toFixed(1);

  // Автослежение — только во время воспроизведения/записи и только когда
  // плейхед реально вышел за видимую область (см. A.4 в брифе); во всех
  // остальных случаях (монтаж, ручная прокрутка) scrollLeft не трогаем.
  if (playing || recording) {
    const wrap = $('#tlwrap');
    const viewW = tlViewW();
    const sl = wrap.scrollLeft;
    if (x < sl + 8 || x > sl + viewW - 8) {
      wrap.scrollLeft = clamp(x - viewW * 0.2, 0, Math.max(0, contentW() - viewW));
    }
  }

  const enabled = !!(clipUnderPlayhead() || sceneUnderPlayhead());
  if (enabled !== editBtnsEnabled) {
    editBtnsEnabled = enabled;
    $('#btnSplit').disabled = !enabled;
    $('#btnTrimL').disabled = !enabled;
    $('#btnTrimR').disabled = !enabled;
  }
}

/* --- киноплёнка: кадры тянем ВТОРЫМ video, чтобы не дёргать основной ---
   У каждого клипа теперь свой <canvas class="thumbs"> внутри его же .clip
   (см. renderTimeline) — единой дорожечной полосы больше нет, поэтому кадры
   едут и обрезаются вместе с клипом сами, без ручной синхронизации.       */
const thumbCache = {};   // id клипа → {key, canvas}: canvas — офскрин-снимок последней отрисовки
// Ширину в ключе округляем до 32px-корзины — иначе плавный зум колесом (он
// меняет px-ширину клипа на каждый тик) сбрасывал бы кэш плёнки каждый кадр.
function thumbKey(m, w) { return `${(m.inPoint || 0).toFixed(2)}|${m.dur.toFixed(2)}|${Math.round(w / 32) * 32}`; }

let stripToken = 0;
async function buildFilmstrip() {
  const token = ++stripToken;
  if (!S.media.length) return;

  // Один второй-<video> на уникальный источник — после split у клипов их
  // может быть несколько с одним и тем же src, гонять по видео заново не надо.
  const fvCache = new Map();
  async function getFv(src) {
    if (fvCache.has(src)) return fvCache.get(src);
    const fv = document.createElement('video');
    fv.muted = true; fv.playsInline = true; fv.preload = 'auto'; fv.src = src;
    try { await new Promise((res, rej) => { fv.onloadeddata = res; fv.onerror = rej; setTimeout(rej, 8000); }); }
    catch (_) { return null; }
    fvCache.set(src, fv);
    return fv;
  }

  for (const m of sortedMedia()) {
    if (token !== stripToken) break;
    const p = mediaPool[m.id];
    const el = $(`#trkVideo .clip.media[data-id="${m.id}"] canvas.thumbs`);
    if (!p || !el) continue;

    const w = Math.max(8, el.clientWidth), h = Math.max(8, el.clientHeight);
    const key = thumbKey(m, w);
    if (thumbCache[m.id] && thumbCache[m.id].key === key) continue;   // уже нарисовано под этот размер/обрезку

    el.width = w * 2; el.height = h * 2;
    const g = el.getContext('2d');
    g.clearRect(0, 0, el.width, el.height);

    if (p.kind === 'image') {
      // Фото не меняется во времени — нет смысла перематывать/ждать кадры,
      // просто кладём картинку в те же n ячеек, что и у видео (тот же расчёт
      // n ниже, только без похода за отдельным <video> для плёнки).
      let thumbW = Math.round(el.height * (p.w / Math.max(1, p.h)));
      thumbW = Math.max(thumbW, Math.ceil(el.width / 12));
      const n = clamp(Math.ceil(el.width / Math.max(8, thumbW)), 1, 16);
      for (let i = 0; i < n; i++) g.drawImage(p.img, i * (el.width / n), 0, el.width / n + 1, el.height);
      if (token === stripToken && $(`#trkVideo .clip.media[data-id="${m.id}"] canvas.thumbs`) === el) {
        thumbCache[m.id] = { key, canvas: el };
      }
      continue;
    }

    const src = p.video.currentSrc || p.video.src;
    const fv = await getFv(src);
    if (!fv || token !== stripToken) continue;

    let thumbW = Math.round(el.height * (p.w / Math.max(1, p.h)));
    thumbW = Math.max(thumbW, Math.ceil(el.width / 12));
    const n = clamp(Math.ceil(el.width / Math.max(8, thumbW)), 1, 16);

    for (let i = 0; i < n; i++) {
      if (token !== stripToken) break;
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
        g.drawImage(fv, i * (el.width / n), 0, el.width / n + 1, el.height);
      } catch (_) { continue; }
      await new Promise(r => setTimeout(r, 0));
    }
    // клип мог исчезнуть/перестроиться, пока мы ждали кадры — тогда просто не кэшируем
    if (token === stripToken && $(`#trkVideo .clip.media[data-id="${m.id}"] canvas.thumbs`) === el) {
      thumbCache[m.id] = { key, canvas: el };
    }
  }
  for (const fv of fvCache.values()) { try { fv.src = ''; } catch (_) {} }
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
  // Офлайн-рендер (см. renderOffline) сам двигает clock и сам зовёт draw()
  // строго в моменты i/fps — обычный игровой цикл тут должен молчать,
  // иначе он тут же перетянет clock на реальное время и собьёт кадры.
  if (rendering) return;
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
  if (recording || starting || rendering) return;
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
        if (!p || !p.video || p.srcNode) continue;    // у фото звука нет — нечего сводить
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
  for (const id in mediaPool) { const p = mediaPool[id]; if (p.video && !p.srcNode) p.video.muted = true; }
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
$('#ovCancel').addEventListener('click', () => { if (rendering) cancelRender(); else stopRecording(); });
$('#btnPng').addEventListener('click', () => {
  canvas.toBlob(b => { download(b, `mockup-${S.cw}x${S.ch}.png`); toast('Кадр сохранён'); }, 'image/png');
});

/* ================================================= офлайн-рендер ======== */
/* Обычная запись (см. выше) держится на MediaRecorder + canvas.captureStream
   в реальном времени: поток отдаёт браузеру кадр тогда, когда тот сам решит,
   что он готов, и если однажды draw(t) не уложился в 1/fps — а на слабой
   машине с тяжёлой сценой (3D-корпус, блики, зерно) это почти гарантировано
   — кодировщик просто недополучает кадр: получается лаг/дырка в файле,
   которую постфактум не убрать.
   Здесь кадры вообще не привязаны к реальному времени: рисуем их по одному,
   строго в моменты i/fps, дожидаясь каждого столько, сколько нужно (перемотка
   видео на playhead, requestVideoFrameCallback, toBlob), и лишь потом шлём
   на локальный сервер serve.py — тот копит их в stdin ffmpeg (image2pipe),
   который уже сам собирает mp4 с ровным fps и звуковой дорожкой отдельным
   WAV, сведённым офлайн через OfflineAudioContext. Раз кадр нарисован —
   он никуда не денется; ждать в этом цикле можно сколько угодно, лагов на
   выходе просто неоткуда взяться. Кнопка «Записать» остаётся рабочей как
   запасной путь — она не зависит от локального сервера и ffmpeg.         */

let renderAvailable = false;   // ok:true и ffmpeg:true от /render/ping
let renderCancelled = false;
let renderJob = null;

async function pingRenderServer() {
  try {
    const r = await fetch('/render/ping');
    if (!r.ok) return { ok: false, ffmpeg: false };
    return await r.json();
  } catch (_) { return { ok: false, ffmpeg: false }; }
}

async function initRenderUI() {
  const info = await pingRenderServer();
  renderAvailable = !!(info && info.ok && info.ffmpeg);
  setRenderButtonsEnabled(renderAvailable);
  $('#renderHint').textContent = renderAvailable
    ? 'Кадр за кадром через локальный ffmpeg: кадры не пропадаются даже на медленной машине; звук — из видео на дорожке.'
    : 'Нужен локальный сервер (start.command / serve.py) и ffmpeg: brew install ffmpeg.';
}

function setRenderButtonsEnabled(v) {
  $('#btnRender').disabled = !v;
  $('#btnRender2').disabled = !v;
}

function cancelRender() {
  if (!rendering) return;
  renderCancelled = true;
  $('#ovSub').textContent = 'Отменяю…';
}

/* Ждём одно событие с холостым таймаутом — и на 'seeked' видео, которое от
   редких браузерных сбоев может вообще не прийти, и тогда без таймаута
   рендер завис бы навсегда на одном кадре.                                */
function waitEventOnce(el, evt, timeoutMs) {
  return new Promise(resolve => {
    let done = false;
    const fin = () => { if (done) return; done = true; el.removeEventListener(evt, on); clearTimeout(tm); resolve(); };
    const on = () => fin();
    el.addEventListener(evt, on, { once: true });
    const tm = setTimeout(fin, timeoutMs);
  });
}

/* Рисует ровно один кадр офлайн-рендера в момент t: перематывает активное
   видео на нужный local (та же арифметика стоп-кадра, что в syncMedia —
   см. её комментарий про край natDur-0.03), ждёт, пока браузер реально
   перемотает и отдаст этот кадр (событие 'seeked', затем, если браузер
   умеет, requestVideoFrameCallback — иначе draw() иногда попадал бы на
   кадр за миг ДО перемотки), и только потом рисует холст.                */
async function renderFrameAt(t) {
  clock = t;
  const a = mediaAt(t);
  if (a && a.pool.video) {
    const v = a.pool.video, p = a.pool;
    const edge = Math.max(0, p.natDur - 0.03);
    const stop = a.local < 0 || a.local >= edge;
    const want = stop ? (a.local < 0 ? 0 : edge) : clamp(a.local, 0, edge);
    if (Math.abs(v.currentTime - want) > 1e-3) {
      const seeked = waitEventOnce(v, 'seeked', 2000);
      try { v.currentTime = want; } catch (_) {}
      await seeked;
      if (v.requestVideoFrameCallback) {
        await new Promise(res => {
          let done = false;
          const fin = () => { if (!done) { done = true; res(); } };
          try { v.requestVideoFrameCallback(fin); } catch (_) { fin(); }
          setTimeout(fin, 150);
        });
      }
    }
  }
  draw(t);
}

/* WAV PCM16 stereo, 44-байтный заголовок — простейший формат, который
   ffmpeg понимает без дополнительных библиотек на фронте.                */
function encodeWav(buffer) {
  const numCh = buffer.numberOfChannels, sr = buffer.sampleRate, len = buffer.length;
  const blockAlign = numCh * 2, dataSize = len * blockAlign;
  const buf = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buf);
  let o = 0;
  const wStr = s => { for (let i = 0; i < s.length; i++) view.setUint8(o++, s.charCodeAt(i)); };
  const w32 = v => { view.setUint32(o, v, true); o += 4; };
  const w16 = v => { view.setUint16(o, v, true); o += 2; };
  wStr('RIFF'); w32(36 + dataSize); wStr('WAVE');
  wStr('fmt '); w32(16); w16(1); w16(numCh); w32(sr); w32(sr * blockAlign); w16(blockAlign); w16(16);
  wStr('data'); w32(dataSize);
  const chans = []; for (let c = 0; c < numCh; c++) chans.push(buffer.getChannelData(c));
  for (let i = 0; i < len; i++) {
    for (let c = 0; c < numCh; c++) {
      const s = Math.max(-1, Math.min(1, chans[c][i]));
      view.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      o += 2;
    }
  }
  return new Blob([buf], { type: 'audio/wav' });
}

/* Достаёт исходный файл клипа для decodeAudioData: сперва IndexedDB (там
   либо сам blob загруженного файла, либо url — для клипов, добавленных
   через loadVideoUrl/?video=), и только если её нет — blob-URL из пула
   (см. makePool/addVideoFile). Три пути ровно по тому же дереву источников,
   что уже использует restoreMedia() при восстановлении проекта.          */
async function fetchMediaArrayBuffer(m, p) {
  try {
    const rec = await idbGet(m.src);
    if (rec) {
      if (rec.blob) return await rec.blob.arrayBuffer();
      if (rec.url) { const r = await fetch(rec.url); if (r.ok) return await r.arrayBuffer(); }
    }
  } catch (_) {}
  if (p && p.url) { try { const r = await fetch(p.url); if (r.ok) return await r.arrayBuffer(); } catch (_) {} }
  return null;
}

/* Сводит звук всей дорожки офлайн через OfflineAudioContext — быстрее
   реального времени и не зависит от того, рисуется ли сейчас холст.
   null означает «звука нет вообще» (все клипы — фото, или ни один файл не
   декодировался) — тогда рендер идёт без аудио-потока, а не падает.       */
async function renderAudioWav(dur) {
  const Ctx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const ctx = new Ctx(2, Math.max(1, Math.ceil(dur * 48000)), 48000);
  const decodeCache = new Map();   // src -> Promise<AudioBuffer|null>, один клип может повторяться
  let any = false;
  for (const m of S.media) {
    const p = mediaPool[m.id];
    if (!p || p.kind === 'image' || !p.video) continue;   // фото без звука — сводить нечего
    let bufP = decodeCache.get(m.src);
    if (!bufP) {
      bufP = (async () => {
        const ab = await fetchMediaArrayBuffer(m, p);
        if (!ab) return null;
        try { return await ctx.decodeAudioData(ab); }
        catch (err) { console.warn('renderAudioWav: не декодировался звук клипа', m.name, err); return null; }
      })();
      decodeCache.set(m.src, bufP);
    }
    const buf = await bufP;
    if (!buf) continue;
    const inPoint = m.inPoint || 0;
    let at, offset, duration;
    if (inPoint >= 0) {
      at = m.t0; offset = inPoint;
      duration = Math.min(m.dur, Math.max(0, buf.duration - inPoint));
    } else {
      // Стоп-кадр в начале клипа: живой звук стартует не с t0, а позже,
      // ровно когда видео должно тронуться (см. ту же арифметику в syncMedia).
      at = m.t0 - inPoint; offset = 0;
      duration = Math.min(m.dur + inPoint, buf.duration);
    }
    if (duration <= 0) continue;
    const node = ctx.createBufferSource();
    node.buffer = buf;
    node.connect(ctx.destination);
    try { node.start(Math.max(0, at), offset, duration); }
    catch (err) { console.warn('renderAudioWav: клип не встал в очередь', m.name, err); continue; }
    any = true;
  }
  if (!any) return null;
  const rendered = await ctx.startRendering();
  return encodeWav(rendered);
}

/* Кадр за кадром собирает mp4 через локальный serve.py — см. брифинг в
   начале раздела. Не завязан на rAF: тикает через await, поэтому работает
   и в свёрнутой/фоновой вкладке, где обычная запись просто не рисовала бы
   холст вообще.                                                          */
async function renderOffline() {
  if (recording || rendering) return;

  const dur = sceneDuration();
  const fps = +S.exp.fps || 30;
  const N = Math.max(1, Math.round(dur * fps));
  const W = S.cw, H = S.ch;
  const withAudio = !!S.exp.audio;
  const name = `mockup-${W}x${H}-${Math.round(dur)}s.mp4`;

  const clock0 = clock;
  setPlaying(false);
  for (const id in mediaPool) { const p = mediaPool[id]; if (p.video) p.video.pause(); }

  rendering = true;
  renderCancelled = false;
  renderJob = null;
  let finishedOk = false;
  setRenderButtonsEnabled(false);
  $('#overlay').hidden = false;
  $('#ovTitle').textContent = 'Рендер mp4…';
  $('#ovBar').style.width = '0%';
  $('#ovSub').textContent = `Кадр 0 / ${N} · 0.0 с`;
  $('#ovCancel').disabled = false;

  let result = null;
  try {
    const ping = await pingRenderServer();
    if (!ping || !ping.ok || !ping.ffmpeg) {
      throw new Error('Локальный сервер рендера недоступен — нужен serve.py и ffmpeg (brew install ffmpeg)');
    }

    const rNew = await fetch('/render/new', { method: 'POST' });
    if (!rNew.ok) throw new Error('Не удалось создать задание рендера на сервере');
    const { job } = await rNew.json();
    renderJob = job;
    if (renderCancelled) return null;

    let hasAudio = false;
    if (withAudio) {
      $('#ovSub').textContent = 'Свожу звук…';
      const wav = await renderAudioWav(dur);
      if (renderCancelled) return null;
      if (wav) {
        const rAudio = await fetch(`/render/audio/${job}`, { method: 'POST', body: wav });
        if (!rAudio.ok) throw new Error('Не удалось отправить звук на сервер');
        hasAudio = true;
      }
    }

    const rStart = await fetch(`/render/start/${job}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fps, w: W, h: H, name, hasAudio, crf: 18 }),
    });
    if (!rStart.ok) {
      const e = await rStart.json().catch(() => ({}));
      throw new Error(e.error === 'ffmpeg not found'
        ? 'ffmpeg не найден на сервере — brew install ffmpeg'
        : ('Сервер не смог начать рендер: ' + (e.error || rStart.status)));
    }

    for (let i = 0; i < N; i++) {
      if (renderCancelled) return null;
      const t = i / fps;
      await renderFrameAt(t);
      const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.95));
      if (!blob) throw new Error('Не удалось получить кадр с холста');
      if (renderCancelled) return null;
      const rFrame = await fetch(`/render/frame/${job}`, { method: 'POST', body: blob });
      if (!rFrame.ok) {
        const e = await rFrame.json().catch(() => ({}));
        throw new Error(`Кодировщик остановился на кадре ${i + 1}/${N}` + (e.stderr ? ('\n' + e.stderr.slice(-500)) : ''));
      }
      $('#ovBar').style.width = (((i + 1) / N) * 100).toFixed(1) + '%';
      $('#ovSub').textContent = `Кадр ${i + 1} / ${N} · ${t.toFixed(1)} с`;
    }
    if (renderCancelled) return null;

    $('#ovSub').textContent = 'Собираю mp4…';
    const rFinish = await fetch(`/render/finish/${job}`, { method: 'POST' });
    const fin = await rFinish.json().catch(() => ({}));
    if (!rFinish.ok || !fin.ok) {
      throw new Error('ffmpeg не смог собрать файл' + (fin.stderr ? ('\n' + fin.stderr.slice(-500)) : ''));
    }
    finishedOk = true;

    const rGet = await fetch(`/render/file/${job}`);
    if (!rGet.ok) throw new Error('Не удалось скачать готовый файл с сервера');
    const outBlob = await rGet.blob();
    download(outBlob, name);
    $('#expMeta').innerHTML =
      `Отрендерено: <b style="color:#c6ccdc">${name}</b><br>${(fin.bytes / 1048576).toFixed(1)} МБ · ${fin.frames} кадров`;
    toast(`Готово: ${fin.frames} кадров, ${(fin.bytes / 1048576).toFixed(1)} МБ`, 4200);
    result = { path: fin.path, frames: fin.frames, bytes: fin.bytes };
  } catch (err) {
    if (!renderCancelled) {
      const msg = (err && err.message) || String(err);
      console.error('renderOffline:', err);
      toast('Рендер не удался: ' + msg.split('\n')[0] + ' — можно нажать «Записать» (реальное время)', 7000);
      $('#expMeta').innerHTML = `<b style="color:#ff5f6d">Рендер не удался.</b><br>${msg.split('\n')[0]}`;
    }
  } finally {
    rendering = false;
    $('#overlay').hidden = true;
    $('#ovTitle').textContent = 'Запись…';
    $('#ovCancel').disabled = false;
    setRenderButtonsEnabled(renderAvailable);
    clock = clock0;
    syncMedia(clock0, false);
    updatePlayhead();
    const job = renderJob; renderJob = null;
    if (job && !finishedOk) { try { await fetch(`/render/cancel/${job}`, { method: 'POST' }); } catch (_) {} }
  }
  return result;
}

$('#btnRender').addEventListener('click', () => { renderOffline(); });
$('#btnRender2').addEventListener('click', () => { renderOffline(); });

/* ================================================= сборка UI =========== */

function buildChips(host, items, isOn, onPick) {
  host.innerHTML = '';
  for (const it of items) {
    const b = document.createElement('button');
    b.className = 'chip' + (isOn(it) ? ' on' : '');
    b.textContent = it.name;
    if (it.hint) b.title = `${it.tag || ''} · ${it.dur} с. ${it.hint}`;
    b.dataset.id = it.id;
    b.addEventListener('click', () => { onPick(it); save(); });
    host.appendChild(b);
  }
}
const markChips = (host, id) =>
  [...host.children].forEach(c => c.classList.toggle('on', c.dataset.id === id));

function buildReelCards() {
  const host = $('#reels');
  host.replaceChildren();
  for (const reel of REELS) {
    const card = document.createElement('button');
    card.className = `reel-card reel-${reel.look}`;
    card.dataset.id = reel.id;
    card.title = `Применить: ${reel.name}. ${reel.hint}`;
    const frames = reel.seq.map(([id, dur]) => {
      const sc = scenarioById(id), k = sc.keys[0];
      const rotation = k.drz || 0;
      const width = 14 * Math.cos((k.dry || 0) * RAD);
      return `<span class="reel-shot" title="${sc.name} · ${dur} с"><svg viewBox="0 0 48 54" aria-hidden="true"><g transform="translate(24 26) rotate(${rotation})"><rect x="${-width / 2}" y="-17" width="${width}" height="34" rx="3"/><path d="M -2 -14 h 4"/></g></svg><small>${dur}с</small></span>`;
    }).join('');
    card.innerHTML = `<span class="reel-eyebrow">${reel.eyebrow}<span>${reel.duration} С</span></span><strong>${reel.name}</strong><span class="reel-description">${reel.hint}</span><span class="reel-storyboard">${frames}</span><span class="reel-beats">${reel.beats}</span>`;
    card.addEventListener('click', () => applyReel(reel));
    host.appendChild(card);
  }
}

function syncDirectionUI() {
  syncPoseUI();
  for (const el of $$('input, select')) if (el._sync) el._sync();
  for (const el of $$('#bgPresets .sw')) el.classList.toggle('on', el.dataset.id === S.bg.preset);
}

function syncPoseUI() {
  ['pRx', 'pRy', 'pRz', 'pScale', 'pX', 'pY', 'pPersp'].forEach(k => { const e = document.getElementById(k); if (e && e._sync) e._sync(); });
  markChips($('#poses'), poseEditBlock() ? '' : S.poseId);
}

function applyPose(p) {
  const target = beginPoseEdit();
  target.rx = p.rx; target.ry = p.ry; target.rz = p.rz;
  if (target === S.pose) S.poseId = p.id;
  syncPoseUI();
}

function resetPose() {
  const target = beginPoseEdit();
  Object.assign(target, { x: 0, y: 0, scale: 1, rx: 0, ry: 0, rz: 0, persp: 2600 });
  if (target === S.pose) S.poseId = 'flat';
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
  buildReelCards();
  $('#btnContinueScene').addEventListener('click', () => addCustomScene($('#continueDur').value));
  $('#btnCustomScene').addEventListener('click', () => addCustomScene($('#continueDur').value));
  $('#scClear').addEventListener('click', () => {
    pushHist(); S.scenes.length = 0; S.selScene = null; renderTimeline(); save(); toast('Дорожка сцен очищена');
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
  bind('reelArtDirection', 'scene.artDirection', 'bool');
  bind('sceneTransition', 'scene.transition', 'str', () => {
    for (const b of S.scenes) delete b.transition;
    updateSceneMeta();
  });
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
  $('#btnAddScale').addEventListener('click', addScaleClip);
  $('#btnSplit').addEventListener('click', () => splitAtPlayhead());
  $('#btnTrimL').addEventListener('click', () => trimAtPlayhead('head'));
  $('#btnTrimR').addEventListener('click', () => trimAtPlayhead('tail'));
  $('#btnTrans').addEventListener('click', addTransitionAtPlayhead);

  // Всплывающая панель над маркером перехода (#trPop, см. B в брифе) — один
  // статический элемент в body, слушатели вешаем один раз, а не при каждом
  // layoutTrPop() (та лишь двигает панель и обновляет подпись/значение).
  {
    const popRange = $('#trPopRange');
    popRange.addEventListener('input', () => {
      const tr = getTrans(S.selTrans); if (!tr) return;
      if (trPopPreSnap === null) trPopPreSnap = snap();   // снимок один раз в начале протяжки, как у transDurRange
      syncingRangeSelf = popRange;
      setTransDur(tr.id, +popRange.value);
      syncTransDurUI(tr);
      syncingRangeSelf = null;
    });
    popRange.addEventListener('change', () => {
      if (trPopPreSnap !== null && snap() !== trPopPreSnap) pushHist(trPopPreSnap);
      trPopPreSnap = null;
      const tr = getTrans(S.selTrans);
      if (tr) { setTransDur(tr.id, +popRange.value); syncTransDurUI(tr); }
    });
    $('#trPopDel').addEventListener('click', () => { if (S.selTrans) deleteTransition(S.selTrans); });
  }
  $('#tlwrap').addEventListener('scroll', () => layoutTrPop(), { passive: true });
  // Клик вне попапа/маркера/дорожки/блока перехода в левой панели снимает
  // выбор перехода (см. B.4 в брифе). Исключаем #videoMeta, а не весь
  // #panel: тот же переход редактируется там же ползунком #transDurRange и
  // кнопкой «Удалить переход» — без исключения первый pointerdown по самому
  // ползунку сбрасывал бы выбор раньше, чем успеет сработать протяжка. Но
  // весь #panel — это ещё и «Фон», «Экспорт» и остальные разделы, к
  // переходу не относящиеся: клик там должен снимать выбор, как и везде
  // вне блока перехода (было исключение шире необходимого, см. находку).
  document.addEventListener('pointerdown', e => {
    if (!S.selTrans) return;
    if (!(e.target instanceof Element) || e.target.closest('#trPop, .tr, #tlwrap, #videoMeta')) return;
    selectTrans(null);
  });

  $('#btnZoomOut').addEventListener('click', () => setZoom(S.tl.pps / 1.25, clock));
  $('#btnZoomIn').addEventListener('click', () => setZoom(S.tl.pps * 1.25, clock));
  $('#btnZoomFit').addEventListener('click', fitZoom);
  $('#btnUndo').addEventListener('click', undo);
  $('#btnRedo').addEventListener('click', redo);
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
    // 'input' льётся на каждый пиксель протяжки — снимок для истории делаем
    // один раз в начале протяжки (preSnap) и толкаем его один раз на 'change'
    // (тот же приём, что у ползунка длительности перехода, см. transDurRange).
    let preSnap = null;
    el.addEventListener('input', () => {
      const c = selectedClip(); if (!c) return;
      if (preSnap === null) preSnap = snap();
      c[key] = +el.value;
      if (out) out.textContent = fmt(+el.value);
      layoutClip(c); save();
    });
    el.addEventListener('change', () => {
      if (preSnap !== null && snap() !== preSnap) pushHist(preSnap);
      preSnap = null;
    });
  };
  clipParam('fcFill', 'fill', v => Math.round(v * 100) + '%');
  clipParam('fcRamp', 'ramp', v => v.toFixed(2) + 'с');
  clipParam('fcK', 'k', v => fmt('fcK', v));
  clipParam('fcAX', 'ax', v => fmt('fcAX', v));
  clipParam('fcAY', 'ay', v => fmt('fcAY', v));

  bind('fps',      'exp.fps',     'num');
  bind('bitrate',  'exp.bitrate', 'num');
  bind('withAudio','exp.audio',   'bool');
  bind('expDur',   'exp.dur',     'num', () => renderTimeline());
}

function updateSceneMeta() {
  const list = sortedScenes();
  for (const card of $$('#reels .reel-card')) {
    const reel = REELS.find(r => r.id === card.dataset.id);
    let cursor = 0;
    const active = list.length === reel.seq.length && reel.seq.every(([id, dur], i) => {
      const b = list[i], matches = b.sc === id && Math.abs(b.dur - dur) < .01 && Math.abs(b.t0 - cursor) < .01;
      cursor += dur;
      return matches;
    });
    card.classList.toggle('on', active);
    card.setAttribute('aria-pressed', String(active));
  }
  const el = $('#scMeta');
  const b = getScene(S.selScene) || sortedScenes()[0];
  if (!b) { el.textContent = 'Сцен нет. Нажми на приём — он встанет на дорожку в место плейхеда, или выбери готовый ролик.'; return; }
  const sc = sceneDefinition(b);
  const s0 = sceneS0(b), s1 = sceneS1(b);
  const isFrag = s0 > 0 || s1 < 1;
  const totalDur = sceneTotalDur(b);
  const rate = b.dur / Math.max(0.1, (s1 - s0) * totalDur);
  el.innerHTML =
    `<b style="color:#c6ccdc">${sc.name}</b> · ${b.t0.toFixed(1)}–${sceneEnd(b).toFixed(1)} с` +
    (Math.abs(rate - 1) > 0.05 ? ` · темп ${rate.toFixed(2)}×` : '') +
    (isFrag ? `<br><span style="color:#8b93a7">фрагмент плана: ${(s0 * totalDur).toFixed(1)}–${(s1 * totalDur).toFixed(1)} с из ${totalDur.toFixed(1)}</span>` : '') +
    `<br>${sc.hint}` +
    (S.scenes.length > 1 ? `<br><span style="color:#8b93a7">Всего сцен: ${S.scenes.length}. Стыки: ${S.scenes.some(x => (x.transition || S.scene.transition) === 'dip') ? 'с затемнением' : 'прямые склейки'}.</span>` : '');
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
// Предыдущая версия сохраняла длину готового ролика как жёсткий лимит
// экспорта. Исправляем только узнаваемые старые пресеты, один раз.
function migrateReelDuration(saved) {
  if (!saved.exp || saved.exp.autoDurationVersion >= 1) return;
  const list = sortedScenes();
  const legacyReel = REELS.some(reel => {
    if (S.exp.dur !== reel.duration || list.length !== reel.seq.length) return false;
    let cursor = 0;
    return reel.seq.every(([id, dur], i) => {
      const b = list[i];
      const matches = b.sc === id && Math.abs(b.dur - dur) < .01 && Math.abs(b.t0 - cursor) < .01;
      cursor += dur;
      return matches;
    });
  });
  if (legacyReel) S.exp.dur = 0;
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
    // Сами File/Blob в localStorage не лезут (тут только JSON S, см. save())
    // — они лежат в IndexedDB и возвращаются в mediaPool в restoreMedia()
    // (см. A/B в брифе), а тут только валидируем то, что вообще могло тут
    // сохраниться раньше: числа не NaN/±Infinity, длительность положительная,
    // и у клипа обязательно есть src — без него файл в IndexedDB не найти
    // (например старый сейв ещё до этого поля), такой клип безнадёжен.
    if (!Array.isArray(S.media)) S.media = [];
    S.media = S.media.filter(m => m && typeof m.id === 'string' && typeof m.src === 'string' && m.src &&
      isFinite(m.t0) && m.t0 >= 0 && isFinite(m.dur) && m.dur > 0);
    for (const m of S.media) {
      if (!isFinite(m.inPoint)) m.inPoint = 0;
      // newMediaId() продолжает нумерацию с этого сейва — иначе первый же
      // addVideoFile после перезагрузки получит id, который уже занят
      // восстановленным клипом (mediaSeq — отдельная переменная, в S не
      // живёт, см. её объявление), как уже сделано для сцен/наездов ниже.
      const n = +String(m.id).replace(/\D/g, ''); if (isFinite(n) && n >= mediaSeq) mediaSeq = n + 1;
    }
    if (S.selMedia && !S.media.some(m => m.id === S.selMedia)) S.selMedia = null;
    S.tl.pps = 0;   // масштаб имеет смысл относительно реальной длины дорожки — подберётся в restoreMedia() (fitZoom)
    if (!Array.isArray(S.trans)) S.trans = [];
    S.trans = S.trans.filter(tr => tr && typeof tr.id === 'string' && (tr.edge === 'in' || tr.edge === 'out') &&
      isFinite(tr.dur) && tr.dur > 0 && S.media.some(m => m.id === tr.clip));
    for (const tr of S.trans) {
      const n = +String(tr.id).replace(/\D/g, ''); if (isFinite(n) && n >= transSeq) transSeq = n + 1;
    }
    if (S.selTrans && !S.trans.some(tr => tr.id === S.selTrans)) S.selTrans = null;
    if (!Array.isArray(S.scenes)) S.scenes = [];
    S.scenes = S.scenes.filter(b => b && (validCustomScene(b) || SCENARIOS.some(x => x.id === b.sc && x.dur > 0)) && isFinite(b.t0) && b.dur > 0);
    for (const b of S.scenes) {
      if (!b.id) b.id = newSceneId();
      const n = +String(b.id).replace(/\D/g, ''); if (n >= sceneSeq) sceneSeq = n + 1;
      // Битые/бессмысленные доли (не число, вне [0,1], s0>=s1) — считаем, что
      // блок играет сценарий целиком, а не запоминаем половинчатый обрез.
      if (!(Number.isFinite(b.s0) && Number.isFinite(b.s1) &&
            b.s0 >= 0 && b.s0 <= 1 && b.s1 >= 0 && b.s1 <= 1 && b.s0 < b.s1)) {
        delete b.s0; delete b.s1;
      }
    }
    if (S.selScene && !S.scenes.some(b => b.id === S.selScene)) S.selScene = null;
    if (!Array.isArray(S.clips)) S.clips = [];
    S.clips = S.clips.filter(c => c && isFinite(c.t0) && isFinite(c.dur) && c.dur > 0);
    for (const c of S.clips) {
      if (!c.id) c.id = 'z' + (clipSeq++);
      const n = +String(c.id).replace(/\D/g, '');
      if (n >= clipSeq) clipSeq = n + 1;
      // region-клипу без u0..v1 — как раньше, ничего не подставляем;
      // scale-клипу без k/ax/ay — дефолты, чтобы draw() не считал с NaN.
      if (clipKind(c) === 'scale') {
        if (!isFinite(c.k)) c.k = 1.4;
        if (!isFinite(c.ax)) c.ax = 0;
        if (!isFinite(c.ay)) c.ay = 0;
      }
    }
    if (S.sel && !S.clips.some(c => c.id === S.sel)) S.sel = null;
    migrateReelDuration(o);
  } catch (_) {}
}

/* Восстановление медиа после перезагрузки (см. A/B в брифе). Сами File/Blob
   не переживают localStorage — там только JSON S (см. save()) — а лежат в
   IndexedDB по ключу src (см. idbPut/makePool выше). Один src может
   понадобиться нескольким клипам сразу — после split несколько S.media-
   записей смотрят на один и тот же файл (см. splitMediaAt) — поэтому грузим
   каждый src ровно один раз и раздаём получившуюся pool-запись всем клипам
   с этим src: та же схема «общий объект под разными id», что и у самого
   split. Вызывается из init() уже после renderTimeline() — клипы на дорожке
   видны сразу (load() больше не обнуляет S.media), а пока эта функция не
   отработала, mediaPool для них ещё пуст: mediaAt()/activeMedia() в этот
   момент отдают null, draw() рисует заглушку — это ожидаемо и временно
   (см. B.2 в брифе). История (hist.undo/redo) после перезагрузки всегда
   пустая — так было и раньше, отдельно её тут восстанавливать незачем.    */
async function restoreMedia() {
  const srcs = [...new Set(S.media.map(m => m.src))];
  // Снимок id, которые нужно восстановить именно нам. Пока идут await ниже
  // (чтение из IndexedDB, loadedmetadata видео), пользователь может успеть
  // сам добавить клип через drop/#file (addVideoFiles/addImageFile) — тот
  // синхронно получает свою pool-запись и попадает в S.media под id,
  // которого тут не было. Без origIds финальный filter ниже не находил бы
  // его в своей карте entries (она собрана только из srcs на момент старта)
  // и молча вырезал бы этот клип с дорожки — а идущая следом чистка сирот
  // так же молча удаляла бы его файл из IndexedDB (см. находку о гонке).
  const origIds = new Set(S.media.map(m => m.id));
  const entries = new Map();   // src → готовая pool-запись, либо null — файл не нашёлся/не читается
  await Promise.all(srcs.map(async src => {
    let entry = null;
    try {
      const rec = await idbGet(src);
      if (rec && rec.blob) {
        const url = URL.createObjectURL(rec.blob);
        const kind = rec.type && rec.type.startsWith('image/') ? 'image' : 'video';
        entry = await makePool(kind, url, rec.name, true, src);
      } else if (rec && rec.url) {
        entry = await makePool('video', rec.url, rec.name, false, src);
      }
    } catch (_) { entry = null; }
    if (entry) entry.srcId = src;
    entries.set(src, entry);
  }));

  const missing = [];
  S.media = S.media.filter(m => {
    if (!origIds.has(m.id)) return true;   // добавлен параллельно, пока мы ждали выше, — не наш, не трогаем
    const entry = entries.get(m.src);
    if (!entry) { missing.push(m); return false; }
    mediaPool[m.id] = entry;
    return true;
  });
  if (missing.length) {
    const missIds = new Set(missing.map(m => m.id));
    S.trans = S.trans.filter(tr => !missIds.has(tr.clip));
    if (S.selMedia && missIds.has(S.selMedia)) S.selMedia = null;
  }

  // Осиротевшие записи IndexedDB (см. A.3 в брифе): src, которые не нужны ни
  // одному клипу — ни восстановленному нами (srcs), ни добавленному
  // параллельно, пока мы ждали выше (текущий S.media — см. находку о
  // гонке, тот же приём, что и с origIds). Из прошлой сессии их мог держать
  // живыми только undo/redo (см. gcPool) — а история после перезагрузки
  // страницы всегда пустая, значит и держать их больше некому. Раньше это
  // условие ошибочно пряталось за `if (!S.media.length) return` в начале
  // функции — при пустой дорожке (последний клип убрали и перезагрузили
  // страницу, либо клип отбросило при load() ещё до этой функции) чистка
  // не запускалась вовсе, и такой файл (у пользователя — десятки/сотни МБ)
  // оставался в IndexedDB навсегда, а освободить его через интерфейс
  // нечем — «Убрать всё видео и фото» на пустой дорожке сама выходит
  // раньше idbClear() (см. clearVideo, находку о том же).
  // Гонять эту чистку смысл есть, только если в этом браузере вообще могло
  // что-то накопиться в IndexedDB: либо сейчас есть что восстанавливать
  // (srcs.length), либо localStorage уже хранит сейв с прошлого раза (KEY
  // мог остаться и после того, как медиа из него отфильтровали при load()
  // — см. её код, там же пример с клипом без src). На самом первом визите
  // ни того ни другого нет — IndexedDB гарантированно пуста, а лишний
  // idbKeys()/idbOpen() на браузере без поддержки IndexedDB — это только
  // спутывающий тост про «не удалось сохранить файл» (см. idbWarn) там, где
  // пользователь ещё вообще ничего не сохранял.
  let hadPrevSave = true;
  try { hadPrevSave = localStorage.getItem(KEY) != null; } catch (_) {}
  if (srcs.length || hadPrevSave) {
    idbKeys().then(keys => {
      const live = new Set([...srcs, ...S.media.map(m => m.src)]);
      for (const k of keys) if (!live.has(k)) idbDelete(k);
    });
  }

  hasVideo = S.media.some(m => mediaPool[m.id]);
  updateVideoMeta();
  renderTimeline();
  scheduleStrip();
  // Как при самом первом появлении медиа (см. addVideoFiles) — масштаб
  // таймлайна ещё не подобран под реальную длину восстановленной дорожки.
  fitZoom();
  // toast() однослотовый (см. его код) — несколько вызовов подряд в одном
  // синхронном блоке (как раньше: тост на каждый пропавший файл, а следом
  // ещё и «Проект восстановлен») показывают пользователю только самый
  // последний, отрисовки между ними не происходит (см. находку). Поэтому
  // здесь ровно один вызов: если что-то потерялось — сообщаем про это (и
  // не показываем следом бодрое «восстановлен», лишь бы не перетереть),
  // иначе — обычный итог восстановления.
  if (missing.length) {
    const names = missing.map(m => m.name).join(', ');
    toast(missing.length > 1
      ? `Не найдены файлы: ${names} — клипы убраны`
      : `Не найден файл: ${names} — клип убран`);
  } else if (S.media.length) {
    toast(`Проект восстановлен: ${S.media.length} клипов`);
  }
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
  updateHistButtons();
  restoreMedia();   // асинхронно — клипы уже видны на дорожке, файлы дотягиваются из IndexedDB (см. бриф)

  const q = new URLSearchParams(location.search);
  if (q.get('video')) loadVideoUrl(q.get('video'));

  requestAnimationFrame(loop);
  setTimeout(fitCanvas, 60);
  initRenderUI();   // асинхронно — /render/ping бьёт в локальный сервер, не блокирует запуск
}
init();

/* хук для отладки/автотестов */
window.__ms = { S, draw, setCanvasSize, loadVideoUrl, DEVICES, SCENARIOS, REELS, POSES, addClip, deleteClip,
  addScaleClip, clipKind,
  addVideoFiles, addImageFile, deleteMedia, clearVideo, mediaDur, mediaAt, activeMedia, mediaKind,
  syncMedia, mediaPool, holdHead, holdTail, stats,
  restoreMedia, idb: { get: idbGet, keys: idbKeys, del: idbDelete, clear: idbClear },
  addScene, addCustomScene, applyReel, deleteScene, sceneFade, sceneAt, composedPose,
  splitSceneAt, trimSceneToPlayhead, sceneUnderPlayhead, splitAtPlayhead, trimAtPlayhead,
  sceneS0, sceneS1,
  renderTimeline, buildFilmstrip, evalScenario, focusAt, sceneDuration, selectClip, seekTo,
  homography, hmap, setForceGrid: v => { forceGrid = v; },
  get last(){ return lastRender }, get lastCam(){ return lastCam }, get selecting(){ return selecting }, startSelect, endSelect,
  setPose: p => { Object.assign(S.pose, p); syncPoseUI(); },
  setPlaying: v => setPlaying(v),
  splitMediaAt, trimToPlayhead, addTransition: addTransitionAt, deleteTransition, setTransDur, transFade, selectTrans,
  addTransitionAtPlayhead, maxTransDur, layoutTrPop,
  undo, redo, hist, gcPool, snapT, thumbCache, layoutJunctions,
  setZoom, fitZoom, layoutTimeline, contentW, tlViewW, updatePlayhead,
  get tl() { return S.tl },
  get trDrag() { return trDrag },
  get clipDrag() { return clipDrag },
  get clock() { return clock },
  renderOffline, renderAudioWav, renderFrameAt, get rendering() { return rendering } };
