const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const stock = fs.readFileSync(path.join(root, 'stock.js'), 'utf8');
const remote = fs.readFileSync(path.join(root, 'stock_remote.js'), 'utf8');
const pages = ['order.html', 'admin.html', 'shift.html', 'purchases.html'];

test('stock remote sync helpers are split from the editor module', () => {
  assert.match(remote, /root\.BK_STOCK_REMOTE = \{/);
  assert.match(remote, /function stockPaths\(\)/);
  assert.match(remote, /function inventoryByLocationFromIngredients\(ingredients, ts\)/);
  assert.match(stock, /window\.BK_STOCK_REMOTE/);
  assert.doesNotMatch(stock, /function stockPaths\(\)/);
  assert.doesNotMatch(stock, /function inventoryByLocationFromIngredients\(ingredients, ts\)/);
});

test('all stock pages load remote helpers before stock.js', () => {
  for (const page of pages) {
    const html = fs.readFileSync(path.join(root, page), 'utf8');
    assert.ok(html.includes('stock_remote.js'), `${page} should load stock_remote.js`);
    assert.ok(html.indexOf('stock_utils.js') < html.indexOf('stock_remote.js'), `${page} should load stock_utils.js first`);
    assert.ok(html.indexOf('stock_remote.js') < html.indexOf('stock.js'), `${page} should load stock_remote.js before stock.js`);
  }
});

test('stock recipe editor cards render with DOM nodes', () => {
  assert.match(stock, /function recipeRowNode\(p\)/);
  assert.match(stock, /function renderRecipeChips\(list, recipe\)/);
  assert.match(stock, /recipeWrap\.replaceChildren\(\.\.\.sections\)/);
  assert.doesNotMatch(stock, /recipeWrap\.innerHTML|replacement\.innerHTML|recipeRowHtml/);
});

test('stock ingredient lists and transfers render with DOM nodes', () => {
  assert.match(stock, /function ingredientRowNode\(id, def\)/);
  assert.match(stock, /function stockLocationCard/);
  assert.match(stock, /function transferPanelNode\(\)/);
  assert.match(stock, /function stockEditorIntro\(\)/);
  assert.match(stock, /function recipeEditorIntro\(activeMode\)/);
  assert.match(stock, /body\.replaceChildren\(\.\.\.sections\)/);
  assert.match(stock, /body\.replaceChildren\(\.\.\.content\)/);
  assert.match(stock, /list\.replaceChildren\(\.\.\.recent\.map/);
  assert.match(stock, /generalGroup\.appendChild\(ingredientRowNode/);
  assert.doesNotMatch(stock, /ingredientRowHtml|transferRowHtml|transferPanelHtml|insertAdjacentHTML|\.innerHTML\s*=/);
});
