(function(){
  const STOCK_LOCATIONS = ['storage', 'foodtruck', 'both'];
  const STOCK_LOCATION_LABELS = {
    storage: 'BurgerKiss Store',
    foodtruck: 'BurgerKiss Block Factory',
    both: 'BurgerKiss Store + BurgerKiss Block Factory'
  };
  function locationLabel(v){ return STOCK_LOCATION_LABELS[v] || v || ''; }
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
      name, category, unit, track_stock, stock_location,
      current_stock_storage: num(v.current_stock_storage, 0),
      current_stock_foodtruck: num(v.current_stock_foodtruck, 0),
      moq_storage: num(v.moq_storage, 0),
      moq_foodtruck: num(v.moq_foodtruck, 0)
    };
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
  window.BK_STOCK_UTILS = { STOCK_LOCATIONS, STOCK_LOCATION_LABELS, locationLabel, normalizeId, num, sanitizeIngredient, sanitizeIngredients, sanitizeRecipes, parseRecipeText, recipeToText };
})();
