'use strict';

const Agari = (() => {
  function canFormSets(tiles) {
    if (tiles.length === 0) return true;
    if (tiles.length % 3 !== 0) return false;

    const sorted = Tiles.sortTiles(tiles);
    const first = sorted[0];
    const rest = sorted.slice(1);

    // Try triplet
    const i1 = rest.findIndex(t => Tiles.isSame(t, first));
    if (i1 !== -1) {
      const rest2 = rest.filter((_, i) => i !== i1);
      const i2 = rest2.findIndex(t => Tiles.isSame(t, first));
      if (i2 !== -1) {
        if (canFormSets(rest2.filter((_, i) => i !== i2))) return true;
      }
    }

    // Try sequence
    const suit = first.suit;
    if (suit !== 'wind' && suit !== 'dragon') {
      const matchColor = suit === 'colored' ? first.color : null;
      const idx2 = rest.findIndex(t => t.suit === suit && t.num === first.num + 1 && (!matchColor || t.color === matchColor));
      if (idx2 !== -1) {
        const rest2 = rest.filter((_, i) => i !== idx2);
        const idx3 = rest2.findIndex(t => t.suit === suit && t.num === first.num + 2 && (!matchColor || t.color === matchColor));
        if (idx3 !== -1) {
          if (canFormSets(rest2.filter((_, i) => i !== idx3))) return true;
        }
      }
    }

    return false;
  }

  // canFormSets と同じ探索だが、判定だけでなく実際に見つけた組（面子）を返す。
  // 和了結果画面で「きちんと理牌」して面子ごとに分けて表示するために使う。
  function decomposeSets(tiles) {
    if (tiles.length === 0) return [];
    if (tiles.length % 3 !== 0) return null;

    const sorted = Tiles.sortTiles(tiles);
    const first = sorted[0];
    const rest = sorted.slice(1);

    // Try triplet
    const i1 = rest.findIndex(t => Tiles.isSame(t, first));
    if (i1 !== -1) {
      const rest2 = rest.filter((_, i) => i !== i1);
      const i2 = rest2.findIndex(t => Tiles.isSame(t, first));
      if (i2 !== -1) {
        const rest3 = rest2.filter((_, i) => i !== i2);
        const sub = decomposeSets(rest3);
        if (sub !== null) return [[first, rest[i1], rest2[i2]], ...sub];
      }
    }

    // Try sequence
    const suit = first.suit;
    if (suit !== 'wind' && suit !== 'dragon') {
      const matchColor = suit === 'colored' ? first.color : null;
      const idx2 = rest.findIndex(t => t.suit === suit && t.num === first.num + 1 && (!matchColor || t.color === matchColor));
      if (idx2 !== -1) {
        const rest2 = rest.filter((_, i) => i !== idx2);
        const idx3 = rest2.findIndex(t => t.suit === suit && t.num === first.num + 2 && (!matchColor || t.color === matchColor));
        if (idx3 !== -1) {
          const rest3 = rest2.filter((_, i) => i !== idx3);
          const sub = decomposeSets(rest3);
          if (sub !== null) return [[first, rest[idx2], rest2[idx3]], ...sub];
        }
      }
    }

    return null;
  }

  // 国士無双（13種の么九牌が1枚ずつ＋そのうち1種が対子）の判定。
  // 14枚のときだけ和了形として成立する。
  const KOKUSHI_KINDS = [
    { suit: 'man', num: 1 }, { suit: 'man', num: 9 },
    { suit: 'pin', num: 1 }, { suit: 'pin', num: 9 },
    { suit: 'sou', num: 1 }, { suit: 'sou', num: 9 },
    { suit: 'wind', num: 1 }, { suit: 'wind', num: 2 }, { suit: 'wind', num: 3 }, { suit: 'wind', num: 4 },
    { suit: 'dragon', num: 1 }, { suit: 'dragon', num: 2 }, { suit: 'dragon', num: 3 },
  ];
  function isKokushiKind(t) {
    return KOKUSHI_KINDS.some(k => k.suit === t.suit && k.num === t.num);
  }
  function decomposeKokushi(tiles) {
    if (!tiles || tiles.length !== 14) return null;
    if (!tiles.every(isKokushiKind)) return null;
    const counts = new Map();
    for (const t of tiles) {
      const key = t.suit + '_' + t.num;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    let pairKind = null;
    for (const k of KOKUSHI_KINDS) {
      const key = k.suit + '_' + k.num;
      const c = counts.get(key) || 0;
      if (c === 0) return null;
      if (c > 2) return null;
      if (c === 2) {
        if (pairKind) return null; // 対子は1種類だけ
        pairKind = k;
      }
    }
    if (!pairKind) return null;
    return { type: 'kokushi', pairKind };
  }
  function isKokushiHand(tiles) {
    return decomposeKokushi(tiles) !== null;
  }

  // 和了形（13+1枚）を、雀頭＋4面子（通常形）・7対子・国士無双に分解する。
  // 分解できなければ null（呼び出し側でフラットソートにフォールバックする）。
  // skipChiitoitsu: 七対子として読むのをやめ、通常形（4面子1雀頭）だけで分解する。
  // 二盃口の手はどれも七対子としても読めるため、高点法（点数が高くなる読み方を
  // 採る規則）の比較用に、通常形の分解も取り出せるようにしている。
  function decomposeWinningHand(tiles, skipChiitoitsu) {
    if (!tiles || tiles.length < 2) return null;

    if (tiles.length === 14) {
      const kokushi = decomposeKokushi(tiles);
      if (kokushi) return kokushi;

      const sorted = Tiles.sortTiles(tiles);
      const used = new Array(sorted.length).fill(false);
      const pairs = [];
      for (let i = 0; i < sorted.length; i++) {
        if (used[i]) continue;
        for (let j = i + 1; j < sorted.length; j++) {
          if (!used[j] && Tiles.isSame(sorted[i], sorted[j])) {
            pairs.push([sorted[i], sorted[j]]);
            used[i] = true;
            used[j] = true;
            break;
          }
        }
      }
      // 七対子は**7種類の異なる牌**の対子が要る。
      // 同じ牌4枚を2つの対子として数えることはできない（第10章のクイズでも
      // そう教えている）。種類を数えずに対子の数だけ見ていたため、
      // 4枚使いの手が七対子として成立していた。
      var kinds = {};
      pairs.forEach(function(pr) { kinds[pr[0].suit + '_' + pr[0].num] = true; });
      var distinct = Object.keys(kinds).length;
      if (pairs.length === 7 && distinct === 7 && !skipChiitoitsu) {
        return { type: 'chiitoitsu', groups: pairs };
      }
    }

    const sorted = Tiles.sortTiles(tiles);
    for (let i = 0; i < sorted.length - 1; i++) {
      if (Tiles.isSame(sorted[i], sorted[i + 1])) {
        const remaining = sorted.filter((_, idx) => idx !== i && idx !== i + 1);
        const melds = decomposeSets(remaining);
        if (melds !== null) {
          return { type: 'standard', pair: [sorted[i], sorted[i + 1]], melds };
        }
        while (i + 2 < sorted.length && Tiles.isSame(sorted[i], sorted[i + 2])) i++;
      }
    }

    return null;
  }

  function isWinningHand(tiles) {
    if (!tiles || tiles.length < 2) return false;

    if (tiles.length === 14 && isKokushiHand(tiles)) return true;

    // Chiitoitsu (7 pairs) for 14-tile hands
    if (tiles.length === 14) {
      const sorted = Tiles.sortTiles(tiles);
      let pairs = 0;
      const used = new Array(sorted.length).fill(false);
      for (let i = 0; i < sorted.length; i++) {
        if (used[i]) continue;
        for (let j = i + 1; j < sorted.length; j++) {
          if (!used[j] && Tiles.isSame(sorted[i], sorted[j])) {
            pairs++;
            used[j] = true;
            break;
          }
        }
      }
      if (pairs === 7) return true;
    }

    // Standard: try each pair as head
    const sorted = Tiles.sortTiles(tiles);
    for (let i = 0; i < sorted.length - 1; i++) {
      if (Tiles.isSame(sorted[i], sorted[i + 1])) {
        const remaining = sorted.filter((_, idx) => idx !== i && idx !== i + 1);
        if (canFormSets(remaining)) return true;
        // skip duplicates
        while (i + 2 < sorted.length && Tiles.isSame(sorted[i], sorted[i + 2])) i++;
      }
    }

    return false;
  }

  // For num-only tiles (Chapter 1): hand is array of numbers
  function isWinningNums(nums) {
    const tiles = nums.map((n, i) => ({ suit: 'num', num: n, id: `n${i}` }));
    return isWinningHand(tiles);
  }

  // Check if a single number tile added to 13-tile hand makes it win
  function numHandWaitsFor(hand13nums) {
    const waits = [];
    for (let n = 1; n <= 9; n++) {
      if (isWinningNums([...hand13nums, n])) waits.push(n);
    }
    return waits;
  }

  // 待ち牌を返す。
  //
  // usedTiles には、手牌以外で自分が使っている牌（副露・暗槓・抜き北）を渡す。
  // 同じ牌は全部で4枚しかないため、**自分で4枚使い切っている牌は待ちにならない**。
  // 除外しないと、永久に和了れない形でリーチできてしまい、流局でもテンパイ扱いになる。
  function getTenpaiWaits(tiles13, usedTiles) {
    const waits = [];
    const allSuits = ['man', 'pin', 'sou'];

    // 自分が持っている枚数を数える（手牌＋副露など）
    const held = {};
    const countUp = (t) => {
      if (!t || t.suit == null) return;
      const key = t.suit + '_' + t.num;
      held[key] = (held[key] || 0) + 1;
    };
    (tiles13 || []).forEach(countUp);
    (usedTiles || []).forEach(countUp);
    const isExhausted = (suit, num) => (held[suit + '_' + num] || 0) >= 4;

    const tryWait = (suit, num) => {
      if (isExhausted(suit, num)) return;   // 5枚目は存在しない
      const test = { suit, num, id: 'test_wait' };
      if (isWinningHand([...tiles13, test])) waits.push({ suit, num });
    };

    for (const suit of allSuits) {
      for (let n = 1; n <= 9; n++) tryWait(suit, n);
    }
    for (let n = 1; n <= 4; n++) tryWait('wind', n);
    for (let n = 1; n <= 3; n++) tryWait('dragon', n);
    return waits;
  }

  return { isWinningHand, isWinningNums, numHandWaitsFor, getTenpaiWaits, canFormSets, decomposeWinningHand, isKokushiHand };
})();
