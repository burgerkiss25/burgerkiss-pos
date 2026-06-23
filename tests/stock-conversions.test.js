const assert = require('node:assert/strict');
const test = require('node:test');

function loadStock(){
  const store = {};
  global.window = global;
  global.localStorage = {
    getItem(key){ return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null; },
    setItem(key, value){ store[key] = String(value); },
    removeItem(key){ delete store[key]; }
  };
  global.BK_SYNC_ENABLED = false;
  delete require.cache[require.resolve('../stock_data.js')];
  delete require.cache[require.resolve('../stock_utils.js')];
  delete require.cache[require.resolve('../stock.js')];
  require('../stock_data.js');
  require('../stock_utils.js');
  require('../stock.js');
  BK_STOCK.reset();
  BK_STOCK.load();
  return { store, stock: BK_STOCK, data: BK_STOCK_DATA, utils: BK_STOCK_UTILS };
}

function cleanup(){
  delete global.window;
  delete global.localStorage;
  delete global.BK_SYNC_ENABLED;
  delete global.BK_STOCK;
  delete global.BK_STOCK_DATA;
  delete global.BK_STOCK_UTILS;
}

test('default recipes use practical supplier pack and gram-based conversion units', () => {
  const { data } = loadStock();
  assert.equal(data.DEFAULTS.ingredients.lettuce_pack.unit, 'pack');
  assert.equal(data.DEFAULTS.ingredients.lettuce_pack.yield_note.includes('30 burgers'), true);
  assert.equal(data.DEFAULTS.recipes.hamburger.lettuce_pack, 0.0333);
  assert.equal(data.DEFAULTS.recipes.salad_standard.lettuce_pack, 0.1667);
  assert.equal(data.DEFAULTS.recipes.salad_large.lettuce_pack, 0.25);
  assert.equal(data.DEFAULTS.ingredients.pasta_g.purchase_options[0].factor, 500);
  assert.equal(data.DEFAULTS.recipes.salad_standard.pasta_g, 80);
  assert.equal(data.DEFAULTS.ingredients.gas_bottle.operating_supply, true);
  cleanup();
});

test('purchases can convert package quantities into stock units and expose gas supply status', () => {
  const { stock } = loadStock();
  const before = stock.getIngredients().pasta_g.current_stock_foodtruck;
  const pasta = stock.recordPurchase({ ingredientId:'pasta_g', name:'Pasta / Macaroni', qty:2, unit:'500g pack', packageSize:500, amount:40, receiptInPurse:true });
  assert.equal(pasta.ok, true);
  assert.equal(pasta.purchase.qty, 1000);
  assert.equal(pasta.purchase.unit, 'g');
  assert.equal(pasta.purchase.purchase_qty, 2);
  assert.equal(stock.getIngredients().pasta_g.current_stock_foodtruck, before + 1000);

  const gas = stock.recordPurchase({ ingredientId:'gas_bottle', name:'Gas Bottle', qty:1, unit:'bottle', amount:280, receiptInPurse:true });
  assert.equal(gas.ok, true);
  const supply = stock.getOperatingSupplies().find(item=>item.id === 'gas_bottle');
  assert.equal(supply.lastPurchase.amount, 280);
  assert.equal(supply.unit, 'bottle');
  cleanup();
});
