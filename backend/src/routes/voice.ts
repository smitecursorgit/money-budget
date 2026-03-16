import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authMiddleware } from '../middleware/auth';
import { transcribeAudio, parseFinanceText } from '../services/ai';
import { prisma } from '../lib/prisma';

/**
 * Detect real audio format from magic bytes, fall back to original filename extension.
 * Groq Whisper requires the file to have a correct extension.
 */
function detectAudioExt(filePath: string, originalName: string): string {
  try {
    const buf = Buffer.alloc(12);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buf, 0, 12, 0);
    fs.closeSync(fd);

    // WebM: 1A 45 DF A3
    if (buf[0] === 0x1A && buf[1] === 0x45 && buf[2] === 0xDF && buf[3] === 0xA3) return 'webm';
    // OGG: OggS
    if (buf.slice(0, 4).toString('ascii') === 'OggS') return 'ogg';
    // MP4/M4A: 'ftyp' at offset 4
    if (buf.slice(4, 8).toString('ascii') === 'ftyp') return 'mp4';
    // WAV: RIFF....WAVE
    if (buf.slice(0, 4).toString('ascii') === 'RIFF') return 'wav';
    // MP3: ID3 header or sync word
    if (buf.slice(0, 3).toString('ascii') === 'ID3') return 'mp3';
    if (buf[0] === 0xFF && (buf[1] & 0xE0) === 0xE0) return 'mp3';
  } catch {
    // ignore read errors — fall through to name-based detection
  }

  // Fall back to original filename extension
  const nameExt = path.extname(originalName).slice(1).toLowerCase();
  const allowed = ['webm', 'ogg', 'mp4', 'm4a', 'mp3', 'wav', 'flac', 'opus', 'mpeg'];
  if (allowed.includes(nameExt)) return nameExt;

  return 'mp4'; // safe mobile default
}

const router = Router();
const upload = multer({
  dest: path.join(process.cwd(), 'tmp'),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    // Accept any audio/* type — Groq Whisper supports webm, ogg, mp4, wav, mp3, m4a
    if (file.mimetype.startsWith('audio/') || file.mimetype === 'application/octet-stream') {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported format: ${file.mimetype}`));
    }
  },
});

// Multer error handler — must be registered before the route
const uploadSingle = (req: Request, res: Response, next: import('express').NextFunction) => {
  upload.single('audio')(req, res, (err) => {
    if (err) {
      res.status(400).json({ error: `Ошибка загрузки файла: ${err.message}` });
      return;
    }
    next();
  });
};

router.post('/parse', authMiddleware, uploadSingle, async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;

  if (!req.file) {
    res.status(400).json({ error: 'Audio file required' });
    return;
  }

  const rawPath = req.file.path;

  // Multer saves files without extension — Groq determines format by filename extension.
  // Detect real format from magic bytes, fall back to extension in original filename.
  const ext = detectAudioExt(rawPath, req.file.originalname);
  const filePath = `${rawPath}.${ext}`;

  try {
    fs.renameSync(rawPath, filePath);
  } catch (renameErr) {
    fs.unlink(rawPath, () => {});
    res.status(500).json({ error: 'Не удалось обработать аудиофайл. Попробуйте ещё раз.' });
    return;
  }

  try {
    const categories = await prisma.category.findMany({
      where: { userId },
      select: { name: true, type: true, keywords: true },
    });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const today = new Date().toLocaleDateString('sv', { timeZone: user?.timezone || 'Europe/Moscow' });

    const transcribedText = await transcribeAudio(filePath);
    const parsed = await parseFinanceText(transcribedText, categories, today);

    res.json({ transcription: transcribedText, parsed });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Voice parse error:', message);

    let userError: string;
    if (message.includes('API key') || message.includes('401') || message.includes('Unauthorized')) {
      userError = 'GROQ_API_KEY не настроен или неверный на сервере';
    } else if (message.includes('could not process file') || message.includes('Invalid file')) {
      userError = 'Не удалось распознать аудио. Говорите чётче и ближе к микрофону.';
    } else if (message.includes('prisma') || message.includes('prepared statement') || message.includes('ConnectorError') || message.includes('P1') || message.includes('P2')) {
      userError = 'Сервис временно недоступен. Попробуйте ещё раз.';
    } else if (message.includes('timeout') || message.includes('ETIMEDOUT') || message.includes('ECONNREFUSED')) {
      userError = 'Сервер не отвечает. Проверьте соединение.';
    } else {
      userError = 'Не удалось обработать запрос. Попробуйте ещё раз.';
    }

    res.status(500).json({ error: userError });
  } finally {
    fs.unlink(filePath, () => {});
  }
});

router.post('/parse-text', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { text } = req.body;

  if (!text || typeof text !== 'string') {
    res.status(400).json({ error: 'text required' });
    return;
  }

  try {
    const [categories, user] = await Promise.all([
      prisma.category.findMany({ where: { userId }, select: { name: true, type: true, keywords: true } }),
      prisma.user.findUnique({ where: { id: userId } }),
    ]);

    const today = new Date().toLocaleDateString('sv', { timeZone: user?.timezone || 'Europe/Moscow' });
    const parsed = await parseFinanceText(text, categories, today);
    res.json({ transcription: text, parsed });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Text parse error:', message);
    const isApiKeyError = message.includes('API key') || message.includes('401') || message.includes('Unauthorized');
    res.status(500).json({
      error: isApiKeyError ? 'GROQ_API_KEY не настроен или неверный' : 'Не удалось обработать запрос. Попробуйте ещё раз.',
    });
  }
});

export default router;
