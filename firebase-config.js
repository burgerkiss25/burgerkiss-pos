// Produktions-/Entwicklungs-Konfiguration für Online-DB.
// Falls noch nicht eingerichtet: Werte aus firebase-config.example.js übernehmen.

window.BK_ALLOW_PRICE_EDIT = true;
window.BK_SYNC_ENABLED = true;
window.BK_SYNC_FORCE_SLOT = 'SN1';
window.BK_SYNC_PATH = '/pos/live';
window.BK_SYNC_INTERVAL_MS = 1200;

// TODO: HIER DEINE FIREBASE DATEN EINTRAGEN
window.FIREBASE_CONFIG = window.FIREBASE_CONFIG || null;
