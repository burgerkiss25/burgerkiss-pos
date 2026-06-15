const assert = require('assert');
const fs = require('fs');

const html = fs.readFileSync('admin.html', 'utf8');
const admin = fs.readFileSync('admin.js', 'utf8');
const css = fs.readFileSync('style.css', 'utf8');

assert.strictEqual((html.match(/class="admin-editor-card"/g) || []).length, 4);
assert.match(html, /id="btnCatalog"/);
assert.match(html, /id="btnInventory"/);
assert.match(html, /id="btnOperations"/);
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

console.log('Admin workspace consolidation checks passed.');
