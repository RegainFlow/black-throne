#!/usr/bin/env node
/**
 * Sealed-leak check.
 *
 * Default: runs after `next build` (chained in this app's own `build` script so it also runs on
 * Vercel). Scans the build output and /public for any upcoming title, slug or filename and fails
 * the build on a hit.
 *
 * `--repo`: scans every tracked or committable source file instead — run it before committing.
 *
 * The denylist is never committed. It comes from:
 *   - `sealed.local.json` at the repo root (gitignored) → { "terms": ["…"] }, or
 *   - the `SEALED_TERMS` env var (comma/newline separated) — set this on Vercel.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const APP = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ROOT = resolve(APP, "../..");
const BUILD_TEXT =
  /\.(html?|js|mjs|cjs|json|rsc|txt|css|map|xml|body|meta|svg|webmanifest|segments)$/i;
const SOURCE_TEXT = /\.(tsx?|mjs|cjs|jsx?|json|mdx?|css|ya?ml|txt|html|svg|xml|env\.example)$/i;
const SKIP_DIRS = new Set(["cache", "node_modules", "trace"]);
// `next dev` output lives in .next/dev and is never deployed.
const SKIP_PATHS = new Set([join(APP, ".next", "dev")]);
const MAX_BYTES = 20 * 1024 * 1024;

function loadTerms() {
  const terms = new Set();
  const local = join(ROOT, "sealed.local.json");
  if (existsSync(local)) {
    for (const t of JSON.parse(readFileSync(local, "utf8")).terms ?? []) terms.add(String(t));
  }
  for (const t of (process.env.SEALED_TERMS ?? "").split(/[,\n]/)) {
    if (t.trim()) terms.add(t.trim());
  }
  return [...terms].filter((t) => t.length >= 4);
}

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name) && !SKIP_PATHS.has(full)) yield* walk(full);
    } else {
      yield full;
    }
  }
}

const repoMode = process.argv.includes("--repo");
const terms = loadTerms();
if (terms.length === 0) {
  console.warn(
    "⚠  verify-sealed: no denylist configured (sealed.local.json or SEALED_TERMS). Skipping leak check.",
  );
  process.exit(0);
}

const needles = terms.map((t) => ({ term: t, lower: t.toLowerCase() }));
const hits = [];
let scanned = 0;

function check(file, rel, readBody) {
  const name = rel.toLowerCase();
  for (const n of needles) {
    if (name.includes(n.lower)) hits.push(`${rel} (filename contains "${n.term}")`);
  }
  if (!readBody || statSync(file).size > MAX_BYTES) return;
  scanned++;
  const body = readFileSync(file, "utf8").toLowerCase();
  for (const n of needles) {
    if (body.includes(n.lower)) hits.push(`${rel} (contains "${n.term}")`);
  }
}

if (repoMode) {
  // Tracked + untracked-but-not-ignored: everything that could end up in git.
  const listed = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  for (const rel of listed.split("\n").filter(Boolean)) {
    const file = join(ROOT, rel);
    if (existsSync(file)) check(file, rel, SOURCE_TEXT.test(rel));
  }
} else {
  for (const base of [join(APP, ".next"), join(APP, "public")]) {
    if (!existsSync(base)) continue;
    for (const file of walk(base)) {
      check(file, relative(APP, file).split("\\").join("/"), BUILD_TEXT.test(file));
    }
  }
}

const where = repoMode ? "repo" : "build";
if (hits.length) {
  console.error(
    `\n✖ verify-sealed: unannounced material found in the ${where} (${hits.length} hit(s)):`,
  );
  for (const h of [...new Set(hits)].slice(0, 40)) console.error(`   - ${h}`);
  console.error("\nRemove it, or — if it has been announced — drop its terms from the denylist.\n");
  process.exit(1);
}
console.log(
  `✓ verify-sealed (${where}): ${scanned} files scanned against ${terms.length} sealed terms — clean.`,
);
