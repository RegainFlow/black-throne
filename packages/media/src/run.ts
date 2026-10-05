/**
 * `pnpm media` — turns raw masters in /assets into web-ready files in apps/web/public.
 *
 * Only releases that exist in @black-throne/content are processed. Anything in public/media
 * without a matching release is deleted, so unannounced material can never ship by accident.
 */
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { copyFile, mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { eras, releases, site, slots } from "@black-throne/content/data";
import type {
  CoverMedia,
  MediaManifest,
  Release,
  ReleaseMedia,
  TeaserMedia,
  VeilMedia,
  VideoMedia,
} from "@black-throne/content/types";
import { findPlaceholders, validateContent } from "@black-throne/content/validate";
import ffmpegPath from "ffmpeg-static";
import sharp from "sharp";
import { loudestWindow, peaks, readWavInfo, rmsEnvelope } from "./audio";

const execFileAsync = promisify(execFile);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const ASSETS = join(ROOT, "assets");
const WEB = join(ROOT, "apps/web");
const PUBLIC_MEDIA = join(WEB, "public/media");
const PUBLIC_BRAND = join(WEB, "public/brand");
const MANIFEST = join(ROOT, "packages/content/src/generated/media-manifest.json");

/** Where the BT monogram sits on the 941×1672 source poster (fallback when no logo exists). */
const MONOGRAM_CROP = { left: 437, top: 1492, width: 72, height: 172 };

/** The official logo (assets/brand/logo.*, 1287×1536): emblem bounds, the round disc, mask levels. */
const LOGO = {
  crop: { left: 270, top: 225, width: 750, height: 1000 },
  disc: { left: 95, top: 222, width: 1096, height: 1096 },
  levels: [0.1, 0.36] as [number, number],
  region: [0.08, 0.15] as [number, number],
};

const log = (...args: unknown[]) => console.log("  ", ...args);
const fmtTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}`;

async function ffmpeg(args: string[]): Promise<string> {
  if (!ffmpegPath) throw new Error("ffmpeg-static binary not available");
  try {
    const { stderr } = await execFileAsync(
      ffmpegPath as unknown as string,
      ["-hide_banner", "-y", ...args],
      {
        maxBuffer: 32 * 1024 * 1024,
      },
    );
    return stderr;
  } catch (error) {
    const e = error as { stderr?: string };
    // `ffmpeg -i x` with no output exits non-zero but still prints the stream info we need.
    if (e.stderr) return e.stderr;
    throw error;
  }
}

/**
 * Renames a written output to `<name>.<content hash>.<ext>` and returns the new name. /media is
 * cached for a week (next.config.ts), so changed artwork must get a new URL or returning
 * visitors keep seeing the old file.
 */
async function fingerprint(dir: string, name: string): Promise<string> {
  const hash = createHash("sha256")
    .update(await readFile(join(dir, name)))
    .digest("hex")
    .slice(0, 10);
  const dot = name.lastIndexOf(".");
  const hashed = `${name.slice(0, dot)}.${hash}${name.slice(dot)}`;
  await rename(join(dir, name), join(dir, hashed));
  return hashed;
}

function findFile(dir: string, base: string, exts: string[]): string | undefined {
  for (const ext of exts) {
    const p = join(dir, `${base}.${ext}`);
    if (existsSync(p)) return p;
  }
  return undefined;
}

/* ---------------- covers ---------------- */

function hex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
}

async function palette(file: string): Promise<CoverMedia["palette"]> {
  const { data, info } = await sharp(file)
    .resize(48, 48, { fit: "inside" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const px: { r: number; g: number; b: number; l: number; s: number }[] = [];
  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i] ?? 0;
    const g = data[i + 1] ?? 0;
    const b = data[i + 2] ?? 0;
    const max = Math.max(r, g, b) / 255;
    const min = Math.min(r, g, b) / 255;
    const l = (max + min) / 2;
    const s = max === min ? 0 : (max - min) / (1 - Math.abs(2 * l - 1));
    px.push({ r, g, b, l, s });
  }
  const avg = (list: typeof px) => {
    const n = Math.max(1, list.length);
    return hex(
      list.reduce((a, p) => a + p.r, 0) / n,
      list.reduce((a, p) => a + p.g, 0) / n,
      list.reduce((a, p) => a + p.b, 0) / n,
    );
  };
  const byLight = [...px].sort((a, b) => a.l - b.l);
  const accentPool = [...px]
    .filter((p) => p.l > 0.2 && p.l < 0.85)
    .sort((a, b) => b.s * b.l - a.s * a.l)
    .slice(0, Math.max(4, Math.floor(px.length * 0.04)));
  return {
    dominant: avg(byLight.slice(Math.floor(px.length * 0.3), Math.floor(px.length * 0.8))),
    accent: avg(accentPool),
    dark: avg(byLight.slice(0, Math.floor(px.length * 0.15))),
  };
}

async function processCover(release: Release, outDir: string): Promise<CoverMedia | undefined> {
  const src = findFile(join(ASSETS, release.slug), "cover", ["png", "jpg", "jpeg", "webp"]);
  if (!src) {
    log(`! no cover in assets/${release.slug}/ — skipping`);
    return undefined;
  }
  const meta = await sharp(src).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  const widths = [...new Set([360, 640, width].filter((w) => w <= width))].sort((a, b) => a - b);
  const url = (name: string) => `/media/${release.slug}/${name}`;

  const avif: string[] = [];
  const webp: string[] = [];
  let largest = "";
  for (const w of widths) {
    await sharp(src)
      .resize({ width: w })
      .avif({ quality: 55, effort: 5 })
      .toFile(join(outDir, `cover-${w}.avif`));
    await sharp(src)
      .resize({ width: w })
      .webp({ quality: 80 })
      .toFile(join(outDir, `cover-${w}.webp`));
    avif.push(`${url(await fingerprint(outDir, `cover-${w}.avif`))} ${w}w`);
    largest = await fingerprint(outDir, `cover-${w}.webp`);
    webp.push(`${url(largest)} ${w}w`);
  }
  await sharp(src)
    .resize({ height: 1260, withoutEnlargement: true })
    .jpeg({ quality: 84, mozjpeg: true })
    .toFile(join(outDir, "og.jpg"));
  const og = await fingerprint(outDir, "og.jpg");
  const blur = await sharp(src).resize({ width: 12 }).webp({ quality: 40 }).toBuffer();
  const pal = await palette(src);
  log(`cover ${width}×${height} → ${widths.join("/")}w · palette ${JSON.stringify(pal)}`);

  return {
    width,
    height,
    avif: avif.join(", "),
    webp: webp.join(", "),
    src: url(largest),
    og: url(og),
    blurDataURL: `data:image/webp;base64,${blur.toString("base64")}`,
    palette: pal,
  };
}

/* ---------------- teaser ---------------- */

async function processTeaser(release: Release, outDir: string): Promise<TeaserMedia | undefined> {
  if (!release.teaser) return undefined;
  const src = join(ASSETS, release.slug, "master.wav");
  if (!existsSync(src)) {
    log(`! teaser requested but assets/${release.slug}/master.wav is missing`);
    return undefined;
  }
  const buf = await readFile(src);
  const info = readWavInfo(buf);
  const { duration } = release.teaser;
  const window =
    release.teaser.start === "auto"
      ? loudestWindow(rmsEnvelope(buf, info, 0.5), 0.5, duration)
      : { start: release.teaser.start, end: release.teaser.start + duration };
  const fade = 1.5;
  await ffmpeg([
    "-ss",
    window.start.toFixed(3),
    "-t",
    duration.toFixed(3),
    "-i",
    src,
    "-af",
    `afade=t=in:st=0:d=${fade},afade=t=out:st=${(duration - fade).toFixed(3)}:d=${fade}`,
    "-c:a",
    "aac",
    "-b:a",
    "160k",
    "-movflags",
    "+faststart",
    join(outDir, "teaser.m4a"),
  ]);
  const file = await fingerprint(outDir, "teaser.m4a");
  log(
    `teaser ${fmtTime(window.start)} → ${fmtTime(window.end)} of ${fmtTime(info.duration)} ` +
      `(${release.teaser.start === "auto" ? "auto-picked loudest window" : "manual"}) — get the artist's OK before shipping`,
  );
  return {
    src: `/media/${release.slug}/${file}`,
    start: Math.round(window.start * 10) / 10,
    end: Math.round(window.end * 10) / 10,
    duration,
    peaks: peaks(buf, info, window.start, window.end),
  };
}

/* ---------------- videos ---------------- */

async function processVideos(release: Release, outDir: string): Promise<VideoMedia[] | undefined> {
  if (!release.videos?.length) return undefined;
  const out: VideoMedia[] = [];
  for (const v of release.videos) {
    const base: VideoMedia = {
      id: v.id,
      title: v.title,
      youtubeId: v.youtubeId,
      orientation: v.orientation,
      width: v.orientation === "portrait" ? 1080 : 1920,
      height: v.orientation === "portrait" ? 1920 : 1080,
    };
    if (v.file) {
      const src = join(ASSETS, release.slug, v.file);
      if (!existsSync(src)) {
        log(`! video ${v.file} missing — skipping`);
        continue;
      }
      const probe = await ffmpeg(["-i", src]);
      const dims = /Video:.*?(\d{2,5})x(\d{2,5})/.exec(probe);
      if (dims) {
        base.width = Number(dims[1]);
        base.height = Number(dims[2]);
      }
      await copyFile(src, join(outDir, `${v.id}.mp4`));
      await ffmpeg([
        "-ss",
        "1",
        "-i",
        src,
        "-frames:v",
        "1",
        "-vf",
        "scale=720:-2",
        "-q:v",
        "3",
        join(outDir, `${v.id}-poster.jpg`),
      ]);
      await ffmpeg([
        "-t",
        "6",
        "-i",
        src,
        "-an",
        "-vf",
        "scale=360:-2,fps=24",
        "-c:v",
        "libx264",
        "-preset",
        "slow",
        "-crf",
        "30",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        join(outDir, `${v.id}-preview.mp4`),
      ]);
      base.src = `/media/${release.slug}/${await fingerprint(outDir, `${v.id}.mp4`)}`;
      base.poster = `/media/${release.slug}/${await fingerprint(outDir, `${v.id}-poster.jpg`)}`;
      base.preview = `/media/${release.slug}/${await fingerprint(outDir, `${v.id}-preview.mp4`)}`;
      log(`video ${v.id} ${base.width}×${base.height}`);
    }
    out.push(base);
  }
  return out;
}

/* ---------------- brand ---------------- */

async function writeIcons(source: sharp.Sharp) {
  for (const [name, size] of [
    ["icon.png", 512],
    ["apple-icon.png", 180],
  ] as const) {
    await source
      .clone()
      .resize(size, size, { fit: "cover" })
      .png()
      .toFile(join(WEB, "app", name));
  }
}

/** Luminance → alpha (white RGB), so the mark can be tinted with CSS mask / currentColor. */
function lumaToAlpha(
  luma: Buffer,
  width: number,
  height: number,
  alphaAt: (i: number, l: number) => number,
): Buffer {
  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const a = Math.min(1, Math.max(0, alphaAt(i, (luma[i] ?? 0) / 255)));
    rgba.writeUInt32BE((0xffffff00 | Math.round(a * 255)) >>> 0, i * 4);
  }
  return rgba;
}

const levels = (v: number, lo: number, hi: number) =>
  Math.min(1, Math.max(0, (v - lo) / (hi - lo)));

async function processBrand(): Promise<MediaManifest["brand"]> {
  await mkdir(PUBLIC_BRAND, { recursive: true });
  for (const stale of ["monogram.png", "monogram.svg"]) {
    await rm(join(PUBLIC_BRAND, stale), { force: true });
  }

  // 1. A vector logo always wins.
  const svg = join(ASSETS, "brand/monogram.svg");
  if (existsSync(svg)) {
    await copyFile(svg, join(PUBLIC_BRAND, "monogram.svg"));
    log("brand: vector monogram.svg");
    return { monogram: "/brand/monogram.svg" };
  }

  // 2. The official BT logo (raster): isolate the emblem, keep its distressed texture.
  const logo = findFile(join(ASSETS, "brand"), "logo", ["png", "jpg", "jpeg", "webp"]);
  if (logo) {
    const base = sharp(logo).extract(LOGO.crop).greyscale();
    const { data, info } = await base.clone().raw().toBuffer({ resolveWithObject: true });
    const { data: blurred } = await base
      .clone()
      .blur(5)
      .raw()
      .toBuffer({ resolveWithObject: true });
    const rgba = lumaToAlpha(data, info.width, info.height, (i, l) => {
      // texture levels × a soft region mask that drops the speckled background disc
      return levels(l, ...LOGO.levels) * levels((blurred[i] ?? 0) / 255, ...LOGO.region);
    });
    const { data: png, info: out } = await sharp(rgba, {
      raw: { width: info.width, height: info.height, channels: 4 },
    })
      .trim({ threshold: 4 })
      .resize({ height: 900, withoutEnlargement: true })
      .png()
      .toBuffer({ resolveWithObject: true });
    await writeFile(join(PUBLIC_BRAND, "monogram.png"), png);
    // App icons: the logo as-is (it is the Instagram avatar), lifted slightly for small sizes.
    await writeIcons(sharp(logo).extract(LOGO.disc).modulate({ brightness: 1.3 }));
    log(`brand: official logo → mask ${out.width}×${out.height} + app icons`);
    return { monogram: "/brand/monogram.png", width: out.width, height: out.height };
  }

  // 3. Fallback: the dripping monogram cropped from a poster.
  const src = join(ASSETS, "brand/monogram-source.png");
  if (!existsSync(src)) {
    log("! no assets/brand/logo.* , monogram.svg or monogram-source.png — skipping brand");
    return undefined;
  }
  const scale = 4;
  const { data, info } = await sharp(src)
    .extract(MONOGRAM_CROP)
    .greyscale()
    .resize({ width: MONOGRAM_CROP.width * scale, kernel: "lanczos3" })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const rgba = lumaToAlpha(data, info.width, info.height, (_i, l) => levels(l, 0.2, 0.72) ** 0.85);
  await sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toFile(join(PUBLIC_BRAND, "monogram.png"));
  const glyph = await sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } })
    .extract({ left: 0, top: 0, width: info.width, height: Math.round(info.height * 0.58) })
    .resize({ height: 430 })
    .tint("#e2d6c2")
    .png()
    .toBuffer();
  await writeIcons(
    sharp({ create: { width: 512, height: 512, channels: 4, background: "#070505" } }).composite([
      { input: glyph, gravity: "center" },
    ]),
  );
  log(`brand: poster monogram mask ${info.width}×${info.height} + app icons`);
  return { monogram: "/brand/monogram.png", width: info.width, height: info.height };
}

/* ---------------- veils (blurred teasers for sealed slots) ---------------- */

/**
 * A veiled slot gets a still so blurred that only light and silhouette survive: the bottom
 * title band is cropped away, the frame is shrunk to ~32px and smeared back up. Sources live
 * in assets/sealed/<slot-id>.* so no real title appears in code or filenames.
 */
async function processVeils(): Promise<Record<string, VeilMedia>> {
  const outDir = join(PUBLIC_MEDIA, "sealed");
  await rm(outDir, { recursive: true, force: true });
  const veiled = slots.filter((s) => s.veil);
  if (!veiled.length) return {};
  await mkdir(outDir, { recursive: true });
  const out: Record<string, VeilMedia> = {};
  for (const slot of veiled) {
    const dir = join(ASSETS, "sealed");
    const image = findFile(dir, slot.id, ["png", "jpg", "jpeg", "webp"]);
    const video = findFile(dir, slot.id, ["mp4", "mov", "webm"]);
    let still: Buffer | undefined;
    if (image) still = await readFile(image);
    else if (video) {
      const frame = join(outDir, `${slot.id}.frame.png`);
      await ffmpeg(["-ss", String(slot.veil?.at ?? 1), "-i", video, "-frames:v", "1", frame]);
      still = await readFile(frame);
      await rm(frame, { force: true });
    }
    if (!still) {
      log(`! veil for ${slot.id}: no assets/sealed/${slot.id}.* — slot renders without an image`);
      continue;
    }
    const meta = await sharp(still).metadata();
    const w = meta.width ?? 0;
    const h = meta.height ?? 0;
    const kept = Math.round(h * (slot.veil?.keep ?? 0.78)); // drop title bands / captions
    const width = 360;
    const height = Math.round((width * kept) / w);
    const tiny = await sharp(still)
      .extract({ left: 0, top: 0, width: w, height: kept })
      .resize({ width: 32 })
      .toBuffer();
    await sharp(tiny)
      .resize({ width, height, kernel: "cubic" })
      .blur(6)
      .modulate({ brightness: 0.8, saturation: 0.85 })
      .webp({ quality: 60 })
      .toFile(join(outDir, `${slot.id}.webp`));
    const file = await fingerprint(outDir, `${slot.id}.webp`);
    out[slot.id] = { src: `/media/sealed/${file}`, width, height };
    log(
      `veil ${slot.id}: ${image ? "image" : `video frame @${slot.veil?.at ?? 1}s`} → ${width}×${height} (blurred)`,
    );
  }
  return out;
}

/* ---------------- main ---------------- */

async function main() {
  validateContent({ site, eras, releases, slots });
  console.log("black throne · media");

  await mkdir(PUBLIC_MEDIA, { recursive: true });
  const keep = new Set([...releases.map((r) => r.slug), "sealed"]);
  for (const entry of await readdir(PUBLIC_MEDIA, { withFileTypes: true })) {
    if (!keep.has(entry.name)) {
      await rm(join(PUBLIC_MEDIA, entry.name), { recursive: true, force: true });
      log(`removed public/media/${entry.name} (no public release)`);
    }
  }

  const manifest: MediaManifest = { releases: {} };
  manifest.brand = await processBrand();
  console.log("\nveils");
  manifest.veils = await processVeils();

  for (const release of releases) {
    console.log(`\n${release.slug}`);
    const outDir = join(PUBLIC_MEDIA, release.slug);
    await rm(outDir, { recursive: true, force: true });
    await mkdir(outDir, { recursive: true });
    const media: ReleaseMedia = {};
    media.cover = await processCover(release, outDir);
    media.teaser = await processTeaser(release, outDir);
    media.videos = await processVideos(release, outDir);
    manifest.releases[release.slug] = JSON.parse(JSON.stringify(media));
  }

  await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`\nmanifest → ${MANIFEST.replace(ROOT, ".")}`);

  const todo = findPlaceholders({ site, releases });
  if (todo.length) console.log(`\nstill placeholder:\n  - ${todo.join("\n  - ")}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
