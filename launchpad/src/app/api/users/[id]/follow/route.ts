export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { requireUser, ApiError } from "@/lib/auth";
import { withErrorHandling, created, noContent } from "@/lib/api";

type Params = { params: { id: string } };

/** POST /api/users/:id/follow — seguir a un maker (auth). */
export const POST = withErrorHandling(async (_req: Request, { params }: Params) => {
  const user = await requireUser();
  if (params.id === user.id) throw new ApiError(400, "No puedes seguirte a ti mismo.");

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

  await prisma.follow.deleteMany({
    where: { followerId: user.id, followingId: params.id },
  });

  return noContent();
});
