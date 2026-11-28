import test from 'node:test';
import assert from 'node:assert/strict';
import { PairingManager } from '../desktop-runtime/pairing.js';

test('creates a short-lived single-use pairing token', () => {
  const manager = new PairingManager({ ttlMs: 10_000 });
  const pairing = manager.create({ host: '192.168.1.20', port: 8765 });
  assert.equal(pairing.protocol, 'gamer-runtime/1');
  assert.equal(manager.verify(pairing.token), true);
  assert.equal(manager.verify('not-the-token'), false);
  assert.equal(manager.verify(pairing.token, { consume: true }), true);
  assert.equal(manager.verify(pairing.token), false);
  assert.equal(manager.status().active, false);
});

test('rejects invalid pairing parameters', () => {
  const manager = new PairingManager();
  assert.throws(() => manager.create({ host: '', port: 8765 }), /host address/);
  assert.throws(() => manager.create({ host: '192.168.1.20', port: 0 }), /port/);
  assert.throws(() => manager.create({ host: '192.168.1.20', port: 8765, protocol: 'v0' }), /protocol/);
});

test('expires tokens and can revoke them', async () => {
  const manager = new PairingManager({ ttlMs: 10_000 });
  const pairing = manager.create({ host: '192.168.1.20', port: 8765 });
  manager.stop();
  assert.equal(manager.verify(pairing.token), false);
  assert.equal(manager.status().active, false);
});
