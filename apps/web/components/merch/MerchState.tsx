import Link from "next/link";
import { Monogram } from "@/components/ui/Monogram";

type Kind = "unconfigured" | "error" | "empty" | "no-results" | "cart-empty";

const COPY: Record<Kind, { title: string; line: string }> = {
  unconfigured: {
    title: "opening soon",
    line: "the store isn't open yet. listen while you wait.",
  },
  error: {
    title: "out of reach",
    line: "the store can't be reached right now. try again in a moment.",
  },
  empty: { title: "nothing here yet", line: "this collection is empty for now." },
  "no-results": { title: "no matches", line: "nothing matches those filters." },
  "cart-empty": { title: "your cart is empty", line: "nothing chosen yet." },
};

/** Empty / unconfigured / outage states. Deliberately free of any internal detail. */
export function MerchState({
  kind,
  action,
}: {
  kind: Kind;
  action?: { href: string; label: string };
}) {
  const copy = COPY[kind];
  return (
    <div
      data-merch-state={kind}
      className="flex flex-col items-center gap-5 border border-bone/10 bg-void/60 px-6 py-16 text-center"
    >
      <Monogram className="h-14 text-bone/20" />
      <p className="display-title text-xl text-bone">{copy.title}</p>
      <p className="mono-label">{copy.line}</p>
      {action && (
        <Link
          href={action.href}
          className="display-title border border-bone/20 px-6 py-3 text-xs text-bone transition-colors hover:border-accent hover:text-accent"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
