const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const shiftSource = fs.readFileSync(path.join(__dirname, '..', 'shift.js'), 'utf8');

function loadPlannerWithStore(){
  const store = {};
  global.localStorage = {
    getItem(key){ return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null; },
    setItem(key, value){ store[key] = String(value); },
    removeItem(key){ delete store[key]; }
  };
  global.BK_ACCESS = {
    STAFF: [
      { id:'asamoah', name:'Mr Asamoah', role:'owner', roleLabel:'Owner' },
      { id:'vera', name:'Vera', role:'supervisor', roleLabel:'Supervisor' },
      { id:'erica', name:'Erica', role:'employee', roleLabel:'Employee' }
    ],
    SHIFTS: {
      early: { id:'early', label:'Early shift', hours:'07:00–16:00' },
      late: { id:'late', label:'Late shift', hours:'15:00–00:00' }
    },
    actor(){ return { id:'vera', name:'Vera', role:'supervisor' }; }
  };
  delete require.cache[require.resolve('../shift_planner.js')];
  return { planner: require('../shift_planner.js'), store };
}

test('supervisors can draft schedule entries and off days replace shifts', () => {
  const { planner } = loadPlannerWithStore();
  const vera = { id:'vera', name:'Vera', role:'supervisor' };
  let result = planner.upsertEntry('2026-07', { date:'2026-07-03', staffId:'erica', shiftId:'early', workDayCredit:1, note:'opening' }, vera);
  assert.equal(result.ok, true);
  assert.equal(planner.plannedWorkDays('2026-07', 'erica'), 1);

  result = planner.upsertEntry('2026-07', { date:'2026-07-03', staffId:'erica', shiftId:'late', workDayCredit:1 }, vera);
  assert.equal(result.ok, true);
  assert.equal(planner.plannedWorkDays('2026-07', 'erica'), 2);

  result = planner.upsertEntry('2026-07', { date:'2026-07-03', staffId:'erica', shiftId:'off' }, vera);
  assert.equal(result.ok, true);
  assert.equal(planner.scheduleForMonth('2026-07').entries.length, 1);
  assert.equal(planner.plannedWorkDays('2026-07', 'erica'), 0);

  delete global.localStorage;
  delete global.BK_ACCESS;
});

test('employees cannot edit and only owners can approve schedules', () => {
  const { planner } = loadPlannerWithStore();
  const employee = { id:'erica', name:'Erica', role:'employee' };
  const owner = { id:'asamoah', name:'Mr Asamoah', role:'owner' };
  const supervisor = { id:'vera', name:'Vera', role:'supervisor' };

  assert.equal(planner.upsertEntry('2026-07', { date:'2026-07-04', staffId:'erica', shiftId:'early' }, employee).ok, false);
  assert.equal(planner.submitForApproval('2026-07', supervisor).ok, true);
  assert.equal(planner.approveSchedule('2026-07', supervisor).ok, false);
  const approved = planner.approveSchedule('2026-07', owner);
  assert.equal(approved.ok, true);
  assert.equal(approved.schedule.status, 'approved');

  delete global.localStorage;
  delete global.BK_ACCESS;
});

test('shift planner, absence and payroll lists render with DOM nodes', () => {
  assert.match(shiftSource, /function optionEl\(value, label\)/);
  assert.match(shiftSource, /plannerGrid\.replaceChildren/);
  assert.match(shiftSource, /absenceList\.replaceChildren/);
  assert.match(shiftSource, /payrollList\.replaceChildren/);
  assert.doesNotMatch(shiftSource, /plannerGrid'\)\.innerHTML|absenceList'\)\.innerHTML|payrollList'\)\.innerHTML|plannerStaff'\)\.innerHTML|advanceStaff'\)\.innerHTML/);
});
