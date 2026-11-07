import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { securityHeadersMiddleware } from './server-lib/securityHeaders.js';
import { handleHealth, handleTestConnection, handleFetch, handleInterpret } from './server-lib/handlers.js';
import { checkRateLimit } from './server-lib/rateLimiter.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Phase 2 Security: Set trust proxy for correct client IP detection in container/proxy environments
  app.set('trust proxy', 1);

  // Security headers middleware (CSP report-only, nosniff, referrer-policy, frame-ancestors)
  app.use(securityHeadersMiddleware);

  // Global rate limiter middleware for /api/* with automatic periodic pruning of expired entries
  app.use('/api', (req, res, next) => {
    const clientIp = (req.ip || req.socket.remoteAddress || 'unknown').toString();
    // Allow up to 120 requests per minute across general API
    if (!checkRateLimit(`global_${clientIp}`, 120, 60000)) {
      return res.status(429).json({ error: 'Global API rate limit exceeded. Please try again shortly.' });
    }
    next();
  });

  // Health check endpoint (lightweight, no body parser needed)
  app.get('/api/health', (_req, res) => {
    res.json(handleHealth());
  });

  // Test Live Database / Server Connection Endpoint (capped at 1MB)
  app.post('/api/live-data/test-connection', express.json({ limit: '1mb' }), async (req, res) => {
    try {
      const result = await handleTestConnection(req.body);
      res.status(result.status).json(result.data);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Connection test failed' });
    }
  });

  // Live Data Ingestion & Fetch Endpoint (capped at 2MB)
  app.post('/api/live-data/fetch', express.json({ limit: '2mb' }), async (req, res) => {
    try {
      const result = await handleFetch(req.body);
      res.status(result.status).json(result.data);
    } catch (err: any) {
      console.error('Live fetch error:', err);
      res.status(500).json({ success: false, error: err.message || 'Failed to fetch live data' });
    }
  });

  // AI Interpretation API grounded in calculated data (capped at 2.5MB)
  app.post('/api/ai/interpret', express.json({ limit: '2.5mb' }), async (req, res) => {
    try {
      const clientIp = (req.ip || req.socket.remoteAddress || 'unknown').toString();
      const authHeader = req.headers.authorization;
      const result = await handleInterpret(req.body, clientIp, authHeader);
      res.status(result.status).json(result.data);
    } catch (error: any) {
      console.error('AI interpret endpoint error:', error);
      res.status(500).json({ error: error.message || 'Failed to interpret data' });
    }
  });

  // General fallback JSON parser for other potential routes (5MB)
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true, limit: '5mb' }));

  // Setup Vite in middleware mode for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`NexusBI Data Analyst Server running on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
