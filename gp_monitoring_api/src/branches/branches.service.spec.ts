import type { Pool } from 'mysql2/promise';
import { BranchesService } from './branches.service';

// NOTE: findBranches() uses pool.query(), not pool.execute(), specifically because mysql2's
// execute() (prepared statements / binary protocol) does not expand an array bound to `?` for
// an IN (?) clause the way query() (text protocol) does — under execute() the excluded-code
// filter silently fails to match, and excluded rows still come back. That bug is invisible to
// this mocked unit test, since the mock just echoes back whatever the test tells it to and
// never exercises real IN (?) parameter binding. If you touch this file's SQL or its
// parameter shape again, verify the query against a real MySQL connection, not just this file.
describe('BranchesService', () => {
  const query = jest.fn();
  const mysqlPool = { query } as unknown as Pool;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('queries with the _FC, mainserverdatabasename, and excluded-branch-code filters', async () => {
    query.mockResolvedValue([[]]);
    const service = new BranchesService(mysqlPool);

    await service.findBranches();

    const [sql, params] = query.mock.calls[0];

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
    query.mockResolvedValue([
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

    const [, params] = query.mock.calls[0];
    expect(params).toEqual([['BG2']]);
  });

  it('maps snake_case rows to the Branch shape', async () => {
    query.mockResolvedValue([
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
