const ACTIONS = new Set(['tap', 'swipe', 'key', 'wait']);

export class SafetyGate {
  #stopped = true;
  #paired = false;
  #permissions = new Set();

  setPaired(value) { this.#paired = value === true; }
  grant(permission) { this.#permissions.add(permission); }
  revoke(permission) { this.#permissions.delete(permission); }
  stop() { this.#stopped = true; }
  arm() {
    if (!this.#paired) throw new Error('DEVICE_NOT_PAIRED');
    if (!this.#permissions.has('input')) throw new Error('INPUT_PERMISSION_REQUIRED');
    this.#stopped = false;
  }
  get stopped() { return this.#stopped; }

  validate(action) {
    if (this.#stopped) throw new Error('AGENT_STOPPED');
    if (!this.#paired) throw new Error('DEVICE_NOT_PAIRED');
    if (!action || typeof action !== 'object' || !ACTIONS.has(action.type)) {
      throw new Error('ACTION_TYPE_NOT_ALLOWED');
    }
    if (action.type === 'tap') {
      for (const key of ['x', 'y']) {
        if (!Number.isFinite(action[key]) || action[key] < 0 || action[key] > 1) {
          throw new Error('INVALID_NORMALIZED_COORDINATE');
        }
      }
    } else if (action.type === 'swipe') {
      for (const key of ['x1', 'y1', 'x2', 'y2']) {
        if (!Number.isFinite(action[key]) || action[key] < 0 || action[key] > 1) {
          throw new Error('INVALID_NORMALIZED_COORDINATE');
        }
      }
      if (!Number.isInteger(action.durationMs) || action.durationMs < 50 || action.durationMs > 3000) {
        throw new Error('INVALID_ACTION_DURATION');
      }
    } else if (action.type === 'key') {
      if (typeof action.key !== 'string' || !/^[A-Z0-9_]{1,24}$/.test(action.key)) {
        throw new Error('INVALID_KEY');
      }
    } else if (action.type === 'wait') {
      if (!Number.isInteger(action.durationMs) || action.durationMs < 0 || action.durationMs > 5000) {
        throw new Error('INVALID_ACTION_DURATION');
      }
    }
    return Object.freeze({ ...action });
  }
}
