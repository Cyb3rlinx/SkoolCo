import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireModerator, requireUser, ApiError } from "@/lib/auth";
import { withErrorHandling, parseBody, ok, noContent } from "@/lib/api";

type Params = { params: { id: string } };

const verifySchema = z.object({ status: z.enum(["VERIFIED", "REJECTED"]) });

/**
 * PATCH /api/community-links/:id — verify or reject a submitted link
 * (moderator/admin only). "Verify" means a human confirmed the link is a
 * real, public achievement post — there is no automated checking against
 * Skool.
 */
export const PATCH = withErrorHandling(async (req: Request, { params }: Params) => {
  await requireModerator();
  const input = await parseBody(req, verifySchema);

  const existing = await prisma.communityLink.findUnique({
    where: { id: params.id },
    select: { id: true },
  });
  if (!existing) throw new ApiError(404, "Link not found");

  const link = await prisma.communityLink.update({
    where: { id: params.id },
    data: { status: input.status },
    select: { id: true, status: true },
  });

  return ok(link);
});

/** DELETE /api/community-links/:id — submitter can remove their own link. */
export const DELETE = withErrorHandling(async (_req: Request, { params }: Params) => {
  const user = await requireUser();

  const link = await prisma.communityLink.findUnique({
    where: { id: params.id },
    select: { id: true, submittedById: true },
  });
  if (!link) throw new ApiError(404, "Link not found");

  const isStaff = user.role === "ADMIN" || user.role === "MODERATOR";
  if (link.submittedById !== user.id && !isStaff) {
    throw new ApiError(403, "You can only delete your own links");
  }

  await prisma.communityLink.delete({ where: { id: link.id } });
  return noContent();
});
