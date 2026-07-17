"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
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
  const t = useTranslations("admin.users");
  const tc = useTranslations("admin.common");
  const locale = useLocale();
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
      setActionError(err instanceof ApiClientError ? err.message : tc("errorGenericAction"));
    } finally {
      setBusyId(null);
    }
  }

  function onDelete(user: AdminUserItem) {
    const typed = window.prompt(t("deleteConfirmPrompt", { name: user.name }));
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
        placeholder={t("searchPlaceholder")}
        aria-label={t("searchLabel")}
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
        <EmptyState title={tc("noResultsTitle")} description={tc("noResultsUsers")} />
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
                        {isSelf && <span className="text-xs text-muted-foreground">{t("you")}</span>}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">{u.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {t("registered", { date: formatDate(u.createdAt, locale), count: u._count?.products ?? 0 })}
                      </p>
                    </div>
                    <Badge variant={ROLE_VARIANT[u.role]}>{u.role}</Badge>
                    {u.suspendedAt && <Badge variant="destructive">{t("suspended")}</Badge>}
                    {u.verifiedAt && <Badge variant="secondary">{t("verified")}</Badge>}
                    {!isSelf && (
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          onClick={() =>
                            act(u.id, () => updateAdminUser(u.id, { verified: !u.verifiedAt }))
                          }
                        >
                          {u.verifiedAt ? t("removeVerification") : t("verify")}
                        </Button>
                        <select
                          className="h-9 rounded-lg border bg-background px-2 text-sm"
                          value={u.role}
                          disabled={busy}
                          aria-label={t("roleLabel", { name: u.name })}
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
                          {u.suspendedAt ? t("reactivate") : t("suspend")}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={busy}
                          onClick={() => onDelete(u)}
                        >
                          {t("delete")}
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
                {tc("prev")}
              </Button>
              <span className="text-sm text-muted-foreground">
                {tc("pageOf", { page: data.page, totalPages: data.totalPages })}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.totalPages}
                onClick={() => setPage(page + 1)}
              >
                {tc("next")}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
