# Как не дать БД и backend засыпать (free tier)

**Supabase** — пауза после 1 недели без запросов.  
**Render** — сон после ~15 мин без трафика.

## Решение: внешний cron

Настрой бесплатный сервис, который пингует `/health` каждые 10–15 минут.

### cron-job.org (бесплатно)

1. Зайди на [cron-job.org](https://cron-job.org)
2. Регистрация → **Create cronjob**
3. **URL:** `https://ТВОЙ-BACKEND.onrender.com/health`
4. **Interval:** Every 10 minutes
5. **Request Method:** GET

### UptimeRobot (бесплатно)

1. [uptimerobot.com](https://uptimerobot.com) → Add Monitor
2. **Monitor Type:** HTTP(s)
3. **URL:** `https://ТВОЙ-BACKEND.onrender.com/health`
4. **Monitoring Interval:** 5 minutes

### Результат

Каждый пинг:
- будит Render (если backend спал),
- backend обращается к БД,
- Supabase не уходит в паузу.

---

**Бонус:** в backend уже есть внутренний cron — каждые 10 минут выполняется `SELECT 1`. Он помогает, пока backend запущен, но не сработает, если Render усыпил процесс. Поэтому внешний пинг обязателен.
