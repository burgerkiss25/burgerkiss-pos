const assert = require('assert');
const fs = require('fs');

const catalog = fs.readFileSync('catalog.js', 'utf8');
const products = fs.readFileSync('products.js', 'utf8');
const menus = fs.readFileSync('menus.js', 'utf8');
const ui = fs.readFileSync('ui.js', 'utf8');
const css = fs.readFileSync('style.css', 'utf8');
const html = fs.readFileSync('admin.html', 'utf8');

assert.match(catalog, /Archive product/);
assert.match(catalog, /Restore product/);
assert.match(catalog, /Active products/);
assert.match(catalog, /Archived products/);
assert.match(catalog, /action = before\.active/);
assert.match(catalog, /'archived'/);
assert.match(catalog, /'restored'/);
assert.doesNotMatch(catalog, /data-delete-product/);
assert.match(products, /const active = r && r\.active !== false/);
assert.match(ui, /it\.active !== false/);
assert.match(menus, /p\.active !== false/);
assert.match(css, /\.catalog-product-archived/);
assert.match(html, /catalog\.js\?v=6/);

console.log('Catalog archiving checks passed.');
