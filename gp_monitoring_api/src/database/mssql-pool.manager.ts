import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import * as sql from 'mssql';
import { appConfig } from '../config/app.config';

@Injectable()
export class MssqlPoolManager implements OnApplicationShutdown {
  private readonly logger = new Logger(MssqlPoolManager.name);
  private readonly pools = new Map<string, Promise<sql.ConnectionPool>>();
  private readonly reportedLoginFailures = new Set<string>();

  getPool(database = appConfig.mssql.database): Promise<sql.ConnectionPool> {
    const cleanDatabase = this.assertSafeIdentifier(database);

    if (!this.pools.has(cleanDatabase)) {
      const poolPromise = this.createPool(cleanDatabase).catch((error) => {
        this.pools.delete(cleanDatabase);
        throw this.describeConnectionError(error, cleanDatabase);
      });

      this.pools.set(cleanDatabase, poolPromise);
    }

    return this.pools.get(cleanDatabase)!;
  }

  async onApplicationShutdown(): Promise<void> {
    await Promise.all(
      [...this.pools.values()].map(async (poolPromise) => {
        const pool = await poolPromise;
        await pool.close();
      }),
    );
  }

  private createPool(database: string): Promise<sql.ConnectionPool> {
    const config: sql.config = {
      server: appConfig.mssql.host,
      port: appConfig.mssql.port,
      database,
      options: {
        encrypt: false,
        trustServerCertificate: true,
      },
      pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30_000,
      },
    };

    if (appConfig.mssql.authType === 'ntlm') {
      config.authentication = {
        type: 'ntlm',
        options: {
          domain: appConfig.mssql.domain!,
          userName: appConfig.mssql.user,
          password: appConfig.mssql.password,
        },
      };
    } else {
      config.user = appConfig.mssql.user;
      config.password = appConfig.mssql.password;
    }

    const pool = new sql.ConnectionPool(config);

    return pool.connect();
  }

  private describeConnectionError(error: unknown, database: string): Error {
    if (error instanceof Error && 'code' in error && error.code === 'ELOGIN') {
      const account =
        appConfig.mssql.authType === 'ntlm'
          ? `${appConfig.mssql.domain}\\${appConfig.mssql.user}`
          : appConfig.mssql.user;
      const guidance =
        appConfig.mssql.authType === 'ntlm'
          ? 'Verify the Windows account and its access to this database.'
          : 'Verify that the database exists and this SQL login has access to it.';
      const failureKey = `${appConfig.mssql.authType}:${appConfig.mssql.host}:${account}:${database}`;

      if (!this.reportedLoginFailures.has(failureKey)) {
        this.reportedLoginFailures.add(failureKey);
        this.logger.error(
          `MSSQL rejected ${appConfig.mssql.authType} login "${account}" for database "${database}" on ${appConfig.mssql.host}. ${guidance}`,
        );
      }
    }

    return error instanceof Error ? error : new Error(String(error));
  }

  private assertSafeIdentifier(value: string): string {
    if (!/^[A-Za-z0-9_]+$/.test(value)) {
      throw new Error(`Unsafe MSSQL database name: ${value}`);
    }

    return value;
  }
}
