const assert = require('node:assert/strict');
const test = require('node:test');

function loadAbsencesWithStore(){
  const store = {};
  global.localStorage = {
    getItem(key){ return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null; },
    setItem(key, value){ store[key] = String(value); },
    removeItem(key){ delete store[key]; }
  };
  global.BK_ACCESS = { actor(){ return { id:'vera', name:'Vera', role:'supervisor' }; } };
  delete require.cache[require.resolve('../absences.js')];
  return { absences: require('../absences.js'), store };
}

test('supervisors can record paid and unpaid staff absences across a date range', () => {
  const { absences } = loadAbsencesWithStore();
  const result = absences.upsertAbsence({ staffId:'erica', type:'sick', fromDate:'2026-07-02', toDate:'2026-07-04', paid:'false', note:'called in' }, { id:'vera', role:'supervisor' });
  assert.equal(result.ok, true);
  assert.equal(result.absence.typeLabel, 'Sick');
  assert.equal(result.absence.paid, false);
  assert.equal(absences.dateRange('2026-07-02', '2026-07-04').length, 3);
  assert.equal(absences.staffAbsentOn('erica', '2026-07-03').id, result.absence.id);
  assert.equal(absences.absenceDaysForStaff('2026-07', 'erica', false), 3);

  delete global.localStorage;
  delete global.BK_ACCESS;
});

test('employees cannot edit absences and cancelled absences no longer count', () => {
  const { absences } = loadAbsencesWithStore();
  const employee = { id:'erica', role:'employee' };
  const supervisor = { id:'vera', role:'supervisor' };
  assert.equal(absences.upsertAbsence({ staffId:'erica', type:'vacation', fromDate:'2026-07-05', toDate:'2026-07-05', paid:'true' }, employee).ok, false);
  const saved = absences.upsertAbsence({ staffId:'erica', type:'vacation', fromDate:'2026-07-05', toDate:'2026-07-05', paid:'true' }, supervisor);
  assert.equal(saved.ok, true);
  assert.equal(absences.absenceDaysForStaff('2026-07', 'erica', true), 1);
  assert.equal(absences.cancelAbsence(saved.absence.id, supervisor).ok, true);
  assert.equal(absences.staffAbsentOn('erica', '2026-07-05'), null);
  assert.equal(absences.absenceDaysForStaff('2026-07', 'erica', true), 0);

  delete global.localStorage;
  delete global.BK_ACCESS;
});
