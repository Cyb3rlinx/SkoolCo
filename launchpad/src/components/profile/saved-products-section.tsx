"use client";

import { Bookmark } from "lucide-react";
import { fetchSavedProducts } from "@/lib/frontend/api-client";
import { useApi } from "@/lib/frontend/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";
import { ProductCard } from "@/components/product/product-card";

/** Productos que el usuario guardó para volver a verlos (GET /api/me/saved). */
export function SavedProductsSection() {
  const saved = useApi(fetchSavedProducts, {});

  // Sin favoritos → no ocupar espacio en el perfil.
  if (!saved.loading && !saved.error && (saved.data?.length ?? 0) === 0) {
    return null;
  }

  return (
    <section className="space-y-4" aria-labelledby="saved-products-title">
      <h2 id="saved-products-title" className="flex items-center gap-2 text-xl font-extrabold">
        <Bookmark className="h-5 w-5 text-primary" aria-hidden />
        Guardados
      </h2>

      {saved.loading && (
        <div className="space-y-3" aria-busy="true">
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
        </div>
      )}
      {!saved.loading && saved.error && (
        <ErrorState message={saved.error} onRetry={saved.refetch} />
      )}

      <div className="space-y-3">
        {saved.data?.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
