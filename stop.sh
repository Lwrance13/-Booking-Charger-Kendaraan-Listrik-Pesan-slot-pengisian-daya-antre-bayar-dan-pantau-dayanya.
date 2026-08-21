#!/usr/bin/env bash
# Stop all Emerald Charge services and containers
BASE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$BASE"

echo "Stopping services..."
pkill -f "ts-node src/index" 2>/dev/null && echo "  ✅ Node services stopped" || echo "  No running services"

echo "Stopping Docker containers..."
docker compose -f docker-compose.dev.yml down && echo "  ✅ Containers stopped"
echo "Done."
