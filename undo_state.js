// Undo stack helpers for cart item additions.
(function(root){
  'use strict';

  function recordItemAdd(history, slotIndex){
    if(!Array.isArray(history)) return false;
    history.push({slot: Number(slotIndex) || 0});
    return true;
  }

  function undoLastItem(history, slots){
    if(!Array.isArray(history) || !Array.isArray(slots)) return false;
    const last = history.pop();
    if(!last) return false;
    const slot = slots[last.slot];
    if(!slot || !slot.items || !slot.items.length) return false;
    slot.items.pop();
    return true;
  }

  function clear(history){
    if(!Array.isArray(history)) return false;
    history.length = 0;
    return true;
  }

  root.BK_UNDO_STATE = {
    recordItemAdd,
    undoLastItem,
    clear
  };

  if(typeof module !== 'undefined' && module.exports){
    module.exports = root.BK_UNDO_STATE;
  }
})(typeof window !== 'undefined' ? window : globalThis);
