/**
 * Fourthwall hosted-checkout URLs. Payment, tax, shipping and fulfilment all happen there;
 * this site only hands over a cart (or variant list) plus allowlisted attribution.
 * Pure: no secrets ever reach these URLs (the Storefront token is for the API only).
 */

export const CHECKOUT_CURRENCY = "USD";
export const MAX_QTY = 10;

/** Attribution Fourthwall's checkout records. Anything else on the URL is never forwarded. */
export const ATTRIBUTION_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "fbclid",
] as const;

export type AttributionKey = (typeof ATTRIBUTION_KEYS)[number];
export type Attribution = Partial<Record<AttributionKey, string>>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CART_ID = /^[A-Za-z0-9_-]{8,64}$/;
const LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export const isVariantId = (v: unknown): v is string => typeof v === "string" && UUID.test(v);
export const isCartId = (v: unknown): v is string => typeof v === "string" && CART_ID.test(v);

/** A bare, lowercase public hostname: no scheme, port, path, userinfo or IP literal. */
export function isValidShopDomain(host: unknown): host is string {
  if (typeof host !== "string" || host.length > 253 || !host.includes(".")) return false;
  const labels = host.split(".");
  if (!labels.every((l) => LABEL.test(l))) return false;
  return !/^\d+$/.test(labels[labels.length - 1] ?? "");
}

export function clampQty(n: unknown, min = 1): number {
  const q = typeof n === "number" ? n : Number.parseInt(String(n ?? ""), 10);
  if (!Number.isFinite(q)) return min;
  return Math.min(MAX_QTY, Math.max(min, Math.trunc(q)));
}

function clean(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const printable = [...value].filter((ch) => {
    const c = ch.charCodeAt(0);
    return c >= 0x20 && c !== 0x7f; // no control characters
  });
  const v = printable.join("").trim().slice(0, 200);
  return v || undefined;
}

/** Keeps only allowlisted attribution keys, with cleaned, length-capped values. */
export function pickAttribution(
  input: URLSearchParams | Record<string, unknown> | null | undefined,
): Attribution {
  const out: Attribution = {};
  if (!input) return out;
  for (const key of ATTRIBUTION_KEYS) {
    const raw = input instanceof URLSearchParams ? input.get(key) : input[key];
    const v = clean(raw);
    if (v) out[key] = v;
  }
  return out;
}

/** Reads the attribution cookie (JSON) back through the allowlist. */
export function parseAttribution(cookie: string | undefined): Attribution {
  if (!cookie) return {};
  try {
    const data: unknown = JSON.parse(cookie);
    return data && typeof data === "object" ? pickAttribution(data as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function checkoutBase(shopDomain: string): URL | null {
  if (!isValidShopDomain(shopDomain)) return null;
  const url = new URL("https://example.invalid/cart/checkout");
  url.hostname = shopDomain;
  return url.hostname === shopDomain ? url : null;
}

function withAttribution(url: URL, attribution: Attribution): string {
  for (const [k, v] of Object.entries(pickAttribution(attribution))) url.searchParams.set(k, v);
  return url.href;
}

/** `https://{shop}/cart/checkout?cartId=…&currency=USD[&utm_*]`, or null if anything is invalid. */
export function cartCheckoutUrl(opts: {
  shopDomain: string;
  cartId: string;
  attribution?: Attribution;
}): string | null {
  const url = checkoutBase(opts.shopDomain);
  if (!url || !isCartId(opts.cartId)) return null;
  url.searchParams.set("cartId", opts.cartId);
  url.searchParams.set("currency", CHECKOUT_CURRENCY);
  return withAttribution(url, opts.attribution ?? {});
}

/**
 * `https://{shop}/cart/checkout?products=uuid:qty[,…]&currency=USD[&utm_*]` for "buy now".
 * Regular product variants only: the documented `products` format can't express bundles.
 */
export function directCheckoutUrl(opts: {
  shopDomain: string;
  lines: { variantId: string; quantity: number }[];
  attribution?: Attribution;
}): string | null {
  const url = checkoutBase(opts.shopDomain);
  if (!url || opts.lines.length === 0) return null;
  const ids = new Set<string>();
  for (const l of opts.lines) {
    if (!isVariantId(l.variantId) || ids.has(l.variantId)) return null;
    ids.add(l.variantId);
  }
  const products = opts.lines.map((l) => `${l.variantId}:${clampQty(l.quantity)}`).join(",");
  url.searchParams.set("products", products);
  url.searchParams.set("currency", CHECKOUT_CURRENCY);
  return withAttribution(url, opts.attribution ?? {});
}
