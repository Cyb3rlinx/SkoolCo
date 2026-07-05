import { prisma } from "@/lib/db";
import { withErrorHandling, ok } from "@/lib/api";

/** GET /api/categories — all categories with live-product counts. */
export const GET = withErrorHandling(async () => {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      _count: { select: { products: { where: { status: "LIVE" } } } },
    },
  });
  return ok(categories);
});
