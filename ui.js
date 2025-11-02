// UI & Interaktionen – nutzt BK_STATE, BK_PRICES, BK_LOGIC
(function(){
  // NEU: Kategorie-Status
  let currentCat = 'all';

  function buildProducts(){
    const grid = document.getElementById('buttons');
    grid.innerHTML = ''; // bei Category-Wechsel neu aufbauen
    const items = BK_DATA.BASE.filter(it => currentCat==='all' ? true : it.cat===currentCat);
    items.forEach(it=>{
      const b = document.createElement('button');
      b.className='item';
      b.innerHTML = `<div class="name">${it.name}</div>
                     <div class="price">${it.cat==='burger'?'Single':'Price'}: ${BK_PRICES.getPrice(it.id)} GHS</div>
                     <span class="badge">+1</span>`;
      b.onclick = ()=>{
        const note = (document.getElementById('noteInput').value||'').trim();
        BK_STATE.addItem(it.id, note);
        document.getElementById('noteInput').value='';
        renderAll();
      };
      grid.appendChild(b);
    });
  }

  function setCategory(cat){
    currentCat = cat || 'all';
    document.querySelectorAll('.catbar .tab').forEach(btn=>{
      btn.classList.toggle('active', btn.dataset.cat===currentCat);
    });
    buildProducts(); // nur Grid neu
  }

  function renderSlotsBar(){
    const {slots, active} = BK_STATE.getState();
    const bar = document.getElementById('slotsBar');
    bar.querySelectorAll('.slot-chip').forEach(n=>n.remove());

    const ctl = Array.from(bar.children).slice(-3);
    ctl.forEach(c=>bar.removeChild(c));
    slots.forEach((s,i)=>{
      const el = document.createElement('span');
      el.className='chip slot-chip' + (i===active?' active':'');
      el.textContent = s.name;
      el.onclick = ()=>{ BK_STATE.setActive(i); renderAll(); };
      bar.appendChild(el);
    });
    ctl.forEach(c=>bar.appendChild(c));
  }

  function renderOrder(){
    const {slots, active} = BK_STATE.getState();
    const lines = document.getElementById('lines'); lines.innerHTML='';
    if(!slots.length){ setSlotTotals(0,0,0); setGlobalTotals(); return; }
    const s = slots[active];

    const counts = {};
    s.items.forEach(it=>{
      const key = it.itemId + (it.note ? '|' + it.note : '');
      counts[key]=(counts[key]||0)+1;
    });
    Object.entries(counts).forEach(([key,qty])=>{
      const [id, note=''] = key.split('|');
      const prod = BK_DATA.BASE.find(x=>x.id===id);
      const row = document.createElement('div'); row.className='row';
      row.innerHTML = `
        <span class="left">
          <button class="mini" onclick="BK_STATE.decItemForKey('${key.replace(/'/g,"\\'")}'); BK_UI.renderAll();">−1</button>
          <b>${prod.name}</b> <small>× ${qty}${note?` · ${note}`:''}</small>
        </span>
        <span>${qty*BK_PRICES.getPrice(id)} GHS</span>
      `;
      lines.appendChild(row);
    });

    const c = BK_LOGIC.computeSlot(s);
    setSlotTotals(c.subtotal, 0, c.subtotal);
    setGlobalTotals();
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
          <div><span class="label">${s.name}</span> · ${c.subtotal} GHS · Combos: ${c.combos}</div>
          <div><button onclick="BK_STATE.setActive(${i}); BK_UI.renderAll();">Focus</button></div>
        </div>
        <div class="todo" id="todo-${i}"></div>`;
      box.appendChild(card);
      const list = card.querySelector(`#todo-${i}`);
      s.items.forEach((it,idx)=>{
        const p = BK_DATA.BASE.find(x=>x.id===it.itemId);
        const li = document.createElement('div'); li.className='li';
        li.innerHTML = `
          <input type="checkbox" ${it.done?'checked':''} onchange="BK_STATE.toggleDone(${i},${idx},this.checked)">
          <span>${p.name}${it.note?` · <small>${it.note}</small>`:''}</span>
          <span style="margin-left:auto">${BK_PRICES.getPrice(p.id||it.itemId)} GHS</span>`;
        list.appendChild(li);
      });
    });
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
          <div><span class="label">${s.name}</span> · ${c.subtotal} GHS</div>
          <div class="pay-status">
            <span>Status: ${s.pay.toUpperCase()}</span>
            <button onclick="BK_STATE.setPay(${i},'unpaid'); BK_UI.renderPay();">Unpaid</button>
            <button onclick="BK_STATE.setPay(${i},'cash');   BK_UI.renderPay();">Paid Cash</button>
            <button onclick="BK_STATE.setPay(${i},'momo');   BK_UI.renderPay();">Paid MoMo</button>
          </div>
        </div>`;
      box.appendChild(card);
    });
  }

  function setSlotTotals(sub, disc, tot){
    document.getElementById('subtotal').textContent = `${sub} GHS`;
    document.getElementById('discount').textContent = `-${disc} GHS`;
    document.getElementById('total').textContent = `${tot} GHS`;
  }
  function setGlobalTotals(){
    const {slots, discountRate} = BK_STATE.getState();
    const g = BK_LOGIC.computeAll(slots, discountRate);
    document.getElementById('grand').textContent = `${g.grand} GHS`;
    document.getElementById('combosPill').textContent = `Combos: ${g.totalCombos}`;
    document.getElementById('discountTag').textContent = g.discount>0 ? `Discount: ${Math.round(discountRate*100)}%` : 'No discount';
    document.getElementById('allSubtotal').textContent = `${g.grandSubtotal} GHS`;
    document.getElementById('allDiscount').textContent = `-${g.discount} GHS`;
    document.getElementById('allGrand').textContent = `${g.grand} GHS`;
  }

  // Summary
  function openSummary(){
    const {slots, active, discountRate} = BK_STATE.getState();
    if(!slots.length) BK_STATE.addSlot();
    const s = slots[active]; const c = BK_LOGIC.computeSlot(s);
    document.getElementById('sumTitle').textContent = `Summary – ${s.name}`;
    const body = document.getElementById('sumBody');
    body.innerHTML = BK_LOGIC.groupHtml(s.items) +
      `<div class="sumline"><span>Slot Subtotal</span><b>${c.subtotal} GHS</b></div>
       <div style="padding:8px 0;color:#9aa3ad;font-size:12px">
         Combos in slot: <b>${c.combos}</b> · Global Discount: ${Math.round((discountRate||0)*100)}%
       </div>`;
    document.getElementById('modalSummary').classList.add('open');
  }
  function closeSummary(){ document.getElementById('modalSummary').classList.remove('open'); }

  // Receipt
  function openReceipt(indices){
    const {slots, discountRate} = BK_STATE.getState();
    const idxs = Array.isArray(indices)? indices : [(BK_STATE.getState().active)];
    let subtotal=0, combos=0;
    const sections = idxs.map(i=>{
      const s=slots[i]; const c=BK_LOGIC.computeSlot(s);
      subtotal += c.subtotal; combos += c.combos;
      return BK_LOGIC.sectionHtml(s);
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
    alert('Receipt copied.');
  }
  function shareWA(){
    const txt=document.getElementById('receiptBody').innerText;
    window.open('https://wa.me/?text='+encodeURIComponent(txt),'_blank');
  }
  function printReceipt(){ window.print(); }

  // Prices modal
  const openPrices = ()=> BK_PRICES.openEditor(false);
  const closePrices = ()=> BK_PRICES.closeEditor();
  const savePrices = ()=> BK_PRICES.save();
  const resetPrices = ()=> BK_PRICES.reset();

  // Group
  let groupSel = new Set();
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
    if(groupSel.size===0){ alert('Select at least one slot.'); return; }
    openReceipt([...groupSel]);
  }
  function groupMarkPaid(){
    if(groupSel.size===0){ alert('Select at least one slot.'); return; }
    const mode = prompt('Type "cash" or "momo" for all selected slots:','cash');
    if(mode!=='cash' && mode!=='momo'){ alert('Canceled'); return; }
    const st = BK_STATE.getState();
    [...groupSel].forEach(i=> st.slots[i].pay = mode);
    BK_STATE.setState(st);
    renderPay();
    alert(`Marked ${groupSel.size} slot(s) as paid (${mode.toUpperCase()}).`);
  }

  // Totals + Initialisierung
  function renderAll(){
    // Tabs initial korrekt markieren
    if(!document.querySelector('.catbar .tab.active')){
      const first = document.querySelector('.catbar .tab[data-cat="all"]');
      if(first) first.classList.add('active');
    }
    buildProducts();
    renderSlotsBar();
    renderOrder();
    renderMake();
    renderPay();
  }

  // expose
  window.BK_UI = {
    renderAll, renderPay,
    openSummary, closeSummary,
    openReceipt, closeReceipt, copyReceipt, shareWA, printReceipt,
    openPrices, closePrices, savePrices, resetPrices,
    openGroup, closeGroup, toggleGroup, groupMakeReceipt, groupMarkPaid,
    setCategory
  };
})();
