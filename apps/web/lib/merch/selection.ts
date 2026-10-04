import { roundMoney } from "./money";
import type { Axis, AxisKey, MerchOffer, MerchVariant, Money, PricingStrategy } from "./types";

/**
 * Variant selection: shared by the PurchasePanel (client) and the server actions, which
 * resolve the shopper's choice again from the submitted option values (never trusting ids).
 */

export type Selection = Partial<Record<AxisKey, string>>;

export type ValueState = "ok" | "soldout" | "missing";

/** Axes that have exactly one value are chosen for the shopper. */
export function initialSelection(offer: MerchOffer, preset: Selection = {}): Selection {
  const sel: Selection = {};
  for (const axis of offer.axes) {
    const only = axis.values.length === 1 ? axis.values[0] : undefined;
    const wanted = preset[axis.key];
    if (only) sel[axis.key] = only.value;
    // A preset (e.g. the colour in the URL) counts only if it is a real value on that axis.
    else if (wanted && axis.values.some((v) => v.value === wanted)) sel[axis.key] = wanted;
  }
  return sel;
}

function consistent(v: MerchVariant, sel: Selection, axes: Axis[]): boolean {
  return axes.every((a) => sel[a.key] === undefined || v.options[a.key] === sel[a.key]);
}

/** The variant matching a complete selection; undefined while any axis is unchosen. */
export function matchVariant(offer: MerchOffer, sel: Selection): MerchVariant | undefined {
  if (offer.axes.length === 0) return offer.variants.length === 1 ? offer.variants[0] : undefined;
  if (!offer.axes.every((a) => sel[a.key] !== undefined)) return undefined;
  return offer.variants.find((v) => offer.axes.every((a) => v.options[a.key] === sel[a.key]));
}

/**
 * Whether `value` on `axis` leads anywhere, given the choices on the axes *before* it
 * (colour, then size). Earlier axes are never blocked by later ones, so a shopper can always
 * switch colour; sizes that don't exist in that colour are "missing" (disabled).
 */
export function valueState(
  offer: MerchOffer,
  sel: Selection,
  axis: AxisKey,
  value: string,
): ValueState {
  const idx = offer.axes.findIndex((a) => a.key === axis);
  if (idx < 0) return "missing";
  const scope = offer.axes.slice(0, idx + 1);
  const next: Selection = { [axis]: value };
  for (const a of scope.slice(0, -1)) if (sel[a.key] !== undefined) next[a.key] = sel[a.key];
  const matches = offer.variants.filter((v) => consistent(v, next, scope));
  if (matches.length === 0) return "missing";
  return matches.some((v) => v.available) ? "ok" : "soldout";
}

/** Applies a choice and clears later choices it made impossible. */
export function choose(offer: MerchOffer, sel: Selection, axis: AxisKey, value: string): Selection {
  const next: Selection = { ...sel, [axis]: value };
  const idx = offer.axes.findIndex((a) => a.key === axis);
  for (const later of offer.axes.slice(idx + 1)) {
    const v = next[later.key];
    if (v !== undefined && valueState(offer, next, later.key, v) === "missing") {
      delete next[later.key];
    }
  }
  return next;
}

/** Axes still unchosen (for the "choose a size" hint). */
export function missingAxes(offer: MerchOffer, sel: Selection): Axis[] {
  return offer.axes.filter((a) => sel[a.key] === undefined);
}

/** Parse option values for one offer out of submitted form fields. */
export function selectionFromForm(
  offer: MerchOffer,
  get: (name: string) => string | undefined,
  prefix: string,
): Selection {
  const sel: Selection = {};
  for (const axis of offer.axes) {
    const raw = get(fieldName(prefix, axis.key));
    if (raw && axis.values.some((v) => v.value === raw)) sel[axis.key] = raw;
  }
  return sel;
}

/** Form field name for an option radio. Products use no prefix; bundle offers use the offer id. */
export function fieldName(prefix: string, axis: AxisKey): string {
  return prefix ? `opt:${prefix}:${axis}` : `opt:${axis}`;
}

/** Cheapest variant of an offer (Fourthwall prices a bundle by its cheapest selection). */
export function cheapestVariant(offer: MerchOffer): MerchVariant | undefined {
  return offer.variants.reduce<MerchVariant | undefined>(
    (min, v) => (!min || v.price.value < min.price.value ? v : min),
    undefined,
  );
}

/**
 * Display-time bundle price for a selection (Fourthwall's documented algorithm). Unselected
 * offers fall back to their cheapest variant. The binding amount is computed at checkout.
 */
export function bundlePrice(
  pricing: PricingStrategy,
  offers: MerchOffer[],
  chosen: Record<string, MerchVariant | undefined>,
): Money | undefined {
  if (pricing.type === "FIXED_PRICE") return pricing.price;
  let sum = 0;
  let currency: string | undefined;
  for (const offer of offers) {
    const v = chosen[offer.id] ?? cheapestVariant(offer);
    if (!v) return undefined;
    sum += v.price.value;
    currency ??= v.price.currency;
  }
  if (!currency) return undefined;
  const value =
    pricing.type === "DISCOUNT_BASED" ? sum * (1 - pricing.discountPercentage / 100) : sum;
  return { value: roundMoney(value, currency), currency };
}
