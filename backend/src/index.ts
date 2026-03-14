import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';

import authRouter from './routes/auth';
import voiceRouter from './routes/voice';
import transactionsRouter from './routes/transactions';
import categoriesRouter from './routes/categories';
import statsRouter from './routes/stats';
import remindersRouter from './routes/reminders';
import settingsRouter from './routes/settings';
import { initBot } from './bot';
import { startCronJobs } from './services/cron';

const app = express();
const PORT = parseInt(process.env.PORT || '3001');

const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  process.env.MINI_APP_URL,
].filter(Boolean) as string[];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.some((o) => origin.startsWith(o))) {
        callback(null, true);
      } else {
        callback(null, true); // Allow all in case Telegram WebApp sends custom origin
      }
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const tmpDir = path.join(process.cwd(), 'tmp');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

app.use('/auth', authRouter);
app.use('/voice', voiceRouter);
app.use('/transactions', transactionsRouter);
app.use('/categories', categoriesRouter);
app.use('/stats', statsRouter);
app.use('/reminders', remindersRouter);
app.use('/settings', settingsRouter);

app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1';
app.listen(PORT, HOST, () => {
  console.log(`Backend running on port ${PORT}`);
  initBot();
  startCronJobs();
});

export default app;
