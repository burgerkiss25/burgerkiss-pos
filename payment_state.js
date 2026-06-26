// Payment mutation helpers for order slots.
(function(root){
  'use strict';

  const PAY_SET = new Set(['unpaid', 'cash', 'momo', 'bolt', 'hubtel', 'chowdeck', 'whatsapp']);

  function normalizePay(status){
    return PAY_SET.has(status) ? status : 'unpaid';
  }

  function normalizeMomoProvider(pay, provider){
    return pay === 'momo' && (provider === 'telecel' || provider === 'mtn') ? provider : '';
  }

  function applyPayment(slot, status, provider, actor, now){
    if(!slot || slot.issued) return false;
    slot.pay = normalizePay(status);
    slot.momoProvider = normalizeMomoProvider(slot.pay, provider);
    slot.paidBy = slot.pay === 'unpaid' ? null : (actor || null);
    slot.paidAt = slot.pay === 'unpaid' ? 0 : (Number(now) || Date.now());
    return true;
  }

  root.BK_PAYMENT_STATE = {
    normalizePay,
    normalizeMomoProvider,
    applyPayment
  };

  if(typeof module !== 'undefined' && module.exports){
    module.exports = root.BK_PAYMENT_STATE;
  }
})(typeof window !== 'undefined' ? window : globalThis);
