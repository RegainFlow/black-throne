const ORDER = [
  "xxxs",
  "xxs",
  "xs",
  "s",
  "m",
  "l",
  "xl",
  "xxl",
  "2xl",
  "xxxl",
  "3xl",
  "4xl",
  "5xl",
  "6xl",
];
const ALIAS: Record<string, string> = {
  small: "s",
  medium: "m",
  large: "l",
  xlarge: "xl",
  xxlarge: "2xl",
  xxxlarge: "3xl",
};

function rank(size: string): number {
  const k = size.toLowerCase().replace(/[\s-]+/g, "");
  return ORDER.indexOf(ALIAS[k] ?? k);
}

/** Apparel order (XS < S < M … < 5XL), then numeric sizes, then alphabetical. */
export function compareSizes(a: string, b: string): number {
  const ra = rank(a);
  const rb = rank(b);
  if (ra >= 0 && rb >= 0) return ra - rb;
  if (ra >= 0) return -1;
  if (rb >= 0) return 1;
  const na = Number.parseFloat(a);
  const nb = Number.parseFloat(b);
  if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
  return a.localeCompare(b, "en", { sensitivity: "base" });
}
