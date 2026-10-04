import { getBrandMedia, getReleases, getSite } from "@black-throne/content";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata, Viewport } from "next";
import { Cinzel, Cormorant_Garamond, IBM_Plex_Mono } from "next/font/google";
import { thresholdScript } from "@/components/threshold/script";
import { gradeCss } from "@/lib/grade-css";
import { SITE_NAME } from "@/lib/seo";
import { siteUrl } from "@/lib/site-url";
import "./globals.css";

const cinzel = Cinzel({ subsets: ["latin"], variable: "--font-cinzel", display: "swap" });
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
  preload: false,
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-plex-mono",
  display: "swap",
});

const site = getSite();

// Site-wide defaults only. Canonical, og:url and share titles are per page (lib/seo.ts →
// pageMeta): metadata merges shallowly, so anything set here would leak into every route.
export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: { default: SITE_NAME, template: `%s — ${SITE_NAME}` },
  description: site.description,
  applicationName: site.name,
  authors: [{ name: site.name, url: "/" }],
  creator: site.name,
  publisher: site.name,
  keywords: [
    site.name,
    ...site.profile.alternateNames,
    ...site.profile.genres.map((g) => g.toLowerCase()),
    ...getReleases().map((r) => r.title),
  ],
  category: "music",
  // Track times, dates and prices are not phone numbers or addresses (iOS auto-links them).
  formatDetection: { telephone: false, email: false, address: false },
  appleWebApp: { title: site.name, statusBarStyle: "black-translucent" },
  // Large image previews and full snippets in Google/Discover. Indexing stays the default, so
  // per-page `noindex` (the cart, 404s) is never contradicted.
  robots: {
    googleBot: { "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
};

export const viewport: Viewport = {
  themeColor: "#070505",
  colorScheme: "dark",
};

/**
 * Root layout: document, fonts, grade tokens and the pre-paint threshold script only.
 * The cinematic world (WebGL, GSAP, Lenis, threshold, cursor, overlay) lives in the
 * (world) group layout, so /links stays a lean, near-static page.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-grade="ii"
      suppressHydrationWarning
      className={`${cinzel.variable} ${cormorant.variable} ${plexMono.variable}`}
    >
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: static, first-party pre-paint script */}
        <script dangerouslySetInnerHTML={{ __html: thresholdScript }} />
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: grade tokens generated from packages/content */}
        <style dangerouslySetInnerHTML={{ __html: gradeCss(getBrandMedia()) }} />
      </head>
      <body>
        <a
          href="#main"
          className="mono-label fixed top-3 left-3 z-[100] -translate-y-20 bg-void px-3 py-2 text-bone focus:translate-y-0"
        >
          skip to content
        </a>
        {children}
        {process.env.VERCEL && (
          <>
            <Analytics />
            <SpeedInsights />
          </>
        )}
      </body>
    </html>
  );
}
