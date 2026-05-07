// Bild-Overrides (lokal editierbar)
(function(){
  const KEY = 'bk_images_v1';
  let MAP = {};
  let DRAFT = {};
  let remoteSaveTimer = null;

  function remoteEnabled(){
    return !!(window.BK_SYNC_ENABLED !== false && window.FIREBASE_CONFIG && window.firebase && window.firebase.database && window.firebase.auth);
  }
  function normalizeMap(raw){
    const src = raw && typeof raw === 'object' && raw.map ? raw.map : raw;
    const out = {};
    if(!src || typeof src !== 'object') return out;
    Object.keys(src).forEach(id=>{
      if(typeof src[id] === 'string' && src[id]) out[id] = src[id];
    });
    return out;
  }
  function getRemoteRef(){
    if(!remoteEnabled()) return Promise.resolve(null);
    try{
      const app = (window.firebase.apps && firebase.apps.length)
        ? firebase.app()
        : firebase.initializeApp(window.FIREBASE_CONFIG);
      const auth = firebase.auth(app);
      const ready = auth.currentUser ? Promise.resolve() : auth.signInAnonymously().catch(function(e){
        console.warn('firebase images auth failed:', e && e.message);
      });
      const db = firebase.database(app);
      return ready.then(()=> db.ref('/pos/config/images'));
    }catch(e){ return Promise.resolve(null); }
  }
  function saveRemoteSoon(){
    if(!remoteEnabled()) return;
    if(remoteSaveTimer) clearTimeout(remoteSaveTimer);
    remoteSaveTimer = setTimeout(function(){
      getRemoteRef().then(function(ref){
        if(!ref) return;
        ref.set({map: MAP, ts: Date.now()}).catch(function(e){
          console.warn('images remote save failed:', e && e.message);
        });
      });
    }, 400);
  }
  function loadRemoteOnce(){
    if(!remoteEnabled()) return Promise.resolve(false);
    return getRemoteRef().then(function(ref){
      if(!ref) return false;
      return ref.get().then(function(snap){
        const val = snap.val();
        if(!val || typeof val !== 'object') return false;
        const remote = normalizeMap(val);
        MAP = remote;
        try{ localStorage.setItem(KEY, JSON.stringify(MAP)); }catch(e){}
        return true;
      });
    }).catch(function(e){
      console.warn('images remote load failed:', e && e.message);
      return false;
    });
  }

  function load(){
    try{ const raw = localStorage.getItem(KEY); if(raw) MAP = normalizeMap(JSON.parse(raw)); }catch(e){}
    loadRemoteOnce().then(function(changed){
      if(changed && window.BK_UI && typeof BK_UI.renderAll === 'function') BK_UI.renderAll();
    });
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
    saveRemoteSoon();
    closeEditor();
    window.BK_UI.renderAll();
    alert('Images saved online.');
  }

  function reset(){
    if(!confirm('Reset all edited images?')) return;
    MAP = {};
    DRAFT = {};
    localStorage.removeItem(KEY);
    saveRemoteSoon();
    renderRows();
    if(window.BK_UI && typeof BK_UI.renderAll === 'function') BK_UI.renderAll();
  }

  window.BK_IMAGES = { KEY, load, get, openEditor, closeEditor, save, reset };
})();
