import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LeaderboardClient } from "./leaderboard-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("leaderboard");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default function LeaderboardPage() {
  return <LeaderboardClient />;
}
