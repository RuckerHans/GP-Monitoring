import { Inject, Injectable } from '@nestjs/common';
import type { RowDataPacket } from 'mysql2';
import type { Pool } from 'mysql2/promise';
import { MYSQL_POOL } from '../database/database.constants';

export interface Branch {
  id: string;
  branchCode: string;
  branchName: string;
  branchLocation: string;
  mainServerDatabaseName: string;
}

interface BranchRow extends RowDataPacket {
  id: string;
  branchcode: string;
  branchname: string;
  branchlocation: string;
  mainserverdatabasename: string;
}

@Injectable()
export class BranchesService {
  private readonly excludedBranchCodes = ['BG2']; // BAGBAGUIN2 — confirmed test/phantom
                                                     // branch, same record also present in
                                                     // TFinished Monitoring's datacenter API
                                                     // with a blank ws_terminal field there

  constructor(@Inject(MYSQL_POOL) private readonly mysqlPool: Pool) {}

  async findBranches(): Promise<Branch[]> {
    const [rows] = await this.mysqlPool.execute<BranchRow[]>(
      `
        SELECT
          CAST(id AS CHAR) AS id,
          branchcode,
          branchname,
          branchlocation,
          mainserverdatabasename
        FROM branches
        WHERE branchlocation IS NOT NULL
          AND LOWER(branchlocation) NOT LIKE '%\\_fc'
          AND mainserverdatabasename IS NOT NULL
          AND mainserverdatabasename <> ''
          AND branchcode NOT IN (?)
        ORDER BY branchlocation ASC
      `,
      [this.excludedBranchCodes],
    );

    return rows.map((row) => ({
      id: row.id,
      branchCode: row.branchcode,
      branchName: row.branchname,
      branchLocation: row.branchlocation,
      mainServerDatabaseName: row.mainserverdatabasename,
    }));
  }
}
