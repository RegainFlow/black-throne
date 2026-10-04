import "server-only";
import { cache } from "react";
import { type MerchConfig, merchConfig } from "./config";
import {
  type CartErrorCode,
  fail,
  type MerchError,
  ok,
  type Result,
  toCartErrorCode,
} from "./errors";
import { isPublic, normalizeCart, normalizeItem } from "./model";
import {
  cartSchema,
  collectionSchema,
  errorBodySchema,
  type FwItem,
  itemSchema,
  pageSchema,
  parseItems,
} from "./schema";
import type { Cart, MerchCollection, MerchItem } from "./types";

/**
 * Server-only Fourthwall Storefront API client. The token lives in exactly one place — the
 * URL built inside `request()` — and no error, log line or return value ever includes it.
 * Every call returns a Result; nothing here throws.
 */

const TIMEOUT_MS = 8_000;
const PAGE_SIZE = 50;
const MAX_PAGES = 10;
const TAGS = ["merch"];
const CURRENCY = "USD";

export const REVALIDATE = { collections: 600, catalogue: 120, product: 60 } as const;

type Response =
  | { ok: true; json: unknown }
  | { ok: false; error: MerchError; code?: CartErrorCode };

interface Req {
  method?: "GET" | "POST";
  path: string;
  query?: Record<string, string | number>;
  body?: unknown;
  /** Data-cache lifetime in seconds; omitted means no-store (carts). */
  revalidate?: number;
}

function log(kind: string, path: string, status?: number) {
  // Path only: never the URL (it carries the token) and never upstream bodies.
  console.error(`[merch] fourthwall ${kind} ${status ?? "-"} ${path}`);
}

async function request(cfg: MerchConfig, req: Req): Promise<Response> {
  const url = new URL(`/v1${req.path}`, cfg.apiBase);
  for (const [k, v] of Object.entries(req.query ?? {})) url.searchParams.set(k, String(v));
  url.searchParams.set("storefront_token", cfg.token);

  let res: globalThis.Response;
  try {
    res = await fetch(url, {
      method: req.method ?? "GET",
      headers: {
        accept: "application/json",
        ...(req.body !== undefined ? { "content-type": "application/json" } : {}),
      },
      body: req.body !== undefined ? JSON.stringify(req.body) : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      ...(req.revalidate !== undefined
        ? { next: { revalidate: req.revalidate, tags: TAGS } }
        : { cache: "no-store" as const }),
    });
  } catch (e) {
    const name = e instanceof Error ? e.name : "";
    const kind = name === "TimeoutError" || name === "AbortError" ? "timeout" : "network";
    log(kind, req.path);
    return { ok: false, error: { kind } };
  }

  if (!res.ok) {
    let code: CartErrorCode | undefined;
    try {
      const body = errorBodySchema.parse(await res.json());
      code = body.code ? toCartErrorCode(body.code) : undefined;
    } catch {
      // non-JSON error body
    }
    if (res.status >= 500 || res.status === 401 || res.status === 403 || res.status === 429)
      log("upstream", req.path, res.status);
    return { ok: false, error: { kind: "upstream", status: res.status }, code };
  }

  try {
    return { ok: true, json: await res.json() };
  } catch {
    log("malformed", req.path, res.status);
    return { ok: false, error: { kind: "malformed" } };
  }
}

function config(): MerchConfig | null {
  const c = merchConfig();
  return c.ok ? c.config : null;
}

/* ---------- sealed guard ---------- */

/** Upcoming titles (SEALED_TERMS, the same denylist the build leak check uses). */
export function sealedTerms(env: Record<string, string | undefined> = process.env): string[] {
  return (env.SEALED_TERMS ?? "")
    .split(/[,\n]/)
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length >= 4);
}

/** True when a remote item names anything unannounced; such items are never rendered. */
export function isSealed(item: FwItem, terms = sealedTerms()): boolean {
  if (!terms.length) return false;
  const hay = [
    item.name,
    item.slug,
    ...(item.type === "BUNDLE" ? item.offers.flatMap((o) => [o.name, o.slug]) : []),
  ]
    .join("\n")
    .toLowerCase();
  return terms.some((t) => hay.includes(t));
}

function accept(raw: FwItem): MerchItem | null {
  if (!isPublic(raw) || isSealed(raw)) return null;
  return normalizeItem(raw);
}

/* ---------- catalogue ---------- */

export const getCollections = cache(async (): Promise<Result<MerchCollection[]>> => {
  const cfg = config();
  if (!cfg) return fail({ kind: "unconfigured" });
  const res = await request(cfg, {
    path: "/collections",
    query: { page: 0, size: PAGE_SIZE },
    revalidate: REVALIDATE.collections,
  });
  if (!res.ok) return fail(res.error);
  const page = pageSchema.safeParse(res.json);
  if (!page.success) return fail({ kind: "malformed" });
  const terms = sealedTerms();
  const out: MerchCollection[] = [];
  for (const raw of page.data.results) {
    const c = collectionSchema.safeParse(raw);
    if (!c.success) continue;
    const hay = `${c.data.name}\n${c.data.slug}`.toLowerCase();
    if (terms.some((t) => hay.includes(t))) continue;
    out.push({ slug: c.data.slug, name: c.data.name });
  }
  return ok(out);
});

/** Every public item in a collection (all pages, capped), in Fourthwall's order. */
export const getCatalogue = cache(async (collection: string): Promise<Result<MerchItem[]>> => {
  const cfg = config();
  if (!cfg) return fail({ kind: "unconfigured" });
  const items: MerchItem[] = [];
  let skipped = 0;
  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await request(cfg, {
      path: `/collections/${encodeURIComponent(collection)}/products`,
      query: { page, size: PAGE_SIZE, currency: CURRENCY },
      revalidate: REVALIDATE.catalogue,
    });
    if (!res.ok) return fail(res.error);
    const parsed = pageSchema.safeParse(res.json);
    if (!parsed.success) return fail({ kind: "malformed" });
    const batch = parseItems(parsed.data.results);
    skipped += batch.skipped;
    for (const raw of batch.items) {
      const item = accept(raw);
      if (item) items.push(item);
    }
    if (!parsed.data.paging?.hasNextPage || parsed.data.results.length === 0) break;
  }
  if (skipped) log(`skipped-${skipped}`, `/collections/${collection}/products`);
  return ok(items);
});

/** A public product by slug; `null` for unknown, hidden, private, archived or sealed items. */
export const getProduct = cache(async (slug: string): Promise<Result<MerchItem | null>> => {
  const cfg = config();
  if (!cfg) return fail({ kind: "unconfigured" });
  const res = await request(cfg, {
    path: `/products/${encodeURIComponent(slug)}`,
    query: { currency: CURRENCY },
    revalidate: REVALIDATE.product,
  });
  if (!res.ok) {
    if (res.error.kind === "upstream" && res.error.status === 404) return ok(null);
    return fail(res.error);
  }
  const parsed = itemSchema.safeParse(res.json);
  if (!parsed.success) {
    log("malformed", "/products/:slug");
    return fail({ kind: "malformed" });
  }
  return ok(accept(parsed.data));
});

/* ---------- cart (never cached) ---------- */

export interface CartLineInput {
  variantId: string;
  quantity: number;
  bundleId?: string;
}

function cartResult(res: Response): Result<Cart> {
  if (!res.ok) {
    if (res.error.kind === "upstream" && res.code) {
      return fail({ kind: "cart", code: res.code, status: res.error.status });
    }
    return fail(res.error);
  }
  const parsed = cartSchema.safeParse(res.json);
  if (!parsed.success) {
    log("malformed", "/carts");
    return fail({ kind: "malformed" });
  }
  return ok(normalizeCart(parsed.data));
}

/** The cart, or null when Fourthwall no longer knows it (expired or checked out). */
export async function cartGet(cartId: string): Promise<Result<Cart | null>> {
  const cfg = config();
  if (!cfg) return fail({ kind: "unconfigured" });
  const res = await request(cfg, {
    path: `/carts/${encodeURIComponent(cartId)}`,
    query: { currency: CURRENCY },
  });
  if (!res.ok && res.error.kind === "upstream" && res.error.status === 404) return ok(null);
  return cartResult(res);
}

export async function cartCreate(items: CartLineInput[]): Promise<Result<Cart>> {
  const cfg = config();
  if (!cfg) return fail({ kind: "unconfigured" });
  return cartResult(
    await request(cfg, {
      method: "POST",
      path: "/carts",
      query: { currency: CURRENCY },
      body: { items },
    }),
  );
}

export async function cartMutate(
  op: "add" | "change" | "remove",
  cartId: string,
  items: CartLineInput[],
): Promise<Result<Cart>> {
  const cfg = config();
  if (!cfg) return fail({ kind: "unconfigured" });
  return cartResult(
    await request(cfg, {
      method: "POST",
      path: `/carts/${encodeURIComponent(cartId)}/${op}`,
      query: { currency: CURRENCY },
      body: { items },
    }),
  );
}
