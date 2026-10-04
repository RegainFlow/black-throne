import { getSite } from "@black-throne/content";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { CategoryTabs } from "@/components/merch/CategoryTabs";
import { FilterBar } from "@/components/merch/FilterBar";
import { MerchState } from "@/components/merch/MerchState";
import { ProductCard } from "@/components/merch/ProductCard";
import {
  facets,
  filterItems,
  type MerchQuery,
  merchHref,
  paginate,
  parseQuery,
  sortItems,
} from "@/lib/merch/catalogue";
import { merchConfig } from "@/lib/merch/config";
import { getCatalogue, getCollections } from "@/lib/merch/fourthwall";
import { pageMeta } from "@/lib/seo";

const description = "Official Black Throne merch. Checkout, payment and shipping by Fourthwall.";

// Filtered and searched views (?q=, ?color=…) all canonicalise to the plain listing.
export const metadata = pageMeta({
  title: "Merch",
  description,
  path: "/merch",
  ownImage: true, // opengraph-image.tsx
  keywords: [`${getSite().name} merch`, getSite().name, "official merch"],
});

export default async function MerchPage({ searchParams }: PageProps<"/merch">) {
  await connection();
  const query = parseQuery(await searchParams);
  return (
    <>
      <div className="flex flex-col gap-3 pb-8">
        <p className="mono-label">official merch</p>
        <h1 className="display-title text-4xl text-bone md:text-6xl">Merch</h1>
        <p className="font-serif text-lg text-bone/60 italic">{getSite().tagline}</p>
      </div>
      <Suspense key={merchHref(query)} fallback={<GridSkeleton />}>
        <Results query={query} />
      </Suspense>
    </>
  );
}

async function Results({ query }: { query: MerchQuery }) {
  const cfg = merchConfig();
  if (!cfg.ok) {
    return <MerchState kind="unconfigured" action={{ href: "/", label: "enter the world" }} />;
  }
  const home = cfg.config.collection;
  const collections = await getCollections();
  const categories = collections.ok ? collections.value.filter((c) => c.slug !== home) : [];
  const active =
    query.category && categories.some((c) => c.slug === query.category) ? query.category : home;

  const tabs = (
    <CategoryTabs collections={categories} active={active} defaultCategory={home} query={query} />
  );
  const catalogue = await getCatalogue(active);
  if (!catalogue.ok) {
    return (
      <div className="flex flex-col gap-8">
        {tabs}
        <MerchState kind="error" action={{ href: merchHref(query), label: "try again" }} />
      </div>
    );
  }
  if (catalogue.value.length === 0) {
    return (
      <div className="flex flex-col gap-8">
        {tabs}
        <MerchState kind="empty" />
      </div>
    );
  }

  const shown = sortItems(filterItems(catalogue.value, query), query.sort);
  const page = paginate(shown, query.page);
  return (
    <div className="flex flex-col gap-8">
      {tabs}
      <FilterBar query={query} facets={facets(catalogue.value)} defaultCategory={home} />
      <p className="mono-label" aria-live="polite" data-result-count>
        {shown.length} {shown.length === 1 ? "piece" : "pieces"}
      </p>
      {shown.length === 0 ? (
        <MerchState
          kind="no-results"
          action={{
            href: merchHref({ category: active === home ? undefined : active }),
            label: "clear filters",
          }}
        />
      ) : (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 xl:grid-cols-4">
          {page.items.map((item, i) => (
            <li key={item.id} className="min-w-0">
              <ProductCard item={item} priority={i < 4} colors={query.colors} />
            </li>
          ))}
        </ul>
      )}
      {page.pages > 1 && (
        <nav aria-label="Pages" className="flex items-center justify-between gap-4 pt-4">
          {page.page > 1 ? (
            <Link
              href={merchHref({ ...query, page: page.page - 1 })}
              className="mono-label hover:text-bone"
            >
              ← previous
            </Link>
          ) : (
            <span />
          )}
          <span className="mono-label">
            page {page.page} of {page.pages}
          </span>
          {page.page < page.pages ? (
            <Link
              href={merchHref({ ...query, page: page.page + 1 })}
              className="mono-label hover:text-bone"
            >
              next →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}

function GridSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-8">
      <div className="h-11 border-b border-bone/10" />
      <div className="h-24 border border-bone/10 bg-void/40" />
      <ul className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
          <li key={i} className="flex flex-col gap-3">
            <span className="block aspect-[4/5] border border-bone/10 bg-ash/60 motion-safe:animate-pulse" />
            <span className="block h-3 w-3/4 bg-bone/10" />
            <span className="block h-3 w-1/3 bg-bone/10" />
          </li>
        ))}
      </ul>
    </div>
  );
}
