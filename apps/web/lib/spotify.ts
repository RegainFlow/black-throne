"use client";

/**
 * Spotify iFrame API (https://developer.spotify.com/documentation/embeds/references/iframe-api).
 * The script is injected once; `window.onSpotifyIframeApiReady` is set before it loads.
 * The embed itself always stays visible — we style the frame around it, never replace it.
 */

export interface PlaybackUpdate {
  playingURI: string;
  isPaused: boolean;
  isBuffering: boolean;
  duration: number;
  position: number;
}

export interface EmbedController {
  loadEntity(uriOrUrl: string, preferVideo?: boolean, startAt?: number): void;
  play(): void;
  pause(): void;
  resume(): void;
  togglePlay(): void;
  destroy(): void;
  addListener(event: "ready", cb: () => void): void;
  addListener(event: "playback_update", cb: (e: { data: PlaybackUpdate }) => void): void;
  addListener(event: "playback_started", cb: (e: { data: { playingURI: string } }) => void): void;
}

interface IFrameAPI {
  createController(
    el: HTMLElement,
    options: { uri?: string; url?: string; width?: number | string; height?: number | string },
    cb: (controller: EmbedController) => void,
  ): void;
}

declare global {
  interface Window {
    onSpotifyIframeApiReady?: (api: IFrameAPI) => void;
  }
}

let apiPromise: Promise<IFrameAPI> | undefined;

export function loadSpotifyApi(): Promise<IFrameAPI> {
  if (apiPromise) return apiPromise;
  apiPromise = new Promise<IFrameAPI>((resolve, reject) => {
    window.onSpotifyIframeApiReady = (api) => resolve(api);
    const script = document.createElement("script");
    script.src = "https://open.spotify.com/embed/iframe-api/v1";
    script.async = true;
    script.onerror = () => {
      apiPromise = undefined;
      reject(new Error("Spotify iFrame API failed to load"));
    };
    document.body.appendChild(script);
  });
  return apiPromise;
}

/** `spotify:album:ID` → `https://open.spotify.com/album/ID?theme=0` (dark embed). */
export function embedUrl(uri: string): string {
  const [, type, id] = uri.split(":");
  return `https://open.spotify.com/${type}/${id}?theme=0`;
}
