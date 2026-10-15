'use strict';
// ============================================================
// 今日の1問・ごほうび（2026-10-15）
//
// ・ホームを開くと、その日の1問だけが出ている（選ばせない）
// ・間違えた問題は2日後にもう一度出す（忘れたころに出すほうが身につく）
// ・答えた日を「合計」で数える。連続日数にはしない（途切れた日にやめる理由になるため）
// ・合計日数でごほうび（称号・牌のデザイン・卓の色・背景）がもらえる
//
// 画面を持たない計算だけをここに置き、app.js から使う。テストは tests/daily_test.js。
// ============================================================
var Daily = (function() {
  var RETRY_AFTER_DAYS = 2;

  // 合計日数ごとのごほうび。数字は小さい順に並べる
  // 2026-10-15：牌の表と裏を別々の特典にしていたが、ゆーしん「牌だけで一つのものにして」→
  // 表の色と裏の色をセットにした「牌」1つにまとめた
  var REWARDS = [
    { days: 1,   type: 'title', id: 'はじめの一歩' },
    { days: 3,   type: 'tile',  id: 'ivory' },
    { days: 7,   type: 'title', id: '麻雀好き' },
    { days: 7,   type: 'table', id: 'night' },
    { days: 10,  type: 'bg',    id: 'navy' },
    { days: 14,  type: 'tile',  id: 'indigo' },
    { days: 30,  type: 'title', id: '麻雀の常連' },
    { days: 30,  type: 'table', id: 'wine' },
    { days: 40,  type: 'bg',    id: 'sumi' },
    { days: 50,  type: 'tile',  id: 'sakura' },
    { days: 50,  type: 'title', id: '麻雀の達人' },
    { days: 100, type: 'title', id: '百日の打ち手' },
  ];

  // 牌のデザイン（表と裏のセット）
  //   sheet：本物の牌の画像（白い面だけを色づけしたもの）。null ならもとの画像
  //   face：数字だけの牌（CSSで描く）の面の色 a〜c ／ back：牌の裏の色 a=明るい側, b=中, c=厚みの暗い側
  var TILES = {
    'default': { name: '定番', sheet: null,
      face: { a: '#fffef8', b: '#f6efd9', c: '#e8d7b6' }, back: { a: '#f7b943', b: '#d67718', c: '#8f3f0a' } },
    'ivory':   { name: '象牙', sheet: '/static/img/mahjong-tiles-ivory.jpg',
      face: { a: '#fff6e0', b: '#f7e6bf', c: '#e8cf9c' }, back: { a: '#efe0bd', b: '#c9a96e', c: '#7d6033' } },
    'indigo':  { name: '藍',   sheet: '/static/img/mahjong-tiles-sky.jpg',
      face: { a: '#f4f9ff', b: '#e1ecfb', c: '#c9d9ee' }, back: { a: '#6f8fd0', b: '#3c5ea8', c: '#1d3268' } },
    'sakura':  { name: '桜',   sheet: '/static/img/mahjong-tiles-sakura.jpg',
      face: { a: '#fff6f8', b: '#fbe3ea', c: '#efc9d4' }, back: { a: '#eda3b7', b: '#c96f8a', c: '#86364f' } },
  };
  // アプリ全体の背景色
  var BGS = {
    'default': { name: '深緑', color: '#1a3a2a' },
    'navy':    { name: '紺',   color: '#16263d' },
    'sumi':    { name: '墨',   color: '#1f2124' },
  };
  var LOOK_TYPES = ['tile', 'table', 'bg'];

  // 卓の色（a=中央, b=外側, frame=縁）
  var TABLES = {
    'default': { name: '緑の卓',   a: '#1e7040', b: '#124d2a', frame: '#5a3012' },
    'night':   { name: '夜の卓',   a: '#24476f', b: '#122740', frame: '#3a2a1a' },
    'wine':    { name: 'えんじの卓', a: '#7a2e3a', b: '#45161e', frame: '#2e1a10' },
  };

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  // 端末の日付で「今日」を決める（日付が変わったら次の1問）
  function today(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function addDays(dateStr, n) {
    var p = dateStr.split('-').map(Number);
    var d = new Date(p[0], p[1] - 1, p[2] + n);
    return today(d);
  }

  // 日付などの文字列から決まる乱数。同じ日に何度開いても同じ問題・同じ並びにするため
  function rng(seedText) {
    var h = 2166136261;
    for (var i = 0; i < seedText.length; i++) { h ^= seedText.charCodeAt(i); h = Math.imul(h, 16777619); }
    var a = h >>> 0;
    return function() {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(list, rand) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rand() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function emptyState() { return { days: 0, last: null, lastKey: null, lastCorrect: null, wrong: {} }; }

  function normalize(state) {
    var s = state || {};
    return {
      days: Number(s.days) || 0,
      last: s.last || null,
      lastKey: s.lastKey || null,
      lastCorrect: typeof s.lastCorrect === 'boolean' ? s.lastCorrect : null,
      wrong: s.wrong && typeof s.wrong === 'object' ? s.wrong : {},
    };
  }

  // 問題の鍵：t:<用語の漢字>:r（読み）/ t:<漢字>:m（意味）/ y:<役id>:h（翻数）/ y:<役id>:c（条件）
  function allKeys(data, includeYaku) {
    var keys = [];
    data.TERMS.forEach(function(t) { keys.push('t:' + t.kanji + ':r', 't:' + t.kanji + ':m'); });
    if (includeYaku) data.YAKU.forEach(function(y) { keys.push('y:' + y.id + ':h', 'y:' + y.id + ':c'); });
    return keys;
  }

  // 今日出す問題の鍵を決める。2日たった「間違えた問題」があれば、それを先に出す
  function pickKey(state, day, data, clearedCount) {
    var s = normalize(state);
    if (s.last === day && s.lastKey) return s.lastKey;
    var due = Object.keys(s.wrong)
      .filter(function(k) { return s.wrong[k] && s.wrong[k].due <= day && questionFor(k, data, day); })
      .sort(function(a, b) { return s.wrong[a].due < s.wrong[b].due ? -1 : s.wrong[a].due > s.wrong[b].due ? 1 : (a < b ? -1 : 1); });
    if (due.length) return due[0];
    // 必修（第1〜8章）を終えるまでは用語だけ。役は第8章から習うので、そのあとに混ぜる
    var pool = allKeys(data, clearedCount >= 8);
    return pool[Math.floor(rng('pick:' + day)() * pool.length)];
  }

  // 鍵から問題を作る。選択肢の並びは日付と鍵で決まる
  function questionFor(key, data, day) {
    var parts = String(key).split(':');
    var kind = parts[0], id = parts[1], type = parts[2];
    var rand = rng('q:' + day + ':' + key);
    if (kind === 't') {
      var q = data.TERMS.filter(function(t) { return t.kanji === id; })[0];
      if (!q) return null;
      var others = shuffle(data.TERMS.filter(function(t) { return t.kanji !== q.kanji; }), rand).slice(0, 3);
      var expl = '<strong>' + q.kanji + '（' + q.reading + '）</strong><br>' + q.desc;
      if (type === 'r') {
        return { key: key, tag: '用語', head: '「' + q.kanji + '」', text: 'この用語の読み方は？', correct: q.reading,
          choices: shuffle([q.reading].concat(others.map(function(w) { return w.reading; })), rand), explanation: expl };
      }
      var full = function(t) { return t.kanji + '（' + t.reading + '）'; };
      return { key: key, tag: '用語', head: null, text: '次の説明にあてはまる用語は？\n「' + q.desc + '」', correct: full(q),
        choices: shuffle([full(q)].concat(others.map(full)), rand), explanation: expl };
    }
    if (kind === 'y') {
      var y = data.YAKU.filter(function(v) { return v.id === id; })[0];
      if (!y) return null;
      var hanStr = function(v) { return v.han === 'yakuman' ? '役満' : v.han + '翻'; };
      var yexpl = '<strong>' + y.name + '（' + y.reading + '）' + hanStr(y) + '</strong><br>' + y.condition;
      if (type === 'h') {
        var hans = shuffle(['1翻', '2翻', '3翻', '6翻', '役満'].filter(function(h) { return h !== hanStr(y); }), rand).slice(0, 3);
        return { key: key, tag: '役', head: y.name + '（' + y.reading + '）', text: 'この役は何翻？', correct: hanStr(y),
          choices: shuffle([hanStr(y)].concat(hans), rand), explanation: yexpl };
      }
      var cond = y.condition.length > 60 ? y.condition.slice(0, 60) + '…' : y.condition;
      var yname = function(v) { return v.name + '（' + v.reading + '）'; };
      var wrongY = shuffle(data.YAKU.filter(function(v) { return v.id !== y.id; }), rand).slice(0, 3);
      return { key: key, tag: '役', head: null, text: '次の成立条件の役は？\n「' + cond + '」', correct: yname(y),
        choices: shuffle([yname(y)].concat(wrongY.map(yname)), rand), explanation: yexpl };
    }
    return null;
  }

  // 答えた結果を反映する。同じ日の2回目は日数を増やさない
  function answer(state, day, key, isCorrect) {
    var s = normalize(state);
    var before = s.days;
    var first = s.last !== day;
    if (first) s.days += 1;
    s.last = day; s.lastKey = key; s.lastCorrect = !!isCorrect;
    if (isCorrect) delete s.wrong[key];
    else s.wrong[key] = { due: addDays(day, RETRY_AFTER_DAYS) };
    return { state: s, firstToday: first, newRewards: rewardsBetween(before, s.days) };
  }

  function rewardsBetween(fromDays, toDays) {
    return REWARDS.filter(function(r) { return r.days > fromDays && r.days <= toDays; });
  }

  function nextReward(days) {
    return REWARDS.filter(function(r) { return r.days > days; })[0] || null;
  }

  function isUnlocked(type, id, days) {
    if (id === 'default') return true;
    return REWARDS.some(function(r) { return r.type === type && r.id === id && r.days <= days; });
  }

  function requiredDays(type, id) {
    var r = REWARDS.filter(function(x) { return x.type === type && x.id === id; })[0];
    return r ? r.days : 0;
  }

  function rewardName(r) {
    if (r.type === 'title') return '称号「' + r.id + '」';
    if (r.type === 'tile') return '牌「' + TILES[r.id].name + '」';
    if (r.type === 'table') return '卓「' + TABLES[r.id].name + '」';
    if (r.type === 'bg') return '背景「' + BGS[r.id].name + '」';
    return '';
  }

  // ログインしたとき、端末の記録とクラウドの記録をまとめる。日数は消える方向にはいかない
  function merge(local, cloud) {
    var a = normalize(local), b = normalize(cloud);
    var base = a.days > b.days || (a.days === b.days && (a.last || '') >= (b.last || '')) ? a : b;
    var other = base === a ? b : a;
    var wrong = {};
    [other.wrong, base.wrong].forEach(function(w) {
      Object.keys(w).forEach(function(k) {
        if (!wrong[k] || (w[k] && w[k].due > wrong[k].due)) wrong[k] = w[k];
      });
    });
    return { days: base.days, last: base.last, lastKey: base.lastKey, lastCorrect: base.lastCorrect, wrong: wrong };
  }

  return {
    REWARDS: REWARDS, TILES: TILES, TABLES: TABLES, BGS: BGS, LOOK_TYPES: LOOK_TYPES,
    RETRY_AFTER_DAYS: RETRY_AFTER_DAYS,
    today: today, addDays: addDays, emptyState: emptyState, normalize: normalize,
    pickKey: pickKey, questionFor: questionFor, answer: answer,
    rewardsBetween: rewardsBetween, nextReward: nextReward, isUnlocked: isUnlocked,
    requiredDays: requiredDays, rewardName: rewardName, merge: merge,
  };
})();
if (typeof window !== 'undefined') window.Daily = Daily;
