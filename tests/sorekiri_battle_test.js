'use strict';
// ============================================================
// 本物のCPU戦（battle.js）でSorekiriを動かすテスト（Node.jsで実行）
//
//   node tests/sorekiri_battle_test.js [局数]
//
// あなた（席0）は何も考えずツモ切りだけをして、CPU3人の打ち方を比べる。
// 確認すること：
//   1. Sorekiriの難易度でも局が最後まで終わる（例外が出ない）
//   2. Sorekiriが実際に使われている（打牌・鳴きの呼び出し回数）
//   3. 従来の「つよい」「やさしい」とCPUの和了率を比べる
// ============================================================
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const rounds = parseInt(process.argv[2] || '300', 10);

function makeContext() {
  const ctx = vm.createContext({ console, Math, Promise, window: {}, setTimeout, clearTimeout });
  ['tiles.js', 'agari.js', 'yaku.js', 'sorekiri.js', 'battle.js'].forEach((f) => {
    vm.runInContext(fs.readFileSync(path.join(root, 'static/js', f), 'utf8'), ctx, { filename: f });
  });
  vm.runInContext('globalThis.Tiles = Tiles; globalThis.Battle = Battle; globalThis.Sorekiri = Sorekiri;', ctx);
  [['yonma', 'sorekiri_v1.bin'], ['sanma', 'sorekiri_v1s.bin']].forEach(([mode, f]) => {
    const buf = fs.readFileSync(path.join(root, 'static/models', f));
    ctx.Sorekiri.setWeights(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), mode);
  });
  return ctx;
}

function playRounds(difficulty, playerCount) {
  const ctx = makeContext();
  const { Battle, Sorekiri } = ctx;
  const calls = { discard: 0, call: 0 };
  const origDiscard = Sorekiri.chooseDiscardIndex;
  const origCall = Sorekiri.decideCall;
  Sorekiri.chooseDiscardIndex = function () { calls.discard++; return origDiscard.apply(this, arguments); };
  Sorekiri.decideCall = function () { calls.call++; return origCall.apply(this, arguments); };

  const result = { rounds: 0, cpuWin: 0, playerWin: 0, ryukyoku: 0, stuck: 0, cpuCalled: 0 };
  for (let r = 0; r < rounds; r++) {
    Battle.init({ difficulty, gameType: 'tonpu', playerCount });
    const st = Battle.getState();
    let guard = 0;
    while (!['end', 'ryukyoku', 'match_end'].includes(st.phase) && guard++ < 400) {
      if (st.phase === 'player_turn') {
        // 三人麻雀：北を引いたら抜く（抜かないと進まない場面を避ける）
        if (playerCount === 3 && Battle.canNuki && Battle.canNuki()) { Battle.playerNuki(); continue; }
        if (Battle.canTsumo()) { Battle.playerTsumo(); continue; }
        Battle.playerDiscard(st.hands[0].length - 1);
      } else if (st.phase === 'pending_ron') {
        Battle.playerRonSkip();
      } else if (st.phase === 'pending_call') {
        Battle.skipCall();
      } else {
        break;
      }
    }
    result.rounds++;
    if (st.phase === 'end') { if (st.winner > 0) result.cpuWin++; else result.playerWin++; }
    else if (st.phase === 'ryukyoku') result.ryukyoku++;
    else result.stuck++;
    for (let s = 1; s < playerCount; s++) if (st.melds[s].length) { result.cpuCalled++; break; }
  }
  return { result, calls };
}

let failed = false;
[4, 3].forEach((pc) => {
  console.log(`--- ${pc === 3 ? '三人麻雀' : '四人麻雀'} ---`);
  ['sorekiri_hard', 'sorekiri_normal', 'sorekiri_easy', 'hard', 'easy'].forEach((d) => {
    const { result, calls } = playRounds(d, pc);
    const pct = (n) => (100 * n / result.rounds).toFixed(1) + '%';
    console.log(`${d.padEnd(15)} ${result.rounds}局  CPUがアガった ${pct(result.cpuWin)}  流局 ${pct(result.ryukyoku)}  ` +
      `CPUが鳴いた局 ${pct(result.cpuCalled)}  終わらなかった ${result.stuck}  ` +
      `（Sorekiri呼び出し 打牌${calls.discard}回・鳴き${calls.call}回）`);
    if (result.stuck > 0) failed = true;
    if (d.startsWith('sorekiri') && calls.discard === 0) { console.log('Sorekiriが使われていない'); failed = true; }
    if (!d.startsWith('sorekiri') && (calls.discard || calls.call)) { console.log('他の難易度でSorekiriが使われている'); failed = true; }
  });
});
if (failed) { console.log('失敗'); process.exit(1); }
console.log('成功');
