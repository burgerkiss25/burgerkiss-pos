// Side-dish rules used by product modifier suggestions.
(function(){
  const SIDE_CATEGORIES = ['fries'];
  const DEFAULT_SIDES = ['fries_standard','fries_large','fries_family'];

  function ids(list){ return Array.isArray(list) ? list.slice() : []; }
  function defaultBurgerSides(){ return ids(DEFAULT_SIDES); }
  function defaultSaladSides(){ return ids(DEFAULT_SIDES); }
  function isSideProduct(product){ return !!(product && product.active !== false && SIDE_CATEGORIES.includes(product.cat)); }
  function optionFromProduct(product){ return {label:product.name, value:product.id, cat:product.cat}; }

  window.BK_SIDES = {
    SIDE_CATEGORIES,
    DEFAULT_SIDES,
    defaultBurgerSides,
    defaultSaladSides,
    isSideProduct,
    optionFromProduct
  };
})();
