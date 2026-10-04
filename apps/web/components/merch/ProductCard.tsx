import Link from "next/link";
import { Monogram } from "@/components/ui/Monogram";
import { findSet, imageSets } from "@/lib/merch/gallery";
import type { MerchItem } from "@/lib/merch/types";
import { MerchImg } from "./MerchImg";
import { Price, StockLabel } from "./Price";

/**
 * A product in the grid. While the listing is filtered by colour, the card shows that colour's
 * photo and opens the product on it (`?color=`), so the filter carries through.
 */
export function ProductCard({
  item,
  priority,
  colors = [],
}: {
  item: MerchItem;
  priority?: boolean;
  /** The colour filter in effect, if any. */
  colors?: string[];
}) {
  const sets = colors.length ? imageSets(item) : [];
  const match = colors.map((c) => findSet(sets, c)).find(Boolean);
  const image = match?.images[0] ?? item.images[0];
  const href = match?.color
    ? `/merch/${item.slug}?color=${encodeURIComponent(match.color)}`
    : `/merch/${item.slug}`;
  return (
    <Link href={href} className="group flex flex-col gap-3" data-merch-card>
      <span className="relative block aspect-[4/5] overflow-hidden border border-bone/10 bg-ash transition-colors duration-500 group-hover:border-accent/60">
        {image ? (
          <MerchImg
            image={image}
            alt=""
            priority={priority}
            className={`h-full w-full object-cover transition-[filter] duration-700 ${item.available ? "" : "grayscale"}`}
          />
        ) : (
          <span className="flex h-full items-center justify-center">
            <Monogram className="h-16 text-bone/20" />
          </span>
        )}
        {item.kind === "bundle" && (
          <span className="mono-label absolute top-2 left-2 bg-void/85 px-2 py-1 text-bone">
            bundle
          </span>
        )}
      </span>
      <span className="flex flex-col gap-1.5">
        <span className="display-title text-xs leading-snug text-bone [overflow-wrap:anywhere] sm:text-sm">
          {item.name}
        </span>
        <Price
          price={item.price}
          compareAt={item.compareAt}
          from={item.priceVaries}
          className="text-xs sm:text-sm"
        />
        <StockLabel available={item.available} lowStock={item.lowStock} />
      </span>
    </Link>
  );
}
