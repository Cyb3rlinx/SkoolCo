"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import {
  fetchCommunityLinks,
  fetchSavedCommunityLinks,
  saveCommunityLink,
  unsaveCommunityLink,
} from "@/lib/frontend/api-client";
import { mockCommunityLinks } from "@/lib/frontend/mock-data";
import { useApi } from "@/lib/frontend/hooks";
import type { CommunityLink } from "@/lib/frontend/types";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { AchievementCard } from "@/components/achievement/achievement-card";

export function LogrosClient() {
  const t = useTranslations("achievements");
  const { status } = useSession();
  const authed = status === "authenticated";

  const { data, loading, error, refetch } = useApi(() => fetchCommunityLinks(), {
    fallback: () => mockCommunityLinks.filter((l) => l.status === "VERIFIED"),
  });

  // Guardados del usuario → set de ids para pintar el estado del bookmark.
  const savedList = useApi(fetchSavedCommunityLinks, { enabled: authed });
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const savedIds = new Set(savedList.data?.map((l) => l.id) ?? []);
  const isSaved = (id: string) => overrides[id] ?? savedIds.has(id);

  async function toggleSave(link: CommunityLink) {
    const next = !isSaved(link.id);
    setBusyId(link.id);
    // Optimista: revertimos si la API falla.
    setOverrides((prev) => ({ ...prev, [link.id]: next }));
    try {
      if (next) await saveCommunityLink(link.id);
      else await unsaveCommunityLink(link.id);
    } catch {
      setOverrides((prev) => ({ ...prev, [link.id]: !next }));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="container-page space-y-8 py-10">
      <PageHeader title={t("heading")} description={t("subheading")} />

      {loading && (
        <div className="space-y-3" aria-busy="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      )}

      {!loading && error && <ErrorState message={t("loadError")} onRetry={refetch} />}

      {!loading && !error && (data?.length ?? 0) === 0 && (
        <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
      )}

      {!loading && !error && (data?.length ?? 0) > 0 && (
        <div className="space-y-3">
          {data!.map((link) => (
            <AchievementCard
              key={link.id}
              link={link}
              saved={isSaved(link.id)}
              busy={busyId === link.id}
              onToggleSave={authed ? toggleSave : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
