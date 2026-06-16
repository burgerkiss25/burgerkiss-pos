// Emergency purchase page with purchaser PIN verification.
(function(){
  'use strict';
  let purchaser = null;

  function fillStaffOptions(){
    const select = document.getElementById('purchaseStaff');
    select.innerHTML = BK_ACCESS.STAFF.map(person=>`<option value="${BK_REPORTS.escapeHtml(person.id)}">${BK_REPORTS.escapeHtml(person.name)} · ${BK_REPORTS.escapeHtml(person.roleLabel)}</option>`).join('');
  }
  function fillItems(){
    const ingredients = BK_STOCK.getIngredients();
    document.getElementById('purchaseItems').innerHTML = Object.entries(ingredients).map(([id, item])=>`<option value="${BK_REPORTS.escapeHtml(item.name || id)}" data-id="${BK_REPORTS.escapeHtml(id)}"></option>`).join('');
  }
  function renderPurchaseHistory(){
    document.getElementById('purchaseHistory').innerHTML = BK_REPORTS.purchaseListHtml(BK_STOCK.getPurchases());
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
    const ingredients = BK_STOCK.getIngredients();
    const match = Object.entries(ingredients).find(([, item])=>String(item.name || '').toLowerCase() === String(data.name || '').toLowerCase());
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
  }
  document.addEventListener('bk-access-ready', init);
})();
