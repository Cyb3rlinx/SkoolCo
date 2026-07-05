import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { updateProfileSchema } from "@/lib/validation";
import { withErrorHandling, parseBody, ok } from "@/lib/api";

const profileSelect = {
  id: true,
  name: true,
  email: true,
  avatarUrl: true,
  bio: true,
  role: true,
  createdAt: true,
  _count: { select: { products: true, upvotes: true, comments: true } },
} as const;

/** GET /api/me — current user's profile. */
export const GET = withErrorHandling(async () => {
  const sessionUser = await requireUser();
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: sessionUser.id },
    select: profileSelect,
  });
  return ok(user);
});

/** PATCH /api/me — update name, bio, avatarUrl. */
export const PATCH = withErrorHandling(async (req: Request) => {
  const sessionUser = await requireUser();
  const input = await parseBody(req, updateProfileSchema);

  const user = await prisma.user.update({
    where: { id: sessionUser.id },
    data: input,
    select: profileSelect,
  });
  return ok(user);
});
