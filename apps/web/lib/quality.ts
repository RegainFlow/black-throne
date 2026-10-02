import type { Quality } from "./world-store";

/** Rough device tier. Phones from IG/TikTok bios are the main audience — err towards "mid". */
export function detectQuality(): Quality {
  if (typeof window === "undefined") return "mid";
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };
  if (nav.connection?.saveData) return "low";
  const cores = nav.hardwareConcurrency ?? 4;
  const memory = nav.deviceMemory ?? 4;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  if (cores <= 4 || memory <= 2) return "low";
  if (coarse || cores <= 6 || memory <= 4) return "mid";
  return "high";
}

export const QUALITY = {
  high: { dpr: 1, particles: 650, fps: 60, octaves: 5 },
  mid: { dpr: 0.75, particles: 420, fps: 60, octaves: 4 },
  low: { dpr: 0.55, particles: 220, fps: 30, octaves: 3 },
} as const;
