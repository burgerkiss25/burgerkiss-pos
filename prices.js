// Preis-Overrides (lokal + online editierbar)
(function(){
  const KEY = 'bk_prices_v1';
  const DEFAULT_REMOTE_PATH = '/pos/catalog/prices';
  let MAP = {};
  let remoteSaveTimer = null;

  function cleanMap(input){
    const clean = {};
    if(!input || typeof input !== 'object') return clean;
    Object.keys(input).forEach(id=>{
      const val = Number(input[id]);
      if(Number.isFinite(val) && val >= 0) clean[id] = val;
    });
    return clean;
  }
  function remoteEnabled(){
    return !!(window.BK_SYNC_ENABLED !== false && window.FIREBASE_CONFIG && window.firebase && window.firebase.database);
  }
  function remotePath(){
    return (window.BK_PRICES_PATH || DEFAULT_REMOTE_PATH).replace(/\/+$/,'');
  }
  function remoteRef(){
    if(!remoteEnabled()) return null;
    try{
      const app = (window.firebase.apps && firebase.apps.length)
        ? firebase.app()
        : firebase.initializeApp(window.FIREBASE_CONFIG);
      return firebase.database(app).ref(remotePath());
    }catch(e){ return null; }
  }
  function persistLocal(){
    try{ localStorage.setItem(KEY, JSON.stringify(MAP)); }catch(e){}
  }
  function renderPosIfAvailable(){
    if(window.BK_UI && typeof BK_UI.renderAll === 'function' && document.getElementById('buttons')) BK_UI.renderAll();
  }
  function applyRemote(raw){
    MAP = cleanMap(raw && raw.map ? raw.map : raw);
    persistLocal();
    renderPosIfAvailable();
    return true;
  }
  function loadRemoteOnce(){
    const ref = remoteRef();
    if(!ref) return Promise.resolve(false);
    return ref.get().then(snap=>{
      const val = snap.val();
      if(!val) return false;
      return applyRemote(val);
    }).catch(e=>{
      console.warn('prices remote load failed:', e && e.message);
      return false;
    });
  }
  function saveRemoteSoon(){
    const ref = remoteRef();
    if(!ref) return;
    if(remoteSaveTimer) clearTimeout(remoteSaveTimer);
    remoteSaveTimer = setTimeout(()=>{
      ref.set({ map: MAP, ts: Date.now() }).catch(e=>{
        console.warn('prices remote save failed:', e && e.message);
      });
    }, 250);
  }

  function load(){
    try{ const raw = localStorage.getItem(KEY); if(raw) MAP = cleanMap(JSON.parse(raw)||{}); }catch(e){}
    loadRemoteOnce();
  }
  function getPrice(id){
    if(String(id || '').startsWith('i_sauce_')) return 0;
    const fromBase = (BK_DATA.BASE || []).find(x=>x.id===id);
    const fromDefault = (BK_DATA.DEFAULT_BASE || []).find(x=>x.id===id);
    const base = Number((fromBase && fromBase.price) ?? (fromDefault && fromDefault.price));
    const ov = MAP[id];
    if(typeof ov==='number' && !isNaN(ov)) return ov;
    return Number.isFinite(base) ? base : 0;
  }
  function setPrices(values, removedIds, options){
    (removedIds || []).forEach(id=>delete MAP[id]);
    Object.entries(values || {}).forEach(([id, value])=>{
      const price = Number(value);
      if(Number.isFinite(price) && price >= 0) MAP[id] = price;
    });
    MAP = cleanMap(MAP);
    persistLocal();
    if(!(options && options.localOnly)) saveRemoteSoon();
    renderPosIfAvailable();
    return true;
  }
  function getMap(){ return Object.assign({}, MAP); }
  function openEditor(force, options){
    const modal = document.getElementById('modalPrices');
    const body  = document.getElementById('pricesBody');
    if(!body) return;
    if(force) body.innerHTML = '';
    if(!body.innerHTML){
      const labels = {burger:'Burgers',wings:'Wings',fries:'Fries',salad:'Salads',drink:'Drinks',extra:'Add-ons',sauce:'Sauces'};
      body.innerHTML = '<div class="admin-editor-intro"><div><h4>Product prices</h4><p>Prices follow the same category and display order used in the POS.</p></div></div>';
      Object.entries(labels).forEach(([cat,label])=>{
        const products = BK_DATA.BASE.filter(item=>item.cat === cat).sort((a,b)=>Number(a.categoryOrder||0)-Number(b.categoryOrder||0));
        if(!products.length) return;
        const section = document.createElement('section');
        section.className = 'admin-category-group';
        section.innerHTML = `<header><div><h4>${label}</h4><small>${products.length} item${products.length === 1 ? '' : 's'}</small></div></header><div class="price-editor-list"></div>`;
        const list = section.querySelector('.price-editor-list');
        products.forEach(it=>{
          const row = document.createElement('div');
          row.className='admin-data-row price-editor-row';
        const val = getPrice(it.id);
        row.innerHTML = `
          <span class="admin-item-identity"><b>${it.name}</b><small>${it.id}</small></span>
          <label><span>Selling price</span><span class="currency-field"><input type="number" step="1" min="0" value="${val}" data-id="${it.id}"><b>GHS</b></span></label>
        `;
          list.appendChild(row);
        });
        body.appendChild(section);
      });
    }else{
      body.querySelectorAll('input[data-id]').forEach(inp=>{
        inp.value = getPrice(inp.dataset.id);
      });
    }
    if(modal && (!options || options.showModal !== false)) modal.classList.add('open');
  }
  function closeEditor(){ const modal = document.getElementById('modalPrices'); if(modal) modal.classList.remove('open'); }
  function save(){
    const body = document.getElementById('pricesBody');
    body.querySelectorAll('input[data-id]').forEach(inp=>{
      const id = inp.dataset.id; const val = Number(inp.value);
      if(!isNaN(val) && val>=0){ MAP[id]=val; }
    });
    MAP = cleanMap(MAP);
    persistLocal();
    saveRemoteSoon();
    closeEditor();
    renderPosIfAvailable(); // refresh
    return true;
  }
  function reset(){
    MAP = {};
    localStorage.removeItem(KEY);
    saveRemoteSoon();
    openEditor(true);
    renderPosIfAvailable();
  }

  window.BK_PRICES = { load, loadRemoteOnce, getPrice, getMap, setPrices, openEditor, closeEditor, save, reset, remotePath, KEY };
})();
