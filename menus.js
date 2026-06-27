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
  function productCategory(id){ const p = products().find(x=>x.id===id); return p && p.cat ? p.cat : 'other'; }
  function productOrder(id){ const p = products().find(x=>x.id===id); return Number(p && p.categoryOrder || 0); }
  function frontProducts(){ return products().filter(p=>p && p.active !== false && p.cat !== 'extra' && !String(p.id || '').startsWith('x_sauce_')); }
  function byCat(cat){ return products().filter(p=>p && p.active !== false && p.cat === cat); }
  function sauces(){ return products().filter(p=>p && p.active !== false && (p.cat === 'sauce' || String(p.id || '').startsWith('x_sauce_'))); }

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

  function textEl(tag, text, className){
    const el = document.createElement(tag);
    if(className) el.className = className;
    el.textContent = text == null ? '' : String(text);
    return el;
  }
  function optionEl(value, label, selected){
    const option = document.createElement('option');
    option.value = value || '';
    option.textContent = label;
    option.selected = option.value === String(selected || '');
    return option;
  }
  function fillProductOptions(select, list, selected, includeBlank){
    const options = [];
    if(includeBlank) options.push(optionEl('', 'None', selected));
    list.forEach(product=>options.push(optionEl(product.id, `${product.name} (${product.id})`, selected)));
    select.replaceChildren(...options);
  }
  function field(label, control){
    const wrapper = document.createElement('label');
    wrapper.append(textEl('span', label), control);
    return wrapper;
  }
  function inputField(name, value, placeholder, type){
    const input = document.createElement('input');
    input.dataset.field = name;
    input.placeholder = placeholder || '';
    input.value = value == null ? '' : String(value);
    if(type) input.type = type;
    return input;
  }
  function selectField(name, list, selected, includeBlank){
    const select = document.createElement('select');
    select.dataset.field = name;
    fillProductOptions(select, list, selected, includeBlank);
    return select;
  }
  function notifyValidation(message){
    const body = document.getElementById('menusBody');
    if(!body) return false;
    let notice = body.querySelector('.admin-validation-message');
    if(!notice){
      notice = document.createElement('div');
      notice.className = 'admin-validation-message';
      notice.setAttribute('role', 'alert');
      body.prepend(notice);
    }
    notice.textContent = message;
    notice.scrollIntoView({block:'nearest'});
    return false;
  }
  function rowNode(m){
    const article = document.createElement('article');
    article.className = 'admin-menu-card';
    article.dataset.menuRow = '';
    const heading = document.createElement('div');
    heading.className = 'admin-menu-card-heading';
    const headingCopy = document.createElement('div');
    headingCopy.append(textEl('h4', m.name || 'New menu'), textEl('small', `Based on ${productName(m.baseId)}`));
    const remove = textEl('button', 'Delete menu', 'mini admin-row-danger');
    remove.type = 'button';
    remove.dataset.remove = '';
    heading.append(headingCopy, remove);
    const grid = document.createElement('div');
    grid.className = 'admin-form-grid';
    const price = inputField('menuPrice', Number(m.menuPrice) || '', '0', 'number');
    price.step = '1';
    price.min = '0';
    const currency = document.createElement('span');
    currency.className = 'currency-field';
    currency.append(price, textEl('b', 'GHS'));
    grid.append(
      field('Menu name', inputField('name', m.name, 'Menu name')),
      field('Menu price', currency),
      field('Base product', selectField('baseId', frontProducts(), m.baseId, false)),
      field('Default fries', selectField('defaultFries', byCat('fries'), m.defaultFries, true)),
      field('Default drink', selectField('defaultDrink', byCat('drink'), m.defaultDrink, true)),
      field('Default wing sauce', selectField('defaultWingsSauce', sauces(), m.defaultWingsSauce, true))
    );
    const advanced = document.createElement('details');
    advanced.className = 'admin-advanced';
    advanced.append(textEl('summary', 'Technical details'), field('Menu ID', inputField('id', m.id, 'menu_id')));
    article.append(heading, grid, advanced);
    return article;
  }
  function bindRowEvents(body){
    body.querySelectorAll('button[data-remove]').forEach(btn=>{
      btn.onclick = ()=>{ const row = btn.closest('[data-menu-row]'); if(row) row.remove(); };
    });
  }
  function renderRows(){
    const body = document.getElementById('menusBody');
    if(!body) return;
    const categoryLabels = {burger:'Burgers',wings:'Wings',fries:'Fries',salad:'Salads',drink:'Drinks',other:'Other'};
    const categories = Array.from(new Set(DRAFT.map(menu=>productCategory(menu.baseId))));
    const intro = document.createElement('div');
    intro.className = 'stock-editor-intro';
    const introCopy = document.createElement('div');
    introCopy.append(textEl('h4', 'Standard menus'), textEl('p', 'Menus are grouped by their base product category and follow the display order managed in Products.'));
    intro.append(introCopy, textEl('span', `${DRAFT.length} menus`, 'admin-count-badge'));
    const sections = categories.map(category=>{
      const rows = DRAFT
        .filter(menu=>productCategory(menu.baseId) === category)
        .sort((a,b)=>productOrder(a.baseId)-productOrder(b.baseId));
      const label = categoryLabels[category] || category.replace(/(^|_)([a-z])/g,(_,space,letter)=>`${space ? ' ' : ''}${letter.toUpperCase()}`);
      const section = document.createElement('section');
      section.className = 'admin-category-group';
      section.dataset.menuCategory = category;
      const header = document.createElement('header');
      const headerCopy = document.createElement('div');
      headerCopy.append(textEl('h4', label), textEl('small', `${rows.length} ${rows.length === 1 ? 'menu' : 'menus'}`));
      header.append(headerCopy, textEl('span', 'Follows product order'));
      const grid = document.createElement('div');
      grid.className = 'admin-menu-grid';
      rows.forEach(row=>grid.appendChild(rowNode(row)));
      section.append(header, grid);
      return section;
    });
    body.replaceChildren(intro, ...(sections.length ? sections : [textEl('div', 'No menus configured.', 'empty-state')]));
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
    const rawRows = collectRows().filter(r=>r.id || r.name || r.baseId);
    const used = new Set();
    for(const r of rawRows){
      if(!r.id) return notifyValidation('Each menu needs an id.');
      if(!r.name) return notifyValidation(`Menu ${r.id} needs a name.`);
      if(!r.baseId || !productExists(r.baseId)) return notifyValidation(`Menu ${r.id} needs a valid base product.`);
      if(!Number.isFinite(Number(r.menuPrice)) || Number(r.menuPrice) <= 0) return notifyValidation(`Menu ${r.id} needs a menu price.`);
      if(r.defaultFries && !productExists(r.defaultFries)) return notifyValidation(`Invalid fries for ${r.id}.`);
      if(r.defaultDrink && !productExists(r.defaultDrink)) return notifyValidation(`Invalid drink for ${r.id}.`);
      if(r.defaultWingsSauce && !productExists(r.defaultWingsSauce)) return notifyValidation(`Invalid sauce for ${r.id}.`);
      if(used.has(r.id)) return notifyValidation(`Duplicate menu id: ${r.id}.`);
      used.add(r.id);
    }
    const rows = sanitizeRows(rawRows);
    applyRows(rows);
    saveRemoteSoon();
    closeEditor();
    return true;
  }
  function reset(){
    localStorage.removeItem(KEY);
    MENUS = clone(DEFAULT_MENUS);
    DRAFT = clone(MENUS);
    saveRemoteSoon();
    renderRows();
    renderPosIfAvailable();
  }

  window.BK_MENUS = { KEY, DEFAULT_MENUS: clone(DEFAULT_MENUS), load, loadRemoteOnce, remotePath, getMenus, openEditor, closeEditor, addRow, save, reset };
})();
