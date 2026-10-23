'use strict';
// ============================================================
// 第9章（翻・符・点数）の問題が、アプリの計算と一致しているかのテスト（2026-10-23）
//
// ミニゲーム⑤（符を数えよう）と⑥（点数を出そう）の問題は、tests/ch9_specs.json の手牌を
// 本物の計算（yaku.js）にかけて作ってある（tests/make_ch9.sh）。
// 計算のほうを直したのに問題の答えが古いまま、を防ぐため、毎回作り直して
// chapters.js の中身と同じかを見る。
// ============================================================
var __pass = 0, __fail = 0, __fails = [];
function ok(title, cond) { if (cond) __pass++; else { __fail++; __fails.push(title); } }

var specs = JSON.parse(readFile('ch9_specs.json'));
var built = buildCh9(specs);
var mgs = Chapters.ch9.mgs;
ok('第9章のミニゲームは6つ', mgs.length === 6);

function compareSet(title, data, mg) {
  ok(title + '：問題数が同じ', mg.questions.length === data.length);
  data.forEach(function(d, i) {
    var q = mg.questions[i] || {};
    var name = title + ' ' + (i + 1) + '問目';
    ok(name + '：本文が計算結果と同じ', q.text === d.text);
    ok(name + '：答えが計算結果と同じ（' + d.answer + '）', q.answer === d.answer);
    ok(name + '：解説が計算結果と同じ', q.fb === d.fb);
    ok(name + '：手牌が同じ', JSON.stringify(q.tiles) === JSON.stringify(d.tiles));
    ok(name + '：選択肢が同じ', JSON.stringify((q.choices || []).slice().sort()) === JSON.stringify(d.choices.slice().sort()));
  });
}
compareSet('⑤符', built.fu, mgs[4]);
compareSet('⑥点数', built.points, mgs[5]);

// どの問題も、答えが選択肢にあり、合格ラインが問題数以内で、選択肢に重複が無い
mgs.forEach(function(mg, mi) {
  ok('ミニゲーム' + (mi + 1) + '：合格ラインが問題数以内', mg.passNeeded <= mg.questions.length);
  mg.questions.forEach(function(q, qi) {
    if (mg.type !== 'choice') return; // 牌を選ぶ形（ミニゲーム②）は対象外
    var n = 'ミニゲーム' + (mi + 1) + ' ' + (qi + 1) + '問目';
    ok(n + '：答えが選択肢にある', q.choices.indexOf(q.answer) >= 0);
    ok(n + '：選択肢に重複が無い', q.choices.filter(function(c, i) { return q.choices.indexOf(c) === i; }).length === q.choices.length);
  });
});

// 手牌はすべて14枚（和了形）
mgs.slice(4).forEach(function(mg, mi) {
  mg.questions.forEach(function(q, qi) {
    ok('ミニゲーム' + (mi + 5) + ' ' + (qi + 1) + '問目：手牌14枚', q.tiles.length === 14);
  });
});

// ④のしくみ：計算に使う符の値と問題の答えが合っているか
var yaochuTri = Yaku.computeFu({ chiitoitsu: false, pair: [{suit:'man',num:5},{suit:'man',num:5}], groups: [
  { kind:'triplet', tiles:[{suit:'man',num:9,id:'a'},{suit:'man',num:9,id:'b'},{suit:'man',num:9,id:'c'}], concealed:true, isKan:false },
  { kind:'sequence', tiles:[{suit:'pin',num:3},{suit:'pin',num:4},{suit:'pin',num:5}], concealed:true },
  { kind:'sequence', tiles:[{suit:'sou',num:3},{suit:'sou',num:4},{suit:'sou',num:5}], concealed:true },
  { kind:'sequence', tiles:[{suit:'man',num:2},{suit:'man',num:3},{suit:'man',num:4}], concealed:true }
] }, false, 2, 1, 'tsumo', null, []);
var detail = yaochuTri.detail.map(function(d) { return d.name + d.fu; }).join(',');
ok('么九牌の暗刻は8符（' + detail + '）', yaochuTri.detail.some(function(d) { return d.fu === 8; }));
var s4 = mgs[3].questions;
ok('⑥符のしくみ：么九牌の暗刻の答えは8符', s4.some(function(q) { return /么九牌/.test(q.text) && q.answer === '8符'; }));
ok('⑥符のしくみ：副底の答えは20符', s4.some(function(q) { return /副底/.test(q.text) && q.answer === '20符'; }));
ok('⑥符のしくみ：32符は40符へ切り上げ', s4.some(function(q) { return /32符/.test(q.text) && q.answer === '40符'; }));

print('=== 第9章（翻・符・点数）の問題のテスト ===');
print('通過: ' + __pass + ' / 失敗: ' + __fail);
if (__fails.length) { print('--- 失敗した項目 ---'); __fails.slice(0, 15).forEach(function(f) { print(f); }); }
