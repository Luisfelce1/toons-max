import fs from 'node:fs';
import path from 'node:path';
import { AsyncLocalStorage } from 'node:async_hooks';
import mysql from 'mysql2/promise';

/**
 * SSL para bases gestionadas (Aiven, etc.):
 * - DB_SSL_CA=./ca.pem          -> TLS verificando el certificado del proveedor (recomendado).
 * - DB_SSL=true o ?ssl-mode=REQUIRED en DATABASE_URL -> TLS con las CA publicas del sistema.
 * Sin nada de lo anterior: conexion sin TLS (MariaDB local / docker).
 */
export function parseSslConfig(env = process.env, { readFile = fs.readFileSync } = {}) {
  if (env.DB_SSL_CA) {
    const ruta = path.resolve(env.DB_SSL_CA);
    return { ca: readFile(ruta, 'utf8'), rejectUnauthorized: true };
  }
  const sslMode = env.DATABASE_URL ? new URL(env.DATABASE_URL).searchParams.get('ssl-mode') : null;
  const pideSsl = String(env.DB_SSL ?? '').toLowerCase() === 'true' || /^(required|verify_ca|verify_identity)$/i.test(sslMode ?? '');
  return pideSsl ? { rejectUnauthorized: true } : undefined;
}

export function parseDbConfig(env = process.env, opciones = {}) {
  const ssl = parseSslConfig(env, opciones);
  const base = env.DATABASE_URL
    ? (() => {
        const url = new URL(env.DATABASE_URL);
        return {
          host: url.hostname,
          port: url.port ? Number(url.port) : 3306,
          user: decodeURIComponent(url.username),
          password: decodeURIComponent(url.password),
          database: url.pathname.replace(/^\//, ''),
        };
      })()
    : {
        host: env.MYSQLHOST || '127.0.0.1',
        port: env.MYSQLPORT ? Number(env.MYSQLPORT) : 3306,
        user: env.MYSQLUSER || 'root',
        password: env.MYSQLPASSWORD || '',
        database: env.MYSQLDATABASE || 'retrotoons_dev',
      };
  return ssl ? { ...base, ssl } : base;
}

const OPCIONES_POOL = {
  charset: 'utf8mb4_unicode_ci',
  waitForConnections: true,
  dateStrings: true,
};

/*
 * En Cloudflare Workers no se puede reutilizar una conexion entre peticiones, asi que
 * cada peticion abre su propio pool (a traves de Hyperdrive, que es quien mantiene las
 * conexiones calientes con la base real) y lo cierra al terminar. getPool() devuelve
 * ese pool por peticion cuando existe; en Node (scripts, tests, servidor) usa el global.
 */
const poolPorPeticion = new AsyncLocalStorage();

let pool;

export function getPool(env = process.env) {
  const delaPeticion = poolPorPeticion.getStore();
  if (delaPeticion) return delaPeticion;
  if (!pool) {
    pool = mysql.createPool({ ...parseDbConfig(env), ...OPCIONES_POOL, connectionLimit: 10 });
  }
  return pool;
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}

/** Config de mysql2 para el binding de Hyperdrive (Workers exige disableEval). */
export function hyperdriveConfig(hyperdrive) {
  return {
    host: hyperdrive.host,
    port: Number(hyperdrive.port),
    user: hyperdrive.user,
    password: hyperdrive.password,
    database: hyperdrive.database,
    disableEval: true,
  };
}

/**
 * Hyperdrive no admite prepared statements de MySQL (COM_STMT_PREPARE), que es lo que
 * genera `execute()`. En Workers lo redirigimos a `query()`: mysql2 sustituye los `?`
 * escapando los valores en el cliente, asi que sigue protegido contra inyeccion SQL.
 */
export function sinPreparedStatements(poolReal) {
  return {
    execute: (sql, params) => poolReal.query(sql, params),
    query: (sql, params) => poolReal.query(sql, params),
    end: () => poolReal.end(),
  };
}

/**
 * Middleware de Express para Workers: pool por peticion via Hyperdrive.
 * `obtenerHyperdrive` devuelve el binding (env.HYPERDRIVE).
 */
export function middlewareHyperdrive(obtenerHyperdrive, { crearPool = mysql.createPool } = {}) {
  return (req, res, next) => {
    const hyperdrive = obtenerHyperdrive();
    if (!hyperdrive) return next();

    const poolPeticion = sinPreparedStatements(
      crearPool({ ...hyperdriveConfig(hyperdrive), ...OPCIONES_POOL, connectionLimit: 3 }),
    );
    let cerrado = false;
    const cerrar = () => {
      if (cerrado) return;
      cerrado = true;
      Promise.resolve(poolPeticion.end()).catch(() => undefined);
    };
    res.on('finish', cerrar);
    res.on('close', cerrar);

    return poolPorPeticion.run(poolPeticion, next);
  };
}
