const assert = require('assert');
const fs = require('fs');

const ui = fs.readFileSync('ui.js', 'utf8');
const state = fs.readFileSync('state.js', 'utf8');
const css = fs.readFileSync('style.css', 'utf8');

assert(ui.includes('initialValues'), 'modifier sheet accepts initial values for editing existing menu choices');
assert(ui.includes('function editMenuEntry'), 'cart menu rows can reopen the menu editor');
assert(ui.includes('function editSingleEntry'), 'cart single-item rows can reopen the item add-on editor');
assert(ui.includes('singleProductItems'), 'single-item updates reuse one item builder for add and edit flows');
assert(ui.includes('currentMenuSelection'), 'existing menu group is converted back into modifier selections');
assert(ui.includes('guidedMenuItems'), 'menu updates reuse one item builder for add and edit flows');
assert(ui.includes('Edit menu'), 'cart exposes an explicit Edit menu action');
assert(ui.includes('cart-child-actions'), 'cart child add-ons expose inline quantity actions');
assert(ui.includes('adjustCartChild'), 'cart child extras can be adjusted without rebuilding the menu');
assert(state.includes('replaceMenuGroup'), 'state can replace an existing menu group atomically');
assert(css.includes('.cart-child-actions'), 'cart child action controls are styled');
