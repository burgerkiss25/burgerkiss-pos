// Shift tools page: history, closeout and staff cash checks.
(function(){
  'use strict';

  function renderShiftTools(){
    document.body.classList.remove('app-loading');
    const dateInput = document.getElementById('shiftReportDate');
    if(dateInput && !dateInput.value) dateInput.value = BK_REPORTS.dateInputValue(new Date());
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

  document.addEventListener('bk-access-ready', renderShiftTools);
  document.getElementById('shiftReportDate').onchange = renderReport;
})();
