(function(){
  const KEY = 'bk_stock_v1';
  const TRANSFERS_KEY = 'bk_stock_transfers_v1';
  const MOVEMENTS_KEY = 'bk_stock_movements_v1';
  const DEFAULTS = window.BK_STOCK_DATA.DEFAULTS;
  const {
    normalizeId,
    num,
    locationLabel,
    STOCK_INVENTORY_LOCATIONS,
    sanitizeIngredient,
    sanitizeIngredients,
    sanitizeRecipes,
    parseRecipeText,
    recipeToText
  } = window.BK_STOCK_UTILS;
  let INGREDIENTS = {};
  let RECIPES = {};
  let TRANSFERS = [];
  let MOVEMENTS = [];
  let remoteSaveTimer = null;
  let editorBodyId = 'stockBody';
  let editorModalId = 'modalStock';

  function clone(x){ return JSON.parse(JSON.stringify(x)); }
  function remoteEnabled(){
    return !!(window.BK_SYNC_ENABLED !== false && window.FIREBASE_CONFIG && window.firebase && window.firebase.database);
  }
  function stockPaths(){
    return {
      ingredients: (window.BK_STOCK_INGREDIENTS_PATH || '/pos/stock/ingredients').replace(/\/+$/,''),
      recipes: (window.BK_STOCK_RECIPES_PATH || '/pos/stock/recipes').replace(/\/+$/,''),
      inventory: (window.BK_STOCK_INVENTORY_PATH || '/pos/stock/inventory').replace(/\/+$/,''),
      addons: (window.BK_STOCK_ADDONS_PATH || '/pos/stock/addons').replace(/\/+$/,''),
      transfers: (window.BK_STOCK_TRANSFERS_PATH || '/pos/stock/transfers').replace(/\/+$/,''),
      movements: (window.BK_STOCK_MOVEMENTS_PATH || '/pos/stock/movements').replace(/\/+$/,''),
      locations: (window.BK_STOCK_LOCATIONS_PATH || '/pos/stock/config/locations').replace(/\/+$/,'')
    };
  }
  function db(){
    if(!remoteEnabled()) return null;
    try{
      const app = (window.firebase.apps && firebase.apps.length)
        ? firebase.app()
        : firebase.initializeApp(window.FIREBASE_CONFIG);
      return firebase.database(app);
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
  function sanitizeTransfers(raw){
    const src = raw && Array.isArray(raw.items) ? raw.items : raw;
    if(!Array.isArray(src)) return [];
    return src.filter(t=> t && typeof t === 'object' && t.ingredient_id && Number.isFinite(Number(t.qty))).slice(-100);
  }
  function sanitizeMovements(raw){
    const src = raw && Array.isArray(raw.items) ? raw.items : raw;
    if(!Array.isArray(src)) return [];
    return src.filter(m=> m && typeof m === 'object' && m.ingredient_id && Number.isFinite(Number(m.qty))).slice(-200);
  }
  function usageForSlots(slots){
    const usage = {}; Object.keys(INGREDIENTS).forEach(k=>{ usage[k] = 0; });
    (slots || []).forEach(s=>{ (s.items || []).forEach(it=>{
      const productId = String(it.itemId || '');
      const rec = productId.startsWith('i_sauce_') || productId.startsWith('x_sauce_')
        ? Object.assign({}, DEFAULTS.recipes[productId] || {}, RECIPES[productId] || {})
        : (RECIPES[productId] || DEFAULTS.recipes[productId] || {});
      Object.entries(rec).forEach(([id, qty])=>{ const n = Number(qty); if(Number.isFinite(n) && n > 0) usage[id] = (usage[id] || 0) + n; });
    }); });
    return usage;
  }
  function persistRemoteSoon(){
    const database = db();
    if(!database) return;
    if(remoteSaveTimer) clearTimeout(remoteSaveTimer);
    remoteSaveTimer = setTimeout(()=>{
      const paths = stockPaths();
      const ts = Date.now();
      const inventoryLocations = inventoryByLocationFromIngredients(INGREDIENTS, ts);
      Promise.all([
        database.ref(paths.locations).set({ map: locationConfigMap(), ts }),
        database.ref(paths.ingredients).set({ map: syncAllIngredientStock(INGREDIENTS), ts }),
        database.ref(paths.recipes).set({ map: RECIPES, ts }),
        database.ref(paths.inventory).update(Object.assign({ map: inventoryFromIngredients(INGREDIENTS), ts }, inventoryLocations)),
        database.ref(paths.addons).set({ map: addonRecipesFromRecipes(RECIPES), ts }),
        database.ref(paths.transfers).set({ items: TRANSFERS.slice(-100), ts }),
        database.ref(paths.movements).set({ items: MOVEMENTS.slice(-200), ts })
      ]).catch(e=>{
        console.warn('stock remote save failed:', e && e.message);
      });
    }, 250);
  }
  function renderPosIfAvailable(){
    if(window.BK_UI && typeof BK_UI.renderAll === 'function' && document.getElementById('buttons')) BK_UI.renderAll();
  }
  function applyRemoteStock(rawIngredients, rawRecipes, rawTransfers, rawInventory, rawMovements){
    const cleanIng = sanitizeIngredients(rawIngredients && rawIngredients.map ? rawIngredients.map : rawIngredients);
    const cleanRec = sanitizeRecipes(rawRecipes && rawRecipes.map ? rawRecipes.map : rawRecipes);
    const cleanTransfers = sanitizeTransfers(rawTransfers);
    const cleanMovements = sanitizeMovements(rawMovements);
    if(Object.keys(cleanIng).length) INGREDIENTS = applyInventoryLocations(rawInventory, cleanIng);
    if(Object.keys(cleanRec).length) RECIPES = cleanRec;
    if(cleanTransfers.length) TRANSFERS = cleanTransfers;
    if(cleanMovements.length) MOVEMENTS = cleanMovements;
    persist();
    persistTransfers();
    persistMovements();
    renderPosIfAvailable();
    return !!(Object.keys(cleanIng).length || Object.keys(cleanRec).length || cleanTransfers.length || cleanMovements.length);
  }
  function loadRemoteOnce(){
    const database = db();
    if(!database) return Promise.resolve(false);
    const paths = stockPaths();
    return Promise.all([
      database.ref(paths.ingredients).get(),
      database.ref(paths.recipes).get(),
      database.ref(paths.transfers).get(),
      database.ref(paths.inventory).get(),
      database.ref(paths.movements).get()
    ]).then(([ingSnap, recSnap, transferSnap, inventorySnap, movementSnap])=> applyRemoteStock(ingSnap.val(), recSnap.val(), transferSnap.val(), inventorySnap.val(), movementSnap.val()))
      .catch(e=>{
        console.warn('stock remote load failed:', e && e.message);
        return false;
      });
  }

  function migrateLegacyIngredients(raw){
    const src = raw && typeof raw === 'object' ? raw : {};
    const out = {};
    Object.entries(src).forEach(([id, v])=>{
      if(!v || typeof v !== 'object') return;
      const key = normalizeId(id);
      if(!key) return;
      const qty = num(v.qty, null);
      if(qty === null) return;
      out[key] = sanitizeIngredient({
        name: v.name || key,
        category: 'general',
        unit: v.unit || '',
        track_stock: true,
        stock_location: 'foodtruck',
        current_stock_storage: 0,
        current_stock_foodtruck: qty,
        moq_storage: 0,
        moq_foodtruck: Math.ceil(qty * 0.2)
      }, key);
    });
    return out;
  }

  function load(){
    INGREDIENTS = sanitizeIngredients(clone(DEFAULTS.ingredients));
    RECIPES = clone(DEFAULTS.recipes);
    loadTransfers();
    loadMovements();
    try{
      const raw = localStorage.getItem(KEY);
      if(!raw){ loadRemoteOnce(); return; }
      const parsed = JSON.parse(raw);
      if(parsed && !parsed.ingredients && !parsed.recipes){
        const migrated = migrateLegacyIngredients(parsed);
        if(Object.keys(migrated).length) INGREDIENTS = syncAllIngredientStock(migrated);
        persist();
        persistRemoteSoon();
        loadRemoteOnce();
        return;
      }
      const cleanIng = sanitizeIngredients(parsed && parsed.ingredients);
      const cleanRec = sanitizeRecipes(parsed && parsed.recipes);
      if(Object.keys(cleanIng).length) INGREDIENTS = syncAllIngredientStock(cleanIng);
      if(Object.keys(cleanRec).length) RECIPES = cleanRec;
    }catch(e){ localStorage.removeItem(KEY); }
    loadRemoteOnce();
  }

  function persist(){ localStorage.setItem(KEY, JSON.stringify({ ingredients: INGREDIENTS, recipes: RECIPES })); }
  function loadTransfers(){
    try{
      const parsed = JSON.parse(localStorage.getItem(TRANSFERS_KEY) || '[]');
      TRANSFERS = Array.isArray(parsed) ? parsed.filter(t=> t && typeof t === 'object').slice(-100) : [];
    }catch(e){ TRANSFERS = []; localStorage.removeItem(TRANSFERS_KEY); }
  }
  function persistTransfers(){ localStorage.setItem(TRANSFERS_KEY, JSON.stringify(TRANSFERS.slice(-100))); }
  function loadMovements(){
    try{
      const parsed = JSON.parse(localStorage.getItem(MOVEMENTS_KEY) || '[]');
      MOVEMENTS = sanitizeMovements(parsed);
    }catch(e){ MOVEMENTS = []; localStorage.removeItem(MOVEMENTS_KEY); }
  }
  function persistMovements(){ localStorage.setItem(MOVEMENTS_KEY, JSON.stringify(MOVEMENTS.slice(-200))); }
  function reset(){ INGREDIENTS = sanitizeIngredients(clone(DEFAULTS.ingredients)); RECIPES = clone(DEFAULTS.recipes); localStorage.removeItem(KEY); persistRemoteSoon(); }
  function resetEditor(mode){
    if(mode === 'recipes'){
      const next = clone(RECIPES);
      Object.keys(next).forEach(id=>{
        const product = (window.BK_DATA.BASE || []).find(row=>row.id === id);
        if(product && product.cat !== 'extra' && product.cat !== 'sauce') delete next[id];
      });
      Object.entries(DEFAULTS.recipes || {}).forEach(([id, recipe])=>{
        const product = (window.BK_DATA.BASE || []).find(row=>row.id === id);
        if(product && product.cat !== 'extra' && product.cat !== 'sauce') next[id] = clone(recipe);
      });
      RECIPES = next;
    }else if(mode === 'addons'){
      const next = clone(RECIPES);
      Object.keys(next).forEach(id=>{
        const product = (window.BK_DATA.BASE || []).find(row=>row.id === id);
        if(product && (product.cat === 'extra' || product.cat === 'sauce')) delete next[id];
      });
      Object.entries(DEFAULTS.recipes || {}).forEach(([id, recipe])=>{
        const product = (window.BK_DATA.BASE || []).find(row=>row.id === id);
        if(product && (product.cat === 'extra' || product.cat === 'sauce')) next[id] = clone(recipe);
      });
      RECIPES = next;
    }else{
      INGREDIENTS = sanitizeIngredients(clone(DEFAULTS.ingredients));
    }
    persist();
    persistRemoteSoon();
  }

  function getSnapshot(slots){
    const usage = usageForSlots(slots);
    return Object.entries(INGREDIENTS).map(([id, def])=>{
      const used = usage[id] || 0;
      const storageStart = Number(def.current_stock_storage) || 0;
      const truckStart = Number(def.current_stock_foodtruck) || 0;
      const leftTruck = Math.max(0, truckStart - used);
      const shortage = Math.max(0, used - truckStart);
      const leftStorage = storageStart;
      const refillNeeded = def.track_stock && (shortage > 0 || leftTruck <= (Number(def.moq_foodtruck) || 0));
      const buyNeeded = def.track_stock && leftStorage <= (Number(def.moq_storage) || 0);
      return { id, name: def.name, unit: def.unit || '', used, leftTruck, leftStorage, shortage, refillNeeded, buyNeeded, track: def.track_stock };
    });
  }

  function consumeSlot(slot){
    if(!slot || !Array.isArray(slot.items) || !slot.items.length) return { ok:false, message:'No order items to consume.' };
    const usage = usageForSlots([slot]);
    const orderNo = slot.orderNo || slot.name || 'order';
    const ts = Date.now();
    const movements = [];
    Object.entries(usage).forEach(([id, qty])=>{
      const amount = Number(qty);
      const def = INGREDIENTS[id];
      if(!def || !Number.isFinite(amount) || amount <= 0 || def.track_stock === false) return;
      const before = num(def.current_stock_foodtruck, 0);
      const consumed = Math.min(before, amount);
      const shortage = Math.max(0, amount - before);
      def.current_stock_foodtruck = Math.max(0, before - amount);
      syncIngredientStock(def);
      movements.push({
        id: `mv_${ts}_${Math.random().toString(36).slice(2, 8)}`,
        ts,
        type: 'sale_consumption',
        location: 'block_factory',
        ingredient_id: id,
        ingredient_name: def.name || id,
        qty: amount,
        consumed,
        shortage,
        before,
        after: def.current_stock_foodtruck,
        unit: def.unit || '',
        order_no: orderNo
      });
    });
    if(!movements.length) return { ok:true, message:'No tracked ingredients to consume.' };
    MOVEMENTS = MOVEMENTS.concat(movements).slice(-200);
    persist();
    persistMovements();
    persistRemoteSoon();
    renderPosIfAvailable();
    const shortageCount = movements.filter(m=>m.shortage > 0).length;
    return { ok:true, movements, shortageCount, message: shortageCount ? `Stock consumed from BurgerKiss Block Factory with ${shortageCount} shortage warning(s).` : 'Stock consumed from BurgerKiss Block Factory.' };
  }

  function getUsageForSlot(slot){
    if(!slot || !Array.isArray(slot.items) || !slot.items.length) return {};
    return usageForSlots([slot]);
  }
  function getIngredients(){ return clone(INGREDIENTS); }

  function ingredientRowHtml(id, def){
    const locationOptions = ['storage', 'foodtruck', 'both'].map(loc=>
      `<option value="${loc}" ${def.stock_location===loc?'selected':''}>${locationLabel(loc)}</option>`
    ).join('');
    return `<article class="stock-ingredient-card" data-ing-row>
      <div class="stock-ingredient-head">
        <div class="stock-field stock-field-id">
          <label>ID</label>
          <input data-field="id" value="${id}" placeholder="ingredient_id">
        </div>
        <div class="stock-field stock-field-name">
          <label>Name</label>
          <input data-field="name" value="${def.name || ''}" placeholder="Name">
        </div>
        <div class="stock-field">
          <label>Category</label>
          <input data-field="category" value="${def.category || ''}" placeholder="category">
        </div>
        <div class="stock-field stock-field-unit">
          <label>Unit</label>
          <input data-field="unit" value="${def.unit || ''}" placeholder="unit">
        </div>
        <div class="stock-field stock-field-location">
          <label>Available at</label>
          <select data-field="stock_location">${locationOptions}</select>
        </div>
        <label class="stock-track"><input data-field="track_stock" type="checkbox" ${def.track_stock !== false ? 'checked' : ''}> Track</label>
        <button class="mini" data-remove>Delete</button>
      </div>
      <div class="stock-location-grid">
        <section class="stock-location-card stock-location-store">
          <div class="stock-location-title">
            <span>BurgerKiss Store</span>
            <small>Main warehouse</small>
          </div>
          <div class="stock-location-fields">
            <label>Current stock
              <input data-field="current_stock_storage" type="number" min="0" step="1" value="${num(def.current_stock_storage,0)}">
            </label>
            <label>Minimum stock
              <input data-field="moq_storage" type="number" min="0" step="1" value="${num(def.moq_storage,0)}">
            </label>
          </div>
        </section>
        <section class="stock-location-card stock-location-branch">
          <div class="stock-location-title">
            <span>BurgerKiss Block Factory</span>
            <small>Restaurant / production stock</small>
          </div>
          <div class="stock-location-fields">
            <label>Current stock
              <input data-field="current_stock_foodtruck" type="number" min="0" step="1" value="${num(def.current_stock_foodtruck,0)}">
            </label>
            <label>Minimum stock
              <input data-field="moq_foodtruck" type="number" min="0" step="1" value="${num(def.moq_foodtruck,0)}">
            </label>
          </div>
        </section>
      </div>
    </article>`;
  }

  function recipeRowHtml(p, ingredientOptions){
    const recipe = RECIPES[p.id] || {};
    const ingredients = Object.entries(recipe).map(([id, qty])=>{
      const def = INGREDIENTS[id] || {};
      return `<span class="recipe-ingredient-chip"><b>${def.name || id}</b><span>${qty} ${def.unit || ''}</span><button type="button" data-recipe-remove="${id}" aria-label="Remove ${def.name || id}">×</button></span>`;
    }).join('');
    return `<article class="admin-recipe-card" data-recipe-row>
      <header><div><h4>${p.name}</h4><small>${p.id}</small></div><span class="admin-count-badge">${Object.keys(recipe).length} ingredients</span></header>
      <div class="recipe-ingredient-list" data-recipe-list>${ingredients || '<span class="admin-empty-inline">No ingredients configured</span>'}</div>
      <div class="recipe-add-row">
            <select data-recipe-ing>${ingredientOptions}</select>
            <input data-recipe-qty type="number" min="0.25" step="0.25" value="1">
            <button class="x" type="button" data-recipe-add>Add ingredient</button>
      </div>
      <details class="admin-advanced"><summary>Advanced raw recipe</summary><input data-product-id="${p.id}" data-recipe-input placeholder="ingredient_id:qty, ingredient_id2:qty" value="${recipeToText(recipe)}"></details>
    </article>`;
  }
  function bindRecipeBuilder(body){
    const refreshCard = row=>{
      const input = row.querySelector('[data-recipe-input]');
      const product = {id:input.dataset.productId, name:row.querySelector('h4').textContent};
      const replacement = document.createElement('div');
      replacement.innerHTML = recipeRowHtml(product, row.querySelector('[data-recipe-ing]').innerHTML);
      row.replaceWith(replacement.firstElementChild);
      bindRecipeBuilder(body);
    };
    body.querySelectorAll('[data-recipe-row]').forEach(row=>{
      const addBtn = row.querySelector('[data-recipe-add]');
      if(!addBtn) return;
      addBtn.onclick = ()=>{
        const input = row.querySelector('[data-recipe-input]');
        const ing = row.querySelector('[data-recipe-ing]').value;
        const qty = Number(row.querySelector('[data-recipe-qty]').value);
        if(!ing || !Number.isFinite(qty) || qty <= 0) return;
        const parsed = parseRecipeText(input.value);
        parsed[ing] = qty;
        input.value = recipeToText(parsed);
        refreshCard(row);
      };
      row.querySelectorAll('[data-recipe-remove]').forEach(button=>{
        button.onclick = ()=>{
          const input = row.querySelector('[data-recipe-input]');
          const parsed = parseRecipeText(input.value);
          delete parsed[button.dataset.recipeRemove];
          input.value = recipeToText(parsed);
          refreshCard(row);
        };
      });
    });
  }
  function bindIngredientActions(body){ body.querySelectorAll('[data-remove]').forEach(btn=>{ btn.onclick = ()=>{ const row = btn.closest('[data-ing-row]'); if(row) row.remove(); }; }); }

  function ingredientCategoryLabel(category){
    return String(category || 'general').replace(/(^|[_-])([a-z])/g,(_,separator,letter)=>`${separator ? ' ' : ''}${letter.toUpperCase()}`);
  }
  function renderIngredientGroups(body){
    const entries = Object.entries(INGREDIENTS);
    const categories = Array.from(new Set(entries.map(([, def])=>String(def.category || 'general')))).sort();
    body.innerHTML = categories.map(category=>{
      const rows = entries
        .filter(([, def])=>String(def.category || 'general') === category)
        .sort(([, a],[, b])=>String(a.name || '').localeCompare(String(b.name || '')));
      return `<section class="admin-category-group" data-ingredient-category="${category}">
        <header><div><h4>${ingredientCategoryLabel(category)}</h4><small>${rows.length} ${rows.length === 1 ? 'ingredient' : 'ingredients'}</small></div><span>Sorted by name</span></header>
        <div class="stock-ingredient-category">${rows.map(([id, def])=>ingredientRowHtml(id, def)).join('')}</div>
      </section>`;
    }).join('');
  }


  function readIngredientsFromEditor(body){
    if(!body || !body.querySelector('[data-ing-row]')) return null;
    const ingNext = {};
    body.querySelectorAll('[data-ing-row]').forEach(row=>{
      const id = normalizeId(row.querySelector('[data-field="id"]').value);
      if(!id) return;
      const clean = sanitizeIngredient({
        name: row.querySelector('[data-field="name"]').value,
        category: row.querySelector('[data-field="category"]').value,
        unit: row.querySelector('[data-field="unit"]').value,
        stock_location: row.querySelector('[data-field="stock_location"]').value,
        current_stock_storage: row.querySelector('[data-field="current_stock_storage"]').value,
        current_stock_foodtruck: row.querySelector('[data-field="current_stock_foodtruck"]').value,
        moq_storage: row.querySelector('[data-field="moq_storage"]').value,
        moq_foodtruck: row.querySelector('[data-field="moq_foodtruck"]').value,
        track_stock: row.querySelector('[data-field="track_stock"]').checked
      }, id);
      if(clean) ingNext[id] = clean;
    });
    return Object.keys(ingNext).length ? ingNext : null;
  }

  function transferRowHtml(t){
    const when = t && t.ts ? new Date(t.ts).toLocaleString() : '';
    return `<div class="stock-transfer-row">
      <span><b>${t.ingredient_name || t.ingredient_id}</b> <small>${when}</small></span>
      <span>${t.qty} ${t.unit || ''} · BurgerKiss Store → BurgerKiss Block Factory</span>
    </div>`;
  }

  function renderTransferHistory(){
    const list = document.getElementById('stockTransferHistory');
    if(!list) return;
    const recent = TRANSFERS.slice(-5).reverse();
    list.innerHTML = recent.length
      ? recent.map(transferRowHtml).join('')
      : '<div class="empty-state">No transfers yet.</div>';
  }

  function transferPanelHtml(){
    const options = Object.entries(INGREDIENTS).map(([id, def])=>
      `<option value="${id}">${def.name || id} (${num(def.current_stock_storage,0)} ${def.unit || ''} in Store)</option>`
    ).join('');
    return `<section class="stock-transfer-panel">
      <div class="stock-transfer-copy">
        <h4>Transfer / Replenishment</h4>
        <p>Moves stock from BurgerKiss Store to BurgerKiss Block Factory and syncs both location inventory records.</p>
      </div>
      <div class="stock-transfer-form">
        <label>Article
          <select id="stockTransferIngredient">${options}</select>
        </label>
        <label>Quantity
          <input id="stockTransferQty" type="number" min="0" step="1" placeholder="0">
        </label>
        <button class="x" id="stockTransferBtn" type="button">Transfer stock</button>
      </div>
      <div class="stock-transfer-note" id="stockTransferNote">From: BurgerKiss Store · To: BurgerKiss Block Factory</div>
      <div class="stock-transfer-history" id="stockTransferHistory"></div>
    </section>`;
  }

  function applyTransfer(ingredientId, qty){
    const id = normalizeId(ingredientId);
    const amount = Number(qty);
    const def = INGREDIENTS[id];
    if(!def) return { ok:false, message:'Choose a valid ingredient.' };
    if(!Number.isFinite(amount) || amount <= 0) return { ok:false, message:'Enter a transfer quantity greater than 0.' };
    const storeQty = num(def.current_stock_storage, 0);
    if(amount > storeQty) return { ok:false, message:`Not enough stock in BurgerKiss Store. Available: ${storeQty} ${def.unit || ''}.` };
    def.current_stock_storage = storeQty - amount;
    def.current_stock_foodtruck = num(def.current_stock_foodtruck, 0) + amount;
    syncIngredientStock(def);
    const transfer = {
      id: `tr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      ts: Date.now(),
      ingredient_id: id,
      ingredient_name: def.name || id,
      from: 'storage',
      to: 'foodtruck',
      qty: amount,
      unit: def.unit || ''
    };
    TRANSFERS.push(transfer);
    TRANSFERS = TRANSFERS.slice(-100);
    persist();
    persistTransfers();
    persistRemoteSoon();
    renderPosIfAvailable();
    return { ok:true, message:`Transferred ${amount} ${def.unit || ''} ${def.name || id} to BurgerKiss Block Factory.` };
  }

  function bindTransferActions(body){
    const btn = document.getElementById('stockTransferBtn');
    if(!btn) return;
    renderTransferHistory();
    btn.onclick = ()=>{
      const latestIngredients = readIngredientsFromEditor(body);
      if(latestIngredients) INGREDIENTS = latestIngredients;
      const select = document.getElementById('stockTransferIngredient');
      const qtyInput = document.getElementById('stockTransferQty');
      const note = document.getElementById('stockTransferNote');
      const result = applyTransfer(select && select.value, qtyInput && qtyInput.value);
      if(note){
        note.textContent = result.message;
        note.className = `stock-transfer-note ${result.ok ? 'ok' : 'error'}`;
      }
      if(!result.ok) return;
      const row = Array.from(body.querySelectorAll('[data-ing-row]')).find(el=> normalizeId(el.querySelector('[data-field="id"]').value) === normalizeId(select.value));
      const def = INGREDIENTS[normalizeId(select.value)];
      if(row && def){
        row.querySelector('[data-field="current_stock_storage"]').value = num(def.current_stock_storage, 0);
        row.querySelector('[data-field="current_stock_foodtruck"]').value = num(def.current_stock_foodtruck, 0);
      }
      if(qtyInput) qtyInput.value = '';
      renderTransferHistory();
    };
  }

  function openEditor(mode, options){
    const config = options || {};
    editorBodyId = config.bodyId || 'stockBody';
    editorModalId = Object.prototype.hasOwnProperty.call(config, 'modalId') ? config.modalId : 'modalStock';
    const body = document.getElementById(editorBodyId); if(!body) return;
    const titleEl = config.titleId ? document.getElementById(config.titleId) : document.getElementById('stockModalTitle');
    const productList = Array.isArray(window.BK_DATA && BK_DATA.BASE) ? BK_DATA.BASE : [];
    const activeMode = mode || 'stock';
    const showIngredients = activeMode === 'stock' || activeMode === 'ingredients';
    const showTransfers = activeMode === 'stock';
    const showRecipes = activeMode === 'recipes' || activeMode === 'addons';
    if(titleEl){
      titleEl.textContent = activeMode === 'ingredients'
        ? 'Ingredients'
        : activeMode === 'recipes'
          ? 'Product recipes'
          : activeMode === 'addons'
            ? 'Add-ons'
            : 'Stock overview';
    }
    const recipeProducts = activeMode === 'addons'
      ? productList.filter(p=> p && (p.cat === 'extra' || p.cat === 'sauce'))
      : productList.filter(p=> p && p.cat !== 'extra' && p.cat !== 'sauce');
    body.innerHTML = `
      ${showIngredients ? `<div class="stock-editor-intro">
        <div>
          <h4>Stock locations</h4>
          <p>${showTransfers ? 'Review stock at both locations and transfer inventory to the Block Factory.' : 'Manage ingredient details, units, locations, and minimum stock levels.'}</p>
        </div>
        <div class="stock-tabs" aria-label="Stock location sections">
          <span>BurgerKiss Store</span>
          <span>BurgerKiss Block Factory</span>
        </div>
      </div>
      <div class="stock-section-head">
        <div>
          <h4>Ingredients</h4>
          <p>Each ingredient has separate stock and minimum levels for the main warehouse and the Block Factory.</p>
        </div>
        <button class="x" id="sAddIngredient">+ Ingredient</button>
      </div>
      ${showTransfers ? transferPanelHtml() : ''}
      <div id="stockIngredients" class="stock-ingredients-list"></div>` : ''}
      ${showRecipes ? `<div class="admin-editor-intro"><div><h4>${activeMode === 'addons' ? 'Add-on recipes' : 'Product recipes'}</h4><p>Choose ingredients and quantities. Technical recipe text remains available under Advanced.</p></div></div><div id="stockRecipes"></div>` : ''}
    `;
    if(showIngredients){
      const ingWrap = document.getElementById('stockIngredients');
      renderIngredientGroups(ingWrap);
      bindIngredientActions(ingWrap);
      if(showTransfers) bindTransferActions(body);
      document.getElementById('sAddIngredient').onclick = ()=>{
        let generalGroup = ingWrap.querySelector('[data-ingredient-category="general"] .stock-ingredient-category');
        if(!generalGroup){
          ingWrap.insertAdjacentHTML('beforeend', '<section class="admin-category-group" data-ingredient-category="general"><header><div><h4>General</h4><small>New ingredient</small></div></header><div class="stock-ingredient-category"></div></section>');
          generalGroup = ingWrap.querySelector('[data-ingredient-category="general"] .stock-ingredient-category');
        }
        generalGroup.insertAdjacentHTML('beforeend', ingredientRowHtml('', {name:'', category:'general', unit:'', track_stock:true, stock_location:'both', current_stock_storage:0, current_stock_foodtruck:0, moq_storage:0, moq_foodtruck:0}));
        bindIngredientActions(ingWrap);
        generalGroup.lastElementChild.querySelector('[data-field="name"]').focus();
      };
    }
    if(showRecipes){
      const recipeWrap = document.getElementById('stockRecipes');
      const ingredientOptions = Object.entries(INGREDIENTS).map(([id, def])=> `<option value="${id}">${def.name || id} (${id})</option>`).join('');
      const categoryLabels = {burger:'Burgers',wings:'Wings',fries:'Fries',salad:'Salads',drink:'Drinks',extra:'Add-ons',sauce:'Sauces'};
      recipeWrap.innerHTML = Object.entries(categoryLabels).map(([cat,label])=>{
        const rows = recipeProducts.filter(product=>product.cat === cat).sort((a,b)=>Number(a.categoryOrder||0)-Number(b.categoryOrder||0));
        return rows.length ? `<section class="admin-category-group"><header><div><h4>${label}</h4><small>${rows.length} recipes</small></div></header><div class="admin-recipe-grid">${rows.map(p=>recipeRowHtml(p, ingredientOptions)).join('')}</div></section>` : '';
      }).join('');
      bindRecipeBuilder(recipeWrap);
    }
    const modal = editorModalId ? document.getElementById(editorModalId) : null;
    if(modal && config.showModal !== false) modal.classList.add('open');
  }

  function closeEditor(){ const modal = editorModalId ? document.getElementById(editorModalId) : null; if(modal) modal.classList.remove('open'); }

  function saveEditor(){
    const body = document.getElementById(editorBodyId); if(!body) return false;
    const ingNext = readIngredientsFromEditor(body) || clone(INGREDIENTS);
    if(!Object.keys(ingNext).length) return false;
    const recipeInputs = body.querySelectorAll('[data-recipe-input]');
    const recipeNext = clone(RECIPES);
    recipeInputs.forEach(inp=>{ const pid = normalizeId(inp.dataset.productId); if(!pid) return; const parsed = parseRecipeText(inp.value); const filtered = {}; Object.entries(parsed).forEach(([iid, qty])=>{ if(ingNext[iid]) filtered[iid] = qty; }); recipeNext[pid] = filtered; });
    INGREDIENTS = syncAllIngredientStock(ingNext); RECIPES = recipeNext; persist(); persistRemoteSoon(); closeEditor(); return true;
  }

  window.BK_STOCK = { KEY, TRANSFERS_KEY, MOVEMENTS_KEY, load, loadRemoteOnce, reset, resetEditor, getSnapshot, getIngredients, getUsageForSlot, consumeSlot, openEditor, closeEditor, save:saveEditor, saveEditor, remoteEnabled, stockPaths };
})();
