"use client";

import { track } from "@vercel/analytics";

export type OutboundPlatform = "spotify" | "youtube" | "instagram" | "tiktok" | "presave";

/** Every outbound click is a promotion signal — log where it came from. */
export function trackOutbound(platform: OutboundPlatform, location: string, release?: string) {
  try {
    track("outbound", { platform, location, ...(release ? { release } : {}) });
  } catch {
    // analytics must never break navigation
  }
}

export function trackEvent(name: string, props?: Record<string, string | number | boolean>) {
  try {
    track(name, props);
  } catch {
    // ignore
  }
}
