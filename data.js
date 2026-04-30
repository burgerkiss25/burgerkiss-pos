// Produkte & Menüregeln
window.BK_DATA = {
  BASE: [
    {id:'hamburger', name:'Hamburger', price:95, cat:'burger'},
    {id:'cheeseburger', name:'Cheeseburger', price:110, cat:'burger'},
    {id:'double_burger', name:'Double Burger', price:130, cat:'burger'},
    {id:'double_cheeseburger', name:'Double Cheeseburger', price:160, cat:'burger'},
    {id:'chicken_burger', name:'Chicken Burger', price:85, cat:'burger'},
    {id:'chicken_shawarma_burger', name:'Chicken Shawarma Burger', price:85, cat:'burger'},

    {id:'wings_6',  name:'Wings 6 pcs', price:45,  cat:'wings', pcs:6},
    {id:'wings_12', name:'Wings 12 pcs',price:85,  cat:'wings', pcs:12},
    {id:'wings_24', name:'Wings 24 pcs',price:160, cat:'wings', pcs:24},

    {id:'fries_standard', name:'Fries Standard', price:20, cat:'fries', size:'std'},
    {id:'fries_large',    name:'Fries Large',    price:30, cat:'fries', size:'lg'},
    {id:'fries_family',   name:'Fries Family',   price:95, cat:'fries', size:'family'},

    {id:'salad_standard', name:'Salad Standard', price:55, cat:'salad'},
    {id:'salad_large',    name:'Salad Large',    price:75, cat:'salad'},

    {id:'x_beef_patty', name:'Extra Beef Patty', price:35, cat:'extra'},
    {id:'x_chicken_patty', name:'Extra Chicken Patty', price:30, cat:'extra'},
    {id:'x_chicken_shawarma_patty', name:'Extra Chicken Shawarma Patty', price:30, cat:'extra'},
    {id:'x_cheese', name:'Extra Cheese', price:10, cat:'extra'},
    {id:'x_bacon',  name:'Bacon (per slice)', price:20, cat:'extra'},
    {id:'x_fried_egg', name:'Fried Egg', price:20, cat:'extra'},
    {id:'x_omelette',  name:'Omelette',  price:30, cat:'extra'},
    {id:'x_sauce_cup', name:'Extra Sauce Cup', price:5, cat:'extra'},

    {id:'d_coconut_fresh', name:'Coconut Fresh', price:7, cat:'drink'},
    {id:'d_coconut_water_bottle', name:'Coconut Water Bottle', price:15, cat:'drink'},
    {id:'d_cola', name:'Cola', price:15, cat:'drink'},
    {id:'d_sprite', name:'Sprite', price:15, cat:'drink'},
    {id:'d_fanta_orange', name:'Fanta Orange', price:15, cat:'drink'},
    {id:'d_fanta_coktail', name:'Fanta Coktail', price:15, cat:'drink'},
    {id:'d_biggoo_grape', name:'Biggoo Grape', price:15, cat:'drink'},
    {id:'d_iced_tea_lime', name:'Iced Tea Lime', price:15, cat:'drink'},
    {id:'d_iced_tea_ginger', name:'Iced Tea Ginger', price:15, cat:'drink'},
    {id:'d_iced_tea_strawberry', name:'Iced Tea Strawberry', price:15, cat:'drink'},
    {id:'d_iced_tea_pineapple', name:'Iced Tea Pineapple', price:15, cat:'drink'},
    {id:'d_iced_tea_mint', name:'Iced Tea Mint', price:15, cat:'drink'},
    {id:'d_iced_tea_apple', name:'Iced Tea Apple', price:15, cat:'drink'},
    {id:'d_iced_tea_green_mint', name:'Iced Tea Green Mint', price:15, cat:'drink'},
    {id:'d_iced_tea_vannile', name:'Iced Tea Vannile', price:15, cat:'drink'},
    {id:'d_club_beer_std', name:'Club Beer (Std)', price:20, cat:'drink'},
    {id:'d_club_beer_large', name:'Club Beer (Large)', price:25, cat:'drink'},
    {id:'d_guinness', name:'Guinness', price:25, cat:'drink'}
  ],
  MENU: {
    hamburger: 120,
    cheeseburger: 135,
    double_burger: 155,
    double_cheeseburger: 170,
    wings_6: 65,
    wings_12: 110,
    wings_24: 185,
    included: { drink: 15, fries: 20 }
  }
};

window.BK_DATA.DEFAULT_BASE = JSON.parse(JSON.stringify(window.BK_DATA.BASE));
