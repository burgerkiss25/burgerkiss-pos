const assert = require('assert');
const fs = require('fs');

const addons = fs.readFileSync('addons.js', 'utf8');
const catalog = fs.readFileSync('catalog.js', 'utf8');
const products = fs.readFileSync('products.js', 'utf8');
const ui = fs.readFileSync('ui.js', 'utf8');
const css = fs.readFileSync('style.css', 'utf8');
const data = fs.readFileSync('data.js', 'utf8');
const orderHtml = fs.readFileSync('order.html', 'utf8');
const adminHtml = fs.readFileSync('admin.html', 'utf8');

assert.match(addons, /window\.BK_ADDONS/);
assert.match(addons, /CONFIGURABLE_CATEGORIES = \['extra', 'fries', 'drink'\]/);
assert.match(addons, /title:'Upgrade add-ons'/);
assert.match(addons, /title:'Sides'/);
assert.match(addons, /title:'Drinks'/);
assert.match(addons, /x_caramelized_onions/);
assert.match(addons, /x_minced_meat/);
assert.match(addons, /x_salad_chicken_wings/);
assert.match(catalog, /BK_ADDONS\.isCatalogAddonProduct/);
assert.match(catalog, /data-addon-choice/);
assert.match(catalog, /paid add-ons, sides, and drinks/);
assert.match(catalog, /addons:Array\.isArray\(item\.addons\)/);
assert.match(products, /const sourceAddons = Array\.isArray\(r && r\.addons\)/);
assert.match(products, /defaultProduct\.addons/);
assert.match(ui, /BK_ADDONS\.sectionDefinitions/);
assert.match(ui, /BK_ADDONS\.selectedRows/);
assert.match(ui, /BK_ADDONS\.bucketForProduct/);
assert.match(css, /\.catalog-addon-editor/);
assert.match(data, /BK_ADDONS\.defaultBurgerAddons\(\)/);
assert.match(data, /BK_ADDONS\.defaultSaladAddons\(\)/);
assert.match(orderHtml, /addons\.js\?v=1[\s\S]*data\.js/);
assert.match(adminHtml, /addons\.js\?v=1[\s\S]*data\.js/);

console.log('Product-specific add-on module checks passed.');
