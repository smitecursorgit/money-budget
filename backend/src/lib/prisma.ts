import { PrismaClient, Prisma } from '@prisma/client';

function buildUrl(): string {
  const url = process.env.DATABASE_URL ?? '';
  if (!url) return '';
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}connect_timeout=30&pool_timeout=30&socket_timeout=30`;
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function isRetryable(err: unknown): boolean {
  const msg = String((err as { message?: string })?.message ?? '');
  const code = (err as { code?: string })?.code;
  return (
    msg.includes('ConnectorError') ||
    msg.includes('connection') ||
    msg.includes('timed out') ||
    msg.includes('Connection refused') ||
    msg.includes('ECONNREFUSED') ||
    msg.includes('socket') ||
    msg.includes('prepared statement') ||
    code === 'P2024' ||
    code === 'P2010'
  );
}

function createPrismaClient(): PrismaClient {
  const c = new PrismaClient({
    datasources: { db: { url: buildUrl() } },
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
  c.$use(async (params, next) => {
    try {
      return await next(params);
    } catch (err) {
      if (isRetryable(err)) {
        console.warn(`[prisma] ${params.model}.${params.action} ConnectorError — retrying...`);
        await new Promise((r) => setTimeout(r, 1500));
        try {
          await c.$connect();
        } catch {
          /* reconnect */
        }
        return await next(params);
      }
      throw err;
    }
  });
  return c;
}

const client = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = client;
}

/**
 * Manual retry wrapper (kept for critical multi-query operations like Promise.all).
 */
export async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (isRetryable(err)) {
      console.warn('[prisma] withRetry — retrying batch...');
      await new Promise((r) => setTimeout(r, 1500));
      try { await client.$connect(); } catch { /* ignore */ }
      return await fn();
    }
    throw err;
  }
}

export async function warmUpConnection(): Promise<void> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await client.$connect();
      await client.$queryRaw(Prisma.sql`SELECT 1`);
      console.log('[prisma] DB connection OK');
      return;
    } catch (err) {
      console.warn(`[prisma] warmup attempt ${attempt}/3 failed:`, (err as Error).message?.slice(0, 80));
      if (attempt < 3) await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
  console.error('[prisma] warmup: could not establish DB connection after 3 attempts');
}

export const prisma = client;
