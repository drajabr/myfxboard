# 🚀 myfxboard - MT5 Trading Dashboard

A production-ready, real-time trading dashboard that syncs with your MetaTrader 5 Expert Advisor.

## ⚡ Quick Facts

- **Real-Time Sync**: 3-second heartbeat from MT5 to dashboard
- **Multi-Account**: Track multiple MT5 accounts on one dashboard
- **Docker-Ready**: Run anywhere with Docker Compose (`docker compose up -d`)
- **Secure**: HMAC-SHA256 authentication + token-gated settings
- **TypeScript**: Full type safety with strict mode
- **Responsive**: Mobile-friendly web dashboard
- **Connector Module**: Reusable MQL5 connector for ANY Expert Advisor

## 🔌 Standalone Connector

Includes a modular **Dashboard Connector** (MQL5) that works with any EA.

**Include in 2 lines:**
```mql5
#include "connectors/DashboardConnector.mqh"
DashboardConnector::Init("http://localhost:3000", "account_id", "psk", 3);
```

See `connectors/README.md` for full documentation.

## 🎯 What It Does

1. Your MT5 EA sends position data every 3 seconds via HTTP POST
2. Dashboard server validates and stores in PostgreSQL
3. Browser displays real-time equity, positions, and P&L
4. All updates happen automatically with zero manual intervention

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local development)
- PostgreSQL 16+ (if not using Docker)

### Using Docker Compose (Recommended)

1. Clone the repository:
```bash
git clone https://github.com/yourusername/mt5-dashboard.git
cd mt5-dashboard
```

2. Copy environment file:
```bash
cp .env.example .env
```

3. Update `.env` with your configuration (especially `JWT_SECRET` and `MASTER_TOKEN`)

4. Start the stack:
```bash
docker-compose up -d
```

5. Access the dashboard:
- **Dashboard**: http://localhost
- **API**: http://localhost:3000

6. Run migrations (first time only):
```bash
docker-compose exec api npm run db:migrate
```

### Local Development

1. Install dependencies:
```bash
npm install
```

2. Setup PostgreSQL:
```bash
psql -U postgres -c "CREATE USER dashboard WITH PASSWORD 'dashboard_pass';"
psql -U postgres -c "CREATE DATABASE mt5_dashboard OWNER dashboard;"
```

3. Run migrations:
```bash
npm run db:migrate
```

4. Start dev server:
```bash
npm run dev
```

5. Start dev frontend:
```bash
# In another terminal
cd frontend && python -m http.server 3001
```

## API Documentation

### Authentication

Ingestion endpoints use HMAC-SHA256 signed requests:

```
Authorization: HMAC-SHA256 {account_id}:{signature}
X-Signature-Timestamp: {unix_ms}

Signature = HMAC-SHA256(secret_hash, "{account_id}:{timestamp}")
```

### Endpoints

#### Readonly (No authentication required)

- `GET /api/account/{accountId}/dashboard` - Dashboard summary with positions and stats
- `GET /api/account/{accountId}/positions` - Open positions
- `GET /api/account/{accountId}/trades` - Recent closed trades
- `GET /api/account/{accountId}/equity-curve?days=90` - Equity curve data
- `GET /api/accounts` - List all linked accounts

#### Write (Requires unlock token)

- `POST /api/account/create` - Create new account link
- `POST /api/account/{accountId}/unlock` - Get unlock token (requires master token)
- `PATCH /api/account/{accountId}/settings` - Update settings

#### Ingestion (EA only)

- `POST /api/ingestion/{accountId}` - Realtime heartbeat sync
- `POST /api/ingestion/{accountId}/backfill` - History chunk backfill

## EA Integration

### MQL5 Inputs

Add these inputs to your Expert Advisor:

```
input string InpServerUrl = "http://localhost:3000";     // Server URL
input string InpAccountId = "";                          // Account ID
input string InpPSK = "";                                // Pre-Shared Key
input int InpSyncInterval = 3;                           // Sync interval (seconds)
input bool InpSyncEnabled = true;                        // Enable sync
```

### Sync Protocol

1. EA sends heartbeat every N seconds with open positions and account summary
2. Server responds with:
   - `history_status: "up_to_date"` or `"backfill_required"`
   - If backfill required: `from_time_ms` and `chunk_size`
3. EA sends closed trades in chunks until caught up
4. Resume normal heartbeat

### MQL5 Code Example

See `docs/ea-integration.md` for complete implementation details.

## Configuration

### Environment Variables

- `DATABASE_URL` - PostgreSQL connection string
- `NODE_ENV` - `development` or `production`
- `PORT` - API port (default: 3000)
- `JWT_SECRET` - Secret for token signing
- `MASTER_TOKEN` - Token to unlock settings
- `SYNC_REQUEST_TIMEOUT_MS` - HTTP timeout for ingestion (default: 5000)
- `SYNC_HISTORY_CHUNK_SIZE` - Chunk size for history backfill (default: 100)
- `SYNC_HISTORY_RATE_LIMIT_MS` - Rate limit between backfill chunks (default: 1500)
- `UNLOCK_TOKEN_TTL_MINUTES` - Settings unlock TTL (default: 30)
- `BACKFILL_WINDOW_DAYS` - Default backfill window on first link (default: 90)

## Deployment

### Docker Hub (with GitHub Actions)

1. Set GitHub secrets:
   - `DOCKER_USERNAME`
   - `DOCKER_PASSWORD`

2. Push to main or tag a release:
```bash
git tag v0.1.0
git push origin v0.1.0
```

3. GitHub Actions automatically builds and pushes image to Docker Hub

4. Pull production image:
```bash
docker pull {username}/mt5-dashboard:v0.1.0
```

## Project Structure

```
.
├── .github/workflows/          # GitHub Actions
│   └── docker-build.yml        # Build & push Docker image
├── src/
│   ├── api/                    # Express routes
│   │   ├── routes.ts           # Dashboard endpoints
│   │   └── ingestion.ts        # EA sync endpoints
│   ├── db/                     # Database layer
│   │   ├── connection.ts       # PG pool & query helper
│   │   └── queries.ts          # Data access layer
│   ├── middleware/             # Auth & validation
│   │   ├── auth.ts             # HMAC-SHA256 auth
│   │   └── validation.ts       # Zod schemas
│   ├── types/                  # TypeScript interfaces
│   └── index.ts                # Main server
├── db/
│   └── migrations/             # SQL migrations
│       └── 001_initial_schema.sql
├── frontend/
│   ├── index.html              # Dashboard UI
│   ├── styles.css              # Styling
│   └── dashboard.js            # Client logic
├── docker/
│   └── nginx.conf              # Reverse proxy config
├── Dockerfile                  # Multi-stage build
├── docker-compose.yml          # Local development stack
├── package.json
├── tsconfig.json
└── README.md
```

## Testing

Run tests:
```bash
npm run test
```

Run tests in CI:
```bash
npm run test:ci
```

Lint code:
```bash
npm run lint
```

## Monitoring & Logs

### Health Check

```bash
curl http://localhost:3000/health
# {"status": "ok", "timestamp": 1712800000000}
```

### View Logs

```bash
docker-compose logs -f api
docker-compose logs -f postgres
docker-compose logs -f nginx
```

## Security Considerations

- All settings are gated behind an unlock token
- Dashboard data is always readonly
- Ingestion uses HMAC-SHA256 with timestamp window protection
- Pre-shared secrets are hashed with SHA256 before storage
- HTTPS recommended for production
- Sensitive environment variables should not be committed

## Troubleshooting

### Database Connection Errors
```bash
docker-compose exec postgres psql -U dashboard -d mt5_dashboard -c "SELECT 1"
```

### Migrations Failed
```bash
docker-compose exec api npm run db:migrate
```

### API Not Responding
```bash
docker-compose logs api
```

## Roadmap

- [ ] Advanced charts (TradingView integration)
- [ ] Economic calendar
- [ ] Notification webhooks (Discord/Telegram)
- [ ] Multi-user support with role-based access
- [ ] Cloudflare Workers deployment option
- [ ] Mobile-optimized UI
- [ ] Performance metrics analysis

## License

MIT

## Support

For issues or questions, open an issue on GitHub or contact the maintainer.
