import { fold } from "./catalogue";
import type { MerchImage, MerchItem } from "./types";

/** The photos to show for one colour (or for the whole item when it has no colour choice). */
export interface ImageSet {
  color?: string;
  images: MerchImage[];
}

/**
 * Product photos grouped by colour. Fourthwall attaches each colour's mockups to that colour's
 * variants, so a colour's set is its variants' images (in the product's own order) plus any
 * product photo no variant claims (shared shots). A colour without photos of its own shows
 * everything. Bundles and colourless products get a single set.
 */
export function imageSets(item: MerchItem): ImageSet[] {
  const axis = item.kind === "product" ? item.offer.axes.find((a) => a.key === "color") : undefined;
  if (item.kind !== "product" || !axis) return [{ images: item.images }];

  const byColor = new Map<string, MerchImage[]>();
  const claimed = new Set<string>();
  for (const v of item.offer.variants) {
    const color = v.options.color;
    if (!color) continue;
    const own = byColor.get(color) ?? [];
    for (const img of v.images) {
      claimed.add(img.original);
      if (!own.some((i) => i.original === img.original)) own.push(img);
    }
    byColor.set(color, own);
  }

  const listed = new Set(item.images.map((i) => i.original));
  const shared = item.images.filter((i) => !claimed.has(i.original));
  return axis.values.map(({ value }) => {
    const own = byColor.get(value) ?? [];
    if (own.length === 0) return { color: value, images: item.images };
    const mine = new Set(own.map((i) => i.original));
    return {
      color: value,
      images: [
        ...item.images.filter((i) => mine.has(i.original)),
        ...own.filter((i) => !listed.has(i.original)),
        ...shared,
      ],
    };
  });
}

/** The set for a colour named loosely (`?color=bone` matches "Bone"), if there is one. */
export function findSet(sets: ImageSet[], color: string | null | undefined): ImageSet | undefined {
  if (!color) return undefined;
  const want = fold(color);
  return sets.find((s) => s.color !== undefined && fold(s.color) === want);
}
