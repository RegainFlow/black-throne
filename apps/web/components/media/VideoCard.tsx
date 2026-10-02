"use client";

import type { VideoMedia } from "@black-throne/content/types";
import { gsap } from "gsap";
import { useEffect, useRef, useState } from "react";
import { trackEvent, trackOutbound } from "@/lib/analytics";
import { audio } from "@/lib/audio-engine";
import { stopScroll } from "@/lib/scroll";
import { world } from "@/lib/world-store";

/**
 * 9:16 card (Shorts / Reels / TikTok shaped). Muted preview loop on hover (fine pointers) or
 * when scrolled into view (touch). Click opens a cinematic lightbox; YouTube items load the
 * iframe only on demand (lite facade).
 */
export function VideoCard({ video, release }: { video: VideoMedia; release: string }) {
  const [open, setOpen] = useState(false);
  const preview = useRef<HTMLVideoElement>(null);
  const card = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const v = preview.current;
    const el = card.current;
    if (!v || !el || world.getState().reducedMotion) return;
    const touch = window.matchMedia("(pointer: coarse)").matches;
    if (!touch) return;
    const io = new IntersectionObserver(
      ([e]) => (e?.isIntersecting ? void v.play().catch(() => {}) : v.pause()),
      {
        threshold: 0.6,
      },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const poster =
    video.poster ??
    (video.youtubeId ? `https://i.ytimg.com/vi/${video.youtubeId}/hqdefault.jpg` : undefined);

  return (
    <>
      <button
        ref={card}
        type="button"
        data-cursor
        onClick={() => {
          trackEvent("video_open", { release, video: video.id });
          setOpen(true);
        }}
        onPointerEnter={() => void preview.current?.play().catch(() => {})}
        onPointerLeave={() => preview.current?.pause()}
        className="group relative block aspect-[9/16] w-full overflow-hidden border border-bone/10 bg-ash text-left"
        aria-label={`Play ${video.title}`}
      >
        {video.preview ? (
          <video
            ref={preview}
            src={video.preview}
            poster={poster}
            muted
            loop
            playsInline
            preload="none"
            className="absolute inset-0 h-full w-full object-cover grayscale-[60%] transition-[filter] duration-700 group-hover:grayscale-0"
          />
        ) : (
          poster && (
            // biome-ignore lint/performance/noImgElement: external YouTube thumbnail
            <img
              src={poster}
              alt=""
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover grayscale-[60%]"
            />
          )
        )}
        <span
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-void via-transparent to-void/30"
        />
        <span className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-3">
          <span className="display-title text-sm text-bone">{video.title}</span>
          <span
            aria-hidden="true"
            className="flex size-10 items-center justify-center rounded-full border border-bone/30 transition-colors group-hover:border-accent group-hover:bg-accent/10"
          >
            <span className="ml-0.5 block size-0 border-y-[6px] border-l-[9px] border-y-transparent border-l-bone" />
          </span>
        </span>
      </button>
      {open && <Lightbox video={video} release={release} onClose={() => setOpen(false)} />}
    </>
  );
}

function Lightbox({
  video,
  release,
  onClose,
}: {
  video: VideoMedia;
  release: string;
  onClose: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const el = root.current;
    stopScroll(true);
    audio.setSpotifyPlaying(true); // duck our audio while the video plays
    const previous = document.activeElement as HTMLElement | null;
    closeBtn.current?.focus();
    if (el) gsap.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6, ease: "power2.out" });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      stopScroll(false);
      audio.setSpotifyPlaying(false);
      previous?.focus();
    };
  }, [onClose]);

  const portrait = video.orientation === "portrait";

  return (
    <div
      ref={root}
      role="dialog"
      aria-modal="true"
      aria-label={video.title}
      className="fixed inset-0 z-[85] flex items-center justify-center bg-void/95 p-4 backdrop-blur-md"
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        tabIndex={-1}
      />
      <div
        className={`relative ${portrait ? "aspect-[9/16] h-[86svh] max-w-full" : "aspect-video w-[min(92vw,1400px)]"} border border-bone/10 bg-black shadow-[0_0_120px_rgb(0_0_0/0.9)]`}
      >
        {video.src ? (
          // biome-ignore lint/a11y/useMediaCaption: lyric/visualiser clips — captions are burned in by the artist
          <video
            src={video.src}
            poster={video.poster}
            controls
            autoPlay
            playsInline
            className="h-full w-full object-contain"
          />
        ) : video.youtubeId ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?autoplay=1&rel=0&modestbranding=1`}
            title={video.title}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            className="h-full w-full"
          />
        ) : null}
        <span aria-hidden="true" className="bt-grain !absolute !inset-0 !z-10 !opacity-[0.06]" />
      </div>
      <div className="absolute top-5 right-5 flex items-center gap-6">
        {video.youtubeId && (
          <a
            href={`https://www.youtube.com/watch?v=${video.youtubeId}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackOutbound("youtube", "lightbox", release)}
            className="mono-label hover:text-bone"
          >
            watch on youtube ↗
          </a>
        )}
        <button
          ref={closeBtn}
          type="button"
          onClick={onClose}
          className="mono-label text-bone hover:text-accent"
        >
          close
        </button>
      </div>
    </div>
  );
}
