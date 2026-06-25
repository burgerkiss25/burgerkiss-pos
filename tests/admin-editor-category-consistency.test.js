const assert = require('assert');
const fs = require('fs');

const menus = fs.readFileSync('menus.js', 'utf8');
const images = fs.readFileSync('images.js', 'utf8');
const stock = fs.readFileSync('stock.js', 'utf8');

assert.match(menus, /dataset\.menuCategory = category/);
assert.match(menus, /Menus are grouped by their base product category/);
assert.match(menus, /Follows product order/);

assert.match(images, /adminImageCategories/);
assert.match(images, /dataset\.imageCategory = category/);
assert.match(images, /Images are grouped by product category/);

assert.match(stock, /function renderIngredientGroups/);
assert.match(stock, /data-ingredient-category/);
assert.match(stock, /stock-ingredient-category/);
assert.match(stock, /Sorted by name/);

console.log('Admin editor category consistency checks passed.');
