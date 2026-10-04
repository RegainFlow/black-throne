import { expect as baseExpect, type Page, type TestInfo, test } from "@playwright/test";

// Server Actions + redirects against `next start` share the machine with 3 parallel workers.
const expect = baseExpect.configure({ timeout: 15_000 });

/**
 * Merch storefront against the Fourthwall mock (e2e/fourthwall-mock). Checkout itself is
 * Fourthwall's hosted page: the hand-off is intercepted here and its URL asserted.
 */

const SHOP = "https://shop.example.com";
const TOKEN = "e2e-token";

const cards = (page: Page) => page.locator("[data-merch-card]");
/** textContent, not innerText: display-title uppercases visually. */
const cardNames = (page: Page) => cards(page).locator(".display-title").allTextContents();
const panel = (page: Page) => page.locator("[data-purchase-panel]");
const radio = (page: Page, name: string | RegExp) =>
  panel(page).getByRole("radio", { name, exact: typeof name === "string" });
/** Radios are visually hidden behind their chip; a shopper clicks the chip (the label). */
const chipFor = (page: Page, name: string | RegExp) =>
  panel(page)
    .locator("label")
    // `has` is evaluated inside each label, so the inner locator must not re-scope to the panel.
    .filter({ has: page.getByRole("radio", { name, exact: typeof name === "string" }) });
const pick = (page: Page, name: string) => chipFor(page, name).click();

async function interceptCheckout(page: Page) {
  const seen: URL[] = [];
  await page.route(`${SHOP}/**`, (route) => {
    seen.push(new URL(route.request().url()));
    return route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<!doctype html><title>Checkout</title><h1>mock fourthwall checkout</h1>",
    });
  });
  return seen;
}

async function shot(page: Page, info: TestInfo, name: string) {
  const path = info.outputPath(`${name}.png`);
  // Full-page captures of a scrolled page misplace fixed elements (e.g. the skip link).
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path, fullPage: true });
  await info.attach(name, { path, contentType: "image/png" });
}

test.describe("merch listing", () => {
  test("lists only public products, labels sold out, never leaks the token", async ({
    page,
    request,
  }) => {
    const html = await (await request.get("/merch")).text();
    expect(html).not.toContain(TOKEN);
    expect(html).not.toContain("storefront_token");
    expect(html).not.toContain("127.0.0.1:3311/v1");

    await page.goto("/merch");
    await expect(cards(page)).toHaveCount(7); // 3 mock pages of 4, followed by the site
    await expect(page.getByRole("link", { name: /hidden sample/i })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /crest hoodie/i })).toContainText(/sold out/i);
    await expect(page.getByRole("link", { name: /enamel pin/i })).toContainText(/only 4 left/i);
    await expect.poll(async () => (await cardNames(page)).at(-1)).toMatch(/crest hoodie/i); // sold out sinks
  });

  test("search narrows results and lives in the URL", async ({ page }) => {
    await page.goto("/merch");
    await page.getByRole("searchbox", { name: /search/i }).fill("crest");
    await page.getByRole("button", { name: /^apply$/i }).click();
    await expect(page).toHaveURL(/[?&]q=crest/);
    await expect(cards(page)).toHaveCount(3);
    await expect(page.locator("[data-result-count]")).toHaveText(/3 pieces/);
  });

  test("filters by size, colour, stock and price, and sorts", async ({ page }) => {
    await page.goto("/merch");
    await page.locator("summary", { hasText: /^filter/ }).click();
    await page.locator("label").filter({ hasText: /^XL$/ }).click();
    await page.getByRole("button", { name: /apply filters/i }).click();
    await expect(page).toHaveURL(/size=XL/);
    await expect.poll(() => cardNames(page)).toEqual(["Crest Tee", "Tee and Poster Pack"]);

    await page.goto("/merch?color=Bone");
    await expect.poll(() => cardNames(page)).toEqual(["Crest Tee", "Tee and Poster Pack"]);
    // The colour filter carries through: the card shows that colour and opens on it.
    const tee = cards(page).filter({ hasText: "Crest Tee" });
    await expect(tee).toHaveAttribute("href", "/merch/crest-tee?color=Bone");
    await expect(tee.locator("img")).toHaveAttribute("src", /tee-bone-front/);

    await page.goto("/merch?stock=in");
    await expect
      .poll(() => cardNames(page))
      .toEqual([
        "Crest Tee",
        "Tee and Poster Pack",
        "Logo Cap",
        "Tour Poster",
        "Enamel Pin",
        "Twelve Inch Record",
      ]);

    await page.goto("/merch?min=20&max=30");
    await expect
      .poll(async () => (await cardNames(page)).sort())
      .toEqual(["Crest Tee", "Logo Cap", "Twelve Inch Record"]);

    await page.goto("/merch");
    await page.getByRole("combobox", { name: /sort/i }).selectOption("price-asc");
    await page.getByRole("button", { name: /^apply$/i }).click();
    await expect(page).toHaveURL(/sort=price-asc/);
    await expect.poll(async () => (await cardNames(page))[0]).toBe("Enamel Pin");
  });

  test("no matches, empty collection and an outage each get a clear state", async ({ page }) => {
    await page.goto("/merch?q=nothing-like-this");
    await expect(page.locator('[data-merch-state="no-results"]')).toBeVisible();
    await page.getByRole("link", { name: /clear filters/i }).click();
    await expect(cards(page)).toHaveCount(7);

    await page
      .getByRole("navigation", { name: /categories/i })
      .getByRole("link", { name: "accessories" })
      .click();
    await expect(page).toHaveURL(/category=accessories/);
    await expect(cards(page)).toHaveCount(3);

    await page.goto("/merch?category=empty");
    await expect(page.locator('[data-merch-state="empty"]')).toBeVisible();

    await page.goto("/merch?category=outage");
    await expect(page.locator('[data-merch-state="error"]')).toBeVisible();
    const text = await page.locator("main").innerText();
    expect(text).not.toMatch(/503|storefront|fourthwall\.com|error:/i);
  });
});

test.describe("merch product", () => {
  test("unknown, hidden and malformed slugs are real 404s; an outage is not", async ({
    request,
  }) => {
    for (const slug of ["does-not-exist", "hidden-sample", "bad%20slug"]) {
      expect((await request.get(`/merch/${slug}`)).status(), slug).toBe(404);
    }
    const outage = await request.get("/merch/upstream-error");
    expect(outage.status()).toBe(200);
    expect(await outage.text()).toContain('data-merch-state="error"');
  });

  test("renders sanitised details, share image and Product JSON-LD", async ({ page }) => {
    await page.goto("/merch/crest-tee");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/crest tee/i);
    await expect(page.locator(".bt-prose strong", { hasText: /screen printed/i })).toBeVisible();
    expect(await page.evaluate(() => (window as { __pwned?: boolean }).__pwned)).toBeUndefined();
    await page.locator("summary", { hasText: /^returns/ }).click();
    await expect(page.locator('a[href^="javascript:"]')).toHaveCount(0);
    await page.locator("summary", { hasText: /^size & fit/ }).click();
    await expect(page.getByRole("cell", { name: "102" })).toBeVisible();
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      /\/merch\/crest-tee\/opengraph-image/,
    );
    const ld = JSON.parse(
      (await page.locator('script[type="application/ld+json"]').textContent()) ?? "{}",
    );
    expect(ld).toMatchObject({ "@type": "Product", name: "Crest Tee" });
  });

  test("requires valid options; missing combinations are disabled, sold-out ones unbuyable", async ({
    page,
  }) => {
    await page.goto("/merch/crest-tee");
    const add = page.getByRole("button", { name: /add to cart/i });
    await expect(add).toBeDisabled();
    await expect(page.locator("[data-purchase-hint]")).toHaveText(/choose color and size/i);

    await pick(page, "Bone");
    await expect(radio(page, /^L/)).toBeDisabled(); // no Bone L
    await expect(radio(page, /^XL/)).toBeDisabled();
    await pick(page, "M");
    await expect(add).toBeEnabled();

    await pick(page, "Black"); // switching colour keeps M (it exists in black)
    await expect(radio(page, "M")).toBeChecked();
    await chipFor(page, /^XL/).click();
    await expect(page.locator("[data-purchase-hint]")).toHaveText(/sold out/i);
    await expect(add).toBeDisabled();
    await expect(page.locator("[data-price]")).toHaveText("$34.00");
  });

  test("options stay chosen after adding, so adding again works", async ({ page }) => {
    await page.goto("/merch/crest-tee");
    await pick(page, "Black");
    await pick(page, "S");
    const add = page.getByRole("button", { name: /add to cart/i });
    await add.click();
    await expect(page.locator("[data-cart-count]")).toHaveText("1");
    await expect(radio(page, "Black")).toBeChecked();
    await expect(radio(page, "S")).toBeChecked();
    await add.click();
    await expect(page.locator("[data-cart-count]")).toHaveText("2");
  });

  test("the gallery shows one large photo and only the chosen colour's thumbnails", async ({
    page,
  }) => {
    await page.goto("/merch/crest-tee");
    const gallery = page.locator("[data-gallery]");
    const thumbs = gallery.getByRole("button", { name: /show image/i });
    const main = gallery.getByRole("img").first();
    // No colour chosen yet: the first colour's photos (2 own + 1 shared).
    await expect(thumbs).toHaveCount(3);
    await expect(main).toHaveAttribute("src", /tee-front/);
    await thumbs.nth(1).click();
    await expect(main).toHaveAttribute("src", /tee-back/);
    await expect(thumbs.nth(1)).toHaveAttribute("aria-current", "true");

    await pick(page, "Bone");
    await expect(page).toHaveURL(/[?&]color=Bone/);
    await expect(thumbs).toHaveCount(2);
    await expect(main).toHaveAttribute("src", /tee-bone-front/); // a new colour starts on photo 1
    await expect(main).toHaveAttribute("alt", /bone/i);
  });

  test("?color= preselects the colour and its photos; unknown colours are ignored", async ({
    page,
  }) => {
    await page.goto("/merch/crest-tee?color=bone");
    await expect(radio(page, "Bone")).toBeChecked();
    await expect(page.locator("[data-gallery] img").first()).toHaveAttribute(
      "src",
      /tee-bone-front/,
    );
    await expect(page.locator("[data-purchase-hint]")).toHaveText(/choose size/i);

    await page.goto("/merch/crest-tee?color=purple");
    await expect(page.locator("[data-purchase-hint]")).toHaveText(/choose color and size/i);
  });

  test("buttons show the pointer", async ({ page }) => {
    await page.goto("/merch/crest-tee");
    await pick(page, "Black");
    await pick(page, "S");
    for (const name of [/add to cart/i, /buy now/i]) {
      await expect(page.getByRole("button", { name })).toHaveCSS("cursor", "pointer");
    }
  });

  test("a sold-out product can't be bought", async ({ page }) => {
    await page.goto("/merch/crest-hoodie");
    await expect(page.getByRole("button", { name: /add to cart/i })).toBeDisabled();
    await expect(page.getByRole("button", { name: /buy now/i })).toBeDisabled();
  });

  test("options and add-to-cart work from the keyboard", async ({ page }) => {
    await page.goto("/merch/crest-tee");
    const black = radio(page, "Black");
    await black.focus();
    await page.keyboard.press("Space");
    await expect(black).toBeChecked();
    await page.keyboard.press("Tab"); // into the size group
    await expect(radio(page, "S")).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await expect(radio(page, "M")).toBeChecked();

    const add = page.getByRole("button", { name: /add to cart/i });
    for (let i = 0; i < 6 && !(await add.evaluate((el) => el === document.activeElement)); i++) {
      await page.keyboard.press("Tab");
    }
    await expect(add).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("[data-purchase-status]")).toContainText(/added to cart/i);
    await expect(page.locator("[data-cart-count]")).toHaveText("1");
  });
});

test.describe("merch journey", () => {
  test("browse → search → choose → add → bundle → cart → change → remove → checkout", async ({
    page,
    context,
  }, info) => {
    test.slow(); // ten steps of real navigation and Server Actions
    const checkout = await interceptCheckout(page);

    // 1. Land from a social link (only allowlisted attribution survives).
    await page.goto("/merch?utm_source=ig&utm_campaign=drop&evil=1");
    await expect(cards(page)).toHaveCount(7);
    await shot(page, info, "01-listing");

    // 2. Search and open a product.
    await page.getByRole("searchbox", { name: /search/i }).fill("tee");
    await page.getByRole("button", { name: /^apply$/i }).click();
    await expect(cards(page)).toHaveCount(2);
    await page.getByRole("link", { name: /^crest tee/i }).click();
    await expect(page).toHaveURL(/\/merch\/crest-tee$/);

    // 3. Choose options, quantity 2, add.
    await pick(page, "Black");
    await pick(page, "M");
    await page.getByRole("spinbutton", { name: /quantity/i }).fill("2");
    await page.getByRole("button", { name: /add to cart/i }).click();
    await expect(page.locator("[data-purchase-status]")).toContainText(/added to cart/i);
    await expect(page.locator("[data-cart-count]")).toHaveText("2");
    await shot(page, info, "02-product-added");

    // 4. A bundle: one choice per part, priced live with the bundle's discount.
    await page.goto("/merch/tee-and-poster-pack");
    await pick(page, "Bone");
    await pick(page, "S");
    await expect(page.locator("[data-price]")).toHaveText("$36.00");
    await page.getByRole("button", { name: /add to cart/i }).click();
    await expect(page.locator("[data-cart-count]")).toHaveText("3");
    await expect(page.getByRole("button", { name: /buy now/i })).toHaveCount(0);

    // 5. A limited item, to the limit.
    await page.goto("/merch/enamel-pin");
    await page.getByRole("spinbutton", { name: /quantity/i }).fill("4");
    await page.getByRole("button", { name: /add to cart/i }).click();
    await expect(page.locator("[data-cart-count]")).toHaveText("7");

    // 6. The cart: items, the grouped bundle, an estimated subtotal.
    await page.getByRole("link", { name: /^cart, 7 items/i }).click();
    await expect(page).toHaveURL(/\/merch\/cart$/);
    const lines = page.locator("[data-cart-line]");
    await expect(lines).toHaveCount(3);
    await expect(page.locator('[data-cart-line="bundle"]')).toContainText(/crest tee — bone · s/i);
    await expect(page.locator('[data-cart-line="bundle"]')).toContainText(/tour poster/i);
    await expect(page.locator("[data-subtotal]")).toHaveText("$144.00"); // 60 + 36 + 48
    await shot(page, info, "03-cart");

    // 7. Change a quantity.
    await page.getByRole("button", { name: /increase quantity of crest tee/i }).click();
    await expect(page.locator("[data-subtotal]")).toHaveText("$174.00");

    // 8. Past the stock limit → a clear message, nothing changed.
    await page.getByRole("button", { name: /increase quantity of enamel pin/i }).click();
    // (not getByRole("alert"): Next's route announcer is an alert too)
    await expect(page.locator("[data-cart-error]")).toHaveText(/only 4 left/i);
    await expect(page.locator("[data-subtotal]")).toHaveText("$174.00");

    // 9. Remove the bundle.
    await page.getByRole("button", { name: /remove tee and poster pack/i }).click();
    await expect(lines).toHaveCount(2);
    await expect(page.locator("[data-subtotal]")).toHaveText("$138.00");
    await expect(page.locator("[data-cart-count]")).toHaveText("7"); // 3 tees + 4 pins
    await shot(page, info, "04-cart-updated");

    // 10. Checkout hands off to Fourthwall with the cart id, USD and allowlisted attribution.
    const cartId = (await context.cookies()).find((c) => c.name === "bt_cart")?.value;
    expect(cartId).toBeTruthy();
    await page.getByRole("link", { name: /checkout/i }).click();
    await expect(page.getByRole("heading", { name: /mock fourthwall checkout/i })).toBeVisible();
    const url = checkout.at(-1);
    expect(url?.origin).toBe(SHOP);
    expect(url?.pathname).toBe("/cart/checkout");
    expect(url?.searchParams.get("cartId")).toBe(cartId);
    expect(url?.searchParams.get("currency")).toBe("USD");
    expect(url?.searchParams.get("utm_source")).toBe("ig");
    expect(url?.searchParams.get("utm_campaign")).toBe("drop");
    expect(url?.searchParams.has("evil")).toBe(false);
    expect(url?.href).not.toContain(TOKEN);
    await shot(page, info, "05-checkout-handoff");
  });

  test("buy now skips the cart and goes straight to checkout", async ({ page }) => {
    const checkout = await interceptCheckout(page);
    await page.goto("/merch/tour-poster?utm_source=tt");
    await page.getByRole("button", { name: /buy now/i }).click();
    await expect(page.getByRole("heading", { name: /mock fourthwall checkout/i })).toBeVisible();
    const url = checkout.at(-1);
    expect(url?.pathname).toBe("/cart/checkout");
    expect(url?.searchParams.get("products")).toMatch(/^[0-9a-f-]{36}:1$/);
    expect(url?.searchParams.get("currency")).toBe("USD");
    expect(url?.searchParams.get("utm_source")).toBe("tt");
  });

  test("a line stacked past 10 can still be decreased", async ({ page }) => {
    await page.goto("/merch/crest-tee");
    await pick(page, "Black");
    await pick(page, "S");
    await page.getByRole("spinbutton", { name: /quantity/i }).fill("6");
    const add = page.getByRole("button", { name: /add to cart/i });
    await add.click();
    await expect(page.locator("[data-cart-count]")).toHaveText("6");
    await add.click();
    await expect(page.locator("[data-cart-count]")).toHaveText("12");
    await page.goto("/merch/cart");
    await expect(page.getByRole("button", { name: /increase quantity/i })).toBeDisabled();
    await page.getByRole("button", { name: /decrease quantity of crest tee/i }).click();
    await expect(page.locator("[data-qty]")).toHaveText("11");
    await expect(page.locator("[data-cart-error]")).toHaveCount(0);
  });

  test("a cart Fourthwall no longer knows is forgotten, badge included", async ({
    page,
    context,
    baseURL,
  }) => {
    const domain = new URL(baseURL ?? "http://localhost").hostname;
    await context.addCookies([
      { name: "bt_cart", value: "gone-cart-123456", domain, path: "/merch" },
      { name: "bt_cart_n", value: "5", domain, path: "/merch" },
    ]);
    await page.goto("/merch/cart");
    await expect(page.locator('[data-merch-state="cart-empty"]')).toBeVisible();
    await expect(page.locator("[data-cart-count]")).toHaveText("0");
    expect((await context.cookies()).some((c) => c.name === "bt_cart" && c.value)).toBe(false);
  });

  test("an empty cart says so and offers a way back", async ({ page }) => {
    await page.goto("/merch/cart");
    await expect(page.locator('[data-merch-state="cart-empty"]')).toBeVisible();
    await expect(page.getByRole("link", { name: /checkout/i })).toHaveCount(0);
  });
});

test.describe("merch from the world", () => {
  test("the nav leads to merch, and the merch page scrolls", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript(() => sessionStorage.setItem("bt:entered", "1"));
    await page.goto("/");
    if ((page.viewportSize()?.width ?? 1440) < 768) {
      await page.getByRole("button", { name: "menu" }).click();
      await page.locator("#mobile-menu").getByRole("link", { name: /merch/ }).click();
    } else {
      await page
        .getByRole("navigation", { name: "Primary" })
        .getByRole("link", { name: "merch" })
        .click();
    }
    await expect(page).toHaveURL(/\/merch$/);
    await expect(cards(page)).toHaveCount(7);
    await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
    await page.evaluate(() => window.scrollTo(0, 600));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  });
});
