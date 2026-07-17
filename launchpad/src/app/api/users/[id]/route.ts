export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/auth";
import { withErrorHandling, ok } from "@/lib/api";

type Params = { params: { id: string } };

/**
 * GET /api/users/:idOrUsername — public maker profile, resoluble por id o
 * por @handle único.
 * Exposes only community-facing fields (no email, no role) plus counts of
 * public activity. Their LIVE launches come from GET /api/products?maker=:id.
 */
export const GET = withErrorHandling(async (_req: Request, { params }: Params) => {
  const user = await prisma.user.findFirst({
    where: { OR: [{ id: params.id }, { username: params.id }] },
    select: {
      id: true,
      name: true,
      username: true,
      avatarUrl: true,
      bio: true,
      createdAt: true,
      _count: {
        select: {
          products: { where: { status: "LIVE" } },
          upvotes: true,
          comments: true,
        },
      },
    },
  });
  if (!user) throw new ApiError(404, "User not found");

  return ok(user);
});
