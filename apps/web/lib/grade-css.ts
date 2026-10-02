import { DEFAULT_GRADE, grades } from "@black-throne/content/grades";
import type { Grade, MediaManifest } from "@black-throne/content/types";

function vars(g: Grade): string {
  return [
    `--bt-void:${g.void}`,
    `--bt-ash:${g.ash}`,
    `--bt-bone:${g.bone}`,
    `--bt-smoke:${g.smoke}`,
    `--bt-accent:${g.accent}`,
    `--bt-glow:${g.glow}`,
    `--bt-fog:${g.fog}`,
    `--bt-grain:${g.world.grain}`,
    `--bt-scanlines:${g.world.scanlines}`,
  ].join(";");
}

/**
 * One CSS rule per grade, generated from the single source of truth in packages/content,
 * plus the brand mark (mask source + intrinsic aspect ratio) from the media manifest.
 */
export function gradeCss(brand?: MediaManifest["brand"]): string {
  const rules = Object.values(grades).map((g) => `html[data-grade="${g.id}"]{${vars(g)}}`);
  const mark = brand?.monogram
    ? `--bt-monogram-src:url(${brand.monogram});${
        brand.width && brand.height ? `--bt-monogram-aspect:${brand.width} / ${brand.height};` : ""
      }`
    : "";
  return `:root{${mark}${vars(grades[DEFAULT_GRADE])}}${rules.join("")}`;
}
