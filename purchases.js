// Emergency purchase page with purchaser PIN verification.
(function(){
  'use strict';
  let purchaser = null;
  let purchaseRange = 'today';

  function fillStaffOptions(){
    const select = document.getElementById('purchaseStaff');
    select.replaceChildren(...BK_ACCESS.STAFF.map(person=>{
      const option = document.createElement('option');
      option.value = person.id;
      option.textContent = `${person.name} · ${person.roleLabel}`;
      return option;
    }));
  }
  function fillItems(){
    const ingredients = BK_STOCK.getIngredients();
    document.getElementById('purchaseItems').replaceChildren(...Object.entries(ingredients).map(([id, item])=>{
      const option = document.createElement('option');
      option.value = item.name || id;
      option.dataset.id = id;
      return option;
    }));
  }
  function selectedIngredientByName(name){
    const ingredients = BK_STOCK.getIngredients();
    return Object.entries(ingredients).find(([, item])=>String(item.name || '').toLowerCase() === String(name || '').toLowerCase()) || null;
  }
  function syncPurchaseUnit(){
    const match = selectedIngredientByName(document.getElementById('purchaseItem').value);
    if(!match) return;
    const item = match[1];
    const unitInput = document.getElementById('purchaseUnit');
    const packageInput = document.getElementById('purchasePackageSize');
    unitInput.value = item.purchase_unit || item.unit || unitInput.value;
    const firstOption = Array.isArray(item.purchase_options) ? item.purchase_options[0] : null;
    packageInput.value = firstOption && Number(firstOption.factor) !== 1 ? firstOption.factor : '';
    packageInput.placeholder = firstOption ? `${firstOption.label} = ${firstOption.factor} ${item.unit || ''}` : 'Optional conversion factor';
  }
  function purchaseDate(offset){ const date = new Date(); date.setDate(date.getDate() + offset); return BK_REPORTS.dateInputValue(date); }
  function visiblePurchases(){
    const selected = purchaseRange === 'yesterday' ? purchaseDate(-1) : purchaseDate(0);
    return BK_STOCK.getPurchases().filter(entry=>BK_REPORTS.dateInputValue(entry.ts) === selected);
  }
  function renderPurchaseHistory(){
    const host = document.getElementById('purchaseHistory');
    const purchases = visiblePurchases();
    const title = document.createElement('h3');
    title.textContent = 'Purchase audit';
    if(!purchases.length){
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = 'No emergency purchases recorded for this date.';
      host.replaceChildren(title, empty);
      return;
    }
    const rows = purchases.map(entry=>{
      const row = document.createElement('div');
      row.className = 'report-order purchase-audit-row';
      const copy = document.createElement('span');
      const name = document.createElement('b');
      name.textContent = entry.ingredient_name || entry.ingredientId || 'Purchase';
      const purchasedAt = document.createElement('small');
      purchasedAt.textContent = `${new Date(entry.ts).toLocaleString()} · ${(entry.staff && entry.staff.name) || 'Staff'}`;
      const receipt = entry.receiptInPurse ? 'Receipt in purse' : 'Receipt missing';
      const detail = document.createElement('small');
      detail.textContent = `${entry.qty} ${entry.unit} · ${entry.paymentSource} · ${receipt}${entry.note ? ` · ${entry.note}` : ''}`;
      copy.append(name, purchasedAt, detail);
      const amount = document.createElement('strong');
      amount.textContent = `${entry.amount} GHS`;
      row.append(copy, amount);
      return row;
    });
    host.replaceChildren(title, ...rows);
  }
  function exportPurchasesCsv(){
    const rows = [['date','staff','item','qty','unit','amount','paymentSource','receiptInPurse','note']];
    visiblePurchases().forEach(entry=>rows.push([new Date(entry.ts).toISOString(), entry.staff && entry.staff.name || '', entry.ingredient_name, entry.qty, entry.unit, entry.amount, entry.paymentSource, entry.receiptInPurse ? 'yes' : 'no', entry.note || '']));
    const csv = rows.map(row=>row.map(value=>`"${String(value == null ? '' : value).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], {type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `bk-purchases-${purchaseRange}-${Date.now()}.csv`; link.click();
    URL.revokeObjectURL(url);
  }
  async function confirmPurchaser(event){
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    purchaser = await BK_ACCESS.authorizeStaffPin(data.staffId, data.pin);
    const message = document.getElementById('purchaseAuthMessage');
    if(!purchaser){ message.textContent = 'Incorrect PIN for selected purchaser.'; return; }
    document.getElementById('purchaseActor').textContent = `Purchaser confirmed: ${purchaser.name}`;
    document.getElementById('purchaseEntryCard').classList.remove('hidden');
    message.textContent = '';
    fillItems();
    renderPurchaseHistory();
  }
  function savePurchase(event){
    event.preventDefault();
    if(!purchaser){ document.getElementById('purchaseMessage').textContent = 'Confirm the purchaser first.'; return; }
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    data.receiptInPurse = form.elements.receiptInPurse.checked;
    data.purchasedBy = purchaser;
    const match = selectedIngredientByName(data.name);
    if(match) data.ingredientId = match[0];
    const result = BK_STOCK.recordPurchase(data);
    const message = document.getElementById('purchaseMessage');
    message.textContent = result.ok ? `Purchase saved for ${purchaser.name}. Please keep the receipt in the purse.` : result.message;
    if(result.ok){ form.reset(); fillItems(); renderPurchaseHistory(); }
  }
  function init(){
    document.body.classList.remove('app-loading');
    fillStaffOptions();
    document.getElementById('purchaseAuthForm').onsubmit = confirmPurchaser;
    document.getElementById('purchaseEntryForm').onsubmit = savePurchase;
    document.getElementById('purchaseItem').oninput = syncPurchaseUnit;
    document.getElementById('purchaseToday').onclick = ()=>{ purchaseRange = 'today'; renderPurchaseHistory(); };
    document.getElementById('purchaseYesterday').onclick = ()=>{ purchaseRange = 'yesterday'; renderPurchaseHistory(); };
    document.getElementById('purchaseExport').onclick = exportPurchasesCsv;
  }
  document.addEventListener('bk-access-ready', init);
})();
