"use client";

import { DEFAULT_GRADE } from "@black-throne/content/grades";
import type { GradeId } from "@black-throne/content/types";
import { createStore } from "zustand/vanilla";
import { detectQuality } from "./quality";

export type Quality = "high" | "mid" | "low";
export type Intro = "threshold" | "entering" | "world";

/**
 * Shared, non-React world state. The WebGL loop reads it every frame via `world.getState()`,
 * so high-frequency values (audio bands, pointer) never trigger React renders.
 */
export interface WorldState {
  grade: GradeId;
  intro: Intro;
  /** Visitor chose sound (threshold or SOUND toggle). */
  sound: boolean;
  /** Our own teaser is currently audible. */
  teaserPlaying: boolean;
  /** Spotify embed reports playback (no audio data — only drives "breathing"). */
  spotifyPlaying: boolean;
  /** Smoothed analyser bands, 0..1. */
  bands: { low: number; mid: number; high: number; kick: number };
  pointer: { x: number; y: number; active: boolean };
  /** 0..1 page scroll progress. */
  scroll: number;
  reducedMotion: boolean;
  quality: Quality;
  /** performance.now() of the last ash burst (threshold exit, sealed slot hover…). */
  burstAt: number;
  setGrade: (grade: GradeId) => void;
  setIntro: (intro: Intro) => void;
  burst: () => void;
}

const isClient = typeof window !== "undefined";

export const world = createStore<WorldState>()((set) => ({
  grade: DEFAULT_GRADE,
  intro:
    isClient && document.documentElement.hasAttribute("data-threshold") ? "threshold" : "world",
  sound: false,
  teaserPlaying: false,
  spotifyPlaying: false,
  bands: { low: 0, mid: 0, high: 0, kick: 0 },
  pointer: { x: 0.5, y: 0.5, active: false },
  scroll: 0,
  // Environment is read once on the client; never used during render, so no hydration mismatch.
  reducedMotion: isClient && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  quality: isClient ? detectQuality() : "mid",
  burstAt: -1e9,
  setGrade: (grade) => set({ grade }),
  setIntro: (intro) => set({ intro }),
  burst: () => set({ burstAt: performance.now() }),
}));
