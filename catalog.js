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
  function textEl(tag, text, className){
    const el = document.createElement(tag);
    if(className) el.className = className;
    el.textContent = text == null ? '' : String(text);
    return el;
  }
  function optionEl(value, label, selected){
    const option = document.createElement('option');
    option.value = value == null ? '' : String(value);
    option.textContent = label == null ? option.value : String(label);
    option.selected = !!selected;
    return option;
  }
  function categorySelect(selected){
    const select = document.createElement('select');
    select.dataset.field = 'cat';
    select.replaceChildren(...CATEGORIES.map(([id, label])=>optionEl(id, label, id === selected)));
    return select;
  }
  function ingredientSelect(){
    const select = document.createElement('select');
    select.dataset.recipeIngredient = '';
    select.replaceChildren(...Object.entries(BK_STOCK.getIngredients()).map(([id, ingredient])=>optionEl(id, `${ingredient.name || id} (${id})`)));
    return select;
  }
  function catalogChoices(kind, currentId){
    const predicate = kind === 'addons' ? BK_ADDONS.isAddonProduct : (kind === 'sides' ? BK_SIDES.isSideProduct : BK_DRINKS.isDrinkProduct);
    return DRAFT.filter(product=>product.id !== currentId && predicate(product))
      .sort((a,b)=>String(a.name).localeCompare(String(b.name)))
      .map(product=>({id:product.id, name:product.name, price:Number(product.price) || 0, cat:product.cat}));
  }
  function choiceEditor(item, kind, title, emptyText){
    const selected = new Set(Array.isArray(item[kind]) ? item[kind] : []);
    const choices = catalogChoices(kind, item.id);
    if(!choices.length) return textEl('p', emptyText, 'muted');
    const editor = document.createElement('div');
    editor.className = 'catalog-addon-editor';
    editor.dataset.choiceEditor = kind;
    choices.forEach(choice=>{
      const label = document.createElement('label');
      label.className = 'catalog-addon-choice';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.dataset.choiceKind = kind;
      input.dataset.addonChoice = choice.id;
      input.checked = selected.has(choice.id);
      label.append(input, textEl('span', choice.name), textEl('small', `${title} · ${choice.price} GHS · ${choice.id}`));
      editor.appendChild(label);
    });
    return editor;
  }
  function modifierEditor(item, kind, heading, description, title, emptyText){
    const fragment = document.createDocumentFragment();
    if(!BK_ADDONS.isConfigurableProduct(item)){
      fragment.appendChild(textEl('p', 'Modifiers are configured on main products like burgers, fries, wings, and salads.', 'muted'));
      return fragment;
    }
    fragment.append(textEl('h5', heading), textEl('p', description, 'muted'), choiceEditor(item,kind,title,emptyText));
    return fragment;
  }
  function detailTab(id, label, meta, active){
    const button = document.createElement('button');
    button.className = `catalog-detail-tab ${active ? 'active' : ''}`.trim();
    button.type = 'button';
    button.dataset.detailTab = id;
    button.setAttribute('aria-selected', active ? 'true' : 'false');
    button.appendChild(textEl('span', label));
    if(meta) button.appendChild(textEl('small', meta));
    return button;
  }
  function detailPanel(id, active, content){
    const section = document.createElement('section');
    section.className = 'catalog-detail-panel';
    section.dataset.detailPanel = id;
    section.hidden = !active;
    if(content) section.append(content);
    return section;
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
      addons:Array.isArray(product.addons) ? product.addons.slice() : [],
      sides:Array.isArray(product.sides) ? product.sides.slice() : [],
      drinks:Array.isArray(product.drinks) ? product.drinks.slice() : []
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
      [['name','name'],['price','price'],['category','cat'],['image','image'],['recipe','recipe'],['add-ons','addons'],['sides','sides'],['drinks','drinks'],['display order','categoryOrder'],['product ID','id']].forEach(([label,key])=>{
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
    if(!entries.length) return textEl('p', 'No product changes recorded yet.', 'muted');
    const list = document.createElement('div');
    list.className = 'catalog-history-list';
    entries.forEach(({event,change})=>{
      const actor = event.actor && event.actor.name ? event.actor.name : 'Unknown user';
      const detail = Array.isArray(change.fields) && change.fields.length
        ? change.fields.map(field=>typeof field === 'string' ? field : `${field.field}: ${field.before} → ${field.after}`).join(' · ')
        : change.action;
      const article = document.createElement('article');
      article.append(textEl('b', `${actor} · ${change.action}`));
      const time = textEl('time', new Date(event.ts).toLocaleString());
      time.dateTime = new Date(event.ts).toISOString();
      article.append(time, textEl('small', detail));
      list.appendChild(article);
    });
    return list;
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
      ['addons','sides','drinks'].forEach(kind=>{
        const boxes = card.querySelectorAll(`[data-choice-kind="${kind}"]`);
        item[kind] = boxes.length ? Array.from(boxes).filter(input=>input.checked).map(input=>input.dataset.addonChoice) : [];
      });
    });
  }
  function renderRecipeChips(list, item, index){
    const ingredients = BK_STOCK.getIngredients();
    const entries = Object.entries(item.recipe || {});
    if(!entries.length){
      list.replaceChildren(textEl('span', 'No recipe configured', 'admin-empty-inline'));
      return;
    }
    list.replaceChildren(...entries.map(([id, quantity])=>{
      const ingredient = ingredients[id] || {};
      const chip = document.createElement('span');
      chip.className = 'recipe-ingredient-chip';
      const remove = textEl('button', '×');
      remove.type = 'button';
      remove.dataset.recipeRemove = id;
      remove.dataset.index = String(index);
      remove.setAttribute('aria-label', `Remove ${ingredient.name || id}`);
      chip.append(textEl('b', ingredient.name || id), textEl('span', `${quantity} ${ingredient.unit || ''}`), remove);
      return chip;
    }));
  }
  function imageNode(item, className){
    const wrap = document.createElement('div');
    wrap.className = className;
    if(item.image){
      const img = document.createElement('img');
      img.src = item.image;
      img.alt = item.name;
      wrap.appendChild(img);
    }else{
      wrap.appendChild(textEl('span', 'No image'));
    }
    return wrap;
  }
  function labeledControl(labelText, control){
    const label = document.createElement('label');
    label.append(textEl('span', labelText), control);
    return label;
  }
  function productCard(item, index){
    const recipeCount = Object.keys(item.recipe || {}).length;
    const addonCount = Array.isArray(item.addons) ? item.addons.length : 0;
    const sideCount = Array.isArray(item.sides) ? item.sides.length : 0;
    const drinkCount = Array.isArray(item.drinks) ? item.drinks.length : 0;
    const state = changeState(item);
    const article = document.createElement('article');
    article.className = `catalog-product-card ${state ? 'catalog-product-changed' : ''} ${item.active === false ? 'catalog-product-archived' : ''}`.trim();
    article.dataset.catalogProduct = '';
    article.dataset.index = String(index);
    const summary = document.createElement('div');
    summary.className = 'catalog-product-summary';
    const controls = document.createElement('div');
    controls.className = 'catalog-order-controls';
    [-1, 1].forEach(move=>{
      const button = textEl('button', move < 0 ? '↑' : '↓');
      button.type = 'button';
      button.dataset.move = String(move);
      button.setAttribute('aria-label', `Move ${item.name} ${move < 0 ? 'up' : 'down'}`);
      controls.appendChild(button);
    });
    const main = document.createElement('div');
    main.className = 'catalog-product-main';
    const nameInput = document.createElement('input');
    nameInput.dataset.field = 'name';
    nameInput.setAttribute('aria-label', 'Product name');
    nameInput.value = item.name;
    main.append(nameInput, textEl('small', item.id));
    const priceInput = document.createElement('input');
    priceInput.dataset.field = 'price';
    priceInput.type = 'number';
    priceInput.min = '0';
    priceInput.step = '1';
    priceInput.value = String(item.price);
    const currency = document.createElement('span');
    currency.className = 'currency-field';
    currency.append(priceInput, textEl('b', 'GHS'));
    const status = document.createElement('div');
    status.className = 'catalog-product-status';
    if(item.active === false) status.appendChild(textEl('span', 'Archived', 'catalog-archive-badge'));
    if(state) status.appendChild(textEl('span', state, 'catalog-change-badge'));
    status.append(textEl('span', `${recipeCount} ingredient${recipeCount === 1 ? '' : 's'}`, 'admin-count-badge'), textEl('small', item.image ? 'Image ready' : 'Image missing'));
    const details = document.createElement('details');
    details.className = 'catalog-product-details';
    details.appendChild(textEl('summary', 'Edit details'));
    const workspace = document.createElement('div');
    workspace.className = 'catalog-detail-workspace';
    const tabs = document.createElement('nav');
    tabs.className = 'catalog-detail-tabs';
    tabs.setAttribute('aria-label', 'Product detail sections');
    tabs.append(
      detailTab('image','Image',item.image ? 'Ready' : 'Missing',false),
      detailTab('recipe','Recipe',`${recipeCount} item${recipeCount === 1 ? '' : 's'}`,true),
      detailTab('addons','Add-ons',`${addonCount} selected`,false),
      detailTab('sides','Sides',`${sideCount} selected`,false),
      detailTab('drinks','Drinks',`${drinkCount} selected`,false),
      detailTab('technical','Technical','ID & history',false)
    );
    const panels = document.createElement('div');
    panels.className = 'catalog-detail-panels';
    const imagePanel = document.createDocumentFragment();
    const upload = textEl('label', 'Replace image', 'x admin-upload-button');
    const imageInput = document.createElement('input');
    imageInput.className = 'sr-only';
    imageInput.type = 'file';
    imageInput.accept = 'image/*';
    imageInput.dataset.imageFile = '';
    upload.appendChild(imageInput);
    const removeImage = textEl('button', 'Remove image', 'mini');
    removeImage.type = 'button';
    removeImage.dataset.imageRemove = '';
    imagePanel.append(textEl('h5', 'Image'), imageNode(item, 'catalog-detail-image'), upload, removeImage);
    const recipePanel = document.createDocumentFragment();
    const recipeList = document.createElement('div');
    recipeList.className = 'recipe-ingredient-list';
    recipeList.dataset.recipeList = '';
    renderRecipeChips(recipeList, item, index);
    const addRow = document.createElement('div');
    addRow.className = 'recipe-add-row';
    const recipeQty = document.createElement('input');
    recipeQty.dataset.recipeQuantity = '';
    recipeQty.type = 'number';
    recipeQty.min = '0.25';
    recipeQty.step = '0.25';
    recipeQty.value = '1';
    const addIngredient = textEl('button', 'Add ingredient', 'x');
    addIngredient.type = 'button';
    addIngredient.dataset.recipeAdd = '';
    addRow.append(ingredientSelect(), recipeQty, addIngredient);
    recipePanel.append(textEl('h5', 'Recipe'), recipeList, addRow);
    const techPanel = document.createDocumentFragment();
    const idInput = document.createElement('input');
    idInput.dataset.field = 'id';
    idInput.value = item.id;
    const idError = document.createElement('small');
    idError.className = 'catalog-field-error';
    idError.dataset.errorFor = 'id';
    const idLabel = labeledControl('Product ID', idInput);
    idLabel.appendChild(idError);
    const archive = textEl('button', item.active === false ? 'Restore product' : 'Archive product', `mini ${item.active === false ? '' : 'admin-row-danger'}`.trim());
    archive.type = 'button';
    archive.dataset.archiveProduct = '';
    techPanel.append(textEl('h5', 'Technical details'), idLabel, textEl('h5', 'History'), productHistory(item), archive);
    panels.append(
      detailPanel('image', false, imagePanel),
      detailPanel('recipe', true, recipePanel),
      detailPanel('addons', false, modifierEditor(item,'addons','Product add-ons','Choose only upgrades that customize the main product.','Add-on','Create active add-on products first, then attach them here.')),
      detailPanel('sides', false, modifierEditor(item,'sides','Suggested sides','Choose paid side suggestions shown separately from add-ons.','Side','Create active side products first, then attach them here.')),
      detailPanel('drinks', false, modifierEditor(item,'drinks','Suggested drinks','Choose paid drink suggestions shown separately from add-ons.','Drink','Create active drink products first, then attach them here.')),
      detailPanel('technical', false, techPanel)
    );
    workspace.append(tabs, panels);
    details.appendChild(workspace);
    const rowError = document.createElement('div');
    rowError.className = 'catalog-row-error';
    rowError.setAttribute('role', 'alert');
    summary.append(controls, imageNode(item, 'catalog-product-image'), main, labeledControl('Price', currency), labeledControl('Category', categorySelect(item.cat)), status, details, rowError);
    article.appendChild(summary);
    return article;
  }
  function render(){
    const body = document.getElementById('catalogBody');
    const query = search.trim().toLowerCase();
    const toolbar = document.createElement('div');
    toolbar.className = 'catalog-toolbar';
    const searchLabel = document.createElement('label');
    searchLabel.appendChild(textEl('span', 'Search products', 'sr-only'));
    const searchInput = document.createElement('input');
    searchInput.id = 'catalogSearch';
    searchInput.type = 'search';
    searchInput.placeholder = 'Search products...';
    searchInput.value = search;
    searchLabel.appendChild(searchInput);
    const filterSelect = document.createElement('select');
    filterSelect.id = 'catalogFilter';
    filterSelect.setAttribute('aria-label', 'Filter products');
    [
      ['active', 'Active products'],
      ['archived', 'Archived products'],
      ['all', 'All products'],
      ['modified', 'Modified'],
      ['missing-image', 'Missing image'],
      ['missing-recipe', 'Missing recipe']
    ].forEach(([value,label])=>filterSelect.appendChild(optionEl(value, label, value === filter)));
    const modified = changedCount();
    toolbar.append(searchLabel, filterSelect, textEl('span', modified ? `${modified} changed` : `${DRAFT.length} products`, 'admin-count-badge'));
    const groups = CATEGORIES.map(([category,label])=>{
      const items = DRAFT.map((item,index)=>({item,index}))
        .filter(entry=>entry.item.cat === category && matchesFilter(entry.item) && (!query || `${entry.item.name} ${entry.item.id}`.toLowerCase().includes(query)))
        .sort((a,b)=>Number(a.item.categoryOrder)-Number(b.item.categoryOrder));
      if(!items.length) return null;
      const section = document.createElement('details');
      section.className = 'admin-category-group catalog-category';
      section.open = true;
      const summary = document.createElement('summary');
      const summaryText = document.createElement('span');
      summaryText.append(textEl('b', label), textEl('small', `${items.length} product${items.length === 1 ? '' : 's'}`));
      summary.appendChild(summaryText);
      const products = document.createElement('div');
      products.className = 'catalog-category-products';
      items.forEach(({item,index})=>products.appendChild(productCard(item,index)));
      section.append(summary, products);
      return section;
    }).filter(Boolean);
    body.replaceChildren(toolbar, ...(groups.length ? groups : [textEl('div', 'No matching products.', 'empty-state')]));
    bind();
    updateSaveButton();
  }
  function updateRecipeDisplay(card, item, index){
    renderRecipeChips(card.querySelector('[data-recipe-list]'), item, index);
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
      card.querySelectorAll('[data-detail-tab]').forEach(button=>{
        button.onclick = ()=>{
          const tab = button.dataset.detailTab;
          card.querySelectorAll('[data-detail-tab]').forEach(tabButton=>{
            const active = tabButton === button;
            tabButton.classList.toggle('active', active);
            tabButton.setAttribute('aria-selected', active ? 'true' : 'false');
          });
          card.querySelectorAll('[data-detail-panel]').forEach(panel=>{
            panel.hidden = panel.dataset.detailPanel !== tab;
          });
        };
      });
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
    DRAFT.push({id,originalId:id,name:'New product',cat:category,price:0,categoryOrder:(count+1)*10,active:true,archivedAt:null,archivedBy:null,image:'',recipe:{},addons:[],sides:[],drinks:[]});
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
          if(field === 'id'){
            details.open = true;
            const technicalTab = card.querySelector('[data-detail-tab="technical"]');
            if(technicalTab) technicalTab.click();
          }
          const input = card.querySelector(`[data-field="${field}"]`);
          input.setAttribute('aria-invalid','true');
          input.focus();
          card.scrollIntoView({block:'center'});
        }
        return false;
      }
      ids.add(item.id);
    }
    const rows = DRAFT.map(item=>({id:item.id,name:item.name,price:item.price,cat:item.cat,categoryOrder:item.categoryOrder,active:item.active !== false,archivedAt:item.archivedAt,archivedBy:item.archivedBy,addons:Array.isArray(item.addons) ? item.addons.slice() : [],sides:Array.isArray(item.sides) ? item.sides.slice() : [],drinks:Array.isArray(item.drinks) ? item.drinks.slice() : []}));
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
