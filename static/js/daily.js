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
  // 2026-11-11：ゆーしん「単色じゃなくてキャラとか模様とかのやつがいい」→「キャラなくしてじっそう」
  // → 牌の裏・卓・背景に和柄などの模様を入れた（定番だけは無地のまま）。今の色を選んでいる人の見た目が
  // 急に変わらないよう、IDと色はそのままにして模様を重ねた。模様だけの新しいごほうびも5つ足した
  // 2026-11-03：ゆーしん「もらっても嬉しくない」「もうちょっと派手にする」→ 落ち着いた色しか無かったので、
  // 紅・金・紫・翡翠・黒金・金の卓を足した。日数が多いほど派手にしてある
  // 2026-10-15：牌の表と裏を別々の特典にしていたが、ゆーしん「牌だけで一つのものにして」→
  // 表の色と裏の色をセットにした「牌」1つにまとめた
  var REWARDS = [
    { days: 1,   type: 'title', id: 'はじめの一歩' },
    { days: 3,   type: 'tile',  id: 'ivory' },
    { days: 7,   type: 'title', id: '麻雀好き' },
    { days: 7,   type: 'table', id: 'night' },
    { days: 10,  type: 'bg',    id: 'navy' },
    { days: 14,  type: 'tile',  id: 'indigo' },
    { days: 20,  type: 'table', id: 'crimson' },
    { days: 20,  type: 'bg',    id: 'chidori' },
    { days: 25,  type: 'tile',  id: 'gold' },
    { days: 30,  type: 'title', id: '麻雀の常連' },
    { days: 30,  type: 'table', id: 'wine' },
    { days: 40,  type: 'bg',    id: 'sumi' },
    { days: 45,  type: 'tile',  id: 'yagasuri' },
    { days: 50,  type: 'tile',  id: 'sakura' },
    { days: 50,  type: 'title', id: '麻雀の達人' },
    { days: 55,  type: 'table', id: 'ichimatsu' },
    { days: 60,  type: 'bg',    id: 'murasaki' },
    { days: 70,  type: 'tile',  id: 'jade' },
    { days: 80,  type: 'table', id: 'kokukin' },
    { days: 85,  type: 'bg',    id: 'hoshi' },
    { days: 90,  type: 'tile',  id: 'hoshi' },
    { days: 100, type: 'title', id: '百日の打ち手' },
    { days: 100, type: 'table', id: 'gold' },
  ];

  // 模様（SVGを繰り返して敷く）。c＝線や塗りの色。w,h＝1マスの大きさ
  var PATTERNS = {
    seigaiha: { w: 40, h: 20, svg: function(c) { return '<g fill="none" stroke="' + c + '" stroke-width="1.6">' + [18, 13, 8, 3].map(function(r) { return '<circle cx="20" cy="20" r="' + r + '"/><circle cx="0" cy="10" r="' + r + '"/><circle cx="40" cy="10" r="' + r + '"/>'; }).join('') + '</g>'; } },
    asanoha:  { w: 30, h: 52, svg: function(c) { return '<path stroke="' + c + '" stroke-width="1.2" fill="none" d="M15 0L15 52M0 8.7L30 43.3M30 8.7L0 43.3M0 8.7L15 17.3L30 8.7M0 43.3L15 34.7L30 43.3M15 0L0 8.7M15 0L30 8.7M15 52L0 43.3M15 52L30 43.3M0 26L15 17.3M30 26L15 17.3M0 26L15 34.7M30 26L15 34.7"/>'; } },
    ichimatsu:{ w: 20, h: 20, svg: function(c) { return '<rect width="10" height="10" fill="' + c + '"/><rect x="10" y="10" width="10" height="10" fill="' + c + '"/>'; } },
    shippo:   { w: 24, h: 24, svg: function(c) { return '<g fill="none" stroke="' + c + '" stroke-width="1.4"><circle cx="0" cy="0" r="12"/><circle cx="24" cy="0" r="12"/><circle cx="0" cy="24" r="12"/><circle cx="24" cy="24" r="12"/><circle cx="12" cy="12" r="12"/></g>'; } },
    yagasuri: { w: 20, h: 28, svg: function(c) { return '<path d="M0 0L10 7L10 21L0 14ZM10 7L20 0L20 14L10 21Z" fill="' + c + '"/>'; } },
    sakura:   { w: 36, h: 36, svg: function(c) { return '<g fill="' + c + '">' + [[9, 9], [27, 27]].map(function(p) { return [0, 72, 144, 216, 288].map(function(a) { return '<ellipse cx="' + p[0] + '" cy="' + (p[1] - 3.6) + '" rx="2.4" ry="3.6" transform="rotate(' + a + ' ' + p[0] + ' ' + p[1] + ')"/>'; }).join(''); }).join('') + '</g>'; } },
    chidori:  { w: 32, h: 28, svg: function(c) { return '<path d="M4 14q5-8 12-4q4-6 10-4q-4 2-5 6q4 4 1 8q-3-4-8-3q-6 1-10-3z" fill="' + c + '" transform="scale(.8) translate(4 4)"/>'; } },
    hoshi:    { w: 34, h: 34, svg: function(c) { return '<g fill="' + c + '"><path d="M8 3L9.4 6.6L13 7L10.2 9.4L11 13L8 11L5 13L5.8 9.4L3 7L6.6 6.6Z"/><circle cx="25" cy="22" r="1.6"/><circle cx="18" cy="30" r="1"/><circle cx="29" cy="7" r="1.2"/></g>'; } },
  };

  // 模様をCSSの background-image に入れられる形にする。HTMLの style="" の中にも書けるよう、
  // 引用符とかっこを使わない形にしてある
  function patternUrl(pat) {
    if (!pat || !PATTERNS[pat.name]) return 'none';
    var P = PATTERNS[pat.name];
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + P.w + '" height="' + P.h + '">' + P.svg(pat.color) + '</svg>';
    return 'url(data:image/svg+xml,' + encodeURIComponent(svg).replace(/'/g, '%27').replace(/\(/g, '%28').replace(/\)/g, '%29') + ')';
  }
  // 模様1マスの大きさ（scale 倍）。牌の裏は小さいので半分にして使う
  function patternSize(pat, scale) {
    if (!pat || !PATTERNS[pat.name]) return 'auto';
    var P = PATTERNS[pat.name];
    return (P.w * scale) + 'px ' + (P.h * scale) + 'px';
  }

  // 牌のデザイン（表と裏のセット）
  //   sheet：本物の牌の画像（白い面だけを色づけしたもの）。null ならもとの画像
  //   face：数字だけの牌（CSSで描く）の面の色 a〜c ／ back：牌の裏の色 a=明るい側, b=中, c=厚みの暗い側
  //   pat：牌の裏に重ねる模様（無ければ無地）
  var TILES = {
    'default': { name: '定番', sheet: null,
      face: { a: '#fffef8', b: '#f6efd9', c: '#e8d7b6' }, back: { a: '#f7b943', b: '#d67718', c: '#8f3f0a' } },
    'ivory':   { name: '七宝', sheet: '/static/img/mahjong-tiles-ivory.jpg',
      face: { a: '#fff6e0', b: '#f7e6bf', c: '#e8cf9c' }, back: { a: '#efe0bd', b: '#c9a96e', c: '#7d6033' },
      pat: { name: 'shippo', color: 'rgba(110,80,35,.45)' } },
    'indigo':  { name: '青海波', sheet: '/static/img/mahjong-tiles-sky.jpg',
      face: { a: '#f4f9ff', b: '#e1ecfb', c: '#c9d9ee' }, back: { a: '#6f8fd0', b: '#3c5ea8', c: '#1d3268' },
      pat: { name: 'seigaiha', color: 'rgba(255,255,255,.55)' } },
    'gold':    { name: '金の麻の葉', sheet: '/static/img/mahjong-tiles-gold.jpg',
      face: { a: '#fff1c4', b: '#ffd970', c: '#e0a92c' }, back: { a: '#ffe27a', b: '#e0a514', c: '#7a5200' },
      pat: { name: 'asanoha', color: 'rgba(122,82,0,.55)' } },
    'yagasuri':{ name: '矢絣', sheet: null,
      face: { a: '#fffef8', b: '#f6efd9', c: '#e8d7b6' }, back: { a: '#c4456a', b: '#8c2448', c: '#4a1024' },
      pat: { name: 'yagasuri', color: 'rgba(255,255,255,.38)' } },
    'sakura':  { name: '桜', sheet: '/static/img/mahjong-tiles-sakura.jpg',
      face: { a: '#fff6f8', b: '#fbe3ea', c: '#efc9d4' }, back: { a: '#eda3b7', b: '#c96f8a', c: '#86364f' },
      pat: { name: 'sakura', color: 'rgba(255,255,255,.7)' } },
    'jade':    { name: '翡翠の市松', sheet: '/static/img/mahjong-tiles-jade.jpg',
      face: { a: '#f0fff4', b: '#c9eed4', c: '#9fd6b2' }, back: { a: '#4fd6a0', b: '#0f9a68', c: '#04452c' },
      pat: { name: 'ichimatsu', color: 'rgba(0,40,20,.22)' } },
    'hoshi':   { name: '星空', sheet: null,
      face: { a: '#fffef8', b: '#f6efd9', c: '#e8d7b6' }, back: { a: '#2c4a8a', b: '#162a5a', c: '#0a1430' },
      pat: { name: 'hoshi', color: 'rgba(255,226,140,.85)' } },
  };
  // アプリ全体の背景（color＝地の色、pat＝重ねる模様）
  var BGS = {
    'default': { name: '深緑', color: '#1a3a2a' },
    'navy':    { name: '青海波', color: '#16263d', pat: { name: 'seigaiha', color: 'rgba(255,255,255,.06)' } },
    'chidori': { name: '千鳥',   color: '#1a3a2a', pat: { name: 'chidori',  color: 'rgba(255,255,255,.07)' } },
    'sumi':    { name: '麻の葉', color: '#1f2124', pat: { name: 'asanoha',  color: 'rgba(255,255,255,.06)' } },
    'murasaki':{ name: '桜',     color: '#2c1745', pat: { name: 'sakura',   color: 'rgba(255,190,210,.12)' } },
    'hoshi':   { name: '星空',   color: '#101a38', pat: { name: 'hoshi',    color: 'rgba(255,230,150,.3)' } },
  };
  var LOOK_TYPES = ['tile', 'table', 'bg'];

  // 卓（a=中央, b=外側, frame=縁, pat＝フェルトに重ねる模様。牌が見にくくならない濃さにする）
  var TABLES = {
    'default':  { name: '緑の卓',   a: '#1e7040', b: '#124d2a', frame: '#5a3012' },
    'night':    { name: '星空の卓', a: '#24476f', b: '#122740', frame: '#3a2a1a', pat: { name: 'hoshi', color: 'rgba(255,230,150,.3)' } },
    'crimson':  { name: '桜の卓',   a: '#c8172f', b: '#6e0814', frame: '#d4a537', pat: { name: 'sakura', color: 'rgba(255,200,210,.14)' } },
    'wine':     { name: '七宝の卓', a: '#7a2e3a', b: '#45161e', frame: '#2e1a10', pat: { name: 'shippo', color: 'rgba(255,220,180,.09)' } },
    'ichimatsu':{ name: '市松の卓', a: '#1e7040', b: '#124d2a', frame: '#5a3012', pat: { name: 'ichimatsu', color: 'rgba(0,0,0,.12)' } },
    'kokukin':  { name: '黒金の卓', a: '#34343a', b: '#0b0b0d', frame: '#e3b742', pat: { name: 'asanoha', color: 'rgba(227,183,66,.16)' } },
    'gold':     { name: '金の卓',   a: '#e2b043', b: '#8a5d0e', frame: '#3a1f05', pat: { name: 'seigaiha', color: 'rgba(58,31,5,.16)' } },
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

  // 符と点数の問題（2026-11-07）：ゆーしん「分かりやすいけど、一回やってもすぐに忘れちゃう」（第10章を試して）→
  // 第10章の問題をそのまま今日の1問にも出す。第10章をクリアした人だけ。用語・役より数が少ないので、3日に1回くらいの割合で出す
  var FU_SHARE = 1 / 3;
  // 第10章（Chapters.ch10）から、今日の1問に使える問題を取り出す。id は「ミニゲーム番号-問題番号」
  function fuList(chapter) {
    var out = [];
    ((chapter && chapter.mgs) || []).forEach(function(mg, mi) {
      (mg.questions || []).forEach(function(q, qi) {
        if (q.text && q.choices && q.choices.indexOf(q.answer) >= 0) out.push({ id: mi + '-' + qi, mg: mi, q: q });
      });
    });
    return out;
  }
  function escHtml(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  // 問題の鍵：t:<用語の漢字>:r（読み）/ t:<漢字>:m（意味）/ y:<役id>:h（翻数）/ y:<役id>:c（条件）/ f:<第10章の問題id>（符・点数）
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
    var rand = rng('pick:' + day);
    // 第10章（符と点数）をクリアしたら、符・点数の問題も混ぜる
    var fu = clearedCount >= 10 && data.FU ? data.FU : [];
    if (fu.length && rand() < FU_SHARE) return 'f:' + fu[Math.floor(rand() * fu.length)].id;
    var pool = allKeys(data, clearedCount >= 8);
    return pool[Math.floor(rand() * pool.length)];
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
    if (kind === 'f') {
      var item = (data.FU || []).filter(function(f) { return f.id === id; })[0];
      if (!item) return null;
      var fq = item.q;
      // 手牌のある問題は、第10章と同じく面子ごとに区切って和了牌に印を付けて見せる（app.js が描く）
      return { key: key, tag: item.mg >= 5 ? '点数' : '符', head: null, text: fq.text, correct: fq.answer,
        choices: shuffle(fq.choices.slice(), rand), explanation: escHtml(fq.fb).replace(/\n/g, '<br>'),
        tiles: fq.tiles || null, groups: fq.groups || null, win: fq.win || null };
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
    PATTERNS: PATTERNS, patternUrl: patternUrl, patternSize: patternSize,
    RETRY_AFTER_DAYS: RETRY_AFTER_DAYS,
    today: today, addDays: addDays, emptyState: emptyState, normalize: normalize,
    pickKey: pickKey, questionFor: questionFor, answer: answer, fuList: fuList,
    rewardsBetween: rewardsBetween, nextReward: nextReward, isUnlocked: isUnlocked,
    requiredDays: requiredDays, rewardName: rewardName, merge: merge,
  };
})();
if (typeof window !== 'undefined') window.Daily = Daily;
