import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { clientIp } from "@/lib/api";

/**
 * Email + password authentication with JWT sessions.
 *
 * - Passwords are hashed with bcrypt (12 rounds) at registration.
 * - The session token carries the user id and role so API routes can
 *   authorize without an extra DB round trip.
 * - Swap in OAuth providers (Google, GitHub) later by adding them to
 *   `providers` — the rest of the app only depends on `session.user.id`
 *   and `session.user.role`.
 */
export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials.password) return null;

        const email = credentials.email.toLowerCase().trim();
        const ip = clientIp(req as unknown as Request);

        // Anti brute-force: throttle by email AND by IP. Failing either
        // returns null (indistinguishable from bad credentials).
        const okEmail = await checkRateLimit(`login:email:${email}`, RATE_LIMITS.login);
        const okIp = await checkRateLimit(`login:ip:${ip}`, RATE_LIMITS.login);
        if (!okEmail || !okIp) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        // Cuenta suspendida por un admin: rechazar el login con mensaje claro.
        if (user.suspendedAt) {
          throw new Error("Tu cuenta está suspendida.");
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.avatarUrl,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "USER";
        return token;
      }
      // Refresca el rol desde la base en cada verificación de sesión: así una
      // promoción a ADMIN/MODERATOR (o una degradación) aplica a las sesiones
      // vivas sin necesidad de cerrar sesión y volver a entrar.
      // Si la consulta falla (p. ej. pool de conexiones saturado en un pico),
      // NO invalidamos la sesión: un token firmado y vigente sigue valiendo
      // con su rol anterior. Sin este catch, next-auth trata cualquier error
      // del callback como "sin sesión" y toda la página se llena de 401.
      if (token.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { role: true },
          });
          if (dbUser) token.role = dbUser.role;
        } catch (err) {
          console.error("[auth] no se pudo refrescar el rol, uso el del token:", err);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
};

/** Returns the current session user (id, role) or null. */
export async function getSessionUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    role: session.user.role ?? "USER",
    name: session.user.name ?? "",
    email: session.user.email ?? "",
  };
}

/**
 * Throws a 401-style error object if unauthenticated. Use in API routes.
 * También aplica la suspensión: una cuenta suspendida por un admin no puede
 * ejecutar NINGUNA acción autenticada aunque conserve una sesión JWT viva
 * (cuesta un findUnique por request autenticada — aceptable a este volumen).
 */
export async function requireUser() {
  const user = await getSessionUser();
  if (!user) {
    throw new ApiError(401, "Authentication required");
  }
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { suspendedAt: true, role: true },
  });
  if (!dbUser) {
    throw new ApiError(401, "Authentication required");
  }
  if (dbUser.suspendedAt) {
    throw new ApiError(403, "Tu cuenta está suspendida.");
  }
  // El rol de la BD es autoritativo (no el del JWT, que puede tener hasta 30
  // días de antigüedad): así los cambios de rol y las suspensiones aplican
  // de inmediato a las sesiones ya activas.
  return { ...user, role: dbUser.role };
}

/** Requires MODERATOR or ADMIN role. */
export async function requireModerator() {
  const user = await requireUser();
  if (user.role !== "MODERATOR" && user.role !== "ADMIN") {
    throw new ApiError(403, "Moderator access required");
  }
  return user;
}

/** Requires ADMIN role. */
export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    throw new ApiError(403, "Admin access required");
  }
  return user;
}

/** Simple typed error for API handlers. */
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
