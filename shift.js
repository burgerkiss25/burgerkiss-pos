// Shift tools page: history, closeout and staff cash checks.
(function(){
  'use strict';

  function renderShiftTools(){
    document.body.classList.remove('app-loading');
    const dateInput = document.getElementById('shiftReportDate');
    if(dateInput && !dateInput.value) dateInput.value = BK_REPORTS.dateInputValue(new Date());
    renderPurchaseTools();
    renderReport();
    renderHistory();
    BK_REPORTS.refreshHistoryFromRemote().then(()=>{ renderReport(); renderHistory(); });
  }
  function renderReport(){
    const date = document.getElementById('shiftReportDate').value;
    document.getElementById('shiftReportBody').innerHTML = BK_REPORTS.dailyReportHtml(BK_REPORTS.dailyReportData(date));
  }
  function renderHistory(){
    document.getElementById('shiftHistoryBody').innerHTML = BK_REPORTS.historyListHtml(BK_REPORTS.getHistory());
  }
  function renderPurchaseTools(){
    const ingredients = window.BK_STOCK && BK_STOCK.getIngredients ? BK_STOCK.getIngredients() : {};
    const list = document.getElementById('purchaseItems');
    if(list) list.innerHTML = Object.entries(ingredients).map(([id, item])=>`<option value="${BK_REPORTS.escapeHtml(item.name || id)}" data-id="${BK_REPORTS.escapeHtml(id)}"></option>`).join('');
    renderPurchases();
  }
  function renderPurchases(){
    const host = document.getElementById('shiftPurchaseBody');
    const purchases = window.BK_STOCK && BK_STOCK.getPurchases ? BK_STOCK.getPurchases() : [];
    host.innerHTML = BK_REPORTS.purchaseListHtml(purchases);
  }
  function savePurchase(event){
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    data.receiptInPurse = form.elements.receiptInPurse.checked;
    const ingredients = window.BK_STOCK && BK_STOCK.getIngredients ? BK_STOCK.getIngredients() : {};
    const match = Object.entries(ingredients).find(([, item])=>String(item.name || '').toLowerCase() === String(data.name || '').toLowerCase());
    if(match) data.ingredientId = match[0];
    const result = window.BK_STOCK && BK_STOCK.recordPurchase ? BK_STOCK.recordPurchase(data) : {ok:false, message:'Stock tools are not available.'};
    const message = document.getElementById('purchaseMessage');
    message.textContent = result.ok ? 'Purchase saved. Please keep the receipt in the purse.' : result.message;
    if(result.ok){ form.reset(); renderPurchaseTools(); renderReport(); }
  }

  document.addEventListener('bk-access-ready', renderShiftTools);
  document.getElementById('shiftReportDate').onchange = renderReport;
  document.getElementById('shiftPurchaseForm').onsubmit = savePurchase;
})();
