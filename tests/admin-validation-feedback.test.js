const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const products = fs.readFileSync('products.js', 'utf8');
const menus = fs.readFileSync('menus.js', 'utf8');
const images = fs.readFileSync('images.js', 'utf8');
const css = fs.readFileSync('style.css', 'utf8');

test('admin product and menu validation uses inline feedback instead of browser alerts', () => {
  assert.doesNotMatch(products, /alert\(/);
  assert.doesNotMatch(menus, /alert\(/);
  assert.match(products, /function notifyValidation\(message\)/);
  assert.match(menus, /function notifyValidation\(message\)/);
  assert.match(products, /className = 'admin-validation-message'/);
  assert.match(menus, /className = 'admin-validation-message'/);
  assert.match(css, /\.admin-validation-message/);
});

test('image notifications avoid alert fallback in admin pages', () => {
  assert.doesNotMatch(images, /alert\(/);
  assert.match(images, /adminToastRegion/);
  assert.match(images, /console\.warn\(message\)/);
});
