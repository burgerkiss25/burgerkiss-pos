const assert = require('assert');
const fs = require('fs');

const html = fs.readFileSync('admin.html', 'utf8');
const catalog = fs.readFileSync('catalog.js', 'utf8');
const css = fs.readFileSync('style.css', 'utf8');

assert.doesNotMatch(html, /Product workspace/);
assert.doesNotMatch(html, />Prices<\/button>/);
assert.doesNotMatch(html, />Images<\/button>/);
assert.doesNotMatch(html, />Recipes<\/button>/);
assert.match(html, /Edit product details, prices, images, recipes, and add-ons in one place/);

assert.match(catalog, /Search products/);
assert.match(catalog, /data-field="name"/);
assert.match(catalog, /data-field="price"/);
assert.match(catalog, /data-field="cat"/);
assert.match(catalog, /Edit details/);
assert.match(catalog, /Replace image/);
assert.match(catalog, /Add ingredient/);
assert.match(catalog, /History/);
assert.match(catalog, /Save all changes|BK_PRODUCTS\.saveRows/);
assert.match(css, /\.catalog-product-summary/);
assert.match(css, /\.catalog-detail-grid/);

console.log('Integrated product catalog checks passed.');
