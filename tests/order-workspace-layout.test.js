const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'order.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'ui.js'), 'utf8');
const access = fs.readFileSync(path.join(root, 'access.js'), 'utf8');
const main = fs.readFileSync(path.join(root, 'main.js'), 'utf8');

test('order header no longer duplicates cart totals or technical order context', () => {
  assert.doesNotMatch(html, /id="grand"|id="combosPill"|id="discountTag"|id="activeSlotLabel"/);
  assert.match(html, /id="currentOrderMeta"/);
});

test('employee tools live inside the staff session menu', () => {
  assert.doesNotMatch(html, /class="more-menu"/);
  assert.match(access, /id = 'btnStockOverview'|id:'btnStockOverview'/);
  assert.match(access, /id:'btnHistory'/);
  assert.match(access, /id:'btnReceipt'/);
  assert.doesNotMatch(access, /id="btnDailyReport"/);
  assert.match(access, /History \/ Daily Report/);
  assert.match(html, /id="hDailyReport"/);
  assert.match(main, /closest\('#btnStockOverview, #btnHistory, #btnReceipt, #btnClearStorage'\)/);
});

test('discount controls and active order identity live in Current order', () => {
  const cart = html.slice(html.indexOf('<aside class="order-side'), html.indexOf('</aside>'));
  assert.match(cart, /id="currentOrderMeta"/);
  assert.match(cart, /class="order-discount-row"/);
  assert.match(cart, /id="currentDiscountLabel"/);
  assert.match(ui, /Order #\$\{shortOrderNumber\(s\.orderNo\)\} · \$\{orderChannelText\(s\)\}/);
});

test('empty orders use employee-friendly status language', () => {
  assert.match(ui, /label:'New'/);
  assert.match(ui, /label:'In progress'/);
  assert.doesNotMatch(ui, /label:'Draft'/);
});

test('continue to kitchen remains compact inside the current order', () => {
  assert.match(css, /#orderFlowNav\.workflow-next\{flex-wrap:nowrap/);
  assert.match(css, /#orderFlowNav \.workflow-next-copy small\{display:block/);
  assert.match(css, /#orderFlowNav \.workflow-next-button\{min-height:38px/);
});

test('order step explains blockers and next action', () => {
  assert.match(ui, /title:'Add products first'/);
  assert.match(ui, /Choose at least one product from the product grid before sending this order to Kitchen/);
  assert.match(ui, /title:`\$\{platformLabel\(slot\.orderSource\)\} order ready`/);
  assert.match(css, /#orderFlowNav \.workflow-next-copy small\{display:block/);
});

test('online order dialog guides platform entry before products', () => {
  assert.match(ui, /guide\.className = 'online-order-guide'/);
  assert.match(ui, /hint\.id = 'onlinePaymentHint'/);
  assert.match(ui, /nameInput\.id = 'onlineCustomerName'/);
  assert.match(ui, /WhatsApp stays unpaid until pickup\/delivery is confirmed before Kitchen/);
  assert.match(ui, /is treated as paid online/);
  assert.match(css, /\.online-order-guide,\.online-platform-hint/);
});


test('product grid renders dynamic labels with textContent instead of card innerHTML', () => {
  assert.doesNotMatch(ui, /b\.innerHTML\s*=/);
  assert.doesNotMatch(ui, /empty\.innerHTML\s*=/);
  assert.match(ui, /catBadge\.textContent = catLabel/);
  assert.match(ui, /name\.textContent = it\.name/);
  assert.match(ui, /subtitle\.textContent = it\.subtitle/);
  assert.match(ui, /price\.textContent = `\$\{itemDisplayPrice\(it\)\} GHS`/);
});


test('order slot chips render dynamic status text with textContent', () => {
  assert.doesNotMatch(ui, /el\.innerHTML\s*=\s*`<span class="status-dot"/);
  assert.match(ui, /orderTitle\.textContent = orderLabel/);
  assert.match(ui, /orderSmall\.textContent = orderDetail/);
  assert.match(ui, /statusLabel\.textContent = status\.label/);
  assert.match(ui, /statusProgress\.textContent = status\.shortDetail/);
});


test('workflow next action renders dynamic copy without innerHTML templates', () => {
  assert.doesNotMatch(ui, /host\.innerHTML\s*=\s*`<div class="workflow-next-copy"/);
  assert.match(ui, /title\.textContent = opts\.title \|\| ''/);
  assert.match(ui, /detail\.textContent = opts\.detail \|\| ''/);
  assert.match(ui, /button\.textContent = opts\.label \|\| 'Continue'/);
});


test('kitchen order cards render dynamic progress copy with textContent', () => {
  assert.doesNotMatch(ui, /card\.innerHTML\s*=\s*`\s*<div class="slot-head kitchen-order-head"/);
  assert.match(ui, /orderTitle\.textContent = `Order #\$\{shortOrderNumber\(s\.orderNo\)\}`/);
  assert.match(ui, /packaging\.textContent = `Packaging: \$\{packagingLabel\(s\)\}`/);
  assert.match(ui, /progressTitle\.textContent = progress\.label/);
  assert.match(ui, /nextButton\.textContent = makeNext\.label/);
});


test('online order and conversion dialogs render bodies without innerHTML', () => {
  const onlineDialog = ui.slice(ui.indexOf('function openOnlineOrderDialog'), ui.indexOf('function convertOnlineOrder'));
  const conversionDialog = ui.slice(ui.indexOf('function convertOnlineOrder'), ui.indexOf('function historyRemoteEnabled'));
  assert.doesNotMatch(onlineDialog, /appDialogBody'\)\.innerHTML/);
  assert.doesNotMatch(conversionDialog, /appDialogBody'\)\.innerHTML/);
  assert.match(onlineDialog, /guide\.className = 'online-order-guide'/);
  assert.match(onlineDialog, /confirmButton\.textContent = 'Create Online Order'/);
  assert.match(conversionDialog, /summary\.className = 'online-conversion-summary'/);
  assert.match(conversionDialog, /confirmButton\.textContent = 'Convert to Direct Order'/);
});

test('modifier, meal, fulfilment and packing dialogs render bodies with DOM nodes', () => {
  const modifierDialog = ui.slice(ui.indexOf('function openModifierSheet'), ui.indexOf('function addQuantities'));
  const mealDialog = ui.slice(ui.indexOf('function openMealModeDialog'), ui.indexOf('function friesModifierSections'));
  const fulfilmentDialog = ui.slice(ui.indexOf('function whatsappOrderSetup'), ui.indexOf('function defaultPackingItems'));
  const packingDialog = ui.slice(ui.indexOf('function packingAssignmentDialog'), ui.indexOf('function continueOrderToKitchen'));
  [modifierDialog, mealDialog, fulfilmentDialog, packingDialog].forEach(source=>{
    assert.doesNotMatch(source, /appDialogBody'\)\.innerHTML/);
    assert.match(source, /appDialogBody\(\)\.replaceChildren/);
  });
  assert.match(modifierDialog, /quickBtn\.dataset\.note = noteText/);
  assert.match(mealDialog, /choices\.className = 'meal-choice'/);
  assert.match(fulfilmentDialog, /optionNode\('customer-rider'/);
  assert.match(packingDialog, /select\.dataset\.itemIndex = String\(entry\.index\)/);
});
