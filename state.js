// Slots/Discount/Undo + Persistenz

(function(){
  const SAVE_KEY = 'bk_state_v5';
  let slots = [];       // [{name, items:[{itemId,note,done:false}], pay:'unpaid'|'cash'|'momo'}]
  let active = 0;
  let discountRate = 0;
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
      pay: PAY_SET.has(slot && slot.pay) ? slot.pay : 'unpaid'
    };
  }
  function normalizeState(st){
    const rawSlots = Array.isArray(st && st.slots) ? st.slots : [];
    const nextSlots = rawSlots.map((slot, i)=> normalizeSlot(slot, i));
    if(!nextSlots.length) nextSlots.push({name:'SN1', items:[], pay:'unpaid'});
    const nextActive = clamp(Number(st && st.active) || 0, 0, Math.max(0, nextSlots.length-1));
    const nextDiscount = normalizeDiscount(st && st.discountRate);
    return { slots: nextSlots, active: nextActive, discountRate: nextDiscount };
  }

  function save(){
    try{ localStorage.setItem(SAVE_KEY, JSON.stringify({slots, active, discountRate, v:5})); }catch(e){}
  }
  function load(){
    try{
      const raw = localStorage.getItem(SAVE_KEY);
      if(!raw) return false;
      const n = normalizeState(JSON.parse(raw));
      slots = n.slots; active = n.active; discountRate = n.discountRate;
      return true;
    }catch(e){ return false; }
  }
  function clearAll(){
    slots=[]; active=0; discountRate=0; history.length=0; save(); return true;
  }
  function clearStorage(){
    localStorage.removeItem(SAVE_KEY);
    localStorage.removeItem(window.BK_PRICES.KEY);
    if(window.BK_PRODUCTS && window.BK_PRODUCTS.KEY) localStorage.removeItem(window.BK_PRODUCTS.KEY);
    if(window.BK_IMAGES && window.BK_IMAGES.KEY) localStorage.removeItem(window.BK_IMAGES.KEY);
    if(window.BK_STOCK && window.BK_STOCK.KEY) localStorage.removeItem(window.BK_STOCK.KEY);
  }

  function ensureSlot(){ if(!slots.length) addSlot(); }
  function addSlot(label){
    const idx = slots.length+1;
    slots.push({name: label || `SN${idx}`, items: [], pay:'unpaid'});
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
  function decItemForKey(key){
    const s = slots[active]; if(!s) return;
    const [id, note=''] = parseItemKey(key);
    const idx = s.items.findIndex(it => it.itemId===id && (it.note||'')===note);
    if(idx>-1){ s.items.splice(idx,1); save(); }
  }
  function setPay(i,status){
    if(!slots[i]) return;
    slots[i].pay = PAY_SET.has(status) ? status : 'unpaid';
    save();
  }
  function toggleDone(i, j, v){ slots[i].items[j].done = !!v; save(); }

  function setDiscount(r){ discountRate = normalizeDiscount(r); save(); }

  // getters
  function getState(){ return {slots, active, discountRate}; }
  function setState(st){
    const n = normalizeState(st || {});
    slots = n.slots; active = n.active; discountRate = n.discountRate;
    save();
  }

  // expose
  window.BK_STATE = {
    load, save, clearAll, clearStorage,
    addSlot, renameActive, deleteActive, setActive,
    setActiveName,
    addItem, undo, decItemForKey, setPay, toggleDone,
    setDiscount,
    getState, setState
  };
})();
