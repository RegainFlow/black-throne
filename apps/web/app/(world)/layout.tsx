import { getEras, getLatest, getSite } from "@black-throne/content";
import type { GradeId } from "@black-throne/content/types";
import { Threshold } from "@/components/threshold/Threshold";
import { WorldShell } from "@/components/world/WorldShell";

/** The world: persistent WebGL, grading, audio, cursor, HUD, nav, ash-curtain transitions. */
export default function WorldLayout({ children }: { children: React.ReactNode }) {
  const site = getSite();
  const eras = getEras();
  const hudFor = (id: "dystopia" | "ii") => eras.find((e) => e.id === id)?.hud ?? [];
  const hud: Partial<Record<GradeId, string[]>> = {
    dystopia: hudFor("dystopia"),
    ii: hudFor("ii"),
    "house-of-ash": hudFor("ii"),
  };
  const teaser = getLatest().media.teaser;

  return (
    <>
      <WorldShell hud={hud} teaserSrc={teaser?.src} />
      <Threshold line={site.thresholdLine} hasTeaser={Boolean(teaser)} />
      <div className="relative z-10">{children}</div>
    </>
  );
}
