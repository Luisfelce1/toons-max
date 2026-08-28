import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import { parseDbConfig } from './db.js';

const schemaPath = fileURLToPath(new URL('./schema.sql', import.meta.url));

export async function migrate(env = process.env) {
  const sql = await readFile(schemaPath, 'utf8');
  const statements = sql
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);

  const connection = await mysql.createConnection(parseDbConfig(env));
  try {
    for (const statement of statements) {
      await connection.query(statement);
    }
  } finally {
    await connection.end();
  }
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  migrate()
    .then(() => {
      console.log('Migracion aplicada correctamente.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error aplicando la migracion:', error);
      process.exit(1);
    });
}
