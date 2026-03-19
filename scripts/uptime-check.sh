#!/bin/bash
# Uptime check для /health
# Использование: ./scripts/uptime-check.sh [URL]

URL="${1:-http://localhost:3001}"
HEALTH="${URL%/}/health"

echo "Checking $HEALTH ..."
START=$(date +%s%3N)
HTTP=$(curl -s -o /tmp/health.json -w "%{http_code}" --max-time 65 "$HEALTH")
ELAPSED=$(($(date +%s%3N) - START))

if [ "$HTTP" = "200" ]; then
  STATUS=$(jq -r '.status' /tmp/health.json 2>/dev/null || echo "unknown")
  if [ "$STATUS" = "ok" ]; then
    echo "✓ OK | ${ELAPSED}ms"
    exit 0
  fi
fi

echo "✗ FAIL | HTTP $HTTP | ${ELAPSED}ms"
exit 1
