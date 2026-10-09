'use strict';

/* ============================================================
   Sorekiri（それ切り）：自作の麻雀AI。CPU戦の難易度「Sorekiri」で使う。

   - 何を切るか：学習済みのニューラルネット（重みは static/models/sorekiri_v1.bin）が選ぶ。
     先生（シャンテン数と受け入れ枚数で切る牌を決める自作エンジン）の判断を真似て学習した。
   - 鳴くか：先生と同じ規則（役の見込みがあり、鳴くとシャンテン数が進むときだけ鳴く）。
   - 降り：他家がリーチしていて、自分の手がまだ遠いとき（シャンテン数が基準以上）は、
     放銃確率の見積もりがいちばん小さい牌を切る。見積もりはリーチ相手の待ちの形
     （両面・嵌張・辺張・シャンポン・単騎）ごとに、当たる組み合わせ数から出す。
   - 四人麻雀用（sorekiri_v1.bin）と三人麻雀用（sorekiri_v1s.bin）の2つの重みを持つ。三人麻雀用は
     四人麻雀用を出発点に、三人麻雀の対局データで追加学習したもの。
   - 重みを読み込めていない間は、従来のCPUの判断を使う。
   - 作り方と評価は 制作物/sorekiri/ にある。Pythonで作った特徴量・判断と同じ答えが出るかを
     制作物/sorekiri/tests/parity_test.js で確認している。
   ============================================================ */

var Sorekiri = (function() {
  var HONOR_IDS = ['east', 'south', 'west', 'north', 'white', 'green', 'red'];
  var TILE_ORDER = [];
  (function() {
    var s = ['m', 'p', 's'];
    for (var k = 0; k < 3; k++) for (var n = 1; n <= 9; n++) TILE_ORDER.push(n + s[k]);
    HONOR_IDS.forEach(function(h) { TILE_ORDER.push(h); });
  })();
  var TILE_INDEX = {};
  TILE_ORDER.forEach(function(t, i) { TILE_INDEX[t] = i; });

  var OTHER_SEATS = ['right', 'top', 'left'];
  var WINDS = ['東', '南', '西', '北'];
  var WIND_IDS = { '東': 'east', '南': 'south', '西': 'west', '北': 'north' };
  var N_CHANNELS = 12;
  var FEATURE_SIZE = 34 * N_CHANNELS + 3 + 4 + 4;
  var LAYER_SIZES = [FEATURE_SIZE, 512, 512, 256, 34];
  var TERMINAL_INDEXES = [0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33];

  var MODEL_URLS = { yonma: '/static/models/sorekiri_v1.bin', sanma: '/static/models/sorekiri_v1s.bin' };
  var layersBy = { yonma: null, sanma: null };   // [{w: Float32Array(out*in), b: Float32Array(out), nIn, nOut}]
  var loadingBy = {};

  function modeOf(state) { return state && state.isSanma ? 'sanma' : 'yonma'; }

  // ---------- 重みの読み込み ----------
  function setWeights(buffer, mode) {
    mode = mode || 'yonma';
    var f = new Float32Array(buffer);
    var pos = 0;
    var out = [];
    for (var l = 0; l < LAYER_SIZES.length - 1; l++) {
      var nIn = LAYER_SIZES[l], nOut = LAYER_SIZES[l + 1];
      out.push({ nIn: nIn, nOut: nOut,
                 w: f.subarray(pos, pos + nIn * nOut),
                 b: f.subarray(pos + nIn * nOut, pos + nIn * nOut + nOut) });
      pos += nIn * nOut + nOut;
    }
    if (pos !== f.length) throw new Error('Sorekiriの重みの大きさが合わない');
    layersBy[mode] = out;
  }

  // mode：'yonma'（四人麻雀）か 'sanma'（三人麻雀）
  function load(mode) {
    mode = mode || 'yonma';
    if (layersBy[mode]) return Promise.resolve(true);
    if (loadingBy[mode]) return loadingBy[mode];
    loadingBy[mode] = fetch(MODEL_URLS[mode])
      .then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer(); })
      .then(function(buf) { setWeights(buf, mode); return true; })
      .catch(function() { loadingBy[mode] = null; return false; });
    return loadingBy[mode];
  }

  function ready(mode) { return !!layersBy[mode || 'yonma']; }

  // ---------- 特徴量（features.py と同じ） ----------
  function doraFromIndicator(id, sanma) {
    var i = TILE_INDEX[id];
    if (i === undefined) return null;
    if (sanma && i < 9) return i === 0 ? '9m' : '1m';     // 三人麻雀：萬子は1と9だけ
    if (i < 27) { var base = i - i % 9; return TILE_ORDER[base + (i % 9 + 1) % 9]; }
    if (i < 31) return TILE_ORDER[27 + (i - 27 + 1) % 4];
    return TILE_ORDER[31 + (i - 31 + 1) % 3];
  }

  function encode(sample) {
    var x = new Float32Array(FEATURE_SIZE);
    function plane(c, tile) { return c * 34 + TILE_INDEX[tile]; }
    var hand = new Float32Array(34);
    sample.hand.forEach(function(t) { hand[TILE_INDEX[t]] += 1; });
    for (var k = 0; k < 4; k++) for (var i = 0; i < 34; i++) x[k * 34 + i] = hand[i] >= k + 1 ? 1 : 0;

    var visible = new Float32Array(hand);
    sample.discards.self.forEach(function(t) { x[plane(4, t)] += 0.25; visible[TILE_INDEX[t]] += 1; });
    OTHER_SEATS.forEach(function(seat, c) {
      sample.discards[seat].forEach(function(t) { x[plane(5 + c, t)] += 0.25; visible[TILE_INDEX[t]] += 1; });
    });
    var calls = sample.calls || {};
    ['self'].concat(OTHER_SEATS).forEach(function(seat) {
      (calls[seat] || []).forEach(function(meld) {
        meld.tiles.forEach(function(t) {
          x[plane(seat === 'self' ? 10 : 11, t)] += 0.25;
          visible[TILE_INDEX[t]] += 1;
        });
      });
    });
    sample.doraIndicators.forEach(function(ind) {
      visible[TILE_INDEX[ind]] += 1;
      x[plane(8, doraFromIndicator(ind, sample.gameMode === 'sanma'))] = 1;
    });
    for (var j = 0; j < 34; j++) x[9 * 34 + j] = visible[j] / 4;

    var base = 34 * N_CHANNELS;
    OTHER_SEATS.forEach(function(seat, c) { x[base + c] = sample.riichi[seat] ? 1 : 0; });
    x[base + 3 + WINDS.indexOf(sample.playerWind)] = 1;
    x[base + 7 + WINDS.indexOf(sample.roundWind)] = 1;
    return x;
  }

  function forward(x, mode) {
    var layers = layersBy[mode || 'yonma'];
    var a = x;
    for (var l = 0; l < layers.length; l++) {
      var L = layers[l];
      var out = new Float32Array(L.nOut);
      for (var o = 0; o < L.nOut; o++) {
        var s = L.b[o];
        var off = o * L.nIn;
        for (var i = 0; i < L.nIn; i++) s += L.w[off + i] * a[i];
        out[o] = (l < layers.length - 1 && s < 0) ? 0 : s;
      }
      a = out;
    }
    return a;
  }

  // 場面（手牌・河・副露など）から、切る牌のIDを返す
  function chooseDiscardFromSample(sample, mode) {
    var logits = forward(encode(sample), mode);
    var inHand = {};
    sample.hand.forEach(function(t) { inHand[TILE_INDEX[t]] = true; });
    var best = -1, bestV = -Infinity;
    for (var i = 0; i < 34; i++) {
      if (inHand[i] && logits[i] > bestV) { bestV = logits[i]; best = i; }
    }
    return TILE_ORDER[best];
  }

  // ---------- シャンテン数（advice_calc.py と同じ） ----------
  var blockMemo = {};
  function suitBlocks(counts, isHonor) {
    var key = counts.join(',') + (isHonor ? 'h' : 's');
    if (blockMemo[key]) return blockMemo[key];
    var i = -1;
    for (var k = 0; k < counts.length; k++) { if (counts[k] > 0) { i = k; break; } }
    if (i < 0) { blockMemo[key] = [[0, 0, 0]]; return blockMemo[key]; }
    var results = {};
    function take(delta, add) {
      var c = counts.slice();
      delta.forEach(function(k) { c[k] -= 1; });
      suitBlocks(c, isHonor).forEach(function(b) {
        var nh = b[2] + add[2];
        if (nh <= 1) results[(b[0] + add[0]) + ',' + (b[1] + add[1]) + ',' + nh] = true;
      });
    }
    take([i], [0, 0, 0]);
    if (counts[i] >= 2) { take([i, i], [0, 0, 1]); take([i, i], [0, 1, 0]); }
    if (counts[i] >= 3) take([i, i, i], [1, 0, 0]);
    if (!isHonor) {
      if (i + 1 < 9 && counts[i + 1] > 0) {
        take([i, i + 1], [0, 1, 0]);
        if (i + 2 < 9 && counts[i + 2] > 0) take([i, i + 1, i + 2], [1, 0, 0]);
      }
      if (i + 2 < 9 && counts[i + 2] > 0) take([i, i + 2], [0, 1, 0]);
    }
    var list = Object.keys(results).map(function(s) { return s.split(',').map(Number); });
    blockMemo[key] = list;
    return list;
  }

  function standardShanten(counts, openMelds) {
    var parts = [
      suitBlocks(counts.slice(0, 9), false),
      suitBlocks(counts.slice(9, 18), false),
      suitBlocks(counts.slice(18, 27), false),
      suitBlocks(counts.slice(27, 34), true),
    ];
    var combos = [[openMelds, 0, 0]];
    parts.forEach(function(part) {
      var next = {};
      combos.forEach(function(c) {
        part.forEach(function(p) {
          var h = c[2] + p[2];
          if (h <= 1) next[(c[0] + p[0]) + ',' + (c[1] + p[1]) + ',' + h] = true;
        });
      });
      combos = Object.keys(next).map(function(s) { return s.split(',').map(Number); });
    });
    var best = 8;
    combos.forEach(function(c) {
      var m = c[0], t = c[1], h = c[2];
      t = m <= 4 ? Math.min(t, 4 - m) : 0;
      best = Math.min(best, 8 - 2 * m - t - h);
    });
    return best;
  }

  function shanten(counts, openMelds) {
    var result = standardShanten(counts, openMelds);
    if (openMelds === 0) {
      var pairs = 0, kinds = 0;
      counts.forEach(function(c) { if (c >= 2) pairs++; if (c > 0) kinds++; });
      result = Math.min(result, 6 - pairs + Math.max(0, 7 - kinds));
      var k = 0, hasPair = false;
      TERMINAL_INDEXES.forEach(function(i) { if (counts[i] > 0) k++; if (counts[i] >= 2) hasPair = true; });
      result = Math.min(result, 13 - k - (hasPair ? 1 : 0));
    }
    return result;
  }

  function countsOf(tiles) {
    var c = new Array(34).fill(0);
    tiles.forEach(function(t) { c[TILE_INDEX[t]]++; });
    return c;
  }

  // ---------- 鳴くかどうか（policies.py の teacher_call と同じ） ----------
  function yakuhaiIds(sample) {
    var o = {};
    ['white', 'green', 'red', WIND_IDS[sample.roundWind], WIND_IDS[sample.playerWind]].forEach(function(t) { o[t] = true; });
    return o;
  }

  function hasYakuPotential(tiles, melds, sample) {
    var yakuhai = yakuhaiIds(sample);
    for (var m = 0; m < melds.length; m++) {
      if (melds[m].type === 'pon' && yakuhai[melds[m].tiles[0]]) return true;
    }
    var all = tiles.slice();
    melds.forEach(function(me) { all = all.concat(me.tiles); });
    var idx = all.map(function(t) { return TILE_INDEX[t]; });
    if (idx.every(function(i) { return i < 27 && i % 9 !== 0 && i % 9 !== 8; })) return true;
    var suits = {};
    idx.forEach(function(i) { if (i < 27) suits[Math.floor(i / 9)] = true; });
    return Object.keys(suits).length <= 1 && idx.some(function(i) { return i < 27; });
  }

  // options: [{type: 'pon'|'chi', use: [牌ID, 牌ID]}]。選んだ選択肢を返す（鳴かないならnull）
  function decideCallFromSample(sample, tile, options) {
    var hand = sample.hand;
    var melds = sample.calls.self;
    var cur = shanten(countsOf(hand), melds.length);
    if (melds.length === 0 && cur <= 0) return null;
    var best = null, bestAfter = cur;
    options.forEach(function(opt) {
      var rest = hand.slice();
      opt.use.forEach(function(t) { rest.splice(rest.indexOf(t), 1); });
      var tiles = opt.use.concat([tile]).sort(function(a, b) { return TILE_INDEX[a] - TILE_INDEX[b]; });
      var newMeld = { type: opt.type, tiles: tiles };
      if (!hasYakuPotential(rest, melds.concat([newMeld]), sample)) return;
      var after = 99;
      for (var i = 0; i < rest.length; i++) {
        var r2 = rest.slice(0, i).concat(rest.slice(i + 1));
        after = Math.min(after, shanten(countsOf(r2), melds.length + 1));
      }
      if (after < bestAfter) { best = opt; bestAfter = after; }
    });
    return best;
  }

  // ---------- 降り（policies.py の defense_pick / danger.py と同じ） ----------
  // 放銃の危なさ：リーチ相手の待ちを 両面・嵌張・辺張・シャンポン・単騎 に分け、
  // その牌が当たる組み合わせ数（場に見えていない枚数から数える）に、学習した重みを掛けて確率にする。
  // 論文：栗田・保木「麻雀における他家の手牌と待ちの予測に基づく放銃確率推定」(情報処理学会 2017)
  var DANGER_WEIGHTS = [0.00310, 0.00275, 0.00454, 0.00491, 0.00910];   // 両面・嵌張・辺張・シャンポン・単騎

  function visibleCounts(sample) {
    var v = new Array(34).fill(0);
    function add(t) { v[TILE_INDEX[t]] += 1; }
    sample.hand.forEach(add);
    Object.keys(sample.discards).forEach(function(rel) { sample.discards[rel].forEach(add); });
    Object.keys(sample.calls).forEach(function(rel) {
      sample.calls[rel].forEach(function(m) { m.tiles.forEach(add); });
    });
    sample.doraIndicators.forEach(add);
    if (sample.gameMode === 'sanma') {
      // 三人麻雀：2〜8萬は無く、北は抜くので誰の手にも入らない（＝全部見えている扱い）
      for (var k = 1; k <= 7; k++) v[k] = 4;
      v[TILE_INDEX.north] = 4;
    }
    return v;
  }

  function formCounts(tile, discards, visible) {
    var i = TILE_INDEX[tile];
    var out = [0, 0, 0, 0, 0];
    var d = {};
    discards.forEach(function(t) { d[TILE_INDEX[t]] = true; });
    if (d[i]) return out;
    var unseen = visible.map(function(c) { return Math.max(0, 4 - c); });
    var u = unseen[i];
    out[3] = u * (u - 1) / 2;
    out[4] = u;
    if (i >= 27) return out;
    var base = i - i % 9, p = i - base;
    if (p + 3 <= 8 && !d[base + p + 3]) out[0] += unseen[base + p + 1] * unseen[base + p + 2];
    if (p - 3 >= 0 && !d[base + p - 3]) out[0] += unseen[base + p - 2] * unseen[base + p - 1];
    if (p >= 1 && p <= 7) out[1] = unseen[base + p - 1] * unseen[base + p + 1];
    if (p === 2) out[2] = unseen[base] * unseen[base + 1];
    else if (p === 6) out[2] = unseen[base + 7] * unseen[base + 8];
    return out;
  }

  // リーチしている全員に対して、その牌を切ったときの放銃確率の見積もり
  function ronProbability(tile, sample, riichiRels, visible) {
    var safe = 1;
    riichiRels.forEach(function(rel) {
      var x = formCounts(tile, sample.discards[rel] || [], visible);
      var s = 0;
      for (var k = 0; k < 5; k++) s += DANGER_WEIGHTS[k] * x[k];
      safe *= Math.exp(-s);
    });
    return 1 - safe;
  }

  // 他家のリーチがあり、自分のシャンテン数が foldShanten 以上なら、いちばん安全な牌を返す。降りないならnull
  // foldDealer：親がリーチしているときだけ使う基準（親は打点が高いので、もっと早く降りる）。省略可
  function defensePickFromSample(sample, foldShanten, foldDealer) {
    var riichiRels = OTHER_SEATS.filter(function(rel) { return sample.riichi[rel]; });
    if (riichiRels.length === 0) return null;
    if (foldDealer !== undefined && foldDealer !== null && riichiRels.indexOf(sample.dealer) >= 0) {
      foldShanten = Math.min(foldShanten, foldDealer);
    }
    var openN = sample.calls.self.length;
    var cands = {};
    var order = [];
    sample.hand.forEach(function(t) {
      if (cands[t] !== undefined) return;
      var rest = sample.hand.slice();
      rest.splice(rest.indexOf(t), 1);
      cands[t] = shanten(countsOf(rest), openN);
      order.push(t);
    });
    var minSh = Math.min.apply(null, order.map(function(t) { return cands[t]; }));
    if (minSh < foldShanten) return null;
    var visible = visibleCounts(sample);
    var best = null, bestKey = null;
    order.forEach(function(t) {
      var risk = Math.round(ronProbability(t, sample, riichiRels, visible) * 1e6) / 1e6;
      var key = [risk, cands[t], TILE_INDEX[t]];
      if (bestKey === null || key[0] < bestKey[0] ||
          (key[0] === bestKey[0] && (key[1] < bestKey[1] || (key[1] === bestKey[1] && key[2] < bestKey[2])))) {
        best = t; bestKey = key;
      }
    });
    return best;
  }

  // ---------- まーじゃんしよかの対局状態とのつなぎ ----------
  function tileId(t) {
    if (t.suit === 'man') return t.num + 'm';
    if (t.suit === 'pin') return t.num + 'p';
    if (t.suit === 'sou') return t.num + 's';
    if (t.suit === 'wind') return ['east', 'south', 'west', 'north'][t.num - 1];
    if (t.suit === 'dragon') return ['white', 'green', 'red'][t.num - 1];
    return null;
  }

  // battle.js の state と席番号から、Pythonの「場面」と同じ形のデータを作る
  function sampleFromState(state, pidx) {
    var n = state.playerCount;
    var rels = n === 3 ? { self: 0, right: 1, top: 2 } : { self: 0, right: 1, top: 2, left: 3 };
    function seatOf(rel) { return (pidx + rels[rel]) % n; }
    function ids(arr) { return (arr || []).map(tileId); }
    var discards = {}, calls = {}, riichi = {};
    Object.keys(rels).forEach(function(rel) {
      var s = seatOf(rel);
      discards[rel] = ids(state.discards[s]);
      calls[rel] = (state.melds[s] || []).map(function(m) { return { type: m.type, tiles: ids(m.tiles) }; });
      if (rel !== 'self') riichi[rel] = !!state.riichi[s];
    });
    if (n === 3) {   // 三人麻雀には「左」の席が無い。特徴量が4人分を前提にしているので空で埋める
      discards.left = []; calls.left = []; riichi.left = false;
    }
    var indicators = [state.doraIndicator].concat(state.kanDoraIndicators || []).filter(Boolean);
    return {
      hand: ids(state.hands[pidx]),
      discards: discards,
      calls: calls,
      doraIndicators: ids(indicators),
      riichi: riichi,
      roundWind: WINDS[state.roundWind],
      playerWind: WINDS[(pidx - state.dealerSeat + n) % n],
      dealer: Object.keys(rels).filter(function(rel) { return seatOf(rel) === state.dealerSeat; })[0],
      gameMode: n === 3 ? 'sanma' : 'yonma',
    };
  }

  // 降りる場面なら、切る牌の手牌内の位置を返す。降りない・使えないときは-1
  function defenseIndex(state, pidx, foldShanten, foldDealer) {
    if (!layersBy[modeOf(state)]) return -1;
    var sample = sampleFromState(state, pidx);
    var safe = defensePickFromSample(sample, foldShanten, foldDealer);
    return safe === null ? -1 : sample.hand.indexOf(safe);
  }

  // 切る牌の手牌内の位置を返す。使えないときは-1（従来のCPUに任せる）
  function chooseDiscardIndex(state, pidx) {
    var mode = modeOf(state);
    if (!layersBy[mode]) return -1;
    var sample = sampleFromState(state, pidx);
    var target = chooseDiscardFromSample(sample, mode);
    return sample.hand.indexOf(target);
  }

  // 鳴き：'pon' / 'chi' / null。使えないときは undefined（従来のCPUに任せる）
  // chiUse：アプリがチーで使う2枚の牌ID（できないならnull）
  function decideCall(state, pidx, tile, fromIdx, chiUse) {
    if (!layersBy[modeOf(state)]) return undefined;
    if (state.riichi[pidx]) return null;
    var sample = sampleFromState(state, pidx);
    var id = tileId(tile);
    var options = [];
    if (sample.hand.filter(function(t) { return t === id; }).length >= 2) {
      options.push({ type: 'pon', use: [id, id] });
    }
    var upstream = pidx === 0 ? state.playerCount - 1 : pidx - 1;
    if (fromIdx === upstream && TILE_INDEX[id] < 27 && chiUse) {
      options.push({ type: 'chi', use: chiUse });
    }
    var pick = decideCallFromSample(sample, id, options);
    return pick ? pick.type : null;
  }

  var api = {
    load: load, ready: ready, setWeights: setWeights,
    chooseDiscardIndex: chooseDiscardIndex, defenseIndex: defenseIndex, decideCall: decideCall,
    // 検証用
    _encode: encode, _forward: forward, _chooseDiscardFromSample: chooseDiscardFromSample,
    _decideCallFromSample: decideCallFromSample, _defensePickFromSample: defensePickFromSample, _shanten: shanten, _countsOf: countsOf,
    _sampleFromState: sampleFromState, _tileId: tileId,
  };
  return api;
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Sorekiri;
