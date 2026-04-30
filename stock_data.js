(function(){
  const DEFAULTS = {
    ingredients: {
      bun: { name: 'Burger Bun', category: 'bread', unit: 'pcs', track_stock: true, stock_location: 'foodtruck', current_stock_storage: 0, current_stock_foodtruck: 80, moq_storage: 20, moq_foodtruck: 16 },
      beef_patty: { name: 'Beef Patty', category: 'meat', unit: 'pcs', track_stock: true, stock_location: 'both', current_stock_storage: 120, current_stock_foodtruck: 60, moq_storage: 40, moq_foodtruck: 12 },
      cheese_slice: { name: 'Cheese Slice', category: 'dairy', unit: 'pcs', track_stock: true, stock_location: 'both', current_stock_storage: 200, current_stock_foodtruck: 120, moq_storage: 80, moq_foodtruck: 24 },
      chicken_wing: { name: 'Chicken Wing', category: 'meat', unit: 'pcs', track_stock: true, stock_location: 'both', current_stock_storage: 400, current_stock_foodtruck: 300, moq_storage: 120, moq_foodtruck: 60 },
      fries_portion: { name: 'Fries Portion', category: 'sides', unit: 'portion', track_stock: true, stock_location: 'both', current_stock_storage: 150, current_stock_foodtruck: 120, moq_storage: 50, moq_foodtruck: 20 },
      coconut_fresh: { name: 'Coconut Fresh', category: 'drinks', unit: 'pcs', track_stock: true, stock_location: 'both', current_stock_storage: 40, current_stock_foodtruck: 25, moq_storage: 12, moq_foodtruck: 6 },
      soda_can: { name: 'Soft Drink', category: 'drinks', unit: 'pcs', track_stock: true, stock_location: 'both', current_stock_storage: 240, current_stock_foodtruck: 120, moq_storage: 72, moq_foodtruck: 24 },
      ice_tea: { name: 'Ice Tea', category: 'drinks', unit: 'cups', track_stock: true, stock_location: 'foodtruck', current_stock_storage: 0, current_stock_foodtruck: 30, moq_storage: 0, moq_foodtruck: 8 },
      coconut_water_bottle: { name: 'Coconut Water Bottle', category: 'drinks', unit: 'btl', track_stock: true, stock_location: 'both', current_stock_storage: 48, current_stock_foodtruck: 30, moq_storage: 16, moq_foodtruck: 8 },
      beer: { name: 'Beer', category: 'drinks', unit: 'btl', track_stock: true, stock_location: 'both', current_stock_storage: 96, current_stock_foodtruck: 48, moq_storage: 24, moq_foodtruck: 12 },
      egg: { name: 'Egg', category: 'protein', unit: 'pcs', track_stock: true, stock_location: 'both', current_stock_storage: 96, current_stock_foodtruck: 48, moq_storage: 24, moq_foodtruck: 12 },
      bacon_slice: { name: 'Bacon Slice', category: 'protein', unit: 'slice', track_stock: true, stock_location: 'both', current_stock_storage: 200, current_stock_foodtruck: 120, moq_storage: 60, moq_foodtruck: 24 }
    },
    recipes: {
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
  };
  window.BK_STOCK_DATA = { DEFAULTS };
})();
