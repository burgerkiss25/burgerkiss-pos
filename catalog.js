(function(){
  const CATEGORIES = [
    ['burger','Burgers'],['wings','Wings'],['fries','Fries'],['salad','Salads'],
    ['drink','Drinks'],['extra','Add-ons'],['sauce','Sauces']
  ];
  let DRAFT = [];
  let imageChanges = {};
  let initialIds = [];
  let search = '';

  function clone(value){ return JSON.parse(JSON.stringify(value)); }
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
  function loadDraft(){
    DRAFT = (BK_DATA.BASE || []).map(product=>({
      id:product.id,
      originalId:product.id,
      name:product.name,
      cat:product.cat,
      price:BK_PRICES.getPrice(product.id),
      categoryOrder:Number(product.categoryOrder || 0),
      image:BK_IMAGES.get(product.id),
      recipe:BK_STOCK.getRecipe(product.id)
    }));
    initialIds = DRAFT.map(item=>item.id);
    imageChanges = {};
  }
  function collectDraft(){
    document.querySelectorAll('#catalogBody [data-catalog-product]').forEach(card=>{
      const item = DRAFT[Number(card.dataset.index)];
      if(!item) return;
      item.name = card.querySelector('[data-field="name"]').value.trim();
      item.price = Number(card.querySelector('[data-field="price"]').value);
      item.cat = card.querySelector('[data-field="cat"]').value;
      item.id = card.querySelector('[data-field="id"]').value.trim().toLowerCase().replace(/\s+/g,'_').replace(/[^a-z0-9_-]/g,'');
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
    const image = item.image
      ? `<img src="${esc(item.image)}" alt="${esc(item.name)}">`
      : '<span>No image</span>';
    return `<article class="catalog-product-card" data-catalog-product data-index="${index}">
      <div class="catalog-product-summary">
        <div class="catalog-order-controls"><button type="button" data-move="-1" aria-label="Move ${esc(item.name)} up">↑</button><button type="button" data-move="1" aria-label="Move ${esc(item.name)} down">↓</button></div>
        <div class="catalog-product-image">${image}</div>
        <div class="catalog-product-main"><input data-field="name" aria-label="Product name" value="${esc(item.name)}"><small>${esc(item.id)}</small></div>
        <label><span>Price</span><span class="currency-field"><input data-field="price" type="number" min="0" step="1" value="${item.price}"><b>GHS</b></span></label>
        <label><span>Category</span><select data-field="cat">${categoryOptions(item.cat)}</select></label>
        <div class="catalog-product-status"><span class="admin-count-badge">${recipeCount} ingredient${recipeCount === 1 ? '' : 's'}</span><small>${item.image ? 'Image ready' : 'Image missing'}</small></div>
        <details class="catalog-product-details"><summary>Edit details</summary>
          <div class="catalog-detail-grid">
            <section><h5>Image</h5><div class="catalog-detail-image">${image}</div><label class="x admin-upload-button">Replace image<input class="sr-only" type="file" accept="image/*" data-image-file></label><button class="mini" type="button" data-image-remove>Remove image</button></section>
            <section><h5>Recipe</h5><div class="recipe-ingredient-list" data-recipe-list>${recipeChips(item,index)}</div><div class="recipe-add-row"><select data-recipe-ingredient>${ingredientOptions()}</select><input data-recipe-quantity type="number" min="0.25" step="0.25" value="1"><button class="x" type="button" data-recipe-add>Add ingredient</button></div></section>
            <section><h5>Technical details</h5><label><span>Product ID</span><input data-field="id" value="${esc(item.id)}"></label><h5>History</h5><p class="muted">No product audit history recorded yet.</p><button class="mini admin-row-danger" type="button" data-delete-product>Delete product</button></section>
          </div>
        </details>
      </div>
    </article>`;
  }
  function render(){
    const body = document.getElementById('catalogBody');
    const query = search.trim().toLowerCase();
    const groups = CATEGORIES.map(([category,label])=>{
      const items = DRAFT.map((item,index)=>({item,index}))
        .filter(entry=>entry.item.cat === category && (!query || `${entry.item.name} ${entry.item.id}`.toLowerCase().includes(query)))
        .sort((a,b)=>Number(a.item.categoryOrder)-Number(b.item.categoryOrder));
      if(!items.length) return '';
      return `<details class="admin-category-group catalog-category" open><summary><span><b>${label}</b><small>${items.length} product${items.length === 1 ? '' : 's'}</small></span></summary><div class="catalog-category-products">${items.map(({item,index})=>productCard(item,index)).join('')}</div></details>`;
    }).join('');
    body.innerHTML = `<div class="catalog-toolbar"><label><span class="sr-only">Search products</span><input id="catalogSearch" type="search" placeholder="Search products..." value="${esc(search)}"></label><span class="admin-count-badge">${DRAFT.length} products</span></div>${groups || '<div class="empty-state">No matching products.</div>'}`;
    bind();
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
    body.querySelectorAll('[data-catalog-product]').forEach(card=>{
      const index = Number(card.dataset.index);
      const item = DRAFT[index];
      const categorySelect = card.querySelector('[data-field="cat"]');
      categorySelect.onchange = ()=>{
        collectDraft();
        render();
      };
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
      };
      card.querySelector('[data-delete-product]').onclick = ()=>{
        collectDraft();
        DRAFT.splice(index,1);
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
  function openEditor(){ loadDraft(); search=''; render(); }
  function addProduct(){
    collectDraft();
    const category = 'extra';
    const count = DRAFT.filter(item=>item.cat === category).length;
    const id = `new_product_${Date.now()}`;
    DRAFT.push({id,originalId:id,name:'New product',cat:category,price:0,categoryOrder:(count+1)*10,image:'',recipe:{}});
    render();
    const cards = document.querySelectorAll('#catalogBody [data-catalog-product]');
    const card = cards[cards.length-1];
    if(card){ card.scrollIntoView({block:'center'}); card.querySelector('[data-field="name"]').select(); }
  }
  async function save(){
    collectDraft();
    const ids = new Set();
    for(const item of DRAFT){
      if(!item.id || !item.name || !Number.isFinite(item.price) || item.price < 0 || ids.has(item.id)) return false;
      ids.add(item.id);
    }
    const rows = DRAFT.map(item=>({id:item.id,name:item.name,price:item.price,cat:item.cat,categoryOrder:item.categoryOrder}));
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
    if(!BK_PRODUCTS.saveRows(rows)) return false;
    BK_PRICES.setPrices(prices, removedIds);
    BK_STOCK.setRecipes(recipes, removedIds);
    if(Object.keys(images).length && !await BK_IMAGES.saveChanges(images)) return false;
    loadDraft();
    render();
    return true;
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
