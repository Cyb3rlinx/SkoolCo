export const dynamic = "force-dynamic";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { withErrorHandling, ok } from "@/lib/api";

const PAGE_SIZE = 20;

const querySchema = z.object({
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
});

/** GET /api/admin/users?q=&page= — lista paginada para el panel (solo ADMIN). */
export const GET = withErrorHandling(async (req: Request) => {
  await requireAdmin();

  const url = new URL(req.url);
  const { q, page } = querySchema.parse({
    q: url.searchParams.get("q") ?? undefined,
    page: url.searchParams.get("page") ?? undefined,
  });

  const where = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { email: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        suspendedAt: true,
        _count: { select: { products: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return ok({
    items,
    page,
    pageSize: PAGE_SIZE,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  });
});
