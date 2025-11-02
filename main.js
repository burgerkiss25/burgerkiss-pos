// Bootstrapping & Event-Wiring
(function(){
  BK_PRICES.load();
  const had = BK_STATE.load();
  if(!had) BK_STATE.addSlot();

  // Buttons
  document.getElementById('btnUndo').onclick = ()=>{ BK_STATE.undo(); BK_UI.renderAll(); };
  document.getElementById('btnReset').onclick= ()=>{ if(BK_STATE.clearAll()) BK_UI.renderAll(); };
  document.querySelectorAll('.disc').forEach(b=> b.onclick = ()=>{ BK_STATE.setDiscount(Number(b.dataset.disc)); BK_UI.renderAll(); });
  document.getElementById('btnClearDisc').onclick = ()=>{ BK_STATE.setDiscount(0); BK_UI.renderAll(); };
  document.getElementById('btnClearStorage').onclick = ()=> BK_STATE.clearStorage();

  document.getElementById('btnAddSlot').onclick = ()=>{ BK_STATE.addSlot(); BK_UI.renderAll(); };
  document.getElementById('btnRenameSlot').onclick = ()=>{ BK_STATE.renameActive(); BK_UI.renderAll(); };
  document.getElementById('btnDeleteSlot').onclick = ()=>{ BK_STATE.deleteActive(); BK_UI.renderAll(); };

  // Quick notes
  document.querySelectorAll('.quick-note').forEach(el=>{
    el.onclick = ()=>{ const inp=document.getElementById('noteInput'); inp.value=el.textContent; inp.focus(); };
  });

  // Tabs
  const showTab = (name)=>{
    document.getElementById('tab-order').classList.toggle('hidden', name!=='order');
    document.getElementById('tab-make').classList.toggle('hidden',  name!=='make');
    document.getElementById('tab-pay').classList.toggle('hidden',   name!=='pay');
    document.getElementById('tabOrder').classList.toggle('active',  name==='order');
    document.getElementById('tabMake').classList.toggle('active',   name==='make');
    document.getElementById('tabPay').classList.toggle('active',    name==='pay');
  };
  document.getElementById('tabOrder').onclick = ()=> showTab('order');
  document.getElementById('tabMake').onclick  = ()=> showTab('make');
  document.getElementById('tabPay').onclick   = ()=> showTab('pay');

  // Summary
  document.getElementById('btnSummary').onclick = ()=> BK_UI.openSummary();
  document.getElementById('sumClose').onclick   = ()=> BK_UI.closeSummary();

  // Receipt
  document.getElementById('btnReceipt').onclick = ()=> BK_UI.openReceipt();
  document.getElementById('rClose').onclick     = ()=> BK_UI.closeReceipt();
  document.getElementById('rCopy').onclick      = ()=> BK_UI.copyReceipt();
  document.getElementById('rWA').onclick        = ()=> BK_UI.shareWA();
  document.getElementById('rPrint').onclick     = ()=> BK_UI.printReceipt();

  // Prices
  document.getElementById('btnPrices').onclick = ()=> BK_UI.openPrices();
  document.getElementById('pClose').onclick    = ()=> BK_UI.closePrices();
  document.getElementById('pSave').onclick     = ()=> BK_UI.savePrices();
  document.getElementById('pReset').onclick    = ()=> BK_UI.resetPrices();

  // Group
  document.getElementById('btnGroup').onclick = ()=> BK_UI.openGroup();
  document.getElementById('gClose').onclick   = ()=> BK_UI.closeGroup();
  document.getElementById('gMake').onclick    = ()=> BK_UI.groupMakeReceipt();
  document.getElementById('gPaid').onclick    = ()=> BK_UI.groupMarkPaid();

  // Category tabs (NEU)
  document.querySelectorAll('.catbar .tab').forEach(btn=>{
    btn.onclick = () => BK_UI.setCategory(btn.dataset.cat);
  });

  // initial render
  BK_UI.renderAll();
})();
