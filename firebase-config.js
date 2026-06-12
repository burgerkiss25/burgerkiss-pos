// Produktions-/Entwicklungs-Konfiguration für Online-DB.
// Diese Datei wird von index.html geladen und aktiviert Firebase Realtime Database.

window.BK_ALLOW_PRICE_EDIT = true;
window.BK_SYNC_ENABLED = true;
window.BK_SYNC_FORCE_SLOT = 'SN1';
window.BK_SYNC_PATH = '/pos/live';
window.BK_SYNC_INTERVAL_MS = 1200;
window.BK_LEGACY_SLOT_SYNC_ENABLED = false;
window.BK_ORDER_COUNTER_PATH = '/pos/counters/orderNumber';
window.BK_IMAGES_PATH = '/pos/config/images';
window.BK_PRODUCTS_PATH = '/pos/catalog/products';
window.BK_PRICES_PATH = '/pos/catalog/prices';
window.BK_STOCK_INGREDIENTS_PATH = '/pos/stock/ingredients';
window.BK_STOCK_RECIPES_PATH = '/pos/stock/recipes';
window.BK_STOCK_LOCATIONS_PATH = '/pos/stock/config/locations';
window.BK_STOCK_INVENTORY_PATH = '/pos/stock/inventory';
window.BK_STOCK_ADDONS_PATH = '/pos/stock/addons';
window.BK_STOCK_TRANSFERS_PATH = '/pos/stock/transfers';
window.BK_STOCK_MOVEMENTS_PATH = '/pos/stock/movements';
window.BK_HISTORY_PATH = '/pos/history';

// Firebase Web-App-Konfiguration aus der Firebase Console.
// Hinweis: Keine `import`-Zeilen hier einfügen; die App nutzt Firebase Compat-Skripte aus index.html.
window.FIREBASE_CONFIG = {
  apiKey: 'AIzaSyB10r5qCm6wbJ7Cosfm2aztsxKzCCUKhfY',
  authDomain: 'burgerkiss-pos-system.firebaseapp.com',
  databaseURL: 'https://burgerkiss-pos-system-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'burgerkiss-pos-system',
  storageBucket: 'burgerkiss-pos-system.firebasestorage.app',
  messagingSenderId: '469356847680',
  appId: '1:469356847680:web:c5fc5baa3a4fe36861b5a5',
  measurementId: 'G-4PKG8C8ERM'
};
