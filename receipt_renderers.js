// Receipt HTML builders kept separate from interactive UI rendering.
(function(root){
  'use strict';

  function escapeHtml(value){
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function paymentLabel(pay, provider){
    if(pay === 'momo' && provider === 'mtn') return 'MTN MoMo';
    if(pay === 'momo' && provider === 'telecel') return 'Telecel MoMo';
    return ({unpaid:'Unpaid', cash:'Cash', whatsapp:'WhatsApp', bolt:'Bolt', hubtel:'Hubtel', chowdeck:'Chowdeck'})[pay] || String(pay || 'Unknown');
  }

  function splitEntryNoteLines(note){
    return String(note || '')
      .split(/\s*\+\s+/)
      .map(part=>part.trim())
      .filter(Boolean);
  }

  function groupedRowsHtml(items){
    const logic = root.BK_LOGIC;
    if(!logic || typeof logic.groupedLines !== 'function') return '';
    return logic.groupedLines(items).map(({name, qty, note, total}) => `
      <div class="row" style="border-top:1px dashed #2a2f39;padding:6px 0">
        <span><b>${escapeHtml(name)}</b> <small>× ${escapeHtml(qty)}${note?` · ${escapeHtml(note)}`:''}</small></span>
        <span>${escapeHtml(total)} GHS</span>
      </div>
    `).join('');
  }

  function historyItemsHtml(entry){
    const items = Array.isArray(entry && entry.items) ? entry.items : [];
    if(!items.length) return '<div class="empty-state">No saved item details.</div>';
    return `<div class="history-item-list">${items.map(item=>{
      const notes = splitEntryNoteLines(item.note);
      return `<div class="history-item">
        <div class="history-item-main"><strong>${Number(item.qty)||1}x ${escapeHtml(item.name)}</strong><b>${Number(item.total)||0} GHS</b></div>
        ${notes.map(note=>`<div class="history-item-extra">+ ${escapeHtml(String(note).replace(/^\+\s*/, ''))}</div>`).join('')}
      </div>`;
    }).join('')}</div>`;
  }

  function historyReceiptHtml(entry){
    return `<div class="receipt-archive">
      <div><b>BurgerKiss – Receipt</b></div>
      <div>Order: <b>${escapeHtml(entry.orderNo)}</b></div>
      <div>Date: ${new Date(entry.closedAt).toLocaleString()}</div>
      <div>Payment: ${escapeHtml(paymentLabel(entry.pay, entry.momoProvider))}</div>
      <div>Packaging: ${entry.packMode === 'split' ? 'Packed separately' : 'Packed together'}</div>
      <hr>${historyItemsHtml(entry)}
      <div class="sumline"><span>Subtotal</span><b>${Number(entry.subtotal)||0} GHS</b></div>
      <div class="sumline"><span>Discount</span><b>-${Number(entry.discount)||0} GHS</b></div>
      <div class="sumline"><span>Total</span><b>${Number(entry.total)||0} GHS</b></div>
      ${entry.status === 'voided' ? '<div class="receipt-void">VOIDED – NOT VALID FOR PAYMENT</div>' : ''}
    </div>`;
  }

  function receiptSectionHtml(slot){
    const logic = root.BK_LOGIC;
    const c = logic && typeof logic.computeSlot === 'function' ? logic.computeSlot(slot) : {subtotal:0};
    return `<div style="margin:6px 0 10px">
      <div><b>${escapeHtml(slot.name)}</b> · <small>#${escapeHtml(slot.orderNo || '-')}</small></div>
      ${groupedRowsHtml(slot.items)}
      <div class="sumline"><span>${escapeHtml(slot.name)} Subtotal</span><b>${Number(c.subtotal)||0} GHS</b></div>
    </div>`;
  }

  function orderReceiptHtml(slots, indices){
    const logic = root.BK_LOGIC;
    let subtotal = 0;
    let discount = 0;
    let combos = 0;
    const sections = (Array.isArray(indices) ? indices : []).map(i=>{
      const slot = slots[i];
      if(!slot) return '';
      const c = logic && typeof logic.computeSlot === 'function' ? logic.computeSlot(slot) : {subtotal:0, combos:0};
      subtotal += Number(c.subtotal) || 0;
      combos += Number(c.combos) || 0;
      discount += Math.round((Number(c.subtotal) || 0) * (Number(slot.discountRate) || 0));
      return receiptSectionHtml(slot);
    }).join('');
    const total = subtotal - discount;
    return `
      <div style="line-height:1.35">
        <div><b>BurgerKiss – Order</b></div>
        <div style="color:#9aa3ad">Combos: ${combos} · Approved order discounts included</div>
        <hr style="border:0;border-top:1px solid #2a2f39;margin:8px 0">
        ${sections}
        <div class="sumline"><span>Subtotal</span><b>${subtotal} GHS</b></div>
        <div class="sumline"><span>Discount</span><b>-${discount} GHS</b></div>
        <div class="sumline"><span>Total</span><b>${total} GHS</b></div>
      </div>`;
  }

  root.BK_RECEIPT_RENDERERS = {
    escapeHtml,
    groupedRowsHtml,
    historyItemsHtml,
    historyReceiptHtml,
    receiptSectionHtml,
    orderReceiptHtml
  };

  if(typeof module !== 'undefined' && module.exports){
    module.exports = root.BK_RECEIPT_RENDERERS;
  }
})(typeof window !== 'undefined' ? window : globalThis);
