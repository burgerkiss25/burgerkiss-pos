const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const appFiles = fs.readdirSync(root)
  .filter(file => /\.(?:html|js)$/.test(file));

const disallowedGermanTerms = [
  'Auffüllen',
  'Bestellung',
  'Geräte',
  'Konfiguration',
  'Menüregeln',
  'Produkte',
  'gespiegelt',
  'Speichern',
  'Zutaten',
  'Zurück'
];

for(const file of appFiles){
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  for(const term of disallowedGermanTerms){
    assert.ok(
      !source.includes(term),
      `${file} must use English-only interface text; found "${term}".`
    );
  }
}

console.log(`English-only interface check passed for ${appFiles.length} app files.`);
