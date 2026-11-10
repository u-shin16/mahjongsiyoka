'use strict';
// 友人戦のCPU席がSorekiriで打牌を選べているかのテスト（Node.jsで実行）
//   node tests/friend_cpu_test.js
// 確認すること：
//   1. 四人・三人とも、重みを入れるとSorekiriの打牌が呼ばれる（呼び出し回数 > 0）
//   2. 重みが無いときは従来のCPUの判断で動く（例外が出ない）
//   3. 選んだ牌の位置が、いつも手牌の範囲に収まっている
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..');

function makeContext(withWeights) {
  const ctx = vm.createContext({ console, Math, Promise, window: {}, setTimeout, clearTimeout, Date });
  ['tiles.js', 'agari.js', 'yaku.js', 'sorekiri.js', 'friend.js'].forEach((f) => {
    vm.runInContext(fs.readFileSync(path.join(root, 'static/js', f), 'utf8'), ctx, { filename: f });
  });
  vm.runInContext('globalThis.Tiles = Tiles; globalThis.FriendGame = FriendGame; globalThis.Sorekiri = Sorekiri;', ctx);
  if (withWeights) {
    [['yonma', 'sorekiri_v1.bin'], ['sanma', 'sorekiri_v1s.bin']].forEach(([mode, f]) => {
      const buf = fs.readFileSync(path.join(root, 'static/models', f));
      ctx.Sorekiri.setWeights(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), mode);
    });
  }
  return ctx;
}

function run(n, withWeights) {
  const ctx = makeContext(withWeights);
  const { FriendGame, Sorekiri } = ctx;
  let calls = 0, bad = 0, total = 0;
  const orig = Sorekiri.chooseDiscardIndex;
  Sorekiri.chooseDiscardIndex = function () { calls++; return orig.apply(this, arguments); };
  for (let k = 0; k < 200; k++) {
    const state = {
      seq: 0, playerCount: n, isSanma: n === 3, round: 1 + (k % n), roundLimit: n * 2,
      rules: { reserveSeconds: 10, startScore: 25000 }, scores: Array(n).fill(25000),
    };
    FriendGame._test.deal(state);
    for (let seat = 0; seat < n; seat++) {
      const idx = FriendGame._test.cpuChooseDiscard(state, seat);
      total++;
      if (!(idx >= 0 && idx < state.hands[seat].length)) bad++;
    }
  }
  return { calls, bad, total };
}

let fail = 0;
function check(name, ok, info) { console.log((ok ? '通過 ' : '失敗 ') + name + ' ' + (info || '')); if (!ok) fail++; }

[4, 3].forEach((n) => {
  const w = run(n, true);
  check(n + '人・重みあり：Sorekiriが呼ばれる', w.calls > 0, 'calls=' + w.calls + '/' + w.total);
  check(n + '人・重みあり：牌の位置が範囲内', w.bad === 0, 'bad=' + w.bad);
  const o = run(n, false);
  check(n + '人・重みなし：従来の判断で動く（Sorekiriは呼ばれない）', o.calls === 0 && o.bad === 0, 'calls=' + o.calls + ' bad=' + o.bad);
});
console.log(fail === 0 ? '\nすべて通過しました。' : '\n失敗: ' + fail);
process.exit(fail ? 1 : 0);
