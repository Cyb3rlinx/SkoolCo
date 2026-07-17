export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { requireUser, requireModerator, ApiError } from "@/lib/auth";
import { createReportSchema } from "@/lib/validation";
import { withErrorHandling, parseBody, ok, created, errorResponse } from "@/lib/api";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

/**
 * POST /api/reports — report a product or a comment (auth required).
 * Body: { productId? | commentId?, reason }
 */
export const POST = withErrorHandling(async (req: Request) => {
  const user = await requireUser();

  if (!(await checkRateLimit(`report:${user.id}`, RATE_LIMITS.report))) {
    return errorResponse(429, "Too many reports submitted. Try again later.");
  }

  const input = await parseBody(req, createReportSchema);

  if (input.productId) {
    const exists = await prisma.product.findUnique({
      where: { id: input.productId },
      select: { id: true },
    });
    if (!exists) throw new ApiError(404, "Product not found");
  }
  if (input.commentId) {
    const exists = await prisma.comment.findUnique({
      where: { id: input.commentId },
      select: { id: true },
    });
    if (!exists) throw new ApiError(404, "Comment not found");
  }

  if (input.collaborationId) {
    const exists = await prisma.collaboration.findUnique({
      where: { id: input.collaborationId },
      select: { id: true },
    });
    if (!exists) throw new ApiError(404, "Collaboration not found");
  }

  const report = await prisma.moderationReport.create({
    data: {
      reporterId: user.id,
      productId: input.productId ?? null,
      commentId: input.commentId ?? null,
      collaborationId: input.collaborationId ?? null,
      reason: input.reason,
      category: input.category ?? "OTHER",
    },
    select: { id: true, status: true, category: true, createdAt: true },
  });

  return created(report);
});

/**
 * GET /api/reports?status=OPEN — moderation queue (moderator/admin only).
 */
export const GET = withErrorHandling(async (req: Request) => {
  await requireModerator();

  const url = new URL(req.url);
  const statusParam = url.searchParams.get("status");
  const status =
    statusParam && ["OPEN", "REVIEWING", "RESOLVED", "DISMISSED"].includes(statusParam)
      ? (statusParam as "OPEN" | "REVIEWING" | "RESOLVED" | "DISMISSED")
      : undefined;

  const reports = await prisma.moderationReport.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      reason: true,
      category: true,
      status: true,
      createdAt: true,
      resolvedAt: true,
      resolvedBy: { select: { id: true, name: true } },
      reporter: { select: { id: true, name: true } },
      product: { select: { id: true, name: true, slug: true } },
      comment: { select: { id: true, body: true } },
      collaboration: { select: { id: true, title: true } },
    },
  });

  return ok(reports);
});
