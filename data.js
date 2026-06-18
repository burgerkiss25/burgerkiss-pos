// Products and menu rules
const BK_BURGER_ADDONS = ['x_beef_patty','x_cheese','x_bacon','x_chicken_patty','x_chicken_shawarma_patty','x_fried_egg','x_omelette','x_caramelized_onions'];
const BK_SINGLE_SIDES = ['fries_standard','fries_large','fries_family'];
const BK_SINGLE_DRINKS = ['d_cola','d_sprite','d_fanta_orange','d_fanta_coktail','d_biggoo_grape','d_coconut_fresh','d_coconut_water_bottle','d_iced_tea_lime','d_iced_tea_ginger','d_iced_tea_strawberry','d_iced_tea_pineapple','d_iced_tea_mint','d_iced_tea_apple','d_iced_tea_green_mint','d_iced_tea_vannile','d_club_beer_std','d_club_beer_large','d_guinness'];
const BK_SALAD_ADDONS = ['x_beef_patty','x_minced_meat','x_salad_chicken_wings'];

window.BK_DATA = {
  BASE: [
    {id:'hamburger', name:'Hamburger', price:95, cat:'burger', addons:BK_ADDONS.defaultBurgerAddons()},
    {id:'cheeseburger', name:'Cheeseburger', price:110, cat:'burger', addons:BK_ADDONS.defaultBurgerAddons()},
    {id:'double_burger', name:'Double Burger', price:130, cat:'burger', addons:BK_ADDONS.defaultBurgerAddons()},
    {id:'double_cheeseburger', name:'Double Cheeseburger', price:160, cat:'burger', addons:BK_ADDONS.defaultBurgerAddons()},
    {id:'chicken_burger', name:'Chicken Burger', price:85, cat:'burger', addons:BK_ADDONS.defaultBurgerAddons()},
    {id:'chicken_shawarma_burger', name:'Chicken Shawarma Burger', price:85, cat:'burger', addons:BK_ADDONS.defaultBurgerAddons()},

    {id:'wings_6',  name:'Wings 6 pcs', price:45,  cat:'wings', pcs:6},
    {id:'wings_12', name:'Wings 12 pcs',price:85,  cat:'wings', pcs:12},
    {id:'wings_24', name:'Wings 24 pcs',price:160, cat:'wings', pcs:24},

    {id:'fries_standard', name:'Fries Standard', price:20, cat:'fries', size:'std'},
    {id:'fries_large',    name:'Fries Large',    price:30, cat:'fries', size:'lg'},
    {id:'fries_family',   name:'Fries Family',   price:95, cat:'fries', size:'family'},

    {id:'salad_standard', name:'Salad Standard', price:55, cat:'salad', addons:BK_ADDONS.defaultSaladAddons()},
    {id:'salad_large',    name:'Salad Large',    price:75, cat:'salad', addons:BK_ADDONS.defaultSaladAddons()},

    {id:'x_beef_patty', name:'Extra Beef Patty', price:35, cat:'extra'},
    {id:'x_chicken_patty', name:'Extra Chicken Patty', price:30, cat:'extra'},
    {id:'x_chicken_shawarma_patty', name:'Extra Chicken Shawarma Patty', price:30, cat:'extra'},
    {id:'x_cheese', name:'Extra Cheese', price:10, cat:'extra'},
    {id:'x_bacon',  name:'Bacon (per slice)', price:20, cat:'extra'},
    {id:'x_fried_egg', name:'Fried Egg', price:20, cat:'extra'},
    {id:'x_omelette',  name:'Omelette',  price:30, cat:'extra'},
    {id:'x_caramelized_onions', name:'Caramelized Onions', price:10, cat:'extra'},
    {id:'x_minced_meat', name:'Minced Meat', price:25, cat:'extra'},
    {id:'x_salad_chicken_wings', name:'Chicken Wings Salad Add-on', price:30, cat:'extra'},

    {id:'i_sauce_ketchup', name:'Ketchup', price:0, cat:'sauce', sauce_type:'s_ketchup'},
    {id:'i_sauce_mayonnaise', name:'Mayonnaise', price:0, cat:'sauce', sauce_type:'s_mayonnaise'},
    {id:'i_sauce_chipotle', name:'Chipotle', price:0, cat:'sauce', sauce_type:'s_chipotle'},
    {id:'i_sauce_dutch_special', name:'Dutch Special', price:0, cat:'sauce', sauce_type:'s_dutch_special'},
    {id:'i_sauce_chicken_wings', name:'Chicken Wings Sauce', price:0, cat:'sauce', sauce_type:'s_chicken_wings'},

    {id:'x_sauce_ketchup', name:'Extra Ketchup', price:5, cat:'sauce', sauce_type:'s_ketchup'},
    {id:'x_sauce_mayonnaise', name:'Extra Mayonnaise', price:5, cat:'sauce', sauce_type:'s_mayonnaise'},
    {id:'x_sauce_chipotle', name:'Extra Chipotle', price:5, cat:'sauce', sauce_type:'s_chipotle'},
    {id:'x_sauce_dutch_special', name:'Extra Dutch Special', price:5, cat:'sauce', sauce_type:'s_dutch_special'},
    {id:'x_sauce_chicken_wings', name:'Extra Chicken Wings Sauce', price:5, cat:'sauce', sauce_type:'s_chicken_wings'},

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
  },
  SAUCES: {
    sauce_cup_grams: 20,
    s_ketchup: { name: 'Ketchup', consumes_stock: true, ingredients: { ketchup: 20 } },
    s_mayonnaise: { name: 'Mayonnaise', consumes_stock: true, ingredients: { mayonnaise: 20 } },
    s_chipotle: { name: 'Chipotle', consumes_stock: true, ingredients: { mayonnaise: 15, chicken_burger_sauce: 5 } },
    s_dutch_special: { name: 'Dutch Special', consumes_stock: true, ingredients: { mayonnaise: 10, ketchup: 10, onion_diced: 5 } },
    s_chicken_wings: { name: 'Chicken Wings Sauce', consumes_stock: true, ingredients: { chicken_wings_sauce: 20 } },
    s_no_sauce: { name: 'No Sauce Wanted', consumes_stock: false, ingredients: {}, price: 0 }
  }
};

window.BK_DATA.DEFAULT_BASE = JSON.parse(JSON.stringify(window.BK_DATA.BASE));
