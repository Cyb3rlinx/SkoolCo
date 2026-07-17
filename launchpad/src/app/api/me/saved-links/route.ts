export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { withErrorHandling, ok } from "@/lib/api";

const linkSelect = {
  id: true,
  title: true,
  url: true,
  sourcePlatform: true,
  type: true,
  status: true,
  createdAt: true,
  submittedBy: { select: { id: true, name: true, avatarUrl: true } },
} as const;

/**
 * GET /api/me/saved-links — mis logros de la extensión guardados, más
 * recientes primero. Solo VERIFIED: si un logro guardado fue despublicado
 * por moderación, deja de aparecer.
 */
export const GET = withErrorHandling(async () => {
  const user = await requireUser();

  const saved = await prisma.savedCommunityLink.findMany({
    where: { userId: user.id, link: { status: "VERIFIED" } },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { link: { select: linkSelect } },
  });

  return ok(saved.map((s) => s.link));
});
