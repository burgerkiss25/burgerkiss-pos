const assert = require('assert');
const fs = require('fs');

const catalog = fs.readFileSync('catalog.js', 'utf8');
const products = fs.readFileSync('products.js', 'utf8');
const prices = fs.readFileSync('prices.js', 'utf8');
const images = fs.readFileSync('images.js', 'utf8');
const stock = fs.readFileSync('stock.js', 'utf8');
const html = fs.readFileSync('admin.html', 'utf8');

assert.match(catalog, /function saveRemoteAtomically/);
assert.match(catalog, /database\.ref\(\)\.update\(updates\)/);
assert.match(catalog, /BK_PRODUCTS\.remotePath\(\)/);
assert.match(catalog, /BK_PRICES\.remotePath\(\)/);
assert.match(catalog, /BK_IMAGES\.remotePath\(\)/);
assert.match(catalog, /stockPaths\.recipes/);
assert.match(catalog, /stockPaths\.addons/);
assert.match(catalog, /if\(saving\) return false/);
assert.match(catalog, /Saving…/);
assert.match(catalog, /localOnly:true/);
assert.match(products, /options && options\.localOnly/);
assert.match(prices, /function getMap/);
assert.match(images, /function getMap/);
assert.match(stock, /function getRecipes/);
assert.match(html, /catalog\.js\?v=6/);

console.log('Atomic catalog save checks passed.');
