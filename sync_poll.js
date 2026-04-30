// sync_poll.js – BurgerKiss POS Live-Sync (Variante B: 1 Slot gespiegelt)
// Polling-basiert: stabil & simpel. Mit BK_SYNC_FORCE_SLOT = 'SN1' arbeiten alle
// Geräte auf demselben Slot (volle Spiegelung).

(function(){
  if (window.BK_SYNC_ENABLED === false) return;
  if (!window.FIREBASE_CONFIG) return;

  function later(fn, ms){ return setTimeout(fn, ms); }
  function json(x){ try { return JSON.stringify(x); } catch(e){ return ''; } }
  function clone(x){ try { return JSON.parse(JSON.stringify(x)); } catch(e){ return null; } }

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
      slot:   { name: slotLabel(), items: active.items||[], pay: active.pay||'unpaid' },
      sender: sender,
      ts:     Date.now()
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
      pay:   remoteSlot.pay || 'unpaid'
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
    window.BK_SYNC = { sender, path: `${BASE}/${SLOT}`, pollMs: POLL_MS };

    auth.signInAnonymously().catch(function(e){
      console.warn('firebase auth anonymous failed:', e && e.message);
    });

    let lastLocalHash = '';
    let lastRemoteHash = '';

    function pushIfChanged(){
      const payload = buildPayload(BK_STATE.getState(), sender);
      if (!payload) return;
      if (!shouldPush(payload.hash, lastLocalHash)) return;
      REF.update(payload).catch(function(e){
        console.warn('sync push failed', e && e.message);
      });
      lastLocalHash = payload.hash;
    }

    function pullAndApply(){
      REF.get().then(function(snap){
        const val = snap.val();
        if (!val || !val.slot) return;

        const remoteHash = val.hash || json({slot: val.slot});
        if (remoteHash === lastRemoteHash) return;
        lastRemoteHash = remoteHash;

        const next = applyRemoteSlot(BK_STATE.getState(), val.slot);
        BK_STATE.setState(next);
        if(window.BK_UI && typeof BK_UI.renderAll === "function") BK_UI.renderAll();
        lastLocalHash = remoteHash;
      }).catch(function(e){
        console.warn('sync pull failed', e && e.message);
      });
    }

    function tick(){
      try { pushIfChanged(); pullAndApply(); }
      catch(e){ /* still */ }
      finally { later(tick, POLL_MS); }
    }

    REF.update({ sender, ts: Date.now() }).finally(tick);
  }

  boot();
})();
