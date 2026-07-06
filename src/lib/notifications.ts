import type { NotificationType } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * Creates an in-app notification. Best-effort: a notification failure must
 * never break the action that triggered it (upvote/comment), so errors are
 * logged and swallowed. Self-notifications are skipped.
 */
export async function notify(params: {
  userId: string; // recipient (product maker)
  actorId: string; // who upvoted/commented
  type: NotificationType;
  productId?: string;
  commentId?: string;
}): Promise<void> {
  if (params.userId === params.actorId) return; // never notify yourself
  try {
    await prisma.notification.create({
      data: {
        userId: params.userId,
        actorId: params.actorId,
        type: params.type,
        productId: params.productId ?? null,
        commentId: params.commentId ?? null,
      },
    });
  } catch (err) {
    console.error("[notifications] create failed:", err);
  }
}
