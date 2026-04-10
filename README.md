# myfxboard

Minimal guide for running the MT5 dashboard.

## What this repo does

- Receives MT5 position/account sync data every 3 seconds
- Enforces configurable minimum ingest interval (`SYNC_MIN_INGEST_INTERVAL_MS`, default `3000`)
- Stores data in PostgreSQL
- Serves dashboard UI and API from the Node server
- Uses HMAC-signed ingestion requests

## Protocol rules (strict)

- Ingestion auth is strict HMAC validation only; compatibility signatures are not accepted.
- `X-Signature-Timestamp` must be unix epoch milliseconds and within the auth window.
- Position payloads must provide explicit `direction` (`BUY` or `SELL`).
- Ingestion writes run in a single DB transaction to avoid partial state.

## Supported MT5 path

Use the included full EA:

- `connectors/smaGUY Trade Manger-myfxboard.mq5`

## Quick start (Docker)

1. Copy env file:

```bash
cp .env.example .env
```

2. Start stack:

```bash
docker compose up --build -d
```

3. Open dashboard:

```text
http://localhost:3000
```

The server now bootstraps the database schema automatically on startup, including when you reuse an existing Postgres volume.

The connector sync protocol now separates live updates from history sync:

- Live position/account payloads can continue every sync interval.
- Closed-trade history is sent only when its hash changes or the server requests a resend.
- Server responds with `server_history_hash` and `history_sync_required` so clients can stay aligned.

## EA setup

Use the included full EA:

- `connectors/smaGUY Trade Manger-myfxboard.mq5`

### 1. Configure shared connector secret

1. Set `CONNECTOR_SHARED_SECRET` in `.env`.
2. Restart server if already running.
3. No dashboard account creation is needed.
4. Account records are auto-created from connector account number.

### 2. Configure EA inputs

Set these values in MT5 inputs:

```mql5
InpEnableDashboardSync = true
InpDashboardUrl = "http://localhost:3000"
InpDashboardPSK = "<CONNECTOR_SHARED_SECRET from .env>"
InpDashboardSyncIntervalSec = 3
InpDashboardDebugLog = true
```

### 2.1 MT5 WebRequest whitelist (required)

In MetaTrader 5, open `Tools -> Options -> Expert Advisors` and enable `Allow WebRequest for listed URL`.
Add your dashboard URL (same host as `InpDashboardUrl`), for example:

```text
http://localhost:3000
```

If this URL is not whitelisted, connector requests will be blocked by MT5.

### 3. Verify

1. Attach EA to chart.
2. Check MT5 Journal for successful sync messages.
3. Open dashboard and confirm positions appear.

### Troubleshooting

- Confirm `InpDashboardPSK` exactly matches `CONNECTOR_SHARED_SECRET`.
- Confirm connector can POST to `/api/ingestion`.
- Check backend logs: `docker compose logs server`.
- If you previously started the stack with a schema-less Postgres volumed -d` again so the server can bootstrap the schema on that existing database.

## Core commands

```bash
# local dev
npm install
npm run dev

# tests and lint
npm run test
npm run lint
```

## Main API routes

- `GET /api/accounts`
- `GET /api/account/{accountId}/dashboard`
- `POST /api/ingestion`
- `POST /api/ingestion/backfill`

## Project layout

```text
src/        backend API
db/         sql migrations
frontend/   dashboard html/css/js
connectors/ mt5 full EA files
docker/     nginx config
```
