(function(){
  const PACK_RULES_KEY = 'bk_packaging_rules_v1';
  const PACK_RULES_DEFAULT = {
    drinkBagId: 'white_plastic_bag',
    foodBagSmallId: 'small_paper_bag',
    foodBagMediumId: 'medium_paper_bag',
    foodBagLargeId: 'large_paper_bag',
    mediumFoodMin: 2,
    largeFoodMin: 4,
    largeMenuChildMin: 2
  };

  function loadPackagingRules(){
    try{
      const parsed = JSON.parse(localStorage.getItem(PACK_RULES_KEY) || '{}');
      return Object.assign({}, PACK_RULES_DEFAULT, parsed || {});
    }catch(e){ return Object.assign({}, PACK_RULES_DEFAULT); }
  }
  function savePackagingRules(rules){
    localStorage.setItem(PACK_RULES_KEY, JSON.stringify(Object.assign({}, PACK_RULES_DEFAULT, rules || {})));
  }
  let confirmResolve = null;
  function showToast(message, error){
    const toast = document.createElement('div');
    toast.className = `admin-toast${error ? ' error' : ''}`;
    toast.textContent = message;
    document.getElementById('adminToastRegion').appendChild(toast);
    setTimeout(()=>toast.remove(), 4000);
  }
  function confirmAction(title, message, acceptLabel){
    document.getElementById('adminConfirmTitle').textContent = title;
    document.getElementById('adminConfirmMessage').textContent = message;
    document.getElementById('adminConfirmAccept').textContent = acceptLabel;
    document.getElementById('adminConfirmModal').classList.add('open');
    document.getElementById('adminConfirmCancel').focus();
    return new Promise(resolve=>{ confirmResolve = resolve; });
  }
  function finishConfirmation(value){
    document.getElementById('adminConfirmModal').classList.remove('open');
    if(confirmResolve) confirmResolve(value);
    confirmResolve = null;
  }
  async function saveWithFeedback(save, label){
    try{
      const result = await Promise.resolve(save());
      if(result === false) return false;
      showToast(`${label} saved successfully.`);
      setTimeout(refreshDbStatus, 500);
      return true;
    }catch(error){
      showToast(`${label} could not be saved.`, true);
      console.error(`Failed to save ${label}:`, error);
      return false;
    }
  }
  async function resetWithConfirmation(reset, label){
    if(!await confirmAction(`Reset ${label}?`, 'This replaces the current values with their defaults and cannot be undone.', 'Reset to defaults')) return;
    reset();
    showToast(`${label} reset to defaults.`);
    setTimeout(refreshDbStatus, 500);
  }
  const editorBaselines = new Map();
  const editorObservers = new Map();
  function editorSnapshot(modal){
    const controls = Array.from(modal.querySelectorAll('.body input,.body select,.body textarea')).map(control=>({
      key: control.dataset.field || control.dataset.productId || control.dataset.imgId || control.id || control.name || control.type,
      value: control.type === 'checkbox' || control.type === 'radio' ? control.checked : control.value
    }));
    const rows = Array.from(modal.querySelectorAll('.body [data-prod-row],.body [data-menu-row],.body [data-ing-row],.body [data-recipe-row]')).map(row=>{
      const identity = row.querySelector('[data-field="id"],[data-product-id]');
      return identity ? identity.value || identity.dataset.productId : row.textContent.trim().slice(0, 80);
    });
    return JSON.stringify({controls, rows});
  }
  function updateEditorDirtyState(modal){
    const dirty = editorBaselines.has(modal.id) && editorSnapshot(modal) !== editorBaselines.get(modal.id);
    modal.dataset.dirty = dirty ? 'true' : 'false';
    let state = modal.querySelector('.workspace-dirty-state');
    if(!state){
      state = document.createElement('span');
      state.className = 'workspace-dirty-state';
      modal.querySelector('.sheet>header>div:first-child').appendChild(state);
    }
    state.textContent = dirty ? 'Unsaved changes' : 'All changes saved';
    state.classList.toggle('dirty', dirty);
    return dirty;
  }
  function trackEditor(modalId){
    const modal = document.getElementById(modalId);
    if(!modal) return;
    editorBaselines.set(modalId, editorSnapshot(modal));
    updateEditorDirtyState(modal);
    if(editorObservers.has(modalId)) editorObservers.get(modalId).disconnect();
    const update = ()=>updateEditorDirtyState(modal);
    const body = modal.querySelector('.body');
    if(!body.dataset.dirtyTracking){
      body.addEventListener('input', ()=>updateEditorDirtyState(modal));
      body.addEventListener('change', ()=>updateEditorDirtyState(modal));
      body.dataset.dirtyTracking = 'true';
    }
    const observer = new MutationObserver(update);
    observer.observe(body, {childList:true, subtree:true});
    editorObservers.set(modalId, observer);
  }
  function markEditorSaved(modalId){
    const modal = document.getElementById(modalId);
    if(!modal) return;
    editorBaselines.set(modalId, editorSnapshot(modal));
    updateEditorDirtyState(modal);
  }
  function openEditorModal(modalId, open){
    open();
    setTimeout(()=>trackEditor(modalId), 0);
  }
  function activeDirtyEditor(){
    return Array.from(document.querySelectorAll('.admin-editor-modal.open')).find(modal=>updateEditorDirtyState(modal));
  }
  async function guardWorkspaceChange(next){
    const dirtyModal = activeDirtyEditor();
    if(dirtyModal){
      const title = dirtyModal.querySelector('.sheet>header b');
      const discard = await confirmAction('Discard unsaved changes?', `Changes in ${title ? title.textContent : 'this editor'} have not been saved.`, 'Discard changes');
      if(!discard) return false;
    }
    next();
    return true;
  }
  function packagingRuleRow(label, id, value, help, numeric){
    return `<label class="packaging-rule-field"><span>${label}</span><input id="${id}" ${numeric ? 'type="number" min="0" step="1"' : 'type="text"'} value="${String(value == null ? '' : value)}" aria-describedby="${id}Help ${id}Error"><small id="${id}Help">${help}</small><small class="packaging-rule-error" id="${id}Error"></small></label>`;
  }
  function openPackagingRules(){
    const modal = document.getElementById('modalPackagingRules');
    const body = document.getElementById('packagingRulesBody');
    if(!modal || !body) return;
    const cfg = loadPackagingRules();
    body.innerHTML = `
      <div class="stock-editor-intro"><div><h4>Handover packaging mapping</h4><p>Adjust bag IDs and thresholds without changing code.</p></div></div>
      <div class="packaging-rule-grid">
      ${packagingRuleRow('Drink bag ID', 'packDrinkBagId', cfg.drinkBagId, 'Used for drinks only (e.g. white_plastic_bag).', false)}
      ${packagingRuleRow('Food small bag ID', 'packFoodSmallBagId', cfg.foodBagSmallId, 'Used for small food orders.')}
      ${packagingRuleRow('Food medium bag ID', 'packFoodMediumBagId', cfg.foodBagMediumId, 'Used when food count reaches medium threshold.')}
      ${packagingRuleRow('Food large bag ID', 'packFoodLargeBagId', cfg.foodBagLargeId, 'Used when order is large or menu-heavy.')}
      ${packagingRuleRow('Medium threshold (food items)', 'packMediumFoodMin', cfg.mediumFoodMin, 'Minimum food item count to use medium bag.', true)}
      ${packagingRuleRow('Large threshold (food items)', 'packLargeFoodMin', cfg.largeFoodMin, 'Minimum food item count to use large bag.', true)}
      ${packagingRuleRow('Large threshold (menu child lines)', 'packLargeMenuMin', cfg.largeMenuChildMin, 'Minimum menu-linked child count to force large bag.', true)}
      </div>
      <div class="packaging-preview"><h4>Packaging preview</h4><ul id="packagingPreview"></ul></div>
    `;
    body.oninput = updatePackagingPreview;
    updatePackagingPreview();
    modal.classList.add('open');
    setTimeout(()=>trackEditor('modalPackagingRules'), 0);
  }
  function closePackagingRules(){
    const modal = document.getElementById('modalPackagingRules');
    if(modal) modal.classList.remove('open');
  }
  function savePackagingRulesFromModal(){
    const next = {
      drinkBagId: document.getElementById('packDrinkBagId').value.trim(),
      foodBagSmallId: document.getElementById('packFoodSmallBagId').value.trim(),
      foodBagMediumId: document.getElementById('packFoodMediumBagId').value.trim(),
      foodBagLargeId: document.getElementById('packFoodLargeBagId').value.trim(),
      mediumFoodMin: Number(document.getElementById('packMediumFoodMin').value),
      largeFoodMin: Number(document.getElementById('packLargeFoodMin').value),
      largeMenuChildMin: Number(document.getElementById('packLargeMenuMin').value)
    };
    if(!validatePackagingRules(next)){
      showToast('Check the highlighted packaging fields.', true);
      return false;
    }
    savePackagingRules(next);
    markEditorSaved('modalPackagingRules');
    closePackagingRules();
    return true;
  }
  function validatePackagingRules(rules){
    const errors = {};
    ['packDrinkBagId','packFoodSmallBagId','packFoodMediumBagId','packFoodLargeBagId'].forEach(id=>{
      if(!document.getElementById(id).value.trim()) errors[id] = 'A bag ID is required.';
    });
    [['packMediumFoodMin', rules.mediumFoodMin],['packLargeFoodMin', rules.largeFoodMin],['packLargeMenuMin', rules.largeMenuChildMin]].forEach(([id, value])=>{
      if(!Number.isInteger(value) || value < 0) errors[id] = 'Enter a whole number of zero or more.';
    });
    if(!errors.packLargeFoodMin && !errors.packMediumFoodMin && rules.largeFoodMin <= rules.mediumFoodMin) errors.packLargeFoodMin = 'Large threshold must be greater than the medium threshold.';
    document.querySelectorAll('.packaging-rule-error').forEach(error=>{
      const input = document.getElementById(error.id.replace(/Error$/, ''));
      const message = errors[input.id] || '';
      error.textContent = message;
      input.setAttribute('aria-invalid', message ? 'true' : 'false');
    });
    return Object.keys(errors).length === 0;
  }
  function updatePackagingPreview(){
    const preview = document.getElementById('packagingPreview');
    if(!preview) return;
    const values = [[1, 'packFoodSmallBagId'],[document.getElementById('packMediumFoodMin').value || '–', 'packFoodMediumBagId'],[document.getElementById('packLargeFoodMin').value || '–', 'packFoodLargeBagId']];
    preview.textContent = '';
    values.forEach(([count, id])=>{
      const item = document.createElement('li');
      item.textContent = `${count} food item${String(count) === '1' ? '' : 's'} → ${document.getElementById(id).value.trim() || 'Bag not selected'}`;
      preview.appendChild(item);
    });
  }
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
      { label: 'Menus', path: pathFor('BK_MENUS_PATH', '/pos/catalog/menus') },
      { label: 'Prices', path: pathFor('BK_PRICES_PATH', '/pos/catalog/prices') },
      { label: 'Stock Ingredients', path: pathFor('BK_STOCK_INGREDIENTS_PATH', '/pos/stock/ingredients') },
      { label: 'Stock Recipes', path: pathFor('BK_STOCK_RECIPES_PATH', '/pos/stock/recipes') },
      { label: 'Stock Locations', path: pathFor('BK_STOCK_LOCATIONS_PATH', '/pos/stock/config/locations') },
      { label: 'Stock Inventory', path: pathFor('BK_STOCK_INVENTORY_PATH', '/pos/stock/inventory') },
      { label: 'Stock Add-ons', path: pathFor('BK_STOCK_ADDONS_PATH', '/pos/stock/addons') },
      { label: 'Stock Transfers', path: pathFor('BK_STOCK_TRANSFERS_PATH', '/pos/stock/transfers') },
      { label: 'Stock Movements', path: pathFor('BK_STOCK_MOVEMENTS_PATH', '/pos/stock/movements') },
      { label: 'History', path: pathFor('BK_HISTORY_PATH', '/pos/history') }
    ];
  }
  function escapeHtml(value){
    return String(value == null ? '' : value).replace(/[&<>"']/g, char=>({
      '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
    }[char]));
  }
  function formatTs(v){
    const n = Number(v);
    if(!Number.isFinite(n) || n <= 0) return '-';
    const elapsed = Date.now() - n;
    const future = elapsed < 0;
    const absolute = Math.abs(elapsed);
    let value;
    let unit;
    if(absolute < 60000){ value = Math.max(1, Math.round(absolute / 1000)); unit = 'second'; }
    else if(absolute < 3600000){ value = Math.round(absolute / 60000); unit = 'minute'; }
    else if(absolute < 86400000){ value = Math.round(absolute / 3600000); unit = 'hour'; }
    else if(absolute < 2592000000){ value = Math.round(absolute / 86400000); unit = 'day'; }
    else{ value = Math.round(absolute / 2592000000); unit = 'month'; }
    return future ? `in ${value} ${unit}${value === 1 ? '' : 's'}` : `${value} ${unit}${value === 1 ? '' : 's'} ago`;
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
    const summaryEl = document.getElementById('adminDbStatusSummary');
    if(!body) return;
    if(summaryEl) summaryEl.textContent = `${summary} · Checked ${new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}`;
    body.innerHTML = rows.map(r=>{
      const status = r.ok ? 'available' : String(r.status || 'error').toLowerCase();
      const tone = r.ok ? 'ok' : status === 'empty' ? 'empty' : status === 'local only' ? 'local' : 'error';
      const label = r.ok ? 'Available' : status === 'local only' ? 'Local only' : status === 'empty' ? 'Empty' : 'Error';
      const exactTime = r.ts ? new Date(Number(r.ts)).toLocaleString() : 'No activity timestamp';
      return `
      <tr>
        <td><strong>${escapeHtml(r.label)}</strong></td>
        <td><span class="admin-status-badge ${tone}"><span aria-hidden="true"></span>${label}</span></td>
        <td><span class="admin-relative-time" title="${escapeHtml(exactTime)}">${r.ts ? formatTs(r.ts) : 'Not available'}</span></td>
        <td><details class="admin-path-details"><summary aria-label="Show technical path for ${escapeHtml(r.label)}">Details</summary><code>${escapeHtml(r.path)}</code>${tone === 'error' ? `<small>${escapeHtml(r.status)}</small>` : ''}</details></td>
      </tr>`;
    }).join('');
  }
  function refreshDbStatus(){
    const body = document.getElementById('adminDbStatusBody');
    if(body) body.innerHTML = '<tr><td colspan="4" class="empty-state">Checking Firebase status...</td></tr>';
    const database = db();
    if(!database){
      renderStatus(statusRows().map(r=>Object.assign({}, r, {ok:false, status:'local only'})), 'not configured');
      return;
    }
    const authWait = Promise.race([
      authPromise,
      new Promise(resolve=> setTimeout(()=>resolve(false), 1200))
    ]);
    authWait.then(()=> Promise.all(statusRows().map(row=>
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
  BK_MENUS.load();
  BK_IMAGES.load();
  BK_STOCK.load();
  let activeStockMode = 'stock';
  const stockEditorCopy = {
    stock: { title:'Stock overview', description:'Review inventory levels, locations, transfers, and ingredient details', label:'Stock', reset:'Reset stock to defaults' }
  };
  function closeWorkspaceModals(){
    ['modalCatalog','modalMenus','modalStock','modalPackagingRules'].forEach(id=>{
      const modal = document.getElementById(id);
      if(modal) modal.classList.remove('open');
    });
  }
  function openCatalogWorkspace(){
    const modal = document.getElementById('modalCatalog');
    closeWorkspaceModals();
    BK_CATALOG.openEditor();
    modal.classList.add('open');
    setTimeout(()=>trackEditor('modalCatalog'), 0);
  }
  function showStockEditor(mode){
    closeWorkspaceModals();
    activeStockMode = mode || 'stock';
    const copy = stockEditorCopy[activeStockMode];
    document.getElementById('stockModalTitle').textContent = copy.title;
    document.getElementById('stockModalDescription').textContent = copy.description;
    document.getElementById('sReset').textContent = copy.reset;
    document.querySelectorAll('#modalStock .admin-workspace-nav button').forEach(button=>button.classList.toggle('active', button.id === 'btnStock'));
    openEditorModal('modalStock', ()=>BK_STOCK.openEditor(activeStockMode, {bodyId:'stockBody', modalId:'modalStock', titleId:'stockModalTitle'}));
  }
  function openStockEditor(mode){ return guardWorkspaceChange(()=>showStockEditor(mode)); }
  function openOperationsWorkspace(){ return guardWorkspaceChange(()=>{ closeWorkspaceModals(); openPackagingRules(); }); }
  function closeEditorSafely(modalId, close){ return guardWorkspaceChange(()=>{ markEditorSaved(modalId); close(); }); }

  document.getElementById('btnCatalog').onclick = ()=>guardWorkspaceChange(openCatalogWorkspace);
  document.getElementById('btnInventory').onclick = ()=> openStockEditor('stock');
  document.getElementById('btnOperations').onclick = openOperationsWorkspace;
  document.getElementById('catalogAdd').onclick = ()=>BK_CATALOG.addProduct();
  document.getElementById('catalogClose').onclick = ()=>closeEditorSafely('modalCatalog', ()=>document.getElementById('modalCatalog').classList.remove('open'));
  document.getElementById('catalogSave').onclick = async ()=>{
    if(await saveWithFeedback(()=>BK_CATALOG.save(), 'Product catalog')) markEditorSaved('modalCatalog');
  };
  document.getElementById('catalogReset').onclick = ()=>resetWithConfirmation(()=>BK_CATALOG.reset(), 'Product catalog');

  document.getElementById('btnMenus').onclick = ()=> guardWorkspaceChange(()=>{ closeWorkspaceModals(); openEditorModal('modalMenus', ()=>BK_MENUS.openEditor()); });
  document.getElementById('menuClose').onclick  = ()=> closeEditorSafely('modalMenus', ()=>BK_MENUS.closeEditor());
  document.getElementById('menuAdd').onclick    = ()=> BK_MENUS.addRow();
  document.getElementById('menuSave').onclick   = async ()=>{ if(await saveWithFeedback(()=>BK_MENUS.save(), 'Menus')) markEditorSaved('modalMenus'); };
  document.getElementById('menuReset').onclick  = ()=> resetWithConfirmation(()=>BK_MENUS.reset(), 'Menus');


  document.getElementById('btnStock').onclick = ()=> openStockEditor('stock');
  document.getElementById('packClose').onclick = ()=> closeEditorSafely('modalPackagingRules', closePackagingRules);
  document.getElementById('packSave').onclick = async ()=>{ if(await saveWithFeedback(savePackagingRulesFromModal, 'Packaging rules')) markEditorSaved('modalPackagingRules'); };
  document.getElementById('packReset').onclick = ()=> resetWithConfirmation(()=>{ savePackagingRules(PACK_RULES_DEFAULT); openPackagingRules(); }, 'Packaging rules');
  document.getElementById('sClose').onclick   = ()=> closeEditorSafely('modalStock', ()=>BK_STOCK.closeEditor());
  document.getElementById('sSave').onclick    = async ()=>{ if(await saveWithFeedback(()=>BK_STOCK.save(), stockEditorCopy[activeStockMode].label)) markEditorSaved('modalStock'); };
  document.getElementById('sReset').onclick   = ()=> resetWithConfirmation(()=>{ BK_STOCK.resetEditor(activeStockMode); showStockEditor(activeStockMode); }, stockEditorCopy[activeStockMode].label);
  document.getElementById('btnRefreshDbStatus').onclick = refreshDbStatus;
  document.getElementById('adminConfirmCancel').onclick = ()=> finishConfirmation(false);
  document.getElementById('adminConfirmAccept').onclick = ()=> finishConfirmation(true);
  window.addEventListener('beforeunload', event=>{
    if(!activeDirtyEditor()) return;
    event.preventDefault();
    event.returnValue = '';
  });
})();
