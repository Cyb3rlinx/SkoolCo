import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Manrope } from "next/font/google";
import { Providers } from "./providers";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  // Base for absolute OG/Twitter URLs. NEXTAUTH_URL is already required config,
  // so social cards work in prod without adding a new env var.
  metadataBase: new URL(process.env.NEXTAUTH_URL ?? "http://localhost:3000"),
  title: {
    default: "Denveler — lanza tu producto con la comunidad",
    template: "%s · Denveler",
  },
  description:
    "La plataforma de lanzamientos impulsada por la comunidad: publica tu proyecto, recibe votos y feedback real, y gana visibilidad.",
  openGraph: {
    siteName: "Denveler",
    locale: "es",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
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
