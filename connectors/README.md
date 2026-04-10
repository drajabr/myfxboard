# Standalone EA Package

This folder is focused on one supported MT5 path: run the full myfxboard-enabled EA.

Generic "add connector to any EA" guidance has been removed.

## Supported EA

- `smaGUY Trade Manger-myfxboard.mq5` is the primary, full EA.
- `DashboardConnector.mqh` is an internal helper used by the full EA in this folder.

## Quick Start

1. Compile and attach `smaGUY Trade Manger-myfxboard.mq5` in MT5.
2. In dashboard settings, create an account and copy the secret key.
3. Configure these EA inputs:
   - `InpEnableDashboardSync = true`
   - `InpDashboardUrl = http://localhost:3000`
   - `InpDashboardAccountId = <your dashboard account id>`
   - `InpDashboardPSK = <your dashboard secret key>`
   - `InpDashboardSyncIntervalSec = 3`
4. Confirm sync in MT5 Journal and the dashboard UI.

## Troubleshooting

- Ensure dashboard services are running: `docker compose up -d`
- Ensure account ID in EA exactly matches dashboard account ID
- Ensure PSK in EA matches the dashboard-generated key
- For local testing, use `http://localhost:3000`

## Notes

- Sync is low-overhead and runs from the EA timer loop.
- Account guard is enabled to prevent accidental cross-account sync.
- Requests are authenticated and timestamp-protected by the server.
3. Adjust authentication (if needed)
4. Extend with new methods as needed

No changes needed in your EA code if you keep the public interface the same.

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Apr 10, 2026 | Initial release |

---

## Support

For issues:
1. Enable debug logging: `DashboardConnector::SetDebugLog(true)`
2. Check MT5 Journal for `[DashboardConnector]` messages
3. Review [../../SETUP.md](../../SETUP.md) for deployment guide
4. Check logs: `docker compose logs server`

---

**Status**: Production Ready ✅
