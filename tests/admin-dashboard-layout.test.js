const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'admin.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'admin.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');

test('admin header stays compact and navigation uses four domain workspaces', () => {
  const header = html.slice(html.indexOf('<header class="admin-header">'), html.indexOf('</header>'));
  assert.match(header, /← Back to POS/);
  assert.doesNotMatch(header, /id="btnCatalog"|id="btnInventory"|id="btnOperations"/);
  assert.strictEqual((html.match(/class="admin-editor-group"/g) || []).length, 1);
  assert.match(html, /id="btnCatalog"/);
  assert.match(html, /id="btnMenus"/);
  assert.match(html, /id="btnInventory"/);
  assert.match(html, /id="btnOperations"/);
  assert.match(html, /Products, prices, images, recipes, and add-ons/);
});

test('database health uses a compact table with badges and hidden technical paths', () => {
  assert.match(html, /class="admin-status-table"/);
  assert.match(html, /<th scope="col">Status<\/th>/);
  assert.match(js, /admin-status-badge \$\{tone\}/);
  assert.match(js, /<details class="admin-path-details">/);
  assert.match(css, /\.admin-status-badge\.ok/);
});

test('database activity is displayed as relative time with an exact-time tooltip', () => {
  assert.match(js, /minute/);
  assert.match(js, /hour/);
  assert.match(js, /day/);
  assert.match(js, /month/);
  assert.match(js, /title="\$\{escapeHtml\(exactTime\)\}"/);
  assert.doesNotMatch(js, /return new Date\(n\)\.toLocaleString\(\)/);
});
