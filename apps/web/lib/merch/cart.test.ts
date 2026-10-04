import { describe, expect, it } from "vitest";
import { cartCount, cartLines, subtotal } from "./cart";
import { bundle, tee, usd } from "./fixtures";
import { normalizeCart, normalizeItem } from "./model";
import { cartSchema, itemSchema } from "./schema";
import type { MerchBundle } from "./types";

const pack = normalizeItem(itemSchema.parse(bundle)) as MerchBundle;
const teeBlackS = tee.variants[0]!;
const teeBlackXl = tee.variants[2]!;
const teeBoneM = tee.variants[3]!;
const posterVariant = bundle.offers[1]!.variants[0]!;

const cartItem = (
  v: typeof teeBlackS,
  product: { id: string; name: string; slug: string },
  quantity: number,
  groupedBy?: { bundleId: string; groupedId: string },
) => ({
  quantity,
  variant: { ...v, product },
  ...(groupedBy ? { groupedBy: { type: "BUNDLE", ...groupedBy } } : {}),
});

const teeStub = { id: tee.id, name: tee.name, slug: tee.slug };
const posterStub = { id: "prod-poster", name: "Tour Poster", slug: "tour-poster" };
const group = { bundleId: bundle.id, groupedId: "g-1" };

const cart = normalizeCart(
  cartSchema.parse({
    id: "cart_12345678",
    items: [
      cartItem(teeBlackS, teeStub, 2),
      cartItem(teeBoneM, teeStub, 1),
      cartItem(teeBlackXl, teeStub, 1, group),
      cartItem(posterVariant, posterStub, 1, group),
    ],
  }),
);

describe("cart lines", () => {
  const lines = cartLines(cart, [pack]);

  it("keeps single items as lines with their options", () => {
    const first = lines[0];
    expect(first).toMatchObject({
      key: `v:${teeBlackS.id}`,
      kind: "item",
      title: "Crest Tee",
      details: ["black · s"],
      quantity: 2,
      total: usd(60),
      estimate: false,
    });
    expect(lines[1]?.stock).toBe(2);
  });

  it("groups bundle parts into one line priced by the bundle's strategy", () => {
    const b = lines.find((l) => l.kind === "bundle");
    // XL tee 34 + poster 15 = 49, 20% off = 39.20
    expect(b).toMatchObject({
      key: "b:g-1",
      title: "Tee and Poster Pack",
      quantity: 1,
      unit: usd(39.2),
      estimate: false,
    });
    expect(b?.details).toEqual(["crest tee — black · xl", "tour poster"]);
    expect(b?.inputs).toEqual([
      { variantId: teeBlackXl.id, quantity: 1, bundleId: bundle.id },
      { variantId: posterVariant.id, quantity: 1, bundleId: bundle.id },
    ]);
  });

  it("estimates a bundle it can't find in the catalogue", () => {
    const b = cartLines(cart, []).find((l) => l.kind === "bundle");
    expect(b).toMatchObject({ title: "bundle", unit: usd(49), estimate: true });
  });

  it("counts bundles once and sums an estimated subtotal", () => {
    expect(cartCount(lines)).toBe(4);
    expect(subtotal(lines)).toEqual(usd(60 + 30 + 39.2));
  });
});
