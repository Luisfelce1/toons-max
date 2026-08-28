import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mysql from 'mysql2/promise';
import { applyTestDbEnv, TEST_DB_ENV } from './helpers/testDb.js';

applyTestDbEnv();

const { migrate } = await import('../src/migrate.js');

describe('migrate', () => {
  let connection;

  beforeAll(async () => {
    connection = await mysql.createConnection({
      host: TEST_DB_ENV.MYSQLHOST,
      port: Number(TEST_DB_ENV.MYSQLPORT),
      user: TEST_DB_ENV.MYSQLUSER,
      password: TEST_DB_ENV.MYSQLPASSWORD,
      database: TEST_DB_ENV.MYSQLDATABASE,
    });
  });

  afterAll(async () => {
    await connection.end();
  });

  it('creates the expected tables', async () => {
    await migrate();
    const [rows] = await connection.query('SHOW TABLES');
    const tableNames = rows.map((row) => Object.values(row)[0]);
    expect(tableNames).toEqual(expect.arrayContaining(['canal', 'serie', 'episodio']));
  });

  it('is idempotent: running it twice does not throw', async () => {
    await migrate();
    await expect(migrate()).resolves.not.toThrow();
  });
});
