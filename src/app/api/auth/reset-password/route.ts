import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { resetPasswordSchema } from "@/lib/validation";
import { isPasswordPwned } from "@/lib/password";
import { ok, parseBody, withErrorHandling, errorResponse } from "@/lib/api";

export const POST = withErrorHandling(async (req: Request) => {
  const { token, password } = await parseBody(req, resetPasswordSchema);
  const tokenHash = createHash("sha256").update(token).digest("hex");

  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return errorResponse(400, "Token inválido o expirado.");
  }
  if (await isPasswordPwned(password)) {
    return errorResponse(400, "Esa contraseña apareció en filtraciones conocidas. Elige otra.");
  }
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);
  return ok({ message: "Contraseña actualizada. Ya puedes iniciar sesión." });
});
