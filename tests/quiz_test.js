'use strict';
// ============================================================
// 学習パートのクイズと、役判定エンジンの答え合わせ
//
// 実行:  sh tests/run.sh
//
// 章のミニゲームには「この手はこの役になる？」という○×問題があり、
// 14枚の手牌と正解が入っている。**教材そのものが答え表になる**ので、
// エンジンの判定と突き合わせれば両方の誤りを見つけられる。
//
// 2026-09-02にこの方法で2種類の誤りを見つけた。
//   ・エンジン側：同じ牌4枚を2組の対子として七対子にしていた（2問）
//   ・クイズ側　：雀頭が7筒なのに純全帯幺九を○にしていた（1問）
// ============================================================
var window = this;

var __pass = 0, __fail = 0;

var TARGETS = ['二盃口','七対子','清一色','混一色','対々和','一気通貫','三色同順',
               '断幺九','純全帯幺九','混全帯幺九','一盃口','三色同刻','小三元','混老頭'];
var uid=0;
function withId(t){ return { suit:t.suit, num:t.num, id:t.suit+t.num+'_'+(uid++) }; }

var checked=0, skipped=0, mismatch=[];
function walk(node){
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { node.forEach(walk); return; }
  if (node.type === 'yn' && Array.isArray(node.questions) && node.title) {
    var yaku=null;
    TARGETS.forEach(function(k){ if (node.title.indexOf(k)>=0 && !yaku) yaku=k; });
    if (yaku) {
      node.questions.forEach(function(q, idx){
        if (!Array.isArray(q.tiles)) { skipped++; return; }
        if (q.tiles.length !== 14) { skipped++; return; }
        var hand=q.tiles.map(withId), win=hand[hand.length-1], y;
        try { y = Yaku.computeShapeYaku(hand, [], true, 1, 1, 'ron', win); }
        catch(e){ mismatch.push([node.title, idx+1, '例外: '+e]); return; }
        var names=(y||[]).map(function(x){return x.name;});
        var got = names.indexOf(yaku)>=0;
        checked++;
        if (got !== !!q.answer) {
          mismatch.push([node.title, idx+1,
            '問題の答え=' + (q.answer?'○':'✕') + ' / エンジンの判定=' + (got?'成立':'不成立') +
            ' / 出た役=' + (names.join('・')||'なし')]);
        }
      });
    }
  }
  Object.keys(node).forEach(function(k){ walk(node[k]); });
}
Object.keys(Chapters).forEach(function(k){ walk(Chapters[k]); });

// ============================================================
// 第5章（役牌）の答え合わせ
//
// 役牌の問題は3枚の刻子だけなので、上の14枚の検査には入らない。
// 刻子に面子3つと雀頭を足して14枚の和了形にしてから、エンジンに
// 「役牌（三元牌）」「役牌（風牌）」が出るかを聞く。
// 場風=東、自風=南（ミニゲームの設定と同じ）。
// ============================================================
var FILLER = [
  {suit:'man',num:2},{suit:'man',num:3},{suit:'man',num:4},
  {suit:'pin',num:5},{suit:'pin',num:6},{suit:'pin',num:7},
  {suit:'sou',num:3},{suit:'sou',num:4},{suit:'sou',num:5},
  {suit:'pin',num:9},{suit:'pin',num:9},
];
var ROUND_WIND = 1;   // 場風=東
var SEAT_WIND  = 2;   // 自風=南

function yakuhaiOf(tiles3) {
  var hand = tiles3.concat(FILLER).map(withId);
  var win = hand[hand.length - 1];
  var y = Yaku.computeShapeYaku(hand, [], true, SEAT_WIND, ROUND_WIND, 'ron', win) || [];
  var names = y.map(function(x){ return x.name; });
  // エンジンは三元牌を「白」「發」「中」という役名で返す（yaku.js に明記）。
  // 風牌だけ「役牌（風牌）」、場風と自風が重なると「連風牌」になる。
  var isDragon = ['白','發','中'].some(function(n){ return names.indexOf(n) >= 0; });
  var isWind   = names.indexOf('役牌（風牌）') >= 0 || names.indexOf('連風牌') >= 0;
  return { dragon: isDragon, wind: isWind, names: names };
}

var yhChecked = 0, yhBad = [];
function checkYakuhai(mg, expectKind) {
  if (!mg || !Array.isArray(mg.questions)) return;
  mg.questions.forEach(function(q, i) {
    if (!Array.isArray(q.tiles) || q.tiles.length !== 3) return;
    var got = yakuhaiOf(q.tiles);
    yhChecked++;
    var want;
    if (expectKind === 'dragon')      want = got.dragon;
    else if (expectKind === 'wind')   want = got.wind;
    else want = (q.answer === 'dragon') ? got.dragon
             : (q.answer === 'wind')    ? got.wind
             : (!got.dragon && !got.wind);
    var expected = (expectKind === 'summary') ? true : !!q.answer;
    if (want !== expected) {
      yhBad.push([mg.title, i + 1,
        '問題の答え=' + q.answer + ' / エンジン: 三元牌=' + got.dragon + ' 風牌=' + got.wind +
        ' / 出た役=' + (got.names.join('・') || 'なし')]);
    }
  });
}
checkYakuhai(Chapters.ch5.mg0, 'dragon');
checkYakuhai(Chapters.ch5.mg1, 'wind');
checkYakuhai(Chapters.ch5.mg2, 'summary');

mismatch = mismatch.concat(yhBad);
checked += yhChecked;

print('');
print('=== クイズとエンジンの答え合わせ ===');
print('  役牌の問題（第5章）: ' + yhChecked + '件を検査');
print('通過: ' + (checked - mismatch.length) + ' / 失敗: ' + mismatch.length);
mismatch.forEach(function(m){ print('  ✗ ' + m[0] + ' 問' + m[1] + '：' + m[2]); });
