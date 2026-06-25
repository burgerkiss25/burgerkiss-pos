// Slots/Discount/Undo + Persistenz
(function(){
  const SAVE_KEY = 'bk_state_v5';
  const ORDER_COUNTER_KEY = 'bk_order_counter_v1';
  const NORMALIZERS = window.BK_STATE_NORMALIZERS || {};
  const ORDER_NUMBERS = window.BK_ORDER_NUMBER_SERVICE || {};
  const PERSISTENCE = window.BK_STATE_PERSISTENCE || {};
  const REMOTE = window.BK_STATE_REMOTE || {};
  const DISCOUNTS = window.BK_DISCOUNT_STATE || {};
  let slots = [];       // [{name, items:[{itemId,note,done:false}], pay:'unpaid'|'cash'|'momo', momoProvider:'telecel'|'mtn'|'', issued:false}]
  let active = 0;
  let discountRate = 0;
  let orderSeq = 0;
  let updatedAt = 0;
  const history = [];
  const PAY_SET = new Set(['unpaid', 'cash', 'momo', 'bolt', 'hubtel', 'chowdeck', 'whatsapp']);
  const SOURCE_SET = new Set(['walkin', 'whatsapp', 'bolt', 'hubtel', 'chowdeck']);

  function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }
  function normalizeDiscount(v){
    if(DISCOUNTS.normalizeDiscount) return DISCOUNTS.normalizeDiscount(v);
    return NORMALIZERS.normalizeDiscount ? NORMALIZERS.normalizeDiscount(v) : 0;
  }
  function normalizeSlot(slot, idx){
    return NORMALIZERS.normalizeSlot ? NORMALIZERS.normalizeSlot(slot, idx) : {name:`SN${idx+1}`, items:[], pay:'unpaid'};
  }
  function normalizeState(st){
    return NORMALIZERS.normalizeState ? NORMALIZERS.normalizeState(st) : {slots:[], active:0, discountRate:0, orderSeq:0, updatedAt:0};
  }
  function parseOrderSequence(orderNo){
    if(ORDER_NUMBERS.parseOrderSequence) return ORDER_NUMBERS.parseOrderSequence(orderNo);
    const match = String(orderNo || '').match(/(\d+)$/);
    return match ? Math.max(0, Number(match[1]) || 0) : 0;
  }
  function formatOrderNo(seq){
    if(ORDER_NUMBERS.formatOrderNo) return ORDER_NUMBERS.formatOrderNo(seq);
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    const date = `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}`;
    return `BK-${date}-${String(seq).padStart(8, '0')}`;
  }
  function localCounter(){
    if(ORDER_NUMBERS.localCounter) return ORDER_NUMBERS.localCounter(localStorage, ORDER_COUNTER_KEY);
    try{ return Math.max(0, Number(localStorage.getItem(ORDER_COUNTER_KEY)) || 0); }
    catch(e){ return 0; }
  }
  function rememberCounter(seq){
    orderSeq = ORDER_NUMBERS.rememberCounter
      ? ORDER_NUMBERS.rememberCounter(localStorage, ORDER_COUNTER_KEY, orderSeq, seq)
      : Math.max(orderSeq, Number(seq) || 0);
    if(!ORDER_NUMBERS.rememberCounter){
      try{ localStorage.setItem(ORDER_COUNTER_KEY, String(orderSeq)); }catch(e){}
    }
  }
  function knownSequenceFloor(){
    const historyEntries = PERSISTENCE.readHistory
      ? PERSISTENCE.readHistory(localStorage, 'bk_order_history_v1')
      : [];
    if(!PERSISTENCE.readHistory){
      try{
        const raw = JSON.parse(localStorage.getItem('bk_order_history_v1') || '[]');
        if(Array.isArray(raw)) historyEntries.push(...raw);
      }catch(e){}
    }
    if(ORDER_NUMBERS.knownSequenceFloor) return ORDER_NUMBERS.knownSequenceFloor(orderSeq, localCounter(), slots, historyEntries);
    let floor = Math.max(orderSeq, localCounter());
    slots.forEach(slot=>{ floor = Math.max(floor, parseOrderSequence(slot && slot.orderNo)); });
    historyEntries.forEach(entry=>{ floor = Math.max(floor, parseOrderSequence(entry && entry.orderNo)); });
    return floor;
  }
  let remoteAuthPromise = null;
  function ensureRemoteAuth(){
    if(REMOTE.ensureAuth) return REMOTE.ensureAuth();
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
    if(REMOTE.orderCounterRef) return REMOTE.orderCounterRef();
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
        if(REMOTE.reserveOrderSequence){
          return REMOTE.reserveOrderSequence(floor).then(function(seq){
            rememberCounter(seq);
            return formatOrderNo(seq);
          });
        }
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
    if(REMOTE.remoteEnabled) return REMOTE.remoteEnabled();
    return !!(window.BK_SYNC_ENABLED !== false && window.FIREBASE_CONFIG && window.firebase && window.firebase.database);
  }
  function getRemoteRef(){
    if(REMOTE.stateRef) return REMOTE.stateRef();
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
  function remotePayload(){
    return { slots, active, discountRate, orderSeq, v:5, ts:updatedAt || Date.now() };
  }
  function saveRemoteNow(){
    if(remoteSaveTimer){
      clearTimeout(remoteSaveTimer);
      remoteSaveTimer = null;
    }
    if(!remoteEnabled()) return Promise.resolve(true);
    if(REMOTE.saveState){
      return REMOTE.saveState(remotePayload()).then(()=>true).catch(function(error){
        console.warn('remote state save failed:', error && error.message);
        return false;
      });
    }
    return ensureRemoteAuth().then(function(){
      const ref = getRemoteRef();
      if(!ref) throw new Error('Remote state reference unavailable.');
      return ref.set(remotePayload());
    }).then(()=>true).catch(function(error){
      console.warn('remote state save failed:', error && error.message);
      return false;
    });
  }
  function saveRemoteSoon(){
    if(!remoteEnabled()) return;
    if(remoteSaveTimer) clearTimeout(remoteSaveTimer);
    remoteSaveTimer = setTimeout(function(){
      remoteSaveTimer = null;
      saveRemoteNow();
    }, 250);
  }
  function loadRemoteOnce(){
    if(!remoteEnabled()) return Promise.resolve(false);
    if(REMOTE.loadState){
      return REMOTE.loadState().then(function(raw){
        if(!raw || !raw.v) return false;
        if(updatedAt && Number(raw.ts) <= updatedAt) return false;
        const n = normalizeState(raw);
        slots = n.slots; active = n.active; discountRate = n.discountRate; orderSeq = n.orderSeq; updatedAt = n.updatedAt;
        rememberCounter(knownSequenceFloor());
        if(PERSISTENCE.writeState) PERSISTENCE.writeState(localStorage, SAVE_KEY, remotePayload());
        else try{ localStorage.setItem(SAVE_KEY, JSON.stringify(remotePayload())); }catch(e){}
        return true;
      }).catch(()=>false);
    }
    return ensureRemoteAuth().then(function(){
      const ref = getRemoteRef();
      if(!ref) return null;
      return ref.get();
    }).then(function(snap){
      if(!snap) return false;
      const raw = snap.val();
      if(!raw || !raw.v) return false;
      if(updatedAt && Number(raw.ts) <= updatedAt) return false;
      const n = normalizeState(raw);
      slots = n.slots; active = n.active; discountRate = n.discountRate; orderSeq = n.orderSeq; updatedAt = n.updatedAt;
      rememberCounter(knownSequenceFloor());
      if(PERSISTENCE.writeState) PERSISTENCE.writeState(localStorage, SAVE_KEY, remotePayload());
      else try{ localStorage.setItem(SAVE_KEY, JSON.stringify(remotePayload())); }catch(e){}
      return true;
    }).catch(()=>false);
  }
  function save(){
    updatedAt = Date.now();
    if(PERSISTENCE.writeState) PERSISTENCE.writeState(localStorage, SAVE_KEY, remotePayload());
    else try{ localStorage.setItem(SAVE_KEY, JSON.stringify(remotePayload())); }catch(e){}
    saveRemoteSoon();
  }
  function load(){
    let hadLocal = false;
    const local = PERSISTENCE.readState
      ? PERSISTENCE.readState(localStorage, SAVE_KEY)
      : null;
    if(local){
      hadLocal = !!local.exists;
      if(local.value){
        const n = normalizeState(local.value);
        slots = n.slots; active = n.active; discountRate = n.discountRate; orderSeq = n.orderSeq; updatedAt = n.updatedAt;
        rememberCounter(knownSequenceFloor());
      }else if(local.error){
        console.warn('local state load failed:', local.error && local.error.message);
      }
    }else{
      try{
        const raw = localStorage.getItem(SAVE_KEY);
        hadLocal = !!raw;
        if(raw){
          const n = normalizeState(JSON.parse(raw));
          slots = n.slots; active = n.active; discountRate = n.discountRate; orderSeq = n.orderSeq; updatedAt = n.updatedAt;
          rememberCounter(knownSequenceFloor());
        }
      }catch(e){
        console.warn('local state load failed:', e && e.message);
      }
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
    const keys = [
      SAVE_KEY,
      window.BK_PRICES && window.BK_PRICES.KEY,
      window.BK_PRODUCTS && window.BK_PRODUCTS.KEY,
      window.BK_MENUS && window.BK_MENUS.KEY,
      window.BK_IMAGES && window.BK_IMAGES.KEY,
      window.BK_STOCK && window.BK_STOCK.KEY
    ];
    if(PERSISTENCE.clearAppStorage) PERSISTENCE.clearAppStorage(localStorage, keys);
    else keys.forEach(function(key){ if(key) localStorage.removeItem(key); });
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
      const access = window.BK_ACCESS && BK_ACCESS.current ? BK_ACCESS.current() : null;
      const actor = window.BK_ACCESS && BK_ACCESS.operationalActor ? BK_ACCESS.operationalActor() : null;
      slots.push({name: label || `SN${idx}`, items: [], pay, issued:false, voided:false, voidReason:'', packMode:'shared', packAsked:false, drinkPackMode:'shared', sentToKitchen:false, discountRate:0, discountApprovedBy:null, discountApprovedAt:0, orderNo, createdAt: Date.now(), orderSource:source, externalOrderNo:String(details.externalOrderNo || '').trim(), originalSource:'', originalPay:'', finalChannel:'', fulfilment:'', conversionReason:'', refundStatus:'', convertedAt:0, customerName:String(details.customerName || ''), customerPhone:String(details.customerPhone || ''), preferredPayment:String(details.preferredPayment || ''), riderType:String(details.riderType || ''), deliveryStatus:String(details.deliveryStatus || ''), stockConsumed:false, createdBy:actor, paidBy:pay === 'unpaid' ? null : actor, paidAt:pay === 'unpaid' ? 0 : Date.now(), businessDate:access ? access.businessDate : '', shiftId:access ? access.shiftId : ''});
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
  function clearSlotDiscount(slot){
    if(DISCOUNTS.clearSlotDiscount) return DISCOUNTS.clearSlotDiscount(slot);
    if(!slot) return false;
    slot.discountRate = 0;
    slot.discountApprovedBy = null;
    slot.discountApprovedAt = 0;
    return true;
  }

  function addItem(id, note, meta){
    if(!slots.length || slots[active].issued) return;
    const details = meta && typeof meta === 'object' ? meta : {};
    slots[active].packAsked = false;
    slots[active].sentToKitchen = false;
    clearSlotDiscount(slots[active]);
    slots[active].items.push({
      itemId:id,
      note: (note||'').trim(),
      done:false,
      menuGroupId: typeof details.menuGroupId === 'string' ? details.menuGroupId : '',
      menuName: typeof details.menuName === 'string' ? details.menuName : '',
      menuRole: typeof details.menuRole === 'string' ? details.menuRole : '',
      menuNoSauce: !!details.menuNoSauce,
      customerGroupId: typeof details.customerGroupId === 'string' ? details.customerGroupId : '',
      packGroupId: typeof details.packGroupId === 'string' ? details.packGroupId : ''
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
    if(idx>-1){ s.items.splice(idx,1); s.packAsked=false; s.sentToKitchen=false; clearSlotDiscount(s); save(); }
  }
  function removeItemForKey(key){
    const s = slots[active]; if(!s || s.issued) return;
    const [id, note='', menuGroupId=''] = parseItemKey(key);
    const next = s.items.filter(it => !(it.itemId===id && (it.note||'')===note && (!menuGroupId || (it.menuGroupId||'')===menuGroupId)));
    if(next.length !== s.items.length){ s.items = next; s.packAsked=false; s.sentToKitchen=false; clearSlotDiscount(s); save(); }
  }
  function replaceMenuGroup(menuGroupId, nextItems){
    const s = slots[active]; if(!s || s.issued || !menuGroupId) return false;
    const replacements = Array.isArray(nextItems) ? nextItems : [];
    s.items = s.items
      .filter(it => (it.menuGroupId || '') !== menuGroupId)
      .concat(replacements.map(it => ({
        itemId:it.itemId,
        note:(it.note || '').trim(),
        done:false,
        menuGroupId,
        menuName:typeof it.menuName === 'string' ? it.menuName : '',
        menuRole:typeof it.menuRole === 'string' ? it.menuRole : '',
        menuNoSauce:!!it.menuNoSauce,
        customerGroupId:typeof it.customerGroupId === 'string' ? it.customerGroupId : '',
        packGroupId:typeof it.packGroupId === 'string' ? it.packGroupId : ''
      })));
    s.packAsked=false; s.sentToKitchen=false; clearSlotDiscount(s); save();
    return true;
  }
  function setPay(i,status){
    if(!slots[i] || slots[i].issued) return;
    const provider = arguments.length > 2 && (arguments[2] === 'telecel' || arguments[2] === 'mtn') ? arguments[2] : '';
    slots[i].pay = PAY_SET.has(status) ? status : 'unpaid';
    slots[i].momoProvider = slots[i].pay === 'momo' ? provider : '';
    slots[i].paidBy = slots[i].pay === 'unpaid' ? null : (window.BK_ACCESS && BK_ACCESS.operationalActor ? BK_ACCESS.operationalActor() : null);
    slots[i].paidAt = slots[i].pay === 'unpaid' ? 0 : Date.now();
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

  function setDiscount(r, approval){
    const slot = slots[active];
    if(!slot || slot.issued) return false;
    if(DISCOUNTS.applySlotDiscount) DISCOUNTS.applySlotDiscount(slot, r, approval, Date.now());
    else {
      slot.discountRate = normalizeDiscount(r);
      slot.discountApprovedBy = slot.discountRate && approval && typeof approval === 'object' ? approval : null;
      slot.discountApprovedAt = slot.discountRate ? Date.now() : 0;
    }
    discountRate = 0;
    save();
    return true;
  }

  // getters
  function getState(){ return {slots, active, discountRate}; }
  function setState(st){
    const n = normalizeState(st || {});
    slots = n.slots; active = n.active; discountRate = n.discountRate; orderSeq = n.orderSeq; updatedAt = n.updatedAt;
    rememberCounter(knownSequenceFloor());
    save();
    repairOrderNumbers().catch(function(e){ console.warn('order number repair failed:', e && e.message); });
  }

  // expose
  window.BK_STATE = {
    load, save, clearAll, clearStorage,
    addSlot, renameActive, deleteActive, setActive, updateSlot,
    setActiveName,
    addItem, addItemForKey, undo, decItemForKey, removeItemForKey, replaceMenuGroup, setPay, setIssued, toggleDone, setDoneForKey,
    setPackMode,
    setDiscount,
    getState, setState, whenReady, allocateOrderNo, repairOrderNumbers, formatOrderNo, flushRemote:saveRemoteNow
  };
})();
