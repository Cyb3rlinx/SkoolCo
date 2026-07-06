# Backend Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add login brute-force protection, tests+CI, password reset, email verification, CORS+security headers, HIBP password check, and a healthcheck to the LaunchPad backend.

**Architecture:** Reuse the existing in-memory rate limiter (single Node server). Password reset and email verification share a token pattern (random token, only its sha256 hash stored, single-use, expiring). A pluggable `sendEmail` uses Resend when `RESEND_API_KEY` is set, otherwise logs to console. CORS and security headers live in one Next.js `middleware.ts`. All new input is validated with Zod server-side.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Prisma, PostgreSQL, NextAuth, Zod, bcryptjs, Vitest, GitHub Actions.

## Global Constraints

- Node runtime: single persistent Node server (`next start`) — in-memory rate limiter is valid.
- Auth stays on NextAuth; never hand-roll hashing/JWT/session.
- All new writes validated with Zod on the server.
- Secrets (`RESEND_API_KEY`) server-side only; never in client bundle.
- Reset/verification tokens: store only sha256 hash, 1-hour expiry, single-use.
- Anti-enumeration: login, forgot-password, resend-verification must not reveal whether an email exists.
- bcrypt cost factor: 12 (matches existing `register`).
- Spanish neutral copy in any user-facing email text (no voseo).

---

### Task 1: Vitest setup

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (devDeps + scripts)
- Test: `src/lib/slugify.test.ts`

**Interfaces:**
- Consumes: existing `slugify` from `src/lib/validation.ts`.
- Produces: working `npm test` command; `vitest` importable in `*.test.ts`.

- [ ] **Step 1: Add vitest to package.json**

Add to `devDependencies`: `"vitest": "^2.1.0"`. Add to `scripts`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 2: Create vitest.config.ts**

```ts
import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  test: { environment: "node", include: ["src/**/*.test.ts"] },
  resolve: { alias: { "@": resolve(__dirname, "src") } },
});
```

- [ ] **Step 3: Write the first test (slugify)**

`src/lib/slugify.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { slugify } from "@/lib/validation";

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });
  it("strips accents", () => {
    expect(slugify("Café Münchën")).toBe("cafe-munchen");
  });
  it("collapses non-alphanumerics and trims hyphens", () => {
    expect(slugify("  --Foo!!  Bar__  ")).toBe("foo-bar");
  });
  it("caps length at 80 chars", () => {
    expect(slugify("a".repeat(200)).length).toBeLessThanOrEqual(80);
  });
});
```

- [ ] **Step 4: Install and run**

Run: `npm install && npm test`
Expected: 4 passing tests.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/lib/slugify.test.ts
git commit -m "test: add vitest and slugify tests"
```

---

### Task 2: Login rate-limit rule + rate-limit tests

**Files:**
- Modify: `src/lib/rate-limit.ts` (add `login`, `resendVerification` rules)
- Test: `src/lib/rate-limit.test.ts`

**Interfaces:**
- Consumes: `checkRateLimit(key, rule)`, `RATE_LIMITS` from `src/lib/rate-limit.ts`.
- Produces: `RATE_LIMITS.login` = `{ limit: 5, windowMs: 900_000 }` and `RATE_LIMITS.resendVerification` = `{ limit: 3, windowMs: 900_000 }`, consumed by Tasks 3 and 8.

- [ ] **Step 1: Write failing tests**

`src/lib/rate-limit.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  it("allows up to the limit then blocks", () => {
    const rule = { limit: 3, windowMs: 60_000 };
    const key = "test:allow-then-block";
    expect(checkRateLimit(key, rule)).toBe(true);
    expect(checkRateLimit(key, rule)).toBe(true);
    expect(checkRateLimit(key, rule)).toBe(true);
    expect(checkRateLimit(key, rule)).toBe(false);
  });
  it("isolates buckets by key", () => {
    const rule = { limit: 1, windowMs: 60_000 };
    expect(checkRateLimit("test:iso:a", rule)).toBe(true);
    expect(checkRateLimit("test:iso:b", rule)).toBe(true);
  });
  it("exposes login and resendVerification rules", () => {
    expect(RATE_LIMITS.login).toEqual({ limit: 5, windowMs: 900_000 });
    expect(RATE_LIMITS.resendVerification).toEqual({ limit: 3, windowMs: 900_000 });
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- rate-limit`
Expected: FAIL (login/resendVerification undefined).

- [ ] **Step 3: Add rules**

In `src/lib/rate-limit.ts`, inside `RATE_LIMITS`, add:
```ts
  login: { limit: 5, windowMs: 15 * 60_000 }, // 5 login attempts / 15 min
  resendVerification: { limit: 3, windowMs: 15 * 60_000 },
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- rate-limit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/rate-limit.ts src/lib/rate-limit.test.ts
git commit -m "feat: add login and resend-verification rate limit rules"
```

---

### Task 3: Login brute-force pre-check in NextAuth

**Files:**
- Modify: `src/lib/auth.ts` (add rate-limit pre-check in `authorize`)

**Interfaces:**
- Consumes: `checkRateLimit`, `RATE_LIMITS.login`, `clientIp` from `@/lib/api`.
- Produces: rate-limited login. No new exports.

- [ ] **Step 1: Add imports at top of `src/lib/auth.ts`**

```ts
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { clientIp } from "@/lib/api";
```

- [ ] **Step 2: Update `authorize` signature and add pre-check**

The NextAuth Credentials `authorize` receives `(credentials, req)`. Change it to:
```ts
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials.password) return null;

        const email = credentials.email.toLowerCase().trim();
        const ip = clientIp(req as unknown as Request);

        // Anti brute-force: throttle by email AND by IP. Failing either
        // returns null (indistinguishable from bad credentials).
        const okEmail = checkRateLimit(`login:email:${email}`, RATE_LIMITS.login);
        const okIp = checkRateLimit(`login:ip:${ip}`, RATE_LIMITS.login);
        if (!okEmail || !okIp) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.avatarUrl,
          role: user.role,
        };
      },
```
Note: `req` here is a `RequestInternal` with `headers` as a plain object. `clientIp` reads `req.headers.get(...)`; wrap access defensively — see Step 3.

- [ ] **Step 3: Make `clientIp` tolerate header objects**

In `src/lib/api.ts`, update `clientIp` to accept either a `Request` or NextAuth's header bag:
```ts
export function clientIp(req: { headers: Headers | Record<string, string | string[] | undefined> }): string {
  const get = (name: string): string | null => {
    const h = req.headers as Headers;
    if (typeof h?.get === "function") return h.get(name);
    const raw = (req.headers as Record<string, string | string[] | undefined>)[name];
    return Array.isArray(raw) ? raw[0] : raw ?? null;
  };
  const fwd = get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return get("x-real-ip") ?? "unknown";
}
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth.ts src/lib/api.ts
git commit -m "feat: rate-limit login by email and IP (anti brute-force)"
```

---

### Task 4: Prisma models for reset + verification tokens

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_password_reset_and_email_verification/migration.sql`

**Interfaces:**
- Produces: `PasswordResetToken`, `EmailVerificationToken` models, `User.emailVerified` — consumed by Tasks 7 and 8.

- [ ] **Step 1: Add `emailVerified` to `User`**

In `model User`, after `role`:
```prisma
  emailVerified DateTime? @map("email_verified")
```
And add to the relations block:
```prisma
  passwordResetTokens     PasswordResetToken[]
  emailVerificationTokens EmailVerificationToken[]
```

- [ ] **Step 2: Add the two token models (end of schema)**

```prisma
model PasswordResetToken {
  id        String    @id @default(cuid())
  userId    String    @map("user_id")
  tokenHash String    @unique @map("token_hash")
  expiresAt DateTime  @map("expires_at")
  usedAt    DateTime? @map("used_at")
  createdAt DateTime  @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("password_reset_tokens")
}

model EmailVerificationToken {
  id        String    @id @default(cuid())
  userId    String    @map("user_id")
  tokenHash String    @unique @map("token_hash")
  expiresAt DateTime  @map("expires_at")
  usedAt    DateTime? @map("used_at")
  createdAt DateTime  @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("email_verification_tokens")
}
```

- [ ] **Step 3: Generate migration (requires DATABASE_URL)**

Run: `npm run db:migrate -- --name password_reset_and_email_verification`
Expected: migration created and applied. If no DB is available locally, create the migration SQL by hand mirroring the models (tables `password_reset_tokens`, `email_verification_tokens`, column `users.email_verified`) and run `prisma generate`.

- [ ] **Step 4: Regenerate client + typecheck**

Run: `npm run db:generate && npm run typecheck`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: add password reset and email verification token models"
```

---

### Task 5: Pluggable email sender

**Files:**
- Create: `src/lib/email.ts`
- Test: `src/lib/email.test.ts`

**Interfaces:**
- Produces: `sendEmail({ to, subject, html, text? }): Promise<void>` — consumed by Tasks 7 and 8.

- [ ] **Step 1: Write failing test**

`src/lib/email.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("sendEmail", () => {
  const OLD = process.env.RESEND_API_KEY;
  beforeEach(() => { vi.restoreAllMocks(); });
  afterEach(() => { process.env.RESEND_API_KEY = OLD; });

  it("logs instead of sending when no API key", async () => {
    delete process.env.RESEND_API_KEY;
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    const { sendEmail } = await import("@/lib/email");
    await sendEmail({ to: "a@b.com", subject: "Hi", html: "<p>x</p>" });
    expect(spy).toHaveBeenCalled();
  });

  it("calls Resend API when key is present", async () => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.EMAIL_FROM = "no-reply@test.com";
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => "" });
    vi.stubGlobal("fetch", fetchMock);
    const { sendEmail } = await import("@/lib/email");
    await sendEmail({ to: "a@b.com", subject: "Hi", html: "<p>x</p>" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({ method: "POST" })
    );
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- email`
Expected: FAIL (module missing).

- [ ] **Step 3: Implement `src/lib/email.ts`**

```ts
/**
 * Pluggable transactional email.
 * - With RESEND_API_KEY set → sends via the Resend HTTP API (no SDK dependency).
 * - Without it → logs the message (dev mode); nothing is sent.
 * Only public config leaves the server; the API key never reaches the client.
 */
export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(msg: EmailMessage): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "onboarding@resend.dev";

  if (!apiKey) {
    console.info(
      `[email:dev] to=${msg.to} subject="${msg.subject}"\n${msg.text ?? msg.html}`
    );
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Resend send failed: ${res.status} ${detail}`);
  }
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- email`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/email.ts src/lib/email.test.ts
git commit -m "feat: pluggable email sender (Resend in prod, log in dev)"
```

---

### Task 6: HIBP pwned-password check

**Files:**
- Create: `src/lib/password.ts`
- Test: `src/lib/password.test.ts`

**Interfaces:**
- Produces: `isPasswordPwned(password: string): Promise<boolean>` — consumed by Tasks 7 and 8.

- [ ] **Step 1: Write failing test**

`src/lib/password.test.ts`:
```ts
import { describe, it, expect, vi, afterEach } from "vitest";

describe("isPasswordPwned", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns true when the hash suffix appears in the range", async () => {
    // sha1("password") = 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8
    // prefix 5BAA6, suffix 1E4C9B93F3F0682250B6CF8331B7EE68FD8
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      text: async () => "1E4C9B93F3F0682250B6CF8331B7EE68FD8:99\nAAAA:1",
    }));
    expect(await isPasswordPwned("password")).toBe(true);
  });

  it("returns false when not found", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true, text: async () => "AAAA:1\nBBBB:2",
    }));
    expect(await isPasswordPwned("s0me-Uniqu3-p@ss")).toBe(false);
  });

  it("fails open on network error (returns false)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    expect(await isPasswordPwned("whatever")).toBe(false);
  });
});
```
Add `import { isPasswordPwned } from "@/lib/password";` at the top.

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- password`
Expected: FAIL (module missing).

- [ ] **Step 3: Implement `src/lib/password.ts`**

```ts
import { createHash } from "node:crypto";

/**
 * Checks a password against HIBP Pwned Passwords using k-anonymity:
 * only the first 5 chars of the SHA-1 hash are sent; the password never leaves.
 * Fails OPEN: if HIBP is unreachable we do not block the user.
 */
export async function isPasswordPwned(password: string): Promise<boolean> {
  try {
    const sha1 = createHash("sha1").update(password).digest("hex").toUpperCase();
    const prefix = sha1.slice(0, 5);
    const suffix = sha1.slice(5);

    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { "Add-Padding": "true" },
    });
    if (!res.ok) return false;
    const body = await res.text();
    return body
      .split("\n")
      .some((line) => line.split(":")[0].trim().toUpperCase() === suffix);
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- password`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/password.ts src/lib/password.test.ts
git commit -m "feat: HIBP pwned-password check (k-anonymity, fail-open)"
```

---

### Task 7: Validation schemas for reset/verify + forgot/reset endpoints

**Files:**
- Modify: `src/lib/validation.ts`
- Create: `src/app/api/auth/forgot-password/route.ts`
- Create: `src/app/api/auth/reset-password/route.ts`
- Test: `src/lib/validation.test.ts`

**Interfaces:**
- Consumes: `sendEmail` (Task 5), `isPasswordPwned` (Task 6), `PasswordResetToken` (Task 4), `checkRateLimit`+`RATE_LIMITS.register` (existing), `parseBody`/`ok`/`errorResponse`/`withErrorHandling`/`clientIp` from `@/lib/api`, `prisma` from `@/lib/db`.
- Produces: HTTP endpoints; `forgotPasswordSchema`, `resetPasswordSchema` exports.

- [ ] **Step 1: Write failing schema test**

`src/lib/validation.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { forgotPasswordSchema, resetPasswordSchema } from "@/lib/validation";

describe("password schemas", () => {
  it("forgot requires a valid email", () => {
    expect(forgotPasswordSchema.safeParse({ email: "x@y.com" }).success).toBe(true);
    expect(forgotPasswordSchema.safeParse({ email: "nope" }).success).toBe(false);
  });
  it("reset requires token + password >= 8", () => {
    expect(resetPasswordSchema.safeParse({ token: "t", password: "12345678" }).success).toBe(true);
    expect(resetPasswordSchema.safeParse({ token: "t", password: "short" }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- validation`
Expected: FAIL.

- [ ] **Step 3: Add schemas to `src/lib/validation.ts`**

```ts
export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10).max(256),
  password: z.string().min(8).max(128),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(10).max(256),
});

export const resendVerificationSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
});
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- validation`
Expected: PASS.

- [ ] **Step 5: Create `src/app/api/auth/forgot-password/route.ts`**

```ts
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { forgotPasswordSchema } from "@/lib/validation";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { ok, parseBody, withErrorHandling, clientIp, errorResponse } from "@/lib/api";

const GENERIC = { message: "Si el email existe, enviaremos instrucciones para restablecer la contraseña." };

export const POST = withErrorHandling(async (req: Request) => {
  if (!checkRateLimit(`forgot:${clientIp(req)}`, RATE_LIMITS.register)) {
    return errorResponse(429, "Demasiados intentos. Intenta más tarde.");
  }
  const { email } = await parseBody(req, forgotPasswordSchema);
  const user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 60 * 60_000) },
    });
    const url = `${process.env.APP_URL ?? "http://localhost:3000"}/reset-password?token=${token}`;
    await sendEmail({
      to: user.email,
      subject: "Restablece tu contraseña",
      html: `<p>Para restablecer tu contraseña haz clic aquí (expira en 1 hora):</p><p><a href="${url}">${url}</a></p>`,
      text: `Restablece tu contraseña (expira en 1 hora): ${url}`,
    });
  }
  return ok(GENERIC); // same response whether or not the email exists
});
```

- [ ] **Step 6: Create `src/app/api/auth/reset-password/route.ts`**

```ts
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
```

- [ ] **Step 7: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/lib/validation.ts src/lib/validation.test.ts src/app/api/auth/forgot-password src/app/api/auth/reset-password
git commit -m "feat: password reset endpoints (forgot + reset) with HIBP check"
```

---

### Task 8: Email verification (register hook + endpoints)

**Files:**
- Create: `src/app/api/auth/verify-email/route.ts`
- Create: `src/app/api/auth/resend-verification/route.ts`
- Modify: `src/app/api/auth/register/route.ts`
- Create: `src/lib/tokens.ts` (shared token helpers)

**Interfaces:**
- Consumes: `EmailVerificationToken` (Task 4), `sendEmail` (Task 5), `isPasswordPwned` (Task 6), schemas from Task 7, `RATE_LIMITS.resendVerification` (Task 2).
- Produces: `createEmailVerification(userId)`, `sendVerificationEmail(user)` in `src/lib/tokens.ts`.

- [ ] **Step 1: Create `src/lib/tokens.ts`**

```ts
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createEmailVerification(userId: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await prisma.emailVerificationToken.create({
    data: { userId, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 60 * 60_000) },
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
```

- [ ] **Step 2: Hook registration**

In `src/app/api/auth/register/route.ts`, after the user is created and before returning, add HIBP check (before hashing) and verification email (after create). Read the file, then: import `isPasswordPwned` from `@/lib/password` and `createEmailVerification`, `sendVerificationEmail` from `@/lib/tokens`. Before hashing the password add:
```ts
  if (await isPasswordPwned(password)) {
    return errorResponse(400, "Esa contraseña apareció en filtraciones conocidas. Elige otra.");
  }
```
After the user is created add:
```ts
  const token = await createEmailVerification(user.id);
  await sendVerificationEmail(user.email, token);
```
(Ensure `errorResponse` is imported from `@/lib/api`.)

- [ ] **Step 3: Create `src/app/api/auth/verify-email/route.ts`**

```ts
import { prisma } from "@/lib/db";
import { verifyEmailSchema } from "@/lib/validation";
import { hashToken } from "@/lib/tokens";
import { ok, parseBody, withErrorHandling, errorResponse } from "@/lib/api";

export const POST = withErrorHandling(async (req: Request) => {
  const { token } = await parseBody(req, verifyEmailSchema);
  const record = await prisma.emailVerificationToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return errorResponse(400, "Token inválido o expirado.");
  }
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { emailVerified: new Date() } }),
    prisma.emailVerificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);
  return ok({ message: "Email verificado." });
});
```

- [ ] **Step 4: Create `src/app/api/auth/resend-verification/route.ts`**

```ts
import { prisma } from "@/lib/db";
import { resendVerificationSchema } from "@/lib/validation";
import { createEmailVerification, sendVerificationEmail } from "@/lib/tokens";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { ok, parseBody, withErrorHandling, clientIp, errorResponse } from "@/lib/api";

const GENERIC = { message: "Si el email existe y no está verificado, enviaremos un nuevo enlace." };

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
  return ok(GENERIC);
});
```

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/tokens.ts src/app/api/auth/verify-email src/app/api/auth/resend-verification src/app/api/auth/register/route.ts
git commit -m "feat: email verification (register hook, verify + resend endpoints)"
```

---

### Task 9: CORS + security headers middleware

**Files:**
- Create: `src/middleware.ts`
- Test: `src/middleware.test.ts`

**Interfaces:**
- Produces: Next middleware applying security headers to all responses and CORS to extension routes. Reads `ALLOWED_EXTENSION_ORIGINS` (comma-separated).

- [ ] **Step 1: Write failing test for the origin helper**

`src/middleware.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { isAllowedOrigin } from "@/middleware";

describe("isAllowedOrigin", () => {
  it("allows origins listed in the env", () => {
    expect(isAllowedOrigin("chrome-extension://abc", "chrome-extension://abc,https://x.com")).toBe(true);
  });
  it("rejects unlisted origins", () => {
    expect(isAllowedOrigin("https://evil.com", "chrome-extension://abc")).toBe(false);
  });
  it("rejects everything when env is empty", () => {
    expect(isAllowedOrigin("chrome-extension://abc", "")).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- middleware`
Expected: FAIL.

- [ ] **Step 3: Implement `src/middleware.ts`**

```ts
import { NextResponse, type NextRequest } from "next/server";

const SECURITY_HEADERS: Record<string, string> = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

export function isAllowedOrigin(origin: string | null, envValue: string | undefined): boolean {
  if (!origin || !envValue) return false;
  return envValue.split(",").map((s) => s.trim()).filter(Boolean).includes(origin);
}

const CORS_PATHS = ["/api/extension", "/api/community-links"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const origin = req.headers.get("origin");
  const corsEligible = CORS_PATHS.some((p) => pathname.startsWith(p));
  const allowed = corsEligible && isAllowedOrigin(origin, process.env.ALLOWED_EXTENSION_ORIGINS);

  // Preflight
  if (req.method === "OPTIONS" && corsEligible) {
    const res = new NextResponse(null, { status: allowed ? 204 : 403 });
    if (allowed) applyCors(res, origin!);
    applySecurity(res);
    return res;
  }

  const res = NextResponse.next();
  if (allowed) applyCors(res, origin!);
  applySecurity(res);
  return res;
}

function applyCors(res: NextResponse, origin: string) {
  res.headers.set("Access-Control-Allow-Origin", origin);
  res.headers.set("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.headers.set("Vary", "Origin");
}

function applySecurity(res: NextResponse) {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.headers.set(k, v);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- middleware`
Expected: PASS.

- [ ] **Step 5: Typecheck + commit**

```bash
npm run typecheck
git add src/middleware.ts src/middleware.test.ts
git commit -m "feat: middleware for CORS (extension routes) and security headers"
```

---

### Task 10: Healthcheck endpoint

**Files:**
- Create: `src/app/api/health/route.ts`

**Interfaces:**
- Consumes: `prisma` from `@/lib/db`.
- Produces: `GET /api/health`.

- [ ] **Step 1: Implement `src/app/api/health/route.ts`**

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  let db: "ok" | "down" = "ok";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    db = "down";
  }
  return NextResponse.json(
    { status: db === "ok" ? "ok" : "degraded", db },
    { status: db === "ok" ? 200 : 503 }
  );
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
npm run typecheck
git add src/app/api/health/route.ts
git commit -m "feat: add /api/health healthcheck"
```

---

### Task 11: `.env.example` updates

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Append the new (commented) vars**

```bash
# --- Email (password reset & verification). Sin estas claves, los emails se loguean en consola (dev). ---
# RESEND_API_KEY=
# EMAIL_FROM=no-reply@tudominio.com
# APP_URL=http://localhost:3000

# --- CORS para la extensión de navegador (lista separada por comas). Vacío = sin acceso cross-origin. ---
# ALLOWED_EXTENSION_ORIGINS=chrome-extension://<id>
```

- [ ] **Step 2: Commit**

```bash
git add .env.example
git commit -m "docs: document email and CORS env vars in .env.example"
```

---

### Task 12: CI workflow

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create the workflow**

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
      - run: npm ci
      - run: npx prisma generate
      - run: npm run typecheck
      - run: npm test
```

- [ ] **Step 2: Verify locally then commit**

Run: `npm ci && npx prisma generate && npm run typecheck && npm test`
Expected: all green.

```bash
git add .github/workflows/ci.yml
git commit -m "ci: run typecheck and tests on push and PR"
```

---

## Self-Review

**Spec coverage:**
- F1 login rate-limit → Tasks 2, 3 ✅
- F2 tests+CI → Tasks 1, 2, 5, 6, 7, 9 (tests) + Task 12 (CI) ✅
- F3 password reset → Tasks 4, 5, 6, 7 ✅
- F4 CORS → Task 9 ✅
- F5 security headers → Task 9 ✅
- F6 HIBP → Task 6 (+ used in 7, 8) ✅
- F7 healthcheck → Task 10 ✅
- F8 email verification → Tasks 4, 8 ✅
- env docs → Task 11 ✅

**Type consistency:** `sendEmail(EmailMessage)`, `isPasswordPwned(string)`, `hashToken(string)`, `createEmailVerification(userId)`, `sendVerificationEmail(to, token)`, `isAllowedOrigin(origin, envValue)`, `RATE_LIMITS.login/.resendVerification` — all consistent across producing/consuming tasks.

**Placeholder scan:** No TBD/TODO; all code steps include full code. Task 8 Step 2 references reading `register/route.ts` first (existing file) rather than reproducing it — acceptable since it's a modify with exact insertions.

**Note on DB-touching endpoints:** route handlers (Tasks 7, 8, 10) are typechecked but not unit-tested (they need Postgres). Their pure dependencies (email, password, tokens hashing, schemas, rate-limit, middleware origin) ARE unit-tested. Integration tests against a real DB are out of scope for this batch.
