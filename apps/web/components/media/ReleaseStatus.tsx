"use client";

import {
  countdown,
  parseReleaseDate,
  type ReleasePhase,
  releasePhase,
} from "@black-throne/content/state";
import { useEffect, useState } from "react";

interface Props {
  visibility: "announced" | "released";
  releaseDate?: string;
  className?: string;
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * "announced · date soon" → live countdown → "out now". The server always renders the
 * date-independent text; the time-dependent state is computed after mount.
 */
export function ReleaseStatus({ visibility, releaseDate, className }: Props) {
  const [phase, setPhase] = useState<ReleasePhase | null>(null);
  const [left, setLeft] = useState<string | null>(null);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const p = releasePhase({ visibility, releaseDate }, now);
      setPhase(p);
      if (p === "announced" && releaseDate) {
        const c = countdown(parseReleaseDate(releaseDate), now);
        setLeft(`${c.days}d ${pad(c.hours)}h ${pad(c.minutes)}m ${pad(c.seconds)}s`);
      }
    };
    update();
    const id = window.setInterval(update, 1000);
    return () => window.clearInterval(id);
  }, [visibility, releaseDate]);

  const dateText = releaseDate
    ? new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric" })
        .format(parseReleaseDate(releaseDate))
        .toLowerCase()
    : null;

  let text: string;
  if (visibility === "released" || phase === "out")
    text = dateText ? `out now · ${dateText}` : "out now";
  else if (left) text = `arrives in ${left}`;
  else text = dateText ? `arrives ${dateText}` : "arriving soon";

  return (
    <p className={`mono-label tabular-nums ${className ?? ""}`}>
      <span
        aria-hidden="true"
        className="mr-2 inline-block size-1.5 animate-pulse rounded-full bg-accent align-middle"
      />
      {text}
    </p>
  );
}
