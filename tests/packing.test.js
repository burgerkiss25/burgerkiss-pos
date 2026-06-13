const assert = require('node:assert/strict');
const test = require('node:test');
const packing = require('../packing.js');
const products = [
  {id:'burger',cat:'burger'}, {id:'fries',cat:'fries'}, {id:'cola',cat:'drink'}, {id:'fanta',cat:'drink'},
  {id:'i_sauce_ketchup',cat:'extra'}, {id:'x_sauce_mayo',cat:'extra'}
];
function item(itemId, extra={}){ return Object.assign({itemId}, extra); }
test('two menus without extras need no assignment', ()=>{
  const slot={items:[item('burger',{menuGroupId:'m1',menuName:'Cheese Menu'}),item('cola',{menuGroupId:'m1',menuRole:'drink'}),item('burger',{menuGroupId:'m2',menuName:'Hamburger Menu'}),item('fanta',{menuGroupId:'m2',menuRole:'drink'})]};
  assert.equal(packing.needsAssignment(slot,products),false);
  assert.equal(packing.needsDrinkChoice(slot,products),true);
});
test('extra item beside multiple menus requires explicit assignment', ()=>{
  const slot={items:[item('burger',{menuGroupId:'m1'}),item('burger',{menuGroupId:'m2'}),item('fries')]};
  assert.equal(packing.needsAssignment(slot,products),true);
});
test('drink bags can be shared or separated by customer', ()=>{
  const slot={items:[item('cola',{customerGroupId:'g1'}),item('fanta',{customerGroupId:'g2'})],drinkPackMode:'shared'};
  assert.equal(packing.drinkBagCount(slot,products,2),1);
  slot.drinkPackMode='by-customer';
  assert.equal(packing.drinkBagCount(slot,products,2),2);
});
test('included and paid sauces stay with their linked food without a packing question', ()=>{
  const slot={items:[
    item('fries'),
    item('i_sauce_ketchup',{note:'included for Fries'}),
    item('x_sauce_mayo',{note:'extra for Fries'})
  ]};
  assert.deepEqual(packing.assignableItems(slot,products).map(entry=>entry.item.itemId),['fries']);
  assert.equal(packing.needsPackingReview(slot,products),false);
});
