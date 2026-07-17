export const dynamic = "force-dynamic";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser, ApiError } from "@/lib/auth";
import { withErrorHandling, ok, errorResponse } from "@/lib/api";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

type Params = { params: { id: string } };

/**
 * POST /api/community-links/:id/save — guardar un logro de la extensión en
 * favoritos. Solo logros VERIFIED (los únicos públicos). Mismo patrón que
 * el guardado de productos: unique (user_id, link_id), llamadas repetidas
 * idempotentes.
 */
export const POST = withErrorHandling(async (_req: Request, { params }: Params) => {
  const user = await requireUser();

  if (!(await checkRateLimit(`save:${user.id}`, RATE_LIMITS.save))) {
    return errorResponse(429, "Slow down a little — too many changes in a short time.");
  }

  const link = await prisma.communityLink.findUnique({
    where: { id: params.id },
    select: { id: true, status: true },
  });
  if (!link || link.status !== "VERIFIED") {
    throw new ApiError(404, "Achievement not found");
  }

  try {
    await prisma.savedCommunityLink.create({
      data: { userId: user.id, linkId: link.id },
    });
  } catch (err) {
    // P2002 = unique constraint violation -> already saved; treat as idempotent.
    if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")) {
      throw err;
    }
  }

  return ok({ saved: true });
});

/** DELETE /api/community-links/:id/save — quitar de favoritos (idempotente). */
export const DELETE = withErrorHandling(async (_req: Request, { params }: Params) => {
  const user = await requireUser();

  if (!(await checkRateLimit(`save:${user.id}`, RATE_LIMITS.save))) {
    return errorResponse(429, "Slow down a little — too many changes in a short time.");
  }

  await prisma.savedCommunityLink.deleteMany({
    where: { userId: user.id, linkId: params.id },
  });

  return ok({ saved: false });
});
