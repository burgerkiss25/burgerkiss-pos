const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const landing = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const order = fs.readFileSync(path.join(root, 'order.html'), 'utf8');
const shift = fs.readFileSync(path.join(root, 'shift.html'), 'utf8');
const purchases = fs.readFileSync(path.join(root, 'purchases.html'), 'utf8');
const purchasesJs = fs.readFileSync(path.join(root, 'purchases.js'), 'utf8');
const main = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'ui.js'), 'utf8');
const workflowState = fs.readFileSync(path.join(root, 'workflow_state.js'), 'utf8');
const productGridState = fs.readFileSync(path.join(root, 'product_grid_state.js'), 'utf8');

function scriptIndex(html, file){
  return html.indexOf(`src="./${file}`);
}

test('landing page requires access before workspace selection', () => {
  assert.match(landing, /access\.js/);
  assert.match(landing, /entry\.js/);
  assert.match(landing, /entry-locked/);
  assert.match(landing, /order\.html\?start=walkin/);
  assert.match(landing, /order\.html\?start=online/);
  assert.match(landing, /shift\.html/);
  assert.doesNotMatch(landing, /ui\.js|main\.js|id="buttons"|id="orderCart"/);
});

test('product catalog exists only on the order page', () => {
  assert.match(order, /id="buttons"/);
  assert.match(order, /id="orderCart"/);
  assert.doesNotMatch(order, /id="orderWelcome"|id="btnStartWalkin"|id="btnStartOnline"/);
});

test('order page consumes only order start modes after state and access are ready', () => {
  assert.match(main, /entryMode === 'walkin'/);
  assert.match(main, /entryMode === 'online'/);
  assert.doesNotMatch(main, /entryMode === 'shift'/);
  const entryHandler = main.slice(main.indexOf('function handleOrderPageEntry'), main.indexOf("document.addEventListener('bk-access-ready'"));
  assert.doesNotMatch(entryHandler, /BK_UI\.openHistory\(\)/);
  assert.match(main, /document\.addEventListener\('bk-access-ready', handleOrderPageEntry\)/);
  assert.match(main, /window\.location\.replace\('index\.html'\)/);
});

test('shift tools are isolated on a dedicated page without the order UI bundle', () => {
  assert.match(shift, /Daily Sales/);
  assert.match(shift, /data-shift-view="schedule"/);
  assert.match(shift, /data-shift-view="absences"/);
  assert.match(shift, /data-shift-view="payroll"/);
  assert.match(shift, /data-shift-view="closeout"/);
  assert.match(shift, /data-shift-panel="schedule"/);
  assert.match(shift, /data-shift-panel="closeout" hidden/);
  assert.match(shift, /shift_reports\.js/);
  assert.match(shift, /shift\.js/);
  assert.match(shift, /shiftOrderDetailModal/);
  assert.match(shift, /purchases\.html/);
  assert.doesNotMatch(shift, /id="shiftPurchaseForm"/);
  assert.doesNotMatch(shift, /ui\.js|main\.js|id="buttons"|id="orderCart"/);
});

test('finishing the final open order returns to the landing page', () => {
  const markIssued = ui.slice(ui.indexOf('function markIssued('), ui.indexOf('function isOwnerSession'));
  assert.match(markIssued, /if\(!nextState\.slots\.length\)\{[\s\S]*BK_STATE\.flushRemote[\s\S]*window\.location\.replace\('index\.html'\)/);
  assert.doesNotMatch(markIssued, /if\(!nextState\.slots\.length\) goTab\('order'\)/);
});

test('a completed order cannot be restored by an older remote snapshot', () => {
  const state = fs.readFileSync(path.join(root, 'state.js'), 'utf8');
  assert.match(state, /if\(updatedAt && Number\(raw\.ts\) <= updatedAt\) return false;/);
  assert.match(state, /flushRemote:saveRemoteNow/);
});

test('state normalization helpers are split from state orchestration', () => {
  const state = fs.readFileSync(path.join(root, 'state.js'), 'utf8');
  const normalizers = fs.readFileSync(path.join(root, 'state_normalizers.js'), 'utf8');
  assert.match(normalizers, /root\.BK_STATE_NORMALIZERS = \{/);
  assert.match(normalizers, /function normalizeSlot\(slot, idx\)/);
  assert.match(normalizers, /function normalizeState\(st\)/);
  assert.match(state, /const NORMALIZERS = window\.BK_STATE_NORMALIZERS \|\| \{\}/);
  assert.doesNotMatch(state, /function normalizeItem\(it\)/);
  assert.ok(scriptIndex(order, 'state_normalizers.js') > -1 && scriptIndex(order, 'state_normalizers.js') < scriptIndex(order, 'state.js'));
  const admin = fs.readFileSync(path.join(root, 'admin.html'), 'utf8');
  assert.ok(scriptIndex(admin, 'state_normalizers.js') > -1 && scriptIndex(admin, 'state_normalizers.js') < scriptIndex(admin, 'state.js'));
});

test('order number helpers are split from state orchestration', () => {
  const state = fs.readFileSync(path.join(root, 'state.js'), 'utf8');
  const service = fs.readFileSync(path.join(root, 'order_number_service.js'), 'utf8');
  const admin = fs.readFileSync(path.join(root, 'admin.html'), 'utf8');
  assert.match(service, /root\.BK_ORDER_NUMBER_SERVICE = \{/);
  assert.match(service, /function parseOrderSequence\(orderNo\)/);
  assert.match(service, /function formatOrderNo\(seq/);
  assert.match(service, /function knownSequenceFloor/);
  assert.match(state, /const ORDER_NUMBERS = window\.BK_ORDER_NUMBER_SERVICE \|\| \{\}/);
  assert.ok(scriptIndex(order, 'order_number_service.js') > -1 && scriptIndex(order, 'order_number_service.js') < scriptIndex(order, 'state.js'));
  assert.ok(scriptIndex(admin, 'order_number_service.js') > -1 && scriptIndex(admin, 'order_number_service.js') < scriptIndex(admin, 'state.js'));
});

test('state persistence helpers are split from state orchestration', () => {
  const state = fs.readFileSync(path.join(root, 'state.js'), 'utf8');
  const persistence = fs.readFileSync(path.join(root, 'state_persistence.js'), 'utf8');
  const admin = fs.readFileSync(path.join(root, 'admin.html'), 'utf8');
  assert.match(persistence, /root\.BK_STATE_PERSISTENCE = \{/);
  assert.match(persistence, /function readState\(storage, key\)/);
  assert.match(persistence, /function writeState\(storage, key, payload\)/);
  assert.match(persistence, /function clearAppStorage\(storage, keys\)/);
  assert.match(state, /const PERSISTENCE = window\.BK_STATE_PERSISTENCE \|\| \{\}/);
  assert.ok(scriptIndex(order, 'state_persistence.js') > -1 && scriptIndex(order, 'state_persistence.js') < scriptIndex(order, 'state.js'));
  assert.ok(scriptIndex(admin, 'state_persistence.js') > -1 && scriptIndex(admin, 'state_persistence.js') < scriptIndex(admin, 'state.js'));
});

test('state remote helpers are split from state orchestration', () => {
  const state = fs.readFileSync(path.join(root, 'state.js'), 'utf8');
  const remote = fs.readFileSync(path.join(root, 'state_remote.js'), 'utf8');
  const admin = fs.readFileSync(path.join(root, 'admin.html'), 'utf8');
  assert.match(remote, /root\.BK_STATE_REMOTE = \{/);
  assert.match(remote, /function remoteEnabled\(\)/);
  assert.match(remote, /function saveState\(payload\)/);
  assert.match(remote, /function loadState\(\)/);
  assert.match(remote, /function reserveOrderSequence\(floor\)/);
  assert.match(state, /const REMOTE = window\.BK_STATE_REMOTE \|\| \{\}/);
  assert.ok(scriptIndex(order, 'state_remote.js') > -1 && scriptIndex(order, 'state_remote.js') < scriptIndex(order, 'state.js'));
  assert.ok(scriptIndex(admin, 'state_remote.js') > -1 && scriptIndex(admin, 'state_remote.js') < scriptIndex(admin, 'state.js'));
});

test('discount helpers are split from state orchestration', () => {
  const state = fs.readFileSync(path.join(root, 'state.js'), 'utf8');
  const discounts = fs.readFileSync(path.join(root, 'discount_state.js'), 'utf8');
  const admin = fs.readFileSync(path.join(root, 'admin.html'), 'utf8');
  assert.match(discounts, /root\.BK_DISCOUNT_STATE = \{/);
  assert.match(discounts, /function clearSlotDiscount\(slot\)/);
  assert.match(discounts, /function applySlotDiscount\(slot, rate, approval/);
  assert.match(state, /const DISCOUNTS = window\.BK_DISCOUNT_STATE \|\| \{\}/);
  assert.ok(scriptIndex(order, 'discount_state.js') > -1 && scriptIndex(order, 'discount_state.js') < scriptIndex(order, 'state.js'));
  assert.ok(scriptIndex(admin, 'discount_state.js') > -1 && scriptIndex(admin, 'discount_state.js') < scriptIndex(admin, 'state.js'));
});

test('cart helpers are split from state orchestration', () => {
  const state = fs.readFileSync(path.join(root, 'state.js'), 'utf8');
  const cartState = fs.readFileSync(path.join(root, 'cart_state.js'), 'utf8');
  const admin = fs.readFileSync(path.join(root, 'admin.html'), 'utf8');
  assert.match(cartState, /root\.BK_CART_STATE = \{/);
  assert.match(cartState, /function parseItemKey\(key\)/);
  assert.match(cartState, /function addItem\(slot, id, note, details/);
  assert.match(cartState, /function replaceMenuGroup\(slot, menuGroupId, nextItems/);
  assert.match(state, /const CART = window\.BK_CART_STATE \|\| \{\}/);
  assert.ok(scriptIndex(order, 'cart_state.js') > -1 && scriptIndex(order, 'cart_state.js') < scriptIndex(order, 'state.js'));
  assert.ok(scriptIndex(admin, 'cart_state.js') > -1 && scriptIndex(admin, 'cart_state.js') < scriptIndex(admin, 'state.js'));
});

test('payment and order status helpers are split from state orchestration', () => {
  const state = fs.readFileSync(path.join(root, 'state.js'), 'utf8');
  const payments = fs.readFileSync(path.join(root, 'payment_state.js'), 'utf8');
  const status = fs.readFileSync(path.join(root, 'order_status_state.js'), 'utf8');
  const admin = fs.readFileSync(path.join(root, 'admin.html'), 'utf8');
  assert.match(payments, /root\.BK_PAYMENT_STATE = \{/);
  assert.match(payments, /function applyPayment\(slot, status, provider, actor/);
  assert.match(status, /root\.BK_ORDER_STATUS_STATE = \{/);
  assert.match(status, /function setDoneForKey\(slot, keyParts, value\)/);
  assert.match(state, /const PAYMENTS = window\.BK_PAYMENT_STATE \|\| \{\}/);
  assert.match(state, /const ORDER_STATUS = window\.BK_ORDER_STATUS_STATE \|\| \{\}/);
  assert.ok(scriptIndex(order, 'payment_state.js') > -1 && scriptIndex(order, 'payment_state.js') < scriptIndex(order, 'state.js'));
  assert.ok(scriptIndex(order, 'order_status_state.js') > -1 && scriptIndex(order, 'order_status_state.js') < scriptIndex(order, 'state.js'));
  assert.ok(scriptIndex(admin, 'payment_state.js') > -1 && scriptIndex(admin, 'payment_state.js') < scriptIndex(admin, 'state.js'));
  assert.ok(scriptIndex(admin, 'order_status_state.js') > -1 && scriptIndex(admin, 'order_status_state.js') < scriptIndex(admin, 'state.js'));
});

test('slot helpers are split from state orchestration', () => {
  const state = fs.readFileSync(path.join(root, 'state.js'), 'utf8');
  const slotState = fs.readFileSync(path.join(root, 'slot_state.js'), 'utf8');
  const admin = fs.readFileSync(path.join(root, 'admin.html'), 'utf8');
  assert.match(slotState, /root\.BK_SLOT_STATE = \{/);
  assert.match(slotState, /function createSlot\(index, label, details, orderNo/);
  assert.match(slotState, /function updateSlot\(slot, changes, index, normalizeSlot\)/);
  assert.match(state, /const SLOTS = window\.BK_SLOT_STATE \|\| \{\}/);
  assert.ok(scriptIndex(order, 'slot_state.js') > -1 && scriptIndex(order, 'slot_state.js') < scriptIndex(order, 'state.js'));
  assert.ok(scriptIndex(admin, 'slot_state.js') > -1 && scriptIndex(admin, 'slot_state.js') < scriptIndex(admin, 'state.js'));
});

test('undo helpers are split from state orchestration', () => {
  const state = fs.readFileSync(path.join(root, 'state.js'), 'utf8');
  const undoState = fs.readFileSync(path.join(root, 'undo_state.js'), 'utf8');
  const admin = fs.readFileSync(path.join(root, 'admin.html'), 'utf8');
  assert.match(undoState, /root\.BK_UNDO_STATE = \{/);
  assert.match(undoState, /function recordItemAdd\(history, slotIndex\)/);
  assert.match(undoState, /function undoLastItem\(history, slots\)/);
  assert.match(state, /const UNDO = window\.BK_UNDO_STATE \|\| \{\}/);
  assert.ok(scriptIndex(order, 'undo_state.js') > -1 && scriptIndex(order, 'undo_state.js') < scriptIndex(order, 'state.js'));
  assert.ok(scriptIndex(admin, 'undo_state.js') > -1 && scriptIndex(admin, 'undo_state.js') < scriptIndex(admin, 'state.js'));
});

test('workflow progression helpers are split from UI rendering', () => {
  assert.match(workflowState, /root\.BK_WORKFLOW_STATE = \{/);
  assert.match(workflowState, /function workflowNextState\(stage, slot\)/);
  assert.match(workflowState, /function platformLabel\(source\)/);
  assert.match(ui, /const WORKFLOW_STATE = window\.BK_WORKFLOW_STATE \|\| \{\}/);
  assert.match(ui, /WORKFLOW_STATE\.workflowNextState\(stage, slot\)/);
  assert.ok(scriptIndex(order, 'workflow_state.js') > -1 && scriptIndex(order, 'workflow_state.js') < scriptIndex(order, 'ui.js'));
});

test('product grid filtering and paging helpers are split from UI rendering', () => {
  assert.match(productGridState, /root\.BK_PRODUCT_GRID_STATE = \{/);
  assert.match(productGridState, /function productsPerPage\(width, height\)/);
  assert.match(productGridState, /function visibleProducts\(base, category, query\)/);
  assert.match(productGridState, /function pageModel\(base, category, query, requestedPage, viewport\)/);
  assert.match(ui, /const PRODUCT_GRID_STATE = window\.BK_PRODUCT_GRID_STATE \|\| \{\}/);
  assert.match(ui, /PRODUCT_GRID_STATE\.pageModel\(base, currentCat, productQuery, productPage/);
  assert.ok(scriptIndex(order, 'product_grid_state.js') > -1 && scriptIndex(order, 'product_grid_state.js') < scriptIndex(order, 'ui.js'));
});


test('purchase entry is isolated and requires purchaser PIN confirmation', () => {
  assert.match(purchases, /purchaseAuthForm/);
  assert.match(purchases, /authorizeStaffPin|purchases\.js/);
  assert.match(purchases, /Receipt is in purse/);
  assert.match(purchases, /purchaseExport/);
  assert.doesNotMatch(purchases, /ui\.js|main\.js|id="buttons"|id="orderCart"/);
  assert.doesNotMatch(purchasesJs, /\.innerHTML\s*=/);
  assert.match(purchasesJs, /select\.replaceChildren/);
  assert.match(purchasesJs, /host\.replaceChildren\(title, \.\.\.rows\)/);
});
