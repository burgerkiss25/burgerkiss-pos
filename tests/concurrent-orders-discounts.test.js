const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'order.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
const main = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
const state = fs.readFileSync(path.join(root, 'state.js'), 'utf8');
const discountState = fs.readFileSync(path.join(root, 'discount_state.js'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'ui.js'), 'utf8');
const access = fs.readFileSync(path.join(root, 'access.js'), 'utf8');

test('operational workflows expose a compact next-order action', () => {
  assert.match(html, /id="btnWorkflowNewOrder"[^>]*>\+ New Order<\/button>/);
  assert.match(css, /\.workflow-make \.workflow-new-order,.workflow-pay \.workflow-new-order,.workflow-issue \.workflow-new-order\{display:inline-flex/);
  assert.match(main, /btnWorkflowNewOrder'\)\.onclick/);
});

test('a second order is blocked only until the current intake reaches kitchen', () => {
  const addNewOrder = ui.slice(ui.indexOf('function addNewOrderSlot()'), ui.indexOf('const ONLINE_PLATFORMS'));
  assert.match(addNewOrder, /slot\.items\.length > 0 && !slot\.sentToKitchen/);
  assert.doesNotMatch(addNewOrder, /slot\.pay === 'unpaid'/);
});

test('discounts require an owner PIN and are stored per order', () => {
  assert.match(access, /async function authorizeOwnerPin/);
  assert.match(ui, /function requestDiscountApproval\(rate\)/);
  assert.match(ui, /BK_ACCESS\.authorizeOwnerPin\(pin\.value\)/);
  assert.match(state, /DISCOUNTS\.applySlotDiscount/);
  assert.match(discountState, /slot\.discountRate = normalizeDiscount\(rate\)/);
  assert.match(state, /discountApprovedBy/);
  assert.doesNotMatch(main, /rate > 0\.03/);
});

test('cart changes invalidate an existing discount approval', () => {
  assert.match(discountState, /function clearSlotDiscount\(slot\)/);
  assert.match(state, /slots\[active\]\.sentToKitchen = false;\s*clearSlotDiscount\(slots\[active\]\)/);
});

test('generated modifier summaries are not duplicated in parent notes', () => {
  const modifierArea = ui.slice(ui.indexOf('function addBurgerExtras'), ui.indexOf('async function addGuidedMenu'));
  assert.doesNotMatch(modifierArea, /Add-ons:/);
  assert.doesNotMatch(modifierArea, /Extra sauces:/);
});
