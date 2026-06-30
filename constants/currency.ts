export const CURRENCY_SYMBOL = "$";
export const CURRENCY_CODE = "USD";

export function fmt(n: number, compact = false): string {
  if (compact) {
    if (Math.abs(n) >= 1_000_000) return `${CURRENCY_SYMBOL}${(n / 1_000_000).toFixed(1)}M`;
    if (Math.abs(n) >= 1_000) return `${CURRENCY_SYMBOL}${(n / 1_000).toFixed(1)}K`;
    return `${CURRENCY_SYMBOL}${Math.abs(n).toFixed(0)}`;
  }
  return `${CURRENCY_SYMBOL}${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function fmtSigned(n: number): string {
  return `${n >= 0 ? "+" : "-"}${fmt(Math.abs(n))}`;
}
