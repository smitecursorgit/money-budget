import 'dotenv/config';
import { getTelegramWebhookSecret } from './lib/env';

// Validate required env vars at startup to fail fast
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is required');
  process.exit(1);
}
if (!process.env.TELEGRAM_BOT_TOKEN) {
  console.error('FATAL: TELEGRAM_BOT_TOKEN environment variable is required');
  process.exit(1);
}
if (process.env.NODE_ENV === 'production' && !getTelegramWebhookSecret()) {
  console.error(
    'FATAL: TELEGRAM_WEBHOOK_SECRET (or telegram_webhook_secret) is required in production (webhook auth)'
  );
  process.exit(1);
}

import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import rateLimit from 'express-rate-limit';

// Prevent the process from crashing on unhandled async errors
process.on('unhandledRejection', (reason: unknown) => {
  console.error('Unhandled Promise rejection:', reason);
});

process.on('uncaughtException', (err: Error) => {
  console.error('Uncaught exception:', err.message, err.stack);
  process.exit(1);
});

import authRouter from './routes/auth';
import budgetsRouter from './routes/budgets';
import voiceRouter from './routes/voice';
import transactionsRouter from './routes/transactions';
import categoriesRouter from './routes/categories';
import statsRouter from './routes/stats';
import remindersRouter from './routes/reminders';
import settingsRouter from './routes/settings';
import assistantChatRouter from './routes/assistantChat';
import { initBot, getBot } from './bot';
import { startCronJobs } from './services/cron';
import { prisma } from './lib/prisma';
import { Prisma } from '@prisma/client';

const app = express();
const PORT = parseInt(process.env.PORT || '3001');

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

function buildProductionCorsOrigins(): Set<string> {
  const s = new Set<string>(['https://web.telegram.org', 'https://telegram.org']);
  const mini = process.env.MINI_APP_URL?.trim();
  if (mini) {
    try {
      s.add(new URL(mini).origin);
    } catch {
      console.warn('MINI_APP_URL is not a valid URL; CORS may block the Mini App');
    }
  } else if (process.env.NODE_ENV === 'production') {
    console.warn('MINI_APP_URL is not set; only Telegram hosts are allowed by CORS');
  }
  const extra = process.env.CORS_EXTRA_ORIGINS;
  if (extra) {
    for (const part of extra.split(',')) {
      const o = part.trim();
      if (o) s.add(o);
    }
  }
  return s;
}

const PRODUCTION_CORS_ORIGINS = buildProductionCorsOrigins();

const DEV_EXTRA_ORIGINS = new Set(
  [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
  ].filter(Boolean)
);

// В dev разрешаем любой порт localhost (Vite может использовать 5173, 5174 и т.д.)
const isDev = process.env.NODE_ENV !== 'production';

const isProduction = process.env.NODE_ENV === 'production';

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (origin === 'null') return callback(null, true); // некоторые WebView
      if (isProduction) {
        if (PRODUCTION_CORS_ORIGINS.has(origin)) return callback(null, true);
        callback(new Error(`CORS: origin ${origin} not allowed`));
        return;
      }
      if (DEV_EXTRA_ORIGINS.has(origin)) return callback(null, true);
      if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return callback(null, origin);
      }
      if (PRODUCTION_CORS_ORIGINS.has(origin)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Accept-Language'],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const logRequests = process.env.NODE_ENV !== 'production' || process.env.LOG_REQUESTS === '1';
app.use((req, _res, next) => {
  if (logRequests) {
    console.log(`→ ${req.method} ${req.path} [origin:${req.headers.origin || '-'}, ip:${req.ip}]`);
  }
  next();
});

function skipRateLimit(req: express.Request): boolean {
  if (isDev) return true;
  const origin = req.headers.origin || '';
  if (/^https?:\/\/localhost(:\d+)?$|^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) return true;
  return false;
}

// Rate limiters: в dev отключены; с localhost (dev против prod) — тоже пропускаем
const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 60,
  skip: (req) => skipRateLimit(req),
  message: { error: 'Слишком много запросов. Попробуйте через 10 минут.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const voiceLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  skip: (req) => skipRateLimit(req),
  message: { error: 'Слишком много голосовых запросов. Подождите минуту.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const assistantChatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  skip: (req) => skipRateLimit(req),
  message: { error: 'Слишком много сообщений к помощнику. Подождите минуту.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const tmpDir = path.join(process.cwd(), 'tmp');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

app.use('/auth', authLimiter, authRouter);
app.use('/budgets', budgetsRouter);
app.use('/voice', voiceLimiter, voiceRouter);
app.use('/assistant', assistantChatLimiter, assistantChatRouter);
app.use('/transactions', transactionsRouter);
app.use('/categories', categoriesRouter);
app.use('/stats', statsRouter);
app.use('/reminders', remindersRouter);
app.use('/settings', settingsRouter);

// Telegram webhook endpoint (used in production instead of polling)
app.post('/webhook/telegram', express.json(), (req, res) => {
  const webhookSecret = getTelegramWebhookSecret();
  if (process.env.NODE_ENV === 'production') {
    const incomingSecret = req.headers['x-telegram-bot-api-secret-token'];
    if (!webhookSecret || incomingSecret !== webhookSecret) {
      res.sendStatus(403);
      return;
    }
  } else if (webhookSecret) {
    const incomingSecret = req.headers['x-telegram-bot-api-secret-token'];
    if (incomingSecret !== webhookSecret) {
      res.sendStatus(403);
      return;
    }
  }
  const bot = getBot();
  if (bot) {
    bot.processUpdate(req.body);
  }
  res.sendStatus(200);
});

app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw(Prisma.sql`SELECT 1`);
    res.json({
      status: 'ok',
      ts: new Date().toISOString(),
      apiUrl: process.env.RENDER_EXTERNAL_URL || process.env.BACKEND_URL || null,
    });
  } catch (err) {
    console.error('[health] DB ping failed:', (err as Error).message);
    res.status(503).json({
      status: 'error',
      ts: new Date().toISOString(),
      error: 'Database unavailable',
    });
  }
});

const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1';
app.listen(PORT, HOST, async () => {
  console.log(`Backend running on port ${PORT}`);
  const { warmUpConnection } = await import('./lib/prisma');
  await warmUpConnection();
  initBot();
  startCronJobs();
});

export default app;
