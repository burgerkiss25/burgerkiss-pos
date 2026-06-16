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
  assert.match(css, /\.workflow-pay \.hud-rows,\.workflow-pay \.catbar,\.workflow-pay \.totals,\.workflow-pay \.more-menu/);
  assert.match(css, /\.workflow-issue \.hud-rows,\.workflow-issue \.catbar,\.workflow-issue \.totals,\.workflow-issue \.more-menu/);
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

test('stock overview has search and sorted results', () => {
  assert.match(ui, /stockOverviewSearch/);
  assert.match(ui, /stockOverviewQuery/);
  assert.match(ui, /localeCompare/);
});
