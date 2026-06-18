// Product add-on rules: only options that modify the main product itself.
(function(){
  const ADDON_CATEGORY = 'extra';
  const BURGER_ADDONS = ['x_beef_patty','x_cheese','x_bacon','x_chicken_patty','x_chicken_shawarma_patty','x_fried_egg','x_omelette','x_caramelized_onions'];
  const SALAD_ADDONS = ['x_beef_patty','x_minced_meat','x_salad_chicken_wings'];

  function ids(list){ return Array.isArray(list) ? list.slice() : []; }
  function defaultBurgerAddons(){ return ids(BURGER_ADDONS); }
  function defaultSaladAddons(){ return ids(SALAD_ADDONS); }
  function isConfigurableProduct(product){ return !!(product && !['extra','sauce','drink'].includes(product.cat)); }
  function isAddonProduct(product){ return !!(product && product.active !== false && product.cat === ADDON_CATEGORY); }
  function optionFromProduct(product){ return {label:product.name, value:product.id, cat:product.cat}; }

  window.BK_ADDONS = {
    ADDON_CATEGORY,
    BURGER_ADDONS,
    SALAD_ADDONS,
    defaultBurgerAddons,
    defaultSaladAddons,
    isConfigurableProduct,
    isAddonProduct,
    optionFromProduct
  };
})();
