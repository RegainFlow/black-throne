"use client";

import { trackEvent } from "@/lib/analytics";
import { buttonPrimary } from "./styles";

/** Same-tab hand-off to Fourthwall's hosted checkout (the URL is built on the server). */
export function CheckoutLink({ href, items }: { href: string; items: number }) {
  return (
    <a
      href={href}
      onClick={() => trackEvent("merch_checkout", { items })}
      className={`${buttonPrimary} w-full`}
      data-checkout
    >
      checkout <span aria-hidden="true">→</span>
    </a>
  );
}
