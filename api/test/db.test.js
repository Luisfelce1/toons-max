import { describe, it, expect } from 'vitest';
import { parseDbConfig } from '../src/db.js';

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
