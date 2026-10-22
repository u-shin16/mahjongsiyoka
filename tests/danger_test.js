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
print('=== 安全度の目安のテスト（Sorekiri本体との答え合わせ' + cases.length + '通り） ===');
print('通過: ' + __pass + ' / 失敗: ' + __fail);
if (__fails.length) { print('--- 失敗した項目 ---'); __fails.slice(0, 10).forEach(function(f) { print(f); }); }
