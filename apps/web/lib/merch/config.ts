import "server-only";
import { isValidShopDomain } from "./checkout";

/**
 * Merch configuration, read at request time on the server.
 *
 * - FOURTHWALL_STOREFRONT_TOKEN: secret. Never rendered, logged or sent to the browser.
 * - NEXT_PUBLIC_FOURTHWALL_SHOP_DOMAIN: public, but read here through a dynamic key so Next
 *   doesn't inline its build-time value: checkout URLs are built on the server.
 * - FOURTHWALL_COLLECTION_SLUG: the collection /merch lists (default `all`).
 * - FOURTHWALL_API_BASE_URL: test-only override; accepted for loopback hosts only.
 */

export const DEFAULT_API_BASE = "https://storefront-api.fourthwall.com";

const KEYS = {
  token: "FOURTHWALL_STOREFRONT_TOKEN",
  domain: "NEXT_PUBLIC_FOURTHWALL_SHOP_DOMAIN",
  collection: "FOURTHWALL_COLLECTION_SLUG",
  apiBase: "FOURTHWALL_API_BASE_URL",
} as const;

export const COLLECTION_SLUG = /^[a-z0-9][a-z0-9-]{0,63}$/;

export interface MerchConfig {
  token: string;
  shopDomain: string;
  collection: string;
  apiBase: URL;
}

export type ConfigResult =
  | { ok: true; config: MerchConfig }
  | {
      ok: false;
      reason:
        | "missing-token"
        | "missing-domain"
        | "invalid-domain"
        | "invalid-collection"
        | "invalid-api-base";
    };

const LOOPBACK = new Set(["127.0.0.1", "localhost", "[::1]"]);

function apiBase(raw: string | undefined): URL | null {
  if (!raw) return new URL(DEFAULT_API_BASE);
  try {
    const url = new URL(raw);
    const okProtocol = url.protocol === "http:" || url.protocol === "https:";
    const bare = !url.username && !url.password && url.pathname === "/" && !url.search;
    return okProtocol && bare && LOOPBACK.has(url.hostname) ? url : null;
  } catch {
    return null;
  }
}

let warned = false;

/** Config from the real environment. Logs once (a reason code, never a value) when merch is off. */
export function merchConfig(): ConfigResult {
  const c = readMerchConfig();
  if (!c.ok && !warned) {
    warned = true;
    console.warn(`[merch] store disabled (${c.reason}): showing "opening soon". See .env.example.`);
  }
  return c;
}

export function readMerchConfig(
  env: Record<string, string | undefined> = process.env,
): ConfigResult {
  const token = env[KEYS.token]?.trim();
  if (!token) return { ok: false, reason: "missing-token" };
  const shopDomain = env[KEYS.domain]?.trim().toLowerCase();
  if (!shopDomain) return { ok: false, reason: "missing-domain" };
  if (!isValidShopDomain(shopDomain)) return { ok: false, reason: "invalid-domain" };
  const collection = env[KEYS.collection]?.trim() || "all";
  if (!COLLECTION_SLUG.test(collection)) return { ok: false, reason: "invalid-collection" };
  const base = apiBase(env[KEYS.apiBase]?.trim());
  if (!base) return { ok: false, reason: "invalid-api-base" };
  return { ok: true, config: { token, shopDomain, collection, apiBase: base } };
}
