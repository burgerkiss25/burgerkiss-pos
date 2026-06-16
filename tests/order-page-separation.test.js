const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const landing = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const order = fs.readFileSync(path.join(root, 'order.html'), 'utf8');
const main = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'ui.js'), 'utf8');

test('landing page is standalone and does not load the POS application', () => {
  assert.match(landing, /order\.html\?start=walkin/);
  assert.match(landing, /order\.html\?start=online/);
  assert.match(landing, /order\.html\?start=shift/);
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
  assert.match(main, /entryMode === 'shift'/);
  assert.match(main, /BK_UI\.openHistory\(\)/);
  assert.match(main, /document\.addEventListener\('bk-access-ready', handleOrderPageEntry\)/);
  assert.match(main, /window\.location\.replace\('index\.html'\)/);
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
