export function getTodayInputDate(): string {
  return formatInputDate(new Date());
}

export function getYesterdayInputDate(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  return formatInputDate(yesterday);
}

function formatInputDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function formatDisplayDate(date: string | null): string {
  if (!date) {
    return "No date";
  }

  const parsed = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return new Intl.DateTimeFormat("en-PH", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(parsed);
}

export function getCurrentInputMonth(): string {
  return formatInputMonth(new Date());
}

function formatInputMonth(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

const DEFAULT_YEAR_LOOKBACK = 5;

export function getYearOptions(earliestYear?: number): { value: number; label: string }[] {
  const currentYear = new Date().getFullYear();
  const startYear = earliestYear && earliestYear <= currentYear ? earliestYear : currentYear - DEFAULT_YEAR_LOOKBACK;
  const options: { value: number; label: string }[] = [];

  for (let year = currentYear; year >= startYear; year -= 1) {
    options.push({ value: year, label: String(year) });
  }

  return options;
}

export const MONTH_NAMES: { value: string; label: string }[] = Array.from({ length: 12 }, (_, index) => ({
  value: String(index + 1).padStart(2, "0"),
  label: new Intl.DateTimeFormat("en-PH", { month: "long" }).format(new Date(2000, index, 1))
}));

export function buildMonthValue(year: number, month: string): string {
  return `${year}-${month}`;
}

export function formatDisplayMonth(month: string | null): string {
  if (!month) {
    return "No month";
  }

  const parsed = new Date(`${month}-01T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return month;
  }

  return new Intl.DateTimeFormat("en-PH", {
    month: "long",
    year: "numeric"
  }).format(parsed);
}
