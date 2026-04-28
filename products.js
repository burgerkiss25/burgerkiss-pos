// Produkt-Editor (lokal editierbar)
(function(){
  const KEY = 'bk_products_v1';
  let DRAFT = [];

  function clone(x){ return JSON.parse(JSON.stringify(x)); }

  function normalizeId(v){
    return String(v || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_\-]/g, '');
  }


  function sanitizeRows(rows){
    if(!Array.isArray(rows)) return [];
    const out = [];
    const used = new Set();
    rows.forEach(r=>{
      const id = normalizeId(r && r.id);
      const name = String((r && r.name) || '').trim();
      const price = Number(r && r.price);
      const cat = String((r && r.cat) || '').trim().toLowerCase();
      if(!id || !name || !Number.isFinite(price) || price < 0 || !cat || used.has(id)) return;
      used.add(id);
      out.push({id, name, price, cat});
    });
    return out;
  }

  function load(){
    try{
      const raw = localStorage.getItem(KEY);
      if(!raw) return;
      const arr = JSON.parse(raw);
      const clean = sanitizeRows(arr);
      if(clean.length){
        window.BK_DATA.BASE = clean;
      }else{
        // beschädigte lokale Produktliste zurücksetzen
        localStorage.removeItem(KEY);
      }
    }catch(e){
      localStorage.removeItem(KEY);
    }
  }

  function collectRows(){
    const body = document.getElementById('productsBody');
    const rows = [];
    body.querySelectorAll('[data-prod-row]').forEach(row=>{
      const id = normalizeId(row.querySelector('[data-field="id"]').value);
      const name = String(row.querySelector('[data-field="name"]').value || '').trim();
      const price = Number(row.querySelector('[data-field="price"]').value);
      const cat = String(row.querySelector('[data-field="cat"]').value || '').trim().toLowerCase();
      rows.push({id, name, price, cat});
    });
    return rows;
  }

  function rowHtml(p){
    return `
      <div class="row" data-prod-row>
        <span class="left" style="flex:1;display:grid;grid-template-columns:1.2fr 1.4fr .8fr .9fr;gap:8px">
          <input data-field="id" placeholder="id" value="${p.id||''}">
          <input data-field="name" placeholder="Name" value="${p.name||''}">
          <input data-field="price" type="number" step="1" min="0" placeholder="Preis" value="${Number.isFinite(p.price)?p.price:''}">
          <input data-field="cat" placeholder="Kategorie" value="${p.cat||''}">
        </span>
        <button class="mini" data-remove>Delete</button>
      </div>`;
  }

  function bindRowEvents(body){
    body.querySelectorAll('button[data-remove]').forEach(btn=>{
      btn.onclick = ()=>{
        const row = btn.closest('[data-prod-row]');
        if(row) row.remove();
      };
    });
  }

  function renderRows(){
    const body = document.getElementById('productsBody');
    body.innerHTML = DRAFT.map(rowHtml).join('');
    bindRowEvents(body);
  }

  function openEditor(){
    DRAFT = clone(window.BK_DATA.BASE || []);
    renderRows();
    document.getElementById('modalProducts').classList.add('open');
  }

  function closeEditor(){
    document.getElementById('modalProducts').classList.remove('open');
  }

  function addRow(){
    DRAFT.push({id:'', name:'', price:0, cat:'extra'});
    renderRows();
  }

  function save(){
    const rows = sanitizeRows(collectRows().filter(r=> r.id || r.name));
    if(!rows.length){ alert('Add at least one product.'); return; }

    const idSet = new Set();
    for(const r of rows){
      if(!r.id){ alert('Each product needs an id.'); return; }
      if(!r.name){ alert(`Product ${r.id} needs a name.`); return; }
      if(!Number.isFinite(r.price) || r.price < 0){ alert(`Invalid price for ${r.id}.`); return; }
      if(!r.cat){ alert(`Product ${r.id} needs a category.`); return; }
      if(idSet.has(r.id)){ alert(`Duplicate id: ${r.id}`); return; }
      idSet.add(r.id);
    }

    window.BK_DATA.BASE = rows;
    localStorage.setItem(KEY, JSON.stringify(rows));
    closeEditor();
    window.BK_UI.renderAll();
    alert('Products saved locally.');
  }

  function reset(){
    if(!confirm('Reset all local product edits?')) return;
    localStorage.removeItem(KEY);
    window.BK_DATA.BASE = clone(window.BK_DATA.DEFAULT_BASE || []);
    DRAFT = clone(window.BK_DATA.BASE);
    renderRows();
    window.BK_UI.renderAll();
  }

  window.BK_PRODUCTS = { KEY, load, openEditor, closeEditor, addRow, save, reset };
})();
