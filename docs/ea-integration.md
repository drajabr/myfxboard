# MT5 Full EA Setup Guide

This project now supports a single MT5 integration path: use the full EA package already prepared in the repository.

## Supported file

- `connectors/smaGUY Trade Manger-myfxboard.mq5`

## Configure dashboard sync

In EA inputs, set:

```mql5
input bool   InpEnableDashboardSync = true;
input string InpDashboardUrl = "http://localhost:3000";
input string InpDashboardAccountId = "";
input string InpDashboardPSK = "";
input int    InpDashboardSyncIntervalSec = 3;
input bool   InpDashboardDebugLog = false;
```

## Dashboard account setup

1. Start services: `docker compose up -d`
2. Open dashboard at http://localhost:3000
3. Unlock settings with master token
4. Create account and copy secret key
5. Paste account ID and secret key into EA inputs

## Verify

1. Attach EA to chart in MT5
2. Confirm sync logs appear in MT5 Journal
3. Open dashboard and verify positions update in near real time

## Troubleshooting

- If sync is skipped, check account ID exactly matches dashboard account ID.
- If request errors appear, verify URL and network path.
- If no updates are visible, confirm dashboard services are healthy.

## Scope note

Legacy documentation for patching arbitrary third-party EAs has been retired. The maintained path is the standalone full EA above.
