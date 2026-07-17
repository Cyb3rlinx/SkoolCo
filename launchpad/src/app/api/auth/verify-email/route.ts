export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { verifyEmailSchema } from "@/lib/validation";
import { hashToken } from "@/lib/tokens";
import { ok, parseBody, withErrorHandling, errorResponse, clientIp } from "@/lib/api";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export const POST = withErrorHandling(async (req: Request) => {
  const ip = clientIp(req);
  if (!(await checkRateLimit(`verify-email:${ip}`, RATE_LIMITS.authToken))) {
    return errorResponse(429, "Demasiados intentos. Intenta de nuevo más tarde.");
  }

  const { token } = await parseBody(req, verifyEmailSchema);
  const record = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return errorResponse(400, "Token inválido o expirado.");
  }
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { emailVerified: new Date() } }),
    prisma.emailVerificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);
  return ok({ message: "Email verificado." });
});
