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

  // Protect against invalid merge duplicates in order.html.
  removeDuplicateIds([
    'tabOrder','tabMake','tabPay','tabIssue',
    'btnStockOverview','btnHistory','btnReceipt','btnPrices','btnProducts','btnImages','btnOnlineOrder',
    'btnClearDisc','btnClearStorage',
    'btnAddSlot',
    'modalProducts','modalImages','modalGroup','modalPrices','modalSummary','modalHistory','modalHistoryDetail','modalDailyReport','modalReceipt','modalStockOverview'
  ]);

  // Buttons
  document.querySelectorAll('.disc').forEach(b=> b.onclick = ()=>{
    const rate = Number(b.dataset.disc);
    BK_UI.requestDiscountApproval(rate);
  });
  document.getElementById('btnClearDisc').onclick = ()=> BK_UI.requestDiscountApproval(0);
  document.getElementById('btnAddSlot').onclick = ()=>{ if(!window.BK_ACCESS || BK_ACCESS.guardNewSale()) BK_UI.addNewOrderSlot(); };
  document.getElementById('btnWorkflowNewOrder').onclick = ()=>{ if(!window.BK_ACCESS || BK_ACCESS.guardNewSale()) BK_UI.addNewOrderSlot(); };

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
    ['order','make','pay','issue'].forEach(tab=> document.body.classList.toggle(`workflow-${tab}`, tab === name));
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
  document.getElementById('btnMakeBack').onclick = ()=> showTab('order');
  document.getElementById('tabMake').onclick  = ()=>{
    const state = BK_STATE.getState(); const slot = state.slots[state.active];
    if(slot && slot.items.length && !slot.sentToKitchen) BK_UI.continueOrderToKitchen(state.active); else showTab('make');
  };
  document.getElementById('tabPay').onclick   = ()=> showTab('pay');
  document.getElementById('tabIssue').onclick = ()=> showTab('issue');
  document.getElementById('btnPayBack').onclick = ()=> showTab('make');
  document.getElementById('btnIssueBack').onclick = ()=> showTab('pay');

  const closeOpenMenusExcept = activeDetails=>{
    document.querySelectorAll('details.more-menu[open], details.tool-menu[open], details.staff-session-menu[open]').forEach(details=>{
      if(details !== activeDetails) details.removeAttribute('open');
    });
  };
  document.addEventListener('click', event=>{
    const activeDetails = event.target.closest('details.more-menu, details.tool-menu, details.staff-session-menu');
    closeOpenMenusExcept(activeDetails || null);
  });
  document.addEventListener('click', event=>{
    const action = event.target.closest('#btnStockOverview, #btnHistory, #btnReceipt, #btnClearStorage');
    if(!action) return;
    action.closest('details')?.removeAttribute('open');
    if(action.id === 'btnStockOverview') BK_UI.openStockOverview();
    if(action.id === 'btnHistory') BK_UI.openHistory();
    if(action.id === 'btnReceipt') BK_UI.openReceipt();
    if(action.id === 'btnClearStorage'){
      if(window.BK_ACCESS && !BK_ACCESS.can('maintenance')) return BK_UI.infoDialog('Owner access is required.');
      BK_UI.clearStorageWithConfirm();
    }
  });
  document.querySelectorAll('.tool-panel button').forEach(el=>{
    el.addEventListener('click', ()=> el.closest('details')?.removeAttribute('open'));
  });

  // Summary
  document.getElementById('stockOverviewClose').onclick = ()=> BK_UI.closeStockOverview();
  document.getElementById('sumClose').onclick   = ()=> BK_UI.closeSummary();
  document.getElementById('hClose').onclick     = ()=> BK_UI.closeHistory();
  document.getElementById('hToday').onclick     = ()=> BK_UI.filterHistoryToday();
  document.getElementById('hYesterday').onclick = ()=> BK_UI.filterHistoryYesterday();
  document.getElementById('hClear').onclick     = ()=> BK_UI.clearHistoryFilters();
  document.getElementById('hSearch').oninput    = (e)=> BK_UI.filterHistoryText(e.target.value);
  document.getElementById('hDailyReport').onclick = ()=>{
    if(window.BK_ACCESS && !BK_ACCESS.can('daily_report')) return BK_UI.infoDialog('Staff access is required to open the daily report.');
    BK_UI.openDailyReport();
  };
  document.getElementById('hExportJson').onclick= ()=>{ if(!window.BK_ACCESS || BK_ACCESS.can('history_export')) BK_UI.exportHistoryJson(); };
  document.getElementById('hExportCsv').onclick = ()=>{ if(!window.BK_ACCESS || BK_ACCESS.can('history_export')) BK_UI.exportHistoryCsv(); };
  document.getElementById('hPurge').onclick      = ()=>{ if(window.BK_ACCESS && BK_ACCESS.can('history_purge')) BK_UI.openHistoryPurge(); };
  document.getElementById('hpClose').onclick     = ()=> BK_UI.closeHistoryPurge();
  document.getElementById('hpLoad').onclick      = ()=> BK_UI.renderHistoryPurgeList();
  document.getElementById('hpSelectAll').onclick = ()=> document.querySelectorAll('#hpList input[type="checkbox"]').forEach(input=>{ input.checked = true; });
  document.getElementById('hpForm').onsubmit     = (event)=> BK_UI.submitHistoryPurge(event);
  document.getElementById('hdClose').onclick     = ()=> BK_UI.closeHistoryOrder();
  document.getElementById('hdReprint').onclick   = ()=> BK_UI.reprintHistoryOrder();
  document.getElementById('hdVoid').onclick      = ()=>{
    if(window.BK_ACCESS && !BK_ACCESS.can('void_order')) return BK_UI.infoDialog('A supervisor or owner is required to void an order.');
    BK_UI.voidSelectedHistoryOrder();
  };
  document.getElementById('reportDate').onchange = ()=> BK_UI.renderDailyReport();
  document.getElementById('reportExport').onclick = ()=> BK_UI.exportDailyReportCsv();
  document.getElementById('reportPrint').onclick = ()=> BK_UI.printDailyReport();
  document.getElementById('reportClose').onclick = ()=> BK_UI.closeDailyReport();

  // Receipt
  document.getElementById('rClose').onclick     = ()=> BK_UI.closeReceipt();
  document.getElementById('rCopy').onclick      = ()=> BK_UI.copyReceipt();
  document.getElementById('rWA').onclick        = ()=> BK_UI.shareWA();
  document.getElementById('rPrint').onclick     = ()=> BK_UI.printReceipt();

  // Group
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
  document.body.classList.add('workflow-order');

  // initial render
  BK_UI.renderAll();
})();
