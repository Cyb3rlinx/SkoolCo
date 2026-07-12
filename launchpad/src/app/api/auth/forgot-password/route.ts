export const dynamic = "force-dynamic";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { forgotPasswordSchema } from "@/lib/validation";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { ok, parseBody, withErrorHandling, clientIp, errorResponse } from "@/lib/api";

const GENERIC = {
  message: "Si el email existe, enviaremos instrucciones para restablecer la contraseña.",
};

export const POST = withErrorHandling(async (req: Request) => {
  if (!(await checkRateLimit(`forgot:${clientIp(req)}`, RATE_LIMITS.register))) {
    return errorResponse(429, "Demasiados intentos. Intenta más tarde.");
  }
  const { email } = await parseBody(req, forgotPasswordSchema);
  const user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 60 * 60_000),
      },
    });
    const url = `${process.env.APP_URL ?? "http://localhost:3000"}/reset-password?token=${token}`;
    await sendEmail({
      to: user.email,
      subject: "Restablece tu contraseña",
      html: `<p>Para restablecer tu contraseña haz clic aquí (expira en 1 hora):</p><p><a href="${url}">${url}</a></p>`,
      text: `Restablece tu contraseña (expira en 1 hora): ${url}`,
    });
  }
  // Same response whether or not the email exists (anti-enumeration).
  return ok(GENERIC);
});
