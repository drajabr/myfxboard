import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dashboardRoutes from './api/routes.js';
import ingestionRoutes from './api/ingestion.js';
import { validateDashboardEditToken } from './middleware/auth.js';
import { ensureDatabaseSchema } from './db/bootstrap.js';
import { isDatabaseReady } from './db/connection.js';

config();

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const TRUST_PROXY = String(process.env.TRUST_PROXY || 'true').toLowerCase() === 'true';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// In dev (tsx src/index.ts), __dirname is /app/src; in prod it's /app/dist/src.
// Resolve frontend path for both layouts.
const frontendDir = fs.existsSync(path.resolve(__dirname, '../frontend'))
  ? path.resolve(__dirname, '../frontend')
  : path.resolve(__dirname, '../../frontend');
const frontendIndexPath = path.join(frontendDir, 'index.html');
const chartUmdPath = fs.existsSync(path.resolve(__dirname, '../node_modules/chart.js/dist/chart.umd.js'))
  ? path.resolve(__dirname, '../node_modules/chart.js/dist/chart.umd.js')
  : path.resolve(__dirname, '../../node_modules/chart.js/dist/chart.umd.js');

// Middleware
app.set('trust proxy', TRUST_PROXY);
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use((req, _res, next) => {
  // Ingestion routes emit their own structured log lines — skip noisy duplication here.
  if (!req.path.startsWith('/api/ingestion')) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  }
  next();
});

// Process liveness check
app.get('/live', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: Date.now() });
});

// Strict readiness check (DB-aware)
app.get('/health', async (_req, res) => {
  const ready = await isDatabaseReady();
  if (!ready) {
    return res.status(503).json({ status: 'error', ready: false, timestamp: Date.now() });
  }

  return res.status(200).json({ status: 'ok', ready: true, timestamp: Date.now() });
});

// Dashboard read-only routes
app.use('/api/account', validateDashboardEditToken, dashboardRoutes);

// Ingestion routes
app.use('/api/ingestion', ingestionRoutes);

// Serve self-hosted Chart.js bundle to satisfy strict CSP (script-src 'self').
app.get('/vendor/chart.umd.js', (_req, res) => {
  if (fs.existsSync(chartUmdPath)) {
    res.type('application/javascript');
    res.sendFile(chartUmdPath);
    return;
  }
  res.status(404).send('Chart.js bundle not found');
});

// Serve frontend directly from the Node server.
if (fs.existsSync(frontendIndexPath)) {
  app.use(express.static(frontendDir));

  app.get(/^(?!\/api\/|\/health$).*/, (_req, res) => {
    res.sendFile(frontendIndexPath);
  });
}

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: NODE_ENV === 'production' ? 'Internal server error' : err.message });
});

async function start() {
  await ensureDatabaseSchema();

  app.listen(PORT, () => {
    console.log(`myfxboard server running on port ${PORT} (${NODE_ENV})`);
  });
}

start().catch((error) => {
  console.error('Server startup failed:', error);
  process.exit(1);
});

export default app;
