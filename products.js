// Product editor (local and online)
(function(){
  const KEY = 'bk_products_v1';
  const DEFAULT_REMOTE_PATH = '/pos/catalog/products';
  const CATEGORIES = [
    ['burger','Burgers'], ['wings','Wings'], ['fries','Fries'], ['salad','Salads'],
    ['drink','Drinks'], ['extra','Add-ons'], ['sauce','Sauces']
  ];
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

  function remoteEnabled(){
    return !!(window.BK_SYNC_ENABLED !== false && window.FIREBASE_CONFIG && window.firebase && window.firebase.database);
  }
  function remotePath(){
    return (window.BK_PRODUCTS_PATH || DEFAULT_REMOTE_PATH).replace(/\/+$/,'');
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

  function renderPosIfAvailable(){
    if(window.BK_UI && typeof BK_UI.renderAll === 'function' && document.getElementById('buttons')) BK_UI.renderAll();
  }

  function sanitizeRows(rows){
    if(!Array.isArray(rows)) return [];
    const out = [];
    const used = new Set();
    const categoryCounts = {};
    rows.forEach(r=>{
      const id = normalizeId(r && r.id);
      const name = String((r && r.name) || '').trim();
      const price = Number(r && r.price);
      const cat = String((r && r.cat) || '').trim().toLowerCase();
      if(!id || !name || !Number.isFinite(price) || price < 0 || !cat || used.has(id)) return;
      used.add(id);
      const fallbackOrder = (categoryCounts[cat] || 0) * 10 + 10;
      const categoryOrder = Number.isFinite(Number(r && r.categoryOrder)) ? Number(r.categoryOrder) : fallbackOrder;
      const active = r && r.active !== false;
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      const defaultProduct = (window.BK_DATA.DEFAULT_BASE || []).find(product=>product.id === id) || {};
      const sourceAddons = Array.isArray(r && r.addons) ? r.addons : (Array.isArray(defaultProduct.addons) ? defaultProduct.addons : []);
      const sourceSides = Array.isArray(r && r.sides) ? r.sides : (Array.isArray(defaultProduct.sides) ? defaultProduct.sides : []);
      const sourceDrinks = Array.isArray(r && r.drinks) ? r.drinks : (Array.isArray(defaultProduct.drinks) ? defaultProduct.drinks : []);
      out.push({
        id, name, price, cat, categoryOrder, active,
        archivedAt:active ? null : Number(r && r.archivedAt) || Date.now(),
        archivedBy:active ? null : String((r && r.archivedBy) || ''),
        addons:sourceAddons.map(normalizeId).filter(Boolean),
        sides:sourceSides.map(normalizeId).filter(Boolean),
        drinks:sourceDrinks.map(normalizeId).filter(Boolean)
      });
    });
    return out;
  }

  function withSystemProducts(rows){
    const clean = Array.isArray(rows) ? rows.slice() : [];
    const ids = new Set(clean.map(row=>row.id));
    (window.BK_DATA.DEFAULT_BASE || []).forEach(product=>{
      if(!String(product.id || '').startsWith('i_sauce_') || ids.has(product.id)) return;
      const sameCategory = clean.filter(row=>row.cat === product.cat);
      clean.push({id:product.id, name:product.name, price:0, cat:product.cat, categoryOrder:(sameCategory.length + 1) * 10, active:true, archivedAt:null, archivedBy:null});
    });
    return clean;
  }

  function applyRows(rows){
    const clean = withSystemProducts(sanitizeRows(rows));
    if(!clean.length) return false;
    window.BK_DATA.BASE = clean;
    try{ localStorage.setItem(KEY, JSON.stringify(clean)); }catch(e){}
    renderPosIfAvailable();
    return true;
  }
  function saveRows(rows, options){
    if(!applyRows(rows)) return false;
    if(!(options && options.localOnly)) saveRemoteSoon();
    return true;
  }

  function loadRemoteOnce(){
    const ref = remoteRef();
    if(!ref) return Promise.resolve(false);
    return ref.get().then(snap=>{
      const val = snap.val();
      const rows = val && Array.isArray(val.rows) ? val.rows : val;
      return applyRows(rows);
    }).catch(e=>{
      console.warn('products remote load failed:', e && e.message);
      return false;
    });
  }

  function saveRemoteSoon(){
    const ref = remoteRef();
    if(!ref) return;
    if(remoteSaveTimer) clearTimeout(remoteSaveTimer);
    remoteSaveTimer = setTimeout(()=>{
      ref.set({ rows: sanitizeRows(window.BK_DATA.BASE || []), ts: Date.now() }).catch(e=>{
        console.warn('products remote save failed:', e && e.message);
      });
    }, 250);
  }

  function load(){
    try{
      const raw = localStorage.getItem(KEY);
      if(raw) applyRows(JSON.parse(raw));
    }catch(e){
      localStorage.removeItem(KEY);
    }
    loadRemoteOnce();
  }

  function collectRows(){
    const body = document.getElementById('productsBody');
    const rows = [];
    body.querySelectorAll('[data-prod-row]').forEach(row=>{
      const id = normalizeId(row.querySelector('[data-field="id"]').value);
      const name = String(row.querySelector('[data-field="name"]').value || '').trim();
      const price = Number(row.querySelector('[data-field="price"]').value);
      const cat = String(row.querySelector('[data-field="cat"]').value || '').trim().toLowerCase();
      const group = row.closest('[data-category]');
      const siblings = group ? Array.from(group.querySelectorAll('[data-prod-row]')) : [];
      rows.push({id, name, price, cat, categoryOrder:(siblings.indexOf(row) + 1) * 10});
    });
    return rows;
  }

  function textEl(tag, text, className){
    const el = document.createElement(tag);
    if(className) el.className = className;
    el.textContent = text == null ? '' : String(text);
    return el;
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
  function categorySelect(selected){
    const select = document.createElement('select');
    select.dataset.field = 'cat';
    select.replaceChildren(...CATEGORIES.map(([value,label])=>{
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      option.selected = value === selected;
      return option;
    }));
    return select;
  }
  function notifyValidation(message){
    const body = document.getElementById('productsBody');
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
  function rowNode(p){
    const row = document.createElement('div');
    row.className = 'admin-data-row product-editor-row';
    row.dataset.prodRow = '';
    row.draggable = true;
    const controls = document.createElement('div');
    controls.className = 'product-order-controls';
    const name = p.name || 'new product';
    const drag = textEl('button', '⠿', 'drag-handle');
    drag.type = 'button';
    drag.setAttribute('aria-label', `Drag ${name} to reorder`);
    drag.title = 'Drag to reorder';
    const up = textEl('button', '↑');
    up.type = 'button';
    up.dataset.move = '-1';
    up.setAttribute('aria-label', `Move ${name} up`);
    up.title = 'Move up';
    const down = textEl('button', '↓');
    down.type = 'button';
    down.dataset.move = '1';
    down.setAttribute('aria-label', `Move ${name} down`);
    down.title = 'Move down';
    controls.append(drag, up, down);
    const price = inputField('price', Number.isFinite(p.price) ? p.price : '', '0', 'number');
    price.step = '1';
    price.min = '0';
    const currency = document.createElement('span');
    currency.className = 'currency-field';
    currency.append(price, textEl('b', 'GHS'));
    const advanced = document.createElement('details');
    advanced.className = 'admin-advanced';
    advanced.append(textEl('summary', 'Technical ID'), inputField('id', p.id, 'product_id'));
    const remove = textEl('button', 'Delete', 'mini admin-row-danger');
    remove.type = 'button';
    remove.dataset.remove = '';
    row.append(
      controls,
      field('Product name', inputField('name', p.name, 'Product name')),
      field('Price', currency),
      field('Category', categorySelect(p.cat)),
      advanced,
      remove
    );
    return row;
  }

  function bindRowEvents(body){
    body.querySelectorAll('button[data-remove]').forEach(btn=>{
      btn.onclick = ()=>{
        const row = btn.closest('[data-prod-row]');
        if(row){
          const group = row.closest('[data-category]');
          row.remove();
          if(group && !group.querySelector('[data-prod-row]')) group.remove();
        }
      };
    });
    body.querySelectorAll('select[data-field="cat"]').forEach(select=>{
      select.onchange = ()=>{
        const row = select.closest('[data-prod-row]');
        const rowIndex = Array.from(body.querySelectorAll('[data-prod-row]')).indexOf(row);
        const id = normalizeId(row.querySelector('[data-field="id"]').value);
        const rows = collectRows();
        const changed = rows[rowIndex];
        if(changed){
          const targetOrders = rows.filter(product=>product !== changed && product.cat === changed.cat).map(product=>Number(product.categoryOrder || 0));
          changed.categoryOrder = (targetOrders.length ? Math.max(...targetOrders) : 0) + 10;
        }
        DRAFT = rows;
        renderRows();
        const moved = Array.from(body.querySelectorAll('[data-prod-row]')).find(productRow=>normalizeId(productRow.querySelector('[data-field="id"]').value) === id);
        if(moved){
          moved.scrollIntoView({block:'nearest'});
          moved.querySelector('[data-field="cat"]').focus();
        }
      };
    });
    body.querySelectorAll('button[data-move]').forEach(button=>{
      button.onclick = ()=>{
        const row = button.closest('[data-prod-row]');
        const rows = Array.from(row.parentElement.querySelectorAll('[data-prod-row]'));
        const index = rows.indexOf(row);
        const nextIndex = index + Number(button.dataset.move);
        if(nextIndex < 0 || nextIndex >= rows.length) return;
        if(nextIndex < index) row.parentElement.insertBefore(row, rows[nextIndex]);
        else row.parentElement.insertBefore(row, rows[nextIndex].nextSibling);
        const category = row.closest('[data-category]') && row.closest('[data-category]').dataset.category;
        DRAFT = collectRows();
        renderRows();
        const group = body.querySelector(`[data-category="${category}"]`);
        const movedRows = group ? group.querySelectorAll('[data-prod-row]') : [];
        const moved = movedRows[nextIndex];
        if(moved) moved.querySelector(`button[data-move="${button.dataset.move}"]`).focus();
      };
    });
    let dragged = null;
    body.querySelectorAll('[data-prod-row]').forEach(row=>{
      row.ondragstart = event=>{
        dragged = row;
        row.classList.add('dragging');
        event.dataTransfer.effectAllowed = 'move';
      };
      row.ondragend = ()=>{
        row.classList.remove('dragging');
        dragged = null;
        DRAFT = collectRows();
      };
      row.ondragover = event=>{
        if(!dragged || dragged === row || dragged.closest('[data-category]') !== row.closest('[data-category]')) return;
        event.preventDefault();
        const rect = row.getBoundingClientRect();
        row.parentNode.insertBefore(dragged, event.clientY < rect.top + rect.height / 2 ? row : row.nextSibling);
      };
    });
  }

  function renderRows(){
    const body = document.getElementById('productsBody');
    if(!body) return;
    const intro = document.createElement('div');
    intro.className = 'admin-editor-intro';
    const introCopy = document.createElement('div');
    introCopy.append(textEl('h4', 'Products and display order'), textEl('p', 'Change a category to move a product into the correct group. Drag products or use the arrow buttons to control their order in the POS.'));
    intro.append(introCopy, textEl('span', `${DRAFT.length} products`, 'admin-count-badge'));
    const groups = CATEGORIES.map(([cat,label])=>{
      const rows = DRAFT.filter(row=>row.cat === cat).sort((a,b)=>Number(a.categoryOrder||0)-Number(b.categoryOrder||0));
      if(!rows.length) return null;
      const section = document.createElement('section');
      section.className = 'admin-category-group';
      section.dataset.category = cat;
      const header = document.createElement('header');
      const headerCopy = document.createElement('div');
      headerCopy.append(textEl('h4', label), textEl('small', `${rows.length} product${rows.length === 1 ? '' : 's'}`));
      header.append(headerCopy, textEl('span', 'Drag or use the arrow buttons to set POS order'));
      const labels = document.createElement('div');
      labels.className = 'admin-column-labels product-column-labels';
      ['', 'Product', 'Price', 'Category', 'Details', 'Action'].forEach(text=>labels.appendChild(textEl('span', text)));
      const list = document.createElement('div');
      list.className = 'admin-category-rows';
      rows.forEach(row=>list.appendChild(rowNode(row)));
      section.append(header, labels, list);
      return section;
    }).filter(Boolean);
    body.replaceChildren(intro, ...groups);
    bindRowEvents(body);
  }

  function openEditor(options){
    DRAFT = clone(window.BK_DATA.BASE || []);
    renderRows();
    const modal = document.getElementById('modalProducts');
    if(modal && (!options || options.showModal !== false)) modal.classList.add('open');
  }

  function closeEditor(){
    const modal = document.getElementById('modalProducts');
    if(modal) modal.classList.remove('open');
  }

  function addRow(){
    DRAFT = collectRows();
    const cat = 'extra';
    const count = DRAFT.filter(row=>row.cat === cat).length;
    DRAFT.push({id:`new_product_${Date.now()}`, name:'New product', price:0, cat, categoryOrder:(count + 1) * 10});
    renderRows();
    const rows = document.querySelectorAll('#productsBody [data-prod-row]');
    const added = rows[rows.length - 1];
    if(added){ added.scrollIntoView({block:'center'}); added.querySelector('[data-field="name"]').select(); }
  }

  function save(){
    const rawRows = collectRows().filter(r=> r.id || r.name);
    if(!rawRows.length) return notifyValidation('Add at least one product.');

    const idSet = new Set();
    for(const r of rawRows){
      if(!r.id) return notifyValidation('Each product needs an id.');
      if(!r.name) return notifyValidation(`Product ${r.id} needs a name.`);
      if(!Number.isFinite(r.price) || r.price < 0) return notifyValidation(`Invalid price for ${r.id}.`);
      if(!r.cat) return notifyValidation(`Product ${r.id} needs a category.`);
      if(idSet.has(r.id)) return notifyValidation(`Duplicate id: ${r.id}.`);
      idSet.add(r.id);
    }

    const rows = sanitizeRows(rawRows);
    applyRows(rows);
    saveRemoteSoon();
    closeEditor();
    return true;
  }

  function reset(){
    localStorage.removeItem(KEY);
    window.BK_DATA.BASE = clone(window.BK_DATA.DEFAULT_BASE || []);
    DRAFT = clone(window.BK_DATA.BASE);
    saveRemoteSoon();
    renderRows();
    renderPosIfAvailable();
  }

  window.BK_PRODUCTS = { KEY, load, loadRemoteOnce, remotePath, openEditor, closeEditor, addRow, save, saveRows, reset };
})();
