"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import {
  ApiClientError,
  deleteAdminUser,
  fetchAdminUsers,
  updateAdminUser,
} from "@/lib/frontend/api-client";
import { useApi } from "@/lib/frontend/hooks";
import { formatDate } from "@/lib/frontend/format";
import type { AdminUserItem } from "@/lib/frontend/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";

const ROLE_VARIANT: Record<AdminUserItem["role"], "outline" | "secondary" | "gradient"> = {
  USER: "outline",
  MODERATOR: "secondary",
  ADMIN: "gradient",
};

/** Pestaña Usuarios — lista + rol / suspensión / borrado (solo ADMIN). */
export function UsersSection() {
  const { data: session } = useSession();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, loading, error, refetch } = useApi(
    () => fetchAdminUsers(q, page),
    { deps: [q, page] }
  );

  async function act(id: string, fn: () => Promise<unknown>) {
    setActionError(null);
    setBusyId(id);
    try {
      await fn();
      refetch();
    } catch (err) {
      setActionError(err instanceof ApiClientError ? err.message : "No se pudo completar la acción.");
    } finally {
      setBusyId(null);
    }
  }

  function onDelete(user: AdminUserItem) {
    const typed = window.prompt(
      `Esto borra la cuenta y TODO su contenido (productos, votos, comentarios). ` +
        `Escribe el nombre exacto del usuario para confirmar: ${user.name}`
    );
    if (typed !== user.name) return;
    act(user.id, () => deleteAdminUser(user.id));
  }

  return (
    <div className="space-y-4">
      <Input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setPage(1);
        }}
        placeholder="Buscar por nombre o email…"
        aria-label="Buscar usuarios"
      />
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
        <EmptyState title="Sin resultados" description="Ningún usuario coincide con la búsqueda." />
      )}

      {!loading && !error && data && data.items.length > 0 && (
        <>
          <div className="space-y-2">
            {data.items.map((u) => {
              const isSelf = session?.user?.id === u.id;
              const busy = busyId === u.id;
              return (
                <Card key={u.id}>
                  <CardContent className="flex flex-wrap items-center gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">
                        {u.name}{" "}
                        {isSelf && <span className="text-xs text-muted-foreground">(tú)</span>}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">{u.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Registro: {formatDate(u.createdAt)} · {u._count?.products ?? 0} productos
                      </p>
                    </div>
                    <Badge variant={ROLE_VARIANT[u.role]}>{u.role}</Badge>
                    {u.suspendedAt && <Badge variant="destructive">Suspendido</Badge>}
                    {!isSelf && (
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          className="h-9 rounded-lg border bg-background px-2 text-sm"
                          value={u.role}
                          disabled={busy}
                          aria-label={`Rol de ${u.name}`}
                          onChange={(e) =>
                            act(u.id, () =>
                              updateAdminUser(u.id, {
                                role: e.target.value as AdminUserItem["role"],
                              })
                            )
                          }
                        >
                          <option value="USER">USER</option>
                          <option value="MODERATOR">MODERATOR</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          onClick={() =>
                            act(u.id, () =>
                              updateAdminUser(u.id, { suspended: !u.suspendedAt })
                            )
                          }
                        >
                          {u.suspendedAt ? "Reactivar" : "Suspender"}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={busy}
                          onClick={() => onDelete(u)}
                        >
                          Borrar
                        </Button>
                      </div>
                    )}
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
