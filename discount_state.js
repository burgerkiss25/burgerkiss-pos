// Discount state helpers for active order slots.
(function(root){
  'use strict';

  function normalizeDiscount(value){
    const normalizers = root.BK_STATE_NORMALIZERS || {};
    if(normalizers.normalizeDiscount) return normalizers.normalizeDiscount(value);
    const n = Number(value);
    if(!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(1, n));
  }

  function clearSlotDiscount(slot){
    if(!slot) return false;
    slot.discountRate = 0;
    slot.discountApprovedBy = null;
    slot.discountApprovedAt = 0;
    return true;
  }

  function applySlotDiscount(slot, rate, approval, now){
    if(!slot || slot.issued) return false;
    slot.discountRate = normalizeDiscount(rate);
    slot.discountApprovedBy = slot.discountRate && approval && typeof approval === 'object' ? approval : null;
    slot.discountApprovedAt = slot.discountRate ? (Number(now) || Date.now()) : 0;
    return true;
  }

  root.BK_DISCOUNT_STATE = {
    normalizeDiscount,
    clearSlotDiscount,
    applySlotDiscount
  };

  if(typeof module !== 'undefined' && module.exports){
    module.exports = root.BK_DISCOUNT_STATE;
  }
})(typeof window !== 'undefined' ? window : globalThis);
