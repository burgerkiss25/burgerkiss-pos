// Daily Sales page: closeout and order checks.
(function(){
  'use strict';

  function setReportDate(offset){
    const date = new Date();
    date.setDate(date.getDate() + offset);
    document.getElementById('shiftReportDate').value = BK_REPORTS.dateInputValue(date);
    renderReport();
  }
  function allowedStaffDate(value){
    const today = BK_REPORTS.dateInputValue(new Date());
    const y = new Date(); y.setDate(y.getDate() - 1);
    const yesterday = BK_REPORTS.dateInputValue(y);
    return value === today || value === yesterday;
  }
  function restrictDateInput(){
    const dateInput = document.getElementById('shiftReportDate');
    const current = window.BK_ACCESS && BK_ACCESS.current ? BK_ACCESS.current() : null;
    if(!dateInput || (current && current.role === 'owner')) return;
    const today = BK_REPORTS.dateInputValue(new Date());
    const y = new Date(); y.setDate(y.getDate() - 1);
    const yesterday = BK_REPORTS.dateInputValue(y);
    dateInput.min = yesterday;
    dateInput.max = today;
    if(!allowedStaffDate(dateInput.value)) dateInput.value = today;
  }
  function renderShiftTools(){
    document.body.classList.remove('app-loading');
    const dateInput = document.getElementById('shiftReportDate');
    if(dateInput && !dateInput.value) dateInput.value = BK_REPORTS.dateInputValue(new Date());
    restrictDateInput();
    renderReport();
    BK_REPORTS.refreshHistoryFromRemote().then(renderReport);
  }
  function renderReport(){
    const date = document.getElementById('shiftReportDate').value;
    const report = BK_REPORTS.dailyReportData(date);
    const host = document.getElementById('shiftReportBody');
    host.innerHTML = BK_REPORTS.dailyReportHtml(report);
    host.querySelectorAll('[data-history-id]').forEach(button=>{
      button.onclick = ()=>openOrderDetail(button.dataset.historyId, report.orders);
    });
  }
  function openOrderDetail(id, scopedOrders){
    const entry = (scopedOrders || []).find(item=>item.id === id);
    document.getElementById('shiftOrderDetailTitle').textContent = entry ? `Order ${entry.orderNo}` : 'Order detail';
    document.getElementById('shiftOrderDetailBody').innerHTML = BK_REPORTS.historyDetailHtml(entry);
    document.getElementById('shiftOrderDetailModal').classList.add('open');
  }
  function closeOrderDetail(){ document.getElementById('shiftOrderDetailModal').classList.remove('open'); }

  document.addEventListener('bk-access-ready', renderShiftTools);
  document.getElementById('shiftReportDate').onchange = ()=>{ restrictDateInput(); renderReport(); };
  document.getElementById('historyToday').onclick = ()=>setReportDate(0);
  document.getElementById('historyYesterday').onclick = ()=>setReportDate(-1);
  document.getElementById('shiftOrderDetailClose').onclick = closeOrderDetail;
})();
