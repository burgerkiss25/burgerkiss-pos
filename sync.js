// sync.js – BurgerKiss POS Live-Sync (Variante B: nur aktiver Slot)
// Stabilitäts-Focus: Debounce, try/catch überall, Echo- & Equality-Schutz, Auto-Recovery.

(function () {
  // Schnell aus, falls nötig
  if (window.BK_SYNC_ENABLED === false) return;

  const LOG = (...a)=>{ /* console.log('[SYNC]', ...a); */ };

  function safe(fn){ try{ return fn(); }catch(e){ console.warn('[SYNC]', e); } }

  // Hard guard: App-State muss existieren
  function hasStateAPI(){
    return !!(window.BK_STATE && typeof BK_STATE.getState==='function' && typeof BK_STATE.setState==='function');
  }

  // Mini deep-equal (nur für Slots)
  function shallowEqual(a,b){
    try{ return JSON.stringify(a)===JSON.stringify(b); }catch(_){ return false; }
  }

  function debounce(fn,delay){
    let t; return function(){ const args=arguments; clearTimeout(t); t=setTimeout(()=>fn.apply(this,args),delay); };
  }

  // Initialisieren, wenn alles bereit ist
  function boot(){
    if (!window.FIREBASE_CONFIG) return;
    if (typeof firebase==='undefined') return;
    if (!hasStateAPI()) { setTimeout(boot,100); return; }

    // Firebase init
    const app = firebase.apps && firebase.apps.length ? firebase.app() : firebase.initializeApp(window.FIREBASE_CONFIG);
    const auth = firebase.auth();
    const db   = firebase.database();

    const SYNC_BASE = (window.BK_SYNC_PATH || "/pos/live").replace(/\/+$/,'');
    let deviceId = localStorage.getItem('bk_device_id');
    if (!deviceId){ deviceId = 'dev-'+Math.random().toString(36).slice(2,8); localStorage.setItem('bk_device_id', deviceId); }

    // Helpers
    const getState = ()=> BK_STATE.getState();
    const setState = (s)=> BK_STATE.setState(s);

    function activeSlotInfo(){
      const s = getState(); if (!s) return { idx:0, name:'SN1', slot:null };
      const idx = Math.max(0, Math.min((s.active|0)||0, s.slots.length-1));
      const slot = s.slots[idx] || null;
      const name = slot && slot.name ? slot.name : ('SN'+(idx+1));
      return { idx, name, slot };
    }

    let currentRef = null;
    let lastSlotName = null;
    let suppress = false;     // blockiert Echo
    let ready = false;

    const publish = debounce(function(){
      if (suppress) return;
      const { name, slot } = activeSlotInfo();
      if (!slot) return;
      const payload = { sender: deviceId, ts: Date.now(), slot };
      safe(()=> currentRef && currentRef.set(payload) );
    }, 50);

    function subscribeTo(name){
      if (!name) return;
      if (currentRef) safe(()=> currentRef.off());
      currentRef = db.ref(SYNC_BASE + '/' + name);
      safe(()=> currentRef.on('value', snap=>{
        const v = snap.val();
        if (!v) return;
        if (v.sender === deviceId) return; // eigenes Echo ignorieren
        const { idx, name: curName, slot: localSlot } = activeSlotInfo();
        if (curName !== name) return;      // nur wenn wir wirklich in diesem Slot sind
        if (!v.slot) return;

        if (shallowEqual(localSlot, v.slot)) return; // nichts zu tun

        suppress = true;
        try{
          const state = getState();
          const next = JSON.parse(JSON.stringify(state));
          next.slots[idx] = v.slot;   // nur aktiven Slot ersetzen
          setState(next);
        }finally{
          setTimeout(()=>{ suppress=false; }, 25);
        }
      }));
    }

    function maybeResubscribe(){
      const { name } = activeSlotInfo();
      if (name !== lastSlotName){
        lastSlotName = name;
        subscribeTo(name);
        // Falls dort noch nichts liegt, lade ersten Stand hoch
        safe(()=> db.ref(SYNC_BASE + '/' + name).get().then(s=>{
          if (!s.exists()) publish();
        }));
      }
    }

    // wrap setState EINMAL
    if (!BK_STATE.__syncWrapped){
      const __orig = BK_STATE.setState;
      BK_STATE.setState = function(next){
        __orig(next);
        safe(maybeResubscribe);
        safe(publish);
      };
      BK_STATE.__syncWrapped = true;
    }

    // Sichtbarkeitswechsel: aktiv → sofort publish
    document.addEventListener('visibilitychange', ()=>{
      if (document.visibilityState === 'visible') safe(publish);
    });

    // Heartbeat: falls mal was schief läuft, rehooken wir sanft
    setInterval(()=>{ safe(maybeResubscribe); }, 1500);

    // Start: anonym einloggen → dann re/subscribe + publish
    auth.signInAnonymously()
      .then(()=>{ ready=true; safe(maybeResubscribe); safe(publish); })
      .catch(e=>{ console.warn('[SYNC] auth failed', e); /* läuft dann einfach ohne Sync weiter */ });
  }

  // Start
  boot();
})();
