'use strict';

// ============================================================
// Yaku: 役判定・点数計算の共通ロジック
// CPU戦(battle.js)・友人戦(friend.js)の両方から呼ばれる。
// 手牌の形だけに依存する部分（どの役が成立するか、翻数から
// 何点になるか）をここに集約し、席の風の決め方や立直・一発・
// ドラ表示牌の管理など「対局の進め方」に依存する部分は
// 呼び出し側（battle.js/friend.js）にそれぞれ残す。
// Agari（手牌の分解）に依存するが、逆方向の依存は持たない。
// ============================================================
var Yaku = (function() {
  var YAKUMAN_HAN = 13; // 役満1つぶんの翻数（表示・合算用。点数は別途yakumanUnitsで計算）
  var YAKUMAN_PTS = 32000; // 役満1つぶんの点数（積み満貫方式：複数役満は加算）
  var BASE_SCORES = [1000, 2000, 3900, 7700, 8000, 12000, 16000];

  function isHonorTile(t) { return t.suit === 'wind' || t.suit === 'dragon'; }
  function isTerminalTile(t) { return (t.suit === 'man' || t.suit === 'pin' || t.suit === 'sou') && (t.num === 1 || t.num === 9); }
  function isTerminalOrHonor(t) { return isHonorTile(t) || isTerminalTile(t); }
  // 發（緑發）と索子の2,3,4,6,8だけが緑一色の対象
  function isGreenTile(t) { return t.suit === 'dragon' ? t.num === 2 : (t.suit === 'sou' && [2, 3, 4, 6, 8].indexOf(t.num) >= 0); }

  // 平和判定用：順子のどの位置で和了ったかでリャンメン/ペンチャン/カンチャンを見分ける
  function isRyanmenWait(group, winningTile) {
    var nums = group.tiles.map(function(t) { return t.num; }).slice().sort(function(a, b) { return a - b; });
    var low = nums[0];
    if (winningTile.num === low + 1) return false; // 中央＝カンチャン
    if (winningTile.num === low) return low !== 7;  // 89待ちの7＝ペンチャン
    if (winningTile.num === low + 2) return low !== 1; // 12待ちの3＝ペンチャン
    return false;
  }

  // 表示牌からドラ本体を求める（9→1、北→東、中→白と一周する）
  function doraFromIndicator(ind) {
    if (!ind) return null;
    var s = ind.suit, n = ind.num;
    if (s === 'wind')   return Tiles.make('wind',   n === 4 ? 1 : n + 1);
    if (s === 'dragon') return Tiles.make('dragon', n === 3 ? 1 : n + 1);
    return Tiles.make(s, n === 9 ? 1 : n + 1);
  }

  function countMatch(tiles, kind) {
    if (!kind) return 0;
    return (tiles || []).filter(function(t) { return Tiles.isSame(t, kind); }).length;
  }

  // フリテン（自分の捨て牌によるもの）：現在の待ち牌(waits)のいずれかが
  // 自分の捨て牌(discards)に含まれていればロン不可（ツモは可）。
  // 待ちの算出（三麻の特殊フィルタ等）は呼び出し側(battle.js/friend.js)の
  // 責務のため、ここでは算出済みのwaitsを受け取るだけにする。
  function isFuritenBySelf(waits, discards) {
    if (!waits || waits.length === 0) return false;
    return (discards || []).some(function(d) {
      return waits.some(function(w) { return Tiles.isSame(d, w); });
    });
  }

  // 手牌（面子・雀頭）を役判定用のグループ配列に組み立てる。
  // 副露（ポン・チー・カン・暗カン）も含めて全ての面子を統一形式で返す。
  function buildHandGroups(hand, openMelds) {
    openMelds = openMelds || [];
    var decomp = Agari.decomposeWinningHand(hand);
    if (!decomp) return null;

    if (decomp.type === 'chiitoitsu') {
      return {
        chiitoitsu: true,
        pair: null,
        groups: decomp.groups.map(function(g) { return { kind: 'pair', tiles: g, concealed: true, isKan: false }; }),
      };
    }

    var groups = decomp.melds.map(function(m) {
      var nums = m.map(function(t) { return t.num; }).slice().sort(function(a, b) { return a - b; });
      var isTriplet = nums[0] === nums[1] && nums[1] === nums[2];
      return { kind: isTriplet ? 'triplet' : 'sequence', tiles: m, concealed: true, isKan: false };
    });
    openMelds.forEach(function(m) {
      groups.push({
        kind: m.type === 'chi' ? 'sequence' : 'triplet',
        tiles: m.tiles.slice(0, 3),
        concealed: m.type === 'ankan',
        isKan: (m.type === 'kan' || m.type === 'ankan'),
      });
    });
    return { chiitoitsu: false, pair: decomp.pair, groups: groups };
  }

  // 和了形から成立する役（形に依存するもの）を判定する。
  // 立直・一発・門前清自摸和・嶺上開花・海底摸月/河底撈魚・天和/地和/人和・
  // ドラ類・抜き北など「対局の進行」に依存する役は呼び出し側で別途加算する。
  //
  // hand: 手牌14枚, openMelds: 副露(state.melds[seat]相当),
  // isClosed: 手牌が門前かどうか, seatWindNum/roundWindNum: 自風/場風(1=東..4=北),
  // winType: 'tsumo'|'ron', winningTile: 和了牌（あれば）
  function computeShapeYaku(hand, openMelds, isClosed, seatWindNum, roundWindNum, winType, winningTile) {
    var yaku = [];

    // 国士無双：通常の面子分解とは別形なので最初に判定して抜ける
    if (Agari.isKokushiHand && Agari.isKokushiHand(hand)) {
      var kokushiDecomp = Agari.decomposeWinningHand(hand);
      var isThirteenWait = !!(winningTile && kokushiDecomp && kokushiDecomp.pairKind &&
        kokushiDecomp.pairKind.suit === winningTile.suit && kokushiDecomp.pairKind.num === winningTile.num);
      if (isThirteenWait) yaku.push({ name: '国士無双十三面待ち', han: YAKUMAN_HAN * 2, yakuman: true });
      else yaku.push({ name: '国士無双', han: YAKUMAN_HAN, yakuman: true });
      return yaku;
    }

    var open = !isClosed;
    var shape = buildHandGroups(hand, openMelds);
    if (!shape) return yaku;

    if (shape.chiitoitsu) {
      yaku.push({ name: '七対子', han: 2 });
      var suits7 = {};
      var hasHonor7 = false;
      shape.groups.forEach(function(g) {
        if (isHonorTile(g.tiles[0])) hasHonor7 = true;
        else suits7[g.tiles[0].suit] = true;
      });
      if (Object.keys(suits7).length === 1) {
        if (hasHonor7) yaku.push({ name: '混一色', han: open ? 2 : 3 });
        else yaku.push({ name: '清一色', han: open ? 5 : 6 });
      }
      if (shape.groups.every(function(g) { return isHonorTile(g.tiles[0]); })) {
        yaku.push({ name: '字一色', han: YAKUMAN_HAN, yakuman: true });
      } else if (shape.groups.every(function(g) { return isTerminalOrHonor(g.tiles[0]); })) {
        yaku.push({ name: '混老頭', han: 2 });
      }
      return yaku;
    }

    var groups = shape.groups;
    var pair = shape.pair;
    var allTiles = groups.reduce(function(acc, g) { return acc.concat(g.tiles); }, []).concat(pair);
    var seatW = seatWindNum;
    var roundW = roundWindNum;

    if (allTiles.every(function(t) { return !isTerminalOrHonor(t); })) {
      yaku.push({ name: '断幺九', han: 1 });
    }

    // 平和：門前・全て順子・役牌でない対子・リャンメン待ち
    if (!open && winningTile) {
      var allSeq = groups.every(function(g) { return g.kind === 'sequence'; });
      var pairIsValuable = pair[0].suit === 'dragon' ||
        (pair[0].suit === 'wind' && (pair[0].num === seatW || pair[0].num === roundW));
      if (allSeq && !pairIsValuable) {
        var isTankiWaitForPinfu = pair.some(function(t) { return t.id === winningTile.id; });
        if (!isTankiWaitForPinfu) {
          var pinfuGroup = groups.filter(function(g) {
            return g.tiles.some(function(t) { return t.id === winningTile.id; });
          })[0];
          if (pinfuGroup && isRyanmenWait(pinfuGroup, winningTile)) {
            yaku.push({ name: '平和', han: 1 });
          }
        }
      }
    }

    var allTriplet = groups.every(function(g) { return g.kind === 'triplet'; });
    if (allTriplet) yaku.push({ name: '対々和', han: 2 });

    var allHonor = allTiles.every(isHonorTile);
    var allTerminalOnly = allTiles.every(isTerminalTile);
    if (allHonor) {
      yaku.push({ name: '字一色', han: YAKUMAN_HAN, yakuman: true });
    } else if (allTerminalOnly) {
      yaku.push({ name: '清老頭', han: YAKUMAN_HAN, yakuman: true });
    } else if (allTiles.every(isTerminalOrHonor)) {
      yaku.push({ name: '混老頭', han: 2 });
    }
    if (allTiles.every(isGreenTile)) {
      yaku.push({ name: '緑一色', han: YAKUMAN_HAN, yakuman: true });
    }

    var everyGroupTouchesTerminalOrHonor = groups.every(function(g) {
      return g.tiles.some(isTerminalOrHonor);
    }) && isTerminalOrHonor(pair[0]);
    if (everyGroupTouchesTerminalOrHonor) {
      if (allTiles.some(isHonorTile)) yaku.push({ name: '混全帯幺九', han: open ? 1 : 2 });
      else yaku.push({ name: '純全帯幺九', han: open ? 2 : 3 });
    }

    var numberSuits = {};
    var honorUsed = false;
    allTiles.forEach(function(t) {
      if (isHonorTile(t)) honorUsed = true;
      else numberSuits[t.suit] = true;
    });
    if (Object.keys(numberSuits).length === 1) {
      if (honorUsed) yaku.push({ name: '混一色', han: open ? 2 : 3 });
      else yaku.push({ name: '清一色', han: open ? 5 : 6 });
    }

    groups.forEach(function(g) {
      if (g.kind !== 'triplet') return;
      var t = g.tiles[0];
      if (t.suit === 'dragon') {
        yaku.push({ name: '役牌（三元牌）', han: 1 });
      } else if (t.suit === 'wind') {
        var isSeat = t.num === seatW;
        var isRound = t.num === roundW;
        if (isSeat && isRound) yaku.push({ name: '連風牌', han: 2 });
        else if (isSeat || isRound) yaku.push({ name: '役牌（風牌）', han: 1 });
      }
    });

    var dragonTriplets = groups.filter(function(g) { return g.kind === 'triplet' && g.tiles[0].suit === 'dragon'; }).length;
    if (dragonTriplets === 3) {
      yaku.push({ name: '大三元', han: YAKUMAN_HAN, yakuman: true });
    } else if (dragonTriplets === 2 && pair[0].suit === 'dragon') {
      yaku.push({ name: '小三元', han: 2 });
    }

    var windTriplets = groups.filter(function(g) { return g.kind === 'triplet' && g.tiles[0].suit === 'wind'; }).length;
    if (windTriplets === 4) {
      yaku.push({ name: '大四喜', han: YAKUMAN_HAN * 2, yakuman: true });
    } else if (windTriplets === 3 && pair[0].suit === 'wind') {
      yaku.push({ name: '小四喜', han: YAKUMAN_HAN, yakuman: true });
    }

    // 九蓮宝燈：門前・一色のみで 1112345678999 の形＋余剰牌1枚
    if (!open && winningTile && !allTiles.some(isHonorTile)) {
      var chuurenSuits = {};
      allTiles.forEach(function(t) { chuurenSuits[t.suit] = true; });
      if (Object.keys(chuurenSuits).length === 1) {
        var cCounts = {};
        allTiles.forEach(function(t) { cCounts[t.num] = (cCounts[t.num] || 0) + 1; });
        var chuurenOk = (cCounts[1] || 0) >= 3 && (cCounts[9] || 0) >= 3;
        for (var cn = 2; cn <= 8; cn++) { if (!cCounts[cn]) chuurenOk = false; }
        if (chuurenOk) {
          var baseCounts = { 1: 3, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 3 };
          var restCounts = {};
          for (var bk = 1; bk <= 9; bk++) restCounts[bk] = cCounts[bk] || 0;
          restCounts[winningTile.num] = restCounts[winningTile.num] - 1;
          var isPureChuuren = true;
          for (var bk2 = 1; bk2 <= 9; bk2++) { if (restCounts[bk2] !== baseCounts[bk2]) isPureChuuren = false; }
          if (isPureChuuren) yaku.push({ name: '純正九蓮宝燈', han: YAKUMAN_HAN * 2, yakuman: true });
          else yaku.push({ name: '九蓮宝燈', han: YAKUMAN_HAN, yakuman: true });
        }
      }
    }

    var seqBySuit = { man: {}, pin: {}, sou: {} };
    var tripBySuit = { man: {}, pin: {}, sou: {} };
    groups.forEach(function(g) {
      var suit = g.tiles[0].suit;
      if (suit !== 'man' && suit !== 'pin' && suit !== 'sou') return;
      var startNum = g.tiles.map(function(t) { return t.num; }).slice().sort(function(a, b) { return a - b; })[0];
      if (g.kind === 'sequence') seqBySuit[suit][startNum] = true;
      else tripBySuit[suit][g.tiles[0].num] = true;
    });
    for (var sn = 1; sn <= 7; sn++) {
      if (seqBySuit.man[sn] && seqBySuit.pin[sn] && seqBySuit.sou[sn]) {
        yaku.push({ name: '三色同順', han: open ? 1 : 2 });
        break;
      }
    }
    for (var tn = 1; tn <= 9; tn++) {
      if (tripBySuit.man[tn] && tripBySuit.pin[tn] && tripBySuit.sou[tn]) {
        yaku.push({ name: '三色同刻', han: 2 });
        break;
      }
    }
    ['man', 'pin', 'sou'].forEach(function(suit) {
      if (seqBySuit[suit][1] && seqBySuit[suit][4] && seqBySuit[suit][7]) {
        yaku.push({ name: '一気通貫', han: open ? 1 : 2 });
      }
    });

    var kanCount = groups.filter(function(g) { return g.isKan; }).length;
    if (kanCount === 4) yaku.push({ name: '四槓子', han: YAKUMAN_HAN, yakuman: true });
    else if (kanCount === 3) yaku.push({ name: '三槓子', han: 2 });

    var ankouCount = groups.filter(function(g) {
      if (g.kind !== 'triplet' || !g.concealed) return false;
      if (winType === 'ron' && winningTile && g.tiles.some(function(t) { return t.id === winningTile.id; })) return false;
      return true;
    }).length;
    if (ankouCount === 4) {
      var isSuuankouTanki = !!(winningTile && pair.some(function(t) { return t.id === winningTile.id; }));
      if (isSuuankouTanki) yaku.push({ name: '四暗刻単騎', han: YAKUMAN_HAN * 2, yakuman: true });
      else yaku.push({ name: '四暗刻', han: YAKUMAN_HAN, yakuman: true });
    } else if (ankouCount >= 3) {
      yaku.push({ name: '三暗刻', han: 2 });
    }

    if (!open) {
      var seqCounts = {};
      groups.forEach(function(g) {
        if (g.kind !== 'sequence') return;
        var nums = g.tiles.map(function(t) { return t.num; }).slice().sort(function(a, b) { return a - b; });
        var key = g.tiles[0].suit + '_' + nums.join('');
        seqCounts[key] = (seqCounts[key] || 0) + 1;
      });
      var pairedSeqSets = Object.keys(seqCounts).filter(function(k) { return seqCounts[k] >= 2; }).length;
      if (pairedSeqSets >= 2) yaku.push({ name: '二盃口', han: 3 });
      else if (pairedSeqSets === 1) yaku.push({ name: '一盃口', han: 1 });
    }

    return yaku;
  }

  // 役の内訳(yakuList)から翻数・点数・表示ラベルを求める（積み満貫方式）
  function calcPoints(yakuList) {
    var han = yakuList.reduce(function(a, y) { return a + y.han; }, 0);
    var yakumanUnits = yakuList.reduce(function(a, y) { return a + (y.yakuman ? Math.round(y.han / YAKUMAN_HAN) : 0); }, 0);
    var pts = yakumanUnits > 0
      ? yakumanUnits * YAKUMAN_PTS
      : BASE_SCORES[Math.min(Math.max(han, 1) - 1, BASE_SCORES.length - 1)];
    var label = yakumanUnits > 0 ? '役満' : (han >= 5 ? '満貫' : han + '翻');
    return { han: han, pts: pts, label: label, yakumanUnits: yakumanUnits };
  }

  return {
    YAKUMAN_HAN: YAKUMAN_HAN,
    YAKUMAN_PTS: YAKUMAN_PTS,
    BASE_SCORES: BASE_SCORES,
    isHonorTile: isHonorTile,
    isTerminalTile: isTerminalTile,
    isTerminalOrHonor: isTerminalOrHonor,
    isGreenTile: isGreenTile,
    isRyanmenWait: isRyanmenWait,
    doraFromIndicator: doraFromIndicator,
    countMatch: countMatch,
    isFuritenBySelf: isFuritenBySelf,
    buildHandGroups: buildHandGroups,
    computeShapeYaku: computeShapeYaku,
    calcPoints: calcPoints,
  };
})();
