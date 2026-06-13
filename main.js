// Bootstrapping & Event-Wiring
(function(){
  BK_PRICES.load();
  BK_PRODUCTS.load();
  BK_MENUS.load();
  BK_IMAGES.load();
  BK_STOCK.load();
  BK_STATE.load();
  let stateReady = false;
  let entryHandled = false;
  const entryMode = new URLSearchParams(window.location.search).get('start');

  function handleOrderPageEntry(){
    if(entryHandled || !stateReady || !BK_ACCESS.current()) return;
    entryHandled = true;
    BK_UI.archiveCompletedSlots();
    const {slots} = BK_STATE.getState();
    document.body.classList.remove('app-loading');
    if(slots.length){
      history.replaceState(null, '', 'order.html');
      BK_UI.renderAll();
      return;
    }
    if(entryMode === 'walkin'){
      history.replaceState(null, '', 'order.html');
      if(BK_ACCESS.guardNewSale()) BK_UI.addNewOrderSlot();
      return;
    }
    if(entryMode === 'online'){
      history.replaceState(null, '', 'order.html');
      if(BK_ACCESS.guardNewSale()) BK_UI.openOnlineOrderDialog();
      return;
    }
    window.location.replace('index.html');
  }

  document.addEventListener('bk-access-ready', handleOrderPageEntry);
  BK_STATE.whenReady().then(function(){
    stateReady = true;
    handleOrderPageEntry();
  }).catch(function(error){
    document.body.classList.remove('app-loading');
    console.error('Initial order number allocation failed:', error && error.message);
    if(window.BK_UI) BK_UI.infoDialog('A new order could not be created because no unique order number could be reserved. Check the internet connection and reload.');
  });

  const forceSlot = !!(window.BK_SYNC_FORCE_SLOT && typeof window.BK_SYNC_FORCE_SLOT === 'string');


  function removeDuplicateIds(ids){
    ids.forEach(id=>{
      const nodes = document.querySelectorAll(`[id="${id}"]`);
      nodes.forEach((n, i)=>{ if(i>0) n.remove(); });
    });
  }

  // Schutz gegen fehlerhafte Merge-Duplikate in order.html
  removeDuplicateIds([
    'tabOrder','tabMake','tabPay','tabIssue',
    'btnSummary','btnStockOverview','btnHistory','btnDailyReport','btnReceipt','btnPrices','btnProducts','btnImages','btnGroup','btnOnlineOrder',
    'btnReset','btnClearDisc','btnClearStorage',
    'btnAddSlot','activeSlotLabel',
    'modalProducts','modalImages','modalGroup','modalPrices','modalSummary','modalHistory','modalHistoryDetail','modalDailyReport','modalReceipt','modalStockOverview'
  ]);

  // Buttons
  document.getElementById('btnReset').onclick= ()=> BK_UI.clearAllWithConfirm();
  document.querySelectorAll('.disc').forEach(b=> b.onclick = ()=>{
    const rate = Number(b.dataset.disc);
    if(rate > 0.03 && !(window.BK_ACCESS && BK_ACCESS.hasRole('supervisor'))){
      BK_UI.infoDialog('A supervisor or owner is required for discounts above 3%.');
      return;
    }
    BK_STATE.setDiscount(rate); BK_UI.refreshTotals();
  });
  document.getElementById('btnClearDisc').onclick = ()=>{ BK_STATE.setDiscount(0); BK_UI.refreshTotals(); };
  document.getElementById('btnClearStorage').onclick = ()=>{
    if(window.BK_ACCESS && !BK_ACCESS.can('maintenance')) return BK_UI.infoDialog('Owner access is required.');
    BK_UI.clearStorageWithConfirm();
  };

  document.getElementById('btnAddSlot').onclick = ()=>{ if(!window.BK_ACCESS || BK_ACCESS.guardNewSale()) BK_UI.addNewOrderSlot(); };

  if(forceSlot){
    const add = document.getElementById('btnAddSlot');
    add.classList.remove('disabled');
    add.onclick = ()=>{ if(!window.BK_ACCESS || BK_ACCESS.guardNewSale()) BK_UI.addNewOrderSlot(); };
  }

  const syncWorkflowA11y = (name)=>{
    const tabs = { order:'tabOrder', make:'tabMake', pay:'tabPay', issue:'tabIssue' };
    Object.entries(tabs).forEach(([key, id])=>{
      const el = document.getElementById(id);
      if(!el) return;
      if(key === name) el.setAttribute('aria-current', 'step');
      else el.removeAttribute('aria-current');
    });
  };

  // Tabs
  const showTab = (name)=>{
    document.getElementById('tab-order').classList.toggle('hidden', name!=='order');
    document.getElementById('tab-make').classList.toggle('hidden',  name!=='make');
    document.getElementById('tab-pay').classList.toggle('hidden',   name!=='pay');
    document.getElementById('tab-issue').classList.toggle('hidden', name!=='issue');
    document.getElementById('tabOrder').classList.toggle('active',  name==='order');
    document.getElementById('tabMake').classList.toggle('active',   name==='make');
    document.getElementById('tabPay').classList.toggle('active',    name==='pay');
    document.getElementById('tabIssue').classList.toggle('active',  name==='issue');
    syncWorkflowA11y(name);

    if(name==='order') BK_UI.renderOrder();
    if(name==='make') BK_UI.renderMake();
    if(name==='pay') BK_UI.renderPay();
    if(name==='issue') BK_UI.renderIssue();
    BK_UI.refreshTotals();
  };
  document.getElementById('tabOrder').onclick = ()=> showTab('order');
  document.getElementById('tabMake').onclick  = ()=>{
    const state = BK_STATE.getState(); const slot = state.slots[state.active];
    if(slot && slot.items.length && !slot.sentToKitchen) BK_UI.continueOrderToKitchen(state.active); else showTab('make');
  };
  document.getElementById('tabPay').onclick   = ()=> showTab('pay');
  document.getElementById('tabIssue').onclick = ()=> showTab('issue');

  document.querySelectorAll('.more-panel button, .more-panel a, .tool-panel button').forEach(el=>{
    el.addEventListener('click', ()=> el.closest('details')?.removeAttribute('open'));
  });

  // Summary
  document.getElementById('btnSummary').onclick = ()=> BK_UI.openSummary();
  document.getElementById('btnStockOverview').onclick = ()=> BK_UI.openStockOverview();
  document.getElementById('stockOverviewClose').onclick = ()=> BK_UI.closeStockOverview();
  document.getElementById('sumClose').onclick   = ()=> BK_UI.closeSummary();
  document.getElementById('btnHistory').onclick = ()=> BK_UI.openHistory();
  document.getElementById('hClose').onclick     = ()=> BK_UI.closeHistory();
  document.getElementById('hToday').onclick     = ()=> BK_UI.filterHistoryToday();
  document.getElementById('hClear').onclick     = ()=> BK_UI.clearHistoryFilters();
  document.getElementById('hSearch').oninput    = (e)=> BK_UI.filterHistoryText(e.target.value);
  document.getElementById('hExportJson').onclick= ()=>{ if(!window.BK_ACCESS || BK_ACCESS.can('history_export')) BK_UI.exportHistoryJson(); };
  document.getElementById('hExportCsv').onclick = ()=>{ if(!window.BK_ACCESS || BK_ACCESS.can('history_export')) BK_UI.exportHistoryCsv(); };
  document.getElementById('hdClose').onclick     = ()=> BK_UI.closeHistoryOrder();
  document.getElementById('hdReprint').onclick   = ()=> BK_UI.reprintHistoryOrder();
  document.getElementById('hdVoid').onclick      = ()=>{
    if(window.BK_ACCESS && !BK_ACCESS.can('void_order')) return BK_UI.infoDialog('A supervisor or owner is required to void an order.');
    BK_UI.voidSelectedHistoryOrder();
  };
  document.getElementById('btnDailyReport').onclick = ()=>{
    if(window.BK_ACCESS && !BK_ACCESS.can('daily_report')) return BK_UI.infoDialog('A supervisor or owner is required to open the daily report.');
    BK_UI.openDailyReport();
  };
  document.getElementById('reportDate').onchange = ()=> BK_UI.renderDailyReport();
  document.getElementById('reportExport').onclick = ()=> BK_UI.exportDailyReportCsv();
  document.getElementById('reportPrint').onclick = ()=> BK_UI.printDailyReport();
  document.getElementById('reportClose').onclick = ()=> BK_UI.closeDailyReport();

  // Receipt
  document.getElementById('btnReceipt').onclick = ()=> BK_UI.openReceipt();
  document.getElementById('rClose').onclick     = ()=> BK_UI.closeReceipt();
  document.getElementById('rCopy').onclick      = ()=> BK_UI.copyReceipt();
  document.getElementById('rWA').onclick        = ()=> BK_UI.shareWA();
  document.getElementById('rPrint').onclick     = ()=> BK_UI.printReceipt();

  // Group
  document.getElementById('btnGroup').onclick = ()=> BK_UI.openGroup();
  document.querySelectorAll('.online-order-trigger').forEach(button=>{
    button.onclick = ()=>{ if(!window.BK_ACCESS || BK_ACCESS.guardNewSale()) BK_UI.openOnlineOrderDialog(); };
  });
  document.getElementById('gClose').onclick   = ()=> BK_UI.closeGroup();
  document.getElementById('gMake').onclick    = ()=> BK_UI.groupMakeReceipt();
  document.getElementById('gPaid').onclick    = ()=> BK_UI.groupMarkPaid();


  // Category tabs
  document.querySelectorAll('.catbar .tab[data-cat]').forEach(btn=>{
    btn.onclick = () => BK_UI.setCategory(btn.dataset.cat);
  });



  syncWorkflowA11y('order');

  // initial render
  BK_UI.renderAll();
})();
