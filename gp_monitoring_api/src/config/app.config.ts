import 'dotenv/config';

const requiredEnv = (key: string): string => {
  const value = process.env[key];

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
};

const numberEnv = (key: string, fallback: number): number => {
  const value = process.env[key];
  return value ? Number(value) : fallback;
};

const listEnv = (key: string, fallback: string[]): string[] => {
  const value = process.env[key];

  if (!value) {
    return fallback;
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const mssqlAuthType = (): 'sql' | 'ntlm' => {
  const value = process.env.MSSQL_AUTH_TYPE?.toLowerCase() ?? 'sql';

  if (value !== 'sql' && value !== 'ntlm') {
    throw new Error('MSSQL_AUTH_TYPE must be either "sql" or "ntlm"');
  }

  return value;
};

const mssqlAuth = mssqlAuthType();

export const appConfig = {
  apiKey: requiredEnv('API_KEY'),
  jwtSecret: requiredEnv('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
  sessionSecret: requiredEnv('SESSION_SECRET'),
  corsOrigins: listEnv('CORS_ORIGINS', []),
  mysql: {
    host: requiredEnv('MYSQL_HOST'),
    user: requiredEnv('MYSQL_USER'),
    password: requiredEnv('MYSQL_PASSWORD'),
    database: requiredEnv('MYSQL_DATABASE'),
    port: numberEnv('MYSQL_PORT', 3306),
  },
  mssql: {
    authType: mssqlAuth,
    host: requiredEnv('MSSQL_HOST'),
    user: requiredEnv('MSSQL_USER'),
    password: requiredEnv('MSSQL_PASSWORD'),
    domain: mssqlAuth === 'ntlm' ? requiredEnv('MSSQL_DOMAIN') : undefined,
    database: requiredEnv('MSSQL_DATABASE'),
    port: numberEnv('MSSQL_PORT', 1433),
    analysisTable:
      process.env.GP_ANALYSIS_TABLE ??
      'dbo.gp_analysis_header_by_category_daily',
  },
};
