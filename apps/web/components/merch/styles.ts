/** Shared class strings for the merch pages: same hairline/mono language as /links and Cta. */

export const field =
  "w-full border border-bone/20 bg-void/80 px-3 py-2.5 font-mono text-sm text-bone placeholder:text-smoke/70 transition-colors hover:border-bone/40 focus:border-accent";

export const button =
  "inline-flex items-center justify-center gap-3 border px-5 py-3 font-display text-[0.7rem] tracking-[0.24em] uppercase transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-40";

export const buttonPrimary = `${button} border-accent/70 bg-accent/10 text-bone hover:bg-accent hover:text-void disabled:hover:bg-accent/10 disabled:hover:text-bone`;

export const buttonGhost = `${button} border-bone/20 text-bone/80 hover:border-bone/60 hover:text-bone`;

/** Visible face for a visually-hidden radio/checkbox (the input is `peer sr-only`). */
export const chip =
  "inline-flex min-h-10 min-w-10 cursor-pointer items-center justify-center gap-2 border border-bone/20 px-3 py-2 font-mono text-xs tracking-[0.12em] text-bone/80 lowercase transition-colors hover:border-bone/50 peer-checked:border-accent peer-checked:bg-accent/10 peer-checked:text-bone peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent peer-disabled:cursor-not-allowed peer-disabled:border-dashed peer-disabled:text-smoke/50 peer-disabled:hover:border-bone/20";
