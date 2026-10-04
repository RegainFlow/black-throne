import Form from "next/form";
import Link from "next/link";
import { activeFilters, type Facets, type MerchQuery, merchHref } from "@/lib/merch/catalogue";
import { buttonGhost, chip, field } from "./styles";

const SORT_LABELS: Record<MerchQuery["sort"], string> = {
  featured: "featured",
  "price-asc": "price: low to high",
  "price-desc": "price: high to low",
  newest: "newest",
};

/**
 * Search, sort and filters as one GET form (next/form): works without JavaScript, every state
 * is a shareable URL, and the server does the filtering (Fourthwall has no search API).
 */
export function FilterBar({
  query,
  facets,
  defaultCategory,
}: {
  query: MerchQuery;
  facets: Facets;
  defaultCategory: string;
}) {
  const count = activeFilters(query);
  const category = query.category && query.category !== defaultCategory ? query.category : "";
  return (
    <Form action="/merch" aria-label="Search and filter merch" className="flex flex-col gap-4">
      {category && <input type="hidden" name="category" value={category} />}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex min-w-0 flex-1 flex-col gap-2">
          <span className="mono-label">search</span>
          <input
            type="search"
            name="q"
            defaultValue={query.q}
            maxLength={64}
            placeholder="shirts, vinyl, posters…"
            className={field}
          />
        </label>
        <label className="flex flex-col gap-2 sm:w-56">
          <span className="mono-label">sort</span>
          <select name="sort" defaultValue={query.sort} className={field}>
            {Object.entries(SORT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className={buttonGhost}>
          apply
        </button>
      </div>

      <details open={count > 0} className="group border border-bone/10 bg-void/60">
        <summary className="mono-label flex cursor-pointer list-none items-center justify-between px-4 py-3 hover:text-bone [&::-webkit-details-marker]:hidden">
          <span>filter{count > 0 ? ` · ${count}` : ""}</span>
          <span aria-hidden="true" className="transition-transform group-open:rotate-45">
            +
          </span>
        </summary>
        <div className="grid gap-6 px-4 pt-2 pb-5 sm:grid-cols-2 lg:grid-cols-4">
          {facets.sizes.length > 0 && (
            <fieldset className="flex flex-col gap-3">
              <legend className="mono-label mb-3">size</legend>
              <div className="flex flex-wrap gap-2">
                {facets.sizes.map((s) => (
                  <label key={s}>
                    <input
                      type="checkbox"
                      name="size"
                      value={s}
                      defaultChecked={query.sizes.includes(s)}
                      className="peer sr-only"
                    />
                    <span className={chip}>{s}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          {facets.colors.length > 0 && (
            <fieldset className="flex flex-col gap-3">
              <legend className="mono-label mb-3">color</legend>
              <div className="flex flex-wrap gap-2">
                {facets.colors.map((c) => (
                  <label key={c.value}>
                    <input
                      type="checkbox"
                      name="color"
                      value={c.value}
                      defaultChecked={query.colors.includes(c.value)}
                      className="peer sr-only"
                    />
                    <span className={chip}>
                      {c.swatch && (
                        <span
                          aria-hidden="true"
                          className="size-3 shrink-0 rounded-full border border-bone/30"
                          style={{ background: c.swatch }}
                        />
                      )}
                      {c.value}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <fieldset className="flex flex-col gap-3">
            <legend className="mono-label mb-3">availability</legend>
            <label>
              <input
                type="checkbox"
                name="stock"
                value="in"
                defaultChecked={query.inStock}
                className="peer sr-only"
              />
              <span className={chip}>in stock only</span>
            </label>
          </fieldset>
          {facets.price && (
            <fieldset className="flex flex-col gap-3">
              <legend className="mono-label mb-3">
                price ({facets.price.currency.toLowerCase()})
              </legend>
              <div className="flex items-center gap-2">
                <label className="min-w-0 flex-1">
                  <span className="sr-only">minimum price</span>
                  <input
                    type="number"
                    name="min"
                    min={0}
                    step={1}
                    inputMode="decimal"
                    defaultValue={query.min}
                    placeholder={String(facets.price.min)}
                    className={field}
                  />
                </label>
                <span aria-hidden="true" className="text-smoke">
                  –
                </span>
                <label className="min-w-0 flex-1">
                  <span className="sr-only">maximum price</span>
                  <input
                    type="number"
                    name="max"
                    min={0}
                    step={1}
                    inputMode="decimal"
                    defaultValue={query.max}
                    placeholder={String(facets.price.max)}
                    className={field}
                  />
                </label>
              </div>
            </fieldset>
          )}
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-bone/10 px-4 py-3">
          <Link
            href={merchHref({ category: category || undefined })}
            className="mono-label hover:text-bone"
          >
            clear all
          </Link>
          <button type="submit" className={buttonGhost}>
            apply filters
          </button>
        </div>
      </details>
    </Form>
  );
}
