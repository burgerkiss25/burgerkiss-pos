// Kopiere diese Datei als `firebase-config.js` und trage DEIN Firebase Projekt ein.
// Die Datei `firebase-config.js` ist in index.html eingebunden.

window.BK_ALLOW_PRICE_EDIT = true;
window.BK_SYNC_ENABLED = true;
window.BK_SYNC_FORCE_SLOT = 'SN1';
window.BK_SYNC_PATH = '/pos/live';
window.BK_SYNC_INTERVAL_MS = 1200;
window.BK_IMAGES_PATH = '/pos/config/images';
window.BK_PRODUCTS_PATH = '/pos/catalog/products';
window.BK_PRICES_PATH = '/pos/catalog/prices';
window.BK_STOCK_INGREDIENTS_PATH = '/pos/stock/ingredients';
window.BK_STOCK_RECIPES_PATH = '/pos/stock/recipes';
window.BK_STOCK_LOCATIONS_PATH = '/pos/stock/config/locations';
window.BK_STOCK_INVENTORY_PATH = '/pos/stock/inventory';
window.BK_STOCK_ADDONS_PATH = '/pos/stock/addons';
window.BK_STOCK_TRANSFERS_PATH = '/pos/stock/transfers';
window.BK_HISTORY_PATH = '/pos/history';

window.FIREBASE_CONFIG = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT.firebaseapp.com',
  databaseURL: 'https://YOUR_PROJECT-default-rtdb.REGION.firebasedatabase.app',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT.appspot.com',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId: 'YOUR_APP_ID'
};
