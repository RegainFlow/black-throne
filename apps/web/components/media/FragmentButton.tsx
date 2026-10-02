"use client";

import { CtaButton } from "@/components/ui/Cta";
import { trackEvent } from "@/lib/analytics";
import { audio } from "@/lib/audio-engine";
import { useWorld } from "@/lib/use-world";

/** Plays / stops the self-hosted teaser — the world reacts to it. */
export function FragmentButton({ location, src }: { location: string; src: string }) {
  const playing = useWorld((s) => s.teaserPlaying);
  return (
    <CtaButton
      aria-pressed={playing}
      onClick={() => {
        if (playing) audio.stopTeaser();
        else {
          trackEvent("teaser_play", { location });
          audio.setTeaser(src);
          void audio.playTeaser();
        }
      }}
    >
      <span aria-hidden="true" className="inline-flex size-3 items-center justify-center">
        {playing ? (
          <span className="block size-2 bg-current" />
        ) : (
          <span className="block size-0 border-y-[5px] border-l-[8px] border-y-transparent border-l-current" />
        )}
      </span>
      {playing ? "stop the fragment" : "hear a fragment"}
    </CtaButton>
  );
}
