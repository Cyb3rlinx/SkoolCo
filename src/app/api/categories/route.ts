import { prisma } from "@/lib/db";
import { withErrorHandling, ok } from "@/lib/api";

// Live DB data — never prerender/cache at build time.
export const dynamic = "force-dynamic";

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
