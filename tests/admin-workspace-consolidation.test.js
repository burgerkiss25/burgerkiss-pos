const assert = require('assert');
const fs = require('fs');

const html = fs.readFileSync('admin.html', 'utf8');
const admin = fs.readFileSync('admin.js', 'utf8');
const css = fs.readFileSync('style.css', 'utf8');

assert.strictEqual((html.match(/data-admin-tab=/g) || []).length, 5);
assert.match(html, /class="admin-editor-tabs" role="tablist"/);
assert.match(html, /id="btnCatalog"/);
assert.match(html, /id="btnInventory"/);
assert.match(html, /id="btnOperations"/);
assert.match(html, /id="btnSystemHealth"/);
assert.match(html, /id="adminDbStatusPanel" data-admin-panel="health"/);
assert.match(html, /id="modalCatalog"/);
assert.match(html, /id="catalogBody"/);
assert.match(html, /Save all changes/);
assert.doesNotMatch(html, /id="btnProducts"/);
assert.doesNotMatch(html, /id="btnPrices"/);
assert.doesNotMatch(html, /id="btnImages"/);
assert.doesNotMatch(html, /id="btnRecipes"/);
assert.doesNotMatch(html, /id="btnAddons"/);
assert.doesNotMatch(html, /id="modalProducts"/);
assert.doesNotMatch(html, /id="modalPrices"/);
assert.doesNotMatch(html, /id="modalImages"/);
assert.match(admin, /function closeWorkspaceModals/);
assert.match(admin, /function openCatalogWorkspace/);
assert.match(admin, /BK_CATALOG\.save/);
assert.match(css, /\.admin-workspace-nav/);
assert.match(css, /\.admin-tab-panel\{height:100%;min-height:0;overflow-y:auto;overflow-x:hidden\}/);

console.log('Admin workspace consolidation checks passed.');
