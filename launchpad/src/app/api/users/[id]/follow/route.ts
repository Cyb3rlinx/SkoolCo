export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { requireUser, ApiError } from "@/lib/auth";
import { withErrorHandling, created, noContent, errorResponse } from "@/lib/api";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

type Params = { params: { id: string } };

/** POST /api/users/:id/follow — seguir a un maker (auth). */
export const POST = withErrorHandling(async (_req: Request, { params }: Params) => {
  const user = await requireUser();
  if (params.id === user.id) throw new ApiError(400, "No puedes seguirte a ti mismo.");

  if (!(await checkRateLimit(`follow:${user.id}`, RATE_LIMITS.selfAction))) {
    return errorResponse(429, "Estás siguiendo gente demasiado rápido. Intenta de nuevo en un minuto.");
  }

  const target = await prisma.user.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!target) throw new ApiError(404, "Usuario no encontrado");

  await prisma.follow.upsert({
    where: { followerId_followingId: { followerId: user.id, followingId: target.id } },
    update: {},
    create: { followerId: user.id, followingId: target.id },
  });

  return created({ following: true });
});

/** DELETE /api/users/:id/follow — dejar de seguir (auth). */
export const DELETE = withErrorHandling(async (_req: Request, { params }: Params) => {
  const user = await requireUser();

  if (!(await checkRateLimit(`follow:${user.id}`, RATE_LIMITS.selfAction))) {
    return errorResponse(429, "Estás siguiendo gente demasiado rápido. Intenta de nuevo en un minuto.");
  }

  await prisma.follow.deleteMany({
    where: { followerId: user.id, followingId: params.id },
  });

  return noContent();
});
