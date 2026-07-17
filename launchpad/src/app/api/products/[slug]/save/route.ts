export const dynamic = "force-dynamic";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { withErrorHandling, ok, errorResponse } from "@/lib/api";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { findProduct } from "@/lib/products";

type Params = { params: { slug: string } };

/**
 * POST /api/products/:idOrSlug/save — save a product to your favorites.
 * One per user per product: enforced by a DB unique constraint on
 * (user_id, product_id). Repeat calls are idempotent (200, not an error).
 */
export const POST = withErrorHandling(async (_req: Request, { params }: Params) => {
  const user = await requireUser();

  if (!(await checkRateLimit(`save:${user.id}`, RATE_LIMITS.save))) {
    return errorResponse(429, "Slow down a little — too many changes in a short time.");
  }

  const product = await findProduct(params.slug);

  try {
    await prisma.savedProduct.create({
      data: { userId: user.id, productId: product.id },
    });
  } catch (err) {
    // P2002 = unique constraint violation -> already saved; treat as idempotent.
    if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")) {
      throw err;
    }
  }

  return ok({ saved: true });
});

/** DELETE /api/products/:idOrSlug/save — remove from favorites (idempotent). */
export const DELETE = withErrorHandling(async (_req: Request, { params }: Params) => {
  const user = await requireUser();

  if (!(await checkRateLimit(`save:${user.id}`, RATE_LIMITS.save))) {
    return errorResponse(429, "Slow down a little — too many changes in a short time.");
  }

  const product = await findProduct(params.slug);

  await prisma.savedProduct.deleteMany({
    where: { userId: user.id, productId: product.id },
  });

  return ok({ saved: false });
});
