import type { Metadata } from "next";
import type { ReactNode } from "react";

// Intentionally minimal: the frontend cofounder owns design.
// This file only exists so the App Router project builds.
export const metadata: Metadata = {
  title: "LaunchPad",
  description: "Community-powered product launch platform",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
