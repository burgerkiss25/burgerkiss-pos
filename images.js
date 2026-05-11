// Bild-Overrides (lokal + online editierbar)
(function(){
  const KEY = 'bk_images_v1';
  const DEFAULT_REMOTE_PATH = '/pos/config/images';
  const MAX_IMAGE_EDGE = 640;
  const JPEG_QUALITY = 0.72;
  const LOCAL_CACHE_LIMIT = 900000;
  const RENDER_DEBOUNCE_MS = 120;
  let MAP = {};
  let DRAFT = {};
  let DIRTY = new Set();
  let REMOVED = new Set();
  let pendingImages = 0;
  let remoteSaveTimer = null;
  let renderTimer = null;
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
  function remoteMapRef(){
    const ref = remoteRef();
    return ref ? ref.child('map') : null;
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
      const json = JSON.stringify(MAP);
      if(json.length > LOCAL_CACHE_LIMIT){
        localStorage.removeItem(KEY);
        return { ok:false, skipped:true };
      }
      localStorage.setItem(KEY, json);
      return { ok:true };
    }catch(e){
      try{ localStorage.removeItem(KEY); }catch(_e){}
      console.warn('images local save failed:', e && e.message);
      return { ok:false, error:e };
    }
  }
  function renderPosIfAvailable(){
    if(window.BK_UI && typeof BK_UI.renderAll === 'function' && document.getElementById('buttons')) BK_UI.renderAll();
  }
  function schedulePosRender(){
    if(renderTimer) return;
    renderTimer = setTimeout(()=>{
      renderTimer = null;
      renderPosIfAvailable();
    }, RENDER_DEBOUNCE_MS);
  }
  function notify(message){
    if(window.BK_UI && BK_UI.infoDialog) BK_UI.infoDialog(message);
    else alert(message);
  }

  function imageEditorOpen(){
    const modal = document.getElementById('modalImages');
    return !!(modal && modal.classList.contains('open'));
  }
  function syncDraftImageFromRemote(id, value){
    if(!imageEditorOpen() || DIRTY.has(id)) return;
    if(typeof value === 'string' && value) DRAFT[id] = value;
    else delete DRAFT[id];
    const prev = document.getElementById(`img-prev-${id}`);
    if(!prev) return;
    if(!DRAFT[id]){
      prev.src = '';
      prev.classList.add('hidden');
      return;
    }
    const rect = prev.getBoundingClientRect();
    const visible = rect.bottom >= 0 && rect.top <= (window.innerHeight || document.documentElement.clientHeight);
    if(visible){
      prev.src = DRAFT[id];
      prev.classList.remove('hidden');
    }
  }
  function applyRemote(raw){
    const next = cleanMap(raw && raw.map ? raw.map : raw);
    const hash = mapHash(next);
    if(hash && hash === lastRemoteHash) return false;
    lastRemoteHash = hash;
    MAP = next;
    schedulePosRender();
    return true;
  }
  function applyRemoteImage(id, value){
    if(!id) return false;
    if(typeof value === 'string' && value){
      if(MAP[id] === value) return false;
      MAP[id] = value;
      syncDraftImageFromRemote(id, value);
    }else{
      if(!MAP[id]) return false;
      delete MAP[id];
      syncDraftImageFromRemote(id, '');
    }
    lastRemoteHash = '';
    schedulePosRender();
    return true;
  }
  function loadRemoteOnce(){
    const ref = remoteMapRef();
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
    const ref = remoteMapRef();
    if(!ref) return false;
    remoteWatchStarted = true;
    ensureAuth().then(()=>{
      ref.on('child_added', snap=> applyRemoteImage(snap.key, snap.val()), e=>{
        remoteWatchStarted = false;
        console.warn('images remote sync failed:', e && e.message);
        setTimeout(watchRemote, 3000);
      });
      ref.on('child_changed', snap=> applyRemoteImage(snap.key, snap.val()));
      ref.on('child_removed', snap=> applyRemoteImage(snap.key, ''));
    }).catch(e=>{
      remoteWatchStarted = false;
      console.warn('images remote sync failed:', e && e.message);
      setTimeout(watchRemote, 3000);
    });
    return true;
  }
  function saveRemoteNow(nextMap, dirtyIds, removedIds){
    const ref = remoteRef();
    if(!ref) return Promise.resolve({ ok:false, skipped:true });
    if(remoteSaveTimer){ clearTimeout(remoteSaveTimer); remoteSaveTimer = null; }
    const updates = { ts: Date.now() };
    dirtyIds.forEach(id=>{
      updates[`map/${id}`] = removedIds.has(id) ? null : (nextMap[id] || null);
    });
    return ensureAuth()
      .then(()=> ref.update(updates))
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
      ensureAuth().then(()=>{
        const payload = { map: MAP, ts: Date.now() };
        return Object.keys(MAP).length ? ref.update(payload) : ref.set(payload);
      }).catch(e=>{
        console.warn('images remote save failed:', e && e.message);
      });
    }, 250);
  }

  function load(){
    try{
      const raw = localStorage.getItem(KEY);
      if(raw && raw.length <= LOCAL_CACHE_LIMIT) MAP = cleanMap(JSON.parse(raw)||{});
      else if(raw) localStorage.removeItem(KEY);
    }catch(e){ try{ localStorage.removeItem(KEY); }catch(_e){} }
    lastRemoteHash = mapHash(MAP);
    watchRemote();
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

  function compactDraftImages(){
    const ids = Object.keys(DRAFT).filter(id=> typeof DRAFT[id] === 'string' && DRAFT[id].startsWith('data:image/') && DRAFT[id].length > 300000);
    if(!ids.length) return Promise.resolve(false);
    pendingImages += ids.length;
    return ids.reduce((chain, id)=> chain.then(()=> resizeImageDataUrl(DRAFT[id]).then(dataUrl=>{
      if(dataUrl !== DRAFT[id]) DIRTY.add(id);
      DRAFT[id] = dataUrl;
    }).catch(e=>{
      console.warn('image compaction failed:', e && e.message);
    }).finally(()=>{
      pendingImages = Math.max(0, pendingImages - 1);
    })), Promise.resolve()).then(()=>true);
  }

  function hydrateVisiblePreviews(body){
    const previews = Array.from(body.querySelectorAll('img[data-preview-id]'));
    const show = img=>{
      const src = DRAFT[img.dataset.previewId] || '';
      if(src){ img.src = src; img.classList.remove('hidden'); }
    };
    if(!('IntersectionObserver' in window)){
      previews.slice(0, 8).forEach(show);
      return;
    }
    const observer = new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        if(!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        show(entry.target);
      });
    }, { rootMargin: '160px 0px' });
    previews.forEach(img=> observer.observe(img));
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
          <img class="img-preview ${src ? '' : 'hidden'}" id="img-prev-${it.id}" data-preview-id="${it.id}" loading="lazy" alt="${it.name}">
          <input type="file" accept="image/*" data-img-id="${it.id}">
          <small id="img-status-${it.id}" class="muted"></small>
          <button class="mini" data-remove-id="${it.id}">Remove</button>
        </span>
      `;
      body.appendChild(row);
    });
    hydrateVisiblePreviews(body);

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
          DIRTY.add(id);
          REMOVED.delete(id);
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
        DIRTY.add(id);
        REMOVED.add(id);
        const prev = document.getElementById(`img-prev-${id}`);
        const status = document.getElementById(`img-status-${id}`);
        if(prev){ prev.src = ''; prev.classList.add('hidden'); }
        if(status) status.textContent = 'Removed';
      };
    });
  }

  function openEditor(){
    DRAFT = clone(MAP);
    DIRTY = new Set();
    REMOVED = new Set();
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
    return compactDraftImages().then(()=>{
      const next = clone(MAP);
      const cleanDraft = cleanMap(DRAFT);
      DIRTY.forEach(id=>{
        if(REMOVED.has(id)) delete next[id];
        else if(cleanDraft[id]) next[id] = cleanDraft[id];
      });
      MAP = cleanMap(next);
      const dirtyIds = new Set(DIRTY);
      const removedIds = new Set(REMOVED);
      const local = persistLocal();
      renderPosIfAvailable();
      return saveRemoteNow(MAP, dirtyIds, removedIds).then(remote=>({ remote, local }));
    }).then(({ remote, local })=>{
      DIRTY = new Set();
      REMOVED = new Set();
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
    DIRTY = new Set();
    REMOVED = new Set();
    localStorage.removeItem(KEY);
    saveRemoteSoon();
    renderRows();
    renderPosIfAvailable();
  }

  window.BK_IMAGES = { KEY, load, loadRemoteOnce, watchRemote, get, openEditor, closeEditor, save, reset, remotePath };
})();
