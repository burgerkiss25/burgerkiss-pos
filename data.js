// Produkte & Menüregeln (aus deiner Karte + Korrekturen)
window.BK_DATA = {
  BASE: [
    {id:'hamburger', name:'Hamburger', price:95, cat:'burger'},
    {id:'cheeseburger', name:'Cheeseburger', price:110, cat:'burger'},
    {id:'w6',  name:'Wings 6 pcs', price:45,  cat:'wings', pcs:6},
    {id:'w12', name:'Wings 12 pcs',price:85,  cat:'wings', pcs:12},
    {id:'w24', name:'Wings 24 pcs',price:160, cat:'wings', pcs:24},
    {id:'fr_std', name:'Fries Standard', price:20, cat:'fries', size:'std'},
    {id:'fr_lg',  name:'Fries Large',    price:30, cat:'fries', size:'lg'},
    {id:'x_patty',  name:'Extra Patty',  price:35, cat:'extra'},
    {id:'x_cheese', name:'Extra Cheese', price:10, cat:'extra'},
    {id:'x_bacon',  name:'Bacon (per slice)', price:20, cat:'extra'},
    {id:'x_egg',    name:'Fried Egg',    price:20, cat:'extra'},
    {id:'x_omelet', name:'Omelette',     price:30, cat:'extra'},
    {id:'d_coconut',name:'Coconut Fresh', price:7,  cat:'drink'},
    {id:'d_coke',   name:'Coke',          price:15, cat:'drink'},
    {id:'d_fanta_o',name:'Fanta Orange',  price:15, cat:'drink'},
    {id:'d_fanta_l',name:'Fanta Lemon',   price:15, cat:'drink'},
    {id:'d_sprite', name:'Sprite',        price:15, cat:'drink'},
    {id:'d_ice_tea',name:'Homemade Ice Tea', price:15, cat:'drink'},
    {id:'d_cw_btl', name:'Coconut Water Bottle', price:15, cat:'drink'},
    {id:'d_club_s', name:'Club Beer (Std)', price:20, cat:'drink'},
    {id:'d_club_l', name:'Club Beer (Large)', price:25, cat:'drink'},
    {id:'d_guin',   name:'Guinness',      price:25, cat:'drink'},
  ],
  MENU: {
    hamburger: 120,
    cheeseburger: 135,
    wings12: 110,
    included: { drink: 15, fries: 20 } // Upgrades = Differenz
  },
  STOCK: {
    INGREDIENTS: {
      bun: { name: 'Burger Bun', qty: 80, unit: 'pcs' },
      beef_patty: { name: 'Beef Patty', qty: 60, unit: 'pcs' },
      cheese_slice: { name: 'Cheese Slice', qty: 120, unit: 'pcs' },
      chicken_wing: { name: 'Chicken Wing', qty: 300, unit: 'pcs' },
      fries_portion: { name: 'Fries Portion', qty: 120, unit: 'portion' },
      coconut_fresh: { name: 'Coconut Fresh', qty: 25, unit: 'pcs' },
      soda_can: { name: 'Soft Drink', qty: 120, unit: 'pcs' },
      ice_tea: { name: 'Ice Tea', qty: 30, unit: 'cups' },
      coconut_water_bottle: { name: 'Coconut Water Bottle', qty: 30, unit: 'btl' },
      beer: { name: 'Beer', qty: 48, unit: 'btl' },
      egg: { name: 'Egg', qty: 48, unit: 'pcs' },
      bacon_slice: { name: 'Bacon Slice', qty: 120, unit: 'slice' }
    },
    RECIPES: {
      hamburger: { bun: 1, beef_patty: 1 },
      cheeseburger: { bun: 1, beef_patty: 1, cheese_slice: 1 },
      w6: { chicken_wing: 6 },
      w12: { chicken_wing: 12 },
      w24: { chicken_wing: 24 },
      fr_std: { fries_portion: 1 },
      fr_lg: { fries_portion: 2 },
      x_patty: { beef_patty: 1 },
      x_cheese: { cheese_slice: 1 },
      x_bacon: { bacon_slice: 1 },
      x_egg: { egg: 1 },
      x_omelet: { egg: 2 },
      d_coconut: { coconut_fresh: 1 },
      d_coke: { soda_can: 1 },
      d_fanta_o: { soda_can: 1 },
      d_fanta_l: { soda_can: 1 },
      d_sprite: { soda_can: 1 },
      d_ice_tea: { ice_tea: 1 },
      d_cw_btl: { coconut_water_bottle: 1 },
      d_club_s: { beer: 1 },
      d_club_l: { beer: 1 },
      d_guin: { beer: 1 }
    }
  }
};

// Snapshot der Standardprodukte für lokale Resets
window.BK_DATA.DEFAULT_BASE = JSON.parse(JSON.stringify(window.BK_DATA.BASE));
