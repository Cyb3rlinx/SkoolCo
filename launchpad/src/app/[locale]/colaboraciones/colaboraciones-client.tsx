"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { fetchCollaborations } from "@/lib/frontend/api-client";
import { mockCollaborations } from "@/lib/frontend/mock-data";
import { useApi } from "@/lib/frontend/hooks";
import type { CollaborationType } from "@/lib/frontend/types";
import { PageHeader } from "@/components/layout/page-header";
import { Tabs } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/states";
import { Skeleton } from "@/components/ui/skeleton";
import { CollaborationCard } from "@/components/collaboration/collaboration-card";
import { CreateCollaborationDialog } from "@/components/collaboration/create-collaboration-dialog";

type Tab = "all" | "NEEDS" | "OFFERS";

export function ColaboracionesClient() {
  const t = useTranslations("collaborations");
  const [tab, setTab] = useState<Tab>("all");
  const [q, setQ] = useState("");

  const TAB_ITEMS: { value: Tab; label: string }[] = [
    { value: "all", label: t("tabAll") },
    { value: "NEEDS", label: t("tabNeeds") },
    { value: "OFFERS", label: t("tabOffers") },
  ];

  const query = useMemo(
    () => ({
      type: tab === "all" ? undefined : (tab as CollaborationType),
      q: q || undefined,
      pageSize: 50,
    }),
    [tab, q]
  );

  const { data, loading, error, refetch } = useApi(() => fetchCollaborations(query), {
    fallback: () => ({ items: mockCollaborations, page: 1, pageSize: 50, total: mockCollaborations.length, totalPages: 1 }),
    deps: [tab, q],
  });

  const onCreated = useCallback(() => refetch(), [refetch]);

  return (
    <div className="container-page space-y-8 py-10">
      <PageHeader
        title={t("heading")}
        description={t("subheading")}
        actions={<CreateCollaborationDialog onCreated={onCreated} />}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs items={TAB_ITEMS} value={tab} onChange={(v) => setTab(v as Tab)} />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("searchPlaceholder")}
          aria-label={t("search")}
          className="sm:w-64"
        />
      </div>

      {loading && (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-2xl" />
          ))}
        </div>
      )}

      {!loading && error && <EmptyState title={t("loadError")} description={error} />}

      {!loading && !error && (data?.items.length ?? 0) === 0 && (
        <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
      )}

      {!loading && !error && (data?.items.length ?? 0) > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {data!.items.map((c) => (
            <CollaborationCard key={c.id} collaboration={c} />
          ))}
        </div>
      )}
    </div>
  );
}
