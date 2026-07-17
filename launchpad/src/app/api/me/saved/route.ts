export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { productListSelect } from "@/lib/products";
import { withErrorHandling, ok } from "@/lib/api";

/** GET /api/me/saved — mis productos guardados, más recientes primero. */
export const GET = withErrorHandling(async () => {
  const user = await requireUser();

  const saved = await prisma.savedProduct.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { product: { select: productListSelect } },
  });

  return ok(saved.map((s) => s.product));
});
