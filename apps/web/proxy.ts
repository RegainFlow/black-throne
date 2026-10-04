import { type NextRequest, NextResponse } from "next/server";
import { pickAttribution } from "@/lib/merch/checkout";
import { ATTR_COOKIE, ATTR_COOKIE_DAYS, merchCookie } from "@/lib/merch/cookies";

/**
 * Merch only: remembers allowlisted attribution (utm_*, gclid, fbclid) from the landing URL so
 * it can ride along to Fourthwall's checkout. Nothing else from the query string is kept.
 */
export function proxy(request: NextRequest) {
  const attribution = pickAttribution(request.nextUrl.searchParams);
  if (Object.keys(attribution).length === 0) return NextResponse.next();
  const res = NextResponse.next();
  res.cookies.set(ATTR_COOKIE, JSON.stringify(attribution), merchCookie(ATTR_COOKIE_DAYS));
  return res;
}

export const config = {
  matcher: ["/merch", "/merch/:path*"],
};
