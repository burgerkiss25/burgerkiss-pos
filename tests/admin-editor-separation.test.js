const assert = require('assert');
const fs = require('fs');

const html = fs.readFileSync('admin.html', 'utf8');
const admin = fs.readFileSync('admin.js', 'utf8');
const stock = fs.readFileSync('stock.js', 'utf8');

assert.match(html, /id="stockModalDescription"/);
assert.match(html, /id="catalogModalDescription"/);
assert.match(html, /Packaging rules[\s\S]*Reset to defaults[\s\S]*Cancel[\s\S]*Save changes/);
assert.match(html, /aria-label="Inventory workspace"><button id="btnStock"[^>]*>Overview<\/button><\/nav>/);
assert.doesNotMatch(html, /id="btnIngredients"/);
assert.doesNotMatch(html, /id="btnRecipesFromStock"/);
assert.doesNotMatch(html, /id="btnAddonsFromStock"/);

assert.match(admin, /function openStockEditor/);
assert.match(admin, /stockEditorCopy/);
assert.match(admin, /openStockEditor\('stock'\)/);
assert.doesNotMatch(admin, /openStockEditor\('ingredients'\)/);
assert.match(admin, /BK_CATALOG\.openEditor/);
assert.match(admin, /resetEditor\(activeStockMode\)/);

assert.match(stock, /const showIngredients = activeMode === 'stock'/);
assert.match(stock, /id="stockIngredientSearch"/);
assert.match(stock, /const showTransfers = activeMode === 'stock'/);
assert.match(stock, /const showRecipes = activeMode === 'recipes' \|\| activeMode === 'addons'/);
assert.match(stock, /p\.cat !== 'extra' && p\.cat !== 'sauce'/);
assert.match(stock, /const recipeNext = clone\(RECIPES\)/);
assert.match(stock, /function resetEditor\(mode\)/);
assert.doesNotMatch(stock, /Phase 3 keeps old fields compatible/);

console.log('Admin editor separation checks passed.');
