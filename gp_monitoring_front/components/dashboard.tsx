"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownUp,
  Building2,
  CalendarDays,
  Download,
  LogOut,
  RefreshCcw,
  Search,
  Table2
} from "lucide-react";
import { formatDisplayDate, getYesterdayInputDate } from "@/lib/date";
import { formatCompactMoney, formatGp, formatMoney } from "@/lib/format";
import { Branch, DailyGpAnalysis, User } from "@/lib/types";
import { useGetDailyQuery, useGetBranchesQuery, useLogoutMutation } from "@/lib/store/api/gpApi";
import { useAppSelector, useAppDispatch } from "@/lib/store/hooks";
import { clearUser, setUser } from "@/lib/store/slices/authSlice";

type SortKey = "count" | "branch" | "sales" | "profit" | "gp";
type SortDirection = "asc" | "desc";
type Tab = "gp" | "branches";

interface DashboardProps {
  initialUser: User | null;
}

export function Dashboard({ initialUser }: DashboardProps) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s: any) => s.auth.user);

  const [date, setDate] = useState(getYesterdayInputDate());
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("gp");
  const [sortKey, setSortKey] = useState<SortKey>("count");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const { data: rows = [], isLoading, refetch: refetchDaily, error: dailyError } = useGetDailyQuery(date);
  const { data: branches = [], isLoading: isBranchesLoading, error: branchesError } = useGetBranchesQuery(undefined);
  const [logoutMutation] = useLogoutMutation();

  const error = (dailyError as any)?.data?.message ?? (branchesError as any)?.data?.message ?? "";

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return [...rows]
      .filter((row: DailyGpAnalysis) => {
        if (!normalizedQuery) {
          return true;
        }

        return (
          row.branch.toLowerCase().includes(normalizedQuery) ||
          row.mainServerDatabaseName.toLowerCase().includes(normalizedQuery)
        );
      })
        .sort((first: DailyGpAnalysis, second: DailyGpAnalysis) => compareRows(first, second, sortKey, sortDirection));
  }, [query, rows, sortDirection, sortKey]);

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

  const loadDailyGp = useCallback(async (reportDate: string) => {
    setDate(reportDate);
    await refetchDaily();
  }, [refetchDaily]);

  const loadBranches = useCallback(async () => {
    // data is loaded via useGetBranchesQuery; this is a noop helper kept for parity
    return;
  }, []);

  useEffect(() => {
    // initial fetch handled by useGetDailyQuery
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

  function exportCsv() {
    const csv = [
      ["Count", "Date", "Branch", "Sales", "Profit", "GP", "Database"],
      ...filteredRows.map((row) => [
        row.count,
        row.date ?? "",
        row.branch,
        row.sales,
        row.profit,
        row.gp,
        row.mainServerDatabaseName
      ])
    ]
      .map((line) => line.map(escapeCsv).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `gp-monitoring-${date}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

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
        <label className="date-control">
          <CalendarDays size={18} />
          <span>Date</span>
          <input value={date} onChange={(event) => setDate(event.target.value)} type="date" />
        </label>

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

        <button className="icon-text-button" onClick={() => void loadDailyGp(date)} title="Refresh">
          <RefreshCcw size={18} />
          Refresh
        </button>
        <button className="icon-text-button" onClick={exportCsv} disabled={!filteredRows.length}>
          <Download size={18} />
          CSV
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
        <section className="data-section" aria-label="Daily GP analysis">
          <div className="section-heading">
            <div>
              <h2>Daily GP Analysis</h2>
              <p>{formatDisplayDate(date)} branch performance</p>
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
                {isLoading ? (
                  <TableMessage colSpan={5} message="Loading daily GP analysis..." />
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
                  <TableMessage colSpan={5} message="No GP data found for this date." />
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

function compareRows(
  first: DailyGpAnalysis,
  second: DailyGpAnalysis,
  sortKey: SortKey,
  direction: SortDirection
) {
  const modifier = direction === "asc" ? 1 : -1;
  const firstValue = first[sortKey];
  const secondValue = second[sortKey];

  if (typeof firstValue === "string" && typeof secondValue === "string") {
    return firstValue.localeCompare(secondValue) * modifier;
  }

  return (Number(firstValue) - Number(secondValue)) * modifier;
}

function escapeCsv(value: string | number | null) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}
