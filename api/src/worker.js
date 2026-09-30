/*
 * Punto de entrada para Cloudflare Workers (npx wrangler deploy).
 * - La web Angular la sirve `assets` (ver wrangler.jsonc); aqui solo llega /api/*.
 * - La base de datos se alcanza por Hyperdrive (binding HYPERDRIVE), con un pool por peticion.
 * - FAMILY_KEY es un secreto: npx wrangler secret put FAMILY_KEY
 * En local se sigue usando `npm start` (src/server.js); este archivo solo corre en Workers.
 */
import { createServer } from 'node:http';
import { httpServerHandler } from 'cloudflare:node';
import { env as cfEnv } from 'cloudflare:workers';
import { createApp } from './app.js';
import { middlewareHyperdrive } from './db.js';

const PUERTO = 3000;

// Lectura perezosa: los bindings y secretos de Workers como si fueran process.env.
const appEnv = new Proxy(
  {},
  {
    get: (_, clave) => {
      if (clave === 'NODE_ENV') return cfEnv.NODE_ENV ?? 'production';
      const valor = cfEnv[clave];
      return typeof valor === 'string' ? valor : undefined;
    },
  },
);

// La app se crea en la primera peticion: Workers no permite timers en el ambito global
// (express-rate-limit arranca uno al crearse).
let app;
function obtenerApp() {
  app ??= createApp(appEnv, {
    servirWeb: false,
    middlewares: [middlewareHyperdrive(() => cfEnv.HYPERDRIVE)],
  });
  return app;
}

createServer((req, res) => obtenerApp()(req, res)).listen(PUERTO);

export default httpServerHandler({ port: PUERTO });
