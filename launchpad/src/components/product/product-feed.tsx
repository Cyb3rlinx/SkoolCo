"use client";

import type { ReactNode } from "react";
import { fetchProducts } from "@/lib/frontend/api-client";
import { filterMockProducts } from "@/lib/frontend/mock-data";
import { useApi } from "@/lib/frontend/hooks";
import type { ProductListQuery } from "@/lib/frontend/types";
import { DemoBanner, EmptyState, ErrorState } from "@/components/ui/states";
import { ProductCard, ProductCardSkeleton } from "./product-card";

interface ProductFeedProps {
  query?: ProductListQuery;
  /**
   * Client-side date window. The list API has no date filter yet —
   * TODO(backend): add `launchedAfter`/`launchedBefore` params to
   * GET /api/products and move this filtering server-side.
   */
  dateWindow?: "today" | "week" | "all";
  /** Show 1-based rank numbers (today's ranking). */
  ranked?: boolean;
  /** Cap the number of rendered cards (landing preview). */
  limit?: number;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  showDemoBanner?: boolean;
}

/**
 * The product list used everywhere (landing preview, launches page).
 * Data: GET /api/products — falls back to the mock catalog when the backend
 * is unreachable so the UI stays demoable (flagged with <DemoBanner/>).
 */
export function ProductFeed({
  query = {},
  dateWindow = "all",
  ranked = false,
  limit,
  emptyTitle = "Todavía no hay lanzamientos",
  emptyDescription = "Sé la primera persona en publicar su producto y estrenar el feed.",
  emptyAction,
  showDemoBanner = true,
}: ProductFeedProps) {
  const key = JSON.stringify(query);
  const { data, loading, error, demo, refetch } = useApi(() => fetchProducts(query), {
    fallback: () => filterMockProducts(query),
    deps: [key],
  });

  if (loading) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Cargando lanzamientos">
        {Array.from({ length: 4 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={refetch} />;
  }

  let items = data?.items ?? [];

  if (dateWindow !== "all") {
    const windowMs = dateWindow === "today" ? 86_400_000 : 7 * 86_400_000;
    const cutoff = Date.now() - windowMs;
    // Sin tope superior: launchDate se guarda como mediodía LOCAL del maker,
    // así que un producto LIVE publicado "hoy" en otra zona horaria puede
    // quedar unas horas en el futuro para quien lo mira — sigue siendo de hoy.
    items = items.filter((p) => new Date(p.launchDate).getTime() >= cutoff);
  }

  if (limit) items = items.slice(0, limit);

  if (items.length === 0) {
    return (
      <EmptyState
        icon={query.q ? "search" : "inbox"}
        title={query.q ? `Sin resultados para “${query.q}”` : emptyTitle}
        description={
          query.q
            ? "Prueba con otras palabras o quita los filtros."
            : emptyDescription
        }
        action={emptyAction}
      />
    );
  }

  return (
    <div className="space-y-3">
      {demo && showDemoBanner && <DemoBanner />}
      {items.map((product, i) => (
        <ProductCard
          key={product.id}
          product={product}
          rank={ranked ? i + 1 : undefined}
          className="animate-fade-up"
        />
      ))}
    </div>
  );
}
