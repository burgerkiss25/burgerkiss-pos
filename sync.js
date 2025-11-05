// sync.js — Echtzeit-Sync für BurgerKiss POS über Firebase Realtime Database
(function () {
  try {
    if (!window.FIREBASE_CONFIG) return;

    // Firebase init (Compat SDKs werden in index.html geladen)
    const app = firebase.initializeApp(window.FIREBASE_CONFIG);
    const auth = firebase.auth();
    const db   = firebase.database();

    // Raum – alle Geräte im gleichen Raum = alle sehen das gleiche
    const ROOM_ID = new URLSearchParams(location.search).get("room") || "burgerkiss-pos-room-1";

    // Geräte-ID, damit eigene Writes ignoriert werden
    const did = (localStorage.getItem("bk_device_id") ||
      (function () {
        const v = "dev-"+Math.random().toString(36).slice(2);
        localStorage.setItem("bk_device_id", v);
        return v;
      })()
    );

    let originalSetState = null;
    let suppressBroadcast = false;

    function enableSync() {
      if (!window.BK_STATE || typeof BK_STATE.getState !== "function") {
        setTimeout(enableSync, 200);
        return;
      }
      if (!originalSetState) originalSetState = BK_STATE.setState;

      // Lokale Änderungen → DB schreiben
      BK_STATE.setState = function (next) {
        originalSetState(next);
        if (suppressBroadcast) return;
        const payload = { state: BK_STATE.getState(), sender: did, ts: Date.now() };
        db.ref("rooms/" + ROOM_ID).set(payload).catch(console.warn);
      };

      // Remote Änderungen → lokal anwenden
      db.ref("rooms/" + ROOM_ID).on("value", (snap) => {
        const val = snap.val();
        if (!val || !val.state) return;
        if (val.sender === did) return; // eigene Writes ignorieren
        suppressBroadcast = true;
        try {
          if (typeof BK_STATE.replaceState === "function") {
            BK_STATE.replaceState(val.state);
          } else {
            BK_STATE.setState(val.state);
          }
          if (window.BK_UI && typeof BK_UI.renderAll === "function") BK_UI.renderAll();
        } finally {
          setTimeout(()=>{ suppressBroadcast = false; }, 50);
        }
      });

      // Falls leer → initialen State hochladen
      db.ref("rooms/" + ROOM_ID).get().then((s)=>{
        if (!s.exists()) {
          const payload = { state: BK_STATE.getState(), sender: did, ts: Date.now() };
          db.ref("rooms/" + ROOM_ID).set(payload);
        }
      }).catch(()=>{});
    }

    auth.signInAnonymously()
      .then(enableSync)
      .catch((e)=> console.warn("Firebase auth failed:", e));

  } catch (e) {
    console.warn("Sync init error:", e);
  }
})();
