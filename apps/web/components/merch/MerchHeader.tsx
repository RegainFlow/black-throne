import Link from "next/link";
import { Monogram } from "@/components/ui/Monogram";

/** Slim lean-page header: home, shop, cart (count from a cookie — no upstream call). */
export function MerchHeader({ count }: { count: number }) {
  return (
    <header className="border-b border-bone/10">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-gutter py-4">
        <Link
          href="/"
          aria-label="Black Throne — enter the site"
          className="flex items-center gap-3 text-bone"
        >
          <Monogram className="h-9" />
          <span className="type-wordmark hidden pl-[0.28em] text-sm tracking-[0.28em] sm:inline">
            Black Throne
          </span>
        </Link>
        <nav aria-label="Merch" className="flex items-center gap-6">
          <Link href="/merch" className="mono-label transition-colors hover:text-bone">
            shop
          </Link>
          <Link
            href="/merch/cart"
            aria-label={`Cart, ${count} ${count === 1 ? "item" : "items"}`}
            className="mono-label flex items-center gap-2 transition-colors hover:text-bone"
          >
            cart
            <span
              data-cart-count
              className="inline-flex min-w-6 items-center justify-center border border-bone/25 px-1.5 py-0.5 text-bone"
            >
              {count}
            </span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
