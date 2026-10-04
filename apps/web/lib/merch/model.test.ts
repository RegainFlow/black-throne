import { describe, expect, it } from "vitest";
import { bundle, hidden, poster, record, soldOutHoodie, tee } from "./fixtures";
import { isPublic, normalizeItem } from "./model";
import { itemSchema, parseItems } from "./schema";
import type { MerchBundle, MerchProduct } from "./types";

const product = (raw: unknown) => normalizeItem(itemSchema.parse(raw)) as MerchProduct;

describe("parsing at the Fourthwall boundary", () => {
  it("parses PRODUCT and BUNDLE shapes and skips unknown or malformed items", () => {
    const { items, skipped } = parseItems([
      tee,
      bundle,
      { ...tee, type: "GIFT_CARD" },
      { ...poster, variants: "nope", price: undefined, id: undefined },
      null,
    ]);
    expect(items.map((i) => i.type)).toEqual(["PRODUCT", "BUNDLE"]);
    expect(skipped).toBe(3);
  });

  it("drops a malformed variant or image without losing the product", () => {
    const raw = {
      ...tee,
      images: [{ url: "javascript:alert(1)" }, ...tee.images],
      variants: [{ id: "x" }, ...tee.variants],
    };
    const p = product(raw);
    expect(p.images).toHaveLength(2);
    expect(p.offer.variants).toHaveLength(4);
  });

  it("tolerates null compareAtPrice, missing size guide and missing description", () => {
    const p = product({ ...poster, description: null, sizeGuide: null });
    expect(p.compareAt).toBeUndefined();
    expect(p.sizeGuide).toBeUndefined();
    expect(p.descriptionHtml).toBe("");
  });

  it("only treats PUBLIC items as public", () => {
    expect(isPublic(itemSchema.parse(tee))).toBe(true);
    expect(isPublic(itemSchema.parse(hidden))).toBe(false);
    expect(isPublic(itemSchema.parse({ ...tee, access: undefined }))).toBe(false);
  });

  it("rejects a bundle whose offers are malformed", () => {
    expect(itemSchema.safeParse({ ...bundle, offers: [] }).success).toBe(false);
  });
});

describe("product model", () => {
  const p = product(tee);

  it("derives colour then size axes, sizes in apparel order", () => {
    expect(p.offer.axes.map((a) => a.key)).toEqual(["color", "size"]);
    expect(p.offer.axes[1]?.values.map((v) => v.value)).toEqual(["S", "M", "XL"]);
    expect(p.colors).toEqual([
      { value: "Black", swatch: "#000000" },
      { value: "Bone", swatch: "#f2efe8" },
    ]);
  });

  it("prices from the cheapest variant and knows when prices vary", () => {
    expect(p.price).toEqual({ value: 30, currency: "USD" });
    expect(p.priceVaries).toBe(true);
    expect(product(poster).priceVaries).toBe(false);
  });

  it("reads availability from stock and product state", () => {
    const byId = Object.fromEntries(p.offer.variants.map((v) => [v.id.slice(-2), v]));
    expect(byId["01"]?.available).toBe(true); // UNLIMITED
    expect(byId["03"]?.available).toBe(false); // LIMITED, 0 left
    expect(byId["04"]?.inStock).toBe(2);
    expect(p.available).toBe(true);
    const gone = product(soldOutHoodie);
    expect(gone.available).toBe(false);
    expect(gone.offer.variants.every((v) => !v.available)).toBe(true);
  });

  it("only shows 'n left' when every variant is limited", () => {
    expect(p.lowStock).toBeUndefined();
    const limited = product({
      ...poster,
      variants: [{ ...poster.variants[0], stock: { type: "LIMITED", inStock: 3 } }],
    });
    expect(limited.lowStock).toBe(3);
  });

  it("never sells an unknown stock model", () => {
    const odd = product({
      ...poster,
      variants: [{ ...poster.variants[0], stock: { type: "PREORDER" } }],
    });
    expect(odd.available).toBe(false);
  });

  it("has no axes for a single-variant product", () => {
    expect(product(poster).offer.axes).toEqual([]);
  });

  it("falls back to an option axis when attributes don't identify variants", () => {
    const r = product(record);
    expect(r.offer.axes).toEqual([
      { key: "option", label: "option", values: [{ value: "Black" }, { value: "Red" }] },
    ]);
  });

  it("keeps descriptions as HTML and derives plain text", () => {
    expect(p.text).toBe("Heavy cotton. Screen printed & washed.");
    expect(p.images[0]?.src).toBe("https://cdn.example.com/tee-1-t.webp");
    expect(p.images[0]?.original).toBe("https://cdn.example.com/tee-1.jpg");
  });
});

describe("bundle model", () => {
  const b = normalizeItem(itemSchema.parse(bundle)) as MerchBundle;

  it("keeps every offer with its own axes", () => {
    expect(b.kind).toBe("bundle");
    expect(b.offers.map((o) => o.name)).toEqual(["Crest Tee", "Tour Poster"]);
    expect(b.offers[0]?.axes.map((a) => a.key)).toEqual(["color", "size"]);
    expect(b.price).toEqual({ value: 36, currency: "USD" });
    expect(b.compareAt).toEqual({ value: 45, currency: "USD" });
  });

  it("is unavailable when any part is", () => {
    const raw = itemSchema.parse({
      ...bundle,
      offers: [bundle.offers[0], { ...bundle.offers[1], state: { type: "SOLD_OUT" } }],
    });
    expect(normalizeItem(raw)?.available).toBe(false);
  });
});
