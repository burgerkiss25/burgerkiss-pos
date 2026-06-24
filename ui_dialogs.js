// Shared modal dialog helpers for BurgerKiss UI flows.
(function(root){
  'use strict';

  function ensureHost(){
    let host = root.document && root.document.getElementById('appDialog');
    if(host) return host;
    host = root.document.createElement('div');
    host.id = 'appDialog';
    host.className = 'modal';
    const sheet = root.document.createElement('div');
    sheet.className = 'sheet';
    const header = root.document.createElement('header');
    const title = root.document.createElement('b');
    title.id = 'appDialogTitle';
    header.appendChild(title);
    const body = root.document.createElement('div');
    body.className = 'body';
    body.id = 'appDialogBody';
    sheet.append(header, body);
    host.appendChild(sheet);
    root.document.body.appendChild(host);
    return host;
  }

  function dialogBody(){
    return root.document.getElementById('appDialogBody');
  }

  function button(id, label, className){
    const el = root.document.createElement('button');
    el.type = 'button';
    el.id = id;
    el.className = className || 'x';
    el.textContent = label;
    return el;
  }

  function messageNode(message){
    const node = root.document.createElement('div');
    node.style.marginBottom = '10px';
    node.textContent = message == null ? '' : String(message);
    return node;
  }

  function appendTrustedMarkup(target, markup){
    if(markup && typeof markup === 'object' && markup.nodeType){
      target.appendChild(markup);
      return;
    }
    if(root.DOMParser){
      const parser = new root.DOMParser();
      const doc = parser.parseFromString(String(markup || ''), 'text/html');
      Array.from(doc.body.childNodes).forEach(node=>target.appendChild(root.document.importNode(node, true)));
      return;
    }
    target.textContent = markup == null ? '' : String(markup);
  }

  function open(host){
    host.dataset.returnFocus = '';
    if(root.document.activeElement && root.document.activeElement.id) host.dataset.returnFocus = root.document.activeElement.id;
    host.classList.add('open');
  }

  function close(){
    const host = root.document && root.document.getElementById('appDialog');
    if(!host) return;
    host.classList.remove('open', 'modifier-dialog');
    const returnFocus = host.dataset.returnFocus;
    if(returnFocus){
      const target = root.document.getElementById(returnFocus);
      if(target && typeof target.focus === 'function') target.focus();
    }
  }

  function info(message){
    const host = ensureHost();
    root.document.getElementById('appDialogTitle').textContent = 'Info';
    const body = dialogBody();
    const actions = root.document.createElement('div');
    actions.style.display = 'flex';
    actions.style.justifyContent = 'flex-end';
    const ok = button('dlgOk', 'OK');
    actions.appendChild(ok);
    body.replaceChildren(messageNode(message), actions);
    open(host);
    ok.focus();
    ok.onclick = close;
  }

  function confirm(title, message, opts){
    return new Promise(resolve=>{
      const options = opts || {};
      const cancelLabel = options.cancelLabel || 'Cancel';
      const confirmLabel = options.confirmLabel || 'Confirm';
      const host = ensureHost();
      root.document.getElementById('appDialogTitle').textContent = title;
      const body = dialogBody();
      const actions = root.document.createElement('div');
      actions.style.display = 'flex';
      actions.style.gap = '8px';
      actions.style.justifyContent = 'flex-end';
      const cancel = button('dlgCancel', cancelLabel);
      const confirmButton = button('dlgConfirm', confirmLabel);
      actions.append(cancel, confirmButton);
      body.replaceChildren(messageNode(message), actions);
      open(host);
      cancel.focus();
      cancel.onclick = ()=>{ close(); resolve(false); };
      confirmButton.onclick = ()=>{ close(); resolve(true); };
    });
  }

  function handoverChecklist(title, message){
    return new Promise(resolve=>{
      const host = ensureHost();
      root.document.getElementById('appDialogTitle').textContent = title;
      const body = dialogBody();
      const dialog = root.document.createElement('div');
      dialog.className = 'handover-checklist-dialog';
      appendTrustedMarkup(dialog, message);
      const progress = root.document.createElement('div');
      progress.className = 'handover-check-progress';
      progress.id = 'handoverCheckProgress';
      progress.setAttribute('role', 'status');
      progress.setAttribute('aria-live', 'polite');
      const actions = root.document.createElement('div');
      actions.className = 'handover-check-actions';
      const cancel = button('dlgCancel', 'Cancel');
      const confirmButton = button('dlgConfirm', 'Confirm handover', 'x modifier-primary');
      confirmButton.disabled = true;
      actions.append(cancel, confirmButton);
      dialog.append(progress, actions);
      body.replaceChildren(dialog);
      open(host);
      cancel.focus();
      const checks = Array.from(host.querySelectorAll('[data-handover-check]'));
      const update = ()=>{
        const complete = checks.filter(input=>input.checked).length;
        const total = checks.length;
        progress.textContent = `${complete} of ${total} required checks confirmed`;
        progress.classList.toggle('complete', total > 0 && complete === total);
        confirmButton.disabled = total === 0 || complete !== total;
      };
      checks.forEach(input=>input.addEventListener('change', update));
      update();
      cancel.onclick = ()=>{ close(); resolve(false); };
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
