const assert = require('node:assert/strict');
const test = require('node:test');

const access = require('../access.js');

function at(hour, minute = 0, day = 13){
  return new Date(2026, 5, day, hour, minute, 0, 0);
}

test('sales are open every day from 08:00 through 23:59', () => {
  assert.equal(access.salesStatus(at(7, 59)).open, false);
  assert.equal(access.salesStatus(at(8, 0)).open, true);
  assert.equal(access.salesStatus(at(23, 59)).open, true);
  assert.equal(access.salesStatus(at(0, 0, 14)).open, false);
});

test('shift suggestion changes to late shift at 15:00', () => {
  assert.equal(access.suggestedShift(at(14, 59)), 'early');
  assert.equal(access.suggestedShift(at(15, 0)), 'late');
});

test('after-midnight closeout remains assigned to previous business date', () => {
  assert.equal(access.businessDate(at(0, 15, 14)), '2026-06-13');
  assert.equal(access.businessDate(at(8, 0, 14)), '2026-06-14');
});


test('owner and supervisor roles expose remote-capable identities', () => {
  const owner = access.STAFF.find(person=>person.id === 'asamoah');
  const supervisor = access.STAFF.find(person=>person.id === 'vera');
  assert.equal(owner.role, 'owner');
  assert.equal(supervisor.role, 'supervisor');
  assert.equal(access.STAFF.filter(person=>person.role === 'employee').length, 2);
});


test('all staff can open the daily closeout report', () => {
  for (const person of access.STAFF) {
    global.sessionStorage = { getItem(){ return JSON.stringify({ staffId: person.id, shiftId: 'early', businessDate: '2026-06-16', signedInAt: 1 }); }, setItem(){}, removeItem(){} };
    delete require.cache[require.resolve('../access.js')];
    const freshAccess = require('../access.js');
    assert.equal(freshAccess.can('daily_report'), true, `${person.name} should access daily report`);
  }
  delete global.sessionStorage;
  delete require.cache[require.resolve('../access.js')];
});

test('operational worklogs record shift electricity start and close readings', () => {
  const store = {};
  global.localStorage = {
    getItem(key){ return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null; },
    setItem(key, value){ store[key] = String(value); },
    removeItem(key){ delete store[key]; }
  };
  delete require.cache[require.resolve('../access.js')];
  const freshAccess = require('../access.js');
  const originalNow = Date.now;
  Date.now = () => 1000000;
  const worklog = freshAccess.startWorklog({
    staffId:'erica', name:'Erica', role:'employee', mode:'operational',
    shiftId:'early', shiftLabel:'Early shift', businessDate:'2026-06-23', signedInAt:940000
  }, '128,50', 'Opening reading');
  assert.equal(worklog.electricityStartCreditGhs, 128.5);
  assert.equal(freshAccess.getWorklogs().length, 1);

  Date.now = () => 4600000;
  const closed = freshAccess.closeWorklog(worklog.id, '94.20', 'Closing reading');
  assert.equal(closed.status, 'closed');
  assert.equal(closed.durationMinutes, 61);
  assert.equal(closed.electricityEndCreditGhs, 94.2);
  assert.equal(closed.electricityUsageGhs, 34.3);
  assert.equal(freshAccess.electricityStatus().creditGhs, 94.2);

  Date.now = originalNow;
  delete global.localStorage;
  delete require.cache[require.resolve('../access.js')];
});

test('electricity credit validation accepts positive decimal readings only', () => {
  assert.equal(access.normalizeElectricityCredit('12,34'), 12.34);
  assert.equal(access.normalizeElectricityCredit('0'), 0);
  assert.equal(access.normalizeElectricityCredit('-1'), null);
  assert.equal(access.normalizeElectricityCredit('not a number'), null);
});
