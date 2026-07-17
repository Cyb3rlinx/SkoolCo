export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { requireUser, ApiError } from "@/lib/auth";
import { withErrorHandling, ok } from "@/lib/api";
import { findProduct } from "@/lib/products";

type Params = { params: { slug: string } };

/**
 * POST /api/products/:slug/mark-sold — el maker confirma que vendió el
 * producto (solo dueño o staff). Es una acción de una sola vía: no hay
 * "deshacer" desde la UI, igual que en la vida real. Apaga openToOffers.
 */
export const POST = withErrorHandling(async (_req: Request, { params }: Params) => {
  const user = await requireUser();
  const base = await findProduct(params.slug);
  const isStaff = user.role === "ADMIN" || user.role === "MODERATOR";

  if (base.makerId !== user.id && !isStaff) {
    throw new ApiError(403, "Solo el maker dueño puede marcar su producto como vendido");
  }

  const product = await prisma.product.update({
    where: { id: base.id },
    data: { soldAt: new Date(), openToOffers: false },
    select: { id: true, soldAt: true, openToOffers: true },
  });

  return ok(product);
});
