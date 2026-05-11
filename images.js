// Bild-Overrides (lokal + online editierbar)
(function(){
  const KEY = 'bk_images_v1';
  const DEFAULT_REMOTE_PATH = '/pos/config/images';
  const MAX_IMAGE_EDGE = 640;
  const JPEG_QUALITY = 0.72;
  let MAP = {};
  let DRAFT = {};
  let pendingImages = 0;
  let remoteSaveTimer = null;
  let remoteWatchStarted = false;
  let authPromise = null;
  let lastRemoteHash = '';

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
  function firebaseApp(){
    return (window.firebase.apps && firebase.apps.length)
      ? firebase.app()
      : firebase.initializeApp(window.FIREBASE_CONFIG);
  }
  function remoteRef(){
    if(!remoteEnabled()) return null;
    try{
      return firebase.database(firebaseApp()).ref(remotePath());
    }catch(e){ return null; }
  }
  function ensureAuth(){
    if(!remoteEnabled() || !window.firebase.auth) return Promise.resolve(true);
    if(authPromise) return authPromise;
    try{
      const auth = firebase.auth(firebaseApp());
      if(auth.currentUser) return Promise.resolve(true);
      authPromise = auth.signInAnonymously()
        .then(()=>true)
        .catch(e=>{
          authPromise = null;
          console.warn('images firebase auth failed:', e && e.message);
          return false;
        });
      return authPromise;
    }catch(e){
      console.warn('images firebase auth failed:', e && e.message);
      return Promise.resolve(false);
    }
  }
  function mapHash(map){
    try{ return JSON.stringify(cleanMap(map)); }catch(e){ return ''; }
  }
  function persistLocal(){
    try{
      localStorage.setItem(KEY, JSON.stringify(MAP));
      return { ok:true };
    }catch(e){
      console.warn('images local save failed:', e && e.message);
      return { ok:false, error:e };
    }
  }
  function renderPosIfAvailable(){
    if(window.BK_UI && typeof BK_UI.renderAll === 'function' && document.getElementById('buttons')) BK_UI.renderAll();
  }
  function notify(message){
    if(window.BK_UI && BK_UI.infoDialog) BK_UI.infoDialog(message);
    else alert(message);
  }
  function applyRemote(raw){
    const next = cleanMap(raw && raw.map ? raw.map : raw);
    const hash = mapHash(next);
    if(hash && hash === lastRemoteHash) return false;
    lastRemoteHash = hash;
    MAP = next;
    persistLocal();
    renderPosIfAvailable();
    return true;
  }
  function loadRemoteOnce(){
    const ref = remoteRef();
    if(!ref) return Promise.resolve(false);
    return ensureAuth().then(()=> ref.get()).then(snap=>{
      const val = snap.val();
      if(!val) return false;
      return applyRemote(val);
    }).catch(e=>{
      console.warn('images remote load failed:', e && e.message);
      return false;
    });
  }
  function watchRemote(){
    if(remoteWatchStarted) return true;
    const ref = remoteRef();
    if(!ref) return false;
    remoteWatchStarted = true;
    ensureAuth().then(()=>{
      ref.on('value', snap=>{
        const val = snap.val();
        if(!val) return;
        applyRemote(val);
      }, e=>{
        remoteWatchStarted = false;
        console.warn('images remote sync failed:', e && e.message);
        setTimeout(watchRemote, 3000);
      });
    }).catch(e=>{
      remoteWatchStarted = false;
      console.warn('images remote sync failed:', e && e.message);
      setTimeout(watchRemote, 3000);
    });
    return true;
  }
  function saveRemoteNow(){
    const ref = remoteRef();
    if(!ref) return Promise.resolve({ ok:false, skipped:true });
    if(remoteSaveTimer){ clearTimeout(remoteSaveTimer); remoteSaveTimer = null; }
    return ensureAuth()
      .then(()=> ref.set({ map: MAP, ts: Date.now() }))
      .then(()=>{ lastRemoteHash = mapHash(MAP); return { ok:true }; })
      .catch(e=>{
        console.warn('images remote save failed:', e && e.message);
        return { ok:false, error:e };
      });
  }
  function saveRemoteSoon(){
    const ref = remoteRef();
    if(!ref) return;
    if(remoteSaveTimer) clearTimeout(remoteSaveTimer);
    remoteSaveTimer = setTimeout(()=>{
      remoteSaveTimer = null;
      ensureAuth().then(()=> ref.set({ map: MAP, ts: Date.now() })).catch(e=>{
        console.warn('images remote save failed:', e && e.message);
      });
    }, 250);
  }

  function load(){
    try{ const raw = localStorage.getItem(KEY); if(raw) MAP = cleanMap(JSON.parse(raw)||{}); }catch(e){}
    lastRemoteHash = mapHash(MAP);
    loadRemoteOnce().finally(watchRemote);
  }

  function get(id){
    return typeof MAP[id] === 'string' ? MAP[id] : '';
  }

  function readFileAsDataUrl(file){
    return new Promise((resolve, reject)=>{
      const reader = new FileReader();
      reader.onload = ()=> resolve(String(reader.result || ''));
      reader.onerror = ()=> reject(reader.error || new Error('Could not read image file.'));
      reader.readAsDataURL(file);
    });
  }

  function loadImage(src){
    return new Promise((resolve, reject)=>{
      const img = new Image();
      img.onload = ()=> resolve(img);
      img.onerror = ()=> reject(new Error('Could not load image preview.'));
      img.src = src;
    });
  }

  function resizeImageDataUrl(src){
    return loadImage(src).then(img=>{
      const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height));
      if(scale >= 1 && src.length < 300000) return src;
      const width = Math.max(1, Math.round((img.naturalWidth || img.width) * scale));
      const height = Math.max(1, Math.round((img.naturalHeight || img.height) * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
    });
  }

  function fileToStoredImage(file){
    return readFileAsDataUrl(file).then(resizeImageDataUrl);
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
          <small id="img-status-${it.id}" class="muted"></small>
          <button class="mini" data-remove-id="${it.id}">Remove</button>
        </span>
      `;
      body.appendChild(row);
    });

    body.querySelectorAll('input[data-img-id]').forEach(inp=>{
      inp.onchange = ()=>{
        const file = inp.files && inp.files[0];
        if(!file) return;
        const id = inp.dataset.imgId;
        const status = document.getElementById(`img-status-${id}`);
        if(status) status.textContent = 'Preparing...';
        pendingImages += 1;
        inp.disabled = true;
        fileToStoredImage(file).then(dataUrl=>{
          DRAFT[id] = dataUrl;
          const prev = document.getElementById(`img-prev-${id}`);
          if(prev){ prev.src = DRAFT[id]; prev.classList.remove('hidden'); }
          if(status) status.textContent = 'Ready';
        }).catch(e=>{
          console.warn('image processing failed:', e && e.message);
          if(status) status.textContent = 'Image failed';
          notify('Image could not be loaded. Please try a different file.');
        }).finally(()=>{
          pendingImages = Math.max(0, pendingImages - 1);
          inp.disabled = false;
          inp.value = '';
        });
      };
    });

    body.querySelectorAll('button[data-remove-id]').forEach(btn=>{
      btn.onclick = ()=>{
        const id = btn.dataset.removeId;
        DRAFT[id] = '';
        const prev = document.getElementById(`img-prev-${id}`);
        const status = document.getElementById(`img-status-${id}`);
        if(prev){ prev.src = ''; prev.classList.add('hidden'); }
        if(status) status.textContent = 'Removed';
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
    if(pendingImages > 0){
      notify('Please wait until image preparation is finished, then save again.');
      return Promise.resolve(false);
    }
    MAP = cleanMap(DRAFT);
    const local = persistLocal();
    renderPosIfAvailable();
    return saveRemoteNow().then(remote=>{
      closeEditor();
      if(remote.ok){
        notify('Images saved online.');
      }else if(remote.skipped){
        notify(local.ok ? 'Images saved locally.' : 'Images saved in this tab only. Browser storage is full.');
      }else{
        notify(local.ok ? 'Images saved locally, but online save failed. Check Firebase rules/connection.' : 'Images saved in this tab only; online save failed and browser storage is full.');
      }
      return !!(local.ok || remote.ok);
    });
  }

  function reset(){
    if(!confirm('Reset all edited images?')) return;
    MAP = {};
    DRAFT = {};
    localStorage.removeItem(KEY);
    saveRemoteSoon();
    renderRows();
    renderPosIfAvailable();
  }

  window.BK_IMAGES = { KEY, load, loadRemoteOnce, watchRemote, get, openEditor, closeEditor, save, reset, remotePath };
})();
