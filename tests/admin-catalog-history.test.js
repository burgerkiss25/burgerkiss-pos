const assert = require('assert');
const fs = require('fs');

const catalog = fs.readFileSync('catalog.js', 'utf8');
const css = fs.readFileSync('style.css', 'utf8');
const html = fs.readFileSync('admin.html', 'utf8');

assert.match(catalog, /HISTORY_KEY = 'bk_catalog_history_v1'/);
assert.match(catalog, /function buildAuditEvent/);
assert.match(catalog, /BK_ACCESS\.actor/);
assert.match(catalog, /action:'created'/);
assert.match(catalog, /: 'updated'/);
assert.match(catalog, /action:'deleted'/);
assert.match(catalog, /\/pos\/catalog\/history\/\$\{auditEvent\.id\}/);
assert.match(catalog, /function loadRemoteHistory/);
assert.match(catalog, /limitToLast\(100\)/);
assert.match(catalog, /function productHistory/);
assert.match(catalog, /catalog-history-list/);
assert.match(css, /\.catalog-history-list/);
assert.match(html, /catalog\.js\?v=6/);

console.log('Catalog audit history checks passed.');
