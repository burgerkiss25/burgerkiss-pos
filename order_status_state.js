// Order slot status helpers for issue, packaging and kitchen progress.
(function(root){
  'use strict';

  function setIssued(slot, value){
    if(!slot) return false;
    if(slot.issued && value === false) return false;
    slot.issued = !!value;
    return true;
  }

  function setPackMode(slot, mode){
    if(!slot || slot.issued) return false;
    slot.packMode = mode === 'split' ? 'split' : 'shared';
    slot.packAsked = true;
    return true;
  }

  function toggleDone(slot, itemIndex, value){
    if(!slot || slot.issued || !slot.items[itemIndex]) return false;
    slot.items[itemIndex].done = !!value;
    return true;
  }

  function setDoneForKey(slot, keyParts, value){
    if(!slot || slot.issued) return false;
    const id = keyParts && keyParts[0] || '';
    const note = keyParts && keyParts[1] || '';
    const menuGroupId = keyParts && keyParts[2] || '';
    let changed = false;
    slot.items.forEach(function(item){
      if(item.itemId === id && (item.note || '') === note && (!menuGroupId || (item.menuGroupId || '') === menuGroupId)){
        item.done = !!value;
        changed = true;
      }
    });
    return changed;
  }

  root.BK_ORDER_STATUS_STATE = {
    setIssued,
    setPackMode,
    toggleDone,
    setDoneForKey
  };

  if(typeof module !== 'undefined' && module.exports){
    module.exports = root.BK_ORDER_STATUS_STATE;
  }
})(typeof window !== 'undefined' ? window : globalThis);
