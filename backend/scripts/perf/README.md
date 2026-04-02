# API performance tests (autocannon)

Load tests hit **`GET /api/guests`** and **`POST /api/guests`** with **100 concurrent connections** (configurable), measure latency, throughput, and HTTP error rates.

## Prerequisites

1. **PostgreSQL** with schema applied and at least one hotel row (default hotel UUID below must exist, or set `PERF_HOTEL_ID`).
2. A **user** that can list/create guests (e.g. **police** or **admin**), with credentials in `.env` as `PERF_EMAIL` / `PERF_PASSWORD`.

## 1. Configure `.env` (backend root)

Add (example):

```env
PERF_EMAIL=police@example.com
PERF_PASSWORD=your_secure_password
PERF_HOTEL_ID=11111111-1111-4111-8111-111111111111
```

Optional:

```env
PERF_BASE_URL=http://127.0.0.1:5001
PERF_CONNECTIONS=100
PERF_DURATION=10
PORT=5001
# POST writes are heavier than GET; defaults avoid overloading the DB pool (often ~40 conns).
PERF_POST_CONNECTIONS=30
PERF_POST_TIMEOUT=60
```

### Troubleshooting: POST shows `Timeouts: 100`, `Errors: 100`, `Total requests: 0`

That means **autocannon never got a full HTTP response** in time on those connections. Common causes:

1. **Too many concurrent POSTs** — each `POST /api/guests` uses a DB transaction (and pool). With **100** concurrent POSTs and a pool of **~40**, work queues and requests can exceed the **default 10s** autocannon timeout.
2. **Fix** — use **`PERF_POST_CONNECTIONS` ≤ pool size** (e.g. 20–30) and **`PERF_POST_TIMEOUT=60`** (now the script defaults). You can also raise **`DB_POOL_MAX`** in the server `.env` for load tests only.

Read-heavy **GET** load can still use **`PERF_CONNECTIONS=100`**; tune writes separately.

## 2. Start the API with rate limits disabled for the load test

Rate limiters would otherwise return **429** during sustained load. For **non-production** only, start with:

**Windows (PowerShell)**

```powershell
$env:PERF_SKIP_RATE_LIMIT='1'; $env:NODE_ENV='development'; node src/server.js
```

**macOS / Linux**

```bash
PERF_SKIP_RATE_LIMIT=1 NODE_ENV=development node src/server.js
```

Never set `PERF_SKIP_RATE_LIMIT=1` in production.

## 3. Run the load test (second terminal)

From the **backend** directory:

```bash
npm run perf
```

## Exit code

- **0** — thresholds met: no connection errors, non-2xx rate ≤ 5%. Prints **Performace testing correctly passed**.
- **1** — login failure, connection errors, or error rate too high.

## What is measured

- **Latency** — mean, p50, p99 (ms)
- **Throughput** — requests/sec and MB/s (response bytes)
- **Error rate** — share of non-2xx responses vs total completed requests
- **Stability** — note printed if p99 is very high vs p50 (tail latency)
