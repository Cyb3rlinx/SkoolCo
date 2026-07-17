import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { LaunchesClient } from "./launches-client";
import { ProductCardSkeleton } from "@/components/product/product-card";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("launches");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

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
