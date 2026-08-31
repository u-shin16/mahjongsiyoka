'use strict';
// ============================================================
// 点数の精算のテスト（battle.js の settleScore / settleRyukyoku）
//
// 実行:  sh tests/run.sh
//
// Battle.getState() が返す state を直接組み立てて精算だけを走らせる。
// 画面を出さずに点棒の動きを確かめられる。
// ============================================================
var window = this;

function m(n){return {suit:'man',num:n,id:'m'+n+'_'+Math.random()};}
function p(n){return {suit:'pin',num:n,id:'p'+n+'_'+Math.random()};}
function s(n){return {suit:'sou',num:n,id:'s'+n+'_'+Math.random()};}
function w(n){return {suit:'wind',num:n,id:'w'+n+'_'+Math.random()};}
function d(n){return {suit:'dragon',num:n,id:'d'+n+'_'+Math.random()};}

var pass=0, fail=0, fails=[];
function eq(title, actual, expected) {
  var a = JSON.stringify(actual), b = JSON.stringify(expected);
  if (a === b) { pass++; return; }
  fail++; fails.push(title + '\n    実際: ' + a + '\n    正解: ' + b);
}

// 断幺九＋平和 = 子2翻2000点（ツモなら門前ツモが付いて3翻）
function simpleHand(){
  return [m(2),m(3),m(4), p(3),p(4),p(5), s(5),s(6),s(7), p(2),p(2), m(6),m(7),m(8)];
}
// 8m待ちのテンパイ13枚
function tenpaiHand(){ return [m(2),m(3),m(4), p(3),p(4),p(5), s(5),s(6),s(7), p(2),p(2), m(6),m(7)]; }
// ノーテンの13枚
function notenHand(){ return [m(1),m(4),m(7), p(2),p(5),p(9), s(3),s(6),s(8), w(1),w(3), d(1),d(3)]; }

function settle(opts){
  Battle.init({playerCount: opts.playerCount || 4, gameType:'tonpu'});
  var st = Battle.getState();
  var n = st.playerCount;
  var before = st.scores.slice();
  st.hands[opts.winner] = simpleHand();
  for (var i=0;i<n;i++){ st.melds[i]=[]; st.discards[i]=[m(1)]; } // 天和・地和の誤爆を防ぐ
  st.riichi=[]; st.ippatsuActive=[]; st.riichiDouble=[];
  for (var k=0;k<n;k++){ st.riichi.push(false); st.ippatsuActive.push(false); st.riichiDouble.push(false); }
  st.rinshanPending=false;
  st.doraIndicator = s(9); st.kanDoraIndicators = [];
  st.dealerSeat = opts.dealerSeat;
  st.winner = opts.winner; st.winType = opts.winType;
  st.loser = opts.loser != null ? opts.loser : -1;
  st.winTile = st.hands[opts.winner][13];
  st.honba = opts.honba || 0;
  st.kyotaku = opts.kyotaku || 0;
  st.settled = false;
  Battle.settleScore();
  return st.scores.map(function(v,i){ return v - before[i]; });
}

// ---- ロン ----
eq('子のロン（2翻2000点）',
  settle({dealerSeat:0, winner:1, winType:'ron', loser:2}), [0, 2000, -2000, 0]);
eq('親のロン（2翻は親2900点。子の1.5倍ちょうどではない）',
  settle({dealerSeat:0, winner:0, winType:'ron', loser:2}), [2900, 0, -2900, 0]);

// ---- ツモ ----
eq('子のツモ（3翻。親が1/2、他の子が1/4を払う＝1000/2000）',
  settle({dealerSeat:0, winner:1, winType:'tsumo'}), [-2000, 4000, -1000, -1000]);
eq('親のツモ（3翻。子が3等分＝2000オール）',
  settle({dealerSeat:0, winner:0, winType:'tsumo'}), [6000, -2000, -2000, -2000]);

// ---- 本場 ----
eq('本場3本・子のロン（1本につき300点）',
  settle({dealerSeat:0, winner:1, winType:'ron', loser:2, honba:3}), [0, 2900, -2900, 0]);
eq('本場2本・子のツモ（1本につき1人100点）',
  settle({dealerSeat:0, winner:1, winType:'tsumo', honba:2}), [-2200, 4600, -1200, -1200]);

// ---- 立直棒 ----
eq('供託2本を和了者が回収する',
  settle({dealerSeat:0, winner:1, winType:'ron', loser:2, kyotaku:2}), [0, 4000, -2000, 0]);

// ---- 点棒の合計が動かないこと ----
(function(){
  var cases = [
    {dealerSeat:0, winner:1, winType:'ron', loser:2, honba:3, kyotaku:2},
    {dealerSeat:2, winner:2, winType:'tsumo', honba:1},
    {dealerSeat:1, winner:3, winType:'tsumo', kyotaku:1},
  ];
  cases.forEach(function(c, i){
    var deltas = settle(c);
    var sum = deltas.reduce(function(a,b){return a+b;},0);
    // 供託ぶんは場から出てくるので、その分だけ増える
    eq('点棒の増減の合計が供託ぶんと一致する（ケース'+(i+1)+'）', sum, (c.kyotaku||0)*1000);
  });
})();

// ---- 流局のテンパイ料 ----
function ryukyoku(who, kyotaku){
  Battle.init({playerCount:4, gameType:'tonpu'});
  var st = Battle.getState();
  var before = st.scores.slice();
  for (var i=0;i<4;i++) st.hands[i] = who[i] ? tenpaiHand() : notenHand();
  st.kyotaku = kyotaku || 0;
  st.phase = 'ryukyoku';
  st.ryukyokuSettled = false;
  var ry = Battle.settleRyukyoku();
  return { deltas: st.scores.map(function(v,i){ return v - before[i]; }),
           tenpai: ry.tenpai, kyotaku: st.kyotaku };
}

eq('流局・1人テンパイ', ryukyoku([true,false,false,false]).deltas, [3000,-1000,-1000,-1000]);
eq('流局・2人テンパイ', ryukyoku([true,true,false,false]).deltas, [1500,1500,-1500,-1500]);
eq('流局・3人テンパイ', ryukyoku([true,true,true,false]).deltas, [1000,1000,1000,-3000]);
eq('流局・全員テンパイは動かない', ryukyoku([true,true,true,true]).deltas, [0,0,0,0]);
eq('流局・全員ノーテンは動かない', ryukyoku([false,false,false,false]).deltas, [0,0,0,0]);
eq('流局のテンパイ判定が正しい', ryukyoku([true,false,true,false]).tenpai, [true,false,true,false]);
eq('流局では立直棒を回収せず持ち越す', ryukyoku([true,false,false,false], 2).kyotaku, 2);
eq('流局の精算を2回呼んでも二重に動かない', (function(){
  Battle.init({playerCount:4, gameType:'tonpu'});
  var st = Battle.getState();
  var before = st.scores.slice();
  for (var i=0;i<4;i++) st.hands[i] = i===0 ? tenpaiHand() : notenHand();
  st.phase='ryukyoku'; st.ryukyokuSettled=false;
  Battle.settleRyukyoku();
  Battle.settleRyukyoku();
  return st.scores.map(function(v,i){ return v - before[i]; });
})(), [3000,-1000,-1000,-1000]);

// ---- 天和・地和は親の席で決まる ----
function firstTurnTsumo(dealerSeat, winner){
  Battle.init({playerCount:4, gameType:'tonpu'});
  var st = Battle.getState();
  st.hands[winner] = simpleHand();
  for (var i=0;i<4;i++){ st.melds[i]=[]; st.discards[i]=[]; }
  st.riichi=[false,false,false,false]; st.ippatsuActive=[false,false,false,false];
  st.riichiDouble=[false,false,false,false]; st.rinshanPending=false;
  st.doraIndicator=s(9); st.kanDoraIndicators=[];
  st.dealerSeat=dealerSeat; st.winner=winner; st.winType='tsumo'; st.loser=-1;
  st.winTile=st.hands[winner][13]; st.honba=0; st.settled=false;
  return Battle.calcScore().yaku.map(function(y){return y.name;});
}
eq('東1局（親=席0）に席0が初手ツモ→天和',
  firstTurnTsumo(0,0).indexOf('天和') >= 0, true);
eq('東2局（親=席1）に席0が初手ツモ→地和（天和ではない）',
  firstTurnTsumo(1,0).indexOf('地和') >= 0 && firstTurnTsumo(1,0).indexOf('天和') < 0, true);
eq('東2局（親=席1）に席1が初手ツモ→天和',
  firstTurnTsumo(1,1).indexOf('天和') >= 0, true);

print('');
print('=== 点数の精算テスト ===');
print('通過: ' + pass + ' / 失敗: ' + fail);
if (fails.length) {
  print('');
  print('--- 失敗した項目 ---');
  fails.forEach(function(f, i){ print((i+1) + '. ' + f); });
  print('');
}
