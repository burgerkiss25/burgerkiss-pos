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
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      out.push({id, name, price, cat, categoryOrder});
    });
    return out;
  }

  function withSystemProducts(rows){
    const clean = Array.isArray(rows) ? rows.slice() : [];
    const ids = new Set(clean.map(row=>row.id));
    (window.BK_DATA.DEFAULT_BASE || []).forEach(product=>{
      if(!String(product.id || '').startsWith('i_sauce_') || ids.has(product.id)) return;
      const sameCategory = clean.filter(row=>row.cat === product.cat);
      clean.push({id:product.id, name:product.name, price:0, cat:product.cat, categoryOrder:(sameCategory.length + 1) * 10});
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

  function esc(value){
    return String(value == null ? '' : value).replace(/[&<>"']/g, char=>({
      '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
    }[char]));
  }
  function categoryOptions(selected){
    return CATEGORIES.map(([value,label])=>`<option value="${value}" ${value === selected ? 'selected' : ''}>${label}</option>`).join('');
  }
  function rowHtml(p){
    return `
      <div class="admin-data-row product-editor-row" data-prod-row draggable="true">
        <div class="product-order-controls">
          <button class="drag-handle" type="button" aria-label="Drag ${esc(p.name || 'new product')} to reorder" title="Drag to reorder">⠿</button>
          <button type="button" data-move="-1" aria-label="Move ${esc(p.name || 'new product')} up" title="Move up">↑</button>
          <button type="button" data-move="1" aria-label="Move ${esc(p.name || 'new product')} down" title="Move down">↓</button>
        </div>
        <label><span>Product name</span><input data-field="name" placeholder="Product name" value="${esc(p.name)}"></label>
        <label><span>Price</span><span class="currency-field"><input data-field="price" type="number" step="1" min="0" placeholder="0" value="${Number.isFinite(p.price)?p.price:''}"><b>GHS</b></span></label>
        <label><span>Category</span><select data-field="cat">${categoryOptions(p.cat)}</select></label>
        <details class="admin-advanced"><summary>Technical ID</summary><input data-field="id" placeholder="product_id" value="${esc(p.id)}"></details>
        <button class="mini admin-row-danger" type="button" data-remove>Delete</button>
      </div>`;
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
    const grouped = CATEGORIES.map(([cat,label])=>{
      const rows = DRAFT.filter(row=>row.cat === cat).sort((a,b)=>Number(a.categoryOrder||0)-Number(b.categoryOrder||0));
      if(!rows.length) return '';
      return `<section class="admin-category-group" data-category="${cat}">
        <header><div><h4>${label}</h4><small>${rows.length} product${rows.length === 1 ? '' : 's'}</small></div><span>Drag or use the arrow buttons to set POS order</span></header>
        <div class="admin-column-labels product-column-labels"><span></span><span>Product</span><span>Price</span><span>Category</span><span>Details</span><span>Action</span></div>
        <div class="admin-category-rows">${rows.map(rowHtml).join('')}</div>
      </section>`;
    }).join('');
    body.innerHTML = `<div class="admin-editor-intro"><div><h4>Products and display order</h4><p>Change a category to move a product into the correct group. Drag products or use the arrow buttons to control their order in the POS.</p></div><span class="admin-count-badge">${DRAFT.length} products</span></div>${grouped}`;
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
    const rows = sanitizeRows(collectRows().filter(r=> r.id || r.name));
    if(!rows.length){ alert('Add at least one product.'); return; }

    const idSet = new Set();
    for(const r of rows){
      if(!r.id){ alert('Each product needs an id.'); return; }
      if(!r.name){ alert(`Product ${r.id} needs a name.`); return; }
      if(!Number.isFinite(r.price) || r.price < 0){ alert(`Invalid price for ${r.id}.`); return; }
      if(!r.cat){ alert(`Product ${r.id} needs a category.`); return; }
      if(idSet.has(r.id)){ alert(`Duplicate id: ${r.id}`); return; }
      idSet.add(r.id);
    }

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

  window.BK_PRODUCTS = { KEY, load, loadRemoteOnce, remotePath, openEditor, closeEditor, addRow, save, reset };
})();
