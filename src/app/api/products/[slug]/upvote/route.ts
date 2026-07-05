import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser, ApiError } from "@/lib/auth";
import { withErrorHandling, ok, errorResponse } from "@/lib/api";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { findProduct } from "@/lib/products";

type Params = { params: { slug: string } };

/**
 * POST /api/products/:idOrSlug/upvote — add an upvote.
 * One per user per product: enforced by a DB unique constraint on
 * (user_id, product_id), so duplicates are impossible even under
 * concurrent requests. Repeat calls are idempotent (200, not an error).
 */
export const POST = withErrorHandling(async (_req: Request, { params }: Params) => {
  const user = await requireUser();

  if (!checkRateLimit(`upvote:${user.id}`, RATE_LIMITS.upvote)) {
    return errorResponse(429, "Slow down a little — too many votes in a short time.");
  }

  const product = await findProduct(params.slug);
  if (product.status !== "LIVE") {
    throw new ApiError(400, "Only live products can be upvoted");
  }

  try {
    await prisma.upvote.create({
      data: { userId: user.id, productId: product.id },
    });
  } catch (err) {
    // P2002 = unique constraint violation -> already upvoted; treat as idempotent.
    if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")) {
      throw err;
    }
  }

  const upvoteCount = await prisma.upvote.count({ where: { productId: product.id } });
  return ok({ upvoted: true, upvoteCount });
});

/** DELETE /api/products/:idOrSlug/upvote — remove your upvote (idempotent). */
export const DELETE = withErrorHandling(async (_req: Request, { params }: Params) => {
  const user = await requireUser();

  if (!checkRateLimit(`upvote:${user.id}`, RATE_LIMITS.upvote)) {
    return errorResponse(429, "Slow down a little — too many votes in a short time.");
  }

  const product = await findProduct(params.slug);

  await prisma.upvote.deleteMany({
    where: { userId: user.id, productId: product.id },
  });

  const upvoteCount = await prisma.upvote.count({ where: { productId: product.id } });
  return ok({ upvoted: false, upvoteCount });
});
