export const dynamic = "force-dynamic";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { registerSchema } from "@/lib/validation";
import { withErrorHandling, parseBody, created, errorResponse, clientIp } from "@/lib/api";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { isPasswordPwned } from "@/lib/password";
import { createEmailVerification, sendVerificationEmail } from "@/lib/tokens";
import { baseUsername, resolveUsername } from "@/lib/username";

/**
 * POST /api/auth/register
 * Body: { name, email, password }
 * Creates an account. Sign-in afterwards via NextAuth credentials
 * (POST /api/auth/callback/credentials or the signIn() client helper).
 */
export const POST = withErrorHandling(async (req: Request) => {
  if (!(await checkRateLimit(`register:${clientIp(req)}`, RATE_LIMITS.register))) {
    return errorResponse(429, "Too many signup attempts. Try again later.");
  }

  const input = await parseBody(req, registerSchema);

  const existing = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });
  if (existing) {
    return errorResponse(409, "An account with this email already exists");
  }

  if (await isPasswordPwned(input.password)) {
    return errorResponse(400, "Esa contraseña apareció en filtraciones conocidas. Elige otra.");
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  const base = baseUsername(input.name);
  const existingUsernames = await prisma.user.findMany({
    where: { username: { startsWith: base } },
    select: { username: true },
  });
  const taken = new Set(
    existingUsernames.map((u) => u.username).filter((u): u is string => u !== null)
  );
  const username = resolveUsername(base, taken);

  const user = await prisma.user.create({
    data: { name: input.name, email: input.email, passwordHash, username },
    select: { id: true, name: true, username: true, email: true, role: true, createdAt: true },
  });

  // Fire off email verification (non-fatal if the mailer is unconfigured — it logs).
  const token = await createEmailVerification(user.id);
  await sendVerificationEmail(user.email, token);

  return created(user);
});
