"use client";

import { useState } from "react";
import {
  ApiClientError,
  addToCollection,
  createCollection,
  deleteCollection,
  fetchAdminProducts,
  fetchCollection,
  fetchCollections,
  removeFromCollection,
} from "@/lib/frontend/api-client";
import { useApi } from "@/lib/frontend/hooks";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";

/** Pestaña Colecciones — crear, borrar, y agregar/quitar productos (solo ADMIN). */
export function CollectionsSection() {
  const { data, loading, error, refetch } = useApi(fetchCollections, {});
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function onCreate() {
    setCreateError(null);
    setCreating(true);
    try {
      await createCollection({ title: title.trim(), description: description.trim() });
      setTitle("");
      setDescription("");
      refetch();
    } catch (err) {
      setCreateError(err instanceof ApiClientError ? err.message : "No se pudo crear la colección.");
    } finally {
      setCreating(false);
    }
  }

  async function onDelete(id: string) {
    if (!window.confirm("¿Borrar esta colección? No borra los productos, solo la selección.")) return;
    await deleteCollection(id);
    refetch();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-3 p-4">
          <p className="font-semibold">Nueva colección</p>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título (ej. Mejores herramientas de IA de la semana)"
          />
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descripción corta"
          />
          {createError && <Alert variant="destructive">{createError}</Alert>}
          <Button
            size="sm"
            disabled={creating || title.trim().length < 3 || description.trim().length < 10}
            onClick={onCreate}
          >
            {creating ? "Creando…" : "Crear colección"}
          </Button>
        </CardContent>
      </Card>

      {loading && <Skeleton className="h-24 rounded-2xl" aria-busy="true" />}
      {!loading && error && <ErrorState message={error} onRetry={refetch} />}
      {!loading && !error && data && data.length === 0 && (
        <EmptyState title="Sin colecciones" description="Crea la primera arriba." />
      )}

      {!loading && !error && data && data.length > 0 && (
        <div className="space-y-3">
          {data.map((c) => (
            <Card key={c.id}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{c.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.productCount} productos · /colecciones/{c.slug}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                    >
                      {expandedId === c.id ? "Cerrar" : "Gestionar productos"}
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => onDelete(c.id)}>
                      Borrar
                    </Button>
                  </div>
                </div>
                {expandedId === c.id && (
                  <CollectionProductManager
                    collectionId={c.id}
                    slug={c.slug}
                    onChanged={refetch}
                  />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function CollectionProductManager({
  collectionId,
  slug,
  onChanged,
}: {
  collectionId: string;
  slug: string;
  onChanged: () => void;
}) {
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const current = useApi(() => fetchCollection(slug), { deps: [slug] });
  const { data: results, loading: searching } = useApi(() => fetchAdminProducts(q, "", 1), {
    deps: [q],
    enabled: q.trim().length > 0,
  });

  async function onAdd(productId: string) {
    setActionError(null);
    setBusyId(productId);
    try {
      await addToCollection(collectionId, productId);
      current.refetch();
      onChanged();
    } catch (err) {
      setActionError(err instanceof ApiClientError ? err.message : "No se pudo agregar.");
    } finally {
      setBusyId(null);
    }
  }

  async function onRemove(productId: string) {
    setActionError(null);
    setBusyId(productId);
    try {
      await removeFromCollection(collectionId, productId);
      current.refetch();
      onChanged();
    } catch (err) {
      setActionError(err instanceof ApiClientError ? err.message : "No se pudo quitar.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-3 border-t pt-3">
      {actionError && <Alert variant="destructive">{actionError}</Alert>}

      <div>
        <p className="mb-1 text-xs font-semibold text-muted-foreground">Productos en la colección</p>
        {current.loading && <Skeleton className="h-10 rounded-lg" />}
        {!current.loading && (current.data?.products.length ?? 0) === 0 && (
          <p className="text-xs text-muted-foreground">Sin productos todavía.</p>
        )}
        <div className="space-y-1">
          {current.data?.products.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-lg border p-2 text-sm">
              <span>{p.name}</span>
              <Button
                variant="destructive"
                size="sm"
                disabled={busyId === p.id}
                onClick={() => onRemove(p.id)}
              >
                Quitar
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-1 text-xs font-semibold text-muted-foreground">Agregar producto</p>
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar producto por nombre…"
        />
        {q.trim().length > 0 && (
          <div className="mt-1 space-y-1">
            {searching && <Skeleton className="h-10 rounded-lg" />}
            {!searching &&
              results?.items.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg border p-2 text-sm">
                  <span>{p.name}</span>
                  <Button size="sm" disabled={busyId === p.id} onClick={() => onAdd(p.id)}>
                    Agregar
                  </Button>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
