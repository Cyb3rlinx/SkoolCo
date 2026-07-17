import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Manrope } from "next/font/google";
import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import "../globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL ?? "http://localhost:3000"),
  title: { default: "Denveler", template: "%s · Denveler" },
  robots: { index: false, follow: false },
};

/**
 * Root layout for `/admin` — an independent tree from `src/app/[locale]`
 * (Next.js "multiple root layouts" pattern; there is no top-level
 * `src/app/layout.tsx`). The admin panel is operator-only and intentionally
 * NOT part of the i18n setup: it stays Spanish-only at its existing
 * unprefixed URL (see the middleware matcher in src/middleware.ts).
 */
export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={manrope.variable}>
      <body className="flex min-h-screen flex-col font-sans">
        <Providers>
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
