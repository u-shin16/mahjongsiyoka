'use strict';
// ============================================================
// 今日の1問・ごほうび（2026-10-15）
//
// ・ホームを開くと、その日の1問だけが出ている（選ばせない）
// ・間違えた問題は2日後にもう一度出す（忘れたころに出すほうが身につく）
// ・答えた日を「合計」で数える。連続日数にはしない（途切れた日にやめる理由になるため）
// ・2026-11-12：ゆーしん「一番大事なのは学習パート。牌の見た目と関わっても意味なくない？」→
//   数える日を「学んだ日」に広げた。今日の1問に答えた日に加えて、章のミニゲームをクリアした日も1日と数える（同じ日は1回だけ）。
//   ごほうびを、学習パートを繰り返すことにもつなげるため。間違えた問題からは、その章へ戻れるようにした（sourceOf）
// ・合計日数でごほうび（称号・牌のデザイン・卓の色・背景）がもらえる
//
// 画面を持たない計算だけをここに置き、app.js から使う。テストは tests/daily_test.js。
// ============================================================
var Daily = (function() {
  var RETRY_AFTER_DAYS = 2;

  // 合計日数ごとのごほうび。数字は小さい順に並べる
  // 2026-11-11：ゆーしん「単色じゃなくてキャラとか模様とかのやつがいい」→「キャラなくしてじっそう」
  // → 牌の裏・卓・背景に和柄などの模様を入れた（定番だけは無地のまま）。今の色を選んでいる人の見た目が
  // 急に変わらないよう、IDと色はそのままにして模様を重ねた。模様だけの新しいごほうびも5つ足した
  // 2026-11-03：ゆーしん「もらっても嬉しくない」「もうちょっと派手にする」→ 落ち着いた色しか無かったので、
  // 紅・金・紫・翡翠・黒金・金の卓を足した。日数が多いほど派手にしてある
  // 2026-10-15：牌の表と裏を別々の特典にしていたが、ゆーしん「牌だけで一つのものにして」→
  // 表の色と裏の色をセットにした「牌」1つにまとめた
  var HIDDEN_TABLES = ['night', 'crimson', 'wine', 'ichimatsu', 'kokukin', 'gold', 'neon', 'latte', 'aqua', 'candy', 'cosmic', 'forest'];  // 2026-11-24：卓は「緑の卓＋新しい6つ」に差し替え。これまでの卓はすべて画面に出さない
  var REWARDS = [
    { days: 1,   type: 'title', id: 'はじめの一歩' },
    { days: 3,   type: 'tile',  id: 'ivory' },
    { days: 5,  type: 'tile',  id: 'neon' },
    { days: 5,  type: 'table', id: 'neon' },
    { days: 5,  type: 'bg',    id: 'neon' },
    { days: 7,   type: 'title', id: '麻雀好き' },
    { days: 7,   type: 'table', id: 'night' },
    { days: 7,  type: 'table', id: 'seiza' },
    { days: 10,  type: 'bg',    id: 'navy' },
    { days: 12, type: 'tile',  id: 'latte' },
    { days: 12, type: 'table', id: 'latte' },
    { days: 12, type: 'bg',    id: 'latte' },
    { days: 14,  type: 'tile',  id: 'indigo' },
    { days: 17, type: 'tile',  id: 'candy' },
    { days: 17, type: 'table', id: 'candy' },
    { days: 17, type: 'bg',    id: 'candy' },
    { days: 20,  type: 'table', id: 'crimson' },
    { days: 20,  type: 'bg',    id: 'chidori' },
    { days: 20, type: 'table', id: 'fubuki' },
    { days: 25,  type: 'tile',  id: 'gold' },
    { days: 30,  type: 'title', id: '麻雀の常連' },
    { days: 30,  type: 'table', id: 'wine' },
    { days: 30, type: 'table', id: 'nami' },
    { days: 33, type: 'tile',  id: 'aqua' },
    { days: 33, type: 'table', id: 'aqua' },
    { days: 33, type: 'bg',    id: 'aqua' },
    { days: 40,  type: 'bg',    id: 'sumi' },
    { days: 45,  type: 'tile',  id: 'yagasuri' },
    { days: 48, type: 'tile',  id: 'cosmic' },
    { days: 48, type: 'table', id: 'cosmic' },
    { days: 48, type: 'bg',    id: 'cosmic' },
    { days: 50,  type: 'tile',  id: 'sakura' },
    { days: 50,  type: 'title', id: '麻雀の達人' },
    { days: 55,  type: 'table', id: 'ichimatsu' },
    { days: 55, type: 'table', id: 'trump' },
    { days: 60,  type: 'bg',    id: 'murasaki' },
    { days: 65, type: 'tile',  id: 'forest' },
    { days: 65, type: 'table', id: 'forest' },
    { days: 65, type: 'bg',    id: 'forest' },
    { days: 70,  type: 'tile',  id: 'jade' },
    { days: 80,  type: 'table', id: 'kokukin' },
    { days: 80, type: 'table', id: 'kikko' },
    { days: 85,  type: 'bg',    id: 'hoshi' },
    { days: 90,  type: 'tile',  id: 'hoshi' },
    { days: 100, type: 'title', id: '百日の打ち手' },
    { days: 100, type: 'table', id: 'gold' },
    { days: 100, type: 'table', id: 'hanabi' },
  ].filter(function(r) { return r.type !== 'tile' && !(r.type === 'table' && HIDDEN_TABLES.indexOf(r.id) >= 0); });
  // 2026-11-24：ゆーしん「卓の種類多い」→ 13種類から7種類に減らした。外した卓は画面に出さず、もらえる一覧からも外す
  // （TABLES には残してあるので、戻すときは下の一覧から消す。すでに選んでいた人は、使えない扱いになり緑の卓になる）
  // 2026-11-24：ゆーしん「牌の色が変わるやつ全部消して」→ 牌のごほうびは出さない。
  // 上の表と TILES は、もとに戻せるよう残してある（もらえる日数の一覧からだけ外している）

  // 新しい柄の部品
  function petalSvg(cx, cy, c, k) {
    return [0, 72, 144, 216, 288].map(function(a) { return '<ellipse cx="' + cx + '" cy="' + (cy - 4.2 * k) + '" rx="' + (2.8 * k) + '" ry="' + (4.2 * k) + '" transform="rotate(' + a + ' ' + cx + ' ' + cy + ')" fill="' + c + '"/>'; }).join('') + '<circle cx="' + cx + '" cy="' + cy + '" r="' + (1.3 * k) + '" fill="#ffd36b"/>';
  }
  function starSvg(x, y, r, c) {
    return '<path fill="' + c + '" d="M' + x + ' ' + (y - r) + 'L' + (x + r * .3) + ' ' + (y - r * .3) + 'L' + (x + r) + ' ' + y + 'L' + (x + r * .3) + ' ' + (y + r * .3) + 'L' + x + ' ' + (y + r) + 'L' + (x - r * .3) + ' ' + (y + r * .3) + 'L' + (x - r) + ' ' + y + 'L' + (x - r * .3) + ' ' + (y - r * .3) + 'Z"/>';
  }
  function burstSvg(cx, cy, r, c) {
    var o = '<g stroke="' + c + '" stroke-width="1.4" stroke-linecap="round">';
    for (var i = 0; i < 12; i++) { var a = i * Math.PI / 6; o += '<line x1="' + (cx + Math.cos(a) * r * .45) + '" y1="' + (cy + Math.sin(a) * r * .45) + '" x2="' + (cx + Math.cos(a) * r) + '" y2="' + (cy + Math.sin(a) * r) + '"/>'; }
    return o + '</g><circle cx="' + cx + '" cy="' + cy + '" r="2" fill="' + c + '"/>';
  }

  // 模様（SVGを繰り返して敷く）。c＝線や塗りの色。w,h＝1マスの大きさ
  var PATTERNS = {
    seigaiha: { w: 40, h: 20, svg: function(c) { return '<g fill="none" stroke="' + c + '" stroke-width="1.6">' + [18, 13, 8, 3].map(function(r) { return '<circle cx="20" cy="20" r="' + r + '"/><circle cx="0" cy="10" r="' + r + '"/><circle cx="40" cy="10" r="' + r + '"/>'; }).join('') + '</g>'; } },
    asanoha:  { w: 30, h: 52, svg: function(c) { return '<path stroke="' + c + '" stroke-width="1.2" fill="none" d="M15 0L15 52M0 8.7L30 43.3M30 8.7L0 43.3M0 8.7L15 17.3L30 8.7M0 43.3L15 34.7L30 43.3M15 0L0 8.7M15 0L30 8.7M15 52L0 43.3M15 52L30 43.3M0 26L15 17.3M30 26L15 17.3M0 26L15 34.7M30 26L15 34.7"/>'; } },
    ichimatsu:{ w: 20, h: 20, svg: function(c) { return '<rect width="10" height="10" fill="' + c + '"/><rect x="10" y="10" width="10" height="10" fill="' + c + '"/>'; } },
    shippo:   { w: 24, h: 24, svg: function(c) { return '<g fill="none" stroke="' + c + '" stroke-width="1.4"><circle cx="0" cy="0" r="12"/><circle cx="24" cy="0" r="12"/><circle cx="0" cy="24" r="12"/><circle cx="24" cy="24" r="12"/><circle cx="12" cy="12" r="12"/></g>'; } },
    yagasuri: { w: 20, h: 28, svg: function(c) { return '<path d="M0 0L10 7L10 21L0 14ZM10 7L20 0L20 14L10 21Z" fill="' + c + '"/>'; } },
    sakura:   { w: 36, h: 36, svg: function(c) { return '<g fill="' + c + '">' + [[9, 9], [27, 27]].map(function(p) { return [0, 72, 144, 216, 288].map(function(a) { return '<ellipse cx="' + p[0] + '" cy="' + (p[1] - 3.6) + '" rx="2.4" ry="3.6" transform="rotate(' + a + ' ' + p[0] + ' ' + p[1] + ')"/>'; }).join(''); }).join('') + '</g>'; } },
    chidori:  { w: 32, h: 28, svg: function(c) { return '<path d="M4 14q5-8 12-4q4-6 10-4q-4 2-5 6q4 4 1 8q-3-4-8-3q-6 1-10-3z" fill="' + c + '" transform="scale(.8) translate(4 4)"/>'; } },
    hoshi:    { w: 34, h: 34, svg: function(c) { return '<g fill="' + c + '"><path d="M8 3L9.4 6.6L13 7L10.2 9.4L11 13L8 11L5 13L5.8 9.4L3 7L6.6 6.6Z"/><circle cx="25" cy="22" r="1.6"/><circle cx="18" cy="30" r="1"/><circle cx="29" cy="7" r="1.2"/></g>'; } },
    // 2026-11-24：和柄以外の新しい見た目（ネオン・カフェラテ・アクア・キャンディ・コズミック・フォレスト）用の模様
    diag:     { w: 16, h: 16, svg: function(c) { return '<path d="M-4 4L4 -4M0 16L16 0M12 20L20 12" stroke="' + c + '" stroke-width="2" fill="none"/>'; } },
    grid:     { w: 24, h: 24, svg: function(c) { return '<path d="M0 .5H24M.5 0V24" stroke="' + c + '" stroke-width="1" fill="none"/>'; } },
    dots:     { w: 12, h: 12, svg: function(c) { return '<circle cx="6" cy="6" r="2.2" fill="' + c + '"/>'; } },
    wave:     { w: 28, h: 12, svg: function(c) { return '<path d="M0 6Q7 0 14 6T28 6" stroke="' + c + '" stroke-width="1.4" fill="none"/>'; } },
    bubble:   { w: 40, h: 40, svg: function(c) { return '<g fill="none" stroke="' + c + '" stroke-width="1.3"><circle cx="10" cy="12" r="4"/><circle cx="28" cy="28" r="2.6"/><circle cx="31" cy="8" r="3.2"/></g>'; } },
    orbit:    { w: 44, h: 44, svg: function(c) { return '<g fill="none" stroke="' + c + '" stroke-width="1.2"><circle cx="22" cy="22" r="6"/><circle cx="22" cy="22" r="13"/><circle cx="22" cy="22" r="20"/></g><circle cx="35" cy="22" r="2" fill="' + c + '"/>'; } },
    mountain: { w: 28, h: 16, svg: function(c) { return '<path d="M0 14L7 4L14 14L21 4L28 14" stroke="' + c + '" stroke-width="1.5" fill="none"/>'; } },
    plaid:    { w: 24, h: 24, svg: function(c) { return '<path d="M12 0V24M0 12H24" stroke="' + c + '" stroke-width="1.6" fill="none"/>'; } },
    polka:    { w: 20, h: 20, svg: function(c) { return '<circle cx="5" cy="5" r="3" fill="' + c + '"/><circle cx="15" cy="15" r="3" fill="' + c + '"/>'; } },
    vstripe:  { w: 12, h: 12, svg: function(c) { return '<rect width="3" height="12" fill="' + c + '"/>'; } },
    tree:     { w: 32, h: 36, svg: function(c) { return '<path d="M16 4L26 22H6ZM16 16L28 34H4Z" fill="' + c + '"/>'; } },
    // 2026-11-24：ごほうびの卓用の、はっきり見える柄（ゆーしん「今のままだと全然ごほうび感ない」→ モック12案から6つ）
    fubuki:   { w: 64, h: 64, svg: function() { return petalSvg(16, 16, 'rgba(255,205,220,.62)', 1.5) + petalSvg(48, 48, 'rgba(255,255,255,.5)', 1.2) + petalSvg(48, 12, 'rgba(255,170,195,.4)', .9); } },
    nami:     { w: 56, h: 28, svg: function() { return '<g fill="none" stroke="rgba(232,184,75,.6)" stroke-width="1.5">' + [12, 9, 6, 3].map(function(r) { return '<circle cx="28" cy="28" r="' + r + '"/><circle cx="0" cy="14" r="' + r + '"/><circle cx="56" cy="14" r="' + r + '"/>'; }).join('') + '</g>'; } },
    kikko:    { w: 42, h: 72, svg: function() { return '<path fill="none" stroke="rgba(232,184,75,.6)" stroke-width="1.6" d="M21 0L42 12V36L21 48L0 36V12ZM21 48V72M0 36L-21 48M42 36L63 48M21 0V-12M0 12L-21 0M42 12L63 0"/>'; } },
    seiza:    { w: 120, h: 120, svg: function() { return '<path d="M18 30L52 52L86 38L100 84" fill="none" stroke="rgba(255,230,150,.28)" stroke-width="1"/>' + starSvg(18, 30, 6, 'rgba(255,236,170,.95)') + starSvg(52, 52, 4, 'rgba(255,236,170,.8)') + starSvg(86, 38, 7, 'rgba(255,236,170,.95)') + starSvg(100, 84, 4, 'rgba(255,236,170,.8)') + '<circle cx="34" cy="96" r="1.6" fill="rgba(255,255,255,.7)"/><circle cx="70" cy="108" r="1.2" fill="rgba(255,255,255,.6)"/><circle cx="110" cy="14" r="1.4" fill="rgba(255,255,255,.65)"/><circle cx="8" cy="70" r="1.2" fill="rgba(255,255,255,.55)"/>'; } },
    suits:    { w: 64, h: 64, svg: function() { var f = 'font-family="Arial,sans-serif" font-size="24" text-anchor="middle"'; return '<text x="16" y="26" ' + f + ' fill="rgba(255,255,255,.34)">♠</text><text x="48" y="26" ' + f + ' fill="rgba(255,120,120,.5)">♥</text><text x="16" y="58" ' + f + ' fill="rgba(255,120,120,.5)">♦</text><text x="48" y="58" ' + f + ' fill="rgba(255,255,255,.34)">♣</text>'; } },
    hanabi:   { w: 150, h: 150, svg: function() { return burstSvg(40, 42, 26, 'rgba(255,205,110,.7)') + burstSvg(108, 104, 20, 'rgba(255,140,190,.65)') + '<circle cx="120" cy="30" r="1.6" fill="rgba(120,220,255,.7)"/><circle cx="20" cy="112" r="1.6" fill="rgba(120,220,255,.6)"/>'; } },
  };

  // 模様をCSSの background-image に入れられる形にする。HTMLの style="" の中にも書けるよう、
  // 引用符とかっこを使わない形にしてある
  function patternUrl(pat) {
    if (!pat || !PATTERNS[pat.name]) return 'none';
    var P = PATTERNS[pat.name];
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + P.w + '" height="' + P.h + '">' + P.svg(pat.color) + '</svg>';
    return 'url(data:image/svg+xml,' + encodeURIComponent(svg).replace(/'/g, '%27').replace(/\(/g, '%28').replace(/\)/g, '%29') + ')';
  }
  // 卓に敷く模様の拡大率（柄ごとの zoom）。対局画面の大きさに合わせる
  function patternZoom(pat) { return pat && pat.zoom ? pat.zoom : 1; }
  // 模様1マスの大きさ（scale 倍）。牌の裏は小さいので半分にして使う
  function patternSize(pat, scale) {
    if (!pat || !PATTERNS[pat.name]) return 'auto';
    var P = PATTERNS[pat.name];
    return (P.w * scale) + 'px ' + (P.h * scale) + 'px';
  }

  // 牌のデザイン（表と裏のセット）
  // 2026-11-11：ゆーしん「うらみえなくない?」→ 対局で相手の牌の裏はスマホだと1枚11pxほどで、模様は見えない。
  // いつも見えるのは自分の手牌の表なので、名前は表の色にした。裏の模様はおまけとして残す。どの牌も表の色が変わるようにした
  //   sheet：本物の牌の画像（白い面だけを色づけしたもの）。null ならもとの画像
  //   face：数字だけの牌（CSSで描く）の面の色 a〜c ／ back：牌の裏の色 a=明るい側, b=中, c=厚みの暗い側
  //   pat：牌の裏に重ねる模様（無ければ無地）
  var TILES = {
    'default': { name: '定番', sheet: null,
      face: { a: '#fffef8', b: '#f6efd9', c: '#e8d7b6' }, back: { a: '#f7b943', b: '#d67718', c: '#8f3f0a' } },
    'ivory':   { name: '象牙', sheet: '/static/img/mahjong-tiles-ivory.jpg',
      face: { a: '#fff6e0', b: '#f7e6bf', c: '#e8cf9c' }, back: { a: '#efe0bd', b: '#c9a96e', c: '#7d6033' },
      pat: { name: 'shippo', color: 'rgba(110,80,35,.45)' } },
    'indigo':  { name: '藍', sheet: '/static/img/mahjong-tiles-sky.jpg',
      face: { a: '#f4f9ff', b: '#e1ecfb', c: '#c9d9ee' }, back: { a: '#6f8fd0', b: '#3c5ea8', c: '#1d3268' },
      pat: { name: 'seigaiha', color: 'rgba(255,255,255,.55)' } },
    'gold':    { name: '金', sheet: '/static/img/mahjong-tiles-gold.jpg',
      face: { a: '#fff1c4', b: '#ffd970', c: '#e0a92c' }, back: { a: '#ffe27a', b: '#e0a514', c: '#7a5200' },
      pat: { name: 'asanoha', color: 'rgba(122,82,0,.55)' } },
    'yagasuri':{ name: '藤', sheet: '/static/img/mahjong-tiles-fuji.jpg',
      face: { a: '#f8f3fd', b: '#e8ddf6', c: '#d0bfe6' }, back: { a: '#c4456a', b: '#8c2448', c: '#4a1024' },
      pat: { name: 'yagasuri', color: 'rgba(255,255,255,.38)' } },
    'sakura':  { name: '桜', sheet: '/static/img/mahjong-tiles-sakura.jpg',
      face: { a: '#fff6f8', b: '#fbe3ea', c: '#efc9d4' }, back: { a: '#eda3b7', b: '#c96f8a', c: '#86364f' },
      pat: { name: 'sakura', color: 'rgba(255,255,255,.7)' } },
    'jade':    { name: '翡翠', sheet: '/static/img/mahjong-tiles-jade.jpg',
      face: { a: '#f0fff4', b: '#c9eed4', c: '#9fd6b2' }, back: { a: '#4fd6a0', b: '#0f9a68', c: '#04452c' },
      pat: { name: 'ichimatsu', color: 'rgba(0,40,20,.22)' } },
    'hoshi':   { name: '銀', sheet: '/static/img/mahjong-tiles-silver.jpg',
      face: { a: '#f7f8fb', b: '#e2e6ee', c: '#c6ccd8' }, back: { a: '#2c4a8a', b: '#162a5a', c: '#0a1430' },
      pat: { name: 'hoshi', color: 'rgba(255,226,140,.85)' } },
    // 2026-11-24：和柄以外の新しい牌（表の色が変わる画像つき。裏と縁は新しい色）
    'neon':    { name: 'ネオン', sheet: '/static/img/mahjong-tiles-neon.jpg',
      face: { a: '#effbff', b: '#d4eef9', c: '#b5dcec' }, back: { a: '#5cecff', b: '#00D9FF', c: '#A855F7' },
      pat: { name: 'diag', color: 'rgba(23,36,61,.5)' } },
    'latte':   { name: 'カフェラテ', sheet: '/static/img/mahjong-tiles-latte.jpg',
      face: { a: '#fff7ec', b: '#f6e4cd', c: '#e2c7a6' }, back: { a: '#f7e3c8', b: '#F2D5B5', c: '#B88561' },
      pat: { name: 'wave', color: 'rgba(184,133,97,.55)' } },
    'aqua':    { name: 'アクア', sheet: '/static/img/mahjong-tiles-aqua.jpg',
      face: { a: '#f2ffff', b: '#d6f4f8', c: '#b0e2ec' }, back: { a: '#a6f3fc', b: '#67E8F9', c: '#1594AE' },
      pat: { name: 'bubble', color: 'rgba(255,255,255,.65)' } },
    'candy':   { name: 'キャンディ', sheet: '/static/img/mahjong-tiles-candy.jpg',
      face: { a: '#fff5fb', b: '#fbe0f0', c: '#efc2dc' }, back: { a: '#fbc3df', b: '#F9A8D4', c: '#C4B5FD' },
      pat: { name: 'diag', color: 'rgba(255,240,246,.7)' } },
    'cosmic':  { name: 'コズミック', sheet: '/static/img/mahjong-tiles-cosmic.jpg',
      face: { a: '#f6f2ff', b: '#e2daf8', c: '#c9bdea' }, back: { a: '#c3b0ff', b: '#A78BFA', c: '#44306E' },
      pat: { name: 'orbit', color: 'rgba(68,48,110,.6)' } },
    'forest':  { name: 'フォレスト', sheet: '/static/img/mahjong-tiles-forest.jpg',
      face: { a: '#fbf6e2', b: '#ebe0be', c: '#d3c596' }, back: { a: '#e7ae6f', b: '#D99A56', c: '#6A5036' },
      pat: { name: 'mountain', color: 'rgba(106,80,54,.6)' } },
  };
  // アプリ全体の背景（color＝地の色、pat＝重ねる模様）
  var BGS = {
    'default': { name: '深緑', color: '#1a3a2a' },
    'navy':    { name: '青海波', color: '#16263d', pat: { name: 'seigaiha', color: 'rgba(255,255,255,.06)' } },
    'chidori': { name: '千鳥',   color: '#1a3a2a', pat: { name: 'chidori',  color: 'rgba(255,255,255,.07)' } },
    'sumi':    { name: '麻の葉', color: '#1f2124', pat: { name: 'asanoha',  color: 'rgba(255,255,255,.06)' } },
    'murasaki':{ name: '桜',     color: '#2c1745', pat: { name: 'sakura',   color: 'rgba(255,190,210,.12)' } },
    'hoshi':   { name: '星空',   color: '#101a38', pat: { name: 'hoshi',    color: 'rgba(255,230,150,.3)' } },
    // 2026-11-24：新しい背景。明るい色は文字が読めなくなるので、同じ色合いの暗い色にした
    'neon':    { name: 'ネオンシティ', color: '#0B1020', pat: { name: 'grid',    color: 'rgba(0,217,255,.14)' } },
    'latte':   { name: 'カフェラテ',   color: '#3b2b23', pat: { name: 'vstripe', color: 'rgba(242,213,181,.16)' } },
    'aqua':    { name: 'アクアブルー', color: '#063a52', pat: { name: 'wave',    color: 'rgba(156,217,232,.26)' } },
    'candy':   { name: 'キャンディ',   color: '#3a2358', pat: { name: 'polka',   color: 'rgba(244,167,197,.28)' } },
    'cosmic':  { name: 'コズミック',   color: '#110D24', pat: { name: 'hoshi',   color: 'rgba(216,190,255,.55)' } },
    'forest':  { name: 'フォレスト',   color: '#1e2b23', pat: { name: 'tree',    color: 'rgba(156,165,138,.25)' } },
  };
  var LOOK_TYPES = ['tile', 'table', 'bg'];

  // 卓（a=中央, b=外側, frame=縁, pat＝フェルトに重ねる模様。牌が見にくくならない濃さにする）
  var TABLES = {
    'default':  { name: '緑の卓',   a: '#1e7040', b: '#124d2a', frame: '#5a3012' },
    'night':    { name: '星空の卓', a: '#24476f', b: '#122740', frame: '#3a2a1a', pat: { name: 'hoshi', color: 'rgba(255,230,150,.3)' } },
    'crimson':  { name: '桜の卓',   a: '#c8172f', b: '#6e0814', frame: '#d4a537', pat: { name: 'sakura', color: 'rgba(255,200,210,.14)' } },
    'wine':     { name: '七宝の卓', a: '#7a2e3a', b: '#45161e', frame: '#2e1a10', pat: { name: 'shippo', color: 'rgba(255,220,180,.09)' } },
    'ichimatsu':{ name: '市松の卓', a: '#1e7040', b: '#124d2a', frame: '#5a3012', pat: { name: 'ichimatsu', color: 'rgba(0,0,0,.12)' } },
    'kokukin':  { name: '黒金の卓', a: '#34343a', b: '#0b0b0d', frame: '#e3b742', pat: { name: 'asanoha', color: 'rgba(227,183,66,.16)' } },
    'gold':     { name: '金の卓',   a: '#e2b043', b: '#8a5d0e', frame: '#3a1f05', pat: { name: 'seigaiha', color: 'rgba(58,31,5,.16)' } },
    // 2026-11-24：新しい卓
    'neon':     { name: 'ネオンの卓',     a: '#1d2f50', b: '#17243D', frame: '#00D9FF', pat: { name: 'diag',   color: 'rgba(0,217,255,.24)' } },
    'latte':    { name: 'カフェラテの卓', a: '#6e503f', b: '#624638', frame: '#B88561', pat: { name: 'dots',   color: 'rgba(255,235,210,.24)' } },
    'aqua':     { name: 'アクアの卓',     a: '#0a6c9c', b: '#075985', frame: '#bdf4fb', pat: { name: 'bubble', color: 'rgba(255,255,255,.30)' } },
    'candy':    { name: 'キャンディの卓', a: '#664a88', b: '#594078', frame: '#F9A8D4', pat: { name: 'dots',   color: 'rgba(255,255,255,.26)' } },
    'cosmic':   { name: 'コズミックの卓', a: '#33265a', b: '#281D46', frame: '#D8E5F0', pat: { name: 'orbit',  color: 'rgba(196,160,255,.30)' } },
    'forest':   { name: 'フォレストの卓', a: '#2c4a39', b: '#253D30', frame: '#D99A56', pat: { name: 'plaid',  color: 'rgba(231,213,172,.22)' } },
    // 2026-11-24：ごほうびの卓。モック12案からゆーしんが選んだ6つ（柄の拡大 zoom は対局画面の大きさに合わせてある）
    'fubuki':   { name: '桜吹雪の卓', a: '#a3173a', b: '#4f0a1e', frame: '#e8b84b', pat: { name: 'fubuki', color: '#ffffff', zoom: 2.4 } },
    'nami':     { name: '青海波の卓', a: '#1a3a6e', b: '#0b1733', frame: '#e8b84b', pat: { name: 'nami',   color: '#ffffff', zoom: 2.4 } },
    'kikko':    { name: '亀甲の卓',   a: '#26262c', b: '#0a0a0d', frame: '#e8b84b', pat: { name: 'kikko',  color: '#ffffff', zoom: 2.2 } },
    'seiza':    { name: '星座の卓',   a: '#16265a', b: '#070d24', frame: '#cfd8ff', pat: { name: 'seiza',  color: '#ffffff', zoom: 2.6 } },
    'trump':    { name: 'トランプの卓', a: '#0f6b3d', b: '#06371e', frame: '#c9a24a', pat: { name: 'suits', color: '#ffffff', zoom: 2.2 } },
    'hanabi':   { name: '花火の卓',   a: '#0e1538', b: '#04061a', frame: '#ff9ec7', pat: { name: 'hanabi', color: '#ffffff', zoom: 2.6 } },
  };

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  // 端末の日付で「今日」を決める（日付が変わったら次の1問）
  function today(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function addDays(dateStr, n) {
    var p = dateStr.split('-').map(Number);
    var d = new Date(p[0], p[1] - 1, p[2] + n);
    return today(d);
  }

  // 日付などの文字列から決まる乱数。同じ日に何度開いても同じ問題・同じ並びにするため
  function rng(seedText) {
    var h = 2166136261;
    for (var i = 0; i < seedText.length; i++) { h ^= seedText.charCodeAt(i); h = Math.imul(h, 16777619); }
    var a = h >>> 0;
    return function() {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(list, rand) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rand() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function emptyState() { return { days: 0, last: null, lastKey: null, lastCorrect: null, lastLearn: null, wrong: {} }; }

  function normalize(state) {
    var s = state || {};
    return {
      days: Number(s.days) || 0,
      last: s.last || null,
      lastKey: s.lastKey || null,
      lastCorrect: typeof s.lastCorrect === 'boolean' ? s.lastCorrect : null,
      // 学んだ日として最後に数えた日。この項目が無かったころの記録は、今日の1問に答えた日（last）で代わりにする
      lastLearn: s.lastLearn || s.last || null,
      wrong: s.wrong && typeof s.wrong === 'object' ? s.wrong : {},
    };
  }

  // 符と点数の問題（2026-11-07）：ゆーしん「分かりやすいけど、一回やってもすぐに忘れちゃう」（第10章を試して）→
  // 第10章の問題をそのまま今日の1問にも出す。第10章をクリアした人だけ。用語・役より数が少ないので、3日に1回くらいの割合で出す
  var FU_SHARE = 1 / 3;
  // 第10章（Chapters.ch10）から、今日の1問に使える問題を取り出す。id は「ミニゲーム番号-問題番号」
  function fuList(chapter) {
    var out = [];
    ((chapter && chapter.mgs) || []).forEach(function(mg, mi) {
      (mg.questions || []).forEach(function(q, qi) {
        if (q.text && q.choices && q.choices.indexOf(q.answer) >= 0) out.push({ id: mi + '-' + qi, mg: mi, q: q });
      });
    });
    return out;
  }
  function escHtml(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  // 問題の鍵：t:<用語の漢字>:r（読み）/ t:<漢字>:m（意味）/ y:<役id>:h（翻数）/ y:<役id>:c（条件）/ f:<第10章の問題id>（符・点数）
  function allKeys(data, includeYaku) {
    var keys = [];
    data.TERMS.forEach(function(t) { keys.push('t:' + t.kanji + ':r', 't:' + t.kanji + ':m'); });
    if (includeYaku) data.YAKU.forEach(function(y) { keys.push('y:' + y.id + ':h', 'y:' + y.id + ':c'); });
    return keys;
  }

  // 今日出す問題の鍵を決める。2日たった「間違えた問題」があれば、それを先に出す
  function pickKey(state, day, data, clearedCount) {
    var s = normalize(state);
    if (s.last === day && s.lastKey) return s.lastKey;
    var due = Object.keys(s.wrong)
      .filter(function(k) { return s.wrong[k] && s.wrong[k].due <= day && questionFor(k, data, day); })
      .sort(function(a, b) { return s.wrong[a].due < s.wrong[b].due ? -1 : s.wrong[a].due > s.wrong[b].due ? 1 : (a < b ? -1 : 1); });
    if (due.length) return due[0];
    // 必修（第1〜8章）を終えるまでは用語だけ。役は第8章から習うので、そのあとに混ぜる
    var rand = rng('pick:' + day);
    // 第10章（符と点数）をクリアしたら、符・点数の問題も混ぜる
    var fu = clearedCount >= 10 && data.FU ? data.FU : [];
    if (fu.length && rand() < FU_SHARE) return 'f:' + fu[Math.floor(rand() * fu.length)].id;
    var pool = allKeys(data, clearedCount >= 8);
    return pool[Math.floor(rand() * pool.length)];
  }

  // 鍵から問題を作る。選択肢の並びは日付と鍵で決まる
  function questionFor(key, data, day) {
    var parts = String(key).split(':');
    var kind = parts[0], id = parts[1], type = parts[2];
    var rand = rng('q:' + day + ':' + key);
    if (kind === 't') {
      var q = data.TERMS.filter(function(t) { return t.kanji === id; })[0];
      if (!q) return null;
      var others = shuffle(data.TERMS.filter(function(t) { return t.kanji !== q.kanji; }), rand).slice(0, 3);
      var expl = '<strong>' + q.kanji + '（' + q.reading + '）</strong><br>' + q.desc;
      if (type === 'r') {
        return { key: key, tag: '用語', head: '「' + q.kanji + '」', text: 'この用語の読み方は？', correct: q.reading,
          choices: shuffle([q.reading].concat(others.map(function(w) { return w.reading; })), rand), explanation: expl };
      }
      var full = function(t) { return t.kanji + '（' + t.reading + '）'; };
      return { key: key, tag: '用語', head: null, text: '次の説明にあてはまる用語は？\n「' + q.desc + '」', correct: full(q),
        choices: shuffle([full(q)].concat(others.map(full)), rand), explanation: expl };
    }
    if (kind === 'y') {
      var y = data.YAKU.filter(function(v) { return v.id === id; })[0];
      if (!y) return null;
      var hanStr = function(v) { return v.han === 'yakuman' ? '役満' : v.han + '翻'; };
      var yexpl = '<strong>' + y.name + '（' + y.reading + '）' + hanStr(y) + '</strong><br>' + y.condition;
      if (type === 'h') {
        var hans = shuffle(['1翻', '2翻', '3翻', '6翻', '役満'].filter(function(h) { return h !== hanStr(y); }), rand).slice(0, 3);
        return { key: key, tag: '役', head: y.name + '（' + y.reading + '）', text: 'この役は何翻？', correct: hanStr(y),
          choices: shuffle([hanStr(y)].concat(hans), rand), explanation: yexpl };
      }
      var cond = y.condition.length > 60 ? y.condition.slice(0, 60) + '…' : y.condition;
      var yname = function(v) { return v.name + '（' + v.reading + '）'; };
      var wrongY = shuffle(data.YAKU.filter(function(v) { return v.id !== y.id; }), rand).slice(0, 3);
      return { key: key, tag: '役', head: null, text: '次の成立条件の役は？\n「' + cond + '」', correct: yname(y),
        choices: shuffle([yname(y)].concat(wrongY.map(yname)), rand), explanation: yexpl };
    }
    if (kind === 'f') {
      var item = (data.FU || []).filter(function(f) { return f.id === id; })[0];
      if (!item) return null;
      var fq = item.q;
      // 手牌のある問題は、第10章と同じく面子ごとに区切って和了牌に印を付けて見せる（app.js が描く）
      return { key: key, tag: item.mg >= 5 ? '点数' : '符', head: null, text: fq.text, correct: fq.answer,
        choices: shuffle(fq.choices.slice(), rand), explanation: escHtml(fq.fb).replace(/\n/g, '<br>'),
        tiles: fq.tiles || null, groups: fq.groups || null, win: fq.win || null };
    }
    return null;
  }

  // 学んだ日を1日数える。同じ日はもう数えない（今日の1問と章のミニゲームのどちらで来ても同じ）
  function countDay(s, day) {
    if (s.lastLearn === day) return false;
    s.days += 1; s.lastLearn = day;
    return true;
  }

  // 答えた結果を反映する。同じ日の2回目は日数を増やさない
  function answer(state, day, key, isCorrect) {
    var s = normalize(state);
    var before = s.days;
    var first = s.last !== day;
    if (first) countDay(s, day);
    s.last = day; s.lastKey = key; s.lastCorrect = !!isCorrect;
    if (isCorrect) delete s.wrong[key];
    else s.wrong[key] = { due: addDays(day, RETRY_AFTER_DAYS) };
    return { state: s, firstToday: first, newRewards: rewardsBetween(before, s.days) };
  }

  // 章のミニゲームをクリアしたとき。その日まだ数えていなければ、学んだ日を1日増やす
  function learn(state, day) {
    var s = normalize(state);
    var before = s.days;
    var counted = countDay(s, day);
    return { state: s, counted: counted, newRewards: rewardsBetween(before, s.days) };
  }

  // 問題がどの章で習うことか。間違えたときに「その章でおさらい」へ案内するため
  //   用語は章が決まっていないので、用語辞典へ案内する（chapter: null）
  function sourceOf(key, data) {
    var parts = String(key).split(':');
    if (parts[0] === 'f') return { chapter: 10, label: '第10章「符と点数」' };
    if (parts[0] === 'y') {
      var y = (data.YAKU || []).filter(function(v) { return v.id === parts[1]; })[0];
      if (y && y.chapter) return { chapter: y.chapter, label: '第' + y.chapter + '章' };
      return y ? { chapter: null, page: 'yaku_detail', params: { id: y.id }, label: '役の説明' } : null;
    }
    if (parts[0] === 't') return { chapter: null, page: 'terms', params: {}, label: '用語辞典' };
    return null;
  }

  function rewardsBetween(fromDays, toDays) {
    return REWARDS.filter(function(r) { return r.days > fromDays && r.days <= toDays; });
  }

  function nextReward(days) {
    return REWARDS.filter(function(r) { return r.days > days; })[0] || null;
  }

  function isUnlocked(type, id, days) {
    if (id === 'default') return true;
    return REWARDS.some(function(r) { return r.type === type && r.id === id && r.days <= days; });
  }

  function requiredDays(type, id) {
    var r = REWARDS.filter(function(x) { return x.type === type && x.id === id; })[0];
    return r ? r.days : 0;
  }

  function rewardName(r) {
    if (r.type === 'title') return '称号「' + r.id + '」';
    if (r.type === 'tile') return '牌「' + TILES[r.id].name + '」';
    if (r.type === 'table') return '卓「' + TABLES[r.id].name + '」';
    if (r.type === 'bg') return '背景「' + BGS[r.id].name + '」';
    return '';
  }

  // ログインしたとき、端末の記録とクラウドの記録をまとめる。日数は消える方向にはいかない
  function merge(local, cloud) {
    var a = normalize(local), b = normalize(cloud);
    var base = a.days > b.days || (a.days === b.days && (a.last || '') >= (b.last || '')) ? a : b;
    var other = base === a ? b : a;
    var wrong = {};
    [other.wrong, base.wrong].forEach(function(w) {
      Object.keys(w).forEach(function(k) {
        if (!wrong[k] || (w[k] && w[k].due > wrong[k].due)) wrong[k] = w[k];
      });
    });
    var lastLearn = [a.lastLearn, b.lastLearn].filter(Boolean).sort().pop() || null;
    return { days: base.days, last: base.last, lastKey: base.lastKey, lastCorrect: base.lastCorrect, lastLearn: lastLearn, wrong: wrong };
  }

  return {
    REWARDS: REWARDS, HIDDEN_TABLES: HIDDEN_TABLES, TILES: TILES, TABLES: TABLES, BGS: BGS, LOOK_TYPES: LOOK_TYPES,
    PATTERNS: PATTERNS, patternUrl: patternUrl, patternZoom: patternZoom, patternSize: patternSize,
    RETRY_AFTER_DAYS: RETRY_AFTER_DAYS,
    today: today, addDays: addDays, emptyState: emptyState, normalize: normalize,
    pickKey: pickKey, questionFor: questionFor, answer: answer, learn: learn, sourceOf: sourceOf, fuList: fuList,
    rewardsBetween: rewardsBetween, nextReward: nextReward, isUnlocked: isUnlocked,
    requiredDays: requiredDays, rewardName: rewardName, merge: merge,
  };
})();
if (typeof window !== 'undefined') window.Daily = Daily;
