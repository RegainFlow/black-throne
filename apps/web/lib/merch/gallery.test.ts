import { describe, expect, it } from "vitest";
import { findSet, imageSets } from "./gallery";
import type { MerchImage, MerchProduct, MerchVariant } from "./types";

const img = (id: string): MerchImage => ({
  src: `https://cdn.example.com/${id}-t.webp`,
  original: `https://cdn.example.com/${id}.jpg`,
  width: 800,
  height: 1000,
});

const variant = (color: string, size: string, images: MerchImage[]): MerchVariant => ({
  id: `${color}-${size}`,
  name: "",
  options: { color, size },
  price: { value: 30, currency: "USD" },
  available: true,
  images,
});

function product(images: MerchImage[], variants: MerchVariant[]): MerchProduct {
  const colors = [...new Set(variants.map((v) => v.options.color as string))];
  return {
    kind: "product",
    id: "p",
    slug: "tee",
    name: "Tee",
    descriptionHtml: "",
    text: "",
    images,
    price: { value: 30, currency: "USD" },
    priceVaries: false,
    available: true,
    colors: colors.map((value) => ({ value })),
    sizes: ["S", "M"],
    details: [],
    offer: {
      id: "p",
      name: "Tee",
      slug: "tee",
      axes: [
        { key: "color", label: "color", values: colors.map((value) => ({ value })) },
        { key: "size", label: "size", values: [{ value: "S" }, { value: "M" }] },
      ],
      variants,
    },
  };
}

const [b1, b2, w1, w2, life] = ["b1", "b2", "w1", "w2", "life"].map(img) as [
  MerchImage,
  MerchImage,
  MerchImage,
  MerchImage,
  MerchImage,
];

describe("imageSets", () => {
  it("groups photos by colour in the product's order, without duplicates", () => {
    const item = product(
      [b1, b2, w1, w2],
      [
        variant("Black", "S", [b2, b1]),
        variant("Black", "M", [b1, b2]),
        variant("White", "S", [w1, w2]),
      ],
    );
    expect(imageSets(item)).toEqual([
      { color: "Black", images: [b1, b2] },
      { color: "White", images: [w1, w2] },
    ]);
  });

  it("adds photos no variant claims to every colour", () => {
    const item = product(
      [b1, life, w1],
      [variant("Black", "S", [b1]), variant("White", "S", [w1])],
    );
    expect(imageSets(item).map((s) => s.images)).toEqual([
      [b1, life],
      [w1, life],
    ]);
  });

  it("shows everything for a colour with no photos of its own", () => {
    const item = product([b1, w1], [variant("Black", "S", [b1]), variant("White", "S", [])]);
    expect(imageSets(item)[1]).toEqual({ color: "White", images: [b1, w1] });
  });

  it("keeps a single set when there is no colour choice", () => {
    const item = product([b1, w1], [variant("Black", "S", [b1])]);
    item.offer.axes = item.offer.axes.filter((a) => a.key !== "color");
    expect(imageSets(item)).toEqual([{ images: [b1, w1] }]);
  });
});

describe("findSet", () => {
  const sets = [
    { color: "Black", images: [b1] },
    { color: "Bone", images: [w1] },
  ];

  it("matches colours loosely, as the catalogue filters do", () => {
    expect(findSet(sets, "bone")?.color).toBe("Bone");
    expect(findSet(sets, "BLACK")?.color).toBe("Black");
  });

  it("ignores unknown or missing colours", () => {
    expect(findSet(sets, "purple")).toBeUndefined();
    expect(findSet(sets, null)).toBeUndefined();
  });
});
