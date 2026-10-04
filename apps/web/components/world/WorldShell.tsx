"use client";

import type { GradeId } from "@black-throne/content/types";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Nav } from "@/components/ui/Nav";
import { audio } from "@/lib/audio-engine";
import { Cursor } from "./Cursor";
import { GradeController } from "./GradeController";
import { Hud } from "./Hud";
import { SmoothScroll } from "./SmoothScroll";
import { TransitionOverlay } from "./TransitionOverlay";

// WebGL is never server-rendered and loads after first paint (the wordmark is the LCP).
const WorldCanvas = dynamic(() => import("./WorldCanvas"), { ssr: false });

interface Props {
  hud: Partial<Record<GradeId, string[]>>;
  teaserSrc?: string;
  showMerch?: boolean;
}

/** Everything that lives above/below the page and survives navigation. */
export function WorldShell({ hud, teaserSrc, showMerch }: Props) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    audio.setTeaser(teaserSrc);
  }, [teaserSrc]);

  useEffect(() => {
    // The wordmark/artwork paint first (LCP); the world fades in behind them once the page has
    // loaded and the main thread is idle.
    let cancelled = false;
    const start = () => {
      const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 300));
      idle(() => !cancelled && setReady(true), { timeout: 2500 });
    };
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });
    return () => {
      cancelled = true;
      window.removeEventListener("load", start);
    };
  }, []);

  return (
    <>
      <div aria-hidden="true" className="bt-world-fallback" />
      {ready && <WorldCanvas />}
      <div aria-hidden="true" className="bt-scanlines" />
      <div aria-hidden="true" className="bt-vignette" />
      <div aria-hidden="true" className="bt-grain" />
      <Nav showMerch={showMerch} />
      <Hud lines={hud} />
      <Cursor />
      <SmoothScroll />
      <GradeController />
      <TransitionOverlay />
    </>
  );
}
