export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { resendVerificationSchema } from "@/lib/validation";
import { createEmailVerification, sendVerificationEmail } from "@/lib/tokens";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { ok, parseBody, withErrorHandling, clientIp, errorResponse } from "@/lib/api";

const GENERIC = {
  message: "Si el email existe y no está verificado, enviaremos un nuevo enlace.",
};

export const POST = withErrorHandling(async (req: Request) => {
  if (!checkRateLimit(`resend-verif:${clientIp(req)}`, RATE_LIMITS.resendVerification)) {
    return errorResponse(429, "Demasiados intentos. Intenta más tarde.");
  }
  const { email } = await parseBody(req, resendVerificationSchema);
  const user = await prisma.user.findUnique({ where: { email } });
  if (user && !user.emailVerified) {
    const token = await createEmailVerification(user.id);
    await sendVerificationEmail(user.email, token);
  }
  // Same response regardless of existence/verification state (anti-enumeration).
  return ok(GENERIC);
});
