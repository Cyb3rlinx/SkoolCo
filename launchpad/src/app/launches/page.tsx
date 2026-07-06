import type { Metadata } from "next";
import { Suspense } from "react";
import { LaunchesClient } from "./launches-client";
import { ProductCardSkeleton } from "@/components/product/product-card";

export const metadata: Metadata = {
  title: "Lanzamientos",
  description:
    "Descubre los productos que la comunidad está lanzando hoy: vota, comenta y apoya a sus makers.",
};

/**
 * Server shell — the interactive list lives in LaunchesClient
 * (useSearchParams requires a Suspense boundary at build time).
 */
export default function LaunchesPage() {
  return (
    <Suspense
      fallback={
        <div className="container-page space-y-3 py-10">
          {Array.from({ length: 4 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      }
    >
      <LaunchesClient />
    </Suspense>
  );
}
