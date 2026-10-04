/**
 * Stateful mock of Fourthwall's Storefront API for e2e (never the live API, never real
 * credentials). Implements the endpoints the site uses — collections, products and all five
 * cart operations, including bundle grouping and the documented error codes — plus a
 * placeholder image route.
 *
 *   node e2e/fourthwall-mock/server.mjs   (port: E2E_MOCK_PORT, default 3311)
 */
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { collections, products } from "./fixtures.mjs";

const PORT = Number(process.env.E2E_MOCK_PORT ?? 3311);
const TOKEN = "e2e-token";
/** Small pages so the site's pagination loop is exercised. */
const MAX_PAGE_SIZE = 4;

/** cartId → { lines: [{ variantId, quantity, bundleId?, groupedId? }] } */
const carts = new Map();

const variantIndex = new Map();
for (const p of products) {
  if (p.type !== "PRODUCT") continue;
  for (const v of p.variants) variantIndex.set(v.id, { product: p, variant: v });
}
const bundles = new Map(products.filter((p) => p.type === "BUNDLE").map((b) => [b.id, b]));

function send(res, status, body, type = "application/json") {
  res.writeHead(status, { "content-type": type, "cache-control": "no-store" });
  res.end(type === "application/json" ? JSON.stringify(body) : body);
}

const fail = (res, status, code, extra = {}) => send(res, status, { code, ...extra });

function svg(name) {
  const hue = [...name].reduce((n, c) => n + c.charCodeAt(0), 0) % 360;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000"><rect width="800" height="1000" fill="hsl(${hue} 12% 12%)"/><circle cx="400" cy="440" r="180" fill="none" stroke="hsl(${hue} 30% 55%)" stroke-width="6"/><text x="400" y="840" fill="#d9d2c3" font-family="monospace" font-size="44" text-anchor="middle">${name}</text></svg>`;
}

async function body(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  } catch {
    return {};
  }
}

const available = (product, variant) =>
  product.state.type === "AVAILABLE" &&
  (variant.stock.type === "UNLIMITED" || (variant.stock.inStock ?? 0) > 0);

const stockOf = (variant) =>
  variant.stock.type === "LIMITED" ? (variant.stock.inStock ?? 0) : Number.POSITIVE_INFINITY;

function view(id) {
  const cart = carts.get(id);
  return {
    id,
    items: cart.lines.map((l) => {
      const { product, variant } = variantIndex.get(l.variantId);
      return {
        variant: {
          ...variant,
          product: { id: product.id, name: product.name, slug: product.slug },
        },
        quantity: l.quantity,
        ...(l.groupedId
          ? { groupedBy: { type: "BUNDLE", bundleId: l.bundleId, groupedId: l.groupedId } }
          : {}),
      };
    }),
  };
}

/** Validates a request's items; returns an error code or null. */
function validate(items, { forRemove = false } = {}) {
  if (!Array.isArray(items) || items.length === 0) return "CART_ITEM_NOT_FOUND_FOR_SHOP_ERROR";
  const seen = new Set();
  for (const it of items) {
    if (seen.has(it.variantId)) return "CART_DUPLICATE_VARIANT_IDS_ERROR";
    seen.add(it.variantId);
    const hit = variantIndex.get(it.variantId);
    if (!hit) return "OFFER_VARIANT_NOT_FOUND_ERROR";
    if (!Number.isInteger(it.quantity) || it.quantity < 0 || it.quantity > 1000)
      return "CART_QUANTITY_TOO_HIGH";
    if (!forRemove && hit.product.access.type !== "PUBLIC" && !it.bundleId)
      return "CART_OFFER_NOT_AVAILABLE";
    if (!forRemove && !available(hit.product, hit.variant)) return "CART_OFFER_NOT_AVAILABLE";
  }
  // Bundles: one variant per offer, same quantity, all with the bundle's id.
  const byBundle = new Map();
  for (const it of items) {
    if (!it.bundleId) continue;
    const g = byBundle.get(it.bundleId) ?? [];
    g.push(it);
    byBundle.set(it.bundleId, g);
  }
  for (const [bundleId, group] of byBundle) {
    const b = bundles.get(bundleId);
    if (!b) return "CART_OFFER_NOT_FOUND";
    if (group.length !== b.offers.length) return "CART_INCOMPLETE_BUNDLE_ERROR";
    if (new Set(group.map((g) => g.quantity)).size !== 1) return "CART_INCOMPLETE_BUNDLE_ERROR";
    for (const offer of b.offers) {
      if (!group.some((g) => offer.variants.some((v) => v.id === g.variantId)))
        return "CART_INCOMPLETE_BUNDLE_ERROR";
    }
  }
  return null;
}

const groupKey = (lines) =>
  lines
    .map((l) => l.variantId)
    .sort()
    .join(",");

function overStock(cart) {
  const totals = new Map();
  for (const l of cart.lines) totals.set(l.variantId, (totals.get(l.variantId) ?? 0) + l.quantity);
  for (const [id, qty] of totals) {
    const { variant } = variantIndex.get(id);
    if (qty > stockOf(variant)) return true;
  }
  return false;
}

function apply(cart, op, items) {
  const singles = items.filter((i) => !i.bundleId);
  const bundled = items.filter((i) => i.bundleId);
  const next = cart.lines.map((l) => ({ ...l }));

  for (const it of singles) {
    const line = next.find((l) => !l.groupedId && l.variantId === it.variantId);
    if (op === "add") {
      if (line) line.quantity += it.quantity;
      else next.push({ variantId: it.variantId, quantity: it.quantity });
    } else if (!line) {
      return { error: "CART_ITEM_NOT_FOUND_FOR_SHOP_ERROR" };
    } else if (op === "change") {
      line.quantity = it.quantity;
    } else {
      line.quantity = 0;
    }
  }

  if (bundled.length) {
    const key = groupKey(bundled);
    const quantity = bundled[0].quantity;
    const groups = new Map();
    for (const l of next)
      if (l.groupedId) groups.set(l.groupedId, [...(groups.get(l.groupedId) ?? []), l]);
    const match = [...groups.values()].find((g) => groupKey(g) === key);
    if (op === "add") {
      if (match) for (const l of match) l.quantity += quantity;
      else {
        const groupedId = randomUUID();
        for (const it of bundled)
          next.push({ variantId: it.variantId, quantity, bundleId: it.bundleId, groupedId });
      }
    } else if (!match) {
      return { error: "CART_ITEM_NOT_FOUND_FOR_SHOP_ERROR" };
    } else {
      for (const l of match) l.quantity = op === "change" ? quantity : 0;
    }
  }

  const lines = next.filter((l) => l.quantity > 0);
  if (overStock({ lines })) return { error: "CART_QUANTITY_TOO_HIGH" };
  return { lines };
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://127.0.0.1:${PORT}`);
  const parts = url.pathname.split("/").filter(Boolean);

  if (url.pathname === "/__health") return send(res, 200, { ok: true });
  if (parts[0] === "img" && parts[1]) {
    return send(res, 200, svg(decodeURIComponent(parts[1]).replace(/\.svg$/, "")), "image/svg+xml");
  }
  if (parts[0] !== "v1") return fail(res, 404, "NOT_FOUND");
  if (url.searchParams.get("storefront_token") !== TOKEN) return fail(res, 401, "UNAUTHORIZED");

  const [, resource, id, sub] = parts;

  // GET /v1/collections
  if (req.method === "GET" && resource === "collections" && !id) {
    return send(res, 200, {
      results: collections.map(({ items: _i, ...c }) => c),
      paging: {
        pageNumber: 0,
        pageSize: 50,
        elementsSize: collections.length,
        elementsTotal: collections.length,
        totalPages: 1,
        hasNextPage: false,
      },
    });
  }

  // GET /v1/collections/{slug}/products
  if (req.method === "GET" && resource === "collections" && id && sub === "products") {
    const col = collections.find((c) => c.slug === id);
    if (!col) return fail(res, 404, "COLLECTION_NOT_FOUND_BY_SHOP_ID_AND_SHOP_ERROR", { slug: id });
    if (col.items === null) return fail(res, 503, "SERVICE_UNAVAILABLE");
    const page = Number(url.searchParams.get("page") ?? 0);
    const size = Math.min(Number(url.searchParams.get("size") ?? 50), MAX_PAGE_SIZE);
    const start = page * size;
    const results = col.items.slice(start, start + size);
    return send(res, 200, {
      results,
      paging: {
        pageNumber: page,
        pageSize: size,
        elementsSize: results.length,
        elementsTotal: col.items.length,
        totalPages: Math.ceil(col.items.length / size),
        hasNextPage: start + size < col.items.length,
      },
    });
  }

  // GET /v1/products/{slug}
  if (req.method === "GET" && resource === "products" && id) {
    if (id === "upstream-error") return fail(res, 500, "INTERNAL_ERROR");
    const p = products.find((x) => x.slug === id);
    if (!p) return fail(res, 404, "OFFER_SLUG_NOT_FOUND_ERROR", { offerSlug: id });
    return send(res, 200, p);
  }

  // Carts
  if (resource === "carts") {
    if (req.method === "POST" && !id) {
      const { items = [] } = await body(req);
      const cartId = randomUUID();
      carts.set(cartId, { lines: [] });
      if (items.length) {
        const err = validate(items);
        if (err) return fail(res, 400, err);
        const r = apply(carts.get(cartId), "add", items);
        if (r.error) return fail(res, 400, r.error);
        carts.get(cartId).lines = r.lines;
      }
      return send(res, 200, view(cartId));
    }
    if (!id || !carts.has(id)) return fail(res, 404, "CART_NOT_FOUND", { cartId: id });
    if (req.method === "GET" && !sub) return send(res, 200, view(id));
    if (req.method === "POST" && ["add", "change", "remove"].includes(sub ?? "")) {
      const { items = [] } = await body(req);
      const err = validate(items, { forRemove: sub === "remove" });
      if (err) return fail(res, 400, err);
      const r = apply(carts.get(id), sub, items);
      if (r.error) return fail(res, 400, r.error);
      carts.get(id).lines = r.lines;
      return send(res, 200, view(id));
    }
  }

  return fail(res, 404, "NOT_FOUND");
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[fourthwall-mock] listening on http://127.0.0.1:${PORT}`);
});
