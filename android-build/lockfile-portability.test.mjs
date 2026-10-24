import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('locked dependencies are portable to public GitHub runners', () => {
  const lock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'));
  for (const [name, entry] of Object.entries(lock.packages)) {
    if (!entry.resolved) continue;
    const url = new URL(entry.resolved);
    assert.ok(!url.username && !url.password, `${name} must not contain registry credentials`);
    assert.equal(url.protocol, 'https:', `${name} must use HTTPS`);
    assert.equal(url.hostname, 'registry.npmjs.org', `${name} must not depend on a private build-environment registry`);
    assert.ok(entry.integrity, `${name} must retain its package integrity checksum`);
  }
});
