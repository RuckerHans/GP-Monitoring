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

  describe('findMonthlyAnalysis', () => {
    const monthlyQueryResult = {
      recordset: [{ month: '2026-07', sales: 500, profit: 100 }],
    };

    it('returns totals for a valid month', async () => {
      mssqlPoolManager.getPool.mockResolvedValue({
        request: () => ({
          input: jest.fn(),
          query: jest.fn().mockResolvedValue(monthlyQueryResult),
        }),
      });
      const service = new GpAnalysisService(
        branchesService as unknown as BranchesService,
        mssqlPoolManager as unknown as MssqlPoolManager,
      );

      await expect(service.findMonthlyAnalysis('2026-07')).resolves.toEqual([
        {
          count: 1,
          month: '2026-07',
          branch: 'Branch One',
          sales: 500,
          profit: 100,
          gp: 20,
          mainServerDatabaseName: 'branch_one',
        },
        {
          count: 2,
          month: '2026-07',
          branch: 'Branch Two',
          sales: 500,
          profit: 100,
          gp: 20,
          mainServerDatabaseName: 'branch_two',
        },
      ]);
    });

    it('defaults to the latest available month when omitted', async () => {
      mssqlPoolManager.getPool.mockResolvedValue({
        request: () => ({
          input: jest.fn(),
          query: jest.fn().mockResolvedValue(monthlyQueryResult),
        }),
      });
      const service = new GpAnalysisService(
        branchesService as unknown as BranchesService,
        mssqlPoolManager as unknown as MssqlPoolManager,
      );

      await expect(service.findMonthlyAnalysis()).resolves.toEqual(
        expect.arrayContaining([expect.objectContaining({ month: '2026-07' })]),
      );
    });

    it('rejects an invalid month format', async () => {
      const service = new GpAnalysisService(
        branchesService as unknown as BranchesService,
        mssqlPoolManager as unknown as MssqlPoolManager,
      );

      await expect(service.findMonthlyAnalysis('2026/07')).rejects.toThrow(
        'Month must use YYYY-MM format.',
      );
    });

    it('skips a branch that fails without failing the whole request', async () => {
      mssqlPoolManager.getPool
        .mockResolvedValueOnce({
          request: () => ({
            input: jest.fn(),
            query: jest.fn().mockResolvedValue(monthlyQueryResult),
          }),
        })
        .mockRejectedValueOnce(new Error('Login failed'));
      const service = new GpAnalysisService(
        branchesService as unknown as BranchesService,
        mssqlPoolManager as unknown as MssqlPoolManager,
      );

      await expect(service.findMonthlyAnalysis('2026-07')).resolves.toEqual([
        {
          count: 1,
          month: '2026-07',
          branch: 'Branch One',
          sales: 500,
          profit: 100,
          gp: 20,
          mainServerDatabaseName: 'branch_one',
        },
      ]);

      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('database "branch_two"'),
      );
    });
  });
});
