import type { MerchImage } from "@/lib/merch/types";

/**
 * A Fourthwall-hosted image. Plain <img> with intrinsic size (no layout shift); the repo avoids
 * next/image, and Fourthwall's CDN hosts aren't fixed, so no remotePatterns wildcard is needed.
 */
export function MerchImg({
  image,
  alt,
  priority = false,
  className = "",
}: {
  image: MerchImage;
  alt: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    // biome-ignore lint/performance/noImgElement: remote Fourthwall CDN image, already transformed upstream
    <img
      src={image.src}
      alt={alt}
      width={image.width}
      height={image.height}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      decoding="async"
      className={className}
    />
  );
}
