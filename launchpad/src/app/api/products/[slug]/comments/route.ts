export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { requireUser, ApiError } from "@/lib/auth";
import { createCommentSchema } from "@/lib/validation";
import { withErrorHandling, parseBody, ok, created, errorResponse } from "@/lib/api";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { findProduct } from "@/lib/products";
import { notify } from "@/lib/notifications";
import { extractMentions } from "@/lib/mentions";

type Params = { params: { slug: string } };

const commentSelect = {
  id: true,
  body: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: {
      id: true,
      name: true,
      avatarUrl: true,
      badges: {
        select: { badge: { select: { slug: true, icon: true, name: true } } },
        orderBy: { createdAt: "asc" as const },
      },
    },
  },
} as const;

const BADGE_PRIORITY = ["fundador", "vendido", "top-10-mes", "primer-lanzamiento"];

interface RawComment {
  id: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string;
    avatarUrl: string | null;
    badges: { badge: { slug: string; icon: string; name: string } }[];
  };
}

/** Insignias del autor, ordenadas por prioridad y recortadas a 2 para no saturar el hilo. */
function toCommentDto(c: RawComment) {
  const badges = c.user.badges
    .map((ub) => ub.badge)
    .sort((a, b) => BADGE_PRIORITY.indexOf(a.slug) - BADGE_PRIORITY.indexOf(b.slug))
    .slice(0, 2);
  return { ...c, user: { id: c.user.id, name: c.user.name, avatarUrl: c.user.avatarUrl, badges } };
}

/** GET /api/products/:idOrSlug/comments — newest first, soft-deleted hidden. */
export const GET = withErrorHandling(async (req: Request, { params }: Params) => {
  const product = await findProduct(params.slug);
  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(url.searchParams.get("pageSize")) || 20));

  const [items, total] = await Promise.all([
    prisma.comment.findMany({
      where: { productId: product.id, deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: commentSelect,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.comment.count({ where: { productId: product.id, deletedAt: null } }),
  ]);

  return ok({
    items: items.map(toCommentDto),
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  });
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

  const comment = await prisma.comment.create({
    data: { userId: user.id, productId: product.id, body: input.body },
    select: commentSelect,
  });

  await notify({
    userId: product.makerId,
    actorId: user.id,
    type: "COMMENT",
    productId: product.id,
    commentId: comment.id,
  });

  const mentionedUsernames = extractMentions(input.body);
  if (mentionedUsernames.length > 0) {
    const mentionedUsers = await prisma.user.findMany({
      where: { username: { in: mentionedUsernames }, suspendedAt: null, id: { not: user.id } },
      select: { id: true },
    });
    await Promise.all(
      mentionedUsers.map((mentioned) =>
        notify({
          userId: mentioned.id,
          actorId: user.id,
          type: "MENTION",
          productId: product.id,
          commentId: comment.id,
        })
      )
    );
  }

  return created(toCommentDto(comment));
});
