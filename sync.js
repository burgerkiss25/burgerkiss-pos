// sync.js – BurgerKiss POS Live-Sync (Variante B: nur aktiver Slot)
// Voraussetzung: FIREBASE_CONFIG + BK_STATE + BK_SYNC_PATH sind gesetzt.

(function () {
  try {
    if (!window.FIREBASE_CONFIG) return;

    // Firebase init (compat)
    const app  = firebase.apps && firebase.apps.length
      ? firebase.app()
      : firebase.initializeApp(window.FIREBASE_CONFIG);
    const auth = firebase.auth();
    const db   = firebase.database();

    const SYNC_BASE = (window.BK_SYNC_PATH || "/pos/live").replace(/\/+$/,'');
    // stabile Geräte-ID
    let deviceId = localStorage.getItem("bk_device_id");
    if (!deviceId) {
      deviceId = "dev-" + Math.random().toString(36).slice(2, 8);
      localStorage.setItem("bk_device_id", deviceId);
    }

    // Tools
    function getState() { return (window.BK_STATE && BK_STATE.getState) ? BK_STATE.getState() : null; }
    function setState(next) { if (window.BK_STATE && BK_STATE.setState) BK_STATE.setState(next); }
    function getActiveSlotInfo() {
      const s = getState();
      if (!s || !Array.isArray(s.slots)) return { idx: 0, name: "SN1", obj: null };
      const idx = Math.max(0, Math.min(s.slots.length - 1, s.active || 0));
      const slot = s.slots[idx] || null;
      const name = (slot && slot.name) ? slot.name : ("SN" + (idx + 1));
      return { idx, name, obj: slot };
    }

    // Aktuellen Slot-Listener verwalten
    let currentRef = null;
    let suppress   = false;   // um Echo zu vermeiden
    let lastSlotName = null;

    function subscribeTo(slotName) {
      if (!slotName) return;
      if (currentRef) currentRef.off();
      currentRef = db.ref(SYNC_BASE + "/" + slotName);
      currentRef.on("value", snap => {
        const v = snap.val();
        if (!v || v.sender === deviceId) return;
        const st = getState(); if (!st) return;
        const { idx, name } = getActiveSlotInfo();
        if (name !== slotName) return; // nur wenn wir wirklich gerade auf diesem Slot sind
        if (!v.slot) return;

        // Fremden Slot-Zustand lokal einspielen (nur aktiver Slot wird ersetzt)
        suppress = true;
        try {
          const next = JSON.parse(JSON.stringify(st));
          next.slots[idx] = v.slot;  // kompletten Slot übernehmen
          // active, discounts etc. bleiben wie sie sind (können aber auch im Slot stecken)
          setState(next);
        } finally {
          setTimeout(() => { suppress = false; }, 30);
        }
      });
    }

    function publishActiveSlot() {
      if (suppress) return;
      const st = getState(); if (!st) return;
      const { name, obj } = getActiveSlotInfo();
      if (!obj) return;
      const payload = { sender: deviceId, ts: Date.now(), slot: obj };
      db.ref(SYNC_BASE + "/" + name).set(payload).catch(console.warn);
    }

    function maybeResubscribe() {
      const { name } = getActiveSlotInfo();
      if (name !== lastSlotName) {
        lastSlotName = name;
        subscribeTo(name);
        // beim ersten Wechsel initial hochladen (falls im Netz noch nix ist)
        db.ref(SYNC_BASE + "/" + name).get().then(s => { if (!s.exists()) publishActiveSlot(); });
      }
    }

    // BK_STATE hooken
    function hookState() {
      if (!window.BK_STATE || typeof BK_STATE.setState !== "function" || typeof BK_STATE.getState !== "function") {
        setTimeout(hookState, 150);
        return;
      }
      // initial subscription auf aktuellen Slot
      maybeResubscribe();

      // Original setState wrappen: nach JEDEM lokalen Update → publish + evtl. resubscribe
      const _set = BK_STATE.setState;
      BK_STATE.setState = function (next) {
        _set(next);
        maybeResubscribe();
        publishActiveSlot();
      };
    }

    // Start: anonym authentifizieren, dann hooken
    auth.signInAnonymously()
      .then(() => { hookState(); })
      .catch(e => console.warn("Firebase auth failed:", e));

  } catch (e) {
    console.warn("Sync init error:", e);
  }
})();
