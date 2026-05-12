(function(){
  const KEY = 'bk_stock_v1';
  const DEFAULTS = window.BK_STOCK_DATA.DEFAULTS;
  const {
    normalizeId,
    num,
    locationLabel,
    sanitizeIngredient,
    sanitizeIngredients,
    sanitizeRecipes,
    parseRecipeText,
    recipeToText
  } = window.BK_STOCK_UTILS;
  let INGREDIENTS = {};
  let RECIPES = {};
  let remoteSaveTimer = null;

  function clone(x){ return JSON.parse(JSON.stringify(x)); }
  function remoteEnabled(){
    return !!(window.BK_SYNC_ENABLED !== false && window.FIREBASE_CONFIG && window.firebase && window.firebase.database);
  }
  function stockPaths(){
    return {
      ingredients: (window.BK_STOCK_INGREDIENTS_PATH || '/pos/stock/ingredients').replace(/\/+$/,''),
      recipes: (window.BK_STOCK_RECIPES_PATH || '/pos/stock/recipes').replace(/\/+$/,''),
      inventory: (window.BK_STOCK_INVENTORY_PATH || '/pos/stock/inventory').replace(/\/+$/,''),
      addons: (window.BK_STOCK_ADDONS_PATH || '/pos/stock/addons').replace(/\/+$/,'')
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
  function inventoryFromIngredients(ingredients){
    const out = {};
    Object.entries(ingredients || {}).forEach(([id, def])=>{
      out[id] = {
        current_stock_storage: num(def.current_stock_storage, 0),
        current_stock_foodtruck: num(def.current_stock_foodtruck, 0),
        moq_storage: num(def.moq_storage, 0),
        moq_foodtruck: num(def.moq_foodtruck, 0),
        unit: def.unit || '',
        track_stock: def.track_stock !== false
      };
    });
    return out;
  }
  function addonRecipesFromRecipes(recipes){
    const out = {};
    Object.entries(recipes || {}).forEach(([id, recipe])=>{
      if(String(id).startsWith('x_')) out[id] = recipe;
    });
    return out;
  }
  function persistRemoteSoon(){
    const database = db();
    if(!database) return;
    if(remoteSaveTimer) clearTimeout(remoteSaveTimer);
    remoteSaveTimer = setTimeout(()=>{
      const paths = stockPaths();
      const ts = Date.now();
      Promise.all([
        database.ref(paths.ingredients).set({ map: INGREDIENTS, ts }),
        database.ref(paths.recipes).set({ map: RECIPES, ts }),
        database.ref(paths.inventory).set({ map: inventoryFromIngredients(INGREDIENTS), ts }),
        database.ref(paths.addons).set({ map: addonRecipesFromRecipes(RECIPES), ts })
      ]).catch(e=>{
        console.warn('stock remote save failed:', e && e.message);
      });
    }, 250);
  }
  function renderPosIfAvailable(){
    if(window.BK_UI && typeof BK_UI.renderAll === 'function' && document.getElementById('buttons')) BK_UI.renderAll();
  }
  function applyRemoteStock(rawIngredients, rawRecipes){
    const cleanIng = sanitizeIngredients(rawIngredients && rawIngredients.map ? rawIngredients.map : rawIngredients);
    const cleanRec = sanitizeRecipes(rawRecipes && rawRecipes.map ? rawRecipes.map : rawRecipes);
    if(Object.keys(cleanIng).length) INGREDIENTS = cleanIng;
    if(Object.keys(cleanRec).length) RECIPES = cleanRec;
    persist();
    renderPosIfAvailable();
    return !!(Object.keys(cleanIng).length || Object.keys(cleanRec).length);
  }
  function loadRemoteOnce(){
    const database = db();
    if(!database) return Promise.resolve(false);
    const paths = stockPaths();
    return Promise.all([
      database.ref(paths.ingredients).get(),
      database.ref(paths.recipes).get()
    ]).then(([ingSnap, recSnap])=> applyRemoteStock(ingSnap.val(), recSnap.val()))
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
    INGREDIENTS = clone(DEFAULTS.ingredients);
    RECIPES = clone(DEFAULTS.recipes);
    try{
      const raw = localStorage.getItem(KEY);
      if(!raw){ loadRemoteOnce(); return; }
      const parsed = JSON.parse(raw);
      if(parsed && !parsed.ingredients && !parsed.recipes){
        const migrated = migrateLegacyIngredients(parsed);
        if(Object.keys(migrated).length) INGREDIENTS = migrated;
        persist();
        persistRemoteSoon();
        loadRemoteOnce();
        return;
      }
      const cleanIng = sanitizeIngredients(parsed && parsed.ingredients);
      const cleanRec = sanitizeRecipes(parsed && parsed.recipes);
      if(Object.keys(cleanIng).length) INGREDIENTS = cleanIng;
      if(Object.keys(cleanRec).length) RECIPES = cleanRec;
    }catch(e){ localStorage.removeItem(KEY); }
    loadRemoteOnce();
  }

  function persist(){ localStorage.setItem(KEY, JSON.stringify({ ingredients: INGREDIENTS, recipes: RECIPES })); }
  function reset(){ INGREDIENTS = clone(DEFAULTS.ingredients); RECIPES = clone(DEFAULTS.recipes); localStorage.removeItem(KEY); persistRemoteSoon(); }

  function getSnapshot(slots){
    const usage = {}; Object.keys(INGREDIENTS).forEach(k=>{ usage[k] = 0; });
    (slots || []).forEach(s=>{ (s.items || []).forEach(it=>{ const rec = RECIPES[it.itemId] || {}; Object.entries(rec).forEach(([id, qty])=>{ const n = Number(qty); if(Number.isFinite(n) && n > 0) usage[id] = (usage[id] || 0) + n; }); }); });
    return Object.entries(INGREDIENTS).map(([id, def])=>{
      const used = usage[id] || 0;
      const storageStart = Number(def.current_stock_storage) || 0;
      const truckStart = Number(def.current_stock_foodtruck) || 0;
      const fromTruck = Math.min(truckStart, used);
      const remainingNeed = Math.max(0, used - fromTruck);
      const fromStorage = Math.min(storageStart, remainingNeed);
      const leftTruck = Math.max(0, truckStart - fromTruck);
      const leftStorage = Math.max(0, storageStart - fromStorage);
      const refillNeeded = def.track_stock && leftTruck <= (Number(def.moq_foodtruck) || 0);
      const buyNeeded = def.track_stock && leftStorage <= (Number(def.moq_storage) || 0);
      return { id, name: def.name, unit: def.unit || '', used, leftTruck, leftStorage, refillNeeded, buyNeeded, track: def.track_stock };
    });
  }

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
    return `<div class="row" data-recipe-row>
      <span class="left" style="display:grid;grid-template-columns:1.1fr 1fr;gap:8px;flex:1">
        <span><b>${p.name}</b> <small>(${p.id})</small></span>
        <div>
          <input data-product-id="${p.id}" data-recipe-input placeholder="ingredient_id:qty, ingredient_id2:qty" value="${recipeToText(RECIPES[p.id] || {})}">
          <div style="display:grid;grid-template-columns:1fr 100px auto;gap:6px;margin-top:6px">
            <select data-recipe-ing>${ingredientOptions}</select>
            <input data-recipe-qty type="number" min="0.25" step="0.25" value="1">
            <button class="mini" data-recipe-add>+ Add</button>
          </div>
        </div>
      </span>
    </div>`;
  }
  function bindRecipeBuilder(body){
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
      };
    });
  }
  function bindIngredientActions(body){ body.querySelectorAll('[data-remove]').forEach(btn=>{ btn.onclick = ()=>{ const row = btn.closest('[data-ing-row]'); if(row) row.remove(); }; }); }

  function openEditor(mode){
    const body = document.getElementById('stockBody'); if(!body) return;
    const titleEl = document.getElementById('stockModalTitle');
    const productList = Array.isArray(window.BK_DATA && BK_DATA.BASE) ? BK_DATA.BASE : [];
    const showIngredients = !mode || mode === 'all' || mode === 'ingredients';
    const showRecipes = !mode || mode === 'all' || mode === 'recipes' || mode === 'addons';
    if(titleEl){
      titleEl.textContent = mode === 'ingredients'
        ? 'Edit Ingredients'
        : mode === 'recipes'
          ? 'Edit Product Recipes'
          : mode === 'addons'
            ? 'Edit Add-ons'
            : 'Edit Stock';
    }
    const recipeProducts = mode === 'addons'
      ? productList.filter(p=> p && (p.cat === 'extra' || p.cat === 'sauce'))
      : productList;
    body.innerHTML = `
      ${showIngredients ? `<div class="stock-editor-intro">
        <div>
          <h4>Stock locations</h4>
          <p>Phase 1 keeps the existing data fields, but presents them as real BurgerKiss locations.</p>
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
      <div id="stockIngredients" class="stock-ingredients-list"></div>` : ''}
      ${(showIngredients && showRecipes) ? '<hr style="border:0;border-top:1px solid #2a2f39;margin:16px 0">' : ''}
      ${showRecipes ? `<h4 style="margin:4px 0 8px">${mode === 'addons' ? 'Add-on Recipes' : 'Product Recipes'}</h4><div style="font-size:12px;color:#9aa3ad;margin-bottom:8px">Format: ingredient_id:qty, ingredient_id2:qty</div><div id="stockRecipes"></div>` : ''}
    `;
    if(showIngredients){
      const ingWrap = document.getElementById('stockIngredients');
      ingWrap.innerHTML = Object.entries(INGREDIENTS).map(([id, def])=> ingredientRowHtml(id, def)).join('');
      bindIngredientActions(ingWrap);
      document.getElementById('sAddIngredient').onclick = ()=>{ ingWrap.insertAdjacentHTML('beforeend', ingredientRowHtml('', {name:'', category:'general', unit:'', track_stock:true, stock_location:'both', current_stock_storage:0, current_stock_foodtruck:0, moq_storage:0, moq_foodtruck:0})); bindIngredientActions(ingWrap); };
    }
    if(showRecipes){
      const recipeWrap = document.getElementById('stockRecipes');
      const ingredientOptions = Object.entries(INGREDIENTS).map(([id, def])=> `<option value="${id}">${def.name || id} (${id})</option>`).join('');
      recipeWrap.innerHTML = recipeProducts.map(p=> recipeRowHtml(p, ingredientOptions)).join('');
      bindRecipeBuilder(recipeWrap);
    }
    document.getElementById('modalStock').classList.add('open');
  }

  function closeEditor(){ const modal = document.getElementById('modalStock'); if(modal) modal.classList.remove('open'); }

  function saveEditor(){
    const body = document.getElementById('stockBody'); if(!body) return false;
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
    if(!Object.keys(ingNext).length) return false;
    const recipeNext = {};
    body.querySelectorAll('[data-recipe-input]').forEach(inp=>{ const pid = normalizeId(inp.dataset.productId); if(!pid) return; const parsed = parseRecipeText(inp.value); const filtered = {}; Object.entries(parsed).forEach(([iid, qty])=>{ if(ingNext[iid]) filtered[iid] = qty; }); recipeNext[pid] = filtered; });
    INGREDIENTS = ingNext; RECIPES = recipeNext; persist(); persistRemoteSoon(); closeEditor(); return true;
  }

  window.BK_STOCK = { KEY, load, loadRemoteOnce, reset, getSnapshot, openEditor, closeEditor, saveEditor, remoteEnabled, stockPaths };
})();
