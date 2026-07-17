"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Trophy } from "lucide-react";
import { fetchSavedCommunityLinks, unsaveCommunityLink } from "@/lib/frontend/api-client";
import { useApi } from "@/lib/frontend/hooks";
import type { CommunityLink } from "@/lib/frontend/types";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";
import { AchievementCard } from "@/components/achievement/achievement-card";

/** Logros de la extensión que el usuario guardó desde /logros. */
export function SavedAchievementsSection() {
  const t = useTranslations("achievements");
  const saved = useApi(fetchSavedCommunityLinks, {});
  const [busyId, setBusyId] = useState<string | null>(null);

  async function onUnsave(link: CommunityLink) {
    setBusyId(link.id);
    try {
      await unsaveCommunityLink(link.id);
      saved.setData((prev) => (prev ? prev.filter((l) => l.id !== link.id) : prev));
    } finally {
      setBusyId(null);
    }
  }

  // Sin guardados → no ocupar espacio en el perfil.
  if (!saved.loading && !saved.error && (saved.data?.length ?? 0) === 0) {
    return null;
  }

  return (
    <section className="space-y-4" aria-labelledby="saved-achievements-title">
      <h2 id="saved-achievements-title" className="flex items-center gap-2 text-xl font-extrabold">
        <Trophy className="h-5 w-5 text-primary" aria-hidden />
        {t("savedSectionTitle")}
      </h2>

      {saved.loading && (
        <div className="space-y-3" aria-busy="true">
          <Skeleton className="h-20 w-full rounded-2xl" />
        </div>
      )}
      {!saved.loading && saved.error && (
        <ErrorState message={saved.error} onRetry={saved.refetch} />
      )}

      <div className="space-y-3">
        {saved.data?.map((link) => (
          <AchievementCard
            key={link.id}
            link={link}
            saved
            busy={busyId === link.id}
            onToggleSave={onUnsave}
          />
        ))}
      </div>
    </section>
  );
}
