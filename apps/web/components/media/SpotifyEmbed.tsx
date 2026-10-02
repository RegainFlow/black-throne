"use client";

import { useEffect, useRef, useState } from "react";
import { audio } from "@/lib/audio-engine";
import { type EmbedController, embedUrl, loadSpotifyApi, type PlaybackUpdate } from "@/lib/spotify";

interface Props {
  uri: string;
  title: string;
  height?: number;
  onController?: (controller: EmbedController) => void;
  onPlayback?: (update: PlaybackUpdate) => void;
}

/**
 * The official Spotify embed (always visible, dark theme) inside our frame. Created lazily
 * when it nears the viewport. Its playback state ducks our own audio and makes the world breathe.
 */
export function SpotifyEmbed({ uri, title, height = 352, onController, onPlayback }: Props) {
  const frame = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const callbacks = useRef({ onController, onPlayback });
  callbacks.current = { onController, onPlayback };

  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    let controller: EmbedController | undefined;
    let cancelled = false;

    const create = async () => {
      setState("loading");
      try {
        const api = await loadSpotifyApi();
        if (cancelled) return;
        const host = document.createElement("div");
        el.appendChild(host);
        api.createController(host, { url: embedUrl(uri), width: "100%", height }, (c) => {
          controller = c;
          c.addListener("ready", () => setState("ready"));
          c.addListener("playback_update", (e) => {
            audio.setSpotifyPlaying(!e.data.isPaused && !e.data.isBuffering);
            callbacks.current.onPlayback?.(e.data);
          });
          callbacks.current.onController?.(c);
        });
      } catch {
        setState("error");
      }
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          io.disconnect();
          void create();
        }
      },
      { rootMargin: "300px 0px" },
    );
    io.observe(el);

    return () => {
      cancelled = true;
      io.disconnect();
      controller?.destroy();
      audio.setSpotifyPlaying(false);
    };
  }, [uri, height]);

  return (
    <div className="relative border border-bone/10 bg-void/60 p-1">
      <div
        ref={frame}
        style={{ minHeight: height }}
        className="overflow-hidden rounded-[12px] [&_iframe]:block [&_iframe]:[color-scheme:normal]"
      />
      {state !== "ready" && (
        <div className="mono-label pointer-events-none absolute inset-0 flex items-center justify-center">
          {state === "error" ? (
            <a
              href={`https://open.spotify.com/${uri.split(":")[1]}/${uri.split(":")[2]}`}
              className="pointer-events-auto underline decoration-accent underline-offset-4"
              target="_blank"
              rel="noopener noreferrer"
            >
              open {title.toLowerCase()} on spotify
            </a>
          ) : (
            <span className="animate-pulse">summoning spotify…</span>
          )}
        </div>
      )}
    </div>
  );
}
