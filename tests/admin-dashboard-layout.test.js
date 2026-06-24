const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'admin.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'admin.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');

test('admin header stays compact and workspaces are presented as tabs', () => {
  const header = html.slice(html.indexOf('<header class="admin-header">'), html.indexOf('</header>'));
  assert.match(header, /← Back to POS/);
  assert.doesNotMatch(header, /id="btnCatalog"|id="btnInventory"|id="btnOperations"/);
  assert.strictEqual((html.match(/class="admin-editor-tab(?:\s|")/g) || []).length, 5);
  assert.match(html, /class="admin-editor-tabs" role="tablist"/);
  assert.match(html, /id="btnCatalog"[^>]+role="tab"/);
  assert.match(html, /id="btnMenus"[^>]+role="tab"/);
  assert.match(html, /id="btnInventory"[^>]+role="tab"/);
  assert.match(html, /id="btnOperations"[^>]+role="tab"/);
  assert.match(html, /id="btnSystemHealth"[^>]+role="tab"/);
  assert.match(html, /Products, prices, images, recipes, and add-ons/);
});

test('admin dashboard scrolls only inside the active workspace panel', () => {
  assert.match(html, /class="admin-dashboard admin-dashboard-shell"/);
  assert.match(html, /class="admin-tab-viewport"/);
  assert.match(html, /class="panel admin-tab-panel" id="adminDbStatusPanel"/);
  assert.match(css, /\.admin-page\{height:100dvh;overflow:hidden\}/);
  assert.match(css, /\.admin-tab-panel\{height:100%;min-height:0;overflow-y:auto;overflow-x:hidden\}/);
  assert.match(css, /\.admin-status-table-wrap\{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden\}/);
});

test('database health uses a compact table with badges and hidden technical paths', () => {
  assert.match(html, /class="admin-status-table"/);
  assert.match(html, /<th scope="col">Status<\/th>/);
  assert.match(js, /textEl\('span', label, `admin-status-badge \$\{tone\}`\)/);
  assert.match(js, /details\.className = 'admin-path-details'/);
  assert.match(js, /body\.replaceChildren\(\.\.\.rows\.map/);
  assert.match(css, /\.admin-status-badge\.ok/);
});

test('database activity is displayed as relative time with an exact-time tooltip', () => {
  assert.match(js, /minute/);
  assert.match(js, /hour/);
  assert.match(js, /day/);
  assert.match(js, /month/);
  assert.match(js, /time\.title = exactTime/);
  assert.doesNotMatch(js, /return new Date\(n\)\.toLocaleString\(\)/);
});

test('packaging rules modal renders fields without innerHTML templates', () => {
  assert.match(js, /function packagingRuleRow\(label, id, value, help, numeric\)/);
  assert.match(js, /body\.replaceChildren\(intro, grid, preview\)/);
  assert.match(js, /input\.setAttribute\('aria-describedby'/);
  assert.doesNotMatch(js, /packagingRulesBody[\s\S]{0,240}\.innerHTML/);
});
