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

export function getMonthOptions(count = 12): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  const cursor = new Date();
  cursor.setDate(1);

  for (let index = 0; index < count; index += 1) {
    options.push({
      value: formatInputMonth(cursor),
      label: new Intl.DateTimeFormat("en-PH", { month: "long", year: "numeric" }).format(cursor)
    });
    cursor.setMonth(cursor.getMonth() - 1);
  }

  return options;
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
