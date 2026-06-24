const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const stateCode = fs.readFileSync(path.join(root, 'state.js'), 'utf8');
const logicCode = fs.readFileSync(path.join(root, 'logic.js'), 'utf8');
const uiCode = fs.readFileSync(path.join(root, 'ui.js'), 'utf8');

function createStorage(seed = {}) {
  const data = {...seed};
  return {
    getItem(key) { return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null; },
    setItem(key, value) { data[key] = String(value); },
    removeItem(key) { delete data[key]; },
    dump() { return {...data}; }
  };
}

function runState(storage, extra = {}) {
  const context = {
    console, Promise, Map, Set, Date, Math, Number, String, Array, Object, JSON,
    localStorage: storage, setTimeout, clearTimeout, ...extra
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(stateCode, context);
  return context;
}

async function testPersistentLocalSequence() {
  const storage = createStorage();
  const first = runState(storage, {BK_SYNC_ENABLED: false});
  first.BK_STATE.load();
  await first.BK_STATE.whenReady();
  await first.BK_STATE.addSlot();
  await first.BK_STATE.addSlot();
  assert.strictEqual(Array.from(first.BK_STATE.getState().slots, slot => slot.orderNo.slice(-8)).join(','), '00000001,00000002');

  first.BK_STATE.clearAll();
  await first.BK_STATE.addSlot();
  assert.strictEqual(first.BK_STATE.getState().slots[0].orderNo.slice(-8), '00000003');

  const reloaded = runState(createStorage(storage.dump()), {BK_SYNC_ENABLED: false});
  reloaded.BK_STATE.load();
  await reloaded.BK_STATE.whenReady();
  await reloaded.BK_STATE.addSlot();
  assert.ok(reloaded.BK_STATE.getState().slots.some(slot => slot.orderNo.endsWith('00000004')));
}

async function testAtomicRemoteSequence() {
  let counter = 0;
  let transactionQueue = Promise.resolve();
  const ref = {
    transaction(update) {
      const result = transactionQueue.then(() => {
        counter = update(counter);
        const committedValue = counter;
        return {committed: true, snapshot: {val: () => committedValue}};
      });
      transactionQueue = result.then(() => undefined);
      return result;
    },
    set() { return Promise.resolve(); },
    get() { return Promise.resolve({val: () => null}); }
  };
  const firebase = {
    apps: [{}],
    app: () => ({}),
    auth: () => ({currentUser: {}}),
    database: () => ({ref: () => ref})
  };
  const extra = {BK_SYNC_ENABLED: true, FIREBASE_CONFIG: {projectId: 'test'}, firebase};
  const terminalA = runState(createStorage(), extra);
  const terminalB = runState(createStorage(), extra);
  const numbers = await Promise.all([
    terminalA.BK_STATE.allocateOrderNo(),
    terminalB.BK_STATE.allocateOrderNo(),
    terminalA.BK_STATE.allocateOrderNo(),
    terminalB.BK_STATE.allocateOrderNo(),
    terminalA.BK_STATE.allocateOrderNo()
  ]);
  assert.strictEqual(new Set(numbers).size, 5);
  assert.strictEqual(numbers.map(number => number.slice(-8)).sort().join(','), '00000001,00000002,00000003,00000004,00000005');
}

async function testDuplicateRepair() {
  const saved = {
    bk_state_v5: JSON.stringify({
      v: 5, active: 1, discountRate: 0, orderSeq: 1,
      slots: [
        {name: 'SN1', items: [{itemId: 'a'}], issued: true, orderNo: 'BK-20260611-0001'},
        {name: 'SN2', items: [{itemId: 'b'}], issued: false, orderNo: 'BK-20260611-0001'}
      ]
    })
  };
  const context = runState(createStorage(saved), {BK_SYNC_ENABLED: false});
  context.BK_STATE.load();
  await context.BK_STATE.whenReady();
  const slots = context.BK_STATE.getState().slots;
  assert.strictEqual(slots[0].orderNo, 'BK-20260611-0001');
  assert.ok(slots[1].orderNo.endsWith('00000002'));
  assert.notStrictEqual(slots[0].orderNo, slots[1].orderNo);
}

function testIssuedOrderHistoryRecovery() {
  const storage = createStorage();
  const makeElement = () => ({
    children: [],
    dataset: {},
    className: '',
    textContent: '',
    innerHTML: '',
    classList: {add() {}, remove() {}, toggle() {}},
    append(...nodes) {
      this.children.push(...nodes);
      this.textContent += nodes.map(node => node && node.textContent ? node.textContent : '').join('');
    },
    appendChild(node) {
      this.children.push(node);
      this.textContent += node && node.textContent ? node.textContent : '';
      return node;
    },
    replaceChildren(...nodes) {
      this.children = [];
      this.textContent = '';
      this.innerHTML = '';
      this.append(...nodes);
    },
    querySelectorAll: () => []
  });
  const elements = {
    historyBody: makeElement(),
    modalHistory: {classList: {add() {}, remove() {}}},
    hSearch: {value: ''}
  };
  const slot = {
    name: 'SN1', orderNo: 'BK-20260611-00000042',
    items: [{itemId: 'burger', note: '', done: true}],
    pay: 'cash', issued: true, createdAt: 1000
  };
  let activeState = {slots: [slot], active: 0, discountRate: 0};
  const context = {
    console, Promise, Map, Set, Date, Math, Number, String, Array, Object, JSON,
    localStorage: storage,
    document: {
      getElementById: id => elements[id] || null,
      createElement: () => makeElement(),
      createTextNode: text => ({textContent: String(text || '')})
    },
    setTimeout, clearTimeout,
    BK_SYNC_ENABLED: false,
    BK_STATE: {getState: () => activeState, setState(next) { activeState = next; }},
    BK_LOGIC: {
      computeSlot: () => ({subtotal: 100, combos: 0}),
      groupedLines: () => [{name: 'Burger', qty: 1, note: '', total: 100}]
    },
    BK_DATA: {BASE: []}
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(uiCode, context);
  context.BK_UI.openHistory();
  const history = JSON.parse(storage.getItem('bk_order_history_v1') || '[]');
  assert.strictEqual(history.length, 1);
  assert.strictEqual(history[0].orderNo, slot.orderNo);
  assert.ok(elements.historyBody.textContent.includes(slot.orderNo));

  const reportDate = new Date(history[0].closedAt).toISOString().slice(0, 10);
  const reportBeforeVoid = context.BK_UI.dailyReportData(reportDate);
  assert.strictEqual(reportBeforeVoid.completed.length, 1);
  assert.strictEqual(reportBeforeVoid.netSales, 100);

  const voided = context.BK_UI.voidHistoryOrder(history[0].id, 'Manager correction');
  assert.strictEqual(voided.status, 'voided');
  assert.strictEqual(voided.voidReason, 'Manager correction');
  const reportAfterVoid = context.BK_UI.dailyReportData(reportDate);
  assert.strictEqual(reportAfterVoid.completed.length, 0);
  assert.strictEqual(reportAfterVoid.voided.length, 1);
  assert.strictEqual(reportAfterVoid.netSales, 0);
  assert.strictEqual(reportAfterVoid.voidValue, 100);

  const archivedCount = context.BK_UI.archiveCompletedSlots();
  assert.strictEqual(archivedCount, 1);
  assert.strictEqual(activeState.slots.length, 0);
  const preservedHistory = JSON.parse(storage.getItem('bk_order_history_v1') || '[]');
  assert.strictEqual(preservedHistory.length, 1);
  assert.strictEqual(preservedHistory[0].status, 'voided');
}

function testInlineWorkflowProgression() {
  const storage = createStorage();
  const context = {
    console, Promise, Map, Set, Date, Math, Number, String, Array, Object, JSON,
    localStorage: storage, document: {getElementById: () => null}, setTimeout, clearTimeout,
    BK_SYNC_ENABLED: false, BK_STATE: {getState: () => ({slots: [], active: 0, discountRate: 0})},
    BK_LOGIC: {}, BK_DATA: {BASE: []}
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(uiCode, context);

  const empty = {items: [], pay: 'unpaid'};
  const cooking = {items: [{itemId: 'burger', done: false}], pay: 'unpaid'};
  const prepared = {items: [{itemId: 'burger', done: true}], pay: 'unpaid'};
  const paid = {items: [{itemId: 'burger', done: true}], pay: 'cash'};

  assert.strictEqual(context.BK_UI.workflowNextState('order', empty).disabled, true);
  assert.strictEqual(context.BK_UI.workflowNextState('order', cooking).label, 'Continue to Kitchen');
  assert.strictEqual(context.BK_UI.workflowNextState('order', cooking).target, 'make');
  assert.strictEqual(context.BK_UI.workflowNextState('make', cooking).disabled, true);
  assert.strictEqual(context.BK_UI.workflowNextState('make', prepared).label, 'Continue to Payment');
  assert.strictEqual(context.BK_UI.workflowNextState('make', prepared).target, 'pay');
  assert.strictEqual(context.BK_UI.workflowNextState('pay', prepared).disabled, true);
  assert.strictEqual(context.BK_UI.workflowNextState('pay', paid).label, 'Continue to Handover');
  assert.strictEqual(context.BK_UI.workflowNextState('pay', paid).target, 'issue');

  let liveSlot = prepared;
  context.BK_STATE.getState = () => ({slots:[liveSlot], active:0, discountRate:0});
  liveSlot = paid;
  let navigation = null;
  assert.strictEqual(context.BK_UI.continueFromPayment(0, (slotIndex, target)=>{ navigation = {slotIndex, target}; }), true);
  assert.deepStrictEqual(navigation, {slotIndex:0, target:'issue'});
}

function testMenuGroupsRemainSeparate() {
  const context = {
    console, Map, Set, Date, Math, Number, String, Array, Object, JSON,
    BK_DATA: {BASE:[{id:'hamburger', name:'Hamburger'}], MENU:{included:{fries:0, drink:0}, comboDiscount:0}},
    BK_PRICES: {getPrice: () => 100}
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(logicCode, context);
  const lines = context.BK_LOGIC.groupedLines([
    {itemId:'hamburger', note:'', menuGroupId:'menu-a'},
    {itemId:'hamburger', note:'', menuGroupId:'menu-b'}
  ]);
  assert.strictEqual(lines.length, 2);
  assert.deepStrictEqual(Array.from(lines, line=>line.menuGroupId), ['menu-a', 'menu-b']);
  assert.notStrictEqual(lines[0].key, lines[1].key);
}

function testMenuHandoverPackagingPlan() {
  const storage = createStorage();
  const products = [
    {id:'hamburger', name:'Hamburger', cat:'burger'},
    {id:'fries_standard', name:'Fries Standard', cat:'fries'},
    {id:'d_cola', name:'Cola', cat:'drink'},
    {id:'d_sprite', name:'Sprite', cat:'drink'},
    {id:'x_sauce_ketchup', name:'Ketchup Sauce', cat:'sauce'}
  ];
  const groupedLines = items => {
    const map = new Map();
    items.forEach(item=>{
      const key = JSON.stringify([item.itemId, item.note || '']);
      if(!map.has(key)){
        const product = products.find(entry=>entry.id === item.itemId) || {name:item.itemId};
        map.set(key, {id:item.itemId, name:product.name, note:item.note || '', qty:0, total:0, key});
      }
      map.get(key).qty += 1;
    });
    return Array.from(map.values());
  };
  const context = {
    console, Promise, Map, Set, Date, Math, Number, String, Array, Object, JSON,
    localStorage: storage, document: {getElementById: () => null}, setTimeout, clearTimeout,
    BK_SYNC_ENABLED: false,
    BK_STATE: {getState: () => ({slots: [], active: 0, discountRate: 0})},
    BK_LOGIC: {groupedLines, parseItemKey:key=>JSON.parse(key)},
    BK_DATA: {BASE: products}
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(uiCode, context);

  const menuItems = (groupId, drinkId) => [
    {itemId:'hamburger', note:'', menuGroupId:groupId, menuName:'Hamburger Menu', menuRole:'main'},
    {itemId:'fries_standard', note:'menu for Hamburger', menuGroupId:groupId, menuName:'Hamburger Menu', menuRole:'fries'},
    {itemId:'x_sauce_ketchup', note:'menu for Hamburger', menuGroupId:groupId, menuName:'Hamburger Menu', menuRole:'sauce'},
    {itemId:drinkId, note:'menu for Hamburger', menuGroupId:groupId, menuName:'Hamburger Menu', menuRole:'drink'}
  ];
  const slot = {packMode:'shared', items:[...menuItems('menu-a','d_cola'), ...menuItems('menu-b','d_sprite')]};
  const plan = context.BK_UI.buildHandoverPlan(slot);
  assert.strictEqual(plan.menus.length, 2);
  assert.strictEqual(plan.menus[0].name, 'Hamburger Menu');
  assert.strictEqual(plan.menus[1].name, 'Hamburger Menu');
  assert.strictEqual(plan.menus.every(menu=>menu.items.some(item=>item.role === 'drink')), true);
  assert.strictEqual(plan.packaging.find(row=>row.kind === 'drink').qty, 1);
  assert.strictEqual(plan.packaging.some(row=>/Small Paper Bag/.test(row.name)), false);
  const html = context.BK_UI.handoverPlanHtml(plan);
  assert.strictEqual((html.match(/Large Paper Bag/g) || []).length, 2);
  assert.strictEqual((html.match(/2x Napkins/g) || []).length, 2);
  assert.ok(html.includes('MENU 1'));
  assert.ok(html.includes('MENU 2'));
  assert.ok(html.includes('Plastic Bag — drinks only'));
  assert.strictEqual((html.match(/data-handover-check/g) || []).length, 3, 'two menus plus one shared packaging card require only three confirmations');
  assert.ok(!html.includes('menu for Hamburger'));
  assert.ok(html.includes('1x Ketchup'));
  assert.ok(!/Extra Ketchup|Sauce Cup|Paper Cup|Burger Bun|Beef Patty/.test(html));

  const noSaucePlan = context.BK_UI.buildHandoverPlan({packMode:'shared', items:[
    {itemId:'hamburger', note:'', menuGroupId:'menu-no-sauce', menuName:'Hamburger Menu', menuRole:'main', menuNoSauce:true},
    {itemId:'fries_standard', note:'menu for Hamburger', menuGroupId:'menu-no-sauce', menuName:'Hamburger Menu', menuRole:'fries'},
    {itemId:'d_cola', note:'menu for Hamburger', menuGroupId:'menu-no-sauce', menuName:'Hamburger Menu', menuRole:'drink'}
  ]});
  assert.ok(context.BK_UI.handoverPlanHtml(noSaucePlan).includes('No sauce requested'));

  const singlePlan = context.BK_UI.buildHandoverPlan({packMode:'shared', items:[
    {itemId:'hamburger',note:''},{itemId:'hamburger',note:''},{itemId:'fries_standard',note:''}
  ]});
  assert.strictEqual(singlePlan.menus.length, 0);
  assert.strictEqual(singlePlan.packaging.find(row=>/Large Paper Bag/.test(row.name)).qty, 1);
  const crowdedPlan = context.BK_UI.buildHandoverPlan({packMode:'shared', items:[
    {itemId:'hamburger',note:''},{itemId:'hamburger',note:''},{itemId:'fries_standard',note:''},{itemId:'fries_standard',note:''}
  ]});
  assert.strictEqual(crowdedPlan.packaging.find(row=>/Large Paper Bag/.test(row.name)).qty, 2);
}

async function testMenuMetadataPersistence() {
  const saved = {bk_state_v5: JSON.stringify({v:5, active:0, discountRate:0, orderSeq:1, slots:[{
    name:'SN1', orderNo:'BK-20260612-00000001', items:[{itemId:'hamburger', note:'', menuGroupId:'menu-a', menuName:'Hamburger Menu', menuRole:'main', menuNoSauce:true}]
  }]})};
  const context = runState(createStorage(saved), {BK_SYNC_ENABLED:false});
  context.BK_STATE.load();
  await context.BK_STATE.whenReady();
  const item = context.BK_STATE.getState().slots[0].items[0];
  assert.strictEqual(item.menuGroupId, 'menu-a');
  assert.strictEqual(item.menuName, 'Hamburger Menu');
  assert.strictEqual(item.menuRole, 'main');
  assert.strictEqual(item.menuNoSauce, true);
}

async function testOnlineOrderMetadataAndConversion() {
  const context = runState(createStorage(), {BK_SYNC_ENABLED:false});
  context.BK_STATE.load();
  await context.BK_STATE.whenReady();
  await context.BK_STATE.addSlot('ONLINE', {orderSource:'bolt', externalOrderNo:'BOLT-123', pay:'bolt'});
  let slot = context.BK_STATE.getState().slots[0];
  assert.strictEqual(slot.orderSource, 'bolt');
  assert.strictEqual(slot.externalOrderNo, 'BOLT-123');
  assert.strictEqual(slot.pay, 'bolt');
  context.BK_STATE.updateSlot(0, {
    originalSource:'bolt', originalPay:'bolt', finalChannel:'direct', fulfilment:'burgerkiss-delivery',
    conversionReason:'Bolt rider did not pick up', refundStatus:'expected-pending', convertedAt:12345, pay:'cash'
  });
  slot = context.BK_STATE.getState().slots[0];
  assert.strictEqual(slot.pay, 'cash');
  assert.strictEqual(slot.originalSource, 'bolt');
  assert.strictEqual(slot.refundStatus, 'expected-pending');
  assert.strictEqual(slot.fulfilment, 'burgerkiss-delivery');
}

(async () => {
  await testPersistentLocalSequence();
  await testAtomicRemoteSequence();
  await testDuplicateRepair();
  testIssuedOrderHistoryRecovery();
  testInlineWorkflowProgression();
  testMenuGroupsRemainSeparate();
  testMenuHandoverPackagingPlan();
  await testMenuMetadataPersistence();
  await testOnlineOrderMetadataAndConversion();
  console.log('Order number and history regression tests passed.');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
