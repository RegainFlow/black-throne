import type { SealedSlot } from "../types";

/**
 * Cryptic placeholders for what hasn't been announced. Labels are written by hand and must
 * never be derived from the real titles (no lengths, initials or anagrams).
 */
export const slots: SealedSlot[] = [
  // Veiled: the artist chose to tease this one with a blurred still (assets/sealed/ii-2.*).
  { id: "ii-2", eraId: "ii", kind: "single", position: 2, label: "TBA", veil: {} },
  { id: "ii-3", eraId: "ii", kind: "single", position: 3, label: "II · SEALED" },
  { id: "ii-0", eraId: "ii", kind: "album", position: 4, label: "II", hint: "not yet." },
];
