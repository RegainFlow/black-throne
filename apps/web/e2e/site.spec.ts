import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

/** Upcoming terms come from the gitignored denylist at runtime — never written into this file. */
function sealedTerms(): string[] {
  const file = join(__dirname, "../../../sealed.local.json");
  const fromEnv = (process.env.SEALED_TERMS ?? "").split(/[,\n]/);
  const fromFile = existsSync(file)
    ? (JSON.parse(readFileSync(file, "utf8")).terms as string[])
    : [];
  // Same floor as scripts/verify-sealed.mjs: shorter terms match too much to mean anything.
  return [...fromFile, ...fromEnv].map((t) => t.trim()).filter((t) => t.length >= 4);
}

const sealedSlugs = () => sealedTerms().filter((t) => /^[a-z0-9]+(-[a-z0-9]+)+$/.test(t));

const PAGES = [
  "/",
  "/links",
  "/about",
  "/chapters/dystopia",
  "/chapters/house-of-ash",
  // merch (served from the Fourthwall mock, see playwright.config.ts)
  "/merch",
  "/merch/crest-tee",
  "/merch/tee-and-poster-pack",
  "/merch/cart",
];

test.describe("first paint", () => {
  test("wordmark is visible without JavaScript and no threshold blocks it", async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/black/i);
    await expect(page.locator("html")).not.toHaveAttribute("data-threshold", /.*/);
    await expect(page.locator("[data-threshold-root]")).toBeHidden();
    await ctx.close();
  });

  test("threshold shows once, and Escape enters the world", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-threshold", "");
    await expect(page.getByRole("dialog", { name: /enter the world/i })).toBeVisible();
    await page.waitForTimeout(500);
    await page.keyboard.press("Escape");
    await expect(page.locator("html")).not.toHaveAttribute("data-threshold", /.*/, {
      timeout: 8_000,
    });
    await page.reload();
    await expect(page.locator("html")).not.toHaveAttribute("data-threshold", /.*/);
  });

  test("threshold never appears with reduced motion", async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: "reduce" });
    const page = await ctx.newPage();
    await page.goto("/");
    await expect(page.locator("html")).not.toHaveAttribute("data-threshold", /.*/);
    await expect(page.locator("[data-threshold-root]")).toBeHidden();
    await ctx.close();
  });

  test("the lean pages (link-in-bio, about) skip the threshold", async ({ page }) => {
    for (const path of ["/links", "/about"]) {
      await page.goto(path);
      await expect(page.locator("html"), path).not.toHaveAttribute("data-threshold", /.*/);
    }
  });

  test("the merch pages skip the threshold and can scroll", async ({ page }) => {
    for (const path of ["/merch", "/merch/crest-tee"]) {
      await page.goto(path);
      await expect(page.locator("html")).not.toHaveAttribute("data-threshold", /.*/);
      await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
    }
  });
});

test.describe("routes", () => {
  for (const path of PAGES) {
    test(`${path} responds 200`, async ({ request }) => {
      expect((await request.get(path)).status()).toBe(200);
    });
  }

  test("unknown chapters are 404", async ({ request }) => {
    expect((await request.get("/chapters/does-not-exist")).status()).toBe(404);
  });

  test("sealed slugs are 404 and absent from the sitemap", async ({ request }) => {
    const slugs = sealedSlugs();
    test.skip(slugs.length === 0, "no local denylist");
    const sitemap = await (await request.get("/sitemap.xml")).text();
    for (const slug of slugs) {
      expect((await request.get(`/chapters/${slug}`)).status(), slug).toBe(404);
      expect(sitemap.includes(slug), slug).toBe(false);
    }
  });
});

test.describe("content", () => {
  test("links page lists every real platform and hides placeholders", async ({ page }) => {
    await page.goto("/links");
    for (const name of ["Spotify", "Instagram", "TikTok"]) {
      await expect(page.getByRole("link", { name: new RegExp(name, "i") }).first()).toBeVisible();
    }
    await expect(page.getByRole("link", { name: /instagram/i }).first()).toHaveAttribute(
      "href",
      "https://www.instagram.com/theblackthrone.official/",
    );
    await expect(page.locator('a[href="https://www.youtube.com/"]')).toHaveCount(0);
    await expect(page.getByRole("link", { name: /enter the world/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /^merch/i })).toHaveAttribute("href", "/merch");
  });

  test("merch is in the sitemap; product pages are not", async ({ request }) => {
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toMatch(/\/merch<\/loc>/);
    expect(sitemap).not.toContain("/merch/");
  });

  test("home carries MusicGroup JSON-LD and a share image", async ({ page }) => {
    await page.goto("/");
    const ld = await page.locator('script[type="application/ld+json"]').first().textContent();
    expect(JSON.parse(ld ?? "{}")["@type"]).toBe("MusicGroup");
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      /opengraph-image/,
    );
  });

  // What Facebook, X, iMessage and Discord read when a link is shared. Every page needs all of it.
  for (const path of PAGES.filter((p) => p !== "/merch/cart")) {
    test(`${path} has a working share card`, async ({ page, request }) => {
      await page.goto(path);
      const meta = (key: string) =>
        page
          .locator(`meta[property="${key}"], meta[name="${key}"]`)
          .first()
          .getAttribute("content");
      const image = await meta("og:image");
      const url = await meta("og:url");
      expect(image, "og:image").toMatch(/^https?:\/\//);
      expect(await meta("twitter:image"), "twitter:image").toBe(image);
      expect(await meta("twitter:card")).toBe("summary_large_image");
      expect(await meta("og:title")).toBeTruthy();
      expect(await meta("og:description")).toBeTruthy();
      expect(await meta("description"), "meta description").toBeTruthy();
      expect(await meta("og:site_name")).toBe("BLACK THRONE");
      expect(await meta("og:locale")).toBe("en_US");
      await expect(page).toHaveTitle(/BLACK THRONE/);
      expect(url, "og:url is the canonical").toBe(
        await page.locator('link[rel="canonical"]').getAttribute("href"),
      );
      expect(new URL(url as string).pathname, "the canonical is the page itself").toBe(path);
      if (path.startsWith("/chapters/")) expect(image).toContain(`${path}/opengraph-image`);

      const { pathname, search } = new URL(image as string);
      const res = await request.get(pathname + search);
      expect(res.status(), image as string).toBe(200);
      expect(res.headers()["content-type"]).toBe("image/png");
    });
  }

  test("every page has its own title, and the cart stays out of search", async ({ page }) => {
    const titles = new Map<string, string>();
    for (const path of PAGES) {
      await page.goto(path);
      const title = await page.title();
      expect(titles.has(title), `${path} repeats the title of ${titles.get(title)}`).toBe(false);
      titles.set(title, path);
    }
    await page.goto("/merch/cart");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });

  test("sealed slots reveal nothing but 'not yet'", async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: "reduce" });
    const page = await ctx.newPage();
    await page.goto("/");
    const slots = page.getByRole("button", { name: /not yet revealed/i });
    expect(await slots.count()).toBeGreaterThan(0);
    await ctx.close();
  });
});

test.describe("search and answer engines", () => {
  const RELEASES = ["dystopia", "house-of-ash"];

  test("robots.txt lets every crawler in, keeps the cart out, and points at the sitemap", async ({
    request,
  }) => {
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toMatch(/User-Agent: \*/i);
    expect(robots).toMatch(/^Allow: \/$/m);
    expect(robots).toMatch(/^Disallow: \/merch\/cart$/m);
    expect(robots).toMatch(/^Sitemap: https?:\/\/\S+\/sitemap\.xml$/m);
  });

  test("the sitemap lists about and every chapter, with cover images", async ({ request }) => {
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toMatch(/\/about<\/loc>/);
    for (const slug of RELEASES) expect(sitemap).toContain(`/chapters/${slug}</loc>`);
    expect(sitemap).toContain("<image:loc>");
    expect(sitemap).toContain("<lastmod>");
  });

  test("/about states the facts in HTML, with MusicGroup and FAQPage JSON-LD", async ({ page }) => {
    await page.goto("/about");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/black throne/i);
    const discography = page.getByRole("heading", { name: /discography/i });
    await expect(discography).toBeVisible();
    for (const slug of RELEASES) {
      await expect(page.locator(`main a[href="/chapters/${slug}"]`).first()).toBeVisible();
    }
    await expect(page.getByText(/what genre is black throne\?/i)).toBeVisible();
    await expect(page.locator('a[href="https://www.youtube.com/"]')).toHaveCount(0);

    const types = await page
      .locator('script[type="application/ld+json"]')
      .evaluateAll((els) => els.map((e) => JSON.parse(e.textContent ?? "{}")["@type"]));
    expect(types).toEqual(expect.arrayContaining(["MusicGroup", "FAQPage"]));
  });

  test("the footer links to /about", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("navigation", { name: "Footer" }).getByRole("link", { name: "about" }),
    ).toHaveAttribute("href", "/about");
  });

  test("/llms.txt is plain Markdown listing every release and official profile", async ({
    request,
  }) => {
    const res = await request.get("/llms.txt");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toMatch(/^text\/plain/);
    const txt = await res.text();
    expect(txt.startsWith("# Black Throne\n\n> ")).toBe(true);
    for (const slug of RELEASES) expect(txt).toContain(`/chapters/${slug})`);
    expect(txt).toContain("open.spotify.com");
    expect(txt).toContain("instagram.com/theblackthrone.official");
    expect(txt).not.toContain("https://www.youtube.com/)"); // placeholder stays hidden
    expect(txt).not.toMatch(/undefined|null/);
  });

  test("nothing sealed reaches /about or /llms.txt", async ({ request }) => {
    const terms = sealedTerms();
    test.skip(terms.length === 0, "no local denylist");
    for (const path of ["/about", "/llms.txt"]) {
      const body = (await (await request.get(path)).text()).toLowerCase();
      for (const term of terms) {
        expect(body.includes(term.toLowerCase()), `${path} mentions a sealed term`).toBe(false);
      }
    }
  });
});

test.describe("listen", () => {
  test("release switcher is newest-first and switchable by click and keyboard", async ({
    page,
  }) => {
    // Returning visitor: the entry ritual has already been passed this session.
    await page.addInitScript(() => sessionStorage.setItem("bt:entered", "1"));
    await page.goto("/#listen");
    const tabs = page.getByRole("tablist", { name: /choose a release/i }).getByRole("tab");
    expect(await tabs.count()).toBeGreaterThan(1);
    await expect(tabs.first()).toContainText(/house of ash/i);
    await expect(tabs.first()).toHaveAttribute("aria-selected", "true");
    await tabs.nth(1).click();
    await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("ArrowLeft");
    await expect(tabs.first()).toHaveAttribute("aria-selected", "true");
  });
});

test.describe("quality", () => {
  for (const path of PAGES) {
    test(`${path} has no horizontal overflow and no first-party errors`, async ({ browser }) => {
      const ctx = await browser.newContext({ reducedMotion: "reduce" });
      const page = await ctx.newPage();
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("console", (m) => {
        if (m.type() !== "error") return;
        const url = m.location().url ?? "";
        if (url && !url.startsWith("http://localhost")) return; // third-party embeds
        if (url.includes("/_vercel/")) return; // analytics scripts only exist on Vercel
        errors.push(m.text());
      });
      await page.goto(path, { waitUntil: "networkidle" });
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
      expect(errors).toEqual([]);
      await ctx.close();
    });
  }
});
