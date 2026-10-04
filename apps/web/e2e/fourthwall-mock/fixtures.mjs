/**
 * Mock Fourthwall catalogue for e2e (Storefront API v1 shapes). Generic names only: this file
 * is committed and scanned by `pnpm verify:repo`.
 */

const PORT = Number(process.env.E2E_MOCK_PORT ?? 3311);
const img = (name, w = 800, h = 1000) => ({
  id: `img-${name}`,
  url: `http://127.0.0.1:${PORT}/img/${name}.svg`,
  width: w,
  height: h,
  transformedUrl: `http://127.0.0.1:${PORT}/img/${name}.svg?w=800`,
});
const usd = (value) => ({ value, currency: "USD" });
const SWATCH = { Black: "#0b0b0b", Bone: "#e9e4d8", Red: "#7a1414" };

let seq = 0;
const uuid = (group) => {
  seq += 1;
  return `${group}-0000-4000-8000-${String(seq).padStart(12, "0")}`;
};

function variant({ price, color, size, stock = { type: "UNLIMITED" }, name = "", images = [] }) {
  return {
    id: uuid("aaaaaaaa"),
    name,
    sku: `MOCK-${seq}`,
    unitPrice: usd(price),
    compareAtPrice: null,
    attributes: {
      description: name || [color, size].filter(Boolean).join(" / "),
      ...(color ? { color: { name: color, swatch: SWATCH[color] ?? "#888888" } } : {}),
      ...(size ? { size: { name: size } } : {}),
    },
    stock,
    weight: { value: 0.3, unit: "kg" },
    dimensions: { length: 30, width: 20, height: 2, unit: "cm" },
    images,
  };
}

function product(fields) {
  return {
    type: "PRODUCT",
    id: uuid("bbbbbbbb"),
    state: { type: "AVAILABLE" },
    access: { type: "PUBLIC" },
    description: "",
    additionalInformation: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...fields,
  };
}

const BLACK = [img("tee-front"), img("tee-back")];
const BONE = [img("tee-bone-front")];

export const tee = product({
  name: "Crest Tee",
  slug: "crest-tee",
  description:
    "<p>Heavyweight cotton, <strong>screen printed</strong> by hand.</p><ul><li>Boxy fit</li><li>Cold wash</li></ul><script>window.__pwned = true</script>",
  // Like Fourthwall: each colour's variants carry that colour's photos; "tee-detail" is shared.
  images: [img("tee-front"), img("tee-back"), img("tee-bone-front"), img("tee-detail")],
  createdAt: "2026-02-01T00:00:00.000Z",
  additionalInformation: [
    {
      type: "SIZE_AND_FIT",
      title: "Size & fit",
      bodyHtml:
        "<table><tr><th>Size</th><th>Chest (cm)</th></tr><tr><td>S</td><td>96</td></tr><tr><td>M</td><td>102</td></tr></table>",
    },
    {
      type: "GUARANTEE_AND_RETURNS",
      title: "Returns",
      bodyHtml: '<p>Returns within 30 days. <a href="javascript:alert(1)">tricky</a></p>',
    },
  ],
  sizeGuide: { description: "Measured flat, armpit to armpit.", fitGuideUrls: [] },
  variants: [
    variant({ price: 30, color: "Black", size: "S", images: BLACK }),
    variant({ price: 30, color: "Black", size: "M", images: BLACK }),
    variant({
      price: 30,
      color: "Black",
      size: "L",
      stock: { type: "LIMITED", inStock: 3 },
      images: BLACK,
    }),
    variant({
      price: 34,
      color: "Black",
      size: "XL",
      stock: { type: "LIMITED", inStock: 0 },
      images: BLACK,
    }),
    variant({ price: 30, color: "Bone", size: "S", images: BONE }),
    variant({ price: 30, color: "Bone", size: "M", images: BONE }),
  ],
});

export const hoodie = product({
  name: "Crest Hoodie",
  slug: "crest-hoodie",
  state: { type: "SOLD_OUT" },
  description: "Brushed fleece. Gone for now.",
  images: [img("hoodie")],
  variants: [variant({ price: 60, color: "Black", size: "L" })],
});

export const cap = product({
  name: "Logo Cap",
  slug: "logo-cap",
  description: "Six panels, one colour.",
  images: [img("cap", 800, 800)],
  createdAt: "2025-12-01T00:00:00.000Z",
  variants: [variant({ price: 25, color: "Black" })],
});

export const poster = product({
  name: "Tour Poster",
  slug: "tour-poster",
  description: "Printed on matte stock.\n\nShips rolled.",
  images: [img("poster", 800, 1100)],
  createdAt: "2026-03-01T00:00:00.000Z",
  variants: [variant({ price: 15 })],
});

export const pin = product({
  name: "Enamel Pin",
  slug: "enamel-pin",
  description: "Hard enamel, black nickel.",
  images: [img("pin", 800, 800)],
  variants: [variant({ price: 12, stock: { type: "LIMITED", inStock: 4 } })],
});

export const record = product({
  name: "Twelve Inch Record",
  slug: "twelve-inch-record",
  description: "180g pressing.",
  images: [img("record", 800, 800)],
  variants: [variant({ price: 28, name: "Black" }), variant({ price: 32, name: "Red" })],
});

export const hidden = product({
  name: "Hidden Sample",
  slug: "hidden-sample",
  access: { type: "HIDDEN" },
  images: [img("hidden")],
  variants: [variant({ price: 5 })],
});

const { access: _a1, ...teeOffer } = tee;
const { access: _a2, ...posterOffer } = poster;

export const pack = {
  type: "BUNDLE",
  id: uuid("cccccccc"),
  name: "Tee and Poster Pack",
  slug: "tee-and-poster-pack",
  state: { type: "AVAILABLE" },
  access: { type: "PUBLIC" },
  description: "<p>The tee and the poster, together.</p>",
  images: [img("pack")],
  price: usd(36),
  compareAtPrice: usd(45),
  pricingStrategy: { type: "DISCOUNT_BASED", discountPercentage: 20 },
  offers: [teeOffer, posterOffer],
  additionalInformation: [],
  createdAt: "2026-01-15T00:00:00.000Z",
  updatedAt: "2026-01-15T00:00:00.000Z",
};

export const products = [tee, hoodie, cap, poster, pin, record, hidden, pack];

export const collections = [
  {
    id: "col-all",
    name: "All",
    slug: "all",
    description: "",
    items: [tee, hoodie, pack, cap, poster, pin, record],
  },
  {
    id: "col-apparel",
    name: "Apparel",
    slug: "apparel",
    description: "",
    items: [tee, hoodie, cap, pack],
  },
  {
    id: "col-acc",
    name: "Accessories",
    slug: "accessories",
    description: "",
    items: [poster, pin, record],
  },
  { id: "col-empty", name: "Empty", slug: "empty", description: "", items: [] },
  { id: "col-outage", name: "Outage", slug: "outage", description: "", items: null },
];
