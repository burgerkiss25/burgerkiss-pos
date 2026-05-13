// Fast-Lane shortcut editor (local + online editable)
(function(){
  const KEY = 'bk_fastlane_v1';
  const DEFAULT_REMOTE_PATH = '/pos/catalog/fastlane';
  const DEFAULT_ITEMS = [
    { id:'fast_cheeseburger_menu', label:'Cheeseburger Menu', targetType:'menu', targetId:'menu_cheeseburger' },
    { id:'fast_wings_6_menu', label:'Wings 6 Menu', targetType:'menu', targetId:'menu_wings_6' },
    { id:'fast_fries_standard', label:'Fries Standard', targetType:'product', targetId:'fries_standard' },
    { id:'fast_cola', label:'Cola', targetType:'product', targetId:'d_cola' },
    { id:'fast_extra_cheese', label:'Extra Cheese', targetType:'product', targetId:'x_cheese' }
  ];
  let ITEMS = clone(DEFAULT_ITEMS);
  let DRAFT = [];
  let remoteSaveTimer = null;

  function clone(x){ return JSON.parse(JSON.stringify(x)); }
  function esc(v){ return String(v == null ? '' : v).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function normalizeId(v){
    return String(v || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_\-]/g, '');
  }
  function products(){ return Array.isArray(window.BK_DATA && BK_DATA.BASE) ? BK_DATA.BASE : []; }
  function menus(){ return window.BK_MENUS && typeof BK_MENUS.getMenus === 'function' ? BK_MENUS.getMenus() : []; }
  function targetExists(type, id){
    if(type === 'menu') return menus().some(m=>m.id===id);
    return products().some(p=>p.id===id);
  }
  function targetName(type, id){
    if(type === 'menu'){ const m = menus().find(x=>x.id===id); return m ? m.name : id; }
    const p = products().find(x=>x.id===id); return p ? p.name : id;
  }
  function remoteEnabled(){ return !!(window.BK_SYNC_ENABLED !== false && window.FIREBASE_CONFIG && window.firebase && window.firebase.database); }
  function remotePath(){ return (window.BK_FASTLANE_PATH || DEFAULT_REMOTE_PATH).replace(/\/+$/,''); }
  function remoteRef(){
    if(!remoteEnabled()) return null;
    try{
      const app = (window.firebase.apps && firebase.apps.length) ? firebase.app() : firebase.initializeApp(window.FIREBASE_CONFIG);
      return firebase.database(app).ref(remotePath());
    }catch(e){ return null; }
  }
  function renderPosIfAvailable(){
    if(window.BK_UI && typeof BK_UI.renderAll === 'function' && document.getElementById('buttons')) BK_UI.renderAll();
  }
  function sanitizeRows(rows){
    if(!Array.isArray(rows)) return [];
    const out = [];
    const used = new Set();
    rows.forEach(r=>{
      const id = normalizeId(r && r.id);
      const targetType = String((r && r.targetType) || '').trim().toLowerCase() === 'menu' ? 'menu' : 'product';
      const targetId = String((r && r.targetId) || '').trim();
      const label = String((r && r.label) || '').trim();
      if(!id || !targetId || used.has(id)) return;
      out.push({ id, label, targetType, targetId });
      used.add(id);
    });
    return out;
  }
  function applyRows(rows){
    ITEMS = sanitizeRows(rows);
    try{ localStorage.setItem(KEY, JSON.stringify(ITEMS)); }catch(e){}
    renderPosIfAvailable();
    return true;
  }
  function loadRemoteOnce(){
    const ref = remoteRef();
    if(!ref) return Promise.resolve(false);
    return ref.get().then(snap=>{
      const val = snap.val();
      if(!val) return false;
      const rows = val && Array.isArray(val.rows) ? val.rows : val;
      return applyRows(rows);
    }).catch(e=>{ console.warn('fast lane remote load failed:', e && e.message); return false; });
  }
  function saveRemoteSoon(){
    const ref = remoteRef();
    if(!ref) return;
    if(remoteSaveTimer) clearTimeout(remoteSaveTimer);
    remoteSaveTimer = setTimeout(()=>{
      ref.set({ rows: sanitizeRows(ITEMS), ts: Date.now() }).catch(e=> console.warn('fast lane remote save failed:', e && e.message));
    }, 250);
  }
  function load(){
    ITEMS = clone(DEFAULT_ITEMS);
    try{
      const raw = localStorage.getItem(KEY);
      if(raw) ITEMS = sanitizeRows(JSON.parse(raw));
    }catch(e){ localStorage.removeItem(KEY); }
    loadRemoteOnce();
  }
  function getItems(){ return clone(ITEMS); }

  function targetOptions(selectedType, selectedId){
    const rows = [];
    menus().forEach(m=> rows.push({ key:`menu:${m.id}`, label:`Menu · ${m.name} (${m.id})` }));
    products().forEach(p=> rows.push({ key:`product:${p.id}`, label:`Product · ${p.name} (${p.id})` }));
    const selected = `${selectedType || 'product'}:${selectedId || ''}`;
    return rows.map(r=>`<option value="${esc(r.key)}" ${r.key===selected?'selected':''}>${esc(r.label)}</option>`).join('');
  }
  function splitTargetKey(key){
    const parts = String(key || '').split(':');
    return { targetType: parts[0] === 'menu' ? 'menu' : 'product', targetId: parts.slice(1).join(':') };
  }
  function rowHtml(item){
    return `
      <div class="row" data-fast-row>
        <span class="left fastlane-editor-grid">
          <input data-field="id" placeholder="shortcut id" value="${esc(item.id)}">
          <input data-field="label" placeholder="Button label" value="${esc(item.label || targetName(item.targetType, item.targetId))}">
          <select data-field="targetKey">${targetOptions(item.targetType, item.targetId)}</select>
        </span>
        <button class="mini" data-remove>Delete</button>
      </div>`;
  }
  function bindRowEvents(body){
    body.querySelectorAll('button[data-remove]').forEach(btn=>{
      btn.onclick = ()=>{ const row = btn.closest('[data-fast-row]'); if(row) row.remove(); };
    });
  }
  function renderRows(){
    const body = document.getElementById('fastlaneBody');
    if(!body) return;
    body.innerHTML = `
      <div class="stock-editor-intro">
        <div><h4>Fast Lane</h4><p>Choose the menus/products staff should see first for fast ordering.</p></div>
      </div>
    ` + DRAFT.map(rowHtml).join('');
    bindRowEvents(body);
  }
  function openEditor(){ DRAFT = clone(ITEMS); renderRows(); document.getElementById('modalFastLane').classList.add('open'); }
  function closeEditor(){ document.getElementById('modalFastLane').classList.remove('open'); }
  function addRow(){
    const firstMenu = menus()[0];
    const firstProduct = products()[0];
    const targetType = firstMenu ? 'menu' : 'product';
    const targetId = firstMenu ? firstMenu.id : (firstProduct ? firstProduct.id : '');
    DRAFT.push({ id:'fast_new', label:'New shortcut', targetType, targetId });
    renderRows();
  }
  function collectRows(){
    const body = document.getElementById('fastlaneBody');
    const rows = [];
    body.querySelectorAll('[data-fast-row]').forEach(row=>{
      const target = splitTargetKey(row.querySelector('[data-field="targetKey"]').value);
      rows.push({
        id: normalizeId(row.querySelector('[data-field="id"]').value),
        label: String(row.querySelector('[data-field="label"]').value || '').trim(),
        targetType: target.targetType,
        targetId: target.targetId
      });
    });
    return rows;
  }
  function save(){
    const rows = sanitizeRows(collectRows().filter(r=>r.id || r.targetId || r.label));
    const used = new Set();
    for(const r of rows){
      if(!r.id){ alert('Each Fast Lane shortcut needs an id.'); return; }
      if(!r.targetId || !targetExists(r.targetType, r.targetId)){ alert(`Invalid target for ${r.id}.`); return; }
      if(used.has(r.id)){ alert(`Duplicate Fast Lane id: ${r.id}`); return; }
      used.add(r.id);
    }
    applyRows(rows);
    saveRemoteSoon();
    closeEditor();
    alert(remoteEnabled() ? 'Fast Lane saved online.' : 'Fast Lane saved locally.');
  }
  function reset(){
    if(!confirm('Reset Fast Lane shortcuts to defaults?')) return;
    localStorage.removeItem(KEY);
    ITEMS = clone(DEFAULT_ITEMS);
    DRAFT = clone(ITEMS);
    saveRemoteSoon();
    renderRows();
    renderPosIfAvailable();
  }

  window.BK_FASTLANE = { KEY, DEFAULT_ITEMS: clone(DEFAULT_ITEMS), load, loadRemoteOnce, remotePath, getItems, openEditor, closeEditor, addRow, save, reset };
})();
