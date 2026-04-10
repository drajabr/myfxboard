# Deprecated: Manual Patch Workflow

This document is retained for history only.

The project no longer recommends patching dashboard sync into arbitrary EAs. Use the standalone full EA provided in the repository:

- `connectors/smaGUY Trade Manger-myfxboard.mq5`

For active setup steps, see:

- `EA-INTEGRATION-SETUP.md`
- `docs/ea-integration.md`

⚠️ **Important**: 
- Never hardcode PSK in production; use EA inputs
- Use HTTPS in production (requires proper certificate)
- Consider firewall rules to restrict API access
- Rotate PSK periodically via dashboard Settings

## Next Steps

1. ✅ Local testing with Docker Compose
2. Deploy to production server
3. Configure HTTPS (add reverse proxy like Cloudflare)
4. Implement closed trades sync for historical data
5. Add portfolio equity/curve tracking
