// Drink rules used by product modifier suggestions.
(function(){
  const DEFAULT_DRINKS = ['d_cola','d_sprite','d_fanta_orange','d_fanta_coktail','d_biggoo_grape','d_coconut_fresh','d_coconut_water_bottle','d_iced_tea_lime','d_iced_tea_ginger','d_iced_tea_strawberry','d_iced_tea_pineapple','d_iced_tea_mint','d_iced_tea_apple','d_iced_tea_green_mint','d_iced_tea_vannile','d_club_beer_std','d_club_beer_large','d_guinness'];

  function ids(list){ return Array.isArray(list) ? list.slice() : []; }
  function defaultBurgerDrinks(){ return ids(DEFAULT_DRINKS); }
  function defaultSaladDrinks(){ return ids(DEFAULT_DRINKS); }
  function isDrinkProduct(product){ return !!(product && product.active !== false && product.cat === 'drink'); }
  function optionFromProduct(product){ return {label:product.name, value:product.id, cat:product.cat}; }

  window.BK_DRINKS = {
    DEFAULT_DRINKS,
    defaultBurgerDrinks,
    defaultSaladDrinks,
    isDrinkProduct,
    optionFromProduct
  };
})();
