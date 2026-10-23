#!/bin/sh
# 第9章の符・点数の問題を、アプリの計算で作って印字する（make_ch9_questions.js を動かす）。
#   sh tests/make_ch9.sh
ROOT=$(cd "$(dirname "$0")/.." && pwd)
JSC=/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc
WORK=$(mktemp -d /tmp/mahjong_ch9.XXXXXX)
trap 'rm -rf "$WORK"' EXIT
cp "$ROOT/static/js/tiles.js" "$ROOT/static/js/agari.js" "$ROOT/static/js/yaku.js" "$ROOT/tests/make_ch9_questions.js" "$ROOT/tests/ch9_specs.json" "$WORK/"
cd "$WORK" && "$JSC" -e "var SPECS='ch9_specs.json';" tiles.js agari.js yaku.js make_ch9_questions.js
