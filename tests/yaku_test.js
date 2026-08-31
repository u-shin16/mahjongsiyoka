'use strict';
// ============================================================
// 役判定・点数計算のテスト（yaku.js / agari.js / tiles.js）
//
// 実行:  sh tests/run.sh
//
// ブラウザを立ち上げずに役判定だけを確かめる。macOS内蔵の
// JavaScriptCore(jsc)で動かすので、追加のインストールは要らない。
//
// 和了牌は「手牌の中にある実オブジェクト」を渡すこと。平和の判定が
// 牌のidで和了位置を探すため、同じ牌でも別インスタンスだと成立しない。
// battle.js/friend.js は実際に同じオブジェクトを渡している。
// ============================================================
var window = this;

function m(n){return {suit:'man',num:n,id:'m'+n+'_'+(Math.random())};}
function p(n){return {suit:'pin',num:n,id:'p'+n+'_'+(Math.random())};}
function s(n){return {suit:'sou',num:n,id:'s'+n+'_'+(Math.random())};}
function w(n){return {suit:'wind',num:n,id:'w'+n+'_'+(Math.random())};}
function d(n){return {suit:'dragon',num:n,id:'d'+n+'_'+(Math.random())};}
function rep(f,n,k){var a=[];for(var i=0;i<k;i++)a.push(f(n));return a;}
function last(h){ return h[h.length-1]; }

var pass=0, fail=0, fails=[];
function check(title, hand, opts, expectNames, expectHan) {
  opts = opts || {};
  var y;
  try {
    y = Yaku.computeShapeYaku(hand, opts.open || [], opts.closed !== false,
      opts.seat || 1, opts.round || 1, opts.winType || 'ron', opts.winTile);
  } catch (e) { fail++; fails.push(title + ' → 例外: ' + e); return; }
  if (!y) { fail++; fails.push(title + ' → 和了形と認識されなかった'); return; }
  var names = y.map(function(x){return x.name;});
  var pts = Yaku.calcPoints(y);
  var missing = (expectNames||[]).filter(function(n){ return names.indexOf(n) < 0; });
  var banned = (opts.notExpect||[]).filter(function(n){ return names.indexOf(n) >= 0; });
  var ok = missing.length === 0 && banned.length === 0 && (expectHan == null || pts.han === expectHan);
  if (ok) { pass++; return; }
  fail++;
  fails.push(title
    + '\n    出た役: ' + (names.join('・')||'なし') + '（' + pts.han + '翻 ' + pts.label + ' ' + pts.pts + '点）'
    + (missing.length ? '\n    出るべきだった役: ' + missing.join('・') : '')
    + (banned.length ? '\n    出てはいけない役: ' + banned.join('・') : '')
    + (expectHan != null && pts.han !== expectHan ? '\n    翻数が違う: 期待' + expectHan + ' 実際' + pts.han : ''));
}

// ---- 基本の役 ----
check('断幺九（234m 456p 678s 22s 345m）',
  [].concat(rep(m,2,1),rep(m,3,1),rep(m,4,1), [m(3),m(4),m(5)], [p(4),p(5),p(6)], [s(6),s(7),s(8)], [s(2),s(2)]),
  {winTile:s(8)}, ['断幺九']);

var pinfuHand = [m(2),m(3),m(4), p(3),p(4),p(5), s(5),s(6),s(7), p(2),p(2), m(6),m(7),m(8)];
check('平和（門前・リャンメン待ち）', pinfuHand, {winTile:pinfuHand[13]}, ['平和']);

check('一盃口（234m×2）',
  [m(2),m(3),m(4), m(2),m(3),m(4), p(3),p(4),p(5), s(6),s(7),s(8), p(9),p(9)],
  {winTile:s(8)}, ['一盃口']);

var ryanpeiHand = [m(2),m(3),m(4), m(2),m(3),m(4), p(5),p(6),p(7), s(9),s(9), p(5),p(6),p(7)];
check('二盃口（234m×2 + 567p×2）', ryanpeiHand, {winTile:ryanpeiHand[13]}, ['二盃口']);

check('三色同順（123 三色）',
  [m(1),m(2),m(3), p(1),p(2),p(3), s(1),s(2),s(3), m(7),m(8),m(9), d(1),d(1)],
  {winTile:m(9)}, ['三色同順']);

check('一気通貫（123456789m）',
  [m(1),m(2),m(3),m(4),m(5),m(6),m(7),m(8),m(9), p(2),p(3),p(4), s(5),s(5)],
  {winTile:p(4)}, ['一気通貫']);

check('対々和（刻子4つ）',
  [].concat(rep(m,2,3), rep(p,5,3), rep(s,7,3), rep(w,1,3), [d(3),d(3)]),
  {winTile:w(1)}, ['対々和']);

check('七対子',
  [m(1),m(1), m(5),m(5), p(2),p(2), p(8),p(8), s(3),s(3), s(9),s(9), d(2),d(2)],
  {winTile:d(2)}, ['七対子'], 2);

check('混一色（萬子＋字牌・門前）',
  [].concat([m(1),m(2),m(3)], [m(5),m(6),m(7)], rep(d,1,3), rep(w,1,3), [m(9),m(9)]),
  {winTile:m(3)}, ['混一色']);

check('清一色（萬子のみ・門前）',
  [m(1),m(2),m(3), m(4),m(5),m(6), m(7),m(8),m(9), m(2),m(3),m(4), m(6),m(6)],
  {winTile:m(4)}, ['清一色']);

check('混全帯幺九（チャンタ）',
  [m(1),m(2),m(3), p(7),p(8),p(9), s(1),s(2),s(3), rep(d,1,3)[0],rep(d,1,3)[1],rep(d,1,3)[2], w(1),w(1)],
  {winTile:m(3)}, ['混全帯幺九']);

check('純全帯幺九（ジュンチャン）',
  [m(1),m(2),m(3), p(7),p(8),p(9), s(1),s(2),s(3), m(7),m(8),m(9), p(1),p(1)],
  {winTile:m(3)}, ['純全帯幺九']);

check('三暗刻',
  [].concat(rep(m,2,3), rep(p,5,3), rep(s,7,3), [m(6),m(7),m(8)], [d(1),d(1)]),
  {winTile:m(8)}, ['三暗刻']);

check('小三元',
  [].concat(rep(d,1,3), rep(d,2,3), [d(3),d(3)], [m(2),m(3),m(4)], [p(5),p(6),p(7)]),
  {winTile:p(7)}, ['小三元']);

check('役牌 白（自風東・場風東）',
  [].concat(rep(d,1,3), [m(2),m(3),m(4)], [p(5),p(6),p(7)], [s(3),s(4),s(5)], [m(8),m(8)]),
  {winTile:s(5)}, ['白']);

check('連風牌（自風東・場風東の東の刻子）',
  [].concat(rep(w,1,3), [m(2),m(3),m(4)], [p(5),p(6),p(7)], [s(3),s(4),s(5)], [m(8),m(8)]),
  {seat:1, round:1, winTile:s(5)}, ['連風牌']);

// ---- 役満 ----
var kokushi13 = [m(1),m(9),p(1),p(9),s(1),s(9),w(1),w(2),w(3),w(4),d(1),d(2),d(3), m(1)];
check('国士無双十三面待ち', kokushi13, {winTile:kokushi13[13]}, ['国士無双十三面待ち']);

check('大三元',
  [].concat(rep(d,1,3), rep(d,2,3), rep(d,3,3), [m(2),m(3),m(4)], [p(5),p(5)]),
  {winTile:m(4)}, ['大三元']);

check('四暗刻（ツモ）',
  [].concat(rep(m,2,3), rep(p,5,3), rep(s,7,3), rep(w,1,3), [d(3),d(3)]),
  {winType:'tsumo', winTile:w(1)}, ['四暗刻']);

check('字一色',
  [].concat(rep(w,1,3), rep(w,2,3), rep(d,1,3), rep(d,2,3), [d(3),d(3)]),
  {winTile:d(3)}, ['字一色']);

check('清老頭',
  [].concat(rep(m,1,3), rep(m,9,3), rep(p,1,3), rep(s,9,3), [p(9),p(9)]),
  {winTile:s(9)}, ['清老頭']);

check('緑一色',
  [].concat([s(2),s(3),s(4)], [s(2),s(3),s(4)], rep(s,6,3), rep(d,2,3), [s(8),s(8)]),
  {winTile:s(8)}, ['緑一色']);

check('小四喜',
  [].concat(rep(w,1,3), rep(w,2,3), rep(w,3,3), [w(4),w(4)], [m(2),m(3),m(4)]),
  {winTile:m(4)}, ['小四喜']);

check('大四喜',
  [].concat(rep(w,1,3), rep(w,2,3), rep(w,3,3), rep(w,4,3), [m(5),m(5)]),
  {winTile:m(5)}, ['大四喜']);

check('九蓮宝燈（純正）',
  [m(1),m(1),m(1),m(2),m(3),m(4),m(5),m(6),m(7),m(8),m(9),m(9),m(9), m(5)],
  {winTile:m(5)}, ['純正九蓮宝燈']);

// ---- 鳴いている場合 ----
check('鳴き三色同順（食い下がり1翻）',
  [m(1),m(2),m(3), p(1),p(2),p(3), m(7),m(8),m(9), d(1),d(1)],
  {closed:false, open:[{type:'chi', tiles:[s(1),s(2),s(3)]}], winTile:m(9)}, ['三色同順']);

check('鳴き混一色（食い下がり2翻）',
  [m(1),m(2),m(3), m(5),m(6),m(7), w(1),w(1),w(1), m(9),m(9)],
  {closed:false, open:[{type:'pon', tiles:[d(1),d(1),d(1)]}], winTile:m(3)}, ['混一色']);


var h1 = [m(2),m(3),m(4), p(3),p(4),p(5), s(5),s(6),s(7), p(2),p(2), m(6),m(7),m(8)];
check('平和（門前・678mの8m待ち）', h1, {winTile:last(h1)}, ['平和']);

var h2 = [m(2),m(3),m(4), m(2),m(3),m(4), p(5),p(6),p(7), s(9),s(9), p(5),p(6),p(7)];
check('二盃口（234m×2 + 567p×2）※七対子とも読める形', h2, {winTile:last(h2)}, ['二盃口']);

var h3 = [m(1),m(9),p(1),p(9),s(1),s(9),w(1),w(2),w(3),w(4),d(1),d(2),d(3), m(1)];
check('国士無双十三面待ち', h3, {winTile:last(h3)}, ['国士無双十三面待ち']);

// 追加：平和が付いてはいけない形
var h4 = [m(2),m(3),m(4), p(3),p(4),p(5), s(5),s(6),s(7), p(2),p(2), m(6),m(8),m(7)];
check('カンチャン待ちには平和が付かない（678mの7m待ち）', h4, {winTile:last(h4)}, [], null);

var h5 = [m(1),m(2),m(3), p(3),p(4),p(5), s(5),s(6),s(7), d(1),d(1), m(7),m(8),m(9)];
check('役牌の雀頭には平和が付かない（白の対子）', h5, {winTile:last(h5)}, [], null);

// 追加：純粋な七対子（二盃口には読めない形）
var h6 = [m(1),m(1), m(5),m(5), p(2),p(2), p(8),p(8), s(3),s(3), s(9),s(9), d(2),d(2)];
check('七対子（二盃口には読めない形）', h6, {winTile:last(h6)}, ['七対子'], 2);

// ============================================================
// 回帰テスト：2026-08-31に見つけて直した2件
// ============================================================

// (1) 二盃口が一度も成立しなかった件
//     二盃口の手は牌の並びが必ず7つの対子にもなるため、常に七対子として
//     読まれて2翻に落ちていた。高点法で高いほうを採るよう直した。
var rp1=[m(1),m(2),m(3),m(1),m(2),m(3),p(4),p(5),p(6),s(8),s(8),p(4),p(5),p(6)];
check('二盃口 123m123m 456p456p 88s', rp1, {winTile:last(rp1)}, ['二盃口','平和'], 4);
var rp2=[s(2),s(3),s(4),s(2),s(3),s(4),m(5),m(6),m(7),p(9),p(9),m(5),m(6),m(7)];
check('二盃口 234s234s 567m567m 99p', rp2, {winTile:last(rp2)}, ['二盃口'], 4);
var rp3=[p(2),p(3),p(4),p(2),p(3),p(4),p(6),p(7),p(8),p(9),p(9),p(6),p(7),p(8)];
check('二盃口＋清一色（筒子のみ）', rp3, {winTile:last(rp3)}, ['二盃口','清一色'], 9);
var rp4=[m(7),m(8),m(9),m(7),m(8),m(9),s(1),s(2),s(3),w(1),w(1),s(1),s(2),s(3)];
check('二盃口＋混全帯幺九', rp4, {winTile:last(rp4)}, ['二盃口','混全帯幺九']);

// (2) 七対子に断幺九が付かなかった件
//     混老頭・清一色・字一色は付くのに断幺九だけ抜けていた。
var c1=[m(2),m(2),m(4),m(4),p(3),p(3),p(6),p(6),s(5),s(5),s(7),s(7),s(8),s(8)];
check('七対子＋断幺九（全部中張牌）', c1, {winTile:last(c1)}, ['七対子','断幺九'], 3);
var c2=[m(1),m(1),m(9),m(9),p(1),p(1),p(9),p(9),s(1),s(1),w(1),w(1),d(1),d(1)];
check('七対子＋混老頭（断幺九は付かない）', c2,
  {winTile:last(c2), notExpect:['断幺九']}, ['七対子','混老頭'], 4);
var c3=[p(1),p(1),p(3),p(3),p(4),p(4),p(6),p(6),p(7),p(7),p(8),p(8),p(9),p(9)];
check('七対子＋清一色（断幺九は付かない）', c3,
  {winTile:last(c3), notExpect:['断幺九']}, ['七対子','清一色'], 8);

// 高点法で通常形を採っても、七対子のほうが高い手は七対子のまま
var c4=[m(1),m(1),m(3),m(3),m(5),m(5),m(7),m(7),m(9),m(9),p(2),p(2),p(4),p(4)];
check('七対子として読むほうが高い手は七対子のまま', c4, {winTile:last(c4)}, ['七対子']);

print('');
print('=== 役判定テスト ===');
print('通過: ' + pass + ' / 失敗: ' + fail);
if (fails.length) {
  print('');
  print('--- 失敗した項目 ---');
  fails.forEach(function(f, i){ print((i+1) + '. ' + f); });
  print('');
}
