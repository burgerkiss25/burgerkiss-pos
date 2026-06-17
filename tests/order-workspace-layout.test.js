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
  assert.match(access, /id="btnStockOverview"/);
  assert.match(access, /id="btnHistory"/);
  assert.match(access, /id="btnReceipt"/);
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
  assert.match(css, /#orderFlowNav \.workflow-next-copy small\{display:none\}/);
  assert.match(css, /#orderFlowNav \.workflow-next-button\{min-height:38px/);
});
