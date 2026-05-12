(function(){
  const STOCK_LOCATIONS = ['storage', 'foodtruck', 'both'];
  const STOCK_INVENTORY_LOCATIONS = [
    { id: 'burgerkiss_store', legacyKey: 'storage', name: 'BurgerKiss Store', type: 'warehouse', stockField: 'current_stock_storage', moqField: 'moq_storage' },
    { id: 'block_factory', legacyKey: 'foodtruck', name: 'BurgerKiss Block Factory', type: 'branch', stockField: 'current_stock_foodtruck', moqField: 'moq_foodtruck' }
  ];
  const STOCK_LOCATION_LABELS = {
    storage: 'BurgerKiss Store',
    foodtruck: 'BurgerKiss Block Factory',
    burgerkiss_store: 'BurgerKiss Store',
    block_factory: 'BurgerKiss Block Factory',
    both: 'BurgerKiss Store + BurgerKiss Block Factory'
  };
  function locationLabel(v){ return STOCK_LOCATION_LABELS[v] || v || ''; }
  function stockLocationById(id){ return STOCK_INVENTORY_LOCATIONS.find(loc=> loc.id === id || loc.legacyKey === id) || null; }
  function normalizeId(v){ return String(v || '').trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_\-]/g, ''); }
  function num(v, fallback){ const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : fallback; }
  function sanitizeIngredient(v, id){
    if(!v || typeof v !== 'object') return null;
    const name = String(v.name || id).trim() || id;
    const category = String(v.category || 'general').trim() || 'general';
    const unit = String(v.unit || '').trim();
    const stock_location = STOCK_LOCATIONS.includes(v.stock_location) ? v.stock_location : 'both';
    const track_stock = v.track_stock !== false;
    const clean = { name, category, unit, track_stock, stock_location, stock: {} };
    STOCK_INVENTORY_LOCATIONS.forEach(loc=>{
      const stockSrc = (v.stock && typeof v.stock === 'object')
        ? (v.stock[loc.id] || v.stock[loc.legacyKey] || null)
        : null;
      const qty = stockSrc ? num(stockSrc.qty, num(v[loc.stockField], 0)) : num(v[loc.stockField], 0);
      const moq = stockSrc ? num(stockSrc.moq, num(v[loc.moqField], 0)) : num(v[loc.moqField], 0);
      clean[loc.stockField] = qty;
      clean[loc.moqField] = moq;
      clean.stock[loc.id] = { qty, moq };
    });
    return clean;
  }
  function sanitizeIngredients(raw){
    const src = raw && typeof raw === 'object' ? raw : {};
    const out = {};
    Object.entries(src).forEach(([id, v])=>{ const key = normalizeId(id); if(!key) return; const clean = sanitizeIngredient(v, key); if(clean) out[key] = clean; });
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
  window.BK_STOCK_UTILS = { STOCK_LOCATIONS, STOCK_INVENTORY_LOCATIONS, STOCK_LOCATION_LABELS, locationLabel, stockLocationById, normalizeId, num, sanitizeIngredient, sanitizeIngredients, sanitizeRecipes, parseRecipeText, recipeToText };
})();
