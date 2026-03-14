import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import rateLimit from 'express-rate-limit';

import authRouter from './routes/auth';
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

app.use(
  cors({
    origin: (_origin, callback) => callback(null, true),
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiters
const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 20,
  message: { error: 'Слишком много запросов. Попробуйте через 10 минут.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const voiceLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: { error: 'Слишком много голосовых запросов. Подождите минуту.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const tmpDir = path.join(process.cwd(), 'tmp');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

app.use('/auth', authLimiter, authRouter);
app.use('/voice', voiceLimiter, voiceRouter);
app.use('/transactions', transactionsRouter);
app.use('/categories', categoriesRouter);
app.use('/stats', statsRouter);
app.use('/reminders', remindersRouter);
app.use('/settings', settingsRouter);

// Telegram webhook endpoint (used in production instead of polling)
app.post('/webhook/telegram', express.json(), (req, res) => {
  const bot = getBot();
  if (bot) {
    bot.processUpdate(req.body);
  }
  res.sendStatus(200);
});

app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1';
app.listen(PORT, HOST, () => {
  console.log(`Backend running on port ${PORT}`);
  initBot();
  startCronJobs();
});

export default app;
