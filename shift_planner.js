// Monthly shift planner with supervisor drafting and owner approval.
(function(root){
  'use strict';

  const KEY = 'bk_shift_plans_v1';
  const ROLES = { employee:1, supervisor:2, owner:3 };

  function storageSafe(type){ try{ return root[type] || null; }catch(e){ return null; } }
  function localStorageSafe(){ return storageSafe('localStorage'); }
  function readJson(store, key){ if(!store) return null; try{ return JSON.parse(store.getItem(key) || 'null'); }catch(e){ return null; } }
  function writeJson(store, key, value){ if(!store) return false; try{ store.setItem(key, JSON.stringify(value)); return true; }catch(e){ return false; } }
  function actor(){ return root.BK_ACCESS && BK_ACCESS.actor ? BK_ACCESS.actor() : null; }
  function staff(){ return root.BK_ACCESS && Array.isArray(BK_ACCESS.STAFF) ? BK_ACCESS.STAFF : []; }
  function shifts(){ return root.BK_ACCESS && BK_ACCESS.SHIFTS ? BK_ACCESS.SHIFTS : {}; }
  function roleLevel(person){ return ROLES[person && person.role] || 0; }
  function canManageSchedule(person){ return roleLevel(person || actor()) >= ROLES.supervisor; }
  function canApproveSchedule(person){ return roleLevel(person || actor()) >= ROLES.owner; }
  function pad(n){ return String(n).padStart(2, '0'); }
  function monthValue(date){ const d = date ? new Date(date) : new Date(); return `${d.getFullYear()}-${pad(d.getMonth()+1)}`; }
  function daysInMonth(month){
    const m = /^([0-9]{4})-([0-9]{2})$/.exec(String(month || ''));
    if(!m) return [];
    const year = Number(m[1]);
    const index = Number(m[2]) - 1;
    const count = new Date(year, index + 1, 0).getDate();
    return Array.from({length:count}, (_, i)=>`${year}-${pad(index + 1)}-${pad(i + 1)}`);
  }
  function scheduleId(month){ return `schedule_${String(month || '').replace(/[^0-9-]/g, '')}`; }
  function scheduleRemotePath(month){ return `${(root.BK_OPERATIONS_PATH || '/pos/operations').replace(/\/+$/,'')}/shiftPlans/${month}`; }
  function saveRemoteSchedule(schedule){
    try{
      if(!(root.FIREBASE_CONFIG && root.firebase && root.firebase.database)) return Promise.resolve(false);
      const app = root.firebase.apps && root.firebase.apps.length ? root.firebase.app() : root.firebase.initializeApp(root.FIREBASE_CONFIG);
      const authReady = root.firebase.auth ? (root.firebase.auth(app).currentUser ? Promise.resolve(true) : root.firebase.auth(app).signInAnonymously().then(()=>true).catch(()=>false)) : Promise.resolve(true);
      return authReady.then(()=>root.firebase.database(app).ref(scheduleRemotePath(schedule.month)).set(schedule)).then(()=>true).catch(error=>{ console.warn('shift plan sync failed:', error && error.message); return false; });
    }catch(e){ return Promise.resolve(false); }
  }
  function allSchedules(){ const raw = readJson(localStorageSafe(), KEY); return raw && typeof raw === 'object' ? raw : {}; }
  function writeSchedules(map){ writeJson(localStorageSafe(), KEY, map || {}); return map || {}; }
  function cleanText(value, max){ return String(value || '').trim().slice(0, max || 160); }
  function normalizeMonth(value){ return /^\d{4}-\d{2}$/.test(String(value || '')) ? String(value) : monthValue(); }
  function emptySchedule(month, creator){
    return { id:scheduleId(month), month, status:'draft', entries:[], history:[{ action:'create', by:creator || null, at:Date.now(), note:'Schedule draft created' }], createdBy:creator || null, createdAt:Date.now(), updatedAt:Date.now(), approvedBy:null, approvedAt:null };
  }
  function scheduleForMonth(month){
    const key = normalizeMonth(month);
    const found = allSchedules()[key];
    if(found && found.month === key && Array.isArray(found.entries)) return sanitizeSchedule(found);
    return emptySchedule(key, null);
  }
  function sanitizeEntry(raw){
    const validShifts = Object.assign({ off:{ id:'off', label:'Off' } }, shifts());
    const date = String(raw && raw.date || '');
    const staffId = cleanText(raw && raw.staffId, 60);
    const shiftId = validShifts[raw && raw.shiftId] ? raw.shiftId : 'off';
    const workDayCredit = shiftId === 'off' ? 0 : Math.max(0, Number(raw && raw.workDayCredit) || 1);
    return { id:cleanText(raw && raw.id, 140) || `${date}_${staffId}_${shiftId}`, date, staffId, shiftId, workDayCredit, note:cleanText(raw && raw.note, 160), updatedBy:raw && raw.updatedBy || null, updatedAt:Number(raw && raw.updatedAt) || Date.now() };
  }
  function sanitizeSchedule(raw){
    const month = normalizeMonth(raw && raw.month);
    return Object.assign(emptySchedule(month, null), raw || {}, {
      id:scheduleId(month), month,
      status:['draft','pending_approval','approved','active','locked'].includes(raw && raw.status) ? raw.status : 'draft',
      entries:(Array.isArray(raw && raw.entries) ? raw.entries : []).map(sanitizeEntry).filter(entry=>entry.date.startsWith(month) && entry.staffId),
      history:Array.isArray(raw && raw.history) ? raw.history.slice(-200) : []
    });
  }
  function saveSchedule(schedule){
    const clean = sanitizeSchedule(schedule);
    const map = allSchedules();
    map[clean.month] = clean;
    writeSchedules(map);
    saveRemoteSchedule(clean);
    return clean;
  }
  function upsertEntry(month, input, person){
    const editor = person || actor();
    if(!canManageSchedule(editor)) return { ok:false, message:'Supervisor or owner access is required to edit the schedule.' };
    const schedule = scheduleForMonth(month);
    if(schedule.status === 'locked') return { ok:false, message:'This schedule is locked.' };
    const entry = sanitizeEntry(Object.assign({}, input, { updatedBy:editor, updatedAt:Date.now() }));
    if(!entry.date.startsWith(schedule.month)) return { ok:false, message:'Choose a date inside the selected month.' };
    const before = schedule.entries.slice();
    let entries = before.filter(item=>!(item.date === entry.date && item.staffId === entry.staffId && (entry.shiftId === 'off' || item.shiftId === 'off' || item.shiftId === entry.shiftId)));
    entries.push(entry);
    entries.sort((a,b)=>a.date.localeCompare(b.date) || a.staffId.localeCompare(b.staffId) || a.shiftId.localeCompare(b.shiftId));
    schedule.entries = entries;
    schedule.updatedAt = Date.now();
    schedule.updatedBy = editor;
    schedule.history = (schedule.history || []).concat({ action:'upsert_entry', by:editor, at:Date.now(), date:entry.date, staffId:entry.staffId, shiftId:entry.shiftId, note:entry.note }).slice(-200);
    return { ok:true, schedule:saveSchedule(schedule), entry };
  }
  function removeEntry(month, entryId, person){
    const editor = person || actor();
    if(!canManageSchedule(editor)) return { ok:false, message:'Supervisor or owner access is required to edit the schedule.' };
    const schedule = scheduleForMonth(month);
    schedule.entries = schedule.entries.filter(entry=>entry.id !== entryId);
    schedule.updatedAt = Date.now();
    schedule.history = (schedule.history || []).concat({ action:'remove_entry', by:editor, at:Date.now(), entryId }).slice(-200);
    return { ok:true, schedule:saveSchedule(schedule) };
  }
  function submitForApproval(month, person){
    const editor = person || actor();
    if(!canManageSchedule(editor)) return { ok:false, message:'Supervisor or owner access is required to submit the schedule.' };
    const schedule = scheduleForMonth(month);
    schedule.status = 'pending_approval';
    schedule.updatedAt = Date.now();
    schedule.submittedBy = editor;
    schedule.submittedAt = Date.now();
    schedule.history = (schedule.history || []).concat({ action:'submit_for_approval', by:editor, at:Date.now() }).slice(-200);
    return { ok:true, schedule:saveSchedule(schedule) };
  }
  function approveSchedule(month, person){
    const approver = person || actor();
    if(!canApproveSchedule(approver)) return { ok:false, message:'Owner access is required to approve the schedule.' };
    const schedule = scheduleForMonth(month);
    schedule.status = 'approved';
    schedule.approvedBy = approver;
    schedule.approvedAt = Date.now();
    schedule.updatedAt = Date.now();
    schedule.history = (schedule.history || []).concat({ action:'approve', by:approver, at:Date.now() }).slice(-200);
    return { ok:true, schedule:saveSchedule(schedule) };
  }
  function entriesForStaff(month, staffId){ return scheduleForMonth(month).entries.filter(entry=>entry.staffId === staffId); }
  function plannedWorkDays(month, staffId){ return entriesForStaff(month, staffId).reduce((sum, entry)=>sum + (Number(entry.workDayCredit) || 0), 0); }

  const api = { monthValue, daysInMonth, scheduleForMonth, saveSchedule, upsertEntry, removeEntry, submitForApproval, approveSchedule, entriesForStaff, plannedWorkDays, canManageSchedule, canApproveSchedule };
  root.BK_SHIFT_PLANNER = api;
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
