import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createApiRouter } from './routes/api.js';
import { familyKeyMiddleware } from './auth.js';

// Carpeta de la web compilada. Se calcula solo al servirla desde Node: en Workers
// no existe import.meta.url y la web la sirve Cloudflare (assets).
function webDist() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../web/dist/web/browser');
}

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

/**
 * @param env variables de entorno
 * @param opciones.servirWeb  sirve la app Angular compilada (en Workers la sirve `assets`)
 * @param opciones.middlewares middlewares extra antes de las rutas (p. ej. Hyperdrive en Workers)
 */
export function createApp(env = process.env, { servirWeb = true, middlewares = [] } = {}) {
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
          // Cortos en dominio publico servidos desde Internet Archive (redirige a ia*.us.archive.org).
          mediaSrc: ["'self'", 'https://archive.org', 'https://*.archive.org'],
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

  for (const mw of middlewares) app.use(mw);

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

  if (servirWeb) {
    const WEB_DIST = webDist();
    app.use(express.static(WEB_DIST));
    app.get(/^(?!\/api).*/, (req, res, next) => {
      res.sendFile(path.join(WEB_DIST, 'index.html'), (err) => {
        if (err) next();
      });
    });
  }

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
