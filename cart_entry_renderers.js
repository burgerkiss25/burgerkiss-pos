// DOM renderers for grouped cart/order entries.
(function(root){
  'use strict';

  function defaultNoteLines(note){
    const text = String(note || '').trim();
    return text ? [text] : [];
  }

  function defaultItemName(item){
    return item && item.name ? item.name : '';
  }

  function groupedEntryNode(entry, options){
    const opts = options || {};
    const noteLines = opts.noteLines || defaultNoteLines;
    const itemName = opts.itemName || defaultItemName;
    const showPrices = opts.showPrices !== false;
    const row = root.document.createElement('div');
    row.className = `${opts.compact ? 'grouped-meal compact' : 'grouped-meal'}${opts.kitchen ? ' kitchen-entry' : ''}`;

    const header = root.document.createElement('div');
    header.className = 'grouped-meal-head';
    if(opts.checkbox){
      const cb = root.document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = !!opts.checked;
      cb.disabled = !!opts.disabled;
      cb.onchange = ()=>{ if(typeof opts.onToggle === 'function') opts.onToggle(entry, cb.checked); };
      header.appendChild(cb);
    }

    const titleWrap = root.document.createElement('span');
    titleWrap.className = 'grouped-meal-title';
    const title = root.document.createElement('b');
    title.textContent = opts.displayTitle || `${entry.qty}x ${entry.name}`;
    titleWrap.appendChild(title);
    noteLines(entry.note).forEach((line, idx)=>{
      const note = root.document.createElement('small');
      note.textContent = idx === 0 ? line : `↳ ${line}`;
      titleWrap.appendChild(note);
    });
    header.appendChild(titleWrap);

    if(showPrices){
      const price = root.document.createElement('span');
      price.className = 'grouped-meal-price';
      price.textContent = opts.totalText || `${entry.total} GHS`;
      header.appendChild(price);
    }
    row.appendChild(header);

    (entry.children || []).forEach(child=>{
      const childLine = root.document.createElement('div');
      childLine.className = 'grouped-meal-child';
      const linkedKind = child.linked && child.linked.prefix;
      const childRole = child.menuRole || (linkedKind === 'menu' || linkedKind === 'included' ? 'included-sauce' : (linkedKind === 'extra' ? 'extra-sauce' : ''));
      const childName = itemName({name:child.name, role:childRole});
      const childNote = noteLines(child.note);
      childLine.textContent = `↳ ${child.qty}x ${childName}${childNote.length ? ` · ${childNote[0]}` : ''}${showPrices ? ` · ${child.total} GHS` : ''}`;
      row.appendChild(childLine);
      childNote.slice(1).forEach(line=>{
        const extraLine = root.document.createElement('div');
        extraLine.className = 'grouped-meal-child';
        extraLine.textContent = `   ↳ ${line}`;
        row.appendChild(extraLine);
      });
    });

    return row;
  }

  root.BK_CART_ENTRY_RENDERERS = {
    groupedEntryNode
  };

  if(typeof module !== 'undefined' && module.exports){
    module.exports = root.BK_CART_ENTRY_RENDERERS;
  }
})(typeof window !== 'undefined' ? window : globalThis);
