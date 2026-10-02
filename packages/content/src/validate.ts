import { z } from "zod";
import { grades } from "./grades";
import type { Era, Release, SealedSlot, Site } from "./types";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}(T.+)?$/, "expected YYYY-MM-DD or ISO datetime")
  .refine((v) => !Number.isNaN(new Date(v).getTime()), "unparseable date");
const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "slug must be kebab-case");
const gradeId = z.enum(Object.keys(grades) as [keyof typeof grades, ...(keyof typeof grades)[]]);
const eraId = z.enum(["dystopia", "ii"]);
const spotifyUri = (kind: string) =>
  z.string().regex(new RegExp(`^spotify:${kind}:[A-Za-z0-9]{22}$`), `expected spotify:${kind}:…`);

const releaseSchema = z.object({
  slug,
  eraId,
  kind: z.enum(["single", "album"]),
  title: z.string().min(1),
  visibility: z.enum(["announced", "released"]),
  announceDate: isoDate.optional(),
  releaseDate: isoDate.optional(),
  spotify: z.object({ uri: spotifyUri("(album|track)"), url: z.url() }).optional(),
  presaveUrl: z.url().optional(),
  tracks: z
    .array(
      z.object({
        title: z.string().min(1),
        uri: spotifyUri("track"),
        durationMs: z.number().int().positive(),
      }),
    )
    .optional(),
  teaser: z
    .object({
      start: z.union([z.literal("auto"), z.number().nonnegative()]),
      duration: z.number().min(5).max(60),
    })
    .optional(),
  videos: z
    .array(
      z
        .object({
          id: slug,
          title: z.string().min(1),
          file: z.string().optional(),
          youtubeId: z.string().optional(),
          orientation: z.enum(["portrait", "landscape"]),
        })
        .refine((v) => v.file || v.youtubeId, "video needs a file or a youtubeId"),
    )
    .optional(),
  grade: gradeId,
  position: z.number().int().positive(),
  epigraph: z.string().optional(),
});

const eraSchema = z.object({
  id: eraId,
  numeral: z.string().min(1),
  title: z.string().nullable(),
  grade: gradeId,
  hud: z.array(z.string()),
});

const slotSchema = z.object({
  id: slug,
  eraId,
  kind: z.enum(["single", "album", "transmission"]),
  position: z.number().int().positive(),
  label: z.string().min(1),
  hint: z.string().optional(),
});

/** Throws a readable error if the content is inconsistent. Run in tests and by `pnpm media`. */
export function validateContent(input: {
  site: Site;
  eras: Era[];
  releases: Release[];
  slots: SealedSlot[];
}): void {
  const problems: string[] = [];
  const collect = (label: string, result: { success: boolean; error?: z.ZodError }) => {
    if (!result.success && result.error) {
      for (const issue of result.error.issues) {
        problems.push(`${label}.${issue.path.join(".")}: ${issue.message}`);
      }
    }
  };

  for (const [i, e] of input.eras.entries()) collect(`eras[${i}]`, eraSchema.safeParse(e));
  for (const [i, r] of input.releases.entries()) {
    collect(`releases[${r.slug ?? i}]`, releaseSchema.safeParse(r));
  }
  for (const [i, s] of input.slots.entries())
    collect(`slots[${s.id ?? i}]`, slotSchema.safeParse(s));

  const slugs = input.releases.map((r) => r.slug);
  for (const dupe of slugs.filter((s, i) => slugs.indexOf(s) !== i)) {
    problems.push(`duplicate release slug: ${dupe}`);
  }
  const eraIds = new Set(input.eras.map((e) => e.id));
  for (const r of input.releases) {
    if (!eraIds.has(r.eraId)) problems.push(`release ${r.slug} references unknown era ${r.eraId}`);
  }

  if (problems.length > 0) {
    throw new Error(`Invalid Black Throne content:\n  - ${problems.join("\n  - ")}`);
  }
}

/** Human-readable list of placeholders still in the content (the build warns about these). */
export function findPlaceholders(input: { site: Site; releases: Release[] }): string[] {
  const out = input.site.socials
    .filter((s) => s.placeholder)
    .map((s) => `${s.label} URL is a placeholder`);
  for (const r of input.releases) {
    if (r.visibility === "announced" && !r.releaseDate) out.push(`${r.title}: no releaseDate yet`);
    if (r.visibility === "announced" && !r.presaveUrl) out.push(`${r.title}: no presaveUrl yet`);
    if (r.visibility === "released" && !r.spotify)
      out.push(`${r.title}: out, but no Spotify link yet`);
  }
  return out;
}
