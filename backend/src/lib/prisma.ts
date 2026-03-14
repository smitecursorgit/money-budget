import { PrismaClient } from '@prisma/client';

/**
 * Supabase uses PgBouncer in transaction mode which does NOT support
 * PostgreSQL prepared statements. Adding ?pgbouncer=true tells Prisma
 * to use simple query protocol (no prepared statements) in production.
 * connection_limit=5 lets PgBouncer manage the actual pooling.
 */
function buildDatabaseUrl(): string {
  const url = process.env.DATABASE_URL ?? '';
  if (process.env.NODE_ENV === 'production' && url && !url.includes('pgbouncer')) {
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}pgbouncer=true&connection_limit=5`;
  }
  return url;
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: { db: { url: buildDatabaseUrl() } },
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
