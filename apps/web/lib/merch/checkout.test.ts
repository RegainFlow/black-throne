import { describe, expect, it } from "vitest";
import {
  cartCheckoutUrl,
  clampQty,
  directCheckoutUrl,
  isCartId,
  isValidShopDomain,
  isVariantId,
  parseAttribution,
  pickAttribution,
} from "./checkout";
import { cartErrorMessage, toCartErrorCode } from "./errors";
import { formatMoney, roundMoney } from "./money";

const V1 = "11111111-1111-4111-8111-111111111101";
const V2 = "22222222-2222-4222-8222-222222222201";

describe("cart checkout URL", () => {
  it("builds the documented hosted-checkout URL", () => {
    expect(cartCheckoutUrl({ shopDomain: "shop.example.com", cartId: "cart_ABC-123xyz" })).toBe(
      "https://shop.example.com/cart/checkout?cartId=cart_ABC-123xyz&currency=USD",
    );
  });

  it("forwards only allowlisted attribution", () => {
    const attribution = pickAttribution(
      new URLSearchParams("utm_source=ig&utm_campaign=drop%201&evil=1&storefront_token=x"),
    );
    const url = new URL(
      cartCheckoutUrl({ shopDomain: "shop.example.com", cartId: "cart_12345678", attribution }) ??
        "",
    );
    expect(url.searchParams.get("utm_source")).toBe("ig");
    expect(url.searchParams.get("utm_campaign")).toBe("drop 1");
    expect(url.searchParams.has("evil")).toBe(false);
    expect(url.searchParams.has("storefront_token")).toBe(false);
  });

  it("rejects invalid cart ids", () => {
    for (const id of [
      "",
      "short",
      "a/b/c/d/e/f/g",
      "../../../../x",
      "x".repeat(65),
      "id with space",
    ])
      expect(cartCheckoutUrl({ shopDomain: "shop.example.com", cartId: id }), id).toBeNull();
    expect(isCartId("22222222-2222-2222-2222-222222222222")).toBe(true);
  });
});

describe("shop domain validation", () => {
  it("accepts bare public hostnames", () => {
    for (const d of ["shop.example.com", "black-throne-shop.fourthwall.com", "a.co"])
      expect(isValidShopDomain(d), d).toBe(true);
  });

  it("rejects schemes, paths, ports, userinfo, IPs and junk", () => {
    for (const d of [
      "https://shop.example.com",
      "shop.example.com/cart",
      "shop.example.com:8080",
      "user@shop.example.com",
      "a.com/@b.com",
      "127.0.0.1",
      "localhost",
      "Shop.Example.com",
      "shop example.com",
      "-shop.example.com",
      "shop..example.com",
      "",
    ])
      expect(isValidShopDomain(d), d).toBe(false);
    expect(cartCheckoutUrl({ shopDomain: "evil.com/@x", cartId: "cart_12345678" })).toBeNull();
  });
});

describe("direct (buy now) checkout URL", () => {
  it("builds products=uuid:qty pairs", () => {
    const url = directCheckoutUrl({
      shopDomain: "shop.example.com",
      lines: [
        { variantId: V1, quantity: 2 },
        { variantId: V2, quantity: 99 },
      ],
      attribution: { utm_medium: "social" },
    });
    const u = new URL(url ?? "");
    expect(u.origin + u.pathname).toBe("https://shop.example.com/cart/checkout");
    expect(u.searchParams.get("products")).toBe(`${V1}:2,${V2}:10`);
    expect(u.searchParams.get("currency")).toBe("USD");
    expect(u.searchParams.get("utm_medium")).toBe("social");
  });

  it("rejects non-UUID and duplicate variant ids, and empty carts", () => {
    const shopDomain = "shop.example.com";
    expect(
      directCheckoutUrl({ shopDomain, lines: [{ variantId: "prod-1", quantity: 1 }] }),
    ).toBeNull();
    expect(
      directCheckoutUrl({ shopDomain, lines: [{ variantId: `${V1},${V2}`, quantity: 1 }] }),
    ).toBeNull();
    expect(
      directCheckoutUrl({
        shopDomain,
        lines: [
          { variantId: V1, quantity: 1 },
          { variantId: V1, quantity: 1 },
        ],
      }),
    ).toBeNull();
    expect(directCheckoutUrl({ shopDomain, lines: [] })).toBeNull();
    expect(isVariantId(V1)).toBe(true);
  });

  it("clamps quantities to 1–10", () => {
    expect(clampQty("0")).toBe(1);
    expect(clampQty("3")).toBe(3);
    expect(clampQty(50)).toBe(10);
    expect(clampQty("abc")).toBe(1);
    expect(clampQty(0, 0)).toBe(0);
  });
});

describe("attribution", () => {
  it("strips control characters and caps length", () => {
    const a = pickAttribution({ utm_source: "ig\u0000\n\u007f", utm_term: "x".repeat(500) });
    expect(a.utm_source).toBe("ig");
    expect(a.utm_term).toHaveLength(200);
  });

  it("reads the cookie back through the allowlist and survives garbage", () => {
    expect(parseAttribution('{"utm_source":"tt","evil":"1"}')).toEqual({ utm_source: "tt" });
    expect(parseAttribution("not json")).toEqual({});
    expect(parseAttribution(undefined)).toEqual({});
  });
});

describe("money and errors", () => {
  it("formats prices", () => {
    expect(formatMoney({ value: 21.42, currency: "USD" })).toBe("$21.42");
    expect(formatMoney({ value: 30, currency: "USD" })).toBe("$30.00");
    expect(formatMoney({ value: 2400, currency: "JPY" })).toBe("¥2,400");
    expect(formatMoney({ value: 12.5, currency: "U$" })).toBe("12.50 U$");
    expect(roundMoney(39.199999, "USD")).toBe(39.2);
    expect(roundMoney(2400.4, "JPY")).toBe(2400);
  });

  it("maps cart error codes to shopper copy without internals", () => {
    expect(cartErrorMessage(toCartErrorCode("CART_QUANTITY_TOO_HIGH"), 3)).toBe("only 3 left.");
    expect(cartErrorMessage(toCartErrorCode("CART_OFFER_NOT_AVAILABLE"))).toMatch(/no longer/);
    expect(toCartErrorCode("<script>")).toBe("UNKNOWN");
    expect(cartErrorMessage("UNKNOWN")).toBe("something went wrong. try again.");
  });
});
