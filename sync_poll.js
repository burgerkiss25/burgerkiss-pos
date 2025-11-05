// sync_poll.js – BurgerKiss POS Live-Sync (Variante B: 1 Slot gespiegelt)
// Polling-basiert: stabil & simpel. Mit BK_SYNC_FORCE_SLOT = 'SN1' arbeiten alle
// Geräte auf demselben Slot (volle Spiegelung).

(function(){
  if (window.BK_SYNC_ENABLED === false) return;
  if (!window.FIREBASE_CONFIG) return;

  // ---------- kleine Helfer ----------
  function later(fn, ms){ return setTimeout(fn, ms); }
  function json(x){ try { return JSON.stringify(x); } catch(e){ return ''; } }
  function clone(x){ try { return JSON.parse(JSON.stringify(x)); } catch(e){ return null; } }

  // Prüfen ob State-API bereit
  function hasState(){
    return !!(window.BK_STATE &&
              typeof BK_STATE.getState === 'function' &&
              typeof BK_STATE.setState === 'function');
  }

  // Slot-Label bestimmen (Force-Mode = immer derselbe Slot)
  function slotLabel(){
    if (window.BK_SYNC_FORCE_SLOT && typeof BK_SYNC_FORCE_SLOT === 'string') {
      return BK_SYNC_FORCE_SLOT;
    }
    // Fallback: immer SN1
    return 'SN1';
  }

  // ---------- Boot ----------
  function boot(){
    if (!hasState()) { later(boot, 150); return; }

    const app = (window.firebase.apps && firebase.apps.length)
      ? firebase.app()
      : firebase.initializeApp(window.FIREBASE_CONFIG);

    const auth = firebase.auth();
    const db   = firebase.database();

    // Basis-Pfad, z.B. '/pos/live'
    const BASE = (window.BK_SYNC_PATH || '/pos/live').replace(/\/+$/,'');
    const SLOT = slotLabel(); // z.B. 'SN1'
    const REF  = db.ref(`${BASE}/${SLOT}`);

    // leichte Sender-ID (pro Gerät)
    const sender = `dev-${Math.random().toString(36).slice(2,8)}`;
    window.BK_SYNC = { sender, path: `${BASE}/${SLOT}` };

    // anonym anmelden
    auth.signInAnonymously().catch(function(e){
      console.warn('firebase auth anonymous failed:', e && e.message);
    });

    // lokaler Hash verhindert unnötige Writes
    let lastLocalHash = '';
    let lastRemoteHash = '';

    function packState(){
      const s = clone(BK_STATE.getState());
      if (!s) return null;

      // Wir synchronisieren NUR den aktiven Slot-Inhalt, damit es klein bleibt.
      const a = Math.max(0, Math.min((s.active|0), (s.slots.length-1)));
      const active = s.slots[a] || {name:'SN1', items:[], pay:'unpaid'};

      const payload = {
        slot:   { name: slotLabel(), items: active.items||[], pay: active.pay||'unpaid' },
        sender: sender,
        ts:     Date.now()
      };
      payload.hash = json({slot: payload.slot}); // Hash ohne flüchtige Felder
      return payload;
    }

    function pushIfChanged(){
      const p = packState();
      if (!p) return;

      if (p.hash !== lastLocalHash){
        // nur schreiben, wenn sich lokal wirklich etwas geändert hat
        REF.update(p).catch(function(e){
          console.warn('sync push failed', e && e.message);
        });
        lastLocalHash = p.hash;
      }
    }

    function pullAndApply(){
      REF.get().then(function(snap){
        const val = snap.val();
        if (!val || !val.slot) return;

        const remoteHash = val.hash || json({slot: val.slot});
        // Wenn remote neuer Stand ≠ letzter angewandter Stand → anwenden
        if (remoteHash !== lastRemoteHash){
          lastRemoteHash = remoteHash;

          // aktuellen State nehmen und NUR aktiven Slot ersetzen
          const current = clone(BK_STATE.getState()) || {slots:[{name:slotLabel(), items:[], pay:'unpaid'}], active:0, discountRate:0};
          const a = Math.max(0, Math.min((current.active|0), (current.slots.length-1)));
          current.slots[a] = {
            name: slotLabel(),
            items: Array.isArray(val.slot.items) ? val.slot.items : [],
            pay:   val.slot.pay || 'unpaid'
          };
          // Anwenden (keine Endlosschleife, weil unser lokaler Hash sich danach sofort angleicht)
          BK_STATE.setState(current);
          // nach apply lokalen Hash angleichen, damit push nicht sofort feuert
          lastLocalHash = remoteHash;
        }
      }).catch(function(e){
        console.warn('sync pull failed', e && e.message);
      });
    }

    // sanftes Polling (schreibe & lese)
    function tick(){
      try { pushIfChanged(); pullAndApply(); }
      catch(e){ /* still */ }
      finally { later(tick, 1200); } // ~1.2s
    }

    // beim Start den Slot-Knoten “markieren”
    REF.update({ sender, ts: Date.now() }).finally(tick);
  }

  boot();
})();
