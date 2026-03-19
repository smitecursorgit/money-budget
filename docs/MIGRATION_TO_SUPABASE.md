# Миграция на Supabase (PostgreSQL)

**Supabase** — managed PostgreSQL: 500 MB бесплатно, 2 проекта.

## 1. Создать проект в Supabase

1. Зайди на [supabase.com](https://supabase.com)
2. **New project** → выбери организацию, имя, пароль БД, регион
3. Дождись создания (~2 мин)

## 2. Скопировать connection strings

В Supabase Dashboard → **Project Settings** → **Database** → **Connection string**:

- **Transaction pooler** (port 6543) — для приложения → `DATABASE_URL`
- **Direct connection** (port 5432) — для миграций → `DIRECT_URL`

Или **Connect** в боковой панели → выбери режим.

Формат:
```
Transaction pooler (6543): postgresql://postgres.[ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
Session pooler (5432):     postgresql://postgres.[ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:5432/postgres
Direct (IPv6, 5432):      postgresql://postgres:[PASSWORD]@db.[ref].supabase.co:5432/postgres
```

Если direct (IPv6) недоступен — используй Session pooler (5432) для DIRECT_URL.

## 3. Обновить backend/.env

```env
DATABASE_URL="postgresql://postgres.[ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[ref].supabase.co:5432/postgres"
```

## 4. Миграция данных (если есть в Railway)

### Экспорт из Railway

```bash
export LOCAL_DATABASE_URL="postgresql://postgres:NlSYYNtewekEtfjtezowQzBdWrPVRHAE@crossover.proxy.rlwy.net:46725/railway"
pg_dump "$LOCAL_DATABASE_URL" --no-owner --no-acl -f backup_railway.sql
```

### Применить схему в Supabase

```bash
cd backend
npx prisma db push
```

### Импорт данных (если был экспорт)

```bash
psql "$DIRECT_URL" -f backup_railway.sql
```

## 5. Проверка

```bash
npm run uptime:full
```

## 6. Render / деплой

В Render Dashboard → Environment → обнови `DATABASE_URL` и `DIRECT_URL` на Supabase.

## 7. Не дать БД засыпать (free tier)

Supabase паузит проект после 1 недели без запросов. Настрой внешний cron: [cron-job.org](https://cron-job.org) или [UptimeRobot](https://uptimerobot.com) — пинг `https://твой-backend.onrender.com/health` каждые 10 мин. Подробнее: `docs/KEEP_DB_AWAKE.md`
