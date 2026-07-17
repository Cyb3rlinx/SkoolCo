export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { requireUser, ApiError } from "@/lib/auth";
import { withErrorHandling, ok } from "@/lib/api";
import { findProduct } from "@/lib/products";
import { bucketByDay } from "@/lib/insights";

type Params = { params: { slug: string } };

const INSIGHTS_WINDOW_DAYS = 14;

/**
 * GET /api/products/:idOrSlug/insights — daily upvote/comment counts for the
 * last 14 days. Maker or staff only (this is the maker's own dashboard, not
 * public data).
 */
export const GET = withErrorHandling(async (_req: Request, { params }: Params) => {
  const user = await requireUser();
  const product = await findProduct(params.slug);
  const isStaff = user.role === "ADMIN" || user.role === "MODERATOR";

  if (product.makerId !== user.id && !isStaff) {
    throw new ApiError(403, "You can only view insights for your own products");
  }

  const now = new Date();
  const windowStart = new Date(now.getTime() - (INSIGHTS_WINDOW_DAYS - 1) * 24 * 60 * 60 * 1000);
  windowStart.setUTCHours(0, 0, 0, 0);

  const [upvotes, comments] = await Promise.all([
    prisma.upvote.findMany({
      where: { productId: product.id, createdAt: { gte: windowStart } },
      select: { createdAt: true },
    }),
    prisma.comment.findMany({
      where: { productId: product.id, createdAt: { gte: windowStart }, deletedAt: null },
      select: { createdAt: true },
    }),
  ]);

  return ok({
    upvotes: bucketByDay(upvotes.map((u) => u.createdAt), INSIGHTS_WINDOW_DAYS, now),
    comments: bucketByDay(comments.map((c) => c.createdAt), INSIGHTS_WINDOW_DAYS, now),
  });
});
