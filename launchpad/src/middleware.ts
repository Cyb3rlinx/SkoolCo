import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { isAllowedOrigin } from "./lib/cors";

export { isAllowedOrigin };

const intlMiddleware = createMiddleware(routing);

const SECURITY_HEADERS: Record<string, string> = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

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

  // API routes, the admin panel, and root-level metadata files stay outside
  // next-intl's locale routing (admin is Spanish-only and out of scope for
  // this pass; API responses never carry a locale prefix; robots.txt and
  // sitemap.xml are single files with no locale variant).
  const skipIntl =
    pathname.startsWith("/api") ||
    pathname.startsWith("/admin") ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml";
  const res = skipIntl ? NextResponse.next() : intlMiddleware(req);
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
