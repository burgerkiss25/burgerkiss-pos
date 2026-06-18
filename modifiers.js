// Shared product modifier rules used by the POS UI.
(function(){
  const BURGER_BASE_IDS = ['hamburger', 'cheeseburger', 'double_burger', 'double_cheeseburger', 'chicken_burger', 'chicken_shawarma_burger'];
  const WINGS_BASE_IDS = ['wings_6','wings_12','wings_24'];
  const FRIES_IDS = ['fries_standard', 'fries_large', 'fries_family'];
  const PREFERRED_DRINK_IDS = ['d_cola','d_sprite','d_fanta_orange','d_fanta_coktail','d_biggoo_grape','d_coconut_fresh','d_coconut_water_bottle','d_iced_tea_lime','d_iced_tea_ginger','d_iced_tea_strawberry','d_iced_tea_pineapple','d_iced_tea_mint','d_iced_tea_apple','d_iced_tea_green_mint','d_iced_tea_vannile','d_club_beer_std','d_club_beer_large','d_guinness'];
  const INCLUDED_SAUCES = [
    {label:'No Sauce Wanted', value:''},
    {label:'Ketchup', value:'i_sauce_ketchup'},
    {label:'Mayonnaise', value:'i_sauce_mayonnaise'},
    {label:'Chipotle', value:'i_sauce_chipotle'},
    {label:'Dutch Special', value:'i_sauce_dutch_special'},
    {label:'Chicken Wings Sauce', value:'i_sauce_chicken_wings'}
  ];
  const PAID_SAUCES = [
    {label:'Extra Ketchup', value:'x_sauce_ketchup'},
    {label:'Extra Mayonnaise', value:'x_sauce_mayonnaise'},
    {label:'Extra Chipotle', value:'x_sauce_chipotle'},
    {label:'Extra Dutch Special', value:'x_sauce_dutch_special'},
    {label:'Extra Chicken Wings Sauce', value:'x_sauce_chicken_wings'}
  ];

  function cloneOptions(options){ return options.map(option=>Object.assign({}, option)); }
  function includedSauceOptions(){ return cloneOptions(INCLUDED_SAUCES); }
  function paidSauceOptions(){ return cloneOptions(PAID_SAUCES); }
  function mealBasePrice(product, menu){ return Number(menu && product && menu[product.id]) || 0; }
  function isMealBase(product, menu){ return !!(product && mealBasePrice(product, menu) > 0); }
  function isBurgerBase(product){ return !!(product && BURGER_BASE_IDS.includes(product.id)); }
  function isWingsBase(product){ return !!(product && WINGS_BASE_IDS.includes(product.id)); }
  function isFriesProduct(product){ return !!(product && FRIES_IDS.includes(product.id)); }
  function isFriesId(id){ return FRIES_IDS.includes(id); }
  function burgerFallbackAddons(product){
    const askCheeseDefault = !(product && ['cheeseburger','double_cheeseburger'].includes(product.id));
    return [
      'x_beef_patty',
      ...(askCheeseDefault ? ['x_cheese'] : []),
      'x_bacon',
      'x_chicken_patty',
      'x_chicken_shawarma_patty',
      'x_fried_egg',
      'x_omelette',
      'x_caramelized_onions'
    ];
  }
  function preferredDrinkOptions(productById, getPrice, includedDrink, defaultDrink){
    return PREFERRED_DRINK_IDS
      .map(id=>productById(id))
      .filter(Boolean)
      .map((product, index)=>({
        label:`${product.name}${Math.max(0, getPrice(product.id) - includedDrink) ? ` · upgrade +${Math.max(0, getPrice(product.id) - includedDrink)} GHS` : ''}`,
        value:product.id,
        checked:product.id === defaultDrink || (!defaultDrink && index === 0)
      }));
  }

  window.BK_MODIFIERS = {
    BURGER_BASE_IDS,
    WINGS_BASE_IDS,
    FRIES_IDS,
    PREFERRED_DRINK_IDS,
    includedSauceOptions,
    paidSauceOptions,
    mealBasePrice,
    isMealBase,
    isBurgerBase,
    isWingsBase,
    isFriesProduct,
    isFriesId,
    burgerFallbackAddons,
    preferredDrinkOptions
  };
})();
