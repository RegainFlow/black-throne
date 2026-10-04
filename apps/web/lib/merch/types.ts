/**
 * View-model types for the merch storefront. Pure types only: safe to import from client
 * components (PurchasePanel) without pulling zod or server code into the bundle.
 */

export interface Money {
  /** Major units (21.42 = $21.42), already converted to `currency` by Fourthwall. */
  value: number;
  currency: string;
}

export interface MerchImage {
  /** Fourthwall's transformed (optimised) URL when present, else the original. */
  src: string;
  /** The untransformed original, used for share/JSON-LD images. */
  original: string;
  width: number;
  height: number;
}

/** The option axes a shopper chooses from. `option` is the fallback when attributes don't
 * uniquely identify variants (e.g. "Vinyl — red"). */
export type AxisKey = "color" | "size" | "option";

export interface AxisValue {
  value: string;
  /** CSS colour for colour swatches. */
  swatch?: string;
}

export interface Axis {
  key: AxisKey;
  label: string;
  values: AxisValue[];
}

export interface MerchVariant {
  id: string;
  name: string;
  options: Partial<Record<AxisKey, string>>;
  price: Money;
  compareAt?: Money;
  available: boolean;
  /** Units left when stock is LIMITED; undefined when UNLIMITED. */
  inStock?: number;
  images: MerchImage[];
}

/** One purchasable product inside a bundle (or the product itself). */
export interface MerchOffer {
  id: string;
  name: string;
  slug: string;
  axes: Axis[];
  variants: MerchVariant[];
}

export type PricingStrategy =
  | { type: "SAME_AS_INDIVIDUAL" }
  | { type: "DISCOUNT_BASED"; discountPercentage: number }
  | { type: "FIXED_PRICE"; price: Money };

export interface MerchDetail {
  type: string;
  title: string;
  html: string;
}

export interface SizeGuide {
  previewUrl?: string;
  fileUrl?: string;
  description?: string;
}

interface MerchItemBase {
  id: string;
  slug: string;
  name: string;
  /** Remote HTML: render only through `RichText`. */
  descriptionHtml: string;
  /** Plain text of the description, for search and meta descriptions. */
  text: string;
  images: MerchImage[];
  /** "From" price: the cheapest variant (or the bundle's cheapest selection). */
  price: Money;
  /** True when other choices cost more than `price` (shown as "from"). */
  priceVaries: boolean;
  compareAt?: Money;
  available: boolean;
  /** Units left across all variants when every variant is LIMITED and few remain. */
  lowStock?: number;
  colors: AxisValue[];
  sizes: string[];
  createdAt?: number;
  details: MerchDetail[];
}

export interface MerchProduct extends MerchItemBase {
  kind: "product";
  offer: MerchOffer;
  sizeGuide?: SizeGuide;
}

export interface MerchBundle extends MerchItemBase {
  kind: "bundle";
  offers: MerchOffer[];
  pricing: PricingStrategy;
}

export type MerchItem = MerchProduct | MerchBundle;

export interface MerchCollection {
  slug: string;
  name: string;
}

/* ---------- cart ---------- */

export interface CartVariant {
  id: string;
  name: string;
  options: Partial<Record<AxisKey, string>>;
  price: Money;
  inStock?: number;
  available: boolean;
  image?: MerchImage;
  product: { id: string; name: string; slug: string };
}

export interface CartItem {
  variant: CartVariant;
  quantity: number;
  bundle?: { bundleId: string; groupedId: string };
}

export interface Cart {
  id: string;
  items: CartItem[];
}
