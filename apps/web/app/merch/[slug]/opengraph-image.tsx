import { notFound } from "next/navigation";
import { isProductSlug } from "@/lib/merch/catalogue";
import { getProduct } from "@/lib/merch/fourthwall";
import { formatMoney } from "@/lib/merch/money";
import { ogSize, renderOg } from "@/lib/og";

export const alt = "BLACK THRONE — merch";
export const size = ogSize;
export const contentType = "image/png";

/**
 * Text-only share card for a product, rendered at request time (no generateStaticParams, so
 * the build never calls Fourthwall). Remote images aren't decoded: Satori can't read WebP/AVIF.
 */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isProductSlug(slug)) notFound();
  const res = await getProduct(slug);
  if (res.ok && !res.value) notFound();
  const item = res.ok ? res.value : null;
  return renderOg({
    title: item ? item.name.toUpperCase() : "MERCH",
    kicker: item?.kind === "bundle" ? "MERCH · BUNDLE" : "MERCH",
    line: item ? `${item.priceVaries ? "from " : ""}${formatMoney(item.price)}` : "official store",
    grade: "ii",
  });
}
