// UI and interactions using BK_STATE, BK_PRICES, and BK_LOGIC.
(function(){
  const PRODUCT_CATEGORIES = ['burger', 'wings', 'fries', 'salad', 'drink'];
  let currentCat = 'burger';
  let productQuery = '';
  let productPage = 0;
  let groupSel = new Set();
  const HISTORY_KEY = 'bk_order_history_v1';
  const CATEGORY_LABELS = { all:'All', burger:'Burger', wings:'Wings', fries:'Fries', salad:'Salad', extra:'Extra', drink:'Drink', sauce:'Sauce' };
  let historyFilterText = '';
  let historyFilterToday = false;
  let selectedHistoryOrderId = null;
  const QUICK_NOTES = ['No onion', 'Extra onion', 'No lettuce', 'Extra spicy'];
  const PACK_RULES_KEY = 'bk_packaging_rules_v1';
  let stockOverviewFilter = 'all';
  const FALLBACK_STANDARD_MENUS = [
    { id:'menu_cheeseburger', name:'Cheeseburger Menu', baseId:'cheeseburger', menuPrice:135, defaultFries:'fries_standard', defaultDrink:'d_cola' },
    { id:'menu_hamburger', name:'Hamburger Menu', baseId:'hamburger', menuPrice:120, defaultFries:'fries_standard', defaultDrink:'d_cola' },
    { id:'menu_double_burger', name:'Double Burger Menu', baseId:'double_burger', menuPrice:155, defaultFries:'fries_standard', defaultDrink:'d_cola' },
    { id:'menu_double_cheeseburger', name:'Double Cheeseburger Menu', baseId:'double_cheeseburger', menuPrice:170, defaultFries:'fries_standard', defaultDrink:'d_cola' },
    { id:'menu_wings_6', name:'Wings 6 Menu', baseId:'wings_6', menuPrice:65, defaultFries:'fries_standard', defaultDrink:'d_cola', defaultWingsSauce:'i_sauce_chicken_wings' },
    { id:'menu_wings_12', name:'Wings 12 Menu', baseId:'wings_12', menuPrice:110, defaultFries:'fries_standard', defaultDrink:'d_cola', defaultWingsSauce:'i_sauce_chicken_wings' }
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
      i_sauce_ketchup: { ketchup: 20 },
      i_sauce_mayonnaise: { mayonnaise: 20 },
      i_sauce_chipotle: { mayonnaise: 15, chicken_burger_sauce: 5 },
      i_sauce_dutch_special: { mayonnaise: 10, ketchup: 10, onion_diced: 5 },
      i_sauce_chicken_wings: { chicken_wings_sauce: 20 },
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

  function escapeHtml(value){
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
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

  function confirmDialog(title, message, opts){
    return new Promise(resolve=>{
      const options = opts || {};
      const cancelLabel = options.cancelLabel || 'Cancel';
      const confirmLabel = options.confirmLabel || 'Confirm';
      const host = ensureDialogHost();
      document.getElementById('appDialogTitle').textContent = title;
      document.getElementById('appDialogBody').innerHTML = `
        <div style="margin-bottom:10px">${message}</div>
        <div style="display:flex;gap:8px;justify-content:flex-end">
          <button class="x" id="dlgCancel">${cancelLabel}</button>
          <button class="x" id="dlgConfirm">${confirmLabel}</button>
        </div>
      `;
      host.classList.add('open');
      document.getElementById('dlgCancel').onclick = ()=>{ closeDialog(); resolve(false); };
      document.getElementById('dlgConfirm').onclick = ()=>{ closeDialog(); resolve(true); };
    });
  }

  function requestDiscountApproval(rate){
    const st = BK_STATE.getState();
    const slot = st.slots[st.active];
    if(!slot || !slot.items.length){
      infoDialog('Add products before requesting a discount.');
      return;
    }
    if(slot.sentToKitchen || slot.issued){
      infoDialog('Discounts can only be approved while the order is still being taken.');
      return;
    }
    const requestedRate = Math.max(0, Number(rate) || 0);
    const host = ensureDialogHost();
    document.getElementById('appDialogTitle').textContent = requestedRate ? `Owner approval: ${Math.round(requestedRate * 100)}% discount` : 'Owner approval: remove discount';
    document.getElementById('appDialogBody').innerHTML = `
      <p>The employee remains signed in. Mr Asamoah must enter the owner PIN to approve this change for Order #${escapeHtml(shortOrderNumber(slot.orderNo))}.</p>
      <label class="dialog-label">Owner PIN<input id="discountOwnerPin" class="dialog-field" type="password" inputmode="numeric" pattern="[0-9]{4,6}" maxlength="6" autocomplete="off"></label>
      <div id="discountApprovalError" class="field-error" aria-live="polite"></div>
      <div class="dialog-actions"><button class="x" id="dlgCancel" type="button">Cancel</button><button class="x modifier-primary" id="dlgConfirm" type="button">Approve</button></div>`;
    host.classList.add('open');
    const pin = document.getElementById('discountOwnerPin');
    pin.focus();
    document.getElementById('dlgCancel').onclick = closeDialog;
    document.getElementById('dlgConfirm').onclick = async ()=>{
      const button = document.getElementById('dlgConfirm');
      button.disabled = true;
      const approval = window.BK_ACCESS && BK_ACCESS.authorizeOwnerPin
        ? await BK_ACCESS.authorizeOwnerPin(pin.value)
        : null;
      if(!approval){
        document.getElementById('discountApprovalError').textContent = 'Owner PIN incorrect. Discount was not changed.';
        button.disabled = false;
        pin.select();
        return;
      }
      BK_STATE.setDiscount(requestedRate, approval);
      closeDialog();
      renderOrder();
      renderPay();
      refreshTotals();
    };
  }

  function handoverChecklistDialog(title, message){
    return new Promise(resolve=>{
      const host = ensureDialogHost();
      document.getElementById('appDialogTitle').textContent = title;
      document.getElementById('appDialogBody').innerHTML = `
        <div class="handover-checklist-dialog">
          ${message}
          <div class="handover-check-progress" id="handoverCheckProgress" role="status" aria-live="polite"></div>
          <div class="handover-check-actions">
            <button class="x" id="dlgCancel" type="button">Cancel</button>
            <button class="x modifier-primary" id="dlgConfirm" type="button" disabled>Confirm handover</button>
          </div>
        </div>
      `;
      host.classList.add('open');
      const checks = Array.from(host.querySelectorAll('[data-handover-check]'));
      const confirm = document.getElementById('dlgConfirm');
      const progress = document.getElementById('handoverCheckProgress');
      const update = ()=>{
        const complete = checks.filter(input=>input.checked).length;
        const total = checks.length;
        progress.textContent = `${complete} of ${total} required checks confirmed`;
        progress.classList.toggle('complete', total > 0 && complete === total);
        confirm.disabled = total === 0 || complete !== total;
      };
      checks.forEach(input=>input.addEventListener('change', update));
      update();
      document.getElementById('dlgCancel').onclick = ()=>{ closeDialog(); resolve(false); };
      confirm.onclick = ()=>{
        if(confirm.disabled) return;
        closeDialog();
        resolve(true);
      };
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

  function productsPerPage(){
    if(window.innerWidth <= 700) return window.innerHeight <= 560 ? 6 : 4;
    if(window.innerWidth <= 1180) return 6;
    return 8;
  }

  function updateProductPager(totalItems, pageCount){
    const categoryTitle = document.getElementById('productCategoryTitle');
    const pageStatus = document.getElementById('productPageStatus');
    const dots = document.getElementById('productPageDots');
    const previous = document.getElementById('previousProductPage');
    const next = document.getElementById('nextProductPage');
    const controls = document.querySelector('.product-page-controls');
    if(categoryTitle) categoryTitle.textContent = CATEGORY_LABELS[currentCat] || currentCat;
    if(pageStatus) pageStatus.textContent = totalItems ? `${productPage + 1} / ${pageCount} · ${totalItems} products` : 'No products';
    if(previous) previous.disabled = productPage <= 0;
    if(next) next.disabled = productPage >= pageCount - 1;
    if(controls) controls.classList.toggle('single-page', pageCount <= 1);
    if(dots){
      dots.innerHTML = '';
      for(let index = 0; index < pageCount; index += 1){
        const dot = document.createElement('span');
        dot.className = index === productPage ? 'active' : '';
        dots.appendChild(dot);
      }
    }
  }

  function buildProducts(){
    const grid = document.getElementById('buttons');
    if(!grid) return;
    grid.innerHTML = '';
    const base = (Array.isArray(BK_DATA.BASE) && BK_DATA.BASE.length) ? BK_DATA.BASE : (BK_DATA.DEFAULT_BASE || []);
    if(base !== BK_DATA.BASE) BK_DATA.BASE = base;
    const query = productQuery.trim().toLowerCase();
    const isFrontProduct = it => it && it.active !== false && it.cat !== 'extra' && !String(it.id || '').startsWith('x_sauce_');
    const items = base.filter(isFrontProduct)
      .filter(it => it.cat === currentCat)
      .filter(it => query ? [it.name, it.searchText, it.baseName, it.subtitle].filter(Boolean).join(' ').toLowerCase().includes(query) : true)
      .sort((a,b)=>Number(a.categoryOrder || 0) - Number(b.categoryOrder || 0));
    const pageSize = productsPerPage();
    const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
    productPage = Math.min(productPage, pageCount - 1);
    updateProductPager(items.length, pageCount);
    if(!items.length){
      const empty = document.createElement('div');
      empty.className = 'empty-state product-empty';
      empty.innerHTML = `<strong>No products found</strong><span>Try another category or clear the search.</span>`;
      empty.style.gridColumn = '1 / -1';
      grid.appendChild(empty);
      return;
    }
    items.slice(productPage * pageSize, (productPage + 1) * pageSize).forEach(it=>{
      const b = document.createElement('button');
      b.className = 'item';
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
                       <span class="badge">+1</span>
                     </div>`;
      b.onclick = ()=> addProductWithFlow(it);
      grid.appendChild(b);
    });
  }


  function openModifierSheet(title, sections, opts){
    const host = ensureDialogHost();
    const settings = opts || {};
    const showNote = Object.prototype.hasOwnProperty.call(settings, 'note');
    const cancelLabel = settings.cancelLabel || 'Skip add-ons';
    const confirmLabel = settings.confirmLabel || 'Add selected';
    const initialValues = settings.initialValues || {};
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
          const initialQty = initialValues[section.name] && Object.prototype.hasOwnProperty.call(initialValues[section.name], opt.value)
            ? initialValues[section.name][opt.value]
            : 0;
          qty.value = String(Math.max(0, Number(initialQty) || 0));
          qty.textContent = qty.value;
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
          const hasInitial = Object.prototype.hasOwnProperty.call(initialValues, section.name);
          const initial = initialValues[section.name];
          input.checked = hasInitial
            ? (section.type === 'radio' ? input.value === initial : Array.isArray(initial) && initial.includes(input.value))
            : (!!opt.checked || (section.type === 'radio' && idx === 0 && !section.options.some(o=>o.checked)));
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

  function addQuantities(picks, note, meta){
    (picks || []).forEach(pick=>{
      const qty = Math.max(0, Number(pick.qty) || 0);
      if(!pick.value) return;
      for(let i=0; i<qty; i++) BK_STATE.addItem(pick.value, note || '', meta);
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
    return (BK_DATA.BASE || []).find(x=>x.id===id) || (BK_DATA.DEFAULT_BASE || []).find(x=>x.id===id) || null;
  }

  function optionLabel(id, fallback){
    const p = productById(id);
    if(!p) return fallback || id;
    return `${p.name} (${BK_PRICES.getPrice(id)} GHS)`;
  }

  function itemDisplayPrice(item){
    return BK_PRICES.getPrice(item && item.id);
  }

  function getStandardMenuPresets(){
    if(window.BK_MENUS && typeof BK_MENUS.getMenus === 'function') return BK_MENUS.getMenus();
    return FALLBACK_STANDARD_MENUS;
  }

  function standardMenuPresetFor(baseId){
    return getStandardMenuPresets().find(menu=>menu.baseId === baseId) || {};
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

  function includedSauceOptions(){
    return [
      {label:'No Sauce Wanted', value:''},
      {label:'Ketchup', value:'i_sauce_ketchup'},
      {label:'Mayonnaise', value:'i_sauce_mayonnaise'},
      {label:'Chipotle', value:'i_sauce_chipotle'},
      {label:'Dutch Special', value:'i_sauce_dutch_special'},
      {label:'Chicken Wings Sauce', value:'i_sauce_chicken_wings'}
    ];
  }

  function paidSauceOptions(){
    return [
      {label:'Extra Ketchup', value:'x_sauce_ketchup'},
      {label:'Extra Mayonnaise', value:'x_sauce_mayonnaise'},
      {label:'Extra Chipotle', value:'x_sauce_chipotle'},
      {label:'Extra Dutch Special', value:'x_sauce_dutch_special'},
      {label:'Extra Chicken Wings Sauce', value:'x_sauce_chicken_wings'}
    ];
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

  function addBurgerExtras(product, picked, meta){
    BK_STATE.addItem(product.id, picked.itemNote, meta);
    const addonNote = modifierLinkNote('for', product.name, picked.itemNote);
    addQuantities(picked.burgerExtras, addonNote, meta && Object.assign({}, meta, {menuRole:'addon'}));
    addQuantities(picked.eggExtras, addonNote, meta && Object.assign({}, meta, {menuRole:'addon'}));
  }

  function addWingsExtras(product, picked, meta){
    BK_STATE.addItem(product.id, picked.itemNote, meta);
    if(picked.wingsSauce) BK_STATE.addItem(picked.wingsSauce, modifierLinkNote('included', product.name, picked.itemNote), meta && Object.assign({}, meta, {menuRole:'sauce'}));
    addQuantities(picked.extraSauce, modifierLinkNote('extra', product.name, picked.itemNote), meta && Object.assign({}, meta, {menuRole:'sauce'}));
  }

  function menuModifierSections(product, preset, initial){
    const menuPreset = preset || standardMenuPresetFor(product.id);
    const selected = initial || {};
    const defaultFries = selected.menuFries || menuPreset.defaultFries || 'fries_standard';
    const defaultDrink = selected.menuDrink || menuPreset.defaultDrink || 'd_cola';
    const defaultFriesSauce = Object.prototype.hasOwnProperty.call(selected, 'menuFriesSauce') ? selected.menuFriesSauce : 'i_sauce_ketchup';
    const configuredWingsSauce = Object.prototype.hasOwnProperty.call(menuPreset, 'defaultWingsSauce') ? menuPreset.defaultWingsSauce : 'i_sauce_chicken_wings';
    const defaultWingsSauce = Object.prototype.hasOwnProperty.call(selected, 'wingsSauce') ? selected.wingsSauce : String(configuredWingsSauce || '').replace(/^x_sauce_/, 'i_sauce_');
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
      { title:'Menu fries sauce', name:'menuFriesSauce', type:'radio', help:'Choose the included menu sauce. Ketchup is selected unless the customer asks for another sauce or no sauce.', options:includedSauceOptions().map(option=>Object.assign({}, option, {checked:option.value === defaultFriesSauce})) },
      { title:'Menu drink', name:'menuDrink', type:'radio', help:'Choose the drink for this menu.', options:drinkOptions }
    ];
    if(isBurgerBase(product)) sections.push(...burgerExtraSections(product));
    if(isWingsBase(product)) sections.push({ title:'Included sauce', name:'wingsSauce', type:'radio', help:'Choose one included sauce for the wings.', options:[
      {label:'No Sauce Wanted', value:'', checked: defaultWingsSauce === ''},
      {label:'Chicken Wings Sauce', value:'i_sauce_chicken_wings', checked: defaultWingsSauce === 'i_sauce_chicken_wings'},
      {label:'Chipotle', value:'i_sauce_chipotle', checked: defaultWingsSauce === 'i_sauce_chipotle'}
    ]});
    sections.push({ title:'Paid extra sauces (+5 GHS each)', name:'extraSauce', type:'quantity', help:'Use + / − to add paid extra sauces.', options:paidSauceOptions() });
    return sections;
  }

  function expandQuantityItems(picks, note, meta){
    const rows = [];
    (picks || []).forEach(pick=>{
      const qty = Math.max(0, Number(pick.qty) || 0);
      for(let i=0; i<qty; i++) rows.push(Object.assign({itemId:pick.value, note}, meta || {}));
    });
    return rows;
  }

  function guidedMenuItems(product, picked, menuGroupId, menuName){
    const baseMeta = {menuGroupId, menuName, menuRole:'main', menuNoSauce:!picked.menuFriesSauce && !picked.wingsSauce};
    const rows = [Object.assign({itemId:product.id, note:picked.itemNote || ''}, baseMeta)];
    const menuNote = modifierLinkNote('menu', product.name, picked.itemNote);
    const addonNote = modifierLinkNote('for', product.name, picked.itemNote);
    if(isBurgerBase(product)){
      rows.push(...expandQuantityItems(picked.burgerExtras, addonNote, {menuGroupId, menuName, menuRole:'addon'}));
      rows.push(...expandQuantityItems(picked.eggExtras, addonNote, {menuGroupId, menuName, menuRole:'addon'}));
    }
    if(isWingsBase(product) && picked.wingsSauce) rows.push({itemId:picked.wingsSauce, note:modifierLinkNote('included', product.name, picked.itemNote), menuGroupId, menuName, menuRole:'sauce'});
    if(picked.menuFries) rows.push({itemId:picked.menuFries, note:menuNote, menuGroupId, menuName, menuRole:'fries'});
    if(picked.menuFriesSauce) rows.push({itemId:picked.menuFriesSauce, note:menuNote, menuGroupId, menuName, menuRole:'included-sauce'});
    if(picked.menuDrink) rows.push({itemId:picked.menuDrink, note:menuNote, menuGroupId, menuName, menuRole:'drink'});
    if(!isWingsBase(product)) rows.push(...expandQuantityItems(picked.extraSauce, modifierLinkNote('extra', product.name, picked.itemNote), {menuGroupId, menuName, menuRole:'extra-sauce'}));
    return rows;
  }

  function addGuidedMenuItems(product, picked, menuGroupId, menuName){
    guidedMenuItems(product, picked, menuGroupId, menuName).forEach(row=>{
      BK_STATE.addItem(row.itemId, row.note, row);
    });
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
        { title:'Included sauce', name:'includedSauce', type:'radio', help:'Choose one free sauce for this fries item.', options:includedSauceOptions() },
        { title:'Paid extra sauces (+5 GHS each)', name:'extraSauce', type:'quantity', help:'Use + / − to add several paid extra sauces.', options:paidSauceOptions() }
      ], { note: pendingNote });
      BK_STATE.addItem(product.id, picked.itemNote);
      if(picked.includedSauce) BK_STATE.addItem(picked.includedSauce, modifierLinkNote('included', product.name, picked.itemNote));
      addQuantities(picked.extraSauce, modifierLinkNote('extra', product.name, picked.itemNote));
    }else if(isBurgerBase(product)){
      const picked = await openModifierSheet(`${product.name} add-ons`, burgerExtraSections(product), { note: pendingNote });
      addBurgerExtras(product, picked);
    }else if(isWingsBase(product)){
      const picked = await openModifierSheet(`${product.name} sauce`, [
        { title:'Included sauce', name:'wingsSauce', type:'radio', help:'Choose one included sauce for the wings.', options:[
          {label:'No Sauce Wanted', value:''},
          {label:'Chicken Wings Sauce', value:'i_sauce_chicken_wings'},
          {label:'Chipotle', value:'i_sauce_chipotle'}
        ]},
        { title:'Paid extra sauces (+5 GHS each)', name:'extraSauce', type:'quantity', help:'Use + / − to add paid extra sauces.', options:paidSauceOptions() }
      ], { note: pendingNote });
      addWingsExtras(product, picked);
    }else{
      BK_STATE.addItem(product.id, pendingNote);
    }
    return true;
  }

  async function addGuidedMenu(product, pendingNote, preset){
    const menuPreset = preset || standardMenuPresetFor(product.id);
    const picked = await openModifierSheet(menuPreset.name || `${product.name} guided menu`, menuModifierSections(product, menuPreset), {
      note: pendingNote,
      cancelLabel: 'Cancel menu',
      confirmLabel: 'Add menu',
      cancelValue: null
    });
    if(!picked) return false;

    const menuGroupId = `menu-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
    const menuName = menuPreset.name || `${product.name} Menu`;
    addGuidedMenuItems(product, picked, menuGroupId, menuName);
    return true;
  }



  async function addProductWithFlow(product){
    const accessState = BK_STATE.getState();
    const accessSlot = accessState.slots[accessState.active];
    if(window.BK_ACCESS && !BK_ACCESS.guardNewSale(accessSlot)) return;
    if(accessSlot && !accessSlot.createdBy && window.BK_ACCESS && BK_ACCESS.current()){
      const activeAccess = BK_ACCESS.current();
      BK_STATE.updateSlot(accessState.active, { createdBy:BK_ACCESS.operationalActor ? BK_ACCESS.operationalActor() : BK_ACCESS.actor(), businessDate:activeAccess.businessDate, shiftId:activeAccess.shiftId });
    }
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
    renderSlotsBar();
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
      productPage = 0;
      buildProducts();
    };

    input.addEventListener('input', rerender);
    clearBtn?.addEventListener('click', ()=>{
      input.value = '';
      productQuery = '';
      productPage = 0;
      buildProducts();
      input.focus();
    });
    input.dataset.bound = '1';
  }

  function setCategory(cat){
    currentCat = PRODUCT_CATEGORIES.includes(cat) ? cat : 'burger';
    productPage = 0;
    goTab('order');
    document.querySelectorAll('.catbar .tab').forEach(btn=>{
      btn.classList.toggle('active', btn.dataset.cat===currentCat);
    });
    buildProducts();
  }

  function bindCompactOrderNavigation(){
    const pager = document.getElementById('productPager');
    if(!pager || pager.dataset.bound === '1') return;
    const moveCategory = direction=>{
      const currentIndex = PRODUCT_CATEGORIES.indexOf(currentCat);
      const nextIndex = (currentIndex + direction + PRODUCT_CATEGORIES.length) % PRODUCT_CATEGORIES.length;
      setCategory(PRODUCT_CATEGORIES[nextIndex]);
    };
    document.getElementById('previousCategory')?.addEventListener('click', ()=> moveCategory(-1));
    document.getElementById('nextCategory')?.addEventListener('click', ()=> moveCategory(1));
    document.getElementById('previousProductPage')?.addEventListener('click', ()=>{
      if(productPage <= 0) return;
      productPage -= 1;
      buildProducts();
    });
    document.getElementById('nextProductPage')?.addEventListener('click', ()=>{
      productPage += 1;
      buildProducts();
    });
    const cart = document.getElementById('orderCart');
    const cartToggle = document.getElementById('mobileCartToggle');
    const closeCart = ()=>{
      cart?.classList.remove('mobile-open');
      document.body.classList.remove('cart-drawer-open');
      cartToggle?.setAttribute('aria-expanded', 'false');
    };
    cartToggle?.addEventListener('click', ()=>{
      cart?.classList.add('mobile-open');
      document.body.classList.add('cart-drawer-open');
      cartToggle.setAttribute('aria-expanded', 'true');
    });
    document.getElementById('mobileCartClose')?.addEventListener('click', closeCart);
    let touchStartX = 0;
    pager.addEventListener('touchstart', event=>{ touchStartX = event.changedTouches[0].clientX; }, {passive:true});
    pager.addEventListener('touchend', event=>{
      const distance = event.changedTouches[0].clientX - touchStartX;
      if(Math.abs(distance) < 70) return;
      moveCategory(distance < 0 ? 1 : -1);
    }, {passive:true});
    window.addEventListener('resize', ()=> buildProducts());
    pager.dataset.bound = '1';
  }

  function slotStatus(slot){
    const progress = kitchenProgress(slot);
    const progressText = `${progress.complete}/${progress.total} prepared`;
    if(slot.voided) return { state:'voided', label:'Voided', detail:'Order cancelled and retained for audit', shortDetail:'Voided' };
    if(slot.issued) return { state:'issued', label:'Issued', detail:'Handover completed', shortDetail:progressText };
    if(progress.total === 0) return { state:'draft', label:'New', detail:'No products added yet', shortDetail:'Empty' };
    if(!slot.sentToKitchen) return { state:'draft', label:'In progress', detail:'Products are still being selected', shortDetail:`${progress.total} item${progress.total === 1 ? '' : 's'}` };
    if(progress.complete === progress.total && slot.pay === 'unpaid') return { state:'payment', label:'Payment due', detail:`Kitchen complete · ${progressText}`, shortDetail:progressText };
    if(progress.complete === progress.total) return { state:'ready', label:'Ready', detail:`Paid · ${progressText}`, shortDetail:progressText };
    return { state:'kitchen', label:'Kitchen', detail:progressText, shortDetail:progressText };
  }

  function renderSlotsBar(){
    const {slots, active} = BK_STATE.getState();
    const bar = document.getElementById('slotsBar');
    if(!bar) return;
    bar.querySelectorAll('.slot-chip').forEach(n=>n.remove());

    const controlIds = ['btnAddSlot', 'btnOnlineOrder'];
    const ctl = controlIds
      .map(id => document.getElementById(id))
      .filter(Boolean)
      .filter(el => el.parentElement === bar);
    ctl.forEach(c=>bar.removeChild(c));
    slots.forEach((s,i)=>{
      const el = document.createElement('button');
      const status = slotStatus(s);
      el.type = 'button';
      el.className='chip slot-chip status-' + status.state + (i===active?' active':'');
      el.setAttribute('aria-label', `${s.name}, order ${s.orderNo || 'not assigned'}, ${status.label}, ${status.detail}`);
      if(i === active) el.setAttribute('aria-current', 'true');
      el.title = `${status.label} · ${status.detail}`;
      const orderLabel = isOnlineOrder(s) ? platformLabel(s.orderSource).toUpperCase() : `Order #${shortOrderNumber(s.orderNo)}`;
      const orderDetail = isOnlineOrder(s) ? escapeHtml(s.externalOrderNo || shortOrderNumber(s.orderNo)) : 'Walk-in';
      el.innerHTML = `<span class="status-dot" aria-hidden="true"></span><span class="slot-chip-order"><b>${orderLabel}</b><small>${orderDetail}</small></span><span class="slot-chip-status">${status.label}</span><span class="slot-chip-progress">${status.shortDetail}</span>`;
      el.onclick = ()=> focusSlot(i, currentWorkflowTab());
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

  function linkedGroupKey(productName, note, menuGroupId){
    return `${String(productName || '').trim()}|${baseCustomerNote(note)}|${menuGroupId || ''}`;
  }

  function groupedCartRows(items){
    const groups = [];
    const linkedChildren = [];
    const parentByKey = new Map();
    const parentsByName = new Map();
    const standalone = [];

    BK_LOGIC.groupedLines(items).forEach(line=>{
      const sourceItem = (items || []).find(item=>
        item.itemId === line.id
        && (item.note || '') === (line.note || '')
        && (item.menuGroupId || '') === (line.menuGroupId || '')
      );
      const enrichedLine = Object.assign({}, line, {
        menuName:sourceItem && sourceItem.menuName ? sourceItem.menuName : '',
        menuRole:sourceItem && sourceItem.menuRole ? sourceItem.menuRole : ''
      });
      const linked = parseLinkedModifierNote(line.note);
      if(linked){
        linkedChildren.push(Object.assign(enrichedLine, { linked }));
        return;
      }

      const prod = productById(line.id);
      const isModifierProduct = prod && (prod.cat === 'extra' || String(prod.id || '').startsWith('x_sauce_'));
      if(isModifierProduct){
        standalone.push(enrichedLine);
        return;
      }

      const menuMain = (items || []).find(item=>item.menuGroupId && item.menuGroupId === line.menuGroupId && item.menuRole === 'main');
      const group = Object.assign({}, enrichedLine, { children: [], menuName:menuMain && menuMain.menuName ? menuMain.menuName : enrichedLine.menuName });
      const groupKey = linkedGroupKey(line.name, line.note, line.menuGroupId);
      groups.push(group);
      parentByKey.set(groupKey, group);
      const nameKey = String(line.name || '').trim().toLowerCase();
      if(!parentsByName.has(nameKey)) parentsByName.set(nameKey, []);
      parentsByName.get(nameKey).push(group);
    });

    linkedChildren.forEach(child=>{
      const linked = child.linked;
      const exactParent = parentByKey.get(linkedGroupKey(linked.productName, linked.itemNote, child.menuGroupId));
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

  function entryProduct(entry){
    const [id] = BK_LOGIC.parseItemKey(entry.key);
    return productById(id);
  }

  function currentMenuSelection(slot, menuGroupId, product){
    const selection = { burgerExtras:{}, eggExtras:{}, extraSauce:{} };
    const groupItems = (slot.items || []).filter(item=>item.menuGroupId === menuGroupId);
    const main = groupItems.find(item=>item.menuRole === 'main') || groupItems.find(item=>item.itemId === product.id) || {};
    selection.itemNote = baseCustomerNote(main.note || '');
    if(main.menuNoSauce) selection.menuFriesSauce = '';
    groupItems.forEach(item=>{
      if(item.menuRole === 'fries') selection.menuFries = item.itemId;
      else if(item.menuRole === 'drink') selection.menuDrink = item.itemId;
      else if(item.menuRole === 'included-sauce') selection.menuFriesSauce = item.itemId;
      else if(item.menuRole === 'sauce') selection.wingsSauce = item.itemId;
      else if(item.menuRole === 'extra-sauce') selection.extraSauce[item.itemId] = (selection.extraSauce[item.itemId] || 0) + 1;
      else if(item.menuRole === 'addon'){
        const bucket = String(item.itemId || '').includes('egg') ? selection.eggExtras : selection.burgerExtras;
        bucket[item.itemId] = (bucket[item.itemId] || 0) + 1;
      }
    });
    return selection;
  }

  async function editMenuEntry(slot, entry){
    if(!slot || slot.issued || !entry || !entry.menuGroupId) return false;
    const product = entryProduct(entry);
    if(!product || !isMealBase(product)) return false;
    const initial = currentMenuSelection(slot, entry.menuGroupId, product);
    const picked = await openModifierSheet(`Edit ${entry.menuName || product.name + ' Menu'}`, menuModifierSections(product, null, initial), {
      note: initial.itemNote || '',
      initialValues: initial,
      cancelLabel: 'Keep current menu',
      confirmLabel: 'Update menu',
      cancelValue: null
    });
    if(!picked) return false;
    const nextItems = guidedMenuItems(product, picked, entry.menuGroupId, entry.menuName || `${product.name} Menu`);
    const updated = BK_STATE.replaceMenuGroup(entry.menuGroupId, nextItems);
    if(updated){
      renderSlotsBar();
      renderOrder();
      renderMake();
      renderIssue();
      refreshTotals();
    }
    return updated;
  }

  function adjustCartChild(slot, child, direction, refresh){
    if(!slot || slot.issued || !child) return;
    if(direction > 0) BK_STATE.addItemForKey(child.key);
    else BK_STATE.decItemForKey(child.key);
    refresh();
  }

  function groupedEntryDone(slot, entry){
    const keys = [entry.key, ...(entry.children || []).map(child=>child.key)];
    return keys.every(key=>{
      const [id, note='', menuGroupId=''] = BK_LOGIC.parseItemKey(key);
      return slot.items
        .filter(it=> it.itemId===id && (it.note||'')===note && (!menuGroupId || (it.menuGroupId||'')===menuGroupId))
        .every(it=>!!it.done);
    });
  }

  function setGroupedEntryDone(entry, done){
    BK_STATE.setDoneForKey(entry.key, done);
    (entry.children || []).forEach(child=> BK_STATE.setDoneForKey(child.key, done));
  }

  const EMERGENCY_NOTE_CHIPS = ['No onion', 'No lettuce', 'No tomato', 'No mayo', 'No cheese', 'Sauce on side', 'Extra spicy', 'Customer changed request'];

  function kitchenNoteTarget(entry){
    if(entry && entry.menuGroupId) return {targetType:'menuGroup', targetId:entry.menuGroupId};
    return {targetType:'item', targetId:entry ? entry.key : ''};
  }

  function kitchenAmendmentsFor(slot, entry){
    const target = kitchenNoteTarget(entry);
    return (slot && Array.isArray(slot.amendments) ? slot.amendments : []).filter(note=>
      note.targetType === target.targetType && note.targetId === target.targetId
    );
  }

  function renderKitchenAmendments(host, slot, entry){
    kitchenAmendmentsFor(slot, entry).forEach(note=>{
      const row = document.createElement('div');
      row.className = `kitchen-amendment ${note.status === 'seen' ? 'seen' : 'new'}`;
      const time = note.createdAt ? new Date(note.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '';
      row.innerHTML = `<strong>⚠ Emergency note${time ? ` · ${escapeHtml(time)}` : ''}</strong><span>${escapeHtml(note.text)}</span>`;
      host.appendChild(row);
    });
  }

  function openKitchenNoteDialog(slotIndex, entry, displayTitle){
    const slot = BK_STATE.getState().slots[slotIndex];
    if(!slot || slot.issued || !slot.sentToKitchen) return;
    const host = ensureDialogHost();
    document.getElementById('appDialogTitle').textContent = 'Emergency kitchen note';
    document.getElementById('appDialogBody').innerHTML = `
      <p>This note will be shown on the kitchen screen. It does not change the original order.</p>
      <p><strong>${escapeHtml(displayTitle || entry.name || 'Order item')}</strong></p>
      <div class="modifier-quick kitchen-note-chips" aria-label="Emergency note shortcuts">
        ${EMERGENCY_NOTE_CHIPS.map(note=>`<button class="chip kitchen-note-chip" type="button" data-note="${escapeHtml(note)}">${escapeHtml(note)}</button>`).join('')}
      </div>
      <label class="modifier-note">
        <span>Kitchen note</span>
        <textarea id="kitchenEmergencyNote" rows="3" placeholder="e.g. no onion, sauce on side"></textarea>
      </label>
      <div class="field-error" id="kitchenEmergencyError"></div>
      <div class="modifier-actions"><button class="x" id="dlgCancel" type="button">Cancel</button><button class="x modifier-primary" id="dlgConfirm" type="button">Send note</button></div>
    `;
    host.classList.add('open');
    const noteBox = document.getElementById('kitchenEmergencyNote');
    document.querySelectorAll('.kitchen-note-chip').forEach(btn=>{
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
    document.getElementById('dlgCancel').onclick = closeDialog;
    document.getElementById('dlgConfirm').onclick = ()=>{
      const text = noteBox.value.trim();
      if(!text){ document.getElementById('kitchenEmergencyError').textContent = 'Enter a note before sending.'; return; }
      const target = kitchenNoteTarget(entry);
      const saved = BK_STATE.addKitchenAmendment(slotIndex, Object.assign({}, target, {title:displayTitle || entry.name || '', text}));
      if(!saved){ document.getElementById('kitchenEmergencyError').textContent = 'This order can no longer receive kitchen notes.'; return; }
      closeDialog();
      renderMake();
      renderIssue();
    };
    noteBox.focus();
  }

  function groupedEntryText(entry){
    const parent = `${entry.qty}x ${entry.name}${entry.note ? ` (${entry.note})` : ''}`;
    const children = (entry.children || []).map(child=>`↳ ${child.qty}x ${child.name}${child.note ? ` (${child.note})` : ''}`);
    return [parent, ...children].join(' · ');
  }

  function splitEntryNoteLines(note){
    const txt = String(note || '').trim();
    if(!txt) return [];
    const addOnMatch = txt.match(/^(.*?)(?:\s*·\s*)?Add-ons:\s*(.+)$/i);
    if(!addOnMatch) return [txt];
    const prefix = (addOnMatch[1] || '').trim();
    const addOnItems = String(addOnMatch[2] || '')
      .split(',')
      .map(x=>x.trim())
      .filter(Boolean)
      .map(x=>`+ ${x}`);
    return [prefix, ...addOnItems].filter(Boolean);
  }

  function appendGroupedEntry(host, slot, entry, slotIndex, opts){
    const settings = opts || {};
    const showPrices = settings.showPrices !== false;
    const row = document.createElement('div');
    row.className = `${settings.compact ? 'grouped-meal compact' : 'grouped-meal'}${settings.kitchen ? ' kitchen-entry' : ''}`;

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
    title.textContent = settings.displayTitle || `${entry.qty}x ${entry.name}`;
    titleWrap.appendChild(title);
    staffFacingNote(entry.note).forEach((line, idx)=>{
      const note = document.createElement('small');
      note.textContent = idx === 0 ? line : `↳ ${line}`;
      titleWrap.appendChild(note);
    });
    header.appendChild(titleWrap);

    if(showPrices){
      const price = document.createElement('span');
      price.className = 'grouped-meal-price';
      price.textContent = `${groupedEntryTotal(entry)} GHS`;
      header.appendChild(price);
    }
    if(settings.kitchen && slot && slot.sentToKitchen && !slot.issued){
      const noteButton = document.createElement('button');
      noteButton.type = 'button';
      noteButton.className = 'mini emergency-note-button';
      noteButton.textContent = 'Note';
      noteButton.setAttribute('aria-label', `Add emergency kitchen note for ${settings.displayTitle || entry.name}`);
      noteButton.onclick = ()=> openKitchenNoteDialog(slotIndex, entry, settings.displayTitle || entry.name);
      header.appendChild(noteButton);
    }
    row.appendChild(header);

    (entry.children || []).forEach(child=>{
      const childLine = document.createElement('div');
      childLine.className = 'grouped-meal-child';
      const linkedKind = child.linked && child.linked.prefix;
      const childRole = child.menuRole || (linkedKind === 'menu' || linkedKind === 'included' ? 'included-sauce' : (linkedKind === 'extra' ? 'extra-sauce' : ''));
      const childName = staffFacingItemName({name:child.name, role:childRole});
      const childNote = staffFacingNote(child.note);
      childLine.textContent = `↳ ${child.qty}x ${childName}${childNote.length ? ` · ${childNote[0]}` : ''}${showPrices ? ` · ${child.total} GHS` : ''}`;
      row.appendChild(childLine);
      childNote.slice(1).forEach(line=>{
        const extraLine = document.createElement('div');
        extraLine.className = 'grouped-meal-child';
        extraLine.textContent = `   ↳ ${line}`;
        row.appendChild(extraLine);
      });
    });
    if(settings.kitchen) renderKitchenAmendments(row, slot, entry);

    host.appendChild(row);
    return row;
  }

  function packagingLabel(slot){
    if(!slot || !slot.packAsked) return 'Packing not confirmed';
    const drinks = slot.drinkPackMode === 'by-customer' ? 'drinks by customer' : 'drinks together where possible';
    return `Menu bags stay separate · ${drinks}`;
  }

  function choosePackaging(slotIndex){
    return packingAssignmentDialog(slotIndex);
  }

  function packagingControl(slot, slotIndex, compact){
    const wrap = document.createElement('div');
    wrap.className = `packaging-control${compact ? ' compact' : ''}`;
    const label = document.createElement('span');
    label.className = `packaging-status ${slot.packMode === 'split' ? 'split' : 'shared'}`;
    label.textContent = packagingLabel(slot);
    wrap.appendChild(label);
    if(!slot.issued){
      const change = document.createElement('button');
      change.type = 'button';
      change.className = 'mini packaging-change';
      change.textContent = 'Change';
      change.onclick = ()=> choosePackaging(slotIndex);
      wrap.appendChild(change);
    }
    return wrap;
  }

  function renderOrder(){
    const {slots, active, discountRate} = BK_STATE.getState();
    const lines = document.getElementById('lines'); lines.innerHTML='';
    const orderMeta = document.getElementById('currentOrderMeta');
    if(!slots.length){
      setSlotTotals(0,0,0);
      if(orderMeta) orderMeta.textContent = 'New order';
      const mobileCount = document.getElementById('mobileCartCount');
      if(mobileCount) mobileCount.textContent = '0 items';
      return;
    }
    const s = slots[active];
    if(orderMeta) orderMeta.textContent = `Order #${shortOrderNumber(s.orderNo)} · ${orderChannelText(s)}`;
    const itemCount = (s.items || []).reduce((total, item)=> total + (Number(item.qty) || 0), 0);
    const mobileCount = document.getElementById('mobileCartCount');
    if(mobileCount) mobileCount.textContent = `${itemCount} ${itemCount === 1 ? 'item' : 'items'}`;
    const entries = groupedCartRows(s.items);
    if(entries.length===0){
      const row = document.createElement('div');
      row.className = 'empty-state';
      row.textContent = 'No items yet. Select products to start this order.';
      lines.appendChild(row);
    }
    const refreshOrderViews = ()=>{
      renderSlotsBar();
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
      if(isMenuGroup && !s.issued){
        detail.classList.add('cart-detail-editable');
        detail.title = 'Edit this menu';
        detail.onclick = ()=> editMenuEntry(s, entry);
      }
      const title = document.createElement('b');
      title.textContent = entry.menuGroupId && entry.menuName ? entry.menuName : (prod ? prod.name : id);
      const meta = document.createElement('small');
      const visibleNotes = staffFacingNote(note);
      meta.textContent = `× ${entry.qty}${visibleNotes.length ? ` · ${visibleNotes.join(' · ')}` : ''}`;
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
        const childName = staffFacingItemName({name:child.name, role:child.menuRole || (child.linked && child.linked.prefix === 'extra' ? 'extra-sauce' : '')});
        const childText = document.createElement('span');
        childText.textContent = `↳ ${childName} × ${child.qty}${child.total ? ` · ${child.total} GHS` : ''}`;
        childLine.appendChild(childText);
        const canEditChild = !s.issued && child.menuRole && !['fries','drink','included-sauce','sauce'].includes(child.menuRole);
        if(canEditChild){
          const childActions = document.createElement('span');
          childActions.className = 'cart-child-actions';
          const childMinus = document.createElement('button');
          childMinus.type = 'button';
          childMinus.className = 'mini';
          childMinus.textContent = '−';
          childMinus.setAttribute('aria-label', `Remove one ${childName}`);
          childMinus.onclick = event=>{ event.stopPropagation(); adjustCartChild(s, child, -1, refreshOrderViews); };
          const childPlus = document.createElement('button');
          childPlus.type = 'button';
          childPlus.className = 'mini';
          childPlus.textContent = '+';
          childPlus.setAttribute('aria-label', `Add one ${childName}`);
          childPlus.onclick = event=>{ event.stopPropagation(); adjustCartChild(s, child, 1, refreshOrderViews); };
          const childRemove = document.createElement('button');
          childRemove.type = 'button';
          childRemove.className = 'mini';
          childRemove.textContent = 'Remove';
          childRemove.onclick = event=>{ event.stopPropagation(); BK_STATE.removeItemForKey(child.key); refreshOrderViews(); };
          childActions.append(childMinus, childPlus, childRemove);
          childLine.appendChild(childActions);
        }
        detail.appendChild(childLine);
      });
      if(isMenuGroup && !s.issued){
        const editMenu = document.createElement('button');
        editMenu.type = 'button';
        editMenu.className = 'mini edit-menu-line';
        editMenu.textContent = 'Edit menu';
        editMenu.onclick = event=>{ event.stopPropagation(); editMenuEntry(s, entry); };
        detail.appendChild(editMenu);
      }

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
    const activeDiscount = Math.round(c.subtotal * (s.discountRate || 0));
    setSlotTotals(c.subtotal, activeDiscount, c.subtotal - activeDiscount);
    const orderNext = workflowNextState('order', s);
    renderWorkflowNext('orderFlowNav', Object.assign({}, orderNext, {onClick:()=>continueOrderToKitchen(active)}));
  }

  function whatsappOrderSetup(slotIndex){
    const slot = BK_STATE.getState().slots[slotIndex];
    if(!slot || slot.orderSource !== 'whatsapp' || slot.fulfilment) return Promise.resolve(true);
    return new Promise(resolve=>{
      const host = ensureDialogHost();
      document.getElementById('appDialogTitle').textContent = 'WhatsApp fulfilment';
      document.getElementById('appDialogBody').innerHTML = `
        <p>Confirm how the customer will receive and pay for this WhatsApp order.</p>
        <label class="dialog-label">Receive order<select id="waFulfilment" class="dialog-field"><option value="pickup">Customer pickup</option><option value="delivery">Delivery</option></select></label>
        <label class="dialog-label" id="waPickupPaymentRow">Pickup payment<select id="waPickupPayment" class="dialog-field"><option value="cash">Cash</option><option value="momo">MoMo</option></select></label>
        <label class="dialog-label hidden" id="waRiderRow">Rider arrangement<select id="waRiderType" class="dialog-field"><option value="customer-rider">Customer sends a rider — pay before handover</option><option value="burgerkiss-rider">BurgerKiss rider — MoMo on delivery</option></select></label>
        <div class="packing-summary-note" id="waPaymentRule">Payment is collected when the customer picks up the order.</div>
        <div class="dialog-actions"><button class="x" id="dlgCancel">Back to Order</button><button class="x modifier-primary" id="dlgConfirm">Continue</button></div>`;
      host.classList.add('open');
      const fulfilment = document.getElementById('waFulfilment');
      const sync = ()=>{
        const delivery = fulfilment.value === 'delivery';
        document.getElementById('waPickupPaymentRow').classList.toggle('hidden', delivery);
        document.getElementById('waRiderRow').classList.toggle('hidden', !delivery);
        document.getElementById('waPaymentRule').textContent = delivery
          ? (document.getElementById('waRiderType').value === 'customer-rider' ? 'MoMo must be received before handing the order to the customer’s rider.' : 'BurgerKiss delivers the order. The customer pays by MoMo when the rider arrives.')
          : 'The customer may pay by Cash or MoMo at pickup.';
      };
      fulfilment.onchange = sync;
      document.getElementById('waRiderType').onchange = sync;
      sync();
      document.getElementById('dlgCancel').onclick = ()=>{ closeDialog(); resolve(false); };
      document.getElementById('dlgConfirm').onclick = ()=>{
        const delivery = fulfilment.value === 'delivery';
        const riderType = delivery ? document.getElementById('waRiderType').value : '';
        const preferredPayment = delivery ? 'momo' : document.getElementById('waPickupPayment').value;
        BK_STATE.updateSlot(slotIndex, {fulfilment:delivery ? 'delivery' : 'pickup', riderType, preferredPayment, deliveryStatus:delivery ? 'preparing' : ''});
        closeDialog(); resolve(true);
      };
    });
  }

  function packingAssignmentDialog(slotIndex){
    const slot = BK_STATE.getState().slots[slotIndex];
    if(!slot || !window.BK_PACKING || !BK_PACKING.needsPackingReview(slot, BK_DATA.BASE)){
      if(slot) BK_STATE.updateSlot(slotIndex, {packAsked:true, sentToKitchen:true});
      return Promise.resolve(true);
    }
    return new Promise(resolve=>{
      const groups = BK_PACKING.menuGroups(slot);
      const assignable = BK_PACKING.assignableItems(slot, BK_DATA.BASE);
      const host = ensureDialogHost();
      const groupOptions = groups.length
        ? groups.map((group,index)=>`<option value="${escapeHtml(group.id)}">Bag ${index+1} — ${escapeHtml(group.label)}</option>`).join('')
        : '<option value="shared-single">Shared food/drink group</option>';
      const rows = assignable.map((entry,index)=>{
        const current = entry.item.customerGroupId || '';
        return `<label class="packing-assignment-row"><span><b>${escapeHtml(entry.product.name || entry.item.itemId)}</b><small>${BK_PACKING.isDrink(entry.item, BK_DATA.BASE) ? 'Drink' : 'Single item'}</small></span><select class="dialog-field packing-assignment" data-item-index="${entry.index}"><option value="">Choose customer / bag…</option>${groupOptions}<option value="separate-${index}">Separate bag / customer</option></select></label>`;
      }).join('');
      const drinkCount = (slot.items || []).filter(item=>BK_PACKING.isDrink(item, BK_DATA.BASE)).length;
      const drinkChoice = drinkCount > 1 ? `<fieldset class="modifier-section"><legend>Drink packaging</legend><p>Ask whether the customers are leaving together.</p><label class="staff-choice"><input type="radio" name="drinkPackMode" value="shared" checked><span><b>Together — fewer bags</b><small>Combine drinks from different customers where capacity allows.</small></span></label><label class="staff-choice"><input type="radio" name="drinkPackMode" value="by-customer"><span><b>By customer</b><small>Keep drink bags separated by customer group.</small></span></label></fieldset>` : '';
      document.getElementById('appDialogTitle').textContent = 'Assign items to bags';
      document.getElementById('appDialogBody').innerHTML = `
        <p>Every menu stays in its own food bag. Assign each extra item to the correct menu/customer or keep it separate.</p>
        <div class="packing-assignment-list">${rows}</div>
        ${drinkChoice}
        <div id="packingError" class="field-error"></div>
        <div class="dialog-actions"><button class="x" id="dlgCancel">Back to Order</button><button class="x modifier-primary" id="dlgConfirm">Confirm & Send to Kitchen</button></div>`;
      host.classList.add('open');
      document.getElementById('dlgCancel').onclick = ()=>{ closeDialog(); resolve(false); };
      document.getElementById('dlgConfirm').onclick = ()=>{
        const selects = Array.from(document.querySelectorAll('.packing-assignment'));
        if(selects.some(select=>!select.value)){ document.getElementById('packingError').textContent = 'Assign every extra item before continuing.'; return; }
        const latest = BK_STATE.getState().slots[slotIndex];
        if(!latest) return;
        const items = latest.items.map(item=>Object.assign({}, item));
        selects.forEach(select=>{
          const index = Number(select.dataset.itemIndex);
          if(!items[index]) return;
          items[index].customerGroupId = select.value;
          items[index].packGroupId = select.value;
        });
        items.forEach(item=>{ if(item.menuGroupId){ item.customerGroupId = item.menuGroupId; item.packGroupId = item.menuGroupId; } });
        const drinkChoiceInput = document.querySelector('input[name="drinkPackMode"]:checked');
        const drinkPackMode = drinkChoiceInput ? drinkChoiceInput.value : 'shared';
        BK_STATE.updateSlot(slotIndex, {items, drinkPackMode, packAsked:true, sentToKitchen:true});
        closeDialog(); resolve(true);
      };
    });
  }

  function continueOrderToKitchen(slotIndex){
    const slot = BK_STATE.getState().slots[slotIndex];
    if(!slot || !slot.items.length) return;
    whatsappOrderSetup(slotIndex).then(ok=>{
      if(!ok) return false;
      return packingAssignmentDialog(slotIndex);
    }).then(ok=>{ if(ok) goTab('make'); });
  }

  function workflowNextState(stage, slot){
    const hasItems = !!(slot && Array.isArray(slot.items) && slot.items.length);
    if(stage === 'order') return hasItems
      ? {state:'ready', title:'Order ready for kitchen', detail:'Products and packaging can now be sent to preparation.', label:'Continue to Kitchen', target:'make', disabled:false}
      : {state:'blocked', title:'Order not ready', detail:'Add at least one product to continue.', label:'Continue to Kitchen', target:'make', disabled:true};
    if(stage === 'make'){
      const done = hasItems && slot.items.every(item=>!!item.done);
      return done
        ? {state:'ready', title:'Kitchen complete', detail:'All items are prepared.', label:slot.pay === 'unpaid' ? 'Continue to Payment' : 'Continue to Handover', target:slot.pay === 'unpaid' ? 'pay' : 'issue', disabled:false}
        : {state:'blocked', title:'Kitchen preparation required', detail:'Mark every item as prepared to continue.', label:'Continue to Payment', target:'pay', disabled:true};
    }
    if(stage === 'pay') return hasItems && slot.pay !== 'unpaid'
      ? {state:'ready', title:'Payment complete', detail:'Payment is confirmed. Continue with the same order to handover.', label:'Continue to Handover', target:'issue', disabled:false}
      : {state:'blocked', title:'Payment required', detail:'Confirm Cash or MoMo payment to continue. Online orders are already paid.', label:'Continue to Handover', target:'issue', disabled:true};
    return {state:'blocked', title:'Step incomplete', detail:'Complete this step to continue.', label:'Continue', target:'order', disabled:true};
  }

  function renderWorkflowNext(hostId, options){
    const host = document.getElementById(hostId);
    if(!host) return;
    const opts = options || {};
    host.className = `workflow-next ${opts.state || 'blocked'}`;
    host.innerHTML = `<div class="workflow-next-copy"><strong>${escapeHtml(opts.title || '')}</strong><small>${escapeHtml(opts.detail || '')}</small></div><button type="button" class="workflow-next-button" ${opts.disabled ? 'disabled' : ''}>${escapeHtml(opts.label || 'Continue')}</button>`;
    const button = host.querySelector('.workflow-next-button');
    button.onclick = ()=>{ if(!button.disabled && typeof opts.onClick === 'function') opts.onClick(); };
  }

  function currentWorkflowTab(){
    const activeTab = document.querySelector('.workflow-step[aria-current="step"]');
    const idMap = { tabOrder:'order', tabMake:'make', tabPay:'pay', tabIssue:'issue' };
    return idMap[activeTab && activeTab.id] || 'order';
  }

  function makeSlotCardSelectable(card, slotIndex, tab, active){
    card.classList.add('selectable');
    card.classList.toggle('active-slot-card', !!active);
    card.tabIndex = 0;
    card.setAttribute('role', 'group');
    card.setAttribute('aria-label', `${active ? 'Active order. ' : ''}Order card; press Enter or Space to select`);
    if(active) card.setAttribute('aria-current', 'true');
    const select = event=>{
      if(event.target.closest('button, input, label, a, select, textarea')) return;
      focusSlot(slotIndex, tab);
    };
    card.addEventListener('click', select);
    card.addEventListener('keydown', event=>{
      if(event.target !== card || (event.key !== 'Enter' && event.key !== ' ')) return;
      event.preventDefault();
      focusSlot(slotIndex, tab);
    });
  }

  function kitchenProgress(slot){
    const entries = groupedCartRows(slot.items || []);
    const total = entries.length;
    const complete = entries.filter(entry=>groupedEntryDone(slot, entry)).length;
    const percent = total ? Math.round((complete / total) * 100) : 0;
    if(slot.issued) return { state:'complete', label:'Kitchen complete', complete, total, percent:100, detail:'Order already issued.' };
    if(total === 0) return { state:'empty', label:'No items', complete:0, total:0, percent:0, detail:'Add products before preparation.' };
    if(complete === total) return { state:'complete', label:'Kitchen complete', complete, total, percent:100, detail:'All items are prepared.' };
    if(complete === 0) return { state:'not-started', label:'Not started', complete, total, percent, detail:'Preparation has not started.' };
    return { state:'in-progress', label:'In progress', complete, total, percent, detail:'Continue preparing the remaining items.' };
  }

  function shortOrderNumber(orderNo){
    const value = String(orderNo || '').trim();
    const finalPart = value.split('-').pop();
    return finalPart ? String(Number(finalPart) || finalPart) : value || '-';
  }

  function renderMake(){
    const {slots, active} = BK_STATE.getState();
    const box = document.getElementById('makeList');
    box.querySelectorAll('.slot-card').forEach(n=>n.remove());
    box.querySelectorAll('.empty-state').forEach(n=>n.remove());
    if(!slots.length){
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = 'No active orders in kitchen.';
      box.appendChild(empty);
      return;
    }
    slots.forEach((s,i)=>{
      const progress = kitchenProgress(s);
      const makeNext = workflowNextState('make', s);
      const card = document.createElement('div'); card.className='slot-card kitchen-order-card';
      card.innerHTML = `
        <div class="slot-head kitchen-order-head">
          <div class="kitchen-order-identity">
            <strong>Order #${escapeHtml(shortOrderNumber(s.orderNo))}</strong>
            <span>${escapeHtml(orderChannelText(s))} · waiting ${formatAge(s.createdAt)}</span>
          </div>
          <span class="kitchen-packaging">Packaging: ${escapeHtml(packagingLabel(s))}</span>
        </div>
        <div class="kitchen-progress ${progress.state}">
          <div class="kitchen-progress-copy"><strong>${progress.label}</strong><span>${progress.complete} / ${progress.total} prepared</span></div>
          <div class="kitchen-progress-track" role="progressbar" aria-label="Kitchen progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress.percent}"><span style="width:${progress.percent}%"></span></div>
          ${progress.state === 'complete' && !s.issued ? `<button class="workflow-next-button kitchen-next-action" type="button">${makeNext.label}</button>` : ''}
        </div>
        <div class="todo grouped-todo" id="todo-${i}"></div>`;
      const nextAction = card.querySelector('.kitchen-next-action');
      if(nextAction) nextAction.onclick = ()=> focusSlot(i, makeNext.target);
      makeSlotCardSelectable(card, i, 'make', i === active);
      box.appendChild(card);
      const list = card.querySelector(`#todo-${i}`);
      let menuNumber = 0;
      const kitchenEntries = groupedCartRows(s.items);
      const menuEntryCount = kitchenEntries.filter(entry=>entry.menuGroupId).length;
      kitchenEntries.forEach(entry=>{
        const displayTitle = entry.menuGroupId
          ? `${menuEntryCount > 1 ? `MENU ${++menuNumber} — ` : ''}${entry.menuName || `${entry.name} Menu`}`
          : `${entry.qty}× ${entry.name}`;
        appendGroupedEntry(list, s, entry, i, {
          checkbox: true,
          displayTitle,
          showPrices: false,
          kitchen: true,
          onToggle: (picked, done)=>{
            BK_STATE.setActive(i);
            setGroupedEntryDone(picked, done);
            renderSlotsBar();
            renderMake();
            renderIssue();
            refreshTotals();
          }
        });
      });
    });
  }

  function paymentDisplay(slot){
    if(slot.issued) return { state:'locked', label:'Payment locked', detail:`${paymentLabel(slot.pay)} · Order issued` };
    if(!Array.isArray(slot.items) || slot.items.length === 0) return { state:'empty', label:'Nothing to pay', detail:'Add products before taking payment' };
    if(isPrepaidPlatform(slot)) return { state:'paid', label:`Paid via ${platformLabel(slot.orderSource)}`, detail:`Online payment · ${slot.externalOrderNo || 'platform reference missing'}` };
    if(slot.pay === 'cash') return { state:'paid', label:'Paid by Cash', detail:slot.finalChannel === 'direct' ? 'Converted online order · direct payment' : 'Payment confirmed' };
    if(slot.pay === 'momo') return { state:'paid', label:'Paid by MoMo', detail:slot.finalChannel === 'direct' ? 'Converted online order · direct payment' : 'Payment confirmed' };
    return { state:'pending', label:'Payment pending', detail:'Select the payment method after receiving payment' };
  }

  function requestSlotPayment(slotIndex, method){
    const st = BK_STATE.getState();
    const slot = st.slots[slotIndex];
    if(!slot || slot.issued || !Array.isArray(slot.items) || slot.items.length === 0 || !['unpaid','cash','momo'].includes(method)) return;
    if(isWhatsapp(slot) && slot.fulfilment === 'delivery' && method === 'cash'){ infoDialog('WhatsApp delivery is MoMo only.'); return; }
    BK_STATE.setActive(slotIndex);
    renderSlotsBar();
    renderPay();
    refreshTotals();
    if(slot.pay === method) return;
    const isUnpaid = method === 'unpaid';
    if(isUnpaid && slot.pay !== 'unpaid' && window.BK_ACCESS && !BK_ACCESS.hasRole('supervisor')){
      infoDialog('A supervisor or owner is required to reverse a confirmed payment.');
      return;
    }
    const paymentName = method === 'momo' ? 'MoMo' : 'Cash';
    const title = isUnpaid ? 'Change payment status' : `Confirm ${paymentName} payment`;
    const message = isUnpaid
      ? `Mark ${slot.orderNo || slot.name} as unpaid? This will block handover.`
      : `Confirm that ${centsFreeAmount(BK_LOGIC.computeSlot(slot).subtotal)} GHS was received by ${paymentName} for ${slot.orderNo || slot.name}.`;
    confirmDialog(title, message, {
      cancelLabel: 'Cancel',
      confirmLabel: isUnpaid ? 'Mark as unpaid' : `Confirm ${paymentName} payment`
    }).then(ok=>{
      if(ok) setSlotPayment(slotIndex, method);
    });
  }

  function centsFreeAmount(value){
    const amount = Number(value) || 0;
    return Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
  }

  function renderPay(){
    const {slots, active, discountRate} = BK_STATE.getState();
    const box = document.getElementById('payList');
    box.querySelectorAll('.slot-card').forEach(n=>n.remove());
    box.querySelectorAll('.empty-state').forEach(n=>n.remove());
    const s = slots[active];
    if(!s){
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = 'No active orders to pay.';
      box.appendChild(empty);
      return;
    }
    const c = BK_LOGIC.computeSlot(s);
    const discount = Math.round(c.subtotal * (s.discountRate || 0));
    const amountDue = c.subtotal - discount;
    const payment = paymentDisplay(s);
    const payNext = workflowNextState('pay', s);
    const paymentDisabled = s.issued || !Array.isArray(s.items) || s.items.length === 0;
    const canReversePayment = !isPrepaidPlatform(s) && s.pay !== 'unpaid' && !s.issued;
    const card = document.createElement('div'); card.className='slot-card workflow-order-card';
    card.dataset.paymentSlot = String(active);
    card.innerHTML = `
      <div class="workflow-order-identity">
        <div><strong>Order #${escapeHtml(shortOrderNumber(s.orderNo))}</strong><span>${escapeHtml(orderChannelText(s))}</span></div>
        <div class="amount-due"><small>Amount due</small><strong>${amountDue} GHS</strong></div>
      </div>
      <div class="payment-totals" aria-label="Payment total">
        <span>Subtotal <b>${c.subtotal} GHS</b></span>
        <span>Discount <b>-${discount} GHS</b></span>
      </div>
      <div class="payment-panel ${payment.state}">
        <div class="payment-summary"><strong>${payment.label}</strong><small>${payment.detail}</small></div>
        ${isPrepaidPlatform(s)
          ? `<div class="online-paid-lock"><b>${platformLabel(s.orderSource)} payment recorded</b><small>No additional payment step is required.</small></div>`
          : s.pay === 'unpaid'
            ? `<div class="payment-methods" role="group" aria-label="Payment method for Order ${escapeHtml(shortOrderNumber(s.orderNo))}">
                <button class="payment-method" ${(paymentDisabled || (isWhatsapp(s) && s.fulfilment === 'delivery')) ? 'disabled' : ''} onclick="BK_UI.requestSlotPayment(${active},'cash');">Cash</button>
                <button class="payment-method" ${paymentDisabled ? 'disabled' : ''} onclick="BK_UI.requestSlotPayment(${active},'momo');">MoMo</button>
              </div>`
            : `<button class="x change-payment-action" type="button">Change payment</button>`}
        <button type="button" class="workflow-next-button payment-next-action" ${payNext.disabled ? 'disabled' : ''}>${payNext.label}</button>
      </div>`;
    const paymentNext = card.querySelector('.payment-next-action');
    paymentNext.onclick = ()=> continueFromPayment(active);
    const changePayment = card.querySelector('.change-payment-action');
    if(changePayment && canReversePayment) changePayment.onclick = ()=>requestSlotPayment(active, 'unpaid');
    box.appendChild(card);
  }

  function continueFromPayment(slotIndex, navigate){
    const latest = BK_STATE.getState().slots[slotIndex];
    const next = workflowNextState('pay', latest);
    if(next.disabled){
      infoDialog(next.detail);
      return false;
    }
    const move = typeof navigate === 'function' ? navigate : focusSlot;
    move(slotIndex, next.target);
    return true;
  }

  function focusPaymentNextAction(slotIndex){
    setTimeout(()=>{
      const button = document.querySelector(`[data-payment-slot="${slotIndex}"] .payment-next-action`);
      if(!button || button.disabled) return;
      if(typeof button.scrollIntoView === 'function') button.scrollIntoView({block:'nearest', behavior:'smooth'});
      if(typeof button.focus === 'function') button.focus();
    }, 0);
  }

  function setSlotPayment(slotIndex, method){
    const st = BK_STATE.getState();
    if(!st.slots[slotIndex] || !['unpaid','cash','momo'].includes(method)) return false;
    BK_STATE.setActive(slotIndex);
    BK_STATE.setPay(slotIndex, method);
    renderSlotsBar();
    renderPay();
    renderIssue();
    refreshTotals();
    if(method !== 'unpaid') focusPaymentNextAction(slotIndex);
    return true;
  }

  function issueReadiness(slot){
    const hasItems = Array.isArray(slot.items) && slot.items.length > 0;
    const kitchenDone = hasItems && slot.items.every(item=>!!item.done);
    const paid = slot.pay !== 'unpaid';
    if(slot.voided) return { state:'voided', label:'Order voided', detail:slot.voidReason || 'Retained in history for audit.', action:'Voided', target:'issue', disabled:true };
    if(slot.issued) return { state:'issued', label:'Order issued', detail:'Handover completed and locked.', action:'Issued', target:'issue', disabled:true };
    if(!hasItems) return { state:'blocked', label:'Order is empty', detail:'Add at least one product before handover.', action:'Go to Order', target:'order' };
    if(isWhatsapp(slot) && slot.fulfilment === 'delivery' && slot.riderType === 'burgerkiss-rider'){
      if(!kitchenDone) return { state:'waiting', label:'Kitchen not finished', detail:'Complete every kitchen item before dispatch.', action:'Go to Make', target:'make' };
      if(slot.deliveryStatus !== 'out-for-delivery') return { state:'ready', label:'Ready for BurgerKiss rider', detail:'Customer pays by MoMo when the rider arrives.', action:'Handed to BurgerKiss Rider', target:'issue' };
      if(!paid) return { state:'blocked', label:'Out for delivery · payment pending', detail:'Confirm MoMo after the rider reaches the customer.', action:'Confirm MoMo Payment', target:'pay' };
      return { state:'ready', label:'Payment received', detail:'Confirm delivery to close this order.', action:'Delivered to Customer', target:'issue' };
    }
    if(!paid && !kitchenDone) return { state:'blocked', label:'2 steps remaining', detail:'Payment required · Kitchen not finished', action:'Go to Payment', target:'pay' };
    if(!paid) return { state:'blocked', label:'Payment required', detail:'Complete payment before handover.', action:'Go to Payment', target:'pay' };
    if(!kitchenDone) return { state:'waiting', label:'Kitchen not finished', detail:'Complete every kitchen item before handover.', action:'Go to Make', target:'make' };
    if(isPrepaidPlatform(slot)) return { state:'ready', label:'Ready for pickup', detail:`Prepared and paid via ${platformLabel(slot.orderSource)}.`, action:`Handed to ${platformLabel(slot.orderSource)} Rider`, target:'issue' };
    if(isWhatsapp(slot) && slot.fulfilment === 'delivery') return { state:'ready', label:'Ready for customer rider', detail:'MoMo received. The order may now be handed over.', action:'Handed to Customer Rider', target:'issue' };
    if(isWhatsapp(slot) && slot.fulfilment === 'pickup') return { state:'ready', label:'Ready for customer pickup', detail:`${paymentLabel(slot.pay)} received.`, action:'Handed to Customer', target:'issue' };
    if(slot.finalChannel === 'direct') return { state:'ready', label:'Ready for direct delivery', detail:`Collect ${paymentLabel(slot.pay)} · ${slot.fulfilment === 'customer-rider' ? 'Customer-arranged rider' : 'BurgerKiss delivery'}.`, action:slot.fulfilment === 'customer-rider' ? 'Handed to Customer Rider' : 'Handed to BurgerKiss Rider', target:'issue' };
    return { state:'ready', label:'Ready for handover', detail:'Paid and all kitchen items are complete.', action:'Start Final Handover', target:'issue' };
  }

  function renderIssue(){
    const {slots, active} = BK_STATE.getState();
    const box = document.getElementById('issueList');
    if(!box) return;
    box.querySelectorAll('.slot-card').forEach(n=>n.remove());
    box.querySelectorAll('.empty-state').forEach(n=>n.remove());
    const s = slots[active];
    if(!s){
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = 'No orders waiting for handover.';
      box.appendChild(empty);
      return;
    }
    const allDone = s.items.length>0 && s.items.every(it=>!!it.done);
    const readiness = issueReadiness(s);
    const card = document.createElement('div'); card.className='slot-card workflow-order-card';
    card.innerHTML = `
        <div class="workflow-order-identity handover-identity">
          <div><strong>Order #${escapeHtml(shortOrderNumber(s.orderNo))}</strong><span>${escapeHtml(orderChannelText(s))} · waiting ${formatAge(s.createdAt)}</span></div>
          <div class="handover-statuses" aria-label="Order completion status">
            <span class="${s.pay !== 'unpaid' ? 'complete' : 'pending'}">${s.pay !== 'unpaid' ? '✓' : '○'} ${escapeHtml(paymentLabel(s.pay))}</span>
            <span class="${allDone ? 'complete' : 'pending'}">${allDone ? '✓' : '○'} Kitchen ${allDone ? 'complete' : 'open'}</span>
          </div>
        </div>
        <div class="handover-packaging"><small>Packaging</small><strong>${escapeHtml(packagingLabel(s))}</strong></div>
        <div class="workflow-next issue-readiness ${readiness.state}">
          <div class="workflow-next-copy"><strong>${readiness.label}</strong><small>${readiness.detail}</small></div>
          <div class="issue-action-group"><button class="workflow-next-button issue-next-action" ${readiness.disabled ? 'disabled' : ''}>${readiness.action}</button>${readiness.state === 'ready' && isOnlineOrder(s) && s.finalChannel !== 'direct' ? `<button class="x rider-missed-action" type="button">Rider Did Not Pick Up</button>` : ''}</div>
        </div>`;
    const riderMissedButton = card.querySelector('.rider-missed-action');
    if(riderMissedButton) riderMissedButton.onclick = ()=>convertOnlineOrder(active);
    const actionButton = card.querySelector('.issue-next-action');
    actionButton.onclick = ()=>{
      if(readiness.disabled) return;
      if(readiness.state === 'ready') markIssued(active);
      else focusSlot(active, readiness.target);
    };
    const checklist = document.createElement('div');
    checklist.className = 'issue-checklist';
    const label = document.createElement('strong');
    label.className = 'issue-checklist-title';
    label.textContent = 'Items to hand over';
    checklist.appendChild(label);
    const grouped = groupedCartRows(s.items);
    if(grouped.length){
      grouped.forEach(entry=> appendGroupedEntry(checklist, s, entry, active, {
        compact:true,
        showPrices:false,
        displayTitle:entry.menuGroupId && entry.menuName ? entry.menuName : `${entry.qty}x ${entry.name}`
      }));
    }else{
      const emptyLine = document.createElement('div');
      emptyLine.className = 'empty-state';
      emptyLine.textContent = 'No items';
      checklist.appendChild(emptyLine);
    }
    card.appendChild(checklist);
    box.appendChild(card);
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
    valid.forEach(tab=> document.body.classList.toggle(`workflow-${tab}`, tab === target));

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

  function focusSlot(slotIndex, tab){
    const st = BK_STATE.getState();
    const slot = st.slots[slotIndex];
    if(!slot) return;
    BK_STATE.setActive(slotIndex);
    renderSlotsBar();
    renderOrder();
    renderMake();
    renderPay();
    renderIssue();
    refreshTotals();
    goTab(slot.issued ? 'issue' : (tab || currentWorkflowTab()));
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

  function createFreshOrderSlot(slotName){
    return BK_STATE.allocateOrderNo().then(function(orderNo){
      const access = window.BK_ACCESS && BK_ACCESS.current ? BK_ACCESS.current() : null;
      return {
        name: slotName,
        items: [],
        pay: 'unpaid',
        issued: false,
        voided: false,
        voidReason: '',
        packMode: 'shared',
        packAsked: false,
        drinkPackMode: 'shared',
        sentToKitchen: false,
        orderNo,
        createdAt: Date.now(),
        createdBy: window.BK_ACCESS && BK_ACCESS.operationalActor ? BK_ACCESS.operationalActor() : null,
        businessDate: access ? access.businessDate : '',
        shiftId: access ? access.shiftId : ''
      };
    });
  }

  function showOrderNumberError(error){
    infoDialog(`A new order number could not be reserved. No order was created. Check the internet connection and try again. (${error && error.message ? error.message : 'Unknown error'})`);
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
    createFreshOrderSlot(slot.name).then(function(nextSlot){
      if(slot.issued && slot.items.length) pushHistory(slotSnapshot(slot));
      st.slots[i] = nextSlot;
      BK_STATE.setState(st);
      renderAll();
      goTab('order');
    }).catch(showOrderNumberError);
  }

  function quickStartNext(slotIndex){
    const st = BK_STATE.getState();
    const i = Number.isInteger(slotIndex) ? slotIndex : st.active;
    const slot = st.slots[i];
    if(!slot) return;
    createFreshOrderSlot(slot.name).then(function(nextSlot){
      if(slot.issued && slot.items.length) pushHistory(slotSnapshot(slot));
      st.active = i;
      st.slots[i] = nextSlot;
      BK_STATE.setState(st);
      renderAll();
      goTab('order');
    }).catch(showOrderNumberError);
  }

  function addNewOrderSlot(){
    const st = BK_STATE.getState();
    const slot = st.slots[st.active];
    if(slot && slot.items.length === 0){
      goTab('order');
      return;
    }
    if(slot && slot.items.length > 0 && !slot.sentToKitchen){
      infoDialog('Finish the current order intake and send it to Kitchen before starting another order.');
      return;
    }
    BK_STATE.addSlot().then(function(){
      renderAll();
      goTab('order');
    }).catch(showOrderNumberError);
  }

  const ONLINE_PLATFORMS = new Set(['whatsapp','bolt','hubtel','chowdeck']);
  function platformLabel(value){
    const labels = {walkin:'Walk-in', whatsapp:'WhatsApp', bolt:'Bolt', hubtel:'Hubtel', chowdeck:'Chowdeck'};
    return labels[String(value || '').toLowerCase()] || 'Walk-in';
  }
  function isOnlineOrder(slot){ return !!(slot && ONLINE_PLATFORMS.has(slot.orderSource)); }
  function isPrepaidPlatform(slot){ return !!(slot && ['bolt','hubtel','chowdeck'].includes(slot.orderSource) && slot.finalChannel !== 'direct'); }
  function isWhatsapp(slot){ return !!(slot && slot.orderSource === 'whatsapp'); }
  function paymentLabel(pay){ return ({unpaid:'Unpaid',cash:'Cash',momo:'MoMo',whatsapp:'WhatsApp',bolt:'Bolt',hubtel:'Hubtel',chowdeck:'Chowdeck'})[pay] || String(pay || 'Unknown'); }
  function orderChannelText(slot){
    if(!slot) return '';
    if(slot.finalChannel === 'direct') return `${platformLabel(slot.originalSource || slot.orderSource)} → Direct ${paymentLabel(slot.pay)}`;
    return isOnlineOrder(slot) ? `${platformLabel(slot.orderSource)} · ${slot.externalOrderNo || 'No reference'}` : 'Walk-in';
  }
  function onlineOrderExists(platform, reference){
    const key = `${platform}|${String(reference || '').trim().toLowerCase()}`;
    const active = BK_STATE.getState().slots.some(slot=>`${slot.orderSource}|${String(slot.externalOrderNo || '').trim().toLowerCase()}` === key);
    const archived = getHistory().some(entry=>`${entry.orderSource}|${String(entry.externalOrderNo || '').trim().toLowerCase()}` === key);
    return active || archived;
  }
  function openOnlineOrderDialog(){
    const host = ensureDialogHost();
    document.getElementById('appDialogTitle').textContent = 'New online order';
    document.getElementById('appDialogBody').innerHTML = `
      <p>Choose the order channel. Bolt, Chowdeck and Hubtel are already paid online. WhatsApp orders remain unpaid until pickup or delivery.</p>
      <label class="dialog-label">Channel<select id="onlinePlatform" class="dialog-field"><option value="whatsapp">WhatsApp</option><option value="bolt">Bolt</option><option value="chowdeck">Chowdeck</option><option value="hubtel">Hubtel</option></select></label>
      <label class="dialog-label">Order reference / customer name<input id="onlineReference" class="dialog-field" maxlength="80" placeholder="e.g. Ama or BOLT-847263" autocomplete="off"></label>
      <label class="dialog-label hidden" id="onlinePhoneRow">Customer phone<input id="onlinePhone" class="dialog-field" maxlength="30" inputmode="tel" placeholder="Optional for pickup; needed for delivery"></label>
      <div id="onlineOrderError" class="field-error"></div>
      <div class="dialog-actions"><button class="x" id="dlgCancel">Cancel</button><button class="x modifier-primary" id="dlgConfirm">Create Online Order</button></div>`;
    host.classList.add('open');
    const reference = document.getElementById('onlineReference');
    const platformInput = document.getElementById('onlinePlatform');
    const syncOnlineFields = ()=> document.getElementById('onlinePhoneRow').classList.toggle('hidden', platformInput.value !== 'whatsapp');
    platformInput.onchange = syncOnlineFields; syncOnlineFields();
    reference.focus();
    document.getElementById('dlgCancel').onclick = ()=>{
      closeDialog();
      if(!BK_STATE.getState().slots.length) window.location.replace('index.html');
    };
    document.getElementById('dlgConfirm').onclick = ()=>{
      const platform = document.getElementById('onlinePlatform').value;
      const externalOrderNo = reference.value.trim();
      const customerPhone = document.getElementById('onlinePhone').value.trim();
      const error = document.getElementById('onlineOrderError');
      if(!externalOrderNo){ error.textContent = 'The platform order number is required.'; return; }
      if(onlineOrderExists(platform, externalOrderNo)){ error.textContent = `This ${platformLabel(platform)} order already exists.`; return; }
      const state = BK_STATE.getState();
      const current = state.slots[state.active];
      const finish = index=>{
        BK_STATE.setActive(index);
        closeDialog();
        renderAll();
        goTab('order');
        infoDialog(platform === 'whatsapp' ? `WhatsApp order for ${externalOrderNo} created. Enter the products; fulfilment and payment rules are confirmed before Kitchen.` : `${platformLabel(platform)} order ${externalOrderNo} created. Payment is already recorded; enter the products and continue to Kitchen.`);
      };
      if(current && !current.items.length && current.pay === 'unpaid'){
        BK_STATE.updateSlot(state.active, {orderSource:platform, externalOrderNo, customerName:platform === 'whatsapp' ? externalOrderNo : '', customerPhone, pay:platform === 'whatsapp' ? 'unpaid' : platform});
        finish(state.active);
      }else{
        BK_STATE.addSlot(undefined, {orderSource:platform, externalOrderNo, customerName:platform === 'whatsapp' ? externalOrderNo : '', customerPhone, pay:platform === 'whatsapp' ? 'unpaid' : platform}).then(finish).catch(showOrderNumberError);
      }
    };
  }
  function convertOnlineOrder(slotIndex){
    const slot = BK_STATE.getState().slots[slotIndex];
    if(!slot || !isOnlineOrder(slot) || slot.finalChannel === 'direct') return;
    const host = ensureDialogHost();
    const platform = platformLabel(slot.orderSource);
    document.getElementById('appDialogTitle').textContent = `${platform} rider did not pick up`;
    document.getElementById('appDialogBody').innerHTML = `
      <p>The platform refund is expected and may remain pending for several hours. Convert this same prepared order without waiting for platform confirmation.</p>
      <div class="online-conversion-summary"><b>${escapeHtml(slot.externalOrderNo || slot.orderNo)}</b><span>${BK_LOGIC.computeSlot(slot).subtotal} GHS</span></div>
      <label class="dialog-label">Delivery<select id="conversionFulfilment" class="dialog-field"><option value="burgerkiss-delivery">BurgerKiss will deliver</option><option value="customer-rider">Customer will send a rider</option></select></label>
      <label class="dialog-label">Direct payment<select id="conversionPayment" class="dialog-field"><option value="cash">Collect Cash</option><option value="momo">Collect MoMo</option></select></label>
      <div class="dialog-actions"><button class="x" id="dlgCancel">Keep Waiting</button><button class="x modifier-primary" id="dlgConfirm">Convert to Direct Order</button></div>`;
    host.classList.add('open');
    document.getElementById('dlgCancel').onclick = closeDialog;
    document.getElementById('dlgConfirm').onclick = ()=>{
      const fulfilment = document.getElementById('conversionFulfilment').value;
      const pay = document.getElementById('conversionPayment').value;
      BK_STATE.updateSlot(slotIndex, {
        originalSource:slot.orderSource,
        originalPay:slot.pay,
        finalChannel:'direct',
        fulfilment,
        conversionReason:`${platform} rider did not pick up`,
        refundStatus:'expected-pending',
        convertedAt:Date.now(),
        pay
      });
      closeDialog();
      focusSlot(slotIndex, 'issue');
      renderAll();
      infoDialog(`Order converted. ${platform} refund is recorded as expected / pending. Collect ${pay === 'cash' ? 'Cash' : 'MoMo'} and hand the order to the selected rider.`);
    };
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
      orderSource: String(entry.orderSource || 'walkin'),
      externalOrderNo: String(entry.externalOrderNo || ''),
      originalSource: String(entry.originalSource || ''),
      originalPay: String(entry.originalPay || ''),
      finalChannel: String(entry.finalChannel || ''),
      fulfilment: String(entry.fulfilment || ''),
      conversionReason: String(entry.conversionReason || ''),
      refundStatus: String(entry.refundStatus || ''),
      convertedAt: Number(entry.convertedAt) || 0,
      issued: !!entry.issued,
      createdAt: Number(entry.createdAt) || closedAt,
      closedAt,
      subtotal: Number(entry.subtotal) || 0,
      discountRate: Math.max(0, Number(entry.discountRate) || 0),
      discount: Math.max(0, Number(entry.discount) || 0),
      discountApprovedBy: (entry.discountApprovedBy && typeof entry.discountApprovedBy === 'object') ? entry.discountApprovedBy : null,
      discountApprovedAt: Number(entry.discountApprovedAt) || 0,
      total: Number.isFinite(Number(entry.total)) ? Number(entry.total) : Math.max(0, (Number(entry.subtotal) || 0) - (Number(entry.discount) || 0)),
      combos: Number(entry.combos) || 0,
      packMode: entry.packMode === 'split' ? 'split' : 'shared',
      status: entry.status === 'voided' ? 'voided' : 'completed',
      voidReason: String(entry.voidReason || ''),
      voidedAt: Number(entry.voidedAt) || 0,
      voidedBy: String(entry.voidedBy || ''),
      items: Array.isArray(entry.items) ? entry.items : [],
      rawItems: Array.isArray(entry.rawItems) ? entry.rawItems : []
    };
  }
  function mergeHistory(local, remote){
    const map = new Map();
    const add = h=>{
      const clean = sanitizeHistoryEntry(h);
      if(!clean) return;
      const saved = map.get(clean.id);
      if(!saved || (clean.status === 'voided' && saved.status !== 'voided') || Number(clean.voidedAt||clean.closedAt) >= Number(saved.voidedAt||saved.closedAt)) map.set(clean.id, clean);
    };
    (Array.isArray(local) ? local : []).forEach(add);
    (Array.isArray(remote) ? remote : []).forEach(add);
    return Array.from(map.values()).sort((a,b)=> Number(b.closedAt||0) - Number(a.closedAt||0)).slice(0, 1000);
  }
  function flattenRemoteHistory(raw){
    const out = [];
    function visit(node){
      if(!node || typeof node !== 'object') return;
      if(String(node.orderNo || '').trim() && (node.closedAt || node.createdAt)){
        const clean = sanitizeHistoryEntry(node);
        if(clean) out.push(clean);
        return;
      }
      Object.values(node).forEach(visit);
    }
    visit(raw);
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
  function refreshHistoryFromRemote(){
    const database = historyDb();
    if(!database) return Promise.resolve(false);
    return database.ref(historyRemotePath()).get().then(function(snap){
      const remote = flattenRemoteHistory(snap.val());
      const local = getHistory();
      const remoteById = new Map(remote.map(entry=>[entry.id, entry]));
      const missingRemote = local.filter(entry=>{
        const saved = remoteById.get(entry.id);
        return !saved || (entry.status === 'voided' && (saved.status !== 'voided' || Number(saved.voidedAt) < Number(entry.voidedAt)));
      });
      saveHistory(mergeHistory(local, remote));
      if(!missingRemote.length) return remote.length > 0;
      return Promise.all(missingRemote.map(saveHistoryRemote)).then(()=>true);
    }).catch(function(e){
      console.warn('history remote refresh failed:', e && e.message);
      return false;
    });
  }


  function getHistory(){
    try{
      const raw = localStorage.getItem(HISTORY_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return mergeHistory(Array.isArray(arr) ? arr : [], []);
    }catch(e){ return []; }
  }
  function saveHistory(list){
    const clean = mergeHistory(Array.isArray(list) ? list : [], []);
    try{ localStorage.setItem(HISTORY_KEY, JSON.stringify(clean)); }catch(e){
      console.warn('history local save failed:', e && e.message);
    }
    return clean;
  }
  function slotSnapshot(slot){
    const c = BK_LOGIC.computeSlot(slot);
    const discountRate = Math.max(0, Number(slot.discountRate) || 0);
    const discount = Math.round(c.subtotal * discountRate);
    return {
      id: String(slot.orderNo || `ORD-${Date.now()}`).replace(/[^a-zA-Z0-9_\-]/g, '_'),
      orderNo: slot.orderNo || '-',
      slotName: slot.name || '-',
      pay: slot.pay || 'unpaid',
      orderSource: slot.orderSource || 'walkin',
      externalOrderNo: slot.externalOrderNo || '',
      originalSource: slot.originalSource || '',
      originalPay: slot.originalPay || '',
      finalChannel: slot.finalChannel || '',
      fulfilment: slot.fulfilment || '',
      conversionReason: slot.conversionReason || '',
      refundStatus: slot.refundStatus || '',
      convertedAt: slot.convertedAt || 0,
      issued: !!slot.issued,
      createdAt: slot.createdAt || Date.now(),
      closedAt: Date.now(),
      businessDate: slot.businessDate || (window.BK_ACCESS && BK_ACCESS.current ? (BK_ACCESS.current() || {}).businessDate : ''),
      shiftId: slot.shiftId || '',
      createdBy: slot.createdBy || null,
      paidBy: slot.paidBy || null,
      paidAt: slot.paidAt || 0,
      discountApprovedBy: slot.discountApprovedBy || null,
      discountApprovedAt: slot.discountApprovedAt || 0,
      issuedBy: slot.issuedBy || null,
      riderType: slot.riderType || '',
      deliveryStatus: slot.deliveryStatus || '',
      subtotal: c.subtotal,
      discountRate,
      discount,
      total: c.subtotal - discount,
      combos: c.combos,
      packMode: slot.packMode === 'split' ? 'split' : 'shared',
      status: 'completed',
      items: BK_LOGIC.groupedLines(slot.items || []).map(x=>({name:x.name, qty:x.qty, note:x.note, total:x.total})),
      rawItems: JSON.parse(JSON.stringify(slot.items || []))
    };
  }
  function pushHistory(entry){
    const clean = sanitizeHistoryEntry(entry);
    if(!clean) return;
    const current = getHistory();
    const existing = current.find(saved=> saved.orderNo === clean.orderNo);
    const archived = existing || clean;
    if(!existing) saveHistory(mergeHistory([clean], current));
    saveHistoryRemote(archived).then(function(saved){
      if(!saved && historyRemoteEnabled()) console.warn('Order history remains local until online sync succeeds:', archived.orderNo);
    });
  }
  function recoverIssuedSlotsToHistory(){
    const existing = new Set(getHistory().map(entry=>entry.orderNo));
    let recovered = 0;
    BK_STATE.getState().slots.forEach(function(slot){
      if(!slot || !slot.issued || !slot.orderNo || !Array.isArray(slot.items) || !slot.items.length || existing.has(slot.orderNo)) return;
      pushHistory(slotSnapshot(slot));
      existing.add(slot.orderNo);
      recovered += 1;
    });
    return recovered;
  }

  function archiveCompletedSlots(){
    const state = BK_STATE.getState();
    const completed = state.slots.filter(slot=>slot && slot.issued);
    if(!completed.length) return 0;
    completed.forEach(slot=>{
      if(Array.isArray(slot.items) && slot.items.length) pushHistory(slotSnapshot(slot));
    });
    const activeOrderNo = state.slots[state.active] && state.slots[state.active].orderNo;
    state.slots = state.slots.filter(slot=>!slot.issued);
    const preservedActive = state.slots.findIndex(slot=>slot.orderNo === activeOrderNo);
    state.active = preservedActive >= 0 ? preservedActive : Math.min(state.active, Math.max(0, state.slots.length - 1));
    BK_STATE.setState(state);
    return completed.length;
  }

  function handoverProduct(itemId){
    return (BK_DATA.BASE || []).find(product=>product.id === itemId) || {id:itemId, name:prettyName(itemId), cat:''};
  }
  function handoverLine(item, qty){
    const product = handoverProduct(item.itemId);
    return {id:item.itemId, name:product.name || prettyName(item.itemId), qty:Number(qty) || 1, note:item.note || '', cat:product.cat || '', role:item.menuRole || ''};
  }
  function buildHandoverPlan(slot){
    const sourceItems = Array.isArray(slot && slot.items) ? slot.items : [];
    const menuGroups = new Map();
    const ungrouped = [];
    sourceItems.forEach(item=>{
      if(item && item.menuGroupId){
        if(!menuGroups.has(item.menuGroupId)) menuGroups.set(item.menuGroupId, []);
        menuGroups.get(item.menuGroupId).push(item);
      }else{
        ungrouped.push(item);
      }
    });

    const menus = [];
    menuGroups.forEach((items, groupId)=>{
      const mains = items.filter(item=>item.menuRole === 'main');
      const count = Math.max(1, mains.length);
      const blocks = Array.from({length:count}, (_, index)=>({
        groupId:`${groupId}-${index+1}`,
        name:(mains[index] && mains[index].menuName) || (items[0] && items[0].menuName) || 'Menu',
        items:[], noSauce:!!(mains[index] && mains[index].menuNoSauce), wings:false
      }));
      const roleOffsets = {};
      items.forEach(item=>{
        if(item.menuRole === 'addon') return;
        let targetIndex;
        if(item.menuRole === 'main') targetIndex = Math.max(0, mains.indexOf(item));
        else{
          const role = item.menuRole || 'item';
          targetIndex = (roleOffsets[role] || 0) % count;
          roleOffsets[role] = (roleOffsets[role] || 0) + 1;
        }
        const block = blocks[Math.min(targetIndex, blocks.length-1)];
        const line = handoverLine(item, 1);
        if(line.cat === 'wings' || /^wings_/i.test(line.id)) block.wings = true;
        block.items.push(line);
      });
      blocks.forEach(block=>menus.push(block));
    });

    const legacyStandalone = [];
    groupedCartRows(ungrouped).forEach(entry=>{
      if(hasMenuChildren(entry)){
        const menuCount = Math.max(1, Number(entry.qty) || 1);
        for(let index=0; index<menuCount; index++){
          const mainProduct = handoverProduct(entry.id);
          const block = {groupId:`legacy-${menus.length+1}`, name:`${entry.name} Menu`, items:[{id:entry.id,name:entry.name,qty:1,note:entry.note||'',cat:mainProduct.cat||'',role:'main'}], noSauce:false, wings:mainProduct.cat === 'wings'};
          (entry.children || []).forEach(child=>{
            const perMenu = Math.max(1, Math.ceil((Number(child.qty)||1) / menuCount));
            for(let n=0;n<perMenu;n++){
              const childProduct = handoverProduct(child.id);
              block.items.push({id:child.id,name:child.name,qty:1,note:child.note||'',cat:childProduct.cat||'',role:childProduct.cat === 'drink' ? 'drink' : (String(child.id).startsWith('x_sauce_') ? 'sauce' : 'item')});
            }
          });
          block.noSauce = !block.items.some(item=>item.role === 'sauce');
          menus.push(block);
        }
      }else{
        legacyStandalone.push(entry);
      }
    });

    const standalone = legacyStandalone.filter(entry=>{
      const product = handoverProduct(entry.id);
      return !(product.cat === 'extra' || String(entry.id || '').startsWith('x_'));
    }).map(entry=>{
      const product = handoverProduct(entry.id);
      return Object.assign({}, entry, {cat:product.cat || '', children:(entry.children || []).filter(child=>String(child.id || '').startsWith('x_sauce_'))});
    });

    const menuDrinkCount = menus.reduce((total, menu)=> total + menu.items.filter(item=>item.cat === 'drink' || item.role === 'drink').reduce((sum,item)=>sum+item.qty,0), 0);
    const standaloneDrinkCount = standalone.filter(entry=>entry.cat === 'drink').reduce((total,entry)=>total+(Number(entry.qty)||0),0);
    const standaloneFood = standalone.filter(entry=>entry.cat !== 'drink');
    const eligiblePaperItems = standaloneFood.filter(entry=>entry.cat !== 'salad' && entry.cat !== 'wings');
    const eligibleUnits = eligiblePaperItems.reduce((total,entry)=>total+(Number(entry.qty)||0),0);
    const packaging = [];
    const rules = getPackagingRules();
    const drinksPerBag = Math.max(1, Number(rules.drinksPerPlasticBag) || 2);
    const drinkCount = menuDrinkCount + standaloneDrinkCount;
    if(drinkCount){
      const qty = window.BK_PACKING ? BK_PACKING.drinkBagCount(slot, BK_DATA.BASE, drinksPerBag) : Math.ceil(drinkCount / drinksPerBag);
      packaging.push({name:slot && slot.drinkPackMode === 'by-customer' ? 'Plastic Bag — drinks only · by customer' : 'Plastic Bag — drinks only · shared', qty, kind:'drink'});
    }
    const wingsCount = standaloneFood.filter(entry=>entry.cat === 'wings').reduce((total,entry)=>total+(Number(entry.qty)||0),0);
    const saladCount = standaloneFood.filter(entry=>entry.cat === 'salad').reduce((total,entry)=>total+(Number(entry.qty)||0),0);
    if(wingsCount) packaging.push({name:'Wings Box', qty:wingsCount, kind:'food'});
    if(saladCount) packaging.push({name:'Salad Container', qty:saladCount, kind:'food'});
    if(eligibleUnits){
      if(slot && slot.packMode === 'split') packaging.push({name:'Small Paper Bag — single food item', qty:eligibleUnits, kind:'food'});
      else if(eligibleUnits === 1) packaging.push({name:'Small Paper Bag — single food items', qty:1, kind:'food'});
      else if(eligibleUnits === 2) packaging.push({name:'Medium Paper Bag — single food items', qty:1, kind:'food'});
      else packaging.push({name:'Large Paper Bag — single food items', qty:Math.ceil(eligibleUnits / Math.max(1, Number(rules.singleFoodUnitsPerLargeBag)||3)), kind:'food'});
    }
    return {
      menus,
      standalone,
      packaging,
      standaloneNapkins:standaloneFood.length ? standaloneFood.reduce((total,entry)=>total+(Number(entry.qty)||0),0) * 2 : 0,
      drinkCount
    };
  }

  function staffFacingItemName(item){
    let name = String((item && item.name) || '').replace(/\s+Sauce Cup$/i, '').replace(/\s+Cup$/i, '').trim();
    if(item && (item.role === 'included-sauce' || item.role === 'sauce')) name = name.replace(/^Extra\s+/i, '');
    name = name.replace(/^(Extra\s+)?(Ketchup|Mayonnaise|Chipotle|Dutch Special)\s+Sauce$/i, '$1$2');
    return name;
  }
  function staffFacingNote(note){
    return splitEntryNoteLines(note).filter(line=>!/^\s*(?:included|extra|menu)?\s*for\s+/i.test(line));
  }
  function handoverCard(title, badge, lines){
    return `<label class="handover-card-check"><input type="checkbox" data-handover-check /><span class="handover-card-body"><span class="handover-menu-heading"><strong>${escapeHtml(title)}</strong>${badge ? `<span>${escapeHtml(badge)}</span>` : ''}</span><span class="handover-card-lines">${lines.join('')}</span></span></label>`;
  }
  function handoverCardLine(name, detail, qty){
    return `<span class="handover-card-line"><b>${Number(qty)||1}x ${escapeHtml(name)}</b>${detail ? `<small>${escapeHtml(detail)}</small>` : ''}</span>`;
  }
  function handoverPlanHtml(plan){
    const menuHtml = plan.menus.map((menu,index)=>{
      const lines = menu.items.map(item=>{
        const detail = item.cat === 'drink' || item.role === 'drink'
          ? 'Drinks plastic bag'
          : staffFacingNote(item.note).join(' · ');
        return handoverCardLine(staffFacingItemName(item), detail, item.qty);
      });
      if(menu.noSauce) lines.push(handoverCardLine('No sauce requested', '', 1));
      lines.push(handoverCardLine('Napkins', '', 2));
      if(menu.wings) lines.push(handoverCardLine('Wings Box', '', 1));
      lines.push(handoverCardLine('Large Paper Bag', 'Food only · this menu stays separate', 1));
      return handoverCard(`MENU ${index+1} — ${menu.name}`, `BAG ${index+1}`, lines);
    }).join('');
    const standaloneHtml = plan.standalone.map((entry,index)=>{
      const lines = [handoverCardLine(entry.name, staffFacingNote(entry.note).join(' · '), entry.qty)];
      (entry.children || []).forEach(child=>lines.push(handoverCardLine(staffFacingItemName(child), '', child.qty)));
      const groupLabel = entry.customerGroupId ? `CUSTOMER ${entry.customerGroupId}` : '';
      return handoverCard(`SINGLE ITEM ${index+1} — ${entry.name}`, groupLabel, lines);
    }).join('');
    const essentials = [];
    if(plan.standaloneNapkins) essentials.push(handoverCardLine('Napkins', 'For single food items', plan.standaloneNapkins));
    (plan.packaging || []).forEach(row=>essentials.push(handoverCardLine(row.name, row.kind === 'drink' ? 'Cold drinks only' : '', row.qty)));
    const essentialsHtml = essentials.length ? handoverCard('PACKAGING & ESSENTIALS', '', essentials) : '';
    return `${menuHtml}${standaloneHtml}${essentialsHtml}` || '<div>No items in this order.</div>';
  }

  function markIssued(i){
    const st = BK_STATE.getState();
    const slot = st.slots[i];
    if(!slot) return;
    BK_STATE.setActive(i);
    renderSlotsBar();
    renderIssue();
    refreshTotals();
    const handoverPlan = buildHandoverPlan(slot);
    const checklistHtml = handoverPlanHtml(handoverPlan);
    handoverChecklistDialog(
      `${isOnlineOrder(slot) ? (slot.finalChannel === 'direct' ? 'Direct delivery check' : `${platformLabel(slot.orderSource)} rider pickup check`) : 'Final handover check'} – ${slot.externalOrderNo || slot.orderNo || slot.name}`,
      `<div style="margin-bottom:8px">Read from top to bottom. Every menu has its own food bag; cold drinks always use plastic bags.</div><div class="final-packaging-mode"><b>Customer preference:</b> ${packagingLabel(slot)} · <b>Menu rule:</b> every menu stays separate</div>${checklistHtml}`
    ).then(ok=>{
      if(!ok) return;
      const latestSlot = BK_STATE.getState().slots[i];
      if(!latestSlot || latestSlot.issued) return;
      const burgerKissDispatch = isWhatsapp(latestSlot) && latestSlot.fulfilment === 'delivery' && latestSlot.riderType === 'burgerkiss-rider' && latestSlot.deliveryStatus !== 'out-for-delivery';
      const shouldConsume = !latestSlot.stockConsumed;
      const stockResult = shouldConsume && window.BK_STOCK && typeof BK_STOCK.consumeSlot === 'function'
        ? BK_STOCK.consumeSlot(latestSlot)
        : null;
      if(burgerKissDispatch){
        BK_STATE.updateSlot(i, {deliveryStatus:'out-for-delivery', stockConsumed:true});
        renderAll();
        infoDialog('Order is out for delivery. Confirm MoMo when the rider reaches the customer, then confirm delivery.');
        return;
      }
      pushHistory(slotSnapshot({...latestSlot, issued:true, issuedBy:window.BK_ACCESS && BK_ACCESS.operationalActor ? BK_ACCESS.operationalActor() : null}));
      const nextState = BK_STATE.getState();
      nextState.slots.splice(i, 1);
      nextState.active = Math.min(i, Math.max(0, nextState.slots.length - 1));
      BK_STATE.setState(nextState);
      if(!nextState.slots.length){
        const flush = BK_STATE.flushRemote ? BK_STATE.flushRemote() : Promise.resolve(true);
        flush.finally(()=>window.location.replace('index.html'));
        return;
      }
      const finish = ()=>{
        renderAll();
        renderStock();
        const suffix = stockResult && stockResult.message ? ` ${stockResult.message}` : '';
        infoDialog(`Order completed and archived. It is now available only in History.${suffix}`);
      };
      finish();
    });
  }

  function historyStatusLabel(entry){
    return entry.status === 'voided' ? 'VOIDED' : 'COMPLETED';
  }
  function historyItemsHtml(entry){
    const items = Array.isArray(entry.items) ? entry.items : [];
    if(!items.length) return '<div class="empty-state">No saved item details.</div>';
    return `<div class="history-item-list">${items.map(item=>{
      const notes = splitEntryNoteLines(item.note);
      return `<div class="history-item">
        <div class="history-item-main"><strong>${Number(item.qty)||1}x ${escapeHtml(item.name)}</strong><b>${Number(item.total)||0} GHS</b></div>
        ${notes.map(note=>`<div class="history-item-extra">+ ${escapeHtml(String(note).replace(/^\+\s*/, ''))}</div>`).join('')}
      </div>`;
    }).join('')}</div>`;
  }
  function renderHistoryBody(){
    const body = document.getElementById('historyBody');
    const hist = getFilteredHistory();
    if(hist.length===0){
      body.innerHTML = '<div class="empty-state">No completed orders in history yet.</div>';
      return;
    }
    const completed = hist.filter(h=>h.status !== 'voided');
    const totalSales = completed.reduce((a,h)=> a + Number(h.total||h.subtotal||0), 0);
    const cashCount = completed.filter(h=>h.pay==='cash').length;
    const momoCount = completed.filter(h=>h.pay==='momo').length;
    const onlineCount = completed.filter(h=>ONLINE_PLATFORMS.has(h.orderSource)).length;
    const convertedCount = completed.filter(h=>h.finalChannel === 'direct').length;
    const voidCount = hist.length - completed.length;
    body.innerHTML = `
      <div class="history-summary">
        <span><b>Orders:</b> ${completed.length}</span><span><b>Cash:</b> ${cashCount}</span>
        <span><b>MoMo:</b> ${momoCount}</span><span><b>Online:</b> ${onlineCount}</span><span><b>Converted:</b> ${convertedCount}</span><span><b>Voided:</b> ${voidCount}</span>
        <span class="history-summary-total"><b>Net sales:</b> ${totalSales} GHS</span>
      </div>
      <div class="history-order-list">
      ${hist.slice(0,200).map(h=>`
        <button type="button" class="history-order-row ${h.status === 'voided' ? 'voided' : ''}" data-history-id="${escapeHtml(h.id)}">
          <span><strong>${escapeHtml(h.orderNo)}</strong><small>${escapeHtml(h.externalOrderNo ? `${platformLabel(h.orderSource)} · ${h.externalOrderNo}` : h.slotName)} · ${escapeHtml(paymentLabel(h.pay))} · ${new Date(h.closedAt).toLocaleString()}</small></span>
          <span><b>${Number(h.total||h.subtotal||0)} GHS</b><small class="history-status">${historyStatusLabel(h)}</small></span>
        </button>`).join('')}
      </div>`;
    body.querySelectorAll('[data-history-id]').forEach(button=>{
      button.onclick = ()=> openHistoryOrder(button.dataset.historyId);
    });
  }
  function openHistory(){
    recoverIssuedSlotsToHistory();
    renderHistoryBody();
    document.getElementById('modalHistory').classList.add('open');
    refreshHistoryFromRemote().then(hasRemote=>{ if(hasRemote) renderHistoryBody(); });
  }
  function getFilteredHistory(){
    const text = historyFilterText.trim().toLowerCase();
    const today = new Date();
    today.setHours(0,0,0,0);
    return getHistory().filter(h=>{
      if(historyFilterToday && Number(h.closedAt || 0) < today.getTime()) return false;
      if(!text) return true;
      return String(h.orderNo || '').toLowerCase().includes(text)
        || String(h.slotName || '').toLowerCase().includes(text)
        || String(h.externalOrderNo || '').toLowerCase().includes(text)
        || String(h.orderSource || '').toLowerCase().includes(text)
        || String(h.voidReason || '').toLowerCase().includes(text);
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
  function clearHistoryFilters(){
    historyFilterText = '';
    historyFilterToday = false;
    const search = document.getElementById('hSearch');
    if(search) search.value = '';
    renderHistoryBody();
  }
  function closeHistory(){ document.getElementById('modalHistory').classList.remove('open'); }
  function selectedHistoryOrder(){
    return getHistory().find(entry=>entry.id === selectedHistoryOrderId) || null;
  }
  function openHistoryOrder(id){
    const entry = getHistory().find(item=>item.id === id);
    if(!entry) return;
    selectedHistoryOrderId = entry.id;
    document.getElementById('historyDetailTitle').textContent = `Order ${entry.orderNo}`;
    const voided = entry.status === 'voided';
    document.getElementById('hdVoid').disabled = voided;
    document.getElementById('hdVoid').textContent = voided ? 'Order Voided' : 'Void Order';
    document.getElementById('historyDetailBody').innerHTML = `
      <div class="history-detail-meta">
        <div><small>Order number</small><strong>${escapeHtml(entry.orderNo)}</strong></div>
        <div><small>Slot</small><strong>${escapeHtml(entry.slotName)}</strong></div>
        <div><small>Payment</small><strong>${escapeHtml(paymentLabel(entry.pay))}</strong></div>
        <div><small>Order source</small><strong>${escapeHtml(platformLabel(entry.orderSource))}</strong></div>
        ${entry.externalOrderNo ? `<div><small>Platform reference</small><strong>${escapeHtml(entry.externalOrderNo)}</strong></div>` : ''}
        ${entry.finalChannel === 'direct' ? `<div><small>Converted delivery</small><strong>${escapeHtml(entry.fulfilment === 'customer-rider' ? 'Customer-arranged rider' : 'BurgerKiss delivery')}</strong></div><div><small>Platform refund</small><strong>Expected / Pending</strong></div>` : ''}
        <div><small>Packaging</small><strong>${entry.packMode === 'split' ? 'Packed separately' : 'Packed together'}</strong></div>
        <div><small>Created</small><strong>${new Date(entry.createdAt).toLocaleString()}</strong></div>
        <div><small>Issued</small><strong>${new Date(entry.closedAt).toLocaleString()}</strong></div>
      </div>
      ${voided ? `<div class="void-notice"><strong>VOIDED ORDER</strong><span>${escapeHtml(entry.voidReason)}</span><small>${new Date(entry.voidedAt).toLocaleString()} · ${escapeHtml(entry.voidedBy || 'POS terminal')}</small></div>` : ''}
      ${historyItemsHtml(entry)}
      <div class="history-totals">
        <div><span>Subtotal</span><b>${entry.subtotal} GHS</b></div>
        <div><span>Discount (${Math.round((entry.discountRate||0)*100)}%)</span><b>-${entry.discount||0} GHS</b></div>
        <div class="total"><span>${voided ? 'Original total' : 'Total'}</span><b>${entry.total} GHS</b></div>
      </div>`;
    document.getElementById('modalHistoryDetail').classList.add('open');
  }
  function closeHistoryOrder(){
    document.getElementById('modalHistoryDetail').classList.remove('open');
    selectedHistoryOrderId = null;
  }
  function historyReceiptHtml(entry){
    return `<div class="receipt-archive">
      <div><b>BurgerKiss – Receipt</b></div>
      <div>Order: <b>${escapeHtml(entry.orderNo)}</b></div>
      <div>Date: ${new Date(entry.closedAt).toLocaleString()}</div>
      <div>Payment: ${escapeHtml(paymentLabel(entry.pay))}</div>
      <div>Packaging: ${entry.packMode === 'split' ? 'Packed separately' : 'Packed together'}</div>
      <hr>${historyItemsHtml(entry)}
      <div class="sumline"><span>Subtotal</span><b>${entry.subtotal} GHS</b></div>
      <div class="sumline"><span>Discount</span><b>-${entry.discount||0} GHS</b></div>
      <div class="sumline"><span>Total</span><b>${entry.total} GHS</b></div>
      ${entry.status === 'voided' ? '<div class="receipt-void">VOIDED – NOT VALID FOR PAYMENT</div>' : ''}
    </div>`;
  }
  function reprintHistoryOrder(){
    const entry = selectedHistoryOrder();
    if(!entry) return;
    const html = historyReceiptHtml(entry);
    document.getElementById('receiptBody').innerHTML = html;
    document.getElementById('printArea').innerHTML = html;
    document.getElementById('modalReceipt').classList.add('open');
  }
  function requestVoidReason(){
    return new Promise(resolve=>{
      const host = ensureDialogHost();
      document.getElementById('appDialogTitle').textContent = 'Void order';
      document.getElementById('appDialogBody').innerHTML = `
        <p class="dialog-warning">The order remains permanently visible in history. Enter a mandatory reason.</p>
        <select id="voidReasonPreset" class="dialog-field">
          <option value="">Select reason…</option><option>Customer cancelled</option><option>Wrong item entered</option>
          <option>Duplicate order</option><option>Payment failed</option><option>Manager correction</option><option value="custom">Other reason</option>
        </select>
        <input id="voidReasonCustom" class="dialog-field hidden" placeholder="Enter reason" maxlength="160">
        <div id="voidReasonError" class="field-error"></div>
        <div class="dialog-actions"><button class="x" id="dlgCancel">Cancel</button><button class="x danger-link" id="dlgConfirm">Void Order</button></div>`;
      host.classList.add('open');
      const preset = document.getElementById('voidReasonPreset');
      const custom = document.getElementById('voidReasonCustom');
      preset.onchange = ()=>{ custom.classList.toggle('hidden', preset.value !== 'custom'); if(preset.value === 'custom') custom.focus(); };
      document.getElementById('dlgCancel').onclick = ()=>{ closeDialog(); resolve(null); };
      document.getElementById('dlgConfirm').onclick = ()=>{
        const reason = (preset.value === 'custom' ? custom.value : preset.value).trim();
        if(!reason){ document.getElementById('voidReasonError').textContent = 'A void reason is required.'; return; }
        closeDialog(); resolve(reason);
      };
    });
  }
  function voidHistoryOrder(id, reason){
    const cleanReason = String(reason || '').trim();
    if(!cleanReason) return null;
    const history = getHistory();
    const target = history.find(item=>item.id === id);
    if(!target || target.status === 'voided') return null;
    target.status = 'voided';
    target.voidReason = cleanReason;
    target.voidedAt = Date.now();
    target.voidedBy = window.BK_ACCESS && BK_ACCESS.actor ? BK_ACCESS.actor() : (window.BK_TERMINAL_NAME || window.BK_SYNC_FORCE_SLOT || 'POS terminal');
    saveHistory(history);
    saveHistoryRemote(target);
    const state = BK_STATE.getState();
    const activeSlot = state.slots.find(slot=>slot.orderNo === target.orderNo);
    if(activeSlot){ activeSlot.voided = true; activeSlot.voidReason = cleanReason; BK_STATE.setState(state); renderSlotsBar(); renderIssue(); }
    return target;
  }
  function voidSelectedHistoryOrder(){
    const entry = selectedHistoryOrder();
    if(!entry || entry.status === 'voided') return;
    requestVoidReason().then(reason=>{
      if(!reason) return;
      const target = voidHistoryOrder(entry.id, reason);
      if(!target) return;
      openHistoryOrder(target.id);
      renderHistoryBody();
    });
  }
  function dateInputValue(date){
    const d = date instanceof Date ? date : new Date(date || Date.now());
    const pad = n=>String(n).padStart(2,'0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  }
  function dailyReportData(dateValue){
    const selected = String(dateValue || dateInputValue(new Date()));
    const orders = getHistory().filter(entry=>dateInputValue(entry.closedAt) === selected);
    const completed = orders.filter(entry=>entry.status !== 'voided');
    const voided = orders.filter(entry=>entry.status === 'voided');
    const sum = (list, field)=>list.reduce((total, entry)=>total + Number(entry[field] || 0), 0);
    const netSales = sum(completed, 'total');
    return {
      date:selected, orders, completed, voided, netSales,
      cashTotal:sum(completed.filter(entry=>entry.pay === 'cash'), 'total'),
      momoTotal:sum(completed.filter(entry=>entry.pay === 'momo'), 'total'),
      boltTotal:sum(completed.filter(entry=>entry.pay === 'bolt'), 'total'),
      hubtelTotal:sum(completed.filter(entry=>entry.pay === 'hubtel'), 'total'),
      chowdeckTotal:sum(completed.filter(entry=>entry.pay === 'chowdeck'), 'total'),
      convertedOrders:completed.filter(entry=>entry.finalChannel === 'direct').length,
      discounts:sum(completed, 'discount'),
      voidValue:sum(voided, 'total'),
      average:completed.length ? Math.round(netSales / completed.length) : 0
    };
  }
  function dailyReportHtml(report){
    return `<div class="daily-report">
      <div class="report-heading"><span>Business date</span><strong>${escapeHtml(report.date)}</strong></div>
      <div class="report-metrics">
        <div><small>Net sales</small><strong>${report.netSales} GHS</strong></div>
        <div><small>Cash</small><strong>${report.cashTotal} GHS</strong></div>
        <div><small>MoMo</small><strong>${report.momoTotal} GHS</strong></div>
        <div><small>Bolt</small><strong>${report.boltTotal} GHS</strong></div>
        <div><small>Hubtel</small><strong>${report.hubtelTotal} GHS</strong></div>
        <div><small>Chowdeck</small><strong>${report.chowdeckTotal} GHS</strong></div>
        <div><small>Converted online orders</small><strong>${report.convertedOrders}</strong></div>
        <div><small>Completed orders</small><strong>${report.completed.length}</strong></div>
        <div><small>Discounts</small><strong>${report.discounts} GHS</strong></div>
        <div><small>Average order</small><strong>${report.average} GHS</strong></div>
        <div class="void-metric"><small>Voided orders</small><strong>${report.voided.length}</strong></div>
        <div class="void-metric"><small>Voided value</small><strong>${report.voidValue} GHS</strong></div>
      </div>
      <div class="report-orders"><h3>Order audit</h3>${report.orders.length ? report.orders.map(entry=>`
        <div class="report-order ${entry.status === 'voided' ? 'voided' : ''}"><span><b>${escapeHtml(entry.orderNo)}</b><small>${escapeHtml(paymentLabel(entry.pay))}${entry.voidReason ? ` · ${escapeHtml(entry.voidReason)}` : ''}</small></span><strong>${entry.total} GHS</strong></div>`).join('') : '<div class="empty-state">No orders for this date.</div>'}</div>
    </div>`;
  }
  function openDailyReport(){
    const input = document.getElementById('reportDate');
    if(!input.value) input.value = dateInputValue(new Date());
    renderDailyReport();
    document.getElementById('modalDailyReport').classList.add('open');
    refreshHistoryFromRemote().then(()=>renderDailyReport());
  }
  function renderDailyReport(){
    const input = document.getElementById('reportDate');
    document.getElementById('dailyReportBody').innerHTML = dailyReportHtml(dailyReportData(input && input.value));
  }
  function closeDailyReport(){ document.getElementById('modalDailyReport').classList.remove('open'); }
  function exportDailyReportCsv(){
    const report = dailyReportData(document.getElementById('reportDate').value);
    const rows = [['orderNo','status','source','platformReference','payment','fulfilment','refundStatus','issuedAt','subtotal','discount','total','voidReason']];
    report.orders.forEach(entry=>rows.push([entry.orderNo,entry.status,entry.orderSource,entry.externalOrderNo,entry.pay,entry.fulfilment,entry.refundStatus,new Date(entry.closedAt).toISOString(),entry.subtotal,entry.discount,entry.total,entry.voidReason]));
    rows.push([],['SUMMARY'],['netSales',report.netSales],['cash',report.cashTotal],['momo',report.momoTotal],['bolt',report.boltTotal],['hubtel',report.hubtelTotal],['chowdeck',report.chowdeckTotal],['convertedOnlineOrders',report.convertedOrders],['discounts',report.discounts],['completedOrders',report.completed.length],['voidedOrders',report.voided.length],['voidedValue',report.voidValue]);
    const csv = rows.map(row=>row.map(value=>`"${String(value == null ? '' : value).replace(/"/g,'""')}"`).join(',')).join('\n');
    downloadFile(`bk-daily-report-${report.date}.csv`, csv, 'text/csv');
  }
  function printDailyReport(){
    const report = dailyReportData(document.getElementById('reportDate').value);
    document.getElementById('printArea').innerHTML = `<h2>BurgerKiss – Daily Sales Report</h2>${dailyReportHtml(report)}`;
    window.print();
  }
  function downloadFile(name, content, type){
    const blob = new Blob([content], {type});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  }
  function exportHistoryJson(){
    refreshHistoryFromRemote().finally(()=>{
      downloadFile(`bk-history-${Date.now()}.json`, JSON.stringify(getHistory(), null, 2), 'application/json');
    });
  }
  function exportHistoryCsv(){
    const writeCsv = ()=>{
    const hist = getHistory();
    const rows = [['orderNo','slotName','status','pay','issued','createdAt','closedAt','subtotal','discount','total','packMode','voidReason','voidedAt','voidedBy','combos']];
    hist.forEach(h=> rows.push([h.orderNo,h.slotName,h.status,h.pay,h.issued,h.createdAt,h.closedAt,h.subtotal,h.discount,h.total,h.packMode,h.voidReason,h.voidedAt,h.voidedBy,h.combos]));
    const csv = rows.map(r=> r.map(v=> `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    downloadFile(`bk-history-${Date.now()}.csv`, csv, 'text/csv');
    };
    refreshHistoryFromRemote().finally(writeCsv);
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
    const {slots, active} = BK_STATE.getState();
    const activeSlot = slots[active];
    const c = activeSlot ? BK_LOGIC.computeSlot(activeSlot) : {subtotal:0, combos:0};
    const activeRate = activeSlot ? Number(activeSlot.discountRate) || 0 : 0;
    const activeDiscount = Math.round(c.subtotal * activeRate);
    setSlotTotals(c.subtotal, activeDiscount, c.subtotal - activeDiscount);
    const mobileTotal = document.getElementById('mobileCartTotal');
    if(mobileTotal) mobileTotal.textContent = `${c.subtotal - activeDiscount} GHS`;
    const discountLabel = document.getElementById('currentDiscountLabel');
    if(discountLabel) discountLabel.textContent = activeDiscount > 0 ? `${Math.round(activeRate * 100)}% · -${activeDiscount} GHS · owner approved` : 'No discount';
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
    if(!st.slots.length){ infoDialog('No active order. Create a new order first.'); return; }
    const {slots, active} = BK_STATE.getState();
    const s = slots[active]; const c = BK_LOGIC.computeSlot(s);
    document.getElementById('sumTitle').textContent = `Summary – ${s.name}`;
    const body = document.getElementById('sumBody');
    body.innerHTML = htmlGroupedRows(s.items) +
      `<div class="sumline"><span>Slot Subtotal</span><b>${c.subtotal} GHS</b></div>
       <div style="padding:8px 0;color:#9aa3ad;font-size:12px">
         Combos in slot: <b>${c.combos}</b> · Order Discount: ${Math.round((s.discountRate||0)*100)}%
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
    const {slots} = BK_STATE.getState();
    const idxs = Array.isArray(indices)? indices : [BK_STATE.getState().active];
    let subtotal=0, discount=0, combos=0;
    const sections = idxs.map(i=>{
      const s=slots[i]; const c=BK_LOGIC.computeSlot(s);
      subtotal += c.subtotal; combos += c.combos;
      discount += Math.round(c.subtotal * (Number(s.discountRate) || 0));
      return receiptSectionHtml(s);
    }).join('');
    const total = subtotal - discount;
    const html = `
      <div style="line-height:1.35">
        <div><b>BurgerKiss – Order</b></div>
        <div style="color:#9aa3ad">Combos: ${combos} · Approved order discounts included</div>
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
    const slot = slots[active];
    const protectedOrder = slot.issued || slot.pay !== 'unpaid';
    if(protectedOrder && window.BK_ACCESS && !BK_ACCESS.hasRole('supervisor')){
      infoDialog('A supervisor or owner is required to void a paid or issued order.');
      return;
    }
    const title = protectedOrder ? 'Void and remove order' : 'Delete draft order';
    const message = protectedOrder
      ? `${slot.name} is paid or issued. It cannot be deleted without a permanent void record.`
      : `Delete unpaid draft ${slot.name}?`;
    confirmDialog(title, message, {confirmLabel:protectedOrder ? 'Continue to void' : 'Delete draft'}).then(ok=>{
      if(!ok) return;
      if(!protectedOrder){ BK_STATE.deleteActive(); renderAll(); return; }
      requestVoidReason().then(reason=>{
        if(!reason) return;
        pushHistory(slotSnapshot(slot));
        const entry = getHistory().find(item=>item.orderNo === slot.orderNo);
        if(!entry) return;
        voidHistoryOrder(entry.id, reason);
        BK_STATE.deleteActive();
        renderAll();
      });
    });
  }

  function clearAllWithConfirm(){
    const protectedOpenOrders = BK_STATE.getState().slots.filter(slot=>slot.pay !== 'unpaid' && !slot.issued);
    if(protectedOpenOrders.length){
      infoDialog('Reset blocked: one or more paid orders have not been issued. Complete or void those orders individually first.');
      return;
    }
    confirmDialog('Reset all', 'Clear all draft slots? Completed orders remain in history.').then(ok=>{
      if(!ok) return;
      recoverIssuedSlotsToHistory();
      BK_STATE.clearAll();
      BK_STATE.addSlot().then(renderAll).catch(showOrderNumberError);
    });
  }

  function clearStorageWithConfirm(){
    confirmDialog('Clear storage', 'Clear saved state & price edits?').then(ok=>{
      if(!ok) return;
      BK_STATE.clearStorage();
      location.reload();
    });
  }

  function getPackagingRules(){
      const fallback = {
        drinkBagId: 'white_plastic_bag',
        foodBagSmallId: 'small_paper_bag',
        foodBagMediumId: 'medium_paper_bag',
        foodBagLargeId: 'large_paper_bag',
        mediumFoodMin: 2,
        largeFoodMin: 4,
        largeMenuChildMin: 2,
        drinksPerPlasticBag: 2,
        singleFoodUnitsPerLargeBag: 3
      };
      try{
        const parsed = JSON.parse(localStorage.getItem(PACK_RULES_KEY) || '{}');
        return Object.assign({}, fallback, parsed || {});
      }catch(e){ return fallback; }
    }
  function prettyName(raw){
      const txt = String(raw || '').trim();
      if(!txt) return '';
      if(txt.includes('_')) return txt.split('_').map(x=> x ? x[0].toUpperCase() + x.slice(1) : '').join(' ');
      return txt;
    }

  function renderAll(){
    bindProductSearch();
    bindCompactOrderNavigation();
    document.querySelectorAll('.catbar .tab[data-cat]').forEach(btn=> btn.classList.toggle('active', btn.dataset.cat === currentCat));
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
    openSummary, closeSummary, openHistory, closeHistory, openHistoryOrder, closeHistoryOrder, reprintHistoryOrder, voidSelectedHistoryOrder,
    exportHistoryJson, exportHistoryCsv, filterHistoryText, filterHistoryToday, clearHistoryFilters,
    openDailyReport, closeDailyReport, renderDailyReport, exportDailyReportCsv, printDailyReport, dailyReportData, voidHistoryOrder, archiveCompletedSlots, workflowNextState, buildHandoverPlan, handoverPlanHtml,
    openStockOverview, closeStockOverview,
    openReceipt, closeReceipt, copyReceipt, shareWA, printReceipt,
    openPrices, closePrices, savePrices, resetPrices,
    openProducts, closeProducts, addProductRow, saveProducts, resetProducts,
    openMenus, closeMenus, addMenuRow, saveMenus, resetMenus,
    openImages, closeImages, saveImages, resetImages,
    openStock, closeStock, saveStock, resetStock,
    openGroup, closeGroup, toggleGroup, groupMakeReceipt, groupMarkPaid, openOnlineOrderDialog, convertOnlineOrder,
    setCategory,
    renameActiveSlot, deleteActiveSlot, clearAllWithConfirm, clearStorageWithConfirm,
    infoDialog, confirmDialog, requestDiscountApproval, startNextOrder, quickStartNext, addNewOrderSlot, markIssued, goTab, focusSlot, setSlotPayment, requestSlotPayment, continueFromPayment, choosePackaging, continueOrderToKitchen
  };
})();
