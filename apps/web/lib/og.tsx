import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getBrandMedia } from "@black-throne/content";
import { grades } from "@black-throne/content/grades";
import type { GradeId } from "@black-throne/content/types";
import { ImageResponse } from "next/og";

export const ogSize = { width: 1200, height: 630 };

const fontDir = join(process.cwd(), "app/_og");

async function asset(path: string) {
  return readFile(join(process.cwd(), "public", path));
}

/** Shared share-card renderer: wordmark + title on the left, cover art on the right. */
export async function renderOg({
  title,
  kicker,
  line,
  grade,
  cover,
}: {
  title: string;
  kicker: string;
  line: string;
  grade: GradeId;
  /** Path inside /public to a JPEG/PNG (Satori cannot decode AVIF/WebP). */
  cover?: { path: string; width: number; height: number };
}) {
  const g = grades[grade];
  const brand = getBrandMedia();
  const markH = 72;
  const markW =
    brand?.width && brand.height ? Math.round((markH * brand.width) / brand.height) : 30;
  const markType = brand?.monogram?.endsWith(".svg") ? "image/svg+xml" : "image/png";
  const [cinzel, mono, monogram, coverBuf] = await Promise.all([
    readFile(join(fontDir, "Cinzel-500.ttf")),
    readFile(join(fontDir, "IBMPlexMono-400.ttf")),
    brand?.monogram ? asset(brand.monogram.slice(1)).catch(() => undefined) : undefined,
    cover ? asset(cover.path) : Promise.resolve(undefined),
  ]);
  const coverW = cover ? Math.round((ogSize.height * cover.width) / cover.height) : 0;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: `radial-gradient(80% 90% at 30% 110%, ${g.fog} 0%, ${g.void} 70%)`,
        color: g.bone,
      }}
    >
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {monogram && (
            // biome-ignore lint/performance/noImgElement: Satori renders plain <img>
            <img
              alt=""
              src={`data:${markType};base64,${monogram.toString("base64")}`}
              height={markH}
              width={markW}
              style={{ opacity: 0.8 }}
            />
          )}
          <div
            style={{ fontFamily: "Cinzel", fontSize: 26, letterSpacing: 9, whiteSpace: "nowrap" }}
          >
            BLACK THRONE
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ fontFamily: "Plex", fontSize: 20, letterSpacing: 4, color: g.accent }}>
            {kicker}
          </div>
          <div
            style={{
              fontFamily: "Cinzel",
              fontSize: title.length > 14 ? 64 : 84,
              letterSpacing: 10,
              lineHeight: 1.05,
            }}
          >
            {title}
          </div>
          <div style={{ fontFamily: "Plex", fontSize: 22, letterSpacing: 3, color: g.smoke }}>
            {line}
          </div>
        </div>
      </div>
      {coverBuf && cover && (
        // biome-ignore lint/performance/noImgElement: Satori renders plain <img>
        <img
          alt=""
          src={`data:image/jpeg;base64,${coverBuf.toString("base64")}`}
          width={coverW}
          height={ogSize.height}
          style={{ objectFit: "cover" }}
        />
      )}
    </div>,
    {
      ...ogSize,
      fonts: [
        { name: "Cinzel", data: cinzel, weight: 500, style: "normal" },
        { name: "Plex", data: mono, weight: 400, style: "normal" },
      ],
    },
  );
}
