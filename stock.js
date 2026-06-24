(function(){
  const KEY = 'bk_stock_v1';
  const TRANSFERS_KEY = 'bk_stock_transfers_v1';
  const MOVEMENTS_KEY = 'bk_stock_movements_v1';
  const PURCHASES_KEY = 'bk_stock_purchases_v1';
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
    recipeToText,
    convertPurchaseQuantity
  } = window.BK_STOCK_UTILS;
  let INGREDIENTS = {};
  let RECIPES = {};
  let TRANSFERS = [];
  let MOVEMENTS = [];
  let PURCHASES = [];
  let remoteSaveTimer = null;
  let editorBodyId = 'stockBody';
  let editorModalId = 'modalStock';

  function clone(x){ return JSON.parse(JSON.stringify(x)); }
  const {
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
  } = window.BK_STOCK_REMOTE;

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
  function sanitizePurchases(raw){
    const src = raw && Array.isArray(raw.items) ? raw.items : raw;
    if(!Array.isArray(src)) return [];
    return src.filter(p=> p && typeof p === 'object' && p.ingredient_id && Number.isFinite(Number(p.qty))).slice(-200);
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
        database.ref(paths.movements).set({ items: MOVEMENTS.slice(-200), ts }),
        database.ref(paths.purchases).set({ items: PURCHASES.slice(-200), ts })
      ]).catch(e=>{
        console.warn('stock remote save failed:', e && e.message);
      });
    }, 250);
  }
  function renderPosIfAvailable(){
    if(window.BK_UI && typeof BK_UI.renderAll === 'function' && document.getElementById('buttons')) BK_UI.renderAll();
  }
  function applyRemoteStock(rawIngredients, rawRecipes, rawTransfers, rawInventory, rawMovements, rawPurchases){
    const cleanIng = sanitizeIngredients(rawIngredients && rawIngredients.map ? rawIngredients.map : rawIngredients);
    const cleanRec = sanitizeRecipes(rawRecipes && rawRecipes.map ? rawRecipes.map : rawRecipes);
    const cleanTransfers = sanitizeTransfers(rawTransfers);
    const cleanMovements = sanitizeMovements(rawMovements);
    const cleanPurchases = sanitizePurchases(rawPurchases);
    if(Object.keys(cleanIng).length) INGREDIENTS = applyInventoryLocations(rawInventory, cleanIng);
    if(Object.keys(cleanRec).length) RECIPES = cleanRec;
    if(cleanTransfers.length) TRANSFERS = cleanTransfers;
    if(cleanMovements.length) MOVEMENTS = cleanMovements;
    if(cleanPurchases.length) PURCHASES = cleanPurchases;
    persist();
    persistTransfers();
    persistMovements();
    persistPurchases();
    renderPosIfAvailable();
    return !!(Object.keys(cleanIng).length || Object.keys(cleanRec).length || cleanTransfers.length || cleanMovements.length || cleanPurchases.length);
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
      database.ref(paths.movements).get(),
      database.ref(paths.purchases).get()
    ]).then(([ingSnap, recSnap, transferSnap, inventorySnap, movementSnap, purchaseSnap])=> applyRemoteStock(ingSnap.val(), recSnap.val(), transferSnap.val(), inventorySnap.val(), movementSnap.val(), purchaseSnap.val()))
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
    loadPurchases();
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
  function loadPurchases(){
    try{
      const parsed = JSON.parse(localStorage.getItem(PURCHASES_KEY) || '[]');
      PURCHASES = sanitizePurchases(parsed);
    }catch(e){ PURCHASES = []; localStorage.removeItem(PURCHASES_KEY); }
  }
  function persistPurchases(){ localStorage.setItem(PURCHASES_KEY, JSON.stringify(PURCHASES.slice(-200))); }
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
  function getPurchases(){ return clone(PURCHASES); }
  function getOperatingSupplies(){
    return Object.entries(INGREDIENTS).filter(([, def])=>def && (def.operating_supply || def.category === 'operating_supply')).map(([id, def])=>{
      const purchases = PURCHASES.filter(entry=>entry.ingredient_id === id).sort((a,b)=>(b.ts || 0) - (a.ts || 0));
      const lastPurchase = purchases[0] || null;
      return Object.assign({ id, lastPurchase }, clone(def));
    });
  }
  function recordPurchase(input){
    const rawName = String((input && input.name) || '').trim();
    const id = normalizeId((input && input.ingredientId) || rawName);
    const amount = Number(input && input.amount);
    if(!id || !rawName) return {ok:false, message:'Choose or enter an item.'};
    if(!Number.isFinite(amount) || amount < 0) return {ok:false, message:'Enter the purchase amount.'};
    if(!(input && input.receiptInPurse)) return {ok:false, message:'Confirm that the receipt is in the purse.'};
    const unit = String((input && input.unit) || (INGREDIENTS[id] && INGREDIENTS[id].unit) || 'pcs').trim() || 'pcs';
    const before = num(INGREDIENTS[id] && INGREDIENTS[id].current_stock_foodtruck, 0);
    const def = INGREDIENTS[id] || sanitizeIngredient({name:rawName, category:'general', unit, track_stock:true, stock_location:'foodtruck', current_stock_storage:0, current_stock_foodtruck:0, moq_storage:0, moq_foodtruck:0}, id);
    const converted = convertPurchaseQuantity(def, input);
    if(!converted) return {ok:false, message:'Enter the quantity received.'};
    def.name = rawName;
    def.unit = def.unit || unit;
    def.current_stock_foodtruck = before + converted.qty;
    INGREDIENTS[id] = syncIngredientStock(def);
    const actor = (input && input.purchasedBy && typeof input.purchasedBy === 'object') ? input.purchasedBy : (window.BK_ACCESS && BK_ACCESS.actor ? BK_ACCESS.actor() : null);
    const purchase = {
      id:`pur_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, ts:Date.now(), businessDate:actor && actor.businessDate || '',
      ingredient_id:id, ingredient_name:rawName, qty:converted.qty, unit:def.unit, purchase_qty:converted.originalQty, purchase_unit:converted.originalUnit, conversion_factor:converted.factor, amount, paymentSource:String((input && input.paymentSource) || 'cash_wallet'), receiptInPurse:true, note:String((input && input.note) || ''),
      stockLocation:'block_factory', before, after:def.current_stock_foodtruck, staff:actor
    };
    PURCHASES.push(purchase); PURCHASES = PURCHASES.slice(-200);
    MOVEMENTS.push({id:purchase.id, ts:purchase.ts, type:'purchase', ingredient_id:id, ingredient_name:rawName, qty:converted.qty, unit:def.unit, before, after:def.current_stock_foodtruck});
    MOVEMENTS = MOVEMENTS.slice(-200);
    persist(); persistMovements(); persistPurchases(); persistRemoteSoon(); renderPosIfAvailable();
    return {ok:true, purchase};
  }
  function getRecipe(productId){ return clone(RECIPES[productId] || {}); }
  function setRecipes(changes, removedIds, options){
    (removedIds || []).forEach(productId=>{ delete RECIPES[normalizeId(productId)]; });
    Object.entries(changes || {}).forEach(([productId, recipe])=>{
      RECIPES[normalizeId(productId)] = sanitizeRecipes({[productId]:recipe})[normalizeId(productId)] || {};
    });
    persist();
    if(!(options && options.localOnly)) persistRemoteSoon();
    renderPosIfAvailable();
    return true;
  }
  function getRecipes(){ return clone(RECIPES); }

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

  function textEl(tag, text, className){
    const el = document.createElement(tag);
    if(className) el.className = className;
    el.textContent = text == null ? '' : String(text);
    return el;
  }
  function ingredientOption(id, def){
    const option = document.createElement('option');
    option.value = id;
    option.textContent = `${def.name || id} (${id})`;
    return option;
  }
  function renderRecipeChips(list, recipe){
    const entries = Object.entries(recipe || {});
    if(!entries.length){
      list.replaceChildren(textEl('span', 'No ingredients configured', 'admin-empty-inline'));
      return;
    }
    list.replaceChildren(...entries.map(([id, qty])=>{
      const def = INGREDIENTS[id] || {};
      const chip = document.createElement('span');
      chip.className = 'recipe-ingredient-chip';
      const remove = textEl('button', '×');
      remove.type = 'button';
      remove.dataset.recipeRemove = id;
      remove.setAttribute('aria-label', `Remove ${def.name || id}`);
      chip.append(textEl('b', def.name || id), textEl('span', `${qty} ${def.unit || ''}`), remove);
      return chip;
    }));
  }
  function recipeRowNode(p){
    const recipe = RECIPES[p.id] || {};
    const article = document.createElement('article');
    article.className = 'admin-recipe-card';
    article.dataset.recipeRow = '';
    const header = document.createElement('header');
    const copy = document.createElement('div');
    copy.append(textEl('h4', p.name), textEl('small', p.id));
    header.append(copy, textEl('span', `${Object.keys(recipe).length} ingredients`, 'admin-count-badge'));
    const list = document.createElement('div');
    list.className = 'recipe-ingredient-list';
    list.dataset.recipeList = '';
    renderRecipeChips(list, recipe);
    const addRow = document.createElement('div');
    addRow.className = 'recipe-add-row';
    const select = document.createElement('select');
    select.dataset.recipeIng = '';
    select.replaceChildren(...Object.entries(INGREDIENTS).map(([id, def])=>ingredientOption(id, def)));
    const qty = document.createElement('input');
    qty.dataset.recipeQty = '';
    qty.type = 'number';
    qty.min = '0.25';
    qty.step = '0.25';
    qty.value = '1';
    const add = textEl('button', 'Add ingredient', 'x');
    add.type = 'button';
    add.dataset.recipeAdd = '';
    addRow.append(select, qty, add);
    const advanced = document.createElement('details');
    advanced.className = 'admin-advanced';
    const input = document.createElement('input');
    input.dataset.productId = p.id;
    input.dataset.recipeInput = '';
    input.placeholder = 'ingredient_id:qty, ingredient_id2:qty';
    input.value = recipeToText(recipe);
    advanced.append(textEl('summary', 'Advanced raw recipe'), input);
    article.append(header, list, addRow, advanced);
    return article;
  }
  function bindRecipeBuilder(body){
    const refreshCard = row=>{
      const input = row.querySelector('[data-recipe-input]');
      const product = {id:input.dataset.productId, name:row.querySelector('h4').textContent};
      row.replaceWith(recipeRowNode(product));
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
  function normalizeIngredientSearch(value){
    return String(value || '').trim().toLowerCase();
  }

  function renderIngredientGroups(body, query){
    const search = normalizeIngredientSearch(query);
    const entries = Object.entries(INGREDIENTS).filter(([id, def])=>{
      if(!search) return true;
      return [id, def.name, def.category, def.unit].some(value=>String(value || '').toLowerCase().includes(search));
    });
    const categories = Array.from(new Set(entries.map(([, def])=>String(def.category || 'general')))).sort();
    if(!entries.length){
      body.innerHTML = '<div class="empty-state">No matching ingredients.</div>';
      return;
    }
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
    const searchInput = body.querySelector('#stockIngredientSearch');
    const hasActiveSearch = !!(searchInput && normalizeIngredientSearch(searchInput.value));
    const ingNext = hasActiveSearch ? clone(INGREDIENTS) : {};
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
    const showIngredients = activeMode === 'stock';
    const showTransfers = activeMode === 'stock';
    const showRecipes = activeMode === 'recipes' || activeMode === 'addons';
    if(titleEl){
      titleEl.textContent = activeMode === 'recipes'
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
          <p>Review stock at both locations, transfer inventory to the Block Factory, and maintain ingredient details in one place.</p>
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
        <div class="stock-search-actions">
          <label class="stock-search"><span class="sr-only">Search ingredients</span><input id="stockIngredientSearch" type="search" placeholder="Search ingredients..." autocomplete="off"></label>
          <button class="x" id="sAddIngredient">+ Ingredient</button>
        </div>
      </div>
      ${showTransfers ? transferPanelHtml() : ''}
      <div id="stockIngredients" class="stock-ingredients-list"></div>` : ''}
      ${showRecipes ? `<div class="admin-editor-intro"><div><h4>${activeMode === 'addons' ? 'Add-on recipes' : 'Product recipes'}</h4><p>Choose ingredients and quantities. Technical recipe text remains available under Advanced.</p></div></div><div id="stockRecipes"></div>` : ''}
    `;
    if(showIngredients){
      const ingWrap = document.getElementById('stockIngredients');
      const searchInput = document.getElementById('stockIngredientSearch');
      const refreshIngredients = ()=>{
        renderIngredientGroups(ingWrap, searchInput && searchInput.value);
        bindIngredientActions(ingWrap);
      };
      refreshIngredients();
      if(searchInput) searchInput.oninput = refreshIngredients;
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
      const categoryLabels = {burger:'Burgers',wings:'Wings',fries:'Fries',salad:'Salads',drink:'Drinks',extra:'Add-ons',sauce:'Sauces'};
      const sections = Object.entries(categoryLabels).map(([cat,label])=>{
        const rows = recipeProducts.filter(product=>product.cat === cat).sort((a,b)=>Number(a.categoryOrder||0)-Number(b.categoryOrder||0));
        if(!rows.length) return null;
        const section = document.createElement('section');
        section.className = 'admin-category-group';
        const header = document.createElement('header');
        const copy = document.createElement('div');
        copy.append(textEl('h4', label), textEl('small', `${rows.length} recipes`));
        header.appendChild(copy);
        const grid = document.createElement('div');
        grid.className = 'admin-recipe-grid';
        rows.forEach(product=>grid.appendChild(recipeRowNode(product)));
        section.append(header, grid);
        return section;
      }).filter(Boolean);
      recipeWrap.replaceChildren(...sections);
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

  window.BK_STOCK = { KEY, TRANSFERS_KEY, MOVEMENTS_KEY, PURCHASES_KEY, load, loadRemoteOnce, reset, resetEditor, getSnapshot, getIngredients, getPurchases, getOperatingSupplies, recordPurchase, getRecipe, getRecipes, setRecipes, getUsageForSlot, consumeSlot, openEditor, closeEditor, save:saveEditor, saveEditor, remoteEnabled, stockPaths };
})();
