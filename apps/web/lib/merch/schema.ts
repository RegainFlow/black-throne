import { z } from "zod";

/**
 * Typed parsing at the Fourthwall Storefront API boundary (OpenAPI: docs.fourthwall.com/
 * open-api-docs/storefront.json). Lenient where Fourthwall may add or omit optional data,
 * strict where a wrong guess would mislead a shopper (prices, ids, bundle composition).
 */

/** An array whose malformed entries are dropped instead of failing the whole parent. */
const lenientArray = <T extends z.ZodType>(item: T) =>
  z
    .array(z.unknown())
    .catch([])
    .transform((arr) =>
      arr.flatMap((x) => {
        const r = item.safeParse(x);
        return r.success ? [r.data as z.output<T>] : [];
      }),
    );

const httpUrl = z.url({ protocol: /^https?$/ });

export const moneySchema = z.object({
  value: z.number().nonnegative(),
  currency: z.string().regex(/^[A-Z]{3}$/),
});

export const imageSchema = z.object({
  id: z.string().optional(),
  url: httpUrl,
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  transformedUrl: httpUrl.optional().catch(undefined),
});

const stockSchema = z.object({
  type: z.string(),
  inStock: z.number().int().optional(),
});

const attributesSchema = z
  .object({
    description: z.string().optional(),
    color: z.object({ name: z.string().min(1), swatch: z.string().optional() }).nullish(),
    size: z.object({ name: z.string().min(1) }).nullish(),
  })
  .catch({});

export const variantSchema = z.object({
  id: z.string().min(1),
  name: z.string().default(""),
  unitPrice: moneySchema,
  compareAtPrice: moneySchema.nullish().catch(undefined),
  attributes: attributesSchema.default({}),
  stock: stockSchema,
  images: lenientArray(imageSchema).default([]),
});

const infoSchema = z.object({
  type: z.string(),
  title: z.string(),
  bodyHtml: z.string(),
});

const sizeGuideSchema = z.object({
  previewUrl: httpUrl.optional().catch(undefined),
  fileUrl: httpUrl.optional().catch(undefined),
  description: z.string().optional(),
});

const tagged = z.object({ type: z.string() });

const productFields = {
  id: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z
    .string()
    .nullish()
    .transform((d) => d ?? ""),
  state: tagged,
  access: tagged.optional(),
  images: lenientArray(imageSchema).default([]),
  additionalInformation: lenientArray(infoSchema).default([]),
  createdAt: z.string().optional(),
};

export const productSchema = z.object({
  ...productFields,
  type: z.literal("PRODUCT"),
  variants: lenientArray(variantSchema).default([]),
  sizeGuide: sizeGuideSchema.nullish().catch(undefined),
});

const pricingSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("SAME_AS_INDIVIDUAL") }),
  z.object({
    type: z.literal("DISCOUNT_BASED"),
    discountPercentage: z.number().min(0).max(100),
  }),
  z.object({ type: z.literal("FIXED_PRICE"), price: moneySchema }),
]);

export const bundleSchema = z.object({
  ...productFields,
  type: z.literal("BUNDLE"),
  price: moneySchema,
  compareAtPrice: moneySchema.nullish().catch(undefined),
  pricingStrategy: pricingSchema,
  // Strict: a bundle missing one of its products can't be bought, so it isn't shown.
  offers: z.array(productSchema.extend({ type: z.literal("PRODUCT").optional() })).min(1),
});

export const itemSchema = z.discriminatedUnion("type", [productSchema, bundleSchema]);

export type FwProduct = z.output<typeof productSchema>;
export type FwBundle = z.output<typeof bundleSchema>;
export type FwItem = z.output<typeof itemSchema>;
export type FwVariant = z.output<typeof variantSchema>;
export type FwImage = z.output<typeof imageSchema>;

export const pageSchema = z.object({
  results: z.array(z.unknown()),
  paging: z.object({ hasNextPage: z.boolean().optional() }).nullish(),
});

export const collectionSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  slug: z.string().min(1),
});

export const cartSchema = z.object({
  id: z.string().min(1),
  items: z.array(
    z.object({
      quantity: z.number().int().nonnegative(),
      variant: z.object({
        id: z.string().min(1),
        name: z.string().default(""),
        unitPrice: moneySchema,
        attributes: attributesSchema.default({}),
        stock: stockSchema,
        images: lenientArray(imageSchema).default([]),
        product: z.object({ id: z.string(), name: z.string(), slug: z.string() }),
      }),
      groupedBy: z
        .object({ type: z.string(), bundleId: z.string(), groupedId: z.string() })
        .nullish()
        .catch(undefined),
    }),
  ),
});

export type FwCart = z.output<typeof cartSchema>;

export const errorBodySchema = z.object({ code: z.string().optional() }).catch({});

/** Parses listing results one by one: a malformed or unknown-type item is skipped, not fatal. */
export function parseItems(results: unknown[]): { items: FwItem[]; skipped: number } {
  const items: FwItem[] = [];
  let skipped = 0;
  for (const raw of results) {
    const r = itemSchema.safeParse(raw);
    if (r.success) items.push(r.data);
    else skipped++;
  }
  return { items, skipped };
}
