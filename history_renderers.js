// History DOM builders kept separate from POS workflow orchestration.
(function(root){
  'use strict';

  const ONLINE_PLATFORMS = new Set(['bolt', 'hubtel', 'chowdeck']);

  function textEl(tag, text, className){
    const el = root.document.createElement(tag);
    if(className) el.className = className;
    el.textContent = text == null ? '' : String(text);
    return el;
  }

  function splitEntryNoteLines(note){
    return String(note || '')
      .split(/\s*\+\s+/)
      .map(part=>part.trim())
      .filter(Boolean);
  }

  function paymentLabel(pay, provider){
    if(pay === 'momo' && provider === 'mtn') return 'MTN MoMo';
    if(pay === 'momo' && provider === 'telecel') return 'Telecel MoMo';
    return ({unpaid:'Unpaid',cash:'Cash',whatsapp:'WhatsApp',bolt:'Bolt',hubtel:'Hubtel',chowdeck:'Chowdeck'})[pay] || String(pay || 'Unknown');
  }

  function platformLabel(src){
    return ({walkin:'Walk-in', whatsapp:'WhatsApp', bolt:'Bolt Food', hubtel:'Hubtel', chowdeck:'Chowdeck'})[src] || String(src || 'Walk-in');
  }

  function historyStatusLabel(entry){
    return entry.status === 'voided' ? 'VOIDED' : 'COMPLETED';
  }

  function historyItemsNode(entry){
    const items = Array.isArray(entry.items) ? entry.items : [];
    if(!items.length) return textEl('div', 'No saved item details.', 'empty-state');
    const list = root.document.createElement('div');
    list.className = 'history-item-list';
    items.forEach(item=>{
      const row = root.document.createElement('div');
      row.className = 'history-item';
      const main = root.document.createElement('div');
      main.className = 'history-item-main';
      main.append(textEl('strong', `${Number(item.qty)||1}x ${item.name}`), textEl('b', `${Number(item.total)||0} GHS`));
      row.appendChild(main);
      splitEntryNoteLines(item.note).forEach(note=>{
        row.appendChild(textEl('div', `+ ${String(note).replace(/^\+\s*/, '')}`, 'history-item-extra'));
      });
      list.appendChild(row);
    });
    return list;
  }

  function historyDetailMeta(label, value){
    const item = root.document.createElement('div');
    item.append(textEl('small', label), textEl('strong', value));
    return item;
  }

  function historyDetailContent(entry){
    const voided = entry.status === 'voided';
    const meta = root.document.createElement('div');
    meta.className = 'history-detail-meta';
    meta.append(
      historyDetailMeta('Order number', entry.orderNo),
      historyDetailMeta('Slot', entry.slotName),
      historyDetailMeta('Payment', paymentLabel(entry.pay, entry.momoProvider)),
      historyDetailMeta('Order source', platformLabel(entry.orderSource))
    );
    if(entry.externalOrderNo) meta.appendChild(historyDetailMeta('Platform reference', entry.externalOrderNo));
    if(entry.finalChannel === 'direct'){
      meta.append(
        historyDetailMeta('Converted delivery', entry.fulfilment === 'customer-rider' ? 'Customer-arranged rider' : 'BurgerKiss delivery'),
        historyDetailMeta('Platform refund', 'Expected / Pending')
      );
    }
    meta.append(
      historyDetailMeta('Packaging', entry.packMode === 'split' ? 'Packed separately' : 'Packed together'),
      historyDetailMeta('Created', new Date(entry.createdAt).toLocaleString()),
      historyDetailMeta('Issued', new Date(entry.closedAt).toLocaleString())
    );
    const content = [meta];
    if(voided){
      const notice = root.document.createElement('div');
      notice.className = 'void-notice';
      notice.append(
        textEl('strong', 'VOIDED ORDER'),
        textEl('span', entry.voidReason),
        textEl('small', `${new Date(entry.voidedAt).toLocaleString()} · ${entry.voidedBy || 'POS terminal'}`)
      );
      content.push(notice);
    }
    content.push(historyItemsNode(entry));
    const totals = root.document.createElement('div');
    totals.className = 'history-totals';
    [
      ['Subtotal', `${entry.subtotal} GHS`, ''],
      [`Discount (${Math.round((entry.discountRate||0)*100)}%)`, `-${entry.discount||0} GHS`, ''],
      [voided ? 'Original total' : 'Total', `${entry.total} GHS`, 'total']
    ].forEach(([label,value,className])=>{
      const row = root.document.createElement('div');
      if(className) row.className = className;
      row.append(textEl('span', label), textEl('b', value));
      totals.appendChild(row);
    });
    content.push(totals);
    return content;
  }

  function historySummaryNode(items){
    const completed = items.filter(entry=>entry.status !== 'voided');
    const totalSales = completed.reduce((total, entry)=> total + Number(entry.total||entry.subtotal||0), 0);
    const summary = root.document.createElement('div');
    summary.className = 'history-summary';
    [
      ['Orders:', completed.length, ''],
      ['Cash:', completed.filter(entry=>entry.pay==='cash').length, ''],
      ['MoMo:', completed.filter(entry=>entry.pay==='momo').length, ''],
      ['Online:', completed.filter(entry=>ONLINE_PLATFORMS.has(entry.orderSource)).length, ''],
      ['Converted:', completed.filter(entry=>entry.finalChannel === 'direct').length, ''],
      ['Voided:', items.length - completed.length, ''],
      ['Net sales:', `${totalSales} GHS`, 'history-summary-total']
    ].forEach(([label,value,className])=>{
      const item = root.document.createElement('span');
      if(className) item.className = className;
      item.append(textEl('b', label), root.document.createTextNode(` ${value}`));
      summary.appendChild(item);
    });
    return summary;
  }

  function historyOrderButton(entry, onOpen){
    const button = root.document.createElement('button');
    button.type = 'button';
    button.className = `history-order-row ${entry.status === 'voided' ? 'voided' : ''}`.trim();
    button.dataset.historyId = entry.id || '';
    const main = root.document.createElement('span');
    main.append(
      textEl('strong', entry.orderNo),
      textEl('small', `${entry.externalOrderNo ? `${platformLabel(entry.orderSource)} · ${entry.externalOrderNo}` : entry.slotName} · ${paymentLabel(entry.pay, entry.momoProvider)} · ${new Date(entry.closedAt).toLocaleString()}`)
    );
    const totals = root.document.createElement('span');
    totals.append(textEl('b', `${Number(entry.total||entry.subtotal||0)} GHS`), textEl('small', historyStatusLabel(entry), 'history-status'));
    button.append(main, totals);
    button.onclick = ()=> onOpen(button.dataset.historyId);
    return button;
  }

  function historyBodyNodes(items, onOpen){
    if(!items.length) return [textEl('div', 'No completed orders in history yet.', 'empty-state')];
    const list = root.document.createElement('div');
    list.className = 'history-order-list';
    items.slice(0,200).forEach(entry=> list.appendChild(historyOrderButton(entry, onOpen)));
    return [historySummaryNode(items), list];
  }

  root.BK_HISTORY_RENDERERS = {
    historyItemsNode,
    historyDetailContent,
    historySummaryNode,
    historyOrderButton,
    historyBodyNodes
  };

  if(typeof module !== 'undefined' && module.exports){
    module.exports = root.BK_HISTORY_RENDERERS;
  }
})(typeof window !== 'undefined' ? window : globalThis);
