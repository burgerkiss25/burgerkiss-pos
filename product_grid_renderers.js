// DOM renderers for the order product grid.
(function(root){
  'use strict';

  function textEl(tag, text, className){
    const el = root.document.createElement(tag);
    if(className) el.className = className;
    el.textContent = text == null ? '' : String(text);
    return el;
  }

  function pagerDots(page, pageCount){
    const dots = [];
    for(let index = 0; index < pageCount; index += 1){
      const dot = root.document.createElement('span');
      dot.className = index === page ? 'active' : '';
      dots.push(dot);
    }
    return dots;
  }

  function emptyState(){
    const empty = root.document.createElement('div');
    empty.className = 'empty-state product-empty';
    empty.style.gridColumn = '1 / -1';
    empty.append(
      textEl('strong', 'No products found'),
      textEl('span', 'Try another category or clear the search.')
    );
    return empty;
  }

  function productButton(product, options){
    const opts = options || {};
    const button = root.document.createElement('button');
    button.className = 'item';
    button.type = 'button';
    if(opts.image){
      button.classList.add('item-with-bg');
      button.style.backgroundImage = `url(${opts.image})`;
    }else{
      button.classList.remove('item-with-bg');
      button.style.backgroundImage = '';
    }
    button.append(
      textEl('span', opts.categoryLabel || product.cat || 'Item', 'cat-badge'),
      textEl('div', product.name, 'name')
    );
    if(product.subtitle) button.appendChild(textEl('small', product.subtitle, 'item-subtitle'));
    const meta = root.document.createElement('div');
    meta.className = 'item-meta';
    meta.append(
      textEl('div', opts.priceText || '', 'price'),
      textEl('span', '+1', 'badge')
    );
    button.appendChild(meta);
    if(typeof opts.onClick === 'function') button.onclick = opts.onClick;
    return button;
  }

  root.BK_PRODUCT_GRID_RENDERERS = {
    pagerDots,
    emptyState,
    productButton
  };

  if(typeof module !== 'undefined' && module.exports){
    module.exports = root.BK_PRODUCT_GRID_RENDERERS;
  }
})(typeof window !== 'undefined' ? window : globalThis);
