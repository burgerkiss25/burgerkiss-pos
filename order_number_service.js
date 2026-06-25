// Order-number parsing, formatting and local counter helpers.
(function(root){
  'use strict';

  function parseOrderSequence(orderNo){
    const match = String(orderNo || '').match(/(\d+)$/);
    return match ? Math.max(0, Number(match[1]) || 0) : 0;
  }

  function formatOrderNo(seq, now){
    const d = now instanceof Date ? now : new Date();
    const pad = n => String(n).padStart(2, '0');
    const date = `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}`;
    return `BK-${date}-${String(seq).padStart(8, '0')}`;
  }

  function localCounter(storage, key){
    try{ return Math.max(0, Number(storage.getItem(key)) || 0); }
    catch(e){ return 0; }
  }

  function rememberCounter(storage, key, current, seq){
    const next = Math.max(Number(current) || 0, Number(seq) || 0);
    try{ storage.setItem(key, String(next)); }catch(e){}
    return next;
  }

  function knownSequenceFloor(orderSeq, localValue, slots, historyEntries){
    let floor = Math.max(Number(orderSeq) || 0, Number(localValue) || 0);
    (Array.isArray(slots) ? slots : []).forEach(slot=>{
      floor = Math.max(floor, parseOrderSequence(slot && slot.orderNo));
    });
    (Array.isArray(historyEntries) ? historyEntries : []).forEach(entry=>{
      floor = Math.max(floor, parseOrderSequence(entry && entry.orderNo));
    });
    return floor;
  }

  root.BK_ORDER_NUMBER_SERVICE = {
    parseOrderSequence,
    formatOrderNo,
    localCounter,
    rememberCounter,
    knownSequenceFloor
  };

  if(typeof module !== 'undefined' && module.exports){
    module.exports = root.BK_ORDER_NUMBER_SERVICE;
  }
})(typeof window !== 'undefined' ? window : globalThis);
