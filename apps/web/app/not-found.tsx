import Link from "next/link";
import { Monogram } from "@/components/ui/Monogram";
import { StaticBackdrop } from "@/components/world/StaticBackdrop";

export default function NotFound() {
  return (
    <>
      <StaticBackdrop />
      <main
        id="main"
        data-page-grade="ii"
        className="relative z-10 flex min-h-svh flex-col items-center justify-center gap-8 px-gutter text-center"
      >
        <Monogram className="h-28 text-bone/20" />
        <h1 className="display-title text-[clamp(2rem,6vw,4.5rem)] text-bone">Nothing here</h1>
        <p className="mono-label">you&apos;ve wandered off the path.</p>
        <Link
          href="/"
          className="display-title border border-bone/20 px-6 py-3 text-xs text-bone transition-colors hover:border-accent hover:text-accent"
        >
          return to the throne
        </Link>
      </main>
    </>
  );
}
