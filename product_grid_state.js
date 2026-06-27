// Product-grid filtering and paging helpers for the order workspace.
(function(root){
  'use strict';

  function productsPerPage(width, height){
    if(width <= 700) return height <= 560 ? 6 : 4;
    if(width <= 1180) return 6;
    return 8;
  }

  function isFrontProduct(product){
    return !!(product && product.active !== false && product.cat !== 'extra' && !String(product.id || '').startsWith('x_sauce_'));
  }

  function productSearchText(product){
    return [product.name, product.searchText, product.baseName, product.subtitle].filter(Boolean).join(' ').toLowerCase();
  }

  function visibleProducts(base, category, query){
    const search = String(query || '').trim().toLowerCase();
    return (Array.isArray(base) ? base : [])
      .filter(isFrontProduct)
      .filter(product => product.cat === category)
      .filter(product => search ? productSearchText(product).includes(search) : true)
      .sort((a,b)=>Number(a.categoryOrder || 0) - Number(b.categoryOrder || 0));
  }

  function pageModel(base, category, query, requestedPage, viewport){
    const items = visibleProducts(base, category, query);
    const view = viewport || {};
    const pageSize = productsPerPage(Number(view.width) || 0, Number(view.height) || 0);
    const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
    const page = Math.min(Math.max(0, Number(requestedPage) || 0), pageCount - 1);
    return {
      items,
      page,
      pageSize,
      pageCount,
      pageItems: items.slice(page * pageSize, (page + 1) * pageSize)
    };
  }

  root.BK_PRODUCT_GRID_STATE = {
    productsPerPage,
    isFrontProduct,
    visibleProducts,
    pageModel
  };

  if(typeof module !== 'undefined' && module.exports){
    module.exports = root.BK_PRODUCT_GRID_STATE;
  }
})(typeof window !== 'undefined' ? window : globalThis);
