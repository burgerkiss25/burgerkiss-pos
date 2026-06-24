const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'order.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
const main = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'ui.js'), 'utf8');

test('kitchen page has a compact local header and back action', () => {
  assert.match(html, /class="kitchen-page-head"/);
  assert.match(html, /id="btnMakeBack"/);
  assert.match(html, /<h2>Kitchen<\/h2>/);
});

test('make workflow hides ordering and commercial controls', () => {
  assert.match(css, /\.workflow-make \.hud-rows,\.workflow-make \.catbar,\.workflow-make \.totals/);
  assert.match(main, /document\.body\.classList\.toggle\(`workflow-\$\{tab\}`/);
  assert.match(ui, /document\.body\.classList\.toggle\(`workflow-\$\{tab\}`/);
});

test('kitchen tickets show concise operational details', () => {
  const renderMake = ui.slice(ui.indexOf('function renderMake()'), ui.indexOf('function paymentDisplay'));
  assert.match(renderMake, /orderTitle\.textContent = `Order #\$\{shortOrderNumber\(s\.orderNo\)\}`/);
  assert.match(renderMake, /packaging\.textContent = `Packaging: \$\{packagingLabel\(s\)\}`/);
  assert.match(renderMake, /`\$\{entry\.qty\}× \$\{entry\.name\}`/);
  assert.match(renderMake, /menuEntryCount > 1/);
  assert.doesNotMatch(renderMake, /SINGLE ITEM \$\{\+\+singleNumber\}/);
  assert.doesNotMatch(renderMake, /appendChild\(packagingControl\(s, i, true\)\)/);
});
