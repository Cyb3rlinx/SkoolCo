"use client";

import { Link } from "@/i18n/navigation";
import { Sparkles } from "lucide-react";
import { fetchCollections } from "@/lib/frontend/api-client";
import { useApi } from "@/lib/frontend/hooks";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";

export function CollectionsClient() {
  const { data, loading, error, refetch } = useApi(fetchCollections, {});

  return (
    <div className="container-page space-y-8 py-10">
      <PageHeader
        title="Colecciones"
        description="Selecciones curadas de productos de la comunidad, armadas por el equipo de Denveler."
      />

      {loading && (
        <div className="grid gap-4 sm:grid-cols-2" aria-busy="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      )}

      {!loading && error && <ErrorState message={error} onRetry={refetch} />}

      {!loading && !error && data && data.length === 0 && (
        <EmptyState
          icon="search"
          title="Todavía no hay colecciones"
          description="El equipo de Denveler arma selecciones curadas de vez en cuando. Vuelve pronto."
        />
      )}

      {!loading && !error && data && data.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {data.map((c) => (
            <Link key={c.id} href={`/colecciones/${c.slug}`}>
              <Card className="h-full transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lift">
                <CardContent className="space-y-2 p-5">
                  <p className="flex items-center gap-2 text-lg font-extrabold">
                    <Sparkles className="h-4 w-4 text-primary" aria-hidden />
                    {c.title}
                  </p>
                  <p className="text-sm text-muted-foreground">{c.description}</p>
                  <p className="text-xs text-muted-foreground">{c.productCount} productos</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
