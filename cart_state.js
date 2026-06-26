// Cart item mutation helpers for active order slots.
(function(root){
  'use strict';

  function parseItemKey(key){
    try{
      const arr = JSON.parse(key);
      if(Array.isArray(arr) && typeof arr[0] === 'string'){
        return [arr[0], typeof arr[1] === 'string' ? arr[1] : '', typeof arr[2] === 'string' ? arr[2] : ''];
      }
    }catch(error){}
    const legacy = String(key || '').split('|');
    return [legacy[0] || '', legacy[1] || '', ''];
  }

  function itemFromDetails(id, note, details){
    const meta = details && typeof details === 'object' ? details : {};
    return {
      itemId: id,
      note: (note || '').trim(),
      done: false,
      menuGroupId: typeof meta.menuGroupId === 'string' ? meta.menuGroupId : '',
      menuName: typeof meta.menuName === 'string' ? meta.menuName : '',
      menuRole: typeof meta.menuRole === 'string' ? meta.menuRole : '',
      menuNoSauce: !!meta.menuNoSauce,
      customerGroupId: typeof meta.customerGroupId === 'string' ? meta.customerGroupId : '',
      packGroupId: typeof meta.packGroupId === 'string' ? meta.packGroupId : ''
    };
  }

  function invalidateForCartChange(slot, clearDiscount){
    if(!slot) return;
    slot.packAsked = false;
    slot.sentToKitchen = false;
    if(typeof clearDiscount === 'function') clearDiscount(slot);
  }

  function addItem(slot, id, note, details, clearDiscount){
    if(!slot || slot.issued || !id) return false;
    invalidateForCartChange(slot, clearDiscount);
    slot.items.push(itemFromDetails(id, note, details));
    return true;
  }

  function decItemForKey(slot, key, clearDiscount){
    if(!slot || slot.issued) return false;
    const parts = parseItemKey(key);
    const id = parts[0];
    const note = parts[1] || '';
    const menuGroupId = parts[2] || '';
    const idx = slot.items.findIndex(it => it.itemId === id && (it.note || '') === note && (!menuGroupId || (it.menuGroupId || '') === menuGroupId));
    if(idx < 0) return false;
    slot.items.splice(idx, 1);
    invalidateForCartChange(slot, clearDiscount);
    return true;
  }

  function removeItemForKey(slot, key, clearDiscount){
    if(!slot || slot.issued) return false;
    const parts = parseItemKey(key);
    const id = parts[0];
    const note = parts[1] || '';
    const menuGroupId = parts[2] || '';
    const next = slot.items.filter(it => !(it.itemId === id && (it.note || '') === note && (!menuGroupId || (it.menuGroupId || '') === menuGroupId)));
    if(next.length === slot.items.length) return false;
    slot.items = next;
    invalidateForCartChange(slot, clearDiscount);
    return true;
  }

  function replaceMenuGroup(slot, menuGroupId, nextItems, clearDiscount){
    if(!slot || slot.issued || !menuGroupId) return false;
    const replacements = Array.isArray(nextItems) ? nextItems : [];
    slot.items = slot.items
      .filter(it => (it.menuGroupId || '') !== menuGroupId)
      .concat(replacements.map(it => itemFromDetails(it.itemId, it.note, Object.assign({}, it, {menuGroupId}))));
    invalidateForCartChange(slot, clearDiscount);
    return true;
  }

  root.BK_CART_STATE = {
    parseItemKey,
    itemFromDetails,
    invalidateForCartChange,
    addItem,
    decItemForKey,
    removeItemForKey,
    replaceMenuGroup
  };

  if(typeof module !== 'undefined' && module.exports){
    module.exports = root.BK_CART_STATE;
  }
})(typeof window !== 'undefined' ? window : globalThis);
