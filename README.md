# Money Budget — Telegram Mini App

Умный трекер доходов и расходов с голосовым вводом на базе AI.

## Стек

| Слой | Технологии |
|------|-----------|
| Frontend | React + TypeScript + Vite, Framer Motion, Recharts, Lucide React |
| Backend | Node.js + Express + TypeScript |
| База данных | PostgreSQL + Prisma ORM |
| AI | OpenAI Whisper (речь → текст) + GPT-4o (NLP/контекст) |
| Telegram | Telegram Mini App SDK (@twa-dev/sdk), node-telegram-bot-api |

## Быстрый старт

### 1. Требования
- Node.js 18+
- PostgreSQL (локально или в облаке)
- Telegram Bot Token ([@BotFather](https://t.me/BotFather))
- OpenAI API Key

### 2. Backend

```bash
cd backend
cp .env.example .env
# Заполни .env своими значениями
npm install
npm run db:push   # Применяет схему к БД
npm run dev       # Запуск в dev-режиме
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev       # http://localhost:5173
```

### 4. Переменные окружения (backend/.env)

```env
DATABASE_URL="postgresql://user:password@localhost:5432/money_budget"
JWT_SECRET="your-super-secret-jwt-key"
OPENAI_API_KEY="sk-..."
TELEGRAM_BOT_TOKEN="your-bot-token"
MINI_APP_URL="https://your-domain.com"
PORT=3001
NODE_ENV=development
```

## Структура проекта

```
/
├── frontend/              # React Mini App
│   └── src/
│       ├── screens/       # Dashboard, Transactions, Statistics, Reminders, Settings
│       ├── components/    # VoiceButton, VoiceConfirmModal, UI-компоненты
│       ├── api/           # Axios клиент
│       ├── store/         # Zustand
│       └── styles/        # Глобальные стили, CSS-переменные
└── backend/
    ├── prisma/            # Схема БД
    └── src/
        ├── routes/        # auth, voice, transactions, categories, stats, reminders
        ├── services/      # openai.ts, cron.ts
        ├── middleware/     # auth.ts (JWT)
        └── bot.ts         # Telegram Bot
```

## Голосовой ввод

Пользователь говорит → Whisper → текст → GPT-4o → JSON с полями:

| Поле | Описание |
|------|---------|
| `type` | `expense` / `income` / `reminder` |
| `amount` | Сумма (понимает «сотка» = 100, «косарь» = 1000) |
| `category` | Название категории |
| `date` | Дата в ISO формате |
| `note` | Оригинальная фраза |

Примеры команд:
- «Сотка на кофе» → расход 100 ₽, категория Кофе
- «Получил зп пятьдесят тысяч» → доход 50000 ₽, категория Зарплата
- «Напомни платить аренду 5-го каждый месяц» → напоминание monthly

## Дизайн

- Тёмная тема: `#0a0a0f` фон
- iOS Liquid Glass: `backdrop-filter: blur(20px)` + тонкая белая обводка
- Акцент: `#6C63FF` → `#A78BFA` (фиолетовый градиент)
- Анимации: Framer Motion spring-анимации

## Деплой

### Frontend → Vercel / Netlify

**Важно:** Перед сборкой задай `VITE_API_URL` на полный URL бэкенда, иначе запросы пойдут на `/api` (тот же домен) и будут падать.

```bash
cd frontend
# В Vercel/Netlify: добавь Env Var VITE_API_URL = https://your-backend.onrender.com
npm run build
# dist/ загрузи на хостинг
```

Пример: если бэкенд на `https://money-budget-backend.onrender.com`, то:
```env
VITE_API_URL=https://money-budget-backend.onrender.com
```

### Backend → Railway / Render / VPS
```bash
cd backend && npm run build
node dist/index.js
```

На Render в `render.yaml` уже настроены `prisma migrate deploy` в build и переменные окружения (DATABASE_URL, JWT_SECRET и т.д.).
