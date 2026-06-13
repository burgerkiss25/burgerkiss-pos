const assert = require('node:assert/strict');
const test = require('node:test');
const packing = require('../packing.js');
const products = [
  {id:'burger',cat:'burger'}, {id:'fries',cat:'fries'}, {id:'cola',cat:'drink'}, {id:'fanta',cat:'drink'}
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
