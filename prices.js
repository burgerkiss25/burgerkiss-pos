// Preis-Overrides (lokal editierbar)
(function(){
  const KEY = 'bk_prices_v1';
  let MAP = {};

  function load(){
    try{ const raw = localStorage.getItem(KEY); if(raw) MAP = JSON.parse(raw)||{}; }catch(e){}
  }
  function getPrice(id){
    const base = BK_DATA.BASE.find(x=>x.id===id).price;
    const ov = MAP[id];
    return (typeof ov==='number' && !isNaN(ov)) ? ov : base;
  }
  function openEditor(force){
    const modal = document.getElementById('modalPrices');
    const body  = document.getElementById('pricesBody');
    if(force) body.innerHTML = '';
    if(!body.innerHTML){
      BK_DATA.BASE.forEach(it=>{
        const row = document.createElement('div');
        row.className='row';
        const val = getPrice(it.id);
        row.innerHTML = `
          <span><b>${it.name}</b> <small>(${it.cat})</small></span>
          <span>
            <input type="number" step="1" min="0" value="${val}" data-id="${it.id}"
                   style="width:90px;background:#0f1318;border:1px solid #2a313b;color:#eaf0f6;border-radius:8px;padding:6px">
            <span style="margin-left:6px">GHS</span>
          </span>
        `;
        body.appendChild(row);
      });
    }else{
      body.querySelectorAll('input[data-id]').forEach(inp=>{
        inp.value = getPrice(inp.dataset.id);
      });
    }
    modal.classList.add('open');
  }
  function closeEditor(){ document.getElementById('modalPrices').classList.remove('open'); }
  function save(){
    const body = document.getElementById('pricesBody');
    body.querySelectorAll('input[data-id]').forEach(inp=>{
      const id = inp.dataset.id; const val = Number(inp.value);
      if(!isNaN(val) && val>=0){ MAP[id]=val; }
    });
    localStorage.setItem(KEY, JSON.stringify(MAP));
    closeEditor();
    window.BK_UI.renderAll(); // refresh
    alert('Prices saved locally.');
  }
  function reset(){
    if(!confirm('Reset all edited prices to defaults?')) return;
    MAP = {};
    localStorage.removeItem(KEY);
    openEditor(true);
  }

  // expose
  window.BK_PRICES = { load, getPrice, openEditor, closeEditor, save, reset, KEY };
})();
