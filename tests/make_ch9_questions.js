'use strict';
// ============================================================
// 第9章「符と点数」の問題を作る道具（2026-10-23）
//
// 実行:  sh tests/make_ch9.sh   （中でJavaScriptCoreを使う。run.shと同じ作り）
//
// 手牌と状況だけを書いておくと、アプリの本物の計算（yaku.js の computeShapeYaku・calcPoints）で
// 符・翻・点数・内訳を出して、chapters.js に貼れる問題の形で印字する。
// 答えは人の手で書かず、計算結果をそのまま使う（答え合わせは tests/ch9_test.js が毎回行う）。
// ============================================================

var SUIT = { m: 'man', p: 'pin', s: 'sou' };
var WIND_NAME = ['', '東', '南', '西', '北'];
var DRAGON_NAME = ['', '白', '發', '中'];
var SUIT_NAME = { man: '萬', pin: '筒', sou: '索' };

// '234m55p7z' → [{suit,num}...]（字牌は 1〜4z＝東南西北、5〜7z＝白發中）
function parse(str) {
  var out = [], nums = [];
  for (var i = 0; i < str.length; i++) {
    var c = str[i];
    if (c === ' ') continue;
    if (c >= '0' && c <= '9') { nums.push(+c); continue; }
    nums.forEach(function(n) {
      if (c === 'z') out.push(n <= 4 ? { suit: 'wind', num: n } : { suit: 'dragon', num: n - 4 });
      else out.push({ suit: SUIT[c], num: n });
    });
    nums = [];
  }
  return out;
}
function tileName(t) {
  if (t.suit === 'wind') return WIND_NAME[t.num];
  if (t.suit === 'dragon') return DRAGON_NAME[t.num];
  return t.num + SUIT_NAME[t.suit];
}
function same(a, b) { return a.suit === b.suit && a.num === b.num; }

// 状況から、アプリの計算で答えを出す
function solve(spec) {
  var tiles = parse(spec.hand).map(function(t) { return Tiles.make(t.suit, t.num); });
  var wt = parse(spec.win)[0];
  var win = tiles.filter(function(t) { return same(t, wt); })[0];
  if (!win) throw new Error('和了牌が手牌に無い: ' + spec.hand + ' / ' + spec.win);
  if (tiles.length !== 14) throw new Error('14枚ではない: ' + spec.hand);
  var seat = spec.seat || 2, round = spec.round || 1;
  var yaku = Yaku.computeShapeYaku(tiles, [], true, seat, round, spec.type, win);
  var fu = yaku.fu, fuDetail = yaku.fuDetail;
  var list = yaku.slice();
  if (spec.type === 'tsumo') list.push({ name: '門前清自摸和', han: 1 });
  (spec.extras || []).forEach(function(e) { list.push(e); });
  if (spec.dora) list.push({ name: 'ドラ', han: spec.dora });
  var dealer = seat === 1;
  var p = Yaku.calcPoints(list, dealer, fu);
  return { tiles: parse(spec.hand), win: wt, seat: seat, round: round, type: spec.type, yaku: list, fu: fu, fuDetail: fuDetail, p: p, dealer: dealer, spec: spec };
}

function situation(s) {
  var seatLabel = s.dealer ? '親' : '子';
  var t = '東場・' + WIND_NAME[s.seat] + '家（' + seatLabel + '）。';
  var ex = (s.spec.extras || []).map(function(e) { return e.name === '立直' ? '立直をかけて' : e.name; });
  if (s.spec.dora) ex.push('ドラ' + s.spec.dora + '枚');
  if (ex.length) t += ex.join('、') + '、';
  return t + (s.type === 'tsumo' ? 'ツモ' : 'ロン') + 'でアガリ。和了牌は' + tileName(s.win) + '。';
}
function fuText(s) {
  return s.fuDetail.map(function(d) { return d.name + d.fu; }).join('＋');
}
function pointText(s) {
  var p = s.p;
  if (s.type === 'ron') return p.pts + '点';
  return s.dealer ? p.tsumoEach + '点オール' : p.tsumoFromChild + '・' + p.tsumoFromDealer + '点';
}
// 同じ形式の「ありそうな間違い」を作る（翻や符を1つずらす）
function pointChoices(s) {
  var seen = {}, out = [];
  function add(h, f) {
    var q = Yaku.calcPoints([{ name: 'x', han: h }], s.dealer, f);
    var txt = s.type === 'ron' ? q.pts + '点' : (s.dealer ? q.tsumoEach + '点オール' : q.tsumoFromChild + '・' + q.tsumoFromDealer + '点');
    if (!seen[txt]) { seen[txt] = 1; out.push(txt); }
  }
  var h = s.p.han, f = s.fu;
  add(h, f);
  add(h, f === 20 ? 30 : f + 10);
  add(h, f <= 30 ? 20 : f - 10);
  add(h + 1, f);
  add(h - 1, f);
  add(h + 1, f + 10);
  add(h + 2, f);
  return out.slice(0, 4);
}

// specs（ch9_specs.json の中身）から、ミニゲーム⑤⑥の問題を作る
function buildCh9(specs) {
  var fuQs = specs.fu.map(function(spec) {
    var s = solve(spec);
    return {
      tiles: s.tiles,
      text: situation(s) + '何符？',
      choices: [20, 30, 40, 50].map(function(n) { return n + '符'; }),
      answer: s.fu + '符',
      fb: s.fu + '符！内訳は ' + fuText(s) + '。'
    };
  });
  var ptQs = specs.points.map(function(spec) {
    var s = solve(spec);
    var yakuText = s.yaku.map(function(y) { return y.name + y.han; }).join('＋');
    return {
      tiles: s.tiles,
      text: situation(s) + '点数は？',
      choices: pointChoices(s),
      answer: pointText(s),
      fb: yakuText + '＝' + s.p.han + '翻。符は' + s.fu + '符。' + (s.p.label.indexOf('符') < 0 ? s.p.label + '！' : '') +
        (s.dealer ? '親' : '子') + 'の' + (s.type === 'tsumo' ? 'ツモ' : 'ロン') + 'で ' + pointText(s) + '。'
    };
  });
  return { fu: fuQs, points: ptQs };
}

function q(str) { return "'" + str + "'"; }
function emit(x) {
  return '          { tiles: [' + x.tiles.map(function(t) { return '{suit:' + q(t.suit) + ',num:' + t.num + '}'; }).join(',') + '],\n' +
    '            text: ' + q(x.text) + ',\n' +
    '            choices: [' + x.choices.map(q).join(',') + '], answer: ' + q(x.answer) + ',\n' +
    '            fb: ' + q(x.fb) + ' },';
}
// テストから読み込むときは SPECS を定義しない（関数だけ使う）
if (typeof SPECS !== 'undefined') {
  var built = buildCh9(JSON.parse(readFile(SPECS)));
  print('=== 符 ===');
  built.fu.forEach(function(x) { print(emit(x)); });
  print('=== 点数 ===');
  built.points.forEach(function(x) { print(emit(x)); });
}
