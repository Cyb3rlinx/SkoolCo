export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { withErrorHandling, ok } from "@/lib/api";

/**
 * GET /api/admin/stats — métricas del negocio para la pestaña Resumen.
 * Solo ADMIN. Totales + deltas de 7/30 días (por createdAt; launchDate para
 * productos LIVE). Sin series temporales: tarjetas con tendencia simple.
 */
export const GET = withErrorHandling(async (req: Request) => {
  await requireAdmin();

  const now = Date.now();
  const d7 = new Date(now - 7 * 24 * 60 * 60_000);
  const d30 = new Date(now - 30 * 24 * 60 * 60_000);

  const [
    usersTotal, users7, users30,
    liveTotal, live7, live30,
    upvotesTotal, upvotes7, upvotes30,
    commentsTotal, comments7, comments30,
    crTotal, cr7, cr30,
    offerViews, openToOffers,
    pendingReports, pendingLinks,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: d7 } } }),
    prisma.user.count({ where: { createdAt: { gte: d30 } } }),
    prisma.product.count({ where: { status: "LIVE" } }),
    prisma.product.count({ where: { status: "LIVE", launchDate: { gte: d7 } } }),
    prisma.product.count({ where: { status: "LIVE", launchDate: { gte: d30 } } }),
    prisma.upvote.count(),
    prisma.upvote.count({ where: { createdAt: { gte: d7 } } }),
    prisma.upvote.count({ where: { createdAt: { gte: d30 } } }),
    prisma.comment.count(),
    prisma.comment.count({ where: { createdAt: { gte: d7 } } }),
    prisma.comment.count({ where: { createdAt: { gte: d30 } } }),
    prisma.contactRequest.count(),
    prisma.contactRequest.count({ where: { createdAt: { gte: d7 } } }),
    prisma.contactRequest.count({ where: { createdAt: { gte: d30 } } }),
    prisma.product.aggregate({ _sum: { offerViewCount: true } }),
    prisma.product.count({ where: { status: "LIVE", openToOffers: true } }),
    prisma.moderationReport.count({ where: { status: "OPEN" } }),
    prisma.communityLink.count({ where: { status: "PENDING" } }),
  ]);

  return ok({
    users: { total: usersTotal, last7: users7, last30: users30 },
    productsLive: { total: liveTotal, last7: live7, last30: live30 },
    upvotes: { total: upvotesTotal, last7: upvotes7, last30: upvotes30 },
    comments: { total: commentsTotal, last7: comments7, last30: comments30 },
    contactRequests: { total: crTotal, last7: cr7, last30: cr30 },
    offerViews: { total: offerViews._sum.offerViewCount ?? 0 },
    openToOffers: { total: openToOffers },
    pending: { reports: pendingReports, communityLinks: pendingLinks },
  });
});
