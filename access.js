// Local staff access, shift selection and operating-hours guard.
(function(root){
  'use strict';

  const CONFIG_KEY = 'bk_staff_access_v1';
  const SESSION_KEY = 'bk_staff_session_v1';
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
      businessDate:String(raw.businessDate || businessDate()), signedInAt:Number(raw.signedInAt) || Date.now()
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
  function setSession(staffId, shiftId){
    const person = staffById(staffId);
    const mode = shiftId === 'remote' && person && person.role !== 'employee' ? 'remote' : 'operational';
    const shift = SHIFTS[shiftId];
    if(!person || (mode === 'operational' && !shift)) return null;
    session = {
      staffId:person.id, name:person.name, role:person.role, roleLabel:person.roleLabel, mode,
      shiftId:shift ? shift.id : '', shiftLabel:shift ? shift.label : 'Remote support', shiftHours:shift ? shift.hours : 'No shift',
      businessDate:businessDate(), signedInAt:Date.now()
    };
    writeJson(sessionStorageSafe(), SESSION_KEY, session);
    return session;
  }
  function signOut(){
    session = null;
    try{ sessionStorageSafe()?.removeItem(SESSION_KEY); }catch(e){}
    root.location.reload();
  }
  function hasRole(required){
    return !!(session && ROLE_LEVEL[session.role] >= ROLE_LEVEL[required]);
  }
  function can(permission){
    const required = {
      daily_report:'employee', void_order:'supervisor', high_discount:'supervisor',
      admin:'owner', maintenance:'owner', history_export:'owner'
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
  function updateHeader(){
    const host = document.getElementById('staffSession');
    if(!host || !session) return;
    const status = salesStatus();
    host.innerHTML = `<details class="staff-session-menu"><summary class="staff-session-button"><b>${escapeHtml(session.name)}</b><span>${escapeHtml(session.roleLabel)} · ${escapeHtml(session.shiftLabel)}</span></summary><div class="staff-session-dropdown"><a href="shift.html">Shift Tools</a><button type="button" id="btnStaffSwitch">Switch staff / Sign out</button></div></details><span class="sales-status ${status.state}"><b>${escapeHtml(status.label)}</b><small>${escapeHtml(status.detail)}</small></span>`;
    const signOutButton = document.getElementById('btnStaffSwitch');
    if(signOutButton) signOutButton.onclick = signOut;
  }
  function escapeHtml(value){
    return String(value || '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
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
    host.innerHTML = `<div class="access-card"><div class="brand-mark">BK</div><p class="access-kicker">First-time secure setup</p><h1>Create staff PINs</h1><p class="access-copy">Mr Asamoah should complete this once on the POS device. PINs are stored as salted hashes, never as plain text.</p><form id="accessSetupForm" class="access-form">${STAFF.map(person=>`<label><span>${escapeHtml(person.name)} · ${escapeHtml(person.roleLabel)}</span><input name="${person.id}" type="password" inputmode="numeric" pattern="[0-9]{4,6}" minlength="4" maxlength="6" autocomplete="new-password" required placeholder="4–6 digit PIN"></label>`).join('')}<div class="access-error" id="accessError"></div><button class="access-primary" type="submit">Save PINs securely</button></form></div>`;
    document.getElementById('accessSetupForm').onsubmit = async event=>{
      event.preventDefault();
      const button = event.submitter;
      button.disabled = true;
      const values = Object.fromEntries(new FormData(event.currentTarget).entries());
      try{ await saveInitialPins(values); showLogin(); }
      catch(error){ document.getElementById('accessError').textContent = error.message; button.disabled = false; }
    };
  }
  function showLogin(message){
    const host = shell();
    const selectedShift = suggestedShift(new Date());
    host.innerHTML = `<div class="access-card"><div class="brand-mark">BK</div><p class="access-kicker">BurgerKiss POS</p><h1>Who is signing in?</h1><p class="access-copy">Staff working in the truck choose a shift. Mr Asamoah and Vera may choose Remote Support without joining a shift.</p><form id="accessLoginForm" class="access-form"><div class="staff-picker">${STAFF.map((person,index)=>`<label class="staff-choice"><input type="radio" name="staffId" value="${person.id}" data-role="${person.role}" ${index===0?'checked':''}><span><b>${escapeHtml(person.name)}</b><small>${escapeHtml(person.roleLabel)}</small></span></label>`).join('')}</div><label><span>Access mode</span><select name="shiftId" id="accessMode"><option value="remote">Remote Support · no shift</option>${Object.values(SHIFTS).map(shift=>`<option value="${shift.id}" >${escapeHtml(shift.label)} · ${escapeHtml(shift.hours)}</option>`).join('')}</select></label><label><span>Personal PIN</span><input name="pin" type="password" inputmode="numeric" pattern="[0-9]{4,6}" maxlength="6" autocomplete="current-password" required autofocus></label><div class="access-error" id="accessError">${escapeHtml(message || '')}</div><button class="access-primary" type="submit">Sign in</button></form></div>`;
    const syncModes = ()=>{
      const selected = document.querySelector('input[name="staffId"]:checked');
      const remote = document.querySelector('#accessMode option[value="remote"]');
      const employee = selected && selected.dataset.role === 'employee';
      remote.disabled = employee;
      if(employee) document.getElementById('accessMode').value = selectedShift;
      else document.getElementById('accessMode').value = 'remote';
    };
    document.querySelectorAll('input[name="staffId"]').forEach(input=>input.addEventListener('change', syncModes));
    syncModes();
    document.getElementById('accessLoginForm').onsubmit = async event=>{
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.currentTarget).entries());
      const button = event.submitter;
      button.disabled = true;
      try{
        if(!(await verifyPin(data.staffId, data.pin))) throw new Error('Incorrect PIN. Please try again.');
        setSession(data.staffId, data.shiftId);
        host.remove();
        document.body.classList.remove('access-locked');
        updateHeader();
        applyPermissions();
        document.dispatchEvent(new CustomEvent('bk-access-ready', {detail:session}));
      }catch(error){ document.getElementById('accessError').textContent = error.message; button.disabled = false; }
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
    host.innerHTML = '<div class="access-card"><div class="brand-mark">BK</div><h1>Loading staff access…</h1><p class="access-copy">Checking the shared BurgerKiss staff configuration.</p></div>';
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

  const api = { STAFF, SHIFTS, ROLE_LEVEL, suggestedShift, salesStatus, businessDate, init, current:()=>session, actor, operationalActor, authorizeOwnerPin, canOperate, hasRole, can, applyPermissions, guardNewSale, signOut };
  root.BK_ACCESS = api;
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
