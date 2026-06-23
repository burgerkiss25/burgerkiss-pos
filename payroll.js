// Fixed monthly payroll with salary advances and schedule-based day values.
(function(root){
  'use strict';

  const ADVANCES_KEY = 'bk_salary_advances_v1';
  const ROLES = { employee:1, supervisor:2, owner:3 };
  const DEFAULT_PROFILES = {
    erica:{ staffId:'erica', monthlySalary:1100, currency:'GHS', payModel:'fixed_monthly' },
    josephine:{ staffId:'josephine', monthlySalary:1300, currency:'GHS', payModel:'fixed_monthly' },
    vera:{ staffId:'vera', monthlySalary:1700, currency:'GHS', payModel:'fixed_monthly' }
  };

  function storageSafe(type){ try{ return root[type] || null; }catch(e){ return null; } }
  function localStorageSafe(){ return storageSafe('localStorage'); }
  function readJson(store, key){ if(!store) return null; try{ return JSON.parse(store.getItem(key) || 'null'); }catch(e){ return null; } }
  function writeJson(store, key, value){ if(!store) return false; try{ store.setItem(key, JSON.stringify(value)); return true; }catch(e){ return false; } }
  function actor(){ return root.BK_ACCESS && BK_ACCESS.actor ? BK_ACCESS.actor() : null; }
  function roleLevel(person){ return ROLES[person && person.role] || 0; }
  function canManagePayroll(person){ return roleLevel(person || actor()) >= ROLES.owner; }
  function canViewPayroll(staffId, person){ const viewer = person || actor(); return canManagePayroll(viewer) || (viewer && viewer.id === staffId); }
  function pad(n){ return String(n).padStart(2, '0'); }
  function monthValue(date){ const d = date ? new Date(date) : new Date(); return `${d.getFullYear()}-${pad(d.getMonth()+1)}`; }
  function roundMoney(value){ return Math.round((Number(value) || 0) * 100) / 100; }
  function cleanText(value, max){ return String(value || '').trim().slice(0, max || 180); }
  function validDate(value){ return /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')); }
  function profiles(){ return JSON.parse(JSON.stringify(DEFAULT_PROFILES)); }
  function profileFor(staffId){ return profiles()[staffId] || null; }
  function payrollRemotePath(){ return `${(root.BK_OPERATIONS_PATH || '/pos/operations').replace(/\/+$/,'')}/salaryAdvances`; }
  function saveRemoteAdvances(items){
    try{
      if(!(root.FIREBASE_CONFIG && root.firebase && root.firebase.database)) return Promise.resolve(false);
      const app = root.firebase.apps && root.firebase.apps.length ? root.firebase.app() : root.firebase.initializeApp(root.FIREBASE_CONFIG);
      const authReady = root.firebase.auth ? (root.firebase.auth(app).currentUser ? Promise.resolve(true) : root.firebase.auth(app).signInAnonymously().then(()=>true).catch(()=>false)) : Promise.resolve(true);
      return authReady.then(()=>root.firebase.database(app).ref(payrollRemotePath()).set({ items, ts:Date.now() })).then(()=>true).catch(error=>{ console.warn('payroll sync failed:', error && error.message); return false; });
    }catch(e){ return Promise.resolve(false); }
  }
  function sanitizeAdvance(raw){
    const amount = roundMoney(raw && raw.amount);
    const date = validDate(raw && raw.date) ? raw.date : `${monthValue()}-01`;
    return {
      id:cleanText(raw && raw.id, 140) || `advance_${Date.now()}`,
      staffId:cleanText(raw && raw.staffId, 60), amount, currency:'GHS', date,
      period:/^\d{4}-\d{2}$/.test(String(raw && raw.period || '')) ? raw.period : date.slice(0, 7),
      method:cleanText(raw && raw.method, 60), note:cleanText(raw && raw.note, 180),
      status:['active','voided'].includes(raw && raw.status) ? raw.status : 'active',
      staffConfirmed:!!(raw && (raw.staffConfirmed === true || raw.staffConfirmed === 'true' || raw.staffConfirmed === 'on')),
      approvedBy:raw && raw.approvedBy || null, createdAt:Number(raw && raw.createdAt) || Date.now(), voidedBy:raw && raw.voidedBy || null, voidedAt:Number(raw && raw.voidedAt) || 0
    };
  }
  function advances(){
    const raw = readJson(localStorageSafe(), ADVANCES_KEY);
    const src = Array.isArray(raw) ? raw : raw && Array.isArray(raw.items) ? raw.items : [];
    return src.map(sanitizeAdvance).filter(item=>item.staffId && item.amount > 0).slice(-500);
  }
  function writeAdvances(items){
    const clean = (items || []).map(sanitizeAdvance).filter(item=>item.staffId && item.amount > 0).slice(-500);
    writeJson(localStorageSafe(), ADVANCES_KEY, clean);
    saveRemoteAdvances(clean);
    return clean;
  }
  function recordAdvance(input, person){
    const approver = person || actor();
    if(!canManagePayroll(approver)) return { ok:false, message:'Owner access is required to record salary advances.' };
    const entry = sanitizeAdvance(Object.assign({}, input, { approvedBy:approver, createdAt:Date.now() }));
    if(!entry.staffId || entry.amount <= 0) return { ok:false, message:'Choose staff and enter a valid advance amount.' };
    return { ok:true, advance:entry, items:writeAdvances(advances().concat(entry)) };
  }
  function voidAdvance(id, person){
    const approver = person || actor();
    if(!canManagePayroll(approver)) return { ok:false, message:'Owner access is required to void salary advances.' };
    let found = false;
    const items = advances().map(item=>{
      if(item.id !== id) return item;
      found = true;
      return Object.assign({}, item, { status:'voided', voidedBy:approver, voidedAt:Date.now() });
    });
    if(!found) return { ok:false, message:'Salary advance not found.' };
    return { ok:true, items:writeAdvances(items) };
  }
  function advancesFor(staffId, month){ return advances().filter(item=>item.status === 'active' && item.staffId === staffId && item.period === month); }
  function scheduleEntries(month, staffId){
    if(!(root.BK_SHIFT_PLANNER && BK_SHIFT_PLANNER.scheduleForMonth)) return [];
    return BK_SHIFT_PLANNER.scheduleForMonth(month).entries.filter(entry=>entry.staffId === staffId && Number(entry.workDayCredit) > 0);
  }
  function plannedSummary(month, staffId){
    const entries = scheduleEntries(month, staffId);
    const dates = new Set(entries.map(entry=>entry.date));
    const credits = entries.reduce((sum, entry)=>sum + (Number(entry.workDayCredit) || 0), 0);
    return { plannedWorkDays:dates.size, plannedWorkCredits:roundMoney(credits), extraWorkDayCredits:roundMoney(Math.max(0, credits - dates.size)) };
  }
  function payrollFor(month, staffId, viewer){
    if(!canViewPayroll(staffId, viewer)) return null;
    const profile = profileFor(staffId);
    if(!profile) return null;
    const planned = plannedSummary(month, staffId);
    const dayValue = planned.plannedWorkDays > 0 ? roundMoney(profile.monthlySalary / planned.plannedWorkDays) : 0;
    const unpaidAbsenceDays = root.BK_ABSENCES && BK_ABSENCES.absenceDaysForStaff ? BK_ABSENCES.absenceDaysForStaff(month, staffId, false) : 0;
    const paidAbsenceDays = root.BK_ABSENCES && BK_ABSENCES.absenceDaysForStaff ? BK_ABSENCES.absenceDaysForStaff(month, staffId, true) : 0;
    const advanceItems = advancesFor(staffId, month);
    const advancesTotal = roundMoney(advanceItems.reduce((sum, item)=>sum + item.amount, 0));
    const absenceDeduction = roundMoney(unpaidAbsenceDays * dayValue);
    const extraPay = roundMoney(planned.extraWorkDayCredits * dayValue);
    const grossPay = roundMoney(profile.monthlySalary - absenceDeduction + extraPay);
    return Object.assign({}, profile, planned, { month, dayValue, unpaidAbsenceDays, paidAbsenceDays, absenceDeduction, extraPay, advancesTotal, netPay:roundMoney(grossPay - advancesTotal), grossPay, advances:advanceItems });
  }
  function payrollRows(month, viewer){
    const visibleStaff = Object.keys(DEFAULT_PROFILES).filter(staffId=>canViewPayroll(staffId, viewer || actor()));
    return visibleStaff.map(staffId=>payrollFor(month, staffId, viewer || actor())).filter(Boolean);
  }

  const api = { DEFAULT_PROFILES, monthValue, roundMoney, profiles, profileFor, advances, writeAdvances, recordAdvance, voidAdvance, advancesFor, plannedSummary, payrollFor, payrollRows, canManagePayroll, canViewPayroll };
  root.BK_PAYROLL = api;
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
