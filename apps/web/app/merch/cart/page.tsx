import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { CartLineRow } from "@/components/merch/CartLineRow";
import { CheckoutLink } from "@/components/merch/CheckoutLink";
import { MerchState } from "@/components/merch/MerchState";
import { ReconcileCart } from "@/components/merch/ReconcileCart";
import { cartCount, cartLines, subtotal } from "@/lib/merch/cart";
import { cartCheckoutUrl, isCartId, parseAttribution } from "@/lib/merch/checkout";
import { merchConfig } from "@/lib/merch/config";
import { ATTR_COOKIE, CART_COOKIE, COUNT_COOKIE } from "@/lib/merch/cookies";
import { cartErrorMessage, toCartErrorCode } from "@/lib/merch/errors";
import { cartGet, getCatalogue } from "@/lib/merch/fourthwall";
import { formatMoney } from "@/lib/merch/money";

export const metadata: Metadata = {
  title: "Cart",
  alternates: { canonical: "/merch/cart" },
  robots: { index: false, follow: false },
};

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function CartPage({ searchParams }: PageProps<"/merch/cart">) {
  await connection();
  const sp = await searchParams;
  const error = first(sp.error);
  const left = Number.parseInt(first(sp.left) ?? "", 10);
  return (
    <>
      <div className="flex flex-col gap-3 pb-8">
        <Link href="/merch" className="mono-label hover:text-bone">
          ← continue shopping
        </Link>
        <h1 className="display-title text-4xl text-bone md:text-5xl">Cart</h1>
      </div>
      {error && (
        <p
          role="alert"
          data-cart-error
          className="mb-6 border border-accent/50 bg-accent/10 px-4 py-3 font-mono text-sm text-bone"
        >
          {cartErrorMessage(
            toCartErrorCode(error),
            Number.isInteger(left) && left >= 0 ? left : undefined,
          )}
        </p>
      )}
      <Suspense fallback={<CartSkeleton />}>
        <CartContents />
      </Suspense>
    </>
  );
}

async function CartContents() {
  const cfg = merchConfig();
  if (!cfg.ok) {
    return <MerchState kind="unconfigured" action={{ href: "/", label: "enter the world" }} />;
  }
  const jar = await cookies();
  const cartId = jar.get(CART_COOKIE)?.value;
  const counted = jar.get(COUNT_COOKIE)?.value;
  const empty = <MerchState kind="cart-empty" action={{ href: "/merch", label: "browse merch" }} />;
  if (!isCartId(cartId)) {
    return (
      <>
        {(cartId || counted) && <ReconcileCart />}
        {empty}
      </>
    );
  }

  const res = await cartGet(cartId);
  if (!res.ok) {
    return <MerchState kind="error" action={{ href: "/merch/cart", label: "try again" }} />;
  }
  // Fourthwall no longer knows this cart (expired or checked out): forget it.
  if (!res.value || res.value.items.length === 0) {
    return (
      <>
        <ReconcileCart />
        {empty}
      </>
    );
  }

  // Bundle names/pricing and fallback images come from the (cached) catalogue; the cart only
  // has the parts. If the catalogue is unavailable the cart still renders, with estimates.
  const catalogue = await getCatalogue(cfg.config.collection);
  const lines = cartLines(res.value, catalogue.ok ? catalogue.value : []);
  if (lines.length === 0) return empty;

  const total = subtotal(lines);
  const stale = counted !== String(cartCount(lines));
  const estimated = lines.some((l) => l.estimate);
  const checkout = cartCheckoutUrl({
    shopDomain: cfg.config.shopDomain,
    cartId: res.value.id,
    attribution: parseAttribution(jar.get(ATTR_COOKIE)?.value),
  });

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
      {stale && <ReconcileCart />}
      <ul aria-label="Items in your cart" className="border-t border-bone/10">
        {lines.map((line) => (
          <CartLineRow key={line.key} line={line} />
        ))}
      </ul>
      <aside
        aria-label="Order summary"
        className="flex flex-col gap-5 border border-bone/15 bg-void/80 p-5 lg:sticky lg:top-8"
      >
        <div className="flex items-baseline justify-between gap-4">
          <span className="mono-label">subtotal{estimated ? " (est.)" : ""}</span>
          {total && (
            <span className="font-mono text-lg text-bone" data-subtotal>
              {formatMoney(total)}
            </span>
          )}
        </div>
        <p className="mono-label">taxes, shipping &amp; discounts are calculated at checkout.</p>
        {checkout ? (
          <CheckoutLink href={checkout} items={cartCount(lines)} />
        ) : (
          <p className="mono-label text-accent">checkout is unavailable right now.</p>
        )}
        <p className="mono-label">secure checkout by fourthwall</p>
      </aside>
    </div>
  );
}

function CartSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-4">
      {[0, 1].map((i) => (
        <div key={i} className="h-28 border border-bone/10 bg-ash/40 motion-safe:animate-pulse" />
      ))}
    </div>
  );
}
