// Local staff access, shift selection and operating-hours guard.
(function(root){
  'use strict';

  const CONFIG_KEY = 'bk_staff_access_v1';
  const SESSION_KEY = 'bk_staff_session_v1';
  const WORKLOG_KEY = 'bk_staff_worklogs_v1';
  const ELECTRICITY_TOPUPS_KEY = 'bk_electricity_topups_v1';
  const ELECTRICITY_LOW_CREDIT_GHS = 50;
  const ELECTRICITY_CRITICAL_CREDIT_GHS = 20;
  const ROLE_LEVEL = { employee: 1, supervisor: 2, owner: 3 };
  const STAFF = [
    { id:'asamoah', name:'Mr Asamoah', role:'owner', roleLabel:'Owner' },
    { id:'vera', name:'Vera', role:'supervisor', roleLabel:'Supervisor' },
    { id:'josephine', name:'Josephine', role:'employee', roleLabel:'Employee' },
    { id:'erica', name:'Erica', role:'employee', roleLabel:'Employee' }
  ];
  const SHIFTS = {
    early: { id:'early', label:'Early shift', hours:'07:00–16:00' },
    late: { id:'late', label:'Late shift', hours:'15:00–00:00' }
  };
  let session = normalizeSession(readJson(sessionStorageSafe(), SESSION_KEY));

  function storageSafe(type){
    try{ return root[type] || null; }catch(e){ return null; }
  }
  function localStorageSafe(){ return storageSafe('localStorage'); }
  function sessionStorageSafe(){ return storageSafe('sessionStorage'); }
  function readJson(store, key){
    if(!store) return null;
    try{ return JSON.parse(store.getItem(key) || 'null'); }catch(e){ return null; }
  }
  function writeJson(store, key, value){
    if(!store) return false;
    try{ store.setItem(key, JSON.stringify(value)); return true; }catch(e){ return false; }
  }
  function remoteAccessRef(){
    try{
      if(!(root.FIREBASE_CONFIG && root.firebase && root.firebase.database)) return null;
      const app = root.firebase.apps && root.firebase.apps.length ? root.firebase.app() : root.firebase.initializeApp(root.FIREBASE_CONFIG);
      return root.firebase.database(app).ref((root.BK_ACCESS_PATH || '/pos/access/staffPins').replace(/\/+$/,''));
    }catch(e){ return null; }
  }
  function ensureRemoteAuth(){
    try{
      if(!(root.FIREBASE_CONFIG && root.firebase && root.firebase.auth)) return Promise.resolve(false);
      const app = root.firebase.apps && root.firebase.apps.length ? root.firebase.app() : root.firebase.initializeApp(root.FIREBASE_CONFIG);
      const auth = root.firebase.auth(app);
      return auth.currentUser ? Promise.resolve(true) : auth.signInAnonymously().then(()=>true).catch(()=>false);
    }catch(e){ return Promise.resolve(false); }
  }
  function loadRemoteConfig(){
    const ref = remoteAccessRef();
    if(!ref) return Promise.resolve(false);
    return ensureRemoteAuth().then(()=>ref.get()).then(snapshot=>{
      const config = snapshot.val();
      if(!(config && config.version === 1 && config.pins)) return false;
      writeJson(localStorageSafe(), CONFIG_KEY, config);
      return true;
    }).catch(()=>false);
  }
  function saveRemoteConfig(config){
    const ref = remoteAccessRef();
    if(!ref) return Promise.resolve(false);
    return ensureRemoteAuth().then(()=>ref.set(config)).then(()=>true).catch(error=>{ console.warn('staff access sync failed:', error && error.message); return false; });
  }
  function remoteOpsPath(path){
    return `${(root.BK_OPERATIONS_PATH || '/pos/operations').replace(/\/+$/,'')}/${path}`;
  }
  function saveRemoteOps(path, value){
    try{
      if(!(root.FIREBASE_CONFIG && root.firebase && root.firebase.database)) return Promise.resolve(false);
      const app = root.firebase.apps && root.firebase.apps.length ? root.firebase.app() : root.firebase.initializeApp(root.FIREBASE_CONFIG);
      return ensureRemoteAuth().then(()=>root.firebase.database(app).ref(remoteOpsPath(path)).set(value)).then(()=>true).catch(error=>{ console.warn('operations sync failed:', error && error.message); return false; });
    }catch(e){ return Promise.resolve(false); }
  }
  function minutes(date){ return date.getHours() * 60 + date.getMinutes(); }
  function suggestedShift(date){ return minutes(date || new Date()) >= 15 * 60 ? 'late' : 'early'; }
  function salesStatus(date){
    const now = date || new Date();
    const value = minutes(now);
    const open = value >= 8 * 60 && value <= (23 * 60 + 59);
    if(open) return { open:true, state:'open', label:'Sales open', detail:'08:00–23:59' };
    if(value < 8 * 60) return { open:false, state:'preparation', label:'Preparation time', detail:'Sales start at 08:00' };
    return { open:false, state:'closed', label:'Sales closed', detail:'New sales start at 08:00' };
  }
  function businessDate(date){
    const d = new Date(date || Date.now());
    if(minutes(d) < 8 * 60) d.setDate(d.getDate() - 1);
    const pad = n=>String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  }
  function staffById(id){ return STAFF.find(person=>person.id === id) || null; }
  function normalizeSession(raw){
    const person = staffById(raw && raw.staffId);
    const mode = raw && raw.mode === 'remote' && person && person.role !== 'employee' ? 'remote' : 'operational';
    const shift = mode === 'operational' ? SHIFTS[raw && raw.shiftId] : null;
    if(!person || (mode === 'operational' && !shift)) return null;
    return {
      staffId:person.id, name:person.name, role:person.role, roleLabel:person.roleLabel, mode,
      shiftId:shift ? shift.id : '', shiftLabel:shift ? shift.label : 'Remote support', shiftHours:shift ? shift.hours : 'No shift',
      businessDate:String(raw.businessDate || businessDate()), signedInAt:Number(raw.signedInAt) || Date.now(),
      worklogId:String(raw.worklogId || '')
    };
  }
  function actor(){
    if(!session) return null;
    return { id:session.staffId, name:session.name, role:session.role, mode:session.mode, shiftId:session.shiftId, businessDate:session.businessDate };
  }
  function operationalActor(){ return session && session.mode === 'operational' ? actor() : null; }
  function canOperate(){ return !!(session && session.mode === 'operational'); }
  function configured(){
    const config = readJson(localStorageSafe(), CONFIG_KEY);
    return !!(config && config.version === 1 && config.pins && STAFF.every(person=>config.pins[person.id]));
  }
  function randomHex(bytes){
    const values = new Uint8Array(bytes);
    root.crypto.getRandomValues(values);
    return Array.from(values, value=>value.toString(16).padStart(2, '0')).join('');
  }
  function hexBytes(hex){
    const out = new Uint8Array(hex.length / 2);
    for(let i=0;i<out.length;i++) out[i] = parseInt(hex.slice(i*2, i*2+2), 16);
    return out;
  }
  async function hashPin(pin, salt){
    if(!(root.crypto && root.crypto.subtle)) throw new Error('Secure PIN storage is not supported by this browser.');
    const material = await root.crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
    const bits = await root.crypto.subtle.deriveBits({name:'PBKDF2', salt:hexBytes(salt), iterations:120000, hash:'SHA-256'}, material, 256);
    return Array.from(new Uint8Array(bits), value=>value.toString(16).padStart(2, '0')).join('');
  }
  function validPin(pin){ return /^\d{4,6}$/.test(String(pin || '')) && !/^([0-9])\1+$/.test(pin) && pin !== '1234'; }
  async function saveInitialPins(values){
    const pins = {};
    for(const person of STAFF){
      const pin = String(values[person.id] || '');
      if(!validPin(pin)) throw new Error(`${person.name}: use a 4–6 digit PIN; do not use 1234 or repeated digits.`);
      const salt = randomHex(16);
      pins[person.id] = { salt, hash:await hashPin(pin, salt) };
    }
    const config = { version:1, createdAt:Date.now(), pins };
    writeJson(localStorageSafe(), CONFIG_KEY, config);
    await saveRemoteConfig(config);
  }
  async function verifyPin(staffId, pin){
    const config = readJson(localStorageSafe(), CONFIG_KEY);
    const record = config && config.pins && config.pins[staffId];
    if(!record) return false;
    return (await hashPin(String(pin || ''), record.salt)) === record.hash;
  }
  async function authorizeOwnerPin(pin){
    const owner = STAFF.find(person=>person.role === 'owner');
    if(!owner || !(await verifyPin(owner.id, pin))) return null;
    return {id:owner.id, name:owner.name, role:owner.role, mode:'approval'};
  }
  async function authorizeStaffPin(staffId, pin){
    const person = staffById(staffId);
    if(!person || !(await verifyPin(person.id, pin))) return null;
    return {id:person.id, name:person.name, role:person.role, mode:'purchase'};
  }
  function normalizeElectricityCredit(value){
    const n = Number(String(value == null ? '' : value).replace(',', '.'));
    return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
  }
  function safeArray(store, key){
    const value = readJson(store, key);
    return Array.isArray(value) ? value : [];
  }
  function writeWorklogs(items){
    const clean = (items || []).filter(Boolean).slice(-500);
    writeJson(localStorageSafe(), WORKLOG_KEY, clean);
    saveRemoteOps('worklogs', { items: clean, ts: Date.now() });
    return clean;
  }
  function getWorklogs(){
    return safeArray(localStorageSafe(), WORKLOG_KEY);
  }
  function currentWorklog(){
    if(!session || !session.worklogId) return null;
    return getWorklogs().find(entry=>entry.id === session.worklogId) || null;
  }
  function electricityStatus(){
    const logs = getWorklogs();
    const topups = safeArray(localStorageSafe(), ELECTRICITY_TOPUPS_KEY);
    const readings = [];
    logs.forEach(log=>{
      if(Number.isFinite(Number(log.electricityStartCreditGhs))) readings.push({ ts:log.electricityStartEnteredAt || log.loginAt, creditGhs:Number(log.electricityStartCreditGhs), by:log.name, source:'shift_start' });
      if(Number.isFinite(Number(log.electricityEndCreditGhs))) readings.push({ ts:log.electricityEndEnteredAt || log.logoutAt, creditGhs:Number(log.electricityEndCreditGhs), by:log.name, source:'shift_end' });
    });
    topups.forEach(topup=>{
      if(Number.isFinite(Number(topup.creditAfterGhs))) readings.push({ ts:topup.ts, creditGhs:Number(topup.creditAfterGhs), by:topup.staff && topup.staff.name || '', source:'topup' });
    });
    readings.sort((a,b)=>(b.ts || 0) - (a.ts || 0));
    const latest = readings[0] || null;
    const credit = latest ? Number(latest.creditGhs) : null;
    const state = credit == null ? 'unknown' : credit <= ELECTRICITY_CRITICAL_CREDIT_GHS ? 'critical' : credit <= ELECTRICITY_LOW_CREDIT_GHS ? 'warning' : 'ok';
    return { latest, creditGhs:credit, state, lowThresholdGhs:ELECTRICITY_LOW_CREDIT_GHS, criticalThresholdGhs:ELECTRICITY_CRITICAL_CREDIT_GHS };
  }
  function startWorklog(activeSession, electricityStartCreditGhs, note){
    if(!activeSession || activeSession.mode !== 'operational') return null;
    const now = Date.now();
    const id = `worklog_${activeSession.businessDate}_${activeSession.staffId}_${now}`;
    const entry = {
      id, staffId:activeSession.staffId, name:activeSession.name, role:activeSession.role,
      shiftId:activeSession.shiftId, shiftLabel:activeSession.shiftLabel, businessDate:activeSession.businessDate,
      loginAt:activeSession.signedInAt || now, logoutAt:null, status:'open',
      electricityStartCreditGhs:normalizeElectricityCredit(electricityStartCreditGhs),
      electricityStartNote:String(note || '').trim(),
      electricityStartEnteredAt:now,
      electricityEndCreditGhs:null, electricityEndNote:'', electricityEndEnteredAt:null,
      electricityTopupsGhs:0, electricityUsageGhs:null
    };
    writeWorklogs(getWorklogs().concat(entry));
    return entry;
  }
  function closeWorklog(worklogId, electricityEndCreditGhs, note){
    const credit = normalizeElectricityCredit(electricityEndCreditGhs);
    if(credit === null) throw new Error('Enter the prepaid electricity credit at shift end.');
    const now = Date.now();
    let closed = null;
    const logs = getWorklogs().map(entry=>{
      if(entry.id !== worklogId) return entry;
      const topups = Number(entry.electricityTopupsGhs) || 0;
      const start = normalizeElectricityCredit(entry.electricityStartCreditGhs);
      const usage = start === null ? null : Math.round((start + topups - credit) * 100) / 100;
      closed = Object.assign({}, entry, {
        logoutAt:now, status:'closed', durationMinutes:Math.max(0, Math.round((now - Number(entry.loginAt || now)) / 60000)),
        electricityEndCreditGhs:credit, electricityEndNote:String(note || '').trim(), electricityEndEnteredAt:now,
        electricityUsageGhs:usage
      });
      return closed;
    });
    if(!closed) throw new Error('No open worklog was found for this session.');
    writeWorklogs(logs);
    return closed;
  }
  function writeTopups(items){
    const clean = (items || []).filter(Boolean).slice(-300);
    writeJson(localStorageSafe(), ELECTRICITY_TOPUPS_KEY, clean);
    saveRemoteOps('electricityTopups', { items: clean, ts: Date.now() });
    return clean;
  }
  function recordElectricityTopup(input){
    const amount = normalizeElectricityCredit(input && input.amountGhs);
    if(amount === null || amount <= 0) return { ok:false, message:'Enter a valid electricity top-up amount.' };
    const creditAfter = normalizeElectricityCredit(input && input.creditAfterGhs);
    const actorInfo = actor();
    const entry = {
      id:`electricity_topup_${Date.now()}`, ts:Date.now(), amountGhs:amount,
      creditAfterGhs:creditAfter, method:String(input && input.method || '').trim(),
      token:String(input && input.token || '').trim(), note:String(input && input.note || '').trim(),
      staff:actorInfo
    };
    writeTopups(safeArray(localStorageSafe(), ELECTRICITY_TOPUPS_KEY).concat(entry));
    const active = currentWorklog();
    if(active){
      writeWorklogs(getWorklogs().map(log=>log.id === active.id ? Object.assign({}, log, { electricityTopupsGhs:Math.round(((Number(log.electricityTopupsGhs) || 0) + amount) * 100) / 100 }) : log));
    }
    return { ok:true, entry };
  }
  function setSession(staffId, shiftId, options){
    const person = staffById(staffId);
    const mode = shiftId === 'remote' && person && person.role !== 'employee' ? 'remote' : 'operational';
    const shift = SHIFTS[shiftId];
    if(!person || (mode === 'operational' && !shift)) return null;
    const electricityStartCreditGhs = options && options.electricityStartCreditGhs;
    if(mode === 'operational' && normalizeElectricityCredit(electricityStartCreditGhs) === null) throw new Error('Enter the prepaid electricity credit at shift start.');
    session = {
      staffId:person.id, name:person.name, role:person.role, roleLabel:person.roleLabel, mode,
      shiftId:shift ? shift.id : '', shiftLabel:shift ? shift.label : 'Remote support', shiftHours:shift ? shift.hours : 'No shift',
      businessDate:businessDate(), signedInAt:Date.now()
    };
    const worklog = startWorklog(session, electricityStartCreditGhs, options && options.electricityStartNote);
    if(worklog) session.worklogId = worklog.id;
    writeJson(sessionStorageSafe(), SESSION_KEY, session);
    return session;
  }
  function removeAccessDialog(){
    const existing = root.document && root.document.getElementById('accessOperationalDialog');
    if(existing) existing.remove();
  }
  function textEl(tag, text, className){
    const el = document.createElement(tag);
    if(className) el.className = className;
    el.textContent = text == null ? '' : String(text);
    return el;
  }
  function fieldLabel(field){
    const label = document.createElement('label');
    label.appendChild(textEl('span', field.label));
    const input = document.createElement('input');
    input.name = field.name;
    input.type = field.type || 'text';
    input.inputMode = field.inputmode || 'text';
    if(field.min != null) input.min = String(field.min);
    if(field.step != null) input.step = String(field.step);
    if(field.minlength != null) input.minLength = Number(field.minlength);
    if(field.maxlength != null) input.maxLength = Number(field.maxlength);
    if(field.placeholder) input.placeholder = field.placeholder;
    if(field.required) input.required = true;
    if(field.pattern) input.pattern = field.pattern;
    if(field.autocomplete) input.autocomplete = field.autocomplete;
    if(field.value != null) input.value = String(field.value);
    label.appendChild(input);
    return label;
  }
  function accessCard(kicker, title, copy){
    const card = document.createElement('div');
    card.className = 'access-card';
    card.appendChild(textEl('div', 'BK', 'brand-mark'));
    if(kicker) card.appendChild(textEl('p', kicker, 'access-kicker'));
    card.appendChild(textEl('h1', title));
    if(copy) card.appendChild(textEl('p', copy, 'access-copy'));
    return card;
  }
  function accessOperationalDialog(title, copy, fields, submitLabel, onSubmit){
    if(!(root.document && root.document.body)) return Promise.resolve(null);
    removeAccessDialog();
    return new Promise(resolve=>{
      const host = root.document.createElement('div');
      host.id = 'accessOperationalDialog';
      host.className = 'access-operational-dialog';
      host.setAttribute('role', 'dialog');
      host.setAttribute('aria-modal', 'true');
      host.setAttribute('aria-labelledby', 'accessOperationalTitle');
      const card = document.createElement('div');
      card.className = 'access-operational-card';
      const heading = document.createElement('div');
      heading.className = 'access-operational-heading';
      heading.append(textEl('p', 'BurgerKiss POS', 'access-kicker'), textEl('h2', title), textEl('p', copy));
      heading.querySelector('h2').id = 'accessOperationalTitle';
      const form = document.createElement('form');
      form.id = 'accessOperationalForm';
      form.className = 'access-form';
      (fields || []).forEach(field=>form.appendChild(fieldLabel(field)));
      const error = textEl('div', '', 'access-error');
      error.id = 'accessOperationalError';
      error.setAttribute('aria-live', 'polite');
      const actions = document.createElement('div');
      actions.className = 'access-operational-actions';
      const cancel = textEl('button', 'Cancel', 'x');
      cancel.id = 'accessOperationalCancel';
      cancel.type = 'button';
      const submit = textEl('button', submitLabel || 'Confirm', 'access-primary');
      submit.type = 'submit';
      actions.append(cancel, submit);
      form.append(error, actions);
      card.append(heading, form);
      host.appendChild(card);
      root.document.body.appendChild(host);
      const firstInput = form && form.querySelector('input');
      const close = value=>{ host.remove(); resolve(value); };
      cancel.onclick = ()=>close(null);
      host.addEventListener('click', event=>{ if(event.target === host) close(null); });
      form.onsubmit = event=>{
        event.preventDefault();
        const button = event.submitter;
        if(button) button.disabled = true;
        try{
          const data = Object.fromEntries(new FormData(form).entries());
          const result = onSubmit ? onSubmit(data) : { ok:true, value:data };
          if(!result || result.ok === false){
            error.textContent = result && result.message ? result.message : 'Please check the entered values.';
            if(button) button.disabled = false;
            return;
          }
          close(result.value || data);
        }catch(dialogError){
          error.textContent = dialogError && dialogError.message ? dialogError.message : 'Please check the entered values.';
          if(button) button.disabled = false;
        }
      };
      if(firstInput) firstInput.focus();
    });
  }
  function completeSignOut(){
    session = null;
    try{ sessionStorageSafe()?.removeItem(SESSION_KEY); }catch(e){}
    root.location.reload();
  }
  function signOut(){
    if(session && session.mode === 'operational' && session.worklogId){
      const active = currentWorklog();
      if(active && active.status === 'open'){
        accessOperationalDialog(
          'Close shift before signing out',
          'Enter the prepaid electricity credit shown on the meter. The worklog will be closed before this staff session ends.',
          [
            { name:'electricityEndCreditGhs', label:'Prepaid electricity credit at shift end (GHS)', type:'number', inputmode:'decimal', min:'0', step:'0.01', placeholder:'e.g. 94.20', required:true },
            { name:'electricityEndNote', label:'Closing note optional', type:'text', maxlength:'120', placeholder:'Meter/token note' }
          ],
          'Close shift & sign out',
          data=>{
            try{
              closeWorklog(session.worklogId, data.electricityEndCreditGhs, data.electricityEndNote || 'Shift sign-out reading');
              return { ok:true };
            }catch(error){ return { ok:false, message:error.message }; }
          }
        ).then(result=>{ if(result) completeSignOut(); });
        return;
      }
    }
    completeSignOut();
  }
  function hasRole(required){
    return !!(session && ROLE_LEVEL[session.role] >= ROLE_LEVEL[required]);
  }
  function can(permission){
    const required = {
      daily_report:'employee', void_order:'supervisor', high_discount:'supervisor',
      admin:'owner', maintenance:'owner', history_export:'owner', history_purge:'owner'
    }[permission] || 'employee';
    return hasRole(required);
  }
  function applyPermissions(){
    document.querySelectorAll('[data-permission]').forEach(el=>{
      el.classList.toggle('access-hidden', !can(el.dataset.permission));
    });
    document.querySelectorAll('[data-min-role]').forEach(el=>{
      el.classList.toggle('access-hidden', !hasRole(el.dataset.minRole));
    });
  }

  function positionStaffMenu(details){
    const dropdown = details && details.querySelector('.staff-session-dropdown');
    const summary = details && details.querySelector('summary');
    if(!(dropdown && summary && details.open)) return;
    const rect = summary.getBoundingClientRect();
    const width = Math.min(Math.max(dropdown.offsetWidth || 210, 210), Math.max(210, window.innerWidth - 16));
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
    dropdown.style.left = `${left}px`;
    dropdown.style.top = `${Math.min(rect.bottom + 8, window.innerHeight - 8)}px`;
    dropdown.style.maxWidth = `${window.innerWidth - 16}px`;
  }
  function wireDismissibleMenus(){
    if(wireDismissibleMenus.done) return;
    wireDismissibleMenus.done = true;
    document.addEventListener('toggle', event=>{
      const details = event.target;
      if(!(details instanceof HTMLDetailsElement) || !details.matches('details.staff-session-menu,details.more-menu,details.tool-menu')) return;
      if(details.open){
        document.querySelectorAll('details.staff-session-menu[open],details.more-menu[open],details.tool-menu[open]').forEach(item=>{ if(item !== details) item.removeAttribute('open'); });
        positionStaffMenu(details);
      }
    }, true);
    document.addEventListener('click', event=>{
      const active = event.target.closest && event.target.closest('details.staff-session-menu,details.more-menu,details.tool-menu');
      document.querySelectorAll('details.staff-session-menu[open],details.more-menu[open],details.tool-menu[open]').forEach(details=>{ if(details !== active) details.removeAttribute('open'); });
    });
    window.addEventListener('resize', ()=>document.querySelectorAll('details.staff-session-menu[open]').forEach(positionStaffMenu));
    window.addEventListener('scroll', ()=>document.querySelectorAll('details.staff-session-menu[open]').forEach(positionStaffMenu), true);
  }
  function updateHeader(){
    const host = document.getElementById('staffSession');
    if(!host || !session) return;
    const status = salesStatus();
    const electricity = electricityStatus();
    const electricityLabel = electricity.creditGhs == null ? 'Electricity unknown' : `Electricity GHS ${electricity.creditGhs.toFixed(2)}`;
    const details = document.createElement('details');
    details.className = 'staff-session-menu';
    const summary = document.createElement('summary');
    summary.className = 'staff-session-button';
    summary.append(textEl('b', session.name), textEl('span', `${session.roleLabel} · ${session.shiftLabel}`));
    const dropdown = document.createElement('div');
    dropdown.className = 'staff-session-dropdown';
    const stockButton = textEl('button', 'Stock ');
    stockButton.type = 'button';
    stockButton.id = 'btnStockOverview';
    const stockBadge = textEl('span', '0', 'stock-alert-badge hidden');
    stockBadge.id = 'stockAlertBadge';
    stockButton.appendChild(stockBadge);
    [
      stockButton,
      Object.assign(textEl('button', 'History / Daily Report'), {type:'button', id:'btnHistory'}),
      Object.assign(textEl('button', 'Receipt'), {type:'button', id:'btnReceipt'}),
      Object.assign(textEl('button', 'Electricity top-up'), {type:'button', id:'btnElectricityTopup'}),
      Object.assign(textEl('button', 'Clear Storage'), {type:'button', id:'btnClearStorage'}),
      Object.assign(textEl('a', 'Shift Tools'), {href:'shift.html'}),
      Object.assign(textEl('a', 'Admin'), {href:'admin.html'}),
      Object.assign(textEl('button', 'Switch staff / Sign out'), {type:'button', id:'btnStaffSwitch'})
    ].forEach(item=>dropdown.appendChild(item));
    dropdown.querySelector('#btnClearStorage').dataset.permission = 'maintenance';
    dropdown.querySelector('a[href="admin.html"]').dataset.permission = 'admin';
    details.append(summary, dropdown);
    const sales = document.createElement('span');
    sales.className = `sales-status ${status.state}`;
    sales.append(textEl('b', status.label), textEl('small', status.detail));
    const electricityNode = document.createElement('span');
    electricityNode.className = `sales-status ${electricity.state}`;
    electricityNode.append(textEl('b', electricityLabel), textEl('small', 'Prepaid meter'));
    host.replaceChildren(details, sales, electricityNode);
    const signOutButton = document.getElementById('btnStaffSwitch');
    if(signOutButton) signOutButton.onclick = signOut;
    const topupButton = document.getElementById('btnElectricityTopup');
    if(topupButton) topupButton.onclick = promptElectricityTopup;
    wireDismissibleMenus();
    const staffMenu = host.querySelector('details.staff-session-menu');
    if(staffMenu) staffMenu.addEventListener('toggle', ()=>positionStaffMenu(staffMenu));
    if(root.BK_UI && typeof BK_UI.renderStock === 'function') BK_UI.renderStock();
  }
  function promptElectricityTopup(){
    accessOperationalDialog(
      'Record electricity top-up',
      'Save the prepaid top-up amount and, if available, the meter credit after loading the token.',
      [
        { name:'amountGhs', label:'Electricity top-up amount (GHS)', type:'number', inputmode:'decimal', min:'0.01', step:'0.01', placeholder:'e.g. 50.00', required:true },
        { name:'creditAfterGhs', label:'Prepaid electricity credit after top-up (GHS, optional)', type:'number', inputmode:'decimal', min:'0', step:'0.01', placeholder:'e.g. 140.00' },
        { name:'note', label:'Top-up note optional', type:'text', maxlength:'120', placeholder:'Token, receipt or meter note' }
      ],
      'Save top-up',
      data=>{
        const result = recordElectricityTopup(data);
        return result.ok ? { ok:true, value:result.entry } : result;
      }
    ).then(result=>{ if(result) updateHeader(); });
  }
  function shell(){
    let host = document.getElementById('accessGate');
    if(host) return host;
    host = document.createElement('div');
    host.id = 'accessGate';
    host.className = 'access-gate';
    host.setAttribute('role', 'dialog');
    host.setAttribute('aria-modal', 'true');
    document.body.appendChild(host);
    return host;
  }
  function showSetup(){
    const host = shell();
    const card = accessCard('First-time secure setup', 'Create staff PINs', 'Mr Asamoah should complete this once on the POS device. PINs are stored as salted hashes, never as plain text.');
    const form = document.createElement('form');
    form.id = 'accessSetupForm';
    form.className = 'access-form';
    STAFF.forEach(person=>form.appendChild(fieldLabel({
      name:person.id, label:`${person.name} · ${person.roleLabel}`, type:'password',
      inputmode:'numeric', pattern:'[0-9]{4,6}', minlength:'4', maxlength:'6',
      autocomplete:'new-password', required:true, placeholder:'4–6 digit PIN'
    })));
    const error = textEl('div', '', 'access-error');
    error.id = 'accessError';
    const submit = textEl('button', 'Save PINs securely', 'access-primary');
    submit.type = 'submit';
    form.append(error, submit);
    card.appendChild(form);
    host.replaceChildren(card);
    form.onsubmit = async event=>{
      event.preventDefault();
      const button = event.submitter;
      button.disabled = true;
      const values = Object.fromEntries(new FormData(event.currentTarget).entries());
      try{ await saveInitialPins(values); showLogin(); }
      catch(setupError){ error.textContent = setupError.message; button.disabled = false; }
    };
  }
  function showLogin(message){
    const host = shell();
    const selectedShift = suggestedShift(new Date());
    const card = accessCard('BurgerKiss POS', 'Who is signing in?', 'Staff working in the truck choose a shift. Mr Asamoah and Vera may choose Remote Support without joining a shift.');
    const form = document.createElement('form');
    form.id = 'accessLoginForm';
    form.className = 'access-form';
    const picker = document.createElement('div');
    picker.className = 'staff-picker';
    STAFF.forEach((person,index)=>{
      const choice = document.createElement('label');
      choice.className = 'staff-choice';
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'staffId';
      input.value = person.id;
      input.dataset.role = person.role;
      input.checked = index === 0;
      const labelText = document.createElement('span');
      labelText.append(textEl('b', person.name), textEl('small', person.roleLabel));
      choice.append(input, labelText);
      picker.appendChild(choice);
    });
    const modeLabel = document.createElement('label');
    modeLabel.appendChild(textEl('span', 'Access mode'));
    const mode = document.createElement('select');
    mode.name = 'shiftId';
    mode.id = 'accessMode';
    const remote = textEl('option', 'Remote Support · no shift');
    remote.value = 'remote';
    mode.appendChild(remote);
    Object.values(SHIFTS).forEach(shift=>{
      const option = textEl('option', `${shift.label} · ${shift.hours}`);
      option.value = shift.id;
      mode.appendChild(option);
    });
    modeLabel.appendChild(mode);
    const electricityStart = fieldLabel({ name:'electricityStartCreditGhs', label:'Prepaid electricity credit at shift start (GHS)', type:'number', inputmode:'decimal', min:'0', step:'0.01', placeholder:'e.g. 128.50' });
    electricityStart.id = 'electricityStartField';
    const electricityNote = fieldLabel({ name:'electricityStartNote', label:'Electricity note optional', type:'text', maxlength:'120', placeholder:'Meter/token note' });
    electricityNote.id = 'electricityStartNoteField';
    const pin = fieldLabel({ name:'pin', label:'Personal PIN', type:'password', inputmode:'numeric', pattern:'[0-9]{4,6}', maxlength:'6', autocomplete:'current-password', required:true });
    pin.querySelector('input').autofocus = true;
    const error = textEl('div', message || '', 'access-error');
    error.id = 'accessError';
    const submit = textEl('button', 'Sign in', 'access-primary');
    submit.type = 'submit';
    form.append(picker, modeLabel, electricityStart, electricityNote, pin, error, submit);
    card.appendChild(form);
    host.replaceChildren(card);
    const updateElectricityFields = ()=>{
      const operational = document.getElementById('accessMode').value !== 'remote';
      const electricityInput = document.querySelector('input[name="electricityStartCreditGhs"]');
      document.getElementById('electricityStartField').classList.toggle('hidden', !operational);
      document.getElementById('electricityStartNoteField').classList.toggle('hidden', !operational);
      if(electricityInput) electricityInput.required = operational;
    };
    const syncModes = ()=>{
      const selected = document.querySelector('input[name="staffId"]:checked');
      const remote = document.querySelector('#accessMode option[value="remote"]');
      const employee = selected && selected.dataset.role === 'employee';
      remote.disabled = employee;
      if(employee) document.getElementById('accessMode').value = selectedShift;
      else document.getElementById('accessMode').value = 'remote';
      updateElectricityFields();
    };
    document.querySelectorAll('input[name="staffId"]').forEach(input=>input.addEventListener('change', syncModes));
    document.getElementById('accessMode').addEventListener('change', updateElectricityFields);
    syncModes();
    document.getElementById('accessLoginForm').onsubmit = async event=>{
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.currentTarget).entries());
      const button = event.submitter;
      button.disabled = true;
      try{
        if(!(await verifyPin(data.staffId, data.pin))) throw new Error('Incorrect PIN. Please try again.');
        setSession(data.staffId, data.shiftId, data);
        host.remove();
        document.body.classList.remove('access-locked');
        updateHeader();
        applyPermissions();
        document.dispatchEvent(new CustomEvent('bk-access-ready', {detail:session}));
      }catch(loginError){ error.textContent = loginError.message; button.disabled = false; }
    };
  }
  function init(){
    document.body.classList.add('access-locked');
    if(session && staffById(session.staffId)){
      document.body.classList.remove('access-locked');
      updateHeader();
      applyPermissions();
      document.dispatchEvent(new CustomEvent('bk-access-ready', {detail:session}));
      return;
    }
    if(configured()){ showLogin(); return; }
    const host = shell();
    host.replaceChildren(accessCard('', 'Loading staff access…', 'Checking the shared BurgerKiss staff configuration.'));
    loadRemoteConfig().then(found=>{ if(found || configured()) showLogin(); else showSetup(); });
  }
  function guardNewSale(slot){
    if(!canOperate()){
      if(root.BK_UI && BK_UI.infoDialog) BK_UI.infoDialog('Remote Support is for monitoring and approvals. Join an Early or Late shift to operate the till.');
      return false;
    }
    const status = salesStatus();
    if(status.open || (slot && Array.isArray(slot.items) && slot.items.length)) return true;
    if(root.BK_UI && BK_UI.infoDialog) BK_UI.infoDialog(`${status.label}. ${status.detail}. Existing orders can still be completed.`);
    return false;
  }

  const api = { STAFF, SHIFTS, ROLE_LEVEL, suggestedShift, salesStatus, businessDate, init, current:()=>session, actor, operationalActor, authorizeOwnerPin, authorizeStaffPin, canOperate, hasRole, can, applyPermissions, guardNewSale, signOut, normalizeElectricityCredit, startWorklog, closeWorklog, getWorklogs, currentWorklog, electricityStatus, recordElectricityTopup, accessOperationalDialog };
  root.BK_ACCESS = api;
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
