import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { listNotificationsQuerySchema } from "@/lib/validation";
import { withErrorHandling, ok } from "@/lib/api";

const notificationSelect = {
  id: true,
  type: true,
  readAt: true,
  createdAt: true,
  actor: { select: { id: true, name: true, avatarUrl: true } },
  product: { select: { id: true, name: true, slug: true } },
  comment: { select: { id: true, body: true } },
} as const;

/**
 * GET /api/notifications — the signed-in user's notifications, newest first.
 * Query: unread? (true → only unread) page? pageSize?
 * Also returns unreadCount for the frontend badge.
 */
export const GET = withErrorHandling(async (req: Request) => {
  const user = await requireUser();
  const url = new URL(req.url);
  const query = listNotificationsQuerySchema.parse(Object.fromEntries(url.searchParams));

  const where = {
    userId: user.id,
    ...(query.unread ? { readAt: null } : {}),
  };

  const [items, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: notificationSelect,
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId: user.id, readAt: null } }),
  ]);

  return ok({
    items,
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.ceil(total / query.pageSize),
    unreadCount,
  });
});
