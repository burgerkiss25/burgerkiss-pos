(function(){
  let firebaseApp = null;
  let authPromise = Promise.resolve(false);

  function bootFirebase(){
    if(!(window.BK_SYNC_ENABLED !== false && window.FIREBASE_CONFIG && window.firebase && window.firebase.auth)) return Promise.resolve(false);
    firebaseApp = (window.firebase.apps && firebase.apps.length)
      ? firebase.app()
      : firebase.initializeApp(window.FIREBASE_CONFIG);
    authPromise = firebase.auth(firebaseApp).signInAnonymously().then(()=>true).catch(function(e){
      console.warn('admin firebase auth anonymous failed:', e && e.message);
      return false;
    });
    return authPromise;
  }

  function db(){
    if(!(window.BK_SYNC_ENABLED !== false && window.FIREBASE_CONFIG && window.firebase && window.firebase.database)) return null;
    firebaseApp = firebaseApp || ((window.firebase.apps && firebase.apps.length) ? firebase.app() : firebase.initializeApp(window.FIREBASE_CONFIG));
    return firebase.database(firebaseApp);
  }

  function cleanPath(path){ return String(path || '').replace(/\/+$/,''); }
  function pathFor(key, fallback){ return cleanPath(window[key] || fallback); }
  function livePath(){
    const base = pathFor('BK_SYNC_PATH', '/pos/live');
    const slot = (window.BK_SYNC_FORCE_SLOT && typeof BK_SYNC_FORCE_SLOT === 'string') ? BK_SYNC_FORCE_SLOT : 'SN1';
    return `${base}/${slot}`;
  }
  function statusRows(){
    return [
      { label: 'Live State', path: livePath() },
      { label: 'Images', path: pathFor('BK_IMAGES_PATH', '/pos/config/images') },
      { label: 'Products', path: pathFor('BK_PRODUCTS_PATH', '/pos/catalog/products') },
      { label: 'Prices', path: pathFor('BK_PRICES_PATH', '/pos/catalog/prices') },
      { label: 'Stock Ingredients', path: pathFor('BK_STOCK_INGREDIENTS_PATH', '/pos/stock/ingredients') },
      { label: 'Stock Recipes', path: pathFor('BK_STOCK_RECIPES_PATH', '/pos/stock/recipes') },
      { label: 'Stock Inventory', path: pathFor('BK_STOCK_INVENTORY_PATH', '/pos/stock/inventory') },
      { label: 'Stock Add-ons', path: pathFor('BK_STOCK_ADDONS_PATH', '/pos/stock/addons') },
      { label: 'History', path: pathFor('BK_HISTORY_PATH', '/pos/history') }
    ];
  }
  function formatTs(v){
    const n = Number(v);
    if(!Number.isFinite(n) || n <= 0) return '-';
    return new Date(n).toLocaleString();
  }
  function findTs(value){
    if(!value || typeof value !== 'object') return null;
    if(value.ts) return value.ts;
    const vals = Object.values(value);
    for(const child of vals){
      if(child && typeof child === 'object' && child.ts) return child.ts;
    }
    return null;
  }
  function renderStatus(rows, summary){
    const body = document.getElementById('adminDbStatusBody');
    if(!body) return;
    const header = `<div class="row" style="border-top:none;padding:8px 0 14px">
      <span><b>Firebase:</b> ${summary}</span>
      <span><small>${new Date().toLocaleString()}</small></span>
    </div>`;
    body.innerHTML = header + rows.map(r=>`
      <div class="row" style="border-top:1px dashed #2a2f39;padding:8px 0">
        <span class="left"><b>${r.label}</b> <small>${r.path}</small></span>
        <span style="color:${r.ok ? '#74d99f' : '#ffb347'}">${r.ok ? 'online' : r.status}${r.ts ? ` · ${formatTs(r.ts)}` : ''}</span>
      </div>
    `).join('');
  }
  function refreshDbStatus(){
    const body = document.getElementById('adminDbStatusBody');
    if(body) body.innerHTML = '<div class="empty-state">Checking Firebase status...</div>';
    const database = db();
    if(!database){
      renderStatus(statusRows().map(r=>Object.assign({}, r, {ok:false, status:'local only'})), 'not configured');
      return;
    }
    authPromise.then(()=> Promise.all(statusRows().map(row=>
      database.ref(row.path).get().then(snap=>{
        const val = snap.val();
        return Object.assign({}, row, { ok: snap.exists(), status: snap.exists() ? 'online' : 'empty', ts: findTs(val) });
      }).catch(e=> Object.assign({}, row, { ok:false, status: e && e.message ? e.message : 'error' }))
    ))).then(rows=>{
      const online = rows.filter(r=>r.ok).length;
      renderStatus(rows, `${online}/${rows.length} areas online`);
    }).catch(e=>{
      renderStatus(statusRows().map(r=>Object.assign({}, r, {ok:false, status:'error'})), e && e.message ? e.message : 'error');
    });
  }

  bootFirebase().finally(()=> setTimeout(refreshDbStatus, 300));

  BK_PRICES.load();
  BK_PRODUCTS.load();
  BK_IMAGES.load();
  BK_STOCK.load();

  document.getElementById('btnPrices').onclick = ()=> BK_UI.openPrices();
  document.getElementById('pClose').onclick    = ()=> BK_UI.closePrices();
  document.getElementById('pSave').onclick     = ()=>{ BK_UI.savePrices(); setTimeout(refreshDbStatus, 800); };
  document.getElementById('pReset').onclick    = ()=>{ BK_UI.resetPrices(); setTimeout(refreshDbStatus, 800); };

  document.getElementById('btnProducts').onclick = ()=> BK_UI.openProducts();
  document.getElementById('prodClose').onclick   = ()=> BK_UI.closeProducts();
  document.getElementById('prodAdd').onclick     = ()=> BK_UI.addProductRow();
  document.getElementById('prodSave').onclick    = ()=>{ BK_UI.saveProducts(); setTimeout(refreshDbStatus, 800); };
  document.getElementById('prodReset').onclick   = ()=>{ BK_UI.resetProducts(); setTimeout(refreshDbStatus, 800); };

  document.getElementById('btnImages').onclick = ()=> BK_UI.openImages();
  document.getElementById('iClose').onclick    = ()=> BK_UI.closeImages();
  document.getElementById('iSave').onclick     = ()=>{ BK_UI.saveImages(); setTimeout(refreshDbStatus, 800); };
  document.getElementById('iReset').onclick    = ()=>{ BK_UI.resetImages(); setTimeout(refreshDbStatus, 800); };

  document.getElementById('btnStock').onclick = ()=> BK_UI.openStock();
  document.getElementById('btnIngredients').onclick = ()=> BK_STOCK.openEditor('ingredients');
  document.getElementById('btnRecipes').onclick = ()=> BK_STOCK.openEditor('recipes');
  document.getElementById('btnAddons').onclick = ()=> BK_STOCK.openEditor('addons');
  document.getElementById('sClose').onclick   = ()=> BK_UI.closeStock();
  document.getElementById('sSave').onclick    = ()=>{ BK_UI.saveStock(); setTimeout(refreshDbStatus, 800); };
  document.getElementById('sReset').onclick   = ()=>{ BK_UI.resetStock(); setTimeout(refreshDbStatus, 800); };
  document.getElementById('btnRefreshDbStatus').onclick = refreshDbStatus;
})();
