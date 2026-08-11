'use strict';

const Tiles = (() => {
  const WIND_NAMES = ['東', '南', '西', '北'];
  const WIND_READINGS = ['トン', 'ナン', 'シャー', 'ペー'];
  const DRAGON_NAMES = ['白', '發', '中'];
  const SUIT_SUFFIX = { man: '萬', pin: '筒', sou: '索' };
  const NUM_KANJI = ['一','二','三','四','五','六','七','八','九'];
  const SPRITE = {
    url: '/static/img/mahjong-tiles.png',
    sheetW: 1448,
    sheetH: 1086,
    displayW: 52,
    displayH: 71.443,
    smallW: 40,
    smallH: 54.953,
    rects: {
      east: { x: 77, y: 115, w: 133, h: 181 },
      south: { x: 245, y: 115, w: 132, h: 181 },
      west: { x: 408, y: 115, w: 133, h: 182 },
      north: { x: 574, y: 115, w: 131, h: 181 },
      haku: { x: 739, y: 115, w: 137, h: 181 },
      hatsu: { x: 916, y: 115, w: 136, h: 181 },
      chun: { x: 1091, y: 115, w: 136, h: 181 },
      man1: { x: 46, y: 328, w: 131, h: 184 },
      man2: { x: 197, y: 328, w: 130, h: 184 },
      man3: { x: 348, y: 329, w: 133, h: 184 },
      man4: { x: 499, y: 329, w: 131, h: 184 },
      man5: { x: 648, y: 329, w: 132, h: 184 },
      man6: { x: 799, y: 329, w: 133, h: 184 },
      man7: { x: 953, y: 329, w: 134, h: 184 },
      man8: { x: 1109, y: 329, w: 154, h: 184 },
      man9: { x: 1291, y: 330, w: 133, h: 183 },
      pin1: { x: 46, y: 548, w: 136, h: 189 },
      pin2: { x: 198, y: 549, w: 129, h: 188 },
      pin3: { x: 349, y: 549, w: 132, h: 188 },
      pin4: { x: 499, y: 549, w: 130, h: 187 },
      pin5: { x: 648, y: 549, w: 131, h: 187 },
      pin6: { x: 799, y: 549, w: 134, h: 187 },
      pin7: { x: 955, y: 549, w: 140, h: 188 },
      pin8: { x: 1119, y: 549, w: 138, h: 188 },
      pin9: { x: 1284, y: 549, w: 140, h: 188 },
      sou1: { x: 46, y: 770, w: 135, h: 194 },
      sou2: { x: 202, y: 771, w: 125, h: 194 },
      sou3: { x: 350, y: 771, w: 128, h: 194 },
      sou4: { x: 499, y: 771, w: 132, h: 194 },
      sou5: { x: 648, y: 771, w: 131, h: 194 },
      sou6: { x: 799, y: 771, w: 135, h: 194 },
      sou7: { x: 956, y: 771, w: 136, h: 194 },
      sou8: { x: 1118, y: 771, w: 140, h: 194 },
      sou9: { x: 1284, y: 771, w: 140, h: 195 },
    },
  };

  let _idSeq = 0;

  function make(suit, num) {
    return { suit, num, id: `${suit}${num}_${_idSeq++}` };
  }

  function makeNum(num) {
    return { suit: 'num', num, id: `num${num}_${_idSeq++}` };
  }

  function makeColored(color, num) {
    return { suit: 'colored', color, num, id: `${color}${num}_${_idSeq++}` };
  }

  function label(tile) {
    if (tile.suit === 'num') return String(tile.num);
    if (tile.suit === 'colored') return String(tile.num);
    if (tile.suit === 'wind') return WIND_NAMES[tile.num - 1];
    if (tile.suit === 'dragon') return DRAGON_NAMES[tile.num - 1];
    return `${tile.num}${SUIT_SUFFIX[tile.suit]}`;
  }

  function suitClass(tile) {
    if (tile.suit === 'num') return 'num-only';
    if (tile.suit === 'colored') return `colored ${tile.color}`;
    if (tile.suit === 'wind') return 'wind';
    if (tile.suit === 'dragon') {
      const cls = ['dragon-haku', 'dragon-hatsu', 'dragon-chun'][tile.num - 1];
      return cls;
    }
    return tile.suit;
  }

  function windReading(tile) {
    return tile && tile.suit === 'wind' ? WIND_READINGS[tile.num - 1] : '';
  }

  function suitSubLabel(tile) {
    if (tile.suit === 'colored') {
      const names = { red: '赤', blue: '青', green: '緑' };
      return names[tile.color] || '';
    }
    if (tile.suit === 'man' || tile.suit === 'pin' || tile.suit === 'sou') {
      return SUIT_SUFFIX[tile.suit];
    }
    return '';
  }

  function pipPattern(num) {
    const patterns = {
      1: [4],
      2: [0, 8],
      3: [0, 4, 8],
      4: [0, 2, 6, 8],
      5: [0, 2, 4, 6, 8],
      6: [0, 2, 3, 5, 6, 8],
      7: [0, 1, 2, 3, 5, 6, 8],
      8: [0, 1, 2, 3, 5, 6, 7, 8],
      9: [0, 1, 2, 3, 4, 5, 6, 7, 8],
    };
    return patterns[num] || [];
  }

  function pinFace(tile) {
    const active = new Set(pipPattern(tile.num));
    return `<span class="tile-corner">${tile.num}</span><div class="tile-pin-face">` +
      Array.from({ length: 9 }).map((_, i) => {
        const color = i === 4 ? 'red' : (i % 2 ? 'green' : 'blue');
        return `<span class="pin-cell">${active.has(i) ? `<span class="pin-dot ${color}"></span>` : ''}</span>`;
      }).join('') + '</div>';
  }

  function souFace(tile) {
    if (tile.num === 1) {
      return `<span class="tile-corner">${tile.num}</span><div class="tile-sou-one"><span></span><span></span><span></span></div>`;
    }
    const active = new Set(pipPattern(tile.num));
    return `<span class="tile-corner">${tile.num}</span><div class="tile-sou-face">` +
      Array.from({ length: 9 }).map((_, i) => {
        return `<span class="sou-cell">${active.has(i) ? '<span class="sou-stick"><i></i></span>' : ''}</span>`;
      }).join('') + '</div>';
  }

  function manFace(tile) {
    return `<span class="tile-corner">${tile.num}</span>
      <div class="tile-man-face"><span class="tile-man-num">${NUM_KANJI[tile.num - 1]}</span><span class="tile-man-suit">萬</span></div>`;
  }

  function honorFace(tile, mainLabel) {
    if (tile.suit === 'wind') {
      return `<span class="tile-reading">${windReading(tile)}</span><span class="tile-num">${mainLabel}</span>`;
    }
    return `<span class="tile-num">${mainLabel}</span>`;
  }

  function spritePosition(tile) {
    if (tile.suit === 'wind') return SPRITE.rects[['east', 'south', 'west', 'north'][tile.num - 1]];
    if (tile.suit === 'dragon') return SPRITE.rects[['haku', 'hatsu', 'chun'][tile.num - 1]];
    if (tile.suit === 'man') return SPRITE.rects['man' + tile.num];
    if (tile.suit === 'pin') return SPRITE.rects['pin' + tile.num];
    if (tile.suit === 'sou') return SPRITE.rects['sou' + tile.num];
    return null;
  }

  function spriteStyle(pos, small) {
    const boxW = small ? SPRITE.smallW : SPRITE.displayW;
    const boxH = small ? SPRITE.smallH : SPRITE.displayH;
    const scaleX = boxW / pos.w;
    const scaleY = boxH / pos.h;
    const px = n => `${Math.round(n)}px`;
    return [
      `width:${px(boxW)}`,
      `height:${px(boxH)}`,
      `background:url(${SPRITE.url}) no-repeat ${px(-pos.x * scaleX)} ${px(-pos.y * scaleY)}/${px(SPRITE.sheetW * scaleX)} ${px(SPRITE.sheetH * scaleY)}`,
    ].join(';');
  }

  function renderTile(tile, opts = {}) {
    const { selected = false, highlighted = false, faceDown = false, small = false, noHover = false, extraClass = '' } = opts;
    const classes = [
      'tile',
      suitClass(tile),
      selected ? 'selected' : '',
      highlighted ? 'highlighted' : '',
      faceDown ? 'face-down' : '',
      small ? 'sm' : '',
      noHover ? 'no-hover' : '',
      extraClass,
    ].filter(Boolean).join(' ');

    if (faceDown) {
      return `<div class="${classes}" data-id="${tile.id}">
        <span class="tile-shine"></span>
        <span class="tile-back-pattern"></span>
      </div>`;
    }

    const mainLabel = label(tile);
    const sub = suitSubLabel(tile);
    const sprite = spritePosition(tile);
    if (sprite) {
      return `<div class="${classes} sprite-tile" data-id="${tile.id}" data-suit="${tile.suit}" data-num="${tile.num}" style="${spriteStyle(sprite, small)}">
        ${tile.suit === 'wind' ? `<span class="tile-reading sprite-reading">${windReading(tile)}</span>` : ''}
      </div>`;
    }

    let face = '';
    if (tile.suit === 'man') face = manFace(tile);
    else if (tile.suit === 'pin') face = pinFace(tile);
    else if (tile.suit === 'sou') face = souFace(tile);
    else if (tile.suit === 'wind' || tile.suit === 'dragon') face = honorFace(tile, mainLabel);
    else face = `<span class="tile-num">${mainLabel}</span>${sub ? `<span class="tile-suit">${sub}</span>` : ''}`;

    return `<div class="${classes}" data-id="${tile.id}" data-suit="${tile.suit}" data-num="${tile.num}" ${tile.color ? `data-color="${tile.color}"` : ''}>
      <span class="tile-shine"></span>
      ${face}
    </div>`;
  }

  function renderRow(tiles, opts = {}) {
    return `<div class="tiles-row">${tiles.map(t => renderTile(t, opts)).join('')}</div>`;
  }

  function isSame(a, b) {
    if (a.suit !== b.suit) return false;
    if (a.num !== b.num) return false;
    if (a.suit === 'colored' && a.color !== b.color) return false;
    return true;
  }

  function isSequence(tiles) {
    if (tiles.length !== 3) return false;
    const suits = new Set(tiles.map(t => t.suit));
    if (suits.size !== 1) return false;
    const s = tiles[0].suit;
    if (s === 'wind' || s === 'dragon') return false;
    if (s === 'colored') {
      const colors = new Set(tiles.map(t => t.color));
      if (colors.size !== 1) return false;
    }
    const nums = tiles.map(t => t.num).sort((a, b) => a - b);
    return nums[1] === nums[0] + 1 && nums[2] === nums[0] + 2;
  }

  function isTriplet(tiles) {
    if (tiles.length !== 3) return false;
    return tiles.every(t => isSame(t, tiles[0]));
  }

  function isPair(tiles) {
    if (tiles.length !== 2) return false;
    return isSame(tiles[0], tiles[1]);
  }

  function isMeld(tiles) {
    return isSequence(tiles) || isTriplet(tiles);
  }

  function sortTiles(tiles) {
    const suitOrd = { man: 0, pin: 1, sou: 2, wind: 3, dragon: 4, num: 5, colored: 6 };
    const colorOrd = { red: 0, blue: 1, green: 2 };
    return [...tiles].sort((a, b) => {
      const so = (suitOrd[a.suit] || 0) - (suitOrd[b.suit] || 0);
      if (so !== 0) return so;
      if (a.suit === 'colored' && b.suit === 'colored') {
        const co = (colorOrd[a.color] || 0) - (colorOrd[b.color] || 0);
        if (co !== 0) return co;
      }
      return a.num - b.num;
    });
  }

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function makeFull() {
    const tiles = [];
    ['man', 'pin', 'sou'].forEach(suit => {
      for (let n = 1; n <= 9; n++)
        for (let k = 0; k < 4; k++) tiles.push(make(suit, n));
    });
    for (let n = 1; n <= 4; n++)
      for (let k = 0; k < 4; k++) tiles.push(make('wind', n));
    for (let n = 1; n <= 3; n++)
      for (let k = 0; k < 4; k++) tiles.push(make('dragon', n));
    return shuffle(tiles);
  }

  function makeSanmaFull() {
    const tiles = [];
    [1, 9].forEach(n => {
      for (let k = 0; k < 4; k++) tiles.push(make('man', n));
    });
    ['pin', 'sou'].forEach(suit => {
      for (let n = 1; n <= 9; n++)
        for (let k = 0; k < 4; k++) tiles.push(make(suit, n));
    });
    for (let n = 1; n <= 4; n++)
      for (let k = 0; k < 4; k++) tiles.push(make('wind', n));
    for (let n = 1; n <= 3; n++)
      for (let k = 0; k < 4; k++) tiles.push(make('dragon', n));
    return shuffle(tiles);
  }

  return { make, makeNum, makeColored, label, windReading, renderTile, renderRow, isSame, isSequence, isTriplet, isPair, isMeld, sortTiles, shuffle, makeFull, makeSanmaFull };
})();
