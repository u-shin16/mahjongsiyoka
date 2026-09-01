#!/bin/sh
# 役判定・点数計算のテストを走らせる。
# macOS内蔵のJavaScriptCoreを使うので追加インストールは不要。
#
#   sh tests/run.sh
#
# 1件でも失敗したら終了コード1で返す。
# jscは非ASCIIのパスを開けないため、いったんテンポラリへ複製してから実行する。

ROOT=$(cd "$(dirname "$0")/.." && pwd)
JSC=/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc

if [ ! -x "$JSC" ]; then
  echo "JavaScriptCore が見つかりません: $JSC" >&2
  exit 1
fi

WORK=$(mktemp -d /tmp/mahjong_test.XXXXXX)
trap 'rm -rf "$WORK"' EXIT
cp "$ROOT/static/js/tiles.js" "$ROOT/static/js/agari.js" "$ROOT/static/js/yaku.js" \
   "$ROOT/static/js/battle.js" "$WORK/"
cp "$ROOT/tests/yaku_test.js" "$ROOT/tests/score_test.js" "$ROOT/tests/waits_test.js" "$ROOT/tests/api_test.js" "$ROOT/tests/waitmark_test.js" "$WORK/"

FAILED=0

run_suite() {
  # $1 = テストファイル名, 残りは先に読み込むソース
  _test=$1; shift
  _out=$("$JSC" "$@" "$WORK/$_test" 2>&1)
  echo "$_out"
  echo "$_out" | grep -q '失敗: 0' || FAILED=1
}

run_suite yaku_test.js  "$WORK/tiles.js" "$WORK/agari.js" "$WORK/yaku.js"
run_suite score_test.js "$WORK/tiles.js" "$WORK/agari.js" "$WORK/yaku.js" "$WORK/battle.js"
run_suite waits_test.js "$WORK/tiles.js" "$WORK/agari.js"
run_suite api_test.js   "$WORK/tiles.js" "$WORK/agari.js" "$WORK/yaku.js" "$WORK/battle.js"
run_suite waitmark_test.js "$WORK/tiles.js" "$WORK/agari.js" "$WORK/yaku.js" "$WORK/battle.js"

echo ""
if [ "$FAILED" -eq 0 ]; then echo "すべて通過しました。"; else echo "失敗したテストがあります。"; fi
exit $FAILED
