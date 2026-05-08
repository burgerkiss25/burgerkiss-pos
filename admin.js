(function(){
  function bootFirebase(){
    if(!(window.BK_SYNC_ENABLED !== false && window.FIREBASE_CONFIG && window.firebase && window.firebase.auth)) return;
    const app = (window.firebase.apps && firebase.apps.length)
      ? firebase.app()
      : firebase.initializeApp(window.FIREBASE_CONFIG);
    firebase.auth(app).signInAnonymously().catch(function(e){
      console.warn('admin firebase auth anonymous failed:', e && e.message);
    });
  }

  bootFirebase();

  BK_PRICES.load();
  BK_PRODUCTS.load();
  BK_IMAGES.load();
  BK_STOCK.load();

  document.getElementById('btnPrices').onclick = ()=> BK_UI.openPrices();
  document.getElementById('pClose').onclick    = ()=> BK_UI.closePrices();
  document.getElementById('pSave').onclick     = ()=> BK_UI.savePrices();
  document.getElementById('pReset').onclick    = ()=> BK_UI.resetPrices();

  document.getElementById('btnProducts').onclick = ()=> BK_UI.openProducts();
  document.getElementById('prodClose').onclick   = ()=> BK_UI.closeProducts();
  document.getElementById('prodAdd').onclick     = ()=> BK_UI.addProductRow();
  document.getElementById('prodSave').onclick    = ()=> BK_UI.saveProducts();
  document.getElementById('prodReset').onclick   = ()=> BK_UI.resetProducts();

  document.getElementById('btnImages').onclick = ()=> BK_UI.openImages();
  document.getElementById('iClose').onclick    = ()=> BK_UI.closeImages();
  document.getElementById('iSave').onclick     = ()=> BK_UI.saveImages();
  document.getElementById('iReset').onclick    = ()=> BK_UI.resetImages();

  document.getElementById('btnStock').onclick = ()=> BK_UI.openStock();
  document.getElementById('btnIngredients').onclick = ()=> BK_STOCK.openEditor('ingredients');
  document.getElementById('btnRecipes').onclick = ()=> BK_STOCK.openEditor('recipes');
  document.getElementById('btnAddons').onclick = ()=> BK_STOCK.openEditor('addons');
  document.getElementById('sClose').onclick   = ()=> BK_UI.closeStock();
  document.getElementById('sSave').onclick    = ()=> BK_UI.saveStock();
  document.getElementById('sReset').onclick   = ()=> BK_UI.resetStock();
})();
