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


test('owner approval and prompt dialogs build bodies without innerHTML', () => {
  const discountDialog = ui.slice(ui.indexOf('function requestDiscountApproval'), ui.indexOf('function promptDialog'));
  const promptDialog = ui.slice(ui.indexOf('function promptDialog'), ui.indexOf('function productsPerPage'));
  assert.doesNotMatch(discountDialog, /appDialogBody'\)\.innerHTML/);
  assert.doesNotMatch(promptDialog, /appDialogBody'\)\.innerHTML/);
  assert.match(discountDialog, /copy\.textContent = `The employee remains signed in/);
  assert.match(discountDialog, /pinInput\.type = 'password'/);
  assert.match(promptDialog, /input\.value = initial \|\| ''/);
  assert.match(promptDialog, /body\.append\(input, actions\)/);
});

test('shared dialog module builds modal chrome and messages without innerHTML', () => {
  assert.doesNotMatch(dialogs, /\.innerHTML\s*=/);
  assert.match(dialogs, /host\.appendChild\(sheet\)/);
  assert.match(dialogs, /body\.replaceChildren\(messageNode\(message\), actions\)/);
  assert.match(dialogs, /node\.textContent = message == null \? '' : String\(message\)/);
});

test('handover checklist keeps generated checklist markup isolated from plain messages', () => {
  const handoverDialog = dialogs.slice(dialogs.indexOf('function handoverChecklist'), dialogs.indexOf('root.BK_DIALOGS'));
  assert.match(handoverDialog, /appendTrustedMarkup\(dialog, message\)/);
  assert.match(handoverDialog, /root\.document\.createElement\('div'\)/);
  assert.match(handoverDialog, /progress\.setAttribute\('aria-live', 'polite'\)/);
  assert.doesNotMatch(handoverDialog, /appDialogBody'\)\.innerHTML/);
});
