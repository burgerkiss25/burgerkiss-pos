const assert = require('assert');
const fs = require('fs');

const html = fs.readFileSync('admin.html', 'utf8');
const admin = fs.readFileSync('admin.js', 'utf8');
const catalog = fs.readFileSync('catalog.js', 'utf8');
const stock = fs.readFileSync('stock.js', 'utf8');

assert.strictEqual((html.match(/id="modalCatalog"/g) || []).length, 1);
assert.match(html, /id="catalogBody"/);
assert.match(html, /id="catalogSave"/);
assert.match(html, /id="catalogReset"/);
assert.match(html, /id="catalogClose"/);
assert.match(html, /catalog\.js/);

assert.match(admin, /function openCatalogWorkspace/);
assert.match(admin, /modal\.classList\.add\('open'\)/);
assert.doesNotMatch(admin, /modalProducts|modalPrices|modalImages/);

assert.match(catalog, /catalog-product-card/);
assert.match(catalog, /catalog-product-image/);
assert.match(catalog, /BK_PRICES\.getPrice/);
assert.match(catalog, /BK_IMAGES\.get/);
assert.match(catalog, /BK_STOCK\.getRecipe/);
assert.match(catalog, /BK_PRODUCTS\.saveRows/);
assert.match(catalog, /BK_PRICES\.setPrices/);
assert.match(catalog, /BK_IMAGES\.saveChanges/);
assert.match(catalog, /BK_STOCK\.setRecipes/);
assert.match(stock, /function getRecipe/);

console.log('Persistent catalog workspace checks passed.');
