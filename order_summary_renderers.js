// Active order summary and group-order DOM builders.
(function(root){
  'use strict';

  function textEl(tag, text, className){
    const el = root.document.createElement(tag);
    if(className) el.className = className;
    el.textContent = text == null ? '' : String(text);
    return el;
  }

  function groupedRowsNode(items, logic){
    const fragment = root.document.createDocumentFragment();
    const grouped = logic && typeof logic.groupedLines === 'function' ? logic.groupedLines(items) : [];
    grouped.forEach(({name, qty, note, total})=>{
      const row = root.document.createElement('div');
      row.className = 'row';
      row.style.borderTop = '1px dashed #2a2f39';
      row.style.padding = '6px 0';
      const left = root.document.createElement('span');
      left.append(textEl('b', name), textEl('small', `× ${qty}${note ? ` · ${note}` : ''}`));
      row.append(left, textEl('span', `${total} GHS`));
      fragment.appendChild(row);
    });
    return fragment;
  }

  function summaryContent(slot, logic){
    const c = logic && typeof logic.computeSlot === 'function' ? logic.computeSlot(slot) : {subtotal:0, combos:0};
    const subtotal = root.document.createElement('div');
    subtotal.className = 'sumline';
    subtotal.append(textEl('span', 'Slot Subtotal'), textEl('b', `${c.subtotal} GHS`));
    const meta = root.document.createElement('div');
    meta.className = 'summary-meta';
    meta.append(textEl('span', `Combos in slot: ${c.combos}`), textEl('span', `Order Discount: ${Math.round((slot.discountRate||0)*100)}%`));
    return [groupedRowsNode(slot.items, logic), subtotal, meta];
  }

  function groupRow(slot, index, logic, onToggle){
    const c = logic && typeof logic.computeSlot === 'function' ? logic.computeSlot(slot) : {subtotal:0};
    const row = root.document.createElement('div');
    row.className = 'row';
    const left = root.document.createElement('span');
    left.className = 'left';
    const input = root.document.createElement('input');
    input.type = 'checkbox';
    input.onchange = event=> onToggle(index, event.target.checked);
    left.append(input, textEl('b', slot.name), textEl('small', `· ${c.subtotal} GHS · ${slot.pay.toUpperCase()}`));
    row.appendChild(left);
    return row;
  }

  function groupRows(slots, logic, onToggle){
    return (Array.isArray(slots) ? slots : []).map((slot,index)=> groupRow(slot, index, logic, onToggle));
  }

  root.BK_ORDER_SUMMARY_RENDERERS = {
    groupedRowsNode,
    summaryContent,
    groupRow,
    groupRows
  };

  if(typeof module !== 'undefined' && module.exports){
    module.exports = root.BK_ORDER_SUMMARY_RENDERERS;
  }
})(typeof window !== 'undefined' ? window : globalThis);
