import { Global, Module } from '@nestjs/common';
import { createPool } from 'mysql2/promise';
import { appConfig } from '../config/app.config';
import { MSSQL_POOL_MANAGER, MYSQL_POOL } from './database.constants';
import { MssqlPoolManager } from './mssql-pool.manager';

@Global()
@Module({
  providers: [
    {
      provide: MYSQL_POOL,
      useFactory: () =>
        createPool({
          host: appConfig.mysql.host,
          port: appConfig.mysql.port,
          user: appConfig.mysql.user,
          password: appConfig.mysql.password,
          database: appConfig.mysql.database,
          waitForConnections: true,
          connectionLimit: 10,
          namedPlaceholders: true,
        }),
    },
    MssqlPoolManager,
    {
      provide: MSSQL_POOL_MANAGER,
      useExisting: MssqlPoolManager,
    },
  ],
  exports: [MYSQL_POOL, MSSQL_POOL_MANAGER],
})
export class DatabaseModule {}
