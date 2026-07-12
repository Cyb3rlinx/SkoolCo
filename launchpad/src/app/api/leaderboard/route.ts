export const dynamic = "force-dynamic";
import { getLeaderboard } from "@/lib/leaderboard";
import { withErrorHandling, ok } from "@/lib/api";

/**
 * GET /api/leaderboard?limit=25
 * Ranked community members. Score = live launches*10 + upvotes received*2
 * + comments written*1 (computed from the leaderboard_entries SQL view).
 */
export const GET = withErrorHandling(async (req: Request) => {
  const url = new URL(req.url);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 25));
  const entries = await getLeaderboard(limit);
  return ok(entries);
});
