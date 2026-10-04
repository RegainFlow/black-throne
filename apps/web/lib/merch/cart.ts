import type { CartLineInput } from "./fourthwall";
import { roundMoney } from "./money";
import { bundlePrice } from "./selection";
import type {
  Cart,
  CartItem,
  MerchBundle,
  MerchImage,
  MerchItem,
  MerchVariant,
  Money,
} from "./types";

/**
 * Cart view model. A bundle's component items share a `groupedId` and render (and change) as
 * one line priced with the bundle's strategy. CartV1 carries no totals, so the subtotal shown
 * here is an estimate; Fourthwall's checkout is the binding amount.
 */

export interface CartLine {
  /** `v:<variantId>` for a single item, `b:<groupedId>` for a bundle instance. */
  key: string;
  kind: "item" | "bundle";
  title: string;
  slug?: string;
  image?: MerchImage;
  /** "black · m" for items; one entry per part for bundles. */
  details: string[];
  quantity: number;
  /** Units left when stock is limited (the lowest across a bundle's parts). */
  stock?: number;
  unit?: Money;
  total?: Money;
  /** True when the price couldn't be computed exactly (bundle missing from the catalogue). */
  estimate: boolean;
  /** What the API needs to change or remove this line. */
  inputs: CartLineInput[];
}

/** "black · m", the variant name, or "" for an option-less product. */
const describe = (item: CartItem) =>
  [item.variant.options.color, item.variant.options.size]
    .filter(Boolean)
    .join(" · ")
    .toLowerCase() || item.variant.name.toLowerCase();

const part = (item: CartItem) => {
  const d = describe(item);
  const name = item.variant.product.name.toLowerCase();
  return d ? `${name} — ${d}` : name;
};

const times = (m: Money, q: number): Money => ({
  value: roundMoney(m.value * q, m.currency),
  currency: m.currency,
});

function stockFor(items: CartItem[]): number | undefined {
  const limits = items.map((i) => i.variant.inStock).filter((n): n is number => n !== undefined);
  return limits.length ? Math.min(...limits) : undefined;
}

/**
 * `catalogue` (the cached collection, may be empty) supplies bundle names/pricing and product
 * images when a cart variant carries none.
 */
export function cartLines(cart: Cart, catalogue: MerchItem[]): CartLine[] {
  const bundles = catalogue.filter((i): i is MerchBundle => i.kind === "bundle");
  const productImage = (slug: string) => catalogue.find((i) => i.slug === slug)?.images[0];
  const lines: CartLine[] = [];
  const groups = new Map<string, CartItem[]>();
  for (const item of cart.items) {
    if (item.quantity <= 0) continue;
    if (item.bundle) {
      const g = groups.get(item.bundle.groupedId) ?? [];
      g.push(item);
      groups.set(item.bundle.groupedId, g);
      continue;
    }
    lines.push({
      key: `v:${item.variant.id}`,
      kind: "item",
      title: item.variant.product.name,
      slug: item.variant.product.slug,
      image: item.variant.image ?? productImage(item.variant.product.slug),
      details: [describe(item)].filter(Boolean),
      quantity: item.quantity,
      stock: stockFor([item]),
      unit: item.variant.price,
      total: times(item.variant.price, item.quantity),
      estimate: false,
      inputs: [{ variantId: item.variant.id, quantity: item.quantity }],
    });
  }

  for (const [groupedId, items] of groups) {
    const first = items[0];
    if (!first?.bundle) continue;
    const bundleId = first.bundle.bundleId;
    const quantity = first.quantity;
    const bundle = bundles.find((b) => b.id === bundleId);
    let unit: Money | undefined;
    if (bundle) {
      const chosen: Record<string, MerchVariant | undefined> = {};
      for (const offer of bundle.offers) {
        const hit = items.find((i) => offer.variants.some((v) => v.id === i.variant.id));
        chosen[offer.id] = hit ? offer.variants.find((v) => v.id === hit.variant.id) : undefined;
      }
      unit = bundlePrice(bundle.pricing, bundle.offers, chosen);
    }
    const estimate = !unit;
    if (!unit) {
      const sum = items.reduce((n, i) => n + i.variant.price.value, 0);
      const currency = first.variant.price.currency;
      unit = { value: roundMoney(sum, currency), currency };
    }
    lines.push({
      key: `b:${groupedId}`,
      kind: "bundle",
      title: bundle?.name ?? "bundle",
      slug: bundle?.slug,
      image: bundle?.images[0] ?? first.variant.image,
      details: items.map(part),
      quantity,
      stock: stockFor(items),
      unit,
      total: times(unit, quantity),
      estimate,
      inputs: items.map((i) => ({ variantId: i.variant.id, quantity, bundleId })),
    });
  }
  return lines;
}

/** Items in the cart, counting each bundle instance once. */
export const cartCount = (lines: CartLine[]) => lines.reduce((n, l) => n + l.quantity, 0);

export function subtotal(lines: CartLine[]): Money | undefined {
  const currency = lines[0]?.total?.currency;
  if (!currency || lines.some((l) => !l.total || l.total.currency !== currency)) return undefined;
  const sum = lines.reduce((n, l) => n + (l.total?.value ?? 0), 0);
  return { value: roundMoney(sum, currency), currency };
}
