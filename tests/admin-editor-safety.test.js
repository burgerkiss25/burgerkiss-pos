const assert = require('assert');
const fs = require('fs');

const html = fs.readFileSync('admin.html', 'utf8');
const js = fs.readFileSync('admin.js', 'utf8');
const css = fs.readFileSync('style.css', 'utf8');

assert.match(html, /id="adminConfirmModal"/);
assert.match(html, /id="adminToastRegion"/);
assert.match(js, /function saveWithFeedback/);
assert.match(js, /function resetWithConfirmation/);
assert.match(js, /Large threshold must be greater than the medium threshold/);
assert.match(js, /type="number" min="0" step="1"/);
assert.match(js, /Packaging preview/);
assert.match(css, /\.admin-toast/);
assert.match(css, /\.packaging-rule-error/);

console.log('Admin editor safety checks passed.');
