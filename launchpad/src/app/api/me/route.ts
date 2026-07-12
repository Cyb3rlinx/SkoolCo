export const dynamic = "force-dynamic";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { updateProfileSchema, deleteAccountSchema } from "@/lib/validation";
import { withErrorHandling, parseBody, ok, noContent, errorResponse } from "@/lib/api";

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

/**
 * DELETE /api/me — permanently delete the account (password confirmation
 * required). DB cascades remove products, upvotes, comments, links, events
 * and tokens; reports the user resolved as moderator keep their history
 * with resolvedBy set to null.
 */
export const DELETE = withErrorHandling(async (req: Request) => {
  const sessionUser = await requireUser();
  const { password } = await parseBody(req, deleteAccountSchema);

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: sessionUser.id },
    select: { passwordHash: true },
  });
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return errorResponse(403, "Contraseña incorrecta.");
  }

  await prisma.user.delete({ where: { id: sessionUser.id } });
  return noContent();
});
