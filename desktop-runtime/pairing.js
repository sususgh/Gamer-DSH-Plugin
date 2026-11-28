import { createHash, randomBytes, timingSafeEqual, randomUUID } from 'node:crypto';

const DEFAULT_TTL_MS = 5 * 60 * 1000;

export class PairingManager {
  #active = null;

  constructor({ ttlMs = DEFAULT_TTL_MS } = {}) {
    if (!Number.isInteger(ttlMs) || ttlMs < 10_000 || ttlMs > 15 * 60 * 1000) {
      throw new RangeError('ttlMs must be between 10 seconds and 15 minutes');
    }
    this.ttlMs = ttlMs;
    this.instanceId = randomUUID();
  }

  create({ host, port, protocol = 'gamer-runtime/1' }) {
    if (typeof host !== 'string' || !host.trim()) throw new TypeError('A LAN host address is required');
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new RangeError('Invalid port');
    if (protocol !== 'gamer-runtime/1') throw new TypeError('Unsupported pairing protocol');

    const token = randomBytes(32).toString('base64url');
    const now = Date.now();
    this.#active = {
      tokenHash: createHash('sha256').update(token).digest(),
      createdAt: now,
      expiresAt: now + this.ttlMs,
      host,
      port,
      protocol,
    };

    return {
      token,
      protocol,
      instanceId: this.instanceId,
      host,
      port,
      createdAt: now,
      expiresAt: now + this.ttlMs,
    };
  }

  verify(token, { consume = false } = {}) {
    const current = this.#active;
    if (!current || Date.now() >= current.expiresAt || typeof token !== 'string') {
      if (current && Date.now() >= current.expiresAt) this.#active = null;
      return false;
    }

    const candidate = createHash('sha256').update(token).digest();
    const valid = candidate.length === current.tokenHash.length
      && timingSafeEqual(candidate, current.tokenHash);

    if (valid && consume) this.#active = null;
    return valid;
  }

  status() {
    if (this.#active && Date.now() >= this.#active.expiresAt) this.#active = null;
    if (!this.#active) return { active: false, expiresAt: null, host: null, port: null };
    return {
      active: true,
      createdAt: this.#active.createdAt,
      expiresAt: this.#active.expiresAt,
      remainingMs: Math.max(0, this.#active.expiresAt - Date.now()),
      host: this.#active.host,
      port: this.#active.port,
    };
  }

  stop() {
    this.#active = null;
    return this.status();
  }
}
