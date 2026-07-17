export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { requireAdmin, ApiError } from "@/lib/auth";
import { withErrorHandling, ok } from "@/lib/api";

type Params = { params: { id: string } };

/**
 * POST /api/admin/products/:id/verify-mrr — alterna la verificación del MRR
 * declarado (solo ADMIN). Confirma "con evidencia" fuera de la plataforma —
 * este endpoint solo registra la decisión ya tomada por el admin.
 */
export const POST = withErrorHandling(async (_req: Request, { params }: Params) => {
  await requireAdmin();

  const product = await prisma.product.findUnique({
    where: { id: params.id },
    select: { id: true, mrrVerifiedAt: true },
  });
  if (!product) throw new ApiError(404, "Producto no encontrado");

  const updated = await prisma.product.update({
    where: { id: params.id },
    data: { mrrVerifiedAt: product.mrrVerifiedAt ? null : new Date() },
    select: { id: true, mrrVerifiedAt: true },
  });

  return ok(updated);
});
