// UI & Interaktionen – nutzt BK_STATE, BK_PRICES, BK_LOGIC
(function(){
  let currentCat = 'all';
  let groupSel = new Set();

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
      bacon_slice: { name: 'Bacon Slice', qty: 120, unit: 'slice' }
    },
    RECIPES: {
      hamburger: { bun: 1, beef_patty: 1 },
      cheeseburger: { bun: 1, beef_patty: 1, cheese_slice: 1 },
      w6: { chicken_wing: 6 },
      w12: { chicken_wing: 12 },
      w24: { chicken_wing: 24 },
      fr_std: { fries_portion: 1 },
      fr_lg: { fries_portion: 2 },
      x_patty: { beef_patty: 1 },
      x_cheese: { cheese_slice: 1 },
      x_bacon: { bacon_slice: 1 },
      x_egg: { egg: 1 },
      x_omelet: { egg: 2 },
      d_coconut: { coconut_fresh: 1 },
      d_coke: { soda_can: 1 },
      d_fanta_o: { soda_can: 1 },
      d_fanta_l: { soda_can: 1 },
      d_sprite: { soda_can: 1 },
      d_ice_tea: { ice_tea: 1 },
      d_cw_btl: { coconut_water_bottle: 1 },
      d_club_s: { beer: 1 },
      d_club_l: { beer: 1 },
      d_guin: { beer: 1 }
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
    grid.innerHTML = '';
    const base = (Array.isArray(BK_DATA.BASE) && BK_DATA.BASE.length) ? BK_DATA.BASE : (BK_DATA.DEFAULT_BASE || []);
    if(base !== BK_DATA.BASE) BK_DATA.BASE = base;
    const items = base.filter(it => currentCat==='all' ? true : it.cat===currentCat);
    items.forEach(it=>{
      const b = document.createElement('button');
      b.className='item';
      const img = BK_IMAGES.get(it.id);
      if(img){
        b.classList.add('item-with-bg');
        b.style.backgroundImage = `url(${img})`;
      }else{
        b.classList.remove('item-with-bg');
        b.style.backgroundImage = '';
      }
      b.innerHTML = `<div class="name">${it.name}</div>
                     <div class="price">${it.cat==='burger'?'Single':'Price'}: ${BK_PRICES.getPrice(it.id)} GHS</div>
                     <span class="badge">+1</span>`;
      b.onclick = ()=>{
        const note = (document.getElementById('noteInput').value||'').trim();
        BK_STATE.addItem(it.id, note);
        document.getElementById('noteInput').value='';
        renderOrder();
        renderMake();
        refreshTotals();
      };
      grid.appendChild(b);
    });
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
    bar.querySelectorAll('.slot-chip').forEach(n=>n.remove());

    const controlIds = ['btnAddSlot', 'btnRenameSlot', 'btnDeleteSlot', 'activeSlotLabel'];
    const ctl = controlIds
      .map(id => document.getElementById(id))
      .filter(Boolean)
      .filter(el => el.parentElement === bar);
    ctl.forEach(c=>bar.removeChild(c));
    slots.forEach((s,i)=>{
      const el = document.createElement('span');
      el.className='chip slot-chip' + (i===active?' active':'');
      el.textContent = `${s.name} · ${s.orderNo || '-'}`;
      el.onclick = ()=>{ BK_STATE.setActive(i); renderOrder(); refreshTotals(); goTab('order'); };
      bar.appendChild(el);
    });
    ctl.forEach(c=>bar.appendChild(c));
  }

  function renderOrder(){
    const {slots, active} = BK_STATE.getState();
    const lines = document.getElementById('lines'); lines.innerHTML='';
    if(!slots.length){ setSlotTotals(0,0,0); return; }
    const s = slots[active];

    const counts = BK_LOGIC.groupCounts(s.items);
    Object.entries(counts).forEach(([key,qty])=>{
      const [id, note=''] = BK_LOGIC.parseItemKey(key);
      const prod = BK_DATA.BASE.find(x=>x.id===id);
      const row = document.createElement('div'); row.className='row';
      const safeKey = encodeURIComponent(key);
      row.innerHTML = `
        <span class="left">
          <button class="mini" onclick="BK_STATE.decItemForKey(decodeURIComponent('${safeKey}')); BK_UI.renderOrder(); BK_UI.renderMake(); BK_UI.refreshTotals();">−1</button>
          <b>${prod ? prod.name : id}</b> <small>× ${qty}${note?` · ${note}`:''}</small>
        </span>
        <span>${qty*BK_PRICES.getPrice(id)} GHS</span>
      `;
      lines.appendChild(row);
    });

    const c = BK_LOGIC.computeSlot(s);
    setSlotTotals(c.subtotal, 0, c.subtotal);
    ensureFlowAction('lines', '➡️ Go to Payment', ()=> goTab('pay'));
  }

  function renderMake(){
    const {slots} = BK_STATE.getState();
    const box = document.getElementById('makeList');
    box.querySelectorAll('.slot-card').forEach(n=>n.remove());
    slots.forEach((s,i)=>{
      const c = BK_LOGIC.computeSlot(s);
      const card = document.createElement('div'); card.className='slot-card';
      card.innerHTML = `
        <div class="slot-head">
          <div><span class="label">${s.name}</span> · #${s.orderNo || '-'} · ${c.subtotal} GHS · Combos: ${c.combos} · In kitchen: ${formatAge(s.createdAt)}</div>
          <div><button onclick="BK_STATE.setActive(${i}); BK_UI.renderOrder(); BK_UI.refreshTotals();">Focus</button></div>
        </div>
        <div class="todo" id="todo-${i}"></div>`;
      box.appendChild(card);
      const list = card.querySelector(`#todo-${i}`);
      s.items.forEach((it,idx)=>{
        const p = BK_DATA.BASE.find(x=>x.id===it.itemId);
        const li = document.createElement('div'); li.className='li';
        li.innerHTML = `
          <input type="checkbox" ${it.done?'checked':''} onchange="BK_STATE.toggleDone(${i},${idx},this.checked); BK_UI.renderIssue();">
          <span>${p ? p.name : it.itemId}${it.note?` · <small>${it.note}</small>`:''}</span>
          <span style="margin-left:auto">${BK_PRICES.getPrice((p&&p.id)||it.itemId)} GHS</span>`;
        list.appendChild(li);
      });
    });
    ensureFlowAction('makeList', '➡️ Go to Issue', ()=> goTab('issue'));
  }

  function renderPay(){
    const {slots} = BK_STATE.getState();
    const box = document.getElementById('payList');
    box.querySelectorAll('.slot-card').forEach(n=>n.remove());
    slots.forEach((s,i)=>{
      const c = BK_LOGIC.computeSlot(s);
      const card = document.createElement('div'); card.className='slot-card';
      card.innerHTML = `
        <div class="slot-head">
          <div><span class="label">${s.name}</span> · #${s.orderNo || '-'} · ${c.subtotal} GHS</div>
          <div class="pay-status">
            <span>Status: ${s.pay.toUpperCase()}</span>
            <button onclick="BK_STATE.setPay(${i},'unpaid'); BK_UI.renderPay(); BK_UI.renderIssue(); BK_UI.refreshTotals();">Unpaid</button>
            <button onclick="BK_STATE.setPay(${i},'cash'); BK_UI.renderPay(); BK_UI.renderIssue(); BK_UI.refreshTotals();">Paid Cash</button>
            <button onclick="BK_STATE.setPay(${i},'momo'); BK_UI.renderPay(); BK_UI.renderIssue(); BK_UI.refreshTotals();">Paid MoMo</button>
          </div>
        </div>`;
      box.appendChild(card);
    });
    ensureFlowAction('payList', '➡️ Go to Make', ()=> goTab('make'));
  }

  function renderIssue(){
    const {slots} = BK_STATE.getState();
    const box = document.getElementById('issueList');
    if(!box) return;
    box.querySelectorAll('.slot-card').forEach(n=>n.remove());
    slots.forEach((s,i)=>{
      const allDone = s.items.length>0 && s.items.every(it=>!!it.done);
      const canIssue = s.pay !== 'unpaid' && allDone;
      const card = document.createElement('div'); card.className='slot-card';
      card.innerHTML = `
        <div class="slot-head">
          <div><span class="label">${s.name}</span> · #${s.orderNo || '-'} · Payment: ${s.pay.toUpperCase()} · Kitchen: ${allDone ? 'DONE' : 'OPEN'} · Elapsed: ${formatAge(s.createdAt)}</div>
          <div class="pay-status">
            <span>Status: ${s.issued ? 'ISSUED' : 'WAITING'}</span>
            <button ${canIssue ? '' : 'disabled'} onclick="BK_STATE.setIssued(${i}, true); BK_UI.renderIssue();">Mark Issued</button>
            <button onclick="BK_STATE.setIssued(${i}, false); BK_UI.renderIssue();">Undo</button>
          </div>
        </div>`;
      box.appendChild(card);
    });
    ensureFlowAction('issueList', '⬅️ Start Next Order', ()=> startNextOrder());
  }

  function goTab(name){
    const map = { order:'tabOrder', pay:'tabPay', make:'tabMake', issue:'tabIssue' };
    const id = map[name];
    const el = id && document.getElementById(id);
    if(el) el.click();
  }

  function ensureFlowAction(hostId, label, onClick){
    const host = document.getElementById(hostId);
    if(!host) return;
    let row = host.querySelector('.flow-action');
    if(!row){
      row = document.createElement('div');
      row.className = 'flow-action';
      row.style.marginTop = '10px';
      host.appendChild(row);
    }
    row.innerHTML = '';
    const btn = document.createElement('button');
    btn.className = 'x';
    btn.textContent = label;
    btn.onclick = onClick;
    row.appendChild(btn);
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
    const c = activeSlot ? BK_LOGIC.computeSlot(activeSlot) : {subtotal:0};
    setSlotTotals(c.subtotal, 0, c.subtotal);
    document.getElementById('grand').textContent = `${g.grand} GHS`;
    document.getElementById('combosPill').textContent = `Combos: ${g.totalCombos}`;
    document.getElementById('discountTag').textContent = g.discount>0 ? `Discount: ${Math.round(discountRate*100)}%` : 'No discount';
    document.getElementById('allSubtotal').textContent = `${g.grandSubtotal} GHS`;
    document.getElementById('allDiscount').textContent = `-${g.discount} GHS`;
    document.getElementById('allGrand').textContent = `${g.grand} GHS`;
    renderStock();
  }

  function renderStock(){
    if(!window.BK_STOCK) return;
    const payList = document.getElementById('payList');
    if(!payList) return;
    let host = document.getElementById('stockCard');
    if(!host){
      host = document.createElement('div');
      host.id = 'stockCard';
      host.className = 'slot-card';
      payList.appendChild(host);
    }
    const {slots} = BK_STATE.getState();
    const rows = BK_STOCK.getSnapshot(slots);

    host.innerHTML = '<div class="slot-head"><div><span class="label">Stock</span> · truck first, then storage</div></div>';
    rows.forEach(r=>{
      if(r.track === false) return;
      const row = document.createElement('div');
      row.className = 'row';
      const alerts = [
        r.refillNeeded ? 'REFILL FROM STORAGE' : '',
        r.buyNeeded ? 'BUY / ORDER' : ''
      ].filter(Boolean).join(' · ');
      row.innerHTML = `
        <span class="left"><b>${r.name}</b> <small>used ${r.used} ${r.unit || ''}</small></span>
        <span style="${alerts ? 'color:#ffb347' : ''}">truck ${r.leftTruck} · storage ${r.leftStorage} ${r.unit || ''}${alerts ? ` · ${alerts}` : ''}</span>
      `;
      host.appendChild(row);
    });
  }

  const openStock = ()=> BK_STOCK.openEditor();
  const closeStock = ()=> BK_STOCK.closeEditor();
  const saveStock = ()=>{
    const ok = BK_STOCK.saveEditor();
    if(!ok){ infoDialog('Invalid stock values.'); return; }
    renderStock();
    infoDialog('Stock saved locally.');
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
    openSummary, closeSummary,
    openReceipt, closeReceipt, copyReceipt, shareWA, printReceipt,
    openPrices, closePrices, savePrices, resetPrices,
    openProducts, closeProducts, addProductRow, saveProducts, resetProducts,
    openImages, closeImages, saveImages, resetImages,
    openStock, closeStock, saveStock, resetStock,
    openGroup, closeGroup, toggleGroup, groupMakeReceipt, groupMarkPaid,
    setCategory,
    renameActiveSlot, deleteActiveSlot, clearAllWithConfirm, clearStorageWithConfirm,
    infoDialog, confirmDialog, startNextOrder, quickStartNext, addNewOrderSlot
  };
})();
