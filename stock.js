// Stock-Modul (editierbar im Frontend, inkl. Rezept-Zuordnung pro Produkt)
(function(){
  const KEY = 'bk_stock_v1';
  const DEFAULTS = {
    INGREDIENTS: {
      bun: { name: 'Burger Bun', qty: 80, unit: 'pcs' },
      beef_patty: { name: 'Beef Patty', qty: 60, unit: 'pcs' },
      cheese_slice: { name: 'Cheese Slice', qty: 120, unit: 'pcs' },
      chicken_wing: { name: 'Chicken Wing', qty: 300, unit: 'pcs' },
      fries_portion: { name: 'Fries Portion', qty: 120, unit: 'portion' },
      coconut_fresh: { name: 'Coconut Fresh', qty: 25, unit: 'pcs' },
      soda_can: { name: 'Soft Drink', qty: 120, unit: 'pcs' },
      ice_tea: { name: 'Ice Tea', qty: 30, unit: 'cups' },
      coconut_water_bottle: { name: 'Coconut Water Bottle', qty: 30, unit: 'btl' },
      beer: { name: 'Beer', qty: 48, unit: 'btl' },
      egg: { name: 'Egg', qty: 48, unit: 'pcs' },
      bacon_slice: { name: 'Bacon Slice', qty: 120, unit: 'slice' }
    },
    RECIPES: {
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

  let INGREDIENTS = {};
  let RECIPES = {};

  function clone(x){ return JSON.parse(JSON.stringify(x)); }
  function normalizeId(v){ return String(v || '').trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_\-]/g, ''); }

  function sanitizeIngredients(raw){
    const src = raw && typeof raw === 'object' ? raw : {};
    const out = {};
    Object.entries(src).forEach(([id, v])=>{
      if(!v || typeof v !== 'object') return;
      const key = normalizeId(id);
      if(!key) return;
      const name = String(v.name || key).trim() || key;
      const qty = Number(v.qty);
      const unit = String(v.unit || '').trim();
      if(!Number.isFinite(qty) || qty < 0) return;
      out[key] = { name, qty, unit };
    });
    return out;
  }

  function sanitizeRecipes(raw){
    const src = raw && typeof raw === 'object' ? raw : {};
    const out = {};
    Object.entries(src).forEach(([pid, rec])=>{
      const productId = normalizeId(pid);
      if(!productId || !rec || typeof rec !== 'object') return;
      const nextRec = {};
      Object.entries(rec).forEach(([iid, qty])=>{
        const ingredientId = normalizeId(iid);
        const n = Number(qty);
        if(!ingredientId || !Number.isFinite(n) || n <= 0) return;
        nextRec[ingredientId] = n;
      });
      out[productId] = nextRec;
    });
    return out;
  }

  function parseRecipeText(text){
    const out = {};
    String(text || '').split(',').map(x=>x.trim()).filter(Boolean).forEach(part=>{
      const [rawId, rawQty] = part.split(':').map(x=> String(x||'').trim());
      const id = normalizeId(rawId);
      const qty = Number(rawQty);
      if(!id || !Number.isFinite(qty) || qty <= 0) return;
      out[id] = qty;
    });
    return out;
  }

  function recipeToText(recipe){
    return Object.entries(recipe || {}).map(([id, qty])=> `${id}:${qty}`).join(', ');
  }

  function load(){
    INGREDIENTS = clone(DEFAULTS.INGREDIENTS);
    RECIPES = clone(DEFAULTS.RECIPES);
    try{
      const raw = localStorage.getItem(KEY);
      if(!raw) return;
      const parsed = JSON.parse(raw);

      // Migration: alter Stand speicherte nur Zutaten direkt
      if(parsed && !parsed.ingredients && !parsed.recipes){
        const clean = sanitizeIngredients(parsed);
        if(Object.keys(clean).length) INGREDIENTS = clean;
        return;
      }

      const cleanIng = sanitizeIngredients(parsed && parsed.ingredients);
      const cleanRec = sanitizeRecipes(parsed && parsed.recipes);
      if(Object.keys(cleanIng).length) INGREDIENTS = cleanIng;
      if(Object.keys(cleanRec).length) RECIPES = cleanRec;
    }catch(e){
      localStorage.removeItem(KEY);
    }
  }

  function persist(){
    localStorage.setItem(KEY, JSON.stringify({ ingredients: INGREDIENTS, recipes: RECIPES }));
  }

  function reset(){
    INGREDIENTS = clone(DEFAULTS.INGREDIENTS);
    RECIPES = clone(DEFAULTS.RECIPES);
    localStorage.removeItem(KEY);
  }

  function getSnapshot(slots){
    const usage = {};
    Object.keys(INGREDIENTS).forEach(k=>{ usage[k] = 0; });

    (slots || []).forEach(s=>{
      (s.items || []).forEach(it=>{
        const rec = RECIPES[it.itemId] || {};
        Object.entries(rec).forEach(([id, qty])=>{
          const n = Number(qty);
          if(Number.isFinite(n) && n > 0) usage[id] = (usage[id] || 0) + n;
        });
      });
    });

    return Object.entries(INGREDIENTS).map(([id, def])=>{
      const start = Number(def.qty) || 0;
      const used = usage[id] || 0;
      const left = Math.max(0, start - used);
      const low = start > 0 ? (left / start) <= 0.2 : false;
      return { id, name: def.name, unit: def.unit || '', start, used, left, low };
    });
  }

  function ingredientRowHtml(id, def){
    return `
      <div class="row" data-ing-row>
        <span class="left" style="display:grid;grid-template-columns:1fr 1.2fr 110px 90px auto;gap:8px;flex:1">
          <input data-field="id" value="${id}" placeholder="ingredient_id">
          <input data-field="name" value="${def.name || ''}" placeholder="Name">
          <input data-field="qty" type="number" step="1" min="0" value="${Number(def.qty)||0}">
          <input data-field="unit" value="${def.unit || ''}" placeholder="unit">
          <button class="mini" data-remove>Delete</button>
        </span>
      </div>`;
  }

  function recipeRowHtml(p){
    return `
      <div class="row" data-recipe-row>
        <span class="left" style="display:grid;grid-template-columns:1.1fr 1fr;gap:8px;flex:1">
          <span><b>${p.name}</b> <small>(${p.id})</small></span>
          <input data-product-id="${p.id}" data-recipe-input placeholder="ingredient_id:qty, ingredient_id2:qty"
                 value="${recipeToText(RECIPES[p.id] || {})}">
        </span>
      </div>`;
  }

  function bindIngredientActions(body){
    body.querySelectorAll('[data-remove]').forEach(btn=>{
      btn.onclick = ()=>{
        const row = btn.closest('[data-ing-row]');
        if(row) row.remove();
      };
    });
  }

  function openEditor(){
    const body = document.getElementById('stockBody');
    if(!body) return;
    const productList = Array.isArray(window.BK_DATA && BK_DATA.BASE) ? BK_DATA.BASE : [];

    body.innerHTML = `
      <h4 style="margin:4px 0 8px">Ingredients</h4>
      <div style="display:flex;justify-content:flex-end;margin-bottom:8px">
        <button class="x" id="sAddIngredient">+ Ingredient</button>
      </div>
      <div id="stockIngredients"></div>
      <hr style="border:0;border-top:1px solid #2a2f39;margin:12px 0">
      <h4 style="margin:4px 0 8px">Product Recipes</h4>
      <div style="font-size:12px;color:#9aa3ad;margin-bottom:8px">Format: ingredient_id:qty, ingredient_id2:qty</div>
      <div id="stockRecipes"></div>
    `;

    const ingWrap = document.getElementById('stockIngredients');
    ingWrap.innerHTML = Object.entries(INGREDIENTS).map(([id, def])=> ingredientRowHtml(id, def)).join('');
    bindIngredientActions(ingWrap);

    const recipeWrap = document.getElementById('stockRecipes');
    recipeWrap.innerHTML = productList.map(recipeRowHtml).join('');

    document.getElementById('sAddIngredient').onclick = ()=>{
      ingWrap.insertAdjacentHTML('beforeend', ingredientRowHtml('', {name:'', qty:0, unit:''}));
      bindIngredientActions(ingWrap);
    };

    document.getElementById('modalStock').classList.add('open');
  }

  function closeEditor(){
    const modal = document.getElementById('modalStock');
    if(modal) modal.classList.remove('open');
  }

  function saveEditor(){
    const body = document.getElementById('stockBody');
    if(!body) return false;

    const ingNext = {};
    body.querySelectorAll('[data-ing-row]').forEach(row=>{
      const id = normalizeId(row.querySelector('[data-field="id"]').value);
      const name = String(row.querySelector('[data-field="name"]').value || '').trim();
      const qty = Number(row.querySelector('[data-field="qty"]').value);
      const unit = String(row.querySelector('[data-field="unit"]').value || '').trim();
      if(!id || !Number.isFinite(qty) || qty < 0) return;
      ingNext[id] = { name: name || id, qty, unit };
    });
    if(!Object.keys(ingNext).length) return false;

    const recipeNext = {};
    body.querySelectorAll('[data-recipe-input]').forEach(inp=>{
      const pid = normalizeId(inp.dataset.productId);
      if(!pid) return;
      const parsed = parseRecipeText(inp.value);
      const filtered = {};
      Object.entries(parsed).forEach(([iid, qty])=>{
        if(ingNext[iid]) filtered[iid] = qty;
      });
      recipeNext[pid] = filtered;
    });

    INGREDIENTS = ingNext;
    RECIPES = recipeNext;
    persist();
    closeEditor();
    return true;
  }

  window.BK_STOCK = {
    KEY,
    load,
    reset,
    getSnapshot,
    openEditor,
    closeEditor,
    saveEditor
  };
})();
