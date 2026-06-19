import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import * as sql from 'mssql';
import { appConfig } from '../config/app.config';

@Injectable()
export class MssqlPoolManager implements OnApplicationShutdown {
  private readonly pools = new Map<string, Promise<sql.ConnectionPool>>();

  getPool(database = appConfig.mssql.database): Promise<sql.ConnectionPool> {
    const cleanDatabase = this.assertSafeIdentifier(database);

    if (!this.pools.has(cleanDatabase)) {
      this.pools.set(cleanDatabase, this.createPool(cleanDatabase));
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
    const pool = new sql.ConnectionPool({
      server: appConfig.mssql.host,
      port: appConfig.mssql.port,
      user: appConfig.mssql.user,
      password: appConfig.mssql.password,
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
    });

    return pool.connect();
  }

  private assertSafeIdentifier(value: string): string {
    if (!/^[A-Za-z0-9_]+$/.test(value)) {
      throw new Error(`Unsafe MSSQL database name: ${value}`);
    }

    return value;
  }
}
