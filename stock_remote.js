// Remote stock paths and inventory payload builders shared by stock.js.
(function(root){
  'use strict';

  const utils = root.BK_STOCK_UTILS || {};
  const {
    normalizeId,
    num,
    STOCK_INVENTORY_LOCATIONS
  } = utils;

  function remoteEnabled(){
    return !!(root.BK_SYNC_ENABLED !== false && root.FIREBASE_CONFIG && root.firebase && root.firebase.database);
  }

  function stockPaths(){
    return {
      ingredients: (root.BK_STOCK_INGREDIENTS_PATH || '/pos/stock/ingredients').replace(/\/+$/,''),
      recipes: (root.BK_STOCK_RECIPES_PATH || '/pos/stock/recipes').replace(/\/+$/,''),
      inventory: (root.BK_STOCK_INVENTORY_PATH || '/pos/stock/inventory').replace(/\/+$/,''),
      addons: (root.BK_STOCK_ADDONS_PATH || '/pos/stock/addons').replace(/\/+$/,''),
      transfers: (root.BK_STOCK_TRANSFERS_PATH || '/pos/stock/transfers').replace(/\/+$/,''),
      movements: (root.BK_STOCK_MOVEMENTS_PATH || '/pos/stock/movements').replace(/\/+$/,''),
      purchases: (root.BK_STOCK_PURCHASES_PATH || '/pos/stock/purchases').replace(/\/+$/,''),
      locations: (root.BK_STOCK_LOCATIONS_PATH || '/pos/stock/config/locations').replace(/\/+$/,'')
    };
  }

  function db(){
    if(!remoteEnabled()) return null;
    try{
      const app = (root.firebase.apps && root.firebase.apps.length)
        ? root.firebase.app()
        : root.firebase.initializeApp(root.FIREBASE_CONFIG);
      return root.firebase.database(app);
    }catch(e){ return null; }
  }

  function syncIngredientStock(def){
    if(!def || typeof def !== 'object') return def;
    def.stock = def.stock && typeof def.stock === 'object' ? def.stock : {};
    STOCK_INVENTORY_LOCATIONS.forEach(loc=>{
      def.stock[loc.id] = {
        qty: num(def[loc.stockField], 0),
        moq: num(def[loc.moqField], 0)
      };
    });
    return def;
  }

  function syncAllIngredientStock(ingredients){
    Object.values(ingredients || {}).forEach(syncIngredientStock);
    return ingredients;
  }

  function locationConfigMap(){
    const out = {};
    STOCK_INVENTORY_LOCATIONS.forEach(loc=>{
      out[loc.id] = { name: loc.name, type: loc.type, legacy_key: loc.legacyKey };
    });
    return out;
  }

  function inventoryFromIngredients(ingredients){
    const out = {};
    Object.entries(ingredients || {}).forEach(([id, def])=>{
      out[id] = {
        current_stock_storage: num(def.current_stock_storage, 0),
        current_stock_foodtruck: num(def.current_stock_foodtruck, 0),
        moq_storage: num(def.moq_storage, 0),
        moq_foodtruck: num(def.moq_foodtruck, 0),
        stock: syncIngredientStock(def).stock,
        unit: def.unit || '',
        track_stock: def.track_stock !== false
      };
    });
    return out;
  }

  function inventoryByLocationFromIngredients(ingredients, ts){
    const out = {};
    STOCK_INVENTORY_LOCATIONS.forEach(loc=>{
      out[loc.id] = { map: {}, ts };
      Object.entries(ingredients || {}).forEach(([id, def])=>{
        out[loc.id].map[id] = {
          qty: num(def[loc.stockField], 0),
          moq: num(def[loc.moqField], 0),
          unit: def.unit || '',
          track_stock: def.track_stock !== false
        };
      });
    });
    return out;
  }

  function applyInventoryLocations(rawInventory, ingredients){
    if(!rawInventory || typeof rawInventory !== 'object') return ingredients;
    STOCK_INVENTORY_LOCATIONS.forEach(loc=>{
      const rawLoc = rawInventory[loc.id] || rawInventory[loc.legacyKey];
      const locMap = rawLoc && rawLoc.map ? rawLoc.map : rawLoc;
      if(!locMap || typeof locMap !== 'object') return;
      Object.entries(locMap).forEach(([ingredientId, inv])=>{
        const id = normalizeId(ingredientId);
        if(!id || !ingredients[id] || !inv || typeof inv !== 'object') return;
        ingredients[id][loc.stockField] = num(inv.qty, num(ingredients[id][loc.stockField], 0));
        ingredients[id][loc.moqField] = num(inv.moq, num(ingredients[id][loc.moqField], 0));
      });
    });
    return syncAllIngredientStock(ingredients);
  }

  function addonRecipesFromRecipes(recipes){
    const out = {};
    Object.entries(recipes || {}).forEach(([id, recipe])=>{
      if(String(id).startsWith('x_')) out[id] = recipe;
    });
    return out;
  }

  root.BK_STOCK_REMOTE = {
    remoteEnabled,
    stockPaths,
    db,
    syncIngredientStock,
    syncAllIngredientStock,
    locationConfigMap,
    inventoryFromIngredients,
    inventoryByLocationFromIngredients,
    applyInventoryLocations,
    addonRecipesFromRecipes
  };
  if(typeof module !== 'undefined' && module.exports) module.exports = root.BK_STOCK_REMOTE;
})(typeof window !== 'undefined' ? window : globalThis);
