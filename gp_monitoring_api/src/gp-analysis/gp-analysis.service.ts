import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import * as sql from 'mssql';
import { appConfig } from '../config/app.config';
import { MSSQL_POOL_MANAGER } from '../database/database.constants';
import { MssqlPoolManager } from '../database/mssql-pool.manager';
import { Branch, BranchesService } from '../branches/branches.service';

export interface DailyGpAnalysis {
  count: number;
  date: string | null;
  branch: string;
  sales: number;
  profit: number;
  gp: number;
  mainServerDatabaseName: string;
}

interface DailyTotalsRow {
  date: string | null;
  sales: number | null;
  profit: number | null;
}

@Injectable()
export class GpAnalysisService {
  private readonly logger = new Logger(GpAnalysisService.name);

  constructor(
    private readonly branchesService: BranchesService,
    @Inject(MSSQL_POOL_MANAGER)
    private readonly mssqlPoolManager: MssqlPoolManager,
  ) {}

  async findDailyAnalysis(date?: string): Promise<DailyGpAnalysis[]> {
    this.validateDate(date);

    const branches = await this.branchesService.findBranches();
    const settledResults = await Promise.allSettled(
      branches.map((branch) => this.getBranchDailyTotals(branch, date)),
    );
    const results: Omit<DailyGpAnalysis, 'count'>[] = [];
    let firstError: unknown;

    settledResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
        return;
      }

      firstError ??= result.reason;
      const branch = branches[index];
      const message =
        result.reason instanceof Error
          ? result.reason.message
          : String(result.reason);

      this.logger.warn(
        `Skipping branch "${branch.branchLocation}" using database "${branch.mainServerDatabaseName}": ${message}`,
      );
    });

    if (branches.length > 0 && results.length === 0) {
      throw firstError;
    }

    return results.map((result, index) => ({
      count: index + 1,
      ...result,
    }));
  }

  private async getBranchDailyTotals(
    branch: Branch,
    date?: string,
  ): Promise<Omit<DailyGpAnalysis, 'count'>> {
    const pool = await this.mssqlPoolManager.getPool(
      branch.mainServerDatabaseName,
    );
    const request = pool.request();
    request.input('date', sql.Date, date ?? null);

    const tableName = this.getAnalysisTableName();

    const queryResult = await request.query<DailyTotalsRow>(`
      DECLARE @reportDate date = ISNULL(
        @date,
        (SELECT MAX(date_) FROM ${tableName})
      );

      SELECT
        CONVERT(varchar(10), @reportDate, 23) AS date,
        CAST(ISNULL(SUM(sales), 0) AS float) AS sales,
        CAST(ISNULL(SUM(profit), 0) AS float) AS profit
      FROM ${tableName}
      WHERE date_ = @reportDate
    `);

    const row = queryResult.recordset[0];
    const sales = Number(row?.sales ?? 0);
    const profit = Number(row?.profit ?? 0);

    return {
      date: row?.date ?? null,
      branch: branch.branchLocation,
      sales,
      profit,
      gp: sales === 0 ? 0 : (profit / sales) * 100,
      mainServerDatabaseName: branch.mainServerDatabaseName,
    };
  }

  private validateDate(date?: string): void {
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new BadRequestException('Date must use YYYY-MM-DD format.');
    }
  }

  private getAnalysisTableName(): string {
    if (!/^[A-Za-z0-9_]+\.[A-Za-z0-9_]+$/.test(appConfig.mssql.analysisTable)) {
      throw new Error(
        `Unsafe GP analysis table name: ${appConfig.mssql.analysisTable}`,
      );
    }

    const [schema, table] = appConfig.mssql.analysisTable.split('.');
    return `[${schema}].[${table}]`;
  }
}
