// Daily Sales page: closeout and order checks.
(function(){
  'use strict';

  function setReportDate(offset){
    const date = new Date();
    date.setDate(date.getDate() + offset);
    document.getElementById('shiftReportDate').value = BK_REPORTS.dateInputValue(date);
    renderReport();
  }
  function allowedStaffDate(value){
    const today = BK_REPORTS.dateInputValue(new Date());
    const y = new Date(); y.setDate(y.getDate() - 1);
    const yesterday = BK_REPORTS.dateInputValue(y);
    return value === today || value === yesterday;
  }
  function restrictDateInput(){
    const dateInput = document.getElementById('shiftReportDate');
    const current = window.BK_ACCESS && BK_ACCESS.current ? BK_ACCESS.current() : null;
    if(!dateInput || (current && current.role === 'owner')) return;
    const today = BK_REPORTS.dateInputValue(new Date());
    const y = new Date(); y.setDate(y.getDate() - 1);
    const yesterday = BK_REPORTS.dateInputValue(y);
    dateInput.min = yesterday;
    dateInput.max = today;
    if(!allowedStaffDate(dateInput.value)) dateInput.value = today;
  }
  function renderShiftTools(){
    document.body.classList.remove('app-loading');
    const dateInput = document.getElementById('shiftReportDate');
    if(dateInput && !dateInput.value) dateInput.value = BK_REPORTS.dateInputValue(new Date());
    initShiftTabs();
    initPlanner();
    initAbsences();
    initPayroll();
    restrictDateInput();
    renderReport();
    Promise.all([
      BK_REPORTS.refreshHistoryFromRemote(),
      window.BK_STOCK && BK_STOCK.loadRemoteOnce ? BK_STOCK.loadRemoteOnce() : Promise.resolve(false)
    ]).then(renderReport);
  }
  function renderReport(){
    const date = document.getElementById('shiftReportDate').value;
    const report = BK_REPORTS.dailyReportData(date);
    const host = document.getElementById('shiftReportBody');
    host.innerHTML = BK_REPORTS.dailyReportHtml(report);
    host.querySelectorAll('[data-history-id]').forEach(button=>{
      button.onclick = ()=>openOrderDetail(button.dataset.historyId, report.orders);
    });
  }
  function openOrderDetail(id, scopedOrders){
    const entry = (scopedOrders || []).find(item=>item.id === id);
    document.getElementById('shiftOrderDetailTitle').textContent = entry ? `Order ${entry.orderNo}` : 'Order detail';
    document.getElementById('shiftOrderDetailBody').innerHTML = BK_REPORTS.historyDetailHtml(entry);
    document.getElementById('shiftOrderDetailModal').classList.add('open');
  }
  function closeOrderDetail(){ document.getElementById('shiftOrderDetailModal').classList.remove('open'); }
  function setShiftView(view){
    const next = view || 'schedule';
    document.querySelectorAll('[data-shift-panel]').forEach(panel=>{
      panel.hidden = panel.dataset.shiftPanel !== next;
    });
    document.querySelectorAll('[data-shift-view]').forEach(button=>{
      const active = button.dataset.shiftView === next;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    try{ localStorage.setItem('bk_shift_tools_view_v1', next); }catch(e){}
  }
  function initShiftTabs(){
    if(initShiftTabs.done) return;
    initShiftTabs.done = true;
    document.querySelectorAll('[data-shift-view]').forEach(button=>{
      button.onclick = ()=>setShiftView(button.dataset.shiftView);
    });
    let saved = '';
    try{ saved = localStorage.getItem('bk_shift_tools_view_v1') || ''; }catch(e){}
    if(!document.querySelector(`[data-shift-panel="${saved}"]`)) saved = 'schedule';
    setShiftView(saved);
  }
  function escapeHtml(value){ return BK_REPORTS && BK_REPORTS.escapeHtml ? BK_REPORTS.escapeHtml(value) : String(value || '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c])); }
  function currentActor(){ return window.BK_ACCESS && BK_ACCESS.actor ? BK_ACCESS.actor() : null; }
  function canManagePlanner(){ return window.BK_SHIFT_PLANNER && BK_SHIFT_PLANNER.canManageSchedule(currentActor()); }
  function plannerMonth(){ return document.getElementById('plannerMonth').value || BK_SHIFT_PLANNER.monthValue(new Date()); }
  function setPlannerMessage(message){ document.getElementById('plannerMessage').textContent = message || ''; }
  function setAbsenceMessage(message){ document.getElementById('absenceMessage').textContent = message || ''; }
  function setPayrollMessage(message){ document.getElementById('payrollMessage').textContent = message || ''; }
  function fillPlannerOptions(){
    document.getElementById('plannerStaff').innerHTML = BK_ACCESS.STAFF.filter(person=>person.role !== 'owner').map(person=>`<option value="${escapeHtml(person.id)}">${escapeHtml(person.name)} · ${escapeHtml(person.roleLabel)}</option>`).join('');
    const shifts = Object.values(BK_ACCESS.SHIFTS).map(shift=>`<option value="${escapeHtml(shift.id)}">${escapeHtml(shift.label)} · ${escapeHtml(shift.hours)}</option>`).join('');
    document.getElementById('plannerShift').innerHTML = `<option value="off">Off day</option>${shifts}`;
  }
  function renderPlanner(){
    if(!(window.BK_SHIFT_PLANNER && window.BK_ACCESS)) return;
    const month = plannerMonth();
    const schedule = BK_SHIFT_PLANNER.scheduleForMonth(month);
    const actor = currentActor();
    const canManage = BK_SHIFT_PLANNER.canManageSchedule(actor);
    const canApprove = BK_SHIFT_PLANNER.canApproveSchedule(actor);
    const form = document.getElementById('plannerForm');
    form.classList.toggle('hidden', !canManage);
    document.getElementById('plannerSubmit').classList.toggle('hidden', !canManage);
    document.getElementById('plannerApprove').classList.toggle('hidden', !canApprove);
    document.getElementById('plannerStatus').textContent = schedule.status.replace(/_/g, ' ');
    document.getElementById('plannerDate').min = `${month}-01`;
    const days = BK_SHIFT_PLANNER.daysInMonth(month);
    document.getElementById('plannerDate').max = days[days.length - 1] || '';
    if(!document.getElementById('plannerDate').value || !document.getElementById('plannerDate').value.startsWith(month)) document.getElementById('plannerDate').value = days[0] || '';
    const entriesByDate = {};
    schedule.entries.forEach(entry=>{ (entriesByDate[entry.date] = entriesByDate[entry.date] || []).push(entry); });
    document.getElementById('plannerGrid').innerHTML = days.map(date=>{
      const entries = entriesByDate[date] || [];
      const weekday = new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday:'short', month:'short', day:'numeric' });
      const body = entries.length ? entries.map(entry=>{
        const person = BK_ACCESS.STAFF.find(item=>item.id === entry.staffId);
        const shift = entry.shiftId === 'off' ? { label:'Off day' } : BK_ACCESS.SHIFTS[entry.shiftId];
        const absence = window.BK_ABSENCES && BK_ABSENCES.staffAbsentOn ? BK_ABSENCES.staffAbsentOn(entry.staffId, entry.date) : null;
        const absenceNote = absence ? ` <span class="absence-badge ${absence.paid ? 'paid' : 'unpaid'}">${escapeHtml(absence.typeLabel)} · ${absence.paid ? 'paid' : 'unpaid'}</span>` : '';
        return `<div class="planner-entry"><span><b>${escapeHtml(person && person.name || entry.staffId)}</b> · ${escapeHtml(shift && shift.label || entry.shiftId)} <small>${Number(entry.workDayCredit || 0).toFixed(1)} day</small>${absenceNote}${entry.note ? `<small> · ${escapeHtml(entry.note)}</small>` : ''}</span>${canManage ? `<button class="x" type="button" data-planner-remove="${escapeHtml(entry.id)}">Remove</button>` : ''}</div>`;
      }).join('') : '<div class="planner-empty">No shifts planned.</div>';
      return `<details class="planner-day"><summary>${escapeHtml(weekday)}</summary>${body}</details>`;
    }).join('');
    document.querySelectorAll('[data-planner-remove]').forEach(button=>{
      button.onclick = ()=>{
        const result = BK_SHIFT_PLANNER.removeEntry(month, button.dataset.plannerRemove, currentActor());
        setPlannerMessage(result.ok ? 'Shift removed.' : result.message);
        renderPlanner();
        renderPayroll();
      };
    });
  }
  function initPlanner(){
    if(initPlanner.done || !(window.BK_SHIFT_PLANNER && window.BK_ACCESS)) return;
    initPlanner.done = true;
    fillPlannerOptions();
    const monthInput = document.getElementById('plannerMonth');
    monthInput.value = BK_SHIFT_PLANNER.monthValue(new Date());
    monthInput.onchange = ()=>{ setPlannerMessage(''); renderPlanner(); renderAbsences(); renderPayroll(); };
    document.getElementById('plannerShift').onchange = event=>{
      document.getElementById('plannerCredit').value = event.target.value === 'off' ? '0' : '1';
    };
    document.getElementById('plannerForm').onsubmit = event=>{
      event.preventDefault();
      const result = BK_SHIFT_PLANNER.upsertEntry(plannerMonth(), Object.fromEntries(new FormData(event.currentTarget).entries()), currentActor());
      const absence = result.ok && window.BK_ABSENCES && BK_ABSENCES.staffAbsentOn ? BK_ABSENCES.staffAbsentOn(result.entry.staffId, result.entry.date) : null;
      setPlannerMessage(result.ok ? `Shift saved.${absence ? ` Warning: ${absence.typeLabel} absence exists for this staff member.` : ''}` : result.message);
      if(result.ok){ event.currentTarget.reset(); fillPlannerOptions(); }
      renderPlanner();
      renderPayroll();
    };
    document.getElementById('plannerSubmit').onclick = ()=>{
      const result = BK_SHIFT_PLANNER.submitForApproval(plannerMonth(), currentActor());
      setPlannerMessage(result.ok ? 'Schedule submitted for owner approval.' : result.message);
      renderPlanner();
    };
    document.getElementById('plannerApprove').onclick = ()=>{
      const result = BK_SHIFT_PLANNER.approveSchedule(plannerMonth(), currentActor());
      setPlannerMessage(result.ok ? 'Schedule approved.' : result.message);
      renderPlanner();
    };
    renderPlanner();
  }
  function fillAbsenceOptions(){
    document.getElementById('absenceStaff').innerHTML = BK_ACCESS.STAFF.filter(person=>person.role !== 'owner').map(person=>`<option value="${escapeHtml(person.id)}">${escapeHtml(person.name)} · ${escapeHtml(person.roleLabel)}</option>`).join('');
    document.getElementById('absenceType').innerHTML = Object.entries(BK_ABSENCES.TYPES).map(([id,label])=>`<option value="${escapeHtml(id)}">${escapeHtml(label)}</option>`).join('');
  }
  function renderAbsences(){
    if(!(window.BK_ABSENCES && window.BK_ACCESS)) return;
    const month = plannerMonth();
    const actor = currentActor();
    const canManage = BK_ABSENCES.canManageAbsences(actor);
    document.getElementById('absenceForm').classList.toggle('hidden', !canManage);
    const absences = BK_ABSENCES.absencesForMonth(month);
    document.getElementById('absenceList').innerHTML = absences.length ? absences.map(absence=>{
      const person = BK_ACCESS.STAFF.find(item=>item.id === absence.staffId);
      return `<div class="absence-entry"><span><b>${escapeHtml(person && person.name || absence.staffId)}</b> · ${escapeHtml(absence.typeLabel)} <small>${escapeHtml(absence.fromDate)}–${escapeHtml(absence.toDate)}</small> <span class="absence-badge ${absence.paid ? 'paid' : 'unpaid'}">${absence.paid ? 'Paid' : 'Unpaid'}</span>${absence.note ? `<small> · ${escapeHtml(absence.note)}</small>` : ''}</span>${canManage ? `<button class="x" type="button" data-absence-cancel="${escapeHtml(absence.id)}">Cancel</button>` : ''}</div>`;
    }).join('') : '<div class="absence-empty">No absences in this month.</div>';
    document.querySelectorAll('[data-absence-cancel]').forEach(button=>{
      button.onclick = ()=>{
        const result = BK_ABSENCES.cancelAbsence(button.dataset.absenceCancel, currentActor());
        setAbsenceMessage(result.ok ? 'Absence cancelled.' : result.message);
        renderAbsences();
        renderPlanner();
        renderPayroll();
      };
    });
  }
  function initAbsences(){
    if(initAbsences.done || !(window.BK_ABSENCES && window.BK_ACCESS)) return;
    initAbsences.done = true;
    fillAbsenceOptions();
    document.getElementById('absenceFrom').value = document.getElementById('plannerDate').value || BK_REPORTS.dateInputValue(new Date());
    document.getElementById('absenceTo').value = document.getElementById('absenceFrom').value;
    document.getElementById('absenceFrom').onchange = event=>{ if(!document.getElementById('absenceTo').value || document.getElementById('absenceTo').value < event.target.value) document.getElementById('absenceTo').value = event.target.value; };
    document.getElementById('absenceForm').onsubmit = event=>{
      event.preventDefault();
      const result = BK_ABSENCES.upsertAbsence(Object.fromEntries(new FormData(event.currentTarget).entries()), currentActor());
      setAbsenceMessage(result.ok ? 'Absence saved.' : result.message);
      if(result.ok){ event.currentTarget.reset(); fillAbsenceOptions(); document.getElementById('absenceFrom').value = `${plannerMonth()}-01`; document.getElementById('absenceTo').value = `${plannerMonth()}-01`; }
      renderAbsences();
      renderPlanner();
      renderPayroll();
    };
    renderAbsences();
  }
  function fillAdvanceOptions(){
    document.getElementById('advanceStaff').innerHTML = BK_ACCESS.STAFF.filter(person=>BK_PAYROLL.profileFor(person.id)).map(person=>`<option value="${escapeHtml(person.id)}">${escapeHtml(person.name)} · ${escapeHtml(person.roleLabel)}</option>`).join('');
  }
  function formatGhs(value){ return `GHS ${Number(value || 0).toFixed(2)}`; }
  function renderPayroll(){
    if(!(window.BK_PAYROLL && window.BK_ACCESS)) return;
    const month = plannerMonth();
    const actor = currentActor();
    const canManage = BK_PAYROLL.canManagePayroll(actor);
    document.getElementById('advanceForm').classList.toggle('hidden', !canManage);
    const rows = BK_PAYROLL.payrollRows(month, actor);
    document.getElementById('payrollList').innerHTML = rows.length ? rows.map(row=>{
      const person = BK_ACCESS.STAFF.find(item=>item.id === row.staffId);
      const advanceList = row.advances.length ? row.advances.map(advance=>`<small>${escapeHtml(advance.date)} · ${formatGhs(advance.amount)} · ${escapeHtml(advance.method || 'Advance')}${advance.staffConfirmed ? ' · confirmed' : ''}</small>`).join('<br>') : '<small>No salary advances.</small>';
      return `<div class="payroll-entry"><span><b>${escapeHtml(person && person.name || row.staffId)}</b><br><small>Fixed salary ${formatGhs(row.monthlySalary)} · planned days ${row.plannedWorkDays} · day value ${formatGhs(row.dayValue)}</small><br><small>Unpaid absences ${row.unpaidAbsenceDays} (${formatGhs(row.absenceDeduction)}) · double-shift extras ${row.extraWorkDayCredits} (${formatGhs(row.extraPay)})</small><br>${advanceList}</span><span><small>Gross ${formatGhs(row.grossPay)}</small><br><small>Advances -${formatGhs(row.advancesTotal)}</small><br><strong>To pay ${formatGhs(row.netPay)}</strong></span></div>`;
    }).join('') : '<div class="absence-empty">No payroll rows visible for this account.</div>';
  }
  function initPayroll(){
    if(initPayroll.done || !(window.BK_PAYROLL && window.BK_ACCESS)) return;
    initPayroll.done = true;
    fillAdvanceOptions();
    document.getElementById('advanceDate').value = `${plannerMonth()}-01`;
    document.getElementById('advanceForm').onsubmit = event=>{
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.currentTarget).entries());
      data.period = String(data.date || '').slice(0, 7) || plannerMonth();
      const result = BK_PAYROLL.recordAdvance(data, currentActor());
      setPayrollMessage(result.ok ? 'Salary advance saved.' : result.message);
      if(result.ok){ event.currentTarget.reset(); fillAdvanceOptions(); document.getElementById('advanceDate').value = `${plannerMonth()}-01`; }
      renderPayroll();
    };
    renderPayroll();
  }
  function exportPurchaseHistory(){
    const date = document.getElementById('shiftReportDate').value || BK_REPORTS.dateInputValue(new Date());
    const report = BK_REPORTS.dailyReportData(date);
    const rows = [['date','purchaser','item','quantity','unit','amount_ghs','payment_source','receipt_in_purse','note']];
    report.purchases.forEach(entry=>rows.push([
      entry.ts ? new Date(entry.ts).toISOString() : '',
      entry.staff && entry.staff.name || '',
      entry.ingredient_name || entry.ingredient_id || '',
      entry.qty || '',
      entry.unit || '',
      entry.amount || 0,
      entry.paymentSource || '',
      entry.receiptInPurse ? 'yes' : 'no',
      entry.note || ''
    ]));
    const csv = rows.map(row=>row.map(value=>`"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], {type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bk-purchases-${date}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  document.addEventListener('bk-access-ready', renderShiftTools);
  document.getElementById('shiftReportDate').onchange = ()=>{ restrictDateInput(); renderReport(); };
  document.getElementById('historyToday').onclick = ()=>{ setShiftView('closeout'); setReportDate(0); };
  document.getElementById('historyYesterday').onclick = ()=>{ setShiftView('closeout'); setReportDate(-1); };
  document.getElementById('purchaseHistoryExport').onclick = ()=>{ setShiftView('closeout'); exportPurchaseHistory(); };
  document.getElementById('shiftOrderDetailClose').onclick = closeOrderDetail;
})();
