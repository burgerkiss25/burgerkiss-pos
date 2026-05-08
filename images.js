// Bild-Overrides (lokal + online editierbar)
(function(){
  const KEY = 'bk_images_v1';
  const DEFAULT_REMOTE_PATH = '/pos/config/images';
  let MAP = {};
  let DRAFT = {};
  let remoteSaveTimer = null;

  function clone(x){ try{ return JSON.parse(JSON.stringify(x)); }catch(e){ return {}; } }
  function cleanMap(input){
    const clean = {};
    if(!input || typeof input !== 'object') return clean;
    Object.keys(input).forEach(id=>{
      if(typeof input[id] === 'string' && input[id]) clean[id] = input[id];
    });
    return clean;
  }
  function remoteEnabled(){
    return !!(window.BK_SYNC_ENABLED !== false && window.FIREBASE_CONFIG && window.firebase && window.firebase.database);
  }
  function remotePath(){
    return (window.BK_IMAGES_PATH || DEFAULT_REMOTE_PATH).replace(/\/+$/,'');
  }
  function remoteRef(){
    if(!remoteEnabled()) return null;
    try{
      const app = (window.firebase.apps && firebase.apps.length)
        ? firebase.app()
        : firebase.initializeApp(window.FIREBASE_CONFIG);
      return firebase.database(app).ref(remotePath());
    }catch(e){ return null; }
  }
  function persistLocal(){
    try{ localStorage.setItem(KEY, JSON.stringify(MAP)); }catch(e){}
  }
  function applyRemote(raw){
    const next = cleanMap(raw && raw.map ? raw.map : raw);
    MAP = next;
    persistLocal();
    if(window.BK_UI && typeof BK_UI.renderAll === 'function') BK_UI.renderAll();
    return true;
  }
  function loadRemoteOnce(){
    const ref = remoteRef();
    if(!ref) return Promise.resolve(false);
    return ref.get().then(snap=>{
      const val = snap.val();
      if(!val) return false;
      return applyRemote(val);
    }).catch(e=>{
      console.warn('images remote load failed:', e && e.message);
      return false;
    });
  }
  function saveRemoteSoon(){
    const ref = remoteRef();
    if(!ref) return;
    if(remoteSaveTimer) clearTimeout(remoteSaveTimer);
    remoteSaveTimer = setTimeout(()=>{
      ref.set({ map: MAP, ts: Date.now() }).catch(e=>{
        console.warn('images remote save failed:', e && e.message);
      });
    }, 250);
  }

  function load(){
    try{ const raw = localStorage.getItem(KEY); if(raw) MAP = cleanMap(JSON.parse(raw)||{}); }catch(e){}
    loadRemoteOnce();
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
    DRAFT = clone(MAP);
    renderRows();
    document.getElementById('modalImages').classList.add('open');
  }

  function closeEditor(){
    document.getElementById('modalImages').classList.remove('open');
  }

  function save(){
    MAP = cleanMap(DRAFT);
    persistLocal();
    saveRemoteSoon();
    closeEditor();
    window.BK_UI.renderAll();
    alert(remoteEnabled() ? 'Images saved online.' : 'Images saved locally.');
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

  window.BK_IMAGES = { KEY, load, loadRemoteOnce, get, openEditor, closeEditor, save, reset, remotePath };
})();
