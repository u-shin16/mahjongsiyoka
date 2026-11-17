'use strict';
// ============================================================
// 「AIに聞く」の安全度の目安（Sorekiri.dangerOfTile）のテスト（2026-10-22）
//
// 実行:  sh tests/run.sh
//
// tests/fixtures/danger_reference.json は、Sorekiri本体（Python・制作物/sorekiri/danger.py）で
// 振り込む確率を出したランダムな場面300通り。JavaScript版がこれと一致するかを見る。
// ============================================================
var __pass = 0, __fail = 0, __fails = [];
function ok(title, cond) { if (cond) __pass++; else { __fail++; __fails.push(title); } }
var cases = JSON.parse(readFile(DANGER_CASES));
cases.forEach(function(c, i) {
  var d = Sorekiri.dangerOfTile(c.sample, c.tile);
  var got = d ? d.prob : null;
  ok((i + 1) + '番目: ' + c.tile + ' ' + got + '≠' + c.prob, got !== null && Math.abs(got - c.prob) < 1e-9);
});
var base = { hand: ['1m','2m','3m','5p','5p','east','east','7s','8s','9s','2p','3p','4p'], calls: {}, doraIndicators: ['9s'], gameMode: 'yonma',
  discards: { self: [], right: ['5p', '1s'], top: [], left: [] } };
ok('リーチがいなければ何も出さない', Sorekiri.dangerOfTile(Object.assign({}, base, { riichi: { right: false, top: false, left: false } }), '5p') === null);
var r = Object.assign({}, base, { riichi: { right: true, top: false, left: false } });
ok('現物（リーチした人が捨てた牌）は0%', Sorekiri.dangerOfTile(r, '5p').prob === 0);
ok('字牌（2枚見えている東）は、真ん中の数牌（5索）より安全', Sorekiri.dangerOfTile(r, 'east').prob < Sorekiri.dangerOfTile(r, '5s').prob);
var two = Object.assign({}, base, { riichi: { right: true, top: true, left: false } });
ok('リーチが2人なら危なさは増える', Sorekiri.dangerOfTile(two, '5s').prob > Sorekiri.dangerOfTile(r, '5s').prob);
// 2026-11-17：リーチが無くても出す安全度（dangerOfTileAll）
var noR = Object.assign({}, base, { riichi: { right: false, top: false, left: false } });
var a0 = Sorekiri.dangerOfTileAll(noR, '5s');
ok('リーチが無くても値が出る', a0 !== null && a0.riichiCount === 0);
ok('だれも鳴いていなければ、ほぼ危なくない（1%未満）', a0.prob < 0.01);
var late = ['1m','9m','north','west','1p','9p','south','white','1s','9s','green','red','2m'];
var open2 = Object.assign({}, noR, {
  discards: { self: [], right: late, top: [], left: [] },
  calls: { right: [{ type: 'pon', tiles: ['white','white','white'] }, { type: 'chi', tiles: ['3s','4s','5s'] }] } });
ok('2回鳴いて河が12枚の相手がいると、真ん中の数牌は危なくなる', Sorekiri.dangerOfTileAll(open2, '5p').prob > a0.prob);
ok('鳴いている相手にも現物は0%', Sorekiri.dangerOfTileAll(open2, '9p').prob === 0 || Sorekiri.dangerOfTileAll(open2, '9p').prob < 1e-12);
ok('リーチ相手だけの場面は dangerOfTile と同じ', Math.abs(Sorekiri.dangerOfTileAll(r, '5s').prob - Sorekiri.dangerOfTile(r, '5s').prob) < 1e-12);
ok('リーチ相手の数を返す', Sorekiri.dangerOfTileAll(two, '5s').riichiCount === 2);
// 2026-11-17：鳴かれる確率（callProb）
var c = function(s, t) { return Sorekiri.dangerOfTileAll(s, t).callProb; };
ok('鳴かれる確率は0〜1', c(noR, '5s') >= 0 && c(noR, '5s') < 1);
ok('見えていない白（三元牌）は、2枚見えている東より鳴かれやすい', c(noR, 'white') > c(noR, 'east'));
var allR = Object.assign({}, base, { riichi: { right: true, top: true, left: true } });
ok('全員リーチなら鳴かれない', c(allR, 'white') === 0);
var sanma = Object.assign({}, noR, { gameMode: 'sanma' });
var noPairs = Object.assign({}, noR, { discards: { self: [], right: ['5s', '5s'], top: ['5s'], left: [] } });
ok('ポンできない（残り1枚）数牌でも、下家のチーの分は残る', c(noPairs, '5s') > 0);
ok('三人麻雀ではチーが無いので、残り1枚の数牌は鳴かれない', c(Object.assign({}, noPairs, { gameMode: 'sanma' }), '5s') === 0);
ok('三人麻雀でも値は出る', c(sanma, 'white') > 0);
print('=== 安全度の目安のテスト（Sorekiri本体との答え合わせ' + cases.length + '通り） ===');
print('通過: ' + __pass + ' / 失敗: ' + __fail);
if (__fails.length) { print('--- 失敗した項目 ---'); __fails.slice(0, 10).forEach(function(f) { print(f); }); }
