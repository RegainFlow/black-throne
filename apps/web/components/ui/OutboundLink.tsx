"use client";

import type { AnchorHTMLAttributes } from "react";
import { type OutboundPlatform, trackOutbound } from "@/lib/analytics";

interface Props extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  platform: OutboundPlatform;
  location: string;
  release?: string;
}

/** External link that records which platform/section/release drove the click. */
export function OutboundLink({
  href,
  platform,
  location,
  release,
  onClick,
  children,
  ...rest
}: Props) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      {...rest}
      onClick={(e) => {
        trackOutbound(platform, location, release);
        onClick?.(e);
      }}
    >
      {children}
    </a>
  );
}
