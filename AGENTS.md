# AGENTS.md — Black Throne

Guide for coding agents and contributors. Read this first. For the visual language, see [`DESIGN.md`](./DESIGN.md).

## What this is

A **promotional** website for the metal artist **Black Throne**. It is a cinematic, dark "world" where each album is a chapter. It drives people to Spotify, YouTube, Instagram and TikTok. It sells nothing.

Releases are revealed in stages. **Unannounced material must never reach a build, a deploy or git.** That rule beats every other consideration here. See [Guardrails](#guardrails).

## Stack

| | |
|---|---|
| Monorepo | pnpm **11** workspaces + Turborepo **2** (`packageManager: pnpm@11.9.0`) |
| Runtime | Node **24 LTS** (`.nvmrc`; `engines.node >= 24`) |
| App | Next.js **16.3** App Router, React **19.2**, Turbopack, TypeScript strict |
| Styling | Tailwind CSS **v4** (CSS-first tokens in `apps/web/app/globals.css`) |
| Motion | GSAP 3 (ScrollTrigger, SplitText, `@gsap/react`), Lenis |
| WebGL | OGL (raw GLSL in `apps/web/shaders/`) |
| State | `zustand/vanilla` world store (read in rAF loops, not React) |
| Audio | Web Audio API (`apps/web/lib/audio-engine.ts`) |
| Music | Spotify **iFrame API embed only**. No Web API: client-credentials metadata endpoints were removed from dev mode in Feb 2026. |
| Analytics | `@vercel/analytics` (custom `outbound` events need Vercel Pro), `@vercel/speed-insights` |
| Quality | Biome (lint + format), Vitest, Playwright |

**Next.js 16 has breaking changes versus most training data.** Before writing Next code, read the bundled docs at `apps/web/node_modules/next/dist/docs/` (see `apps/web/AGENTS.md`, which `next dev` regenerates). Examples: `params` is a `Promise`, `LayoutProps`/`PageProps` are global generated types (`next typegen`), and `<Link onNavigate>` exists.

## Commands (run from the repo root)

| Command | What it does |
|---|---|
| `pnpm install` | install (pnpm 11 `allowBuilds` covers sharp / ffmpeg-static / esbuild) |
| `pnpm dev` | Next dev server (apps/web) |
| `pnpm build` | production build **plus the sealed-leak check** |
| `pnpm start` | serve the production build |
| `pnpm lint` / `pnpm format` | Biome check / write |
| `pnpm typecheck` | `next typegen && tsc` (web) + `tsc` (packages) |
| `pnpm test` | Vitest across packages |
| `pnpm test:e2e` | Playwright against `next start` (run `pnpm build` first) |
| `pnpm media` | process `/assets` → `apps/web/public/media` + manifest |
| `pnpm verify:sealed` | scan `.next/` + `public/` for upcoming titles |
| `pnpm verify:repo` | scan every committable file for upcoming titles: **run before committing** |

## Repo map

```
AGENTS.md  DESIGN.md  CLAUDE.md (→ @AGENTS.md)
assets/                     RAW MASTERS — gitignored. One folder per slug (cover.png, master.wav, clips),
                            plus assets/brand/ (monogram-source.png until a vector logo exists).
sealed.local.json           GITIGNORED denylist of upcoming titles/slugs (see Guardrails).
packages/
  content/                  Source of truth for the world.
    src/data/{site,eras,releases,slots}.ts   ← edit content here
    src/grades.ts           colour grades (client-safe)
    src/state.ts            release phase / countdown (client-safe, pure)
    src/validate.ts         zod validation + placeholder report
    src/index.ts            `server-only` public API: getSite/getEras/getReleases/getChapters/…
    src/generated/media-manifest.json        written by `pnpm media` — do not hand-edit
  media/                    `pnpm media` pipeline (sharp + ffmpeg-static)
  typescript-config/        shared tsconfig
apps/web/
  app/layout.tsx            lean root: fonts, grade tokens, pre-paint threshold script — no client world
  app/(world)/              the cinematic group: layout mounts WorldShell + Threshold; / and /chapters/[slug]
  app/links, app/not-found  lean pages (StaticBackdrop, plain next/link) — no WebGL/GSAP/Lenis
  app/                      also: OG images · sitemap · robots · manifest
  components/world/         persistent layer: WorldCanvas, GradeController, Hud, Cursor, SmoothScroll, TransitionOverlay
  components/threshold/     entry ritual + its inline pre-paint script
  components/sections/      home sections (Hero, Latest, Chapters, Listen, Visions, Signals, Footer)
  components/chapters/      BurnReveal, ReleaseCard, SealedSlot
  components/media/         SpotifyEmbed/Player, TeaserPlayer, VideoCard, ReleaseStatus/Ctas
  components/ui/            primitives (GlitchText, SectionHeading, Cta, TransitionLink, Monogram, …)
  lib/                      world-store, audio-engine, spotify, analytics, og, jsonld, grade-css, site-url
  shaders/                  GLSL (world smoke/particles, burn dissolve)
  scripts/verify-sealed.mjs leak check (build + --repo modes)
  e2e/                      Playwright specs
```

## Content workflow

All content is typed data in `packages/content/src/data/`. It is validated on import, and a bad edit fails the build with a readable error.

- **Links / copy:** `site.ts`. Socials marked `placeholder: true` are hidden on the site and make production builds print a warning until they are replaced.
- **Eras (chapters):** `eras.ts`. `title: null` renders a redaction bar.
- **Releases:** `releases.ts`. Only announced or released items. Fields: dates (`YYYY-MM-DD` = local midnight), `spotify`, `presaveUrl`, `tracks`, `teaser`, `videos`, `grade`, `position`.
- **Sealed slots:** `slots.ts`. Cryptic placeholders. Slots with `kind: "transmission"` are upcoming videos, shown first in Visions.
- **Veiled slots (an artist-approved tease):** add `veil: {}` (or `veil: { at, keep }` for a video frame) to a slot, and put the source in gitignored `assets/sealed/<slot-id>.*`. `pnpm media` keeps only the top `keep` of the frame (dropping title bands and captions), shrinks it to ~32px and blurs it into `public/media/sealed/<slot-id>.webp`. **Always look at the output.** No text may be legible, and the filename is the neutral slot id. On reveal day, delete the slot and its `assets/sealed/` source.

### Reveal playbook (announce day)

1. Add the full `Release` record to `releases.ts`, and remove the `SealedSlot` it replaces.
2. Remove its title, slug and filenames from `sealed.local.json` **and** from `SEALED_TERMS` on Vercel.
3. Fill in `announceDate`/`releaseDate`, plus `presaveUrl` or `spotify`.
4. Make sure its masters are in `assets/<slug>/`, then run `pnpm media`. Check the printed palette (add a grade in `grades.ts` + `DESIGN.md`) and the teaser window (**get the artist's OK**).
5. Run `pnpm build` (the leak check must pass), `pnpm test:e2e` and `pnpm verify:repo`.
6. Deploy. The page, OG image, sitemap entry and chapter slot all update together.

When the album is announced, give the era its `title` in `eras.ts`.

### Media pipeline (`pnpm media`)

- **Covers** → AVIF + WebP at up to 3 widths, a blur placeholder, an **OG JPEG** (Satori can't decode AVIF/WebP), and a palette. They are rendered with `<picture>` (`CoverPicture`). **Don't use `next/image`**, because it would optimise them twice.
- **Teaser** → the loudest 30s window of `master.wav` (or `teaser.start`), as AAC with fades, plus waveform peaks. **The full WAV is never published.**
- **Videos** → original MP4 (already faststart), a poster, and a 6s muted preview loop.
- **Brand** → a tintable mask (`public/brand/monogram.png`, with its size in the manifest) + `app/icon.png` / `apple-icon.png`. Source precedence: `assets/brand/monogram.svg` (vector), then `assets/brand/logo.*` (the official logo; crop and levels in `LOGO` in `packages/media/src/run.ts`), then the poster crop fallback.
- Outputs are committed, so Vercel never needs ffmpeg or the masters.

## Guardrails

1. **Never write an unannounced title, slug or song name anywhere in the repo**: code, tests, comments, docs, commit messages or branch names. It may only appear in gitignored `sealed.local.json` and `/assets`. Run `pnpm verify:repo` before every commit.
2. **Never commit `/assets`** (masters, unreleased art, a 50 MB+ WAV).
3. **Never publish the full master WAV.** Only the approved teaser fragment ships.
4. **Never import `@black-throne/content` (the server-only index) into a client component.** Pass serialisable props down from server components. Client code may import `@black-throne/content/{types,grades,state}`.
5. **Every visual effect needs a `prefers-reduced-motion` path** and must respect the performance budgets below. No flashing above 3 per second.
6. **The Spotify embed stays visible.** Style the frame around it. Don't build a hidden or custom player on top. Don't use the Spotify Web API.
7. **The wordmark stays server-rendered text** (the LCP). WebGL loads after first paint via `next/dynamic({ ssr: false })`.
8. Keep `apps/web`'s `build` script as `next build && node scripts/verify-sealed.mjs`. Vercel runs the app's script directly, not the root turbo pipeline.

## Code conventions

- Server components by default, with `"use client"` only at the leaves that need it.
- High-frequency state (audio bands, pointer, scroll) lives in the `world` store and is read in rAF loops. Don't put it in React state.
- Time-dependent UI (countdowns, "out now") is computed **after mount** so hydration stays stable.
- Shaders are GLSL ES 1.0 strings in `shaders/`. One persistent WebGL context for the world. Per-image contexts (BurnReveal) must mount and unmount with visibility.
- **Never call `loseContext()` on a canvas that React may remount** (StrictMode remounts in dev).
- Don't put `em` letter-spacing on a parent of differently sized text. Put the tracking on the sized element.
- Component CSS goes in `@layer components`, so Tailwind utilities (`hidden`, `md:*`) can override it.
- Pages that need the world go under `app/(world)/`. Lean pages outside it use `StaticBackdrop` and plain `next/link`. `TransitionLink` falls back to normal navigation when no overlay is mounted.
- Env vars a build reads must be declared in `turbo.json` → `tasks.build.env`. Turbo 2 runs in strict env mode, and an undeclared var is silently `undefined`: `VERCEL` gates analytics, and `VERCEL_PROJECT_PRODUCTION_URL` drives canonical/OG/sitemap URLs.
- Follow Biome. `biome-ignore` comments need a reason.

## Performance budgets

- Hero text LCP < 2.0s on mobile. CLS ≈ 0.
- Initial route JS ≈ 180 KB gz or less, excluding the lazy WebGL chunk.
- World canvas: DPR ≤ 1.5 × tier factor, 30fps on low tier, paused when the tab is hidden.
- `/links` has no WebGL and must stay instant (it's the IG/TikTok bio link).

## Verification checklist (before calling something done)

1. `pnpm lint && pnpm typecheck && pnpm test`
2. `pnpm build`: leak check clean, placeholder warnings reviewed.
3. `pnpm test:e2e`: covers no-JS wordmark, threshold behaviour, 404 for unknown/sealed slugs, `/links`, JSON-LD/OG, no overflow at 375px, no first-party console errors.
4. Look at it: desktop 1440 and mobile 375, with and without reduced motion.
5. `pnpm verify:repo` before committing.

## Deploying (Vercel)

- Project root: `apps/web` (framework: Next.js). Install from the monorepo root with pnpm. Turborepo is detected.
- Env vars: `NEXT_PUBLIC_SITE_URL` (canonical origin; falls back to the Vercel production domain) and `SEALED_TERMS` (the denylist, comma-separated, **production + preview**). See `.env.example`.
- Enable Web Analytics + Speed Insights in the Vercel dashboard. Custom outbound events need the Pro plan.

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
