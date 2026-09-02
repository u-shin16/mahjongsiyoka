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

print('');
print('=== クイズとエンジンの答え合わせ ===');
print('通過: ' + (checked - mismatch.length) + ' / 失敗: ' + mismatch.length);
