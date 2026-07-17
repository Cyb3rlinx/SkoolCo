export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { withErrorHandling, ok } from "@/lib/api";

/** GET /api/collections — listado público. */
export const GET = withErrorHandling(async () => {
  const collections = await prisma.collection.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      createdAt: true,
      _count: { select: { items: true } },
    },
  });

  return ok(
    collections.map((c) => ({
      id: c.id,
      title: c.title,
      slug: c.slug,
      description: c.description,
      createdAt: c.createdAt,
      productCount: c._count.items,
    }))
  );
});
