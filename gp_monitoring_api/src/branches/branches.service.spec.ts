import type { Pool } from 'mysql2/promise';
import { BranchesService } from './branches.service';

describe('BranchesService', () => {
  const query = jest.fn();
  const mysqlPool = { query } as unknown as Pool;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('includes Compal locations and exception codes', async () => {
    query.mockResolvedValue([[]]);
    await new BranchesService(mysqlPool).findBranches();
    const [sql] = query.mock.calls[0];
    expect(sql).not.toContain('NOT LIKE');
    expect(sql).not.toContain('NOT IN');
    expect(sql).toContain('mainserverdatabasename IS NOT NULL');
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
