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
