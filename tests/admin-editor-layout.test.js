const assert = require('assert');
const fs = require('fs');

const html = fs.readFileSync('admin.html', 'utf8');
const products = fs.readFileSync('products.js', 'utf8');
const prices = fs.readFileSync('prices.js', 'utf8');
const menus = fs.readFileSync('menus.js', 'utf8');
const images = fs.readFileSync('images.js', 'utf8');
const stock = fs.readFileSync('stock.js', 'utf8');
const ui = fs.readFileSync('ui.js', 'utf8');
const css = fs.readFileSync('style.css', 'utf8');

assert.match(html, /Save changes/);
assert.match(html, /Reset to defaults/);
assert.match(html, /admin-editor-workspace/);
assert.match(products, /categoryOrder/);
assert.match(products, /draggable="true"/);
assert.match(products, /admin-category-group/);
assert.match(products, /Drag products to set their POS order/);
assert.match(ui, /sort\(\(a,b\)=>Number\(a\.categoryOrder/);
assert.match(prices, /Prices follow the same category and display order/);
assert.match(menus, /admin-menu-card/);
assert.match(images, /admin-image-grid/);
assert.match(images, /Choose image/);
assert.match(stock, /recipe-ingredient-chip/);
assert.match(stock, /Advanced raw recipe/);
assert.match(css, /\.admin-editor-modal/);

console.log('Unified admin editor layout checks passed.');
