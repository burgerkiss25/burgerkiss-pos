const assert = require('assert');
const fs = require('fs');

const products = fs.readFileSync('products.js', 'utf8');
const css = fs.readFileSync('style.css', 'utf8');

assert.match(products, /controls\.className = 'product-order-controls'/);
assert.match(products, /up\.dataset\.move = '-1'/);
assert.match(products, /down\.dataset\.move = '1'/);
assert.match(products, /targetOrders/);
assert.match(products, /changed\.categoryOrder =/);
assert.match(products, /Change a category to move a product into the correct group/);
assert.match(products, /Drag or use the arrow buttons to set POS order/);
assert.match(css, /\.product-order-controls/);

console.log('Admin product ordering checks passed.');
