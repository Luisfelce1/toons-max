import mysql from 'mysql2/promise';

export function parseDbConfig(env = process.env) {
  if (env.DATABASE_URL) {
    const url = new URL(env.DATABASE_URL);
    return {
      host: url.hostname,
      port: url.port ? Number(url.port) : 3306,
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: url.pathname.replace(/^\//, ''),
    };
  }

  return {
    host: env.MYSQLHOST || '127.0.0.1',
    port: env.MYSQLPORT ? Number(env.MYSQLPORT) : 3306,
    user: env.MYSQLUSER || 'root',
    password: env.MYSQLPASSWORD || '',
    database: env.MYSQLDATABASE || 'retrotoons_dev',
  };
}

let pool;

export function getPool(env = process.env) {
  if (!pool) {
    pool = mysql.createPool({
      ...parseDbConfig(env),
      charset: 'utf8mb4_unicode_ci',
      waitForConnections: true,
      connectionLimit: 10,
      dateStrings: true,
    });
  }
  return pool;
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}
