const assert = require('assert');
const fs = require('fs');

const html = fs.readFileSync('admin.html', 'utf8');
const admin = fs.readFileSync('admin.js', 'utf8');
const stock = fs.readFileSync('stock.js', 'utf8');

assert.match(html, /id="stockModalDescription"/);
assert.match(html, /Bulk-update product selling prices/);
assert.match(html, /Packaging rules[\s\S]*Reset to defaults[\s\S]*Cancel[\s\S]*Save changes/);

assert.match(admin, /function openStockEditor/);
assert.match(admin, /stockEditorCopy/);
assert.match(admin, /openStockEditor\('stock'\)/);
assert.match(admin, /openStockEditor\('ingredients'\)/);
assert.match(admin, /openStockEditor\('recipes'\)/);
assert.match(admin, /openStockEditor\('addons'\)/);
assert.match(admin, /resetEditor\(activeStockMode\)/);

assert.match(stock, /const showIngredients = activeMode === 'stock' \|\| activeMode === 'ingredients'/);
assert.match(stock, /const showTransfers = activeMode === 'stock'/);
assert.match(stock, /const showRecipes = activeMode === 'recipes' \|\| activeMode === 'addons'/);
assert.match(stock, /p\.cat !== 'extra' && p\.cat !== 'sauce'/);
assert.match(stock, /const recipeNext = clone\(RECIPES\)/);
assert.match(stock, /function resetEditor\(mode\)/);
assert.doesNotMatch(stock, /Phase 3 keeps old fields compatible/);

console.log('Admin editor separation checks passed.');
