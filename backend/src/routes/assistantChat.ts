import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { assistantFinanceChat } from '../services/ai';
import { buildAssistantFinanceContext } from '../services/assistantContext';

const router = Router();
router.use(authMiddleware);

const ChatBodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().trim().min(1).max(8000),
      })
    )
    .min(1)
    .max(24),
});

router.post('/chat', async (req: Request, res: Response): Promise<void> => {
  const parse = ChatBodySchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'Некорректные данные', detail: parse.error.flatten() });
    return;
  }

  if (!process.env.GROQ_API_KEY) {
    res.status(503).json({ error: 'Чат временно недоступен: не настроен GROQ_API_KEY на сервере.' });
    return;
  }

  try {
    const userId = req.user!.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { currency: true },
    });

    const userContext = await buildAssistantFinanceContext(userId);

    const reply = await assistantFinanceChat(parse.data.messages, {
      currency: user?.currency ?? 'RUB',
      userContext,
    });
    res.json({ reply });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[assistant/chat]', msg);
    if (msg.includes('GROQ_API_KEY') || msg.includes('401') || msg.includes('Incorrect API key')) {
      res.status(503).json({ error: 'Сервис чата недоступен. Проверьте ключ Groq на сервере.' });
      return;
    }
    if (msg.includes('429') || msg.includes('rate')) {
      res.status(429).json({ error: 'Слишком много запросов к ИИ. Подождите минуту.' });
      return;
    }
    res.status(500).json({ error: 'Не удалось получить ответ. Попробуйте ещё раз.' });
  }
});

export default router;
