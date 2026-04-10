# myfxboard

Minimal guide for running the MT5 dashboard.

## What this repo does

- Receives MT5 position/account sync data every 3 seconds
- Stores data in PostgreSQL
- Serves dashboard UI and API from the Node server
- Uses HMAC-signed ingestion requests

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
docker compose up -d
```

3. Run migrations (first run):

```bash
docker compose exec server npm run db:migrate
```

4. Open dashboard:

```text
http://localhost:3000
```

## EA setup

Use the included full EA:

- `connectors/smaGUY Trade Manger-myfxboard.mq5`

### 1. Create account in dashboard

1. Open Settings.
2. Unlock with `MASTER_TOKEN` from `.env`.
3. Create an account ID (example: `EURUSD_001`).
4. Copy generated secret key.

### 2. Configure EA inputs

Set these values in MT5 inputs:

```mql5
InpEnableDashboardSync = true
InpDashboardUrl = "http://localhost:3000"
InpDashboardAccountId = "EURUSD_001"
InpDashboardPSK = "<secret key from dashboard>"
InpDashboardSyncIntervalSec = 3
InpDashboardDebugLog = true
```

### 3. Verify

1. Attach EA to chart.
2. Check MT5 Journal for successful sync messages.
3. Open dashboard and confirm positions appear.

### Troubleshooting

- Confirm account ID in EA matches dashboard account ID exactly.
- Confirm PSK in EA matches generated dashboard key.
- Check backend logs: `docker compose logs server`.

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
- `POST /api/account/create`
- `POST /api/ingestion/{accountId}`
- `POST /api/ingestion/{accountId}/backfill`

## Project layout

```text
src/        backend API
db/         sql migrations
frontend/   dashboard html/css/js
connectors/ mt5 full EA files
docker/     nginx config
```
