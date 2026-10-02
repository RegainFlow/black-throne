"use client";

import { formatDuration } from "@black-throne/content/state";
import type { Track } from "@black-throne/content/types";
import { useRef, useState } from "react";
import { trackEvent } from "@/lib/analytics";
import { type EmbedController, embedUrl } from "@/lib/spotify";
import { SpotifyEmbed } from "./SpotifyEmbed";

export interface Playable {
  slug: string;
  title: string;
  uri: string;
  tracks?: Track[];
}

/**
 * One Spotify controller for the whole Listen section. Our tracklist drives the official embed
 * (which always stays visible); the embed's progress drives an ember line.
 */
export function SpotifyPlayer({ items }: { items: Playable[] }) {
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState<{ uri: string; paused: boolean; progress: number } | null>(
    null,
  );
  const controller = useRef<EmbedController | null>(null);
  const current = items[active];
  if (!current) return null;

  const load = (uri: string, play: boolean) => {
    const c = controller.current;
    if (!c) return;
    c.loadEntity(embedUrl(uri));
    if (play) window.setTimeout(() => c.play(), 350);
  };

  return (
    <div className="grid gap-10 md:grid-cols-12">
      <div className="flex flex-col gap-6 md:col-span-7">
        {items.length > 1 && (
          <div role="tablist" aria-label="Releases" className="flex flex-wrap gap-6">
            {items.map((item, i) => (
              <button
                key={item.slug}
                type="button"
                role="tab"
                aria-selected={i === active}
                onClick={() => {
                  setActive(i);
                  load(item.uri, false);
                }}
                className={`display-title text-sm transition-colors ${i === active ? "text-bone" : "text-smoke hover:text-bone"}`}
              >
                {item.title}
              </button>
            ))}
          </div>
        )}
        <SpotifyEmbed
          uri={current.uri}
          title={current.title}
          height={352}
          onController={(c) => {
            controller.current = c;
          }}
          onPlayback={(u) =>
            setPlaying({
              uri: u.playingURI,
              paused: u.isPaused,
              progress: u.duration > 0 ? u.position / u.duration : 0,
            })
          }
        />
        <div aria-hidden="true" className="h-px w-full bg-bone/10">
          <div
            className="h-px bg-accent shadow-[0_0_12px_1px] shadow-accent/60 transition-[width] duration-700 ease-linear"
            style={{ width: `${(playing?.progress ?? 0) * 100}%` }}
          />
        </div>
      </div>

      {current.tracks && (
        <ol className="flex flex-col md:col-span-5" aria-label={`${current.title} tracklist`}>
          {current.tracks.map((t, i) => {
            const isCurrent = playing?.uri === t.uri;
            return (
              <li key={t.uri}>
                <button
                  type="button"
                  onClick={() => {
                    trackEvent("track_select", { release: current.slug, track: t.title });
                    load(t.uri, true);
                  }}
                  className="group flex w-full items-baseline gap-4 border-b border-bone/10 py-3 text-left transition-colors hover:border-accent/40"
                >
                  <span className="mono-label w-6 tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span
                    className={`flex-1 font-serif text-xl transition-colors ${
                      isCurrent ? "text-accent" : "text-bone/85 group-hover:text-bone"
                    }`}
                  >
                    {t.title}
                    {isCurrent && !playing?.paused && (
                      <span
                        aria-hidden="true"
                        className="ml-3 inline-block size-1.5 animate-pulse rounded-full bg-accent align-middle"
                      />
                    )}
                  </span>
                  <span className="mono-label tabular-nums">{formatDuration(t.durationMs)}</span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
