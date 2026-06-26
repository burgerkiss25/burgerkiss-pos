// State normalization helpers shared by POS state bootstrapping and tests.
(function(root){
  'use strict';

  const PAY_SET = new Set(['unpaid', 'cash', 'momo', 'bolt', 'hubtel', 'chowdeck', 'whatsapp']);
  const SOURCE_SET = new Set(['walkin', 'whatsapp', 'bolt', 'hubtel', 'chowdeck']);

  function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }

  function normalizeDiscount(v){
    const n = Number(v);
    if(!Number.isFinite(n)) return 0;
    return clamp(n, 0, 1);
  }

  function normalizeItem(it){
    if(!it || typeof it!=='object' || typeof it.itemId!=='string') return null;
    return {
      itemId: it.itemId,
      note: typeof it.note==='string' ? it.note : '',
      done: !!it.done,
      menuGroupId: typeof it.menuGroupId === 'string' ? it.menuGroupId : '',
      menuName: typeof it.menuName === 'string' ? it.menuName : '',
      menuRole: typeof it.menuRole === 'string' ? it.menuRole : '',
      menuNoSauce: !!it.menuNoSauce,
      customerGroupId: typeof it.customerGroupId === 'string' ? it.customerGroupId : '',
      packGroupId: typeof it.packGroupId === 'string' ? it.packGroupId : ''
    };
  }

  function normalizeSlot(slot, idx){
    const rawItems = Array.isArray(slot && slot.items) ? slot.items : [];
    return {
      name: (slot && typeof slot.name==='string' && slot.name.trim()) ? slot.name.trim() : `SN${idx+1}`,
      items: rawItems.map(normalizeItem).filter(Boolean),
      pay: PAY_SET.has(slot && slot.pay) ? slot.pay : 'unpaid',
      momoProvider: slot && (slot.momoProvider === 'telecel' || slot.momoProvider === 'mtn') ? slot.momoProvider : '',
      issued: !!(slot && slot.issued),
      voided: !!(slot && slot.voided),
      voidReason: String((slot && slot.voidReason) || ''),
      packMode: (slot && slot.packMode === 'split') ? 'split' : 'shared',
      packAsked: !!(slot && slot.packAsked),
      drinkPackMode: (slot && slot.drinkPackMode === 'by-customer') ? 'by-customer' : 'shared',
      sentToKitchen: !!(slot && slot.sentToKitchen),
      discountRate: normalizeDiscount(slot && slot.discountRate),
      discountApprovedBy: (slot && slot.discountApprovedBy && typeof slot.discountApprovedBy === 'object') ? slot.discountApprovedBy : null,
      discountApprovedAt: Number(slot && slot.discountApprovedAt) || 0,
      orderNo: (slot && typeof slot.orderNo==='string' && slot.orderNo.trim()) ? slot.orderNo.trim() : null,
      createdAt: Number(slot && slot.createdAt) > 0 ? Number(slot.createdAt) : Date.now(),
      orderSource: SOURCE_SET.has(slot && slot.orderSource) ? slot.orderSource : 'walkin',
      externalOrderNo: String((slot && slot.externalOrderNo) || '').trim(),
      originalSource: SOURCE_SET.has(slot && slot.originalSource) ? slot.originalSource : '',
      originalPay: PAY_SET.has(slot && slot.originalPay) ? slot.originalPay : '',
      finalChannel: String((slot && slot.finalChannel) || ''),
      fulfilment: String((slot && slot.fulfilment) || ''),
      conversionReason: String((slot && slot.conversionReason) || ''),
      refundStatus: String((slot && slot.refundStatus) || ''),
      convertedAt: Number(slot && slot.convertedAt) || 0,
      createdBy: (slot && slot.createdBy && typeof slot.createdBy === 'object') ? slot.createdBy : null,
      paidBy: (slot && slot.paidBy && typeof slot.paidBy === 'object') ? slot.paidBy : null,
      paidAt: Number(slot && slot.paidAt) || 0,
      businessDate: String((slot && slot.businessDate) || ''),
      shiftId: String((slot && slot.shiftId) || ''),
      customerName: String((slot && slot.customerName) || ''),
      customerPhone: String((slot && slot.customerPhone) || ''),
      preferredPayment: String((slot && slot.preferredPayment) || ''),
      riderType: String((slot && slot.riderType) || ''),
      deliveryStatus: String((slot && slot.deliveryStatus) || ''),
      stockConsumed: !!(slot && slot.stockConsumed)
    };
  }

  function normalizeState(st){
    const rawSlots = Array.isArray(st && st.slots) ? st.slots : [];
    const legacyDiscount = normalizeDiscount(st && st.discountRate);
    const nextSlots = rawSlots.map((slot, i)=>{
      const normalized = normalizeSlot(slot, i);
      if(!normalized.discountRate && legacyDiscount) normalized.discountRate = legacyDiscount;
      return normalized;
    });
    const nextActive = clamp(Number(st && st.active) || 0, 0, Math.max(0, nextSlots.length-1));
    const nextDiscount = 0;
    const nextSeq = Math.max(0, Number(st && st.orderSeq) || 0);
    const nextUpdatedAt = Math.max(0, Number(st && st.ts) || 0);
    return { slots: nextSlots, active: nextActive, discountRate: nextDiscount, orderSeq: nextSeq, updatedAt: nextUpdatedAt };
  }

  root.BK_STATE_NORMALIZERS = {
    normalizeDiscount,
    normalizeItem,
    normalizeSlot,
    normalizeState
  };

  if(typeof module !== 'undefined' && module.exports){
    module.exports = root.BK_STATE_NORMALIZERS;
  }
})(typeof window !== 'undefined' ? window : globalThis);
