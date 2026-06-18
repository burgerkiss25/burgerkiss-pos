// Product add-on rules shared by the admin catalog and POS modifier UI.
(function(){
  const CONFIGURABLE_CATEGORIES = ['extra', 'fries', 'drink'];
  const GROUPS = [
    {cat:'extra', title:'Upgrade add-ons', name:'productAddons'},
    {cat:'fries', title:'Sides', name:'productSides'},
    {cat:'drink', title:'Drinks', name:'productDrinks'}
  ];
  const BURGER_ADDONS = ['x_beef_patty','x_cheese','x_bacon','x_chicken_patty','x_chicken_shawarma_patty','x_fried_egg','x_omelette','x_caramelized_onions'];
  const SINGLE_SIDES = ['fries_standard','fries_large','fries_family'];
  const SINGLE_DRINKS = ['d_cola','d_sprite','d_fanta_orange','d_fanta_coktail','d_biggoo_grape','d_coconut_fresh','d_coconut_water_bottle','d_iced_tea_lime','d_iced_tea_ginger','d_iced_tea_strawberry','d_iced_tea_pineapple','d_iced_tea_mint','d_iced_tea_apple','d_iced_tea_green_mint','d_iced_tea_vannile','d_club_beer_std','d_club_beer_large','d_guinness'];
  const SALAD_ADDONS = ['x_beef_patty','x_minced_meat','x_salad_chicken_wings'];

  function ids(list){ return Array.isArray(list) ? list.slice() : []; }
  function defaultBurgerAddons(){ return ids(BURGER_ADDONS).concat(SINGLE_SIDES, SINGLE_DRINKS); }
  function defaultSaladAddons(){ return ids(SALAD_ADDONS).concat(SINGLE_SIDES, SINGLE_DRINKS); }
  function isConfigurableProduct(product){ return !!(product && !['extra','sauce','drink'].includes(product.cat)); }
  function isCatalogAddonProduct(product){ return !!(product && product.active !== false && CONFIGURABLE_CATEGORIES.includes(product.cat)); }
  function configuredIds(product, fallback){
    const selected = Array.isArray(product && product.addons) ? product.addons : [];
    return selected.length ? selected.slice() : ids(fallback);
  }
  function configuredOptions(product, fallback, productById){
    return configuredIds(product, fallback)
      .map(id=>productById(id))
      .filter(addon=>isCatalogAddonProduct(addon))
      .map(addon=>({label:addon.name, value:addon.id, cat:addon.cat}));
  }
  function sectionDefinitions(product, fallback, productById){
    const choices = configuredOptions(product, fallback, productById);
    return GROUPS.map(group=>{
      const options = choices.filter(choice=>choice.cat === group.cat);
      return options.length ? {title:group.title, name:group.name, type:'quantity', help:'Use + / − to add paid extras to this single item.', options} : null;
    }).filter(Boolean);
  }
  function selectedRows(picked, expandQuantityItems, note, meta){
    return GROUPS.flatMap(group=>expandQuantityItems(picked && picked[group.name], note, meta));
  }
  function bucketForProduct(addonProduct, selection){
    if(addonProduct && addonProduct.cat === 'fries') return selection.productSides;
    if(addonProduct && addonProduct.cat === 'drink') return selection.productDrinks;
    return selection.productAddons;
  }
  function emptySelection(){ return {productAddons:{}, productSides:{}, productDrinks:{}}; }

  window.BK_ADDONS = {
    CONFIGURABLE_CATEGORIES,
    GROUPS,
    BURGER_ADDONS,
    SINGLE_SIDES,
    SINGLE_DRINKS,
    SALAD_ADDONS,
    defaultBurgerAddons,
    defaultSaladAddons,
    isConfigurableProduct,
    isCatalogAddonProduct,
    configuredIds,
    configuredOptions,
    sectionDefinitions,
    selectedRows,
    bucketForProduct,
    emptySelection
  };
})();
