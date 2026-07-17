"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  ApiClientError,
  fetchAdminUsers,
  fetchUserBadges,
  grantBadge,
  revokeBadge,
} from "@/lib/frontend/api-client";
import { useApi } from "@/lib/frontend/hooks";
import type { BadgeInfo } from "@/lib/frontend/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";

/** Pestaña Insignias — buscar usuario, otorgar/revocar insignias del catálogo (solo ADMIN). */
export function BadgesSection() {
  const t = useTranslations("admin.badges");
  const tc = useTranslations("admin.common");

  const BADGE_CATALOG: BadgeInfo[] = [
    { slug: "fundador", name: t("catalogFundadorName"), description: t("catalogFundadorDescription"), icon: "🏛️" },
    { slug: "primer-lanzamiento", name: t("catalogFirstLaunchName"), description: t("catalogFirstLaunchDescription"), icon: "🚀" },
    { slug: "top-10-mes", name: t("catalogTopMonthName"), description: t("catalogTopMonthDescription"), icon: "🏆" },
    { slug: "vendido", name: t("catalogSoldName"), description: t("catalogSoldDescription"), icon: "🤝" },
  ];

  const [q, setQ] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserName, setSelectedUserName] = useState<string>("");
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: searchResults, loading: searchLoading } = useApi(
    () => fetchAdminUsers(q, 1),
    { deps: [q], enabled: q.trim().length > 0 }
  );

  const {
    data: userBadges,
    loading: badgesLoading,
    error: badgesError,
    refetch: refetchBadges,
  } = useApi(() => fetchUserBadges(selectedUserId as string), {
    deps: [selectedUserId],
    enabled: selectedUserId !== null,
  });

  async function act(slug: string, fn: () => Promise<unknown>) {
    setActionError(null);
    setBusySlug(slug);
    try {
      await fn();
      refetchBadges();
    } catch (err) {
      setActionError(err instanceof ApiClientError ? err.message : tc("errorGenericAction"));
    } finally {
      setBusySlug(null);
    }
  }

  const heldSlugs = new Set((userBadges ?? []).map((b) => b.slug));

  return (
    <div className="space-y-4">
      <Input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setSelectedUserId(null);
        }}
        placeholder={t("searchPlaceholder")}
        aria-label={t("searchLabel")}
      />

      {q.trim().length > 0 && !selectedUserId && (
        <div className="space-y-2">
          {searchLoading && <Skeleton className="h-12 rounded-xl" />}
          {!searchLoading && searchResults && searchResults.items.length === 0 && (
            <EmptyState title={tc("noResultsTitle")} description={tc("noResultsUsers")} />
          )}
          {!searchLoading &&
            searchResults?.items.map((u) => (
              <button
                key={u.id}
                type="button"
                className="w-full rounded-xl border p-3 text-left text-sm hover:bg-muted/50"
                onClick={() => {
                  setSelectedUserId(u.id);
                  setSelectedUserName(u.name);
                }}
              >
                <span className="font-semibold">{u.name}</span>{" "}
                <span className="text-muted-foreground">{u.email}</span>
              </button>
            ))}
        </div>
      )}

      {selectedUserId && (
        <Card>
          <CardContent className="space-y-4 p-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold">{t("badgesOf", { name: selectedUserName })}</p>
              <Button variant="outline" size="sm" onClick={() => setSelectedUserId(null)}>
                {t("changeUser")}
              </Button>
            </div>

            {actionError && <Alert variant="destructive">{actionError}</Alert>}
            {badgesLoading && <Skeleton className="h-16 rounded-xl" />}
            {!badgesLoading && badgesError && <ErrorState message={badgesError} onRetry={refetchBadges} />}

            {!badgesLoading && !badgesError && (
              <div className="space-y-2">
                {BADGE_CATALOG.map((b) => {
                  const held = heldSlugs.has(b.slug);
                  const busy = busySlug === b.slug;
                  return (
                    <div
                      key={b.slug}
                      className="flex items-center justify-between gap-3 rounded-xl border p-3"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="text-lg" aria-hidden>
                          {b.icon}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{b.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{b.description}</p>
                        </div>
                        {held && <Badge variant="secondary">{t("granted")}</Badge>}
                      </div>
                      <Button
                        variant={held ? "destructive" : "outline"}
                        size="sm"
                        disabled={busy}
                        onClick={() =>
                          act(b.slug, () =>
                            held
                              ? revokeBadge(selectedUserId, b.slug)
                              : grantBadge(selectedUserId, b.slug)
                          )
                        }
                      >
                        {held ? t("revoke") : t("grant")}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
