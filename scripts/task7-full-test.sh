#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
COMPOSE=""

log() {
  echo
  echo "==> $1"
}

warn() {
  echo "[WARN] $1"
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "[ERROR] Required command not found: $1" >&2
    exit 1
  fi
}

compose_cmd() {
  if docker compose version >/dev/null 2>&1; then
    echo "docker compose"
    return
  fi

  if command -v docker-compose >/dev/null 2>&1; then
    echo "docker-compose"
    return
  fi

  echo "[ERROR] Docker Compose not found (need 'docker compose' or 'docker-compose')." >&2
  exit 1
}

wait_for_gateway_health() {
  local retries=40
  local delay=3
  local i

  for i in $(seq 1 "$retries"); do
    if curl -fsS "http://localhost/health" >/dev/null 2>&1; then
      return 0
    fi
    sleep "$delay"
  done

  return 1
}

parse_json_field() {
  local field="$1"
  python3 -c "import json,sys; print(json.load(sys.stdin).get('$field',''))"
}

on_error() {
  local exit_code=$?
  echo
  echo "[ERROR] Task 7 script failed with exit code ${exit_code}."
  if [[ -n "${COMPOSE}" ]]; then
    echo
    echo "---- docker compose ps ----"
    $COMPOSE ps || true
    echo
    echo "---- docker compose logs (tail) ----"
    $COMPOSE logs --no-color --tail=120 billing-db billing-service gateway station-service booking-service session-service || true
  fi
  exit "$exit_code"
}

trap on_error ERR

log "Task 7a: Docker Compose build + up + ps"
require_cmd docker
require_cmd curl
require_cmd python3
COMPOSE="$(compose_cmd)"

$COMPOSE build
$COMPOSE up -d
$COMPOSE up -d --force-recreate gateway
$COMPOSE ps

log "Wait gateway health"
if ! wait_for_gateway_health; then
  echo "[ERROR] Gateway health endpoint is not ready: http://localhost/health" >&2
  $COMPOSE ps
  exit 1
fi

log "Task 7b: Gateway and API checks (curl)"
GATEWAY_HEALTH="$(curl -fsS http://localhost/health)"
echo "$GATEWAY_HEALTH"
if [[ "$GATEWAY_HEALTH" != *'"status":"ok"'* ]]; then
  echo "[ERROR] Gateway health response does not contain status=ok" >&2
  exit 1
fi

STATIONS_PUBLIC="$(curl -fsS http://localhost/api/v1/stations)"
echo "$STATIONS_PUBLIC" | python3 -m json.tool >/dev/null
echo "$STATIONS_PUBLIC" | python3 -c "import json,sys; d=json.load(sys.stdin); assert 'data' in d, 'missing data field'"

TOKEN_RESPONSE="$(curl -fsS -X POST http://localhost/auth/token \
  -H "Content-Type: application/json" \
  -d '{"userId":"USR001","role":"user"}')"
TOKEN="$(echo "$TOKEN_RESPONSE" | parse_json_field token)"
if [[ -z "$TOKEN" ]]; then
  echo "[ERROR] Failed to obtain token from /auth/token" >&2
  echo "$TOKEN_RESPONSE"
  exit 1
fi
echo "Token acquired."

AUTH_HEADER="Authorization: Bearer $TOKEN"

STATIONS_AUTH="$(curl -fsS -H "$AUTH_HEADER" http://localhost/api/v1/stations)"
echo "$STATIONS_AUTH" | python3 -m json.tool >/dev/null

SLOT_AVAILABILITY="$(curl -fsS -H "$AUTH_HEADER" "http://localhost/api/v1/slots/SL001/availability")"
echo "$SLOT_AVAILABILITY" | python3 -m json.tool >/dev/null

BOOKING_RESPONSE="$(curl -fsS -X POST http://localhost/api/v1/bookings \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -H "Idempotency-Key: task7-script-test-001" \
  -d '{"stationId":"ST001","slotId":"SL001","startTime":"2026-08-25T10:00:00Z","endTime":"2026-08-25T12:00:00Z"}')"
echo "$BOOKING_RESPONSE" | python3 -m json.tool >/dev/null
echo "$BOOKING_RESPONSE"

log "Task 7c: WebSocket test through gateway"
if command -v node >/dev/null 2>&1; then
  WS_CONNECTED=0
  WS_OUTPUT=""
  WS_EXIT=1
  for _ in $(seq 1 8); do
    WS_EXIT=0
    WS_OUTPUT="$(timeout 12s node -e '
const ws = new WebSocket("ws://localhost/ws/CS001");
let done = false;
const finish = (code, msg) => {
  if (done) return;
  done = true;
  if (msg) console.log(msg);
  try { ws.close(); } catch {}
  process.exit(code);
};
ws.onopen = () => console.log("websocket-open");
ws.onmessage = (event) => {
  const text = String(event.data);
  console.log(text);
  if (text.includes("\"type\":\"connected\"")) {
    finish(0, "websocket-connected-ok");
  }
};
ws.onerror = () => finish(1, "websocket-error");
setTimeout(() => finish(2, "websocket-timeout"), 8000);
' 2>&1)" || WS_EXIT=$?

    if [[ $WS_EXIT -eq 0 && "$WS_OUTPUT" == *"websocket-connected-ok"* ]]; then
      WS_CONNECTED=1
      break
    fi
    sleep 2
  done

  echo "$WS_OUTPUT"
  if [[ $WS_CONNECTED -ne 1 ]]; then
    warn "WebSocket test did not find 'connected' message. Check session-service and gateway logs."
  fi
else
  warn "node is not available. Skip WebSocket test."
fi

log "Task 7d: Kubernetes apply (optional)"
if command -v kubectl >/dev/null 2>&1 && kubectl cluster-info >/dev/null 2>&1; then
  kubectl apply -f k8s/namespace.yaml
  kubectl apply -f k8s/configmap.yaml
  kubectl apply -f k8s/secrets.yaml
  kubectl apply -f k8s/redis/
  kubectl apply -f k8s/station-service/
  kubectl apply -f k8s/booking-service/
  kubectl apply -f k8s/session-service/
  kubectl apply -f k8s/billing-service/
  kubectl apply -f k8s/ingress.yaml
  kubectl get pods -n emerald-charge
  kubectl logs -n emerald-charge deployment/station-service --tail=50
else
  warn "No active kubectl cluster context. Skipping optional Kubernetes test."
fi

log "Task 7 verification completed."
