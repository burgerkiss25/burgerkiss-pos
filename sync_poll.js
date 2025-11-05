// sync_poll.js – BurgerKiss POS Live-Sync (Variante B: nur aktiver Slot)
// Polling-basiert (stabil & simpel): kein Realtime-Listener, kein setState-Hook.

"use strict";

/** 👉 Deine Realtime-Database URL (REGION beachten!) */
const DB_URL = "https://burgerkiss-pos-default-rtdb.europe-west1.firebasedatabase.app/";

(function () {
  // Schalter: Sync global abschalten, falls gesetzt
  if (window.BK_SYNC_ENABLED === false) return;
  if (!window.FIREBASE_CONFIG) return;

  /** Warten bis BK_STATE verfügbar ist */
  function hasState() {
    return !!(
      window.BK_STATE &&
      typeof BK_STATE.getState === "function" &&
      typeof BK_STATE.setState === "function"
    );
  }
  function later(fn, ms) {
    return setTimeout(fn, ms);
  }
  function json(x) {
    try { return JSON.stringify(x); } catch (_) { return ""; }
  }
  function clone(x) {
    try { return JSON.parse(JSON.stringify(x)); } catch (_) { return null; }
  }

  function boot() {
    if (!hasState()) { later(boot, 150); return; }

    // Firebase initialisieren (compat SDKs)
    const app  = (firebase.apps && firebase.apps.length) ? firebase.app() : firebase.initializeApp(window.FIREBASE_CONFIG);
    const auth = firebase.auth();
    const db   = firebase.database(); // wir nutzen refFromURL() mit DB_URL

    // Basis-Pfad in der DB (z. B. /pos/live/SN1)
    const BASE = (window.BK_SYNC_PATH || "/pos/live").replace(/\/+$/, "");

    // Geräte-ID (zur Duplikat-Erkennung)
    let deviceId = localStorage.getItem("bk_device_id");
    if (!deviceId) {
      deviceId = "dev-" + Math.random().toString(36).slice(2, 8);
      localStorage.setItem("bk_device_id", deviceId);
    }

    // Hilfsfunktionen auf BK_STATE
    const getState = () => BK_STATE.getState();
    const setState = (s) => BK_STATE.setState(s);

    function activeSlotInfo() {
      const s = getState();
      if (!s || !Array.isArray(s.slots) || !s.slots.length) {
        return { idx: 0, name: "SN1", slot: null };
      }
      const idx = Math.max(0, Math.min((s.active | 0) || 0, s.slots.length - 1));
      const slot = s.slots[idx] || null;
      const name = slot && slot.name ? slot.name : "SN" + (idx + 1);
      return { idx, name, slot };
    }

    // Referenzen mit fixer DB_URL bilden
    function ref(path) {
      const url = DB_URL.replace(/\/$/, "") + path;
      // refFromURL toleriert volle URL
      return db.refFromURL(url);
    }
    function pathFor(slotName) {
      return BASE + "/" + slotName;
    }

    // Hash-Vergleiche (lokal/remote)
    let lastLocalHash  = "";
    let lastRemoteHash = "";
    let lastSlotName   = "";
    let applyingRemote = false;

    function localHash() {
      const { slot } = activeSlotInfo();
      return json(slot);
    }

    // Lokale Änderungen zur DB pushen
    function pushIfChanged() {
      if (applyingRemote) return;

      const curHash = localHash();
      if (!curHash) return;

      const { name } = activeSlotInfo();
      if (name !== lastSlotName) {
        lastSlotName = name;
        lastRemoteHash = ""; // Slot-Wechsel → Remote neu ermitteln
      }

      if (curHash !== lastLocalHash) {
        lastLocalHash = curHash;
      }

      if (lastLocalHash && lastLocalHash !== lastRemoteHash) {
        const { name, slot } = activeSlotInfo();
        const payload = { sender: deviceId, ts: Date.now(), hash: lastLocalHash, slot: slot || null };
        ref(pathFor(name)).set(payload).catch(() => {});
      }
    }

    // Remote lesen & anwenden
    function pullAndApply() {
      const { name, idx } = activeSlotInfo();
      if (!name) return;

      ref(pathFor(name)).get().then((snap) => {
        const v = snap.val();
        if (!v) return;                    // nichts auf der Leitung → warten
        if (v.sender === deviceId) {       // eigene Updates ignorieren
          lastRemoteHash = v.hash || "";
          return;
        }

        const curHash = localHash();
        lastRemoteHash = v.hash || "";

        if (lastRemoteHash === curHash) return; // bereits gleich

        if (v.slot) {
          applyingRemote = true;
          try {
            const state = getState();
            const next  = clone(state);
            if (!next || !Array.isArray(next.slots)) return;

            next.slots[idx] = v.slot; // nur aktiven Slot ersetzen
            setState(next);
            lastLocalHash = json(v.slot);
          } finally {
            later(() => { applyingRemote = false; }, 80);
          }
        }
      }).catch(() => {});
    }

    // Poll-Loop
    function loop() {
      try { pushIfChanged(); } catch (_) {}
      later(() => { try { pullAndApply(); } catch (_) {} }, 150);
    }

    // Anmelden (anonym) und starten
    auth.signInAnonymously()
      .catch(() => {})
      .finally(() => {
        // sanfter Poll-Intervall
        setInterval(loop, 1500); // alle 1.5 s
        loop();                  // sofort einmal
      });
  }

  boot();
})();
