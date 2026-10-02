"use client";

import type { TeaserMedia } from "@black-throne/content/types";
import { useEffect, useRef, useState } from "react";
import { trackEvent } from "@/lib/analytics";
import { audio } from "@/lib/audio-engine";
import { useWorld } from "@/lib/use-world";

/** The House of Ash fragment as a waveform. Plays through the audio engine so the world reacts. */
export function TeaserPlayer({ teaser, title }: { teaser: TeaserMedia; title: string }) {
  const playing = useWorld((s) => s.teaserPlaying);
  const [progress, setProgress] = useState(0);
  const bars = useRef<HTMLDivElement>(null);

  useEffect(
    () =>
      audio.onTeaser(({ position, duration }) => {
        setProgress(duration > 0 ? position / duration : 0);
      }),
    [],
  );

  const toggle = () => {
    if (playing) audio.stopTeaser();
    else {
      trackEvent("teaser_play", { location: "latest" });
      void audio.playTeaser();
    }
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="mono-label flex items-center justify-between">
        <span>fragment · {title.toLowerCase()}</span>
        <span className="tabular-nums">
          {fmt(progress * teaser.duration)} / {fmt(teaser.duration)}
        </span>
      </div>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={playing}
        aria-label={
          playing
            ? `Stop the ${title} fragment`
            : `Play a ${teaser.duration}-second fragment of ${title}`
        }
        className="group relative flex h-20 w-full items-center gap-[2px]"
      >
        <div ref={bars} aria-hidden="true" className="flex h-full w-full items-center gap-[2px]">
          {teaser.peaks.map((p, i) => {
            const done = i / teaser.peaks.length < progress;
            return (
              <span
                // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length static waveform
                key={i}
                className={`block flex-1 rounded-[1px] transition-colors duration-300 ${
                  done ? "bg-accent" : "bg-bone/25 group-hover:bg-bone/40"
                }`}
                style={{ height: `${Math.max(6, p * 100)}%` }}
              />
            );
          })}
        </div>
      </button>
      <div className="mono-label flex items-center gap-3">
        <span
          aria-hidden="true"
          className={`inline-block size-1.5 rounded-full ${playing ? "animate-pulse bg-accent" : "bg-smoke/60"}`}
        />
        {playing ? "the world is listening" : "tap the waveform to hear it"}
      </div>
    </div>
  );
}
