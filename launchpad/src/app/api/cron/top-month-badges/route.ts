export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/auth";
import { withErrorHandling, ok } from "@/lib/api";
import { previousCalendarMonthRange } from "@/lib/top-month";
import { grantBadgeIfMissing } from "@/lib/badges";

/**
 * GET /api/cron/top-month-badges — corre el día 1 de cada mes vía Vercel
 * Cron. Calcula el top 10 de productos por votos recibidos durante el mes
 * calendario anterior y otorga "top-10-mes" a cada maker dueño (skip-if-exists,
 * es un logro de una sola vez).
 */
export const GET = withErrorHandling(async (req: Request) => {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    throw new ApiError(401, "Unauthorized");
  }

  const { start, end } = previousCalendarMonthRange(new Date());

  const topProducts = await prisma.product.findMany({
    where: { status: "LIVE" },
    select: {
      makerId: true,
      _count: { select: { upvotes: { where: { createdAt: { gte: start, lt: end } } } } },
    },
  });

  const top10 = topProducts
    .map((p) => ({ makerId: p.makerId, votes: p._count.upvotes }))
    .filter((p) => p.votes > 0)
    .sort((a, b) => b.votes - a.votes)
    .slice(0, 10);

  for (const { makerId } of top10) {
    await grantBadgeIfMissing(makerId, "top-10-mes", null);
  }

  return ok({ monthStart: start.toISOString(), monthEnd: end.toISOString(), granted: top10.length });
});
