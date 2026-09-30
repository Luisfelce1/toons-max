import { EventEmitter } from 'node:events';
import { describe, it, expect, vi } from 'vitest';
import { parseDbConfig, hyperdriveConfig, middlewareHyperdrive, getPool } from '../src/db.js';

describe('parseDbConfig', () => {
  it('parses DATABASE_URL into a mysql2 pool config', () => {
    const cfg = parseDbConfig({
      DATABASE_URL: 'mysql://user:pass@localhost:3307/mydb',
    });
    expect(cfg).toMatchObject({
      host: 'localhost',
      port: 3307,
      user: 'user',
      password: 'pass',
      database: 'mydb',
    });
  });

  it('falls back to MYSQL* variables when DATABASE_URL is absent', () => {
    const cfg = parseDbConfig({
      MYSQLHOST: 'db.internal',
      MYSQLPORT: '3306',
      MYSQLUSER: 'retrotoons',
      MYSQLPASSWORD: 'secret',
      MYSQLDATABASE: 'retrotoons_dev',
    });
    expect(cfg).toMatchObject({
      host: 'db.internal',
      port: 3306,
      user: 'retrotoons',
      password: 'secret',
      database: 'retrotoons_dev',
    });
  });

  it('defaults to localhost:3306 when nothing is configured', () => {
    const cfg = parseDbConfig({});
    expect(cfg.host).toBe('127.0.0.1');
    expect(cfg.port).toBe(3306);
  });

  it('decodes URL-encoded credentials', () => {
    const cfg = parseDbConfig({
      DATABASE_URL: 'mysql://us%40er:p%40ss@localhost:3306/mydb',
    });
    expect(cfg.user).toBe('us@er');
    expect(cfg.password).toBe('p@ss');
  });
});

describe('SSL (Aiven y similares)', () => {
  it('usa el certificado de DB_SSL_CA y verifica el servidor', () => {
    const readFile = vi.fn().mockReturnValue('-----BEGIN CERTIFICATE-----');
    const cfg = parseDbConfig({ DATABASE_URL: 'mysql://u:p@h.aivencloud.com:12345/defaultdb', DB_SSL_CA: './ca.pem' }, { readFile });
    expect(readFile).toHaveBeenCalledWith(expect.stringMatching(/ca\.pem$/), 'utf8');
    expect(cfg.ssl).toEqual({ ca: '-----BEGIN CERTIFICATE-----', rejectUnauthorized: true });
    expect(cfg.database).toBe('defaultdb');
  });

  it('activa TLS con ?ssl-mode=REQUIRED aunque no haya CA', () => {
    const cfg = parseDbConfig({ DATABASE_URL: 'mysql://u:p@h:3306/db?ssl-mode=REQUIRED' });
    expect(cfg.ssl).toEqual({ rejectUnauthorized: true });
    expect(cfg.database).toBe('db');
  });

  it('sin SSL para MariaDB local', () => {
    expect(parseDbConfig({ DATABASE_URL: 'mysql://u:p@localhost:3306/db' }).ssl).toBeUndefined();
  });
});

describe('middlewareHyperdrive', () => {
  const hyperdrive = { host: 'hd.local', port: '3306', user: 'u', password: 'p', database: 'db' };

  it('hyperdriveConfig activa disableEval', () => {
    expect(hyperdriveConfig(hyperdrive)).toMatchObject({ host: 'hd.local', port: 3306, disableEval: true });
  });

  it('da un pool por peticion a getPool() y lo cierra una sola vez al terminar', () => {
    const poolFalso = { end: vi.fn().mockResolvedValue(undefined) };
    const crearPool = vi.fn().mockReturnValue(poolFalso);
    const mw = middlewareHyperdrive(() => hyperdrive, { crearPool });
    const res = new EventEmitter();
    let visto;
    mw({}, res, () => {
      visto = getPool();
    });
    expect(visto).toBe(poolFalso);
    expect(crearPool.mock.calls[0][0]).toMatchObject({ disableEval: true, connectionLimit: 3 });
    res.emit('finish');
    res.emit('close');
    expect(poolFalso.end).toHaveBeenCalledTimes(1);
  });

  it('no hace nada sin binding (Node normal)', () => {
    const next = vi.fn();
    const crearPool = vi.fn();
    middlewareHyperdrive(() => undefined, { crearPool })({}, new EventEmitter(), next);
    expect(next).toHaveBeenCalled();
    expect(crearPool).not.toHaveBeenCalled();
  });
});
