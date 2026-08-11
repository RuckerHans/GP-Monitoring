"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownUp,
  Building2,
  CalendarDays,
  CalendarRange,
  FileSpreadsheet,
  LogOut,
  RefreshCcw,
  Search,
  Table2
} from "lucide-react";
import {
  formatDisplayDate,
  formatDisplayMonth,
  getCurrentInputMonth,
  getMonthOptions,
  getYesterdayInputDate
} from "@/lib/date";
import { formatCompactMoney, formatGp, formatMoney } from "@/lib/format";
import { Branch, DailyGpAnalysis, MonthlyGpAnalysis, User } from "@/lib/types";
import { useGetDailyQuery, useGetMonthlyQuery, useGetBranchesQuery, useLogoutMutation } from "@/lib/store/api/gpApi";
import { useAppSelector, useAppDispatch } from "@/lib/store/hooks";
import { clearUser, setUser } from "@/lib/store/slices/authSlice";

type SortKey = "count" | "branch" | "sales" | "profit" | "gp";
type SortDirection = "asc" | "desc";
type Tab = "gp" | "branches";
type ReportMode = "daily" | "monthly";
type ActiveRow = DailyGpAnalysis | MonthlyGpAnalysis;

interface DashboardProps {
  initialUser: User | null;
}

export function Dashboard({ initialUser }: DashboardProps) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s: any) => s.auth.user);

  const [mode, setMode] = useState<ReportMode>("daily");
  const [date, setDate] = useState(getYesterdayInputDate());
  const [month, setMonth] = useState(getCurrentInputMonth());
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("gp");
  const [sortKey, setSortKey] = useState<SortKey>("count");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const {
    data: dailyRows = [],
    isLoading: isDailyLoading,
    refetch: refetchDaily,
    error: dailyError
  } = useGetDailyQuery(date, { skip: mode !== "daily" });
  const {
    data: monthlyRows = [],
    isLoading: isMonthlyLoading,
    refetch: refetchMonthly,
    error: monthlyError
  } = useGetMonthlyQuery(month, { skip: mode !== "monthly" });
  const { data: branches = [], isLoading: isBranchesLoading, error: branchesError } = useGetBranchesQuery(undefined);
  const [logoutMutation] = useLogoutMutation();

  const monthOptions = useMemo(() => getMonthOptions(), []);
  const activeRows: ActiveRow[] = mode === "daily" ? dailyRows : monthlyRows;
  const activeIsLoading = mode === "daily" ? isDailyLoading : isMonthlyLoading;
  const activeError = mode === "daily" ? dailyError : monthlyError;
  const activeLabel = mode === "daily" ? formatDisplayDate(date) : formatDisplayMonth(month);

  const error = (activeError as any)?.data?.message ?? (branchesError as any)?.data?.message ?? "";

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return [...activeRows]
      .filter((row: ActiveRow) => {
        if (!normalizedQuery) {
          return true;
        }

        return (
          row.branch.toLowerCase().includes(normalizedQuery) ||
          row.mainServerDatabaseName.toLowerCase().includes(normalizedQuery)
        );
      })
        .sort((first: ActiveRow, second: ActiveRow) => compareRows(first, second, sortKey, sortDirection));
  }, [query, activeRows, sortDirection, sortKey]);

  const filteredBranches = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return branches.filter((branch: Branch) => {
      if (!normalizedQuery) {
        return true;
      }

      return [
        branch.branchCode,
        branch.branchName,
        branch.branchLocation,
        branch.mainServerDatabaseName
      ].some((value: string) => value.toLowerCase().includes(normalizedQuery));
    });
  }, [branches, query]);

  const totals = useMemo(() => {
    const sales = filteredRows.reduce((sum, row) => sum + row.sales, 0);
    const profit = filteredRows.reduce((sum, row) => sum + row.profit, 0);

    return {
      sales,
      profit,
      gp: sales === 0 ? 0 : (profit / sales) * 100
    };
  }, [filteredRows]);

  const signOut = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }, []);

  // removed safeFetch in favor of RTK Query hooks

  const refresh = useCallback(async () => {
    if (mode === "daily") {
      await refetchDaily();
    } else {
      await refetchMonthly();
    }
  }, [mode, refetchDaily, refetchMonthly]);

  useEffect(() => {
    // initial fetch handled by useGetDailyQuery / useGetMonthlyQuery
  }, []);

  useEffect(() => {
    // initial branches fetch handled by useGetBranchesQuery
  }, []);

  useEffect(() => {
    // ensure auth user is available from cookie via /api/auth/me if needed
    // optionally we could call useMeQuery here; keep simple for now
  }, []);

  useEffect(() => {
    dispatch(setUser(initialUser));
  }, [initialUser, dispatch]);

  async function logout() {
    try {
      await logoutMutation().unwrap();
    } finally {
      dispatch(clearUser());
      window.location.href = "/";
    }
  }

  function changeSort(nextKey: SortKey) {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextKey);
    setSortDirection(nextKey === "branch" ? "asc" : "desc");
  }

  const exportExcel = useCallback(async () => {
    if (!filteredRows.length) {
      return;
    }

    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("GP Monitoring");

    const headers = ["Count", "Branch", "Database", "Sales", "Profit", "GP %"];
    worksheet.columns = [
      { key: "count" },
      { key: "branch" },
      { key: "database" },
      { key: "sales" },
      { key: "profit" },
      { key: "gp" }
    ];

    const periodLabel =
      mode === "daily"
        ? `Daily GP Analysis – ${formatDisplayDate(date)}`
        : `Monthly GP Analysis – ${formatDisplayMonth(month)}`;

    worksheet.mergeCells(1, 1, 1, headers.length);
    const titleCell = worksheet.getCell(1, 1);
    titleCell.value = periodLabel;
    titleCell.font = { bold: true, size: 13 };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    worksheet.getRow(1).height = 26;

    const headerRowIndex = 2;
    const headerRow = worksheet.getRow(headerRowIndex);
    headerRow.values = headers;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F7A5C" } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
    });
    worksheet.views = [{ state: "frozen", ySplit: headerRowIndex }];

    filteredRows.forEach((row, index) => {
      const dataRow = worksheet.addRow({
        count: row.count,
        branch: row.branch || "Unnamed branch",
        database: row.mainServerDatabaseName,
        sales: row.sales,
        profit: row.profit,
        gp: row.gp
      });
      dataRow.getCell("sales").numFmt = "#,##0.00";
      dataRow.getCell("profit").numFmt = "#,##0.00";
      dataRow.getCell("gp").numFmt = '0.00"%"';

      if (index % 2 === 1) {
        dataRow.eachCell((cell) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEDF4EF" } };
        });
      }
    });

    const firstDataRow = headerRowIndex + 1;
    const lastDataRow = headerRowIndex + filteredRows.length;
    const totalsRow = worksheet.addRow({
      count: filteredRows.length,
      branch: "Total",
      sales: { formula: `SUM(D${firstDataRow}:D${lastDataRow})` },
      profit: { formula: `SUM(E${firstDataRow}:E${lastDataRow})` }
    });
    totalsRow.getCell("gp").value = {
      formula: `IF(D${totalsRow.number}=0,0,E${totalsRow.number}/D${totalsRow.number}*100)`
    } as any;
    totalsRow.getCell("sales").numFmt = "#,##0.00";
    totalsRow.getCell("profit").numFmt = "#,##0.00";
    totalsRow.getCell("gp").numFmt = '0.00"%"';
    totalsRow.eachCell((cell) => {
      cell.font = { bold: true };
    });

    headers.forEach((header, index) => {
      const column = worksheet.getColumn(index + 1);
      let maxLength = header.length;

      column.eachCell({ includeEmpty: false }, (cell, rowNumber) => {
        if (rowNumber === 1) {
          return;
        }

        const cellValue = cell.value as unknown;
        const text =
          cellValue && typeof cellValue === "object" && "formula" in (cellValue as Record<string, unknown>)
            ? String((cellValue as { formula: string }).formula)
            : String(cellValue ?? "");

        maxLength = Math.max(maxLength, text.length);
      });

      column.width = maxLength + 2;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = mode === "daily" ? `gp-monitoring-daily-${date}.xlsx` : `gp-monitoring-monthly-${month}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  }, [filteredRows, mode, date, month]);

  return (
    <main className="dashboard-page">
      <header className="topbar">
        <div className="topbar-title">
          <p className="eyebrow">Daily performance</p>
          <h1>GP Monitoring</h1>
        </div>
        <div className="topbar-actions">
          <span className="signed-in">{user?.username ?? "Signed in"}</span>
          <button className="ghost-button" onClick={logout} title="Sign out">
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </header>

      <section className="control-strip" aria-label="Report controls">
        <div className="segmented-control" role="tablist" aria-label="Report mode">
          <button
            className={mode === "daily" ? "active" : ""}
            onClick={() => setMode("daily")}
            role="tab"
            type="button"
          >
            <CalendarDays size={16} />
            Daily
          </button>
          <button
            className={mode === "monthly" ? "active" : ""}
            onClick={() => setMode("monthly")}
            role="tab"
            type="button"
          >
            <CalendarRange size={16} />
            Monthly
          </button>
        </div>

        {mode === "daily" ? (
          <label className="date-control">
            <CalendarDays size={18} />
            <span>Date</span>
            <input value={date} onChange={(event) => setDate(event.target.value)} type="date" />
          </label>
        ) : (
          <label className="date-control">
            <CalendarRange size={18} />
            <span>Month</span>
            <select value={month} onChange={(event) => setMonth(event.target.value)}>
              {monthOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="search-control">
          <Search size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search branch or database"
          />
        </label>

        <div className="segmented-control" role="tablist" aria-label="Views">
          <button
            className={activeTab === "gp" ? "active" : ""}
            onClick={() => setActiveTab("gp")}
            role="tab"
            type="button"
          >
            <Table2 size={16} />
            GP
          </button>
          <button
            className={activeTab === "branches" ? "active" : ""}
            onClick={() => setActiveTab("branches")}
            role="tab"
            type="button"
          >
            <Building2 size={16} />
            Branches
          </button>
        </div>

        <button className="icon-text-button" onClick={() => void refresh()} title="Refresh">
          <RefreshCcw size={18} />
          Refresh
        </button>
        <button
          className="icon-text-button"
          onClick={() => void exportExcel()}
          disabled={activeIsLoading || !filteredRows.length}
        >
          <FileSpreadsheet size={18} />
          Export Excel
        </button>
      </section>

      <section className="metric-grid" aria-label="Summary">
        <Metric label="Branches" value={String(filteredRows.length)} />
        <Metric label="Sales" value={formatCompactMoney(totals.sales)} title={formatMoney(totals.sales)} />
        <Metric
          label="Profit"
          value={formatCompactMoney(totals.profit)}
          title={formatMoney(totals.profit)}
        />
        <Metric label="GP" value={`${formatGp(totals.gp)}%`} />
      </section>

      {error ? <p className="data-error">{error}</p> : null}

      {activeTab === "gp" ? (
        <section className="data-section" aria-label="GP analysis">
          <div className="section-heading">
            <div>
              <h2>{mode === "daily" ? "Daily GP Analysis" : "Monthly GP Analysis"}</h2>
              <p>{activeLabel} branch performance</p>
            </div>
          </div>

          <div className="table-wrap report-table-wrap">
            <table className="report-table">
              <colgroup>
                <col className="col-count" />
                <col className="col-branch" />
                <col className="col-money" />
                <col className="col-money" />
                <col className="col-gp" />
              </colgroup>
              <thead>
                <tr>
                  <SortableHeader
                    align="center"
                    label="Count"
                    sortKey="count"
                    activeKey={sortKey}
                    onSort={changeSort}
                  />
                  <SortableHeader label="Branches" sortKey="branch" activeKey={sortKey} onSort={changeSort} />
                  <SortableHeader
                    align="right"
                    label="Sales"
                    sortKey="sales"
                    activeKey={sortKey}
                    onSort={changeSort}
                  />
                  <SortableHeader
                    align="right"
                    label="Profit"
                    sortKey="profit"
                    activeKey={sortKey}
                    onSort={changeSort}
                  />
                  <SortableHeader
                    align="right"
                    label="GP"
                    sortKey="gp"
                    activeKey={sortKey}
                    onSort={changeSort}
                  />
                </tr>
              </thead>
              <tbody>
                {activeIsLoading ? (
                  <TableMessage
                    colSpan={5}
                    message={mode === "daily" ? "Loading daily GP analysis..." : "Loading monthly GP analysis..."}
                  />
                ) : filteredRows.length ? (
                  filteredRows.map((row) => (
                    <tr key={`${row.mainServerDatabaseName}-${row.count}`}>
                      <td className="count-cell">
                        <span>{row.count}</span>
                      </td>
                      <td className="branch-cell">
                        <strong>{row.branch || "Unnamed branch"}</strong>
                        <small>{row.mainServerDatabaseName}</small>
                      </td>
                      <td className="number-cell">{formatMoney(row.sales)}</td>
                      <td className="number-cell">{formatMoney(row.profit)}</td>
                      <td className={row.gp <= 0 ? "number-cell muted-gp" : "number-cell good-gp"}>
                        {formatGp(row.gp)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <TableMessage
                    colSpan={5}
                    message={mode === "daily" ? "No GP data found for this date." : "No GP data found for this month."}
                  />
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td className="count-cell">
                    <span>{filteredRows.length}</span>
                  </td>
                  <td>Total</td>
                  <td className="number-cell">{formatMoney(totals.sales)}</td>
                  <td className="number-cell">{formatMoney(totals.profit)}</td>
                  <td className="number-cell">{formatGp(totals.gp)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      ) : (
        <section className="data-section" aria-label="Branch directory">
          <div className="section-heading">
            <div>
              <h2>Branch Directory</h2>
              <p>{filteredBranches.length} configured branches</p>
            </div>
          </div>

          <div className="branch-grid">
            {isBranchesLoading ? (
              <p className="empty-state">Loading branch directory...</p>
            ) : filteredBranches.length ? (
              filteredBranches.map((branch: Branch) => (
                <article className="branch-card" key={branch.id}>
                  <p>{branch.branchCode}</p>
                  <h3>{branch.branchLocation}</h3>
                  <span>{branch.branchName}</span>
                  <small>{branch.mainServerDatabaseName}</small>
                </article>
              ))
            ) : (
              <p className="empty-state">No branches match your search.</p>
            )}
          </div>
        </section>
      )}
    </main>
  );
}

function Metric({ label, value, title }: { label: string; value: string; title?: string }) {
  return (
    <article className="metric-card" title={title}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function SortableHeader({
  label,
  sortKey,
  activeKey,
  onSort,
  align = "left"
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  onSort: (key: SortKey) => void;
  align?: "left" | "center" | "right";
}) {
  return (
    <th className={align === "right" ? "numeric-header" : align === "center" ? "center-header" : undefined}>
      <button type="button" onClick={() => onSort(sortKey)}>
        {label}
        <ArrowDownUp size={14} className={activeKey === sortKey ? "active-sort" : ""} />
      </button>
    </th>
  );
}

function TableMessage({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <tr>
      <td className="table-message" colSpan={colSpan}>
        {message}
      </td>
    </tr>
  );
}

function compareRows(first: ActiveRow, second: ActiveRow, sortKey: SortKey, direction: SortDirection) {
  const modifier = direction === "asc" ? 1 : -1;
  const firstValue = first[sortKey];
  const secondValue = second[sortKey];

  if (typeof firstValue === "string" && typeof secondValue === "string") {
    return firstValue.localeCompare(secondValue) * modifier;
  }

  return (Number(firstValue) - Number(secondValue)) * modifier;
}
