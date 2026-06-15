const assert = require('assert');
const fs = require('fs');

const admin = fs.readFileSync('admin.js', 'utf8');
const css = fs.readFileSync('style.css', 'utf8');

assert.match(admin, /function editorSnapshot/);
assert.match(admin, /function updateEditorDirtyState/);
assert.match(admin, /function trackEditor/);
assert.match(admin, /function activeDirtyEditor/);
assert.match(admin, /function guardWorkspaceChange/);
assert.match(admin, /Discard unsaved changes\?/);
assert.match(admin, /beforeunload/);
assert.match(admin, /MutationObserver/);
assert.match(admin, /closeEditorSafely/);
assert.match(admin, /if\(await saveWithFeedback/);
assert.match(admin, /trackEditor\('modalCatalog'\)/);
assert.match(css, /\.workspace-dirty-state\.dirty/);

console.log('Admin workspace dirty-state checks passed.');
