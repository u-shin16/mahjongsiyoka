'use strict';

/* ============================================================
   FriendGame: 友人戦（6桁ルームIDのオンライン対戦）
   ------------------------------------------------------------
   - Firestore の rooms/{ルームID} 1 ドキュメントで部屋を管理
   - 部屋を作った人（ホスト）の端末がゲーム進行役になる
   - ルールは CPU 戦（battle.js）の簡易対局に合わせる
     * 3人打ち / 4人打ち
     * ツモ・ロン・リーチ・ドラ・裏ドラ
     * 三麻の北抜き
     * ポン・チー・カン・暗カン
     * 東風戦（人数ぶんの局）
   ============================================================ */
var FriendGame = (function() {
  var _db = null;
  var _room = null;
  var _game = null;
  var _code = null;
  var _unsub = null;
  var _listeners = [];
  var _lastProcessedSeq = -1;
  var _lastError = null;
  var _heartbeatTimer = null;
  var _hostLoopTimer = null;

  // 役判定・点数計算の定数/共通ロジックは yaku.js の Yaku を使う
  // （BASE_SCORES/YAKUMAN_HAN/YAKUMAN_PTSはYaku側が正）
  var CPU_UID_PREFIX = 'cpu:';
  var HEARTBEAT_MS = 30000;
  var DISCONNECT_MS = 90000;
  var HOST_TICK_MS = 700;
  var FIRESTORE_TIMEOUT_MS = 8000;
  var _lastHeartbeatAt = 0;

  function defaultRules(playerCount) {
    playerCount = playerCount === 3 ? 3 : 4;
    return {
      playerCount: playerCount,
      gameType: 'tonpu',
      startScore: playerCount === 3 ? 35000 : 25000,
      suddenDeath: false,
      baseSeconds: 5,
      reserveSeconds: 20,
    };
  }

  function normalizeRules(rules, playerCount) {
    var base = defaultRules(playerCount);
    rules = rules || {};
    var n = rules.playerCount === 3 ? 3 : (rules.playerCount === 4 ? 4 : base.playerCount);
    var start = parseInt(rules.startScore, 10);
    var baseSec = parseInt(rules.baseSeconds, 10);
    var reserveSec = parseInt(rules.reserveSeconds, 10);
    return {
      playerCount: n,
      gameType: rules.gameType === 'hanchan' ? 'hanchan' : 'tonpu',
      startScore: isFinite(start) && start >= 10000 && start <= 60000 ? start : (n === 3 ? 35000 : 25000),
      suddenDeath: !!rules.suddenDeath,
      baseSeconds: isFinite(baseSec) && baseSec >= 3 && baseSec <= 15 ? baseSec : 5,
      reserveSeconds: isFinite(reserveSec) && reserveSec >= 0 && reserveSec <= 120 ? reserveSec : 20,
    };
  }

  function getRoundLimit(gameType, playerCount) {
    return (gameType === 'hanchan' ? 2 : 1) * playerCount;
  }

  function humanUids(players) {
    return (players || []).filter(function(p) { return !p.isCpu; }).map(function(p) { return p.uid; });
  }

  function isCpuPlayer(p) {
    return !!(p && (p.isCpu || String(p.uid || '').indexOf(CPU_UID_PREFIX) === 0));
  }

  function isCpuSeat(seat) {
    return !!(_room && _room.players && isCpuPlayer(_room.players[seat]));
  }

  function readyMapFor(players, oldMap) {
    var map = {};
    oldMap = oldMap || {};
    (players || []).forEach(function(p) {
      if (!isCpuPlayer(p)) map[p.uid] = !!oldMap[p.uid];
    });
    return map;
  }

  function allPlayersReady(room) {
    if (!room || room.status !== 'waiting') return false;
    var players = room.players || [];
    if (players.length !== room.playerCount) return false;
    var readyMap = room.readyMap || {};
    return players.every(function(p) { return isCpuPlayer(p) || readyMap[p.uid] === true; });
  }

  function randomRoomCode() {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  function db() {
    if (!_db) _db = firebase.firestore();
    return _db;
  }
  function ready() {
    return window.Auth && Auth.enabled() && Auth.user();
  }
  function me() { return Auth.user(); }
  function roomRef(code) { return db().collection('rooms').doc(code); }
  function withTimeout(promise, label) {
    var timer = null;
    return Promise.race([
      promise,
      new Promise(function(_, reject) {
        timer = setTimeout(function() {
          reject(new Error((label || 'Firestore通信') + 'がタイムアウトしました'));
        }, FIRESTORE_TIMEOUT_MS);
      })
    ]).then(function(v) {
      if (timer) clearTimeout(timer);
      return v;
    }, function(e) {
      if (timer) clearTimeout(timer);
      throw e;
    });
  }
  function _notify() {
    _listeners.forEach(function(cb) { try { cb(); } catch (e) {} });
  }

  function firestoreRestValue(value) {
    if (value === null || value === undefined) return { nullValue: null };
    if (value instanceof Date) return { timestampValue: value.toISOString() };
    if (Array.isArray(value)) {
      return {
        arrayValue: value.length ? {
          values: value.map(firestoreRestValue)
        } : {}
      };
    }
    if (typeof value === 'string') return { stringValue: value };
    if (typeof value === 'boolean') return { booleanValue: value };
    if (typeof value === 'number') {
      if (Math.floor(value) === value) return { integerValue: String(value) };
      return { doubleValue: value };
    }
    if (typeof value === 'object') {
      var fields = {};
      Object.keys(value).forEach(function(k) {
        fields[k] = firestoreRestValue(value[k]);
      });
      return { mapValue: { fields: fields } };
    }
    return { stringValue: String(value) };
  }

  function firestoreRestFields(data) {
    var fields = {};
    Object.keys(data || {}).forEach(function(k) {
      fields[k] = firestoreRestValue(data[k]);
    });
    return fields;
  }

  function restCreateRoom(candidate, data) {
    if (!window.fetch || typeof FIREBASE_CONFIG === 'undefined' || !FIREBASE_CONFIG.projectId) {
      return Promise.reject(new Error('Firestore RESTの接続設定が見つかりません'));
    }
    var current = firebase.auth().currentUser;
    if (!current) return Promise.reject(new Error('ログインしてからルームを作成してください'));
    var base = 'https://firestore.googleapis.com/v1/projects/' +
      encodeURIComponent(FIREBASE_CONFIG.projectId) +
      '/databases/(default)/documents/rooms/' + encodeURIComponent(candidate);
    if (FIREBASE_CONFIG.apiKey) base += '?key=' + encodeURIComponent(FIREBASE_CONFIG.apiKey);
    return current.getIdToken().then(function(token) {
      return withTimeout(fetch(base, {
        method: 'PATCH',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fields: firestoreRestFields(data) }),
      }), 'RESTルーム作成');
    }).then(function(res) {
      return res.text().then(function(text) {
        var body = null;
        try { body = text ? JSON.parse(text) : null; } catch (e) {}
        if (!res.ok) {
          var msg = body && body.error && body.error.message ? body.error.message : text;
          throw new Error(msg || ('RESTルーム作成に失敗しました（' + res.status + '）'));
        }
        return body;
      });
    });
  }

  function errorMessage(e) {
    var msg = String((e && e.message) || '');
    if ((e && e.code === 'permission-denied') || msg.indexOf('Missing or insufficient permissions') >= 0) {
      return 'Firestoreのルールで友人戦が許可されていません。Firebase Console の Firestore ルールに firestore.rules の内容を反映してください。';
    }
    if ((e && e.code === 'resource-exhausted') || msg.indexOf('Quota exceeded') >= 0) {
      return 'Firestoreの利用上限に達しています。しばらく待つか、Firebase ConsoleでFirestoreのクォータ/課金設定を確認してください。';
    }
    if (msg.indexOf('タイムアウト') >= 0) {
      return 'Firestoreへの通信がタイムアウトしました。ブラウザをリロードして再ログインし、まだ続く場合はFirebaseの接続設定を確認してください。';
    }
    return msg || '通信エラーが発生しました';
  }

  function parseGame(raw) {
    if (!raw) return null;
    try { return JSON.parse(raw); }
    catch (e) {
      console.warn('game parse error', e);
      return null;
    }
  }

  function normalizeCode(code) {
    return String(code || '').replace(/\D/g, '').slice(0, 6);
  }

  function validateCode(code) {
    if (!code) throw new Error('6桁のルームIDを入力してください');
    if (!/^\d{6}$/.test(code)) throw new Error('ルームIDは6桁の数字で入力してください');
  }

  function playerName(u) {
    return (u.displayName || u.email || 'プレイヤー').slice(0, 24);
  }

  function makeArray(n, value) {
    var arr = [];
    for (var i = 0; i < n; i++) arr.push(typeof value === 'function' ? value(i) : value);
    return arr;
  }

  function playerUidAt(room, seat) {
    return room && room.players && room.players[seat] ? room.players[seat].uid : null;
  }

  function _sendHeartbeat() {
    if (!_code || !me() || !_room) return;
    if ((_room.playerUids || []).indexOf(me().uid) < 0) return;
    var now = Date.now();
    if (now - _lastHeartbeatAt < HEARTBEAT_MS - 1000) return;
    _lastHeartbeatAt = now;
    var patch = {};
    patch['presence.' + me().uid] = now;
    roomRef(_code).update(patch)['catch'](function(e) {
      _lastError = e;
    });
  }

  function _startHeartbeat() {
    if (_heartbeatTimer) clearInterval(_heartbeatTimer);
    _sendHeartbeat();
    _heartbeatTimer = setInterval(_sendHeartbeat, HEARTBEAT_MS);
  }

  function _stopHeartbeat() {
    if (_heartbeatTimer) clearInterval(_heartbeatTimer);
    _heartbeatTimer = null;
  }

  function _syncHostLoop() {
    var shouldRun = !!(_room && me() && _room.hostUid === me().uid);
    if (shouldRun && !_hostLoopTimer) {
      _hostLoopTimer = setInterval(function() {
        if (_room && _game && _room.hostUid === me().uid) _hostProcess();
      }, HOST_TICK_MS);
    } else if (!shouldRun && _hostLoopTimer) {
      clearInterval(_hostLoopTimer);
      _hostLoopTimer = null;
    }
  }

  /* ---------- 部屋の購読 ---------- */
  function _subscribe(code) {
    _unsubscribe();
    _code = code;
    _startHeartbeat();
    _unsub = roomRef(code).onSnapshot(function(snap) {
      _lastError = null;
      if (!snap.exists) { _room = null; _game = null; _syncHostLoop(); _notify(); return; }
      _room = snap.data();
      _game = parseGame(_room.game);
      _syncHostLoop();
      if (_room.hostUid === me().uid) _hostProcess();
      _notify();
    }, function(e) {
      _lastError = e;
      console.warn('room listen error', e);
      _notify();
    });
  }

  function _unsubscribe() {
    if (_unsub) { _unsub(); _unsub = null; }
    _room = null;
    _game = null;
    _code = null;
    _lastProcessedSeq = -1;
    _lastHeartbeatAt = 0;
    _stopHeartbeat();
    _syncHostLoop();
  }

  /* ---------- 部屋を作る / 参加する / 退出 ---------- */
  function createRoom(code, playerCount) {
    var u = me();
    if (!u) return Promise.reject(new Error('ログインしてからルームを作成してください'));
    code = normalizeCode(code);
    playerCount = playerCount === 3 ? 3 : 4;
    var manualCode = !!code;
    if (manualCode && !/^\d{6}$/.test(code)) {
      return Promise.reject(new Error('ルームIDは6桁の数字で入力してください'));
    }

    function roomData(candidate, useRestTimestamp) {
      var rules = defaultRules(playerCount);
      var players = [{ uid: u.uid, name: playerName(u), isCpu: false }];
      return {
        code: candidate,
        hostUid: u.uid,
        playerCount: playerCount,
        rules: rules,
        readyMap: readyMapFor(players),
        presence: {},
        status: 'waiting',
        players: players,
        playerUids: [u.uid],
        game: null,
        action: null,
        version: 3,
        createdAt: useRestTimestamp ? new Date() : firebase.firestore.FieldValue.serverTimestamp(),
      };
    }

    function finishCreate(candidate) {
      var data = roomData(candidate, false);
      return withTimeout(roomRef(candidate).set(data), 'ルーム作成')
        .then(function() { _subscribe(candidate); })
        ['catch'](function(e) {
          if (String((e && e.message) || '').indexOf('タイムアウト') < 0) throw e;
          var restData = roomData(candidate, true);
          return restCreateRoom(candidate, restData).then(function() {
            _subscribe(candidate);
            _room = restData;
            _game = null;
            _notify();
          });
        });
    }

    function tryCreate(candidate, remain) {
      try { validateCode(candidate); }
      catch (e) { return Promise.reject(e); }
      if (!manualCode) return finishCreate(candidate);
      return withTimeout(roomRef(candidate).get(), 'ルーム確認').then(function(snap) {
        if (snap.exists) {
          var d = snap.data();
          if (d.status !== 'ended') {
            if (!manualCode && remain > 0) return tryCreate(randomRoomCode(), remain - 1);
            throw new Error('このルームIDの部屋はすでに使われています。別のIDにしてください');
          }
        }
        return finishCreate(candidate);
      });
    }

    return tryCreate(code || randomRoomCode(), 8);
  }

  function joinRoom(code) {
    var u = me();
    code = normalizeCode(code);
    validateCode(code);

    return db().runTransaction(function(tx) {
      return tx.get(roomRef(code)).then(function(snap) {
        if (!snap.exists) throw new Error('そのルームIDの部屋が見つかりません');
        var d = snap.data();
        d.players = d.players || [];
        d.playerUids = d.playerUids || humanUids(d.players);
        d.readyMap = d.readyMap || {};
        var already = d.players.some(function(p) { return p.uid === u.uid; });
        if (already) return;
        if (d.status !== 'waiting') throw new Error('この部屋はすでに対局中です');
        if (d.players.length >= d.playerCount) throw new Error('この部屋は満員です');
        d.players.push({ uid: u.uid, name: playerName(u), isCpu: false });
        d.playerUids.push(u.uid);
        d.readyMap[u.uid] = false;
        tx.update(roomRef(code), { players: d.players, playerUids: d.playerUids, readyMap: d.readyMap });
      });
    }).then(function() { _subscribe(code); });
  }

  function leaveRoom() {
    var u = me();
    var code = _code;
    var room = _room;
    _unsubscribe();
    _notify();

    if (!code || !room) return Promise.resolve();
    if (room.hostUid === u.uid && room.status !== 'playing') {
      return roomRef(code).delete()['catch'](function() {});
    }
    if (room.status === 'waiting') {
      var rest = (room.players || []).filter(function(p) { return p.uid !== u.uid; });
      var restReady = readyMapFor(rest, room.readyMap);
      return roomRef(code).update({ players: rest, playerUids: humanUids(rest), readyMap: restReady })['catch'](function() {});
    }
    return Promise.resolve();
  }

  function setReady(flag) {
    if (!_room || !_code || !me() || _room.status !== 'waiting') return Promise.resolve();
    var patch = {};
    patch['readyMap.' + me().uid] = !!flag;
    return roomRef(_code).update(patch);
  }

  function updateRules(patch) {
    if (!isHost() || !_room || _room.status !== 'waiting') return Promise.reject(new Error('ホストだけがルールを変更できます'));
    patch = patch || {};
    return db().runTransaction(function(tx) {
      return tx.get(roomRef(_code)).then(function(snap) {
        if (!snap.exists) throw new Error('部屋が見つかりません');
        var d = snap.data();
        if (d.status !== 'waiting') throw new Error('対局中はルールを変更できません');
        var players = d.players || [];
        var currentRules = normalizeRules(d.rules, d.playerCount);
        var nextRules = normalizeRules(Object.assign({}, currentRules, patch), patch.playerCount || d.playerCount);
        var humanCount = players.filter(function(p) { return !isCpuPlayer(p); }).length;
        if (humanCount > nextRules.playerCount) throw new Error('参加中の人数より少ない人数には変更できません');
        players = players.slice(0, nextRules.playerCount);
        tx.update(roomRef(_code), {
          playerCount: nextRules.playerCount,
          rules: nextRules,
          players: players,
          playerUids: humanUids(players),
          readyMap: readyMapFor(players),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
      });
    });
  }

  function addCpu() {
    if (!isHost() || !_room || _room.status !== 'waiting') return Promise.reject(new Error('ホストだけがCPUを追加できます'));
    return db().runTransaction(function(tx) {
      return tx.get(roomRef(_code)).then(function(snap) {
        if (!snap.exists) throw new Error('部屋が見つかりません');
        var d = snap.data();
        var players = d.players || [];
        if (d.status !== 'waiting') throw new Error('対局中はCPUを追加できません');
        if (players.length >= d.playerCount) throw new Error('空き席がありません');
        var seat = players.length;
        players.push({
          uid: CPU_UID_PREFIX + _code + ':' + seat + ':' + Date.now(),
          name: 'CPU' + ['東', '南', '西', '北'][seat],
          isCpu: true,
        });
        tx.update(roomRef(_code), {
          players: players,
          playerUids: humanUids(players),
          readyMap: readyMapFor(players, d.readyMap),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
      });
    });
  }

  function removeCpu(uid) {
    if (!isHost() || !_room || _room.status !== 'waiting') return Promise.reject(new Error('ホストだけがCPUを外せます'));
    return db().runTransaction(function(tx) {
      return tx.get(roomRef(_code)).then(function(snap) {
        if (!snap.exists) throw new Error('部屋が見つかりません');
        var d = snap.data();
        var players = (d.players || []).filter(function(p) { return !(p.uid === uid && isCpuPlayer(p)); });
        tx.update(roomRef(_code), {
          players: players,
          playerUids: humanUids(players),
          readyMap: readyMapFor(players, d.readyMap),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
      });
    });
  }

  /* ---------- 便利関数 ---------- */
  function mySeat() {
    if (!_room || !me()) return -1;
    var uid = me().uid;
    for (var i = 0; i < (_room.players || []).length; i++) {
      if (_room.players[i].uid === uid) return i;
    }
    return -1;
  }

  function isHost() {
    return !!(_room && me() && _room.hostUid === me().uid);
  }

  function isClosed(state, seat) {
    var melds = (state.melds && state.melds[seat]) || [];
    return melds.every(function(m) { return m.type === 'ankan'; });
  }

  // ドラ本体・一致数のカウントは yaku.js の Yaku に委譲（このアプリ全体で共通）
  function doraFromInd(ind) { return Yaku.doraFromIndicator(ind); }

  function sameKind(a, b) {
    return !!(a && b && a.suit === b.suit && a.num === b.num);
  }

  function countMatch(tiles, kind) { return Yaku.countMatch(tiles, kind); }

  function getScoringTiles(state, seat) {
    var tiles = (state.hands[seat] || []).slice();
    var melds = (state.melds && state.melds[seat]) || [];
    melds.forEach(function(m) {
      (m.tiles || []).forEach(function(t) { tiles.push(t); });
    });
    return tiles;
  }

  function getValidWaits(state, tiles13) {
    var waits = Agari.getTenpaiWaits(tiles13 || []);
    if (!state || !state.isSanma) return waits;
    return waits.filter(function(w) {
      return w.suit !== 'man' || w.num === 1 || w.num === 9;
    });
  }

  function isTenpai13(tiles13) {
    return getValidWaits(_game, tiles13).length > 0;
  }

  function isNukiTile(state, tile) {
    return !!(state && state.isSanma && tile && tile.suit === 'wind' && tile.num === 4);
  }

  function findNukiIdx(state, seat, tileId) {
    var hand = (state.hands && state.hands[seat]) || [];
    var fallback = -1;
    for (var i = 0; i < hand.length; i++) {
      if (!isNukiTile(state, hand[i])) continue;
      if (tileId && hand[i].id === tileId) return i;
      if (fallback < 0) fallback = i;
    }
    return fallback;
  }

  function checkAnkanCandidates(state, seat) {
    if (!state || state.phase !== 'turn' || state.riichi[seat]) return [];
    var hand = state.hands[seat] || [];
    var cnt = {};
    hand.forEach(function(t) {
      var k = t.suit + '_' + t.num;
      if (!cnt[k]) cnt[k] = { tile: t, arr: [] };
      cnt[k].arr.push(t);
    });
    var res = [];
    Object.keys(cnt).forEach(function(k) {
      if (cnt[k].arr.length >= 4) res.push({ type: 'ankan', tiles: cnt[k].arr.slice(0, 4) });
    });
    return res;
  }

  // 加槓（既存のポンに、手牌にある同じ牌を足してカンにする）候補
  function checkKakanCandidates(state, seat) {
    if (!state || state.phase !== 'turn' || state.turn !== seat) return [];
    var hand = state.hands[seat] || [];
    var melds = (state.melds[seat] || []).filter(function(m) { return m.type === 'pon'; });
    var res = [];
    melds.forEach(function(m) {
      var tile = hand.find(function(t) { return sameKind(t, m.tiles[0]); });
      if (tile) res.push({ type: 'kakan', tiles: [tile], meld: m });
    });
    return res;
  }

  function defaultAutoFlags(seat) {
    return {
      agari: isCpuSeat(seat),
      tsumogiri: isCpuSeat(seat),
      noCalls: isCpuSeat(seat),
    };
  }

  function ensureRuntimeArrays(state) {
    var n = state.playerCount || 4;
    state.rules = normalizeRules(state.rules, n);
    if (!state.autoFlags || state.autoFlags.length !== n) {
      state.autoFlags = makeArray(n, function(i) { return defaultAutoFlags(i); });
    }
    if (!state.timeBankMs || state.timeBankMs.length !== n) {
      state.timeBankMs = makeArray(n, state.rules.reserveSeconds * 1000);
    }
    if (!state.disconnected || state.disconnected.length !== n) {
      state.disconnected = makeArray(n, false);
    }
  }

  function getAutoFlags(state, seat) {
    ensureRuntimeArrays(state);
    return state.autoFlags[seat] || defaultAutoFlags(seat);
  }

  function seatDisconnected(state, seat) {
    return !!(state && state.disconnected && state.disconnected[seat]);
  }

  function shouldSkipReactions(state, seat) {
    var f = getAutoFlags(state, seat);
    return isCpuSeat(seat) || seatDisconnected(state, seat) || !!f.tsumogiri || !!f.noCalls || !!(state.riichi && state.riichi[seat]);
  }

  function shouldAutoAgari(state, seat) {
    var f = getAutoFlags(state, seat);
    return isCpuSeat(seat) || seatDisconnected(state, seat) || !!f.agari;
  }

  function _startTurnTimer(state, seat) {
    ensureRuntimeArrays(state);
    var now = Date.now();
    var baseMs = state.rules.baseSeconds * 1000;
    var reserveMs = Math.max(0, state.timeBankMs[seat] || 0);
    state.turnTimer = {
      seat: seat,
      phase: state.phase,
      startedAt: now,
      baseMs: baseMs,
      reserveMs: reserveMs,
      deadlineAt: now + baseMs + reserveMs,
      canAutoAt: now + (isCpuSeat(seat) ? 700 : 450),
    };
  }

  function _clearTurnTimer(state) {
    state.turnTimer = null;
  }

  function _consumeTurnTimer(state, seat) {
    ensureRuntimeArrays(state);
    var timer = state.turnTimer;
    if (!timer || timer.seat !== seat) return;
    var usedReserve = Math.max(0, Date.now() - timer.startedAt - timer.baseMs);
    state.timeBankMs[seat] = Math.max(0, timer.reserveMs - usedReserve);
    _clearTurnTimer(state);
  }

  function _findDrawnIdx(state, seat) {
    var hand = (state.hands && state.hands[seat]) || [];
    if (state.drawnId) {
      for (var i = 0; i < hand.length; i++) {
        if (hand[i].id === state.drawnId) return i;
      }
    }
    return hand.length - 1;
  }

  function _cpuChooseDiscard(state, seat) {
    var hand = state.hands[seat] || [];
    var drawn = _findDrawnIdx(state, seat);
    if (state.riichi && state.riichi[seat] && drawn >= 0) return drawn;
    var best = drawn >= 0 ? drawn : Math.max(0, hand.length - 1);
    var bestScore = -999;
    for (var i = 0; i < hand.length; i++) {
      var t = hand[i];
      var score = 0;
      if (t.suit === 'wind' || t.suit === 'dragon') score += 4;
      if (t.suit !== 'wind' && t.suit !== 'dragon' && (t.num === 1 || t.num === 9)) score += 2;
      if (state.drawnId && t.id === state.drawnId) score += 0.8;
      var same = countMatch(hand, t);
      if (same >= 2) score -= 3;
      var dora = doraFromInd(state.doraInd);
      if (sameKind(t, dora)) score -= 5;
      if (score > bestScore) { bestScore = score; best = i; }
    }
    return best;
  }

  /* ---------- ゲーム状態の生成（ホスト） ---------- */
  function _deal(state) {
    ensureRuntimeArrays(state);
    var wall = state.isSanma ? Tiles.makeSanmaFull() : Tiles.makeFull();
    var n = state.playerCount;
    state.hands = [];
    state.discards = [];
    for (var i = 0; i < n; i++) {
      state.hands.push(Tiles.sortTiles(wall.splice(0, 13)));
      state.discards.push([]);
    }
    state.doraInd = wall.pop();
    state.uraInd = wall.pop();
    state.kanDoraInds = [];
    state.wall = wall;
    state.riichi = makeArray(n, false);
    state.riichiWaits = makeArray(n, function() { return []; });
    state.timeBankMs = makeArray(n, state.rules.reserveSeconds * 1000);
    state.disconnected = makeArray(n, false);
    state.nuki = makeArray(n, function() { return []; });
    state.melds = makeArray(n, function() { return []; });
    state.turn = (state.round - 1) % n;
    state.phase = 'turn';
    state.drawnId = null;
    state.ippatsuActive = makeArray(n, false);
    state.riichiDouble = makeArray(n, false);
    state.rinshanPending = false;
    state.tempFuriten = makeArray(n, false);
    state.riichiFuriten = makeArray(n, false);
    state.result = null;
    state.ron = null;
    state.call = null;
    state.lastAutoAt = 0;
    _drawFor(state, state.turn);
  }

  function _drawFor(state, seat) {
    state.rinshanPending = false;
    if (state.wall.length === 0) {
      state.phase = 'hand_end';
      var deltas = state.scores.map(function() { return 0; });
      // 流し満貫：捨て牌が全部么九牌で、誰にも鳴かれていない席は満貫扱いで受け取る
      var nagashiSeats = [];
      for (var ns = 0; ns < state.playerCount; ns++) {
        var nDiscards = state.discards[ns] || [];
        if (nDiscards.length === 0) continue;
        if (!nDiscards.every(Yaku.isTerminalOrHonor)) continue;
        if (seatDiscardsWereCalled(state, ns)) continue;
        nagashiSeats.push(ns);
      }
      if (nagashiSeats.length > 0) {
        var nagashiPts = Yaku.BASE_SCORES[4]; // 満貫(5翻相当)＝8000点
        nagashiSeats.forEach(function(ns) {
          var each = Math.ceil(nagashiPts / (state.playerCount - 1) / 100) * 100;
          for (var k = 0; k < state.playerCount; k++) {
            if (k === ns) continue;
            deltas[k] -= each;
            deltas[ns] += each;
          }
        });
        for (var m = 0; m < state.playerCount; m++) state.scores[m] += deltas[m];
      }
      state.result = { type: 'ryukyoku', deltas: deltas, nagashiMangan: nagashiSeats };
      state.drawnId = null;
      _clearTurnTimer(state);
      return null;
    }
    var t = state.wall.pop();
    state.hands[seat].push(t);
    state.turn = seat;
    state.drawnId = t.id;
    state.phase = 'turn';
    _startTurnTimer(state, seat);
    return t;
  }

  function startGame() {
    if (!isHost() || !_room || (_room.players || []).length !== _room.playerCount) {
      return Promise.reject(new Error('メンバーが揃っていません'));
    }
    if (!allPlayersReady(_room)) {
      return Promise.reject(new Error('全員がReadyになるまで開始できません'));
    }
    var n = _room.playerCount;
    var rules = normalizeRules(_room.rules, n);
    var state = {
      seq: 0,
      playerCount: n,
      isSanma: n === 3,
      rules: rules,
      round: 1,
      roundLimit: getRoundLimit(rules.gameType, n),
      scores: makeArray(n, rules.startScore),
      autoFlags: makeArray(n, function(i) { return defaultAutoFlags(i); }),
      disconnected: makeArray(n, false),
      startedAt: Date.now(),
    };
    _deal(state);
    _lastProcessedSeq = -1;
    return roomRef(_code).update({ status: 'playing', game: JSON.stringify(state), action: null });
  }

  /* ---------- プレイヤーの操作送信 ---------- */
  function sendAction(type, payload) {
    if (!_game || !_code) return Promise.resolve();
    var a = { seq: _game.seq, seat: mySeat(), uid: me().uid, type: type, ts: Date.now() };
    if (payload) Object.keys(payload).forEach(function(k) { a[k] = payload[k]; });
    return roomRef(_code).update({ action: a });
  }

  /* ---------- ホスト側：操作の検証と反映 ---------- */
  function _publish(state) {
    state.seq++;
    return roomRef(_code).update({
      game: JSON.stringify(state),
      status: state.phase === 'match_end' ? 'ended' : 'playing',
    });
  }

  function addKanDora(state) {
    if (!state.kanDoraInds) state.kanDoraInds = [];
    if (state.wall.length > 1) state.kanDoraInds.push(state.wall.shift());
  }

  /* ---------- 役判定 ---------- */
  // 手牌の形に依存する役の判定・点数計算はyaku.jsのYakuに委譲（CPU戦と共通）。
  // ここに残すのはこのアプリのstate構造に固有の部分だけ。
  // 流し満貫用：この席の捨て牌が誰かに鳴かれていないか（鳴かれていたら流し満貫は不成立）
  function seatDiscardsWereCalled(state, seat) {
    for (var i = 0; i < state.playerCount; i++) {
      if (i === seat) continue;
      var melds = (state.melds && state.melds[i]) || [];
      for (var j = 0; j < melds.length; j++) {
        if (melds[j].fromPlayer === seat) return true;
      }
    }
    return false;
  }
  function seatWindNum(state, seat) {
    var dealerSeat = (state.round - 1) % state.playerCount;
    return ((seat - dealerSeat + state.playerCount) % state.playerCount) + 1;
  }
  function roundWindNum(state) {
    return state.round <= state.playerCount ? 1 : 2;
  }

  // 手牌の形に依存する役の判定は yaku.js の Yaku.computeShapeYaku に委譲する
  // （CPU戦のbattle.jsと共通）。ここでは自風・場風の回転など友人戦固有の
  // 計算だけをして、Yakuの引数形式に変換する薄いアダプターにする。
  function computeShapeYaku(state, winner, winType, fromSeat, winningTile) {
    var hand = state.hands[winner] || [];
    var openMelds = state.melds[winner] || [];
    return Yaku.computeShapeYaku(hand, openMelds, isClosed(state, winner), seatWindNum(state, winner), roundWindNum(state), winType, winningTile);
  }

  // ドラ・カンドラ・裏ドラ・抜き北を除いた「本当の役」の一覧を組み立てる。
  // アガリが確定する前の判定（役なしアガリの禁止）にも使うため、
  // state.result等に触れず、引数だけで動くようにしてある。
  function buildYakuBeforeDora(state, winner, winType, fromSeat, winningTile, isChankan) {
    var closed = isClosed(state, winner);
    var yaku = computeShapeYaku(state, winner, winType, fromSeat, winningTile);

    if (state.riichi[winner]) {
      if (state.riichiDouble && state.riichiDouble[winner]) yaku.push({ name: 'ダブルリーチ', han: 2 });
      else yaku.push({ name: '立直', han: 1 });
      if (state.ippatsuActive && state.ippatsuActive[winner]) yaku.push({ name: '一発', han: 1 });
    }
    if (winType === 'tsumo' && closed) yaku.push({ name: '門前清自摸和', han: 1 });
    if (isChankan) yaku.push({ name: '槍槓', han: 1 });
    if (winType === 'tsumo' && state.rinshanPending) yaku.push({ name: '嶺上開花', han: 1 });
    if (state.wall && state.wall.length === 0) {
      if (winType === 'tsumo') yaku.push({ name: '海底摸月', han: 1 });
      else yaku.push({ name: '河底撈魚', han: 1 });
    }

    // 天和・地和・人和：誰も鳴いておらず、自分がまだ一度も捨てていない状態での和了
    var dealerSeat = (state.round - 1) % state.playerCount;
    var noCallsYet = (state.melds || []).every(function(m) { return !m || m.length === 0; });
    var winnerHasNotDiscarded = (state.discards[winner] || []).length === 0;
    if (noCallsYet && winnerHasNotDiscarded) {
      var totalDiscards = (state.discards || []).reduce(function(a, d) { return a + (d ? d.length : 0); }, 0);
      if (winType === 'tsumo' && winner === dealerSeat) {
        yaku.push({ name: '天和', han: Yaku.YAKUMAN_HAN, yakuman: true });
      } else if (winType === 'tsumo') {
        yaku.push({ name: '地和', han: Yaku.YAKUMAN_HAN, yakuman: true });
      } else if (winType === 'ron' && winner !== dealerSeat && totalDiscards < state.playerCount) {
        yaku.push({ name: '人和', han: Yaku.YAKUMAN_HAN, yakuman: true });
      }
    }
    return yaku;
  }

  // 役なしアガリ禁止：ドラ以外に本当の役が1つも無ければロン・ツモは成立しない
  function hasYaku(state, winner, winType, fromSeat, winningTile, isChankan) {
    return buildYakuBeforeDora(state, winner, winType, fromSeat, winningTile, isChankan).length > 0;
  }

  // フリテン：以下のいずれかに該当する席はロン不可（ツモは可）
  // 1. 自分の捨て牌の中に、今の待ち牌が含まれている（永久）
  // 2. 同巡内に一度でも当たり牌の見逃しがあった（次の自分の打牌まで）
  // 3. リーチ後に当たり牌を見逃した（そのまま局が終わるまで）
  function isFuriten(state, seat) {
    ensureRuntimeArrays(state);
    if (state.riichiFuriten && state.riichiFuriten[seat]) return true;
    if (state.tempFuriten && state.tempFuriten[seat]) return true;
    var waits = getValidWaits(state, state.hands[seat] || []);
    return Yaku.isFuritenBySelf(waits, state.discards[seat]);
  }

  // 当たり牌の見逃し（ロンできたのにしなかった）をフリテンとして記録する
  function markMissedRon(state, seat) {
    if (!state.tempFuriten) state.tempFuriten = makeArray(state.playerCount, false);
    if (!state.riichiFuriten) state.riichiFuriten = makeArray(state.playerCount, false);
    if (state.riichi[seat]) state.riichiFuriten[seat] = true;
    else state.tempFuriten[seat] = true;
  }

  function _finishHand(state, winner, winType, fromSeat, winningTile, isChankan) {
    var hand = state.hands[winner];
    var scoringTiles = getScoringTiles(state, winner);
    var resolvedWinTile = winningTile || (winType === 'tsumo' ? hand.find(function(t) { return t.id === state.drawnId; }) : null);
    var yaku = buildYakuBeforeDora(state, winner, winType, fromSeat, resolvedWinTile, isChankan);

    var nuki = state.nuki && state.nuki[winner] ? state.nuki[winner].length : 0;
    var dora = countMatch(scoringTiles, doraFromInd(state.doraInd));
    var kanDora = 0;
    (state.kanDoraInds || []).forEach(function(ind) {
      kanDora += countMatch(scoringTiles, doraFromInd(ind));
    });
    var ura = 0;
    if (state.riichi[winner]) ura = countMatch(scoringTiles, doraFromInd(state.uraInd));

    if (yaku.length === 0) yaku.push({ name: '役あり', han: 1 });
    if (dora > 0) yaku.push({ name: 'ドラ', han: dora });
    if (kanDora > 0) yaku.push({ name: 'カンドラ', han: kanDora });
    if (ura > 0) yaku.push({ name: '裏ドラ', han: ura });
    if (nuki > 0) yaku.push({ name: '抜き北', han: nuki });

    var points = Yaku.calcPoints(yaku);
    var han = points.han;
    var pts = points.pts;
    var deltas = state.scores.map(function() { return 0; });
    if (winType === 'ron') {
      deltas[winner] += pts;
      deltas[fromSeat] -= pts;
    } else {
      var each = Math.ceil(pts / (state.playerCount - 1) / 100) * 100;
      for (var i = 0; i < state.playerCount; i++) {
        if (i === winner) continue;
        deltas[i] -= each;
        deltas[winner] += each;
      }
    }
    for (var j = 0; j < state.playerCount; j++) state.scores[j] += deltas[j];

    state.phase = 'hand_end';
    state.result = {
      type: winType,
      winner: winner,
      from: (fromSeat != null ? fromSeat : null),
      yaku: yaku,
      han: han,
      pts: pts,
      deltas: deltas,
      hand: Tiles.sortTiles(hand.slice()),
      melds: (state.melds && state.melds[winner]) || [],
      nuki: state.nuki[winner] || [],
      uraInd: state.riichi[winner] ? state.uraInd : null,
      kanDoraInds: state.kanDoraInds || [],
    };
    state.ron = null;
    state.call = null;
    state.drawnId = null;
    _clearTurnTimer(state);
  }

  function _nextTurn(state, seat) {
    _drawFor(state, (seat + 1) % state.playerCount);
  }

  function getCallOptions(state, seat, tile, fromSeat) {
    if (!state || !tile || state.riichi[seat] || shouldSkipReactions(state, seat)) return [];
    var hand = state.hands[seat] || [];
    var opts = [];
    var same = hand.filter(function(t) { return sameKind(t, tile); });

    if (same.length >= 2) {
      opts.push({ type: 'pon', tiles: same.slice(0, 2), calledTile: tile, fromPlayer: fromSeat });
    }
    if (same.length >= 3) {
      opts.push({ type: 'kan', tiles: same.slice(0, 3), calledTile: tile, fromPlayer: fromSeat });
    }

    var upstream = (seat - 1 + state.playerCount) % state.playerCount;
    if (!state.isSanma && fromSeat === upstream && tile.suit !== 'wind' && tile.suit !== 'dragon') {
      for (var offset = -2; offset <= 0; offset++) {
        var trio = [tile.num + offset, tile.num + offset + 1, tile.num + offset + 2];
        if (trio[0] < 1 || trio[2] > 9) continue;
        var need = trio.filter(function(n) { return n !== tile.num; });
        var usedIdxs = [];
        var ok = true;
        for (var ni = 0; ni < need.length; ni++) {
          var found = -1;
          for (var hi = 0; hi < hand.length; hi++) {
            if (usedIdxs.indexOf(hi) < 0 && hand[hi].suit === tile.suit && hand[hi].num === need[ni]) {
              found = hi;
              break;
            }
          }
          if (found < 0) { ok = false; break; }
          usedIdxs.push(found);
        }
        if (ok) {
          opts.push({
            type: 'chi',
            tiles: usedIdxs.map(function(i) { return hand[i]; }),
            calledTile: tile,
            fromPlayer: fromSeat,
          });
        }
      }
    }
    return opts;
  }

  function buildCallMap(state, fromSeat, tile) {
    var map = {};
    for (var i = 0; i < state.playerCount; i++) {
      if (i === fromSeat) continue;
      var opts = getCallOptions(state, i, tile, fromSeat);
      if (opts.length > 0) map[i] = opts;
    }
    return map;
  }

  function callCandidates(callMap) {
    return Object.keys(callMap || {}).map(function(k) { return parseInt(k, 10); });
  }

  function hasCallOptions(callMap) {
    return callCandidates(callMap).length > 0;
  }

  function _setCallWait(state, tile, fromSeat, callMap) {
    _clearTurnTimer(state);
    state.phase = 'call_wait';
    state.call = {
      tile: tile,
      from: fromSeat,
      optionsBySeat: callMap,
      candidates: callCandidates(callMap),
      responses: {},
    };
  }

  function _afterDiscard(state, seat, tile) {
    _clearTurnTimer(state);
    state.ron = null;
    state.call = null;

    var ronCandidates = [];
    for (var i = 0; i < state.playerCount; i++) {
      if (i === seat) continue;
      if (isFuriten(state, i)) continue;
      if (Agari.isWinningHand((state.hands[i] || []).concat([tile])) && hasYaku(state, i, 'ron', seat, tile)) ronCandidates.push(i);
    }
    var callMap = buildCallMap(state, seat, tile);

    if (ronCandidates.length > 0) {
      var autoWinner = ronCandidates.find(function(c) { return shouldAutoAgari(state, c); });
      if (autoWinner != null) {
        state.hands[autoWinner] = Tiles.sortTiles(state.hands[autoWinner].concat([tile]));
        _finishHand(state, autoWinner, 'ron', seat, tile);
        return;
      }
      state.phase = 'ron_wait';
      state.ron = {
        tile: tile,
        from: seat,
        candidates: ronCandidates,
        responses: {},
        callOptionsBySeat: callMap,
      };
      return;
    }

    if (hasCallOptions(callMap)) {
      _setCallWait(state, tile, seat, callMap);
      return;
    }

    _nextTurn(state, seat);
  }

  function removeTilesByIds(hand, tiles) {
    (tiles || []).forEach(function(u) {
      var idx = hand.findIndex(function(t) { return t.id === u.id; });
      if (idx >= 0) hand.splice(idx, 1);
    });
  }

  // 鳴かれた牌を、鳴かれた側の河から取り除く（鳴きは常に直前の捨て牌に対して行われる）
  function removeCalledDiscard(state, seat, tile) {
    var arr = state.discards[seat];
    if (!arr || !arr.length || !tile) return;
    var last = arr.length - 1;
    if (arr[last] && arr[last].id === tile.id) arr.splice(last, 1);
  }

  function _executeCall(state, seat, optionIdx, callType) {
    if (!state.call || state.call.candidates.indexOf(seat) < 0) return false;
    var opts = getCallOptions(state, seat, state.call.tile, state.call.from);
    var opt = opts[optionIdx];
    if (!opt || opt.type !== callType) return false;

    var hand = state.hands[seat];
    removeTilesByIds(hand, opt.tiles);

    var meldTiles = opt.tiles.concat([state.call.tile]);
    if (opt.type === 'chi') meldTiles = meldTiles.slice().sort(function(a, b) { return a.num - b.num; });
    state.melds[seat].push({
      type: opt.type,
      tiles: meldTiles,
      calledTile: state.call.tile,
      fromPlayer: state.call.from,
    });
    removeCalledDiscard(state, state.call.from, state.call.tile);

    state.turn = seat;
    state.drawnId = null;
    state.ron = null;
    state.call = null;
    // ポン・チー・カンは一発を消す（誰かの一発待ちが成立していれば解除）
    state.ippatsuActive = makeArray(state.playerCount, false);
    if (opt.type === 'kan') {
      addKanDora(state);
      _drawFor(state, seat);
      state.rinshanPending = true;
    } else {
      state.phase = 'naki_discard';
      _startTurnTimer(state, seat);
    }
    return true;
  }

  function _executeAnkan(state, seat, tileKind) {
    if (state.phase !== 'turn' || seat !== state.turn || state.riichi[seat]) return false;
    var cands = checkAnkanCandidates(state, seat);
    var cand = null;
    for (var i = 0; i < cands.length; i++) {
      if (sameKind(cands[i].tiles[0], tileKind)) { cand = cands[i]; break; }
    }
    if (!cand) return false;
    _consumeTurnTimer(state, seat);
    removeTilesByIds(state.hands[seat], cand.tiles);
    state.melds[seat].push({ type: 'ankan', tiles: cand.tiles, calledTile: null, fromPlayer: -1 });
    addKanDora(state);
    state.ippatsuActive = makeArray(state.playerCount, false);
    _drawFor(state, seat);
    state.rinshanPending = true;
    return true;
  }

  function _executeKakan(state, seat, tileKind) {
    if (state.phase !== 'turn' || seat !== state.turn) return false;
    var cands = checkKakanCandidates(state, seat);
    var cand = null;
    for (var i = 0; i < cands.length; i++) {
      if (sameKind(cands[i].tiles[0], tileKind)) { cand = cands[i]; break; }
    }
    if (!cand) return false;
    _consumeTurnTimer(state, seat);
    removeTilesByIds(state.hands[seat], cand.tiles);
    var addedTile = cand.tiles[0];
    cand.meld.type = 'kan';
    cand.meld.kakan = true;
    cand.meld.tiles = cand.meld.tiles.concat([addedTile]);
    state.ippatsuActive = makeArray(state.playerCount, false);

    // 槍槓：加槓した牌で他家がロンできないか確認
    var ronCandidates = [];
    for (var s = 0; s < state.playerCount; s++) {
      if (s === seat) continue;
      if (isFuriten(state, s)) continue;
      if (Agari.isWinningHand((state.hands[s] || []).concat([addedTile])) && hasYaku(state, s, 'ron', seat, addedTile, true)) ronCandidates.push(s);
    }
    if (ronCandidates.length > 0) {
      var autoWinner = ronCandidates.find(function(c) { return shouldAutoAgari(state, c); });
      if (autoWinner != null) {
        state.hands[autoWinner] = Tiles.sortTiles(state.hands[autoWinner].concat([addedTile]));
        _finishHand(state, autoWinner, 'ron', seat, addedTile, true);
        return true;
      }
      _clearTurnTimer(state);
      state.phase = 'ron_wait';
      state.ron = {
        tile: addedTile,
        from: seat,
        candidates: ronCandidates,
        responses: {},
        callOptionsBySeat: {},
        replacementDraw: true,
        revealKanDora: true,
        isChankan: true,
      };
      return true;
    }

    addKanDora(state);
    _drawFor(state, seat);
    state.rinshanPending = true;
    return true;
  }

  function _executeNuki(state, seat, tileId) {
    if (!state.isSanma || state.phase !== 'turn' || seat !== state.turn) return false;
    _consumeTurnTimer(state, seat);
    var idx = findNukiIdx(state, seat, tileId);
    if (idx < 0) return false;
    var tile = state.hands[seat].splice(idx, 1)[0];
    state.nuki[seat].push(tile);

    var ronCandidates = [];
    for (var i = 0; i < state.playerCount; i++) {
      if (i === seat) continue;
      if (isFuriten(state, i)) continue;
      if (Agari.isWinningHand((state.hands[i] || []).concat([tile])) && hasYaku(state, i, 'ron', seat, tile)) ronCandidates.push(i);
    }
    if (ronCandidates.length > 0) {
      var autoWinner = ronCandidates.find(function(c) { return shouldAutoAgari(state, c); });
      if (autoWinner != null) {
        state.hands[autoWinner] = Tiles.sortTiles(state.hands[autoWinner].concat([tile]));
        _finishHand(state, autoWinner, 'ron', seat, tile);
        state.result.yaku = (state.result.yaku || []).filter(function(y) { return y.name !== '槍槓'; });
        return true;
      }
      _clearTurnTimer(state);
      state.phase = 'ron_wait';
      state.ron = {
        tile: tile,
        from: seat,
        candidates: ronCandidates,
        responses: {},
        callOptionsBySeat: {},
        replacementDraw: true,
      };
      return true;
    }

    _drawFor(state, seat);
    return true;
  }

  function _discard(state, seat, idx, riichi) {
    if ((state.phase !== 'turn' && state.phase !== 'naki_discard') || seat !== state.turn) return false;
    if (riichi && state.phase !== 'turn') return false;
    var hand = state.hands[seat];
    if (idx == null || idx < 0 || idx >= hand.length) return false;
    var tile = hand[idx];

    if (state.riichi[seat] && tile.id !== state.drawnId) return false;
    _consumeTurnTimer(state, seat);
    if (riichi) {
      var rest = hand.filter(function(_, i) { return i !== idx; });
      var waits = getValidWaits(state, rest);
      if (state.riichi[seat] || !isClosed(state, seat) || waits.length === 0 || state.scores[seat] < 1000) return false;
      state.riichi[seat] = true;
      state.riichiWaits[seat] = waits;
      state.scores[seat] -= 1000;
      // ダブルリーチ：自分の最初の打牌で、かつそれまで誰も鳴いていなければ成立
      var noCallsYetForDbl = (state.melds || []).every(function(m) { return !m || m.length === 0; });
      state.riichiDouble[seat] = noCallsYetForDbl && state.discards[seat].length === 0;
      state.ippatsuActive[seat] = true;
    } else if (state.ippatsuActive && state.ippatsuActive[seat]) {
      // リーチ宣言後、自分の次の打牌が来たら一発のチャンスは終わり
      state.ippatsuActive[seat] = false;
    }

    hand.splice(idx, 1);
    state.hands[seat] = Tiles.sortTiles(hand);
    tile.riichiDiscard = !!riichi;
    state.discards[seat].push(tile);
    // 自分の打牌で同巡内フリテンは解消（永久フリテンは解消されない）
    if (state.tempFuriten) state.tempFuriten[seat] = false;
    state.drawnId = null;
    _afterDiscard(state, seat, tile);
    return true;
  }

  function _syncDisconnects(state) {
    ensureRuntimeArrays(state);
    var changed = false;
    var now = Date.now();
    var presence = (_room && _room.presence) || {};
    var players = (_room && _room.players) || [];
    for (var i = 0; i < state.playerCount; i++) {
      var p = players[i];
      var disconnected = false;
      if (p && !isCpuPlayer(p)) {
        var last = presence[p.uid] || state.startedAt || now;
        disconnected = (now - last) > DISCONNECT_MS;
      }
      if (state.disconnected[i] !== disconnected) {
        state.disconnected[i] = disconnected;
        changed = true;
      }
    }
    return changed;
  }

  function _advanceRoundOrEnd(state) {
    var rules = normalizeRules(state.rules, state.playerCount);
    if (state.round >= state.roundLimit) {
      if (!rules.suddenDeath) {
        state.phase = 'match_end';
        return;
      }
      var target = Math.max(rules.startScore + 5000, state.playerCount === 3 ? 40000 : 30000);
      var top = Math.max.apply(null, state.scores || []);
      if (top >= target) {
        state.phase = 'match_end';
        return;
      }
      state.roundLimit += state.playerCount;
    }
    state.round++;
    _deal(state);
  }

  function _resolveRonPasses(state) {
    var from = state.ron.from;
    var tile = state.ron.tile;
    var callMap = state.ron.callOptionsBySeat || {};
    var replacementDraw = state.ron.replacementDraw;
    var revealKanDora = state.ron.revealKanDora;
    state.ron = null;
    if (hasCallOptions(callMap)) {
      _setCallWait(state, tile, from, callMap);
    } else if (replacementDraw) {
      // 加槓・北抜きのロン見送り後：ロンされなかったので打った本人が続けて打牌権を得る（嶺上ツモ）
      if (revealKanDora) addKanDora(state);
      _drawFor(state, from);
      if (revealKanDora) state.rinshanPending = true;
    } else {
      _nextTurn(state, from);
    }
  }

  function _hostTick(state) {
    if (!state || state.phase === 'hand_end' || state.phase === 'match_end') return false;
    ensureRuntimeArrays(state);
    var changed = _syncDisconnects(state);
    var now = Date.now();

    if (state.phase === 'ron_wait' && state.ron) {
      for (var r = 0; r < state.ron.candidates.length; r++) {
        var rc = state.ron.candidates[r];
        if (shouldAutoAgari(state, rc)) {
          state.hands[rc] = Tiles.sortTiles(state.hands[rc].concat([state.ron.tile]));
          _finishHand(state, rc, 'ron', state.ron.from, state.ron.tile, !!state.ron.isChankan);
          return true;
        }
      }
      state.ron.candidates.forEach(function(c) {
        if (shouldSkipReactions(state, c) && state.ron.responses[c] !== 'pass') {
          state.ron.responses[c] = 'pass';
          markMissedRon(state, c);
          changed = true;
        }
      });
      if (state.ron.candidates.every(function(c) { return state.ron.responses[c] === 'pass'; })) {
        _resolveRonPasses(state);
        return true;
      }
      return changed;
    }

    if (state.phase === 'call_wait' && state.call) {
      state.call.candidates.forEach(function(c) {
        if (shouldSkipReactions(state, c) && state.call.responses[c] !== 'pass') {
          state.call.responses[c] = 'pass';
          changed = true;
        }
      });
      if (state.call.candidates.every(function(c) { return state.call.responses[c] === 'pass'; })) {
        var fromSeat = state.call.from;
        state.call = null;
        _nextTurn(state, fromSeat);
        return true;
      }
      return changed;
    }

    if ((state.phase === 'turn' || state.phase === 'naki_discard') && state.turn != null) {
      var seat = state.turn;
      if (!state.turnTimer || state.turnTimer.seat !== seat) {
        _startTurnTimer(state, seat);
        changed = true;
      }
      var timer = state.turnTimer;
      var flags = getAutoFlags(state, seat);
      var drawnTileForWin = (state.hands[seat] || []).find(function(t) { return t.id === state.drawnId; });
      var canWin = state.phase === 'turn' && Agari.isWinningHand(state.hands[seat] || []) &&
        hasYaku(state, seat, 'tsumo', null, drawnTileForWin);
      if (canWin && shouldAutoAgari(state, seat) && now >= timer.canAutoAt) {
        _consumeTurnTimer(state, seat);
        _finishHand(state, seat, 'tsumo', null);
        return true;
      }
      var autoDiscard = isCpuSeat(seat) || seatDisconnected(state, seat) || !!flags.tsumogiri || (!!state.riichi[seat] && !canWin);
      var dueAuto = autoDiscard && now >= timer.canAutoAt;
      var dueTimeout = now >= timer.deadlineAt;
      // 自動打牌（リーチ中のツモ切り含む）が発火するタイミングでは、
      // ツモった牌が北なら勝手に切らず先に北抜きを行う（人間・CPU共通）
      if (state.phase === 'turn' && state.isSanma && (dueAuto || dueTimeout)) {
        var nukiIdx = findNukiIdx(state, seat, null);
        if (nukiIdx >= 0) {
          _executeNuki(state, seat, (state.hands[seat] || [])[nukiIdx].id);
          return true;
        }
      }
      if (dueAuto || dueTimeout) {
        var idx = isCpuSeat(seat) && !dueTimeout ? _cpuChooseDiscard(state, seat) : _findDrawnIdx(state, seat);
        _discard(state, seat, idx, false);
        return true;
      }
    }

    return changed;
  }

  function _hostProcess() {
    var state = _game;
    if (!state || !_room) return;
    var a = _room.action;
    var ok = false;
    var processedAction = false;

    if (a && a.seq === state.seq && a.seq > _lastProcessedSeq &&
        a.seat != null && a.seat >= 0 && a.seat < state.playerCount &&
        playerUidAt(_room, a.seat) === a.uid) {
      var seat = a.seat;

      if (a.type === 'discard' || a.type === 'riichi') {
        ok = _discard(state, seat, a.idx, a.type === 'riichi');

      } else if (a.type === 'tsumo') {
        var drawnTileForTsumoAction = (state.hands[seat] || []).find(function(t) { return t.id === state.drawnId; });
        if (state.phase === 'turn' && seat === state.turn && Agari.isWinningHand(state.hands[seat]) &&
            hasYaku(state, seat, 'tsumo', null, drawnTileForTsumoAction)) {
          _consumeTurnTimer(state, seat);
          _finishHand(state, seat, 'tsumo', null);
          ok = true;
        }

      } else if (a.type === 'nuki') {
        ok = _executeNuki(state, seat, a.tileId);

      } else if (a.type === 'ankan') {
        ok = _executeAnkan(state, seat, a.tile);

      } else if (a.type === 'kakan') {
        ok = _executeKakan(state, seat, a.tile);

      } else if (a.type === 'auto_flags') {
        ensureRuntimeArrays(state);
        var old = getAutoFlags(state, seat);
        state.autoFlags[seat] = {
          agari: !!(a.flags && a.flags.agari),
          tsumogiri: !!(a.flags && a.flags.tsumogiri),
          noCalls: !!(a.flags && a.flags.noCalls),
        };
        ok = old.agari !== state.autoFlags[seat].agari ||
          old.tsumogiri !== state.autoFlags[seat].tsumogiri ||
          old.noCalls !== state.autoFlags[seat].noCalls;

      } else if (a.type === 'ron' || a.type === 'pass') {
        if (state.phase === 'ron_wait' && state.ron && state.ron.candidates.indexOf(seat) >= 0) {
          if (a.type === 'ron') {
            state.hands[seat] = Tiles.sortTiles(state.hands[seat].concat([state.ron.tile]));
            _finishHand(state, seat, 'ron', state.ron.from, state.ron.tile, !!state.ron.isChankan);
            ok = true;
          } else {
            state.ron.responses[seat] = 'pass';
            markMissedRon(state, seat);
            if (state.ron.candidates.every(function(c) { return state.ron.responses[c] === 'pass'; })) {
              _resolveRonPasses(state);
            }
            ok = true;
          }
        } else if (state.phase === 'call_wait' && state.call && state.call.candidates.indexOf(seat) >= 0 && a.type === 'pass') {
          state.call.responses[seat] = 'pass';
          if (state.call.candidates.every(function(c) { return state.call.responses[c] === 'pass'; })) {
            var fromSeat = state.call.from;
            state.call = null;
            _nextTurn(state, fromSeat);
          }
          ok = true;
        }

      } else if (a.type === 'call') {
        if (state.phase === 'call_wait') ok = _executeCall(state, seat, a.optionIdx, a.callType);

      } else if (a.type === 'next_round') {
        if (state.phase === 'hand_end' && a.uid === _room.hostUid) {
          _advanceRoundOrEnd(state);
          ok = true;
        }
      }

      if (ok || a.type === 'auto_flags') {
        _lastProcessedSeq = a.seq;
        processedAction = true;
      }
    }

    var tickChanged = _hostTick(state);
    if (processedAction || tickChanged) {
      _publish(state);
    }
  }

  return {
    ready: ready,
    createRoom: createRoom,
    joinRoom: joinRoom,
    leaveRoom: leaveRoom,
    setReady: setReady,
    updateRules: updateRules,
    addCpu: addCpu,
    removeCpu: removeCpu,
    startGame: startGame,
    sendAction: sendAction,
    onChange: function(cb) { _listeners.push(cb); },
    room: function() { return _room; },
    game: function() { return _game; },
    error: function() { return _lastError; },
    errorMessage: errorMessage,
    code: function() { return _code; },
    mySeat: mySeat,
    isHost: isHost,
    isCpu: function(seat) { return isCpuSeat(seat); },
    allReady: function() { return allPlayersReady(_room); },
    rules: function() { return normalizeRules(_room && _room.rules, _room && _room.playerCount); },
    autoFlags: function(seat) { return _game ? getAutoFlags(_game, seat) : defaultAutoFlags(seat); },
    normalizeCode: normalizeCode,
    doraFromInd: doraFromInd,
    isTenpai13: isTenpai13,
    isNukiTile: function(tile) { return isNukiTile(_game, tile); },
    checkAnkan: function(seat) { return checkAnkanCandidates(_game, seat); },
    checkKakan: function(seat) { return checkKakanCandidates(_game, seat); },
    isFuriten: function(seat) { return !!_game && isFuriten(_game, seat == null ? mySeat() : seat); },
    hasYaku: function(seat, winType, fromSeat, winningTile, isChankan) {
      return !!_game && hasYaku(_game, seat == null ? mySeat() : seat, winType, fromSeat, winningTile, isChankan);
    },
  };
})();
