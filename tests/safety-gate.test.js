import test from 'node:test';
import assert from 'node:assert/strict';
import { SafetyGate } from '../desktop-runtime/engine/safety-gate.js';

test('engine is stopped by default and requires pairing plus input permission', () => {
  const gate = new SafetyGate();
  assert.throws(() => gate.arm(), /DEVICE_NOT_PAIRED/);
  gate.setPaired(true);
  assert.throws(() => gate.arm(), /INPUT_PERMISSION_REQUIRED/);
  gate.grant('input');
  gate.arm();
  assert.equal(gate.stopped, false);
});

test('validates bounded actions and rejects out-of-range coordinates', () => {
  const gate = new SafetyGate();
  gate.setPaired(true); gate.grant('input'); gate.arm();
  assert.deepEqual(gate.validate({ type: 'tap', x: 0.5, y: 0.2 }), { type: 'tap', x: 0.5, y: 0.2 });
  assert.throws(() => gate.validate({ type: 'tap', x: 1.5, y: 0.2 }), /INVALID_NORMALIZED_COORDINATE/);
  assert.throws(() => gate.validate({ type: 'shell', command: 'rm -rf /' }), /ACTION_TYPE_NOT_ALLOWED/);
});

test('emergency stop blocks subsequent actions immediately', () => {
  const gate = new SafetyGate();
  gate.setPaired(true); gate.grant('input'); gate.arm(); gate.stop();
  assert.equal(gate.stopped, true);
  assert.throws(() => gate.validate({ type: 'wait', durationMs: 10 }), /AGENT_STOPPED/);
});
