import type { CoverMedia } from "@black-throne/content/types";

interface Props {
  cover: CoverMedia;
  alt: string;
  sizes: string;
  className?: string;
  priority?: boolean;
}

/** Pre-generated AVIF/WebP set from `pnpm media` (no next/image — it would optimise twice). */
export function CoverPicture({ cover, alt, sizes, className, priority }: Props) {
  return (
    <picture>
      <source type="image/avif" srcSet={cover.avif} sizes={sizes} />
      <source type="image/webp" srcSet={cover.webp} sizes={sizes} />
      <img
        src={cover.src}
        alt={alt}
        width={cover.width}
        height={cover.height}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : "auto"}
        className={className}
        style={{
          backgroundImage: `url(${cover.blurDataURL})`,
          backgroundSize: "cover",
        }}
      />
    </picture>
  );
}
