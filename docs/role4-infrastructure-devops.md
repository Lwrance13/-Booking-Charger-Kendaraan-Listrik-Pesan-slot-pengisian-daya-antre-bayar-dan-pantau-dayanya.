# Role 4 — Infrastructure & DevOps
**Pengerjaan: Hamsah**

> Baca file ini lalu kerjakan semua task dari Task 1 sampai Task 7 secara berurutan.
> Referensi wajib sebelum mulai:
> - [docs/ARSITEKTUR.md](ARSITEKTUR.md) — section 6 (Deployment View)
> - [docker-compose.yml](../docker-compose.yml) — sudah dibuat Role 3, kamu update & jalankan
> - [docs/adr/ADR-002-komunikasi-antar-service.md](adr/ADR-002-komunikasi-antar-service.md)

---

## Konteks

Role 2 (Backend) dan Role 3 (Database) sudah selesai. Struktur saat ini:

```
services/
├── station-service/   Dockerfile ✅  schema.sql ✅  .env.docker ✅
├── booking-service/   Dockerfile ✅  schema.sql ✅  .env.docker ✅
├── session-service/   Dockerfile ✅  schema.sql ✅  .env.docker ✅
└── billing-service/   Dockerfile ✅  schema.sql ✅  .env.docker ✅

docker-compose.yml ✅  (4 DB + Redis + 4 service)
```

Tugasmu:
1. Tambah **Nginx API Gateway** sebagai satu pintu masuk semua request
2. Update **docker-compose.yml** agar Nginx masuk sebagai gateway
3. Buat **Kubernetes manifests** untuk deployment production
4. Tambah **health check endpoint** di setiap service
5. Buat **network isolation** yang benar
6. Buat **environment & secrets management**
7. **Test & verifikasi** seluruh sistem berjalan

---

## Arsitektur Target

```
Internet
    │
    ▼
[Nginx :80]  ← API Gateway (rate limit, routing, header forward)
    │
    ├── /api/v1/stations*     → station-service:8001
    ├── /api/v1/slots*        → station-service:8001
    ├── /api/v1/tariffs*      → station-service:8001
    ├── /api/v1/bookings*     → booking-service:8002
    ├── /api/v1/sessions*     → session-service:8003
    ├── /ws/*                 → session-service:8003 (WebSocket)
    ├── /api/v1/invoices*     → billing-service:8004
    └── /api/v1/payments*     → billing-service:8004

[Internal Docker Network — tidak bisa diakses langsung dari luar]
    station-service → station-db:5432
    booking-service → booking-db:5432 + redis:6379
    session-service → session-db:5432
    billing-service → billing-db:5432
```

---

## Task 1 — Nginx API Gateway Config

Buat folder dan file berikut:

```
gateway/
├── nginx.conf          ← konfigurasi utama Nginx
└── conf.d/
    └── emerald.conf    ← routing per service
```

### gateway/nginx.conf

```nginx
worker_processes auto;

events {
  worker_connections 1024;
}

http {
  include       /etc/nginx/mime.types;
  default_type  application/octet-stream;

  # Logging format dengan request ID
  log_format main '$remote_addr - $request_id [$time_local] '
                  '"$request" $status $body_bytes_sent '
                  '"$http_referer" "$http_user_agent"';

  access_log /var/log/nginx/access.log main;
  error_log  /var/log/nginx/error.log warn;

  # Rate limiting: 30 req/menit per IP
  limit_req_zone $binary_remote_addr zone=api_limit:10m rate=30r/m;

  # Timeout
  keepalive_timeout  65;
  send_timeout       60;
  proxy_read_timeout 60;

  include /etc/nginx/conf.d/*.conf;
}
```

### gateway/conf.d/emerald.conf

```nginx
upstream station_service  { server station-service:8001; }
upstream booking_service  { server booking-service:8002; }
upstream session_service  { server session-service:8003; }
upstream billing_service  { server billing-service:8004; }

server {
  listen 80;
  server_name _;

  # Tambahkan request ID ke setiap request
  add_header X-Request-Id $request_id always;

  # Rate limiting untuk semua endpoint API
  limit_req zone=api_limit burst=10 nodelay;

  # ── Health check gateway ──────────────────────────────────────────────
  location = /health {
    return 200 '{"status":"ok","gateway":"nginx","timestamp":"$time_iso8601"}';
    add_header Content-Type application/json;
  }

  # ── station-service ────────────────────────────────────────────────────
  location ~ ^/api/v1/(stations|slots|tariffs) {
    proxy_pass         http://station_service;
    proxy_set_header   Host              $host;
    proxy_set_header   X-Real-IP         $remote_addr;
    proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header   X-Request-Id      $request_id;
  }

  # Auth token endpoint (ada di station-service)
  location = /auth/token {
    proxy_pass         http://station_service;
    proxy_set_header   Host              $host;
    proxy_set_header   X-Real-IP         $remote_addr;
  }

  # ── booking-service ────────────────────────────────────────────────────
  location ~ ^/api/v1/bookings {
    proxy_pass         http://booking_service;
    proxy_set_header   Host              $host;
    proxy_set_header   X-Real-IP         $remote_addr;
    proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header   X-Request-Id      $request_id;
  }

  # ── session-service (HTTP + WebSocket) ────────────────────────────────
  location ~ ^/api/v1/sessions {
    proxy_pass         http://session_service;
    proxy_set_header   Host              $host;
    proxy_set_header   X-Real-IP         $remote_addr;
    proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header   X-Request-Id      $request_id;
  }

  # WebSocket upgrade untuk real-time meter push
  location ~ ^/ws/ {
    proxy_pass          http://session_service;
    proxy_http_version  1.1;
    proxy_set_header    Upgrade    $http_upgrade;
    proxy_set_header    Connection "upgrade";
    proxy_set_header    Host       $host;
    proxy_read_timeout  3600s;
  }

  # ── billing-service ────────────────────────────────────────────────────
  location ~ ^/api/v1/(invoices|payments) {
    proxy_pass         http://billing_service;
    proxy_set_header   Host              $host;
    proxy_set_header   X-Real-IP         $remote_addr;
    proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header   X-Request-Id      $request_id;
  }

  # ── 404 fallback ───────────────────────────────────────────────────────
  location / {
    return 404 '{"type":"/errors/not-found","title":"Route Not Found","status":404}';
    add_header Content-Type application/json;
  }
}
```

---

## Task 2 — Update docker-compose.yml

Tambah service `gateway` (Nginx) dan `emerald-network` ke `docker-compose.yml` yang sudah ada:

```yaml
# Tambahkan di bagian services: (setelah billing-service)
  gateway:
    image: nginx:1.27-alpine
    container_name: emerald-gateway
    ports:
      - "80:80"
    volumes:
      - ./gateway/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./gateway/conf.d:/etc/nginx/conf.d:ro
    depends_on:
      - station-service
      - booking-service
      - session-service
      - billing-service
    networks:
      - emerald-net
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost/health"]
      interval: 10s
      retries: 5

# Tambahkan networks di semua service yang sudah ada:
#   networks:
#     - emerald-net
# Dan tambahkan di bagian bawah:
networks:
  emerald-net:
    driver: bridge
```

> Tambahkan `networks: - emerald-net` ke semua service yang sudah ada:
> station-service, booking-service, session-service, billing-service,
> station-db, booking-db, session-db, billing-db, redis

---

## Task 3 — Health Check Endpoint per Service

Tambahkan endpoint `GET /health` di setiap `services/{nama}/src/index.ts` **sebelum** route lainnya:

```typescript
// Health check — digunakan oleh Docker healthcheck dan Kubernetes liveness probe
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'station-service',   // ganti sesuai nama service
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  })
})
```

Juga update `Dockerfile` setiap service — tambah `HEALTHCHECK`:

```dockerfile
# Tambahkan sebelum CMD di setiap Dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:8001/health || exit 1
```

Sesuaikan port di HEALTHCHECK: 8001, 8002, 8003, 8004.

---

## Task 4 — Kubernetes Manifests

Buat folder `k8s/` di root project dengan struktur:

```
k8s/
├── namespace.yaml
├── configmap.yaml
├── secrets.yaml
├── redis/
│   ├── deployment.yaml
│   └── service.yaml
├── station-service/
│   ├── deployment.yaml
│   └── service.yaml
├── booking-service/
│   ├── deployment.yaml
│   └── service.yaml
├── session-service/
│   ├── deployment.yaml
│   └── service.yaml
├── billing-service/
│   ├── deployment.yaml
│   └── service.yaml
└── ingress.yaml
```

### k8s/namespace.yaml

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: emerald-charge
  labels:
    app: emerald-charge
```

### k8s/configmap.yaml

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: emerald-config
  namespace: emerald-charge
data:
  SS_URL: "http://station-service:8001"
  BS_URL: "http://booking-service:8002"
  BL_URL: "http://billing-service:8004"
  REDIS_URL: "redis://emerald-redis:6379"
```

### k8s/secrets.yaml

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: emerald-secrets
  namespace: emerald-charge
type: Opaque
stringData:
  JWT_SECRET: "emerald-charge-secret-2026"
  DB_PASSWORD: "emerald2026"
  DB_USER: "emerald"
```

### k8s/station-service/deployment.yaml

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: station-service
  namespace: emerald-charge
  labels:
    app: station-service
spec:
  replicas: 2
  selector:
    matchLabels:
      app: station-service
  template:
    metadata:
      labels:
        app: station-service
    spec:
      containers:
        - name: station-service
          image: emerald-charge/station-service:latest
          ports:
            - containerPort: 8001
          env:
            - name: PORT
              value: "8001"
            - name: DATABASE_URL
              value: "postgresql://emerald:$(DB_PASSWORD)@station-db:5432/station_db"
            - name: JWT_SECRET
              valueFrom:
                secretKeyRef:
                  name: emerald-secrets
                  key: JWT_SECRET
            - name: REDIS_URL
              valueFrom:
                configMapKeyRef:
                  name: emerald-config
                  key: REDIS_URL
          livenessProbe:
            httpGet:
              path: /health
              port: 8001
            initialDelaySeconds: 20
            periodSeconds: 30
          readinessProbe:
            httpGet:
              path: /health
              port: 8001
            initialDelaySeconds: 10
            periodSeconds: 10
          resources:
            requests:
              memory: "128Mi"
              cpu: "100m"
            limits:
              memory: "256Mi"
              cpu: "250m"
```

### k8s/station-service/service.yaml

```yaml
apiVersion: v1
kind: Service
metadata:
  name: station-service
  namespace: emerald-charge
spec:
  selector:
    app: station-service
  ports:
    - port: 8001
      targetPort: 8001
  type: ClusterIP
```

> Buat deployment.yaml dan service.yaml yang sama untuk:
> `booking-service` (port 8002), `session-service` (port 8003), `billing-service` (port 8004)
> Sesuaikan port, nama image, dan env vars.

### k8s/redis/deployment.yaml

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: emerald-redis
  namespace: emerald-charge
spec:
  replicas: 1
  selector:
    matchLabels:
      app: emerald-redis
  template:
    metadata:
      labels:
        app: emerald-redis
    spec:
      containers:
        - name: redis
          image: redis:7-alpine
          ports:
            - containerPort: 6379
          command: ["redis-server", "--maxmemory", "256mb", "--maxmemory-policy", "allkeys-lru"]
          resources:
            requests:
              memory: "64Mi"
              cpu: "50m"
            limits:
              memory: "256Mi"
              cpu: "100m"
---
apiVersion: v1
kind: Service
metadata:
  name: emerald-redis
  namespace: emerald-charge
spec:
  selector:
    app: emerald-redis
  ports:
    - port: 6379
  type: ClusterIP
```

### k8s/ingress.yaml

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: emerald-ingress
  namespace: emerald-charge
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/rate-limit: "30"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "3600"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "3600"
    # WebSocket support
    nginx.ingress.kubernetes.io/proxy-http-version: "1.1"
    nginx.ingress.kubernetes.io/configuration-snippet: |
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection "upgrade";
spec:
  ingressClassName: nginx
  rules:
    - host: emerald-charge.local
      http:
        paths:
          - path: /api/v1/stations
            pathType: Prefix
            backend:
              service:
                name: station-service
                port:
                  number: 8001
          - path: /api/v1/slots
            pathType: Prefix
            backend:
              service:
                name: station-service
                port:
                  number: 8001
          - path: /api/v1/bookings
            pathType: Prefix
            backend:
              service:
                name: booking-service
                port:
                  number: 8002
          - path: /api/v1/sessions
            pathType: Prefix
            backend:
              service:
                name: session-service
                port:
                  number: 8003
          - path: /ws
            pathType: Prefix
            backend:
              service:
                name: session-service
                port:
                  number: 8003
          - path: /api/v1/invoices
            pathType: Prefix
            backend:
              service:
                name: billing-service
                port:
                  number: 8004
          - path: /api/v1/payments
            pathType: Prefix
            backend:
              service:
                name: billing-service
                port:
                  number: 8004
```

---

## Task 5 — .env.example per Service

Buat `.env.example` di setiap service (jangan isi nilai sensitif):

```bash
# services/station-service/.env.example
PORT=8001
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/station_db
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key-here
```

Sesuaikan PORT dan nama DB untuk setiap service.

---

## Task 6 — .gitignore Update

Tambahkan ke `.gitignore` root project:

```gitignore
# Environment files dengan credentials
services/**/.env
services/**/.env.local
!services/**/.env.example
!services/**/.env.docker

# Build artifacts
services/**/dist/
k8s/secrets.yaml
```

---

## Task 7 — Verifikasi & Test

### 7a. Test dengan docker-compose

```bash
# Build semua image
docker-compose build

# Jalankan semua (DB + Redis + services + gateway)
docker-compose up -d

# Cek semua container running
docker-compose ps

# Cek logs jika ada error
docker-compose logs -f station-service
docker-compose logs -f gateway
```

### 7b. Test endpoint melalui Nginx Gateway (port 80)

```bash
# Health check gateway
curl http://localhost/health

# Health check per service (melalui gateway)
curl http://localhost/api/v1/stations

# Get token
TOKEN=$(curl -s -X POST http://localhost/auth/token \
  -H "Content-Type: application/json" \
  -d '{"userId":"USR001","role":"user"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

# Test booking flow lengkap melalui gateway
curl -H "Authorization: Bearer $TOKEN" http://localhost/api/v1/stations
curl -H "Authorization: Bearer $TOKEN" "http://localhost/api/v1/slots/SL001/availability"

curl -X POST http://localhost/api/v1/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Idempotency-Key: hamsah-test-001" \
  -d '{"stationId":"ST001","slotId":"SL001","startTime":"2026-08-25T10:00:00Z","endTime":"2026-08-25T12:00:00Z"}'
```

### 7c. Test WebSocket melalui gateway

```bash
# Install wscat jika belum ada
npm install -g wscat

# Connect ke WebSocket melalui Nginx
wscat -c "ws://localhost/ws/CS001"
```

### 7d. Kubernetes (opsional, jika ada cluster)

```bash
# Apply semua manifest
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/redis/
kubectl apply -f k8s/station-service/
kubectl apply -f k8s/booking-service/
kubectl apply -f k8s/session-service/
kubectl apply -f k8s/billing-service/
kubectl apply -f k8s/ingress.yaml

# Cek status pods
kubectl get pods -n emerald-charge

# Cek logs
kubectl logs -n emerald-charge deployment/station-service
```

---

## Urutan Pengerjaan

```
1. Buat gateway/nginx.conf + gateway/conf.d/emerald.conf   (Task 1)
2. Update docker-compose.yml — tambah gateway + network    (Task 2)
3. Tambah GET /health di semua src/index.ts                (Task 3)
4. Update Dockerfile — tambah HEALTHCHECK                  (Task 3)
5. Buat k8s/ folder + semua manifest                       (Task 4)
6. Buat .env.example per service                           (Task 5)
7. Update .gitignore root                                  (Task 6)
8. docker-compose up --build && test semua endpoint        (Task 7)
9. git add . && git commit -m "feat(role4): add nginx gateway, k8s manifests, health checks"
10. git push origin main
```

---

## Checklist Selesai

Sebelum push, pastikan semua ini ada:

- [ ] `gateway/nginx.conf` — konfigurasi worker, rate limit, log
- [ ] `gateway/conf.d/emerald.conf` — routing ke 4 service + WebSocket
- [ ] `docker-compose.yml` — tambah gateway service + emerald-net network
- [ ] `GET /health` di semua 4 service
- [ ] `HEALTHCHECK` di semua 4 Dockerfile
- [ ] `k8s/namespace.yaml`
- [ ] `k8s/configmap.yaml`
- [ ] `k8s/secrets.yaml`
- [ ] `k8s/redis/deployment.yaml` + `service.yaml`
- [ ] `k8s/station-service/deployment.yaml` + `service.yaml`
- [ ] `k8s/booking-service/deployment.yaml` + `service.yaml`
- [ ] `k8s/session-service/deployment.yaml` + `service.yaml`
- [ ] `k8s/billing-service/deployment.yaml` + `service.yaml`
- [ ] `k8s/ingress.yaml`
- [ ] `.env.example` di semua service
- [ ] `docker-compose up --build` berjalan tanpa error
- [ ] `curl http://localhost/health` → `{"status":"ok",...}`
- [ ] `curl http://localhost/api/v1/stations` → data stasiun

---

## Rules Penting — Jangan Dilanggar

- ❌ JANGAN expose port DB (5432, 5433, 5434, 5435) ke public — hanya internal network
- ❌ JANGAN commit `.env` yang berisi password nyata — pakai `.env.example`
- ❌ JANGAN commit `k8s/secrets.yaml` yang sudah diisi
- ✅ Semua service harus bisa diakses HANYA melalui Nginx gateway (port 80)
- ✅ WebSocket path `/ws/*` harus di-upgrade dengan benar di Nginx
- ✅ Rate limiting aktif di gateway
- ✅ `X-Request-Id` header diteruskan ke semua service untuk distributed tracing
