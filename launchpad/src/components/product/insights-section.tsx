"use client";

import { useSession } from "next-auth/react";
import { BarChart3 } from "lucide-react";
import { fetchProductInsights } from "@/lib/frontend/api-client";
import { useApi } from "@/lib/frontend/hooks";
import type { InsightsBucket } from "@/lib/frontend/types";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function Sparkline({ buckets, color }: { buckets: InsightsBucket[]; color: string }) {
  const max = Math.max(1, ...buckets.map((b) => b.count));
  const width = 280;
  const height = 48;
  const step = buckets.length > 1 ? width / (buckets.length - 1) : 0;
  const points = buckets
    .map((b, i) => `${i * step},${height - (b.count / max) * (height - 4) - 2}`)
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-12 w-full" aria-hidden>
      <polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/** Mini analytics del producto (votos y comentarios de los últimos 14 días) — solo el dueño. */
export function InsightsSection({ slug, makerId }: { slug: string; makerId: string }) {
  const { data: session } = useSession();
  const isOwner = session?.user?.id === makerId;
  const insights = useApi(() => fetchProductInsights(slug), { deps: [slug], enabled: isOwner });

  if (!isOwner) return null;

  const upvoteTotal = insights.data?.upvotes.reduce((sum, b) => sum + b.count, 0) ?? 0;
  const commentTotal = insights.data?.comments.reduce((sum, b) => sum + b.count, 0) ?? 0;

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <p className="flex items-center gap-2 text-sm font-bold">
          <BarChart3 className="h-4 w-4 text-primary" aria-hidden />
          Insights (últimos 14 días)
        </p>

        {insights.loading && <Skeleton className="h-24 w-full rounded-xl" aria-busy="true" />}

        {!insights.loading && insights.data && (
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Votos · {upvoteTotal} en total</p>
              <Sparkline buckets={insights.data.upvotes} color="hsl(var(--primary))" />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Comentarios · {commentTotal} en total</p>
              <Sparkline buckets={insights.data.comments} color="hsl(var(--muted-foreground))" />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
