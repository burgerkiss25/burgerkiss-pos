// Preis-/Combo-Logik (pro Slot + global)
(function(){
  function makeItemKey(itemId, note){
    return JSON.stringify([itemId, note || '']);
  }
  function parseItemKey(key){
    try{
      const arr = JSON.parse(key);
      if(Array.isArray(arr) && typeof arr[0]==='string'){
        return [arr[0], typeof arr[1]==='string' ? arr[1] : ''];
      }
    }catch(e){}
    const legacy = String(key || '').split('|');
    return [legacy[0] || '', legacy[1] || ''];
  }

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
      const key = makeItemKey(it.itemId, it.note || '');
      counts[key]=(counts[key]||0)+1;
    });
    return counts;
  }
  function groupedLines(items){
    const counts = groupCounts(items);
    return Object.entries(counts).map(([key,qty])=>{
      const [id, note=''] = parseItemKey(key);
      const p = BK_DATA.BASE.find(x=>x.id===id);
      return { id, note, qty, name: p ? p.name : id, total: qty*BK_PRICES.getPrice(id), key };
    });
  }
  function textLines(items){
    return groupedLines(items)
      .map(({name, qty, note, total})=> `- ${name} x${qty}${note?` (${note})`:''} = ${total} GHS`)
      .join('\n');
  }

  window.BK_LOGIC = { computeSlot, computeAll, makeItemKey, parseItemKey, groupCounts, groupedLines, textLines };
})();
