const assert = require('assert');
const fs = require('fs');

const ui = fs.readFileSync('ui.js', 'utf8');
const state = fs.readFileSync('state.js', 'utf8');
const css = fs.readFileSync('style.css', 'utf8');

assert(state.includes('function normalizeAmendment'), 'state normalizes kitchen amendment records');
assert(state.includes('function addKitchenAmendment'), 'state exposes an emergency kitchen note writer');
assert(state.includes('!slot.sentToKitchen'), 'kitchen notes are blocked until the order is sent to kitchen');
assert(state.includes('slot.issued'), 'kitchen notes are blocked for issued orders');
assert(ui.includes('EMERGENCY_NOTE_CHIPS'), 'kitchen note dialog has quick note chips');
assert(ui.includes('function openKitchenNoteDialog'), 'kitchen view can open an emergency note dialog');
assert(ui.includes('settings.kitchen && slot && slot.sentToKitchen && !slot.issued'), 'note button is only rendered in kitchen for sent, unissued orders');
assert(ui.includes('renderKitchenAmendments'), 'kitchen amendments are rendered in the kitchen entries');
assert(css.includes('.kitchen-amendment'), 'emergency kitchen notes have visible styling');
