import { Logger } from '@nestjs/common';
import { BranchesService } from '../branches/branches.service';
import { MssqlPoolManager } from '../database/mssql-pool.manager';
import { GpAnalysisService } from './gp-analysis.service';

describe('GpAnalysisService', () => {
  const branches = [
    {
      id: '1',
      branchCode: 'ONE',
      branchName: 'Branch One',
      branchLocation: 'Branch One',
      mainServerDatabaseName: 'branch_one',
    },
    {
      id: '2',
      branchCode: 'TWO',
      branchName: 'Branch Two',
      branchLocation: 'Branch Two',
      mainServerDatabaseName: 'branch_two',
    },
  ];

  const branchesService = {
    findBranches: jest.fn(),
  };
  const mssqlPoolManager = {
    getPool: jest.fn(),
  };
  const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

  const queryResult = {
    recordset: [{ date: '2026-07-04', sales: 100, profit: 20 }],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    branchesService.findBranches.mockResolvedValue(branches);
  });

  it('returns available branches when one database is unavailable', async () => {
    mssqlPoolManager.getPool
      .mockResolvedValueOnce({
        request: () => ({
          input: jest.fn(),
          query: jest.fn().mockResolvedValue(queryResult),
        }),
      })
      .mockRejectedValueOnce(new Error('Login failed'));
    const service = new GpAnalysisService(
      branchesService as unknown as BranchesService,
      mssqlPoolManager as unknown as MssqlPoolManager,
    );

    await expect(service.findDailyAnalysis()).resolves.toEqual([
      {
        count: 1,
        date: '2026-07-04',
        branch: 'Branch One',
        sales: 100,
        profit: 20,
        gp: 20,
        mainServerDatabaseName: 'branch_one',
      },
    ]);

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('database "branch_two"'),
    );
  });

  it('throws when every configured branch fails', async () => {
    const connectionError = new Error('SQL Server unavailable');
    mssqlPoolManager.getPool.mockRejectedValue(connectionError);
    const service = new GpAnalysisService(
      branchesService as unknown as BranchesService,
      mssqlPoolManager as unknown as MssqlPoolManager,
    );

    await expect(service.findDailyAnalysis()).rejects.toBe(connectionError);
  });
});
