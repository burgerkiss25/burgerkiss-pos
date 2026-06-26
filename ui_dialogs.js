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

  function appendContent(target, content){
    if(content && typeof content === 'object' && content.nodeType){
      target.appendChild(content);
      return;
    }
    target.textContent = content == null ? '' : String(content);
  }

  function checklistLine(row){
    const line = root.document.createElement('span');
    line.className = 'handover-card-line';
    const name = root.document.createElement('b');
    name.textContent = `${Number(row && row.qty) || 1}x ${(row && row.name) || ''}`;
    line.appendChild(name);
    if(row && row.detail){
      const detail = root.document.createElement('small');
      detail.textContent = row.detail;
      line.appendChild(detail);
    }
    return line;
  }

  function checklistCard(card){
    const label = root.document.createElement('label');
    label.className = 'handover-card-check';
    const input = root.document.createElement('input');
    input.type = 'checkbox';
    input.dataset.handoverCheck = '';
    const body = root.document.createElement('span');
    body.className = 'handover-card-body';
    const heading = root.document.createElement('span');
    heading.className = 'handover-menu-heading';
    const title = root.document.createElement('strong');
    title.textContent = (card && card.title) || '';
    heading.appendChild(title);
    if(card && card.badge){
      const badge = root.document.createElement('span');
      badge.textContent = card.badge;
      heading.appendChild(badge);
    }
    const lines = root.document.createElement('span');
    lines.className = 'handover-card-lines';
    (card && Array.isArray(card.lines) ? card.lines : []).forEach(row=>lines.appendChild(checklistLine(row)));
    body.append(heading, lines);
    label.append(input, body);
    return label;
  }

  function appendChecklistContent(target, content){
    if(!content || typeof content !== 'object' || content.nodeType){
      appendContent(target, content);
      return;
    }
    if(content.intro){
      const intro = root.document.createElement('div');
      intro.style.marginBottom = '8px';
      intro.textContent = content.intro;
      target.appendChild(intro);
    }
    if(content.preferenceLabel || content.menuRule){
      const mode = root.document.createElement('div');
      mode.className = 'final-packaging-mode';
      const preferenceLabel = root.document.createElement('b');
      preferenceLabel.textContent = 'Customer preference:';
      mode.append(preferenceLabel, root.document.createTextNode(` ${content.preferenceLabel || 'Not set'} · `));
      const menuRuleLabel = root.document.createElement('b');
      menuRuleLabel.textContent = 'Menu rule:';
      mode.append(menuRuleLabel, root.document.createTextNode(` ${content.menuRule || 'every menu stays separate'}`));
      target.appendChild(mode);
    }
    const cards = Array.isArray(content.cards) ? content.cards : [];
    if(cards.length) cards.forEach(card=>target.appendChild(checklistCard(card)));
    else {
      const empty = root.document.createElement('div');
      empty.textContent = 'No items in this order.';
      target.appendChild(empty);
    }
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
      appendChecklistContent(dialog, message);
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
