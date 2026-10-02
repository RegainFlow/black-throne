import { describe, expect, it } from "vitest";
import { countdown, formatDuration, parseReleaseDate, releasePhase } from "./state";

describe("parseReleaseDate", () => {
  it("treats date-only values as local midnight", () => {
    const d = parseReleaseDate("2026-11-07");
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 10, 7, 0]);
  });

  it("honours explicit offsets", () => {
    expect(parseReleaseDate("2026-11-07T00:00:00Z").toISOString()).toBe("2026-11-07T00:00:00.000Z");
  });

  it("throws on garbage", () => {
    expect(() => parseReleaseDate("soon")).toThrow();
  });
});

describe("releasePhase", () => {
  const now = new Date(2026, 9, 1, 12);

  it("is out when released", () => {
    expect(releasePhase({ visibility: "released" }, now)).toBe("out");
  });

  it("is announced without a date", () => {
    expect(releasePhase({ visibility: "announced" }, now)).toBe("announced");
  });

  it("flips to out at local midnight on release day", () => {
    const r = { visibility: "announced" as const, releaseDate: "2026-10-02" };
    expect(releasePhase(r, new Date(2026, 9, 1, 23, 59, 59))).toBe("announced");
    expect(releasePhase(r, new Date(2026, 9, 2, 0, 0, 0))).toBe("out");
  });
});

describe("countdown", () => {
  it("splits the remaining time", () => {
    const now = new Date(2026, 0, 1, 0, 0, 0);
    const target = new Date(2026, 0, 2, 3, 4, 5);
    expect(countdown(target, now)).toEqual({
      days: 1,
      hours: 3,
      minutes: 4,
      seconds: 5,
      done: false,
    });
  });

  it("clamps at zero", () => {
    expect(countdown(new Date(0), new Date(1000)).done).toBe(true);
  });
});

describe("formatDuration", () => {
  it("formats m:ss", () => {
    expect(formatDuration(49800)).toBe("0:50");
    expect(formatDuration(290920)).toBe("4:51");
  });
});
