// Preis-/Combo-Logik (pro Slot + global)
(function(){
  function makeItemKey(itemId, note){
    return JSON.stringify([itemId, note || '']);
  }
  function isIncludedSauce(itemId, note){
    return String(note || '').toLowerCase().startsWith('included') && String(itemId || '').startsWith('x_sauce_');
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
    let total = slot.items.reduce((acc, it)=>{
      const price = BK_PRICES.getPrice(it.itemId);
      return acc + (isIncludedSauce(it.itemId, it.note) ? 0 : price);
    }, 0);
    let combos = 0;

    function pickFries(){
      if(counts['fries_standard']>0){ consume('fries_standard'); return {surcharge:0, id:'fries_standard'}; }
      if(counts['fries_large']>0){ consume('fries_large'); return {surcharge:(BK_PRICES.getPrice('fries_large') - BK_DATA.MENU.included.fries), id:'fries_large'}; }
      return null;
    }
    function pickDrink(){
      const pref=['d_coconut_fresh','d_cola','d_fanta_orange','d_fanta_coktail','d_biggoo_grape','d_sprite','d_iced_tea_lime','d_iced_tea_ginger','d_iced_tea_strawberry','d_iced_tea_pineapple','d_iced_tea_mint','d_iced_tea_apple','d_iced_tea_green_mint','d_iced_tea_vannile','d_coconut_water_bottle','d_club_beer_std','d_club_beer_large','d_guinness'];
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
        if(counts['fries_standard']+counts['fries_large']<=0) break;
        const d = pickDrink(); if(!d) break;
        const f = pickFries(); if(!f){ counts[d.id]++; break; }
        consume(bid); applyMenu([bid, f.id, d.id], mprice, f.surcharge + d.surcharge);
      }
    }
    buildBurgerCombos('double_cheeseburger', BK_DATA.MENU.double_cheeseburger);
    buildBurgerCombos('double_burger', BK_DATA.MENU.double_burger);
    buildBurgerCombos('cheeseburger', BK_DATA.MENU.cheeseburger);
    buildBurgerCombos('hamburger', BK_DATA.MENU.hamburger);

    ['wings_24','wings_12','wings_6'].forEach(wid=>{
      while(counts[wid]>0){
      if(counts['fries_standard']+counts['fries_large']<=0) break;
      const d = pickDrink(); if(!d) break;
      const f = pickFries(); if(!f){ counts[d.id]++; break; }
      consume(wid); applyMenu([wid, f.id, d.id], BK_DATA.MENU[wid], f.surcharge + d.surcharge);
    }
    });

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
      const unit = isIncludedSauce(id, note) ? 0 : BK_PRICES.getPrice(id);
      return { id, note, qty, name: p ? p.name : id, total: qty*unit, key };
    });
  }
  function textLines(items){
    return groupedLines(items)
      .map(({name, qty, note, total})=> `- ${name} x${qty}${note?` (${note})`:''} = ${total} GHS`)
      .join('\n');
  }

  window.BK_LOGIC = { computeSlot, computeAll, makeItemKey, parseItemKey, groupCounts, groupedLines, textLines };
})();
