// Pure helpers for customer-group and packaging decisions.
(function(root){
  'use strict';
  function productById(id, products){ return (products || []).find(product=>product.id === id) || {}; }
  function menuGroups(slot){
    const groups = [];
    const seen = new Set();
    (slot && slot.items || []).forEach(item=>{
      if(!item.menuGroupId || seen.has(item.menuGroupId)) return;
      seen.add(item.menuGroupId);
      groups.push({id:item.menuGroupId, label:item.menuName || `Menu ${groups.length + 1}`});
    });
    return groups;
  }
  function isDrink(item, products){
    const product = productById(item && item.itemId, products);
    return product.cat === 'drink' || item.menuRole === 'drink';
  }
  function isExtra(item, products){
    if(!item || item.menuGroupId) return false;
    const product = productById(item.itemId, products);
    const id = String(item.itemId || '');
    if(id.startsWith('i_sauce_') || id.startsWith('x_sauce_')) return false;
    return product.cat !== 'extra';
  }
  function assignableItems(slot, products){
    return (slot && slot.items || []).map((item,index)=>({item,index,product:productById(item.itemId, products)}))
      .filter(entry=>isExtra(entry.item, products));
  }
  function customerGroupFor(item){ return item.customerGroupId || item.menuGroupId || ''; }
  function drinkGroupIds(slot, products){
    return Array.from(new Set((slot && slot.items || []).filter(item=>isDrink(item, products)).map(customerGroupFor).filter(Boolean)));
  }
  function needsDrinkChoice(slot, products){ return drinkGroupIds(slot, products).length > 1; }
  function needsAssignment(slot, products){
    if(!menuGroups(slot).length) return false;
    return assignableItems(slot, products).some(entry=>!customerGroupFor(entry.item));
  }
  function needsPackingReview(slot, products){ return needsAssignment(slot, products) || needsDrinkChoice(slot, products); }
  function drinkBagCount(slot, products, capacity){
    const size = Math.max(1, Number(capacity) || 2);
    const drinks = (slot && slot.items || []).filter(item=>isDrink(item, products));
    if(!drinks.length) return 0;
    if(slot.drinkPackMode !== 'by-customer') return Math.ceil(drinks.length / size);
    const counts = {};
    drinks.forEach(item=>{ const group = customerGroupFor(item) || 'unassigned'; counts[group] = (counts[group] || 0) + 1; });
    return Object.values(counts).reduce((sum,count)=>sum + Math.ceil(count / size), 0);
  }
  const api = {menuGroups,isDrink,isExtra,assignableItems,customerGroupFor,drinkGroupIds,needsDrinkChoice,needsAssignment,needsPackingReview,drinkBagCount};
  root.BK_PACKING = api;
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
