const assert = require('node:assert/strict');
const test = require('node:test');

function loadPayrollWithStore(){
  const store = {};
  global.localStorage = {
    getItem(key){ return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null; },
    setItem(key, value){ store[key] = String(value); },
    removeItem(key){ delete store[key]; }
  };
  global.BK_ACCESS = { actor(){ return { id:'asamoah', name:'Mr Asamoah', role:'owner' }; } };
  global.BK_SHIFT_PLANNER = {
    scheduleForMonth(){
      return { entries:[
        { staffId:'erica', date:'2026-07-01', workDayCredit:1 },
        { staffId:'erica', date:'2026-07-02', workDayCredit:1 },
        { staffId:'erica', date:'2026-07-03', workDayCredit:1 },
        { staffId:'erica', date:'2026-07-03', workDayCredit:1 }
      ] };
    }
  };
  global.BK_ABSENCES = { absenceDaysForStaff(month, staffId, paid){ return month === '2026-07' && staffId === 'erica' && paid === false ? 1 : 0; } };
  delete require.cache[require.resolve('../payroll.js')];
  return { payroll: require('../payroll.js'), store };
}

test('fixed monthly payroll uses planned days for day value and double-shift extras', () => {
  const { payroll } = loadPayrollWithStore();
  const row = payroll.payrollFor('2026-07', 'erica', { id:'asamoah', role:'owner' });
  assert.equal(row.monthlySalary, 1100);
  assert.equal(row.plannedWorkDays, 3);
  assert.equal(row.plannedWorkCredits, 4);
  assert.equal(row.extraWorkDayCredits, 1);
  assert.equal(row.dayValue, 366.67);
  assert.equal(row.absenceDeduction, 366.67);
  assert.equal(row.extraPay, 366.67);
  assert.equal(row.netPay, 1100);

  delete global.localStorage;
  delete global.BK_ACCESS;
  delete global.BK_SHIFT_PLANNER;
  delete global.BK_ABSENCES;
});

test('owner-recorded salary advances reduce net pay and employees can only view themselves', () => {
  const { payroll } = loadPayrollWithStore();
  assert.equal(payroll.recordAdvance({ staffId:'erica', date:'2026-07-10', amount:300, method:'Cash', staffConfirmed:'true' }, { id:'vera', role:'supervisor' }).ok, false);
  const saved = payroll.recordAdvance({ staffId:'erica', date:'2026-07-10', amount:300, method:'Cash', staffConfirmed:'true' }, { id:'asamoah', role:'owner' });
  assert.equal(saved.ok, true);
  assert.equal(saved.advance.period, '2026-07');
  assert.equal(saved.advance.staffConfirmed, true);
  assert.equal(payroll.payrollFor('2026-07', 'erica', { id:'erica', role:'employee' }).netPay, 800);
  assert.equal(payroll.payrollFor('2026-07', 'vera', { id:'erica', role:'employee' }), null);
  assert.equal(payroll.voidAdvance(saved.advance.id, { id:'asamoah', role:'owner' }).ok, true);
  assert.equal(payroll.payrollFor('2026-07', 'erica', { id:'asamoah', role:'owner' }).advancesTotal, 0);

  delete global.localStorage;
  delete global.BK_ACCESS;
  delete global.BK_SHIFT_PLANNER;
  delete global.BK_ABSENCES;
});
