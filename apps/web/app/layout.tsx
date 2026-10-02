import { getBrandMedia, getSite } from "@black-throne/content";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata, Viewport } from "next";
import { Cinzel, Cormorant_Garamond, IBM_Plex_Mono } from "next/font/google";
import { thresholdScript } from "@/components/threshold/script";
import { gradeCss } from "@/lib/grade-css";
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

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: { default: "BLACK THRONE", template: "%s — BLACK THRONE" },
  description: site.description,
  applicationName: "Black Throne",
  keywords: ["Black Throne", "metal", "DYSTOPIA", "House of Ash", "heavy music"],
  openGraph: {
    type: "website",
    siteName: "BLACK THRONE",
    title: "BLACK THRONE",
    description: site.tagline,
    url: "/",
  },
  twitter: { card: "summary_large_image", title: "BLACK THRONE", description: site.tagline },
  alternates: { canonical: "/" },
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
