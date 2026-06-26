// Slot-level state helpers for order lifecycle and metadata.
(function(root){
  'use strict';

  const PAY_SET = new Set(['unpaid', 'cash', 'momo', 'bolt', 'hubtel', 'chowdeck', 'whatsapp']);
  const SOURCE_SET = new Set(['walkin', 'whatsapp', 'bolt', 'hubtel', 'chowdeck']);

  function clamp(n, min, max){
    return Math.max(min, Math.min(max, n));
  }

  function createSlot(index, label, details, orderNo, actor, access, now){
    const meta = details && typeof details === 'object' ? details : {};
    const source = SOURCE_SET.has(meta.orderSource) ? meta.orderSource : 'walkin';
    const pay = PAY_SET.has(meta.pay) ? meta.pay : (source === 'walkin' ? 'unpaid' : source);
    const timestamp = Number(now) || Date.now();
    return {
      name: label || `SN${index}`,
      items: [],
      pay,
      issued: false,
      voided: false,
      voidReason: '',
      packMode: 'shared',
      packAsked: false,
      drinkPackMode: 'shared',
      sentToKitchen: false,
      discountRate: 0,
      discountApprovedBy: null,
      discountApprovedAt: 0,
      orderNo,
      createdAt: timestamp,
      orderSource: source,
      externalOrderNo: String(meta.externalOrderNo || '').trim(),
      originalSource: '',
      originalPay: '',
      finalChannel: '',
      fulfilment: '',
      conversionReason: '',
      refundStatus: '',
      convertedAt: 0,
      customerName: String(meta.customerName || ''),
      customerPhone: String(meta.customerPhone || ''),
      preferredPayment: String(meta.preferredPayment || ''),
      riderType: String(meta.riderType || ''),
      deliveryStatus: String(meta.deliveryStatus || ''),
      stockConsumed: false,
      createdBy: actor || null,
      paidBy: pay === 'unpaid' ? null : (actor || null),
      paidAt: pay === 'unpaid' ? 0 : timestamp,
      businessDate: access ? access.businessDate : '',
      shiftId: access ? access.shiftId : ''
    };
  }

  function setActiveName(slot, name){
    if(!slot || typeof name !== 'string') return false;
    const next = name.trim();
    if(!next) return false;
    slot.name = next;
    return true;
  }

  function deleteActive(slots, active){
    if(!Array.isArray(slots) || !slots.length) return active || 0;
    slots.splice(active, 1);
    return Math.max(0, (Number(active) || 0) - 1);
  }

  function setActiveIndex(index, length){
    return clamp(Number(index) || 0, 0, Math.max(0, (Number(length) || 0) - 1));
  }

  function updateSlot(slot, changes, index, normalizeSlot){
    if(!slot || !changes || typeof changes !== 'object' || slot.issued) return null;
    const next = Object.assign({}, slot, changes);
    return typeof normalizeSlot === 'function' ? normalizeSlot(next, index) : next;
  }

  root.BK_SLOT_STATE = {
    createSlot,
    setActiveName,
    deleteActive,
    setActiveIndex,
    updateSlot
  };

  if(typeof module !== 'undefined' && module.exports){
    module.exports = root.BK_SLOT_STATE;
  }
})(typeof window !== 'undefined' ? window : globalThis);
