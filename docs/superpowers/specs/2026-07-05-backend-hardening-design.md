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

## Alcance de archivos

**Nuevos:**
- `src/lib/email.ts`
- `src/middleware.ts`
- `src/app/api/auth/forgot-password/route.ts`
- `src/app/api/auth/reset-password/route.ts`
- `prisma/migrations/<ts>_password_reset_token/migration.sql`
- Tests: `src/lib/*.test.ts` (o carpeta `tests/`)
- `.github/workflows/ci.yml`
- `vitest.config.ts`

**Editados (quirúrgico):**
- `src/lib/auth.ts` (pre-check rate limit en login)
- `src/lib/rate-limit.ts` (regla `login`)
- `src/lib/validation.ts` (schemas forgot/reset password)
- `prisma/schema.prisma` (modelo PasswordResetToken)
- `.env.example` (nuevas vars comentadas)
- `package.json` (vitest + scripts test)

## Alineación con el piso de seguridad

- Auth sigue en NextAuth (no casera). ✅
- Toda entrada nueva validada con Zod server-side. ✅
- Rate limits añadidos a login y a forgot-password. ✅
- Secretos (RESEND_API_KEY) solo server-side, nunca en el bundle. ✅
- Tokens de reset: solo hash en DB, expiración + un solo uso. ✅
- Anti-enumeración en login y forgot-password. ✅

## Fuera de alcance (YAGNI)

- Migrar rate limiter a Redis (solo si van a serverless).
- OAuth (Google/GitHub).
- Subida de archivos para logos.
- Páginas frontend del reset (las hace el cofundador).
- Verificación contra HaveIBeenPwned.
- RLS en Supabase (defensa en profundidad; la seguridad hoy vive en Prisma).
