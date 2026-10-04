import { describe, expect, it } from "vitest";
import { eras, releases, site, slots } from "./data";
import { getAdjacent, getChapters, getLatest, getRelease } from "./index";
import { findPlaceholders, validateContent } from "./validate";

describe("content", () => {
  it("is valid", () => {
    expect(() => validateContent({ site, eras, releases, slots })).not.toThrow();
  });

  it("rejects a malformed release", () => {
    const bad = { ...releases[0]!, slug: "Not A Slug", grade: "nope" as never };
    expect(() => validateContent({ site, eras, releases: [bad], slots })).toThrow(/kebab-case/);
  });

  it("rejects duplicate slugs", () => {
    const r = releases[0]!;
    expect(() => validateContent({ site, eras, releases: [r, r], slots })).toThrow(/duplicate/);
  });

  it("orders chapters by era, interleaving releases and sealed slots by position", () => {
    const chapters = getChapters();
    expect(chapters.map((c) => c.era.id)).toEqual(["dystopia", "ii"]);
    const ii = chapters[1]!;
    expect(ii.items[0]).toMatchObject({ type: "release", release: { slug: "house-of-ash" } });
    expect(ii.items.slice(1).every((i) => i.type === "sealed")).toBe(true);
  });

  it("never puts transmission slots into chapters", () => {
    const all = getChapters().flatMap((c) => c.items);
    expect(all.some((i) => i.type === "sealed" && i.slot.kind === "transmission")).toBe(false);
  });

  it("promotes the newest era's latest release", () => {
    expect(getLatest().slug).toBe("house-of-ash");
  });

  it("returns undefined for unknown slugs", () => {
    expect(getRelease("does-not-exist")).toBeUndefined();
  });

  it("links neighbouring releases across eras", () => {
    expect(getAdjacent("dystopia").next?.slug).toBe("house-of-ash");
    expect(getAdjacent("house-of-ash").prev?.slug).toBe("dystopia");
  });

  it("reports placeholders", () => {
    const list = findPlaceholders({ site, releases });
    expect(list.some((p) => p.includes("YouTube"))).toBe(true);
    expect(list.some((p) => p.includes("Instagram"))).toBe(false);
  });

  it("rejects a malformed artist profile", () => {
    const bad = {
      ...site,
      profile: { ...site.profile, formed: "twenty", contact: { press: "not-an-email" } },
      profiles: [{ label: "Wikidata", url: "nope" }],
    };
    expect(() => validateContent({ site: bad, eras, releases, slots })).toThrow(
      /formed[\s\S]*press[\s\S]*profiles/,
    );
  });

  it("reports unset profile facts, and stops once they are set", () => {
    const missing = (s: typeof site) =>
      findPlaceholders({ site: s, releases }).find((p) => p.startsWith("profile:"));
    const bare = { ...site, profile: { alternateNames: [], genres: ["Metal"] } };
    expect(missing(bare)).toMatch(/origin, year formed, lineup/);
    const full = {
      ...bare,
      profile: { ...bare.profile, origin: "X", formed: "2020", members: [{ name: "Y" }] },
    };
    expect(missing(full)).toBeUndefined();
  });
});
