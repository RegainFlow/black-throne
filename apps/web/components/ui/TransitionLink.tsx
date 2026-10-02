"use client";

import Link, { type LinkProps } from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { scrollToTarget } from "@/lib/scroll";
import { transition } from "@/lib/transition";
import { world } from "@/lib/world-store";

type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> &
  LinkProps & { children: ReactNode; href: string };

/**
 * Internal link that plays the ash-wipe before navigating. Same-page hash links scroll
 * (through Lenis) instead of navigating.
 */
export function TransitionLink({ href, children, onClick, ...rest }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <Link
      href={href}
      {...rest}
      onClick={(e) => {
        onClick?.(e);
        const [path, hash] = href.split("#");
        if (hash && (path === "" || path === pathname)) {
          e.preventDefault();
          scrollToTarget(`#${hash}`);
          history.replaceState(null, "", `#${hash}`);
        }
      }}
      onNavigate={(e) => {
        const [path] = href.split("#");
        const { overlay } = transition.getState();
        if (!overlay || world.getState().reducedMotion || path === pathname) return;
        if (transition.getState().phase !== "idle") {
          e.preventDefault();
          return;
        }
        e.preventDefault();
        transition.setState({ phase: "covering", href });
        // The overlay calls back once the wipe has covered the screen.
        const unsub = transition.subscribe((s) => {
          if (s.phase === "covered") {
            unsub();
            // Scroll to top under the curtain — also when the destination leaves the (world)
            // layout and the overlay unmounts. Hash targets are scrolled to by the overlay.
            router.push(href, { scroll: !href.includes("#") });
          }
        });
      }}
    >
      {children}
    </Link>
  );
}
