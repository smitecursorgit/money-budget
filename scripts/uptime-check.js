#!/usr/bin/env node
/**
 * Uptime check: пингует /health и выводит результат.
 * Использование: node scripts/uptime-check.js [URL]
 * Пример: node scripts/uptime-check.js https://money-budget-backend.onrender.com
 */

const BASE_URL = process.argv[2] || process.env.API_URL || 'http://localhost:3001';
const TIMEOUT_MS = 65000; // Render cold start ~50s

async function check() {
  const url = `${BASE_URL.replace(/\/$/, '')}/health`;
  const start = Date.now();

  try {
    const res = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const elapsed = Date.now() - start;
    const data = await res.json().catch(() => ({}));

    if (res.ok && data.status === 'ok') {
      console.log(`✓ OK | ${elapsed}ms | ${data.ts || ''}`);
      process.exit(0);
    } else {
      console.error(`✗ FAIL | ${res.status} | ${data.error || res.statusText} | ${elapsed}ms`);
      process.exit(1);
    }
  } catch (err) {
    const elapsed = Date.now() - start;
    const msg = err.cause?.code === 'TIMEOUT_ABORT' ? 'timeout' : err.message;
    console.error(`✗ ERROR | ${msg} | ${elapsed}ms`);
    process.exit(1);
  }
}

check();
