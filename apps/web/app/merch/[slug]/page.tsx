import { getSite } from "@black-throne/content";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Gallery } from "@/components/merch/Gallery";
import { MerchImg } from "@/components/merch/MerchImg";
import { MerchState } from "@/components/merch/MerchState";
import { type PurchaseModel, PurchasePanel } from "@/components/merch/PurchasePanel";
import { ldScript, productLd } from "@/lib/jsonld";
import { isProductSlug } from "@/lib/merch/catalogue";
import { getProduct } from "@/lib/merch/fourthwall";
import { findSet, imageSets } from "@/lib/merch/gallery";
import { RichText } from "@/lib/merch/rich-text";
import type { MerchItem, MerchOffer } from "@/lib/merch/types";
import { siteUrl } from "@/lib/site-url";

export async function generateMetadata({ params }: PageProps<"/merch/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  if (!isProductSlug(slug)) return {};
  const res = await getProduct(slug);
  if (!res.ok || !res.value) return { title: "Merch" };
  const item = res.value;
  const description = (item.text || `${item.name} — official Black Throne merch.`).slice(0, 160);
  const title = `${item.name} — BLACK THRONE`;
  return {
    title: item.name,
    description,
    alternates: { canonical: `/merch/${item.slug}` },
    openGraph: {
      type: "website",
      siteName: "BLACK THRONE",
      title,
      description,
      url: `/merch/${item.slug}`,
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

/** Variant images aren't needed client-side; keep the purchase panel's props small. */
const lean = (offer: MerchOffer): MerchOffer => ({
  ...offer,
  variants: offer.variants.map((v) => ({ ...v, images: [] })),
});

function purchaseModel(item: MerchItem, color?: string): PurchaseModel {
  return {
    slug: item.slug,
    kind: item.kind,
    offers: item.kind === "product" ? [lean(item.offer)] : item.offers.map(lean),
    pricing: item.kind === "bundle" ? item.pricing : undefined,
    price: item.price,
    compareAt: item.compareAt,
    priceVaries: item.priceVaries,
    available: item.available,
    color,
  };
}

export default async function ProductPage({ params, searchParams }: PageProps<"/merch/[slug]">) {
  await connection();
  const { slug } = await params;
  if (!isProductSlug(slug)) notFound();
  // Resolved before anything can suspend or stream, so unknown/hidden products are a real 404.
  const res = await getProduct(slug);
  if (!res.ok) {
    return res.error.kind === "unconfigured" ? (
      <MerchState kind="unconfigured" action={{ href: "/", label: "enter the world" }} />
    ) : (
      <MerchState kind="error" action={{ href: `/merch/${slug}`, label: "try again" }} />
    );
  }
  const item = res.value;
  if (!item) notFound();
  const site = getSite();
  // `?color=` (from a colour pick or a filtered listing) picks the photos and the preselected
  // colour together; anything that isn't one of this product's colours is ignored.
  const sets = imageSets(item);
  const requested = (await searchParams).color;
  const color = findSet(sets, Array.isArray(requested) ? requested[0] : requested)?.color;

  return (
    <>
      <nav aria-label="Breadcrumb" className="mono-label pb-8">
        <Link href="/merch" className="hover:text-bone">
          merch
        </Link>
        <span aria-hidden="true"> / </span>
        <span aria-current="page" className="text-bone/80">
          {item.name.toLowerCase()}
        </span>
      </nav>
      <div className="grid gap-10 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:gap-16">
        <div className="min-w-0">
          <Gallery sets={sets} name={item.name} />
        </div>
        <div className="flex min-w-0 flex-col gap-8 md:sticky md:top-8 md:self-start">
          <div className="flex flex-col gap-3">
            <p className="mono-label">{item.kind === "bundle" ? "bundle" : "official merch"}</p>
            <h1 className="display-title text-3xl leading-tight text-bone [overflow-wrap:anywhere] md:text-5xl">
              {item.name}
            </h1>
          </div>
          <PurchasePanel model={purchaseModel(item, color)} />
          {item.kind === "bundle" && (
            <div className="flex flex-col gap-2 border-t border-bone/10 pt-6">
              <p className="mono-label">includes</p>
              <ul className="flex flex-col gap-1 font-serif text-lg text-bone/80">
                {item.offers.map((o) => (
                  <li key={o.id}>{o.name}</li>
                ))}
              </ul>
            </div>
          )}
          <RichText html={item.descriptionHtml} className="bt-prose" />
          <div className="flex flex-col">
            {item.details.map((d) => (
              <details key={`${d.type}-${d.title}`} className="group border-t border-bone/10">
                <summary className="mono-label flex cursor-pointer list-none items-center justify-between py-4 hover:text-bone [&::-webkit-details-marker]:hidden">
                  {d.title.toLowerCase()}
                  <span aria-hidden="true" className="transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <RichText html={d.html} className="bt-prose pb-6" />
              </details>
            ))}
            {item.kind === "product" && item.sizeGuide && (
              <details className="group border-t border-bone/10">
                <summary className="mono-label flex cursor-pointer list-none items-center justify-between py-4 hover:text-bone [&::-webkit-details-marker]:hidden">
                  size guide
                  <span aria-hidden="true" className="transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <div className="flex flex-col gap-4 pb-6">
                  {item.sizeGuide.description && (
                    <RichText html={item.sizeGuide.description} className="bt-prose" />
                  )}
                  {item.sizeGuide.previewUrl && (
                    <MerchImg
                      image={{
                        src: item.sizeGuide.previewUrl,
                        original: item.sizeGuide.previewUrl,
                        width: 1200,
                        height: 900,
                      }}
                      alt={`${item.name} size guide`}
                      className="h-auto w-full border border-bone/10"
                    />
                  )}
                  {item.sizeGuide.fileUrl && (
                    <a
                      href={item.sizeGuide.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mono-label text-bone hover:text-accent"
                    >
                      open the full size guide ↗
                    </a>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      </div>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD built from parsed fields, `<` escaped
        dangerouslySetInnerHTML={{ __html: ldScript(productLd(item, site, siteUrl())) }}
      />
    </>
  );
}
