import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { bundle, hidden, poster, tee } from "./fixtures";
import {
  cartCreate,
  cartGet,
  cartMutate,
  getCatalogue,
  getCollections,
  getProduct,
} from "./fourthwall";

const TOKEN = "ptkn_never_leak_me";

type Handler = (url: URL, init: RequestInit) => Response | Promise<Response>;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

let calls: { url: URL; init: RequestInit }[] = [];
let logs: string[] = [];

function serve(handler: Handler) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: URL, init: RequestInit) => {
      const url = new URL(input);
      calls.push({ url, init });
      return handler(url, init);
    }),
  );
}

beforeEach(() => {
  calls = [];
  logs = [];
  vi.stubEnv("FOURTHWALL_STOREFRONT_TOKEN", TOKEN);
  vi.stubEnv("NEXT_PUBLIC_FOURTHWALL_SHOP_DOMAIN", "shop.example.com");
  vi.stubEnv("FOURTHWALL_API_BASE_URL", "");
  vi.stubEnv("SEALED_TERMS", "");
  vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    logs.push(args.map(String).join(" "));
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

/** Nothing a caller (or a log line) receives may contain the token or the request URL. */
function expectNoLeak(value: unknown) {
  const text = JSON.stringify(value) + logs.join("\n");
  expect(text).not.toContain(TOKEN);
  expect(text).not.toContain("storefront_token");
  expect(text).not.toContain("storefront-api.fourthwall.com");
}

describe("requests", () => {
  it("sends the token and USD to the Storefront API, never anywhere else", async () => {
    serve(() => json({ results: [tee], paging: { hasNextPage: false } }));
    const res = await getCatalogue("all");
    expect(res.ok).toBe(true);
    const { url, init } = calls[0] ?? {};
    expect(url?.origin).toBe("https://storefront-api.fourthwall.com");
    expect(url?.pathname).toBe("/v1/collections/all/products");
    expect(url?.searchParams.get("storefront_token")).toBe(TOKEN);
    expect(url?.searchParams.get("currency")).toBe("USD");
    expect((init as { next?: { revalidate: number } })?.next?.revalidate).toBe(120);
    expectNoLeak(res);
  });

  it("does nothing when unconfigured", async () => {
    vi.stubEnv("FOURTHWALL_STOREFRONT_TOKEN", "");
    serve(() => json({}));
    expect(await getCatalogue("all")).toEqual({ ok: false, error: { kind: "unconfigured" } });
    expect(calls).toHaveLength(0);
  });
});

describe("catalogue", () => {
  it("follows pages, keeps only public items", async () => {
    serve((url) =>
      url.searchParams.get("page") === "0"
        ? json({ results: [tee, hidden], paging: { hasNextPage: true } })
        : json({ results: [poster, bundle, { type: "MYSTERY" }], paging: { hasNextPage: false } }),
    );
    const res = await getCatalogue("all");
    expect(res.ok && res.value.map((i) => i.slug)).toEqual([
      "crest-tee",
      "tour-poster",
      "tee-and-poster-pack",
    ]);
    expect(calls).toHaveLength(2);
    expect(logs.join()).toContain("skipped-1");
    expectNoLeak(res);
  });

  it("stops after a fixed number of pages", async () => {
    serve(() => json({ results: [poster], paging: { hasNextPage: true } }));
    await getCatalogue("all");
    expect(calls).toHaveLength(10);
  });

  it("drops anything naming a sealed (unannounced) term", async () => {
    vi.stubEnv("SEALED_TERMS", "crest");
    serve(() => json({ results: [tee, poster, bundle], paging: { hasNextPage: false } }));
    const res = await getCatalogue("all");
    expect(res.ok && res.value.map((i) => i.slug)).toEqual(["tour-poster"]);
  });

  it("returns an empty list for an empty collection", async () => {
    serve(() => json({ results: [], paging: { hasNextPage: false } }));
    expect(await getCatalogue("all")).toEqual({ ok: true, value: [] });
  });

  it("parses collections and filters sealed ones", async () => {
    vi.stubEnv("SEALED_TERMS", "secret-drop");
    serve(() =>
      json({
        results: [
          { id: "1", name: "Apparel", slug: "apparel", description: "" },
          { id: "2", name: "Soon", slug: "secret-drop", description: "" },
          { nope: true },
        ],
      }),
    );
    expect(await getCollections()).toEqual({
      ok: true,
      value: [{ slug: "apparel", name: "Apparel" }],
    });
  });
});

describe("failures are typed and leak nothing", () => {
  it("timeout", async () => {
    serve(() => {
      throw new DOMException(
        `aborted https://storefront-api.fourthwall.com/?storefront_token=${TOKEN}`,
        "TimeoutError",
      );
    });
    const res = await getCatalogue("all");
    expect(res).toEqual({ ok: false, error: { kind: "timeout" } });
    expectNoLeak(res);
  });

  it("network error (whose cause would carry the URL)", async () => {
    serve(() => {
      throw new TypeError("fetch failed", {
        cause: new Error(`connect ECONNREFUSED https://x/?storefront_token=${TOKEN}`),
      });
    });
    const res = await getProduct("crest-tee");
    expect(res).toEqual({ ok: false, error: { kind: "network" } });
    expectNoLeak(res);
  });

  it("5xx", async () => {
    serve(() => json({ message: `boom ${TOKEN}` }, 503));
    const res = await getCatalogue("all");
    expect(res).toEqual({ ok: false, error: { kind: "upstream", status: 503 } });
    expectNoLeak(res);
  });

  it("malformed JSON and malformed shapes", async () => {
    serve(() => new Response("<html>gateway</html>", { status: 200 }));
    expect(await getCatalogue("all")).toEqual({ ok: false, error: { kind: "malformed" } });
    serve(() => json({ unexpected: true }));
    expect(await getCatalogue("all")).toEqual({ ok: false, error: { kind: "malformed" } });
    serve(() => json({ type: "PRODUCT", id: "x" }));
    expect(await getProduct("crest-tee")).toEqual({ ok: false, error: { kind: "malformed" } });
    expectNoLeak(logs);
  });
});

describe("products", () => {
  it("is null for unknown, hidden or sealed products", async () => {
    serve(() => json({ code: "OFFER_SLUG_NOT_FOUND_ERROR" }, 404));
    expect(await getProduct("nope")).toEqual({ ok: true, value: null });
    serve(() => json(hidden));
    expect(await getProduct("hidden-sample")).toEqual({ ok: true, value: null });
    vi.stubEnv("SEALED_TERMS", "tour poster");
    serve(() => json(poster));
    expect(await getProduct("tour-poster")).toEqual({ ok: true, value: null });
  });

  it("returns public products and bundles", async () => {
    serve(() => json(bundle));
    const res = await getProduct("tee-and-poster-pack");
    expect(res.ok && res.value?.kind).toBe("bundle");
    expect(calls[0]?.url.pathname).toBe("/v1/products/tee-and-poster-pack");
  });
});

describe("carts", () => {
  const cart = { id: "cart_12345678", items: [] };

  it("never caches cart reads and treats an unknown cart as gone", async () => {
    serve(() => json({ code: "CART_NOT_FOUND" }, 404));
    expect(await cartGet("cart_12345678")).toEqual({ ok: true, value: null });
    expect(calls[0]?.init.cache).toBe("no-store");
  });

  it("posts items and maps Fourthwall error codes", async () => {
    serve(() => json(cart));
    const items = [{ variantId: tee.variants[0]?.id ?? "", quantity: 1 }];
    expect(await cartCreate(items)).toEqual({ ok: true, value: cart });
    expect(calls[0]?.init.method).toBe("POST");
    expect(JSON.parse(String(calls[0]?.init.body))).toEqual({ items });

    serve(() => json({ code: "CART_QUANTITY_TOO_HIGH" }, 400));
    expect(await cartMutate("change", "cart_12345678", items)).toEqual({
      ok: false,
      error: { kind: "cart", code: "CART_QUANTITY_TOO_HIGH", status: 400 },
    });
    expect(calls[1]?.url.pathname).toBe("/v1/carts/cart_12345678/change");

    serve(() => json({ code: "SOMETHING_NEW" }, 400));
    const unknown = await cartMutate("add", "cart_12345678", items);
    expect(unknown.ok === false && unknown.error).toEqual({
      kind: "cart",
      code: "UNKNOWN",
      status: 400,
    });
  });
});
