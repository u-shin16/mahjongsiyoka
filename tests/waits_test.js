'use strict';
// ============================================================
// 待ち牌の計算のテスト（agari.js の getTenpaiWaits）
//
// 実行:  sh tests/run.sh
//
// 「待ち牌の一覧」と「その牌を足すと和了形になるか」は必ず一致するはず、
// という不変条件を、テンパイになりやすい手牌を大量に作って総当たりで確かめる。
// 2026-09-01に、この方法で「自分で4枚使っている牌を待ちとして返す」不具合を見つけた。
// ============================================================
var window = this;

var KINDS = [];
['man','pin','sou'].forEach(function(su){ for(var n=1;n<=9;n++) KINDS.push({suit:su,num:n}); });
for(var n=1;n<=4;n++) KINDS.push({suit:'wind',num:n});
for(var n=1;n<=3;n++) KINDS.push({suit:'dragon',num:n});

// 毎回同じ手牌を作るため、乱数は固定の種から作る（結果が再現する）
var seed = 987654321;
function rnd(){ seed = (seed*1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
function pick(a){ return a[Math.floor(rnd()*a.length)]; }
var uid = 0;
function mk(k){ return {suit:k.suit, num:k.num, id:k.suit+k.num+'_'+(uid++)}; }

// 4面子1雀頭の和了形を組み、1枚抜いて13枚のテンパイを作る
function makeTenpai13(){
  var counts = {}, tiles = [];
  function canAdd(k, n){ return (counts[k.suit+k.num]||0) + n <= 4; }
  function add(k){ counts[k.suit+k.num] = (counts[k.suit+k.num]||0)+1; tiles.push(mk(k)); }
  var guard = 0;
  while (tiles.length < 14 && guard++ < 300) {
    var need = 14 - tiles.length;
    if (need >= 3 && rnd() < 0.75) {
      if (rnd() < 0.6) {
        var su = pick(['man','pin','sou']);
        var n = 1 + Math.floor(rnd()*7);
        var ks = [{suit:su,num:n},{suit:su,num:n+1},{suit:su,num:n+2}];
        if (ks.every(function(k){ return canAdd(k,1); })) ks.forEach(add);
      } else {
        var k = pick(KINDS);
        if (canAdd(k,3)) { add(k); add(k); add(k); }
      }
    } else if (need >= 2) {
      var k2 = pick(KINDS);
      if (canAdd(k2,2)) { add(k2); add(k2); }
    } else break;
  }
  if (tiles.length !== 14) return null;
  var i = Math.floor(rnd()*14);
  return tiles.filter(function(_, j){ return j !== i; });
}

var pass = 0, fail = 0, fails = [];
var checked = 0, tenpaiFound = 0;

for (var t = 0; t < 30000; t++) {
  var hand = (rnd() < 0.85) ? makeTenpai13() : null;
  if (!hand) continue;
  checked++;
  var waitKeys = {};
  Agari.getTenpaiWaits(hand).forEach(function(w){ waitKeys[w.suit+w.num] = true; });

  var truth = {};
  KINDS.forEach(function(k){
    var c = 0;
    hand.forEach(function(h){ if (h.suit===k.suit && h.num===k.num) c++; });
    if (c >= 4) return;                       // 5枚目は存在しない
    if (Agari.isWinningHand(hand.concat([mk(k)]))) truth[k.suit+k.num] = true;
  });
  if (Object.keys(truth).length) tenpaiFound++;

  var a = Object.keys(waitKeys).sort().join(',');
  var b = Object.keys(truth).sort().join(',');
  if (a === b) { pass++; continue; }
  fail++;
  if (fails.length < 5) {
    fails.push(Tiles.sortTiles(hand).map(function(x){return Tiles.label(x);}).join(' ') +
      '\n    待ちとして返した牌 : ' + (a || '(なし)') +
      '\n    実際に和了できる牌 : ' + (b || '(なし)'));
  }
}

// 見つかった不具合の回帰テスト（自分で4枚使っている牌は待ちにならない）
function fixed(list){ return list.map(function(x){ return {suit:x[0], num:x[1], id:x[0]+x[1]+'_'+(uid++)}; }); }
function waitsOf(hand, used){ return Agari.getTenpaiWaits(hand, used).map(function(w){ return w.suit+w.num; }).sort().join(','); }

var r1 = fixed([['sou',1],['sou',2],['sou',3],['sou',4],['sou',4],['sou',4],
                ['sou',5],['sou',5],['sou',5],['sou',8],['sou',8],['sou',8],['sou',8]]);
if (waitsOf(r1) === '') pass++; else { fail++; fails.push('8索を4枚使い切った形で8索待ちを返した: ' + waitsOf(r1)); }

var r2 = fixed([['man',4],['man',4],['man',4],['sou',3],['sou',3],
                ['sou',7],['sou',7],['sou',7],['sou',7],['sou',8],['sou',8],['sou',9],['sou',9]]);
if (waitsOf(r2) === 'man4,sou3') pass++; else { fail++; fails.push('7索を4枚使い切った形で7索待ちを返した: ' + waitsOf(r2)); }

// 副露で4枚使っている場合も待ちにならない（暗槓した牌で待つ形）
var r3 = fixed([['pin',2],['pin',3],['pin',4],['pin',5],['pin',6],['pin',7],
                ['sou',1],['sou',1],['man',5],['man',6]]);
var kanTiles = fixed([['sou',9],['sou',9],['sou',9],['sou',9]]);
var withKan = waitsOf(r3, kanTiles);
if (withKan.indexOf('sou9') < 0) pass++; else { fail++; fails.push('副露で9索を4枚使っているのに9索待ちを返した: ' + withKan); }

print('');
print('=== 待ち牌のテスト ===');
print('総当たりで検査した手牌: ' + checked + '（うちテンパイ: ' + tenpaiFound + '）');
print('通過: ' + pass + ' / 失敗: ' + fail);
if (fails.length) {
  print('');
  print('--- 失敗した項目 ---');
  fails.forEach(function(f, i){ print((i+1) + '. ' + f); });
  print('');
}
