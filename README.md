# myfxboard

Simple setup and usage guide for running the dashboard and syncing from MT5.

## What you need

1. Docker Desktop (recommended) or Node.js 20+
2. MetaTrader 5 on Windows
3. This repo cloned locally

## Quick setup (Docker, recommended)

From the project root:

1. Copy environment file

	Copy-Item .env.example .env

2. Set your shared secret in .env

	CONNECTOR_SHARED_SECRET=your_secret_here

	Optional if needed:
	DATABASE_URL=postgresql://dashboard:dashboard_pass@localhost:5432/myfxboard
	PORT=3000

3. Start everything

	docker compose up --build -d

4. Open dashboard

	http://localhost:3000

5. Install as mobile/desktop app (optional)

	Open the dashboard in your browser and use the Install App button in the header,
	or use the browser's Add to Home Screen / Install option.

## Run commands

From the project root:

1. Start (Docker)

	docker compose up --build -d

2. Stop (Docker)

	docker compose down

3. View server logs

	docker compose logs -f server

4. Local dev (without Docker)

	npm install
	npm run dev

5. Build

	npm run build

6. Test and lint

	npm run test
	npm run lint

## MT5 EA file

Use this EA source:

- connectors/smaGUY Trade Manger-myfxboard.mq5

## Deploy EA to all MT5 terminals (Windows)

From the project root, run:

	powershell -ExecutionPolicy Bypass -File .\connectors\deploy-mt5-ea.ps1

The script finds terminals, asks for confirmation, and deploys the EA to all discovered instances (with admin relaunch when needed).

## MT5 terminal setup (one time)

1. In MT5, open Tools -> Options -> Expert Advisors
2. Enable Allow WebRequest for listed URL
3. Add your dashboard URL, for example:

	http://localhost:3000

4. Attach the EA to your chart
5. Set EA inputs:

	InpEnableDashboardSync = true
	InpDashboardUrl = "http://localhost:3000"
	InpDashboardPSK = "<same value as CONNECTOR_SHARED_SECRET>"
	InpDashboardSyncIntervalSec = 3
	InpDashboardDebugLog = true

## Daily use

1. Start the stack
2. Run EA deploy command after any EA code change
3. Open MT5 and keep EAs attached
4. Open dashboard at http://localhost:3000

## Health endpoints

1. Liveness (process up):

	http://localhost:3000/live

2. Readiness (process + database ready):

	http://localhost:3000/health

The Docker health check uses readiness, so a healthy container now means the API can reach PostgreSQL.
 