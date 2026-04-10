import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dashboardRoutes from './api/routes.js';
import ingestionRoutes from './api/ingestion.js';
import { ensureDatabaseSchema } from './db/bootstrap.js';

config();

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.resolve(__dirname, '../../frontend');
const frontendIndexPath = path.join(frontendDir, 'index.html');

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: Date.now() });
});

// Dashboard read-only routes
app.use('/api/account', dashboardRoutes);

// Ingestion routes
app.use('/api/ingestion', ingestionRoutes);

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
