const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'order.html'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'ui.js'), 'utf8');

test('order header no longer duplicates cart totals or technical order context', () => {
  assert.doesNotMatch(html, /id="grand"|id="combosPill"|id="discountTag"|id="activeSlotLabel"/);
  assert.match(html, /id="currentOrderMeta"/);
});

test('employee tools contain only stock, history and receipt', () => {
  const tools = html.slice(html.indexOf('<div class="more-panel">'), html.indexOf('</div>', html.indexOf('<div class="more-panel">')));
  assert.match(tools, /id="btnStockOverview"/);
  assert.match(tools, /id="btnHistory"/);
  assert.match(tools, /id="btnReceipt"/);
  assert.doesNotMatch(tools, /Summary|Group Ticket|\+ Online Order|Reset Order/);
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
