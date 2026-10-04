import { getSite } from "@black-throne/content";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MerchHeader } from "@/components/merch/MerchHeader";
import { StaticBackdrop } from "@/components/world/StaticBackdrop";
import { COUNT_COOKIE } from "@/lib/merch/cookies";

/**
 * The merch store: a lean page outside the (world) group (no WebGL/GSAP/Lenis/threshold).
 * Every merch route renders per request: reading cookies here guarantees `next build` never
 * calls Fourthwall, so live product data can't end up in the build or break a deploy.
 */
export default async function MerchLayout({ children }: LayoutProps<"/merch">) {
  if (!getSite().merch.enabled) notFound();
  const raw = Number.parseInt((await cookies()).get(COUNT_COOKIE)?.value ?? "0", 10);
  const count = Number.isInteger(raw) && raw > 0 ? Math.min(raw, 999) : 0;

  return (
    <>
      <StaticBackdrop />
      <div className="relative z-10 flex min-h-svh flex-col">
        <MerchHeader count={count} />
        <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-gutter pt-10 pb-24">
          {children}
        </main>
        <footer className="border-t border-bone/10">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-gutter py-6">
            <p className="mono-label">checkout, payment &amp; shipping by fourthwall</p>
            <Link href="/" className="mono-label transition-colors hover:text-bone">
              enter the world →
            </Link>
          </div>
        </footer>
      </div>
    </>
  );
}
