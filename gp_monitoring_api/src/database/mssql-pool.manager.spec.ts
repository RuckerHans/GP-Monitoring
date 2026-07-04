import { Logger } from '@nestjs/common';
import * as sql from 'mssql';
import { appConfig } from '../config/app.config';
import { MssqlPoolManager } from './mssql-pool.manager';

jest.mock('mssql', () => ({
  ConnectionPool: jest.fn(),
}));

describe('MssqlPoolManager', () => {
  const connect = jest.fn();
  const close = jest.fn();
  const ConnectionPool = sql.ConnectionPool as unknown as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    connect.mockResolvedValue({ close });
    ConnectionPool.mockImplementation(() => ({ connect }));
    appConfig.mssql.authType = 'sql';
    appConfig.mssql.domain = undefined;
  });

  it('uses SQL Server authentication by default', async () => {
    const manager = new MssqlPoolManager();

    await manager.getPool();

    expect(ConnectionPool).toHaveBeenCalledWith(
      expect.objectContaining({
        user: appConfig.mssql.user,
        password: appConfig.mssql.password,
      }),
    );
  });

  it('uses NTLM authentication for a Windows account', async () => {
    appConfig.mssql.authType = 'ntlm';
    appConfig.mssql.domain = 'ACME';
    const manager = new MssqlPoolManager();

    await manager.getPool();

    expect(ConnectionPool).toHaveBeenCalledWith(
      expect.objectContaining({
        authentication: {
          type: 'ntlm',
          options: {
            domain: 'ACME',
            userName: appConfig.mssql.user,
            password: appConfig.mssql.password,
          },
        },
      }),
    );
  });

  it('does not cache a rejected connection', async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    const loginError = Object.assign(new Error('Login failed'), {
      code: 'ELOGIN',
    });
    connect.mockRejectedValueOnce(loginError).mockResolvedValueOnce({ close });
    const manager = new MssqlPoolManager();

    await expect(manager.getPool()).rejects.toBe(loginError);
    await expect(manager.getPool()).resolves.toEqual({ close });

    expect(ConnectionPool).toHaveBeenCalledTimes(2);
  });
});
