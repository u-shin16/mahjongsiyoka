'use strict';
// ============================================================
// 今日の1問・ごほうび（daily.js）のテスト
//
// 実行:  sh tests/run.sh
// ============================================================
var __pass = 0, __fail = 0;
function check(name, cond) {
  if (cond) { __pass++; } else { __fail++; print('NG: ' + name); }
}

print('=== 今日の1問・ごほうび ===');

// 日付
check('日付の足し算（月またぎ）', Daily.addDays('2026-10-30', 2) === '2026-11-01');
check('日付の足し算（年またぎ）', Daily.addDays('2026-12-31', 1) === '2027-01-01');

// 同じ日は同じ問題・同じ並び。日が変われば問題が変わることがある
var s0 = Daily.emptyState();
var k1 = Daily.pickKey(s0, '2026-10-15', GameData, 0);
check('同じ日は同じ問題', k1 === Daily.pickKey(s0, '2026-10-15', GameData, 0));
var q1 = Daily.questionFor(k1, GameData, '2026-10-15');
var q1b = Daily.questionFor(k1, GameData, '2026-10-15');
check('同じ日は同じ並び', JSON.stringify(q1.choices) === JSON.stringify(q1b.choices));
check('選択肢は4つで、正解が1つだけ入っている', q1.choices.length === 4 && q1.choices.filter(function(c) { return c === q1.correct; }).length === 1);
var diff = 0;
for (var d = 1; d <= 20; d++) {
  if (Daily.pickKey(s0, '2026-11-' + (d < 10 ? '0' + d : d), GameData, 0) !== k1) diff++;
}
check('日が変わると問題が変わる', diff >= 15);

// 必修を終えるまでは用語だけ
var onlyTerms = true;
for (var d2 = 1; d2 <= 28; d2++) {
  if (Daily.pickKey(s0, '2026-12-' + (d2 < 10 ? '0' + d2 : d2), GameData, 3).indexOf('t:') !== 0) onlyTerms = false;
}
check('必修の途中は用語だけ出す', onlyTerms);

// すべての鍵から問題が作れる（役も含む）
var bad = 0;
GameData.TERMS.forEach(function(t) {
  ['r', 'm'].forEach(function(ty) {
    var q = Daily.questionFor('t:' + t.kanji + ':' + ty, GameData, '2026-10-15');
    if (!q || q.choices.length !== 4 || q.choices.indexOf(q.correct) < 0) bad++;
  });
});
GameData.YAKU.forEach(function(y) {
  ['h', 'c'].forEach(function(ty) {
    var q = Daily.questionFor('y:' + y.id + ':' + ty, GameData, '2026-10-15');
    if (!q || q.choices.length !== 4 || q.choices.indexOf(q.correct) < 0) bad++;
  });
});
check('用語・役のすべてで問題が作れる', bad === 0);

// 答えると日数が増える。同じ日の2回目は増えない
var r1 = Daily.answer(s0, '2026-10-15', k1, true);
check('1日目で日数1', r1.state.days === 1 && r1.firstToday);
check('1日目のごほうびは称号「はじめの一歩」', r1.newRewards.length === 1 && r1.newRewards[0].id === 'はじめの一歩');
var r1b = Daily.answer(r1.state, '2026-10-15', k1, true);
check('同じ日の2回目は日数が増えない', r1b.state.days === 1 && !r1b.firstToday && r1b.newRewards.length === 0);
check('答えた日は同じ問題を返す', Daily.pickKey(r1.state, '2026-10-15', GameData, 0) === k1);

// 間違えた問題は2日後に先に出る。正解すると消える
var wrongKey = 't:聴牌:r';
var r2 = Daily.answer(r1.state, '2026-10-16', wrongKey, false);
check('間違えた問題は2日後の予定に入る', r2.state.wrong[wrongKey].due === '2026-10-18');
check('次の日はまだ出ない（予定より前）', Daily.pickKey(r2.state, '2026-10-17', GameData, 0) !== wrongKey);
check('2日後に先に出る', Daily.pickKey(r2.state, '2026-10-18', GameData, 0) === wrongKey);
var r3 = Daily.answer(r2.state, '2026-10-18', wrongKey, true);
check('正解すると間違えた問題から消える', !r3.state.wrong[wrongKey]);

// 合計日数で数える（間が空いても0に戻らない）
var st = Daily.emptyState();
['2026-10-01', '2026-10-05', '2026-10-20'].forEach(function(day) { st = Daily.answer(st, day, 't:聴牌:r', true).state; });
check('間が空いても合計で数える', st.days === 3);
check('3日目で牌の裏「藍色」が使える', Daily.isUnlocked('back', 'indigo', 3) && !Daily.isUnlocked('back', 'indigo', 2));
check('はじめからの見た目はいつでも使える', Daily.isUnlocked('table', 'default', 0));
var r7 = Daily.rewardsBetween(6, 7).map(function(r) { return r.id; }).join(',');
check('7日目は称号と夜の卓', r7 === '麻雀好き,night');
check('次のごほうびが分かる', Daily.nextReward(3).days === 7 && Daily.nextReward(30) === null);

// ログインしたときのまとめ方：日数の多い方を残し、間違えた問題は両方を合わせる
var m = Daily.merge(
  { days: 5, last: '2026-10-10', wrong: { a: { due: '2026-10-12' } } },
  { days: 8, last: '2026-10-09', wrong: { b: { due: '2026-10-11' }, a: { due: '2026-10-14' } } }
);
check('日数は多い方', m.days === 8 && m.last === '2026-10-09');
check('間違えた問題は両方を合わせ、遅い予定を残す', m.wrong.a.due === '2026-10-14' && m.wrong.b.due === '2026-10-11');
check('記録が無くても壊れない', Daily.merge(null, undefined).days === 0);

print('通過: ' + __pass + ' / 失敗: ' + __fail);
