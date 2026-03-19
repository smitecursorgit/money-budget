#!/usr/bin/env node
/**
 * Uptime тесты между фронтом и бэком:
 * 1. Health — бэкенд жив, БД доступна
 * 2. Auth (dev) — логин с initData: 'dev' (только при NODE_ENV !== production)
 * 3. Stats — /stats/summary с Bearer токеном (проверка защищённого API)
 *
 * Использование:
 *   node scripts/uptime-frontend-backend.js [BACKEND_URL]
 *   BACKEND_URL=https://... node scripts/uptime-frontend-backend.js
 *   node scripts/uptime-frontend-backend.js --dev  # принудительно полный flow (auth+stats)
 *
 * В production auth(dev) пропускается — проверяется только health.
 */

const args = process.argv.slice(2).filter((a) => a !== '--dev' && !a.startsWith('-'));
const BASE_URL = (args[0] || process.env.API_URL || process.env.BACKEND_URL || 'http://localhost:3001').replace(
  /\/$/,
  ''
);

const FORCE_DEV = process.argv.includes('--dev');
const TIMEOUT_MS = 65000;

const results = [];

async function fetchJson(url, options = {}) {
  const { body, ...rest } = options;
  const res = await fetch(url, {
    ...rest,
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...(body && { body: typeof body === 'string' ? body : JSON.stringify(body) }),
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

async function run(name, fn) {
  const start = Date.now();
  try {
    await fn();
    const elapsed = Date.now() - start;
    results.push({ name, ok: true, elapsed });
    console.log(`  ✓ ${name} | ${elapsed}ms`);
    return true;
  } catch (err) {
    const elapsed = Date.now() - start;
    const msg = err.cause?.code === 'TIMEOUT_ABORT' ? 'timeout' : err.message;
    results.push({ name, ok: false, error: msg, elapsed });
    console.error(`  ✗ ${name} | ${msg} | ${elapsed}ms`);
    return false;
  }
}

async function main() {
  console.log(`\nUptime: frontend ↔ backend\nBackend: ${BASE_URL}\n`);

  // 1. Health
  const healthOk = await run('health', async () => {
    const { res, data } = await fetchJson(`${BASE_URL}/health`);
    if (!res.ok || data.status !== 'ok') {
      throw new Error(data.error || `HTTP ${res.status}`);
    }
  });

  if (!healthOk) {
    console.error('\n✗ Health failed — backend unavailable\n');
    process.exit(1);
  }

  // 2. Auth (dev) + Stats — только если бэкенд в dev или --dev
  const tryFullFlow = FORCE_DEV || process.env.NODE_ENV !== 'production';

  if (tryFullFlow) {
    let token = null;

    const authOk = await run('auth (dev)', async () => {
      const { res, data } = await fetchJson(`${BASE_URL}/auth`, {
        method: 'POST',
        body: { initData: 'dev' },
      });
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      if (!data.token) throw new Error('No token in response');
      token = data.token;
    });

    if (authOk && token) {
      await run('stats/summary', async () => {
        const { res, data } = await fetchJson(`${BASE_URL}/stats/summary`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          throw new Error(data.error || `HTTP ${res.status}`);
        }
        if (typeof data.income !== 'number' && typeof data.expense !== 'number') {
          throw new Error('Invalid stats response');
        }
      });
    }
  } else {
    console.log('  (auth+stats skipped — production mode, use --dev for full flow)\n');
  }

  const failed = results.filter((r) => !r.ok);
  const total = results.reduce((a, r) => a + r.elapsed, 0);

  console.log(`\n---\nTotal: ${total}ms | ${failed.length ? '✗ FAIL' : '✓ OK'}\n`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
