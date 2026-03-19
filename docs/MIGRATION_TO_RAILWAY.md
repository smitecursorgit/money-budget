# Миграция на Railway (PostgreSQL)

**Railway** — PostgreSQL с $5 бесплатного кредита при регистрации, затем $1/месяц. Регистрация через GitHub.

## 1. Создать проект в Railway

1. Зайди на [railway.app](https://railway.app)
2. **Login with GitHub** (один клик)
3. **New Project** → **Deploy PostgreSQL** (или **Add Service** → **Database** → **PostgreSQL**)
4. Дождись деплоя (~1 мин)

## 2. Скопировать connection string

**Важно:** `postgres.railway.internal` работает только внутри Railway. Для локальной разработки и Render нужен **публичный** URL.

1. Railway → PostgreSQL сервис → **Settings** → **Networking**
2. **TCP Proxy** → Add → port **5432**
3. В **Variables** скопируй **DATABASE_PUBLIC_URL** (или собери из proxy domain + port)

Формат: `postgresql://postgres:[PASSWORD]@[PROXY_HOST]:[PROXY_PORT]/railway`

Используй один и тот же URL для `DATABASE_URL` и `DIRECT_URL`.

## 3. Обновить backend/.env

```env
DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/railway"
DIRECT_URL="postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/railway"
```

Остальные переменные (JWT_SECRET, TELEGRAM_BOT_TOKEN и т.д.) оставь без изменений.

## 4. Миграция данных (если есть в локальной БД)

### Экспорт из локального PostgreSQL

```bash
export LOCAL_DATABASE_URL="postgresql://postgres:твой_пароль@localhost:5432/money_budget"
./scripts/migrate-to-railway.sh
```

### Применить схему в Railway (с нуля)

```bash
cd backend
npx prisma db push
```

### Импорт данных (если был экспорт)

```bash
psql "$DIRECT_URL" -f backup_local_XXXXXX.sql
```

## 5. Проверка

```bash
npm run uptime:full
```

## 6. Render / деплой

В Render Dashboard → Environment → добавь/обнови:
- `DATABASE_URL` — connection string из Railway
- `DIRECT_URL` — тот же URL
