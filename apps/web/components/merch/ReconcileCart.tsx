"use client";

import { startTransition, useEffect } from "react";
import { reconcileCart } from "@/app/merch/actions";

/** Rendered only when the cart cookies disagree with Fourthwall; fixes them once, then unmounts. */
export function ReconcileCart() {
  useEffect(() => {
    startTransition(() => {
      void reconcileCart();
    });
  }, []);
  return null;
}
