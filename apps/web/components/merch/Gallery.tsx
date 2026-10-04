"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Monogram } from "@/components/ui/Monogram";
import { findSet, type ImageSet } from "@/lib/merch/gallery";
import type { MerchImage } from "@/lib/merch/types";
import { MerchImg } from "./MerchImg";

/**
 * One large frame with thumbnails beneath, showing only the chosen colour's photos. The colour
 * lives in the URL (`?color=`): PurchasePanel writes it when a colour is picked, and filtered
 * product cards link with it, so this always shows what the panel says.
 */
export function Gallery({ sets, name }: { sets: ImageSet[]; name: string }) {
  const params = useSearchParams();
  const set = findSet(sets, params.get("color")) ?? sets[0];
  if (!set || set.images.length === 0) {
    return (
      <div className="flex aspect-[4/5] items-center justify-center border border-bone/10 bg-ash">
        <Monogram className="h-24 text-bone/20" />
      </div>
    );
  }
  const label = set.color ? `${name}, ${set.color.toLowerCase()}` : name;
  // Keyed by colour: a new colour starts on its first photo.
  return <Frames key={set.color ?? ""} images={set.images} label={label} />;
}

function Frames({ images, label }: { images: MerchImage[]; label: string }) {
  const [index, setIndex] = useState(0);
  const main = images[index] ?? images[0];
  if (!main) return null;

  return (
    <div className="flex flex-col gap-3" data-gallery>
      <div className="flex aspect-[4/5] items-center justify-center overflow-hidden border border-bone/10 bg-ash">
        <MerchImg
          image={main}
          alt={images.length > 1 ? `${label}, image ${index + 1} of ${images.length}` : label}
          priority
          className="h-full w-full object-contain"
        />
      </div>
      {images.length > 1 && (
        <ul
          aria-label={`${label}: images`}
          className="flex gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-6 sm:overflow-visible sm:pb-0"
        >
          {images.map((img, i) => (
            <li key={img.src} className="w-16 shrink-0 sm:w-auto">
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show image ${i + 1} of ${images.length}`}
                aria-current={i === index || undefined}
                className="block aspect-square w-full overflow-hidden border border-bone/10 bg-ash transition-colors hover:border-bone/50 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-accent aria-[current=true]:border-accent"
              >
                <MerchImg image={img} alt="" className="h-full w-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
