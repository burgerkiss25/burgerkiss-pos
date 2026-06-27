// Stock overview DOM builders and filtering model.
(function(root){
  'use strict';

  function textEl(tag, text, className){
    const el = root.document.createElement(tag);
    if(className) el.className = className;
    el.textContent = text == null ? '' : String(text);
    return el;
  }

  function button(label, className){
    const btn = root.document.createElement('button');
    btn.type = 'button';
    btn.className = className || '';
    btn.textContent = label;
    return btn;
  }

  function stockStatus(row){
    return (row.buyNeeded || row.shortage) ? 'buy' : (row.refillNeeded ? 'refill' : 'ok');
  }

  function stockOverviewModel(rows, filter, queryText){
    const tracked = (Array.isArray(rows) ? rows : []).filter(row=> row.track !== false);
    const buyCount = tracked.filter(row=> !!row.buyNeeded).length;
    const refillCount = tracked.filter(row=> !row.buyNeeded && !!row.refillNeeded).length;
    const criticalCount = tracked.filter(row=> !!row.shortage || !!row.buyNeeded).length;
    const query = String(queryText || '').trim().toLowerCase();
    const activeFilter = filter || 'all';
    const visible = tracked
      .filter(row=> activeFilter === 'all' ? true : stockStatus(row) === activeFilter)
      .filter(row=> !query || String(row.name || '').toLowerCase().includes(query) || String(row.id || '').toLowerCase().includes(query))
      .sort((a,b)=>String(a.name || '').localeCompare(String(b.name || '')));
    return {tracked, buyCount, refillCount, criticalCount, visible};
  }

  function summaryNode(model){
    const summary = root.document.createElement('div');
    summary.className = 'stock-overview-summary';
    [
      ['Tracked', model.tracked.length, ''],
      ['Critical', model.criticalCount, 'crit'],
      ['Refill', model.refillCount, 'refill'],
      ['Buy', model.buyCount, '']
    ].forEach(([label,value,className])=>{
      const kpi = root.document.createElement('div');
      kpi.className = `stock-kpi${className ? ` ${className}` : ''}`;
      kpi.append(textEl('span', label), textEl('b', value));
      summary.appendChild(kpi);
    });
    return summary;
  }

  function filtersNode(state){
    const filters = root.document.createElement('div');
    filters.className = 'stock-overview-filters';
    const searchInputNode = root.document.createElement('input');
    searchInputNode.id = 'stockOverviewSearch';
    searchInputNode.className = 'dialog-field';
    searchInputNode.placeholder = 'Search stock item';
    searchInputNode.value = state.query || '';
    filters.appendChild(searchInputNode);
    [
      ['all', 'All'],
      ['ok', 'OK'],
      ['refill', 'Refill'],
      ['buy', 'Critical / Buy']
    ].forEach(([value,label])=>{
      const filterBtn = button(label, `stock-filter ${state.filter === value ? 'active' : ''}`.trim());
      filterBtn.dataset.stockFilter = value;
      filters.appendChild(filterBtn);
    });
    return filters;
  }

  function listNode(model){
    const list = root.document.createElement('div');
    list.className = 'stock-overview-list';
    list.id = 'stockOverviewList';
    if(!model.visible.length){
      list.appendChild(textEl('div', 'No stock items in this filter.', 'empty-state'));
      return list;
    }
    model.visible.forEach(row=>{
      const status = stockStatus(row);
      const statusLabel = status === 'buy' ? 'Critical' : (status === 'refill' ? 'Refill' : 'OK');
      const item = root.document.createElement('div');
      item.append(textEl('b', row.name), textEl('small', `Used ${row.used} ${row.unit || ''}`));
      const stockRow = root.document.createElement('div');
      stockRow.className = 'stock-overview-row';
      stockRow.append(
        item,
        textEl('div', `Block Factory ${row.leftTruck} · Store ${row.leftStorage} ${row.unit || ''}`, 'stock-overview-meta'),
        textEl('span', statusLabel, `stock-status ${status}`)
      );
      list.appendChild(stockRow);
    });
    return list;
  }

  function renderStockOverview(host, model, state){
    host.replaceChildren(summaryNode(model), filtersNode(state), listNode(model));
    const searchInput = host.querySelector('#stockOverviewSearch');
    if(searchInput){
      searchInput.oninput = event=> state.onSearch(event.target.value);
      searchInput.focus({preventScroll:true});
      searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length);
    }
    host.querySelectorAll('[data-stock-filter]').forEach(btn=>{
      btn.onclick = ()=> state.onFilter(btn.dataset.stockFilter || 'all');
    });
  }

  root.BK_STOCK_OVERVIEW_RENDERERS = {
    stockStatus,
    stockOverviewModel,
    renderStockOverview
  };

  if(typeof module !== 'undefined' && module.exports){
    module.exports = root.BK_STOCK_OVERVIEW_RENDERERS;
  }
})(typeof window !== 'undefined' ? window : globalThis);
