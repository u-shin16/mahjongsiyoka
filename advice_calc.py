# ============================================================
#  対局中アドバイスの計算（シャンテン数・受け入れ枚数・つながりやすさ）
#
#  2026-09-24：これまでは手牌と捨て牌をそのままGeminiに渡し、
#  「何を切るか」をAIの感覚に任せていた。AIは見えている牌を数え間違え、
#  受け入れ枚数が同点の牌から字牌を残して9萬を切らせることもあった。
#  「従えば最も早く上がれる」を基準に、切る牌はここで決める。
# ============================================================
from functools import lru_cache

HONOR_IDS = ['east', 'south', 'west', 'north', 'white', 'green', 'red']
TILE_ORDER = ([f'{n}m' for n in range(1, 10)] + [f'{n}p' for n in range(1, 10)]
              + [f'{n}s' for n in range(1, 10)] + HONOR_IDS)
TILE_INDEX = {t: i for i, t in enumerate(TILE_ORDER)}
TERMINAL_INDEXES = [0, 8, 9, 17, 18, 26] + list(range(27, 34))
# 三人麻雀では2萬〜8萬を使わない
SANMA_ABSENT = {f'{n}m' for n in range(2, 9)}


def _counts(tile_ids):
    counts = [0] * 34
    for t in tile_ids:
        i = TILE_INDEX.get(t)
        if i is not None:
            counts[i] += 1
    return counts


@lru_cache(maxsize=None)
def _suit_blocks(counts, is_honor):
    """1色ぶんの枚数から、取り得る（面子数, 塔子数, 雀頭の有無）の組を全部返す。"""
    i = next((k for k, c in enumerate(counts) if c > 0), -1)
    if i < 0:
        return frozenset({(0, 0, 0)})
    results = set()

    def take(delta, add):
        c = list(counts)
        for k in delta:
            c[k] -= 1
        for m, t, h in _suit_blocks(tuple(c), is_honor):
            nh = h + add[2]
            if nh <= 1:
                results.add((m + add[0], t + add[1], nh))

    # 1枚を浮き牌として捨てる
    take([i], (0, 0, 0))
    if counts[i] >= 2:
        take([i, i], (0, 0, 1))   # 雀頭
        take([i, i], (0, 1, 0))   # 対子を塔子として使う
    if counts[i] >= 3:
        take([i, i, i], (1, 0, 0))
    if not is_honor:
        if i + 1 < 9 and counts[i + 1] > 0:
            take([i, i + 1], (0, 1, 0))
            if i + 2 < 9 and counts[i + 2] > 0:
                take([i, i + 1, i + 2], (1, 0, 0))
        if i + 2 < 9 and counts[i + 2] > 0:
            take([i, i + 2], (0, 1, 0))
    return frozenset(results)


def _standard_shanten(counts, open_melds):
    parts = [
        _suit_blocks(tuple(counts[0:9]), False),
        _suit_blocks(tuple(counts[9:18]), False),
        _suit_blocks(tuple(counts[18:27]), False),
        _suit_blocks(tuple(counts[27:34]), True),
    ]
    best = 8
    combos = {(open_melds, 0, 0)}
    for part in parts:
        combos = {(m + pm, t + pt, h + ph)
                  for m, t, h in combos for pm, pt, ph in part if h + ph <= 1}
    for m, t, h in combos:
        t = min(t, 4 - m) if m <= 4 else 0
        best = min(best, 8 - 2 * m - t - h)
    return best


def _chiitoi_shanten(counts):
    pairs = sum(1 for c in counts if c >= 2)
    kinds = sum(1 for c in counts if c > 0)
    return 6 - pairs + max(0, 7 - kinds)


def _kokushi_shanten(counts):
    kinds = sum(1 for i in TERMINAL_INDEXES if counts[i] > 0)
    has_pair = any(counts[i] >= 2 for i in TERMINAL_INDEXES)
    return 13 - kinds - (1 if has_pair else 0)


def shanten(counts, open_melds=0):
    """シャンテン数。-1は和了形、0はテンパイ。"""
    result = _standard_shanten(counts, open_melds)
    if open_melds == 0:
        result = min(result, _chiitoi_shanten(counts), _kokushi_shanten(counts))
    return result


def dora_from_indicator(tile_id):
    i = TILE_INDEX.get(tile_id)
    if i is None:
        return None
    if i < 27:
        base = i - i % 9
        return TILE_ORDER[base + (i % 9 + 1) % 9]
    if i < 31:
        return TILE_ORDER[27 + (i - 27 + 1) % 4]
    return TILE_ORDER[31 + (i - 31 + 1) % 3]


WIND_NAME_TO_ID = {'東': 'east', '南': 'south', '西': 'west', '北': 'north'}


def analyze_discards(situation):
    """切る牌ごとに、切った後のシャンテン数・受け入れ枚数・つながりやすさを出す。

    受け入れ枚数は「4枚 − 見えている枚数」で数える。見えている牌は
    自分の手牌・全員の捨て牌・全員の鳴いた牌・ドラ表示牌。
    """
    hand = situation['hand']
    open_melds = len(situation['calls'].get('self') or [])
    sanma = situation.get('gameMode') == 'sanma'

    visible = list(hand) + list(situation.get('doraIndicators') or [])
    for seat_discards in situation['discards'].values():
        visible += seat_discards
    for seat_calls in situation['calls'].values():
        for meld in seat_calls or []:
            if isinstance(meld, dict) and isinstance(meld.get('tiles'), list):
                visible += [t for t in meld['tiles'] if t in TILE_INDEX]
    visible_counts = _counts(visible)

    def remaining(i):
        if sanma and TILE_ORDER[i] in SANMA_ABSENT:
            return 0
        return max(0, 4 - visible_counts[i])

    doras = {dora_from_indicator(t) for t in situation.get('doraIndicators') or []}
    # 役牌（三元牌・場風・自風）は2枚そろえば鳴いて役になるので、オタ風より残す
    yakuhai = {'white', 'green', 'red'}
    for key in ('roundWind', 'playerWind'):
        wind = WIND_NAME_TO_ID.get(situation.get(key) or '')
        if wind:
            yakuhai.add(wind)

    hand_counts = _counts(hand)
    results = []
    for tile in dict.fromkeys(hand):
        i = TILE_INDEX[tile]
        after = list(hand_counts)
        after[i] -= 1
        base = shanten(after, open_melds)
        ukeire_tiles = []
        ukeire = 0
        for j in range(34):
            if after[j] >= 4:
                continue
            left = remaining(j)
            after[j] += 1
            improves = shanten(after, open_melds) < base
            after[j] -= 1
            if improves:
                ukeire_tiles.append(TILE_ORDER[j])
                ukeire += left
        # つながりやすさ：この牌の近く（同じ色の±2）にまだ残っている枚数。
        # 受け入れ枚数が同点のとき、つながりにくい牌から切るために使う。
        if i < 27:
            lo, hi = i - i % 9, i - i % 9 + 8
            neighbors = [k for k in range(max(lo, i - 2), min(hi, i + 2) + 1)]
        else:
            neighbors = [i]
        connect = sum(remaining(k) for k in neighbors)
        results.append({
            'tile': tile,
            'shanten': base,
            'ukeire': ukeire,
            'ukeireTiles': ukeire_tiles,
            'connect': connect,
            'isHonor': i >= 27,
            'isYakuhai': tile in yakuhai,
            'isDora': tile in doras,
        })
    return results


def pick_best(analysis):
    """いちばん早く上がれる打牌を選ぶ。
    1. 切った後のシャンテン数が小さい
    2. 受け入れ枚数が多い
    3. つながりにくい牌（字牌・端の牌）から切る
    4. 同じなら役牌・ドラは残す
    """
    return min(analysis, key=lambda c: (
        c['shanten'], -c['ukeire'], c['connect'] + (1 if c['isYakuhai'] else 0), c['isDora']))


def advice_reason(best, analysis):
    """おすすめの理由を、初心者にも読める短い一文にする。"""
    if best['shanten'] == 0:
        return f'テンパイ。待ちは残り{best["ukeire"]}枚'
    tied = [c for c in analysis
            if (c['shanten'], c['ukeire']) == (best['shanten'], best['ukeire'])]
    if len(tied) == 1:
        return f'進める牌が{best["ukeire"]}枚で最多'
    if best['isHonor']:
        return '字牌はつながらず使いにくい'
    return 'ほかの牌とつながりにくい'
