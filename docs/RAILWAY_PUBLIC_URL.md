# Railway: получить публичный URL для PostgreSQL

`postgres.railway.internal` работает только внутри Railway. Для локальной разработки и Render нужен **публичный** URL.

## Шаги

1. Railway Dashboard → твой проект → **PostgreSQL** сервис
2. **Settings** → **Networking**
3. **TCP Proxy** → **Add TCP Proxy**
4. Port: **5432**
5. Railway создаст домен вида `monorail.proxy.rlwy.net` и порт (например 12345)
6. В **Variables** появится **DATABASE_PUBLIC_URL** — скопируй его

Или собери вручную:
```
postgresql://postgres:[PASSWORD]@[PROXY_DOMAIN]:[PROXY_PORT]/railway
```

Пример: `postgresql://postgres:NlSYYNtewekEtfjtezowQzBdWrPVRHAE@monorail.proxy.rlwy.net:12345/railway`

## Обновить .env

Замени `postgres.railway.internal` на публичный хост из TCP Proxy.
