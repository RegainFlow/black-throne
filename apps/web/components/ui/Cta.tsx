"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { OutboundPlatform } from "@/lib/analytics";
import { OutboundLink } from "./OutboundLink";

const base =
  "group relative inline-flex items-center gap-3 overflow-hidden px-5 py-3 font-display text-[0.7rem] tracking-[0.24em] uppercase transition-colors duration-500";
const variants = {
  primary: "border border-accent/70 text-bone hover:text-void",
  ghost: "border border-bone/20 text-bone/80 hover:border-bone/60 hover:text-bone",
};

function Fill({ variant }: { variant: keyof typeof variants }) {
  if (variant !== "primary") return null;
  return (
    <span
      aria-hidden="true"
      className="absolute inset-0 -z-10 origin-bottom scale-y-0 bg-accent transition-transform duration-500 ease-[var(--ease-weight)] group-hover:scale-y-100"
    />
  );
}

export function CtaLink({
  href,
  platform,
  location,
  release,
  variant = "primary",
  children,
}: {
  href: string;
  platform: OutboundPlatform;
  location: string;
  release?: string;
  variant?: keyof typeof variants;
  children: ReactNode;
}) {
  return (
    <OutboundLink
      href={href}
      platform={platform}
      location={location}
      release={release}
      className={`${base} ${variants[variant]} isolate`}
    >
      <Fill variant={variant} />
      {children}
      <span
        aria-hidden="true"
        className="transition-transform duration-500 group-hover:translate-x-1"
      >
        ↗
      </span>
    </OutboundLink>
  );
}

export function CtaButton({
  variant = "ghost",
  children,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof variants }) {
  return (
    <button
      type="button"
      {...rest}
      className={`${base} ${variants[variant]} isolate ${className ?? ""}`}
    >
      <Fill variant={variant} />
      {children}
    </button>
  );
}
