export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { requireUser, ApiError } from "@/lib/auth";
import { createCommentSchema } from "@/lib/validation";
import { withErrorHandling, parseBody, ok, created, errorResponse } from "@/lib/api";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { findProduct } from "@/lib/products";
import { notify } from "@/lib/notifications";

type Params = { params: { slug: string } };

const commentSelect = {
  id: true,
  body: true,
  createdAt: true,
  updatedAt: true,
  parentId: true,
  user: { select: { id: true, name: true, avatarUrl: true } },
} as const;

const replySelect = {
  ...commentSelect,
  replies: {
    where: { deletedAt: null },
    orderBy: { createdAt: "asc" as const },
    select: commentSelect,
  },
};

/**
 * GET /api/products/:idOrSlug/comments — newest first, soft-deleted hidden.
 * Pagination applies to top-level comments only; replies (one level deep)
 * are nested under their parent and always returned in full.
 */
export const GET = withErrorHandling(async (req: Request, { params }: Params) => {
  const product = await findProduct(params.slug);
  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(url.searchParams.get("pageSize")) || 20));

  const [items, total] = await Promise.all([
    prisma.comment.findMany({
      where: { productId: product.id, deletedAt: null, parentId: null },
      orderBy: { createdAt: "desc" },
      select: replySelect,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.comment.count({ where: { productId: product.id, deletedAt: null, parentId: null } }),
  ]);

  return ok({ items, page, pageSize, total, totalPages: Math.ceil(total / pageSize) });
});

/** POST /api/products/:idOrSlug/comments — add a comment (auth required). */
export const POST = withErrorHandling(async (req: Request, { params }: Params) => {
  const user = await requireUser();

  if (!(await checkRateLimit(`comment:${user.id}`, RATE_LIMITS.comment))) {
    return errorResponse(429, "You're commenting too fast. Take a breath and try again.");
  }

  const product = await findProduct(params.slug);
  if (product.status !== "LIVE") {
    throw new ApiError(400, "Only live products can be commented on");
  }

  const input = await parseBody(req, createCommentSchema);

  let parent: { id: string; userId: string; parentId: string | null } | null = null;
  if (input.parentId) {
    parent = await prisma.comment.findFirst({
      where: { id: input.parentId, productId: product.id, deletedAt: null },
      select: { id: true, userId: true, parentId: true },
    });
    if (!parent) throw new ApiError(404, "Parent comment not found");
    if (parent.parentId) throw new ApiError(400, "Replies can only be one level deep");
  }

  const comment = await prisma.comment.create({
    data: { userId: user.id, productId: product.id, body: input.body, parentId: parent?.id ?? null },
    select: commentSelect,
  });

  const recipients = new Set([product.makerId, ...(parent ? [parent.userId] : [])]);
  await Promise.all(
    [...recipients].map((userId) =>
      notify({ userId, actorId: user.id, type: "COMMENT", productId: product.id, commentId: comment.id })
    )
  );

  return created(comment);
});
