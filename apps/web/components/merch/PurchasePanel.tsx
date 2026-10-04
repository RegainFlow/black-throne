"use client";

import Link from "next/link";
import {
  type FormEvent,
  startTransition,
  useActionState,
  useEffect,
  useId,
  useState,
  useSyncExternalStore,
} from "react";
import { type ActionState, addToCart, buyNow } from "@/app/merch/actions";
import { trackEvent } from "@/lib/analytics";
import { formatMoney } from "@/lib/merch/money";
import {
  bundlePrice,
  choose,
  fieldName,
  initialSelection,
  matchVariant,
  missingAxes,
  type Selection,
  valueState,
} from "@/lib/merch/selection";
import type { MerchOffer, MerchVariant, Money, PricingStrategy } from "@/lib/merch/types";
import { buttonGhost, buttonPrimary, chip, field } from "./styles";

export interface PurchaseModel {
  slug: string;
  kind: "product" | "bundle";
  /** One offer for a product; one per part for a bundle. Variant images are stripped. */
  offers: MerchOffer[];
  pricing?: PricingStrategy;
  price: Money;
  compareAt?: Money;
  priceVaries: boolean;
  available: boolean;
  /** Colour to start on (from `?color=`, already matched to a real value). Products only. */
  color?: string;
}

const IDLE: ActionState = { status: "idle", message: "" };
const noop = () => () => {};

/**
 * Puts the chosen colour in the URL without navigating. Gallery reads it from there, and the
 * link stays shareable. (A bundle has one colour per part, so only products do this.)
 */
function showColor(color: string) {
  const params = new URLSearchParams(window.location.search);
  params.set("color", color);
  window.history.replaceState(null, "", `?${params}`);
}

/**
 * Variant selection + purchase. Native radios in fieldsets (arrow keys move within a group),
 * so it works with a keyboard and a screen reader; the server re-resolves the same option
 * values, so nothing here is trusted. Before hydration the buttons stay enabled and the server
 * explains what's missing — the no-JS path still works.
 */
export function PurchasePanel({ model }: { model: PurchaseModel }) {
  const uid = useId();
  const hydrated = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
  const prefixOf = (offer: MerchOffer) => (model.kind === "bundle" ? offer.id : "");
  const [sel, setSel] = useState<Record<string, Selection>>(() =>
    Object.fromEntries(
      model.offers.map((o) => [prefixOf(o), initialSelection(o, { color: model.color })]),
    ),
  );
  const [state, addAction, adding] = useActionState(addToCart, IDLE);
  const [buyState, buyAction, buying] = useActionState(buyNow, IDLE);

  useEffect(() => {
    if (state.status === "added") trackEvent("merch_add_to_cart", { product: model.slug });
  }, [state, model.slug]);

  // With JS, dispatch explicitly: a function `action` makes React reset the form afterwards,
  // which would uncheck the (controlled) radios behind React's back. Without JS, the form's
  // `action`/`formAction` still post to the same Server Actions.
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending) return;
    const submitter = (e.nativeEvent as SubmitEvent).submitter;
    const data = new FormData(e.currentTarget, submitter);
    startTransition(() => {
      if (submitter instanceof HTMLElement && submitter.dataset.buy !== undefined) buyAction(data);
      else addAction(data);
    });
  };

  const chosen: Record<string, MerchVariant | undefined> = {};
  for (const o of model.offers) chosen[o.id] = matchVariant(o, sel[prefixOf(o)] ?? {});
  const variants = model.offers.map((o) => chosen[o.id]);
  const complete = variants.every(Boolean);
  const soldOut = !model.available || (complete && variants.some((v) => v && !v.available));
  const canBuy = complete && !soldOut;
  // Not disabled while pending: disabling the focused button would drop keyboard focus.
  const disabled = hydrated && !canBuy;
  const pending = adding || buying;

  const single = model.kind === "product" ? variants[0] : undefined;
  const price: Money | undefined =
    model.kind === "bundle" && model.pricing
      ? bundlePrice(model.pricing, model.offers, chosen)
      : (single?.price ?? model.price);
  const compareAt = single ? single.compareAt : model.compareAt;
  const left = variants.reduce<number | undefined>(
    (min, v) => (v?.inStock === undefined ? min : Math.min(min ?? v.inStock, v.inStock)),
    undefined,
  );
  const maxQty = Math.max(1, Math.min(10, left ?? 10));

  const missing = model.offers.flatMap((o) => missingAxes(o, sel[prefixOf(o)] ?? {}));
  const hint = !model.available
    ? "sold out."
    : soldOut
      ? "this option is sold out."
      : !complete
        ? `choose ${[...new Set(missing.map((a) => a.label))].join(" and ")}.`
        : left !== undefined && left <= 5
          ? `only ${left} left.`
          : "";
  const message = buyState.status === "error" ? buyState.message : state.message;

  return (
    <form
      action={addAction}
      onSubmit={onSubmit}
      className="flex flex-col gap-7"
      data-purchase-panel
    >
      <input type="hidden" name="slug" value={model.slug} />

      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        {price && (
          <span className="font-mono text-xl text-bone" data-price>
            {!complete && model.priceVaries && <span className="text-smoke">from </span>}
            {formatMoney(price)}
          </span>
        )}
        {compareAt && (
          <s className="font-mono text-smoke">
            <span className="sr-only">was </span>
            {formatMoney(compareAt)}
          </s>
        )}
      </div>

      {model.offers.map((offer) => {
        const prefix = prefixOf(offer);
        const current = sel[prefix] ?? {};
        return (
          <div key={offer.id} className="flex flex-col gap-5">
            {model.kind === "bundle" && (
              <p className="display-title text-sm text-bone">{offer.name}</p>
            )}
            {model.kind === "bundle" && offer.axes.length === 0 && (
              <p className="mono-label -mt-3">included</p>
            )}
            {offer.axes.map((axis) => {
              const name = fieldName(prefix, axis.key);
              const picked = current[axis.key];
              return (
                <fieldset key={axis.key}>
                  <legend className="mono-label mb-3">
                    {model.kind === "bundle" && <span className="sr-only">{offer.name} </span>}
                    {axis.label}
                    {picked ? <span className="text-bone"> · {picked.toLowerCase()}</span> : null}
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    {axis.values.map((v, i) => {
                      const st = valueState(offer, current, axis.key, v.value);
                      const id = `${uid}-${prefix}-${axis.key}-${i}`;
                      return (
                        <label key={v.value} htmlFor={id}>
                          <input
                            id={id}
                            type="radio"
                            name={name}
                            value={v.value}
                            checked={picked === v.value}
                            disabled={st === "missing"}
                            onChange={() => {
                              setSel((s) => ({
                                ...s,
                                [prefix]: choose(offer, s[prefix] ?? {}, axis.key, v.value),
                              }));
                              if (model.kind === "product" && axis.key === "color") {
                                showColor(v.value);
                              }
                            }}
                            className="peer sr-only"
                          />
                          <span
                            className={`${chip} ${st === "soldout" ? "text-smoke line-through" : ""}`}
                          >
                            {v.swatch && (
                              <span
                                aria-hidden="true"
                                className="size-3 shrink-0 rounded-full border border-bone/30"
                                style={{ background: v.swatch }}
                              />
                            )}
                            {v.value}
                            {st === "soldout" && <span className="sr-only"> (sold out)</span>}
                            {st === "missing" && <span className="sr-only"> (unavailable)</span>}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              );
            })}
          </div>
        );
      })}

      <div className="flex flex-col gap-4">
        <label className="flex items-center gap-4">
          <span className="mono-label">quantity</span>
          <input
            type="number"
            name="quantity"
            min={1}
            max={maxQty}
            defaultValue={1}
            inputMode="numeric"
            className={`${field} w-20`}
          />
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="submit"
            disabled={disabled}
            aria-busy={adding || undefined}
            className={`${buttonPrimary} sm:flex-1`}
          >
            {adding ? "adding…" : "add to cart"}
          </button>
          {model.kind === "product" && (
            <button
              type="submit"
              formAction={buyAction}
              data-buy
              disabled={disabled}
              aria-busy={buying || undefined}
              className={`${buttonGhost} sm:flex-1`}
            >
              {buying ? "opening checkout…" : "buy now"}
            </button>
          )}
        </div>
        <p className="mono-label min-h-5" data-purchase-hint>
          {hint}
        </p>
        <output aria-live="polite" className="mono-label block min-h-5" data-purchase-status>
          {message && (
            <span
              className={
                state.status === "added" && !buyState.message ? "text-bone" : "text-accent"
              }
            >
              {message}
            </span>
          )}
          {state.status === "added" && (
            <>
              {" "}
              <Link
                href="/merch/cart"
                className="text-bone underline underline-offset-4 hover:text-accent"
              >
                view cart
              </Link>
            </>
          )}
        </output>
      </div>
    </form>
  );
}
