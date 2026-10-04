import { describe, expect, it } from "vitest";
import {
  activeFilters,
  facets,
  filterItems,
  isProductSlug,
  merchHref,
  paginate,
  parseQuery,
  sortItems,
} from "./catalogue";
import { bundle, poster, record, soldOutHoodie, tee } from "./fixtures";
import { normalizeItem } from "./model";
import { itemSchema } from "./schema";
import { compareSizes } from "./sizes";
import type { MerchItem } from "./types";

const items = [tee, poster, record, soldOutHoodie, bundle].map(
  (raw) => normalizeItem(itemSchema.parse(raw)) as MerchItem,
);
const names = (list: MerchItem[]) => list.map((i) => i.name);
const q = (params: Record<string, string | string[]>) => parseQuery(params);

describe("query parsing", () => {
  it("defaults cleanly and drops garbage", () => {
    expect(parseQuery({})).toEqual({
      q: "",
      category: undefined,
      sizes: [],
      colors: [],
      inStock: false,
      min: undefined,
      max: undefined,
      sort: "featured",
      page: 1,
    });
    const odd = q({
      q: `  ${"x".repeat(200)} `,
      category: "../carts",
      sort: "drop table",
      page: "-4",
      min: "abc",
      max: "1e9",
      stock: "yes",
    });
    expect(odd.q).toHaveLength(64);
    expect(odd.category).toBeUndefined();
    expect(odd.sort).toBe("featured");
    expect(odd.page).toBe(1);
    expect(odd.min).toBeUndefined();
    expect(odd.max).toBeUndefined();
    expect(odd.inStock).toBe(false);
  });

  it("swaps an inverted price range and caps repeated values", () => {
    const r = q({ min: "50", max: "10", size: Array.from({ length: 30 }, (_, i) => `s${i}`) });
    expect([r.min, r.max]).toEqual([10, 50]);
    expect(r.sizes).toHaveLength(12);
  });

  it("round-trips through URLs and counts active filters", () => {
    const r = q({
      q: "tee",
      size: ["M", "S"],
      color: "Black",
      stock: "in",
      min: "0",
      sort: "newest",
    });
    expect(merchHref(r)).toBe("/merch?q=tee&size=M&size=S&color=Black&stock=in&min=0&sort=newest");
    expect(activeFilters(r)).toBe(5);
    expect(merchHref({})).toBe("/merch");
  });

  it("validates product slugs", () => {
    expect(isProductSlug("crest-tee")).toBe(true);
    for (const bad of ["", "../x", "a/b", "%2e%2e", "x".repeat(200)])
      expect(isProductSlug(bad)).toBe(false);
  });
});

describe("filtering", () => {
  it("searches names, descriptions and options, accent-insensitively", () => {
    expect(names(filterItems(items, q({ q: "crest" })))).toEqual([
      "Crest Tee",
      "Crest Hoodie",
      "Tee and Poster Pack",
    ]);
    expect(names(filterItems(items, q({ q: "SCRÉEN printed" })))).toEqual(["Crest Tee"]);
    expect(names(filterItems(items, q({ q: "matte" })))).toEqual(["Tour Poster"]);
    expect(filterItems(items, q({ q: "nothing-matches" }))).toEqual([]);
  });

  it("filters by size, colour, stock and price", () => {
    expect(names(filterItems(items, q({ size: "xl" })))).toEqual([
      "Crest Tee",
      "Tee and Poster Pack",
    ]);
    expect(names(filterItems(items, q({ color: "bone" })))).toEqual([
      "Crest Tee",
      "Tee and Poster Pack",
    ]);
    expect(names(filterItems(items, q({ stock: "in" })))).not.toContain("Crest Hoodie");
    expect(names(filterItems(items, q({ min: "20", max: "40" })))).toEqual([
      "Crest Tee",
      "Twelve Inch Record",
      "Tee and Poster Pack",
    ]);
  });
});

describe("sorting, facets, paging", () => {
  it("keeps Fourthwall's order but sinks sold-out pieces for 'featured'", () => {
    expect(names(sortItems(items, "featured")).at(-1)).toBe("Crest Hoodie");
  });

  it("sorts by price and by newest", () => {
    expect(names(sortItems(items, "price-asc"))[0]).toBe("Tour Poster");
    expect(names(sortItems(items, "price-desc"))[0]).toBe("Crest Hoodie");
    expect(names(sortItems(items, "newest"))[0]).toBe("Tour Poster");
  });

  it("derives facets in a sensible order", () => {
    const f = facets(items);
    expect(f.sizes).toEqual(["S", "M", "L", "XL"]);
    expect(f.colors.map((c) => c.value)).toEqual(["Black", "Bone"]);
    expect(f.price).toEqual({ min: 15, max: 60, currency: "USD" });
  });

  it("orders apparel, then numeric, then alphabetical sizes", () => {
    expect(["One Size", "10", "XL", "small", "2XL", "8", "M"].sort(compareSizes)).toEqual([
      "small",
      "M",
      "XL",
      "2XL",
      "8",
      "10",
      "One Size",
    ]);
  });

  it("paginates and clamps the page", () => {
    const list = Array.from({ length: 50 }, (_, i) => i);
    expect(paginate(list, 1, 24)).toMatchObject({ page: 1, pages: 3, total: 50 });
    expect(paginate(list, 3, 24).items).toEqual([48, 49]);
    expect(paginate(list, 99, 24).page).toBe(3);
    expect(paginate([], 1).pages).toBe(1);
  });
});
