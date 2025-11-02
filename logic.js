// Preis-/Combo-Logik (pro Slot + global)
(function(){
  function computeSlot(slot){
    const counts = {}; BK_DATA.BASE.forEach(x=>counts[x.id]=0);
    slot.items.forEach(it=> counts[it.itemId]++);
    const consume = id => { if(counts[id]>0){ counts[id]--; return true; } return false; }
    const sumLeft = () => BK_DATA.BASE.reduce((a,x)=>a + counts[x.id]*BK_PRICES.getPrice(x.id),0);
    let total = sumLeft(); let combos = 0;

    function pickFries(){
      if(counts['fr_std']>0){ consume('fr_std'); return {surcharge:0, id:'fr_std'}; }
      if(counts['fr_lg']>0){ consume('fr_lg'); return {surcharge:(BK_PRICES.getPrice('fr_lg') - BK_DATA.MENU.included.fries), id:'fr_lg'}; }
      return null;
    }
    function pickDrink(){
      const pref=['d_coconut','d_coke','d_fanta_o','d_fanta_l','d_sprite','d_ice_tea','d_cw_btl','d_club_s','d_club_l','d_guin'];
      for(const id of pref){
        if(consume(id)){
          const up = Math.max(0, BK_PRICES.getPrice(id) - BK_DATA.MENU.included.drink);
          return {surcharge:up, id};
        }
      }
      return null;
    }
    function applyMenu(ids, menuPrice, surcharge){
      const toSub = ids.reduce((acc,id)=> acc + BK_PRICES.getPrice(id), 0);
      total -= toSub;
      total += (menuPrice + surcharge);
      combos++;
    }
    function buildBurgerCombos(bid, mprice){
      while(counts[bid]>0){
        if(counts['fr_std']+counts['fr_lg']<=0) break;
        const d = pickDrink(); if(!d) break;
        const f = pickFries(); if(!f){ counts[d.id]++; break; }
        consume(bid); applyMenu([bid, f.id, d.id], mprice, f.surcharge + d.surcharge);
      }
    }
    buildBurgerCombos('cheeseburger', BK_DATA.MENU.cheeseburger);
    buildBurgerCombos('hamburger',   BK_DATA.MENU.hamburger);

    while(counts['w12']>0){
      if(counts['fr_std']+counts['fr_lg']<=0) break;
      const d = pickDrink(); if(!d) break;
      const f = pickFries(); if(!f){ counts[d.id]++; break; }
      consume('w12'); applyMenu(['w12', f.id, d.id], BK_DATA.MENU.wings12, f.surcharge + d.surcharge);
    }

    return {subtotal: total, combos};
  }

  function computeAll(slots, discountRate){
    let grandSubtotal=0, totalCombos=0;
    const perSlot = slots.map(s=>{
      const c = computeSlot(s);
      grandSubtotal += c.subtotal; totalCombos += c.combos;
      return c;
    });
    const discount = Math.round(grandSubtotal * (discountRate||0));
    const grand = grandSubtotal - discount;
    return {perSlot, grandSubtotal, discount, grand, totalCombos};
  }

  // text/html helpers
  function groupCounts(items){
    const counts={};
    items.forEach(it=>{
      const key = it.itemId + (it.note ? '|' + it.note : '');
      counts[key]=(counts[key]||0)+1;
    });
    return counts;
  }
  function groupHtml(items){
    const counts = groupCounts(items);
    const wrap = document.createElement('div');
    Object.entries(counts).forEach(([key,qty])=>{
      const [id, note=''] = key.split('|');
      const p = BK_DATA.BASE.find(x=>x.id===id);
      const row = document.createElement('div');
      row.className='row'; row.style.borderTop='1px dashed #2a2f39'; row.style.padding='6px 0';
      row.innerHTML = `<span><b>${p.name}</b> <small>× ${qty}${note?` · ${note}`:''}</small></span>
                       <span>${qty*BK_PRICES.getPrice(id)} GHS</span>`;
      wrap.appendChild(row);
    });
    return wrap.outerHTML;
  }
  function textLines(items){
    const counts = groupCounts(items);
    const lines = [];
    Object.entries(counts).forEach(([key,qty])=>{
      const [id, note=''] = key.split('|');
      const p = BK_DATA.BASE.find(x=>x.id===id);
      lines.push(`- ${p.name} x${qty}${note?` (${note})`:''} = ${qty*BK_PRICES.getPrice(id)} GHS`);
    });
    return lines.join('\n');
  }
  function sectionHtml(slot){
    const c = computeSlot(slot);
    return `<div style="margin:6px 0 10px">
      <div><b>${slot.name}</b></div>
      ${groupHtml(slot.items)}
      <div class="sumline"><span>${slot.name} Subtotal</span><b>${c.subtotal} GHS</b></div>
    </div>`;
  }

  window.BK_LOGIC = { computeSlot, computeAll, groupHtml, textLines, sectionHtml };
})();
