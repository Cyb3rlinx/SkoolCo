import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";

/** sha256 hex of a token — only the hash is ever stored. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Creates a single-use, 1-hour email-verification token; returns the plaintext. */
export async function createEmailVerification(userId: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await prisma.emailVerificationToken.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 60 * 60_000),
    },
  });
  return token;
}

export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  const url = `${process.env.APP_URL ?? "http://localhost:3000"}/verify-email?token=${token}`;
  await sendEmail({
    to,
    subject: "Verifica tu email",
    html: `<p>Confirma tu cuenta (expira en 1 hora):</p><p><a href="${url}">${url}</a></p>`,
    text: `Confirma tu cuenta (expira en 1 hora): ${url}`,
  });
}
