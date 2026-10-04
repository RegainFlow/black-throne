import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

/** Upcoming slugs come from the gitignored denylist at runtime — never written into this file. */
function sealedSlugs(): string[] {
  const file = join(__dirname, "../../../sealed.local.json");
  const fromEnv = (process.env.SEALED_TERMS ?? "").split(/[,\n]/);
  const fromFile = existsSync(file)
    ? (JSON.parse(readFileSync(file, "utf8")).terms as string[])
    : [];
  return [...fromFile, ...fromEnv]
    .map((t) => t.trim())
    .filter((t) => /^[a-z0-9]+(-[a-z0-9]+)+$/.test(t));
}

const PAGES = [
  "/",
  "/links",
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

  test("the link-in-bio page skips the threshold", async ({ page }) => {
    await page.goto("/links");
    await expect(page.locator("html")).not.toHaveAttribute("data-threshold", /.*/);
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

  test("sealed slots reveal nothing but 'not yet'", async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: "reduce" });
    const page = await ctx.newPage();
    await page.goto("/");
    const slots = page.getByRole("button", { name: /not yet revealed/i });
    expect(await slots.count()).toBeGreaterThan(0);
    await ctx.close();
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
