import 'dotenv/config';

// Validate required env vars at startup to fail fast
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is required');
  process.exit(1);
}
if (!process.env.TELEGRAM_BOT_TOKEN) {
  console.error('FATAL: TELEGRAM_BOT_TOKEN environment variable is required');
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
});

import authRouter from './routes/auth';
import budgetsRouter from './routes/budgets';
import voiceRouter from './routes/voice';
import transactionsRouter from './routes/transactions';
import categoriesRouter from './routes/categories';
import statsRouter from './routes/stats';
import remindersRouter from './routes/reminders';
import settingsRouter from './routes/settings';
import { initBot, getBot } from './bot';
import { startCronJobs } from './services/cron';

const app = express();
const PORT = parseInt(process.env.PORT || '3001');

const ALLOWED_ORIGINS = new Set(
  [
    process.env.MINI_APP_URL,
    'https://web.telegram.org',
    'https://telegram.org',
    process.env.NODE_ENV !== 'production' ? 'http://localhost:5173' : null,
    process.env.NODE_ENV !== 'production' ? 'http://127.0.0.1:5173' : null,
  ].filter(Boolean) as string[]
);

const isProduction = process.env.NODE_ENV === 'production';

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (origin === 'null') return callback(null, true); // некоторые WebView
      if (ALLOWED_ORIGINS.has(origin)) return callback(null, true);
      // Production: allow any HTTPS origin (Telegram Mini App can be hosted on Vercel, Netlify, etc.)
      if (isProduction && (origin.startsWith('https://') || origin.startsWith('http://localhost'))) {
        return callback(null, origin);
      }
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Accept-Language'],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, _res, next) => {
  console.log(`→ ${req.method} ${req.path} [origin:${req.headers.origin || '-'}, ip:${req.ip}]`);
  next();
});

const isDev = process.env.NODE_ENV !== 'production';

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

const tmpDir = path.join(process.cwd(), 'tmp');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

app.use('/auth', authLimiter, authRouter);
app.use('/budgets', budgetsRouter);
app.use('/voice', voiceLimiter, voiceRouter);
app.use('/transactions', transactionsRouter);
app.use('/categories', categoriesRouter);
app.use('/stats', statsRouter);
app.use('/reminders', remindersRouter);
app.use('/settings', settingsRouter);

// Telegram webhook endpoint (used in production instead of polling)
app.post('/webhook/telegram', express.json(), (req, res) => {
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (webhookSecret) {
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

app.get('/health', (_req, res) =>
  res.json({
    status: 'ok',
    ts: new Date().toISOString(),
    apiUrl: process.env.RENDER_EXTERNAL_URL || process.env.BACKEND_URL || null,
  })
);

const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1';
app.listen(PORT, HOST, () => {
  console.log(`Backend running on port ${PORT}`);
  initBot();
  startCronJobs();
});

export default app;
