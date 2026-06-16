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
  let historyRange = 'today';
  function renderHistory(){
    document.getElementById('shiftHistoryBody').innerHTML = BK_REPORTS.historyListHtml(BK_REPORTS.visibleHistory(historyRange));
  }
  function renderPurchaseTools(){
    const host = document.getElementById('shiftPurchaseBody');
    const purchases = window.BK_STOCK && BK_STOCK.getPurchases ? BK_STOCK.getPurchases() : [];
    host.innerHTML = BK_REPORTS.purchaseListHtml(purchases);
  }


  document.addEventListener('bk-access-ready', renderShiftTools);
  document.getElementById('shiftReportDate').onchange = renderReport;
  document.getElementById('historyToday').onclick = ()=>{ historyRange = 'today'; renderHistory(); };
  document.getElementById('historyYesterday').onclick = ()=>{ historyRange = 'yesterday'; renderHistory(); };
  document.getElementById('historyAll').onclick = ()=>{ historyRange = 'all'; renderHistory(); };
})();
