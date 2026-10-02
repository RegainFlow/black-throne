import type { Era } from "../types";

export const eras: Era[] = [
  {
    id: "dystopia",
    numeral: "I",
    title: "DYSTOPIA",
    grade: "dystopia",
    hud: ["surveillance active", "truth is treason", "obey or die"],
  },
  {
    // Veiled era: no title until the album is announced.
    id: "ii",
    numeral: "II",
    title: null,
    grade: "ii",
    hud: ["the air is heavy here", "nothing stays buried", "ash remembers"],
  },
];
