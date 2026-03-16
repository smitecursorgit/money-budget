import { PrismaClient } from '@prisma/client';

/**
 * Use DATABASE_URL as-is. Do NOT add pgbouncer=true — Prisma 5 works better without it
 * for both Render Postgres and Supabase. Adding it caused "connection closed" / 500 errors.
 */
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL ?? '' } },
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
