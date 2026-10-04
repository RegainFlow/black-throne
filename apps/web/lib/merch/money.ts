import type { Money } from "./types";

const formatters = new Map<string, Intl.NumberFormat>();

/** "$21.42" / "¥2,400". Falls back to a plain string for a currency Intl doesn't know. */
export function formatMoney(money: Money): string {
  try {
    let fmt = formatters.get(money.currency);
    if (!fmt) {
      fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: money.currency });
      formatters.set(money.currency, fmt);
    }
    return fmt.format(money.value);
  } catch {
    return `${money.value.toFixed(2)} ${money.currency}`;
  }
}

/** Round once, at the end, to the currency's scale (Fourthwall's bundle guidance). */
export function roundMoney(value: number, currency: string): number {
  let digits = 2;
  try {
    digits =
      new Intl.NumberFormat("en-US", { style: "currency", currency }).resolvedOptions()
        .maximumFractionDigits ?? 2;
  } catch {
    // keep 2
  }
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}
