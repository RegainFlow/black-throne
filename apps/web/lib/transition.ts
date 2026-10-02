"use client";

import { createStore } from "zustand/vanilla";

/**
 * Route transitions: a GSAP ash-wipe overlay instead of the View Transitions API
 * (view transitions snapshot the page, which would freeze the live WebGL world).
 *
 * idle → covering (wipe in) → navigate → revealing (wipe out on pathname change) → idle
 */
export type TransitionPhase = "idle" | "covering" | "covered" | "revealing";

export const transition = createStore<{
  phase: TransitionPhase;
  href?: string;
  /** True while a TransitionOverlay is mounted. Without one, links navigate normally. */
  overlay: boolean;
}>(() => ({
  phase: "idle",
  overlay: false,
}));
