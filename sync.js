// sync.js — Voll-Sync für BurgerKiss POS über Firebase Realtime Database
(function () {
  try {
    if (!window.FIREBASE_CONFIG || !window.firebase) return;

    // Firebase init (Compat SDKs sind in index.html eingebunden)
    const app  = firebase.apps && firebase.apps.length
      ? firebase.app()
      : firebase.initializeApp(window.FIREBASE_CONFIG);
    const auth = firebase.auth();
    const db   = firebase.database();

    // Raum-Name: beide Geräte müssen im selben Raum sein (Standard = room-1)
    const ROOM_ID =
      new URLSearchParams(location.search).get("room") ||
      localStorage.getItem("bk_room") ||
      "burgerkiss-pos-room-1";

    // Stabile Geräte-ID, damit wir unsere eigenen Writes ignorieren
    let did = localStorage.getItem("bk_device_id");
    if (!did) {
      did = "dev-" + Math.random().toString(36).slice(2);
      localStorage.setItem("bk_device_id", did);
    }

    // Preis-Overrides lesen/schreiben (gleiches Key wie in prices.js)
    const PRICE_KEY = "bk_prices_v1";
    function getPriceMap() {
      try { return JSON.parse(localStorage.getItem(PRICE_KEY) || "{}"); }
      catch (e) { return {}; }
    }
    function setPriceMap(map) {
      localStorage.setItem(PRICE_KEY, JSON.stringify(map || {}));
      // optional: UI aktualisieren, falls deine UI eine Funktion dafür hat
      if (window.BK_UI && typeof BK_UI.renderAll === "function") BK_UI.renderAll();
    }

    // Paket bauen: kompletter App-Status + Preis-Overrides
    function pack() {
      const state = (window.BK_STATE && BK_STATE.getState)
        ? BK_STATE.getState()
        : null;
      return { sender: did, ts: Date.now(), state, prices: getPriceMap() };
    }

    // Paket anwenden (Remote -> Lokal)
    function apply(payload) {
      if (!payload) return;
      // Reihenfolge: erst Preise, dann State, dann rendern
      if (payload.prices) setPriceMap(payload.prices);
      if (payload.state && window.BK_STATE) {
        if (typeof BK_STATE.replaceState === "function") {
          BK_STATE.replaceState(payload.state);
        } else if (typeof BK_STATE.setState === "function") {
          BK_STATE.setState(payload.state);
        }
      }
      if (window.BK_UI && typeof BK_UI.renderAll === "function") BK_UI.renderAll();
    }

    // Doppel-Events vermeiden
    let suppress = false;
    function publish() {
      if (suppress) return;
      const payload = pack();
      db.ref("rooms/" + ROOM_ID).set(payload).catch(console.warn);
    }

    // Hook: warte bis BK_STATE verfügbar ist, dann setState „umbiegen“
    function hookState() {
      if (!window.BK_STATE || typeof BK_STATE.setState !== "function" || typeof BK_STATE.getState !== "function") {
        setTimeout(hookState, 200);
        return;
      }

      const _set = BK_STATE.setState;
      BK_STATE.setState = function (next) {
        _set(next);         // lokal anwenden
        publish();          // ins Netz senden
      };

      // Preis-Änderungen erkennen: localStorage.setItem hooken (nur für unser KEY)
      const _lsSet = localStorage.setItem;
      localStorage.setItem = function (k, v) {
        _lsSet.apply(localStorage, arguments);
        if (k === PRICE_KEY) publish();
      };

      // Wenn Raum noch leer ist -> unseren Stand initial hochladen
      db.ref("rooms/" + ROOM_ID).get().then(snap => {
        if (!snap.exists()) publish();
      }).catch(() => {});

      // Remote-Listener
      db.ref("rooms/" + ROOM_ID).on("value", snap => {
        const val = snap.val();
        if (!val) return;
        if (val.sender === did) return;       // eigene Writes ignorieren
        suppress = true;
        try { apply(val); }
        finally { setTimeout(() => { suppress = false; }, 50); }
      });
    }

    // anonym anmelden, dann hooken
    auth.signInAnonymously()
      .then(hookState)
      .catch(e => console.warn("Firebase auth failed:", e));

  } catch (e) {
    console.warn("Sync init error:", e);
  }
})();
