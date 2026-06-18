const assert = require('assert');
const fs = require('fs');

const catalog = fs.readFileSync('catalog.js', 'utf8');
const products = fs.readFileSync('products.js', 'utf8');
const ui = fs.readFileSync('ui.js', 'utf8');
const css = fs.readFileSync('style.css', 'utf8');

assert.match(catalog, /function addonEditor/);
assert.match(catalog, /data-addon-choice/);
assert.match(catalog, /Product add-ons/);
assert.match(catalog, /addons:Array\.isArray\(item\.addons\)/);
assert.match(products, /addons:Array\.isArray\(r && r\.addons\)/);
assert.match(ui, /function configuredAddonOptions/);
assert.match(ui, /Array\.isArray\(product && product\.addons\)/);
assert.match(ui, /title:'Product add-ons'/);
assert.match(css, /\.catalog-addon-editor/);

console.log('Product-specific add-on editor checks passed.');
