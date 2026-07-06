import type { Metadata } from "next";
import { LeaderboardClient } from "./leaderboard-client";

export const metadata: Metadata = {
  title: "Ranking de la comunidad",
  description:
    "Quiénes más aportan a la comunidad: lanzamientos, votos recibidos y feedback dado.",
};

export default function LeaderboardPage() {
  return <LeaderboardClient />;
}
