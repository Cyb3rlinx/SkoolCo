"use client";

import { useLocale, useTranslations } from "next-intl";
import { ExternalLink, Trophy } from "lucide-react";
import { fetchCommunityLinks } from "@/lib/frontend/api-client";
import { mockCommunityLinks } from "@/lib/frontend/mock-data";
import { useApi } from "@/lib/frontend/hooks";
import { timeAgo } from "@/lib/frontend/format";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DemoBanner, EmptyState, ErrorState } from "@/components/ui/states";

/**
 * Public wall of VERIFIED community achievements.
 * Data: GET /api/community-links (returns VERIFIED only). Every card links
 * OUT to the original public Skool post — supporting a logro is always a
 * manual, human click on the real post. No engagement happens here.
 */
export function LogrosWall() {
  const t = useTranslations("extension.wall");
  const locale = useLocale();
  const { data, loading, error, demo, refetch } = useApi(() => fetchCommunityLinks(false), {
    fallback: () => mockCommunityLinks,
  });

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const links = data ?? [];

  if (links.length === 0) {
    return <EmptyState icon="inbox" title={t("emptyTitle")} description={t("emptyDescription")} />;
  }

  return (
    <div className="space-y-4">
      {demo && <DemoBanner />}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((link) => (
          <Card key={link.id} className="flex flex-col transition-all hover:-translate-y-0.5 hover:shadow-lift">
            <CardContent className="flex flex-1 flex-col gap-3 p-5">
              <div className="flex items-center justify-between">
                <span className="brand-gradient flex h-9 w-9 items-center justify-center rounded-lg text-white">
                  <Trophy className="h-4 w-4" aria-hidden />
                </span>
                <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold uppercase text-accent-foreground">
                  {link.type}
                </span>
              </div>

              <p className="flex-1 font-bold leading-snug">{link.title}</p>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Avatar name={link.submittedBy.name} src={link.submittedBy.avatarUrl} size="xs" />
                {link.submittedBy.name} · {timeAgo(link.createdAt, locale)}
              </div>

              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border py-2 text-sm font-semibold transition-colors hover:border-primary/40 hover:text-primary"
              >
                {t("openPost")}
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-center text-xs text-muted-foreground">{t("supportNote")}</p>
    </div>
  );
}
