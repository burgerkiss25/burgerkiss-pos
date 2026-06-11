// Slots/Discount/Undo + Persistenz
(function(){
  const SAVE_KEY = 'bk_state_v5';
  let slots = [];       // [{name, items:[{itemId,note,done:false}], pay:'unpaid'|'cash'|'momo', issued:false}]
  let active = 0;
  let discountRate = 0;
  let orderSeq = 0;
  const history = [];
  const PAY_SET = new Set(['unpaid', 'cash', 'momo']);

  function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }
  function normalizeDiscount(v){
    const n = Number(v);
    if (!Number.isFinite(n)) return 0;
    return clamp(n, 0, 1);
  }
  function normalizeItem(it){
    if(!it || typeof it!=='object' || typeof it.itemId!=='string') return null;
    return {
      itemId: it.itemId,
      note: typeof it.note==='string' ? it.note : '',
      done: !!it.done
    };
  }
  function normalizeSlot(slot, idx){
    const rawItems = Array.isArray(slot && slot.items) ? slot.items : [];
    return {
      name: (slot && typeof slot.name==='string' && slot.name.trim()) ? slot.name.trim() : `SN${idx+1}`,
      items: rawItems.map(normalizeItem).filter(Boolean),
      pay: PAY_SET.has(slot && slot.pay) ? slot.pay : 'unpaid',
      issued: !!(slot && slot.issued),
      packMode: (slot && slot.packMode === 'split') ? 'split' : 'shared',
      packAsked: !!(slot && slot.packAsked),
      orderNo: (slot && typeof slot.orderNo==='string' && slot.orderNo.trim()) ? slot.orderNo.trim() : null,
      createdAt: Number(slot && slot.createdAt) > 0 ? Number(slot.createdAt) : Date.now()
    };
  }
  function normalizeState(st){
    const rawSlots = Array.isArray(st && st.slots) ? st.slots : [];
    const nextSlots = rawSlots.map((slot, i)=> normalizeSlot(slot, i));
    if(!nextSlots.length) nextSlots.push({name:'SN1', items:[], pay:'unpaid', packMode:'shared', packAsked:false, createdAt: Date.now()});
    const nextActive = clamp(Number(st && st.active) || 0, 0, Math.max(0, nextSlots.length-1));
    const nextDiscount = normalizeDiscount(st && st.discountRate);
    const nextSeq = Math.max(0, Number(st && st.orderSeq) || 0);
    return { slots: nextSlots, active: nextActive, discountRate: nextDiscount, orderSeq: nextSeq };
  }
  function genOrderNo(seq){
    const d = new Date();
    const pad = n => String(n).padStart(2,'0');
    const date = `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}`;
    return `BK-${date}-${String(seq).padStart(4,'0')}`;
  }
  function nextOrderNo(){
    orderSeq += 1;
    return genOrderNo(orderSeq);
  }


  function remoteEnabled(){
    return !!(window.BK_SYNC_ENABLED !== false && window.FIREBASE_CONFIG && window.firebase && window.firebase.database);
  }
  function getRemoteRef(){
    try{
      const app = (window.firebase.apps && firebase.apps.length)
        ? firebase.app()
        : firebase.initializeApp(window.FIREBASE_CONFIG);
      const db = firebase.database(app);
      const base = (window.BK_SYNC_PATH || '/pos/live').replace(/\/+$/,'');
      const slot = (window.BK_SYNC_FORCE_SLOT && typeof window.BK_SYNC_FORCE_SLOT === 'string') ? window.BK_SYNC_FORCE_SLOT : 'SN1';
      return db.ref(`${base}/${slot}/state`);
    }catch(e){ return null; }
  }
  let remoteSaveTimer = null;
  function saveRemoteSoon(){
    if(!remoteEnabled()) return;
    if(remoteSaveTimer) clearTimeout(remoteSaveTimer);
    remoteSaveTimer = setTimeout(function(){
      const ref = getRemoteRef();
      if(!ref) return;
      ref.set({ slots, active, discountRate, orderSeq, v:5, ts: Date.now() }).catch(()=>{});
    }, 250);
  }
  function loadRemoteOnce(){
    if(!remoteEnabled()) return Promise.resolve(false);
    const ref = getRemoteRef();
    if(!ref) return Promise.resolve(false);
    return ref.get().then(function(snap){
      const raw = snap.val();
      if(!raw || !raw.v) return false;
      const n = normalizeState(raw);
      slots = n.slots; active = n.active; discountRate = n.discountRate; orderSeq = n.orderSeq;
      slots.forEach(s=>{ if(!s.orderNo) s.orderNo = nextOrderNo(); });
      try{ localStorage.setItem(SAVE_KEY, JSON.stringify({slots, active, discountRate, orderSeq, v:5})); }catch(e){}
      return true;
    }).catch(()=>false);
  }
  function save(){
    try{ localStorage.setItem(SAVE_KEY, JSON.stringify({slots, active, discountRate, orderSeq, v:5})); }catch(e){}
    saveRemoteSoon();
  }
  function load(){
    try{
      const raw = localStorage.getItem(SAVE_KEY);
      if(raw){
        const n = normalizeState(JSON.parse(raw));
        slots = n.slots; active = n.active; discountRate = n.discountRate; orderSeq = n.orderSeq;
        slots.forEach(s=>{ if(!s.orderNo) s.orderNo = nextOrderNo(); });
      }
      loadRemoteOnce().then(function(hasRemote){
        if(hasRemote && window.BK_UI && typeof BK_UI.renderAll === 'function') BK_UI.renderAll();
      });
      save();
      return !!raw;
    }catch(e){ return false; }
  }
  function clearAll(){
    slots=[]; active=0; discountRate=0; history.length=0; save(); return true;
  }
  function clearStorage(){
    localStorage.removeItem(SAVE_KEY);
    if(window.BK_PRICES && window.BK_PRICES.KEY) localStorage.removeItem(window.BK_PRICES.KEY);
    if(window.BK_PRODUCTS && window.BK_PRODUCTS.KEY) localStorage.removeItem(window.BK_PRODUCTS.KEY);
    if(window.BK_MENUS && window.BK_MENUS.KEY) localStorage.removeItem(window.BK_MENUS.KEY);
    if(window.BK_IMAGES && window.BK_IMAGES.KEY) localStorage.removeItem(window.BK_IMAGES.KEY);
    if(window.BK_STOCK && window.BK_STOCK.KEY) localStorage.removeItem(window.BK_STOCK.KEY);
  }

  function ensureSlot(){ if(!slots.length) addSlot(); }
  function addSlot(label){
    const idx = slots.length+1;
    slots.push({name: label || `SN${idx}`, items: [], pay:'unpaid', issued:false, packMode:'shared', packAsked:false, orderNo: nextOrderNo(), createdAt: Date.now()});
    active = slots.length-1;
    save();
  }
  function renameActive(){
    if(!slots.length) return;
    return slots[active].name;
  }
  function setActiveName(name){
    if(!slots.length) return;
    if(typeof name!=='string') return;
    const n = name.trim();
    if(!n) return;
    slots[active].name = n;
    save();
  }
  function deleteActive(){
    if(!slots.length) return;
    slots.splice(active,1);
    active = Math.max(0, active-1);
    save();
  }
  function setActive(i){
    active = clamp(Number(i)||0, 0, Math.max(0, slots.length-1));
    save();
  }

  function addItem(id, note){
    ensureSlot();
    if(slots[active].issued) return;
    slots[active].items.push({itemId:id, note: (note||'').trim(), done:false});
    history.push({slot:active});
    save();
  }
  function undo(){
    const last = history.pop(); if(!last) return;
    const s = slots[last.slot]; if(!s || !s.items.length) return;
    s.items.pop(); save();
  }
  function parseItemKey(key){
    try{
      const arr = JSON.parse(key);
      if(Array.isArray(arr) && typeof arr[0]==='string'){
        return [arr[0], typeof arr[1]==='string' ? arr[1] : ''];
      }
    }catch(e){}
    const legacy = String(key || '').split('|');
    return [legacy[0] || '', legacy[1] || ''];
  }
  function addItemForKey(key){
    const s = slots[active]; if(!s || s.issued) return;
    const [id, note=''] = parseItemKey(key);
    if(!id) return;
    addItem(id, note);
  }
  function decItemForKey(key){
    const s = slots[active]; if(!s || s.issued) return;
    const [id, note=''] = parseItemKey(key);
    const idx = s.items.findIndex(it => it.itemId===id && (it.note||'')===note);
    if(idx>-1){ s.items.splice(idx,1); save(); }
  }
  function removeItemForKey(key){
    const s = slots[active]; if(!s || s.issued) return;
    const [id, note=''] = parseItemKey(key);
    const next = s.items.filter(it => !(it.itemId===id && (it.note||'')===note));
    if(next.length !== s.items.length){ s.items = next; save(); }
  }
  function setPay(i,status){
    if(!slots[i] || slots[i].issued) return;
    slots[i].pay = PAY_SET.has(status) ? status : 'unpaid';
    save();
  }
  function setIssued(i, v){
    if(!slots[i]) return;
    if(slots[i].issued && v===false) return;
    slots[i].issued = !!v;
    save();
  }
  function setPackMode(i, mode){
    if(!slots[i] || slots[i].issued) return;
    slots[i].packMode = mode === 'split' ? 'split' : 'shared';
    slots[i].packAsked = true;
    save();
  }
  function toggleDone(i, j, v){
    if(!slots[i] || slots[i].issued || !slots[i].items[j]) return;
    slots[i].items[j].done = !!v;
    save();
  }
  function setDoneForKey(key, v){
    const s = slots[active]; if(!s || s.issued) return;
    const [id, note=''] = parseItemKey(key);
    let changed = false;
    s.items.forEach(it=>{
      if(it.itemId===id && (it.note||'')===note){ it.done = !!v; changed = true; }
    });
    if(changed) save();
  }

  function setDiscount(r){ discountRate = normalizeDiscount(r); save(); }

  // getters
  function getState(){ return {slots, active, discountRate}; }
  function setState(st){
    const n = normalizeState(st || {});
    slots = n.slots; active = n.active; discountRate = n.discountRate; orderSeq = n.orderSeq;
    slots.forEach(s=>{ if(!s.orderNo) s.orderNo = nextOrderNo(); });
    save();
  }

  // expose
  window.BK_STATE = {
    load, save, clearAll, clearStorage,
    addSlot, renameActive, deleteActive, setActive,
    setActiveName,
    addItem, addItemForKey, undo, decItemForKey, removeItemForKey, setPay, setIssued, toggleDone, setDoneForKey,
    setPackMode,
    setDiscount,
    getState, setState, nextOrderNo
  };
})();
