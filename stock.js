(function(){
  const KEY = 'bk_stock_v1';
  const DEFAULTS = {
    ingredients: {
      bun: { name: 'Burger Bun', category: 'bread', unit: 'pcs', track_stock: true, stock_location: 'foodtruck', current_stock_storage: 0, current_stock_foodtruck: 80, moq_storage: 20, moq_foodtruck: 16 },
      beef_patty: { name: 'Beef Patty', category: 'meat', unit: 'pcs', track_stock: true, stock_location: 'both', current_stock_storage: 120, current_stock_foodtruck: 60, moq_storage: 40, moq_foodtruck: 12 },
      cheese_slice: { name: 'Cheese Slice', category: 'dairy', unit: 'pcs', track_stock: true, stock_location: 'both', current_stock_storage: 200, current_stock_foodtruck: 120, moq_storage: 80, moq_foodtruck: 24 },
      chicken_wing: { name: 'Chicken Wing', category: 'meat', unit: 'pcs', track_stock: true, stock_location: 'both', current_stock_storage: 400, current_stock_foodtruck: 300, moq_storage: 120, moq_foodtruck: 60 },
      fries_portion: { name: 'Fries Portion', category: 'sides', unit: 'portion', track_stock: true, stock_location: 'both', current_stock_storage: 150, current_stock_foodtruck: 120, moq_storage: 50, moq_foodtruck: 20 },
      coconut_fresh: { name: 'Coconut Fresh', category: 'drinks', unit: 'pcs', track_stock: true, stock_location: 'both', current_stock_storage: 40, current_stock_foodtruck: 25, moq_storage: 12, moq_foodtruck: 6 },
      soda_can: { name: 'Soft Drink', category: 'drinks', unit: 'pcs', track_stock: true, stock_location: 'both', current_stock_storage: 240, current_stock_foodtruck: 120, moq_storage: 72, moq_foodtruck: 24 },
      ice_tea: { name: 'Ice Tea', category: 'drinks', unit: 'cups', track_stock: true, stock_location: 'foodtruck', current_stock_storage: 0, current_stock_foodtruck: 30, moq_storage: 0, moq_foodtruck: 8 },
      coconut_water_bottle: { name: 'Coconut Water Bottle', category: 'drinks', unit: 'btl', track_stock: true, stock_location: 'both', current_stock_storage: 48, current_stock_foodtruck: 30, moq_storage: 16, moq_foodtruck: 8 },
      beer: { name: 'Beer', category: 'drinks', unit: 'btl', track_stock: true, stock_location: 'both', current_stock_storage: 96, current_stock_foodtruck: 48, moq_storage: 24, moq_foodtruck: 12 },
      egg: { name: 'Egg', category: 'protein', unit: 'pcs', track_stock: true, stock_location: 'both', current_stock_storage: 96, current_stock_foodtruck: 48, moq_storage: 24, moq_foodtruck: 12 },
      bacon_slice: { name: 'Bacon Slice', category: 'protein', unit: 'slice', track_stock: true, stock_location: 'both', current_stock_storage: 200, current_stock_foodtruck: 120, moq_storage: 60, moq_foodtruck: 24 }
    },
    recipes: {
      hamburger: { bun: 1, beef_patty: 1 },
      cheeseburger: { bun: 1, beef_patty: 1, cheese_slice: 1 },
      w6: { chicken_wing: 6 },
      w12: { chicken_wing: 12 },
      w24: { chicken_wing: 24 },
      fr_std: { fries_portion: 1 },
      fr_lg: { fries_portion: 2 },
      x_patty: { beef_patty: 1 },
      x_cheese: { cheese_slice: 1 },
      x_bacon: { bacon_slice: 1 },
      x_egg: { egg: 1 },
      x_omelet: { egg: 2 },
      d_coconut: { coconut_fresh: 1 },
      d_coke: { soda_can: 1 },
      d_fanta_o: { soda_can: 1 },
      d_fanta_l: { soda_can: 1 },
      d_sprite: { soda_can: 1 },
      d_ice_tea: { ice_tea: 1 },
      d_cw_btl: { coconut_water_bottle: 1 },
      d_club_s: { beer: 1 },
      d_club_l: { beer: 1 },
      d_guin: { beer: 1 }
    }
  };

  const STOCK_LOCATIONS = ['storage', 'foodtruck', 'both'];
  let INGREDIENTS = {};
  let RECIPES = {};

  function clone(x){ return JSON.parse(JSON.stringify(x)); }
  function normalizeId(v){ return String(v || '').trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_\-]/g, ''); }
  function num(v, fallback){ const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : fallback; }

  function sanitizeIngredient(v, id){
    if(!v || typeof v !== 'object') return null;
    const name = String(v.name || id).trim() || id;
    const category = String(v.category || 'general').trim() || 'general';
    const unit = String(v.unit || '').trim();
    const stock_location = STOCK_LOCATIONS.includes(v.stock_location) ? v.stock_location : 'both';
    const track_stock = v.track_stock !== false;
    return {
      name,
      category,
      unit,
      track_stock,
      stock_location,
      current_stock_storage: num(v.current_stock_storage, 0),
      current_stock_foodtruck: num(v.current_stock_foodtruck, 0),
      moq_storage: num(v.moq_storage, 0),
      moq_foodtruck: num(v.moq_foodtruck, 0)
    };
  }

  function sanitizeIngredients(raw){
    const src = raw && typeof raw === 'object' ? raw : {};
    const out = {};
    Object.entries(src).forEach(([id, v])=>{
      const key = normalizeId(id);
      if(!key) return;
      const clean = sanitizeIngredient(v, key);
      if(clean) out[key] = clean;
    });
    return out;
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

  function sanitizeRecipes(raw){ const src = raw && typeof raw === 'object' ? raw : {}; const out = {};
    Object.entries(src).forEach(([pid, rec])=>{ const productId = normalizeId(pid); if(!productId || !rec || typeof rec !== 'object') return;
      const nextRec = {}; Object.entries(rec).forEach(([iid, qty])=>{ const ingredientId = normalizeId(iid); const n = Number(qty); if(!ingredientId || !Number.isFinite(n) || n <= 0) return; nextRec[ingredientId] = n; }); out[productId] = nextRec; });
    return out;
  }

  function parseRecipeText(text){ const out = {};
    String(text || '').split(',').map(x=>x.trim()).filter(Boolean).forEach(part=>{ const [rawId, rawQty] = part.split(':').map(x=> String(x||'').trim()); const id = normalizeId(rawId); const qty = Number(rawQty); if(!id || !Number.isFinite(qty) || qty <= 0) return; out[id] = qty; });
    return out;
  }
  function recipeToText(recipe){ return Object.entries(recipe || {}).map(([id, qty])=> `${id}:${qty}`).join(', '); }

  function load(){
    INGREDIENTS = clone(DEFAULTS.ingredients);
    RECIPES = clone(DEFAULTS.recipes);
    try{
      const raw = localStorage.getItem(KEY); if(!raw) return;
      const parsed = JSON.parse(raw);
      if(parsed && !parsed.ingredients && !parsed.recipes){
        const migrated = migrateLegacyIngredients(parsed);
        if(Object.keys(migrated).length) INGREDIENTS = migrated;
        persist();
        return;
      }
      const cleanIng = sanitizeIngredients(parsed && parsed.ingredients);
      const cleanRec = sanitizeRecipes(parsed && parsed.recipes);
      if(Object.keys(cleanIng).length) INGREDIENTS = cleanIng;
      if(Object.keys(cleanRec).length) RECIPES = cleanRec;
    }catch(e){ localStorage.removeItem(KEY); }
  }

  function persist(){ localStorage.setItem(KEY, JSON.stringify({ ingredients: INGREDIENTS, recipes: RECIPES })); }
  function reset(){ INGREDIENTS = clone(DEFAULTS.ingredients); RECIPES = clone(DEFAULTS.recipes); localStorage.removeItem(KEY); }

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
    return `<div class="row" data-ing-row>
      <span class="left" style="display:grid;grid-template-columns:120px 1fr 110px 80px 110px 120px 120px 100px 100px auto;gap:8px;flex:1">
        <input data-field="id" value="${id}" placeholder="ingredient_id">
        <input data-field="name" value="${def.name || ''}" placeholder="Name">
        <input data-field="category" value="${def.category || ''}" placeholder="category">
        <input data-field="unit" value="${def.unit || ''}" placeholder="unit">
        <select data-field="stock_location"><option value="storage" ${def.stock_location==='storage'?'selected':''}>storage</option><option value="foodtruck" ${def.stock_location==='foodtruck'?'selected':''}>foodtruck</option><option value="both" ${def.stock_location==='both'?'selected':''}>both</option></select>
        <input data-field="current_stock_storage" type="number" min="0" step="1" value="${num(def.current_stock_storage,0)}">
        <input data-field="current_stock_foodtruck" type="number" min="0" step="1" value="${num(def.current_stock_foodtruck,0)}">
        <input data-field="moq_storage" type="number" min="0" step="1" value="${num(def.moq_storage,0)}">
        <input data-field="moq_foodtruck" type="number" min="0" step="1" value="${num(def.moq_foodtruck,0)}">
        <button class="mini" data-remove>Delete</button>
      </span>
      <label style="margin-left:8px;font-size:12px"><input data-field="track_stock" type="checkbox" ${def.track_stock !== false ? 'checked' : ''}> track</label>
    </div>`;
  }

  function recipeRowHtml(p){ return `<div class="row" data-recipe-row><span class="left" style="display:grid;grid-template-columns:1.1fr 1fr;gap:8px;flex:1"><span><b>${p.name}</b> <small>(${p.id})</small></span><input data-product-id="${p.id}" data-recipe-input placeholder="ingredient_id:qty, ingredient_id2:qty" value="${recipeToText(RECIPES[p.id] || {})}"></span></div>`; }
  function bindIngredientActions(body){ body.querySelectorAll('[data-remove]').forEach(btn=>{ btn.onclick = ()=>{ const row = btn.closest('[data-ing-row]'); if(row) row.remove(); }; }); }

  function openEditor(){
    const body = document.getElementById('stockBody'); if(!body) return;
    const productList = Array.isArray(window.BK_DATA && BK_DATA.BASE) ? BK_DATA.BASE : [];
    body.innerHTML = `<h4 style="margin:4px 0 8px">Ingredients</h4><div style="display:flex;justify-content:flex-end;margin-bottom:8px"><button class="x" id="sAddIngredient">+ Ingredient</button></div><div style="font-size:12px;color:#9aa3ad;margin-bottom:8px">Columns: id, name, category, unit, location, stock(storage/truck), MOQ(storage/truck), track</div><div id="stockIngredients"></div><hr style="border:0;border-top:1px solid #2a2f39;margin:12px 0"><h4 style="margin:4px 0 8px">Product Recipes</h4><div style="font-size:12px;color:#9aa3ad;margin-bottom:8px">Format: ingredient_id:qty, ingredient_id2:qty</div><div id="stockRecipes"></div>`;
    const ingWrap = document.getElementById('stockIngredients');
    ingWrap.innerHTML = Object.entries(INGREDIENTS).map(([id, def])=> ingredientRowHtml(id, def)).join(''); bindIngredientActions(ingWrap);
    const recipeWrap = document.getElementById('stockRecipes'); recipeWrap.innerHTML = productList.map(recipeRowHtml).join('');
    document.getElementById('sAddIngredient').onclick = ()=>{ ingWrap.insertAdjacentHTML('beforeend', ingredientRowHtml('', {name:'', category:'general', unit:'', track_stock:true, stock_location:'both', current_stock_storage:0, current_stock_foodtruck:0, moq_storage:0, moq_foodtruck:0})); bindIngredientActions(ingWrap); };
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
    INGREDIENTS = ingNext; RECIPES = recipeNext; persist(); closeEditor(); return true;
  }

  window.BK_STOCK = { KEY, load, reset, getSnapshot, openEditor, closeEditor, saveEditor };
})();
