/**
 * Typed failures at the Fourthwall boundary. A MerchError never carries a URL, the token, an
 * upstream message or a `cause`: it is safe to log and safe to branch on in UI.
 */
export type MerchError =
  | { kind: "unconfigured" }
  | { kind: "timeout" }
  | { kind: "network" }
  | { kind: "upstream"; status: number }
  | { kind: "malformed" }
  | { kind: "cart"; code: CartErrorCode; status: number };

export type Result<T> = { ok: true; value: T } | { ok: false; error: MerchError };

export const ok = <T>(value: T): Result<T> => ({ ok: true, value });
export const fail = <T = never>(error: MerchError): Result<T> => ({ ok: false, error });

/** Fourthwall cart error codes we react to, plus a few of our own. */
export const CART_ERROR_CODES = [
  "CART_NOT_FOUND",
  "CART_OFFER_NOT_AVAILABLE",
  "CART_OFFER_NOT_PURCHASABLE_ERROR",
  "CART_OFFER_NOT_FOUND",
  "OFFER_VARIANT_NOT_FOUND_ERROR",
  "CART_ITEM_NOT_FOUND_FOR_SHOP_ERROR",
  "CART_QUANTITY_TOO_HIGH",
  "CART_INCOMPLETE_BUNDLE_ERROR",
  "CART_DUPLICATE_VARIANT_IDS_ERROR",
  "CART_FORBIDDEN_MEMBERS_ONLY_OFFERS_ERROR",
  "CART_PROMOTION_REQUIREMENTS_NOT_MET",
  "VARIANT_NOT_ALLOWED_FOR_FREE_PRODUCTS",
  // ours
  "CHOOSE_OPTIONS",
  "SOLD_OUT",
  "STORE_UNAVAILABLE",
  "UNKNOWN",
] as const;

export type CartErrorCode = (typeof CART_ERROR_CODES)[number];

export function toCartErrorCode(code: unknown): CartErrorCode {
  return typeof code === "string" && (CART_ERROR_CODES as readonly string[]).includes(code)
    ? (code as CartErrorCode)
    : "UNKNOWN";
}

/** Shopper-facing copy. Lowercase, mono voice, no internals. */
export function cartErrorMessage(code: CartErrorCode, left?: number): string {
  switch (code) {
    case "CART_QUANTITY_TOO_HIGH":
      return left !== undefined && left > 0
        ? `only ${left} left.`
        : "that quantity isn't available.";
    case "CART_OFFER_NOT_AVAILABLE":
    case "CART_OFFER_NOT_PURCHASABLE_ERROR":
    case "CART_OFFER_NOT_FOUND":
    case "OFFER_VARIANT_NOT_FOUND_ERROR":
    case "CART_ITEM_NOT_FOUND_FOR_SHOP_ERROR":
    case "SOLD_OUT":
      return "that piece is no longer available.";
    case "CART_INCOMPLETE_BUNDLE_ERROR":
    case "CHOOSE_OPTIONS":
      return "choose an option for every item first.";
    case "CART_FORBIDDEN_MEMBERS_ONLY_OFFERS_ERROR":
      return "that piece is for members only.";
    case "CART_NOT_FOUND":
      return "your cart expired. add the piece again.";
    case "STORE_UNAVAILABLE":
      return "the store is out of reach. try again in a moment.";
    default:
      return "something went wrong. try again.";
  }
}
