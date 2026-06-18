const assert = require('assert');
const fs = require('fs');

const catalog = fs.readFileSync('catalog.js', 'utf8');
const products = fs.readFileSync('products.js', 'utf8');
const ui = fs.readFileSync('ui.js', 'utf8');
const css = fs.readFileSync('style.css', 'utf8');
const data = fs.readFileSync('data.js', 'utf8');

assert.match(catalog, /function addonEditor/);
assert.match(catalog, /\['extra','fries','drink'\]\.includes\(product\.cat\)/);
assert.match(catalog, /data-addon-choice/);
assert.match(catalog, /paid add-ons, sides, and drinks/);
assert.match(catalog, /addons:Array\.isArray\(item\.addons\)/);
assert.match(products, /const sourceAddons = Array\.isArray\(r && r\.addons\)/);
assert.match(products, /defaultProduct\.addons/);
assert.match(ui, /function configuredAddonOptions/);
assert.match(ui, /function productAddonSections/);
assert.match(ui, /'Upgrade add-ons'/);
assert.match(ui, /'Sides'/);
assert.match(ui, /'Drinks'/);
assert.match(ui, /selectedProductAddonRows/);
assert.match(css, /\.catalog-addon-editor/);
assert.match(data, /x_caramelized_onions/);
assert.match(data, /x_minced_meat/);
assert.match(data, /x_salad_chicken_wings/);
assert.match(data, /BK_SALAD_ADDONS\.concat\(BK_SINGLE_SIDES, BK_SINGLE_DRINKS\)/);

console.log('Product-specific add-on editor checks passed.');
