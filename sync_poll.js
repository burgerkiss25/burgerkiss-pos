// sync_poll.js – BurgerKiss POS Live-Sync (Variante B: nur aktiver Slot)
// Polling-basiert: keine Listener, kein setState-Hook. Stabil & einfach.

(function(){
  if (window.BK_SYNC_ENABLED === false) return;
  if (!window.FIREBASE_CONFIG) return;

  function hasState(){
    return !!(window.BK_STATE && typeof BK_STATE.getState==='function' && typeof BK_STATE.setState==='function');
  }
  function later(fn,ms){ return setTimeout(fn,ms); }
  function json(x){ try{ return JSON.stringify(x); }catch(_){ return ''; } }
  function clone(x){ try{ return JSON.parse(JSON.stringify(x)); }catch(_){ return null; } }

  function boot(){
    if (!hasState()) { later(boot, 150); return; }

    const app  = firebase.apps && firebase.apps.length ? firebase.app() : firebase.initializeApp(window.FIREBASE_CONFIG);
    const auth = firebase.auth();
    const db   = firebase.database();

    const BASE = (window.BK_SYNC_PATH || '/pos/live').replace(/\/+$/,'');
    let deviceId = localStorage.getItem('bk_device_id');
    if (!deviceId){ deviceId = 'dev-'+Math.random().toString(36).slice(2,8); localStorage.setItem('bk_device_id', deviceId); }

    const getState = ()=> BK_STATE.getState();
    const setState = (s)=> BK_STATE.setState(s);

    function activeSlotInfo(){
      const s = getState(); if (!s || !Array.isArray(s.slots) || !s.slots.length) return { idx:0, name:'SN1', slot:null };
      const idx = Math.max(0, Math.min((s.active|0)||0, s.slots.length-1));
      const slot = s.slots[idx] || null;
      const name = slot && slot.name ? slot.name : ('SN'+(idx+1));
      return { idx, name, slot };
    }

    let lastLocalHash  = '';
    let lastRemoteHash = '';
    let lastSlotName   = '';
    let applyingRemote = false;

    function localHash(){ const { slot } = activeSlotInfo(); return json(slot); }
    function pathFor(slotName){ return BASE + '/' + slotName; }

    function pushIfChanged(){
      if (applyingRemote) return;
      const curHash = localHash();
      if (!curHash) return;

      const { name } = activeSlotInfo();
      if (name !== lastSlotName){ lastSlotName = name; lastRemoteHash = ''; }

      if (curHash !== lastLocalHash){ lastLocalHash = curHash; }

      if (lastLocalHash && lastLocalHash !== lastRemoteHash){
        const { name, slot } = activeSlotInfo();
        const payload = { sender: deviceId, ts: Date.now(), hash: lastLocalHash, slot: slot || null };
        db.ref(pathFor(name)).set(payload).catch(()=>{});
      }
    }

    function pullAndApply(){
      const { name, idx } = activeSlotInfo();
      if (!name) return;

      db.ref(pathFor(name)).get().then(snap=>{
        const v = snap.val(); if (!v) return;
        if (v.sender === deviceId){ lastRemoteHash = v.hash || ''; return; }

        const curHash = localHash(); lastRemoteHash = v.hash || '';
        if (lastRemoteHash === curHash) return;

        if (v.slot){
          applyingRemote = true;
          try{
            const state = getState();
            const next  = clone(state);
            if (!next || !Array.isArray(next.slots)) return;
            next.slots[idx] = v.slot;
            setState(next);
            lastLocalHash = json(v.slot);
          }finally{
            later(()=>{ applyingRemote = false; }, 80);
          }
        }
      }).catch(()=>{});
    }

    function loop(){
      try{ pushIfChanged(); }catch(_){}
      later(()=>{ try{ pullAndApply(); }catch(_){} }, 150);
    }

    auth.signInAnonymously()
      .catch(()=>{})
      .finally(()=>{
        setInterval(loop, 1500); // alle 1.5 s
        loop();                  // sofort starten
      });
  }

  boot();
})();
