// Workflow progression helpers for the order workspace.
(function(root){
  'use strict';

  function isOnlineOrder(slot){
    return !!(slot && slot.orderSource && slot.orderSource !== 'walkin');
  }

  function platformLabel(source){
    const labels = {bolt:'Bolt', glovo:'Glovo', phone:'Phone', whatsapp:'WhatsApp'};
    return labels[source] || 'Online';
  }

  function workflowNextState(stage, slot){
    const hasItems = !!(slot && Array.isArray(slot.items) && slot.items.length);
    if(stage === 'order'){
      if(!hasItems) return {state:'blocked', title:'Add products first', detail:'Choose at least one product from the product grid before sending this order to Kitchen.', label:'Continue to Kitchen', target:'make', disabled:true};
      if(isOnlineOrder(slot)) return {state:'ready', title:`${platformLabel(slot.orderSource)} order ready`, detail:'Reference is saved. Check products, then send the order to Kitchen.', label:'Continue to Kitchen', target:'make', disabled:false};
      return {state:'ready', title:'Order ready for kitchen', detail:'Check the cart, then send the order to preparation.', label:'Continue to Kitchen', target:'make', disabled:false};
    }
    if(stage === 'make'){
      const done = hasItems && slot.items.every(item=>!!item.done);
      return done
        ? {state:'ready', title:'Kitchen complete', detail:'All items are prepared.', label:slot.pay === 'unpaid' ? 'Continue to Payment' : 'Continue to Handover', target:slot.pay === 'unpaid' ? 'pay' : 'issue', disabled:false}
        : {state:'blocked', title:'Kitchen preparation required', detail:'Mark every item as prepared to continue.', label:'Continue to Payment', target:'pay', disabled:true};
    }
    if(stage === 'pay') return hasItems && slot.pay !== 'unpaid'
      ? {state:'ready', title:'Payment complete', detail:'Payment is confirmed. Continue with the same order to handover.', label:'Continue to Handover', target:'issue', disabled:false}
      : {state:'blocked', title:'Payment required', detail:'Confirm Cash or MoMo payment to continue. Online orders are already paid.', label:'Continue to Handover', target:'issue', disabled:true};
    return {state:'blocked', title:'Step incomplete', detail:'Complete this step to continue.', label:'Continue', target:'order', disabled:true};
  }

  root.BK_WORKFLOW_STATE = {
    workflowNextState
  };

  if(typeof module !== 'undefined' && module.exports){
    module.exports = root.BK_WORKFLOW_STATE;
  }
})(typeof window !== 'undefined' ? window : globalThis);
