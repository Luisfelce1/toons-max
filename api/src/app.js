import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createApiRouter } from './routes/api.js';
import { familyKeyMiddleware } from './auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_DIST = path.resolve(__dirname, '../../web/dist/web/browser');

function corsMiddleware(env) {
  const allowedOrigin = env.NODE_ENV === 'production' ? env.CORS_ORIGIN : 'http://localhost:4200';

  return (req, res, next) => {
    if (allowedOrigin) {
      res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
      res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-family-key');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    return next();
  };
}

export function createApp(env = process.env) {
  const app = express();

  app.set('trust proxy', 1);
  app.use(express.json({ limit: '100kb' }));
  app.use(corsMiddleware(env));

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", 'https://www.youtube.com'],
          styleSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https://static.tvmaze.com', 'https://cdn.myanimelist.net'],
          fontSrc: ["'self'"],
          connectSrc: ["'self'"],
          frameSrc: ["'self'", 'https://www.youtube-nocookie.com', 'https://www.youtube.com'],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          frameAncestors: ["'self'"],
        },
      },
    })
  );

  const generalLimiter = rateLimit({
    windowMs: Number(env.RATE_LIMIT_WINDOW_MS) || 60_000,
    limit: Number(env.RATE_LIMIT_MAX) || 300,
    standardHeaders: true,
    legacyHeaders: false,
  });

  const loginLimiter = rateLimit({
    windowMs: Number(env.LOGIN_RATE_LIMIT_WINDOW_MS) || 15 * 60_000,
    limit: Number(env.LOGIN_RATE_LIMIT_MAX) || 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { ok: false, error: 'Demasiados intentos, intenta de nuevo mas tarde.' },
  });

  app.use('/api', generalLimiter);
  app.use('/api/login', loginLimiter);

  const apiRouter = createApiRouter(env);
  app.use(
    '/api',
    (req, res, next) => {
      if (req.path === '/health' || req.path === '/login') return next();
      return familyKeyMiddleware(env)(req, res, next);
    },
    apiRouter
  );

  app.use(express.static(WEB_DIST));
  app.get(/^(?!\/api).*/, (req, res, next) => {
    res.sendFile(path.join(WEB_DIST, 'index.html'), (err) => {
      if (err) next();
    });
  });

  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Recurso no encontrado' });
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.status || 500).json({ error: 'Error interno del servidor' });
  });

  return app;
}
