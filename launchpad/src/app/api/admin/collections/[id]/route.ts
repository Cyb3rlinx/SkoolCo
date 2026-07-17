export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { requireAdmin, ApiError } from "@/lib/auth";
import { withErrorHandling, noContent } from "@/lib/api";

type Params = { params: { id: string } };

/** DELETE /api/admin/collections/:id — borra la colección (solo ADMIN). */
export const DELETE = withErrorHandling(async (_req: Request, { params }: Params) => {
  await requireAdmin();
  const collection = await prisma.collection.findUnique({
    where: { id: params.id },
    select: { id: true },
  });
  if (!collection) throw new ApiError(404, "Colección no encontrada");

  await prisma.collection.delete({ where: { id: params.id } });
  return noContent();
});
