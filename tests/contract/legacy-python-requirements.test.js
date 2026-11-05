'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const manifestPath = path.resolve(__dirname, '../../python/requirements.txt');

function readLegacyPins() {
  const manifest = fs.readFileSync(manifestPath, 'utf8');
  assert.ok(manifest.startsWith('\uFEFF'), 'legacy UTF-8 BOM must remain intact');
  assert.ok(manifest.endsWith('\n'), 'legacy requirements must retain a final newline');
  const pins = manifest.slice(1).split(/\r?\n/).filter(Boolean);
  const names = pins.map((pin) => {
    assert.match(pin, /^[A-Za-z0-9][A-Za-z0-9_.-]*==[^\s#]+$/, `invalid pinned requirement: ${pin}`);
    return pin.split('==', 1)[0].toLowerCase().replace(/[-_.]+/g, '-');
  });
  assert.strictEqual(new Set(names).size, names.length, 'legacy manifest must not contain duplicate distributions');
  return names;
}

test('legacy Python requirements remain a parseable, uniquely pinned snapshot', () => {
  assert.ok(readLegacyPins().length > 0);
});

test('detached Aider does not reappear as a legacy Python dependency', () => {
  const names = readLegacyPins();
  assert.ok(!names.includes('aider'), 'historic aider must not be reintroduced');
  assert.ok(!names.includes('aider-chat'), 'aider-chat is not an authorized replacement');
});
