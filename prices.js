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
    const fromBase = (BK_DATA.BASE || []).find(x=>x.id===id);
    const fromDefault = (BK_DATA.DEFAULT_BASE || []).find(x=>x.id===id);
    const base = Number((fromBase && fromBase.price) ?? (fromDefault && fromDefault.price));
    const ov = MAP[id];
    if(typeof ov==='number' && !isNaN(ov)) return ov;
    return Number.isFinite(base) ? base : 0;
  }
  function openEditor(force){
    const modal = document.getElementById('modalPrices');
    const body  = document.getElementById('pricesBody');
    if(force) body.innerHTML = '';
    if(!body.innerHTML){
      BK_DATA.BASE.forEach(it=>{
        const row = document.createElement('div');
        row.className='row';
        const val = getPrice(it.id);
        row.innerHTML = `
          <span><b>${it.name}</b> <small>(${it.cat})</small></span>
          <span>
            <input type="number" step="1" min="0" value="${val}" data-id="${it.id}"
                   style="width:90px;background:#0f1318;border:1px solid #2a313b;color:#eaf0f6;border-radius:8px;padding:6px">
            <span style="margin-left:6px">GHS</span>
          </span>
        `;
        body.appendChild(row);
      });
    }else{
      body.querySelectorAll('input[data-id]').forEach(inp=>{
        inp.value = getPrice(inp.dataset.id);
      });
    }
    modal.classList.add('open');
  }
  function closeEditor(){ document.getElementById('modalPrices').classList.remove('open'); }
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
    window.BK_UI.renderAll(); // refresh
    if(window.BK_UI && BK_UI.infoDialog) BK_UI.infoDialog(remoteEnabled() ? 'Prices saved online.' : 'Prices saved locally.');
  }
  function reset(){
    const run = ()=>{
      MAP = {};
      localStorage.removeItem(KEY);
      saveRemoteSoon();
      openEditor(true);
      renderPosIfAvailable();
    };
    if(window.BK_UI && BK_UI.confirmDialog){
      BK_UI.confirmDialog('Reset prices', 'Reset all edited prices to defaults?').then(ok=>{ if(ok) run(); });
      return;
    }
    run();
  }

  window.BK_PRICES = { load, loadRemoteOnce, getPrice, openEditor, closeEditor, save, reset, remotePath, KEY };
})();
