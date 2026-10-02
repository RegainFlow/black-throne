# BLACK THRONE — Design System

> **heavy sound. dark truth.** Every album is a chapter of the same world, and every chapter explores a different kind of weight.

This site is a world, not a band page. A first-time visitor should feel *"what is this?"* and want to go deeper. It is dark, cinematic and unsettling, but always clean and high-end. It exists to **promote**: every surface pushes toward listening, following and sharing. It sells nothing.

---

## 1. Brand essence

| | |
|---|---|
| **Feeling** | dark · cinematic · melancholic · heavy · mysterious · atmospheric · brutalist · psychological · beautiful but disturbing |
| **Themes** | ash · decay · transformation · isolation · identity · faith · regret · rebirth |
| **Not** | cluttered · "band template" · stock metal clichés · straight horror · merch-first |

**The world / chapter metaphor.** The site has one persistent world: smoke, ash, embers, a light falling from above, and a faint halo ring. Each **era** (album cycle) is a *chapter* with its own **grade**. Moving between chapters re-colours the entire world.

- **Chapter I: DYSTOPIA** looks outward: society, control, corruption, breaking systems. It is cold concrete with surveillance red.
- **Chapter II** turns inward: identity, regret, grief, faith, the weight of change. It is warm ash with amber embers. It stays **untitled** (a redaction bar) until the album is announced. The site literally *becomes* the new chapter on reveal day.

The brand must never be locked into government/corruption imagery. That belongs to Chapter I only.

---

## 2. Voice & copy

- **Minimal.** If a line can be removed, remove it.
- **Mono "system" lines are lowercase** (`arriving soon`, `tap the waveform to hear it`, HUD lines).
- **Display serif is UPPERCASE and widely tracked** (titles, CTAs).
- **Serif italic** is reserved for epigraphs and the tagline.
- **Never invent lyrics.** Epigraphs and quotes come only from the artist (`Release.epigraph`).
- The HUD lines per era live in `packages/content/src/data/eras.ts`. They are short and cryptic, and they reuse the artwork's own words where possible (*"truth is treason"*, *"obey or die"* come from the DYSTOPIA cover).

---

## 3. Colour

Colours are CSS custom properties **registered with `@property`**, so they *animate* when `<html data-grade>` changes. The single source of truth is `packages/content/src/grades.ts`. `gradeCss()` (`apps/web/lib/grade-css.ts`) emits one rule per grade into the root layout, and the WebGL world reads the same values.

### Base tokens (Tailwind names)

| Token | Role |
|---|---|
| `void` | deepest background |
| `ash` | raised surfaces |
| `bone` | primary text |
| `smoke` | secondary text: **must keep ≥ 4.5:1 on `void`** |
| `accent` | signal: CTAs, focus rings, progress |
| `glow` | light shaft, embers, burn rims |
| `fog` | the smoke itself |
| `blood` | fixed `#7a1414`, used sparingly |

### Chapter grades

| Grade | void | bone | accent | glow | fog | World dials |
|---|---|---|---|---|---|---|
| `dystopia`: concrete + surveillance red | `#060607` | `#d6d4cf` | `#e5484d` | `#ff5a4e` | `#3b3d44` | heavy glitch, **scanlines on**, few embers |
| `ii`: ash + amber | `#070505` | `#d9d2c5` | `#e0802a` | `#ffb066` | `#4a3a2e` | dense smoke, strong shaft, grain, no scanlines |
| `house-of-ash`: sepia ash, ember glints | `#080605` | `#e2d6c2` | `#d9762b` | `#ffae5c` | `#584838` | maximum embers |

### Deriving a grade for a new release

Every cover has its own colour story. When a release is revealed:

1. `pnpm media` prints the cover's `dominant` / `accent` / `dark` palette.
2. Start from the era's grade. Take `fog` from the dominant (darkened), `accent`/`glow` from the accent (raise lightness until `accent` text passes 4.5:1 on `void`), and keep `bone` warm or cool to match.
3. Add it to `grades.ts` and to the table above **on reveal day only**. This document is committed, so it must never describe unannounced releases.

---

## 4. Typography

| Family | Use | Notes |
|---|---|---|
| **Cinzel** (`font-display`) | wordmark, titles, CTAs | Trajan-like capitals echo the cover lettering. Wordmark tracking `0.28em`. **Apply tracking on the element that carries the font-size**, because `em` letter-spacing inherits as px. |
| **Cormorant Garamond** italic (`font-serif`) | tagline, epigraphs, tracklists | the human, melancholic voice |
| **IBM Plex Mono** (`font-mono`, `mono-label`) | HUD, metadata, system text | lowercase, `0.22em` tracking, 11px |

Scale (fluid): wordmark `clamp(2.75rem, 6.6vw, 7.75rem)` · section titles `clamp(2rem, 6vw, 5rem)` · era numerals `clamp(3.5rem, 11vw, 9rem)` at 15% opacity · body mono `0.6875rem`.

Utilities in `globals.css`: `type-wordmark`, `display-title`, `mono-label`, `hairline`, `px-gutter`.

---

## 5. Layout

- 12-column grid inside `max-w-7xl`. Gutter `clamp(1rem, 4vw, 3.5rem)`.
- **Brutal margins and hairline rules** (`border-bone/10`) instead of boxes and shadows.
- **9:16 poster panels** are the primary image shape. The artwork is portrait, and so are Shorts, Reels and TikTok.
- Generous vertical rhythm: sections are `14–18vh` apart. Darkness *is* the layout.
- Must work at **375px with zero horizontal scroll** (an e2e test enforces it).

---

## 6. Texture

| Layer | Implementation | Notes |
|---|---|---|
| Smoke, ash, embers, light shaft, halo | `WorldCanvas` (OGL, `shaders/world.ts`) | persistent, re-graded, audio-reactive |
| Film grain | `.bt-grain`: SVG turbulence tile, `steps()` animation | opacity scales with grade `grain` |
| Vignette | `.bt-vignette` | always |
| Scanlines | `.bt-scanlines` | **DYSTOPIA only** (`--bt-scanlines`) |
| Static fallback | `.bt-world-fallback` / `.bt-smoke-css` | no WebGL, `/links`, before the canvas fades in |

The crown, throne and halo motifs are **subtle**: the faint halo ring in the shader and the monogram. Never clip-art crowns.

**Brand mark.** The official BT emblem (distressed metal, also the Instagram avatar) is the site mark: nav, entry sigil, footer, share images and favicon. It is rendered as a luminance mask, so it tints with the current grade and keeps its texture. The dripping monogram on the covers belongs to the artwork. Leave it there and don't reuse it as UI.

---

## 7. Motion principles

- **Slow and weighted.** `power4.inOut` / `--ease-weight` over `1.2–2.4s`. Nothing bounces, ever.
- **Glitch is rare and brief.** Bursts are ~200ms, 8–15s apart, plus audio kicks. **Never more than 3 flashes per second** (WCAG 2.3.1).
- **Flicker-in** headings stutter twice and then hold, like a failing fluorescent tube.
- **The world never freezes.** Route changes use a GSAP ash curtain, not the View Transitions API, because snapshots would freeze the canvas.
- **Every effect has a reduced-motion path** (see the catalog). Under `prefers-reduced-motion` the threshold, Lenis, glitch, flicker, burn and shader motion are all off, and the world renders a single still frame.

---

## 8. Effect catalog

| Effect | Where | Trigger | Key params | Reduced motion / fallback |
|---|---|---|---|---|
| **Threshold ritual** | `components/threshold` | first visit per session (inline head script sets `html[data-threshold]`) | type-on line, breathing sigil, ash burst on exit | never shown; no-JS visitors and crawlers skip it; `/links` skips it |
| **Ash world** | `components/world/WorldCanvas` | always | DPR × tier, 30–60fps, particles 360–1400 | single still frame; CSS fallback if no WebGL |
| **Audio reactivity** | `lib/audio-engine` → store → shader | teaser playing | low → turbulence + wordmark tremor; mid → shaft; high → embers; kick → ring + glitch | bands stay 0 |
| **World re-grading** | `GradeController` | `[data-grade-section]` crosses viewport centre | `@property` colour transitions 1.8s; uniform lerp | instant swap |
| **Ash-burn reveal** | `components/chapters/BurnReveal` | cover scrolls in (ScrollTrigger scrub) | fbm threshold, ember rim, sparks; at most ~2 live contexts | plain `<img>` |
| **Sealed slot** | `components/chapters/SealedSlot` | hover / focus / tap | cracked glass (seeded from slot id), static, "NOT YET.", rumble + burst | static panel, text still revealed |
| **Glitch** | `ui/GlitchText` | timer + audio kicks | RGB slice layers | off |
| **Flicker-in** | `ui/SectionHeading` | scroll into view (once) | per-char stutter | plain text |
| **Ash curtain** | `world/TransitionOverlay` | internal navigation | 0.75s in / 0.9s out | normal navigation |
| **Cursor** | `world/Cursor` | fine pointers | ember dot, ring → `[ ]` on targets, pushes smoke | native cursor |
| **HUD** | `world/Hud` | always (md+) | clock, era line scramble, depth | static text |

---

## 9. Sound design

- **Silence by default.** Sound only starts from a gesture: *enter with sound*, the SOUND toggle, or *hear a fragment*.
- **Teaser:** a 30s AAC fragment cut from the master by `pnpm media`. The loudest window is auto-picked, and **the artist approves the window before shipping**. The full WAV is never published.
- **Drone:** two detuned low saws plus brown noise through a slow lowpass LFO. Quiet (≈0.11 gain). It plays when the fragment ends.
- **Rumble:** a 62→31Hz sub thud when a sealed slot is touched (sound on only).
- **Spotify always wins.** When the embed plays, our audio ducks to zero. The embed is cross-origin, so the world can only "breathe" with it and cannot analyse it.

---

## 10. Sealed content rules

Unannounced releases **do not exist** in this codebase until reveal day.

- Before a reveal, a release is only an author-written `SealedSlot` (`label`, optional `hint`). It is never derived from the real title: no lengths, no initials, no anagrams, no palette.
- Art and audio for upcoming releases live only in gitignored `/assets`. `pnpm media` processes only public releases.
- `verify-sealed` fails the build if any denylisted term appears in `.next/` or `public/`. `pnpm verify:repo` does the same for every committable file.

---

## 11. Do / Don't

**Do**
- Let the artwork carry the page. The covers are the best design asset we have.
- Keep the text short and give it room around it.
- Make every CTA lead somewhere promotional: listen, pre-save, follow, share.
- Test at 375px and with reduced motion.

**Don't**
- Add clutter, carousels, popups or newsletter modals.
- Use blackletter, pentagram overload, gore, or clip-art crowns and skulls.
- Autoplay sound, or flash faster than 3 times per second.
- Hide the Spotify embed behind a custom player.
- Describe, hint at or name anything not yet announced, in code or in docs.
