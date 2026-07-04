require('dotenv').config();

const sql = require('mssql');
const mysql = require('mysql2/promise');

const requiredEnv = (key) => {
  const value = process.env[key];

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
};

const authType = (process.env.MSSQL_AUTH_TYPE || 'sql').toLowerCase();
const server = requiredEnv('MSSQL_HOST');
const database = requiredEnv('MSSQL_DATABASE');

if (authType !== 'sql' && authType !== 'ntlm') {
  throw new Error('MSSQL_AUTH_TYPE must be either "sql" or "ntlm"');
}

const baseConfig = {
  server,
  port: Number(process.env.MSSQL_PORT || 1433),
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

if (authType === 'ntlm') {
  baseConfig.authentication = {
    type: 'ntlm',
    options: {
      domain: requiredEnv('MSSQL_DOMAIN'),
      userName: requiredEnv('MSSQL_USER'),
      password: requiredEnv('MSSQL_PASSWORD'),
    },
  };
} else {
  baseConfig.user = requiredEnv('MSSQL_USER');
  baseConfig.password = requiredEnv('MSSQL_PASSWORD');
}

const tryDatabase = async (databaseName) => {
  const pool = new sql.ConnectionPool({
    ...baseConfig,
    database: databaseName,
  });

  try {
    await pool.connect();
    await pool.request().query('SELECT 1 AS connected');
    return { connected: true };
  } catch (error) {
    return {
      connected: false,
      code: error && error.code,
      message: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await pool.close().catch(() => undefined);
  }
};

const getBranchDatabases = async () => {
  const pool = mysql.createPool({
    host: requiredEnv('MYSQL_HOST'),
    port: Number(process.env.MYSQL_PORT || 3306),
    user: requiredEnv('MYSQL_USER'),
    password: requiredEnv('MYSQL_PASSWORD'),
    database: requiredEnv('MYSQL_DATABASE'),
    connectionLimit: 1,
  });

  try {
    const [rows] = await pool.execute(`
      SELECT DISTINCT mainserverdatabasename
      FROM branches
      WHERE branchlocation IS NOT NULL
        AND LOWER(branchlocation) NOT LIKE '%\\_fc'
        AND mainserverdatabasename IS NOT NULL
        AND mainserverdatabasename <> ''
      ORDER BY mainserverdatabasename
    `);

    return rows.map((row) => row.mainserverdatabasename);
  } finally {
    await pool.end();
  }
};

const main = async () => {
  console.log(
    `Checking ${authType} authentication on ${server} for database "${database}"...`,
  );

  const targetResult = await tryDatabase(database);
  if (targetResult.connected) {
    console.log(`Success: connected to "${database}".`);
  } else {
    console.error(
      `Target database failed (${targetResult.code || 'unknown'}): ${targetResult.message}`,
    );

    if (database.toLowerCase() !== 'master') {
      const masterResult = await tryDatabase('master');
      if (masterResult.connected) {
        console.error(
          `The login is valid, but it does not have access to "${database}" or that database is unavailable.`,
        );
        process.exitCode = 2;
        return;
      }

      console.error(
        `Master database also failed (${masterResult.code || 'unknown'}): ${masterResult.message}`,
      );
    }

    console.error(
      'SQL Server rejected the account. Verify the password, login status, and authentication mode on the server.',
    );
    process.exitCode = 1;
    return;
  }

  const branchDatabases = await getBranchDatabases();
  const databasesToCheck = [
    ...new Set(
      branchDatabases.filter(
        (branchDatabase) =>
          branchDatabase.toLowerCase() !== database.toLowerCase(),
      ),
    ),
  ];

  console.log(`Checking ${databasesToCheck.length} branch database(s)...`);
  let failed = 0;

  for (const branchDatabase of databasesToCheck) {
    const result = await tryDatabase(branchDatabase);
    if (result.connected) {
      console.log(`PASS  ${branchDatabase}`);
    } else {
      failed += 1;
      console.error(
        `FAIL  ${branchDatabase} (${result.code || 'unknown'}): ${result.message}`,
      );
    }
  }

  if (failed > 0) {
    console.error(
      `${failed} branch database(s) failed. Verify those database names and grant markuser access to each one.`,
    );
    process.exitCode = 2;
  } else {
    console.log('Success: all configured branch databases are accessible.');
  }
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
