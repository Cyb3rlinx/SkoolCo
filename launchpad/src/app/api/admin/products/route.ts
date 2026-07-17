export const dynamic = "force-dynamic";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { withErrorHandling, ok } from "@/lib/api";

const PAGE_SIZE = 20;

const querySchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.enum(["DRAFT", "SCHEDULED", "LIVE", "ARCHIVED"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
});

/**
 * GET /api/admin/products?q=&status=&page= — lista completa para el panel
 * (incluye DRAFT/SCHEDULED/ARCHIVED, que la vista pública no expone). Solo ADMIN.
 */
export const GET = withErrorHandling(async (req: Request) => {
  await requireAdmin();

  const url = new URL(req.url);
  const { q, status, page } = querySchema.parse({
    q: url.searchParams.get("q") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    page: url.searchParams.get("page") ?? undefined,
  });

  const where = {
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { slug: { contains: q, mode: "insensitive" as const } },
            { tagline: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        launchDate: true,
        createdAt: true,
        logoUrl: true,
        declaredMrrUsd: true,
        mrrVerifiedAt: true,
        maker: { select: { name: true, email: true } },
        _count: { select: { upvotes: true, comments: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  return ok({
    items,
    page,
    pageSize: PAGE_SIZE,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  });
});
