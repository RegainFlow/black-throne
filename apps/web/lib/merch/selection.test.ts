import { describe, expect, it } from "vitest";
import { bundle, poster, tee } from "./fixtures";
import { normalizeItem } from "./model";
import { itemSchema } from "./schema";
import {
  bundlePrice,
  choose,
  fieldName,
  initialSelection,
  matchVariant,
  missingAxes,
  selectionFromForm,
  valueState,
} from "./selection";
import type { MerchBundle, MerchProduct } from "./types";

const teeOffer = (normalizeItem(itemSchema.parse(tee)) as MerchProduct).offer;
const posterOffer = (normalizeItem(itemSchema.parse(poster)) as MerchProduct).offer;
const pack = normalizeItem(itemSchema.parse(bundle)) as MerchBundle;

describe("variant selection", () => {
  it("requires every axis before resolving a variant", () => {
    expect(matchVariant(teeOffer, { color: "Black" })).toBeUndefined();
    expect(matchVariant(teeOffer, { color: "Black", size: "M" })?.id).toMatch(/02$/);
    expect(matchVariant(teeOffer, { color: "Bone", size: "S" })).toBeUndefined();
  });

  it("auto-selects nothing for multi-value axes and resolves single-variant products", () => {
    expect(initialSelection(teeOffer)).toEqual({});
    expect(matchVariant(posterOffer, initialSelection(posterOffer))?.id).toMatch(/01$/);
  });

  it("starts on a preset colour only when the product has it", () => {
    expect(initialSelection(teeOffer, { color: "Bone" })).toEqual({ color: "Bone" });
    expect(initialSelection(teeOffer, { color: "Purple" })).toEqual({});
  });

  it("marks sizes missing in the chosen colour, and sold-out ones as sold out", () => {
    const sel = { color: "Bone" };
    expect(valueState(teeOffer, sel, "size", "S")).toBe("missing");
    expect(valueState(teeOffer, sel, "size", "M")).toBe("ok");
    expect(valueState(teeOffer, { color: "Black" }, "size", "XL")).toBe("soldout");
  });

  it("never blocks an earlier axis on a later choice", () => {
    expect(valueState(teeOffer, { size: "S" }, "color", "Bone")).toBe("ok");
  });

  it("clears later choices a new colour makes impossible", () => {
    expect(choose(teeOffer, { color: "Black", size: "S" }, "color", "Bone")).toEqual({
      color: "Bone",
    });
    expect(choose(teeOffer, { color: "Black", size: "M" }, "color", "Bone")).toEqual({
      color: "Bone",
      size: "M",
    });
  });

  it("names what is still missing", () => {
    expect(missingAxes(teeOffer, { color: "Black" }).map((a) => a.key)).toEqual(["size"]);
  });

  it("reads only known option values from a form", () => {
    const form = new Map([
      [fieldName("", "color"), "Black"],
      [fieldName("", "size"), "<script>"],
    ]);
    expect(selectionFromForm(teeOffer, (k) => form.get(k), "")).toEqual({ color: "Black" });
    expect(fieldName("offer-1", "size")).toBe("opt:offer-1:size");
  });
});

describe("bundle pricing (Fourthwall's documented algorithm)", () => {
  const [teePart, posterPart] = pack.offers;
  const xl = teePart?.variants.find((v) => v.options.size === "XL");

  it("discounts the sum of the chosen variants, falling back to the cheapest", () => {
    // cheapest: 30 + 15 = 45 → 20% off = 36
    expect(bundlePrice(pack.pricing, pack.offers, {})).toEqual({ value: 36, currency: "USD" });
    // XL costs 34: 34 + 15 = 49 → 39.2
    expect(bundlePrice(pack.pricing, pack.offers, { [teePart?.id ?? ""]: xl })).toEqual({
      value: 39.2,
      currency: "USD",
    });
  });

  it("sums for SAME_AS_INDIVIDUAL and ignores the selection for FIXED_PRICE", () => {
    expect(bundlePrice({ type: "SAME_AS_INDIVIDUAL" }, pack.offers, {})?.value).toBe(45);
    const fixed = { type: "FIXED_PRICE" as const, price: { value: 40, currency: "USD" } };
    expect(bundlePrice(fixed, pack.offers, { [teePart?.id ?? ""]: xl })?.value).toBe(40);
    expect(posterPart?.variants).toHaveLength(1);
  });

  it("rounds once, at the end", () => {
    const thirds = { type: "DISCOUNT_BASED" as const, discountPercentage: 33.333 };
    expect(bundlePrice(thirds, pack.offers, {})?.value).toBe(30);
  });
});
