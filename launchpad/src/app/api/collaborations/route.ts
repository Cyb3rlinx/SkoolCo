export const dynamic = "force-dynamic";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { createCollaborationSchema, listCollaborationsQuerySchema } from "@/lib/validation";
import { collaborationSelect } from "@/lib/collaborations";
import { withErrorHandling, parseBody, ok, created, errorResponse } from "@/lib/api";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

/**
 * GET /api/collaborations — tablón público. Query: type? (NEEDS|OFFERS)
 * q? (busca en título/descripción/tags) page? pageSize?
 */
export const GET = withErrorHandling(async (req: Request) => {
  const url = new URL(req.url);
  const query = listCollaborationsQuerySchema.parse(Object.fromEntries(url.searchParams));

  const where: Prisma.CollaborationWhereInput = {};
  if (query.type) where.type = query.type;
  if (query.q) {
    where.OR = [
      { title: { contains: query.q, mode: "insensitive" } },
      { description: { contains: query.q, mode: "insensitive" } },
      { tags: { has: query.q.toLowerCase() } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.collaboration.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: collaborationSelect,
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.collaboration.count({ where }),
  ]);

  return ok({
    items,
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.ceil(total / query.pageSize),
  });
});

/**
 * POST /api/collaborations — publicar un anuncio (cualquier usuario autenticado).
 * Body: { type, title, description, tags? }
 */
export const POST = withErrorHandling(async (req: Request) => {
  const user = await requireUser();

  if (!(await checkRateLimit(`collaboration:${user.id}`, RATE_LIMITS.collaborationCreate))) {
    return errorResponse(429, "Estás publicando demasiado rápido. Intenta más tarde.");
  }

  const input = await parseBody(req, createCollaborationSchema);

  const collaboration = await prisma.collaboration.create({
    data: {
      authorId: user.id,
      type: input.type,
      title: input.title,
      description: input.description,
      tags: input.tags,
    },
    select: collaborationSelect,
  });

  return created(collaboration);
});
