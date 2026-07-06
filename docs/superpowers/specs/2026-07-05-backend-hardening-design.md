# Diseño — Hardening de backend LaunchPad

**Fecha:** 5 de julio de 2026
**Estado:** Aprobado, listo para plan de implementación
**Autor:** Willy + asistente

## Contexto

Backend MVP (Next.js 14 App Router, TypeScript, Prisma, PostgreSQL, NextAuth) ya
subido a `Cyb3rlinx/SkoolCo`. El código base es sólido: validación Zod en toda
escritura, rate limiter en memoria, roles USER/MODERATOR/ADMIN, constraint
anti-doble-upvote a nivel DB, manejo de errores centralizado.

Este spec cubre 4 mejoras de seguridad/calidad acordadas.

## Decisiones de contexto

- **Deploy:** MVP local / servidor Node único (`next start`). Se reutiliza el
  rate limiter en memoria existente (`src/lib/rate-limit.ts`). Sin infra nueva.
- **Email:** cableado completo, con Resend integrado. Lo único que falta para
  activarlo son las claves en `.env` (`RESEND_API_KEY`, `EMAIL_FROM`). Sin clave,
  el sender imprime el link en consola (modo dev).
- **CORS:** el origen de la extensión aún no existe (proyecto aparte). Se hace
  configurable por env (`ALLOWED_EXTENSION_ORIGINS`); solo falta poner el valor.

## Feature 1 — Rate limit en login (anti fuerza bruta)

**Problema:** `register` está rate-limited, pero el login (flujo `authorize` de
NextAuth en `src/lib/auth.ts`) no tiene ningún límite → vulnerable a fuerza bruta.
Contradice la regla de seguridad #3 (rate limit en login).

**Diseño:**
- Agregar `login` a `RATE_LIMITS` en `src/lib/rate-limit.ts`.
- En `authorize` de `src/lib/auth.ts`, antes de tocar la DB, hacer pre-check con
  doble clave:
  - por email: `login:email:<email>` — límite 5 / 15 min
  - por IP: `login:ip:<ip>` — límite 20 / 15 min
- La IP se obtiene del `req` que recibe `authorize` usando `clientIp()` existente.
- Si se excede cualquiera de los dos, `authorize` devuelve `null` (login falla
  igual que credenciales inválidas) — **no** se filtra si el email existe
  (anti-enumeración).

**Testeable:** la lógica de `checkRateLimit` con doble clave (ventana deslizante).

## Feature 2 — Tests + CI

**Problema:** el HANDOFF dice "tests pasando" pero no existe ni un `.test.ts` ni CI.

**Diseño:**
- **Runner:** Vitest (liviano, TS sin config extra). Agregar `vitest` a devDeps y
  script `"test": "vitest run"` + `"test:watch": "vitest"`.
- **Tests unitarios (lógica pura, sin Postgres):**
  - `slugify` — casos con acentos, símbolos, longitud máxima, colisión de guiones.
  - `checkRateLimit` — permite bajo el límite, bloquea al excederlo, resetea al
    pasar la ventana, aísla por clave (incluye el doble-check del login).
  - Leaderboard: la parte de cálculo/orden que sea pura (si depende de DB, testear
    solo la función de ranking con datos inyectados; no tocar Postgres).
  - `.refine` de `createReportSchema` (exactamente uno de productId/commentId) y
    de `createCommunityLinkSchema` (solo https + host skool.com).
- **CI:** `.github/workflows/ci.yml` — en push y PR: `npm ci`, `prisma generate`,
  `npm run typecheck`, `npm test`. Sin base de datos ni secretos (tests puros).

## Feature 3 — Reset de contraseña

**Problema:** no hay forma de recuperar cuenta si se olvida la contraseña.

**Diseño:**
- **Schema (migración Prisma nueva):** modelo `PasswordResetToken`:
  - `id`, `userId`, `tokenHash` (hash del token, nunca el plano), `expiresAt`,
    `usedAt?`, `createdAt`.
  - índice por `userId`; relación a `User` con `onDelete: Cascade`.
- **Generación de token:** token aleatorio (`crypto.randomBytes(32)` → hex/base64url).
  Se guarda solo su hash (sha256). Expira en 1 hora. Un solo uso (`usedAt`).
- **Endpoints:**
  - `POST /api/auth/forgot-password` — body `{ email }`. Rate-limited (reusar
    regla tipo `register`). **Siempre** responde 200 con el mismo mensaje, exista
    o no el email (anti-enumeración). Si existe: crea token, envía email con link
    `${APP_URL}/reset-password?token=<plano>`.
  - `POST /api/auth/reset-password` — body `{ token, password }`. Valida token
    (hash coincide, no usado, no expirado), re-hashea la contraseña con bcrypt 12,
    marca `usedAt`. Password validada con Zod (min 8, max 128).
- **Email pluggable (`src/lib/email.ts`):** función `sendEmail({ to, subject, html })`.
  - Si `process.env.RESEND_API_KEY` está presente → llama a la API de Resend
    (fetch a `https://api.resend.com/emails`, sin SDK extra para no inflar deps).
  - Si no → `console.info` con el contenido/link (modo dev, no bloquea).
- **`.env.example`:** agregar comentados `RESEND_API_KEY=`, `EMAIL_FROM=`,
  `APP_URL=http://localhost:3000`.

**Nota:** las páginas frontend (`/reset-password`, formulario) son del cofundador;
este backend solo expone los endpoints y el email.

## Feature 4 — CORS para la extensión

**Problema:** la extensión llama la API cross-origin; sin CORS explícito falla o
queda demasiado abierta.

**Diseño:**
- `src/middleware.ts` (Next middleware) que aplica CORS **solo** a las rutas que
  la extensión usa: `/api/extension/:path*` y `/api/community-links:path*`.
- Orígenes permitidos: `ALLOWED_EXTENSION_ORIGINS` en `.env` (lista separada por
  comas, ej. `chrome-extension://<id>,https://app.ejemplo.com`).
- Maneja preflight `OPTIONS` (responde 204 con headers CORS).
- Sin la env → no se habilita ningún origen cross-site (seguro por defecto: las
  mismas rutas siguen funcionando same-origin).
- `.env.example`: agregar comentado `ALLOWED_EXTENSION_ORIGINS=`.

## Feature 5 — Headers de seguridad (extra A)

En el mismo `src/middleware.ts` del CORS, agregar headers de seguridad a todas
las respuestas:
- `X-Frame-Options: DENY` (anti-clickjacking)
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains` (solo efectivo
  bajo HTTPS; inofensivo en local)
- `Permissions-Policy` mínima (deshabilita camera/microphone/geolocation por defecto)

## Feature 6 — Anti contraseña filtrada / HaveIBeenPwned (extra B)

En el registro (`register`) y en `reset-password`, antes de hashear la contraseña,
verificar contra la API de HIBP Pwned Passwords usando **k-anonymity**:
- sha1 de la contraseña → enviar solo los primeros 5 chars del hash a
  `https://api.pwnedpasswords.com/range/<prefix>` (la contraseña nunca sale).
- si el sufijo aparece en la respuesta → rechazar con 400 "contraseña comprometida".
- `src/lib/password.ts` con `isPasswordPwned(password): Promise<boolean>`.
- **Fail-open:** si la API de HIBP no responde (timeout/red), no bloquear el
  registro (no dejamos a un usuario afuera por un tercero caído); loguear el fallo.
- Testeable con la función mockeando fetch.

## Feature 7 — Healthcheck (extra C)

`GET /api/health` → `{ status: "ok", db: "ok" | "down" }`. Hace un
`SELECT 1` best-effort contra Postgres vía Prisma (`$queryRaw`). Sin auth. Útil
para monitoreo y readiness checks del deploy.

## Feature 8 — Verificación de email (extra D)

- **Schema:** agregar `emailVerified DateTime?` a `User`, y modelo
  `EmailVerificationToken` (misma forma que `PasswordResetToken`: userId,
  tokenHash, expiresAt, usedAt). Migración Prisma.
- **Flujo:** al registrarse, crear token y enviar email de verificación
  (reusa `src/lib/email.ts`). Usuario queda con `emailVerified = null`.
- **Endpoints:**
  - `POST /api/auth/verify-email` — body `{ token }`, marca `emailVerified = now()`
    y `usedAt`.
  - `POST /api/auth/resend-verification` — reenvía (rate-limited, anti-enumeración).
- **Política MVP:** no se bloquea el login por email sin verificar (para no frenar
  el testeo con usuarios reales). El estado `emailVerified` queda disponible para
  que el frontend/producto decida qué gatear después. Documentar esta decisión.

## Alcance de archivos

**Nuevos:**
- `src/lib/email.ts`
- `src/lib/password.ts` (HIBP k-anonymity — extra B)
- `src/middleware.ts` (CORS + security headers — extras A)
- `src/app/api/auth/forgot-password/route.ts`
- `src/app/api/auth/reset-password/route.ts`
- `src/app/api/auth/verify-email/route.ts` (extra D)
- `src/app/api/auth/resend-verification/route.ts` (extra D)
- `src/app/api/health/route.ts` (extra C)
- `prisma/migrations/<ts>_password_reset_and_email_verification/migration.sql`
- Tests: `src/lib/*.test.ts` (o carpeta `tests/`)
- `.github/workflows/ci.yml`
- `vitest.config.ts`

**Editados (quirúrgico):**
- `src/lib/auth.ts` (pre-check rate limit en login)
- `src/lib/rate-limit.ts` (reglas `login`, `resendVerification`)
- `src/lib/validation.ts` (schemas forgot/reset/verify password)
- `src/app/api/auth/register/route.ts` (HIBP check + token de verificación)
- `prisma/schema.prisma` (PasswordResetToken, EmailVerificationToken, User.emailVerified)
- `.env.example` (nuevas vars comentadas)
- `package.json` (vitest + scripts test)

## Alineación con el piso de seguridad

- Auth sigue en NextAuth (no casera). ✅
- Toda entrada nueva validada con Zod server-side. ✅
- Rate limits añadidos a login y a forgot-password. ✅
- Secretos (RESEND_API_KEY) solo server-side, nunca en el bundle. ✅
- Tokens de reset/verificación: solo hash en DB, expiración + un solo uso. ✅
- Anti-enumeración en login, forgot-password y resend-verification. ✅
- Contraseñas verificadas contra brechas conocidas (HIBP). ✅
- Headers de seguridad (clickjacking, MIME-sniffing, HSTS). ✅

## Fuera de alcance (YAGNI)

- Migrar rate limiter a Redis (solo si van a serverless).
- OAuth (Google/GitHub).
- Subida de archivos para logos.
- Páginas frontend del reset/verificación (las hace el cofundador).
- Bloquear login por email no verificado (decisión de producto, post-MVP).
- Borrado de cuenta propia / GDPR (extra E — segunda tanda).
- Log de auditoría de moderación (extra F — segunda tanda).
- RLS en Supabase (defensa en profundidad; la seguridad hoy vive en Prisma).
