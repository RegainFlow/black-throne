import { Monogram } from "@/components/ui/Monogram";
import type { MerchImage } from "@/lib/merch/types";
import { MerchImg } from "./MerchImg";

/** Product images: a scroll-snap strip on mobile, stacked on desktop. No JS, no carousel. */
export function Gallery({ images, name }: { images: MerchImage[]; name: string }) {
  if (images.length === 0) {
    return (
      <div className="flex aspect-[4/5] items-center justify-center border border-bone/10 bg-ash">
        <Monogram className="h-24 text-bone/20" />
      </div>
    );
  }
  return (
    <ul
      aria-label={`${name} images`}
      className="flex min-w-0 snap-x snap-mandatory gap-3 overflow-x-auto pb-2 md:flex-col md:overflow-visible md:pb-0"
    >
      {images.map((img, i) => (
        <li
          key={img.src}
          className="w-[85%] shrink-0 snap-start border border-bone/10 bg-ash md:w-full"
        >
          <MerchImg
            image={img}
            alt={i === 0 ? name : `${name}, image ${i + 1}`}
            priority={i === 0}
            className="h-auto w-full"
          />
        </li>
      ))}
    </ul>
  );
}
