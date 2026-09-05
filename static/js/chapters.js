'use strict';

const Chapters = (() => {
  // ===== Chapter 1: Number tiles only =====
  const ch1 = {
    mg1: {
      title: 'ミニゲーム①　3枚セットを見つけよう',
      instruction: '<strong>3枚でセット</strong>になる牌を選ぼう！<br>同じ数字3枚、または数字が続く3枚がセット。',
      questions: [
        { nums: [1,2,3,5,7], answer: [0,1,2], fb: '1・2・3は数字が続いているから順子だよ！' },
        { nums: [4,4,4,2,8], answer: [0,1,2], fb: '同じ数字3枚は刻子！' },
        { nums: [6,7,8,2,4], answer: [0,1,2], fb: '6・7・8も順番に続いているのでセット！' },
        { nums: [3,3,3,5,9], answer: [0,1,2], fb: 'コツ：3が3枚で刻子。完璧！' },
        { nums: [2,3,4,6,9], answer: [0,1,2], fb: '2・3・4も数字が続くから順子！' },
      ],
      passNeeded: 5,
    },
    mg2: {
      title: 'ミニゲーム②　頭を作ろう',
      instruction: '<strong>同じ数字2枚</strong>を選ぼう！アガリには「頭（2枚ペア）」が必要。',
      questions: [
        { nums: [2,2,4,5,8], answer: [0,1], fb: '2が2枚で頭の完成！' },
        { nums: [1,3,6,6,9], answer: [2,3], fb: '6が2枚あるから頭になれる！' },
        { nums: [4,4,7,8,9], answer: [0,1], fb: '4が2枚で頭！' },
      ],
      passNeeded: 3,
    },
    mg3: {
      title: 'ミニゲーム③　あと1枚でアガリ！',
      instruction: 'あと<strong>1枚</strong>引けばアガリ！どの数字を引けばいい？',
      questions: [
        { hand: [1,1,1,4,5,6,7,8,9,9,9,2,4], answer: 3, choices: [3,2,5,9], fb: '3を引くと2・3・4の順子ができてアガリ！9・9が頭だよ。' },
        { hand: [2,2,3,4,5,6,6,6,7,8,9,7,9], answer: 8, choices: [8,7,9,6], fb: '8を引くと7・8・9の順子がもう1つできてアガリ！2・2が頭だよ。' },
        { hand: [1,2,3,4,5,6,7,8,9,5,5,8,8], answer: 8, choices: [8,6,7,9], fb: '8を引くと8・8・8の刻子ができてアガリ！5・5が頭だよ。' },
      ],
      passNeeded: 3,
    },
  };

  // ===== Chapter 2: Colored tiles =====
  const COLOR_NAMES = { red: '赤', blue: '青', green: '緑' };
  const ch2 = {
    mg1: {
      title: 'ミニゲーム①　これはセット？',
      instruction: '<strong>同じ色</strong>の数字が続くか、<strong>同じ色・同じ数字</strong>3枚ならセット！',
      questions: [
        { tiles: [{c:'red',n:1},{c:'red',n:2},{c:'red',n:3}], answer: true, fb: '赤1・赤2・赤3は同じ色で数字が続くからセット！' },
        { tiles: [{c:'red',n:1},{c:'blue',n:2},{c:'red',n:3}], answer: false, fb: '色がバラバラ！同じ色でないと順子にならないよ。' },
        { tiles: [{c:'blue',n:5},{c:'blue',n:5},{c:'blue',n:5}], answer: true, fb: '同じ色・同じ数字3枚は刻子！' },
        { tiles: [{c:'red',n:3},{c:'blue',n:3},{c:'green',n:3}], answer: false, fb: '色が全部違う！同じ色にならないとセットにならないよ。' },
        { tiles: [{c:'green',n:7},{c:'green',n:8},{c:'green',n:9}], answer: true, fb: '緑7・緑8・緑9は順子！' },
        { tiles: [{c:'red',n:2},{c:'red',n:4},{c:'red',n:5}], answer: false, fb: '2・4・5は数字が続いていない！2と4の間に3がないからNG。' },
        { tiles: [{c:'blue',n:1},{c:'blue',n:1},{c:'blue',n:1}], answer: true, fb: '青1が3枚で刻子！' },
        { tiles: [{c:'red',n:6},{c:'green',n:7},{c:'blue',n:8}], answer: false, fb: '色が全部違う！順子は同じ色でないとNG。' },
        { tiles: [{c:'red',n:4},{c:'red',n:5},{c:'red',n:6}], answer: true, fb: '赤4・赤5・赤6で順子！完璧！' },
        { tiles: [{c:'blue',n:3},{c:'blue',n:3},{c:'blue',n:4}], answer: false, fb: '3・3・4は刻子でも順子でもないね。同じ数字3枚か、連続3枚が必要。' },
      ],
      passNeeded: 8,
    },
    mg2: {
      title: 'ミニゲーム②　アガリ形を完成させよう',
      instruction: 'あと<strong>1枚</strong>あればアガリ！何色の何の牌が必要？',
      questions: [
        {
          hand: [{c:'red',n:1},{c:'red',n:2},{c:'red',n:3},{c:'blue',n:5},{c:'blue',n:6},{c:'blue',n:7},{c:'green',n:3},{c:'green',n:4},{c:'green',n:5},{c:'green',n:9},{c:'green',n:9},{c:'red',n:7},{c:'red',n:9}],
          answer: {c:'red',n:8},
          choices: [{c:'red',n:8},{c:'red',n:6},{c:'blue',n:8},{c:'green',n:8}],
          fb: '赤8を引くと赤7・赤8・赤9の順子ができてアガリ！緑9・緑9が頭だよ。',
        },
        {
          hand: [{c:'red',n:4},{c:'red',n:5},{c:'red',n:6},{c:'green',n:7},{c:'green',n:8},{c:'green',n:9},{c:'blue',n:3},{c:'blue',n:4},{c:'blue',n:5},{c:'blue',n:2},{c:'blue',n:2},{c:'green',n:1},{c:'green',n:2}],
          answer: {c:'green',n:3},
          choices: [{c:'green',n:3},{c:'red',n:3},{c:'blue',n:3},{c:'green',n:4}],
          fb: '緑3を引くと緑1・緑2・緑3の順子ができてアガリ！青2・青2が頭だよ。',
        },
        {
          hand: [{c:'blue',n:1},{c:'blue',n:2},{c:'blue',n:3},{c:'green',n:4},{c:'green',n:5},{c:'green',n:6},{c:'red',n:2},{c:'red',n:3},{c:'red',n:4},{c:'red',n:8},{c:'red',n:8},{c:'blue',n:6},{c:'blue',n:6}],
          answer: {c:'blue',n:6},
          choices: [{c:'blue',n:6},{c:'red',n:6},{c:'green',n:6},{c:'blue',n:5}],
          fb: '青6を引くと青6・青6・青6の刻子ができてアガリ！赤8・赤8が頭だよ。',
        },
      ],
      passNeeded: 3,
    },
  };

  // ===== Chapter 3: Real suit tiles =====
  const SUITS = ['man','pin','sou'];
  const SUIT_LABELS = { man: '萬子', pin: '筒子', sou: '索子' };
  const ch3 = {
    mg1: {
      title: 'ミニゲーム①　牌の種類を当てよう',
      instruction: 'この牌は<strong>萬子（マンズ）・筒子（ピンズ）・索子（ソーズ）</strong>のどれ？',
      questions: [
        { suit: 'man', num: 3, fb: '「萬」という漢字がついているのが萬子！' },
        { suit: 'pin', num: 5, fb: '丸（筒）の模様がついているのが筒子！' },
        { suit: 'sou', num: 7, fb: '竹（索）の模様がついているのが索子！' },
        { suit: 'man', num: 1, fb: '1萬は萬子！漢字の「一」と「萬」が書いてある。' },
        { suit: 'pin', num: 9, fb: '9筒は筒子！' },
        { suit: 'sou', num: 2, fb: '2索は索子！' },
        { suit: 'man', num: 6, fb: '6萬は萬子！' },
        { suit: 'pin', num: 1, fb: '1筒は筒子！' },
        { suit: 'sou', num: 4, fb: '4索は索子！' },
        { suit: 'man', num: 9, fb: '9萬は萬子！' },
      ],
      passNeeded: 8,
    },
    mg2: {
      title: 'ミニゲーム②　アガリ牌を選ぼう',
      instruction: 'テンパイの手牌を見て、<strong>アガリ牌</strong>を選ぼう！',
      questions: [
        {
          hand: [{suit:'pin',num:1},{suit:'pin',num:2},{suit:'pin',num:3},{suit:'sou',num:5},{suit:'sou',num:6},{suit:'sou',num:7},{suit:'man',num:4},{suit:'man',num:5},{suit:'man',num:6},{suit:'man',num:9},{suit:'man',num:9},{suit:'pin',num:7},{suit:'pin',num:9}],
          answer: {suit:'pin',num:8},
          choices: [{suit:'pin',num:8},{suit:'pin',num:6},{suit:'pin',num:9},{suit:'sou',num:8}],
          fb: '8筒を引くと7・8・9筒の順子ができてアガリ！9萬・9萬が頭だよ。',
        },
        {
          hand: [{suit:'man',num:3},{suit:'man',num:4},{suit:'man',num:5},{suit:'pin',num:6},{suit:'pin',num:7},{suit:'pin',num:8},{suit:'sou',num:4},{suit:'sou',num:5},{suit:'sou',num:6},{suit:'sou',num:2},{suit:'sou',num:2},{suit:'man',num:7},{suit:'man',num:9}],
          answer: {suit:'man',num:8},
          choices: [{suit:'man',num:8},{suit:'man',num:6},{suit:'man',num:9},{suit:'pin',num:8}],
          fb: '8萬を引くと7・8・9萬の順子ができてアガリ！2索・2索が頭だよ。',
        },
        {
          hand: [{suit:'man',num:1},{suit:'man',num:2},{suit:'man',num:3},{suit:'pin',num:7},{suit:'pin',num:8},{suit:'pin',num:9},{suit:'sou',num:3},{suit:'sou',num:4},{suit:'sou',num:5},{suit:'pin',num:5},{suit:'pin',num:5},{suit:'sou',num:8},{suit:'sou',num:8}],
          answer: {suit:'sou',num:8},
          choices: [{suit:'sou',num:8},{suit:'sou',num:7},{suit:'sou',num:9},{suit:'man',num:8}],
          fb: '8索を引くと8索の刻子ができてアガリ！5筒・5筒が頭だよ。',
        },
      ],
      passNeeded: 3,
    },
  };

  // ===== Chapter 4: Honor tiles =====
  const HONOR_TILES_LIST = [
    {suit:'wind',num:1},{suit:'wind',num:2},{suit:'wind',num:3},{suit:'wind',num:4},
    {suit:'dragon',num:1},{suit:'dragon',num:2},{suit:'dragon',num:3},
  ];
  const HONOR_NAMES = ['東','南','西','北','白','發','中'];
  const ch4 = {
    mg1: {
      title: 'ミニゲーム①　字牌の見た目を覚えよう',
      instruction: '裏向きの牌をめくって<strong>同じ字牌2枚</strong>を揃えよう！',
    },
    // 2026-09-04：「字牌は順子になる？」から読み方クイズへ差し替えた。
    // 順子の話は第2章・第3章で扱っており重複していた一方、
    // 字牌の読み方はミニゲーム①で一覧を見せるだけで練習が無かった。
    mg2: {
      title: 'ミニゲーム②　字牌の読み方を覚えよう',
      instruction: 'この字牌の<strong>読み方</strong>はどれ？',
      questions: [
        { tile: {suit:'wind',num:1},   answer: 'トン',   choices: ['トン','ナン','シャー','ペー'], fb: '東は「トン」。麻雀では方角を中国語の読み方で呼ぶよ。' },
        { tile: {suit:'wind',num:2},   answer: 'ナン',   choices: ['ナン','トン','シャー','ペー'], fb: '南は「ナン」。日本語の「なん」と同じ音だから覚えやすいね。' },
        { tile: {suit:'wind',num:3},   answer: 'シャー', choices: ['シャー','サイ','ペー','ナン'], fb: '西は「シャー」。「にし」とは読まないので注意！' },
        { tile: {suit:'wind',num:4},   answer: 'ペー',   choices: ['ペー','ホク','シャー','トン'], fb: '北は「ペー」。三人麻雀では北抜きで使う大事な牌だよ。' },
        { tile: {suit:'dragon',num:1}, answer: 'ハク',   choices: ['ハク','シロ','ハツ','チュン'], fb: '白は「ハク」。何も書いていない真っ白な牌だね。' },
        { tile: {suit:'dragon',num:2}, answer: 'ハツ',   choices: ['ハツ','ミドリ','ハク','チュン'], fb: '發は「ハツ」。緑色の文字の牌だよ。' },
        { tile: {suit:'dragon',num:3}, answer: 'チュン', choices: ['チュン','ナカ','ハク','ハツ'], fb: '中は「チュン」。赤い牌で、このアプリのアイコンにもなっているよ。' },
      ],
      passNeeded: 5,
    },
  };

  // ===== Chapter 5: Yakuhai =====
  // 役牌は「役牌（三元牌）」「役牌（風牌）」の2つの役として扱う。
  // answer: 'dragon'=役牌（三元牌）／'wind'=役牌（風牌）／'none'=役牌でない
  const ch5 = {
    // 2026-09-04：三元牌と風牌を別々に学べるよう、3つに分けた。
    // 1つの問題で3択にしていたため、どちらのルールでつまずいたのか
    // 分からなかった。①三元牌だけ ②風牌だけ ③まとめ、の順にする。
    mg0: {
      title: 'ミニゲーム①　三元牌は役牌になる？',
      instruction: 'この3枚の刻子は<strong>三元牌の役牌</strong>になる？',
      questions: [
        { tiles: [{suit:'dragon',num:1},{suit:'dragon',num:1},{suit:'dragon',num:1}], answer: true,  fb: '白の刻子は三元牌の役牌！白・發・中はいつでも役牌になるよ。' },
        { tiles: [{suit:'dragon',num:2},{suit:'dragon',num:2},{suit:'dragon',num:2}], answer: true,  fb: '發の刻子は三元牌の役牌！場風や自風に関係なく、いつでも役になる。' },
        { tiles: [{suit:'dragon',num:3},{suit:'dragon',num:3},{suit:'dragon',num:3}], answer: true,  fb: '中の刻子は三元牌の役牌！三元牌は白・發・中の3種類だけ。' },
        { tiles: [{suit:'wind',num:1},{suit:'wind',num:1},{suit:'wind',num:1}],       answer: false, fb: '東は風牌であって三元牌ではないよ。三元牌は白・發・中だけ。' },
        { tiles: [{suit:'man',num:5},{suit:'man',num:5},{suit:'man',num:5}],          answer: false, fb: '5萬は数牌。数牌の刻子だけでは役牌にならないよ。' },
        { tiles: [{suit:'wind',num:4},{suit:'wind',num:4},{suit:'wind',num:4}],       answer: false, fb: '北は風牌。三元牌ではないよ。' },
      ],
      passNeeded: 4,
    },
    mg1: {
      title: 'ミニゲーム②　風牌は役牌になる？',
      instruction: 'この3枚の刻子は<strong>風牌の役牌</strong>になる？（場風:東、自風:南）',
      questions: [
        { tiles: [{suit:'wind',num:1},{suit:'wind',num:1},{suit:'wind',num:1}], answer: true,  fb: '東は場風！場風の刻子は風牌の役牌になるよ。' },
        { tiles: [{suit:'wind',num:2},{suit:'wind',num:2},{suit:'wind',num:2}], answer: true,  fb: '南は自風！自分の風の刻子も風牌の役牌になるよ。' },
        { tiles: [{suit:'wind',num:3},{suit:'wind',num:3},{suit:'wind',num:3}], answer: false, fb: '西は場風（東）でも自風（南）でもないから役牌にならない。' },
        { tiles: [{suit:'wind',num:4},{suit:'wind',num:4},{suit:'wind',num:4}], answer: false, fb: '北も場風でも自風でもないので役牌にならないよ。' },
        { tiles: [{suit:'dragon',num:2},{suit:'dragon',num:2},{suit:'dragon',num:2}], answer: false, fb: '發は三元牌。風牌ではないよ（三元牌としては役牌になる）。' },
        { tiles: [{suit:'sou',num:9},{suit:'sou',num:9},{suit:'sou',num:9}], answer: false, fb: '9索は数牌。風牌ではないよ。' },
      ],
      passNeeded: 4,
    },
    mg2: {
      title: 'ミニゲーム③　三元牌？風牌？役牌じゃない？',
      instruction: 'この3枚の刻子は<strong>三元牌の役牌</strong>？<strong>風牌の役牌</strong>？それとも役牌じゃない？（場風:東、自風:南）',
      questions: [
        { tiles: [{suit:'dragon',num:1},{suit:'dragon',num:1},{suit:'dragon',num:1}], answer: 'dragon', fb: '白の刻子は三元牌の役牌！白・發・中はいつでも役牌になるよ。' },
        { tiles: [{suit:'dragon',num:2},{suit:'dragon',num:2},{suit:'dragon',num:2}], answer: 'dragon', fb: '發の刻子は三元牌の役牌！白・發・中はいつでも役牌。' },
        { tiles: [{suit:'wind',num:3},{suit:'wind',num:3},{suit:'wind',num:3}], answer: 'none', fb: '西（3番目の風）は今回の場風・自風じゃないから役牌にならない。' },
        { tiles: [{suit:'wind',num:1},{suit:'wind',num:1},{suit:'wind',num:1}], answer: 'wind', fb: '東の刻子！東は場風なので風牌の役牌になるよ。' },
        { tiles: [{suit:'wind',num:2},{suit:'wind',num:2},{suit:'wind',num:2}], answer: 'wind', fb: '南の刻子！南は自風なので風牌の役牌になるよ。' },
        { tiles: [{suit:'dragon',num:3},{suit:'dragon',num:3},{suit:'dragon',num:3}], answer: 'dragon', fb: '中の刻子は三元牌の役牌！三元牌は必ず役牌。' },
        { tiles: [{suit:'wind',num:4},{suit:'wind',num:4},{suit:'wind',num:4}], answer: 'none', fb: '北（4番目の風）は今回の場風・自風じゃないから役牌にならない。' },
      ],
      passNeeded: 5,
    },
    mg3: null,
  };

  // ===== Chapter 6: Naki (Pon/Chi) =====
  const ch6 = {
    mg1: {
      title: 'ミニゲーム①　ポン？チー？鳴けない？',
      instruction: '捨て牌を見て正しい行動を選ぼう！<br>' +
        '🔴 <strong>ポン</strong>＝同じ牌2枚持ち、誰の捨て牌でもOK<br>' +
        '🔵 <strong>チー</strong>＝上家（左）からのみ、順子が作れる場合<br>' +
        '⚪ <strong>鳴けない</strong>＝どちらも条件を満たさない',
      questions: [
        // --- ポン ---
        {
          hand: [{suit:'man',num:5},{suit:'man',num:5},{suit:'pin',num:3},{suit:'pin',num:7}],
          discard: {suit:'man',num:5}, from: 'right',
          correct: 'pon',
          fb: '5萬が2枚ある→「ポン」！ポンは右（下家）からでも誰からでもできる。刻子完成！',
        },
        {
          hand: [{suit:'dragon',num:3},{suit:'dragon',num:3},{suit:'man',num:2},{suit:'sou',num:6}],
          discard: {suit:'dragon',num:3}, from: 'opposite',
          correct: 'pon',
          fb: '中が2枚ある→「ポン」！対面（向かい）からでもポンは可能。役牌の刻子完成！',
        },
        {
          hand: [{suit:'sou',num:4},{suit:'sou',num:4},{suit:'pin',num:2},{suit:'man',num:7}],
          discard: {suit:'sou',num:4}, from: 'left',
          correct: 'pon',
          fb: '4索が2枚ある→「ポン」！上家（左）からの捨て牌でもポンを選べる。',
        },
        {
          hand: [{suit:'wind',num:2},{suit:'wind',num:2},{suit:'man',num:6},{suit:'pin',num:3}],
          discard: {suit:'wind',num:2}, from: 'right',
          correct: 'pon',
          fb: '南が2枚ある→「ポン」！自分が南家なら役牌にもなるよ。',
        },
        // --- チー（上家/左のみ） ---
        {
          hand: [{suit:'man',num:3},{suit:'man',num:4},{suit:'pin',num:7},{suit:'sou',num:2}],
          discard: {suit:'man',num:5}, from: 'left',
          correct: 'chi',
          fb: '3萬・4萬があって上家の5萬→「チー」！3-4-5萬の順子完成。チーは上家（左）からのみ。',
        },
        {
          hand: [{suit:'pin',num:7},{suit:'pin',num:8},{suit:'man',num:2},{suit:'sou',num:9}],
          discard: {suit:'pin',num:6}, from: 'left',
          correct: 'chi',
          fb: '7筒・8筒があって上家の6筒→「チー」！6-7-8筒の順子完成。',
        },
        {
          hand: [{suit:'sou',num:1},{suit:'sou',num:3},{suit:'man',num:6},{suit:'pin',num:4}],
          discard: {suit:'sou',num:2}, from: 'left',
          correct: 'chi',
          fb: '1索・3索があって上家の2索→「チー」！1-2-3索の嵌張（カンチャン）チー！',
        },
        // --- 鳴けない ---
        {
          hand: [{suit:'pin',num:2},{suit:'pin',num:4},{suit:'sou',num:6},{suit:'man',num:8}],
          discard: {suit:'pin',num:2}, from: 'right',
          correct: 'none',
          fb: '手牌に2筒がない→ポン不可。右（下家）からはチーもできない→「鳴けない」！',
        },
        {
          hand: [{suit:'man',num:3},{suit:'man',num:4},{suit:'pin',num:7},{suit:'sou',num:2}],
          discard: {suit:'man',num:5}, from: 'right',
          correct: 'none',
          fb: '3萬・4萬で5萬をチーしたいが、チーは上家（左）からのみ！右（下家）からはチーできない→「鳴けない」！',
        },
        {
          hand: [{suit:'wind',num:1},{suit:'man',num:3},{suit:'pin',num:6},{suit:'sou',num:8}],
          discard: {suit:'wind',num:1}, from: 'opposite',
          correct: 'none',
          fb: '東が1枚しかない→ポン不可。字牌は順子を作れない→チー不可→「鳴けない」！',
        },
        {
          hand: [{suit:'man',num:2},{suit:'man',num:6},{suit:'pin',num:5},{suit:'sou',num:3}],
          discard: {suit:'man',num:4}, from: 'left',
          correct: 'none',
          fb: '上家から4萬だが、2萬と6萬では4萬と順子にならない（3萬5萬なら可）→チー不可。ポンもできない→「鳴けない」！',
        },
        {
          hand: [{suit:'pin',num:5},{suit:'pin',num:5},{suit:'man',num:3},{suit:'sou',num:7}],
          discard: {suit:'pin',num:5}, from: 'left',
          correct: 'pon',
          fb: '5筒が2枚あって上家の5筒→「ポン」！同じ牌でチーは作れないのでポンが正解。',
        },
      ],
      passNeeded: 8,
    },
    mg2: null,
    mg3: null,
    mg4: null,
    // 2026-09-05：カンの説明がどこにも無かったので足した。
    // 第8章（暗カンは鳴きに数えない）・第11章（三槓子）・第12章（三麻はポン・カンOK）が
    // カンを知っている前提で問うているのに、教える場所が無かった。
    // 種類（暗カン・大明カン・加カン）は分けず、「4枚そろえばカンできる」だけを教える。
    mg2: {
      title: 'ミニゲーム②　カンできる？',
      instruction: 'カンは<strong>同じ牌が4枚</strong>そろうとできる鳴き。この場面は<strong>カンできる</strong>？',
      questions: [
        {
          hand: [{suit:'man',num:5},{suit:'man',num:5},{suit:'man',num:5},{suit:'man',num:5}],
          from: null, meld: null, answer: true,
          fb: '5萬が4枚そろっている→<strong>カンできる</strong>！自分だけで4枚集めた形だよ。',
        },
        {
          hand: [{suit:'pin',num:3},{suit:'pin',num:3},{suit:'pin',num:3}],
          from: 'right', meld: null, answer: true,
          fb: '手牌の3枚＋捨てられた1枚で4枚→<strong>カンできる</strong>！チーと違って、カンは誰の捨て牌でもOK。',
        },
        {
          hand: [{suit:'sou',num:7},{suit:'sou',num:7},{suit:'sou',num:7}],
          from: null, meld: null, answer: false,
          fb: '3枚しかない→<strong>カンできない</strong>。3枚は刻子。カンには4枚目が必要だよ。',
        },
        {
          hand: [{suit:'dragon',num:3},{suit:'dragon',num:3},{suit:'dragon',num:3},{suit:'dragon',num:3}],
          from: null, meld: null, answer: true,
          fb: '中が4枚そろっている→<strong>カンできる</strong>！字牌でもカンはできるよ。',
        },
        {
          hand: [{suit:'man',num:1},{suit:'man',num:1}],
          from: 'left', meld: null, answer: false,
          fb: '手牌2枚＋捨て牌1枚で3枚→<strong>カンできない</strong>。これはポンならできる形だね。',
        },
        {
          hand: [{suit:'pin',num:9},{suit:'pin',num:9},{suit:'pin',num:9}],
          from: null, meld: 'pon', answer: true,
          fb: 'ポンしてある3枚＋自分で引いた1枚で4枚→<strong>カンできる</strong>！',
        },
        {
          hand: [{suit:'sou',num:2},{suit:'sou',num:2},{suit:'sou',num:2},{suit:'sou',num:2}],
          from: null, meld: null, answer: true,
          fb: '2索が4枚→<strong>カンできる</strong>。同じ牌は全部で4枚しかないので、4枚集めたらカンの形だよ。',
        },
        {
          hand: [{suit:'man',num:6},{suit:'man',num:7},{suit:'man',num:8}],
          from: null, meld: null, answer: false,
          fb: '6萬・7萬・8萬は順子→<strong>カンできない</strong>。カンは同じ牌4枚だけだよ。',
        },
      ],
      passNeeded: 6,
    },

  };

  // ===== Chapter 7: Review test =====
  const ch7 = {
    title: '道場チャレンジ　初級試験',
    instruction: '10問に答えて段位を目指そう！',
    questions: [
      { type: 'find_set', nums: [1,2,3,5,8], answer: [0,1,2], q: 'セット（3枚）を選ぼう！', fb: '1・2・3で順子！' },
      { type: 'is_set_yn', tiles: [{suit:'man',num:4},{suit:'man',num:4},{suit:'man',num:4}], answer: true, q: 'この3枚はセット？', fb: '4萬が3枚で刻子！' },
      { type: 'is_set_yn', tiles: [{suit:'man',num:1},{suit:'pin',num:2},{suit:'sou',num:3}], answer: false, q: 'この3枚はセット？', fb: '種類が違う！同じ種類でないと順子にならない。' },
      { type: 'is_honor_yn', tiles: [{suit:'wind',num:1},{suit:'wind',num:2},{suit:'wind',num:3}], answer: false, q: '東・南・西は順子になる？', fb: '字牌は順子にならない！' },
      { type: 'suit_id', tile: {suit:'pin',num:5}, answer: 'pin', q: 'この牌の種類は？', fb: '5筒は筒子！' },
      { type: 'is_yakuhai', tiles: [{suit:'dragon',num:3},{suit:'dragon',num:3},{suit:'dragon',num:3}], answer: true, q: '中の刻子は役牌？', fb: '中は三元牌でいつでも役牌！' },
      { type: 'can_pon', hand: [{suit:'sou',num:7},{suit:'sou',num:7}], discard: {suit:'sou',num:7}, answer: true, q: 'ポンできる？', fb: '7索が2枚あるからポンできる！' },
      { type: 'can_chi', hand: [{suit:'man',num:2},{suit:'man',num:3}], discard: {suit:'man',num:4}, from: 'left', answer: true, q: '左の人が4萬を捨てた。チーできる？', fb: '2萬・3萬があるから4萬でチーして2-3-4萬！' },
      { type: 'find_pair', nums: [3,3,5,7,9], answer: [0,1], q: '頭（2枚ペア）を選ぼう！', fb: '3が2枚で頭！' },
      { type: 'agari_tile', hand: [{suit:'pin',num:1},{suit:'pin',num:2},{suit:'pin',num:3},{suit:'sou',num:5},{suit:'sou',num:6},{suit:'sou',num:7},{suit:'man',num:9},{suit:'man',num:9},{suit:'man',num:9},{suit:'dragon',num:2},{suit:'dragon',num:2},{suit:'pin',num:6},{suit:'pin',num:8}], answer: {suit:'pin',num:7}, choices: [{suit:'pin',num:7},{suit:'pin',num:6},{suit:'pin',num:8},{suit:'sou',num:7}], q: 'アガリ牌はどれ？', fb: '7筒を引くと6・7・8筒の順子が完成！發の頭と9萬の刻子でアガリ！' },
    ],
  };

  // ===== Chapter 8: 初心者向けの役（立直・タンヤオ・平和） =====
  const ch8 = {
    mgs: [
      {
        type: 'yn',
        title: 'ミニゲーム①　タンヤオに使える？',
        instruction: '表示の3枚は<strong>タンヤオ</strong>に使える？（2〜8の数牌だけならOK。1・9・字牌が混じるとNG）',
        yesLabel: '○ 使える', noLabel: '✕ 使えない',
        passNeeded: 6,
        questions: [
          { tiles: [{suit:'man',num:2},{suit:'man',num:3},{suit:'man',num:4}], answer: true,  fb: '2・3・4萬は全部2〜8。タンヤオに使えるよ！' },
          { tiles: [{suit:'pin',num:1},{suit:'pin',num:2},{suit:'pin',num:3}], answer: false, fb: '1筒が入っている！1や9が混じるとタンヤオにできない。' },
          { tiles: [{suit:'sou',num:6},{suit:'sou',num:7},{suit:'sou',num:8}], answer: true,  fb: '6・7・8索は全部2〜8。タンヤオOK！' },
          { tiles: [{suit:'man',num:7},{suit:'man',num:8},{suit:'man',num:9}], answer: false, fb: '9萬が入っている！9はタンヤオNG。' },
          { tiles: [{suit:'dragon',num:1},{suit:'dragon',num:1},{suit:'dragon',num:1}], answer: false, fb: '白は字牌。字牌が入るとタンヤオにはできない。' },
          { tiles: [{suit:'pin',num:4},{suit:'pin',num:5},{suit:'pin',num:6}], answer: true,  fb: '4・5・6筒は中張牌（2〜8）だけ。タンヤオOK！' },
          { tiles: [{suit:'sou',num:1},{suit:'sou',num:1},{suit:'sou',num:1}], answer: false, fb: '1索は端の牌。1が入るとタンヤオにできない。' },
          { tiles: [{suit:'man',num:3},{suit:'man',num:4},{suit:'man',num:5}], answer: true,  fb: '3・4・5萬はすべて2〜8。タンヤオに使える！' },
        ],
      },
      {
        type: 'yn',
        title: 'ミニゲーム②　平和の頭になれる？',
        instruction: 'この2枚の頭（雀頭）は<strong>平和</strong>に使える？（場風:東、自風:南。三元牌と場風・自風の風牌はNG）',
        yesLabel: '○ 使える', noLabel: '✕ 使えない',
        passNeeded: 6,
        questions: [
          { tiles: [{suit:'pin',num:5},{suit:'pin',num:5}], answer: true, fb: '数牌の頭はいつでもOK！平和の頭に使える。' },
          { tiles: [{suit:'dragon',num:1},{suit:'dragon',num:1}], answer: false, fb: '白（三元牌）の頭は役牌になるからNG。平和は頭が役牌だと成立しない。' },
          { tiles: [{suit:'man',num:3},{suit:'man',num:3}], answer: true, fb: '3萬は数牌。頭にしてもOK！' },
          { tiles: [{suit:'wind',num:1},{suit:'wind',num:1}], answer: false, fb: '東は場風！場風・自風の頭は役牌になるからNG。' },
          { tiles: [{suit:'wind',num:2},{suit:'wind',num:2}], answer: false, fb: '南は自風！自分の風の頭も役牌になるからNG。' },
          { tiles: [{suit:'dragon',num:2},{suit:'dragon',num:2}], answer: false, fb: '發（三元牌）もNG。白・發・中はいつでも役牌になる。' },
          { tiles: [{suit:'wind',num:3},{suit:'wind',num:3}], answer: true, fb: '西は場風でも自風でもないからOK！役牌にならない風牌なら頭に使える。' },
          { tiles: [{suit:'sou',num:9},{suit:'sou',num:9}], answer: true, fb: '9索は数牌。1・9でも頭ならタンヤオと違ってOK！平和は頭の数字を問わない。' },
        ],
      },
      {
        type: 'yn',
        title: 'ミニゲーム③　門前清自摸和になる？',
        instruction: 'つぎの状況は<strong>門前清自摸和</strong>（メンゼンツモ）になる？（鳴きなし＋ツモ和了で成立）',
        yesLabel: '○ 成立する', noLabel: '✕ 成立しない',
        passNeeded: 6,
        questions: [
          { text: '鳴き（ポン・チー）なしでツモ和了した。', answer: true, fb: '門前（鳴きなし）でツモなら門前清自摸和が成立！1翻。' },
          { text: 'ポンをしている状態でツモ和了した。', answer: false, fb: '鳴いている（ポンした）と門前清自摸和は成立しない。門前限定の役だよ。' },
          { text: '鳴きなしでロン和了した。', answer: false, fb: 'ロンだと成立しない！門前清自摸和は「ツモ」で和了したときだけの役。' },
          { text: 'チーをしている状態でツモ和了した。', answer: false, fb: 'チーも「鳴き」！鳴きが1つでもあると門前清自摸和は成立しない。' },
          { text: '鳴きなしでツモ和了し、タンヤオも同時に成立していた。', answer: true, fb: '門前でツモなら成立！他の役（タンヤオなど）と同時に成立してもOK、翻数は合計される。' },
          { text: '暗カン（鳴かずに行うカン）だけをして、鳴きなしでツモ和了した。', answer: true, fb: '暗カンは「鳴き」に数えない！門前を崩さないので門前清自摸和も成立するよ。' },
          { text: '鳴きなしでツモ和了し、役牌の刻子も入っていた。', answer: true, fb: '門前＋ツモなら成立！役牌との複合もよくあるパターン。' },
          { text: 'ポンをしている状態でロン和了した。', answer: false, fb: '鳴きあり＋ロンなので、門前清自摸和は成立しない（他の役があれば別）。' },
        ],
      },
      {
        type: 'yn',
        title: 'ミニゲーム④　一発になる？',
        instruction: 'つぎの状況は<strong>一発</strong>（イッパツ）になる？（立直宣言後、一巡（イチジュン）以内・鳴きなしで和了すると成立）',
        yesLabel: '○ 成立する', noLabel: '✕ 成立しない',
        passNeeded: 6,
        questions: [
          { text: '立直を宣言した直後の一巡目（イチジュンメ）で、誰も鳴かずにツモ和了した。', answer: true, fb: '立直後、一巡（イチジュン）以内・鳴きなしでツモ！一発成立、1翻。' },
          { text: '立直を宣言した直後の一巡目（イチジュンメ）で、誰も鳴かずにロン和了した。', answer: true, fb: '一発はツモでもロンでもOK！鳴きが入らなければ成立するよ。' },
          { text: '立直を宣言した後、他家がポンをしてから和了した。', answer: false, fb: '誰かが鳴く（ポン・チー・カン）と、その時点で一発は消える。' },
          { text: '立直を宣言してから二巡目（ニジュンメ）以降に和了した。', answer: false, fb: '一巡（イチジュン）以内でないと一発は成立しない！二巡目（ニジュンメ）以降はアウト。' },
          { text: '立直を宣言した直後の一巡目（イチジュンメ）で、他家がチーをしてから自分がロン和了した。', answer: false, fb: 'チーも「鳴き」！間に鳴きが入ると一発は消える。' },
          { text: '立直を宣言した直後の一巡目（イチジュンメ）で、誰も鳴かずにツモ和了した（ダブルリーチだった）。', answer: true, fb: 'ダブルリーチと一発は同時に成立できる！鳴きなし・一巡（イチジュン）以内が条件。' },
          { text: '立直を宣言した後、自分が暗カンをしてからツモ和了した。', answer: false, fb: '自分の暗カンも「鳴き」に数えるので一発は消える。' },
          { text: '立直を宣言した直後の一巡目（イチジュンメ）で、誰も鳴かずに他家の捨て牌でロン和了した。', answer: true, fb: '鳴きが一切なければ、他家の捨て牌でのロンでも一発成立！' },
        ],
      },
      {
        type: 'yn',
        title: 'ミニゲーム⑤　立直になる？',
        instruction: 'つぎの状況は<strong>立直</strong>（リーチ）を宣言できる？（門前でテンパイしていることが条件。1000点の供託が必要）',
        yesLabel: '○ 宣言できる', noLabel: '✕ できない',
        passNeeded: 5,
        questions: [
          { text: '門前（鳴きなし）でテンパイしている。持ち点は十分ある。', answer: true, fb: '門前でテンパイ！立直を宣言できるよ。' },
          { text: 'ポンをしている（鳴きあり）状態でテンパイしている。', answer: false, fb: '鳴いている（門前でない）と立直は宣言できない。' },
          { text: '門前だが、まだテンパイしていない。', answer: false, fb: 'テンパイしていないと立直は宣言できない。' },
          { text: '門前でテンパイしていて、持ち点が1000点以上ある。', answer: true, fb: '門前＋テンパイ＋1000点以上！立直の条件がそろっている。' },
          { text: '門前でテンパイしているが、持ち点が0点しかない。', answer: false, fb: '立直には1000点の供託が必要。点数が足りないと宣言できない。' },
          { text: 'チーをしている状態でテンパイしている。', answer: false, fb: 'チーも鳴き！門前でなくなるので立直は宣言できない。' },
        ],
      },
      {
        type: 'choice',
        title: 'ミニゲーム⑥　役を当てよう',
        instruction: '説明に合う役を選ぼう！',
        passNeeded: 3,
        questions: [
          { text: '門前（鳴きなし）でテンパイし、1000点を出して宣言する役は？', choices: ['立直','タンヤオ','平和','役牌','門前清自摸和','一発'], answer: '立直', fb: '門前でテンパイしたら立直（リーチ）！1000点を供託して宣言するよ。' },
          { text: '2〜8の数牌だけ（1・9・字牌なし）で作る役は？', choices: ['立直','タンヤオ','平和','役牌','門前清自摸和','一発'], answer: 'タンヤオ', fb: '断么九（タンヤオ）！中張牌だけで作るよ。' },
          { text: '全部順子・頭が役牌以外・両面待ち、の3条件で成立する役は？', choices: ['立直','タンヤオ','平和','役牌','門前清自摸和','一発'], answer: '平和', fb: '平和（ピンフ）！3つの条件すべてが必要だよ。' },
          { text: '白・發・中などの同じ牌3枚（刻子）で成立する役は？', choices: ['立直','タンヤオ','平和','役牌','門前清自摸和','一発'], answer: '役牌', fb: '役牌（ヤクハイ）！三元牌や場風・自風の刻子で成立。' },
          { text: '鳴かずにツモで和了したときだけ成立する役は？', choices: ['立直','タンヤオ','平和','役牌','門前清自摸和','一発'], answer: '門前清自摸和', fb: '門前清自摸和（メンゼンツモ）！門前でツモ和了したときだけの1翻役。' },
          { text: '立直宣言後、一巡（イチジュン）以内・鳴きなしで和了すると成立する役は？', choices: ['立直','門前清自摸和','一発','役牌'], answer: '一発', fb: '一発（イッパツ）！立直とセットでよく出る1翻役。' },
        ],
      },
    ],
  };

  // ===== Chapter 9: 翻を数えてみよう（翻数・ドラ・点数） =====
  const ch9 = {
    mgs: [
      {
        type: 'choice',
        title: 'ミニゲーム①　翻を数えよう',
        instruction: '役とドラを合計して何翻になるか選ぼう！（ドラ1枚＝1翻）',
        passNeeded: 4,
        questions: [
          { text: '立直（1翻）＋タンヤオ（1翻）＝ 何翻？', choices: ['1翻','2翻','3翻','4翻'], answer: '2翻', fb: '1＋1で2翻！' },
          { text: '立直（1翻）＋タンヤオ（1翻）＋ドラ1 ＝ 何翻？', choices: ['2翻','3翻','4翻','5翻'], answer: '3翻', fb: 'ドラも1翻分。1＋1＋1で3翻！' },
          { text: 'リーチ（1翻）＋一発（1翻）＋ツモ（1翻）＝ 何翻？', choices: ['2翻','3翻','4翻','5翻'], answer: '3翻', fb: '1＋1＋1で3翻！' },
          { text: '混一色（鳴きで2翻）＋役牌（1翻）＝ 何翻？', choices: ['2翻','3翻','4翻','5翻'], answer: '3翻', fb: '2＋1で3翻！' },
          { text: 'タンヤオ（1翻）＋ドラ3 ＝ 何翻？', choices: ['3翻','4翻','5翻','6翻'], answer: '4翻', fb: '1＋3で4翻！ドラはたくさん乗ると一気に増える。' },
        ],
      },
      {
        type: 'agari',
        title: 'ミニゲーム②　ドラはどれ？',
        instruction: 'ドラ表示牌の<strong>次の牌</strong>がドラ！正しいドラを選ぼう。',
        handLabel: 'ドラ表示牌（この次がドラ）',
        passNeeded: 3,
        questions: [
          { hand: [{suit:'man',num:3}], answer: {suit:'man',num:4}, choices: [{suit:'man',num:4},{suit:'man',num:3},{suit:'man',num:2},{suit:'pin',num:4}], fb: '表示牌の次がドラ。3萬の次は4萬！' },
          { hand: [{suit:'pin',num:9}], answer: {suit:'pin',num:1}, choices: [{suit:'pin',num:1},{suit:'pin',num:9},{suit:'pin',num:8},{suit:'sou',num:1}], fb: '9の次は1に戻る。9筒の次は1筒！' },
          { hand: [{suit:'dragon',num:1}], answer: {suit:'dragon',num:2}, choices: [{suit:'dragon',num:2},{suit:'dragon',num:1},{suit:'dragon',num:3},{suit:'wind',num:1}], fb: '三元牌は白→發→中→白の順。白の次は發！' },
          { hand: [{suit:'wind',num:4}], answer: {suit:'wind',num:1}, choices: [{suit:'wind',num:1},{suit:'wind',num:4},{suit:'wind',num:3},{suit:'dragon',num:1}], fb: '風牌は東→南→西→北→東。北の次は東に戻る！' },
          { hand: [{suit:'sou',num:5}], answer: {suit:'sou',num:6}, choices: [{suit:'sou',num:6},{suit:'sou',num:5},{suit:'sou',num:4},{suit:'man',num:6}], fb: '5索の次は6索！' },
        ],
      },
      {
        type: 'choice',
        title: 'ミニゲーム③　点数のランク',
        instruction: '翻数からおおよその点数ランクを選ぼう！（満貫＝子8000/親12000点）',
        passNeeded: 4,
        questions: [
          { text: '5翻は何という？', choices: ['満貫','跳満','倍満','三倍満'], answer: '満貫', fb: '5翻は満貫（マンガン）！子ロン8000点・親ロン12000点。' },
          { text: '6〜7翻は何という？', choices: ['満貫','跳満','倍満','三倍満'], answer: '跳満', fb: '6〜7翻は跳満（ハネマン）！' },
          { text: '8〜10翻は何という？', choices: ['満貫','跳満','倍満','三倍満'], answer: '倍満', fb: '8〜10翻は倍満（バイマン）！' },
          { text: '11〜12翻は何という？', choices: ['満貫','跳満','倍満','三倍満'], answer: '三倍満', fb: '11〜12翻は三倍満（サンバイマン）！' },
          { text: '13翻以上（役満相当）は何という？', choices: ['倍満','三倍満','役満','満貫'], answer: '役満', fb: '13翻以上は役満！子32000点・親48000点。' },
        ],
      },
    ],
  };

  // ===== Chapter 10: 中級者向けの役（一盃口・七対子・対々和） =====
  const ch10 = {
    mgs: [
      {
        type: 'yn',
        title: 'ミニゲーム①　七対子になる？',
        instruction: '表示の手牌は<strong>七対子</strong>（7種類すべて違う牌のペア）になっている？',
        yesLabel: '○ 七対子', noLabel: '✕ ちがう',
        passNeeded: 3,
        questions: [
          { tiles: [{suit:'man',num:1},{suit:'man',num:1},{suit:'man',num:6},{suit:'man',num:6},{suit:'pin',num:3},{suit:'pin',num:3},{suit:'pin',num:8},{suit:'pin',num:8},{suit:'sou',num:2},{suit:'sou',num:2},{suit:'sou',num:7},{suit:'sou',num:7},{suit:'dragon',num:3},{suit:'dragon',num:3}], answer: true, fb: '7種類すべて違うペア！正しい七対子だよ。' },
          { tiles: [{suit:'man',num:5},{suit:'man',num:5},{suit:'man',num:5},{suit:'man',num:5},{suit:'pin',num:2},{suit:'pin',num:2},{suit:'pin',num:7},{suit:'pin',num:7},{suit:'sou',num:3},{suit:'sou',num:3},{suit:'sou',num:9},{suit:'sou',num:9},{suit:'wind',num:1},{suit:'wind',num:1}], answer: false, fb: '同じ牌4枚を2ペアと数えるのはNG。7種類すべて違う牌のペアが必要。' },
          { tiles: [{suit:'man',num:2},{suit:'man',num:2},{suit:'man',num:9},{suit:'man',num:9},{suit:'pin',num:4},{suit:'pin',num:4},{suit:'pin',num:5},{suit:'pin',num:5},{suit:'sou',num:1},{suit:'sou',num:1},{suit:'sou',num:8},{suit:'sou',num:8},{suit:'wind',num:2},{suit:'wind',num:2}], answer: true, fb: '7種類すべて違うペア！七対子の完成形。' },
          { tiles: [{suit:'sou',num:4},{suit:'sou',num:4},{suit:'sou',num:4},{suit:'sou',num:4},{suit:'man',num:3},{suit:'man',num:3},{suit:'man',num:8},{suit:'man',num:8},{suit:'pin',num:6},{suit:'pin',num:6},{suit:'pin',num:9},{suit:'pin',num:9},{suit:'dragon',num:1},{suit:'dragon',num:1}], answer: false, fb: '4索が4枚。これは2ペアにできず6種類しかない→七対子ではない。' },
        ],
      },
      {
        type: 'yn',
        title: 'ミニゲーム②　対々和になる？',
        instruction: '表示の手牌は<strong>対々和</strong>（全部が刻子＋頭・順子なし）の形？',
        yesLabel: '○ 対々和', noLabel: '✕ ちがう',
        passNeeded: 3,
        questions: [
          { tiles: [{suit:'man',num:3},{suit:'man',num:3},{suit:'man',num:3},{suit:'pin',num:5},{suit:'pin',num:5},{suit:'pin',num:5},{suit:'sou',num:7},{suit:'sou',num:7},{suit:'sou',num:7},{suit:'dragon',num:3},{suit:'dragon',num:3},{suit:'dragon',num:3},{suit:'man',num:9},{suit:'man',num:9}], answer: true, fb: '全部刻子＋頭！対々和の形だよ。' },
          { tiles: [{suit:'man',num:2},{suit:'man',num:3},{suit:'man',num:4},{suit:'pin',num:5},{suit:'pin',num:5},{suit:'pin',num:5},{suit:'sou',num:7},{suit:'sou',num:7},{suit:'sou',num:7},{suit:'dragon',num:1},{suit:'dragon',num:1},{suit:'dragon',num:1},{suit:'man',num:9},{suit:'man',num:9}], answer: false, fb: '2・3・4萬は順子！順子があると対々和にはならない。' },
          { tiles: [{suit:'pin',num:1},{suit:'pin',num:1},{suit:'pin',num:1},{suit:'sou',num:4},{suit:'sou',num:4},{suit:'sou',num:4},{suit:'man',num:6},{suit:'man',num:6},{suit:'man',num:6},{suit:'wind',num:1},{suit:'wind',num:1},{suit:'wind',num:1},{suit:'sou',num:9},{suit:'sou',num:9}], answer: true, fb: '刻子4つ＋頭1つ。きれいな対々和！' },
          { tiles: [{suit:'sou',num:4},{suit:'sou',num:5},{suit:'sou',num:6},{suit:'man',num:2},{suit:'man',num:2},{suit:'man',num:2},{suit:'pin',num:8},{suit:'pin',num:8},{suit:'pin',num:8},{suit:'dragon',num:2},{suit:'dragon',num:2},{suit:'dragon',num:2},{suit:'sou',num:1},{suit:'sou',num:1}], answer: false, fb: '4・5・6索は順子！対々和は順子があるとダメ。' },
        ],
      },
      {
        type: 'yn',
        title: 'ミニゲーム③　一気通貫になる？',
        instruction: '表示の9枚は同じ種類の牌で1〜9すべて（<strong>一気通貫</strong>）そろっている？',
        yesLabel: '○ 一気通貫', noLabel: '✕ ちがう',
        passNeeded: 4,
        questions: [
          { tiles: [{suit:'man',num:1},{suit:'man',num:2},{suit:'man',num:3},{suit:'man',num:4},{suit:'man',num:5},{suit:'man',num:6},{suit:'man',num:7},{suit:'man',num:8},{suit:'man',num:9}], answer: true, fb: '萬子で1〜9がすべてそろっている！一気通貫だよ。' },
          { tiles: [{suit:'pin',num:1},{suit:'pin',num:2},{suit:'pin',num:3},{suit:'pin',num:4},{suit:'pin',num:5},{suit:'pin',num:6},{suit:'pin',num:7},{suit:'pin',num:8},{suit:'pin',num:9}], answer: true, fb: '筒子でもOK！1種類の牌で1〜9がそろえば一気通貫。' },
          { tiles: [{suit:'man',num:1},{suit:'man',num:2},{suit:'man',num:3},{suit:'man',num:4},{suit:'man',num:5},{suit:'man',num:6},{suit:'man',num:7},{suit:'man',num:8},{suit:'man',num:8}], answer: false, fb: '9萬がなく8萬が2枚。9が抜けているので一気通貫にならない。' },
          { tiles: [{suit:'man',num:1},{suit:'man',num:2},{suit:'man',num:3},{suit:'man',num:4},{suit:'man',num:5},{suit:'man',num:6},{suit:'pin',num:7},{suit:'pin',num:8},{suit:'pin',num:9}], answer: false, fb: '7〜9筒が混ざっている！一気通貫は同じ種類でそろえないとダメ。' },
          { tiles: [{suit:'sou',num:1},{suit:'sou',num:2},{suit:'sou',num:3},{suit:'sou',num:4},{suit:'sou',num:5},{suit:'sou',num:6},{suit:'sou',num:7},{suit:'sou',num:8},{suit:'sou',num:9}], answer: true, fb: '索子でもOK！種類は萬子・筒子・索子どれでも良い。' },
          { tiles: [{suit:'man',num:1},{suit:'man',num:2},{suit:'man',num:3},{suit:'man',num:5},{suit:'man',num:6},{suit:'man',num:7},{suit:'man',num:7},{suit:'man',num:8},{suit:'man',num:9}], answer: false, fb: '4萬が抜けていて7萬が重複。1〜9が全部そろっていないので一気通貫にならない。' },
        ],
      },
      {
        type: 'yn',
        title: 'ミニゲーム④　一盃口になる？',
        instruction: '表示の手牌（鳴きなし）は<strong>一盃口</strong>（同じ種類の順子2組）になっている？',
        yesLabel: '○ 一盃口', noLabel: '✕ ちがう',
        passNeeded: 5,
        questions: [
          { tiles: [{suit:'man',num:2},{suit:'man',num:3},{suit:'man',num:4},{suit:'man',num:2},{suit:'man',num:3},{suit:'man',num:4},{suit:'pin',num:5},{suit:'pin',num:6},{suit:'pin',num:7},{suit:'sou',num:1},{suit:'sou',num:2},{suit:'sou',num:3},{suit:'pin',num:9},{suit:'pin',num:9}], answer: true, fb: '2-3-4萬が2組！同じ種類の順子2組で一盃口だよ。' },
          { tiles: [{suit:'man',num:2},{suit:'man',num:3},{suit:'man',num:4},{suit:'man',num:3},{suit:'man',num:4},{suit:'man',num:5},{suit:'pin',num:5},{suit:'pin',num:6},{suit:'pin',num:7},{suit:'sou',num:1},{suit:'sou',num:2},{suit:'sou',num:3},{suit:'pin',num:9},{suit:'pin',num:9}], answer: false, fb: '2-3-4萬と3-4-5萬は違う順子！「同じ」順子が2組でないと一盃口にならない。' },
          { tiles: [{suit:'sou',num:5},{suit:'sou',num:6},{suit:'sou',num:7},{suit:'sou',num:5},{suit:'sou',num:6},{suit:'sou',num:7},{suit:'man',num:1},{suit:'man',num:2},{suit:'man',num:3},{suit:'pin',num:4},{suit:'pin',num:5},{suit:'pin',num:6},{suit:'sou',num:8},{suit:'sou',num:8}], answer: true, fb: '5-6-7索が2組！これも一盃口。' },
          { tiles: [{suit:'pin',num:3},{suit:'pin',num:3},{suit:'pin',num:3},{suit:'sou',num:6},{suit:'sou',num:6},{suit:'sou',num:6},{suit:'man',num:1},{suit:'man',num:2},{suit:'man',num:3},{suit:'pin',num:7},{suit:'pin',num:8},{suit:'pin',num:9},{suit:'man',num:4},{suit:'man',num:4}], answer: false, fb: '刻子（同じ牌3枚）はいくつあっても一盃口にはならない！「順子」が2組必要。' },
          { tiles: [{suit:'pin',num:1},{suit:'pin',num:2},{suit:'pin',num:3},{suit:'pin',num:1},{suit:'pin',num:2},{suit:'pin',num:3},{suit:'sou',num:4},{suit:'sou',num:5},{suit:'sou',num:6},{suit:'man',num:7},{suit:'man',num:8},{suit:'man',num:9},{suit:'sou',num:2},{suit:'sou',num:2}], answer: true, fb: '1-2-3筒が2組！一盃口だよ。' },
          { tiles: [{suit:'man',num:2},{suit:'man',num:3},{suit:'man',num:4},{suit:'pin',num:2},{suit:'pin',num:3},{suit:'pin',num:4},{suit:'sou',num:2},{suit:'sou',num:3},{suit:'sou',num:4},{suit:'man',num:7},{suit:'man',num:8},{suit:'man',num:9},{suit:'pin',num:5},{suit:'pin',num:5}], answer: false, fb: 'これは萬・筒・索で同じ数字の順子（三色同順）！一盃口は「同じ種類」で2組そろえる役だから違うよ。' },
        ],
      },
      {
        type: 'yn',
        title: 'ミニゲーム⑤　三色同順になる？',
        instruction: '表示の手牌は<strong>三色同順</strong>（萬・筒・索で同じ数字の順子）になっている？',
        yesLabel: '○ 三色同順', noLabel: '✕ ちがう',
        passNeeded: 5,
        questions: [
          { tiles: [{suit:'man',num:2},{suit:'man',num:3},{suit:'man',num:4},{suit:'pin',num:2},{suit:'pin',num:3},{suit:'pin',num:4},{suit:'sou',num:2},{suit:'sou',num:3},{suit:'sou',num:4},{suit:'man',num:7},{suit:'man',num:8},{suit:'man',num:9},{suit:'pin',num:6},{suit:'pin',num:6}], answer: true, fb: '萬・筒・索すべてに2-3-4の順子！三色同順だよ。' },
          { tiles: [{suit:'man',num:2},{suit:'man',num:3},{suit:'man',num:4},{suit:'pin',num:3},{suit:'pin',num:4},{suit:'pin',num:5},{suit:'sou',num:2},{suit:'sou',num:3},{suit:'sou',num:4},{suit:'man',num:7},{suit:'man',num:8},{suit:'man',num:9},{suit:'pin',num:6},{suit:'pin',num:6}], answer: false, fb: '筒子だけ3-4-5で数字がズレている！3色とも同じ数字でないとダメ。' },
          { tiles: [{suit:'man',num:5},{suit:'man',num:6},{suit:'man',num:7},{suit:'pin',num:5},{suit:'pin',num:6},{suit:'pin',num:7},{suit:'sou',num:5},{suit:'sou',num:6},{suit:'sou',num:7},{suit:'man',num:1},{suit:'man',num:2},{suit:'man',num:3},{suit:'pin',num:9},{suit:'pin',num:9}], answer: true, fb: '3色とも5-6-7の順子！三色同順だよ。' },
          { tiles: [{suit:'man',num:4},{suit:'man',num:5},{suit:'man',num:6},{suit:'pin',num:4},{suit:'pin',num:5},{suit:'pin',num:6},{suit:'sou',num:7},{suit:'sou',num:8},{suit:'sou',num:9},{suit:'man',num:1},{suit:'man',num:2},{suit:'man',num:3},{suit:'sou',num:3},{suit:'sou',num:3}], answer: false, fb: '索子だけ7-8-9で違う！萬・筒の4-5-6と数字がそろっていない。' },
          { tiles: [{suit:'man',num:7},{suit:'man',num:8},{suit:'man',num:9},{suit:'pin',num:7},{suit:'pin',num:8},{suit:'pin',num:9},{suit:'sou',num:7},{suit:'sou',num:8},{suit:'sou',num:9},{suit:'man',num:2},{suit:'man',num:3},{suit:'man',num:4},{suit:'pin',num:5},{suit:'pin',num:5}], answer: true, fb: '3色とも7-8-9の順子！三色同順だよ。' },
          { tiles: [{suit:'man',num:3},{suit:'man',num:4},{suit:'man',num:5},{suit:'man',num:3},{suit:'man',num:4},{suit:'man',num:5},{suit:'pin',num:6},{suit:'pin',num:7},{suit:'pin',num:8},{suit:'sou',num:1},{suit:'sou',num:2},{suit:'sou',num:3},{suit:'sou',num:9},{suit:'sou',num:9}], answer: false, fb: 'これは萬子だけで同じ順子2組（一盃口）！三色同順は3種類の牌で数字をそろえる役だから違うよ。' },
        ],
      },
      {
        type: 'yn',
        title: 'ミニゲーム⑥　三色同刻になる？',
        instruction: '表示の手牌は<strong>三色同刻</strong>（萬・筒・索で同じ数字の刻子）になっている？',
        yesLabel: '○ 三色同刻', noLabel: '✕ ちがう',
        passNeeded: 5,
        questions: [
          { tiles: [{suit:'man',num:5},{suit:'man',num:5},{suit:'man',num:5},{suit:'pin',num:5},{suit:'pin',num:5},{suit:'pin',num:5},{suit:'sou',num:5},{suit:'sou',num:5},{suit:'sou',num:5},{suit:'man',num:1},{suit:'man',num:2},{suit:'man',num:3},{suit:'pin',num:8},{suit:'pin',num:8}], answer: true, fb: '萬・筒・索すべてに5の刻子！三色同刻だよ。' },
          { tiles: [{suit:'man',num:5},{suit:'man',num:5},{suit:'man',num:5},{suit:'pin',num:6},{suit:'pin',num:6},{suit:'pin',num:6},{suit:'sou',num:5},{suit:'sou',num:5},{suit:'sou',num:5},{suit:'man',num:1},{suit:'man',num:2},{suit:'man',num:3},{suit:'pin',num:8},{suit:'pin',num:8}], answer: false, fb: '筒子だけ6の刻子で数字が違う！3色とも同じ数字でないとダメ。' },
          { tiles: [{suit:'man',num:7},{suit:'man',num:7},{suit:'man',num:7},{suit:'pin',num:7},{suit:'pin',num:7},{suit:'pin',num:7},{suit:'sou',num:7},{suit:'sou',num:7},{suit:'sou',num:7},{suit:'man',num:2},{suit:'man',num:3},{suit:'man',num:4},{suit:'sou',num:9},{suit:'sou',num:9}], answer: true, fb: '3色とも7の刻子！三色同刻だよ。' },
          { tiles: [{suit:'man',num:3},{suit:'man',num:3},{suit:'man',num:3},{suit:'pin',num:3},{suit:'pin',num:3},{suit:'pin',num:3},{suit:'sou',num:4},{suit:'sou',num:5},{suit:'sou',num:6},{suit:'man',num:7},{suit:'man',num:8},{suit:'man',num:9},{suit:'pin',num:2},{suit:'pin',num:2}], answer: false, fb: '索子だけ順子（刻子ではない）！3色とも「刻子」でそろえる必要がある。' },
          { tiles: [{suit:'man',num:9},{suit:'man',num:9},{suit:'man',num:9},{suit:'pin',num:9},{suit:'pin',num:9},{suit:'pin',num:9},{suit:'sou',num:9},{suit:'sou',num:9},{suit:'sou',num:9},{suit:'man',num:1},{suit:'man',num:2},{suit:'man',num:3},{suit:'pin',num:4},{suit:'pin',num:4}], answer: true, fb: '3色とも9の刻子！三色同刻だよ。' },
          { tiles: [{suit:'man',num:4},{suit:'man',num:5},{suit:'man',num:6},{suit:'pin',num:4},{suit:'pin',num:5},{suit:'pin',num:6},{suit:'sou',num:4},{suit:'sou',num:5},{suit:'sou',num:6},{suit:'man',num:1},{suit:'man',num:2},{suit:'man',num:3},{suit:'pin',num:9},{suit:'pin',num:9}], answer: false, fb: 'これは順子が3色そろっている（三色同順）！三色同刻は「刻子」でそろえる役だから違うよ。' },
        ],
      },
      {
        type: 'yn',
        title: 'ミニゲーム⑦　三暗刻になる？',
        instruction: '<strong>ツモ</strong>で和了した場合、この手牌には暗刻（自分でツモって作った刻子）が<strong>3つ</strong>ある？',
        yesLabel: '○ 3つある', noLabel: '✕ ちがう',
        passNeeded: 5,
        questions: [
          { tiles: [{suit:'man',num:3},{suit:'man',num:3},{suit:'man',num:3},{suit:'pin',num:5},{suit:'pin',num:5},{suit:'pin',num:5},{suit:'sou',num:7},{suit:'sou',num:7},{suit:'sou',num:7},{suit:'man',num:1},{suit:'man',num:2},{suit:'man',num:3},{suit:'pin',num:8},{suit:'pin',num:8}], answer: true, fb: '刻子が3つ（萬・筒・索）＋順子1つ＋頭！ツモ和了なので3つとも暗刻、三暗刻成立。' },
          { tiles: [{suit:'man',num:3},{suit:'man',num:3},{suit:'man',num:3},{suit:'pin',num:5},{suit:'pin',num:5},{suit:'pin',num:5},{suit:'sou',num:4},{suit:'sou',num:5},{suit:'sou',num:6},{suit:'sou',num:7},{suit:'sou',num:8},{suit:'sou',num:9},{suit:'pin',num:8},{suit:'pin',num:8}], answer: false, fb: '刻子は2つだけ（残りは順子2つ）。三暗刻には刻子が3つ必要。' },
          { tiles: [{suit:'man',num:2},{suit:'man',num:2},{suit:'man',num:2},{suit:'pin',num:6},{suit:'pin',num:6},{suit:'pin',num:6},{suit:'sou',num:4},{suit:'sou',num:4},{suit:'sou',num:4},{suit:'man',num:7},{suit:'man',num:8},{suit:'man',num:9},{suit:'pin',num:1},{suit:'pin',num:1}], answer: true, fb: '刻子が3つ！ツモ和了なので三暗刻が成立するよ。' },
          { tiles: [{suit:'man',num:3},{suit:'man',num:3},{suit:'man',num:3},{suit:'pin',num:4},{suit:'pin',num:5},{suit:'pin',num:6},{suit:'sou',num:7},{suit:'sou',num:8},{suit:'sou',num:9},{suit:'man',num:1},{suit:'man',num:2},{suit:'man',num:3},{suit:'pin',num:8},{suit:'pin',num:8}], answer: false, fb: '刻子は1つだけ！残りは全部順子だから三暗刻にならない。' },
          { tiles: [{suit:'man',num:5},{suit:'man',num:5},{suit:'man',num:5},{suit:'pin',num:2},{suit:'pin',num:2},{suit:'pin',num:2},{suit:'sou',num:8},{suit:'sou',num:8},{suit:'sou',num:8},{suit:'man',num:4},{suit:'man',num:5},{suit:'man',num:6},{suit:'pin',num:9},{suit:'pin',num:9}], answer: true, fb: '刻子が3つ！三暗刻だよ。' },
          { tiles: [{suit:'man',num:1},{suit:'man',num:2},{suit:'man',num:3},{suit:'pin',num:4},{suit:'pin',num:5},{suit:'pin',num:6},{suit:'sou',num:7},{suit:'sou',num:8},{suit:'sou',num:9},{suit:'man',num:2},{suit:'man',num:3},{suit:'man',num:4},{suit:'pin',num:9},{suit:'pin',num:9}], answer: false, fb: '刻子が0！全部順子だから三暗刻にはならない。' },
        ],
      },
      {
        type: 'yn',
        title: 'ミニゲーム⑧　混全帯幺九になる？',
        instruction: '表示の手牌は<strong>混全帯幺九</strong>（すべての面子・頭に1・9・字牌が入っている）になっている？',
        yesLabel: '○ 混全帯幺九', noLabel: '✕ ちがう',
        passNeeded: 5,
        questions: [
          { tiles: [{suit:'man',num:1},{suit:'man',num:2},{suit:'man',num:3},{suit:'pin',num:7},{suit:'pin',num:8},{suit:'pin',num:9},{suit:'sou',num:1},{suit:'sou',num:2},{suit:'sou',num:3},{suit:'wind',num:1},{suit:'wind',num:1},{suit:'wind',num:1},{suit:'man',num:9},{suit:'man',num:9}], answer: true, fb: '全部の面子・頭に1・9・東（字牌）が入っている！混全帯幺九だよ。' },
          { tiles: [{suit:'man',num:1},{suit:'man',num:2},{suit:'man',num:3},{suit:'pin',num:7},{suit:'pin',num:8},{suit:'pin',num:9},{suit:'sou',num:4},{suit:'sou',num:5},{suit:'sou',num:6},{suit:'wind',num:1},{suit:'wind',num:1},{suit:'wind',num:1},{suit:'man',num:9},{suit:'man',num:9}], answer: false, fb: '索子の4-5-6には1も9も字牌も入っていない！1つでも欠けるとNG。' },
          { tiles: [{suit:'man',num:7},{suit:'man',num:8},{suit:'man',num:9},{suit:'pin',num:1},{suit:'pin',num:2},{suit:'pin',num:3},{suit:'sou',num:7},{suit:'sou',num:8},{suit:'sou',num:9},{suit:'dragon',num:2},{suit:'dragon',num:2},{suit:'dragon',num:2},{suit:'pin',num:1},{suit:'pin',num:1}], answer: true, fb: '發（字牌）の刻子も含めて、全部の面子・頭に1・9・字牌！混全帯幺九だよ。' },
          { tiles: [{suit:'man',num:1},{suit:'man',num:2},{suit:'man',num:3},{suit:'pin',num:7},{suit:'pin',num:8},{suit:'pin',num:9},{suit:'sou',num:1},{suit:'sou',num:2},{suit:'sou',num:3},{suit:'wind',num:1},{suit:'wind',num:1},{suit:'wind',num:1},{suit:'man',num:5},{suit:'man',num:5}], answer: false, fb: '頭（5萬5萬）に1・9・字牌が入っていない！頭も条件を満たす必要がある。' },
          { tiles: [{suit:'man',num:1},{suit:'man',num:1},{suit:'man',num:1},{suit:'pin',num:9},{suit:'pin',num:9},{suit:'pin',num:9},{suit:'sou',num:1},{suit:'sou',num:2},{suit:'sou',num:3},{suit:'man',num:7},{suit:'man',num:8},{suit:'man',num:9},{suit:'dragon',num:3},{suit:'dragon',num:3}], answer: true, fb: '全部の面子・頭に1・9・中（字牌）！混全帯幺九だよ。' },
          { tiles: [{suit:'man',num:4},{suit:'man',num:5},{suit:'man',num:6},{suit:'pin',num:4},{suit:'pin',num:5},{suit:'pin',num:6},{suit:'sou',num:4},{suit:'sou',num:5},{suit:'sou',num:6},{suit:'man',num:2},{suit:'man',num:3},{suit:'man',num:4},{suit:'pin',num:5},{suit:'pin',num:5}], answer: false, fb: 'どの面子・頭にも1・9・字牌が入っていない！これは混全帯幺九にならない。' },
        ],
      },
      {
        type: 'yn',
        title: 'ミニゲーム⑨　小三元になる？',
        instruction: '表示の手牌は<strong>小三元</strong>（白・發・中のうち2つが刻子、残り1つが頭）になっている？',
        yesLabel: '○ 小三元', noLabel: '✕ ちがう',
        passNeeded: 5,
        questions: [
          { tiles: [{suit:'man',num:1},{suit:'man',num:2},{suit:'man',num:3},{suit:'dragon',num:1},{suit:'dragon',num:1},{suit:'dragon',num:1},{suit:'dragon',num:2},{suit:'dragon',num:2},{suit:'dragon',num:2},{suit:'pin',num:4},{suit:'pin',num:5},{suit:'pin',num:6},{suit:'dragon',num:3},{suit:'dragon',num:3}], answer: true, fb: '白・發が刻子、中が頭！小三元だよ。' },
          { tiles: [{suit:'dragon',num:1},{suit:'dragon',num:1},{suit:'dragon',num:1},{suit:'dragon',num:2},{suit:'dragon',num:2},{suit:'dragon',num:2},{suit:'dragon',num:3},{suit:'dragon',num:3},{suit:'dragon',num:3},{suit:'man',num:4},{suit:'man',num:5},{suit:'man',num:6},{suit:'pin',num:7},{suit:'pin',num:7}], answer: false, fb: '白・發・中が全部刻子だと大三元（役満）！小三元は2つ刻子＋1つ頭だよ。' },
          { tiles: [{suit:'man',num:2},{suit:'man',num:3},{suit:'man',num:4},{suit:'dragon',num:2},{suit:'dragon',num:2},{suit:'dragon',num:2},{suit:'dragon',num:3},{suit:'dragon',num:3},{suit:'dragon',num:3},{suit:'pin',num:7},{suit:'pin',num:8},{suit:'pin',num:9},{suit:'dragon',num:1},{suit:'dragon',num:1}], answer: true, fb: '發・中が刻子、白が頭！小三元だよ。' },
          { tiles: [{suit:'dragon',num:1},{suit:'dragon',num:1},{suit:'dragon',num:1},{suit:'man',num:4},{suit:'man',num:5},{suit:'man',num:6},{suit:'pin',num:7},{suit:'pin',num:8},{suit:'pin',num:9},{suit:'sou',num:1},{suit:'sou',num:2},{suit:'sou',num:3},{suit:'pin',num:9},{suit:'pin',num:9}], answer: false, fb: '三元牌の刻子が1つだけ！小三元には刻子2つ＋頭1つが必要。' },
          { tiles: [{suit:'dragon',num:1},{suit:'dragon',num:1},{suit:'dragon',num:1},{suit:'dragon',num:3},{suit:'dragon',num:3},{suit:'dragon',num:3},{suit:'man',num:2},{suit:'man',num:3},{suit:'man',num:4},{suit:'pin',num:5},{suit:'pin',num:6},{suit:'pin',num:7},{suit:'dragon',num:2},{suit:'dragon',num:2}], answer: true, fb: '白・中が刻子、發が頭！小三元だよ。' },
          { tiles: [{suit:'dragon',num:1},{suit:'dragon',num:1},{suit:'dragon',num:1},{suit:'dragon',num:2},{suit:'dragon',num:2},{suit:'dragon',num:2},{suit:'man',num:4},{suit:'man',num:5},{suit:'man',num:6},{suit:'pin',num:7},{suit:'pin',num:8},{suit:'pin',num:9},{suit:'sou',num:9},{suit:'sou',num:9}], answer: false, fb: '頭（9索9索）が三元牌ではない！小三元は残り1つの三元牌が頭になる必要がある。' },
        ],
      },
      {
        type: 'choice',
        title: 'ミニゲーム⑩　中級役を当てよう',
        instruction: '説明に合う役を選ぼう！',
        passNeeded: 6,
        questions: [
          { text: '同じ種類・同じ数字の順子が2組ある門前役は？', choices: ['一盃口','七対子','対々和','三色同順'], answer: '一盃口', fb: '一盃口（イーペーコー）！例：2・3・4萬を2組。門前のみ。' },
          { text: '7種類の対子（2枚ペア）だけで作る役は？', choices: ['一盃口','七対子','対々和','三色同順'], answer: '七対子', fb: '七対子（チートイツ）！2翻・門前のみ。' },
          { text: 'すべての面子が刻子（同じ3枚）で順子がない役は？', choices: ['一盃口','七対子','対々和','三色同順'], answer: '対々和', fb: '対々和（トイトイ）！鳴いてもOK。' },
          { text: '萬子・筒子・索子で同じ数字の順子を1組ずつ作る役は？', choices: ['一盃口','七対子','対々和','三色同順'], answer: '三色同順', fb: '三色同順（サンショクドウジュン）！例：3・4・5を3種類で。' },
          { text: '同じ数字の刻子を萬子・筒子・索子の3色すべてで作る役は？', choices: ['三色同刻','三色同順','対々和','一気通貫'], answer: '三色同刻', fb: '三色同刻（サンショクドウコウ）！例：5萬・5筒・5索の刻子。2翻。' },
          { text: '同じ種類の牌で1〜9まですべて（123-456-789）をそろえる役は？', choices: ['一気通貫','清一色','三色同順','混全帯幺九'], answer: '一気通貫', fb: '一気通貫（イッツウ）！門前2翻・鳴き1翻。' },
          { text: '暗刻（鳴かずに揃えた刻子）を3つ作る役は？', choices: ['三暗刻','対々和','三槓子','三色同刻'], answer: '三暗刻', fb: '三暗刻（サンアンコウ）！2翻。ロンで完成した面子は暗刻扱いにならないので注意。' },
          { text: 'すべての面子と頭に、么九牌（1・9・字牌）が1つ以上入る役は？', choices: ['混全帯幺九','清一色','対々和','七対子'], answer: '混全帯幺九', fb: '混全帯幺九（チャンタ）！門前2翻・鳴き1翻。' },
          { text: '白・發・中のうち2種類の刻子と、残り1種類の対子（頭）で作る役は？', choices: ['小三元','大三元','役牌','対々和'], answer: '小三元', fb: '小三元（ショウサンゲン）！2翻＋役牌2つ分で、合計4翻になることが多い。' },
        ],
      },
      {
        type: 'choice',
        title: 'ミニゲーム⑪　この役は何？',
        instruction: '完成した手牌を見て、成立している<strong>役</strong>を当てよう！',
        passNeeded: 7,
        questions: [
          { tiles: [{suit:'man',num:2},{suit:'man',num:3},{suit:'man',num:4},{suit:'man',num:2},{suit:'man',num:3},{suit:'man',num:4},{suit:'pin',num:5},{suit:'pin',num:6},{suit:'pin',num:7},{suit:'sou',num:1},{suit:'sou',num:2},{suit:'sou',num:3},{suit:'pin',num:9},{suit:'pin',num:9}], choices: ['一盃口','三色同順','対々和','七対子'], answer: '一盃口', fb: '2-3-4萬が2セット！同じ順子2組＝一盃口。' },
          { tiles: [{suit:'man',num:1},{suit:'man',num:1},{suit:'man',num:3},{suit:'man',num:3},{suit:'pin',num:5},{suit:'pin',num:5},{suit:'pin',num:7},{suit:'pin',num:7},{suit:'sou',num:2},{suit:'sou',num:2},{suit:'sou',num:4},{suit:'sou',num:4},{suit:'wind',num:1},{suit:'wind',num:1}], choices: ['七対子','対々和','一盃口','混老頭'], answer: '七対子', fb: '7種類全部ちがうペア！七対子だね。' },
          { tiles: [{suit:'man',num:3},{suit:'man',num:3},{suit:'man',num:3},{suit:'pin',num:5},{suit:'pin',num:5},{suit:'pin',num:5},{suit:'sou',num:7},{suit:'sou',num:7},{suit:'sou',num:7},{suit:'wind',num:2},{suit:'wind',num:2},{suit:'wind',num:2},{suit:'dragon',num:1},{suit:'dragon',num:1}], choices: ['対々和','三暗刻','七対子','小三元'], answer: '対々和', fb: '全部刻子＋頭で順子なし！対々和。' },
          { tiles: [{suit:'man',num:2},{suit:'man',num:3},{suit:'man',num:4},{suit:'pin',num:2},{suit:'pin',num:3},{suit:'pin',num:4},{suit:'sou',num:2},{suit:'sou',num:3},{suit:'sou',num:4},{suit:'man',num:7},{suit:'man',num:8},{suit:'man',num:9},{suit:'pin',num:6},{suit:'pin',num:6}], choices: ['三色同順','三色同刻','一気通貫','一盃口'], answer: '三色同順', fb: '萬・筒・索で2-3-4の順子がそれぞれ1つずつ！三色同順。' },
          { tiles: [{suit:'man',num:5},{suit:'man',num:5},{suit:'man',num:5},{suit:'pin',num:5},{suit:'pin',num:5},{suit:'pin',num:5},{suit:'sou',num:5},{suit:'sou',num:5},{suit:'sou',num:5},{suit:'man',num:1},{suit:'man',num:2},{suit:'man',num:3},{suit:'pin',num:8},{suit:'pin',num:8}], choices: ['三色同刻','三色同順','対々和','小三元'], answer: '三色同刻', fb: '萬・筒・索で5の刻子がそれぞれ1つずつ！三色同刻。' },
          { tiles: [{suit:'man',num:1},{suit:'man',num:2},{suit:'man',num:3},{suit:'man',num:4},{suit:'man',num:5},{suit:'man',num:6},{suit:'man',num:7},{suit:'man',num:8},{suit:'man',num:9},{suit:'pin',num:3},{suit:'pin',num:4},{suit:'pin',num:5},{suit:'sou',num:6},{suit:'sou',num:6}], choices: ['一気通貫','清一色','三色同順','混全帯幺九'], answer: '一気通貫', fb: '萬子で1〜9がすべてそろっている！一気通貫。' },
          { tiles: [{suit:'man',num:3},{suit:'man',num:3},{suit:'man',num:3},{suit:'pin',num:5},{suit:'pin',num:5},{suit:'pin',num:5},{suit:'sou',num:7},{suit:'sou',num:7},{suit:'sou',num:7},{suit:'man',num:1},{suit:'man',num:2},{suit:'man',num:3},{suit:'pin',num:8},{suit:'pin',num:8}], choices: ['三暗刻','対々和','三色同刻','三槓子'], answer: '三暗刻', fb: '暗刻（自分でツモった刻子）が3つ！三暗刻。' },
          { tiles: [{suit:'man',num:1},{suit:'man',num:2},{suit:'man',num:3},{suit:'pin',num:7},{suit:'pin',num:8},{suit:'pin',num:9},{suit:'sou',num:1},{suit:'sou',num:2},{suit:'sou',num:3},{suit:'wind',num:1},{suit:'wind',num:1},{suit:'wind',num:1},{suit:'man',num:9},{suit:'man',num:9}], choices: ['混全帯幺九','純全帯幺九','清一色','対々和'], answer: '混全帯幺九', fb: 'すべての面子・頭に1・9・字牌が入っている！混全帯幺九。' },
          { tiles: [{suit:'man',num:1},{suit:'man',num:2},{suit:'man',num:3},{suit:'dragon',num:1},{suit:'dragon',num:1},{suit:'dragon',num:1},{suit:'dragon',num:2},{suit:'dragon',num:2},{suit:'dragon',num:2},{suit:'pin',num:4},{suit:'pin',num:5},{suit:'pin',num:6},{suit:'dragon',num:3},{suit:'dragon',num:3}], choices: ['小三元','役牌','対々和','混老頭'], answer: '小三元', fb: '白・發が刻子、中が頭！小三元。' },
        ],
      },
    ],
  };

  // ===== Chapter 11: 上級者向けの役（清一色・二盃口・三槓子） =====
  const ch11 = {
    mgs: [
      {
        type: 'yn',
        title: 'ミニゲーム①　清一色になる？',
        instruction: '手牌が<strong>清一色</strong>（1種類の数牌だけ・字牌もなし）になっている？',
        yesLabel: '○ 清一色', noLabel: '✕ ちがう',
        passNeeded: 3,
        questions: [
          { tiles: [{suit:'man',num:1},{suit:'man',num:2},{suit:'man',num:3},{suit:'man',num:4},{suit:'man',num:5},{suit:'man',num:6},{suit:'man',num:7},{suit:'man',num:8},{suit:'man',num:9},{suit:'man',num:1},{suit:'man',num:1},{suit:'man',num:9},{suit:'man',num:9},{suit:'man',num:9}], answer: true, fb: '全部萬子だけ！清一色（チンイツ）だよ。' },
          { tiles: [{suit:'man',num:1},{suit:'man',num:2},{suit:'man',num:3},{suit:'man',num:4},{suit:'man',num:5},{suit:'man',num:6},{suit:'man',num:7},{suit:'man',num:8},{suit:'man',num:9},{suit:'pin',num:1},{suit:'pin',num:1},{suit:'man',num:9},{suit:'man',num:9},{suit:'man',num:9}], answer: false, fb: '筒子が混じっている！清一色は1種類の数牌だけ。' },
          { tiles: [{suit:'pin',num:1},{suit:'pin',num:2},{suit:'pin',num:3},{suit:'pin',num:4},{suit:'pin',num:5},{suit:'pin',num:6},{suit:'pin',num:7},{suit:'pin',num:8},{suit:'pin',num:9},{suit:'pin',num:5},{suit:'pin',num:5},{suit:'pin',num:1},{suit:'pin',num:1},{suit:'pin',num:1}], answer: true, fb: '全部筒子だけ！これも清一色。' },
          { tiles: [{suit:'sou',num:1},{suit:'sou',num:2},{suit:'sou',num:3},{suit:'sou',num:4},{suit:'sou',num:5},{suit:'sou',num:6},{suit:'sou',num:7},{suit:'sou',num:8},{suit:'sou',num:9},{suit:'sou',num:5},{suit:'sou',num:5},{suit:'dragon',num:1},{suit:'dragon',num:1},{suit:'dragon',num:1}], answer: false, fb: '字牌（白）が混じると清一色じゃない（それは混一色）。' },
        ],
      },
      {
        type: 'yn',
        title: 'ミニゲーム②　混一色になる？',
        instruction: '手牌が<strong>混一色</strong>（1種類の数牌＋字牌）になっている？',
        yesLabel: '○ 混一色', noLabel: '✕ ちがう',
        passNeeded: 5,
        questions: [
          { tiles: [{suit:'man',num:1},{suit:'man',num:2},{suit:'man',num:3},{suit:'man',num:4},{suit:'man',num:5},{suit:'man',num:6},{suit:'man',num:7},{suit:'man',num:8},{suit:'man',num:9},{suit:'wind',num:1},{suit:'wind',num:1},{suit:'wind',num:1},{suit:'man',num:5},{suit:'man',num:5}], answer: true, fb: '萬子と東（字牌）だけ！混一色だよ。' },
          { tiles: [{suit:'man',num:1},{suit:'man',num:2},{suit:'man',num:3},{suit:'pin',num:4},{suit:'pin',num:5},{suit:'pin',num:6},{suit:'man',num:7},{suit:'man',num:8},{suit:'man',num:9},{suit:'wind',num:1},{suit:'wind',num:1},{suit:'wind',num:1},{suit:'man',num:5},{suit:'man',num:5}], answer: false, fb: '萬子と筒子、2種類の数牌が混ざっている！混一色は数牌1種類＋字牌だよ。' },
          { tiles: [{suit:'pin',num:1},{suit:'pin',num:2},{suit:'pin',num:3},{suit:'pin',num:4},{suit:'pin',num:5},{suit:'pin',num:6},{suit:'pin',num:7},{suit:'pin',num:8},{suit:'pin',num:9},{suit:'dragon',num:3},{suit:'dragon',num:3},{suit:'dragon',num:3},{suit:'pin',num:5},{suit:'pin',num:5}], answer: true, fb: '筒子と中（字牌）だけ！混一色だよ。' },
          { tiles: [{suit:'sou',num:1},{suit:'sou',num:2},{suit:'sou',num:3},{suit:'sou',num:4},{suit:'sou',num:5},{suit:'sou',num:6},{suit:'sou',num:7},{suit:'sou',num:8},{suit:'sou',num:9},{suit:'sou',num:2},{suit:'sou',num:3},{suit:'sou',num:4},{suit:'sou',num:9},{suit:'sou',num:9}], answer: false, fb: '字牌が1枚も入っていない！これは清一色で、混一色ではないよ。' },
          { tiles: [{suit:'sou',num:1},{suit:'sou',num:2},{suit:'sou',num:3},{suit:'sou',num:4},{suit:'sou',num:5},{suit:'sou',num:6},{suit:'sou',num:7},{suit:'sou',num:8},{suit:'sou',num:9},{suit:'dragon',num:1},{suit:'dragon',num:1},{suit:'dragon',num:1},{suit:'sou',num:5},{suit:'sou',num:5}], answer: true, fb: '索子と白（字牌）だけ！混一色だよ。' },
          { tiles: [{suit:'man',num:1},{suit:'man',num:2},{suit:'man',num:3},{suit:'pin',num:4},{suit:'pin',num:5},{suit:'pin',num:6},{suit:'sou',num:7},{suit:'sou',num:8},{suit:'sou',num:9},{suit:'wind',num:1},{suit:'wind',num:1},{suit:'wind',num:1},{suit:'man',num:5},{suit:'man',num:5}], answer: false, fb: '萬・筒・索が全部混ざっている！混一色は数牌1種類だけに絞る必要がある。' },
        ],
      },
      {
        type: 'yn',
        title: 'ミニゲーム③　二盃口になる？',
        instruction: '表示の手牌（鳴きなし）は<strong>二盃口</strong>（同じ順子2組のセットが2つ）になっている？',
        yesLabel: '○ 二盃口', noLabel: '✕ ちがう',
        passNeeded: 5,
        questions: [
          { tiles: [{suit:'man',num:1},{suit:'man',num:2},{suit:'man',num:3},{suit:'man',num:1},{suit:'man',num:2},{suit:'man',num:3},{suit:'pin',num:4},{suit:'pin',num:5},{suit:'pin',num:6},{suit:'pin',num:4},{suit:'pin',num:5},{suit:'pin',num:6},{suit:'sou',num:8},{suit:'sou',num:8}], answer: true, fb: '1-2-3萬が2組、4-5-6筒が2組！一盃口が2セット＝二盃口だよ。' },
          { tiles: [{suit:'man',num:1},{suit:'man',num:2},{suit:'man',num:3},{suit:'man',num:1},{suit:'man',num:2},{suit:'man',num:3},{suit:'pin',num:4},{suit:'pin',num:5},{suit:'pin',num:6},{suit:'sou',num:7},{suit:'sou',num:8},{suit:'sou',num:9},{suit:'sou',num:2},{suit:'sou',num:2}], answer: false, fb: '一盃口のセットが1組だけ！二盃口には2組必要（それだけなら一盃口）。' },
          { tiles: [{suit:'sou',num:2},{suit:'sou',num:3},{suit:'sou',num:4},{suit:'sou',num:2},{suit:'sou',num:3},{suit:'sou',num:4},{suit:'man',num:5},{suit:'man',num:6},{suit:'man',num:7},{suit:'man',num:5},{suit:'man',num:6},{suit:'man',num:7},{suit:'pin',num:9},{suit:'pin',num:9}], answer: true, fb: '2-3-4索が2組、5-6-7萬が2組！二盃口だよ。' },
          { tiles: [{suit:'man',num:1},{suit:'man',num:2},{suit:'man',num:3},{suit:'pin',num:4},{suit:'pin',num:5},{suit:'pin',num:6},{suit:'sou',num:7},{suit:'sou',num:8},{suit:'sou',num:9},{suit:'man',num:2},{suit:'man',num:3},{suit:'man',num:4},{suit:'pin',num:9},{suit:'pin',num:9}], answer: false, fb: '同じ順子の組が1つもない！二盃口にならない。' },
          { tiles: [{suit:'pin',num:1},{suit:'pin',num:2},{suit:'pin',num:3},{suit:'pin',num:1},{suit:'pin',num:2},{suit:'pin',num:3},{suit:'sou',num:6},{suit:'sou',num:7},{suit:'sou',num:8},{suit:'sou',num:6},{suit:'sou',num:7},{suit:'sou',num:8},{suit:'man',num:4},{suit:'man',num:4}], answer: true, fb: '1-2-3筒が2組、6-7-8索が2組！二盃口だよ。' },
          { tiles: [{suit:'pin',num:3},{suit:'pin',num:3},{suit:'pin',num:3},{suit:'sou',num:6},{suit:'sou',num:6},{suit:'sou',num:6},{suit:'man',num:1},{suit:'man',num:2},{suit:'man',num:3},{suit:'pin',num:7},{suit:'pin',num:8},{suit:'pin',num:9},{suit:'man',num:4},{suit:'man',num:4}], answer: false, fb: '同じ牌が並んでいるのは刻子2つ！二盃口は「順子」の組が2つ必要だよ。' },
        ],
      },
      {
        type: 'yn',
        title: 'ミニゲーム④　三槓子になる？',
        instruction: '表示の手牌は<strong>三槓子</strong>（槓子＝同じ牌4枚の組が3つ）になっている？',
        yesLabel: '○ 三槓子', noLabel: '✕ ちがう',
        passNeeded: 4,
        questions: [
          { tiles: [{suit:'man',num:5},{suit:'man',num:5},{suit:'man',num:5},{suit:'man',num:5},{suit:'pin',num:3},{suit:'pin',num:3},{suit:'pin',num:3},{suit:'pin',num:3},{suit:'sou',num:9},{suit:'sou',num:9},{suit:'sou',num:9},{suit:'sou',num:9},{suit:'man',num:7},{suit:'man',num:7}], answer: true, fb: '4枚組（槓子）が3つ！三槓子だよ。' },
          { tiles: [{suit:'man',num:5},{suit:'man',num:5},{suit:'man',num:5},{suit:'man',num:5},{suit:'pin',num:3},{suit:'pin',num:3},{suit:'pin',num:3},{suit:'pin',num:3},{suit:'sou',num:7},{suit:'sou',num:8},{suit:'sou',num:9},{suit:'man',num:1},{suit:'man',num:2},{suit:'man',num:3}], answer: false, fb: '4枚組（槓子）は2つだけ！三槓子には3つ必要。' },
          { tiles: [{suit:'man',num:1},{suit:'man',num:1},{suit:'man',num:1},{suit:'man',num:1},{suit:'pin',num:6},{suit:'pin',num:6},{suit:'pin',num:6},{suit:'pin',num:6},{suit:'sou',num:2},{suit:'sou',num:2},{suit:'sou',num:2},{suit:'sou',num:2},{suit:'pin',num:9},{suit:'pin',num:9}], answer: true, fb: '槓子が3つ！三槓子だよ。' },
          { tiles: [{suit:'man',num:5},{suit:'man',num:5},{suit:'man',num:5},{suit:'man',num:5},{suit:'pin',num:3},{suit:'pin',num:3},{suit:'pin',num:3},{suit:'sou',num:7},{suit:'sou',num:8},{suit:'sou',num:9},{suit:'man',num:1},{suit:'man',num:2},{suit:'man',num:3},{suit:'man',num:7},{suit:'man',num:7}], answer: false, fb: '4枚組は1つだけ！三槓子には3つ必要。' },
          { tiles: [{suit:'man',num:5},{suit:'man',num:5},{suit:'man',num:5},{suit:'pin',num:3},{suit:'pin',num:3},{suit:'pin',num:3},{suit:'sou',num:9},{suit:'sou',num:9},{suit:'sou',num:9},{suit:'man',num:1},{suit:'man',num:2},{suit:'man',num:3},{suit:'man',num:7},{suit:'man',num:7}], answer: false, fb: 'これは全部刻子（3枚組）で対々和！槓子（4枚組）は1つもない。' },
          { tiles: [{suit:'man',num:2},{suit:'man',num:2},{suit:'man',num:2},{suit:'man',num:2},{suit:'pin',num:7},{suit:'pin',num:7},{suit:'pin',num:7},{suit:'pin',num:7},{suit:'sou',num:4},{suit:'sou',num:4},{suit:'sou',num:4},{suit:'sou',num:4},{suit:'man',num:1},{suit:'man',num:1}], answer: true, fb: '槓子が3つ！三槓子だよ。' },
        ],
      },
      {
        type: 'yn',
        title: 'ミニゲーム⑤　純全帯幺九になる？',
        instruction: '表示の手牌は<strong>純全帯幺九</strong>（すべての面子・頭に1・9が入っていて、字牌は使わない）になっている？',
        yesLabel: '○ 純全帯幺九', noLabel: '✕ ちがう',
        passNeeded: 5,
        questions: [
          { tiles: [{suit:'man',num:1},{suit:'man',num:2},{suit:'man',num:3},{suit:'pin',num:7},{suit:'pin',num:8},{suit:'pin',num:9},{suit:'sou',num:1},{suit:'sou',num:2},{suit:'sou',num:3},{suit:'man',num:7},{suit:'man',num:8},{suit:'man',num:9},{suit:'pin',num:1},{suit:'pin',num:1}], answer: true, fb: '全部の面子・頭に1か9が入っていて字牌なし！純全帯幺九だよ。' },
          { tiles: [{suit:'man',num:1},{suit:'man',num:2},{suit:'man',num:3},{suit:'pin',num:7},{suit:'pin',num:8},{suit:'pin',num:9},{suit:'sou',num:1},{suit:'sou',num:2},{suit:'sou',num:3},{suit:'wind',num:1},{suit:'wind',num:1},{suit:'wind',num:1},{suit:'pin',num:1},{suit:'pin',num:1}], answer: false, fb: '東（字牌）が入っている！字牌が混じると混全帯幺九になり、純全帯幺九ではない。' },
          { tiles: [{suit:'man',num:7},{suit:'man',num:8},{suit:'man',num:9},{suit:'pin',num:1},{suit:'pin',num:2},{suit:'pin',num:3},{suit:'sou',num:7},{suit:'sou',num:8},{suit:'sou',num:9},{suit:'man',num:1},{suit:'man',num:2},{suit:'man',num:3},{suit:'sou',num:9},{suit:'sou',num:9}], answer: true, fb: '全部の面子・頭に1か9！字牌もなし。純全帯幺九だよ。' },
          { tiles: [{suit:'man',num:1},{suit:'man',num:2},{suit:'man',num:3},{suit:'pin',num:4},{suit:'pin',num:5},{suit:'pin',num:6},{suit:'sou',num:1},{suit:'sou',num:2},{suit:'sou',num:3},{suit:'man',num:7},{suit:'man',num:8},{suit:'man',num:9},{suit:'pin',num:9},{suit:'pin',num:9}], answer: false, fb: '筒子の4-5-6には1も9も入っていない！1つでも欠けるとNG。' },
          { tiles: [{suit:'man',num:9},{suit:'man',num:9},{suit:'man',num:9},{suit:'pin',num:1},{suit:'pin',num:2},{suit:'pin',num:3},{suit:'sou',num:7},{suit:'sou',num:8},{suit:'sou',num:9},{suit:'man',num:1},{suit:'man',num:2},{suit:'man',num:3},{suit:'pin',num:7},{suit:'pin',num:7}], answer: false, fb: '面子は全部1か9を含むけど、頭が7筒。純全帯幺九は頭にも1か9が要るよ。' },
          { tiles: [{suit:'man',num:1},{suit:'man',num:2},{suit:'man',num:3},{suit:'pin',num:7},{suit:'pin',num:8},{suit:'pin',num:9},{suit:'sou',num:1},{suit:'sou',num:2},{suit:'sou',num:3},{suit:'man',num:7},{suit:'man',num:8},{suit:'man',num:9},{suit:'pin',num:5},{suit:'pin',num:5}], answer: false, fb: '頭（5筒5筒）に1も9も入っていない！頭も条件を満たす必要がある。' },
        ],
      },
      {
        type: 'yn',
        title: 'ミニゲーム⑥　混老頭になる？',
        instruction: '表示の手牌は<strong>混老頭</strong>（1・9・字牌だけで作られている）になっている？',
        yesLabel: '○ 混老頭', noLabel: '✕ ちがう',
        passNeeded: 5,
        questions: [
          { tiles: [{suit:'man',num:1},{suit:'man',num:1},{suit:'man',num:1},{suit:'man',num:9},{suit:'man',num:9},{suit:'man',num:9},{suit:'pin',num:1},{suit:'pin',num:1},{suit:'pin',num:1},{suit:'wind',num:1},{suit:'wind',num:1},{suit:'wind',num:1},{suit:'sou',num:9},{suit:'sou',num:9}], answer: true, fb: '全部1・9・東（字牌）だけ！混老頭だよ。' },
          { tiles: [{suit:'man',num:1},{suit:'man',num:1},{suit:'man',num:1},{suit:'man',num:9},{suit:'man',num:9},{suit:'man',num:9},{suit:'pin',num:4},{suit:'pin',num:4},{suit:'pin',num:4},{suit:'wind',num:1},{suit:'wind',num:1},{suit:'wind',num:1},{suit:'sou',num:9},{suit:'sou',num:9}], answer: false, fb: '4筒4筒4筒は2〜8の牌！混老頭は1・9・字牌だけで作る役だよ。' },
          { tiles: [{suit:'pin',num:1},{suit:'pin',num:1},{suit:'pin',num:1},{suit:'pin',num:9},{suit:'pin',num:9},{suit:'pin',num:9},{suit:'sou',num:1},{suit:'sou',num:1},{suit:'sou',num:1},{suit:'dragon',num:2},{suit:'dragon',num:2},{suit:'dragon',num:2},{suit:'man',num:9},{suit:'man',num:9}], answer: true, fb: '全部1・9・發（字牌）だけ！混老頭だよ。' },
          { tiles: [{suit:'man',num:1},{suit:'man',num:1},{suit:'man',num:1},{suit:'man',num:9},{suit:'man',num:9},{suit:'man',num:9},{suit:'pin',num:1},{suit:'pin',num:1},{suit:'pin',num:1},{suit:'wind',num:1},{suit:'wind',num:1},{suit:'wind',num:1},{suit:'sou',num:5},{suit:'sou',num:5}], answer: false, fb: '頭（5索5索）が2〜8の牌！頭も1・9・字牌でないとダメ。' },
          { tiles: [{suit:'sou',num:9},{suit:'sou',num:9},{suit:'sou',num:9},{suit:'wind',num:1},{suit:'wind',num:1},{suit:'wind',num:1},{suit:'wind',num:2},{suit:'wind',num:2},{suit:'wind',num:2},{suit:'dragon',num:3},{suit:'dragon',num:3},{suit:'dragon',num:3},{suit:'man',num:1},{suit:'man',num:1}], answer: true, fb: '9索・東・南・中と1萬、全部1・9・字牌！混老頭だよ。' },
          { tiles: [{suit:'man',num:2},{suit:'man',num:2},{suit:'man',num:2},{suit:'pin',num:9},{suit:'pin',num:9},{suit:'pin',num:9},{suit:'sou',num:1},{suit:'sou',num:1},{suit:'sou',num:1},{suit:'wind',num:1},{suit:'wind',num:1},{suit:'wind',num:1},{suit:'man',num:9},{suit:'man',num:9}], answer: false, fb: '2萬2萬2萬は2〜8の牌！1つでも中張牌が混じるとNG。' },
        ],
      },
      {
        type: 'choice',
        title: 'ミニゲーム⑦　上級役を当てよう',
        instruction: '説明に合う役を選ぼう！',
        passNeeded: 5,
        questions: [
          { text: '1種類の数牌だけ（字牌も無し）で作る6翻の役は？', choices: ['清一色','混一色','二盃口','三槓子'], answer: '清一色', fb: '清一色（チンイツ）！門前6翻・鳴き5翻。' },
          { text: '1種類の数牌＋字牌で作る役（鳴き2翻）は？', choices: ['清一色','混一色','二盃口','三槓子'], answer: '混一色', fb: '混一色（ホンイツ）！清一色との違いは字牌を使う点。' },
          { text: '一盃口（同じ順子2組）が2セットある門前役は？', choices: ['清一色','混一色','二盃口','三槓子'], answer: '二盃口', fb: '二盃口（リャンペーコー）！3翻・門前のみ。' },
          { text: 'カン（槓子）を3回作る役は？', choices: ['清一色','混一色','二盃口','三槓子'], answer: '三槓子', fb: '三槓子（サンカンツ）！カンを3つ作る役。' },
          { text: '么九牌（1・9のみ、字牌は含まない）だけで全ての面子と頭を作る役は？', choices: ['純全帯幺九','混全帯幺九','清一色','混老頭'], answer: '純全帯幺九', fb: '純全帯幺九（ジュンチャン）！字牌はNG、1・9の数牌のみで面子・頭を作る。門前3翻・鳴き2翻。' },
          { text: '1・9の数牌と字牌だけ（順子なし）で作る役は？', choices: ['混老頭','純全帯幺九','対々和','清一色'], answer: '混老頭', fb: '混老頭（ホンロウトウ）！2翻。対々和や七対子と組み合わさることが多い。' },
        ],
      },
      {
        type: 'choice',
        title: 'ミニゲーム⑧　翻数を当てよう',
        instruction: '役の翻数を答えよう！（門前のとき）',
        passNeeded: 4,
        questions: [
          { text: '清一色は門前で何翻？', choices: ['3翻','5翻','6翻','役満'], answer: '6翻', fb: '門前の清一色は6翻！鳴くと5翻。' },
          { text: '混一色は門前で何翻？', choices: ['2翻','3翻','6翻','役満'], answer: '3翻', fb: '門前の混一色は3翻！鳴くと2翻。' },
          { text: '二盃口は何翻？', choices: ['2翻','3翻','6翻','役満'], answer: '3翻', fb: '二盃口は3翻・門前のみ。' },
          { text: '国士無双は何翻相当？', choices: ['6翻','三倍満','役満','跳満'], answer: '役満', fb: '国士無双は役満！13種の么九牌を集める。' },
          { text: '純全帯幺九は門前で何翻？', choices: ['2翻','3翻','6翻','役満'], answer: '3翻', fb: '門前の純全帯幺九は3翻！鳴くと2翻。' },
          { text: '混老頭は何翻？', choices: ['1翻','2翻','3翻','役満'], answer: '2翻', fb: '混老頭は2翻！対々和や七対子との複合でさらに翻数が増えることが多い。' },
        ],
      },
      {
        type: 'choice',
        title: 'ミニゲーム⑨　この役は何？',
        instruction: '完成した手牌を見て、成立している<strong>役</strong>を当てよう！',
        passNeeded: 4,
        questions: [
          { tiles: [{suit:'man',num:2},{suit:'man',num:3},{suit:'man',num:4},{suit:'man',num:5},{suit:'man',num:6},{suit:'man',num:7},{suit:'man',num:3},{suit:'man',num:4},{suit:'man',num:5},{suit:'man',num:7},{suit:'man',num:8},{suit:'man',num:9},{suit:'man',num:6},{suit:'man',num:6}], choices: ['清一色','混一色','一気通貫','純全帯幺九'], answer: '清一色', fb: '萬子だけで全部そろっている（字牌なし）！1〜9の3連続（一気通貫）にはなっていない点にも注目、清一色。' },
          { tiles: [{suit:'man',num:1},{suit:'man',num:2},{suit:'man',num:3},{suit:'man',num:4},{suit:'man',num:5},{suit:'man',num:6},{suit:'man',num:7},{suit:'man',num:8},{suit:'man',num:9},{suit:'wind',num:1},{suit:'wind',num:1},{suit:'wind',num:1},{suit:'man',num:5},{suit:'man',num:5}], choices: ['混一色','清一色','混老頭','混全帯幺九'], answer: '混一色', fb: '萬子＋字牌（東）で作られている！混一色。' },
          { tiles: [{suit:'man',num:1},{suit:'man',num:2},{suit:'man',num:3},{suit:'man',num:1},{suit:'man',num:2},{suit:'man',num:3},{suit:'pin',num:4},{suit:'pin',num:5},{suit:'pin',num:6},{suit:'pin',num:4},{suit:'pin',num:5},{suit:'pin',num:6},{suit:'sou',num:8},{suit:'sou',num:8}], choices: ['二盃口','一盃口','対々和','清一色'], answer: '二盃口', fb: '同じ順子2組のセット（一盃口）が2つ！二盃口。' },
          { tiles: [{suit:'man',num:5},{suit:'man',num:5},{suit:'man',num:5},{suit:'man',num:5},{suit:'pin',num:3},{suit:'pin',num:3},{suit:'pin',num:3},{suit:'pin',num:3},{suit:'sou',num:9},{suit:'sou',num:9},{suit:'sou',num:9},{suit:'sou',num:9},{suit:'man',num:7},{suit:'man',num:7}], choices: ['三槓子','対々和','三暗刻','三色同刻'], answer: '三槓子', fb: '槓子（カンで作った4枚組）が3つ！三槓子。' },
          { tiles: [{suit:'man',num:1},{suit:'man',num:2},{suit:'man',num:3},{suit:'pin',num:7},{suit:'pin',num:8},{suit:'pin',num:9},{suit:'sou',num:1},{suit:'sou',num:2},{suit:'sou',num:3},{suit:'man',num:7},{suit:'man',num:8},{suit:'man',num:9},{suit:'pin',num:1},{suit:'pin',num:1}], choices: ['純全帯幺九','混全帯幺九','清一色','対々和'], answer: '純全帯幺九', fb: 'すべての面子・頭に1・9が入っていて、字牌はなし！純全帯幺九。' },
          { tiles: [{suit:'man',num:1},{suit:'man',num:1},{suit:'man',num:1},{suit:'man',num:9},{suit:'man',num:9},{suit:'man',num:9},{suit:'pin',num:1},{suit:'pin',num:1},{suit:'pin',num:1},{suit:'wind',num:1},{suit:'wind',num:1},{suit:'wind',num:1},{suit:'sou',num:9},{suit:'sou',num:9}], choices: ['混老頭','混一色','対々和','清一色'], answer: '混老頭', fb: '1・9・字牌だけで作られている！混老頭。' },
        ],
      },
    ],
  };

  // ===== Chapter 12: 三人麻雀入門（北抜き・3人対局・三麻ルール） =====
  const ch12 = {
    mgs: [
      {
        type: 'yn',
        title: 'ミニゲーム①　三麻ルール○✕',
        instruction: '三人麻雀（三麻）のルール、合っている？',
        yesLabel: '○ 正しい', noLabel: '✕ まちがい',
        passNeeded: 4,
        questions: [
          { text: '三麻では萬子の2〜8を使わない（1萬と9萬は使う）。', answer: true, fb: '正しい！三麻は萬子の2〜8を抜く。1萬・9萬と筒子・索子・字牌は全部使うよ。' },
          { text: '三麻は4人で対局する。', answer: false, fb: 'まちがい！三麻は3人で対局するよ。' },
          { text: '三麻では「北」を抜きドラとして使えるルールが多い。', answer: true, fb: '正しい！抜いた北はドラ扱い（北抜き）になるルールが一般的。' },
          { text: '三麻ではチー（順子の鳴き）が基本できない。', answer: true, fb: '正しい！三麻はチーなし、ポン・カンはOKというルールが多い。' },
          { text: '三麻には親がいない。', answer: false, fb: 'まちがい！三麻にも親（東家）はいるよ。' },
        ],
      },
      {
        type: 'choice',
        title: 'ミニゲーム②　三麻の知識',
        instruction: '三麻について正しいものを選ぼう！',
        passNeeded: 3,
        questions: [
          { text: '三麻で使わない牌はどれ？', choices: ['萬子の2〜8','筒子全部','索子全部','字牌全部'], answer: '萬子の2〜8', fb: '三麻は萬子の2〜8を抜く。1萬と9萬は残るよ。' },
          { text: '抜いた「北」は何になる？', choices: ['ドラ（北抜き）','役満','罰符','使えない'], answer: 'ドラ（北抜き）', fb: '北抜き＝抜いた北がドラになるルールが一般的。' },
          { text: '三麻で基本できない鳴きは？', choices: ['チー','ポン','カン','リーチ'], answer: 'チー', fb: 'チーは基本なし。ポン・カンはできるよ。' },
          { text: '三麻の対局人数は？', choices: ['2人','3人','4人','5人'], answer: '3人', fb: '三人麻雀だから3人！' },
        ],
      },
    ],
  };

  return { ch1, ch2, ch3, ch4, ch5, ch6, ch7, ch8, ch9, ch10, ch11, ch12, HONOR_NAMES, COLOR_NAMES, SUIT_LABELS };
})();
