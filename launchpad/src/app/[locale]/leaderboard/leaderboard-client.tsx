"use client";

import { useTranslations } from "next-intl";
import { Crown, MessageCircle, Rocket, ThumbsUp, Trophy } from "lucide-react";
import { fetchLeaderboard } from "@/lib/frontend/api-client";
import { mockLeaderboard } from "@/lib/frontend/mock-data";
import { useApi } from "@/lib/frontend/hooks";
import { cn } from "@/lib/frontend/utils";
import type { LeaderboardEntry } from "@/lib/frontend/types";
import { PageHeader } from "@/components/layout/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { buttonVariants } from "@/components/ui/button";
import { DemoBanner, EmptyState, ErrorState } from "@/components/ui/states";
import { Link } from "@/i18n/navigation";

const PODIUM_STYLES = [
  "border-warning/50 bg-warning/5", // 1st gold
  "border-border bg-muted/50", // 2nd silver
  "border-[#b4713f]/40 bg-[#b4713f]/5", // 3rd bronze
];

function PodiumCard({ entry, place }: { entry: LeaderboardEntry; place: number }) {
  const t = useTranslations("leaderboard");
  return (
    <Card className={cn("relative overflow-hidden text-center", PODIUM_STYLES[place - 1])}>
      <CardContent className="flex flex-col items-center gap-2 p-6">
        {place === 1 && (
          <Crown className="absolute right-4 top-4 h-5 w-5 text-warning" aria-hidden />
        )}
        <span
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full text-sm font-extrabold text-white",
            place === 1 ? "bg-warning" : place === 2 ? "bg-muted-foreground" : "bg-[#b4713f]"
          )}
          aria-label={t("place", { place })}
        >
          {place}
        </span>
        <Avatar name={entry.name} src={entry.avatarUrl} size="xl" />
        <p className="text-lg font-extrabold">{entry.name}</p>
        <p className="brand-text-gradient text-2xl font-extrabold">{t("pts", { score: entry.score })}</p>
        <p className="text-xs text-muted-foreground">
          {t("statsLine", {
            launches: entry.launchesCount,
            votes: entry.upvotesReceived,
            comments: entry.commentsCount,
          })}
        </p>
      </CardContent>
    </Card>
  );
}

/** Community leaderboard — GET /api/leaderboard (live SQL view). */
export function LeaderboardClient() {
  const t = useTranslations("leaderboard");
  const { data, loading, error, demo, refetch } = useApi(fetchLeaderboard, {
    fallback: () => mockLeaderboard,
  });

  const podium = data?.slice(0, 3) ?? [];
  const rest = data?.slice(3) ?? [];

  return (
    <div className="container-page space-y-8 py-10">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={demo ? <DemoBanner /> : undefined}
      />

      {loading && (
        <div className="space-y-6" aria-busy="true">
          <div className="grid gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-56 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      )}

      {!loading && error && <ErrorState message={error} onRetry={refetch} />}

      {!loading && !error && data && data.length === 0 && (
        <EmptyState
          title={t("emptyTitle")}
          description={t("emptyDescription")}
          action={
            <Link href="/submit" className={buttonVariants({ variant: "gradient" })}>
              {t("publishMyProduct")}
            </Link>
          }
        />
      )}

      {!loading && !error && podium.length > 0 && (
        <>
          {/* Podium: winner centered on desktop */}
          <div className="grid gap-4 sm:grid-cols-3">
            {podium.length >= 2 && (
              <div className="sm:order-1 sm:mt-6">
                <PodiumCard entry={podium[1]} place={2} />
              </div>
            )}
            <div className="sm:order-2">
              <PodiumCard entry={podium[0]} place={1} />
            </div>
            {podium.length >= 3 && (
              <div className="sm:order-3 sm:mt-6">
                <PodiumCard entry={podium[2]} place={3} />
              </div>
            )}
          </div>

          {/* Rest of the table */}
          {rest.length > 0 && (
            <Card>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <caption className="sr-only">{t("fullRankingCaption")}</caption>
                  <thead>
                    <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th scope="col" className="px-5 py-3 font-semibold">#</th>
                      <th scope="col" className="px-2 py-3 font-semibold">{t("member")}</th>
                      <th scope="col" className="hidden px-2 py-3 font-semibold sm:table-cell">
                        <span className="inline-flex items-center gap-1"><Rocket className="h-3.5 w-3.5" aria-hidden />{t("launches")}</span>
                      </th>
                      <th scope="col" className="hidden px-2 py-3 font-semibold sm:table-cell">
                        <span className="inline-flex items-center gap-1"><ThumbsUp className="h-3.5 w-3.5" aria-hidden />{t("votes")}</span>
                      </th>
                      <th scope="col" className="hidden px-2 py-3 font-semibold md:table-cell">
                        <span className="inline-flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" aria-hidden />{t("comments")}</span>
                      </th>
                      <th scope="col" className="px-5 py-3 text-right font-semibold">
                        <span className="inline-flex items-center gap-1"><Trophy className="h-3.5 w-3.5" aria-hidden />{t("points")}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rest.map((entry, i) => (
                      <tr key={entry.userId} className="border-b last:border-b-0 hover:bg-muted/50">
                        <td className="px-5 py-3 font-bold text-muted-foreground">{i + 4}</td>
                        <td className="px-2 py-3">
                          <span className="flex items-center gap-2.5 font-semibold">
                            <Avatar name={entry.name} src={entry.avatarUrl} size="sm" />
                            {entry.name}
                          </span>
                        </td>
                        <td className="hidden px-2 py-3 sm:table-cell">{entry.launchesCount}</td>
                        <td className="hidden px-2 py-3 sm:table-cell">{entry.upvotesReceived}</td>
                        <td className="hidden px-2 py-3 md:table-cell">{entry.commentsCount}</td>
                        <td className="px-5 py-3 text-right font-extrabold">{entry.score}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {/* CTA */}
          <div className="brand-gradient flex flex-col items-center gap-3 rounded-2xl p-8 text-center text-white sm:flex-row sm:justify-between sm:text-left">
            <div>
              <p className="text-lg font-extrabold">{t("ctaTitle")}</p>
              <p className="text-sm text-white/85">{t("ctaBody")}</p>
            </div>
            <Link
              href="/submit"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "border-white/40 bg-white/10 text-white hover:bg-white/20")}
            >
              {t("publishProduct")}
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
