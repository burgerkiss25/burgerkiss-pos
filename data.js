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
  }
};
