import { describe, expect, it } from "vitest";
import { readMerchConfig } from "./config";

const env = {
  FOURTHWALL_STOREFRONT_TOKEN: "ptkn_test",
  NEXT_PUBLIC_FOURTHWALL_SHOP_DOMAIN: "shop.example.com",
};

describe("merch config", () => {
  it("defaults the collection to `all` and the API to Fourthwall", () => {
    const c = readMerchConfig(env);
    expect(c.ok && c.config.collection).toBe("all");
    expect(c.ok && c.config.apiBase.href).toBe("https://storefront-api.fourthwall.com/");
  });

  it("reports what's missing or invalid", () => {
    expect(readMerchConfig({})).toEqual({ ok: false, reason: "missing-token" });
    expect(readMerchConfig({ FOURTHWALL_STOREFRONT_TOKEN: "x" })).toEqual({
      ok: false,
      reason: "missing-domain",
    });
    expect(
      readMerchConfig({ ...env, NEXT_PUBLIC_FOURTHWALL_SHOP_DOMAIN: "https://shop.example.com" }),
    ).toEqual({ ok: false, reason: "invalid-domain" });
    expect(readMerchConfig({ ...env, FOURTHWALL_COLLECTION_SLUG: "../carts" })).toEqual({
      ok: false,
      reason: "invalid-collection",
    });
  });

  it("normalises the domain's case", () => {
    const c = readMerchConfig({ ...env, NEXT_PUBLIC_FOURTHWALL_SHOP_DOMAIN: " Shop.Example.com " });
    expect(c.ok && c.config.shopDomain).toBe("shop.example.com");
  });

  it("only lets the API base be overridden to a loopback mock", () => {
    const ok = readMerchConfig({ ...env, FOURTHWALL_API_BASE_URL: "http://127.0.0.1:3311" });
    expect(ok.ok && ok.config.apiBase.host).toBe("127.0.0.1:3311");
    for (const bad of [
      "https://evil.example.com",
      "http://127.0.0.1:3311/v1",
      "http://user:pw@localhost:1",
      "file:///etc/passwd",
      "nope",
    ]) {
      expect(readMerchConfig({ ...env, FOURTHWALL_API_BASE_URL: bad }), bad).toEqual({
        ok: false,
        reason: "invalid-api-base",
      });
    }
  });
});
