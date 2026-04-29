// Bild-Overrides (lokal editierbar)
(function(){
  const KEY = 'bk_images_v1';
  let MAP = {};
  let DRAFT = {};

  function load(){
    try{ const raw = localStorage.getItem(KEY); if(raw) MAP = JSON.parse(raw)||{}; }catch(e){}
  }

  function get(id){
    return typeof MAP[id] === 'string' ? MAP[id] : '';
  }

  function renderRows(){
    const body = document.getElementById('imagesBody');
    body.innerHTML = '';
    BK_DATA.BASE.forEach(it=>{
      const row = document.createElement('div');
      row.className = 'row';
      const src = DRAFT[it.id] || '';
      row.innerHTML = `
        <span class="left">
          <b>${it.name}</b> <small>(${it.cat})</small>
        </span>
        <span class="left">
          <img class="img-preview ${src ? '' : 'hidden'}" id="img-prev-${it.id}" src="${src}" alt="${it.name}">
          <input type="file" accept="image/*" data-img-id="${it.id}">
          <button class="mini" data-remove-id="${it.id}">Remove</button>
        </span>
      `;
      body.appendChild(row);
    });

    body.querySelectorAll('input[data-img-id]').forEach(inp=>{
      inp.onchange = ()=>{
        const file = inp.files && inp.files[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onload = ()=>{
          const id = inp.dataset.imgId;
          DRAFT[id] = String(reader.result || '');
          const prev = document.getElementById(`img-prev-${id}`);
          if(prev){ prev.src = DRAFT[id]; prev.classList.remove('hidden'); }
        };
        reader.readAsDataURL(file);
      };
    });

    body.querySelectorAll('button[data-remove-id]').forEach(btn=>{
      btn.onclick = ()=>{
        const id = btn.dataset.removeId;
        DRAFT[id] = '';
        const prev = document.getElementById(`img-prev-${id}`);
        if(prev){ prev.src = ''; prev.classList.add('hidden'); }
      };
    });
  }

  function openEditor(){
    DRAFT = Object.assign({}, MAP);
    renderRows();
    document.getElementById('modalImages').classList.add('open');
  }

  function closeEditor(){
    document.getElementById('modalImages').classList.remove('open');
  }

  function save(){
    const clean = {};
    Object.keys(DRAFT).forEach(id=>{
      if(typeof DRAFT[id] === 'string' && DRAFT[id]) clean[id] = DRAFT[id];
    });
    MAP = clean;
    localStorage.setItem(KEY, JSON.stringify(MAP));
    closeEditor();
    window.BK_UI.renderAll();
    alert('Images saved locally.');
  }

  function reset(){
    if(!confirm('Reset all edited images?')) return;
    MAP = {};
    DRAFT = {};
    localStorage.removeItem(KEY);
    renderRows();
  }

  window.BK_IMAGES = { KEY, load, get, openEditor, closeEditor, save, reset };
})();
