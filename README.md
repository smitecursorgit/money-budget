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

Скопируй `backend/.env.example` в `backend/.env`.

**Рекомендуется: Supabase** (500MB бесплатно) — [supabase.com](https://supabase.com), см. `docs/MIGRATION_TO_SUPABASE.md`

```env
DATABASE_URL="postgresql://postgres.[ref]:[PASSWORD]@...pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[ref].supabase.co:5432/postgres"
JWT_SECRET="your-super-secret-jwt-key"
TELEGRAM_BOT_TOKEN="your-bot-token"
MINI_APP_URL="https://your-domain.com"
PORT=3001
NODE_ENV=development
```

### Подписка (ЮKassa)

- Триал **72 часа** с момента первого создания пользователя (`trial_start` / `created_at`).
- После триала без активной подписки показывается Paywall; API (кроме `/auth`, `/subscription/*`, `/health`, вебхука) отвечает **403**.
- В личном кабинете ЮKassa укажи URL вебхука: `https://<BACKEND>/webhooks/yookassa` или `https://<BACKEND>/api/webhooks/yookassa` (оба пути ведут на один обработчик).
- Переменные: `YOOKASSA_SHOP_ID`, `YOOKASSA_SECRET_KEY`, опционально `YOOKASSA_RETURN_URL` (редирект после оплаты).

### Бесплатный бессрочный доступ (себе / тестерам)

1. **Через бота (проще всего):** в `backend/.env` задай `ADMIN_TELEGRAM_IDS` — твой **числовой** Telegram id (например из @userinfobot), через запятую если несколько админов. Перезапусти бэкенд, в личке с ботом отправь `/start` — в меню команд появится `/admins` **только у тебя** (у остальных пользователей в меню останутся `/start` и `/help`).  
   - Выдать доступ: `/admins give @username` или `/admins выдать username`  
   - Забрать: `/admins take @username` или `/admins забрать username`  
   У получателя должен быть **username в Telegram** и он хотя бы раз должен открыть Mini App.
2. **API (опционально):** `POST /admin/subscription-exempt` + `X-Admin-Secret` и `ADMIN_API_SECRET`.
3. **Только env:** `SUBSCRIPTION_EXEMPT_TELEGRAM_IDS` — без записи в БД; **перезапуск** сервера.

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

По умолчанию используется `/api` — `vercel.json` и `netlify.toml` проксируют запросы на backend. Запросы same-origin, CORS не нужен.

```bash
cd frontend
npm run build
# dist/ загрузи на хостинг (Vercel/Netlify подхватят из git)
```

Если фронт на другом хостинге (без прокси), задай в build env: `VITE_API_URL=https://money-budget-q2lk.onrender.com`

### Backend → Railway / Render / VPS
```bash
cd backend && npm run build
node dist/index.js
```

На Render в `render.yaml` уже настроены `prisma migrate deploy` в build и переменные окружения (DATABASE_URL, JWT_SECRET и т.д.).

### Если баланс и операции не загружаются
1. **URL бэкенда** — В Render Dashboard → твой сервис → в шапке скопируй URL (например `https://money-budget-backend-xyz.onrender.com`). Обнови `frontend/.env.production` и пересобери фронтенд.
2. **MINI_APP_URL** — В Render Environment задай `MINI_APP_URL` = URL, где размещён Mini App (Vercel/Netlify).
3. **Сброс сессии** — В приложении нажми «Выйти» (при баннере ошибки), закрой Mini App и открой снова.
