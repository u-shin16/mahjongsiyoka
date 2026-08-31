#!/bin/sh
# 役判定・点数計算のテストを走らせる。
# macOS内蔵のJavaScriptCoreを使うので追加インストールは不要。
#
#   sh tests/run.sh
#
# jscは非ASCIIのパスを開けないため、いったんテンポラリへ複製してから実行する。

set -e
ROOT=$(cd "$(dirname "$0")/.." && pwd)
JSC=/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc

if [ ! -x "$JSC" ]; then
  echo "JavaScriptCore が見つかりません: $JSC" >&2
  exit 1
fi

WORK=$(mktemp -d /tmp/mahjong_test.XXXXXX)
trap 'rm -rf "$WORK"' EXIT
cp "$ROOT/static/js/tiles.js" "$ROOT/static/js/agari.js" "$ROOT/static/js/yaku.js" "$WORK/"
cp "$ROOT/tests/yaku_test.js" "$WORK/"

"$JSC" "$WORK/tiles.js" "$WORK/agari.js" "$WORK/yaku.js" "$WORK/yaku_test.js"
