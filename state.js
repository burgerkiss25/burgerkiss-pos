// Slots/Discount/Undo + Persistenz
(function(){
  const SAVE_KEY = 'bk_state_v5';
  let slots = [];       // [{name, items:[{itemId,note,done:false}], pay:'unpaid'|'cash'|'momo'}]
  let active = 0;
  let discountRate = 0;
  const history = [];

  function save(){
    try{ localStorage.setItem(SAVE_KEY, JSON.stringify({slots, active, discountRate, v:5})); }catch(e){}
  }
  function load(){
    try{
      const raw = localStorage.getItem(SAVE_KEY);
      if(!raw) return false;
      const s = JSON.parse(raw);
      if(!s || !Array.isArray(s.slots)) return false;
      slots = s.slots.map(slot=>({
        name: slot.name || 'SN?',
        items: Array.isArray(slot.items)? slot.items.map(it=>({
          itemId: it.itemId, note: typeof it.note==='string'?it.note:'', done: !!it.done
        })) : [],
        pay: (slot.pay==='cash'||slot.pay==='momo') ? slot.pay : 'unpaid'
      }));
      active = Math.min(Math.max(0, s.active||0), Math.max(0, slots.length-1));
      discountRate = Number(s.discountRate||0);
      return true;
    }catch(e){ return false; }
  }
  function clearAll(){
    if(!confirm('Clear all slots now? This also resets saved state.')) return false;
    slots=[]; active=0; discountRate=0; history.length=0; save(); return true;
  }
  function clearStorage(){
    if(confirm('Clear saved state & price edits?')){
      localStorage.removeItem(SAVE_KEY);
      localStorage.removeItem(window.BK_PRICES.KEY);
      location.reload();
    }
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
    const name = prompt('Rename slot', slots[active].name);
    if(name){ slots[active].name=name; save(); }
  }
  function deleteActive(){
    if(!slots.length) return;
    if(!confirm(`Delete ${slots[active].name}?`)) return;
    slots.splice(active,1);
    active = Math.max(0, active-1);
    save();
  }
  function setActive(i){ active=i; save(); }

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
  function decItemForKey(key){
    const s = slots[active]; if(!s) return;
    const [id, note=''] = key.split('|');
    const idx = s.items.findIndex(it => it.itemId===id && (it.note||'')===note);
    if(idx>-1){ s.items.splice(idx,1); save(); }
  }
  function setPay(i,status){ slots[i].pay=status; save(); }
  function toggleDone(i, j, v){ slots[i].items[j].done = !!v; save(); }

  function setDiscount(r){ discountRate = r||0; save(); }

  // getters
  function getState(){ return {slots, active, discountRate}; }
  function setState(st){ slots=st.slots; active=st.active; discountRate=st.discountRate; save(); }

  // expose
  window.BK_STATE = {
    load, save, clearAll, clearStorage,
    addSlot, renameActive, deleteActive, setActive,
    addItem, undo, decItemForKey, setPay, toggleDone,
    setDiscount,
    getState, setState
  };
})();
