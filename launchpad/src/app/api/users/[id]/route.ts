export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { ApiError, getSessionUser } from "@/lib/auth";
import { withErrorHandling, ok } from "@/lib/api";

type Params = { params: { id: string } };

/**
 * GET /api/users/:idOrUsername — public maker profile, resoluble por id o
 * por @handle único.
 * Exposes only community-facing fields (no email, no role) plus counts of
 * public activity. Their LIVE launches come from GET /api/products?maker=:id.
 */
export const GET = withErrorHandling(async (_req: Request, { params }: Params) => {
  const sessionUser = await getSessionUser();

  const user = await prisma.user.findFirst({
    where: { OR: [{ id: params.id }, { username: params.id }] },
    select: {
      id: true,
      name: true,
      username: true,
      avatarUrl: true,
      bio: true,
      verifiedAt: true,
      createdAt: true,
      badges: {
        select: {
          badge: { select: { slug: true, name: true, description: true, icon: true } },
          grantedById: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      },
      _count: {
        select: {
          products: { where: { status: "LIVE" } },
          upvotes: true,
          comments: true,
          followedBy: true,
        },
      },
    },
  });
  if (!user) throw new ApiError(404, "User not found");

  const isFollowedByMe = sessionUser
    ? Boolean(
        await prisma.follow.findUnique({
          where: { followerId_followingId: { followerId: sessionUser.id, followingId: user.id } },
          select: { id: true },
        })
      )
    : false;

  return ok({
    ...user,
    badges: user.badges.map((ub) => ({
      ...ub.badge,
      grantedByAdmin: ub.grantedById !== null,
      createdAt: ub.createdAt.toISOString(),
    })),
    _count: {
      products: user._count.products,
      upvotes: user._count.upvotes,
      comments: user._count.comments,
      followers: user._count.followedBy,
    },
    isFollowedByMe,
  });
});
