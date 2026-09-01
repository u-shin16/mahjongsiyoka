'use strict';
// ============================================================
// 公開APIのテスト（battle.js が app.js から呼ばれる関数を持っているか）
//
// 実行:  sh tests/run.sh
//
// 2026-09-01に、別の関数を消したときに周りの公開APIを8個まとめて
// 消してしまい、対局開始が例外で止まる状態のまま本番へ出した。
// 構文チェックでも役判定のテストでも見つからなかったため、
// 「画面が呼ぶ関数が存在するか」を直接確かめる。
// ============================================================
var window = this;

var REQUIRED = [
  'init','getState','getDoraTile','getRoundLabel','nextRound','isMatchOver',
  'countDora','playerDiscard','playerTsumo','playerRiichi',
  'playerRonAccept','playerRonSkip','calcScore','settleScore','settleRyukyoku',
  'getRiichiCandidates','isFuriten','hasYaku',
  'playerNuki','canNuki','isNukiTile','canTsumo','canRiichi',
  'playerDiscardNaki','playerPon','playerChi','playerKan','playerAnkan','playerKakan',
  'skipCall','checkAnkan','checkKakan','getPlayerCallOptions',
  'PLAYER_NAMES','WIND_NAMES','WIND_READINGS','seatWindNum',
];

var pass = 0, fail = 0, fails = [];
REQUIRED.forEach(function(name) {
  if (typeof Battle[name] === 'undefined') { fail++; fails.push('Battle.' + name + ' が無い'); }
  else pass++;
});

// 対局開始の直後に画面が呼ぶものは、実際に呼んで例外が出ないことまで見る
function callable(label, fn) {
  try { fn(); pass++; }
  catch (e) { fail++; fails.push(label + ' で例外: ' + e); }
}
[3, 4].forEach(function(pc) {
  var label = pc + '人打ち';
  callable(label + ' の init', function() { Battle.init({ playerCount: pc, gameType: 'tonpu' }); });
  callable(label + ' の canTsumo',   function() { Battle.canTsumo(); });
  callable(label + ' の canRiichi',  function() { Battle.canRiichi(); });
  callable(label + ' の isFuriten',  function() { Battle.isFuriten(0); });
  callable(label + ' の canNuki',    function() { Battle.canNuki(); });
  callable(label + ' の getRiichiCandidates', function() { Battle.getRiichiCandidates(); });
  callable(label + ' の getRoundLabel',       function() { Battle.getRoundLabel(); });
  callable(label + ' の countDora',  function() { Battle.countDora(Battle.getState().hands[0]); });
  callable(label + ' の seatWindNum', function() { Battle.seatWindNum(0); });
  callable(label + ' の hasYaku', function() {
    Battle.hasYaku(0, 'ron', { suit: 'man', num: 1, id: 'apitest' });
  });
});

print('');
print('=== 公開APIのテスト ===');
print('通過: ' + pass + ' / 失敗: ' + fail);
if (fails.length) {
  print('');
  print('--- 失敗した項目 ---');
  fails.forEach(function(f, i) { print((i + 1) + '. ' + f); });
  print('');
}
