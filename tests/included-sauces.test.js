const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const addonsCode = fs.readFileSync(path.join(root, 'addons.js'), 'utf8');
const sidesCode = fs.readFileSync(path.join(root, 'sides.js'), 'utf8');
const drinksCode = fs.readFileSync(path.join(root, 'drinks.js'), 'utf8');
const dataCode = fs.readFileSync(path.join(root, 'data.js'), 'utf8');
const logicCode = fs.readFileSync(path.join(root, 'logic.js'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'ui.js'), 'utf8');
const modifiers = fs.readFileSync(path.join(root, 'modifiers.js'), 'utf8');
const stockData = fs.readFileSync(path.join(root, 'stock_data.js'), 'utf8');

function loadPricingContext(){
  const context = {window:null, console, JSON, Math, Number, String, Array, Object};
  context.window = context;
  vm.createContext(context);
  vm.runInContext(addonsCode, context);
  vm.runInContext(sidesCode, context);
  vm.runInContext(drinksCode, context);
  vm.runInContext(dataCode, context);
  context.BK_PRICES = {getPrice(id){
    const product = context.BK_DATA.BASE.find(entry=>entry.id === id);
    return product ? product.price : 0;
  }};
  vm.runInContext(logicCode, context);
  return context;
}

test('included and extra sauces are separate commercial products', () => {
  const context = loadPricingContext();
  const included = context.BK_DATA.BASE.find(entry=>entry.id === 'i_sauce_ketchup');
  const extra = context.BK_DATA.BASE.find(entry=>entry.id === 'x_sauce_ketchup');
  assert.deepStrictEqual({name:included.name, price:included.price}, {name:'Ketchup', price:0});
  assert.deepStrictEqual({name:extra.name, price:extra.price}, {name:'Extra Ketchup', price:5});
});

test('included menu sauce does not increase the menu total', () => {
  const context = loadPricingContext();
  const slot = {items:[
    {itemId:'hamburger', note:'', menuGroupId:'menu-1'},
    {itemId:'fries_standard', note:'menu for Hamburger', menuGroupId:'menu-1'},
    {itemId:'i_sauce_ketchup', note:'menu for Hamburger', menuGroupId:'menu-1'},
    {itemId:'d_cola', note:'menu for Hamburger', menuGroupId:'menu-1'}
  ]};
  assert.strictEqual(context.BK_LOGIC.computeSlot(slot).subtotal, 120);
  slot.items.push({itemId:'x_sauce_ketchup', note:'extra for Hamburger', menuGroupId:'menu-1'});
  assert.strictEqual(context.BK_LOGIC.computeSlot(slot).subtotal, 125);
});

test('legacy menu sauce ids remain free for open orders created before the split', () => {
  const context = loadPricingContext();
  const slot = {items:[
    {itemId:'hamburger', note:'', menuGroupId:'legacy-menu'},
    {itemId:'fries_standard', note:'menu for Hamburger', menuGroupId:'legacy-menu'},
    {itemId:'x_sauce_ketchup', note:'menu for Hamburger', menuGroupId:'legacy-menu'},
    {itemId:'d_cola', note:'menu for Hamburger', menuGroupId:'legacy-menu'}
  ]};
  assert.strictEqual(context.BK_LOGIC.computeSlot(slot).subtotal, 120);
});

test('included and paid sauce selectors use their respective product ids', () => {
  assert.match(modifiers, /function includedSauceOptions\(\)/);
  assert.match(modifiers, /\{label:'Ketchup', value:'i_sauce_ketchup'\}/);
  assert.match(modifiers, /\{label:'Extra Ketchup', value:'x_sauce_ketchup'\}/);
  assert.match(ui, /menuRole:'included-sauce'/);
  assert.match(ui, /menuRole:'extra-sauce'/);
});

test('extra sauces consume an additional cup while included sauces share the meal cup', () => {
  assert.match(stockData, /i_sauce_ketchup: \{ ketchup:20 \}/);
  assert.match(stockData, /x_sauce_ketchup: \{ ketchup:20, sauce_cup:1 \}/);
});
