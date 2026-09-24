# ============================================================
# AIアドバイス用の計算（advice_calc.py）と /api/mahjong/advice のテスト
#
# 実行:  sh tests/run.sh
# ============================================================
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
os.environ.setdefault('GEMINI_API_KEY', 'test')

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
a, _ = calc.analyze_discards(situation('123m 456p 789s 11s 23m 9p', discards={'left': '1m 4m'}))
nine = next(c for c in a if c['tile'] == '9p')
check('9筒切りでテンパイ', nine['shanten'], 0)
check('1-4萬待ちは見えている分を引いて5枚', nine['ukeire'], 5)
check('受け入れの種類', nine['ukeireTiles'], ['1m', '4m'])
best, mode = calc.pick_best(a, [])
check('テンパイを取る牌を選ぶ', best['tile'], '9p')

# ── 三人麻雀では2萬〜8萬を数えない ──
a, _ = calc.analyze_discards(situation('123p 456p 789s 11s 34s 9p', game_mode='sanma'))
nine = next(c for c in a if c['tile'] == '9p')
check('三麻の2-5索待ちは8枚', nine['ukeire'], 8)

# ── リーチ者がいて自分が遠いときは現物を選ぶ ──
a, seats = calc.analyze_discards(situation(
    '1m 5m 9m 2p 6p 9p 3s 7s east south white green red north',
    discards={'left': 'north 9p'}, riichi=['left']))
best, mode = calc.pick_best(a, seats)
check('守りに切り替える', mode, 'defense')
check('現物を選ぶ', best['safeAgainstRiichi'], True)

# ── /api/mahjong/advice ──
app_module.app.logger.disabled = True  # 「AIが止まった」ときの例外ログを出さない
client = app_module.app.test_client()
payload = {
    'hand': tiles('123m 456p 789s 11s 23m 9p'),
    'discards': {'left': ['1m']}, 'calls': {}, 'riichi': {},
    'doraIndicators': [], 'gameMode': 'yonma',
}


def ask(fake_reply):
    def fake(*args, **kwargs):
        if isinstance(fake_reply, Exception):
            raise fake_reply
        return fake_reply, 'gemini-test'
    app_module.generate_gemini_text = fake
    return client.post('/api/mahjong/advice', json=payload).get_json()


d = ask('{"discard":"9p","tileName":"9筒","reason":"テンパイになるから"}')
check('AIの答えをそのまま使う', (d['discard'], d['model']), ('9p', 'gemini-test'))

d = ask('{"discard":"1s","tileName":"1索","reason":"なんとなく"}')
check('形を崩す答えは計算結果に差し替える', (d['discard'], d['model']), ('9p', 'calc'))

d = ask(RuntimeError('quota'))
check('AIが止まっても計算結果で答える', (d['discard'], d['reason']), ('9p', 'テンパイで待ち6枚'))

check('牌の名前は表示名にする', ask('{"discard":"9p","tileName":"9p"}')['tileName'], '9筒')

d = ask('{"discard":"7z"}')
check('手牌に無い牌は計算結果に差し替える', d['discard'], '9p')

payload = {
    'hand': tiles('1m 5m 9m 2p 6p 9p 3s 7s east south white green red north'),
    'discards': {'left': ['north', '9p']}, 'calls': {}, 'riichi': {'left': True},
    'doraIndicators': [], 'gameMode': 'yonma',
}
d = ask('{"discard":"5m","tileName":"5萬","reason":"形"}')
check('守る場面で危ない牌は現物に差し替える', d['discard'] in ('north', '9p'), True)
d = ask('{"discard":"9p","tileName":"9筒","reason":"現物だから"}')
check('守る場面で現物ならAIの答えを使う', (d['discard'], d['model']), ('9p', 'gemini-test'))

print(f'AIアドバイス計算  成功: {passed}  失敗: {len(fails)}')
for f in fails:
    print('  ✗ ' + f)
