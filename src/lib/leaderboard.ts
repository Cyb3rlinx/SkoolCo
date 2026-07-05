import { prisma } from "@/lib/db";

export interface LeaderboardEntry {
  userId: string;
  name: string;
  avatarUrl: string | null;
  launchesCount: number;
  upvotesReceived: number;
  commentsCount: number;
  score: number;
}

/**
 * Reads the `leaderboard_entries` SQL view (created in migration
 * 20260705000002). Score = launches*10 + upvotes received*2 + comments*1.
 * Computed live from source tables, so it can never drift out of sync.
 */
export async function getLeaderboard(limit = 25): Promise<LeaderboardEntry[]> {
  const rows = await prisma.$queryRaw<
    Array<{
      user_id: string;
      name: string;
      avatar_url: string | null;
      launches_count: number;
      upvotes_received: number;
      comments_count: number;
      score: number;
    }>
  >`
    SELECT * FROM "leaderboard_entries"
    WHERE "score" > 0
    ORDER BY "score" DESC, "name" ASC
    LIMIT ${limit}
  `;

  return rows.map((r) => ({
    userId: r.user_id,
    name: r.name,
    avatarUrl: r.avatar_url,
    launchesCount: r.launches_count,
    upvotesReceived: r.upvotes_received,
    commentsCount: r.comments_count,
    score: r.score,
  }));
}
