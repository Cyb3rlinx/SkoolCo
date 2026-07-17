export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/auth";
import { withErrorHandling, ok } from "@/lib/api";
import { selectExpiredCollaborations } from "@/lib/collaboration-cleanup";

/**
 * GET /api/cron/collaboration-cleanup — corre a diario vía Vercel Cron.
 * Borra (hard delete) las colaboraciones con más de 35 días de antigüedad.
 * Protegido con CRON_SECRET igual que /api/cron/offer-nudge.
 */
export const GET = withErrorHandling(async (req: Request) => {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    throw new ApiError(401, "Unauthorized");
  }

  const collaborations = await prisma.collaboration.findMany({
    select: { id: true, createdAt: true },
  });

  const expired = selectExpiredCollaborations(collaborations, new Date());

  if (expired.length > 0) {
    await prisma.collaboration.deleteMany({
      where: { id: { in: expired.map((c) => c.id) } },
    });
  }

  return ok({ checked: collaborations.length, deleted: expired.length });
});
