const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const stateCode = fs.readFileSync(path.join(root, 'state.js'), 'utf8');
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
    terminalA.BK_STATE.allocateOrderNo()
  ]);
  assert.strictEqual(new Set(numbers).size, 3);
  assert.strictEqual(numbers.map(number => number.slice(-8)).sort().join(','), '00000001,00000002,00000003');
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
  const elements = {
    historyBody: {innerHTML: ''},
    modalHistory: {classList: {add() {}, remove() {}}},
    hSearch: {value: ''}
  };
  const slot = {
    name: 'SN1', orderNo: 'BK-20260611-00000042',
    items: [{itemId: 'burger', note: '', done: true}],
    pay: 'cash', issued: true, createdAt: 1000
  };
  const context = {
    console, Promise, Map, Set, Date, Math, Number, String, Array, Object, JSON,
    localStorage: storage,
    document: {getElementById: id => elements[id] || null},
    setTimeout, clearTimeout,
    BK_SYNC_ENABLED: false,
    BK_STATE: {getState: () => ({slots: [slot], active: 0, discountRate: 0})},
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
  assert.ok(elements.historyBody.innerHTML.includes(slot.orderNo));
}

(async () => {
  await testPersistentLocalSequence();
  await testAtomicRemoteSequence();
  await testDuplicateRepair();
  testIssuedOrderHistoryRecovery();
  console.log('Order number and history regression tests passed.');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
