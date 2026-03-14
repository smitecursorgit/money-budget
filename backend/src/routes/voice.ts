import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authMiddleware } from '../middleware/auth';
import { transcribeAudio, parseFinanceText } from '../services/openai';
import { prisma } from '../lib/prisma';

const router = Router();
const upload = multer({
  dest: path.join(process.cwd(), 'tmp'),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/wav', 'audio/mpeg'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported audio format'));
    }
  },
});

router.post('/parse', authMiddleware, upload.single('audio'), async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;

  if (!req.file) {
    res.status(400).json({ error: 'Audio file required' });
    return;
  }

  const filePath = req.file.path;

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
    res.status(500).json({ error: 'Ошибка распознавания. Проверьте OpenAI API ключ.' });
  } finally {
    fs.unlink(filePath, () => {});
  }
});

router.post('/parse-text', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { text } = req.body;

  if (!text) {
    res.status(400).json({ error: 'text required' });
    return;
  }

  const categories = await prisma.category.findMany({
    where: { userId },
    select: { name: true, type: true, keywords: true },
  });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  const today = new Date().toLocaleDateString('sv', { timeZone: user?.timezone || 'Europe/Moscow' });

  try {
    const parsed = await parseFinanceText(text, categories, today);
    res.json({ transcription: text, parsed });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Text parse error:', message);
    res.status(500).json({ error: 'Ошибка обработки текста. Проверьте OpenAI API ключ.' });
  }
});

export default router;
