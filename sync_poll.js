// sync_poll.js – BurgerKiss POS Live-Sync (Variante B: 1 Slot gespiegelt)
// Polling-basiert: stabil & simpel. Mit BK_SYNC_FORCE_SLOT = 'SN1' arbeiten alle
// Geräte auf demselben Slot (volle Spiegelung).

(function(){
  if (window.BK_SYNC_ENABLED === false || window.BK_LEGACY_SLOT_SYNC_ENABLED !== true) return;
  if (!window.FIREBASE_CONFIG) return;

  function later(fn, ms){ return setTimeout(fn, ms); }
  function json(x){ try { return JSON.stringify(x); } catch(e){ return ''; } }
  function clone(x){ try { return JSON.parse(JSON.stringify(x)); } catch(e){ return null; } }
  function nowIso(){ try { return new Date().toISOString(); } catch(e){ return String(Date.now()); } }

  function hasState(){
    return !!(window.BK_STATE &&
              typeof BK_STATE.getState === 'function' &&
              typeof BK_STATE.setState === 'function');
  }

  function slotLabel(){
    if (window.BK_SYNC_FORCE_SLOT && typeof BK_SYNC_FORCE_SLOT === 'string') {
      return BK_SYNC_FORCE_SLOT;
    }
    return 'SN1';
  }

  function buildPayload(state, sender){
    const s = clone(state);
    if (!s || !Array.isArray(s.slots) || !s.slots.length) return null;
    const a = Math.max(0, Math.min((s.active|0), (s.slots.length-1)));
    const active = s.slots[a] || {name:'SN1', items:[], pay:'unpaid'};
    const payload = {
      slot: {
        name: slotLabel(),
        items: active.items || [],
        pay: active.pay || 'unpaid',
        issued: !!active.issued,
        orderNo: active.orderNo || null,
        createdAt: active.createdAt || Date.now()
      },
      sender: sender,
      ts: Date.now()
    };
    payload.hash = json({slot: payload.slot});
    return payload;
  }

  function applyRemoteSlot(currentState, remoteSlot){
    const current = clone(currentState) || {slots:[{name:slotLabel(), items:[], pay:'unpaid'}], active:0, discountRate:0};
    if(!Array.isArray(current.slots) || !current.slots.length){
      current.slots = [{name:slotLabel(), items:[], pay:'unpaid'}];
      current.active = 0;
    }
    const a = Math.max(0, Math.min((current.active|0), (current.slots.length-1)));
    current.slots[a] = {
      name: slotLabel(),
      items: Array.isArray(remoteSlot.items) ? remoteSlot.items : [],
      pay: remoteSlot.pay || 'unpaid',
      issued: !!remoteSlot.issued,
      orderNo: remoteSlot.orderNo || (current.slots[a] && current.slots[a].orderNo) || null,
      createdAt: Number(remoteSlot.createdAt) > 0 ? Number(remoteSlot.createdAt) : ((current.slots[a] && current.slots[a].createdAt) || Date.now())
    };
    return current;
  }

  function shouldPush(nextHash, lastHash){
    return !!nextHash && nextHash !== lastHash;
  }

  function boot(){
    if (!hasState()) { later(boot, 150); return; }

    const app = (window.firebase.apps && firebase.apps.length)
      ? firebase.app()
      : firebase.initializeApp(window.FIREBASE_CONFIG);

    const auth = firebase.auth(app);
    const db   = firebase.database(app);

    const BASE = (window.BK_SYNC_PATH || '/pos/live').replace(/\/+$/,'');
    const SLOT = slotLabel();
    const REF  = db.ref(`${BASE}/${SLOT}`);
    const POLL_MS = Number(window.BK_SYNC_INTERVAL_MS) > 0 ? Number(window.BK_SYNC_INTERVAL_MS) : 1200;

    const sender = `dev-${Math.random().toString(36).slice(2,8)}`;
    window.BK_SYNC = {
      sender,
      path: `${BASE}/${SLOT}`,
      pollMs: POLL_MS,
      status: 'starting',
      lastPushAt: null,
      lastPullAt: null,
      lastError: null
    };

    let lastLocalHash = '';
    let lastRemoteHash = '';
    let busy = false;

    function markError(prefix, e){
      const msg = `${prefix}: ${e && e.message ? e.message : e}`;
      window.BK_SYNC.status = 'error';
      window.BK_SYNC.lastError = msg;
      console.warn(msg);
    }

    function pushIfChanged(){
      const payload = buildPayload(BK_STATE.getState(), sender);
      if (!payload) return Promise.resolve(false);
      if (!shouldPush(payload.hash, lastLocalHash)) return Promise.resolve(false);
      return REF.update(payload).then(function(){
        lastLocalHash = payload.hash;
        lastRemoteHash = payload.hash;
        window.BK_SYNC.status = 'online';
        window.BK_SYNC.lastPushAt = nowIso();
        window.BK_SYNC.lastError = null;
        return true;
      }).catch(function(e){
        markError('sync push failed', e);
        return false;
      });
    }

    function pullAndApply(){
      return REF.get().then(function(snap){
        const val = snap.val();
        if (!val || !val.slot) return false;

        const remoteHash = val.hash || json({slot: val.slot});
        if (remoteHash === lastRemoteHash) return false;
        lastRemoteHash = remoteHash;

        const next = applyRemoteSlot(BK_STATE.getState(), val.slot);
        BK_STATE.setState(next);
        if(window.BK_UI && typeof BK_UI.renderAll === 'function') BK_UI.renderAll();
        lastLocalHash = remoteHash;
        window.BK_SYNC.status = 'online';
        window.BK_SYNC.lastPullAt = nowIso();
        window.BK_SYNC.lastError = null;
        return true;
      }).catch(function(e){
        markError('sync pull failed', e);
        return false;
      });
    }

    function tick(){
      if(busy){ later(tick, POLL_MS); return; }
      busy = true;
      pullAndApply()
        .then(pushIfChanged)
        .catch(function(e){ markError('sync tick failed', e); })
        .finally(function(){
          busy = false;
          later(tick, POLL_MS);
        });
    }

    auth.signInAnonymously().then(function(){
      window.BK_SYNC.status = 'authenticated';
      return REF.update({ sender, ts: Date.now() });
    }).then(function(){
      return pullAndApply();
    }).then(function(){
      tick();
    }).catch(function(e){
      markError('firebase auth anonymous failed', e);
      tick();
    });
  }

  boot();
})();
