#!/usr/bin/env bash
# Emerald Charge — full stack startup script
# Usage: ./start.sh

set -e
BASE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$BASE"

echo "⚡ Emerald Charge — Starting full stack..."
echo ""

# 1. Start databases + Redis with Docker
echo "=== [1/3] Starting databases + Redis ==="
docker compose -f docker-compose.dev.yml up -d

echo "Waiting for databases to be healthy..."
READY=0
for i in $(seq 1 30); do
  SS=$(docker inspect --format='{{.State.Health.Status}}' station-db 2>/dev/null)
  BS=$(docker inspect --format='{{.State.Health.Status}}' booking-db 2>/dev/null)
  SE=$(docker inspect --format='{{.State.Health.Status}}' session-db 2>/dev/null)
  BL=$(docker inspect --format='{{.State.Health.Status}}' billing-db 2>/dev/null)
  RD=$(docker inspect --format='{{.State.Health.Status}}' emerald-redis 2>/dev/null)
  if [ "$SS" = "healthy" ] && [ "$BS" = "healthy" ] && [ "$SE" = "healthy" ] && [ "$BL" = "healthy" ] && [ "$RD" = "healthy" ]; then
    echo "All containers healthy!"
    READY=1
    break
  fi
  echo "  Waiting... ($i/30) station=$SS booking=$BS session=$SE billing=$BL redis=$RD"
  sleep 4
done

if [ "$READY" -eq 0 ]; then
  echo "WARNING: Containers not all healthy, but proceeding (services have JSON fallback)"
fi

echo ""
echo "=== [2/3] Starting backend services ==="
pkill -f "ts-node src/index" 2>/dev/null || true
sleep 1

nohup sh -c "cd '$BASE/services/station-service' && npm run dev" > /tmp/ss.log 2>&1 &
echo "  🔌 station-service starting on :8001..."
sleep 2
nohup sh -c "cd '$BASE/services/booking-service' && npm run dev" > /tmp/bs.log 2>&1 &
echo "  📅 booking-service starting on :8002..."
sleep 2
nohup sh -c "cd '$BASE/services/session-service' && npm run dev" > /tmp/se.log 2>&1 &
echo "  ⚡ session-service starting on :8003..."
sleep 2
nohup sh -c "cd '$BASE/services/billing-service' && npm run dev" > /tmp/bl.log 2>&1 &
echo "  💳 billing-service starting on :8004..."
sleep 5

echo ""
echo "=== [3/3] Health check ==="
ALL_OK=1
for port in 8001 8002 8003 8004; do
  R=$(curl -s --max-time 3 http://localhost:$port/health 2>/dev/null)
  if [ -n "$R" ]; then
    SVC=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin).get('service','?'))" 2>/dev/null)
    echo "  ✅ :$port $SVC UP"
  else
    echo "  ❌ :$port DOWN (check /tmp/$(echo $port | sed 's/8001/ss/;s/8002/bs/;s/8003/se/;s/8004/bl/').log)"
    ALL_OK=0
  fi
done

echo ""
if [ "$ALL_OK" -eq 1 ]; then
  echo "=== ✅ All services running! ==="
else
  echo "=== ⚠️  Some services failed — retrying... ==="
  sleep 5
  for port in 8001 8002 8003 8004; do
    curl -s --max-time 2 http://localhost:$port/health > /dev/null 2>&1 && echo "  ✅ :$port recovered" || true
  done
fi

echo ""
echo "=== Web Admin ==="
echo "  Run: cd web-admin && npm run dev"
echo "  Access: Codespaces Ports tab → port 5173"
echo ""
echo "=== Mobile App (Expo Go) ==="
echo "  Run: cd mobile-user && npx expo start --tunnel"
echo "  For API: update mobile-user/services/apiService.ts API_BASE"
echo "  Codespace URL for port 8001: check Ports tab → copy forwarded URL"
echo ""
echo "Logs: /tmp/ss.log  /tmp/bs.log  /tmp/se.log  /tmp/bl.log"
