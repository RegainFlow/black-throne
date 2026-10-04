import Link from "next/link";
import { Monogram } from "@/components/ui/Monogram";
import type { MerchItem } from "@/lib/merch/types";
import { MerchImg } from "./MerchImg";
import { Price, StockLabel } from "./Price";

export function ProductCard({ item, priority }: { item: MerchItem; priority?: boolean }) {
  const image = item.images[0];
  return (
    <Link href={`/merch/${item.slug}`} className="group flex flex-col gap-3" data-merch-card>
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
