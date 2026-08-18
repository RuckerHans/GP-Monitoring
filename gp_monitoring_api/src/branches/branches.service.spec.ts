import type { Pool } from 'mysql2/promise';
import { BranchesService } from './branches.service';

describe('BranchesService', () => {
  const execute = jest.fn();
  const mysqlPool = { execute } as unknown as Pool;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('queries with the _FC, mainserverdatabasename, and excluded-branch-code filters', async () => {
    execute.mockResolvedValue([[]]);
    const service = new BranchesService(mysqlPool);

    await service.findBranches();

    const [sql, params] = execute.mock.calls[0];

    // _FC branches are excluded structurally
    expect(sql).toContain("LOWER(branchlocation) NOT LIKE '%\\_fc'");
    // branches missing a mainserverdatabasename are excluded structurally
    expect(sql).toContain('mainserverdatabasename IS NOT NULL');
    expect(sql).toContain("mainserverdatabasename <> ''");
    // known bad/test branches are excluded explicitly by code
    expect(sql).toContain('branchcode NOT IN (?)');
    expect(params).toEqual([['BG2']]);
  });

  it('excludes BG2 (BAGBAGUIN2) from the mapped result', async () => {
    // The WHERE clause filters BG2 out server-side; since this is a unit test without a
    // live database, we simulate that by having the mock only return rows that would
    // survive the query and assert BG2 never appears in the mapped output.
    execute.mockResolvedValue([
      [
        {
          id: '1',
          branchcode: 'MAIN',
          branchname: 'Main Branch',
          branchlocation: 'Main Branch',
          mainserverdatabasename: 'main_branch',
        },
      ],
    ]);
    const service = new BranchesService(mysqlPool);

    const branches = await service.findBranches();

    expect(branches.some((branch) => branch.branchCode === 'BG2')).toBe(false);
    expect(branches).toEqual([
      {
        id: '1',
        branchCode: 'MAIN',
        branchName: 'Main Branch',
        branchLocation: 'Main Branch',
        mainServerDatabaseName: 'main_branch',
      },
    ]);

    const [, params] = execute.mock.calls[0];
    expect(params).toEqual([['BG2']]);
  });

  it('maps snake_case rows to the Branch shape', async () => {
    execute.mockResolvedValue([
      [
        {
          id: '2',
          branchcode: 'TWO',
          branchname: 'Branch Two',
          branchlocation: 'Branch Two',
          mainserverdatabasename: 'branch_two',
        },
      ],
    ]);
    const service = new BranchesService(mysqlPool);

    await expect(service.findBranches()).resolves.toEqual([
      {
        id: '2',
        branchCode: 'TWO',
        branchName: 'Branch Two',
        branchLocation: 'Branch Two',
        mainServerDatabaseName: 'branch_two',
      },
    ]);
  });
});
