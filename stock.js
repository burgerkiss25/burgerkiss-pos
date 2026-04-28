// Stock-Erkennung auf Basis der verkauften Artikel
(function(){
  function getDefs(){
    const s = (window.BK_DATA && BK_DATA.STOCK) || {};
    return {
      ingredients: s.INGREDIENTS || {},
      recipes: s.RECIPES || {}
    };
  }

  function computeUsage(slots){
    const { ingredients, recipes } = getDefs();
    const usage = {};
    Object.keys(ingredients).forEach(k=>{ usage[k] = 0; });

    (slots || []).forEach(slot=>{
      (slot && slot.items || []).forEach(it=>{
        const recipe = recipes[it.itemId] || null;
        if(!recipe) return;
        Object.entries(recipe).forEach(([key, qty])=>{
          const n = Number(qty);
          if(!Number.isFinite(n) || n <= 0) return;
          usage[key] = (usage[key] || 0) + n;
        });
      });
    });

    return usage;
  }

  function getSnapshot(slots){
    const { ingredients } = getDefs();
    const usage = computeUsage(slots);
    return Object.entries(ingredients).map(([id, def])=>{
      const start = Number(def && def.qty) || 0;
      const used = usage[id] || 0;
      const left = Math.max(0, start - used);
      return {
        id,
        name: (def && def.name) || id,
        unit: (def && def.unit) || '',
        start,
        used,
        left,
        low: start > 0 ? (left / start) <= 0.2 : false
      };
    });
  }

  window.BK_STOCK = { computeUsage, getSnapshot };
})();
