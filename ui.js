// UI & Interaktionen – nutzt BK_STATE, BK_PRICES, BK_LOGIC
(function(){
  let currentCat = 'all';
  let productQuery = '';
  let groupSel = new Set();
  const HISTORY_KEY = 'bk_order_history_v1';
  const CATEGORY_LABELS = { all:'All', menu:'Menu', burger:'Burger', wings:'Wings', fries:'Fries', salad:'Salad', extra:'Extra', drink:'Drink', sauce:'Sauce' };
  let historyFilterText = '';
  let historyFilterToday = false;
  const QUICK_NOTES = ['No onion', 'Extra onion', 'No lettuce', 'Extra spicy'];
  let stockOverviewFilter = 'all';
  const FALLBACK_STANDARD_MENUS = [
    { id:'menu_cheeseburger', name:'Cheeseburger Menu', baseId:'cheeseburger', menuPrice:135, defaultFries:'fries_standard', defaultDrink:'d_cola' },
    { id:'menu_hamburger', name:'Hamburger Menu', baseId:'hamburger', menuPrice:120, defaultFries:'fries_standard', defaultDrink:'d_cola' },
    { id:'menu_double_burger', name:'Double Burger Menu', baseId:'double_burger', menuPrice:155, defaultFries:'fries_standard', defaultDrink:'d_cola' },
    { id:'menu_double_cheeseburger', name:'Double Cheeseburger Menu', baseId:'double_cheeseburger', menuPrice:170, defaultFries:'fries_standard', defaultDrink:'d_cola' },
    { id:'menu_wings_6', name:'Wings 6 Menu', baseId:'wings_6', menuPrice:65, defaultFries:'fries_standard', defaultDrink:'d_cola', defaultWingsSauce:'x_sauce_chicken_wings' },
    { id:'menu_wings_12', name:'Wings 12 Menu', baseId:'wings_12', menuPrice:110, defaultFries:'fries_standard', defaultDrink:'d_cola', defaultWingsSauce:'x_sauce_chicken_wings' }
  ];

  const STOCK_DEFAULT = {
    INGREDIENTS: {
      bun: { name: 'Burger Bun', qty: 80, unit: 'pcs' },
      beef_patty: { name: 'Beef Patty', qty: 60, unit: 'pcs' },
      cheese_slice: { name: 'Cheese Slice', qty: 120, unit: 'pcs' },
      chicken_wing: { name: 'Chicken Wing', qty: 300, unit: 'pcs' },
      fries_portion: { name: 'Fries Portion', qty: 120, unit: 'portion' },
      coconut_fresh: { name: 'Coconut Fresh', qty: 25, unit: 'pcs' },
      soda_can: { name: 'Soft Drink', qty: 120, unit: 'pcs' },
      ice_tea: { name: 'Ice Tea', qty: 30, unit: 'cups' },
      coconut_water_bottle: { name: 'Coconut Water Bottle', qty: 30, unit: 'btl' },
      beer: { name: 'Beer', qty: 48, unit: 'btl' },
      egg: { name: 'Egg', qty: 48, unit: 'pcs' },
      bacon_slice: { name: 'Bacon Slice', qty: 120, unit: 'slice' },
      ketchup: { name: 'Ketchup', qty: 2000, unit: 'g' },
      mayonnaise: { name: 'Mayonnaise', qty: 2000, unit: 'g' },
      chicken_burger_sauce: { name: 'Chicken Burger Sauce', qty: 800, unit: 'g' },
      chicken_wings_sauce: { name: 'Chicken Wings Sauce', qty: 800, unit: 'g' },
      onion_diced: { name: 'Onion Diced', qty: 1000, unit: 'g' }
    },
    RECIPES: {
      hamburger: { bun: 1, beef_patty: 1 },
      cheeseburger: { bun: 1, beef_patty: 1, cheese_slice: 1 },
      wings_6: { chicken_wing: 6 },
      wings_12: { chicken_wing: 12 },
      wings_24: { chicken_wing: 24 },
      fries_standard: { fries_portion: 1 },
      fries_large: { fries_portion: 2 },
      x_beef_patty: { beef_patty: 1 },
      x_cheese: { cheese_slice: 1 },
      x_bacon: { bacon_slice: 1 },
      x_fried_egg: { egg: 1 },
      x_omelette: { egg: 2 },
      x_sauce_ketchup: { ketchup: 20 },
      x_sauce_mayonnaise: { mayonnaise: 20 },
      x_sauce_chipotle: { mayonnaise: 15, chicken_burger_sauce: 5 },
      x_sauce_dutch_special: { mayonnaise: 10, ketchup: 10, onion_diced: 5 },
      x_sauce_chicken_wings: { chicken_wings_sauce: 20 },
      d_coconut_fresh: { coconut_fresh: 1 },
      d_cola: { soda_can: 1 },
      d_fanta_orange: { soda_can: 1 },
      d_fanta_coktail: { soda_can: 1 },
      d_sprite: { soda_can: 1 },
      d_iced_tea_lime: { ice_tea: 1 },
      d_coconut_water_bottle: { coconut_water_bottle: 1 },
      d_club_beer_std: { beer: 1 },
      d_club_beer_large: { beer: 1 },
      d_guinness: { beer: 1 }
    }
  };

  function stockDefs(){
    return (window.BK_DATA && BK_DATA.STOCK) || STOCK_DEFAULT;
  }

  function htmlGroupedRows(items){
    return BK_LOGIC.groupedLines(items).map(({name, qty, note, total}) => `
      <div class="row" style="border-top:1px dashed #2a2f39;padding:6px 0">
        <span><b>${name}</b> <small>× ${qty}${note?` · ${note}`:''}</small></span>
        <span>${total} GHS</span>
      </div>
    `).join('');
  }

  function ensureDialogHost(){
    let host = document.getElementById('appDialog');
    if(host) return host;
    host = document.createElement('div');
    host.id = 'appDialog';
    host.className = 'modal';
    host.innerHTML = '<div class="sheet"><header><b id="appDialogTitle"></b></header><div class="body" id="appDialogBody"></div></div>';
    document.body.appendChild(host);
    return host;
  }

  function closeDialog(){
    const host = document.getElementById('appDialog');
    if(host) host.classList.remove('open');
  }

  function infoDialog(message){
    const host = ensureDialogHost();
    document.getElementById('appDialogTitle').textContent = 'Info';
    document.getElementById('appDialogBody').innerHTML = `
      <div style="margin-bottom:10px">${message}</div>
      <div style="display:flex;justify-content:flex-end"><button class="x" id="dlgOk">OK</button></div>
    `;
    host.classList.add('open');
    document.getElementById('dlgOk').onclick = closeDialog;
  }

  function confirmDialog(title, message){
    return new Promise(resolve=>{
      const host = ensureDialogHost();
      document.getElementById('appDialogTitle').textContent = title;
      document.getElementById('appDialogBody').innerHTML = `
        <div style="margin-bottom:10px">${message}</div>
        <div style="display:flex;gap:8px;justify-content:flex-end">
          <button class="x" id="dlgCancel">Cancel</button>
          <button class="x" id="dlgConfirm">Confirm</button>
        </div>
      `;
      host.classList.add('open');
      document.getElementById('dlgCancel').onclick = ()=>{ closeDialog(); resolve(false); };
      document.getElementById('dlgConfirm').onclick = ()=>{ closeDialog(); resolve(true); };
    });
  }

  function promptDialog(title, initial){
    return new Promise(resolve=>{
      const host = ensureDialogHost();
      document.getElementById('appDialogTitle').textContent = title;
      document.getElementById('appDialogBody').innerHTML = `
        <input id="dlgInput" value="${(initial||'').replace(/"/g,'&quot;')}" style="width:100%;margin-bottom:10px;background:#101319;border:1px solid #28303a;color:#e6ebf0;border-radius:10px;padding:10px" />
        <div style="display:flex;gap:8px;justify-content:flex-end">
          <button class="x" id="dlgCancel">Cancel</button>
          <button class="x" id="dlgSave">Save</button>
        </div>
      `;
      host.classList.add('open');
      const inp = document.getElementById('dlgInput');
      inp.focus();
      inp.select();
      document.getElementById('dlgCancel').onclick = ()=>{ closeDialog(); resolve(null); };
      document.getElementById('dlgSave').onclick = ()=>{ const v = inp.value; closeDialog(); resolve(v); };
    });
  }

  function buildProducts(){
    const grid = document.getElementById('buttons');
    if(!grid) return;
    grid.innerHTML = '';
    const base = (Array.isArray(BK_DATA.BASE) && BK_DATA.BASE.length) ? BK_DATA.BASE : (BK_DATA.DEFAULT_BASE || []);
    if(base !== BK_DATA.BASE) BK_DATA.BASE = base;
    const query = productQuery.trim().toLowerCase();
    const isFrontProduct = it => it && it.cat !== 'extra' && !String(it.id || '').startsWith('x_sauce_');
    const productItems = base.filter(isFrontProduct).filter(it => (currentCat==='menu' || currentCat==='fast') ? false : (currentCat==='all' ? true : it.cat===currentCat));
    const menuItems = buildStandardMenuCards().filter(it => currentCat === 'all' || currentCat === 'menu');
    const items = menuItems.concat(productItems)
      .filter(it => query ? [it.name, it.searchText, it.baseName, it.subtitle].filter(Boolean).join(' ').toLowerCase().includes(query) : true);
    if(!items.length){
      const empty = document.createElement('div');
      empty.className = 'empty-state product-empty';
      empty.innerHTML = `<strong>No products found</strong><span>Try another category or clear the search.</span>`;
      empty.style.gridColumn = '1 / -1';
      grid.appendChild(empty);
      return;
    }
    items.forEach(it=>{
      const b = document.createElement('button');
      b.className = 'item' + (it.isStandardMenu ? ' standard-menu-item' : '');
      b.type = 'button';
      const img = BK_IMAGES.get(it.imageId || it.id);
      if(img){
        b.classList.add('item-with-bg');
        b.style.backgroundImage = `url(${img})`;
      }else{
        b.classList.remove('item-with-bg');
        b.style.backgroundImage = '';
      }
      const catLabel = CATEGORY_LABELS[it.cat] || it.cat || 'Item';
      b.innerHTML = `<span class="cat-badge">${catLabel}</span>
                     <div class="name">${it.name}</div>
                     ${it.subtitle ? `<small class="item-subtitle">${it.subtitle}</small>` : ''}
                     <div class="item-meta">
                       <div class="price">${itemDisplayPrice(it)} GHS</div>
                       <span class="badge">${it.isStandardMenu ? 'Menu' : '+1'}</span>
                     </div>`;
      b.onclick = ()=> it.isStandardMenu ? addStandardMenuPreset(it) : addProductWithFlow(it);
      grid.appendChild(b);
    });
  }

  function openModifierSheet(title, sections, opts){
    const host = ensureDialogHost();
    const settings = opts || {};
    const showNote = Object.prototype.hasOwnProperty.call(settings, 'note');
    const cancelLabel = settings.cancelLabel || 'Skip add-ons';
    const confirmLabel = settings.confirmLabel || 'Add selected';
    document.getElementById('appDialogTitle').textContent = title;
    document.getElementById('appDialogBody').innerHTML = `
      <form class="modifier-sheet" id="modifierForm">
        ${showNote ? `
          <label class="modifier-note">
            <span>Note for this item</span>
            <textarea id="modifierItemNote" rows="2" placeholder="e.g. no onion, no lettuce, no sesame"></textarea>
          </label>
          <div class="modifier-quick" aria-label="Quick note shortcuts">
            ${QUICK_NOTES.map(note=>`<button class="chip modifier-quick-note" type="button" data-note="${note}">${note}</button>`).join('')}
          </div>
        ` : ''}
        <div class="modifier-grid" id="modifierSections"></div>
        <div class="modifier-actions">
          <button class="x" id="dlgCancel" type="button">${cancelLabel}</button>
          <button class="x modifier-primary" id="dlgConfirm" type="submit">${confirmLabel}</button>
        </div>
      </form>
    `;
    const wrap = document.getElementById('modifierSections');
    (sections || []).forEach(section=>{
      const fieldset = document.createElement('fieldset');
      fieldset.className = 'modifier-group';
      const legend = document.createElement('legend');
      legend.textContent = section.title;
      fieldset.appendChild(legend);
      (section.help ? [section.help] : []).forEach(helpText=>{
        const help = document.createElement('p');
        help.className = 'modifier-help';
        help.textContent = helpText;
        fieldset.appendChild(help);
      });
      (section.options || []).forEach((opt, idx)=>{
        const label = document.createElement('label');
        label.className = section.type === 'quantity' ? 'choice-row qty-row' : 'choice-row';

        if(section.type === 'quantity'){
          const name = document.createElement('span');
          name.textContent = opt.label;
          label.appendChild(name);

          const controls = document.createElement('span');
          controls.className = 'qty-controls';
          const minus = document.createElement('button');
          minus.type = 'button';
          minus.className = 'qty-btn';
          minus.textContent = '−';
          const qty = document.createElement('output');
          qty.className = 'qty-value';
          qty.dataset.name = section.name;
          qty.dataset.value = opt.value || '';
          qty.dataset.label = opt.label || opt.value || '';
          qty.value = '0';
          qty.textContent = '0';
          const plus = document.createElement('button');
          plus.type = 'button';
          plus.className = 'qty-btn';
          plus.textContent = '+';
          const setQty = next=>{
            const max = Number.isFinite(Number(section.max)) ? Number(section.max) : 9;
            const val = Math.max(0, Math.min(max, Number(next) || 0));
            qty.value = String(val);
            qty.textContent = String(val);
          };
          minus.onclick = ()=> setQty(Number(qty.value) - 1);
          plus.onclick = ()=> setQty(Number(qty.value) + 1);
          controls.appendChild(minus);
          controls.appendChild(qty);
          controls.appendChild(plus);
          label.appendChild(controls);
        }else{
          const input = document.createElement('input');
          input.type = section.type || 'checkbox';
          input.name = section.name;
          input.value = opt.value || '';
          input.checked = !!opt.checked || (section.type === 'radio' && idx === 0 && !section.options.some(o=>o.checked));
          label.appendChild(input);
          const text = document.createElement('span');
          text.textContent = opt.label;
          label.appendChild(text);
        }
        fieldset.appendChild(label);
      });
      wrap.appendChild(fieldset);
    });

    return new Promise(resolve=>{
      host.classList.add('open');
      const noteBox = document.getElementById('modifierItemNote');
      if(noteBox){
        noteBox.value = settings.note || '';
        document.querySelectorAll('.modifier-quick-note').forEach(btn=>{
          btn.onclick = ()=>{
            const note = String(btn.dataset.note || btn.textContent || '').trim();
            if(!note) return;
            const current = noteBox.value.trim();
            const parts = current ? current.split(/\s+·\s+/).map(x=>x.trim()).filter(Boolean) : [];
            if(!parts.some(part=>part.toLowerCase() === note.toLowerCase())) parts.push(note);
            noteBox.value = parts.join(' · ');
            noteBox.focus();
          };
        });
        noteBox.focus();
        noteBox.select();
      }
      document.getElementById('dlgCancel').onclick = ()=>{
        closeDialog();
        if(Object.prototype.hasOwnProperty.call(settings, 'cancelValue')) resolve(settings.cancelValue);
        else resolve({ itemNote: noteBox ? noteBox.value.trim() : '' });
      };
      document.getElementById('modifierForm').onsubmit = (e)=>{
        e.preventDefault();
        const form = e.currentTarget;
        const values = { itemNote: noteBox ? noteBox.value.trim() : '' };
        (sections || []).forEach(section=>{
          if(section.type === 'quantity'){
            const picked = [];
            form.querySelectorAll(`output[data-name="${section.name}"]`).forEach(out=>{
              const qty = Number(out.value || out.textContent || 0) || 0;
              if(qty > 0) picked.push({ value: out.dataset.value, label: out.dataset.label || out.dataset.value, qty });
            });
            values[section.name] = picked;
            return;
          }
          const selected = [...form.querySelectorAll(`[name="${section.name}"]:checked`)].map(input=>input.value).filter(Boolean);
          values[section.name] = section.type === 'radio' ? (selected[0] || null) : selected;
        });
        closeDialog();
        resolve(values);
      };
    });
  }

  function addQuantities(picks, note){
    (picks || []).forEach(pick=>{
      const qty = Math.max(0, Number(pick.qty) || 0);
      if(!pick.value) return;
      for(let i=0; i<qty; i++) BK_STATE.addItem(pick.value, note || '');
    });
  }

  function describeQuantities(picks){
    return (picks || [])
      .filter(pick=> Number(pick.qty) > 0)
      .map(pick=> `${pick.label || pick.value}${Number(pick.qty) > 1 ? ` x${Number(pick.qty)}` : ''}`)
      .join(', ');
  }

  function joinNotes(){
    return Array.from(arguments).map(x=>String(x || '').trim()).filter(Boolean).join(' · ');
  }

  function modifierLinkNote(prefix, productName, itemNote){
    const lead = prefix === 'for' ? 'for' : `${prefix} for`;
    return `${lead} ${productName}${itemNote ? `: ${itemNote}` : ''}`;
  }

  function productById(id){
    return (BK_DATA.BASE || []).find(x=>x.id===id) || null;
  }

  function optionLabel(id, fallback){
    const p = productById(id);
    if(!p) return fallback || id;
    return `${p.name} (${BK_PRICES.getPrice(id)} GHS)`;
  }

  function itemDisplayPrice(item){
    if(item && item.isStandardMenu) return standardMenuPrice(item);
    return BK_PRICES.getPrice(item && item.id);
  }

  function standardMenuPrice(menu){
    const base = productById(menu.baseId);
    if(!base) return 0;
    const included = BK_DATA.MENU && BK_DATA.MENU.included ? BK_DATA.MENU.included : {fries:0, drink:0};
    const friesUpgrade = menu.defaultFries ? Math.max(0, BK_PRICES.getPrice(menu.defaultFries) - (Number(included.fries) || 0)) : 0;
    const drinkUpgrade = menu.defaultDrink ? Math.max(0, BK_PRICES.getPrice(menu.defaultDrink) - (Number(included.drink) || 0)) : 0;
    const baseMenuPrice = Number(menu.menuPrice) > 0 ? Number(menu.menuPrice) : mealBasePrice(base);
    return baseMenuPrice + friesUpgrade + drinkUpgrade;
  }

  function getStandardMenuPresets(){
    if(window.BK_MENUS && typeof BK_MENUS.getMenus === 'function') return BK_MENUS.getMenus();
    return FALLBACK_STANDARD_MENUS;
  }

  function buildStandardMenuCards(){
    return getStandardMenuPresets().map(menu=>{
      const base = productById(menu.baseId);
      if(!base || standardMenuPrice(menu) <= 0) return null;
      const fries = productById(menu.defaultFries);
      const drink = productById(menu.defaultDrink);
      return Object.assign({}, menu, {
        cat: 'menu',
        isStandardMenu: true,
        imageId: menu.baseId,
        baseName: base.name,
        subtitle: [base.name, fries && fries.name, drink && drink.name].filter(Boolean).join(' + '),
        searchText: [base.name, fries && fries.name, drink && drink.name, 'standard menu combo'].filter(Boolean).join(' ')
      });
    }).filter(Boolean);
  }

  function mealBasePrice(product){
    return Number(BK_DATA.MENU && BK_DATA.MENU[product.id]) || 0;
  }

  function isMealBase(product){
    return !!(product && mealBasePrice(product) > 0);
  }

  function isBurgerBase(product){
    return !!(product && ['hamburger', 'cheeseburger', 'double_burger', 'double_cheeseburger', 'chicken_burger', 'chicken_shawarma_burger'].includes(product.id));
  }

  function isWingsBase(product){
    return !!(product && ['wings_6','wings_12','wings_24'].includes(product.id));
  }

  function sauceOptions(){
    return [
      {label:'No Sauce Wanted', value:''},
      {label:'Ketchup', value:'x_sauce_ketchup'},
      {label:'Mayonnaise', value:'x_sauce_mayonnaise'},
      {label:'Chipotle', value:'x_sauce_chipotle'},
      {label:'Dutch Special', value:'x_sauce_dutch_special'},
      {label:'Chicken Wings Sauce', value:'x_sauce_chicken_wings'}
    ];
  }

  function paidSauceOptions(){
    return sauceOptions().filter(opt=>opt.value);
  }

  function burgerExtraSections(product){
    const askCheeseDefault = product.id !== 'cheeseburger' && product.id !== 'double_cheeseburger';
    const extras = [
      {label:'Extra Beef Patty', value:'x_beef_patty'},
      ...(askCheeseDefault ? [{label:'Extra Cheese', value:'x_cheese'}] : []),
      {label:'Bacon', value:'x_bacon'},
      {label:'Chicken Patty', value:'x_chicken_patty'},
      {label:'Chicken Shawarma Patty', value:'x_chicken_shawarma_patty'}
    ];
    return [
      { title:'Burger add-ons', name:'burgerExtras', type:'quantity', help:'Use + / − for multiple paid add-ons.', options:extras },
      { title:'Egg add-ons', name:'eggExtras', type:'quantity', options:[
        {label:'Fried Egg', value:'x_fried_egg'},
        {label:'Omelette', value:'x_omelette'}
      ]}
    ];
  }

  function addBurgerExtras(product, picked){
    const burgerSummary = describeQuantities([...(picked.burgerExtras || []), ...(picked.eggExtras || [])]);
    const itemNote = joinNotes(picked.itemNote, burgerSummary ? `Add-ons: ${burgerSummary}` : '');
    BK_STATE.addItem(product.id, itemNote);
    const addonNote = modifierLinkNote('for', product.name, picked.itemNote);
    addQuantities(picked.burgerExtras, addonNote);
    addQuantities(picked.eggExtras, addonNote);
  }

  function addWingsExtras(product, picked){
    const extraSummary = describeQuantities(picked.extraSauce);
    const itemNote = joinNotes(picked.itemNote, extraSummary ? `Extra sauces: ${extraSummary}` : '');
    BK_STATE.addItem(product.id, itemNote);
    if(picked.wingsSauce) BK_STATE.addItem(picked.wingsSauce, modifierLinkNote('included', product.name, picked.itemNote));
    addQuantities(picked.extraSauce, modifierLinkNote('extra', product.name, picked.itemNote));
  }

  function openMealModeDialog(product){
    return new Promise(resolve=>{
      const host = ensureDialogHost();
      const singlePrice = BK_PRICES.getPrice(product.id);
      const menuPrice = mealBasePrice(product);
      document.getElementById('appDialogTitle').textContent = `${product.name}: single or menu?`;
      document.getElementById('appDialogBody').innerHTML = `
        <div class="meal-choice">
          <button class="meal-choice-card" id="mealSingle" type="button">
            <span class="meal-choice-kicker">Single item</span>
            <strong>${product.name}</strong>
            <span>${singlePrice} GHS</span>
          </button>
          <button class="meal-choice-card recommended" id="mealMenu" type="button">
            <span class="meal-choice-kicker">Guided menu</span>
            <strong>${product.name} Menu</strong>
            <span>${menuPrice} GHS base · choose fries + drink</span>
          </button>
        </div>
        <div class="modifier-actions"><button class="x" id="dlgCancel" type="button">Cancel</button></div>
      `;
      host.classList.add('open');
      document.getElementById('mealSingle').onclick = ()=>{ closeDialog(); resolve('single'); };
      document.getElementById('mealMenu').onclick = ()=>{ closeDialog(); resolve('menu'); };
      document.getElementById('dlgCancel').onclick = ()=>{ closeDialog(); resolve(null); };
    });
  }

  async function addSingleProductWithModifiers(product, pendingNote){
    if(['fries_standard', 'fries_large', 'fries_family'].includes(product.id)){
      const picked = await openModifierSheet(`${product.name} options`, [
        { title:'Included sauce', name:'includedSauce', type:'radio', help:'Choose one free sauce for this fries item.', options:sauceOptions() },
        { title:'Paid extra sauce cups (+5 GHS each)', name:'extraSauce', type:'quantity', help:'Use + / − to add several paid sauces.', options:paidSauceOptions() }
      ], { note: pendingNote });
      const extraSummary = describeQuantities(picked.extraSauce);
      const itemNote = joinNotes(picked.itemNote, extraSummary ? `Extra sauces: ${extraSummary}` : '');
      BK_STATE.addItem(product.id, itemNote);
      if(picked.includedSauce) BK_STATE.addItem(picked.includedSauce, modifierLinkNote('included', product.name, picked.itemNote));
      addQuantities(picked.extraSauce, modifierLinkNote('extra', product.name, picked.itemNote));
    }else if(isBurgerBase(product)){
      const picked = await openModifierSheet(`${product.name} add-ons`, burgerExtraSections(product), { note: pendingNote });
      addBurgerExtras(product, picked);
    }else if(isWingsBase(product)){
      const picked = await openModifierSheet(`${product.name} sauce`, [
        { title:'Included sauce', name:'wingsSauce', type:'radio', help:'Choose one included sauce for the wings.', options:[
          {label:'No Sauce Wanted', value:''},
          {label:'Chicken Wings Sauce', value:'x_sauce_chicken_wings'},
          {label:'Chipotle', value:'x_sauce_chipotle'}
        ]},
        { title:'Paid extra sauce cups (+5 GHS each)', name:'extraSauce', type:'quantity', help:'Use + / − to add extra sauce cups.', options:paidSauceOptions() }
      ], { note: pendingNote });
      addWingsExtras(product, picked);
    }else{
      BK_STATE.addItem(product.id, pendingNote);
    }
    return true;
  }

  async function addGuidedMenu(product, pendingNote, preset){
    const menuPreset = preset || {};
    const defaultFries = menuPreset.defaultFries || 'fries_standard';
    const defaultDrink = menuPreset.defaultDrink || 'd_cola';
    const defaultWingsSauce = Object.prototype.hasOwnProperty.call(menuPreset, 'defaultWingsSauce') ? menuPreset.defaultWingsSauce : 'x_sauce_chicken_wings';
    const friesOptions = [
      {label: optionLabel('fries_standard', 'Fries Standard'), value:'fries_standard', checked: defaultFries === 'fries_standard'},
      {label: `${optionLabel('fries_large', 'Fries Large')} · upgrade +${Math.max(0, BK_PRICES.getPrice('fries_large') - BK_DATA.MENU.included.fries)} GHS`, value:'fries_large', checked: defaultFries === 'fries_large'}
    ].filter(opt=>productById(opt.value));
    const preferredDrinks = ['d_cola','d_sprite','d_fanta_orange','d_fanta_coktail','d_biggoo_grape','d_coconut_fresh','d_coconut_water_bottle','d_iced_tea_lime','d_iced_tea_ginger','d_iced_tea_strawberry','d_iced_tea_pineapple','d_iced_tea_mint','d_iced_tea_apple','d_iced_tea_green_mint','d_iced_tea_vannile','d_club_beer_std','d_club_beer_large','d_guinness'];
    const drinkOptions = preferredDrinks
      .map(id=>productById(id))
      .filter(Boolean)
      .map((p, idx)=>({
        label: `${p.name}${Math.max(0, BK_PRICES.getPrice(p.id) - BK_DATA.MENU.included.drink) ? ` · upgrade +${Math.max(0, BK_PRICES.getPrice(p.id) - BK_DATA.MENU.included.drink)} GHS` : ''}`,
        value: p.id,
        checked: p.id === defaultDrink || (!defaultDrink && idx === 0)
      }));
    const sections = [
      { title:'Menu fries', name:'menuFries', type:'radio', help:'Standard fries are included; large fries add the upgrade difference.', options:friesOptions },
      { title:'Menu drink', name:'menuDrink', type:'radio', help:'Choose the drink for this menu.', options:drinkOptions }
    ];
    if(isBurgerBase(product)) sections.push(...burgerExtraSections(product));
    if(isWingsBase(product)) sections.push({ title:'Included sauce', name:'wingsSauce', type:'radio', help:'Choose one included sauce for the wings.', options:[
      {label:'No Sauce Wanted', value:'', checked: defaultWingsSauce === ''},
      {label:'Chicken Wings Sauce', value:'x_sauce_chicken_wings', checked: defaultWingsSauce === 'x_sauce_chicken_wings'},
      {label:'Chipotle', value:'x_sauce_chipotle', checked: defaultWingsSauce === 'x_sauce_chipotle'}
    ]});
    sections.push({ title:'Paid extra sauce cups (+5 GHS each)', name:'extraSauce', type:'quantity', help:'Use + / − to add extra sauce cups.', options:paidSauceOptions() });

    const picked = await openModifierSheet(menuPreset.name || `${product.name} guided menu`, sections, {
      note: pendingNote,
      cancelLabel: 'Cancel menu',
      confirmLabel: 'Add menu',
      cancelValue: null
    });
    if(!picked) return false;

    if(isBurgerBase(product)) addBurgerExtras(product, picked);
    else if(isWingsBase(product)) addWingsExtras(product, picked);
    else BK_STATE.addItem(product.id, picked.itemNote || pendingNote);

    const menuNote = modifierLinkNote('menu', product.name, picked.itemNote);
    if(picked.menuFries) BK_STATE.addItem(picked.menuFries, menuNote);
    if(picked.menuDrink) BK_STATE.addItem(picked.menuDrink, menuNote);
    if(!isWingsBase(product)) addQuantities(picked.extraSauce, modifierLinkNote('extra', product.name, picked.itemNote));
    return true;
  }

  async function addStandardMenuPreset(menu){
    const base = productById(menu.baseId);
    if(!base){
      infoDialog(`${menu.name} is not available in the current product catalog.`);
      return;
    }
    const added = await addGuidedMenu(base, '', menu);
    if(!added) return;
    renderOrder();
    renderMake();
    refreshTotals();
  }

  async function addProductWithFlow(product){
    const pendingNote = '';
    let added = false;

    if(isMealBase(product)){
      const mode = await openMealModeDialog(product);
      if(mode === 'menu') added = await addGuidedMenu(product, pendingNote);
      else if(mode === 'single') added = await addSingleProductWithModifiers(product, pendingNote);
    }else{
      added = await addSingleProductWithModifiers(product, pendingNote);
    }

    if(!added) return;
    renderOrder();
    renderMake();
    refreshTotals();
  }


  function bindProductSearch(){
    const input = document.getElementById('productSearch');
    const clearBtn = document.getElementById('clearProductSearch');
    if(!input || input.dataset.bound === '1') return;

    const rerender = ()=>{
      productQuery = (input.value || '').trim();
      buildProducts();
    };

    input.addEventListener('input', rerender);
    clearBtn?.addEventListener('click', ()=>{
      input.value = '';
      productQuery = '';
      buildProducts();
      input.focus();
    });
    input.dataset.bound = '1';
  }

  function setCategory(cat){
    currentCat = cat || 'all';
    goTab('order');
    document.querySelectorAll('.catbar .tab').forEach(btn=>{
      btn.classList.toggle('active', btn.dataset.cat===currentCat);
    });
    buildProducts();
  }

  function renderSlotsBar(){
    const {slots, active} = BK_STATE.getState();
    const bar = document.getElementById('slotsBar');
    const activeLabel = document.getElementById('activeSlotLabel');
    const activeSlot = slots[active];
    if(activeLabel) activeLabel.textContent = activeSlot ? `${activeSlot.name} · #${activeSlot.orderNo || '-'}` : 'No active order';
    if(!bar) return;
    bar.querySelectorAll('.slot-chip').forEach(n=>n.remove());

    const controlIds = ['btnAddSlot', 'btnRenameSlot', 'btnDeleteSlot'];
    const ctl = controlIds
      .map(id => document.getElementById(id))
      .filter(Boolean)
      .filter(el => el.parentElement === bar);
    ctl.forEach(c=>bar.removeChild(c));
    slots.forEach((s,i)=>{
      const el = document.createElement('button');
      const allDone = s.items.length>0 && s.items.every(it=>!!it.done);
      const status = s.issued ? 'issued' : (s.pay==='unpaid' ? 'unpaid' : (allDone ? 'ready' : 'kitchen'));
      el.type = 'button';
      el.className='chip slot-chip status-' + status + (i===active?' active':'');
      el.innerHTML = `<span class="status-dot"></span>${s.name} · #${s.orderNo || '-'}`;
      el.onclick = ()=>{ BK_STATE.setActive(i); renderOrder(); refreshTotals(); goTab('order'); };
      bar.appendChild(el);
    });
    ctl.forEach(c=>bar.appendChild(c));
  }


  function baseCustomerNote(note){
    return String(note || '')
      .replace(/\s+·\s+Add-ons:.*$/i, '')
      .replace(/\s+·\s+Extra sauces:.*$/i, '')
      .trim();
  }

  function parseLinkedModifierNote(note){
    const txt = String(note || '').trim();
    const m = txt.match(/^(included|extra|menu)?\s*for\s+(.+?)(?::\s*(.*))?$/i);
    if(!m) return null;
    return {
      prefix: (m[1] || 'for').toLowerCase(),
      productName: (m[2] || '').trim(),
      itemNote: (m[3] || '').trim()
    };
  }

  function hasMenuChildren(entry){
    return (entry.children || []).some(child=> child.linked && child.linked.prefix === 'menu');
  }

  function childPrefixLabel(child){
    const prefix = child && child.linked && child.linked.prefix;
    if(prefix === 'menu') return 'Menu';
    if(prefix === 'included') return 'Included';
    if(prefix === 'extra') return 'Extra';
    return '';
  }


  function linkedGroupKey(productName, note){
    return `${String(productName || '').trim()}|${baseCustomerNote(note)}`;
  }

  function groupedCartRows(items){
    const groups = [];
    const linkedChildren = [];
    const parentByKey = new Map();
    const parentsByName = new Map();
    const standalone = [];

    BK_LOGIC.groupedLines(items).forEach(line=>{
      const linked = parseLinkedModifierNote(line.note);
      if(linked){
        linkedChildren.push(Object.assign({}, line, { linked }));
        return;
      }

      const prod = BK_DATA.BASE.find(x=>x.id===line.id);
      const isModifierProduct = prod && (prod.cat === 'extra' || String(prod.id || '').startsWith('x_sauce_'));
      if(isModifierProduct){
        standalone.push(line);
        return;
      }

      const group = Object.assign({}, line, { children: [] });
      const groupKey = linkedGroupKey(line.name, line.note);
      groups.push(group);
      parentByKey.set(groupKey, group);
      const nameKey = String(line.name || '').trim().toLowerCase();
      if(!parentsByName.has(nameKey)) parentsByName.set(nameKey, []);
      parentsByName.get(nameKey).push(group);
    });

    linkedChildren.forEach(child=>{
      const linked = child.linked;
      const exactParent = parentByKey.get(linkedGroupKey(linked.productName, linked.itemNote));
      const fallbackParents = parentsByName.get(String(linked.productName || '').trim().toLowerCase()) || [];
      const parent = exactParent || fallbackParents[fallbackParents.length - 1];
      if(parent) parent.children.push(child);
      else standalone.push(child);
    });

    return groups.concat(standalone.map(line=>Object.assign({}, line, { children: [] })));
  }

  function groupedEntryTotal(entry){
    return entry.total + (entry.children || []).reduce((sum, child)=> sum + child.total, 0);
  }

  function groupedEntryDone(slot, entry){
    const keys = [entry.key, ...(entry.children || []).map(child=>child.key)];
    return keys.every(key=>{
      const [id, note=''] = BK_LOGIC.parseItemKey(key);
      return slot.items
        .filter(it=> it.itemId===id && (it.note||'')===note)
        .every(it=>!!it.done);
    });
  }

  function setGroupedEntryDone(entry, done){
    BK_STATE.setDoneForKey(entry.key, done);
    (entry.children || []).forEach(child=> BK_STATE.setDoneForKey(child.key, done));
  }

  function groupedEntryText(entry){
    const parent = `${entry.qty}x ${entry.name}${entry.note ? ` (${entry.note})` : ''}`;
    const children = (entry.children || []).map(child=>`↳ ${child.qty}x ${child.name}${child.note ? ` (${child.note})` : ''}`);
    return [parent, ...children].join(' · ');
  }

  function appendGroupedEntry(host, slot, entry, slotIndex, opts){
    const settings = opts || {};
    const row = document.createElement('div');
    row.className = settings.compact ? 'grouped-meal compact' : 'grouped-meal';

    const header = document.createElement('div');
    header.className = 'grouped-meal-head';
    if(settings.checkbox){
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = groupedEntryDone(slot, entry);
      cb.disabled = !!slot.issued;
      cb.onchange = ()=>{
        if(settings.onToggle) settings.onToggle(entry, cb.checked);
        else setGroupedEntryDone(entry, cb.checked);
      };
      header.appendChild(cb);
    }

    const titleWrap = document.createElement('span');
    titleWrap.className = 'grouped-meal-title';
    const title = document.createElement('b');
    title.textContent = `${entry.qty}x ${entry.name}`;
    titleWrap.appendChild(title);
    if(entry.note){
      const note = document.createElement('small');
      note.textContent = entry.note;
      titleWrap.appendChild(note);
    }
    header.appendChild(titleWrap);

    const price = document.createElement('span');
    price.className = 'grouped-meal-price';
    price.textContent = `${groupedEntryTotal(entry)} GHS`;
    header.appendChild(price);
    row.appendChild(header);

    (entry.children || []).forEach(child=>{
      const childLine = document.createElement('div');
      childLine.className = 'grouped-meal-child';
      childLine.textContent = `↳ ${child.qty}x ${child.name}${child.note ? ` · ${child.note}` : ''} · ${child.total} GHS`;
      row.appendChild(childLine);
    });

    host.appendChild(row);
    return row;
  }

  function renderOrder(){
    const {slots, active} = BK_STATE.getState();
    const lines = document.getElementById('lines'); lines.innerHTML='';
    if(!slots.length){ setSlotTotals(0,0,0); return; }
    const s = slots[active];

    const entries = groupedCartRows(s.items);
    if(entries.length===0){
      const row = document.createElement('div');
      row.className = 'empty-state';
      row.textContent = 'No items yet. Select products to start this order.';
      lines.appendChild(row);
    }
    const refreshOrderViews = ()=>{
      renderOrder();
      renderMake();
      renderIssue();
      refreshTotals();
    };
    const repeat = (n, fn)=>{ for(let i=0; i<Math.max(0, n); i++) fn(); };
    entries.forEach(entry=>{
      const [id, note=''] = BK_LOGIC.parseItemKey(entry.key);
      const prod = BK_DATA.BASE.find(x=>x.id===id);
      const totalPrice = entry.total + (entry.children || []).reduce((sum, child)=> sum + child.total, 0);
      const row = document.createElement('div');
      const isMenuGroup = hasMenuChildren(entry);
      row.className = `row cart-row${entry.children && entry.children.length ? ' cart-group-row' : ''}${isMenuGroup ? ' cart-menu-row' : ''}`;

      const controls = document.createElement('div');
      controls.className = 'cart-controls';
      const dec = document.createElement('button');
      dec.className = 'mini';
      dec.type = 'button';
      dec.textContent = '−';
      dec.disabled = !!s.issued;
      dec.onclick = ()=>{
        (entry.children || []).forEach(child=> repeat(Math.max(1, Math.round(child.qty / Math.max(1, entry.qty))), ()=> BK_STATE.decItemForKey(child.key)));
        BK_STATE.decItemForKey(entry.key);
        refreshOrderViews();
      };
      const inc = document.createElement('button');
      inc.className = 'mini';
      inc.type = 'button';
      inc.textContent = '+';
      inc.disabled = !!s.issued;
      inc.onclick = ()=>{
        BK_STATE.addItemForKey(entry.key);
        (entry.children || []).forEach(child=> repeat(Math.max(1, Math.round(child.qty / Math.max(1, entry.qty))), ()=> BK_STATE.addItemForKey(child.key)));
        refreshOrderViews();
      };
      controls.append(dec, inc);

      const detail = document.createElement('div');
      detail.className = 'cart-detail';
      const title = document.createElement('b');
      title.textContent = prod ? prod.name : id;
      const meta = document.createElement('small');
      meta.textContent = `× ${entry.qty}${note ? ` · ${note}` : ''}`;
      if(isMenuGroup){
        const badge = document.createElement('span');
        badge.className = 'cart-menu-badge';
        badge.textContent = 'MENU';
        title.appendChild(badge);
      }
      detail.append(title, meta);
      (entry.children || []).forEach(child=>{
        const childLine = document.createElement('small');
        childLine.className = `cart-child-line${child.linked && child.linked.prefix === 'menu' ? ' cart-menu-child' : ''}`;
        const label = childPrefixLabel(child);
        childLine.textContent = `↳ ${label ? `${label}: ` : ''}${child.name} × ${child.qty} · ${child.total} GHS`;
        detail.appendChild(childLine);
      });

      const price = document.createElement('div');
      price.className = 'cart-price';
      price.textContent = `${totalPrice} GHS`;

      const remove = document.createElement('button');
      remove.className = 'mini remove-line';
      remove.type = 'button';
      remove.textContent = 'Remove';
      remove.disabled = !!s.issued;
      remove.onclick = ()=>{
        (entry.children || []).forEach(child=> BK_STATE.removeItemForKey(child.key));
        BK_STATE.removeItemForKey(entry.key);
        refreshOrderViews();
      };

      row.append(controls, detail, price, remove);
      lines.appendChild(row);
    });

    const c = BK_LOGIC.computeSlot(s);
    setSlotTotals(c.subtotal, 0, c.subtotal);
    ensureFlowActions('orderFlowNav', [{ label:'➡️ Go to Make', onClick:()=> goTab('make') }]);
  }

  function renderMake(){
    const {slots} = BK_STATE.getState();
    const box = document.getElementById('makeList');
    box.querySelectorAll('.slot-card').forEach(n=>n.remove());
    if(!slots.length){
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = 'No active orders in kitchen.';
      box.appendChild(empty);
      return;
    }
    slots.forEach((s,i)=>{
      const c = BK_LOGIC.computeSlot(s);
      const card = document.createElement('div'); card.className='slot-card';
      card.innerHTML = `
        <div class="slot-head">
          <div><span class="label">${s.name}</span> · #${s.orderNo || '-'} · ${c.subtotal} GHS · Combos: ${c.combos} · In kitchen: ${formatAge(s.createdAt)}</div>
          <div><button onclick="BK_STATE.setActive(${i}); BK_UI.renderOrder(); BK_UI.refreshTotals();">Focus</button></div>
        </div>
        <div class="todo grouped-todo" id="todo-${i}"></div>`;
      box.appendChild(card);
      const list = card.querySelector(`#todo-${i}`);
      groupedCartRows(s.items).forEach(entry=>{
        appendGroupedEntry(list, s, entry, i, {
          checkbox: true,
          onToggle: (picked, done)=>{
            BK_STATE.setActive(i);
            setGroupedEntryDone(picked, done);
            renderMake();
            renderIssue();
          }
        });
      });
    });
    ensureFlowActions('makeList', [
      { label:'⬅️ Back to Order', onClick:()=> goTab('order') },
      { label:'➡️ Go to Payment', onClick:()=> goTab('pay') }
    ]);
  }

  function renderPay(){
    const {slots} = BK_STATE.getState();
    const box = document.getElementById('payList');
    box.querySelectorAll('.slot-card').forEach(n=>n.remove());
    if(!slots.length){
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = 'No active orders to pay.';
      box.appendChild(empty);
      return;
    }
    slots.forEach((s,i)=>{
      const c = BK_LOGIC.computeSlot(s);
      const card = document.createElement('div'); card.className='slot-card';
      card.innerHTML = `
        <div class="slot-head">
          <div><span class="label">${s.name}</span> · #${s.orderNo || '-'} · ${c.subtotal} GHS</div>
          <div class="pay-status">
            <span>Status: ${s.pay.toUpperCase()}</span>
            <button ${s.issued ? 'disabled' : ''} onclick="BK_STATE.setPay(${i},'unpaid'); BK_UI.renderPay(); BK_UI.renderIssue(); BK_UI.refreshTotals();">Unpaid</button>
            <button ${s.issued ? 'disabled' : ''} onclick="BK_STATE.setPay(${i},'cash'); BK_UI.renderPay(); BK_UI.renderIssue(); BK_UI.refreshTotals();">Paid Cash</button>
            <button ${s.issued ? 'disabled' : ''} onclick="BK_STATE.setPay(${i},'momo'); BK_UI.renderPay(); BK_UI.renderIssue(); BK_UI.refreshTotals();">Paid MoMo</button>
          </div>
        </div>`;
      box.appendChild(card);
    });
    ensureFlowActions('payList', [
      { label:'⬅️ Back to Make', onClick:()=> goTab('make') },
      { label:'➡️ Go to Issue / Handover', onClick:()=> goTab('issue') }
    ]);
  }

  function renderIssue(){
    const {slots} = BK_STATE.getState();
    const box = document.getElementById('issueList');
    if(!box) return;
    box.querySelectorAll('.slot-card').forEach(n=>n.remove());
    if(!slots.length){
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = 'No orders waiting for handover.';
      box.appendChild(empty);
      return;
    }
    slots.forEach((s,i)=>{
      const allDone = s.items.length>0 && s.items.every(it=>!!it.done);
      const canIssue = s.pay !== 'unpaid' && allDone;
      const card = document.createElement('div'); card.className='slot-card';
      card.innerHTML = `
        <div class="slot-head">
          <div><span class="label">${s.name}</span> · #${s.orderNo || '-'} · Payment: ${s.pay.toUpperCase()} · Kitchen: ${allDone ? 'DONE' : 'OPEN'} · Elapsed: ${formatAge(s.createdAt)}</div>
          <div class="pay-status">
            <span>Status: ${s.issued ? 'ISSUED' : 'WAITING'}</span>
            <button ${(canIssue && !s.issued) ? '' : 'disabled'} onclick="BK_UI.markIssued(${i});">Mark Issued</button>
          </div>
        </div>`;
      const checklist = document.createElement('div');
      checklist.className = 'issue-checklist';
      const label = document.createElement('small');
      label.textContent = 'Final check:';
      checklist.appendChild(label);
      const grouped = groupedCartRows(s.items);
      if(grouped.length){
        grouped.forEach(entry=> appendGroupedEntry(checklist, s, entry, i, { compact:true }));
      }else{
        const emptyLine = document.createElement('div');
        emptyLine.className = 'empty-state';
        emptyLine.textContent = 'No items';
        checklist.appendChild(emptyLine);
      }
      card.appendChild(checklist);
      box.appendChild(card);
    });
    const activeIssued = BK_STATE.getState().slots[BK_STATE.getState().active]?.issued;
    ensureFlowActions('issueList', [
      { label:'⬅️ Back to Payment', onClick:()=> goTab('pay'), disabled: !!activeIssued },
      { label:'🆕 Start Next Order', onClick:()=> startNextOrder() }
    ]);
  }


  function goTab(name){
    const valid = new Set(['order','make','pay','issue']);
    const target = valid.has(name) ? name : 'order';
    const st = BK_STATE.getState();
    const activeSlot = st.slots[st.active];
    if(activeSlot?.issued && target !== 'issue'){
      infoDialog('This order is already issued and locked. Start a new order slot for further changes.');
      return;
    }

    const sectionMap = {
      order: 'tab-order',
      make: 'tab-make',
      pay: 'tab-pay',
      issue: 'tab-issue'
    };
    Object.entries(sectionMap).forEach(([key, id])=>{
      const sec = document.getElementById(id);
      if(sec) sec.classList.toggle('hidden', key !== target);
    });

    const tabMap = {
      order: 'tabOrder',
      make: 'tabMake',
      pay: 'tabPay',
      issue: 'tabIssue'
    };
    Object.entries(tabMap).forEach(([key, id])=>{
      const tab = document.getElementById(id);
      if(tab){
        tab.classList.toggle('active', key === target);
        if(key === target) tab.setAttribute('aria-current', 'step');
        else tab.removeAttribute('aria-current');
      }
    });
  }

  function clearFlowAction(hostId){
    const host = document.getElementById(hostId);
    if(!host) return;
    host.querySelector('.flow-action')?.remove();
  }

  function ensureFlowActions(hostId, actions){
    const host = document.getElementById(hostId);
    if(!host) return;
    let row = host.classList.contains('flow-action') ? host : host.querySelector('.flow-action');
    if(!row){
      row = document.createElement('div');
      row.className = 'flow-action';
      row.style.marginTop = '10px';
      host.appendChild(row);
    }
    row.innerHTML = '';
    (actions || []).forEach(action=>{
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'x';
      btn.textContent = action.label;
      btn.disabled = !!action.disabled;
      btn.onclick = action.onClick;
      row.appendChild(btn);
    });
  }

  function startNextOrder(){
    const st = BK_STATE.getState();
    const i = st.active;
    const slot = st.slots[i];
    if(!slot){
      goTab('order');
      return;
    }
    const allDone = slot.items.length > 0 && slot.items.every(it=>!!it.done);
    const canReset = slot.issued && slot.pay !== 'unpaid' && allDone;
    if(!canReset){
      infoDialog('Complete order first: paid, kitchen done, and marked as issued. Use + Slot in header after payment to take a new order while kitchen keeps working.');
      return;
    }
    st.slots[i] = {
      name: slot.name,
      items: [],
      pay: 'unpaid',
      issued: false,
      orderNo: BK_STATE.nextOrderNo(),
      createdAt: Date.now()
    };
    BK_STATE.setState(st);
    renderAll();
    goTab('order');
  }

  function quickStartNext(slotIndex){
    const st = BK_STATE.getState();
    const i = Number.isInteger(slotIndex) ? slotIndex : st.active;
    const slot = st.slots[i];
    if(!slot) return;
    st.active = i;
    st.slots[i] = {
      name: slot.name,
      items: [],
      pay: 'unpaid',
      issued: false,
      orderNo: BK_STATE.nextOrderNo(),
      createdAt: Date.now()
    };
    BK_STATE.setState(st);
    renderAll();
    goTab('order');
  }

  function addNewOrderSlot(){
    const st = BK_STATE.getState();
    const slot = st.slots[st.active];
    if(slot && slot.items.length>0 && slot.pay === 'unpaid'){
      infoDialog('Please confirm payment first, then use + Slot to start the next order.');
      return;
    }
    BK_STATE.addSlot();
    renderAll();
    goTab('order');
  }

  function historyRemoteEnabled(){
    return !!(window.BK_SYNC_ENABLED !== false && window.FIREBASE_CONFIG && window.firebase && window.firebase.database);
  }
  function historyRemotePath(){
    return (window.BK_HISTORY_PATH || '/pos/history').replace(/\/+$/,'');
  }
  function historyDb(){
    if(!historyRemoteEnabled()) return null;
    try{
      const app = (window.firebase.apps && firebase.apps.length)
        ? firebase.app()
        : firebase.initializeApp(window.FIREBASE_CONFIG);
      return firebase.database(app);
    }catch(e){ return null; }
  }
  function historyDateKey(ts){
    const d = new Date(Number(ts) || Date.now());
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  }
  function sanitizeHistoryEntry(entry){
    if(!entry || typeof entry !== 'object') return null;
    const orderNo = String(entry.orderNo || '').trim() || '-';
    const closedAt = Number(entry.closedAt) || Date.now();
    return {
      id: String(entry.id || `${orderNo}-${closedAt}`).replace(/[^a-zA-Z0-9_\-]/g, '_'),
      orderNo,
      slotName: String(entry.slotName || '-'),
      pay: String(entry.pay || 'unpaid'),
      issued: !!entry.issued,
      createdAt: Number(entry.createdAt) || closedAt,
      closedAt,
      subtotal: Number(entry.subtotal) || 0,
      combos: Number(entry.combos) || 0,
      items: Array.isArray(entry.items) ? entry.items : []
    };
  }
  function mergeHistory(local, remote){
    const map = new Map();
    (Array.isArray(local) ? local : []).forEach(h=>{ const clean = sanitizeHistoryEntry(h); if(clean) map.set(clean.id, clean); });
    (Array.isArray(remote) ? remote : []).forEach(h=>{ const clean = sanitizeHistoryEntry(h); if(clean) map.set(clean.id, clean); });
    return Array.from(map.values()).sort((a,b)=> Number(b.closedAt||0) - Number(a.closedAt||0)).slice(0, 1000);
  }
  function flattenRemoteHistory(raw){
    const out = [];
    if(!raw || typeof raw !== 'object') return out;
    Object.values(raw).forEach(day=>{
      if(!day || typeof day !== 'object') return;
      Object.values(day).forEach(entry=>{ const clean = sanitizeHistoryEntry(entry); if(clean) out.push(clean); });
    });
    return out;
  }
  function saveHistoryRemote(entry){
    const database = historyDb();
    const clean = sanitizeHistoryEntry(entry);
    if(!database || !clean) return Promise.resolve(false);
    return database.ref(`${historyRemotePath()}/${historyDateKey(clean.closedAt)}/${clean.id}`).set(clean)
      .then(()=>true)
      .catch(e=>{ console.warn('history remote save failed:', e && e.message); return false; });
  }
  function loadHistoryRemoteOnce(){
    const database = historyDb();
    if(!database) return Promise.resolve(false);
    return database.ref(historyRemotePath()).get().then(snap=>{
      const remote = flattenRemoteHistory(snap.val());
      if(!remote.length) return false;
      saveHistory(mergeHistory(getHistory(), remote));
      return true;
    }).catch(e=>{
      console.warn('history remote load failed:', e && e.message);
      return false;
    });
  }
  function clearHistoryRemote(){
    const database = historyDb();
    if(!database) return Promise.resolve(false);
    return database.ref(historyRemotePath()).set(null)
      .then(()=>true)
      .catch(e=>{ console.warn('history remote clear failed:', e && e.message); return false; });
  }

  function getHistory(){
    try{
      const raw = localStorage.getItem(HISTORY_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return normalizeHistory(arr);
    }catch(e){ return []; }
  }
  function saveHistoryRemoteSoon(list){
    if(!historyRemoteEnabled()) return;
    if(historyRemoteSaveTimer) clearTimeout(historyRemoteSaveTimer);
    historyRemoteSaveTimer = setTimeout(function(){
      const clean = normalizeHistory(list).slice(0, 1000);
      getHistoryRef().then(function(ref){
        if(!ref) return;
        ref.set({entries: clean, ts: Date.now()}).catch(function(e){
          console.warn('history remote save failed:', e && e.message);
        });
      });
    }, 400);
  }
  function saveHistory(list, opts){
    const clean = normalizeHistory(list).slice(0, 1000);
    try{ localStorage.setItem(HISTORY_KEY, JSON.stringify(clean)); }catch(e){}
    if(!opts || opts.remote !== false) saveHistoryRemoteSoon(clean);
  }
  function loadHistoryRemoteOnce(force){
    if(!historyRemoteEnabled()) return Promise.resolve(false);
    if(!force && historyRemoteLoadedAt && Date.now() - historyRemoteLoadedAt < 5000) return Promise.resolve(false);
    historyRemoteLoadedAt = Date.now();
    return getHistoryRef().then(function(ref){
      if(!ref) return false;
      return ref.get().then(function(snap){
        const val = snap.val();
        if(!val) return false;
        const hasEntries = Array.isArray(val.entries);
        const remote = normalizeHistory(hasEntries ? val.entries : val);
        if(hasEntries && !remote.length){
          saveHistory([], {remote:false});
          return true;
        }
        if(!remote.length) return false;
        const merged = mergeHistoryLists(getHistory(), remote);
        saveHistory(merged, {remote:false});
        return true;
      });
    }).catch(function(e){
      console.warn('history remote load failed:', e && e.message);
      return false;
    });
  }
  function slotSnapshot(slot){
    const c = BK_LOGIC.computeSlot(slot);
    return {
      id: `${slot.orderNo || 'ORD'}-${Date.now()}`,
      orderNo: slot.orderNo || '-',
      slotName: slot.name || '-',
      pay: slot.pay || 'unpaid',
      issued: !!slot.issued,
      createdAt: slot.createdAt || Date.now(),
      closedAt: Date.now(),
      subtotal: c.subtotal,
      combos: c.combos,
      items: BK_LOGIC.groupedLines(slot.items || []).map(x=>({name:x.name, qty:x.qty, note:x.note, total:x.total}))
    };
  }
  function pushHistory(entry){
    const clean = sanitizeHistoryEntry(entry);
    if(!clean) return;
    const hist = mergeHistory([clean], getHistory());
    saveHistory(hist);
    saveHistoryRemote(clean);
  }
  function markIssued(i){
    const st = BK_STATE.getState();
    const slot = st.slots[i];
    if(!slot) return;
    const lines = groupedCartRows(slot.items || []);
    const checkHtml = lines.length
      ? lines.map(entry=>`
        <div class="grouped-meal compact">
          <div class="grouped-meal-head"><span class="grouped-meal-title"><b>${entry.qty}x ${entry.name}</b>${entry.note ? `<small>${entry.note}</small>` : ''}</span></div>
          ${(entry.children || []).map(child=>`<div class="grouped-meal-child">↳ ${child.qty}x ${child.name}${child.note ? ` · ${child.note}` : ''}</div>`).join('')}
        </div>`).join('')
      : '<div>No items in this order.</div>';
    confirmDialog(
      `Final handover check – ${slot.orderNo || slot.name}`,
      `<div style="margin-bottom:8px">Please confirm all items are packed correctly before issuing to customer.</div>${checkHtml}`
    ).then(ok=>{
      if(!ok) return;
      const latestSlot = BK_STATE.getState().slots[i];
      if(!latestSlot || latestSlot.issued) return;
      const stockResult = window.BK_STOCK && typeof BK_STOCK.consumeSlot === 'function'
        ? BK_STOCK.consumeSlot(latestSlot)
        : null;
      BK_STATE.setIssued(i, true);
      pushHistory(slotSnapshot({...latestSlot, issued:true}));
      renderIssue();
      renderStock();
      const suffix = stockResult && stockResult.message ? ` ${stockResult.message}` : '';
      infoDialog(`Order marked as issued.${suffix}`);
    });
  }

  function renderHistoryBody(){
    const body = document.getElementById('historyBody');
    const hist = getFilteredHistory();
    if(hist.length===0){
      body.innerHTML = '<div class="empty-state">No completed orders in history yet.</div>';
      return;
    }
    const totalSales = hist.reduce((a,h)=> a + Number(h.subtotal||0), 0);
    const cashCount = hist.filter(h=>h.pay==='cash').length;
    const momoCount = hist.filter(h=>h.pay==='momo').length;
    body.innerHTML = `
      <div class="row" style="border-top:none;padding:8px 0 14px">
        <span><b>Orders:</b> ${hist.length} · <b>Cash:</b> ${cashCount} · <b>MoMo:</b> ${momoCount}</span>
        <span><b>Sales:</b> ${totalSales} GHS</span>
      </div>
    ` + hist.slice(0,100).map(h=>`
      <div class="row" style="border-top:1px dashed #2a2f39;padding:8px 0">
        <span><b>${h.orderNo}</b> · ${h.slotName} · ${h.pay.toUpperCase()} · ${new Date(h.closedAt).toLocaleString()}</span>
        <span>${h.subtotal} GHS</span>
      </div>
    `).join('');
  }
  function openHistory(){
    renderHistoryBody();
    document.getElementById('modalHistory').classList.add('open');
    loadHistoryRemoteOnce().then(hasRemote=>{ if(hasRemote) renderHistoryBody(); });
  }
  function getFilteredHistory(){
    const text = historyFilterText.trim().toLowerCase();
    const today = new Date();
    today.setHours(0,0,0,0);
    return getHistory().filter(h=>{
      if(historyFilterToday && Number(h.closedAt || 0) < today.getTime()) return false;
      if(!text) return true;
      return String(h.orderNo || '').toLowerCase().includes(text)
        || String(h.slotName || '').toLowerCase().includes(text);
    });
  }
  function filterHistoryText(v){
    historyFilterText = String(v || '');
    openHistory();
  }
  function filterHistoryToday(){
    historyFilterToday = !historyFilterToday;
    openHistory();
  }
  function clearHistory(){
    if(!confirm('Clear saved order history?')) return;
    saveHistory([]);
    clearHistoryRemote();
    openHistory();
  }
  function closeHistory(){ document.getElementById('modalHistory').classList.remove('open'); }
  function downloadFile(name, content, type){
    const blob = new Blob([content], {type});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  }
  function exportHistoryJson(){
    loadHistoryRemoteOnce().finally(()=>{
      downloadFile(`bk-history-${Date.now()}.json`, JSON.stringify(getHistory(), null, 2), 'application/json');
    });
  }
  function exportHistoryCsv(){
    const writeCsv = ()=>{
    const hist = getHistory();
    const rows = [['orderNo','slotName','pay','issued','createdAt','closedAt','subtotal','combos']];
    hist.forEach(h=> rows.push([h.orderNo,h.slotName,h.pay,h.issued,h.createdAt,h.closedAt,h.subtotal,h.combos]));
    const csv = rows.map(r=> r.map(v=> `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    downloadFile(`bk-history-${Date.now()}.csv`, csv, 'text/csv');
    };
    loadHistoryRemoteOnce().finally(writeCsv);
  }

  function formatAge(createdAt){
    const ts = Number(createdAt) || Date.now();
    const mins = Math.max(0, Math.floor((Date.now() - ts) / 60000));
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if(h<=0) return `${m}m`;
    return `${h}h ${m}m`;
  }

  function setSlotTotals(sub, disc, tot){
    document.getElementById('subtotal').textContent = `${sub} GHS`;
    document.getElementById('discount').textContent = `-${disc} GHS`;
    document.getElementById('total').textContent = `${tot} GHS`;
  }

  function refreshTotals(){
    const {slots, discountRate, active} = BK_STATE.getState();
    const g = BK_LOGIC.computeAll(slots, discountRate);
    const activeSlot = slots[active];
    const c = activeSlot ? BK_LOGIC.computeSlot(activeSlot) : {subtotal:0, combos:0};
    setSlotTotals(c.subtotal, 0, c.subtotal);
    document.getElementById('grand').textContent = `${c.subtotal} GHS`;
    document.getElementById('combosPill').textContent = `Combos: ${c.combos || 0}`;
    document.getElementById('discountTag').textContent = g.discount>0 ? `Discount: ${Math.round(discountRate*100)}%` : 'No discount';
    document.getElementById('allSubtotal').textContent = `${g.grandSubtotal} GHS`;
    document.getElementById('allDiscount').textContent = `-${g.discount} GHS`;
    document.getElementById('allGrand').textContent = `${g.grand} GHS`;
    renderStock();
  }

  function renderStock(){
    if(!window.BK_STOCK) return;
    const stockBody = document.getElementById('stockOverviewBody');
    if(!stockBody) return;
    const badge = document.getElementById('stockAlertBadge');
    let host = document.getElementById('stockCard');
    if(!host){
      host = document.createElement('div');
      host.id = 'stockCard';
      host.className = 'stock-overview-wrap';
      stockBody.appendChild(host);
    }
    const {slots} = BK_STATE.getState();
    const rows = BK_STOCK.getSnapshot(slots);
    const tracked = rows.filter(r=> r.track !== false);
    const buyCount = tracked.filter(r=> !!r.buyNeeded).length;
    const refillCount = tracked.filter(r=> !r.buyNeeded && !!r.refillNeeded).length;
    const criticalCount = tracked.filter(r=> !!r.shortage || !!r.buyNeeded).length;
    if(badge){
      if(criticalCount > 0){
        badge.classList.remove('hidden');
        badge.classList.toggle('warn', buyCount === 0);
        badge.textContent = String(criticalCount);
      }else{
        badge.classList.add('hidden');
        badge.classList.remove('warn');
      }
    }
    const stockStatus = r=> (r.buyNeeded || r.shortage) ? 'buy' : (r.refillNeeded ? 'refill' : 'ok');
    const visible = tracked.filter(r=> stockOverviewFilter === 'all' ? true : stockStatus(r) === stockOverviewFilter);
    host.innerHTML = `
      <div class="stock-overview-summary">
        <div class="stock-kpi"><span>Tracked</span><b>${tracked.length}</b></div>
        <div class="stock-kpi crit"><span>Critical</span><b>${criticalCount}</b></div>
        <div class="stock-kpi refill"><span>Refill</span><b>${refillCount}</b></div>
        <div class="stock-kpi"><span>Buy</span><b>${buyCount}</b></div>
      </div>
      <div class="stock-overview-filters">
        <button class="stock-filter ${stockOverviewFilter==='all'?'active':''}" data-stock-filter="all">All</button>
        <button class="stock-filter ${stockOverviewFilter==='ok'?'active':''}" data-stock-filter="ok">OK</button>
        <button class="stock-filter ${stockOverviewFilter==='refill'?'active':''}" data-stock-filter="refill">Refill</button>
        <button class="stock-filter ${stockOverviewFilter==='buy'?'active':''}" data-stock-filter="buy">Critical / Buy</button>
      </div>
      <div class="stock-overview-list" id="stockOverviewList"></div>
    `;
    const list = host.querySelector('#stockOverviewList');
    if(!visible.length){
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = 'No stock items in this filter.';
      list.appendChild(empty);
    }
    visible.forEach(r=>{
      const status = stockStatus(r);
      const statusLabel = status === 'buy' ? 'Critical' : (status === 'refill' ? 'Refill' : 'OK');
      const row = document.createElement('div');
      row.className = 'stock-overview-row';
      row.innerHTML = `
        <div><b>${r.name}</b><small>Used ${r.used} ${r.unit || ''}</small></div>
        <div class="stock-overview-meta">Block Factory ${r.leftTruck} · Store ${r.leftStorage} ${r.unit || ''}</div>
        <span class="stock-status ${status}">${statusLabel}</span>
      `;
      list.appendChild(row);
    });
    host.querySelectorAll('[data-stock-filter]').forEach(btn=>{
      btn.onclick = ()=>{
        stockOverviewFilter = btn.dataset.stockFilter || 'all';
        renderStock();
      };
    });
  }

  function openStockOverview(){
    const modal = document.getElementById('modalStockOverview');
    if(!modal) return;
    renderStock();
    modal.classList.add('open');
  }

  function closeStockOverview(){
    const modal = document.getElementById('modalStockOverview');
    if(modal) modal.classList.remove('open');
  }

  const openStock = ()=> BK_STOCK.openEditor();
  const closeStock = ()=> BK_STOCK.closeEditor();
  const saveStock = ()=>{
    const ok = BK_STOCK.saveEditor();
    if(!ok){ infoDialog('Invalid stock values.'); return; }
    renderStock();
    infoDialog(window.BK_STOCK && BK_STOCK.remoteEnabled && BK_STOCK.remoteEnabled() ? 'Stock saved online.' : 'Stock saved locally.');
  };
  const resetStock = ()=>{
    confirmDialog('Reset stock', 'Reset stock quantities to defaults?').then(ok=>{
      if(!ok) return;
      BK_STOCK.reset();
      closeStock();
      renderStock();
    });
  };

  function openSummary(){
    const st = BK_STATE.getState();
    if(!st.slots.length){ BK_STATE.addSlot(); }
    const {slots, active, discountRate} = BK_STATE.getState();
    const s = slots[active]; const c = BK_LOGIC.computeSlot(s);
    document.getElementById('sumTitle').textContent = `Summary – ${s.name}`;
    const body = document.getElementById('sumBody');
    body.innerHTML = htmlGroupedRows(s.items) +
      `<div class="sumline"><span>Slot Subtotal</span><b>${c.subtotal} GHS</b></div>
       <div style="padding:8px 0;color:#9aa3ad;font-size:12px">
         Combos in slot: <b>${c.combos}</b> · Global Discount: ${Math.round((discountRate||0)*100)}%
       </div>`;
    document.getElementById('modalSummary').classList.add('open');
  }
  function closeSummary(){ document.getElementById('modalSummary').classList.remove('open'); }

  function receiptSectionHtml(slot){
    const c = BK_LOGIC.computeSlot(slot);
    return `<div style="margin:6px 0 10px">
      <div><b>${slot.name}</b> · <small>#${slot.orderNo || '-'}</small></div>
      ${htmlGroupedRows(slot.items)}
      <div class="sumline"><span>${slot.name} Subtotal</span><b>${c.subtotal} GHS</b></div>
    </div>`;
  }

  function openReceipt(indices){
    const {slots, discountRate} = BK_STATE.getState();
    const idxs = Array.isArray(indices)? indices : [BK_STATE.getState().active];
    let subtotal=0, combos=0;
    const sections = idxs.map(i=>{
      const s=slots[i]; const c=BK_LOGIC.computeSlot(s);
      subtotal += c.subtotal; combos += c.combos;
      return receiptSectionHtml(s);
    }).join('');
    const discount = Math.round(subtotal * (discountRate||0));
    const total = subtotal - discount;
    const html = `
      <div style="line-height:1.35">
        <div><b>BurgerKiss – Order</b></div>
        <div style="color:#9aa3ad">Combos: ${combos} · Discount: ${Math.round((discountRate||0)*100)}%</div>
        <hr style="border:0;border-top:1px solid #2a2f39;margin:8px 0">
        ${sections}
        <div class="sumline"><span>Subtotal</span><b>${subtotal} GHS</b></div>
        <div class="sumline"><span>Discount</span><b>-${discount} GHS</b></div>
        <div class="sumline"><span>Total</span><b>${total} GHS</b></div>
      </div>`;
    document.getElementById('receiptBody').innerHTML = html;
    document.getElementById('printArea').innerHTML = html;
    document.getElementById('modalReceipt').classList.add('open');
  }
  function closeReceipt(){ document.getElementById('modalReceipt').classList.remove('open'); }
  function copyReceipt(){
    const tmp=document.createElement('textarea');
    tmp.value=document.getElementById('receiptBody').innerText;
    document.body.appendChild(tmp); tmp.select(); document.execCommand('copy'); document.body.removeChild(tmp);
    infoDialog('Receipt copied.');
  }
  function shareWA(){
    const txt=document.getElementById('receiptBody').innerText;
    window.open('https://wa.me/?text='+encodeURIComponent(txt),'_blank');
  }
  function printReceipt(){ window.print(); }

  const openPrices = ()=> BK_PRICES.openEditor(false);
  const closePrices = ()=> BK_PRICES.closeEditor();
  const savePrices = ()=> BK_PRICES.save();
  const resetPrices = ()=> BK_PRICES.reset();

  // Products modal
  const openProducts = ()=> BK_PRODUCTS.openEditor();
  const closeProducts = ()=> BK_PRODUCTS.closeEditor();
  const addProductRow = ()=> BK_PRODUCTS.addRow();
  const saveProducts = ()=> BK_PRODUCTS.save();
  const resetProducts = ()=> BK_PRODUCTS.reset();

  // Menus modal
  const openMenus = ()=> BK_MENUS.openEditor();
  const closeMenus = ()=> BK_MENUS.closeEditor();
  const addMenuRow = ()=> BK_MENUS.addRow();
  const saveMenus = ()=> BK_MENUS.save();
  const resetMenus = ()=> BK_MENUS.reset();

  // Images modal
  const openImages = ()=> BK_IMAGES.openEditor();
  const closeImages = ()=> BK_IMAGES.closeEditor();
  const saveImages = ()=> BK_IMAGES.save();
  const resetImages = ()=> BK_IMAGES.reset();

  function openGroup(){
    groupSel = new Set();
    const {slots} = BK_STATE.getState();
    const body = document.getElementById('groupBody'); body.innerHTML='';
    slots.forEach((s,i)=>{
      const c = BK_LOGIC.computeSlot(s);
      const row = document.createElement('div'); row.className='row';
      row.innerHTML = `
        <span class="left">
          <input type="checkbox" onchange="BK_UI.toggleGroup(${i},this.checked)">
          <b>${s.name}</b> <small>· ${c.subtotal} GHS · ${s.pay.toUpperCase()}</small>
        </span>`;
      body.appendChild(row);
    });
    document.getElementById('modalGroup').classList.add('open');
  }
  function closeGroup(){ document.getElementById('modalGroup').classList.remove('open'); }
  function toggleGroup(i, v){ if(v) groupSel.add(i); else groupSel.delete(i); }
  function groupMakeReceipt(){
    if(groupSel.size===0){ infoDialog('Select at least one slot.'); return; }
    openReceipt([...groupSel]);
  }
  function groupMarkPaid(){
    if(groupSel.size===0){ infoDialog('Select at least one slot.'); return; }
    promptDialog('Payment mode for selected slots', 'cash').then(mode=>{
      if(mode!=='cash' && mode!=='momo'){ infoDialog('Canceled'); return; }
      const st = BK_STATE.getState();
      [...groupSel].forEach(i=> { if(st.slots[i]) st.slots[i].pay = mode; });
      BK_STATE.setState(st);
      renderPay();
      refreshTotals();
      infoDialog(`Marked ${groupSel.size} slot(s) as paid (${mode.toUpperCase()}).`);
    });
  }

  function renameActiveSlot(){
    const current = BK_STATE.renameActive();
    promptDialog('Rename slot', current || '').then(name=>{
      if(name===null) return;
      BK_STATE.setActiveName(name);
      renderSlotsBar();
      renderOrder();
      renderMake();
      renderPay();
      refreshTotals();
    });
  }

  function deleteActiveSlot(){
    const {slots, active} = BK_STATE.getState();
    if(!slots.length) return;
    confirmDialog('Delete slot', `Delete ${slots[active].name}?`).then(ok=>{
      if(!ok) return;
      BK_STATE.deleteActive();
      renderAll();
    });
  }

  function clearAllWithConfirm(){
    confirmDialog('Reset all', 'Clear all slots now? This also resets saved state.').then(ok=>{
      if(!ok) return;
      BK_STATE.clearAll();
      BK_STATE.addSlot();
      renderAll();
    });
  }

  function clearStorageWithConfirm(){
    confirmDialog('Clear storage', 'Clear saved state & price edits?').then(ok=>{
      if(!ok) return;
      BK_STATE.clearStorage();
      location.reload();
    });
  }

  function renderAll(){
    bindProductSearch();
    if(!document.querySelector('.catbar .tab.active')){
      const first = document.querySelector('.catbar .tab[data-cat="all"]');
      if(first) first.classList.add('active');
    }
    buildProducts();
    renderSlotsBar();
    renderOrder();
    renderMake();
    renderPay();
    renderIssue();
    refreshTotals();
  }

  window.BK_UI = {
    renderAll, renderOrder, renderMake, renderPay, renderIssue, refreshTotals,
    renderStock,
    openSummary, closeSummary, openHistory, closeHistory, exportHistoryJson, exportHistoryCsv, filterHistoryText, filterHistoryToday, clearHistory,
    openStockOverview, closeStockOverview,
    openReceipt, closeReceipt, copyReceipt, shareWA, printReceipt,
    openPrices, closePrices, savePrices, resetPrices,
    openProducts, closeProducts, addProductRow, saveProducts, resetProducts,
    openMenus, closeMenus, addMenuRow, saveMenus, resetMenus,
    openImages, closeImages, saveImages, resetImages,
    openStock, closeStock, saveStock, resetStock,
    openGroup, closeGroup, toggleGroup, groupMakeReceipt, groupMarkPaid,
    setCategory,
    renameActiveSlot, deleteActiveSlot, clearAllWithConfirm, clearStorageWithConfirm,
    infoDialog, confirmDialog, startNextOrder, quickStartNext, addNewOrderSlot, markIssued, goTab
  };
})();
