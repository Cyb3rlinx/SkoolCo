import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { registerSchema } from "@/lib/validation";
import { withErrorHandling, parseBody, created, errorResponse, clientIp } from "@/lib/api";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

/**
 * POST /api/auth/register
 * Body: { name, email, password }
 * Creates an account. Sign-in afterwards via NextAuth credentials
 * (POST /api/auth/callback/credentials or the signIn() client helper).
 */
export const POST = withErrorHandling(async (req: Request) => {
  if (!checkRateLimit(`register:${clientIp(req)}`, RATE_LIMITS.register)) {
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

  const passwordHash = await bcrypt.hash(input.password, 12);

  const user = await prisma.user.create({
    data: { name: input.name, email: input.email, passwordHash },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  return created(user);
});
