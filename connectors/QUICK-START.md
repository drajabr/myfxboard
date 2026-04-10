# Quick Start - Standalone Full EA

Use this guide for the supported setup: run the full myfxboard EA directly.

## 5-Minute Setup

### 1. Start dashboard services

```bash
docker compose up -d
```

### 2. Create dashboard account

1. Open http://localhost:3000
2. Unlock settings with your master token
3. Create an account ID (example: `EURUSD_001`)
4. Copy the generated secret key

### 3. Configure the full EA

Attach `smaGUY Trade Manger-myfxboard.mq5` in MT5 and set:

- `InpEnableDashboardSync = true`
- `InpDashboardUrl = http://localhost:3000`
- `InpDashboardAccountId = EURUSD_001`
- `InpDashboardPSK = <secret from dashboard>`
- `InpDashboardSyncIntervalSec = 3`
- `InpDashboardDebugLog = true` (optional for testing)

### 4. Verify sync

Check MT5 Journal for successful sync logs, then confirm positions appear in the dashboard.

## Troubleshooting

- If no sync appears, verify account ID and PSK are an exact match.
- If network errors appear, confirm server availability and URL.
- For local setups, prefer `http://localhost:3000`.

## Scope

This repo no longer documents a generic "connector for any EA" workflow. The supported path is the full standalone EA package in this folder.
