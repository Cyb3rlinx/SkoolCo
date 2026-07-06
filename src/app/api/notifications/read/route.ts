import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { markNotificationsReadSchema } from "@/lib/validation";
import { withErrorHandling, parseBody, ok } from "@/lib/api";

/**
 * PATCH /api/notifications/read — mark notifications as read.
 * Body: { ids?: string[] } — without ids, marks ALL as read.
 * Scoped to the signed-in user: you can never touch someone else's.
 */
export const PATCH = withErrorHandling(async (req: Request) => {
  const user = await requireUser();
  const { ids } = await parseBody(req, markNotificationsReadSchema);

  const result = await prisma.notification.updateMany({
    where: {
      userId: user.id,
      readAt: null,
      ...(ids ? { id: { in: ids } } : {}),
    },
    data: { readAt: new Date() },
  });

  return ok({ marked: result.count });
});
