import { toPlainText } from "./rich-text";
import type { FwBundle, FwCart, FwImage, FwItem, FwProduct, FwVariant } from "./schema";
import { compareSizes } from "./sizes";
import type {
  Axis,
  AxisKey,
  AxisValue,
  Cart,
  MerchBundle,
  MerchImage,
  MerchItem,
  MerchOffer,
  MerchProduct,
  MerchVariant,
} from "./types";

/** Below this many units left (across all variants) a product shows "only n left". */
export const LOW_STOCK = 5;

export function toImage(img: FwImage): MerchImage {
  return {
    src: img.transformedUrl ?? img.url,
    original: img.url,
    width: img.width ?? 1000,
    height: img.height ?? 1000,
  };
}

export function stockOf(stock: { type: string; inStock?: number }): {
  available: boolean;
  inStock?: number;
} {
  if (stock.type === "UNLIMITED") return { available: true };
  if (stock.type === "LIMITED") {
    const n = Math.max(0, stock.inStock ?? 0);
    return { available: n > 0, inStock: n };
  }
  return { available: false }; // an unknown stock model is never sold blind
}

export const isPublic = (item: { access?: { type: string } }) => item.access?.type === "PUBLIC";

type RawVariant = Pick<FwVariant, "name" | "attributes">;

/**
 * Chooses the option axes. Colour/size when every variant carries the same attributes and they
 * identify it uniquely; otherwise one "option" axis of variant names (e.g. "Vinyl — red").
 */
function variantOptions(variants: RawVariant[]): {
  axes: Axis[];
  options: Partial<Record<AxisKey, string>>[];
} {
  if (variants.length <= 1) return { axes: [], options: variants.map(() => ({})) };
  const has = (k: "color" | "size") => variants.map((v) => Boolean(v.attributes[k]?.name));
  const allOrNone = (flags: boolean[]) => flags.every(Boolean) || !flags.some(Boolean);
  const withColor = has("color").every(Boolean);
  const withSize = has("size").every(Boolean);
  const combos = variants.map(
    (v) => `${v.attributes.color?.name ?? ""}\u0000${v.attributes.size?.name ?? ""}`,
  );
  const attrsWork =
    (withColor || withSize) &&
    allOrNone(has("color")) &&
    allOrNone(has("size")) &&
    new Set(combos).size === variants.length;

  if (attrsWork) {
    const options = variants.map((v) => {
      const o: Partial<Record<AxisKey, string>> = {};
      if (withColor && v.attributes.color) o.color = v.attributes.color.name;
      if (withSize && v.attributes.size) o.size = v.attributes.size.name;
      return o;
    });
    const axes: Axis[] = [];
    if (withColor) {
      const seen = new Map<string, AxisValue>();
      for (const v of variants) {
        const c = v.attributes.color;
        if (c && !seen.has(c.name)) seen.set(c.name, { value: c.name, swatch: c.swatch });
      }
      axes.push({ key: "color", label: "color", values: [...seen.values()] });
    }
    if (withSize) {
      const sizes = [...new Set(variants.map((v) => v.attributes.size?.name ?? ""))];
      axes.push({
        key: "size",
        label: "size",
        values: sizes.sort(compareSizes).map((value) => ({ value })),
      });
    }
    return { axes, options };
  }

  const used = new Set<string>();
  const options = variants.map((v, i) => {
    let label = v.name.trim() || v.attributes.description?.trim() || `option ${i + 1}`;
    if (used.has(label)) label = `${label} (${i + 1})`;
    used.add(label);
    return { option: label };
  });
  return {
    axes: [{ key: "option", label: "option", values: options.map((o) => ({ value: o.option })) }],
    options,
  };
}

function buildOffer(p: FwProduct | FwBundle["offers"][number]): MerchOffer {
  const soldOut = p.state.type !== "AVAILABLE";
  const { axes, options } = variantOptions(p.variants);
  const variants: MerchVariant[] = p.variants.map((v, i) => {
    const stock = stockOf(v.stock);
    const compare = v.compareAtPrice;
    return {
      id: v.id,
      name: v.name,
      options: options[i] ?? {},
      price: v.unitPrice,
      compareAt: compare && compare.value > v.unitPrice.value ? compare : undefined,
      available: !soldOut && stock.available,
      inStock: stock.inStock,
      images: v.images.map(toImage),
    };
  });
  return { id: p.id, name: p.name, slug: p.slug, axes, variants };
}

/** Colour/size facets from the raw attributes (a single-variant product has no axes but can
 * still be "Black / L" for filtering). */
function attributeFacets(variants: RawVariant[]): { colors: AxisValue[]; sizes: string[] } {
  const colors = new Map<string, AxisValue>();
  const sizes = new Set<string>();
  for (const v of variants) {
    const c = v.attributes.color;
    if (c && !colors.has(c.name)) colors.set(c.name, { value: c.name, swatch: c.swatch });
    if (v.attributes.size) sizes.add(v.attributes.size.name);
  }
  return { colors: [...colors.values()], sizes: [...sizes].sort(compareSizes) };
}

function common(item: FwItem, offers: MerchOffer[]) {
  const raw = item.type === "BUNDLE" ? item.offers.flatMap((o) => o.variants) : item.variants;
  const images = item.images.length
    ? item.images.map(toImage)
    : (offers[0]?.variants.flatMap((v) => v.images).slice(0, 4) ?? []);
  const createdAt = item.createdAt ? Date.parse(item.createdAt) : Number.NaN;
  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    descriptionHtml: item.description,
    text: toPlainText(item.description),
    images,
    ...attributeFacets(raw),
    createdAt: Number.isFinite(createdAt) ? createdAt : undefined,
    details: item.additionalInformation.map((d) => ({
      type: d.type,
      title: d.title,
      html: d.bodyHtml,
    })),
  };
}

function normalizeProduct(p: FwProduct): MerchProduct | null {
  const offer = buildOffer(p);
  const cheapest = offer.variants.reduce<MerchVariant | undefined>(
    (min, v) => (!min || v.price.value < min.price.value ? v : min),
    undefined,
  );
  if (!cheapest) return null; // nothing to buy
  const available = offer.variants.some((v) => v.available);
  const limited = offer.variants.every((v) => v.inStock !== undefined);
  const left = offer.variants.reduce((n, v) => n + (v.available ? (v.inStock ?? 0) : 0), 0);
  const guide = p.sizeGuide;
  return {
    kind: "product",
    ...common(p, [offer]),
    offer,
    price: cheapest.price,
    priceVaries: offer.variants.some((v) => v.price.value !== cheapest.price.value),
    compareAt: cheapest.compareAt,
    available,
    lowStock: available && limited && left <= LOW_STOCK ? left : undefined,
    sizeGuide:
      guide && (guide.previewUrl || guide.fileUrl || guide.description)
        ? { previewUrl: guide.previewUrl, fileUrl: guide.fileUrl, description: guide.description }
        : undefined,
  };
}

function normalizeBundle(b: FwBundle): MerchBundle | null {
  const offers = b.offers.map(buildOffer);
  if (offers.some((o) => o.variants.length === 0)) return null;
  const compare = b.compareAtPrice;
  return {
    kind: "bundle",
    ...common(b, offers),
    offers,
    pricing: b.pricingStrategy,
    price: b.price,
    priceVaries:
      b.pricingStrategy.type !== "FIXED_PRICE" &&
      offers.some((o) => o.variants.some((v) => v.price.value !== o.variants[0]?.price.value)),
    compareAt: compare && compare.value > b.price.value ? compare : undefined,
    available:
      b.state.type === "AVAILABLE" && offers.every((o) => o.variants.some((v) => v.available)),
  };
}

export function normalizeItem(item: FwItem): MerchItem | null {
  return item.type === "BUNDLE" ? normalizeBundle(item) : normalizeProduct(item);
}

export function normalizeCart(cart: FwCart): Cart {
  return {
    id: cart.id,
    items: cart.items.map((it) => {
      const v = it.variant;
      const stock = stockOf(v.stock);
      const options: Partial<Record<AxisKey, string>> = {};
      if (v.attributes.color) options.color = v.attributes.color.name;
      if (v.attributes.size) options.size = v.attributes.size.name;
      const image = v.images[0];
      return {
        quantity: it.quantity,
        bundle: it.groupedBy
          ? { bundleId: it.groupedBy.bundleId, groupedId: it.groupedBy.groupedId }
          : undefined,
        variant: {
          id: v.id,
          name: v.name,
          options,
          price: v.unitPrice,
          inStock: stock.inStock,
          available: stock.available,
          image: image ? toImage(image) : undefined,
          product: v.product,
        },
      };
    }),
  };
}
