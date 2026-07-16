"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import {
  ApiClientError,
  archiveProduct,
  fetchAdminProducts,
} from "@/lib/frontend/api-client";
import { useApi } from "@/lib/frontend/hooks";
import { formatDate } from "@/lib/frontend/format";
import type { ProductStatus } from "@/lib/frontend/types";
import { ProductLogo } from "@/components/product/product-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";

const STATUS_META: Record<ProductStatus, { label: string; variant: "success" | "warning" | "secondary" | "outline" }> = {
  LIVE: { label: "Publicado", variant: "success" },
  SCHEDULED: { label: "Programado", variant: "warning" },
  DRAFT: { label: "Borrador", variant: "secondary" },
  ARCHIVED: { label: "Archivado", variant: "outline" },
};

const FILTERS: { value: string; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "LIVE", label: "Publicados" },
  { value: "SCHEDULED", label: "Programados" },
  { value: "DRAFT", label: "Borradores" },
  { value: "ARCHIVED", label: "Archivados" },
];

/** Pestaña Productos — lista completa + archivar (solo ADMIN). */
export function ProductsSection() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, loading, error, refetch } = useApi(
    () => fetchAdminProducts(q, status, page),
    { deps: [q, status, page] }
  );

  async function onArchive(slug: string, name: string, id: string) {
    if (!window.confirm(`¿Archivar "${name}"? Dejará de ser visible al público.`)) return;
    setActionError(null);
    setBusyId(id);
    try {
      await archiveProduct(slug);
      refetch();
    } catch (err) {
      setActionError(err instanceof ApiClientError ? err.message : "No se pudo archivar.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          placeholder="Buscar por nombre, slug o tagline…"
          aria-label="Buscar productos"
          className="max-w-sm"
        />
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => {
                setStatus(f.value);
                setPage(1);
              }}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                status === f.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:border-primary/40"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      {actionError && <Alert variant="destructive">{actionError}</Alert>}

      {loading && (
        <div className="space-y-2" aria-busy="true">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      )}
      {!loading && error && <ErrorState message={error} onRetry={refetch} />}
      {!loading && !error && data && data.items.length === 0 && (
        <EmptyState title="Sin resultados" description="Ningún producto coincide con el filtro." />
      )}

      {!loading && !error && data && data.items.length > 0 && (
        <>
          <div className="space-y-2">
            {data.items.map((p) => {
              const meta = STATUS_META[p.status];
              const busy = busyId === p.id;
              return (
                <Card key={p.id}>
                  <CardContent className="flex flex-wrap items-center gap-3 p-4">
                    <ProductLogo name={p.name} src={p.logoUrl} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{p.name}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {p.maker.name} · {p.maker.email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Lanzamiento: {formatDate(p.launchDate)} · {p._count.upvotes} votos ·{" "}
                        {p._count.comments} comentarios
                      </p>
                    </div>
                    <Badge variant={meta.variant}>{meta.label}</Badge>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/products/${p.slug}`}
                        className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                      >
                        Ver <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                      </Link>
                      {p.status !== "ARCHIVED" && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          onClick={() => onArchive(p.slug, p.name, p.id)}
                        >
                          Archivar
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {data.totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                Página {data.page} de {data.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.totalPages}
                onClick={() => setPage(page + 1)}
              >
                Siguiente
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
