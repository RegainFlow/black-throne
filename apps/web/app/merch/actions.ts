"use server";

import { getSite } from "@black-throne/content";
import { refresh } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cartCount, cartLines } from "@/lib/merch/cart";
import { isProductSlug } from "@/lib/merch/catalogue";
import {
  clampQty,
  directCheckoutUrl,
  isCartId,
  MAX_QTY,
  parseAttribution,
} from "@/lib/merch/checkout";
import { merchConfig } from "@/lib/merch/config";
import {
  ATTR_COOKIE,
  CART_COOKIE,
  CART_COOKIE_DAYS,
  COUNT_COOKIE,
  merchCookie,
} from "@/lib/merch/cookies";
import { type CartErrorCode, cartErrorMessage, type MerchError } from "@/lib/merch/errors";
import {
  type CartLineInput,
  cartCreate,
  cartGet,
  cartMutate,
  getProduct,
} from "@/lib/merch/fourthwall";
import { matchVariant, selectionFromForm } from "@/lib/merch/selection";
import type { Cart, MerchItem } from "@/lib/merch/types";

/**
 * Cart mutations. Everything the browser sends is re-validated here against Fourthwall data:
 * the product is re-fetched, options are resolved to a variant server-side, availability and
 * stock are checked, and only then does a request reach the Cart API.
 */

export interface ActionState {
  status: "idle" | "added" | "error";
  message: string;
  count?: number;
}

const failure = (code: CartErrorCode, left?: number): ActionState => ({
  status: "error",
  message: cartErrorMessage(code, left),
});

const codeOf = (e: MerchError): CartErrorCode => (e.kind === "cart" ? e.code : "STORE_UNAVAILABLE");

type Resolved =
  | { ok: true; lines: CartLineInput[] }
  | { ok: false; code: CartErrorCode; left?: number };

/** Form fields → validated cart lines (one per product; one per bundle part with bundleId). */
function resolve(item: MerchItem, form: FormData): Resolved {
  const get = (name: string) => {
    const v = form.get(name);
    return typeof v === "string" ? v : undefined;
  };
  const quantity = clampQty(get("quantity"));
  if (!item.available) return { ok: false, code: "SOLD_OUT" };
  const parts =
    item.kind === "product"
      ? [{ offer: item.offer, prefix: "" }]
      : item.offers.map((offer) => ({ offer, prefix: offer.id }));
  const lines: CartLineInput[] = [];
  for (const { offer, prefix } of parts) {
    const variant = matchVariant(offer, selectionFromForm(offer, get, prefix));
    if (!variant) return { ok: false, code: "CHOOSE_OPTIONS" };
    if (!variant.available) return { ok: false, code: "SOLD_OUT" };
    if (variant.inStock !== undefined && quantity > variant.inStock) {
      return { ok: false, code: "CART_QUANTITY_TOO_HIGH", left: variant.inStock };
    }
    lines.push(
      item.kind === "bundle"
        ? { variantId: variant.id, quantity, bundleId: item.id }
        : { variantId: variant.id, quantity },
    );
  }
  return { ok: true, lines };
}

async function loadItem(form: FormData): Promise<{ item: MerchItem } | { code: CartErrorCode }> {
  if (!getSite().merch.enabled) return { code: "STORE_UNAVAILABLE" };
  const slug = form.get("slug");
  if (!isProductSlug(slug)) return { code: "UNKNOWN" };
  const res = await getProduct(slug);
  if (!res.ok) return { code: codeOf(res.error) };
  if (!res.value) return { code: "SOLD_OUT" };
  return { item: res.value };
}

async function remember(cart: Cart) {
  const jar = await cookies();
  jar.set(CART_COOKIE, cart.id, merchCookie(CART_COOKIE_DAYS));
  jar.set(COUNT_COOKIE, String(cartCount(cartLines(cart, []))), merchCookie(CART_COOKIE_DAYS));
}

export async function addToCart(_prev: ActionState, form: FormData): Promise<ActionState> {
  const loaded = await loadItem(form);
  if ("code" in loaded) return failure(loaded.code);
  const resolved = resolve(loaded.item, form);
  if (!resolved.ok) return failure(resolved.code, resolved.left);

  const existing = (await cookies()).get(CART_COOKIE)?.value;
  let res = isCartId(existing) ? await cartMutate("add", existing, resolved.lines) : undefined;
  const gone =
    res &&
    !res.ok &&
    ((res.error.kind === "cart" && res.error.code === "CART_NOT_FOUND") ||
      (res.error.kind === "upstream" && res.error.status === 404));
  if (!res || gone) res = await cartCreate(resolved.lines);
  if (!res.ok) return failure(codeOf(res.error));
  if (!isCartId(res.value.id)) return failure("UNKNOWN");

  await remember(res.value);
  refresh();
  return {
    status: "added",
    message: "added to cart.",
    count: cartCount(cartLines(res.value, [])),
  };
}

/** "Buy now": straight to Fourthwall's hosted checkout. Regular products only. */
export async function buyNow(_prev: ActionState, form: FormData): Promise<ActionState> {
  const loaded = await loadItem(form);
  if ("code" in loaded) return failure(loaded.code);
  if (loaded.item.kind !== "product") return failure("UNKNOWN");
  const resolved = resolve(loaded.item, form);
  if (!resolved.ok) return failure(resolved.code, resolved.left);
  const cfg = merchConfig();
  if (!cfg.ok) return failure("STORE_UNAVAILABLE");
  const url = directCheckoutUrl({
    shopDomain: cfg.config.shopDomain,
    lines: resolved.lines,
    attribution: parseAttribution((await cookies()).get(ATTR_COOKIE)?.value),
  });
  if (!url) return failure("STORE_UNAVAILABLE");
  redirect(url);
}

/**
 * Brings the cookies back in line with Fourthwall: forgets a cart Fourthwall no longer knows
 * (expired, or checked out) and resyncs the header count. Called by the cart page when they
 * disagree, since cookies can't be written during render.
 */
export async function reconcileCart(): Promise<void> {
  const jar = await cookies();
  const cartId = jar.get(CART_COOKIE)?.value;
  const forget = () => {
    jar.set(CART_COOKIE, "", { ...merchCookie(0), maxAge: 0 });
    jar.set(COUNT_COOKIE, "", { ...merchCookie(0), maxAge: 0 });
  };
  if (!isCartId(cartId)) forget();
  else {
    const res = await cartGet(cartId);
    if (!res.ok) return; // outage: change nothing
    if (!res.value || res.value.items.length === 0) forget();
    else await remember(res.value);
  }
  refresh();
}

const cartUrl = (code?: CartErrorCode, left?: number) => {
  if (!code) return "/merch/cart";
  const p = new URLSearchParams({ error: code });
  if (left !== undefined) p.set("left", String(left));
  return `/merch/cart?${p}`;
};

/** Sets a line's quantity (0 removes it). Errors come back as `?error=` on the cart page. */
export async function updateLine(form: FormData): Promise<void> {
  const key = form.get("key");
  const quantity = Number(form.get("quantity"));
  if (typeof key !== "string" || !/^[vb]:\S{1,128}$/.test(key)) redirect(cartUrl("UNKNOWN"));
  // Only shape here: a stacked line may already exceed MAX_QTY and must still be decreasable.
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > 1000) redirect(cartUrl("UNKNOWN"));
  const jar = await cookies();
  const cartId = jar.get(CART_COOKIE)?.value;
  if (!isCartId(cartId)) redirect(cartUrl());

  const current = await cartGet(cartId);
  if (!current.ok) redirect(cartUrl(codeOf(current.error)));
  if (!current.value) redirect(cartUrl("CART_NOT_FOUND"));
  const line = cartLines(current.value, []).find((l) => l.key === key);
  if (!line) redirect(cartUrl());
  if (quantity > line.quantity) {
    if (line.stock !== undefined && quantity > line.stock) {
      redirect(cartUrl("CART_QUANTITY_TOO_HIGH", line.stock));
    }
    if (quantity > MAX_QTY) redirect(cartUrl("CART_QUANTITY_TOO_HIGH"));
  }

  const items = line.inputs.map((i) => ({ ...i, quantity: quantity || i.quantity }));
  const res = await cartMutate(quantity === 0 ? "remove" : "change", cartId, items);
  if (!res.ok) redirect(cartUrl(codeOf(res.error)));
  await remember(res.value);
  redirect(cartUrl());
}
