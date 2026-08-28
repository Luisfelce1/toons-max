export const TEST_DB_ENV = {
  MYSQLHOST: process.env.MYSQLHOST || '127.0.0.1',
  MYSQLPORT: process.env.MYSQLPORT || '3306',
  MYSQLUSER: process.env.MYSQLUSER || 'retrotoons',
  MYSQLPASSWORD: process.env.MYSQLPASSWORD || 'retrotoons',
  MYSQLDATABASE: process.env.MYSQLDATABASE || 'retrotoons_test',
};

export function applyTestDbEnv() {
  Object.assign(process.env, TEST_DB_ENV);
}
