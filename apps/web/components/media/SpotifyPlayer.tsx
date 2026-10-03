"use client";

import { formatDuration } from "@black-throne/content/state";
import type { Track } from "@black-throne/content/types";
import { type KeyboardEvent, useRef, useState } from "react";
import { trackEvent } from "@/lib/analytics";
import { type EmbedController, embedUrl } from "@/lib/spotify";
import { SpotifyEmbed } from "./SpotifyEmbed";

export interface Playable {
  slug: string;
  title: string;
  uri: string;
  tracks?: Track[];
  kind?: "single" | "album";
  year?: string;
  /** Small cover image for the release switcher. */
  thumb?: string;
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
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const current = items[active];
  if (!current) return null;

  const select = (i: number) => {
    const item = items[i];
    if (!item || i === active) return;
    setActive(i);
    load(item.uri, false);
    trackEvent("release_select", { release: item.slug });
  };

  // WAI-ARIA tabs: arrow keys move between releases.
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const step =
      e.key === "ArrowRight" || e.key === "ArrowDown"
        ? 1
        : e.key === "ArrowLeft" || e.key === "ArrowUp"
          ? -1
          : 0;
    if (!step) return;
    e.preventDefault();
    const next = (i + step + items.length) % items.length;
    select(next);
    tabs.current[next]?.focus();
  };

  const load = (uri: string, play: boolean) => {
    const c = controller.current;
    if (!c) return;
    c.loadEntity(embedUrl(uri));
    if (play) window.setTimeout(() => c.play(), 350);
  };

  return (
    <div className="flex flex-col gap-8">
      {items.length > 1 && (
        <div className="flex flex-col gap-4">
          <p className="mono-label flex items-center gap-3">
            <span className="text-accent">choose a release</span>
            <span aria-hidden="true" className="h-px w-10 bg-smoke/40" />
            <span>{items.length} to play</span>
          </p>
          <div
            role="tablist"
            aria-label="Choose a release"
            className="-mx-1 flex flex-col gap-3 px-1 pb-1 sm:snap-x sm:flex-row sm:gap-4 sm:overflow-x-auto"
          >
            {items.map((item, i) => {
              const selected = i === active;
              return (
                <button
                  key={item.slug}
                  ref={(el) => {
                    tabs.current[i] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`release-tab-${item.slug}`}
                  aria-selected={selected}
                  aria-controls="release-panel"
                  tabIndex={selected ? 0 : -1}
                  onClick={() => select(i)}
                  onKeyDown={(e) => onKeyDown(e, i)}
                  className={`group relative flex w-full shrink-0 snap-start items-center gap-4 border p-3 pr-5 text-left transition-colors duration-500 sm:w-auto sm:min-w-[17rem] ${
                    selected
                      ? "border-accent bg-accent/[0.07]"
                      : "border-bone/15 bg-void/50 hover:border-bone/50 hover:bg-bone/[0.04]"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`absolute inset-y-0 left-0 w-[3px] transition-colors ${selected ? "bg-accent" : "bg-transparent"}`}
                  />
                  {item.thumb && (
                    // biome-ignore lint/performance/noImgElement: pre-generated cover thumbnail
                    <img
                      src={item.thumb}
                      alt=""
                      width={56}
                      height={80}
                      loading="lazy"
                      decoding="async"
                      className={`h-20 w-14 shrink-0 object-cover transition-[filter,opacity] duration-500 ${
                        selected
                          ? ""
                          : "opacity-60 grayscale group-hover:opacity-100 group-hover:grayscale-0"
                      }`}
                    />
                  )}
                  <span className="flex min-w-0 flex-col gap-1.5">
                    <span
                      className={`display-title truncate text-base transition-colors ${selected ? "text-bone" : "text-bone/70 group-hover:text-bone"}`}
                    >
                      {item.title}
                    </span>
                    <span className="mono-label">
                      {[
                        item.kind,
                        item.tracks && item.tracks.length > 1
                          ? `${item.tracks.length} tracks`
                          : null,
                        item.year,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                    <span
                      className={`mono-label flex items-center gap-2 ${selected ? "text-accent" : "text-smoke group-hover:text-bone"}`}
                    >
                      {selected ? (
                        <>
                          <span
                            aria-hidden="true"
                            className="inline-block size-1.5 animate-pulse rounded-full bg-accent"
                          />
                          in the player
                        </>
                      ) : (
                        <>
                          <span aria-hidden="true">▶</span> switch to this
                        </>
                      )}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
      <div
        id="release-panel"
        {...(items.length > 1
          ? { role: "tabpanel", "aria-labelledby": `release-tab-${current.slug}` }
          : {})}
        className="grid gap-10 md:grid-cols-12"
      >
        <div className="flex flex-col gap-6 md:col-span-7">
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
    </div>
  );
}
