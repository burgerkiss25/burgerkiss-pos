const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const landing = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const order = fs.readFileSync(path.join(root, 'order.html'), 'utf8');
const main = fs.readFileSync(path.join(root, 'main.js'), 'utf8');

test('landing page is standalone and does not load the POS application', () => {
  assert.match(landing, /order\.html\?start=walkin/);
  assert.match(landing, /order\.html\?start=online/);
  assert.doesNotMatch(landing, /ui\.js|main\.js|firebase-app-compat|id="buttons"|id="orderCart"/);
});

test('product catalog exists only on the order page', () => {
  assert.match(order, /id="buttons"/);
  assert.match(order, /id="orderCart"/);
  assert.doesNotMatch(order, /id="orderWelcome"|id="btnStartWalkin"|id="btnStartOnline"/);
});

test('order page consumes an explicit start mode after state and access are ready', () => {
  assert.match(main, /entryMode === 'walkin'/);
  assert.match(main, /entryMode === 'online'/);
  assert.match(main, /document\.addEventListener\('bk-access-ready', handleOrderPageEntry\)/);
  assert.match(main, /window\.location\.replace\('index\.html'\)/);
});
