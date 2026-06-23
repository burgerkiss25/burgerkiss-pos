// Staff absence list with paid/unpaid payroll flags.
(function(root){
  'use strict';

  const KEY = 'bk_staff_absences_v1';
  const ROLES = { employee:1, supervisor:2, owner:3 };
  const TYPES = {
    sick:'Sick', vacation:'Vacation', day_off:'Day off', emergency:'Emergency', no_show:'No show', other:'Other'
  };

  function storageSafe(type){ try{ return root[type] || null; }catch(e){ return null; } }
  function localStorageSafe(){ return storageSafe('localStorage'); }
  function readJson(store, key){ if(!store) return null; try{ return JSON.parse(store.getItem(key) || 'null'); }catch(e){ return null; } }
  function writeJson(store, key, value){ if(!store) return false; try{ store.setItem(key, JSON.stringify(value)); return true; }catch(e){ return false; } }
  function actor(){ return root.BK_ACCESS && BK_ACCESS.actor ? BK_ACCESS.actor() : null; }
  function roleLevel(person){ return ROLES[person && person.role] || 0; }
  function canManageAbsences(person){ return roleLevel(person || actor()) >= ROLES.supervisor; }
  function pad(n){ return String(n).padStart(2, '0'); }
  function monthValue(date){ const d = date ? new Date(date) : new Date(); return `${d.getFullYear()}-${pad(d.getMonth()+1)}`; }
  function cleanText(value, max){ return String(value || '').trim().slice(0, max || 180); }
  function validDate(value){ return /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')); }
  function dateRange(fromDate, toDate){
    if(!validDate(fromDate) || !validDate(toDate)) return [];
    const out = [];
    const cursor = new Date(`${fromDate}T12:00:00`);
    const end = new Date(`${toDate}T12:00:00`);
    if(cursor > end) return [];
    while(cursor <= end){ out.push(`${cursor.getFullYear()}-${pad(cursor.getMonth()+1)}-${pad(cursor.getDate())}`); cursor.setDate(cursor.getDate() + 1); }
    return out;
  }
  function absenceRemotePath(){ return `${(root.BK_OPERATIONS_PATH || '/pos/operations').replace(/\/+$/,'')}/absences`; }
  function saveRemoteAbsences(items){
    try{
      if(!(root.FIREBASE_CONFIG && root.firebase && root.firebase.database)) return Promise.resolve(false);
      const app = root.firebase.apps && root.firebase.apps.length ? root.firebase.app() : root.firebase.initializeApp(root.FIREBASE_CONFIG);
      const authReady = root.firebase.auth ? (root.firebase.auth(app).currentUser ? Promise.resolve(true) : root.firebase.auth(app).signInAnonymously().then(()=>true).catch(()=>false)) : Promise.resolve(true);
      return authReady.then(()=>root.firebase.database(app).ref(absenceRemotePath()).set({ items, ts:Date.now() })).then(()=>true).catch(error=>{ console.warn('absence sync failed:', error && error.message); return false; });
    }catch(e){ return Promise.resolve(false); }
  }
  function sanitizeAbsence(raw){
    const fromDate = validDate(raw && raw.fromDate) ? raw.fromDate : '';
    const toDate = validDate(raw && raw.toDate) ? raw.toDate : fromDate;
    const normalizedTo = toDate && fromDate && toDate < fromDate ? fromDate : toDate;
    const type = TYPES[raw && raw.type] ? raw.type : 'other';
    return {
      id:cleanText(raw && raw.id, 140) || `absence_${Date.now()}`,
      staffId:cleanText(raw && raw.staffId, 60), type, typeLabel:TYPES[type],
      fromDate, toDate:normalizedTo, paid:!!(raw && (raw.paid === true || raw.paid === 'true' || raw.paid === 'on')),
      status:['active','cancelled'].includes(raw && raw.status) ? raw.status : 'active',
      note:cleanText(raw && raw.note, 180), createdBy:raw && raw.createdBy || null,
      createdAt:Number(raw && raw.createdAt) || Date.now(), updatedBy:raw && raw.updatedBy || null, updatedAt:Number(raw && raw.updatedAt) || Date.now()
    };
  }
  function allAbsences(){
    const raw = readJson(localStorageSafe(), KEY);
    const src = Array.isArray(raw) ? raw : raw && Array.isArray(raw.items) ? raw.items : [];
    return src.map(sanitizeAbsence).filter(item=>item.staffId && item.fromDate && item.toDate).slice(-500);
  }
  function writeAbsences(items){
    const clean = (items || []).map(sanitizeAbsence).filter(item=>item.staffId && item.fromDate && item.toDate).slice(-500);
    writeJson(localStorageSafe(), KEY, clean);
    saveRemoteAbsences(clean);
    return clean;
  }
  function upsertAbsence(input, person){
    const editor = person || actor();
    if(!canManageAbsences(editor)) return { ok:false, message:'Supervisor or owner access is required to edit absences.' };
    const entry = sanitizeAbsence(Object.assign({}, input, { updatedBy:editor, updatedAt:Date.now(), createdBy:(input && input.createdBy) || editor }));
    if(!entry.staffId || !entry.fromDate || !entry.toDate) return { ok:false, message:'Choose staff and a valid absence date range.' };
    const items = allAbsences().filter(item=>item.id !== entry.id).concat(entry).sort((a,b)=>a.fromDate.localeCompare(b.fromDate) || a.staffId.localeCompare(b.staffId));
    return { ok:true, absence:entry, items:writeAbsences(items) };
  }
  function cancelAbsence(id, person){
    const editor = person || actor();
    if(!canManageAbsences(editor)) return { ok:false, message:'Supervisor or owner access is required to cancel absences.' };
    let found = false;
    const items = allAbsences().map(item=>{
      if(item.id !== id) return item;
      found = true;
      return Object.assign({}, item, { status:'cancelled', updatedBy:editor, updatedAt:Date.now() });
    });
    if(!found) return { ok:false, message:'Absence not found.' };
    return { ok:true, items:writeAbsences(items) };
  }
  function absencesForDate(date){ return allAbsences().filter(item=>item.status === 'active' && dateRange(item.fromDate, item.toDate).includes(date)); }
  function staffAbsentOn(staffId, date){ return absencesForDate(date).find(item=>item.staffId === staffId) || null; }
  function absencesForMonth(month){ return allAbsences().filter(item=>item.status === 'active' && dateRange(item.fromDate, item.toDate).some(date=>date.startsWith(month))); }
  function absenceDaysForStaff(month, staffId, paid){
    const days = new Set();
    absencesForMonth(month).filter(item=>item.staffId === staffId && item.paid === paid).forEach(item=>dateRange(item.fromDate, item.toDate).filter(date=>date.startsWith(month)).forEach(date=>days.add(date)));
    return days.size;
  }

  const api = { TYPES, monthValue, dateRange, allAbsences, writeAbsences, upsertAbsence, cancelAbsence, absencesForDate, absencesForMonth, staffAbsentOn, absenceDaysForStaff, canManageAbsences };
  root.BK_ABSENCES = api;
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
