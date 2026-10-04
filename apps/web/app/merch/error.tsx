"use client";

import Link from "next/link";
import { Monogram } from "@/components/ui/Monogram";

/** Last-resort boundary for the merch routes. Shows no error details. */
export default function MerchError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-5 border border-bone/10 bg-void/60 px-6 py-16 text-center"
    >
      <Monogram className="h-14 text-bone/20" />
      <p className="display-title text-xl text-bone">out of reach</p>
      <p className="mono-label">the store can't be reached right now.</p>
      <div className="flex flex-wrap items-center justify-center gap-6">
        <button
          type="button"
          onClick={() => retry()}
          className="display-title border border-bone/20 px-6 py-3 text-xs text-bone transition-colors hover:border-accent hover:text-accent"
        >
          try again
        </button>
        <Link href="/" className="mono-label hover:text-bone">
          enter the world →
        </Link>
      </div>
    </div>
  );
}
