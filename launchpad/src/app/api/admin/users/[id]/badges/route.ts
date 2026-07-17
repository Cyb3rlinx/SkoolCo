export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { requireAdmin, ApiError } from "@/lib/auth";
import { grantBadgeSchema } from "@/lib/validation";
import { withErrorHandling, parseBody, ok, created, noContent } from "@/lib/api";
import { grantBadgeIfMissing } from "@/lib/badges";

type Params = { params: { id: string } };

/** GET /api/admin/users/:id/badges — insignias actuales del usuario (solo ADMIN). */
export const GET = withErrorHandling(async (_req: Request, { params }: Params) => {
  await requireAdmin();
  const target = await prisma.user.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!target) throw new ApiError(404, "Usuario no encontrado");

  const userBadges = await prisma.userBadge.findMany({
    where: { userId: target.id },
    select: {
      badge: { select: { slug: true, name: true, description: true, icon: true } },
      grantedById: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return ok(
    userBadges.map((ub) => ({
      ...ub.badge,
      grantedByAdmin: ub.grantedById !== null,
      createdAt: ub.createdAt.toISOString(),
    }))
  );
});

/** POST /api/admin/users/:id/badges — otorga una insignia del catálogo (solo ADMIN). */
export const POST = withErrorHandling(async (req: Request, { params }: Params) => {
  const admin = await requireAdmin();
  const target = await prisma.user.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!target) throw new ApiError(404, "Usuario no encontrado");

  const input = await parseBody(req, grantBadgeSchema);
  const badge = await prisma.badge.findUnique({ where: { slug: input.badgeSlug } });
  if (!badge) throw new ApiError(404, "Insignia no encontrada");

  await grantBadgeIfMissing(target.id, input.badgeSlug, admin.id);

  return created({ userId: target.id, badgeSlug: input.badgeSlug });
});

/** DELETE /api/admin/users/:id/badges?slug=xxx — revoca una insignia (solo ADMIN). */
export const DELETE = withErrorHandling(async (req: Request, { params }: Params) => {
  await requireAdmin();
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");
  if (!slug) throw new ApiError(400, "Falta el parámetro slug");

  const badge = await prisma.badge.findUnique({ where: { slug }, select: { id: true } });
  if (!badge) throw new ApiError(404, "Insignia no encontrada");

  await prisma.userBadge.deleteMany({ where: { userId: params.id, badgeId: badge.id } });

  return noContent();
});
