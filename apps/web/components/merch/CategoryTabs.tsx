import Link from "next/link";
import { type MerchQuery, merchHref } from "@/lib/merch/catalogue";
import type { MerchCollection } from "@/lib/merch/types";

/** Fourthwall collections as categories (their native grouping). Search/sort carry over. */
export function CategoryTabs({
  collections,
  active,
  defaultCategory,
  query,
}: {
  collections: MerchCollection[];
  active: string;
  defaultCategory: string;
  query: MerchQuery;
}) {
  if (collections.length === 0) return null;
  const tabs = [{ slug: defaultCategory, name: "all" }, ...collections];
  return (
    <nav aria-label="Categories" className="overflow-x-auto border-b border-bone/10">
      <ul className="flex gap-6 whitespace-nowrap">
        {tabs.map((c) => {
          const current = c.slug === active;
          return (
            <li key={c.slug}>
              <Link
                href={merchHref({
                  q: query.q,
                  sort: query.sort,
                  category: c.slug === defaultCategory ? undefined : c.slug,
                })}
                aria-current={current ? "page" : undefined}
                className={`mono-label inline-block border-b py-3 transition-colors hover:text-bone ${
                  current ? "border-accent text-bone" : "border-transparent"
                }`}
              >
                {c.name.toLowerCase()}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
