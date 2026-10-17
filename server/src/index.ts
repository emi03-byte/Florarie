import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { requireAuth } from './auth.js';
import { getDb } from './db.js';
import { authRouter } from './routes/auth.js';
import { bouquetsRouter } from './routes/bouquets.js';
import { ordersRouter } from './routes/orders.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDir = path.join(__dirname, '..', 'public');

const app = express();
// Azure Windows/iisnode may set PORT to a named pipe string; keep it as-is.
const rawPort = process.env.PORT || '4000';
const numericPort = Number(rawPort);
const listenPort = Number.isFinite(numericPort) ? numericPort : rawPort;
const corsOrigin = process.env.CORS_ORIGIN || true;

app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/auth', authRouter);
app.use('/api/bouquets', requireAuth, bouquetsRouter);
app.use('/api/orders', requireAuth, ordersRouter);

if (fs.existsSync(clientDir)) {
  app.use(express.static(clientDir));
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      next();
      return;
    }
    if (req.path.startsWith('/api')) {
      next();
      return;
    }
    res.sendFile(path.join(clientDir, 'index.html'), (err) => {
      if (err) next(err);
    });
  });
}

async function start() {
  await getDb();
  app.listen(listenPort, () => {
    console.log(`Florarie API listening on ${String(listenPort)}`);
  });
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
