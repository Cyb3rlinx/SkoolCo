"use client";

import { fetchAdminStats } from "@/lib/frontend/api-client";
import { useApi } from "@/lib/frontend/hooks";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";

function StatCard({ label, total, last7, last30 }: {
  label: string;
  total: number;
  last7?: number;
  last30?: number;
}) {
  return (
    <Card>
      <CardContent className="space-y-1 p-5">
        <p className="text-sm font-semibold text-muted-foreground">{label}</p>
        <p className="text-3xl font-extrabold tracking-tight">{total.toLocaleString("en-US")}</p>
        {last7 !== undefined && last30 !== undefined && (
          <p className="text-xs text-muted-foreground">
            +{last7.toLocaleString("en-US")} últimos 7 días · +{last30.toLocaleString("en-US")} últimos 30
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/** Pestaña Resumen — GET /api/admin/stats (solo ADMIN). */
export function StatsSection({ onGoToTab }: { onGoToTab: (tab: "reports" | "links") => void }) {
  const { data, loading, error, refetch } = useApi(fetchAdminStats, {});

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
    );
  }
  if (error || !data) return <ErrorState message={error ?? "No se pudieron cargar las métricas."} onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Usuarios" {...data.users} />
        <StatCard label="Productos publicados" {...data.productsLive} />
        <StatCard label="Votos" {...data.upvotes} />
        <StatCard label="Comentarios" {...data.comments} />
        <StatCard label="Solicitudes de contacto" {...data.contactRequests} />
        <StatCard label="Vistas de ofertas" total={data.offerViews.total} />
        <StatCard label="Abiertos a ofertas" total={data.openToOffers.total} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm font-semibold text-muted-foreground">Reportes abiertos</p>
              <p className="text-3xl font-extrabold">{data.pending.reports}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => onGoToTab("reports")}>
              Revisar
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm font-semibold text-muted-foreground">Logros pendientes</p>
              <p className="text-3xl font-extrabold">{data.pending.communityLinks}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => onGoToTab("links")}>
              Moderar
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
