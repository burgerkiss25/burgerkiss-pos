const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'order.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
const main = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'ui.js'), 'utf8');

test('payment and handover have compact local headers', () => {
  assert.match(html, /id="btnPayBack"[^>]*>← Kitchen<\/button>/);
  assert.match(html, /<h2>Payment<\/h2>/);
  assert.match(html, /id="btnIssueBack"[^>]*>← Payment<\/button>/);
  assert.match(html, /<h2>Handover<\/h2>/);
  assert.match(main, /btnPayBack'\)\.onclick = \(\)=> showTab\('make'\)/);
  assert.match(main, /btnIssueBack'\)\.onclick = \(\)=> showTab\('pay'\)/);
});

test('pay and issue workflows hide ordering controls', () => {
  assert.match(css, /\.workflow-pay \.hud-rows,\.workflow-pay \.catbar,\.workflow-pay \.totals/);
  assert.match(css, /\.workflow-issue \.hud-rows,\.workflow-issue \.catbar,\.workflow-issue \.totals/);
});

test('payment focuses on one active order and one compact total', () => {
  const renderPay = ui.slice(ui.indexOf('function renderPay()'), ui.indexOf('function continueFromPayment'));
  assert.match(renderPay, /const s = slots\[active\]/);
  assert.match(renderPay, /Amount due/);
  assert.match(renderPay, /Change payment/);
  assert.doesNotMatch(renderPay, />Unpaid<\/button>/);
  assert.doesNotMatch(html, /All Slots Subtotal|Global Discount|Grand Total/);
});

test('handover shows operational status and no prices in its checklist', () => {
  const renderIssue = ui.slice(ui.indexOf('function renderIssue()'), ui.indexOf('function goTab'));
  assert.match(renderIssue, /Items to hand over/);
  assert.match(renderIssue, /showPrices:false/);
  assert.match(renderIssue, /displayTitle:entry\.menuGroupId && entry\.menuName \? entry\.menuName/);
  assert.match(renderIssue, /packagingLabel\(s\)/);
  assert.doesNotMatch(renderIssue, /packagingControl\(s, i, true\)/);
  assert.doesNotMatch(renderIssue, /ACTIVE ORDER|Active order/);
});

test('walk-in MoMo payments are split by Telecel and MTN', () => {
  const renderPay = ui.slice(ui.indexOf('function renderPay()'), ui.indexOf('function continueFromPayment'));
  assert.match(renderPay, /Telecel MoMo/);
  assert.match(renderPay, /MTN MoMo/);
  assert.match(ui, /momoProviderLabel/);
  assert.match(ui, /momoTelecelTotal/);
  assert.match(ui, /momoMtnTotal/);
});

test('staff order history is limited to today or yesterday unless owner opens all', () => {
  assert.match(html, /id="hYesterday"/);
  assert.match(ui, /historyFilterRange = 'today'/);
  assert.match(ui, /function filterHistoryYesterday/);
  assert.match(ui, /owner && historyFilterRange === 'all'/);
});


test('shift order audit rows can open order detail modal', () => {
  const shiftReports = fs.readFileSync(path.join(root, 'shift_reports.js'), 'utf8');
  const shiftJs = fs.readFileSync(path.join(root, 'shift.js'), 'utf8');
  assert.match(shiftReports, /data-history-id/);
  assert.match(shiftReports, /function historyDetailHtml/);
  assert.match(shiftJs, /openOrderDetail/);
});


test('daily sales date picker is restricted for non-owner staff', () => {
  const shiftJs = fs.readFileSync(path.join(root, 'shift.js'), 'utf8');
  assert.match(shiftJs, /function restrictDateInput/);
  assert.match(shiftJs, /dateInput\.min = yesterday/);
  assert.match(shiftJs, /dateInput\.max = today/);
});





test('open dropdown menus close when another area is clicked', () => {
  const main = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
  assert.match(main, /const closeOpenMenusExcept/);
  assert.match(main, /document\.addEventListener\('click'/);
  assert.match(main, /details\.tool-menu\[open\], details\.staff-session-menu\[open\]/);
});

test('modifier sheet uses horizontal section scrolling instead of one long vertical sheet', () => {
  assert.match(css, /#appDialog\.modifier-dialog \.sheet\{[^}]*overflow:hidden/);
  assert.match(ui, /host\.classList\.add\('modifier-dialog'\)/);
  assert.match(ui, /classList\.remove\('open', 'modifier-dialog'\)/);
  assert.match(css, /\.modifier-grid\{[^}]*display:flex[^}]*overflow-x:auto/);
  assert.match(css, /\.modifier-group\{[^}]*flex:0 0[^}]*overflow-y:auto/);
  assert.match(css, /\.modifier-actions\{[^}]*position:sticky/);
});


test('single food items default to shared packaging unless changed manually', () => {
  assert.match(ui, /function defaultPackingItems/);
  assert.match(ui, /customerGroupId = 'shared-single'/);
  assert.match(ui, /Single items are packed together by default/);
  assert.match(ui, /packingAssignmentDialog\(slotIndex, true\)/);
});

test('owner-only history purge requires date range, selected orders and owner PIN', () => {
  const order = fs.readFileSync(path.join(root, 'order.html'), 'utf8');
  const main = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
  const access = fs.readFileSync(path.join(root, 'access.js'), 'utf8');
  assert.match(order, /id="hPurge"/);
  assert.match(order, /id="modalHistoryPurge"/);
  assert.match(order, /id="hpFrom"/);
  assert.match(order, /id="hpTo"/);
  assert.match(order, /id="hpPin"/);
  assert.match(main, /BK_UI\.openHistoryPurge/);
  assert.match(access, /history_purge:'owner'/);
  assert.match(ui, /function deleteHistoryRemote/);
  assert.match(ui, /authorizeOwnerPin\(pin\)/);
  assert.match(ui, /selectedHistoryPurgeEntries/);
});

test('daily sales shows and exports purchase audit with date and purchaser', () => {
  const shift = fs.readFileSync(path.join(root, 'shift.html'), 'utf8');
  const shiftJs = fs.readFileSync(path.join(root, 'shift.js'), 'utf8');
  const shiftReports = fs.readFileSync(path.join(root, 'shift_reports.js'), 'utf8');
  const stock = fs.readFileSync(path.join(root, 'stock.js'), 'utf8');
  assert.match(shift, /purchaseHistoryExport/);
  assert.match(shiftJs, /function exportPurchaseHistory/);
  assert.match(shiftJs, /purchaser.*item.*quantity.*amount_ghs/);
  assert.match(shiftReports, /Purchase audit/);
  assert.match(shiftReports, /staffName/);
  assert.match(shiftReports, /purchasedAt/);
  assert.match(stock, /database\.ref\(paths\.purchases\)\.get\(\)/);
});

test('stock overview has search and sorted results', () => {
  assert.match(ui, /stockOverviewSearch/);
  assert.match(ui, /stockOverviewQuery/);
  assert.match(ui, /localeCompare/);
});

test('stock overview, void reason and group order dialogs avoid inline HTML templates', () => {
  const stockOverview = ui.slice(ui.indexOf('function renderStock'), ui.indexOf('function openReceipt'));
  const voidReason = ui.slice(ui.indexOf('function requestVoidReason'), ui.indexOf('function voidHistoryOrder'));
  const groupDialog = ui.slice(ui.indexOf('function openGroup'), ui.indexOf('function closeGroup'));
  assert.doesNotMatch(stockOverview, /host\.innerHTML\s*=|row\.innerHTML\s*=/);
  assert.doesNotMatch(voidReason, /appDialogBody'\)\.innerHTML/);
  assert.doesNotMatch(groupDialog, /body\.innerHTML|row\.innerHTML/);
  assert.match(stockOverview, /host\.replaceChildren\(summary, filters, list\)/);
  assert.match(voidReason, /presetSelect\.appendChild\(optionNode/);
  assert.match(groupDialog, /input\.onchange = event=> toggleGroup/);
});


test('payment card renders dynamic payment copy without innerHTML or inline handlers', () => {
  const renderPay = ui.slice(ui.indexOf('function renderPay()'), ui.indexOf('function continueFromPayment'));
  assert.doesNotMatch(renderPay, /card\.innerHTML\s*=/);
  assert.doesNotMatch(renderPay, /onclick="BK_UI\.requestSlotPayment/);
  assert.match(renderPay, /orderTitle\.textContent = `Order #\$\{shortOrderNumber\(s\.orderNo\)\}`/);
  assert.match(renderPay, /amountDueValue\.textContent = `\$\{amountDue\} GHS`/);
  assert.match(renderPay, /summaryTitle\.textContent = payment\.label/);
  assert.match(renderPay, /button\.onclick = \(\)=> requestSlotPayment\(active, method, provider\)/);
});


test('handover card renders dynamic readiness copy without innerHTML templates', () => {
  const renderIssue = ui.slice(ui.indexOf('function renderIssue()'), ui.indexOf('function goTab'));
  assert.doesNotMatch(renderIssue, /card\.innerHTML\s*=/);
  assert.match(renderIssue, /orderTitle\.textContent = `Order #\$\{shortOrderNumber\(s\.orderNo\)\}`/);
  assert.match(renderIssue, /payStatus\.textContent = `\$\{s\.pay !== 'unpaid' \? '✓' : '○'\} \$\{paymentLabel\(s\.pay\)\}`/);
  assert.match(renderIssue, /packagingValue\.textContent = packagingLabel\(s\)/);
  assert.match(renderIssue, /readinessTitle\.textContent = readiness\.label/);
  assert.match(renderIssue, /riderMissedButton\.onclick = \(\)=> convertOnlineOrder\(active\)/);
});



test('history purge list renders rows with DOM text nodes', () => {
  const renderPurge = ui.slice(ui.indexOf('function renderHistoryPurgeList()'), ui.indexOf('function openHistoryPurge'));
  assert.doesNotMatch(renderPurge, /list\.innerHTML\s*=/);
  assert.match(renderPurge, /list\.textContent = ''/);
  assert.match(renderPurge, /row\.className = 'history-purge-row'/);
  assert.match(renderPurge, /order\.textContent = entry\.orderNo \|\| ''/);
  assert.match(renderPurge, /meta\.textContent = `\$\{entry\.externalOrderNo \|\| entry\.slotName \|\| ''\} · \$\{paymentLabel\(entry\.pay\)\} ·/);
});
