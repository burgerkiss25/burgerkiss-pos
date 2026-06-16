const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const landing = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const order = fs.readFileSync(path.join(root, 'order.html'), 'utf8');
const shift = fs.readFileSync(path.join(root, 'shift.html'), 'utf8');
const purchases = fs.readFileSync(path.join(root, 'purchases.html'), 'utf8');
const main = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'ui.js'), 'utf8');

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
  assert.match(shift, /Shift Tools/);
  assert.match(shift, /shift_reports\.js/);
  assert.match(shift, /shift\.js/);
  assert.match(shift, /shiftOrderDetailModal/);
  assert.match(shift, /purchases\.html/);
  assert.doesNotMatch(shift, /id="shiftPurchaseForm"/);
  assert.doesNotMatch(shift, /ui\.js|main\.js|id="buttons"|id="orderCart"/);
});

test('finishing the final open order returns to the landing page', () => {
  const markIssued = ui.slice(ui.indexOf('function markIssued('), ui.indexOf('function historyStatusLabel'));
  assert.match(markIssued, /if\(!nextState\.slots\.length\)\{[\s\S]*BK_STATE\.flushRemote[\s\S]*window\.location\.replace\('index\.html'\)/);
  assert.doesNotMatch(markIssued, /if\(!nextState\.slots\.length\) goTab\('order'\)/);
});

test('a completed order cannot be restored by an older remote snapshot', () => {
  const state = fs.readFileSync(path.join(root, 'state.js'), 'utf8');
  assert.match(state, /if\(updatedAt && Number\(raw\.ts\) <= updatedAt\) return false;/);
  assert.match(state, /flushRemote:saveRemoteNow/);
});


test('purchase entry is isolated and requires purchaser PIN confirmation', () => {
  assert.match(purchases, /purchaseAuthForm/);
  assert.match(purchases, /authorizeStaffPin|purchases\.js/);
  assert.match(purchases, /Receipt is in purse/);
  assert.doesNotMatch(purchases, /ui\.js|main\.js|id="buttons"|id="orderCart"/);
});
