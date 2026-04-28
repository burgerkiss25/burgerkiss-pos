// Stock-Modul (editierbar im Frontend)
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

  function clone(x){ return JSON.parse(JSON.stringify(x)); }

  function sanitizeIngredients(raw){
    const src = raw && typeof raw === 'object' ? raw : {};
    const out = {};
    Object.entries(src).forEach(([id, v])=>{
      if(!v || typeof v !== 'object') return;
      const name = String(v.name || id).trim() || id;
      const qty = Number(v.qty);
      const unit = String(v.unit || '').trim();
      if(!Number.isFinite(qty) || qty < 0) return;
      out[id] = { name, qty, unit };
    });
    return out;
  }

  function load(){
    INGREDIENTS = clone(DEFAULTS.INGREDIENTS);
    try{
      const raw = localStorage.getItem(KEY);
      if(!raw) return;
      const parsed = JSON.parse(raw);
      const clean = sanitizeIngredients(parsed);
      if(Object.keys(clean).length) INGREDIENTS = clean;
    }catch(e){
      localStorage.removeItem(KEY);
    }
  }

  function saveIngredients(rows){
    const next = {};
    rows.forEach(r=>{
      const id = String(r.id || '').trim();
      const name = String(r.name || '').trim() || id;
      const qty = Number(r.qty);
      const unit = String(r.unit || '').trim();
      if(!id || !Number.isFinite(qty) || qty < 0) return;
      next[id] = { name, qty, unit };
    });
    if(!Object.keys(next).length) return false;
    INGREDIENTS = next;
    localStorage.setItem(KEY, JSON.stringify(INGREDIENTS));
    return true;
  }

  function reset(){
    INGREDIENTS = clone(DEFAULTS.INGREDIENTS);
    localStorage.removeItem(KEY);
  }

  function getSnapshot(slots){
    const usage = {};
    Object.keys(INGREDIENTS).forEach(k=>{ usage[k] = 0; });

    (slots || []).forEach(s=>{
      (s.items || []).forEach(it=>{
        const rec = (DEFAULTS.RECIPES || {})[it.itemId];
        if(!rec) return;
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

  function openEditor(){
    const body = document.getElementById('stockBody');
    if(!body) return;
    body.innerHTML = '';
    Object.entries(INGREDIENTS).forEach(([id, def])=>{
      const row = document.createElement('div');
      row.className = 'row';
      row.innerHTML = `
        <span class="left" style="display:grid;grid-template-columns:1fr 110px 90px;gap:8px;flex:1">
          <input data-stock-id="${id}" data-field="name" value="${def.name}">
          <input data-stock-id="${id}" data-field="qty" type="number" step="1" min="0" value="${def.qty}">
          <input data-stock-id="${id}" data-field="unit" value="${def.unit || ''}">
        </span>
      `;
      body.appendChild(row);
    });
    document.getElementById('modalStock').classList.add('open');
  }

  function closeEditor(){
    const modal = document.getElementById('modalStock');
    if(modal) modal.classList.remove('open');
  }

  function saveEditor(){
    const body = document.getElementById('stockBody');
    if(!body) return false;
    const grouped = {};
    body.querySelectorAll('[data-stock-id]').forEach(inp=>{
      const id = inp.dataset.stockId;
      const field = inp.dataset.field;
      grouped[id] = grouped[id] || { id };
      grouped[id][field] = inp.value;
    });
    const ok = saveIngredients(Object.values(grouped));
    if(ok) closeEditor();
    return ok;
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
