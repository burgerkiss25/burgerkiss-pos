// Cart entry grouping helpers for order and kitchen views.
(function(root){
  'use strict';

  function baseCustomerNote(note){
    return String(note || '')
      .replace(/\s+·\s+Add-ons:.*$/i, '')
      .replace(/\s+·\s+Extra sauces:.*$/i, '')
      .trim();
  }

  function parseLinkedModifierNote(note){
    const txt = String(note || '').trim();
    const m = txt.match(/^(included|extra|menu)?\s*for\s+(.+?)(?::\s*(.*))?$/i);
    if(!m) return null;
    return {
      prefix: (m[1] || 'for').toLowerCase(),
      productName: (m[2] || '').trim(),
      itemNote: (m[3] || '').trim()
    };
  }

  function hasMenuChildren(entry){
    return (entry.children || []).some(child=> child.linked && child.linked.prefix === 'menu');
  }

  function linkedGroupKey(productName, note, menuGroupId){
    return `${String(productName || '').trim()}|${baseCustomerNote(note)}|${menuGroupId || ''}`;
  }

  function groupedCartRows(items, logic, productResolver){
    const groups = [];
    const linkedChildren = [];
    const parentByKey = new Map();
    const parentsByName = new Map();
    const standalone = [];
    const groupedLines = logic && typeof logic.groupedLines === 'function' ? logic.groupedLines(items) : [];

    groupedLines.forEach(line=>{
      const sourceItem = (items || []).find(item=>
        item.itemId === line.id
        && (item.note || '') === (line.note || '')
        && (item.menuGroupId || '') === (line.menuGroupId || '')
      );
      const enrichedLine = Object.assign({}, line, {
        menuName:sourceItem && sourceItem.menuName ? sourceItem.menuName : '',
        menuRole:sourceItem && sourceItem.menuRole ? sourceItem.menuRole : ''
      });
      const linked = parseLinkedModifierNote(line.note);
      if(linked){
        linkedChildren.push(Object.assign(enrichedLine, { linked }));
        return;
      }

      const prod = typeof productResolver === 'function' ? productResolver(line.id) : null;
      const isModifierProduct = prod && (prod.cat === 'extra' || String(prod.id || '').startsWith('x_sauce_'));
      if(isModifierProduct){
        standalone.push(enrichedLine);
        return;
      }

      const menuMain = (items || []).find(item=>item.menuGroupId && item.menuGroupId === line.menuGroupId && item.menuRole === 'main');
      const group = Object.assign({}, enrichedLine, { children: [], menuName:menuMain && menuMain.menuName ? menuMain.menuName : enrichedLine.menuName });
      const groupKey = linkedGroupKey(line.name, line.note, line.menuGroupId);
      groups.push(group);
      parentByKey.set(groupKey, group);
      const nameKey = String(line.name || '').trim().toLowerCase();
      if(!parentsByName.has(nameKey)) parentsByName.set(nameKey, []);
      parentsByName.get(nameKey).push(group);
    });

    linkedChildren.forEach(child=>{
      const linked = child.linked;
      const exactParent = parentByKey.get(linkedGroupKey(linked.productName, linked.itemNote, child.menuGroupId));
      const fallbackParents = parentsByName.get(String(linked.productName || '').trim().toLowerCase()) || [];
      const parent = exactParent || fallbackParents[fallbackParents.length - 1];
      if(parent) parent.children.push(child);
      else standalone.push(child);
    });

    return groups.concat(standalone.map(line=>Object.assign({}, line, { children: [] })));
  }

  function groupedEntryTotal(entry){
    return entry.total + (entry.children || []).reduce((sum, child)=> sum + child.total, 0);
  }

  function groupedEntryText(entry){
    const parent = `${entry.qty}x ${entry.name}${entry.note ? ` (${entry.note})` : ''}`;
    const children = (entry.children || []).map(child=>`↳ ${child.qty}x ${child.name}${child.note ? ` (${child.note})` : ''}`);
    return [parent, ...children].join(' · ');
  }

  root.BK_CART_ENTRY_STATE = {
    baseCustomerNote,
    parseLinkedModifierNote,
    hasMenuChildren,
    linkedGroupKey,
    groupedCartRows,
    groupedEntryTotal,
    groupedEntryText
  };

  if(typeof module !== 'undefined' && module.exports){
    module.exports = root.BK_CART_ENTRY_STATE;
  }
})(typeof window !== 'undefined' ? window : globalThis);
