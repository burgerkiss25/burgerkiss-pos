// Shared shift/history reporting helpers for non-order tools.
(function(root){
  'use strict';

  const HISTORY_KEY = 'bk_order_history_v1';
  const CASH_FLOAT_GHS = 200;
  const ONLINE_PLATFORMS = new Set(['bolt', 'hubtel', 'chowdeck']);

  function escapeHtml(value){
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }
  function dateInputValue(value){
    const d = value ? new Date(value) : new Date();
    const pad = n=>String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  }
  function paymentLabel(pay, provider){
    if(pay === 'momo' && provider === 'mtn') return 'MTN MoMo';
    if(pay === 'momo' && provider === 'telecel') return 'Telecel MoMo';
    return ({unpaid:'Unpaid', cash:'Cash', momo:'MoMo', bolt:'Bolt', hubtel:'Hubtel', chowdeck:'Chowdeck', whatsapp:'WhatsApp'})[pay] || String(pay || 'Unknown');
  }
  function historyRemotePath(){ return (root.BK_HISTORY_PATH || '/pos/history').replace(/\/+$/,''); }
  function historyDateKey(ts){ return dateInputValue(ts); }
  function historyDb(){
    try{
      if(!(root.FIREBASE_CONFIG && root.firebase && root.firebase.database)) return null;
      const app = root.firebase.apps && root.firebase.apps.length ? root.firebase.app() : root.firebase.initializeApp(root.FIREBASE_CONFIG);
      return root.firebase.database(app);
    }catch(e){ return null; }
  }
  function sanitizeHistoryEntry(entry){
    if(!entry || typeof entry !== 'object') return null;
    const orderNo = String(entry.orderNo || '').trim() || '-';
    const closedAt = Number(entry.closedAt) || Date.now();
    return {
      id: String(entry.id || `${orderNo}-${closedAt}`).replace(/[^a-zA-Z0-9_\-]/g, '_'),
      orderNo,
      slotName: String(entry.slotName || '-'),
      pay: String(entry.pay || 'unpaid'),
      momoProvider: String(entry.momoProvider || ''),
      orderSource: String(entry.orderSource || 'walkin'),
      externalOrderNo: String(entry.externalOrderNo || ''),
      finalChannel: String(entry.finalChannel || ''),
      fulfilment: String(entry.fulfilment || ''),
      refundStatus: String(entry.refundStatus || ''),
      closedAt,
      subtotal: Number(entry.subtotal) || 0,
      discount: Math.max(0, Number(entry.discount) || 0),
      total: Number.isFinite(Number(entry.total)) ? Number(entry.total) : Math.max(0, (Number(entry.subtotal) || 0) - (Number(entry.discount) || 0)),
      status: entry.status === 'voided' ? 'voided' : 'completed',
      voidReason: String(entry.voidReason || ''),
      items: Array.isArray(entry.items) ? entry.items : []
    };
  }
  function mergeHistory(local, remote){
    const map = new Map();
    const add = entry=>{
      const clean = sanitizeHistoryEntry(entry);
      if(!clean) return;
      const existing = map.get(clean.id);
      if(!existing || Number(clean.closedAt) >= Number(existing.closedAt)) map.set(clean.id, clean);
    };
    (Array.isArray(local) ? local : []).forEach(add);
    (Array.isArray(remote) ? remote : []).forEach(add);
    return Array.from(map.values()).sort((a,b)=>Number(b.closedAt||0)-Number(a.closedAt||0)).slice(0, 1000);
  }
  function flattenRemoteHistory(raw){
    const out = [];
    function visit(node){
      if(!node || typeof node !== 'object') return;
      if(String(node.orderNo || '').trim() && (node.closedAt || node.createdAt)){
        const clean = sanitizeHistoryEntry(node);
        if(clean) out.push(clean);
        return;
      }
      Object.values(node).forEach(visit);
    }
    visit(raw);
    return out;
  }
  function getHistory(){
    try{
      const raw = root.localStorage && root.localStorage.getItem(HISTORY_KEY);
      return mergeHistory(raw ? JSON.parse(raw) : [], []);
    }catch(e){ return []; }
  }
  function saveHistory(list){
    const clean = mergeHistory(Array.isArray(list) ? list : [], []);
    try{ root.localStorage && root.localStorage.setItem(HISTORY_KEY, JSON.stringify(clean)); }catch(e){}
    return clean;
  }
  function refreshHistoryFromRemote(){
    const database = historyDb();
    if(!database) return Promise.resolve(false);
    return database.ref(historyRemotePath()).get().then(snapshot=>{
      const merged = mergeHistory(getHistory(), flattenRemoteHistory(snapshot.val()));
      saveHistory(merged);
      return merged.length > 0;
    }).catch(e=>{ console.warn('history remote refresh failed:', e && e.message); return false; });
  }
  function dailyReportData(date){
    const selected = String(date || dateInputValue(new Date()));
    const orders = getHistory().filter(entry=>dateInputValue(entry.closedAt) === selected);
    const completed = orders.filter(entry=>entry.status !== 'voided');
    const voided = orders.filter(entry=>entry.status === 'voided');
    const sum = (list, field)=>list.reduce((total, entry)=>total + Number(entry[field] || 0), 0);
    const netSales = sum(completed, 'total');
    const cashTotal = sum(completed.filter(entry=>entry.pay === 'cash'), 'total');
    const purchases = root.BK_STOCK && root.BK_STOCK.getPurchases ? root.BK_STOCK.getPurchases().filter(p=>dateInputValue(p.ts) === selected) : [];
    const cashPurchases = sum(purchases.filter(p=>p.paymentSource === 'cash_wallet'), 'amount');
    const expectedWallet = CASH_FLOAT_GHS + cashTotal - cashPurchases;
    return {
      date:selected, orders, completed, voided, purchases,
      netSales,
      cashTotal,
      momoTelecelTotal:sum(completed.filter(entry=>entry.pay === 'momo' && entry.momoProvider === 'telecel'), 'total'),
      momoMtnTotal:sum(completed.filter(entry=>entry.pay === 'momo' && entry.momoProvider === 'mtn'), 'total'),
      momoUnspecifiedTotal:sum(completed.filter(entry=>entry.pay === 'momo' && !entry.momoProvider), 'total'),
      boltTotal:sum(completed.filter(entry=>entry.pay === 'bolt'), 'total'),
      hubtelTotal:sum(completed.filter(entry=>entry.pay === 'hubtel'), 'total'),
      chowdeckTotal:sum(completed.filter(entry=>entry.pay === 'chowdeck'), 'total'),
      convertedOrders:completed.filter(entry=>entry.finalChannel === 'direct').length,
      discounts:sum(completed, 'discount'),
      voidValue:sum(voided, 'total'),
      average:completed.length ? Math.round(netSales / completed.length) : 0,
      cashFloat:CASH_FLOAT_GHS,
      cashPurchases,
      expectedWallet,
      topUpNeeded:Math.max(0, CASH_FLOAT_GHS - expectedWallet)
    };
  }
  function reportOrderHtml(entry, interactive){
    const className = `report-order ${entry.status === 'voided' ? 'voided' : ''}`.trim();
    const content = `<span><b>${escapeHtml(entry.orderNo)}</b><small>${escapeHtml(paymentLabel(entry.pay, entry.momoProvider))}${entry.voidReason ? ` · ${escapeHtml(entry.voidReason)}` : ''}</small></span><strong>${entry.total} GHS</strong>`;
    if(interactive) return `<button type="button" class="${className}" data-history-id="${escapeHtml(entry.id)}">${content}</button>`;
    return `<div class="${className}">${content}</div>`;
  }
  function dailyReportHtml(report, options){
    const interactive = !options || options.interactive !== false;
    const topUp = report.topUpNeeded > 0
      ? `<div class="void-metric"><small>Top up needed</small><strong>${report.topUpNeeded} GHS</strong></div>`
      : `<div><small>Wallet status</small><strong>Ready</strong></div>`;
    return `<div class="daily-report">
      <div class="report-heading"><span>Business date</span><strong>${escapeHtml(report.date)}</strong></div>
      <div class="report-metrics">
        <div><small>Net sales</small><strong>${report.netSales} GHS</strong></div>
        <div><small>Cash</small><strong>${report.cashTotal} GHS</strong></div>
        <div><small>Telecel MoMo</small><strong>${report.momoTelecelTotal} GHS</strong></div>
        <div><small>MTN MoMo</small><strong>${report.momoMtnTotal} GHS</strong></div>
        <div><small>MoMo unspecified</small><strong>${report.momoUnspecifiedTotal} GHS</strong></div>
        <div><small>Bolt</small><strong>${report.boltTotal} GHS</strong></div>
        <div><small>Hubtel</small><strong>${report.hubtelTotal} GHS</strong></div>
        <div><small>Chowdeck</small><strong>${report.chowdeckTotal} GHS</strong></div>
        <div><small>Converted online orders</small><strong>${report.convertedOrders}</strong></div>
        <div><small>Completed orders</small><strong>${report.completed.length}</strong></div>
        <div><small>Discounts</small><strong>${report.discounts} GHS</strong></div>
        <div><small>Average order</small><strong>${report.average} GHS</strong></div>
        <div class="void-metric"><small>Voided orders</small><strong>${report.voided.length}</strong></div>
        <div class="void-metric"><small>Voided value</small><strong>${report.voidValue} GHS</strong></div>
        <div><small>Starting float</small><strong>${report.cashFloat} GHS</strong></div>
        <div><small>Cash purchases</small><strong>-${report.cashPurchases} GHS</strong></div>
        <div><small>Expected wallet</small><strong>${report.expectedWallet} GHS</strong></div>
        ${topUp}
      </div>
      <div class="report-heading"><span>Wallet note</span><strong>The BurgerKiss purse must start each shift with 200 GHS change.</strong></div>
      <div class="report-orders"><h3>Order audit</h3>${report.orders.length ? report.orders.map(entry=>`
        ${reportOrderHtml(entry, interactive)}`).join('') : '<div class="empty-state">No orders for this date.</div>'}</div>
      ${purchaseListHtml(report.purchases)}
    </div>`;
  }

  function visibleHistory(range){
    const all = getHistory();
    const current = root.BK_ACCESS && root.BK_ACCESS.current ? root.BK_ACCESS.current() : null;
    const today = dateInputValue(new Date());
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = dateInputValue(yesterdayDate);
    if(range === 'all' && current && current.role === 'owner') return all;
    const selected = range === 'yesterday' ? yesterday : today;
    return all.filter(entry=>dateInputValue(entry.closedAt) === selected);
  }

  function purchaseListHtml(items){
    if(!items.length) return '<div class="report-orders"><h3>Purchase audit</h3><div class="empty-state">No purchases recorded yet.</div></div>';
    return `<div class="report-orders"><h3>Purchase audit</h3>${items.slice().reverse().slice(0,50).map(entry=>{
      const staffName = entry.staff && entry.staff.name ? entry.staff.name : 'Unknown purchaser';
      const purchasedAt = entry.ts ? new Date(entry.ts).toLocaleString() : 'No date saved';
      const receipt = entry.receiptInPurse ? 'Receipt in purse' : 'Receipt missing';
      return `<div class="report-order purchase-audit-row"><span><b>${escapeHtml(entry.ingredient_name || entry.ingredientId)}</b><small>${escapeHtml(purchasedAt)} · ${escapeHtml(staffName)}</small><small>${escapeHtml(entry.qty)} ${escapeHtml(entry.unit)} · ${escapeHtml(entry.paymentSource)} · ${receipt}${entry.note ? ` · ${escapeHtml(entry.note)}` : ''}</small></span><strong>${escapeHtml(entry.amount)} GHS</strong></div>`;
    }).join('')}</div>`;
  }
  function historyDetailHtml(entry){
    if(!entry) return '<div class="empty-state">Order not found.</div>';
    const rows = Array.isArray(entry.items) && entry.items.length ? entry.items.map(item=>`<div class="history-item"><div class="history-item-main"><span><b>${escapeHtml(item.name || item.itemId || 'Item')}</b><small>${escapeHtml(item.note || '')}</small></span><strong>${escapeHtml(item.qty || 1)}</strong></div></div>`).join('') : '<div class="empty-state">No item detail saved for this order.</div>';
    return `<div class="history-detail-meta"><div><small>Order</small><strong>${escapeHtml(entry.orderNo)}</strong></div><div><small>Payment</small><strong>${escapeHtml(paymentLabel(entry.pay, entry.momoProvider))}</strong></div><div><small>Closed</small><strong>${new Date(entry.closedAt).toLocaleString()}</strong></div><div><small>Total</small><strong>${entry.total} GHS</strong></div><div><small>Source</small><strong>${escapeHtml(entry.orderSource || 'walkin')}</strong></div><div><small>Status</small><strong>${escapeHtml(entry.status)}</strong></div></div><h3>Items</h3><div class="history-item-list">${rows}</div>`;
  }
  function historyListHtml(items){
    if(!items.length) return '<div class="empty-state">No completed orders in history yet.</div>';
    const completed = items.filter(entry=>entry.status !== 'voided');
    const totalSales = completed.reduce((total, entry)=>total + Number(entry.total || 0), 0);
    return `<div class="history-summary"><span><b>Orders:</b> ${completed.length}</span><span><b>Cash:</b> ${completed.filter(entry=>entry.pay === 'cash').length}</span><span><b>MoMo:</b> ${completed.filter(entry=>entry.pay === 'momo').length}</span><span><b>Online:</b> ${completed.filter(entry=>ONLINE_PLATFORMS.has(entry.orderSource)).length}</span><span class="history-summary-total"><b>Net sales:</b> ${totalSales} GHS</span></div>
      <div class="history-order-list">${items.slice(0,200).map(entry=>`<button type="button" class="history-order-row ${entry.status === 'voided' ? 'voided' : ''}" data-history-id="${escapeHtml(entry.id)}"><span><strong>${escapeHtml(entry.orderNo)}</strong><small>${escapeHtml(entry.externalOrderNo || entry.slotName)} · ${escapeHtml(paymentLabel(entry.pay, entry.momoProvider))} · ${new Date(entry.closedAt).toLocaleString()}</small></span><span><b>${entry.total} GHS</b><small class="history-status">${entry.status === 'voided' ? 'Voided' : 'Completed'}</small></span></button>`).join('')}</div>`;
  }

  root.BK_REPORTS = { CASH_FLOAT_GHS, escapeHtml, dateInputValue, paymentLabel, getHistory, refreshHistoryFromRemote, dailyReportData, dailyReportHtml, visibleHistory, purchaseListHtml, historyDetailHtml, historyListHtml };
  if(typeof module !== 'undefined' && module.exports) module.exports = root.BK_REPORTS;
})(typeof window !== 'undefined' ? window : globalThis);
