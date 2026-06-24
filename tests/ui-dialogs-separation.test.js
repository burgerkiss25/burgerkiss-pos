const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const ui = fs.readFileSync(path.join(root, 'ui.js'), 'utf8');
const dialogs = fs.readFileSync(path.join(root, 'ui_dialogs.js'), 'utf8');
const order = fs.readFileSync(path.join(root, 'order.html'), 'utf8');
const admin = fs.readFileSync(path.join(root, 'admin.html'), 'utf8');

test('shared app dialog helpers live outside the main UI bundle', () => {
  assert.match(dialogs, /root\.BK_DIALOGS = \{ ensureHost, close, info, confirm, handoverChecklist \}/);
  assert.match(ui, /const DIALOGS = window\.BK_DIALOGS \|\| \{\}/);
  assert.match(ui, /function requestDiscountApproval\(rate\)/);
  assert.doesNotMatch(ui, /host\.innerHTML = '<div class="sheet"><header><b id="appDialogTitle"><\/b><\/header><div class="body" id="appDialogBody"><\/div><\/div>'/);
});

test('pages load dialog helpers before ui.js', () => {
  assert.ok(order.indexOf('ui_dialogs.js') > -1, 'order page should load ui_dialogs.js');
  assert.ok(admin.indexOf('ui_dialogs.js') > -1, 'admin page should load ui_dialogs.js');
  assert.ok(order.indexOf('ui_dialogs.js') < order.indexOf('ui.js'), 'order page should load dialogs before ui.js');
  assert.ok(admin.indexOf('ui_dialogs.js') < admin.indexOf('ui.js'), 'admin page should load dialogs before ui.js');
});
