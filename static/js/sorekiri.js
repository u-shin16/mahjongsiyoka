'use strict';

/* ============================================================
   Sorekiri（それ切り）：自作の麻雀AI。CPU戦の難易度「Sorekiri」で使う。

   - 何を切るか：学習済みのニューラルネット（重みは static/models/sorekiri_v1.bin）が選ぶ。
     先生（シャンテン数と受け入れ枚数で切る牌を決める自作エンジン）の判断を真似て学習した。
   - 鳴くか：先生と同じ規則（役の見込みがあり、鳴くとシャンテン数が進むときだけ鳴く）。
   - 対象は四人麻雀。重みを読み込めていない間・三人麻雀のときは、従来のCPUの判断を使う。
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

  var layers = null;   // [{w: Float32Array(out*in), b: Float32Array(out), nIn, nOut}]
  var loading = null;

  // ---------- 重みの読み込み ----------
  function setWeights(buffer) {
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
    layers = out;
  }

  function load(url) {
    if (layers) return Promise.resolve(true);
    if (loading) return loading;
    loading = fetch(url || '/static/models/sorekiri_v1.bin')
      .then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer(); })
      .then(function(buf) { setWeights(buf); return true; })
      .catch(function() { loading = null; return false; });
    return loading;
  }

  function ready() { return !!layers; }

  // ---------- 特徴量（features.py と同じ） ----------
  function doraFromIndicator(id) {
    var i = TILE_INDEX[id];
    if (i === undefined) return null;
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
      x[plane(8, doraFromIndicator(ind))] = 1;
    });
    for (var j = 0; j < 34; j++) x[9 * 34 + j] = visible[j] / 4;

    var base = 34 * N_CHANNELS;
    OTHER_SEATS.forEach(function(seat, c) { x[base + c] = sample.riichi[seat] ? 1 : 0; });
    x[base + 3 + WINDS.indexOf(sample.playerWind)] = 1;
    x[base + 7 + WINDS.indexOf(sample.roundWind)] = 1;
    return x;
  }

  function forward(x) {
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
  function chooseDiscardFromSample(sample) {
    var logits = forward(encode(sample));
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
    var rels = { self: 0, right: 1, top: 2, left: 3 };
    function seatOf(rel) { return (pidx + rels[rel]) % n; }
    function ids(arr) { return (arr || []).map(tileId); }
    var discards = {}, calls = {}, riichi = {};
    Object.keys(rels).forEach(function(rel) {
      var s = seatOf(rel);
      discards[rel] = ids(state.discards[s]);
      calls[rel] = (state.melds[s] || []).map(function(m) { return { type: m.type, tiles: ids(m.tiles) }; });
      if (rel !== 'self') riichi[rel] = !!state.riichi[s];
    });
    var indicators = [state.doraIndicator].concat(state.kanDoraIndicators || []).filter(Boolean);
    return {
      hand: ids(state.hands[pidx]),
      discards: discards,
      calls: calls,
      doraIndicators: ids(indicators),
      riichi: riichi,
      roundWind: WINDS[state.roundWind],
      playerWind: WINDS[(pidx - state.dealerSeat + n) % n],
    };
  }

  // 切る牌の手牌内の位置を返す。使えないときは-1（従来のCPUに任せる）
  function chooseDiscardIndex(state, pidx) {
    if (!layers || state.isSanma || state.playerCount !== 4) return -1;
    var sample = sampleFromState(state, pidx);
    var target = chooseDiscardFromSample(sample);
    return sample.hand.indexOf(target);
  }

  // 鳴き：'pon' / 'chi' / null。使えないときは undefined（従来のCPUに任せる）
  // chiUse：アプリがチーで使う2枚の牌ID（できないならnull）
  function decideCall(state, pidx, tile, fromIdx, chiUse) {
    if (!layers || state.isSanma || state.playerCount !== 4) return undefined;
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
    chooseDiscardIndex: chooseDiscardIndex, decideCall: decideCall,
    // 検証用
    _encode: encode, _forward: forward, _chooseDiscardFromSample: chooseDiscardFromSample,
    _decideCallFromSample: decideCallFromSample, _shanten: shanten, _countsOf: countsOf,
    _sampleFromState: sampleFromState, _tileId: tileId,
  };
  return api;
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Sorekiri;
