import type { CSSProperties } from "react";

/**
 * The BT emblem as a tintable mask (inherits `color`). Source and aspect ratio are set once in
 * the root layout from the media manifest; `src` overrides the source for a single instance.
 */
export function Monogram({
  className,
  style,
  src,
}: {
  className?: string;
  style?: CSSProperties;
  src?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`bt-monogram ${className ?? ""}`}
      style={src ? { ...style, ["--bt-monogram-src" as string]: `url(${src})` } : style}
    />
  );
}
