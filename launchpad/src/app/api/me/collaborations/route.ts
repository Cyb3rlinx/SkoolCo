export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { withErrorHandling, ok } from "@/lib/api";

/** GET /api/me/collaborations — mis anuncios publicados. */
export const GET = withErrorHandling(async () => {
  const user = await requireUser();

  const collaborations = await prisma.collaboration.findMany({
    where: { authorId: user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, type: true, title: true, createdAt: true },
  });

  return ok(collaborations);
});
