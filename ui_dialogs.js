// Shared modal dialog helpers for BurgerKiss UI flows.
(function(root){
  'use strict';

  function ensureHost(){
    let host = root.document && root.document.getElementById('appDialog');
    if(host) return host;
    host = root.document.createElement('div');
    host.id = 'appDialog';
    host.className = 'modal';
    host.innerHTML = '<div class="sheet"><header><b id="appDialogTitle"></b></header><div class="body" id="appDialogBody"></div></div>';
    root.document.body.appendChild(host);
    return host;
  }

  function close(){
    const host = root.document && root.document.getElementById('appDialog');
    if(host) host.classList.remove('open', 'modifier-dialog');
  }

  function info(message){
    const host = ensureHost();
    root.document.getElementById('appDialogTitle').textContent = 'Info';
    root.document.getElementById('appDialogBody').innerHTML = `
      <div style="margin-bottom:10px">${message}</div>
      <div style="display:flex;justify-content:flex-end"><button class="x" id="dlgOk">OK</button></div>
    `;
    host.classList.add('open');
    root.document.getElementById('dlgOk').onclick = close;
  }

  function confirm(title, message, opts){
    return new Promise(resolve=>{
      const options = opts || {};
      const cancelLabel = options.cancelLabel || 'Cancel';
      const confirmLabel = options.confirmLabel || 'Confirm';
      const host = ensureHost();
      root.document.getElementById('appDialogTitle').textContent = title;
      root.document.getElementById('appDialogBody').innerHTML = `
        <div style="margin-bottom:10px">${message}</div>
        <div style="display:flex;gap:8px;justify-content:flex-end">
          <button class="x" id="dlgCancel">${cancelLabel}</button>
          <button class="x" id="dlgConfirm">${confirmLabel}</button>
        </div>
      `;
      host.classList.add('open');
      root.document.getElementById('dlgCancel').onclick = ()=>{ close(); resolve(false); };
      root.document.getElementById('dlgConfirm').onclick = ()=>{ close(); resolve(true); };
    });
  }

  function handoverChecklist(title, message){
    return new Promise(resolve=>{
      const host = ensureHost();
      root.document.getElementById('appDialogTitle').textContent = title;
      root.document.getElementById('appDialogBody').innerHTML = `
        <div class="handover-checklist-dialog">
          ${message}
          <div class="handover-check-progress" id="handoverCheckProgress" role="status" aria-live="polite"></div>
          <div class="handover-check-actions">
            <button class="x" id="dlgCancel" type="button">Cancel</button>
            <button class="x modifier-primary" id="dlgConfirm" type="button" disabled>Confirm handover</button>
          </div>
        </div>
      `;
      host.classList.add('open');
      const checks = Array.from(host.querySelectorAll('[data-handover-check]'));
      const confirmButton = root.document.getElementById('dlgConfirm');
      const progress = root.document.getElementById('handoverCheckProgress');
      const update = ()=>{
        const complete = checks.filter(input=>input.checked).length;
        const total = checks.length;
        progress.textContent = `${complete} of ${total} required checks confirmed`;
        progress.classList.toggle('complete', total > 0 && complete === total);
        confirmButton.disabled = total === 0 || complete !== total;
      };
      checks.forEach(input=>input.addEventListener('change', update));
      update();
      root.document.getElementById('dlgCancel').onclick = ()=>{ close(); resolve(false); };
      confirmButton.onclick = ()=>{
        if(confirmButton.disabled) return;
        close();
        resolve(true);
      };
    });
  }

  root.BK_DIALOGS = { ensureHost, close, info, confirm, handoverChecklist };
  if(typeof module !== 'undefined' && module.exports) module.exports = root.BK_DIALOGS;
})(typeof window !== 'undefined' ? window : globalThis);
