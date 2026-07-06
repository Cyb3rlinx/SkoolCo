"use client";

import Link from "next/link";
import { Trophy } from "lucide-react";
import { fetchLeaderboard } from "@/lib/frontend/api-client";
import { mockLeaderboard } from "@/lib/frontend/mock-data";
import { useApi } from "@/lib/frontend/hooks";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const MEDALS = ["🥇", "🥈", "🥉"];

/** Compact top-5 leaderboard for the landing page. */
export function LeaderboardPreview() {
  const { data, loading } = useApi(fetchLeaderboard, { fallback: () => mockLeaderboard });
  const top = (data ?? []).slice(0, 5);

  return (
    <Card className="overflow-hidden">
      <div className="brand-gradient flex items-center gap-2 px-5 py-4 text-white">
        <Trophy className="h-5 w-5" aria-hidden />
        <p className="font-extrabold">Top de la comunidad</p>
      </div>
      <CardContent className="p-2">
        {loading ? (
          <div className="space-y-1 p-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-11 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <ul>
            {top.map((entry, i) => (
              <li
                key={entry.userId}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted"
              >
                <span className="w-6 text-center text-sm font-bold" aria-hidden>
                  {MEDALS[i] ?? i + 1}
                </span>
                <Avatar name={entry.name} src={entry.avatarUrl} size="sm" />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{entry.name}</span>
                <span className="shrink-0 text-sm font-extrabold text-primary">{entry.score}</span>
              </li>
            ))}
          </ul>
        )}
        <Link
          href="/leaderboard"
          className="mt-1 block rounded-xl px-3 py-2.5 text-center text-sm font-semibold text-primary transition-colors hover:bg-accent"
        >
          Ver ranking completo →
        </Link>
      </CardContent>
    </Card>
  );
}
