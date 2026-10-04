/** Merch cookies. All httpOnly and scoped to /merch, so they never ride along to world pages. */

export const CART_COOKIE = "bt_cart";
export const COUNT_COOKIE = "bt_cart_n";
export const ATTR_COOKIE = "bt_attr";

const DAY = 60 * 60 * 24;

export function merchCookie(maxAgeDays: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/merch",
    maxAge: maxAgeDays * DAY,
  };
}

export const CART_COOKIE_DAYS = 30;
export const ATTR_COOKIE_DAYS = 7;
