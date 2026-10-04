import Link from "next/link";
import { updateLine } from "@/app/merch/actions";
import { Monogram } from "@/components/ui/Monogram";
import type { CartLine } from "@/lib/merch/cart";
import { MAX_QTY } from "@/lib/merch/checkout";
import { formatMoney } from "@/lib/merch/money";
import { MerchImg } from "./MerchImg";

const stepper =
  "flex size-10 items-center justify-center border border-bone/20 font-mono text-bone transition-colors hover:border-accent disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-bone/20";

/** One cart line. Plain forms posting to a Server Action, so they work without JavaScript. */
export function CartLineRow({ line }: { line: CartLine }) {
  const title = line.title.toLowerCase();
  return (
    <li
      data-cart-line={line.kind}
      className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-x-4 gap-y-4 border-b border-bone/10 py-6 sm:grid-cols-[6rem_minmax(0,1fr)_auto]"
    >
      <span className="block aspect-[4/5] overflow-hidden border border-bone/10 bg-ash">
        {line.image ? (
          <MerchImg image={line.image} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full items-center justify-center">
            <Monogram className="h-8 text-bone/20" />
          </span>
        )}
      </span>
      <div className="flex min-w-0 flex-col gap-2">
        {line.kind === "bundle" && <span className="mono-label text-accent">bundle</span>}
        {line.slug ? (
          <Link
            href={`/merch/${line.slug}`}
            className="display-title text-sm leading-snug text-bone [overflow-wrap:anywhere] hover:text-accent"
          >
            {line.title}
          </Link>
        ) : (
          <span className="display-title text-sm leading-snug text-bone">{line.title}</span>
        )}
        <ul className="flex flex-col gap-1">
          {line.details.map((d) => (
            <li key={d} className="mono-label [overflow-wrap:anywhere]">
              {d}
            </li>
          ))}
        </ul>
        {line.unit && (
          <span className="font-mono text-sm text-smoke">
            {formatMoney(line.unit)} each{line.estimate ? " (est.)" : ""}
          </span>
        )}
      </div>
      <div className="col-span-2 flex items-center justify-between gap-4 sm:col-span-1 sm:flex-col sm:items-end sm:justify-start">
        <form action={updateLine} className="flex items-center">
          <input type="hidden" name="key" value={line.key} />
          <button
            type="submit"
            name="quantity"
            value={line.quantity - 1}
            disabled={line.quantity <= 1}
            aria-label={`Decrease quantity of ${title}`}
            className={stepper}
          >
            −
          </button>
          <output
            aria-label={`Quantity of ${title}`}
            className="flex h-10 w-12 items-center justify-center border-y border-bone/20 font-mono text-bone"
            data-qty
          >
            {line.quantity}
          </output>
          <button
            type="submit"
            name="quantity"
            value={line.quantity + 1}
            disabled={line.quantity >= MAX_QTY}
            aria-label={`Increase quantity of ${title}`}
            className={stepper}
          >
            +
          </button>
        </form>
        <div className="flex items-center gap-5">
          {line.total && (
            <span className="font-mono text-bone" data-line-total>
              {formatMoney(line.total)}
            </span>
          )}
          <form action={updateLine}>
            <input type="hidden" name="key" value={line.key} />
            <button
              type="submit"
              name="quantity"
              value={0}
              aria-label={`Remove ${title}`}
              className="mono-label underline-offset-4 hover:text-accent hover:underline"
            >
              remove
            </button>
          </form>
        </div>
      </div>
    </li>
  );
}
