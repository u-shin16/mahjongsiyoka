'use strict';
// ============================================================
// 符計算・点数のテスト（2026-10-22）
//
// 実行:  sh tests/run.sh
//
// tests/fixtures/fu_reference.json は、Pythonの麻雀ライブラリ「mahjong」（天鳳ルール：
// 喰いタンあり・連風牌の雀頭4符・平和ツモ20符・切り上げ満貫なし）で
// 翻・符・点数・ツモの払い方を出した、ランダムなアガリ手400通り。
// アプリの計算（yaku.js）がこれと全部一致するかを見る。
// ゆーしんは符計算を知らないので、目で見て確かめる代わりにこれで確かめる。
// ============================================================
var __pass = 0, __fail = 0, __fails = [];
var cases = JSON.parse(readFile(FU_CASES));
function T(a) { return { suit: a[0], num: a[1], id: 't' + a[2] }; }
cases.forEach(function(c, i) {
  var conc = c.concealed.map(T);
  var win = conc.filter(function(t) { return t.id === 't' + c.win[2]; })[0];
  var melds = c.melds.map(function(m) { return { type: m[0], tiles: m[1].map(T) }; });
  var closed = melds.every(function(m) { return m.type === 'ankan'; });
  var dealer = c.seat === 1;
  var yaku = Yaku.computeShapeYaku(conc, melds, closed, c.seat, c.round, c.tsumo ? 'tsumo' : 'ron', win);
  var fu = yaku.fu;
  if (c.tsumo && closed) yaku.push({ name: '門前清自摸和', han: 1 });
  yaku = Yaku.onlyYakuman(yaku);
  var p = Yaku.calcPoints(yaku, dealer, fu);
  var e = c.expect, why = [];
  if (p.yakumanUnits === 0 && e.han < 13 && p.han !== e.han) why.push('翻 ' + p.han + '≠' + e.han);
  if (p.yakumanUnits === 0 && e.han < 5 && p.fu !== e.fu) why.push('符 ' + p.fu + '≠' + e.fu);
  var main = !c.tsumo ? p.pts : dealer ? p.tsumoEach : p.tsumoFromDealer;
  if (main !== e.main) why.push('点 ' + main + '≠' + e.main);
  if (c.tsumo && !dealer && p.tsumoFromChild !== e.additional) why.push('子払い ' + p.tsumoFromChild + '≠' + e.additional);
  if (why.length) { __fail++; if (__fails.length < 10) __fails.push((i + 1) + '番目: ' + why.join(' / ')); } else __pass++;
});

// 符の早見表どおりになるか（代表的な形）
function eq(title, a, b) { if (a === b) __pass++; else { __fail++; __fails.push(title + ': ' + a + '≠' + b); } }
eq('1翻30符 子ロン', Yaku.calcPoints([{ han: 1 }], false, 30).pts, 1000);
eq('3翻20符 子ツモ（親払い）', Yaku.calcPoints([{ han: 3 }], false, 20).tsumoFromDealer, 1300);
eq('3翻20符 子ツモ（子払い）', Yaku.calcPoints([{ han: 3 }], false, 20).tsumoFromChild, 700);
eq('2翻25符 子ロン（七対子）', Yaku.calcPoints([{ han: 2 }], false, 25).pts, 1600);
eq('4翻30符は満貫にしない（切り上げ満貫なし）', Yaku.calcPoints([{ han: 4 }], false, 30).pts, 7700);
eq('4翻40符は満貫', Yaku.calcPoints([{ han: 4 }], false, 40).label, '満貫');
eq('3翻70符は満貫', Yaku.calcPoints([{ han: 3 }], false, 70).pts, 8000);
eq('親 2翻40符ロン', Yaku.calcPoints([{ han: 2 }], true, 40).pts, 3900);
eq('親 1翻40符ツモ（オール）', Yaku.calcPoints([{ han: 1 }], true, 40).tsumoEach, 700);
eq('符を省けば30符（以前の点数表と同じ）', Yaku.calcPoints([{ han: 2 }], true).pts, 2900);

print('=== 符計算・点数のテスト（参照ライブラリとの答え合わせ' + cases.length + '通り＋早見表） ===');
print('通過: ' + __pass + ' / 失敗: ' + __fail);
if (__fails.length) { print('--- 失敗した項目 ---'); __fails.forEach(function(f) { print(f); }); }
