/**
 * Pure, client-safe helpers for time-dependent release state.
 * Call these after mount (never during render) so server and client markup stay identical.
 */

export type ReleasePhase = "announced" | "out";

/** Parses `YYYY-MM-DD` as local midnight (how streaming releases go live) or a full ISO datetime. */
export function parseReleaseDate(value: string): Date {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly) {
    const [, y, m, d] = dateOnly;
    return new Date(Number(y), Number(m) - 1, Number(d));
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error(`Invalid release date: ${value}`);
  return parsed;
}

export function releasePhase(
  release: { visibility: "announced" | "released"; releaseDate?: string },
  now: Date,
): ReleasePhase {
  if (release.visibility === "released") return "out";
  if (release.releaseDate && now >= parseReleaseDate(release.releaseDate)) return "out";
  return "announced";
}

export interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  done: boolean;
}

export function countdown(target: Date, now: Date): Countdown {
  const ms = Math.max(0, target.getTime() - now.getTime());
  const s = Math.floor(ms / 1000);
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
    done: ms === 0,
  };
}

export function formatDuration(ms: number): string {
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
