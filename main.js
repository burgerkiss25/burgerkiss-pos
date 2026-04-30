// Bootstrapping & Event-Wiring
(function(){
  BK_PRICES.load();
  BK_PRODUCTS.load();
  BK_IMAGES.load();
  BK_STOCK.load();
  const had = BK_STATE.load();
  if(!had) BK_STATE.addSlot();

  const forceSlot = !!(window.BK_SYNC_FORCE_SLOT && typeof window.BK_SYNC_FORCE_SLOT === 'string');


  function removeDuplicateIds(ids){
    ids.forEach(id=>{
      const nodes = document.querySelectorAll(`[id="${id}"]`);
      nodes.forEach((n, i)=>{ if(i>0) n.remove(); });
    });
  }

  // Schutz gegen fehlerhafte Merge-Duplikate in index.html
  removeDuplicateIds([
    'tabOrder','tabMake','tabPay','tabIssue',
    'btnSummary','btnHistory','btnReceipt','btnPrices','btnProducts','btnImages','btnGroup',
    'btnUndo','btnReset','btnClearDisc','btnClearStorage',
    'btnAddSlot','btnRenameSlot','btnDeleteSlot','activeSlotLabel',
    'modalProducts','modalImages','modalGroup','modalPrices','modalSummary','modalHistory','modalReceipt'
  ]);

  // Buttons
  document.getElementById('btnUndo').onclick = ()=>{ BK_STATE.undo(); BK_UI.renderOrder(); BK_UI.renderMake(); BK_UI.refreshTotals(); };
  document.getElementById('btnReset').onclick= ()=> BK_UI.clearAllWithConfirm();
  document.querySelectorAll('.disc').forEach(b=> b.onclick = ()=>{ BK_STATE.setDiscount(Number(b.dataset.disc)); BK_UI.refreshTotals(); });
  document.getElementById('btnClearDisc').onclick = ()=>{ BK_STATE.setDiscount(0); BK_UI.refreshTotals(); };
  document.getElementById('btnClearStorage').onclick = ()=> BK_UI.clearStorageWithConfirm();

  document.getElementById('btnAddSlot').onclick = ()=> BK_UI.addNewOrderSlot();
  document.getElementById('btnRenameSlot').onclick = ()=> BK_UI.renameActiveSlot();
  document.getElementById('btnDeleteSlot').onclick = ()=> BK_UI.deleteActiveSlot();

  if(forceSlot){
    ['btnRenameSlot', 'btnDeleteSlot'].forEach(id=>{
      const el = document.getElementById(id);
      el.classList.add('disabled');
      el.onclick = ()=> BK_UI.infoDialog(`Slot management disabled while force-slot mode is active (${window.BK_SYNC_FORCE_SLOT}).`);
    });
    const add = document.getElementById('btnAddSlot');
    add.classList.remove('disabled');
    add.onclick = ()=> BK_UI.addNewOrderSlot();
  }

  // Quick notes
  document.querySelectorAll('.quick-note').forEach(el=>{
    el.onclick = ()=>{ const inp=document.getElementById('noteInput'); inp.value=el.textContent; inp.focus(); };
  });

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

    if(name==='order') BK_UI.renderOrder();
    if(name==='make') BK_UI.renderMake();
    if(name==='pay') BK_UI.renderPay();
    if(name==='issue') BK_UI.renderIssue();
    BK_UI.refreshTotals();
  };
  document.getElementById('tabOrder').onclick = ()=> showTab('order');
  document.getElementById('tabMake').onclick  = ()=> showTab('make');
  document.getElementById('tabPay').onclick   = ()=> showTab('pay');
  document.getElementById('tabIssue').onclick = ()=> showTab('issue');

  // Summary
  document.getElementById('btnSummary').onclick = ()=> BK_UI.openSummary();
  document.getElementById('sumClose').onclick   = ()=> BK_UI.closeSummary();
  document.getElementById('btnHistory').onclick = ()=> BK_UI.openHistory();
  document.getElementById('hClose').onclick     = ()=> BK_UI.closeHistory();
  document.getElementById('hToday').onclick     = ()=> BK_UI.filterHistoryToday();
  document.getElementById('hClear').onclick     = ()=> BK_UI.clearHistory();
  document.getElementById('hSearch').oninput    = (e)=> BK_UI.filterHistoryText(e.target.value);
  document.getElementById('hExportJson').onclick= ()=> BK_UI.exportHistoryJson();
  document.getElementById('hExportCsv').onclick = ()=> BK_UI.exportHistoryCsv();

  // Receipt
  document.getElementById('btnReceipt').onclick = ()=> BK_UI.openReceipt();
  document.getElementById('rClose').onclick     = ()=> BK_UI.closeReceipt();
  document.getElementById('rCopy').onclick      = ()=> BK_UI.copyReceipt();
  document.getElementById('rWA').onclick        = ()=> BK_UI.shareWA();
  document.getElementById('rPrint').onclick     = ()=> BK_UI.printReceipt();

  // Group
  document.getElementById('btnGroup').onclick = ()=> BK_UI.openGroup();
  document.getElementById('gClose').onclick   = ()=> BK_UI.closeGroup();
  document.getElementById('gMake').onclick    = ()=> BK_UI.groupMakeReceipt();
  document.getElementById('gPaid').onclick    = ()=> BK_UI.groupMarkPaid();

  // Category tabs
  document.querySelectorAll('.catbar .tab[data-cat]').forEach(btn=>{
    btn.onclick = () => BK_UI.setCategory(btn.dataset.cat);
  });



  // initial render
  BK_UI.renderAll();
})();
