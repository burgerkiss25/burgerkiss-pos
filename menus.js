// Menu preset editor (local + online editable)
(function(){
  const KEY = 'bk_menus_v1';
  const DEFAULT_REMOTE_PATH = '/pos/catalog/menus';
  const DEFAULT_MENUS = [
    { id:'menu_cheeseburger', name:'Cheeseburger Menu', baseId:'cheeseburger', menuPrice:135, defaultFries:'fries_standard', defaultDrink:'d_cola' },
    { id:'menu_hamburger', name:'Hamburger Menu', baseId:'hamburger', menuPrice:120, defaultFries:'fries_standard', defaultDrink:'d_cola' },
    { id:'menu_double_burger', name:'Double Burger Menu', baseId:'double_burger', menuPrice:155, defaultFries:'fries_standard', defaultDrink:'d_cola' },
    { id:'menu_double_cheeseburger', name:'Double Cheeseburger Menu', baseId:'double_cheeseburger', menuPrice:170, defaultFries:'fries_standard', defaultDrink:'d_cola' },
    { id:'menu_wings_6', name:'Wings 6 Menu', baseId:'wings_6', menuPrice:65, defaultFries:'fries_standard', defaultDrink:'d_cola', defaultWingsSauce:'x_sauce_chicken_wings' },
    { id:'menu_wings_12', name:'Wings 12 Menu', baseId:'wings_12', menuPrice:110, defaultFries:'fries_standard', defaultDrink:'d_cola', defaultWingsSauce:'x_sauce_chicken_wings' }
  ];
  let MENUS = clone(DEFAULT_MENUS);
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
  function productExists(id){ return products().some(p=>p.id===id); }
  function productName(id){ const p = products().find(x=>x.id===id); return p ? p.name : id; }
  function frontProducts(){ return products().filter(p=>p && p.cat !== 'extra' && !String(p.id || '').startsWith('x_sauce_')); }
  function byCat(cat){ return products().filter(p=>p && p.cat === cat); }
  function sauces(){ return products().filter(p=>p && (p.cat === 'sauce' || String(p.id || '').startsWith('x_sauce_'))); }

  function remoteEnabled(){ return !!(window.BK_SYNC_ENABLED !== false && window.FIREBASE_CONFIG && window.firebase && window.firebase.database); }
  function remotePath(){ return (window.BK_MENUS_PATH || DEFAULT_REMOTE_PATH).replace(/\/+$/,''); }
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
      const name = String((r && r.name) || '').trim();
      const baseId = String((r && r.baseId) || '').trim();
      const menuPrice = Number(r && r.menuPrice);
      const defaultFries = String((r && r.defaultFries) || '').trim();
      const defaultDrink = String((r && r.defaultDrink) || '').trim();
      const defaultWingsSauce = String((r && r.defaultWingsSauce) || '').trim();
      if(!id || !name || !baseId || used.has(id)) return;
      const row = { id, name, baseId, menuPrice: Number.isFinite(menuPrice) && menuPrice > 0 ? menuPrice : 0, defaultFries, defaultDrink };
      if(defaultWingsSauce) row.defaultWingsSauce = defaultWingsSauce;
      out.push(row);
      used.add(id);
    });
    return out;
  }
  function syncMenuPrices(rows){
    if(!window.BK_DATA || !BK_DATA.MENU) return;
    (rows || []).forEach(row=>{
      const price = Number(row && row.menuPrice);
      if(row && row.baseId && Number.isFinite(price) && price > 0) BK_DATA.MENU[row.baseId] = price;
    });
  }
  function applyRows(rows){
    const clean = sanitizeRows(rows);
    MENUS = clean;
    syncMenuPrices(MENUS);
    try{ localStorage.setItem(KEY, JSON.stringify(clean)); }catch(e){}
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
    }).catch(e=>{ console.warn('menus remote load failed:', e && e.message); return false; });
  }
  function saveRemoteSoon(){
    const ref = remoteRef();
    if(!ref) return;
    if(remoteSaveTimer) clearTimeout(remoteSaveTimer);
    remoteSaveTimer = setTimeout(()=>{
      ref.set({ rows: sanitizeRows(MENUS), ts: Date.now() }).catch(e=> console.warn('menus remote save failed:', e && e.message));
    }, 250);
  }
  function load(){
    MENUS = clone(DEFAULT_MENUS);
    try{
      const raw = localStorage.getItem(KEY);
      if(raw) MENUS = sanitizeRows(JSON.parse(raw));
    }catch(e){ localStorage.removeItem(KEY); }
    syncMenuPrices(MENUS);
    loadRemoteOnce();
  }
  function getMenus(){ return clone(MENUS); }

  function optionHtml(list, selected, includeBlank){
    const opts = includeBlank ? ['<option value="">None</option>'] : [];
    list.forEach(p=> opts.push(`<option value="${esc(p.id)}" ${p.id===selected?'selected':''}>${esc(p.name)} (${esc(p.id)})</option>`));
    return opts.join('');
  }
  function rowHtml(m){
    return `
      <div class="row" data-menu-row>
        <span class="left menu-editor-grid">
          <input data-field="id" placeholder="menu id" value="${esc(m.id)}">
          <input data-field="name" placeholder="Menu name" value="${esc(m.name)}">
          <input data-field="menuPrice" type="number" step="1" min="0" placeholder="Menu price" value="${Number(m.menuPrice) || ''}">
          <select data-field="baseId">${optionHtml(frontProducts(), m.baseId, false)}</select>
          <select data-field="defaultFries">${optionHtml(byCat('fries'), m.defaultFries, true)}</select>
          <select data-field="defaultDrink">${optionHtml(byCat('drink'), m.defaultDrink, true)}</select>
          <select data-field="defaultWingsSauce">${optionHtml(sauces(), m.defaultWingsSauce, true)}</select>
        </span>
        <button class="mini" data-remove>Delete</button>
      </div>`;
  }
  function bindRowEvents(body){
    body.querySelectorAll('button[data-remove]').forEach(btn=>{
      btn.onclick = ()=>{ const row = btn.closest('[data-menu-row]'); if(row) row.remove(); };
    });
  }
  function renderRows(){
    const body = document.getElementById('menusBody');
    if(!body) return;
    body.innerHTML = `
      <div class="stock-editor-intro">
        <div><h4>Standard menus</h4><p>Each row creates a Menu tile in POS. Staff can keep the defaults or change fries/drink/sauce in the guided menu dialog.</p></div>
      </div>
    ` + DRAFT.map(rowHtml).join('');
    bindRowEvents(body);
  }
  function openEditor(){ DRAFT = clone(MENUS); renderRows(); document.getElementById('modalMenus').classList.add('open'); }
  function closeEditor(){ document.getElementById('modalMenus').classList.remove('open'); }
  function addRow(){
    const base = frontProducts()[0];
    const fries = byCat('fries')[0];
    const drink = byCat('drink')[0];
    DRAFT.push({ id:'menu_new', name:'New Menu', baseId: base ? base.id : '', menuPrice: base && window.BK_DATA && BK_DATA.MENU ? (Number(BK_DATA.MENU[base.id]) || 0) : 0, defaultFries: fries ? fries.id : '', defaultDrink: drink ? drink.id : '' });
    renderRows();
  }
  function collectRows(){
    const body = document.getElementById('menusBody');
    const rows = [];
    body.querySelectorAll('[data-menu-row]').forEach(row=>{
      rows.push({
        id: normalizeId(row.querySelector('[data-field="id"]').value),
        name: String(row.querySelector('[data-field="name"]').value || '').trim(),
        menuPrice: Number(row.querySelector('[data-field="menuPrice"]').value),
        baseId: row.querySelector('[data-field="baseId"]').value,
        defaultFries: row.querySelector('[data-field="defaultFries"]').value,
        defaultDrink: row.querySelector('[data-field="defaultDrink"]').value,
        defaultWingsSauce: row.querySelector('[data-field="defaultWingsSauce"]').value
      });
    });
    return rows;
  }
  function save(){
    const rows = sanitizeRows(collectRows().filter(r=>r.id || r.name || r.baseId));
    const used = new Set();
    for(const r of rows){
      if(!r.id){ alert('Each menu needs an id.'); return; }
      if(!r.name){ alert(`Menu ${r.id} needs a name.`); return; }
      if(!r.baseId || !productExists(r.baseId)){ alert(`Menu ${r.id} needs a valid base product.`); return; }
      if(!Number.isFinite(Number(r.menuPrice)) || Number(r.menuPrice) <= 0){ alert(`Menu ${r.id} needs a menu price.`); return; }
      if(r.defaultFries && !productExists(r.defaultFries)){ alert(`Invalid fries for ${r.id}.`); return; }
      if(r.defaultDrink && !productExists(r.defaultDrink)){ alert(`Invalid drink for ${r.id}.`); return; }
      if(r.defaultWingsSauce && !productExists(r.defaultWingsSauce)){ alert(`Invalid sauce for ${r.id}.`); return; }
      if(used.has(r.id)){ alert(`Duplicate menu id: ${r.id}`); return; }
      used.add(r.id);
    }
    applyRows(rows);
    saveRemoteSoon();
    closeEditor();
    alert(remoteEnabled() ? 'Menus saved online.' : 'Menus saved locally.');
  }
  function reset(){
    if(!confirm('Reset menu presets to defaults?')) return;
    localStorage.removeItem(KEY);
    MENUS = clone(DEFAULT_MENUS);
    DRAFT = clone(MENUS);
    saveRemoteSoon();
    renderRows();
    renderPosIfAvailable();
  }

  window.BK_MENUS = { KEY, DEFAULT_MENUS: clone(DEFAULT_MENUS), load, loadRemoteOnce, remotePath, getMenus, openEditor, closeEditor, addRow, save, reset };
})();
