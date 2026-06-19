export const pesoFormatter = new Intl.NumberFormat("en-PH", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

export const compactPesoFormatter = new Intl.NumberFormat("en-PH", {
  notation: "compact",
  maximumFractionDigits: 1
});

export function formatMoney(value: number): string {
  return pesoFormatter.format(value);
}

export function formatCompactMoney(value: number): string {
  return compactPesoFormatter.format(value);
}

export function formatGp(value: number): string {
  return new Intl.NumberFormat("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4
  }).format(value);
}
