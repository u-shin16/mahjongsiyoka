'use strict';

var Battle = (function() {
  var PLAYER_NAMES = ['あなた', 'CPU1', 'CPU2', 'CPU3'];
  var PLAYER_NAME_SETS = {
    3: ['あなた', 'CPU1', 'CPU2'],
    4: ['あなた', 'CPU1', 'CPU2', 'CPU3'],
  };
  var WIND_NAMES = ['東', '南', '西', '北'];
  var WIND_READINGS = ['トン', 'ナン', 'シャー', 'ペー'];

  var state = null;

  function setPlayerNames(playerCount) {
    var names = PLAYER_NAME_SETS[playerCount] || PLAYER_NAME_SETS[4];
    PLAYER_NAMES.splice(0, PLAYER_NAMES.length);
    Array.prototype.push.apply(PLAYER_NAMES, names);
  }

  function makePlayerArray(playerCount, value) {
    var arr = [];
    for (var i = 0; i < playerCount; i++) {
      arr.push(typeof value === 'function' ? value(i) : value);
    }
    return arr;
  }

  function getRoundLimit(gameType, playerCount) {
    return (gameType === 'hanchan' ? 2 : 1) * playerCount;
  }

  function init(opts) {
    opts = opts || {};
    var playerCount = opts.playerCount === 3 ? 3 : 4;
    setPlayerNames(playerCount);
    state = {
      playerCount: playerCount,
      isSanma: playerCount === 3,
      wall: [],
      hands: [],
      discards: [],
      turn: 0,
      round: 1,
      roundLimit: getRoundLimit(opts.gameType, playerCount),
      gameType: opts.gameType || 'tonpu',
      roundWind: 0,
      dealerSeat: 0,
      honba: 0,
      kyokuNum: 1,
      kyotaku: 0,   // 場に出ている立直棒の本数（和了者が全部回収する）
      scores: makePlayerArray(playerCount, playerCount === 3 ? 35000 : 25000),
      doraIndicator: null,
      kanDoraIndicators: [],
      riichi: makePlayerArray(playerCount, false),
      ippatsuActive: makePlayerArray(playerCount, false),
      riichiDouble: makePlayerArray(playerCount, false),
      rinshanPending: false,
      tempFuriten: makePlayerArray(playerCount, false),
      riichiFuriten: makePlayerArray(playerCount, false),
      riichiDiscardIdx: null,   // 自分のリーチ宣言牌が河の何枚目か（横向き表示用）
      nuki: makePlayerArray(playerCount, function() { return []; }),
      melds:  makePlayerArray(playerCount, function() { return []; }),
      callPending:    null,   // pending_call 時に鳴き選択肢を保存
      nakiResumeFrom: null,   // 鳴き後の再開CPU番号
      phase: 'drawing',
      winner: -1,
      loser: -1,
      winType: '',
      winTile: null,
      pendingRon: null,
      selectedIdx: -1,
      aiAdvice: '',
      difficulty: opts.difficulty || 'easy',
      settled: false,
      lastScore: null,
      ryukyokuSettled: false,
      lastRyukyoku: null,
    };
    startRound();
  }

  function startRound() {
    var wall = state.isSanma ? Tiles.makeSanmaFull() : Tiles.makeFull();
    var hands = [], discards = [];
    for (var i = 0; i < state.playerCount; i++) {
      hands.push(wall.splice(0, 13));
      discards.push([]);
    }
    state.wall = wall;
    state.hands = hands;
    state.discards = discards;
    state.turn = 0;
    state.doraIndicator = wall.pop();
    state.uraDoraIndicator = wall.pop();   // 裏ドラ表示牌（リーチしてアガったときだけ公開）
    state.riichi           = makePlayerArray(state.playerCount, false);
    state.ippatsuActive     = makePlayerArray(state.playerCount, false);
    state.riichiDouble      = makePlayerArray(state.playerCount, false);
    state.rinshanPending    = false;
    state.tempFuriten      = makePlayerArray(state.playerCount, false);
    state.riichiFuriten    = makePlayerArray(state.playerCount, false);
    state.nuki             = makePlayerArray(state.playerCount, function() { return []; });
    state.melds            = makePlayerArray(state.playerCount, function() { return []; });
    state.callPending      = null;
    state.nakiResumeFrom   = null;
    state.kanDoraIndicators = [];
    state.phase = 'drawing';
    state.winner = -1;
    state.loser = -1;
    state.winType = '';
    state.winTile = null;
    state.pendingRon = null;
    state.selectedIdx = -1;
    state.aiAdvice = '';
    state.settled = false;
    state.lastScore = null;
    state.ryukyokuSettled = false;
    state.lastRyukyoku = null;
    state.riichiWaits = [];
    // リーチ宣言牌の位置。局をまたいで残ると、リーチしていないのに
    // 同じ枚数目の捨て牌が横向きになってしまうため必ず戻す
    state.riichiDiscardIdx = null;
    state.drewTile = null;
    drawForPlayer();
  }

  function drawForPlayer() {
    if (state.wall.length === 0) { state.phase = 'ryukyoku'; return; }
    state.rinshanPending = false;
    var t = state.wall.pop();
    state.hands[0].push(t);
    state.drewTile = t.id;
    state.phase = 'player_turn';
  }

  function getRoundLabel() {
    if (!state) return '東1局';
    var wind = WIND_NAMES[Math.min(state.roundWind, WIND_NAMES.length - 1)];
    var label = wind + (state.kyokuNum || 1) + '局';
    if (state.honba) label += ' ' + state.honba + '本場';
    return label;
  }

  // 親が和了ったら連荘（同じ人が親のまま、本場だけ増える）。
  // それ以外（子が和了、または流局）は親が次の席に移り、方角（局）が進む。
  function nextRound() {
    if (!state) return false;
    if (state.round >= state.roundLimit) {
      state.phase = 'match_end';
      return false;
    }
    var dealerWon = state.phase === 'end' && state.winner === state.dealerSeat;
    state.round++;
    if (dealerWon) {
      state.honba = (state.honba || 0) + 1;
    } else {
      state.dealerSeat = (state.dealerSeat + 1) % state.playerCount;
      state.honba = 0;
      state.kyokuNum = (state.kyokuNum || 1) + 1;
      if (state.kyokuNum > state.playerCount) {
        state.kyokuNum = 1;
        state.roundWind = (state.roundWind || 0) + 1;
      }
    }
    startRound();
    return true;
  }

  // 表示牌からドラ本体を求める（9→1、北→東、中→白と一周する）
  function doraFromIndicator(ind) {
    if (!ind) return null;
    var s = ind.suit, n = ind.num;
    if (s === 'wind')   return Tiles.make('wind',   n === 4 ? 1 : n + 1);
    if (s === 'dragon') return Tiles.make('dragon', n === 3 ? 1 : n + 1);
    return Tiles.make(s, n === 9 ? 1 : n + 1);
  }

  function getDora() {
    return doraFromIndicator(state.doraIndicator);
  }

  function countDora(hand) {
    var dora = getDora();
    if (!dora) return 0;
    return hand.filter(function(t) { return Tiles.isSame(t, dora); }).length;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //   役判定・点数計算は yaku.js の共通エンジン(Yaku)を使う。
  //   ここにあるのは、このアプリのstate構造をYakuの引数形式に
  //   変換するための薄いアダプター関数だけ。
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  // 手牌が門前（鳴きなし。暗カンのみは門前扱い）かどうか
  function isClosed(seat) {
    var melds = (state.melds && state.melds[seat]) || [];
    return melds.every(function(m) { return m.type === 'ankan'; });
  }

  // 手牌＋副露牌をすべて集めた「採点対象牌」（ドラ・裏ドラのカウント用）
  function getScoringTiles(seat) {
    var tiles = (state.hands[seat] || []).slice();
    var melds = (state.melds && state.melds[seat]) || [];
    melds.forEach(function(m) { (m.tiles || []).forEach(function(t) { tiles.push(t); }); });
    return tiles;
  }

  // 親（dealerSeat）からの相対位置で自風を求める（親＝東、以下反時計回りに南→西→北）
  function seatWindNum(seat) {
    var n = state.playerCount;
    return ((seat - state.dealerSeat + n) % n) + 1;
  }
  function roundWindNum() { return state.roundWind + 1; }

  // 和了形から成立する役（形に依存するもの）を判定する。
  // 立直・門前清自摸和・ドラ類・抜き北は calcScore 側で別途加算する。
  function computeShapeYaku(winner, winType, winningTile) {
    var hand = state.hands[winner] || [];
    // ロンの場合、役の形をチェックする時点ではまだ和了牌が自分の手牌に
    // 加わっていないことがある（放銃した側の牌のまま判定するため）。
    // 手牌に含まれていなければここで加えてから渡さないと、常に
    // 未完成の形として扱われて役なし判定になってしまう（ロンできない
    // 不具合の原因だった）。既に手牌に入っている場合（和了確定後の
    // 最終計算等）は二重に加えない
    if (winType === 'ron' && winningTile && !hand.some(function(t) { return t.id === winningTile.id; })) {
      hand = hand.concat([winningTile]);
    }
    var openMelds = state.melds[winner] || [];
    return Yaku.computeShapeYaku(hand, openMelds, isClosed(winner), seatWindNum(winner), roundWindNum(), winType, winningTile);
  }


  function isNukiTile(tile) {
    return !!(state && state.isSanma && tile && tile.suit === 'wind' && tile.num === 4);
  }

  function findNukiIdx(pidx) {
    if (!state || !state.hands[pidx]) return -1;
    for (var i = 0; i < state.hands[pidx].length; i++) {
      if (isNukiTile(state.hands[pidx][i])) return i;
    }
    return -1;
  }

  function drawReplacement(pidx) {
    if (state.wall.length === 0) {
      state.phase = 'ryukyoku';
      return null;
    }
    var replacement = state.wall.pop();
    state.hands[pidx].push(replacement);
    return replacement;
  }

  function playerNuki(tileIdx) {
    if (!state || !state.isSanma || state.phase !== 'player_turn') return null;
    var idx = typeof tileIdx === 'number' && tileIdx >= 0 ? tileIdx : findNukiIdx(0);
    if (idx < 0 || !isNukiTile(state.hands[0][idx])) return null;

    var tile = state.hands[0].splice(idx, 1)[0];
    state.nuki[0].push(tile);
    var replacement = drawReplacement(0);
    state.drewTile = replacement ? replacement.id : null;
    state.selectedIdx = -1;
    return { tile: tile, replacement: replacement };
  }

  function autoNukiForCPU(pidx) {
    if (!state || !state.isSanma) return 0;
    var count = 0;
    while (state.phase !== 'ryukyoku') {
      var idx = findNukiIdx(pidx);
      if (idx < 0) break;
      state.nuki[pidx].push(state.hands[pidx].splice(idx, 1)[0]);
      count++;
      drawReplacement(pidx);
    }
    return count;
  }

  // seat を渡すと、その席の副露・抜き北も「自分が使っている牌」として数える。
  // 同じ牌は4枚しかないので、4枚使い切っている牌は待ちにならない。
  function getBattleWaits(tiles, seat) {
    var used = [];
    if (state && seat != null) {
      (state.melds[seat] || []).forEach(function(m) { used = used.concat(m.tiles || []); });
      used = used.concat(state.nuki[seat] || []);
    }
    var waits = Agari.getTenpaiWaits(tiles, used);
    if (!state || !state.isSanma) return waits;
    return waits.filter(function(w) {
      return w.suit !== 'man' || w.num === 1 || w.num === 9;
    });
  }

  // フリテン：以下のいずれかに該当する席はロン不可（ツモは可）
  // 1. 自分の捨て牌の中に、今の待ち牌が含まれている（永久）
  // 2. 同巡内に一度でも当たり牌の見逃しがあった（次の自分の打牌まで）
  // 3. リーチ後に当たり牌を見逃した（そのまま局が終わるまで）
  function isFuriten(seat) {
    if (state.riichiFuriten[seat]) return true;
    if (state.tempFuriten[seat]) return true;
    var waits = getBattleWaits(state.hands[seat], seat);
    return Yaku.isFuritenBySelf(waits, state.discards[seat]);
  }

  // 当たり牌の見逃し（ロンできたのにしなかった）をフリテンとして記録する
  function markMissedRon(seat) {
    if (state.riichi[seat]) state.riichiFuriten[seat] = true;
    else state.tempFuriten[seat] = true;
  }

  function calcShanten(tiles) {
    var sorted = Tiles.sortTiles(tiles);
    var n = sorted.length;
    // Estimate shanten with a greedy set-count
    var used = new Array(n).fill(false);
    var sets = 0;

    // Count triplets
    for (var i = 0; i < n; i++) {
      if (used[i]) continue;
      var same = [i];
      for (var j = i + 1; j < n && same.length < 3; j++) {
        if (!used[j] && Tiles.isSame(sorted[i], sorted[j])) same.push(j);
      }
      if (same.length >= 3) { sets++; same.forEach(function(k) { used[k] = true; }); }
    }

    // Count sequences
    for (var i = 0; i < n; i++) {
      if (used[i]) continue;
      var t = sorted[i];
      if (t.suit === 'wind' || t.suit === 'dragon') continue;
      var i2 = -1, i3 = -1;
      for (var j = i + 1; j < n; j++) {
        if (!used[j] && sorted[j].suit === t.suit) {
          if (sorted[j].num === t.num + 1 && i2 < 0) i2 = j;
          else if (sorted[j].num === t.num + 2 && i3 < 0) i3 = j;
        }
      }
      if (i2 >= 0 && i3 >= 0) { sets++; used[i] = used[i2] = used[i3] = true; }
    }

    var needed = Math.ceil(n / 3);
    return Math.max(0, needed - sets - 1);
  }

  function cpuChooseDiscard(pidx) {
    var hand = state.hands[pidx];
    if (state.difficulty === 'easy' && Math.random() < 0.35) {
      return Math.floor(Math.random() * hand.length);
    }
    var best = hand.length - 1, bestSh = 99;
    for (var i = 0; i < hand.length; i++) {
      var rest = hand.filter(function(_, j) { return j !== i; });
      var sh = calcShanten(rest);
      // Prefer to keep useful tiles; discard honors/terminals first if high shanten
      var penalty = 0;
      var t = hand[i];
      if (sh > 2) {
        if (t.suit === 'wind' || t.suit === 'dragon') penalty = -1;
        else if (t.num === 1 || t.num === 9) penalty = -0.5;
      }
      if (state.difficulty === 'hard' && Tiles.isSame(t, getDora())) penalty += 1.5;
      var score = sh + penalty;
      if (score < bestSh) { bestSh = score; best = i; }
    }
    return best;
  }

  function playerDiscard(tileIdx) {
    var discarded = state.hands[0].splice(tileIdx, 1)[0];
    state.discards[0].push(discarded);
    state.selectedIdx = -1;
    state.drewTile = null;
    // 自分の打牌で同巡内フリテンは解消（永久フリテンは解消されない）
    state.tempFuriten[0] = false;

    // リーチ宣言後、自分の次の打牌が来たら一発のチャンスは終わり
    if (state.ippatsuActive[0]) {
      state.ippatsuActive[0] = false;
    }

    // CPU ロンチェック（フリテン・役なしの席はロンできない）
    for (var i = 1; i < state.playerCount; i++) {
      if (isFuriten(i)) continue;
      var test = state.hands[i].slice();
      test.push(discarded);
      if (Agari.isWinningHand(test) && hasYaku(i, 'ron', discarded)) {
        state.hands[i].push(discarded);
        state.winner = i; state.loser = 0;
        state.winType = 'ron'; state.winTile = discarded;
        state.phase = 'end';
        return;
      }
    }

    // CPU 鳴きチェック（リーチ中は相手に鳴かれない）
    if (!state.riichi[0]) {
      for (var ci = 1; ci < state.playerCount; ci++) {
        var cpuCall = cpuDecideCall(ci, discarded, 0);
        if (cpuCall) {
          cpuExecuteCall(ci, cpuCall, discarded, 0);
          cpuDiscardAfterNaki(ci);
          if (state.phase === 'end' || state.phase === 'ryukyoku') return;
          runCPUTurns(ci + 1);
          return;
        }
      }
    }

    runCPUTurns();
  }

  // 鳴き後に手番を持ったプレイヤーが捨て牌するフェーズ
  function playerDiscardNaki(tileIdx) {
    if (!state || state.phase !== 'naki_discard') return;
    var resumeFrom = state.nakiResumeFrom;
    state.nakiResumeFrom = null;

    var discarded = state.hands[0].splice(tileIdx, 1)[0];
    state.discards[0].push(discarded);
    state.selectedIdx = -1;
    state.drewTile = null;
    // 自分の打牌で同巡内フリテンは解消（永久フリテンは解消されない）
    state.tempFuriten[0] = false;
    // （鳴いた時点で全員の一発は既に消えている。念のためここでも保証）
    state.ippatsuActive = makePlayerArray(state.playerCount, false);

    // CPU ロンチェック（フリテン・役なしの席はロンできない）
    for (var i = 1; i < state.playerCount; i++) {
      if (isFuriten(i)) continue;
      var test = state.hands[i].slice();
      test.push(discarded);
      if (Agari.isWinningHand(test) && hasYaku(i, 'ron', discarded)) {
        state.hands[i].push(discarded);
        state.winner = i; state.loser = 0;
        state.winType = 'ron'; state.winTile = discarded;
        state.phase = 'end';
        return;
      }
    }

    // CPU 鳴きチェック
    for (var ci = 1; ci < state.playerCount; ci++) {
      var cpuCall = cpuDecideCall(ci, discarded, 0);
      if (cpuCall) {
        cpuExecuteCall(ci, cpuCall, discarded, 0);
        cpuDiscardAfterNaki(ci);
        if (state.phase === 'end' || state.phase === 'ryukyoku') return;
        runCPUTurns(ci + 1);
        return;
      }
    }

    runCPUTurns(resumeFrom !== null ? resumeFrom : undefined);
  }

  function playerTsumo() {
    state.winner = 0;
    state.loser = -1;
    state.winType = 'tsumo';
    state.winTile = state.hands[0][state.hands[0].length - 1];
    state.phase = 'end';
  }

  function playerRiichi(tileIdx) {
    state.riichi[0] = true;
    state.scores[0] -= 1000;
    state.kyotaku = (state.kyotaku || 0) + 1;
    // ダブルリーチ：自分の最初の打牌で、かつそれまで誰も鳴いていなければ成立
    var noCallsYet = state.melds.every(function(m) { return !m || m.length === 0; });
    state.riichiDouble[0] = noCallsYet && state.discards[0].length === 0;
    // リーチ宣言牌のインデックスを記録（捨てた後の discards 長さ = インデックス）
    state.riichiDiscardIdx = state.discards[0].length;
    // 捨てた後の13枚で待ち牌を計算して保存
    var afterDiscard = state.hands[0].filter(function(_, i) { return i !== tileIdx; });
    state.riichiWaits = getBattleWaits(afterDiscard, 0);
    playerDiscard(tileIdx);
    // リーチ宣言牌の捨て後に一発フラグをセット
    // （playerDiscard内でippatsuActiveリセットを試みるが、宣言時はfalseのため影響なし）
    if (state.phase !== 'end') {
      state.ippatsuActive[0] = true;
    }
  }

  // テンパイできるかつ、どの牌を切ればテンパイかを返す（リーチ候補牌のactual index一覧）
  function getRiichiCandidates() {
    if (!state || state.riichi[0] || state.scores[0] < 1000 || !isClosed(0)) return [];
    var candidates = [];
    state.hands[0].forEach(function(_, i) {
      var test = state.hands[0].filter(function(_, j) { return j !== i; });
      if (getBattleWaits(test, 0).length > 0) candidates.push(i);
    });
    return candidates;
  }

  // CPUがリーチ可能なら、聴牌を維持できる牌の中から最も待ちが広い牌の
  // インデックスを返す（不可能なら-1）。単純に「聴牌にできるなら
  // 必ずリーチする」という積極的な方針にする
  function cpuChooseRiichiDiscard(pidx) {
    if (!state || state.riichi[pidx] || state.scores[pidx] < 1000 || !isClosed(pidx)) return -1;
    var best = -1, bestWaitCount = 0;
    state.hands[pidx].forEach(function(_, i) {
      var test = state.hands[pidx].filter(function(_, j) { return j !== i; });
      var waits = getBattleWaits(test, pidx);
      if (waits.length > bestWaitCount) { bestWaitCount = waits.length; best = i; }
    });
    return best;
  }

  function cpuRiichi(pidx) {
    state.riichi[pidx] = true;
    state.scores[pidx] -= 1000;
    state.kyotaku = (state.kyotaku || 0) + 1;
    // ダブルリーチ：自分の最初の打牌で、かつそれまで誰も鳴いていなければ成立
    var noCallsYet = state.melds.every(function(m) { return !m || m.length === 0; });
    state.riichiDouble[pidx] = noCallsYet && state.discards[pidx].length === 0;
  }

  function playerRonAccept() {
    if (!state.pendingRon) return;
    state.hands[0].push(state.pendingRon.tile);
    state.winner = 0;
    state.loser = state.pendingRon.from;
    state.winType = 'ron';
    state.winTile = state.pendingRon.tile;
    state.phase = 'end';
    state.pendingRon = null;
    // 同じ牌で鳴きも選べていた場合、局が終わるので選択肢は破棄する
    state.callPending = null;
  }

  function playerRonSkip() {
    // ロンできたのに見送った＝フリテン（リーチ中なら局が終わるまで、
    // そうでなければ自分の次の打牌までロン不可）
    if (state.pendingRon) markMissedRon(0);
    var nextCpu = state.pendingRon ? state.pendingRon.from + 1 : state.playerCount;
    state.pendingRon = null;
    // 同じ牌でポン/チー/カンも選べる場合、ロンを見送ってもそのまま
    // 鳴きの選択肢に進む（打ち切って次のプレイヤーへ進めない）
    if (state.callPending) {
      state.phase = 'pending_call';
      return;
    }
    if (nextCpu >= state.playerCount) drawForPlayer();
    else runCPUTurns(nextCpu);
  }

  function runCPUTurns(startIdx) {
    for (var pidx = startIdx || 1; pidx < state.playerCount; pidx++) {
      if (state.wall.length === 0) { state.phase = 'ryukyoku'; return; }

      state.rinshanPending = false;
      var drew = state.wall.pop();
      state.hands[pidx].push(drew);
      autoNukiForCPU(pidx);
      if (state.phase === 'ryukyoku') return;

      // CPU 暗カンチェック
      var cpuAnkans = cpuCheckAnkan(pidx);
      if (cpuAnkans.length > 0 && Math.random() < 0.6) {
        cpuExecuteAnkan(pidx, cpuAnkans[0]);
        if (state.phase === 'ryukyoku') return;
        // 嶺上ツモ
        drew = state.wall.pop();
        if (!drew) { state.phase = 'ryukyoku'; return; }
        state.hands[pidx].push(drew);
        state.rinshanPending = true;
      }

      // CPU ツモ和了チェック（役なしのアガリは成立しない）
      if (Agari.isWinningHand(state.hands[pidx]) && hasYaku(pidx, 'tsumo', drew)) {
        state.winner = pidx;
        state.loser = -1;
        state.winType = 'tsumo';
        state.winTile = drew;
        state.phase = 'end';
        return;
      }

      var riichiDi = cpuChooseRiichiDiscard(pidx);
      var isRiichiDiscard = riichiDi >= 0;
      if (isRiichiDiscard) cpuRiichi(pidx);
      var di = isRiichiDiscard ? riichiDi : cpuChooseDiscard(pidx);
      var disc = state.hands[pidx].splice(di, 1)[0];
      if (isRiichiDiscard) disc.riichiDiscard = true; // 河のリーチ牌横向き表示用（自分以外の席も対応）
      state.discards[pidx].push(disc);
      // 自分の打牌で同巡内フリテンは解消（永久フリテンは解消されない）
      state.tempFuriten[pidx] = false;
      if (isRiichiDiscard) state.ippatsuActive[pidx] = true;

      // プレイヤー ロンチェック（フリテン・役なしならロンできないので聞かずスルー扱い）
      var playerTest = state.hands[0].slice();
      playerTest.push(disc);
      var canPlayerRon = !isFuriten(0) && Agari.isWinningHand(playerTest) && hasYaku(0, 'ron', disc);

      // プレイヤー 鳴きチェック（リーチ中は鳴けない）。同じ牌でロンも鳴きも
      // 両方できることがあるため、ロンが成立してもここで打ち切らず
      // 両方の選択肢を保持する（ロン見送り後にも鳴きを選べるように）
      var callOpts = !state.riichi[0] ? getPlayerCallOptions(disc, pidx) : [];
      if (callOpts.length > 0) {
        state.callPending = { tile: disc, fromPlayer: pidx, nextCPUIdx: pidx + 1, options: callOpts };
      }

      if (canPlayerRon) {
        state.pendingRon = { tile: disc, from: pidx };
        state.phase = 'pending_ron';
        return;
      }

      if (state.callPending) {
        state.phase = 'pending_call';
        return;
      }

      // CPU が他CPUに鳴けるかチェック
      for (var other = 1; other < state.playerCount; other++) {
        if (other === pidx) continue;
        var otherCall = cpuDecideCall(other, disc, pidx);
        if (otherCall) {
          cpuExecuteCall(other, otherCall, disc, pidx);
          cpuDiscardAfterNaki(other);
          if (state.phase === 'end' || state.phase === 'ryukyoku') return;
          // 鳴いたCPUの次から再開
          runCPUTurns(other + 1 < state.playerCount ? other + 1 : undefined);
          return;
        }
      }
    }
    drawForPlayer();
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //   鳴き / カン 関連関数
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  // player0 が `tile` (fromPlayer が捨てた牌) を鳴ける選択肢を返す
  function getPlayerCallOptions(tile, fromPlayerIdx) {
    if (!state || !tile) return [];
    var hand = state.hands[0];
    var opts  = [];

    // 同じ牌を手牌から探す
    var same = hand.filter(function(t) { return Tiles.isSame(t, tile); });

    // ポン: 2枚以上
    if (same.length >= 2) {
      opts.push({ type: 'pon', tiles: same.slice(0, 2), calledTile: tile, fromPlayer: fromPlayerIdx });
    }
    // 大明カン: 3枚
    if (same.length >= 3) {
      opts.push({ type: 'kan', tiles: same.slice(0, 3), calledTile: tile, fromPlayer: fromPlayerIdx });
    }
    // チー: 四人麻雀のみ、上家(最後のCPU)からのみ、数牌のみ
    var upstream = state.playerCount - 1;
    if (!state.isSanma && fromPlayerIdx === upstream) {
      var suit = tile.suit, num = tile.num;
      if (suit !== 'wind' && suit !== 'dragon') {
        for (var offset = -2; offset <= 0; offset++) {
          var trio = [num + offset, num + offset + 1, num + offset + 2];
          if (trio[0] < 1 || trio[2] > 9) continue;
          var need = trio.filter(function(n) { return n !== num; });
          var usedIdxs = [], ok = true;
          for (var ni = 0; ni < need.length; ni++) {
            var found = -1;
            for (var hi = 0; hi < hand.length; hi++) {
              if (usedIdxs.indexOf(hi) < 0 && hand[hi].suit === suit && hand[hi].num === need[ni]) {
                found = hi; break;
              }
            }
            if (found < 0) { ok = false; break; }
            usedIdxs.push(found);
          }
          if (ok) {
            opts.push({ type: 'chi', tiles: usedIdxs.map(function(i) { return hand[i]; }),
                        calledTile: tile, fromPlayer: fromPlayerIdx });
          }
        }
      }
    }
    return opts;
  }

  // player0 の暗カン候補を返す
  function checkAnkan() {
    if (!state || state.phase !== 'player_turn') return [];
    var hand = state.hands[0];
    var cnt = {};
    hand.forEach(function(t) {
      var k = t.suit + '_' + t.num;
      if (!cnt[k]) cnt[k] = { tile: t, arr: [] };
      cnt[k].arr.push(t);
    });
    var res = [];
    Object.keys(cnt).forEach(function(k) {
      if (cnt[k].arr.length >= 4) res.push({ type: 'ankan', tiles: cnt[k].arr });
    });
    return res;
  }

  // カン後のドラ追加 (嶺上牌も山の末尾から取る簡易実装)
  function addKanDora() {
    if (state.wall.length > 1) {
      // 山の先頭をカンドラ表示に追加
      var ind = state.wall.shift();
      state.kanDoraIndicators.push(ind);
    }
  }

  // 嶺上牌をツモ
  function drawRinshanForPlayer() {
    if (state.wall.length === 0) { state.phase = 'ryukyoku'; return false; }
    var t = state.wall.pop();
    state.hands[0].push(t);
    state.drewTile = t.id;
    state.phase = 'player_turn';
    state.rinshanPending = true;
    return true;
  }

  // 鳴かれた牌を、鳴かれた側の河から取り除く（鳴きは常に直前の捨て牌に対して行われる）
  function removeCalledDiscard(seat, tile) {
    var arr = state.discards[seat];
    if (!arr || !arr.length || !tile) return;
    var last = arr.length - 1;
    if (arr[last] && arr[last].id === tile.id) arr.splice(last, 1);
  }

  // ポン実行
  function playerPon(calledTile, fromPlayerIdx) {
    if (!state) return false;
    var hand = state.hands[0];
    var same = hand.filter(function(t) { return Tiles.isSame(t, calledTile); });
    if (same.length < 2) return false;
    var use = same.slice(0, 2);
    use.forEach(function(u) {
      var idx = hand.findIndex(function(t) { return t.id === u.id; });
      if (idx >= 0) hand.splice(idx, 1);
    });
    state.melds[0].push({ type: 'pon', tiles: [use[0], use[1], calledTile],
                           calledTile: calledTile, fromPlayer: fromPlayerIdx });
    removeCalledDiscard(fromPlayerIdx, calledTile);
    // 同じ牌でロンも選べていた場合、ポンを選んだ時点でロンは見送った
    // ことになる（フリテンの扱いもロンを見送った時と同じにする）
    if (state.pendingRon) { markMissedRon(0); state.pendingRon = null; }
    state.callPending    = null;
    state.nakiResumeFrom = fromPlayerIdx + 1 < state.playerCount ? fromPlayerIdx + 1 : null;
    state.ippatsuActive  = makePlayerArray(state.playerCount, false);
    state.phase          = 'naki_discard';
    return true;
  }

  // チー実行
  function playerChi(calledTile, fromPlayerIdx, tilesFromHand) {
    if (!state || state.isSanma) return false;
    var hand = state.hands[0];
    if (!tilesFromHand || tilesFromHand.length < 2) return false;
    tilesFromHand.forEach(function(u) {
      var idx = hand.findIndex(function(t) { return t.id === u.id; });
      if (idx >= 0) hand.splice(idx, 1);
    });
    var all3 = [tilesFromHand[0], tilesFromHand[1], calledTile]
                 .sort(function(a, b) { return a.num - b.num; });
    state.melds[0].push({ type: 'chi', tiles: all3, calledTile: calledTile, fromPlayer: fromPlayerIdx });
    removeCalledDiscard(fromPlayerIdx, calledTile);
    // 同じ牌でロンも選べていた場合、チーを選んだ時点でロンは見送った
    // ことになる（フリテンの扱いもロンを見送った時と同じにする）
    if (state.pendingRon) { markMissedRon(0); state.pendingRon = null; }
    state.callPending    = null;
    state.nakiResumeFrom = fromPlayerIdx + 1 < state.playerCount ? fromPlayerIdx + 1 : null;
    state.ippatsuActive  = makePlayerArray(state.playerCount, false);
    state.phase          = 'naki_discard';
    return true;
  }

  // 大明カン実行
  function playerKan(calledTile, fromPlayerIdx) {
    if (!state) return false;
    var hand = state.hands[0];
    var same = hand.filter(function(t) { return Tiles.isSame(t, calledTile); });
    if (same.length < 3) return false;
    var use = same.slice(0, 3);
    use.forEach(function(u) {
      var idx = hand.findIndex(function(t) { return t.id === u.id; });
      if (idx >= 0) hand.splice(idx, 1);
    });
    state.melds[0].push({ type: 'kan', tiles: [use[0], use[1], use[2], calledTile],
                           calledTile: calledTile, fromPlayer: fromPlayerIdx });
    removeCalledDiscard(fromPlayerIdx, calledTile);
    addKanDora();
    // 同じ牌でロンも選べていた場合、カンを選んだ時点でロンは見送った
    // ことになる（フリテンの扱いもロンを見送った時と同じにする）
    if (state.pendingRon) { markMissedRon(0); state.pendingRon = null; }
    state.callPending    = null;
    state.ippatsuActive  = makePlayerArray(state.playerCount, false);
    return drawRinshanForPlayer();
  }

  // 暗カン実行
  function playerAnkan(tileToKan) {
    if (!state || state.phase !== 'player_turn') return false;
    var hand = state.hands[0];
    var same = hand.filter(function(t) { return Tiles.isSame(t, tileToKan); });
    if (same.length < 4) return false;
    same.forEach(function(u) {
      var idx = hand.findIndex(function(t) { return t.id === u.id; });
      if (idx >= 0) hand.splice(idx, 1);
    });
    state.melds[0].push({ type: 'ankan', tiles: same, calledTile: null, fromPlayer: -1 });
    addKanDora();
    state.ippatsuActive = makePlayerArray(state.playerCount, false);
    return drawRinshanForPlayer();
  }

  // player0 の加カン候補を返す（既にポンしている牌の4枚目を手牌に持っている場合）
  function checkKakan() {
    if (!state || state.phase !== 'player_turn') return [];
    var hand = state.hands[0];
    var melds = state.melds[0] || [];
    var res = [];
    melds.forEach(function(m) {
      if (m.type !== 'pon') return;
      var kind = m.tiles[0];
      var match = hand.find(function(t) { return Tiles.isSame(t, kind); });
      if (match) res.push({ type: 'kakan', tiles: [kind], meld: m });
    });
    return res;
  }

  // 加カン実行（既存のポンに手牌の4枚目を足してカンに格上げする）
  function playerKakan(tileToKan) {
    if (!state || state.phase !== 'player_turn') return false;
    var hand = state.hands[0];
    var meld = (state.melds[0] || []).filter(function(m) {
      return m.type === 'pon' && Tiles.isSame(m.tiles[0], tileToKan);
    })[0];
    if (!meld) return false;
    var idx = hand.findIndex(function(t) { return Tiles.isSame(t, tileToKan); });
    if (idx < 0) return false;
    var added = hand.splice(idx, 1)[0];
    meld.type = 'kan';
    meld.kakan = true;
    meld.tiles = meld.tiles.concat([added]);
    addKanDora();
    state.ippatsuActive = makePlayerArray(state.playerCount, false);
    return drawRinshanForPlayer();
  }

  // スキップ（鳴かない）
  function skipCall() {
    if (!state || !state.callPending) return;
    var nextIdx = state.callPending.nextCPUIdx;
    state.callPending = null;
    state.phase = 'drawing';
    if (nextIdx < state.playerCount) {
      runCPUTurns(nextIdx);
    } else {
      drawForPlayer();
    }
  }

  // ── CPU 鳴き判定 ──────────────────────────────────────────────

  // CPUが鳴くべきか判断して鳴き種別を返す（null = 鳴かない）
  function cpuDecideCall(pidx, tile, fromPlayerIdx) {
    if (!state) return null;
    var hand = state.hands[pidx];

    // 大明カン (3枚持ち)
    var same = hand.filter(function(t) { return Tiles.isSame(t, tile); });
    if (same.length >= 3 && Math.random() < 0.5) return 'kan';

    // ポン (2枚持ち): 役牌は積極的に、それ以外は30%
    if (same.length >= 2) {
      var isYaku = (tile.suit === 'dragon') ||
        (tile.suit === 'wind' && (tile.num === (state.roundWind + 1) || tile.num === seatWindNum(pidx)));
      if (isYaku || Math.random() < 0.3) return 'pon';
    }

    // チー: 四人麻雀のみ、上家からのみ、20%の確率
    var upstream = pidx === 0 ? state.playerCount - 1 : pidx - 1;
    if (!state.isSanma && fromPlayerIdx === upstream && Math.random() < 0.2) {
      if (tile.suit !== 'wind' && tile.suit !== 'dragon') {
        // チーできる組み合わせがあれば
        var suit = tile.suit, num = tile.num;
        for (var off = -2; off <= 0; off++) {
          var trio = [num+off, num+off+1, num+off+2];
          if (trio[0] < 1 || trio[2] > 9) continue;
          var need = trio.filter(function(n){ return n !== num; });
          var ok = need.every(function(n) {
            return hand.some(function(t) { return t.suit === suit && t.num === n; });
          });
          if (ok) return 'chi';
        }
      }
    }

    return null;
  }

  // CPU が鳴き処理を実行
  function cpuExecuteCall(pidx, callType, tile, fromPlayerIdx) {
    if (!state) return;
    var hand = state.hands[pidx];
    var same = hand.filter(function(t) { return Tiles.isSame(t, tile); });
    // ポン・チー・カンは（誰の分であっても）一発を消す
    state.ippatsuActive = makePlayerArray(state.playerCount, false);

    if (callType === 'kan' && same.length >= 3) {
      same.slice(0,3).forEach(function(u) {
        var idx = hand.findIndex(function(t){ return t.id === u.id; });
        if (idx >= 0) hand.splice(idx, 1);
      });
      state.melds[pidx].push({ type:'kan', tiles:[same[0],same[1],same[2],tile],
                                calledTile:tile, fromPlayer:fromPlayerIdx });
      removeCalledDiscard(fromPlayerIdx, tile);
      addKanDora();
    } else if (callType === 'pon' && same.length >= 2) {
      var use = same.slice(0,2);
      use.forEach(function(u) {
        var idx = hand.findIndex(function(t){ return t.id === u.id; });
        if (idx >= 0) hand.splice(idx, 1);
      });
      state.melds[pidx].push({ type:'pon', tiles:[use[0],use[1],tile],
                                calledTile:tile, fromPlayer:fromPlayerIdx });
      removeCalledDiscard(fromPlayerIdx, tile);
    } else if (callType === 'chi' && !state.isSanma) {
      // チーに使う2枚を探す
      var suit = tile.suit, num = tile.num;
      for (var off = -2; off <= 0; off++) {
        var trio = [num+off, num+off+1, num+off+2];
        if (trio[0] < 1 || trio[2] > 9) continue;
        var need = trio.filter(function(n){ return n !== num; });
        var usedIdxs = [], ok = true;
        for (var ni = 0; ni < need.length; ni++) {
          var fi = hand.findIndex(function(t, idx) {
            return usedIdxs.indexOf(idx) < 0 && t.suit === suit && t.num === need[ni];
          });
          if (fi < 0) { ok = false; break; }
          usedIdxs.push(fi);
        }
        if (ok) {
          var useTiles = usedIdxs.map(function(i){ return hand[i]; });
          usedIdxs.sort(function(a,b){return b-a;}).forEach(function(i){ hand.splice(i,1); });
          var all3 = [useTiles[0], useTiles[1], tile].sort(function(a,b){ return a.num-b.num; });
          state.melds[pidx].push({ type:'chi', tiles:all3, calledTile:tile, fromPlayer:fromPlayerIdx });
          removeCalledDiscard(fromPlayerIdx, tile);
          break;
        }
      }
    }
  }

  // CPU の暗カン候補
  function cpuCheckAnkan(pidx) {
    var hand = state.hands[pidx];
    var cnt = {};
    hand.forEach(function(t) {
      var k = t.suit+'_'+t.num;
      if (!cnt[k]) cnt[k] = { tile:t, arr:[] };
      cnt[k].arr.push(t);
    });
    var res = [];
    Object.keys(cnt).forEach(function(k){
      if (cnt[k].arr.length >= 4) res.push(cnt[k].arr);
    });
    return res;
  }

  function cpuExecuteAnkan(pidx, tiles) {
    var hand = state.hands[pidx];
    tiles.forEach(function(u) {
      var idx = hand.findIndex(function(t){ return t.id === u.id; });
      if (idx >= 0) hand.splice(idx, 1);
    });
    state.melds[pidx].push({ type:'ankan', tiles:tiles, calledTile:null, fromPlayer:-1 });
    addKanDora();
    state.ippatsuActive = makePlayerArray(state.playerCount, false);
    // 嶺上牌を引く
    if (state.wall.length > 0) {
      var t = state.wall.pop();
      state.hands[pidx].push(t);
    } else {
      state.phase = 'ryukyoku';
    }
  }

  // CPU が鳴いた後に1枚捨てる
  function cpuDiscardAfterNaki(pidx) {
    if (state.phase === 'end' || state.phase === 'ryukyoku') return;
    var di = cpuChooseDiscard(pidx);
    var disc = state.hands[pidx].splice(di, 1)[0];
    state.discards[pidx].push(disc);
    // 自分の打牌で同巡内フリテンは解消（永久フリテンは解消されない）
    state.tempFuriten[pidx] = false;
    // プレイヤーのロンと鳴きを確認する。
    // 同じ牌でロンも鳴きも両方できることがあるため、通常の打牌後と同じく
    // 両方の選択肢を保持する（ここで鳴きを拾っていなかったため、CPUが
    // 鳴いた直後に捨てた牌はポン・チー・カンができなかった）。
    var playerTest = state.hands[0].slice();
    playerTest.push(disc);
    var canPlayerRon = !isFuriten(0) && Agari.isWinningHand(playerTest) && hasYaku(0, 'ron', disc);

    var callOpts = !state.riichi[0] ? getPlayerCallOptions(disc, pidx) : [];
    if (callOpts.length > 0) {
      state.callPending = { tile: disc, fromPlayer: pidx, nextCPUIdx: pidx + 1, options: callOpts };
    }

    if (canPlayerRon) {
      state.pendingRon = { tile: disc, from: pidx };
      state.phase = 'pending_ron';
    } else if (state.callPending) {
      state.phase = 'pending_call';
    }
  }

  // ドラ・カンドラ・裏ドラ・抜き北を除いた「本当の役」の一覧を組み立てる。
  // アガリが確定する前の判定（役なしアガリの禁止）にも使うため、
  // state.winner/winType/winTileではなく引数だけで動くようにしてある。
  function buildYakuBeforeDora(seat, winType, winningTile) {
    var closed = isClosed(seat);
    var yaku = computeShapeYaku(seat, winType, winningTile);

    if (state.riichi[seat]) {
      if (state.riichiDouble && state.riichiDouble[seat]) yaku.push({ name: 'ダブルリーチ', han: 2 });
      else yaku.push({ name: '立直', han: 1 });
      if (state.ippatsuActive && state.ippatsuActive[seat]) yaku.push({ name: '一発', han: 1 });
    }
    if (winType === 'tsumo' && closed) yaku.push({ name: '門前清自摸和', han: 1 });
    if (winType === 'tsumo' && state.rinshanPending) yaku.push({ name: '嶺上開花', han: 1 });
    if (state.wall && state.wall.length === 0) {
      if (winType === 'tsumo') yaku.push({ name: '海底摸月', han: 1 });
      else yaku.push({ name: '河底撈魚', han: 1 });
    }

    // 天和・地和：誰も鳴いておらず、自分がまだ一度も捨てていない状態でのツモ和了。
    // 親は局ごとに移る（nextRoundでdealerSeatが動く）ため、席番号ではなく
    // dealerSeatと比べる（人和はロン経路の特殊条件のため対象外）。
    var noCallsYet = state.melds.every(function(m) { return !m || m.length === 0; });
    var winnerHasNotDiscarded = (state.discards[seat] || []).length === 0;
    if (winType === 'tsumo' && noCallsYet && winnerHasNotDiscarded) {
      // 天和は親専用、子は地和。親は局ごとに移るので dealerSeat で見る
      if (seat === state.dealerSeat) yaku.push({ name: '天和', han: Yaku.YAKUMAN_HAN, yakuman: true });
      else yaku.push({ name: '地和', han: Yaku.YAKUMAN_HAN, yakuman: true });
    }
    return yaku;
  }

  // 役なしアガリ禁止：ドラ以外に本当の役が1つも無ければロン・ツモは成立しない
  // （ドラだけでは和了できない）。ロン/ツモを許可する前に必ずこれを通す。
  function hasYaku(seat, winType, winningTile) {
    return buildYakuBeforeDora(seat, winType, winningTile).length > 0;
  }

  function calcScore() {
    if (state.winner < 0) return null;
    var w = state.winner;
    var winType = state.winType;
    var winningTile = state.winTile;
    var scoringTiles = getScoringTiles(w);

    // 役の内訳を組み立てる（合計翻＝内訳の合計になるよう一本化）
    var yaku = buildYakuBeforeDora(w, winType, winningTile);

    var nuki = state.nuki && state.nuki[w] ? state.nuki[w].length : 0;
    var dora = Yaku.countMatch(scoringTiles, getDora());
    var kanDora = 0;
    (state.kanDoraIndicators || []).forEach(function(ind) {
      kanDora += Yaku.countMatch(scoringTiles, doraFromIndicator(ind));
    });
    var uraDora = 0;
    if (state.riichi[w] && state.uraDoraIndicator) {
      uraDora = Yaku.countMatch(scoringTiles, doraFromIndicator(state.uraDoraIndicator));
    }

    // 役が一つも無い場合のみ「役あり」を1つ補填（簡易エンジンのため役なしを避ける。
    // 友人戦(friend.js)の役判定エンジンも同じ方式）
    if (yaku.length === 0) yaku.push({ name: '役あり', han: 1 });
    if (dora > 0)    yaku.push({ name: 'ドラ',     han: dora });
    if (kanDora > 0) yaku.push({ name: 'カンドラ', han: kanDora });
    if (uraDora > 0) yaku.push({ name: '裏ドラ',   han: uraDora });
    if (nuki > 0)    yaku.push({ name: '抜き北',   han: nuki });

    var points = Yaku.calcPoints(yaku, w === state.dealerSeat);
    var ippatsu = !!(state.ippatsuActive && state.ippatsuActive[w]);

    return { han: points.han, dora: dora, nuki: nuki, kanDora: kanDora, uraDora: uraDora,
             pts: points.pts, label: points.label, yaku: yaku, ippatsu: ippatsu };
  }

  function round100(n) {
    return Math.ceil(n / 100) * 100;
  }

  // 和了の精算。sc.pts は calcScore の時点で親なら親の点数になっている。
  //   ロン  ：放銃者が全額を払う
  //   ツモ  ：親の和了は子が3等分、子の和了は親が半分・他の子が4分の1ずつ払う
  //   本場  ：1本につきロンで300点、ツモで1人100点ずつ上乗せする
  //   供託  ：場に出ている立直棒は和了者が全部回収する
  function settleScore() {
    if (!state || state.winner < 0) return null;
    if (state.settled) return state.lastScore;

    var sc = calcScore();
    if (!sc) return null;

    var n = state.playerCount;
    var winner = state.winner;
    var isDealerWin = winner === state.dealerSeat;
    var honba = state.honba || 0;
    var deltas = makePlayerArray(n, 0);

    if (state.winType === 'ron') {
      var loser = state.loser >= 0 ? state.loser : 0;
      var pay = sc.pts + honba * 300;
      deltas[winner] += pay;
      deltas[loser] -= pay;
    } else {
      // 親ツモは全員が同額（基本点の1/3）。子ツモは親が1/2、他の子が1/4を払う。
      var dealerPay = round100(sc.pts / (isDealerWin ? 3 : 2));
      var childPay  = round100(sc.pts / (isDealerWin ? 3 : 4));
      for (var i = 0; i < n; i++) {
        if (i === winner) continue;
        var amount = (i === state.dealerSeat ? dealerPay : childPay) + honba * 100;
        deltas[i] -= amount;
        deltas[winner] += amount;
      }
    }

    // 立直棒（供託）は和了者がすべて受け取る
    var sticks = state.kyotaku || 0;
    if (sticks > 0) {
      deltas[winner] += sticks * 1000;
      state.kyotaku = 0;
    }

    for (var j = 0; j < n; j++) state.scores[j] += deltas[j];
    sc.deltas = deltas;
    sc.honba = honba;
    sc.kyotaku = sticks;
    state.lastScore = sc;
    state.settled = true;
    return sc;
  }

  // 手牌がテンパイかどうか。山が尽きた時点で14枚持っている席もあるため、
  // その場合はどれか1枚を切ればテンパイになるかで見る。
  function isTenpaiHand(tiles, seat) {
    if (!tiles || tiles.length === 0) return false;
    if (tiles.length % 3 === 1) return getBattleWaits(tiles, seat).length > 0;
    for (var i = 0; i < tiles.length; i++) {
      var rest = tiles.filter(function(_, j) { return j !== i; });
      if (getBattleWaits(rest, seat).length > 0) return true;
    }
    return false;
  }

  // 流局の精算：テンパイ料（ノーテン罰符）を合計3000点でやりとりする。
  // 全員テンパイ・全員ノーテンのときは点棒は動かない。
  // 立直棒は流局では誰も回収せず、次の局へ持ち越す（state.kyotakuをそのまま残す）。
  function settleRyukyoku() {
    if (!state || state.phase !== 'ryukyoku') return null;
    if (state.ryukyokuSettled) return state.lastRyukyoku;

    var n = state.playerCount;
    var tenpai = [];
    for (var i = 0; i < n; i++) tenpai.push(isTenpaiHand(state.hands[i] || [], i));
    var tenpaiCount = tenpai.filter(Boolean).length;

    var deltas = makePlayerArray(n, 0);
    if (tenpaiCount > 0 && tenpaiCount < n) {
      var notenCount = n - tenpaiCount;
      var recv = round100(3000 / tenpaiCount);
      var pay  = round100(3000 / notenCount);
      for (var k = 0; k < n; k++) deltas[k] = tenpai[k] ? recv : -pay;
      for (var j = 0; j < n; j++) state.scores[j] += deltas[j];
    }

    state.lastRyukyoku = { tenpai: tenpai, tenpaiCount: tenpaiCount, deltas: deltas };
    state.ryukyokuSettled = true;
    return state.lastRyukyoku;
  }

  function isMatchOver() {
    return !!state && state.round >= state.roundLimit &&
      (state.phase === 'end' || state.phase === 'ryukyoku' || state.phase === 'match_end');
  }

  function getState() { return state; }
  function getDoraTile() { return getDora(); }

  return {
    init: init,
    getState: getState,
    getDoraTile: getDoraTile,
    getRoundLabel: getRoundLabel,
    nextRound: nextRound,
    isMatchOver: isMatchOver,
    countDora: countDora,
    playerDiscard: playerDiscard,
    playerTsumo: playerTsumo,
    playerRiichi: playerRiichi,
    playerRonAccept: playerRonAccept,
    playerRonSkip: playerRonSkip,
    calcScore: calcScore,
    settleScore: settleScore,
    settleRyukyoku: settleRyukyoku,
    getRiichiCandidates: getRiichiCandidates,
    isFuriten: function(seat) { return !!state && isFuriten(seat == null ? 0 : seat); },
    hasYaku: function(seat, winType, winningTile) { return !!state && hasYaku(seat == null ? 0 : seat, winType, winningTile); },
    // 「この牌を切ったらどうなるか」の見込み表示用。
    // 実際の手牌ではなく、渡された13枚＋和了牌で役が付くかを見る。
    // 打牌前は手牌が14枚あるため、実際の手牌で判定すると15枚になって
    // 和了形にならず、常に役なし扱いになってしまう。
    hasYakuForHand: function(hand13, winType, winningTile) {
      if (!state || !hand13 || !winningTile) return false;
      var hand = hand13.slice().concat([winningTile]);
      if (!Agari.isWinningHand(hand)) return false;
      var openMelds = state.melds[0] || [];
      var closed = isClosed(0);
      var yaku = Yaku.computeShapeYaku(hand, openMelds, closed,
        seatWindNum(0), roundWindNum(), winType, winningTile);
      // 門前のツモには門前清自摸和が必ず付く
      if (winType === 'tsumo' && closed) return true;
      // リーチ中はリーチそのものが役になる
      if (state.riichi[0]) return true;
      return yaku.length > 0;
    },
    playerNuki: playerNuki,
    canNuki: function() { return !!(state && state.isSanma && state.phase === 'player_turn' && findNukiIdx(0) >= 0); },
    isNukiTile: isNukiTile,
    canTsumo: function() {
      if (!state) return false;
      var hand = state.hands[0];
      if (!Agari.isWinningHand(hand)) return false;
      var winTile = hand[hand.length - 1];
      return hasYaku(0, 'tsumo', winTile);
    },
    canRiichi: function() {
      if (!state || state.riichi[0] || state.scores[0] < 1000 || !isClosed(0)) return false;
      var h = state.hands[0];
      for (var i = 0; i < h.length; i++) {
        var rest = h.filter(function(_, j) { return j !== i; });
        if (getBattleWaits(rest, 0).length > 0) return true;
      }
      return false;
    },
    // 鳴き/カン
    playerDiscardNaki: playerDiscardNaki,
    playerPon:    playerPon,
    playerChi:    playerChi,
    playerKan:    playerKan,
    playerAnkan:  playerAnkan,
    playerKakan:  playerKakan,
    skipCall:     skipCall,
    checkAnkan:   checkAnkan,
    checkKakan:   checkKakan,
    getPlayerCallOptions: getPlayerCallOptions,
    PLAYER_NAMES:  PLAYER_NAMES,
    WIND_NAMES:    WIND_NAMES,
    WIND_READINGS: WIND_READINGS,
    seatWindNum: function(seat) { return state ? seatWindNum(seat) : seat + 1; },
  };
})();
