// Slots/Discount/Undo + Persistenz
(function(){
  const SAVE_KEY = 'bk_state_v5';
  const ORDER_COUNTER_KEY = 'bk_order_counter_v1';
  let slots = [];       // [{name, items:[{itemId,note,done:false}], pay:'unpaid'|'cash'|'momo', issued:false}]
  let active = 0;
  let discountRate = 0;
  let orderSeq = 0;
  const history = [];
  const PAY_SET = new Set(['unpaid', 'cash', 'momo', 'bolt', 'hubtel', 'chowdeck']);
  const SOURCE_SET = new Set(['walkin', 'bolt', 'hubtel', 'chowdeck']);

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
      done: !!it.done,
      menuGroupId: typeof it.menuGroupId === 'string' ? it.menuGroupId : '',
      menuName: typeof it.menuName === 'string' ? it.menuName : '',
      menuRole: typeof it.menuRole === 'string' ? it.menuRole : '',
      menuNoSauce: !!it.menuNoSauce
    };
  }
  function normalizeSlot(slot, idx){
    const rawItems = Array.isArray(slot && slot.items) ? slot.items : [];
    return {
      name: (slot && typeof slot.name==='string' && slot.name.trim()) ? slot.name.trim() : `SN${idx+1}`,
      items: rawItems.map(normalizeItem).filter(Boolean),
      pay: PAY_SET.has(slot && slot.pay) ? slot.pay : 'unpaid',
      issued: !!(slot && slot.issued),
      voided: !!(slot && slot.voided),
      voidReason: String((slot && slot.voidReason) || ''),
      packMode: (slot && slot.packMode === 'split') ? 'split' : 'shared',
      packAsked: !!(slot && slot.packAsked),
      orderNo: (slot && typeof slot.orderNo==='string' && slot.orderNo.trim()) ? slot.orderNo.trim() : null,
      createdAt: Number(slot && slot.createdAt) > 0 ? Number(slot.createdAt) : Date.now(),
      orderSource: SOURCE_SET.has(slot && slot.orderSource) ? slot.orderSource : 'walkin',
      externalOrderNo: String((slot && slot.externalOrderNo) || '').trim(),
      originalSource: SOURCE_SET.has(slot && slot.originalSource) ? slot.originalSource : '',
      originalPay: PAY_SET.has(slot && slot.originalPay) ? slot.originalPay : '',
      finalChannel: String((slot && slot.finalChannel) || ''),
      fulfilment: String((slot && slot.fulfilment) || ''),
      conversionReason: String((slot && slot.conversionReason) || ''),
      refundStatus: String((slot && slot.refundStatus) || ''),
      convertedAt: Number(slot && slot.convertedAt) || 0
    };
  }
  function normalizeState(st){
    const rawSlots = Array.isArray(st && st.slots) ? st.slots : [];
    const nextSlots = rawSlots.map((slot, i)=> normalizeSlot(slot, i));
    const nextActive = clamp(Number(st && st.active) || 0, 0, Math.max(0, nextSlots.length-1));
    const nextDiscount = normalizeDiscount(st && st.discountRate);
    const nextSeq = Math.max(0, Number(st && st.orderSeq) || 0);
    return { slots: nextSlots, active: nextActive, discountRate: nextDiscount, orderSeq: nextSeq };
  }
  function parseOrderSequence(orderNo){
    const match = String(orderNo || '').match(/(\d+)$/);
    return match ? Math.max(0, Number(match[1]) || 0) : 0;
  }
  function formatOrderNo(seq){
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    const date = `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}`;
    return `BK-${date}-${String(seq).padStart(8, '0')}`;
  }
  function localCounter(){
    try{ return Math.max(0, Number(localStorage.getItem(ORDER_COUNTER_KEY)) || 0); }
    catch(e){ return 0; }
  }
  function rememberCounter(seq){
    orderSeq = Math.max(orderSeq, Number(seq) || 0);
    try{ localStorage.setItem(ORDER_COUNTER_KEY, String(orderSeq)); }catch(e){}
  }
  function knownSequenceFloor(){
    let floor = Math.max(orderSeq, localCounter());
    slots.forEach(slot=>{ floor = Math.max(floor, parseOrderSequence(slot && slot.orderNo)); });
    try{
      const raw = JSON.parse(localStorage.getItem('bk_order_history_v1') || '[]');
      if(Array.isArray(raw)) raw.forEach(entry=>{ floor = Math.max(floor, parseOrderSequence(entry && entry.orderNo)); });
    }catch(e){}
    return floor;
  }
  let remoteAuthPromise = null;
  function ensureRemoteAuth(){
    if(!remoteEnabled() || !window.firebase.auth) return Promise.resolve(true);
    if(remoteAuthPromise) return remoteAuthPromise;
    try{
      const app = (window.firebase.apps && firebase.apps.length)
        ? firebase.app()
        : firebase.initializeApp(window.FIREBASE_CONFIG);
      const auth = firebase.auth(app);
      remoteAuthPromise = auth.currentUser ? Promise.resolve(true) : auth.signInAnonymously().then(function(){ return true; });
      return remoteAuthPromise.catch(function(error){ remoteAuthPromise = null; throw error; });
    }catch(error){ return Promise.reject(error); }
  }
  function getOrderCounterRef(){
    try{
      const app = (window.firebase.apps && firebase.apps.length)
        ? firebase.app()
        : firebase.initializeApp(window.FIREBASE_CONFIG);
      return firebase.database(app).ref((window.BK_ORDER_COUNTER_PATH || '/pos/counters/orderNumber').replace(/\/+$/,''));
    }catch(e){ return null; }
  }
  let orderAllocationQueue = Promise.resolve();
  let readyPromise = Promise.resolve(false);
  function allocateOrderNo(){
    const allocate = function(){
      const floor = knownSequenceFloor();
      if(remoteEnabled()){
        return ensureRemoteAuth().then(function(){
          const ref = getOrderCounterRef();
          if(!ref) throw new Error('Order number service is unavailable.');
          return ref.transaction(function(current){
            return Math.max(Number(current) || 0, floor) + 1;
          }, undefined, false);
        }).then(function(result){
          if(!result || !result.committed) throw new Error('Order number reservation was not committed.');
          const seq = Number(result.snapshot.val()) || 0;
          if(seq <= 0) throw new Error('Invalid order number received.');
          rememberCounter(seq);
          return formatOrderNo(seq);
        });
      }
      const seq = floor + 1;
      rememberCounter(seq);
      return Promise.resolve(formatOrderNo(seq));
    };
    const result = orderAllocationQueue.then(allocate, allocate);
    orderAllocationQueue = result.catch(function(){});
    return result;
  }
  function repairOrderNumbers(){
    const preferredOwner = new Map();
    slots.forEach(function(slot, index){
      const no = String(slot.orderNo || '').trim();
      if(!no) return;
      if(!preferredOwner.has(no) || (slot.issued && !slots[preferredOwner.get(no)].issued)) preferredOwner.set(no, index);
    });
    const needsNumber = [];
    slots.forEach(function(slot, index){
      const no = String(slot.orderNo || '').trim();
      if(!no || preferredOwner.get(no) !== index) needsNumber.push(index);
    });
    return needsNumber.reduce(function(chain, index){
      return chain.then(function(){
        return allocateOrderNo().then(function(orderNo){ slots[index].orderNo = orderNo; });
      });
    }, Promise.resolve()).then(function(){
      if(needsNumber.length) save();
      return needsNumber.length;
    });
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
      ensureRemoteAuth().then(function(){
        const ref = getRemoteRef();
        if(!ref) throw new Error('Remote state reference unavailable.');
        return ref.set({ slots, active, discountRate, orderSeq, v:5, ts: Date.now() });
      }).catch(function(error){ console.warn('remote state save failed:', error && error.message); });
    }, 250);
  }
  function loadRemoteOnce(){
    if(!remoteEnabled()) return Promise.resolve(false);
    return ensureRemoteAuth().then(function(){
      const ref = getRemoteRef();
      if(!ref) return null;
      return ref.get();
    }).then(function(snap){
      if(!snap) return false;
      const raw = snap.val();
      if(!raw || !raw.v) return false;
      const n = normalizeState(raw);
      slots = n.slots; active = n.active; discountRate = n.discountRate; orderSeq = n.orderSeq;
      rememberCounter(knownSequenceFloor());
      try{ localStorage.setItem(SAVE_KEY, JSON.stringify({slots, active, discountRate, orderSeq, v:5})); }catch(e){}
      return true;
    }).catch(()=>false);
  }
  function save(){
    try{ localStorage.setItem(SAVE_KEY, JSON.stringify({slots, active, discountRate, orderSeq, v:5})); }catch(e){}
    saveRemoteSoon();
  }
  function load(){
    let hadLocal = false;
    try{
      const raw = localStorage.getItem(SAVE_KEY);
      hadLocal = !!raw;
      if(raw){
        const n = normalizeState(JSON.parse(raw));
        slots = n.slots; active = n.active; discountRate = n.discountRate; orderSeq = n.orderSeq;
        rememberCounter(knownSequenceFloor());
      }
    }catch(e){
      console.warn('local state load failed:', e && e.message);
    }
    readyPromise = loadRemoteOnce().then(function(hasRemote){
      return repairOrderNumbers().then(function(changed){
        if(changed || hasRemote) save();
        if(window.BK_UI && typeof BK_UI.renderAll === 'function') BK_UI.renderAll();
        return hasRemote || hadLocal;
      });
    }).catch(function(e){
      console.warn('state initialization failed:', e && e.message);
      return repairOrderNumbers().then(function(){ return hadLocal; });
    });
    return hadLocal;
  }
  function whenReady(){ return readyPromise; }

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

  function ensureSlot(){
    if(slots.length) return Promise.resolve(active);
    return addSlot();
  }
  function addSlot(label, meta){
    const idx = slots.length+1;
    const details = meta && typeof meta === 'object' ? meta : {};
    return allocateOrderNo().then(function(orderNo){
      const source = SOURCE_SET.has(details.orderSource) ? details.orderSource : 'walkin';
      const pay = PAY_SET.has(details.pay) ? details.pay : (source === 'walkin' ? 'unpaid' : source);
      slots.push({name: label || `SN${idx}`, items: [], pay, issued:false, voided:false, voidReason:'', packMode:'shared', packAsked:false, orderNo, createdAt: Date.now(), orderSource:source, externalOrderNo:String(details.externalOrderNo || '').trim(), originalSource:'', originalPay:'', finalChannel:'', fulfilment:'', conversionReason:'', refundStatus:'', convertedAt:0});
      active = slots.length-1;
      save();
      return active;
    });
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

  function addItem(id, note, meta){
    if(!slots.length || slots[active].issued) return;
    const details = meta && typeof meta === 'object' ? meta : {};
    slots[active].items.push({
      itemId:id,
      note: (note||'').trim(),
      done:false,
      menuGroupId: typeof details.menuGroupId === 'string' ? details.menuGroupId : '',
      menuName: typeof details.menuName === 'string' ? details.menuName : '',
      menuRole: typeof details.menuRole === 'string' ? details.menuRole : '',
      menuNoSauce: !!details.menuNoSauce
    });
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
        return [arr[0], typeof arr[1]==='string' ? arr[1] : '', typeof arr[2]==='string' ? arr[2] : ''];
      }
    }catch(e){}
    const legacy = String(key || '').split('|');
    return [legacy[0] || '', legacy[1] || '', ''];
  }
  function addItemForKey(key){
    const s = slots[active]; if(!s || s.issued) return;
    const [id, note='', menuGroupId=''] = parseItemKey(key);
    if(!id) return;
    const source = s.items.find(it=>it.itemId===id && (it.note||'')===note && (!menuGroupId || (it.menuGroupId||'')===menuGroupId));
    addItem(id, note, source || {});
  }
  function decItemForKey(key){
    const s = slots[active]; if(!s || s.issued) return;
    const [id, note='', menuGroupId=''] = parseItemKey(key);
    const idx = s.items.findIndex(it => it.itemId===id && (it.note||'')===note && (!menuGroupId || (it.menuGroupId||'')===menuGroupId));
    if(idx>-1){ s.items.splice(idx,1); save(); }
  }
  function removeItemForKey(key){
    const s = slots[active]; if(!s || s.issued) return;
    const [id, note='', menuGroupId=''] = parseItemKey(key);
    const next = s.items.filter(it => !(it.itemId===id && (it.note||'')===note && (!menuGroupId || (it.menuGroupId||'')===menuGroupId)));
    if(next.length !== s.items.length){ s.items = next; save(); }
  }
  function setPay(i,status){
    if(!slots[i] || slots[i].issued) return;
    slots[i].pay = PAY_SET.has(status) ? status : 'unpaid';
    save();
  }
  function updateSlot(i, changes){
    if(!slots[i] || !changes || typeof changes !== 'object' || slots[i].issued) return false;
    const next = Object.assign({}, slots[i], changes);
    slots[i] = normalizeSlot(next, i);
    save();
    return true;
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
    const [id, note='', menuGroupId=''] = parseItemKey(key);
    let changed = false;
    s.items.forEach(it=>{
      if(it.itemId===id && (it.note||'')===note && (!menuGroupId || (it.menuGroupId||'')===menuGroupId)){ it.done = !!v; changed = true; }
    });
    if(changed) save();
  }

  function setDiscount(r){ discountRate = normalizeDiscount(r); save(); }

  // getters
  function getState(){ return {slots, active, discountRate}; }
  function setState(st){
    const n = normalizeState(st || {});
    slots = n.slots; active = n.active; discountRate = n.discountRate; orderSeq = n.orderSeq;
    rememberCounter(knownSequenceFloor());
    save();
    repairOrderNumbers().catch(function(e){ console.warn('order number repair failed:', e && e.message); });
  }

  // expose
  window.BK_STATE = {
    load, save, clearAll, clearStorage,
    addSlot, renameActive, deleteActive, setActive, updateSlot,
    setActiveName,
    addItem, addItemForKey, undo, decItemForKey, removeItemForKey, setPay, setIssued, toggleDone, setDoneForKey,
    setPackMode,
    setDiscount,
    getState, setState, whenReady, allocateOrderNo, repairOrderNumbers, formatOrderNo
  };
})();
