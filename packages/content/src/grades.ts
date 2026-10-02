import type { Grade, GradeId } from "./types";

/**
 * Colour grades. Safe to import from client components — contains no unannounced data.
 * New release grades are derived from the cover palette (`pnpm media` prints it) and added on reveal.
 */
export const grades: Record<GradeId, Grade> = {
  /** Chapter I — cold concrete, surveillance red, scanlines. */
  dystopia: {
    id: "dystopia",
    void: "#060607",
    ash: "#121316",
    bone: "#d6d4cf",
    smoke: "#8d8d93",
    accent: "#e5484d",
    glow: "#ff5a4e",
    fog: "#3b3d44",
    world: { smoke: 0.85, embers: 0.12, shaft: 0.45, grain: 0.35, glitch: 0.7, scanlines: 1 },
  },
  /** Chapter II — warm ash, amber embers, film grain. */
  ii: {
    id: "ii",
    void: "#070505",
    ash: "#16110e",
    bone: "#d9d2c5",
    smoke: "#8f887d",
    accent: "#e0802a",
    glow: "#ffb066",
    fog: "#4a3a2e",
    world: { smoke: 1, embers: 0.65, shaft: 0.8, grain: 0.5, glitch: 0.2, scanlines: 0 },
  },
  /** House of Ash — sepia ash, bone, ember glints (from the cover). */
  "house-of-ash": {
    id: "house-of-ash",
    void: "#080605",
    ash: "#1a1410",
    bone: "#e2d6c2",
    smoke: "#9a8e7e",
    accent: "#d9762b",
    glow: "#ffae5c",
    fog: "#584838",
    world: { smoke: 1, embers: 0.9, shaft: 0.7, grain: 0.55, glitch: 0.25, scanlines: 0 },
  },
};

export const DEFAULT_GRADE: GradeId = "ii";

export function getGrade(id: GradeId): Grade {
  return grades[id];
}
