"use client";

import { useStore } from "zustand";
import { type WorldState, world } from "./world-store";

/** React binding for low-frequency world state (sound, grade, intro…). */
export function useWorld<T>(selector: (state: WorldState) => T): T {
  return useStore(world, selector);
}
