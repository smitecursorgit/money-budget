#!/bin/bash
# Миграция данных: локальный PostgreSQL → Aiven
# Использование: ./scripts/migrate-to-aiven.sh

set -e

BACKUP="backup_local_$(date +%Y%m%d_%H%M%S).sql"

echo "1. Экспорт из локальной БД..."
if [ -z "$LOCAL_DATABASE_URL" ]; then
  echo "   Задай LOCAL_DATABASE_URL, например:"
  echo "   export LOCAL_DATABASE_URL='postgresql://postgres:pass@localhost:5432/money_budget'"
  exit 1
fi

pg_dump "$LOCAL_DATABASE_URL" --no-owner --no-acl --clean --if-exists -f "$BACKUP"
echo "   Сохранено в $BACKUP"

echo ""
echo "2. Примени схему в Aiven:"
echo "   cd backend && npx prisma db push"
echo ""
echo "3. Импорт данных:"
echo "   psql \"\$DIRECT_URL\" -f $BACKUP"
echo ""
echo "   (DIRECT_URL — connection string из Aiven Console)"
