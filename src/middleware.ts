import { NextResponse, type NextRequest } from "next/server";

const BUCKET_COOKIE = "pasadya_search_bucket";

/**
 * Mints an opaque Search 2.0 rollout bucket when gradual traffic is enabled.
 * Never stores IP, user id, or coordinates — only a random cookie value.
 */
export function middleware(request: NextRequest) {
  const percent = Number(process.env.SEARCH_V2_ROLLOUT_PERCENT ?? "100");
  if (!Number.isFinite(percent) || percent >= 100 || percent <= 0)
    return NextResponse.next();

  if (request.cookies.get(BUCKET_COOKIE)?.value)
    return NextResponse.next();

  const response = NextResponse.next();
  response.cookies.set({
    name: BUCKET_COOKIE,
    value: crypto.randomUUID().replaceAll("-", ""),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  });
  return response;
}

export const config = {
  matcher: ["/search", "/search/:path*"],
};
