export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { requireUser, ApiError } from "@/lib/auth";
import { withErrorHandling, noContent } from "@/lib/api";

type Params = { params: { id: string } };

/**
 * DELETE /api/comments/:id
 * Users can delete their own comments; moderators/admins can delete any.
 * Soft delete (deleted_at) keeps a moderation trail.
 */
export const DELETE = withErrorHandling(async (_req: Request, { params }: Params) => {
  const user = await requireUser();

  const comment = await prisma.comment.findUnique({
    where: { id: params.id },
    select: { id: true, userId: true, deletedAt: true },
  });
  if (!comment || comment.deletedAt) throw new ApiError(404, "Comment not found");

  const isStaff = user.role === "ADMIN" || user.role === "MODERATOR";
  if (comment.userId !== user.id && !isStaff) {
    throw new ApiError(403, "You can only delete your own comments");
  }

  await prisma.comment.update({
    where: { id: comment.id },
    data: { deletedAt: new Date() },
  });

  return noContent();
});
