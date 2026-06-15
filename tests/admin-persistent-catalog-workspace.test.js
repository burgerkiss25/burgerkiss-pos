const assert = require('assert');
const fs = require('fs');

const html = fs.readFileSync('admin.html', 'utf8');
const admin = fs.readFileSync('admin.js', 'utf8');
const stock = fs.readFileSync('stock.js', 'utf8');

assert.strictEqual((html.match(/id="modalCatalog"/g) || []).length, 1);
assert.match(html, /id="productsBody"/);
assert.match(html, /id="pricesBody" hidden/);
assert.match(html, /id="imagesBody" hidden/);
assert.match(html, /id="catalogStockBody" hidden/);
assert.match(html, /id="catalogSave"/);
assert.match(html, /id="catalogReset"/);
assert.match(html, /id="catalogClose"/);

assert.match(admin, /const catalogSections =/);
assert.match(admin, /function clearCatalogBodies/);
assert.match(admin, /function renderCatalogSection/);
assert.match(admin, /modal\.classList\.add\('open'\)/);
assert.doesNotMatch(admin, /modalProducts|modalPrices|modalImages/);

assert.match(stock, /editorBodyId/);
assert.match(stock, /editorModalId/);
assert.match(stock, /config\.bodyId/);

console.log('Persistent catalog workspace checks passed.');
