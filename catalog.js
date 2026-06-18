(function(){
  const CATEGORIES = [
    ['burger','Burgers'],['wings','Wings'],['fries','Fries'],['salad','Salads'],
    ['drink','Drinks'],['extra','Add-ons'],['sauce','Sauces']
  ];
  let DRAFT = [];
  let imageChanges = {};
  let initialIds = [];
  let baseline = new Map();
  let search = '';
  let filter = 'active';
  let saving = false;
  let history = [];
  const HISTORY_KEY = 'bk_catalog_history_v1';

  function clone(value){ return JSON.parse(JSON.stringify(value)); }
  function readHistory(){
    try{ history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }catch(error){ history = []; }
    if(!Array.isArray(history)) history = [];
  }
  function persistHistory(){
    history = history.slice(-200);
    try{ localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); }catch(error){}
  }
  function esc(value){
    return String(value == null ? '' : value).replace(/[&<>"']/g, char=>({
      '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
    }[char]));
  }
  function categoryLabel(category){
    const match = CATEGORIES.find(([id])=>id === category);
    return match ? match[1] : String(category || 'Other');
  }
  function categoryOptions(selected){
    return CATEGORIES.map(([id, label])=>`<option value="${id}" ${id === selected ? 'selected' : ''}>${label}</option>`).join('');
  }
  function ingredientOptions(){
    return Object.entries(BK_STOCK.getIngredients()).map(([id, ingredient])=>`<option value="${esc(id)}">${esc(ingredient.name || id)} (${esc(id)})</option>`).join('');
  }
  function addonChoices(currentId){
    return DRAFT.filter(product=>product.active !== false && product.id !== currentId && (product.cat === 'extra' || String(product.id || '').startsWith('x_sauce_')))
      .sort((a,b)=>String(a.name).localeCompare(String(b.name)))
      .map(product=>({id:product.id, name:product.name, price:Number(product.price) || 0}));
  }
  function addonEditor(item, index){
    if(item.cat === 'extra' || item.cat === 'sauce' || item.cat === 'drink') return '<p class="muted">Add-ons are configured on main products like burgers, fries, and wings.</p>';
    const selected = new Set(Array.isArray(item.addons) ? item.addons : []);
    const choices = addonChoices(item.id);
    if(!choices.length) return '<p class="muted">Create active add-on products first, then attach them here.</p>';
    return `<div class="catalog-addon-editor" data-addon-editor="${index}">${choices.map(choice=>`<label class="catalog-addon-choice"><input type="checkbox" data-addon-choice="${esc(choice.id)}" ${selected.has(choice.id) ? 'checked' : ''}><span>${esc(choice.name)}</span><small>${choice.price} GHS · ${esc(choice.id)}</small></label>`).join('')}</div>`;
  }
  function loadDraft(){
    DRAFT = (BK_DATA.BASE || []).map(product=>({
      id:product.id,
      originalId:product.id,
      name:product.name,
      cat:product.cat,
      price:BK_PRICES.getPrice(product.id),
      categoryOrder:Number(product.categoryOrder || 0),
      active:product.active !== false,
      archivedAt:product.archivedAt || null,
      archivedBy:product.archivedBy || null,
      image:BK_IMAGES.get(product.id),
      recipe:BK_STOCK.getRecipe(product.id),
      addons:Array.isArray(product.addons) ? product.addons.slice() : []
    }));
    initialIds = DRAFT.map(item=>item.id);
    baseline = new Map(DRAFT.map(item=>[item.originalId, JSON.stringify(item)]));
    imageChanges = {};
  }
  function changeState(item){
    if(!baseline.has(item.originalId)) return 'New';
    return baseline.get(item.originalId) === JSON.stringify(item) ? '' : 'Modified';
  }
  function changedCount(){
    const changed = DRAFT.filter(changeState).length;
    const currentIds = new Set(DRAFT.map(item=>item.id));
    return changed + initialIds.filter(id=>!currentIds.has(id)).length;
  }
  function updateSaveButton(){
    const button = document.getElementById('catalogSave');
    if(!button) return;
    const count = changedCount();
    button.disabled = saving || count === 0;
    button.textContent = saving ? 'Saving…' : count ? `Save ${count} change${count === 1 ? '' : 's'}` : 'All changes saved';
  }
  function firebaseDatabase(){
    if(window.BK_SYNC_ENABLED === false || !window.FIREBASE_CONFIG || !window.firebase || !window.firebase.database) return null;
    const app = window.firebase.apps && firebase.apps.length ? firebase.app() : firebase.initializeApp(window.FIREBASE_CONFIG);
    return firebase.database(app);
  }
  function updatePath(updates, path, value){
    updates[String(path || '').replace(/^\/+|\/+$/g,'')] = value;
  }
  async function saveRemoteAtomically(rows, prices, recipes, images, auditEvent){
    const database = firebaseDatabase();
    if(!database) return {online:false};
    const ts = Date.now();
    const updates = {};
    updatePath(updates, BK_PRODUCTS.remotePath(), {rows, ts});
    updatePath(updates, BK_PRICES.remotePath(), {map:prices, ts});
    updatePath(updates, BK_IMAGES.remotePath(), {map:images, ts});
    const stockPaths = BK_STOCK.stockPaths();
    updatePath(updates, stockPaths.recipes, {map:recipes, ts});
    const addonRecipes = {};
    DRAFT.filter(item=>item.active !== false && (item.cat === 'extra' || item.cat === 'sauce')).forEach(item=>{ addonRecipes[item.id] = recipes[item.id] || {}; });
    updatePath(updates, stockPaths.addons, {map:addonRecipes, ts});
    updatePath(updates, '/pos/catalog/meta', {updatedAt:ts, source:'admin-product-catalog'});
    if(auditEvent) updatePath(updates, `/pos/catalog/history/${auditEvent.id}`, auditEvent);
    await database.ref().update(updates);
    return {online:true, ts};
  }
  function auditValue(field, value){
    if(field === 'image') return value ? 'Image set' : 'No image';
    if(field === 'recipe') return `${Object.keys(value || {}).length} ingredients`;
    return value;
  }
  function buildAuditEvent(removedIds){
    const actor = window.BK_ACCESS && BK_ACCESS.actor ? BK_ACCESS.actor() : null;
    const changes = [];
    DRAFT.forEach(item=>{
      const rawBefore = baseline.get(item.originalId);
      if(!rawBefore){
        changes.push({productId:item.id, productName:item.name, action:'created', fields:['name','price','category','image','recipe']});
        return;
      }
      const before = JSON.parse(rawBefore);
      const fields = [];
      [['name','name'],['price','price'],['category','cat'],['image','image'],['recipe','recipe'],['add-ons','addons'],['display order','categoryOrder'],['product ID','id']].forEach(([label,key])=>{
        if(JSON.stringify(before[key]) !== JSON.stringify(item[key])) fields.push({field:label, before:auditValue(key,before[key]), after:auditValue(key,item[key])});
      });
      const action = before.active !== false && item.active === false ? 'archived'
        : before.active === false && item.active !== false ? 'restored'
          : 'updated';
      if(fields.length || action !== 'updated') changes.push({productId:item.id, productName:item.name, action, fields});
    });
    removedIds.forEach(id=>{
      const before = baseline.get(id);
      const product = before ? JSON.parse(before) : {id,name:id};
      changes.push({productId:id, productName:product.name || id, action:'deleted', fields:[]});
    });
    if(!changes.length) return null;
    const ts = Date.now();
    return {
      id:`${ts}_${actor && actor.id ? actor.id : 'unknown'}`,
      ts,
      actor:actor || {id:'unknown', name:'Unknown user', role:'unknown'},
      changes
    };
  }
  function productHistory(item){
    const entries = history.flatMap(event=>(event.changes || [])
      .filter(change=>change.productId === item.id || change.productId === item.originalId)
      .map(change=>({event,change})))
      .sort((a,b)=>b.event.ts-a.event.ts)
      .slice(0,5);
    if(!entries.length) return '<p class="muted">No product changes recorded yet.</p>';
    return `<div class="catalog-history-list">${entries.map(({event,change})=>{
      const actor = event.actor && event.actor.name ? event.actor.name : 'Unknown user';
      const detail = Array.isArray(change.fields) && change.fields.length
        ? change.fields.map(field=>typeof field === 'string' ? field : `${field.field}: ${field.before} → ${field.after}`).join(' · ')
        : change.action;
      return `<article><b>${esc(actor)} · ${esc(change.action)}</b><time datetime="${new Date(event.ts).toISOString()}">${new Date(event.ts).toLocaleString()}</time><small>${esc(detail)}</small></article>`;
    }).join('')}</div>`;
  }
  function matchesFilter(item){
    if(filter === 'active') return item.active !== false;
    if(filter === 'archived') return item.active === false;
    if(filter === 'missing-image') return !item.image;
    if(filter === 'missing-recipe') return !Object.keys(item.recipe || {}).length;
    if(filter === 'modified') return Boolean(changeState(item));
    return true;
  }
  function collectDraft(){
    document.querySelectorAll('#catalogBody [data-catalog-product]').forEach(card=>{
      const item = DRAFT[Number(card.dataset.index)];
      if(!item) return;
      item.name = card.querySelector('[data-field="name"]').value.trim();
      item.price = Number(card.querySelector('[data-field="price"]').value);
      item.cat = card.querySelector('[data-field="cat"]').value;
      item.id = card.querySelector('[data-field="id"]').value.trim().toLowerCase().replace(/\s+/g,'_').replace(/[^a-z0-9_-]/g,'');
      const addonBoxes = card.querySelectorAll('[data-addon-choice]');
      item.addons = addonBoxes.length ? Array.from(addonBoxes).filter(input=>input.checked).map(input=>input.dataset.addonChoice) : [];
    });
  }
  function recipeChips(item, index){
    const ingredients = BK_STOCK.getIngredients();
    const entries = Object.entries(item.recipe || {});
    if(!entries.length) return '<span class="admin-empty-inline">No recipe configured</span>';
    return entries.map(([id, quantity])=>{
      const ingredient = ingredients[id] || {};
      return `<span class="recipe-ingredient-chip"><b>${esc(ingredient.name || id)}</b><span>${quantity} ${esc(ingredient.unit || '')}</span><button type="button" data-recipe-remove="${esc(id)}" data-index="${index}" aria-label="Remove ${esc(ingredient.name || id)}">×</button></span>`;
    }).join('');
  }
  function productCard(item, index){
    const recipeCount = Object.keys(item.recipe || {}).length;
    const state = changeState(item);
    const image = item.image
      ? `<img src="${esc(item.image)}" alt="${esc(item.name)}">`
      : '<span>No image</span>';
    return `<article class="catalog-product-card ${state ? 'catalog-product-changed' : ''} ${item.active === false ? 'catalog-product-archived' : ''}" data-catalog-product data-index="${index}">
      <div class="catalog-product-summary">
        <div class="catalog-order-controls"><button type="button" data-move="-1" aria-label="Move ${esc(item.name)} up">↑</button><button type="button" data-move="1" aria-label="Move ${esc(item.name)} down">↓</button></div>
        <div class="catalog-product-image">${image}</div>
        <div class="catalog-product-main"><input data-field="name" aria-label="Product name" value="${esc(item.name)}"><small>${esc(item.id)}</small></div>
        <label><span>Price</span><span class="currency-field"><input data-field="price" type="number" min="0" step="1" value="${item.price}"><b>GHS</b></span></label>
        <label><span>Category</span><select data-field="cat">${categoryOptions(item.cat)}</select></label>
        <div class="catalog-product-status">${item.active === false ? '<span class="catalog-archive-badge">Archived</span>' : ''}${state ? `<span class="catalog-change-badge">${state}</span>` : ''}<span class="admin-count-badge">${recipeCount} ingredient${recipeCount === 1 ? '' : 's'}</span><small>${item.image ? 'Image ready' : 'Image missing'}</small></div>
        <details class="catalog-product-details"><summary>Edit details</summary>
          <div class="catalog-detail-grid">
            <section><h5>Image</h5><div class="catalog-detail-image">${image}</div><label class="x admin-upload-button">Replace image<input class="sr-only" type="file" accept="image/*" data-image-file></label><button class="mini" type="button" data-image-remove>Remove image</button></section>
            <section><h5>Recipe</h5><div class="recipe-ingredient-list" data-recipe-list>${recipeChips(item,index)}</div><div class="recipe-add-row"><select data-recipe-ingredient>${ingredientOptions()}</select><input data-recipe-quantity type="number" min="0.25" step="0.25" value="1"><button class="x" type="button" data-recipe-add>Add ingredient</button></div></section>
            <section><h5>Product add-ons</h5><p class="muted">Choose which paid add-ons the POS app should offer for this product.</p>${addonEditor(item,index)}</section>
            <section><h5>Technical details</h5><label><span>Product ID</span><input data-field="id" value="${esc(item.id)}"><small class="catalog-field-error" data-error-for="id"></small></label><h5>History</h5>${productHistory(item)}<button class="mini ${item.active === false ? '' : 'admin-row-danger'}" type="button" data-archive-product>${item.active === false ? 'Restore product' : 'Archive product'}</button></section>
          </div>
        </details>
        <div class="catalog-row-error" role="alert"></div>
      </div>
    </article>`;
  }
  function render(){
    const body = document.getElementById('catalogBody');
    const query = search.trim().toLowerCase();
    const groups = CATEGORIES.map(([category,label])=>{
      const items = DRAFT.map((item,index)=>({item,index}))
        .filter(entry=>entry.item.cat === category && matchesFilter(entry.item) && (!query || `${entry.item.name} ${entry.item.id}`.toLowerCase().includes(query)))
        .sort((a,b)=>Number(a.item.categoryOrder)-Number(b.item.categoryOrder));
      if(!items.length) return '';
      return `<details class="admin-category-group catalog-category" open><summary><span><b>${label}</b><small>${items.length} product${items.length === 1 ? '' : 's'}</small></span></summary><div class="catalog-category-products">${items.map(({item,index})=>productCard(item,index)).join('')}</div></details>`;
    }).join('');
    const modified = changedCount();
    body.innerHTML = `<div class="catalog-toolbar"><label><span class="sr-only">Search products</span><input id="catalogSearch" type="search" placeholder="Search products..." value="${esc(search)}"></label><select id="catalogFilter" aria-label="Filter products"><option value="active">Active products</option><option value="archived">Archived products</option><option value="all">All products</option><option value="modified">Modified</option><option value="missing-image">Missing image</option><option value="missing-recipe">Missing recipe</option></select><span class="admin-count-badge">${modified ? `${modified} changed` : `${DRAFT.length} products`}</span></div>${groups || '<div class="empty-state">No matching products.</div>'}`;
    body.querySelector('#catalogFilter').value = filter;
    bind();
    updateSaveButton();
  }
  function updateRecipeDisplay(card, item, index){
    card.querySelector('[data-recipe-list]').innerHTML = recipeChips(item,index);
    bindRecipeRemove(card);
    const badge = card.querySelector('.catalog-product-status .admin-count-badge');
    const count = Object.keys(item.recipe || {}).length;
    badge.textContent = `${count} ingredient${count === 1 ? '' : 's'}`;
  }
  function bindRecipeRemove(scope){
    scope.querySelectorAll('[data-recipe-remove]').forEach(button=>{
      button.onclick = ()=>{
        const item = DRAFT[Number(button.dataset.index)];
        delete item.recipe[button.dataset.recipeRemove];
        updateRecipeDisplay(button.closest('[data-catalog-product]'), item, Number(button.dataset.index));
        updateSaveButton();
      };
    });
  }
  function bind(){
    const body = document.getElementById('catalogBody');
    body.querySelector('#catalogSearch').oninput = event=>{
      collectDraft();
      search = event.target.value;
      render();
      const input = document.getElementById('catalogSearch');
      input.focus();
      input.setSelectionRange(input.value.length,input.value.length);
    };
    body.querySelector('#catalogFilter').onchange = event=>{
      collectDraft();
      filter = event.target.value;
      render();
    };
    body.querySelectorAll('[data-catalog-product]').forEach(card=>{
      const index = Number(card.dataset.index);
      const item = DRAFT[index];
      const categorySelect = card.querySelector('[data-field="cat"]');
      categorySelect.onchange = ()=>{
        collectDraft();
        render();
      };
      card.querySelectorAll('[data-field="name"],[data-field="price"],[data-field="id"],[data-addon-choice]').forEach(input=>{
        input.oninput = ()=>{
          collectDraft();
          updateSaveButton();
        };
      });
      card.querySelector('[data-image-file]').onchange = event=>{
        const file = event.target.files && event.target.files[0];
        if(!file) return;
        BK_IMAGES.prepareFile(file).then(image=>{
          item.image = image;
          imageChanges[item.originalId] = image;
          render();
        });
      };
      card.querySelector('[data-image-remove]').onclick = ()=>{
        item.image = '';
        imageChanges[item.originalId] = '';
        render();
      };
      card.querySelector('[data-recipe-add]').onclick = ()=>{
        const ingredient = card.querySelector('[data-recipe-ingredient]').value;
        const quantity = Number(card.querySelector('[data-recipe-quantity]').value);
        if(!ingredient || !Number.isFinite(quantity) || quantity <= 0) return;
        item.recipe[ingredient] = quantity;
        updateRecipeDisplay(card,item,index);
        updateSaveButton();
      };
      card.querySelector('[data-archive-product]').onclick = ()=>{
        collectDraft();
        if(!baseline.has(item.originalId)){
          DRAFT.splice(index,1);
        }else{
          item.active = item.active === false;
          item.archivedAt = item.active ? null : Date.now();
          const actor = window.BK_ACCESS && BK_ACCESS.actor ? BK_ACCESS.actor() : null;
          item.archivedBy = item.active ? null : (actor && actor.id || 'unknown');
        }
        render();
      };
      card.querySelectorAll('[data-move]').forEach(button=>{
        button.onclick = ()=>{
          collectDraft();
          const categoryItems = DRAFT.map((product,draftIndex)=>({product,draftIndex})).filter(entry=>entry.product.cat === item.cat).sort((a,b)=>a.product.categoryOrder-b.product.categoryOrder);
          const position = categoryItems.findIndex(entry=>entry.draftIndex === index);
          const target = position + Number(button.dataset.move);
          if(target < 0 || target >= categoryItems.length) return;
          const currentOrder = categoryItems[position].product.categoryOrder;
          categoryItems[position].product.categoryOrder = categoryItems[target].product.categoryOrder;
          categoryItems[target].product.categoryOrder = currentOrder;
          render();
        };
      });
      bindRecipeRemove(card);
    });
  }
  function loadRemoteHistory(){
    const database = firebaseDatabase();
    if(!database) return Promise.resolve(false);
    return database.ref('/pos/catalog/history').limitToLast(100).get().then(snapshot=>{
      const remote = snapshot.val() || {};
      history = Object.values(remote).filter(Boolean);
      persistHistory();
      render();
      return true;
    }).catch(error=>{
      console.warn('catalog history load failed:', error && error.message);
      return false;
    });
  }
  function openEditor(){
    readHistory();
    loadDraft();
    search='';
    render();
    loadRemoteHistory();
  }
  function addProduct(){
    collectDraft();
    const category = 'extra';
    const count = DRAFT.filter(item=>item.cat === category).length;
    const id = `new_product_${Date.now()}`;
    DRAFT.push({id,originalId:id,name:'New product',cat:category,price:0,categoryOrder:(count+1)*10,active:true,archivedAt:null,archivedBy:null,image:'',recipe:{},addons:[]});
    filter = 'active';
    render();
    const cards = document.querySelectorAll('#catalogBody [data-catalog-product]');
    const card = cards[cards.length-1];
    if(card){ card.scrollIntoView({block:'center'}); card.querySelector('[data-field="name"]').select(); }
  }
  async function save(){
    if(saving) return false;
    collectDraft();
    const ids = new Set();
    for(let index=0; index<DRAFT.length; index++){
      const item = DRAFT[index];
      let message = '';
      let field = '';
      if(!item.name){ message = 'Product name is required.'; field = 'name'; }
      else if(!item.id){ message = 'Product ID is required.'; field = 'id'; }
      else if(ids.has(item.id)){ message = 'Product ID already exists.'; field = 'id'; }
      else if(!Number.isFinite(item.price) || item.price < 0){ message = 'Price must be zero or greater.'; field = 'price'; }
      else if(!item.cat){ message = 'Category is required.'; field = 'cat'; }
      if(message){
        filter = 'all';
        search = '';
        render();
        const card = document.querySelector(`[data-catalog-product][data-index="${index}"]`);
        if(card){
          card.classList.add('catalog-product-invalid');
          card.querySelector('.catalog-row-error').textContent = message;
          const details = card.querySelector('details');
          if(field === 'id') details.open = true;
          const input = card.querySelector(`[data-field="${field}"]`);
          input.setAttribute('aria-invalid','true');
          input.focus();
          card.scrollIntoView({block:'center'});
        }
        return false;
      }
      ids.add(item.id);
    }
    const rows = DRAFT.map(item=>({id:item.id,name:item.name,price:item.price,cat:item.cat,categoryOrder:item.categoryOrder,active:item.active !== false,archivedAt:item.archivedAt,archivedBy:item.archivedBy,addons:Array.isArray(item.addons) ? item.addons.slice() : []}));
    const prices = Object.fromEntries(DRAFT.map(item=>[item.id,item.price]));
    const recipes = Object.fromEntries(DRAFT.map(item=>[item.id,item.recipe]));
    const currentIds = new Set(DRAFT.map(item=>item.id));
    const removedIds = initialIds.filter(id=>!currentIds.has(id));
    const images = Object.assign({}, imageChanges);
    DRAFT.forEach(item=>{
      if(item.id !== item.originalId){
        images[item.originalId] = '';
        images[item.id] = item.image;
      }
    });
    removedIds.forEach(id=>{ images[id] = ''; });
    const finalImages = BK_IMAGES.getMap();
    Object.entries(images).forEach(([id,value])=>{ if(value) finalImages[id] = value; else delete finalImages[id]; });
    const finalRecipes = BK_STOCK.getRecipes();
    removedIds.forEach(id=>delete finalRecipes[id]);
    Object.entries(recipes).forEach(([id,recipe])=>{ finalRecipes[id] = recipe; });
    saving = true;
    updateSaveButton();
    const auditEvent = buildAuditEvent(removedIds);
    try{
      await saveRemoteAtomically(rows, prices, finalRecipes, finalImages, auditEvent);
      if(!BK_PRODUCTS.saveRows(rows, {localOnly:true})) return false;
      BK_PRICES.setPrices(prices, removedIds, {localOnly:true});
      BK_STOCK.setRecipes(recipes, removedIds, {localOnly:true});
      if(Object.keys(images).length && !await BK_IMAGES.saveChanges(images, {localOnly:true})) return false;
      if(auditEvent){
        history.push(auditEvent);
        persistHistory();
      }
      loadDraft();
      render();
      return true;
    }catch(error){
      console.warn('atomic catalog save failed:', error && error.message);
      throw error;
    }finally{
      saving = false;
      updateSaveButton();
    }
  }
  function reset(){
    BK_PRODUCTS.reset();
    BK_PRICES.reset();
    BK_IMAGES.reset();
    BK_STOCK.resetEditor('recipes');
    BK_STOCK.resetEditor('addons');
    openEditor();
  }

  window.BK_CATALOG = {openEditor,addProduct,save,reset};
})();
