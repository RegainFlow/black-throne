/**
 * Fourthwall-shaped test data (Storefront API v1). Generic names only: committed files are
 * scanned by `pnpm verify:repo`, so never use a release title here.
 */

export const usd = (value: number) => ({ value, currency: "USD" });

const img = (id: string) => ({
  id,
  url: `https://cdn.example.com/${id}.jpg`,
  width: 800,
  height: 1000,
  transformedUrl: `https://cdn.example.com/${id}-t.webp`,
});

const variant = (
  id: string,
  price: number,
  color: string | null,
  size: string | null,
  stock: { type: "LIMITED"; inStock: number } | { type: "UNLIMITED" },
  name = "",
) => ({
  id,
  name,
  sku: `SKU-${id.slice(0, 4)}`,
  unitPrice: usd(price),
  compareAtPrice: null,
  attributes: {
    description: name,
    ...(color ? { color: { name: color, swatch: color === "Black" ? "#000000" : "#f2efe8" } } : {}),
    ...(size ? { size: { name: size } } : {}),
  },
  stock,
  weight: { value: 0.3, unit: "kg" },
  dimensions: { length: 1, width: 1, height: 1, unit: "cm" },
  images: [],
});

const base = {
  state: { type: "AVAILABLE" },
  access: { type: "PUBLIC" },
  additionalInformation: [],
  createdAt: "2026-01-10T09:00:00.000Z",
  updatedAt: "2026-01-10T09:00:00.000Z",
};

/** Tee: Black (S, M, XL) + Bone (M only). Black/XL is sold out; Bone/M has 2 left. */
export const tee = {
  ...base,
  type: "PRODUCT",
  id: "prod-tee",
  name: "Crest Tee",
  slug: "crest-tee",
  description: "<p>Heavy cotton. <strong>Screen printed</strong> &amp; washed.</p>",
  images: [img("tee-1"), img("tee-2")],
  additionalInformation: [
    { type: "SIZE_AND_FIT", title: "Size & fit", bodyHtml: "<table><tr><td>S</td></tr></table>" },
  ],
  variants: [
    variant("11111111-1111-4111-8111-111111111101", 30, "Black", "S", { type: "UNLIMITED" }),
    variant("11111111-1111-4111-8111-111111111102", 30, "Black", "M", { type: "UNLIMITED" }),
    variant("11111111-1111-4111-8111-111111111103", 34, "Black", "XL", {
      type: "LIMITED",
      inStock: 0,
    }),
    variant("11111111-1111-4111-8111-111111111104", 30, "Bone", "M", {
      type: "LIMITED",
      inStock: 2,
    }),
  ],
};

/** Single variant, no options (a poster). */
export const poster = {
  ...base,
  type: "PRODUCT",
  id: "prod-poster",
  name: "Tour Poster",
  slug: "tour-poster",
  description: "Printed on matte stock.\n\nShips rolled.",
  createdAt: "2026-03-01T09:00:00.000Z",
  images: [img("poster-1")],
  variants: [
    variant("22222222-2222-4222-8222-222222222201", 15, null, null, { type: "UNLIMITED" }),
  ],
};

/** Variants without attributes, told apart only by name. */
export const record = {
  ...base,
  type: "PRODUCT",
  id: "prod-record",
  name: "Twelve Inch Record",
  slug: "twelve-inch-record",
  description: "",
  createdAt: "2025-11-01T09:00:00.000Z",
  images: [img("record-1")],
  variants: [
    variant("33333333-3333-4333-8333-333333333301", 28, null, null, { type: "UNLIMITED" }, "Black"),
    variant("33333333-3333-4333-8333-333333333302", 32, null, null, { type: "UNLIMITED" }, "Red"),
  ],
};

export const soldOutHoodie = {
  ...base,
  type: "PRODUCT",
  id: "prod-hoodie",
  name: "Crest Hoodie",
  slug: "crest-hoodie",
  state: { type: "SOLD_OUT" },
  description: "Brushed fleece.",
  images: [img("hoodie-1")],
  variants: [
    variant("44444444-4444-4444-8444-444444444401", 60, "Black", "L", { type: "UNLIMITED" }),
  ],
};

export const hidden = {
  ...poster,
  id: "prod-hidden",
  name: "Hidden Sample",
  slug: "hidden-sample",
  access: { type: "HIDDEN" },
};

export const bundle = {
  ...base,
  type: "BUNDLE",
  id: "55555555-5555-4555-8555-555555555500",
  name: "Tee and Poster Pack",
  slug: "tee-and-poster-pack",
  description: "Both, together.",
  images: [img("bundle-1")],
  price: usd(36),
  compareAtPrice: usd(45),
  pricingStrategy: { type: "DISCOUNT_BASED", discountPercentage: 20 },
  offers: [tee, poster].map(({ access: _a, ...offer }) => offer),
};
