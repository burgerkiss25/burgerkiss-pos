const assert = require('assert');
const fs = require('fs');

const html = fs.readFileSync('admin.html', 'utf8');
const catalog = fs.readFileSync('catalog.js', 'utf8');
const css = fs.readFileSync('style.css', 'utf8');

assert.match(catalog, /function changeState/);
assert.match(catalog, /function changedCount/);
assert.match(catalog, /Save \$\{count\} change/);
assert.match(catalog, /button\.disabled = count === 0/);
assert.match(catalog, /Missing image/);
assert.match(catalog, /Missing recipe/);
assert.match(catalog, /Product name is required/);
assert.match(catalog, /Product ID already exists/);
assert.match(catalog, /Price must be zero or greater/);
assert.match(catalog, /aria-invalid/);
assert.match(css, /\.catalog-product-changed/);
assert.match(css, /\.catalog-product-invalid/);
assert.match(css, /\.catalog-change-badge/);
assert.match(html, /catalog\.js\?v=3/);

console.log('Catalog validation and change visibility checks passed.');
