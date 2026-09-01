'use strict';
// ============================================================
// 待ちの印の判定テスト（Battle.hasYakuForHand）
//
// 実行:  sh tests/run.sh
//
// 待ちに「役なし」「ツモのみ」を出すため、その牌で役が付くかを見る。
// 2026-09-01に、打牌前の14枚のまま判定していたため15枚になって
// 和了形にならず、フリテンでもないのに「ツモのみ」と出る不具合を出した。
// 切ったあとの13枚を渡す形になっているかをここで確かめる。
// ============================================================
var window = this;

var uid=0;
function T(su,n){ return {suit:su,num:n,id:su+n+'_'+(uid++)}; }
function m(n){return T('man',n);} function p(n){return T('pin',n);}
function s(n){return T('sou',n);} function d(n){return T('dragon',n);}

var pass=0, fail=0, fails=[];
function eq(title, actual, expected){
  if (actual === expected) { pass++; return; }
  fail++; fails.push(title + '\n    実際: ' + actual + ' / 正解: ' + expected);
}

// 断幺九＋平和の13枚（5萬・8萬待ち）。門前・リーチなし
function base13(){
  return [m(2),m(3),m(4), p(3),p(4),p(5), s(5),s(6),s(7), p(2),p(2), m(6),m(7)];
}
Battle.init({playerCount:4, gameType:'tonpu'});
var st = Battle.getState();
var hand = base13();
st.hands[0] = hand.concat([d(3)]);   // 打牌前の14枚（余分な牌を持っている状態）
st.melds[0] = []; st.riichi[0]=false;
st.discards[0]=[]; st.tempFuriten=[false,false,false,false];
st.riichiFuriten=[false,false,false,false];

var w5 = { suit:'man', num:5, id:'w5' };
eq('切ったあとの13枚を渡せば、5萬ロンで役が付く',
   Battle.hasYakuForHand(hand, 'ron', w5), true);
eq('切ったあとの13枚を渡せば、5萬ツモでも役が付く',
   Battle.hasYakuForHand(hand, 'tsumo', w5), true);
eq('14枚のまま渡すと和了形にならないのでfalse（これが不具合の原因だった）',
   Battle.hasYakuForHand(st.hands[0], 'ron', w5), false);
eq('待ちでない牌はfalse',
   Battle.hasYakuForHand(hand, 'ron', {suit:'dragon',num:1,id:'x'}), false);

// 鳴いていて役が付かない形：断幺九にならないチャンタ崩れ
// 123m 789p 123s + 東東 + ポン(發) → 実際に役があるか確かめる
var openHand = [m(1),m(2),m(3), p(7),p(8),p(9), s(1),s(2),s(3), T('wind',1),T('wind',1)];
Battle.init({playerCount:4, gameType:'tonpu'});
var st2 = Battle.getState();
st2.hands[0] = openHand.slice();
st2.melds[0] = [{ type:'pon', tiles:[d(2),d(2),d(2)], calledTile:d(2), fromPlayer:1 }];
st2.riichi[0]=false; st2.discards[0]=[];
st2.tempFuriten=[false,false,false,false]; st2.riichiFuriten=[false,false,false,false];
// 發のポンがあるので役牌が付く＝役あり
eq('發をポンしていれば役牌で役が付く',
   Battle.hasYakuForHand(openHand, 'ron', {suit:'wind',num:1,id:'w'}), false);

// ---- 門前の手には「役なし」を出さない ----
// 門前ならツモに門前清自摸和が必ず付くので、和了れないことがない。
// 2026-09-01に、門前なのに「役なし」「ツモのみ」が出るという指摘を受けて
// 表示の規則を「役なしは鳴いているときだけ、ツモのみはフリテンのときだけ」に変えた。
(function() {
  function mk(su, n) { return { suit: su, num: n, id: su + n + '_chk' + (uid++) }; }
  var closedHands = [
    // 断幺九＋平和になる形（5萬8萬待ち）
    [m(2),m(3),m(4), p(3),p(4),p(5), s(5),s(6),s(7), p(2),p(2), m(6),m(7)],
    // 役が付きにくい形（6萬9萬待ち）
    [m(1),m(2),m(3), p(7),p(8),p(9), s(1),s(2),s(3), T('wind',1),T('wind',1), m(7),m(8)],
  ];
  closedHands.forEach(function(h, hi) {
    Battle.init({ playerCount: 4, gameType: 'tonpu' });
    var st3 = Battle.getState();
    st3.hands[0] = h.slice();
    st3.melds[0] = [];
    st3.riichi = [false, false, false, false];
    var waits = Agari.getTenpaiWaits(h);
    eq('門前の手' + (hi + 1) + ' はテンパイしている', waits.length > 0, true);
    waits.forEach(function(wt) {
      var t = mk(wt.suit, wt.num);
      eq('門前の手' + (hi + 1) + ' の' + Tiles.label(t) + '待ちはツモで必ず和了れる',
         Battle.hasYakuForHand(h, 'tsumo', t), true);
    });
  });
})();

print('');
print('=== 待ちの印の判定テスト ===');
print('通過: ' + pass + ' / 失敗: ' + fail);
if (fails.length){ print(''); fails.forEach(function(f,i){ print((i+1)+'. '+f); }); print(''); }
