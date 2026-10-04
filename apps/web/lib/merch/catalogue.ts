import { compareSizes } from "./sizes";
import type { AxisValue, MerchItem } from "./types";

/**
 * Search, filter, sort and paging for /merch. Fourthwall's Storefront API has none of these
 * (only collections and pages), so they run here over the cached collection, driven entirely by
 * the URL so they work without JavaScript and can be shared.
 */

/** Fourthwall product slugs as we accept them in /merch/[slug] (anything else is a 404). */
export const isProductSlug = (v: unknown): v is string =>
  typeof v === "string" && /^[a-z0-9][a-z0-9._-]{0,127}$/i.test(v);

export const SORTS = ["featured", "price-asc", "price-desc", "newest"] as const;
export type Sort = (typeof SORTS)[number];
export const PER_PAGE = 24;

export interface MerchQuery {
  q: string;
  category?: string;
  sizes: string[];
  colors: string[];
  inStock: boolean;
  min?: number;
  max?: number;
  sort: Sort;
  page: number;
}

type Params = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const all = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []);

function price(v: string | undefined): number | undefined {
  if (!v?.trim()) return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && n <= 100_000 ? n : undefined;
}

function values(v: string | string[] | undefined): string[] {
  const out = new Set<string>();
  for (const raw of all(v)) {
    const s = raw.trim().slice(0, 32);
    if (s) out.add(s);
    if (out.size >= 12) break;
  }
  return [...out];
}

/** Untrusted search params → a clean query. Anything invalid is dropped, never echoed. */
export function parseQuery(params: Params): MerchQuery {
  const q = (first(params.q) ?? "").replace(/\s+/g, " ").trim().slice(0, 64);
  const category = first(params.category);
  let min = price(first(params.min));
  let max = price(first(params.max));
  if (min !== undefined && max !== undefined && min > max) [min, max] = [max, min];
  const sort = first(params.sort);
  const page = Number.parseInt(first(params.page) ?? "1", 10);
  return {
    q,
    category: category && /^[a-z0-9][a-z0-9-]{0,63}$/.test(category) ? category : undefined,
    sizes: values(params.size),
    colors: values(params.color),
    inStock: first(params.stock) === "in",
    min,
    max,
    sort: (SORTS as readonly string[]).includes(sort ?? "") ? (sort as Sort) : "featured",
    page: Number.isInteger(page) && page >= 1 && page <= 100 ? page : 1,
  };
}

/** Filters that narrow results (category and sort excluded). */
export function activeFilters(q: MerchQuery): number {
  return (
    q.sizes.length +
    q.colors.length +
    (q.inStock ? 1 : 0) +
    (q.min !== undefined ? 1 : 0) +
    (q.max !== undefined ? 1 : 0)
  );
}

/** Serialises a query back to URL params (for paging, category tabs and "clear" links). */
export function toSearchParams(q: Partial<MerchQuery>): URLSearchParams {
  const p = new URLSearchParams();
  if (q.q) p.set("q", q.q);
  if (q.category) p.set("category", q.category);
  for (const s of q.sizes ?? []) p.append("size", s);
  for (const c of q.colors ?? []) p.append("color", c);
  if (q.inStock) p.set("stock", "in");
  if (q.min !== undefined) p.set("min", String(q.min));
  if (q.max !== undefined) p.set("max", String(q.max));
  if (q.sort && q.sort !== "featured") p.set("sort", q.sort);
  if (q.page && q.page > 1) p.set("page", String(q.page));
  return p;
}

export function merchHref(q: Partial<MerchQuery>): string {
  const s = toSearchParams(q).toString();
  return s ? `/merch?${s}` : "/merch";
}

const fold = (s: string) => s.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase();

function haystack(item: MerchItem): string {
  const offerNames = item.kind === "bundle" ? item.offers.map((o) => o.name) : [];
  return fold(
    [item.name, item.text, ...offerNames, ...item.colors.map((c) => c.value), ...item.sizes].join(
      " ",
    ),
  );
}

const hasAny = (have: string[], want: string[]) => {
  const set = new Set(have.map(fold));
  return want.some((w) => set.has(fold(w)));
};

export function filterItems(items: MerchItem[], q: MerchQuery): MerchItem[] {
  const tokens = fold(q.q).split(" ").filter(Boolean);
  return items.filter((item) => {
    if (tokens.length) {
      const hay = haystack(item);
      if (!tokens.every((t) => hay.includes(t))) return false;
    }
    if (q.sizes.length && !hasAny(item.sizes, q.sizes)) return false;
    if (
      q.colors.length &&
      !hasAny(
        item.colors.map((c) => c.value),
        q.colors,
      )
    )
      return false;
    if (q.inStock && !item.available) return false;
    if (q.min !== undefined && item.price.value < q.min) return false;
    if (q.max !== undefined && item.price.value > q.max) return false;
    return true;
  });
}

/** Stable sorts. "Featured" keeps Fourthwall's order with sold-out pieces last. */
export function sortItems(items: MerchItem[], sort: Sort): MerchItem[] {
  const indexed = items.map((item, i) => ({ item, i }));
  const by = (cmp: (a: MerchItem, b: MerchItem) => number) =>
    indexed.sort((a, b) => cmp(a.item, b.item) || a.i - b.i).map((x) => x.item);
  switch (sort) {
    case "price-asc":
      return by((a, b) => a.price.value - b.price.value);
    case "price-desc":
      return by((a, b) => b.price.value - a.price.value);
    case "newest":
      return by((a, b) => (b.createdAt ?? -1) - (a.createdAt ?? -1));
    default:
      return by((a, b) => Number(b.available) - Number(a.available));
  }
}

export interface Facets {
  sizes: string[];
  colors: AxisValue[];
  price?: { min: number; max: number; currency: string };
}

export function facets(items: MerchItem[]): Facets {
  const sizes = new Map<string, string>();
  const colors = new Map<string, AxisValue>();
  for (const item of items) {
    for (const s of item.sizes) if (!sizes.has(fold(s))) sizes.set(fold(s), s);
    for (const c of item.colors) if (!colors.has(fold(c.value))) colors.set(fold(c.value), c);
  }
  const prices = items.map((i) => i.price.value);
  const currency = items[0]?.price.currency;
  return {
    sizes: [...sizes.values()].sort(compareSizes),
    colors: [...colors.values()],
    price:
      prices.length && currency
        ? { min: Math.floor(Math.min(...prices)), max: Math.ceil(Math.max(...prices)), currency }
        : undefined,
  };
}

export function paginate<T>(items: T[], page: number, perPage = PER_PAGE) {
  const pages = Math.max(1, Math.ceil(items.length / perPage));
  const current = Math.min(Math.max(1, page), pages);
  return {
    items: items.slice((current - 1) * perPage, current * perPage),
    page: current,
    pages,
    total: items.length,
  };
}
