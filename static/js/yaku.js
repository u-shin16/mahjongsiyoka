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
  // 30符のときの点数表（参考用。2026-10-22から点数は符と翻から計算する）
  var BASE_SCORES = [1000, 2000, 3900, 7700, 8000, 12000, 16000]; // 子・30符
  var DEALER_BASE_SCORES = [1500, 2900, 5800, 11600];               // 親・30符

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
  // isSanma：三人麻雀では2〜8萬が無いので、萬子は 1→9・9→1 とする
  function doraFromIndicator(ind, isSanma) {
    if (!ind) return null;
    var s = ind.suit, n = ind.num;
    if (isSanma && s === 'man') return Tiles.make('man', n === 1 ? 9 : 1);
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
  function buildHandGroups(hand, openMelds, skipChiitoitsu) {
    openMelds = openMelds || [];
    var decomp = Agari.decomposeWinningHand(hand, skipChiitoitsu);
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
  // 和了形から成立する役（形に依存するもの）を判定する。
  //
  // 二盃口の手は牌の並びが必ず7つの対子にもなるため、そのままだと常に
  // 七対子として読まれて二盃口が一度も成立しなかった。麻雀には高点法
  // （複数の読み方ができるときは点数が高くなる読み方を採る）という規則が
  // あるので、両方の読み方で数えて高いほうを返す。
  function computeShapeYaku(hand, openMelds, isClosed, seatWindNum, roundWindNum, winType, winningTile) {
    // 国士無双：通常の面子分解とは別形なので最初に判定して抜ける
    if (Agari.isKokushiHand && Agari.isKokushiHand(hand)) {
      var yaku = [];
      var kokushiDecomp = Agari.decomposeWinningHand(hand);
      var isThirteenWait = !!(winningTile && kokushiDecomp && kokushiDecomp.pairKind &&
        kokushiDecomp.pairKind.suit === winningTile.suit && kokushiDecomp.pairKind.num === winningTile.num);
      if (isThirteenWait) yaku.push({ name: '国士無双十三面待ち', han: YAKUMAN_HAN * 2, yakuman: true });
      else yaku.push({ name: '国士無双', han: YAKUMAN_HAN, yakuman: true });
      return yaku;
    }

    var open = !isClosed;
    var best = bestShape(hand, openMelds, open, seatWindNum, roundWindNum, winType, winningTile);
    if (!best) return [];
    var out = best.yaku;
    // 符は和了形で決まるので、役の一覧に添えて返す（呼び出し側が calcPoints に渡す）。
    // 配列の要素ではなく見えない属性にしておけば、役の一覧の扱いは今までどおり。
    Object.defineProperty(out, 'fu', { value: best.fu, enumerable: false, writable: true });
    Object.defineProperty(out, 'fuDetail', { value: best.fuDetail, enumerable: false, writable: true });
    return out;
  }

  // ===== 高点法と符計算（2026-10-22）=====
  // 以前は手の分け方を1通りだけ読み、点数は30符で決め打ちしていた。
  // 符は「分け方」と「和了牌がどの面子に入ったか」で変わるので、ありうる組み合わせを
  // 全部数えて、いちばん点数が高い読み方を採る（高点法）。
  // ルールは天鳳に合わせる：連風牌の雀頭は4符、平和ツモは20符、鳴いた平和形は30符、
  // 七対子は25符、切り上げ満貫なし、数え役満あり。

  function sameKind(a, b) { return a && b && Tiles.isSame(a, b); }

  // 手牌（副露を除く）を「雀頭1つ＋面子」に分ける方法をすべて挙げる
  function allStandardDecomps(tiles) {
    var sorted = Tiles.sortTiles(tiles);
    var out = [];
    var seen = {};
    function key(t) { return t.suit + (t.color || '') + t.num; }
    function sets(rest, acc, pair) {
      if (rest.length === 0) {
        var sig = key(pair[0]) + '|' + acc.map(function(g) { return g.map(key).join(','); }).sort().join('/');
        if (!seen[sig]) { seen[sig] = true; out.push({ pair: pair, melds: acc.slice() }); }
        return;
      }
      var t = rest[0];
      var same = rest.filter(function(x) { return sameKind(x, t); });
      if (same.length >= 3) {
        var tri = same.slice(0, 3);
        sets(rest.filter(function(x) { return tri.indexOf(x) < 0; }), acc.concat([tri]), pair);
      }
      var t2 = rest.filter(function(x) { return x.suit === t.suit && (x.color || '') === (t.color || '') && x.num === t.num + 1; })[0];
      var t3 = rest.filter(function(x) { return x.suit === t.suit && (x.color || '') === (t.color || '') && x.num === t.num + 2; })[0];
      if (t2 && t3 && Tiles.isSequence([t, t2, t3])) {
        sets(rest.filter(function(x) { return x !== t && x !== t2 && x !== t3; }), acc.concat([[t, t2, t3]]), pair);
      }
    }
    var tried = {};
    sorted.forEach(function(t) {
      var k = key(t);
      if (tried[k]) return;
      tried[k] = true;
      var same = sorted.filter(function(x) { return sameKind(x, t); });
      if (same.length < 2) return;
      var pair = same.slice(0, 2);
      sets(sorted.filter(function(x) { return pair.indexOf(x) < 0; }), [], pair);
    });
    return out;
  }

  function toShape(decomp, openMelds) {
    var groups = decomp.melds.map(function(m) {
      var isTriplet = sameKind(m[0], m[1]) && sameKind(m[1], m[2]);
      return { kind: isTriplet ? 'triplet' : 'sequence', tiles: m.slice(), concealed: true, isKan: false };
    });
    (openMelds || []).forEach(function(m) {
      groups.push({
        kind: m.type === 'chi' ? 'sequence' : 'triplet',
        tiles: m.tiles.slice(0, 3),
        concealed: m.type === 'ankan',
        isKan: (m.type === 'kan' || m.type === 'ankan'),
        open: true,
      });
    });
    return { chiitoitsu: false, pair: decomp.pair.slice(), groups: groups };
  }

  // 和了牌が「どの面子（または雀頭）で完成したか」を全通り作る。
  // 同じ種類の牌は入れ替えても同じなので、和了牌と同じ種類の牌を持つ面子ごとに、
  // その面子の牌を和了牌そのものと入れ替えた形を作る（役判定は和了牌のidで見るため）。
  function winningPlacements(shape, winningTile) {
    if (!winningTile) return [shape];
    var holders = [];
    if (shape.pair.some(function(t) { return sameKind(t, winningTile); })) holders.push(-1);
    shape.groups.forEach(function(g, i) {
      if (!g.open && g.tiles.some(function(t) { return sameKind(t, winningTile); })) holders.push(i);
    });
    var out = [];
    holders.forEach(function(h) {
      var copy = { chiitoitsu: false, pair: shape.pair.slice(),
        groups: shape.groups.map(function(g) { return Object.assign({}, g, { tiles: g.tiles.slice() }); }) };
      var target = h === -1 ? copy.pair : copy.groups[h].tiles;
      // 牌は並べ替えで別の物になっていることがあるので、同じ牌かはidで比べる
      var idx = function(list) { return list.findIndex(function(t) { return t.id === winningTile.id; }); };
      // 今、和了牌（id）が入っている場所
      var fromList = idx(copy.pair) >= 0 ? copy.pair : null;
      copy.groups.forEach(function(g) { if (idx(g.tiles) >= 0) fromList = g.tiles; });
      if (idx(target) < 0) {
        var j = target.findIndex(function(t) { return sameKind(t, winningTile); });
        var displaced = target[j];
        target[j] = winningTile;
        if (fromList) fromList[idx(fromList)] = displaced;
      }
      out.push(copy);
    });
    return out.length ? out : [shape];
  }

  // 符を数える。shape は和了牌が入った面子が確定したもの
  function computeFu(shape, open, seatW, roundW, winType, winningTile, yaku) {
    if (shape.chiitoitsu) return { fu: 25, detail: [{ name: '七対子', fu: 25 }] };
    var isPinfu = yaku.some(function(y) { return y.name === '平和'; });
    if (isPinfu) {
      return winType === 'tsumo'
        ? { fu: 20, detail: [{ name: '平和ツモ', fu: 20 }] }
        : { fu: 30, detail: [{ name: '副底', fu: 20 }, { name: '門前ロン', fu: 10 }] };
    }
    var detail = [{ name: '副底', fu: 20 }];
    var fu = 20;
    function add(name, n) { if (n > 0) { detail.push({ name: name, fu: n }); fu += n; } }
    if (!open && winType === 'ron') add('門前ロン', 10);
    if (winType === 'tsumo') add('ツモ', 2);

    var isWin = function(list) { return !!(winningTile && list.some(function(t) { return t.id === winningTile.id; })); };
    shape.groups.forEach(function(g) {
      if (g.kind !== 'triplet') return;
      var yao = isTerminalOrHonor(g.tiles[0]);
      // ロンで完成させた刻子は、明刻（さらした刻子）と同じに数える
      var concealed = g.concealed && !(winType === 'ron' && !g.open && isWin(g.tiles));
      var n = (yao ? 4 : 2) * (concealed ? 2 : 1) * (g.isKan ? 4 : 1);
      add((yao ? '么九牌の' : '中張牌の') + (concealed ? '暗' : '明') + (g.isKan ? '槓' : '刻'), n);
    });
    var p = shape.pair[0];
    if (p.suit === 'dragon') add('役牌の雀頭', 2);
    if (p.suit === 'wind') {
      var pairFu = (p.num === seatW ? 2 : 0) + (p.num === roundW ? 2 : 0);
      add(pairFu === 4 ? '連風牌の雀頭' : '役牌の雀頭', pairFu);
    }
    if (winningTile) {
      if (isWin(shape.pair)) add('単騎待ち', 2);
      else {
        var wg = shape.groups.filter(function(g) { return !g.open && isWin(g.tiles); })[0];
        if (wg && wg.kind === 'sequence' && !isRyanmenWait(wg, winningTile)) {
          var nums = wg.tiles.map(function(t) { return t.num; }).sort(function(a, b) { return a - b; });
          add(winningTile.num === nums[1] ? '嵌張待ち' : '辺張待ち', 2);
        }
      }
    }
    // 鳴いていて符が1つも付かない形（鳴いた平和形）は30符にする
    if (open && fu === 20) { detail.push({ name: '鳴いた平和形は30符', fu: 10 }); fu = 30; }
    var rounded = Math.ceil(fu / 10) * 10;
    if (rounded !== fu) detail.push({ name: '10符単位に切り上げ', fu: rounded - fu });
    return { fu: rounded, detail: detail };
  }

  // すべての読み方の中から、点数がいちばん高いもの（同点なら翻、次に符が多いもの）を選ぶ
  function bestShape(hand, openMelds, open, seatW, roundW, winType, winningTile) {
    var candidates = [];
    function consider(shape) {
      var yaku = shapeYakuFrom(shape, open, seatW, roundW, winType, winningTile);
      var f = computeFu(shape, open, seatW, roundW, winType, winningTile, yaku);
      var pts = calcPoints(yaku, false, f.fu);
      // 役が1つも無い読み方は0点として比べる（calcPointsは0翻を1翻として数えるため）
      candidates.push({ yaku: yaku, fu: f.fu, fuDetail: f.detail, pts: yaku.length ? pts.pts : 0, han: pts.han });
    }
    var seven = Agari.decomposeWinningHand(hand);
    if (seven && seven.type === 'chiitoitsu') {
      consider({ chiitoitsu: true, pair: null,
        groups: seven.groups.map(function(g) { return { kind: 'pair', tiles: g, concealed: true, isKan: false }; }) });
    }
    allStandardDecomps(hand).forEach(function(d) {
      winningPlacements(toShape(d, openMelds), winningTile).forEach(consider);
    });
    if (candidates.length === 0) return null;
    candidates.sort(function(a, b) { return (b.pts - a.pts) || (b.han - a.han) || (b.fu - a.fu); });
    return candidates[0];
  }

  // ひとつの和了形（shape）から、形に依存する役を数え上げる。
  // どの読み方を採るかの判断は computeShapeYaku 側が持つ。
  function shapeYakuFrom(shape, open, seatWindNum, roundWindNum, winType, winningTile) {
    var yaku = [];
    if (!shape) return yaku;

    if (shape.chiitoitsu) {
      yaku.push({ name: '七対子', han: 2 });
      // 断幺九は通常形と同じく七対子にも付く（1翻）。
      if (shape.groups.every(function(g) { return !isTerminalOrHonor(g.tiles[0]); })) {
        yaku.push({ name: '断幺九', han: 1 });
      }
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
    // 混老頭・清老頭（么九牌だけの手）のときは、混全帯幺九・純全帯幺九は付かない
    if (everyGroupTouchesTerminalOrHonor && !allTiles.every(isTerminalOrHonor)) {
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
        // 三元牌は「役牌」でまとめず、白／發／中をそれぞれ独立した役名で表示する
        yaku.push({ name: Tiles.label(t), han: 1 });
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

  // 役満が1つでもあるときは、役満だけを数える（立直・ドラなど他の役は点数にも表示にも入れない）。
  // 役満が複数あるときは、その数だけの倍役満になる（calcPointsが数える）。
  function onlyYakuman(yakuList) {
    var yakuman = yakuList.filter(function(y) { return y.yakuman; });
    return yakuman.length > 0 ? yakuman : yakuList;
  }

  function round100(n) { return Math.ceil(n / 100) * 100; }

  // 役の内訳(yakuList)と符から、翻数・点数・表示ラベルを求める（積み満貫方式）。
  // 基本点 = 符 × 2の(翻+2)乗（2000点で満貫）。ロンは子4倍・親6倍、
  // ツモは子の和了なら親が2倍・子が1倍、親の和了なら全員が2倍を払う（どれも100点単位に切り上げ）。
  // fu を省くと30符として数える（30符のときは以前の点数表と同じ点数になる）。
  function calcPoints(yakuList, isDealer, fu) {
    fu = fu || 30;
    var han = yakuList.reduce(function(a, y) { return a + y.han; }, 0);
    var yakumanUnits = yakuList.reduce(function(a, y) { return a + (y.yakuman ? Math.round(y.han / YAKUMAN_HAN) : 0); }, 0);
    var base, label;
    if (yakumanUnits > 0) {
      base = 8000 * yakumanUnits;
      label = yakumanUnits > 1 ? (yakumanUnits + '倍役満') : '役満';
    } else if (han >= 13) {
      // 役満そのものではなく翻数の積み上げで13翻以上になった場合（数え役満）
      base = 8000; label = '役満';
    } else if (han >= 11) {
      base = 6000; label = '三倍満';
    } else if (han >= 8) {
      base = 4000; label = '倍満';
    } else if (han >= 6) {
      base = 3000; label = '跳満';
    } else if (han >= 5) {
      base = 2000; label = '満貫';
    } else {
      base = fu * Math.pow(2, Math.max(han, 1) + 2);
      if (base >= 2000) { base = 2000; label = '満貫'; }
      else label = han + '翻' + fu + '符';
    }
    var pts = round100(base * (isDealer ? 6 : 4));
    return {
      han: han, fu: fu, base: base, pts: pts, label: label, yakumanUnits: yakumanUnits,
      // ツモのときの払い方（親の和了なら tsumoEach を全員が、子の和了なら親が tsumoFromDealer・子が tsumoFromChild）
      tsumoEach: round100(base * 2),
      tsumoFromDealer: round100(base * 2),
      tsumoFromChild: round100(base),
    };
  }

  return {
    YAKUMAN_HAN: YAKUMAN_HAN,
    YAKUMAN_PTS: YAKUMAN_PTS,
    BASE_SCORES: BASE_SCORES,
    DEALER_BASE_SCORES: DEALER_BASE_SCORES,
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
    computeFu: computeFu,
    allStandardDecomps: allStandardDecomps,
    calcPoints: calcPoints,
    onlyYakuman: onlyYakuman,
  };
})();
