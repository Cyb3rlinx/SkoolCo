import { NextResponse, type NextRequest } from "next/server";

const SECURITY_HEADERS: Record<string, string> = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

/** True only if `origin` is explicitly listed in the comma-separated env value. */
export function isAllowedOrigin(origin: string | null, envValue: string | undefined): boolean {
  if (!origin || !envValue) return false;
  return envValue
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .includes(origin);
}

// Routes the browser extension calls cross-origin.
const CORS_PATHS = ["/api/extension", "/api/community-links"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const origin = req.headers.get("origin");
  const corsEligible = CORS_PATHS.some((p) => pathname.startsWith(p));
  const allowed = corsEligible && isAllowedOrigin(origin, process.env.ALLOWED_EXTENSION_ORIGINS);

  // Preflight
  if (req.method === "OPTIONS" && corsEligible) {
    const res = new NextResponse(null, { status: allowed ? 204 : 403 });
    if (allowed) applyCors(res, origin!);
    applySecurity(res);
    return res;
  }

  const res = NextResponse.next();
  if (allowed) applyCors(res, origin!);
  applySecurity(res);
  return res;
}

function applyCors(res: NextResponse, origin: string) {
  res.headers.set("Access-Control-Allow-Origin", origin);
  res.headers.set("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.headers.set("Vary", "Origin");
}

function applySecurity(res: NextResponse) {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.headers.set(k, v);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
