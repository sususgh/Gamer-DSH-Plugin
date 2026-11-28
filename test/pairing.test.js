import test from 'node:test';
import assert from 'node:assert/strict';
import { PairingManager } from '../desktop-runtime/pairing.js';

test('creates a short-lived pairing token and exposes no token in status', () => {
  const manager = new PairingManager({ ttlMs: 60_000 });
  const pairing = manager.create({ host: '192.168.1.20', port: 8765 });
  assert.equal(pairing.protocol, 'gamer-runtime/1');
  assert.equal(pairing.host, '192.168.1.20');
  assert.equal(manager.verify(pairing.token), true);
  assert.equal(manager.status().active, true);
  assert.equal(Object.hasOwn(manager.status(), 'token'), false);
});

test('rejects invalid tokens and supports one-time consumption', () => {
  const manager = new PairingManager();
  const pairing = manager.create({ host: '192.168.1.20', port: 8765 });
  assert.equal(manager.verify('not-the-token'), false);
  assert.equal(manager.verify(pairing.token, { consume: true }), true);
  assert.equal(manager.verify(pairing.token), false);
  assert.equal(manager.status().active, false);
});

test('expires tokens and stops an active pairing', async () => {
  const manager = new PairingManager({ ttlMs: 10_000 });
  const pairing = manager.create({ host: '192.168.1.20', port: 8765 });
  manager.stop();
  assert.equal(manager.verify(pairing.token), false);
  assert.equal(manager.status().active, false);
});
