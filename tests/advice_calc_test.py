# ============================================================
# AIアドバイス用の計算（advice_calc.py）と /api/mahjong/advice のテスト
#
# 実行:  sh tests/run.sh
# ============================================================
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import advice_calc as calc  # noqa: E402
import app as app_module  # noqa: E402

passed = 0
fails = []


def check(label, actual, expected):
    global passed
    if actual == expected:
        passed += 1
    else:
        fails.append(f'{label}: 期待 {expected!r} / 実際 {actual!r}')


def tiles(text):
    """'123m 45p east' → ['1m','2m','3m','4p','5p','east']"""
    out = []
    for part in text.split():
        if part[-1] in 'mps' and part[:-1].isdigit():
            out += [d + part[-1] for d in part[:-1]]
        else:
            out.append(part)
    return out


def situation(hand, discards=None, riichi=None, dora=None, game_mode='yonma', calls=None):
    seats = ['self', 'left', 'top', 'right']
    return {
        'hand': tiles(hand),
        'discards': {s: tiles((discards or {}).get(s, '')) for s in seats},
        'calls': {s: (calls or {}).get(s, []) for s in seats},
        'riichi': {s: s in (riichi or []) for s in seats},
        'doraIndicators': tiles(dora or ''),
        'gameMode': game_mode,
    }


# ── シャンテン数 ──
check('テンパイ', calc.shanten(calc._counts(tiles('123m 456p 789s 11s 23m'))), 0)
check('和了形', calc.shanten(calc._counts(tiles('123m 456p 789s 11s 234m'))), -1)
check('七対子テンパイ', calc.shanten(calc._counts(tiles('11m 22m 33p 44p 55s 66s 7s'))), 0)
check('国士無双の和了形', calc.shanten(calc._counts(
    tiles('119m 19p 19s east south west north white green red'))), -1)
check('鳴き1回でテンパイ', calc.shanten(calc._counts(tiles('456p 789s 11s 23m')), 1), 0)

# ── ドラ ──
check('9のドラ表示は1', calc.dora_from_indicator('9p'), '1p')
check('北のドラ表示は東', calc.dora_from_indicator('north'), 'east')
check('中のドラ表示は白', calc.dora_from_indicator('red'), 'white')

# ── 受け入れ枚数は見えている牌を引く ──
a = calc.analyze_discards(situation('123m 456p 789s 11s 23m 9p', discards={'left': '1m 4m'}))
nine = next(c for c in a if c['tile'] == '9p')
check('9筒切りでテンパイ', nine['shanten'], 0)
check('1-4萬待ちは見えている分を引いて5枚', nine['ukeire'], 5)
check('受け入れの種類', nine['ukeireTiles'], ['1m', '4m'])
check('テンパイを取る牌を選ぶ', calc.pick_best(a)['tile'], '9p')
check('テンパイの理由', calc.advice_reason(calc.pick_best(a), a), 'テンパイ。待ちは残り5枚')

# ── 三人麻雀では2萬〜8萬を数えない ──
a = calc.analyze_discards(situation('123p 456p 789s 11s 34s 9p', game_mode='sanma'))
nine = next(c for c in a if c['tile'] == '9p')
check('三麻の2-5索待ちは8枚', nine['ukeire'], 8)

# ── 受け入れ枚数が同点なら、つながりにくい字牌から切る ──
# 2026-09-24：9萬・1筒・南・西が同点で、並び順の先頭の9萬をすすめていた
hand = '1m 3m 3m 4m 6m 9m 1p 4p 5p 7p 8s south west 5s'
s1 = situation(hand)
s1['roundWind'], s1['playerWind'] = '東', '南'
a = calc.analyze_discards(s1)
best = calc.pick_best(a)
check('同点なら字牌から切る', best['isHonor'], True)
check('自風の南は残してオタ風の西を切る', best['tile'], 'west')
check('同点の理由', calc.advice_reason(best, a), '字牌はつながらず使いにくい')

# ── /api/mahjong/advice ──
client = app_module.app.test_client()


def ask(hand_text, **extra):
    body = {'hand': tiles(hand_text), 'discards': {}, 'calls': {}, 'riichi': {},
            'doraIndicators': [], 'gameMode': 'yonma'}
    body.update(extra)
    return client.post('/api/mahjong/advice', json=body).get_json()


d = ask('123m 456p 789s 11s 23m 9p', discards={'left': ['1m']})
check('テンパイを取る', (d['discard'], d['tileName'], d['reason']), ('9p', '9筒', 'テンパイ。待ちは残り6枚'))
d = ask(hand, roundWind='東', playerWind='南')
check('画面のケースで西を切る', d['discard'], 'west')
d = ask('123m 456p 789s 11s 234m')
check('和了形はツモをすすめる', d.get('alreadyWon'), True)

# --- 安全度（2026-09-25） ---
from advice_calc import tile_safety, safety_report

check('現物', tile_safety('3m', ['3m', '1p']), 'genbutsu')
check('4mは1mだけではスジにならない', tile_safety('4m', ['1m']), 'unknown')
check('4mは1mと7mの両方でスジ', tile_safety('4m', ['1m', '7m']), 'suji')
check('1mは4mが切れていればスジ', tile_safety('1m', ['4m']), 'suji')
check('字牌にスジは無い', tile_safety('east', ['1m', '4m', '7m']), 'unknown')

sit = {'discards': {'left': ['3m', '1m', '7m'], 'top': [], 'right': []},
       'riichi': {'left': True, 'top': False, 'right': False},
       'hand': tiles('345m 9s') + ['east']}
check('リーチ者の現物を見つける', safety_report('3m', sit)['level'], 'genbutsu')
check('スジを見分ける', safety_report('4m', sit)['level'], 'suji')
check('無スジを見分ける', safety_report('5m', sit)['level'], 'unknown')
check('手の中の安全牌を出す', safety_report('5m', sit)['safeTiles'], ['3m'])
check('リーチがいなければ何も出さない',
      safety_report('5m', {'discards': {}, 'riichi': {}, 'hand': ['5m']})['level'], '')

d = ask('123m 456p 789s 11s 23m 9p', discards={'left': ['1m', '9p']},
        riichi={'left': True})
check('通っている牌なら通っていると出す',
      d['detailedReason']['risk'], 'この牌はリーチしている人に通っています。')
d = ask('123m 456p 789s 11s 23m 9p', discards={'left': ['1m']})
check('リーチがいなければ空', d['detailedReason']['risk'], '')

print(f'AIアドバイス計算  成功: {passed}  失敗: {len(fails)}')
for f in fails:
    print('  ✗ ' + f)
