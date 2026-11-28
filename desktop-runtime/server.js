import http from 'node:http';
import { createHash, randomBytes } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';
import { PairingManager } from './pairing.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const UI_ROOT = path.join(ROOT, 'desktop-ui');
const PORT = Number.parseInt(process.env.GAMER_PORT || '8765', 10);
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  console.error('[gamer-desktop] Invalid GAMER_PORT. Use an integer from 1 to 65535.');
  process.exit(1);
}
const manager = new PairingManager();
const pairedSessions = new Map();
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function isPrivateIPv4(address) {
  const parts = address.split('.').map(Number);
  if (parts.length !== 4 || parts.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  return parts[0] === 10
    || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)
    || (parts[0] === 192 && parts[1] === 168)
    || (parts[0] === 169 && parts[1] === 254);
}

function getLanAddresses() {
  const found = [];
  for (const [name, entries] of Object.entries(os.networkInterfaces())) {
    for (const item of entries || []) {
      if (item.family === 'IPv4' && !item.internal && isPrivateIPv4(item.address)) {
        found.push({ name, address: item.address });
      }
    }
  }
  return found;
}

function isLoopback(remoteAddress = '') {
  return remoteAddress === '127.0.0.1'
    || remoteAddress === '::1'
    || remoteAddress === '::ffff:127.0.0.1';
}

function sendJson(res, status, value) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  });
  res.end(JSON.stringify(value));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 8_192) {
        reject(new Error('Request body too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch { reject(new Error('Invalid JSON body')); }
    });
    req.on('error', reject);
  });
}

function pairLandingPage(valid) {
  const title = valid ? 'Gamer 配对码已识别' : 'Gamer 配对码无效或已过期';
  const detail = valid
    ? '电脑端已生成真实配对二维码。下一步需要安装 Gamer Android Companion，才能提交设备身份并完成双端认证。当前尚未建立连接。'
    : '请回到电脑端重新生成二维码，再使用 Gamer 手机伴侣扫码。';
  return `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>${title}</title><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#edf5fa;color:#30465d;font:16px system-ui,'Noto Sans SC',sans-serif"><main style="max-width:480px;margin:24px;padding:28px;border-radius:20px;background:#fff;box-shadow:0 12px 40px #496b841c"><h2>${title}</h2><p style="line-height:1.8;color:#71869a">${detail}</p><small style="color:#9aa9b5">Gamer · gamer-runtime/1</small></main></body></html>`;
}

async function handle(req, res) {
  const url = new URL(req.url, 'http://127.0.0.1');
  const origin = req.headers.origin;
  const allowedOrigin = !origin || (() => {
    try {
      const parsed = new URL(origin);
      const host = parsed.hostname.toLowerCase();
      return host === 'deepseek.com' || host.endsWith('.deepseek.com')
        || host === 'localhost' || host === '127.0.0.1';
    } catch { return false; }
  })();
  if (origin && allowedOrigin) {
    res.setHeader('access-control-allow-origin', origin);
    res.setHeader('vary', 'Origin');
  }
  if (url.pathname.startsWith('/api/') && origin && !allowedOrigin) {
    return sendJson(res, 403, { error: 'ORIGIN_NOT_ALLOWED' });
  }
  if (url.pathname.startsWith('/api/') && req.method === 'OPTIONS') {
    if (!allowedOrigin) return sendJson(res, 403, { error: 'ORIGIN_NOT_ALLOWED' });
    res.writeHead(204, {
      'access-control-allow-methods': 'GET, POST, OPTIONS',
      'access-control-allow-headers': 'content-type',
      'access-control-allow-private-network': 'true',
      'access-control-max-age': '600',
      'cache-control': 'no-store',
      'vary': 'Origin',
    });
    return res.end();
  }
  res.setHeader('x-content-type-options', 'nosniff');
  res.setHeader('referrer-policy', 'no-referrer');
  res.setHeader('cache-control', 'no-store');

  if (url.pathname === '/api/network/interfaces' && req.method === 'GET') {
    return sendJson(res, 200, { addresses: getLanAddresses() });
  }

  if (url.pathname === '/api/pairing/status' && req.method === 'GET') {
    return sendJson(res, 200, manager.status());
  }

  if (url.pathname === '/api/pairing/start' && req.method === 'POST') {
    if (!isLoopback(req.socket.remoteAddress)) {
      return sendJson(res, 403, { error: 'PAIRING_CONTROL_LOCAL_ONLY' });
    }
    let body;
    try { body = await readJson(req); }
    catch (error) { return sendJson(res, 400, { error: error.message }); }

    const addresses = getLanAddresses();
    if (!addresses.length) return sendJson(res, 400, { error: 'NO_PRIVATE_LAN_IPV4' });
    const requestedHost = body.host;
    const selected = addresses.find(item => item.address === requestedHost);
    const host = selected?.address || null;
    if (!host) return sendJson(res, 400, { error: 'INVALID_LAN_ADDRESS', addresses });

    const pairing = manager.create({ host, port: PORT });
    const pairingUrl = new URL('/pair', `http://${host}:${PORT}`);
    pairingUrl.searchParams.set('protocol', pairing.protocol);
    pairingUrl.searchParams.set('instance_id', pairing.instanceId);
    pairingUrl.searchParams.set('token', pairing.token);
    const qrDataUrl = await QRCode.toDataURL(pairingUrl.toString(), {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 360,
      color: { dark: '#26394a', light: '#ffffff' },
    });

    return sendJson(res, 200, {
      active: true,
      host,
      port: PORT,
      instanceId: pairing.instanceId,
      createdAt: pairing.createdAt,
      expiresAt: pairing.expiresAt,
      qrDataUrl,
      message: 'QR generated. Scanning is not the same as a completed device pairing.',
    });
  }

  if (url.pathname === '/api/pairing/claim' && req.method === 'POST') {
    let body;
    try { body = await readJson(req); }
    catch (error) { return sendJson(res, 400, { error: error.message }); }
    if (body.protocol !== 'gamer-runtime/1' || body.instance_id !== manager.instanceId
      || typeof body.device_id !== 'string' || body.device_id.length < 8 || body.device_id.length > 128
      || typeof body.device_name !== 'string' || body.device_name.length > 120) {
      return sendJson(res, 400, { error: 'INVALID_PAIRING_REQUEST' });
    }
    if (!manager.verify(body.token, { consume: true })) {
      return sendJson(res, 410, { error: 'PAIRING_TOKEN_INVALID_EXPIRED_OR_USED' });
    }
    const sessionId = randomBytes(18).toString('base64url');
    const sessionToken = randomBytes(32).toString('base64url');
    pairedSessions.set(sessionId, {
      tokenHash: createHash('sha256').update(sessionToken).digest('hex'),
      deviceId: body.device_id,
      deviceName: body.device_name,
      createdAt: Date.now(),
      lastSeenAt: Date.now(),
    });
    return sendJson(res, 200, {
      paired: true,
      protocol: 'gamer-runtime/1',
      instanceId: manager.instanceId,
      sessionId,
      sessionToken,
      device: { id: body.device_id, name: body.device_name },
      capabilities: { pairing: true, heartbeat: true, screenCapture: false, inputControl: false, modelInference: false },
    });
  }

  if (url.pathname === '/api/pairing/heartbeat' && req.method === 'POST') {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    const hash = createHash('sha256').update(token).digest('hex');
    const entry = [...pairedSessions.entries()].find(([, value]) => value.tokenHash === hash);
    if (!entry) return sendJson(res, 401, { error: 'SESSION_UNAUTHORIZED' });
    entry[1].lastSeenAt = Date.now();
    return sendJson(res, 200, { connected: true, sessionId: entry[0], serverTime: Date.now() });
  }

  if (url.pathname === '/api/pairing/stop' && req.method === 'POST') {
    if (!isLoopback(req.socket.remoteAddress)) {
      return sendJson(res, 403, { error: 'PAIRING_CONTROL_LOCAL_ONLY' });
    }
    manager.stop();
    pairedSessions.clear();
    return sendJson(res, 200, { active: false, sessionsRevoked: true });
  }

  if (url.pathname === '/pair' && req.method === 'GET') {
    const valid = url.searchParams.get('protocol') === 'gamer-runtime/1'
      && url.searchParams.get('instance_id') === manager.instanceId
      && manager.verify(url.searchParams.get('token'));
    res.writeHead(valid ? 200 : 410, {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    });
    return res.end(pairLandingPage(valid));
  }

  if (url.pathname.startsWith('/api/')) {
    return sendJson(res, 404, { error: 'NOT_FOUND' });
  }

  const requested = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
  const target = path.resolve(UI_ROOT, '.' + requested);
  if (!target.startsWith(UI_ROOT + path.sep) && target !== path.join(UI_ROOT, 'index.html')) {
    return sendJson(res, 403, { error: 'PATH_NOT_ALLOWED' });
  }
  try {
    const content = await readFile(target);
    res.writeHead(200, {
      'content-type': MIME[path.extname(target)] || 'application/octet-stream',
      'cache-control': 'no-cache',
    });
    res.end(content);
  } catch {
    sendJson(res, 404, { error: 'NOT_FOUND' });
  }
}

const server = http.createServer((req, res) => {
  Promise.resolve(handle(req, res)).catch(error => {
    console.error('[gamer-desktop] request failed:', error.message);
    if (!res.headersSent) sendJson(res, 500, { error: 'INTERNAL_ERROR' });
    else res.end();
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const addresses = getLanAddresses();
  console.log(`Gamer Desktop UI: http://127.0.0.1:${PORT}`);
  if (addresses.length) {
    for (const item of addresses) console.log(`Phone LAN URL: http://${item.address}:${PORT}`);
  } else {
    console.warn('No private IPv4 LAN address found. QR pairing will use loopback and cannot be reached by a phone.');
  }
  console.log('Pairing QR tokens expire in 5 minutes. Pairing control endpoints accept loopback requests only.');
});

function shutdown() {
  manager.stop();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 3_000).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
