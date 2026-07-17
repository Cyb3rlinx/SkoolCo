# Comunidad Visible (Insignias + Menciones + Badge embebible) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar a la comunidad de Denveler `@handles` únicos, menciones `@usuario` en comentarios, un sistema de insignias (automáticas + manuales) y un badge SVG embebible para que los makers linkeen de vuelta a Denveler.

**Architecture:** Extiende patrones ya existentes — Prisma + migraciones aditivas, Zod, `requireUser`/`requireAdmin` de `src/lib/auth.ts`, el sistema de notificaciones (`Notification`/`NotificationType`) y el panel `/admin`. Toda la lógica de decisión (generación de username, parseo de menciones, condiciones de insignias) se extrae a funciones puras testeables en `src/lib/*.ts`, siguiendo el patrón ya usado por `selectOfferNudgeCandidates`.

**Tech Stack:** Next.js 14 App Router, Prisma 5 + PostgreSQL, Zod, TypeScript, Vitest.

## Global Constraints

- Español neutro latinoamericano en TODO texto de cara al usuario. Cero voseo argentino.
- Toda migración Prisma es aditiva únicamente. Producción se actualiza pegando SQL a mano en Supabase (documentar en `docs/MIGRACION-PROD-<slug>.md`, siguiendo `docs/MIGRACION-PROD-ADMIN.md`).
- Toda ruta API nueva empieza con `export const dynamic = "force-dynamic";` y usa `withErrorHandling`/`parseBody`/`ok`/`created` de `src/lib/api.ts`.
- `requireUser()` para endpoints de usuario, `requireAdmin()` para otorgar/revocar insignias manuales. Nunca autenticación casera.
- Todo input de usuario se valida server-side con Zod aunque ya se validó en el cliente.
- Insignia "Vendido" es 100% manual — no existe en el schema ningún estado que indique "venta concretada" (`ContactRequestStatus` solo tiene `PENDING/SHARED/DISMISSED`).
- "Top 10 del mes" es un logro de una sola vez por usuario (el `@@unique([userId, badgeId])` lo hace binario) — el cron hace skip-if-exists, no re-otorga.
- Badge embebible: solo variante estática (sin conteo de votos en vivo).
- Esta iteración NO incluye una UI de administración para crear insignias nuevas en el catálogo — el catálogo de 4 (`fundador`, `primer-lanzamiento`, `top-10-mes`, `vendido`) se siembra por migración/seed.

---

## Nota operativa importante (leer antes de Task 1)

El backfill de `username` para usuarios existentes **no sigue el ritual habitual de "pegar SQL a mano en Supabase"**, porque la lógica de generación (slugify + resolución de colisiones) vive en TypeScript, no es expresable como un `UPDATE` SQL simple. En su lugar, Task 2 crea un script Node (`prisma/backfill-usernames.ts`, mismo patrón que `prisma/seed.ts`) que se corre una sola vez apuntando a `DATABASE_URL` de producción. Esto se documenta explícitamente en `docs/MIGRACION-PROD-USERNAMES.md` (Task 9) como un paso adicional al SQL de la columna/índice.

---

### Task 0: Crear rama `comunidad-visible`

**Files:** ninguno (solo control de versiones).

- [ ] **Step 1: Confirmar que `main` está limpio y actualizado**

```bash
cd /Users/willy/Desktop/launchpad
git checkout main
git pull origin main
git status --short
```

Expected: sin cambios pendientes, `main` al día con `origin/main`.

- [ ] **Step 2: Crear la rama**

```bash
git checkout -b comunidad-visible
```

Expected: `Switched to a new branch 'comunidad-visible'`.

---

### Task 1: Schema — username, Badge/UserBadge, NotificationType.MENTION

**Files:**
- Modify: `launchpad/prisma/schema.prisma`
- Create: `launchpad/prisma/migrations/<timestamp>_comunidad_visible/migration.sql`
- Create: `launchpad/src/lib/username.ts`
- Test: `launchpad/src/lib/username.test.ts`

**Interfaces:**
- Produces: `baseUsername(name: string): string`, `resolveUsername(base: string, taken: Set<string>): string`, `RESERVED_USERNAMES: Set<string>` — usados por Task 2 (backfill + registro) y por `usernameSchema` en `validation.ts`.
- Produces (schema): `User.username String? @unique`, `User.usernameChangedAt DateTime?`, `Badge`/`UserBadge` models, `NotificationType.MENTION`.

**Nota de diseño:** `username` es **nullable con `@unique`** (no `NOT NULL`) — en Postgres una restricción UNIQUE permite múltiples `NULL` sin conflicto, así que esto es 100% aditivo sin necesitar un segundo paso de `ALTER COLUMN ... SET NOT NULL`. La app garantiza que todo usuario nuevo recibe un username al registrarse (Task 2) y el backfill llena a los existentes — en la práctica nunca queda `NULL`, pero el schema no lo fuerza para mantener la migración simple y reversible.

- [ ] **Step 1: Escribir los tests de `username.ts` (deben fallar — el archivo no existe)**

Crear `launchpad/src/lib/username.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { baseUsername, resolveUsername, RESERVED_USERNAMES } from "@/lib/username";

describe("baseUsername", () => {
  it("slugifica el nombre", () => {
    expect(baseUsername("William Díaz")).toBe("william-diaz");
  });

  it("recorta a 20 caracteres", () => {
    const result = baseUsername("Un Nombre Larguísimo De Verdad Que No Termina Nunca");
    expect(result.length).toBeLessThanOrEqual(20);
  });

  it("agrega sufijo si el slug cae en la lista de reservados", () => {
    expect(baseUsername("Admin")).toBe("admin-1");
    expect(baseUsername("Denveler")).toBe("denveler-1");
  });

  it("usa un fallback si el nombre no deja slug utilizable", () => {
    const result = baseUsername("!!!");
    expect(result.length).toBeGreaterThanOrEqual(3);
  });
});

describe("resolveUsername", () => {
  it("devuelve el base si está libre", () => {
    expect(resolveUsername("willy", new Set())).toBe("willy");
  });

  it("agrega -2 si el base está tomado", () => {
    expect(resolveUsername("willy", new Set(["willy"]))).toBe("willy-2");
  });

  it("encadena sufijos hasta encontrar uno libre", () => {
    expect(resolveUsername("willy", new Set(["willy", "willy-2", "willy-3"]))).toBe("willy-4");
  });

  it("evita chocar con reservados aunque no estén en `taken`", () => {
    expect(resolveUsername("admin", new Set())).toBe("admin-2");
  });
});

describe("RESERVED_USERNAMES", () => {
  it("incluye los nombres del equipo y términos de sistema", () => {
    for (const w of ["admin", "denveler", "api", "willy", "kevin", "soporte", "moderador", "null", "undefined"]) {
      expect(RESERVED_USERNAMES.has(w)).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Correr los tests y confirmar que fallan**

```bash
cd /Users/willy/Desktop/launchpad/launchpad
npx vitest run src/lib/username.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/username'`.

- [ ] **Step 3: Implementar `username.ts`**

Crear `launchpad/src/lib/username.ts`:

```ts
import { slugify } from "@/lib/validation";

/** Nombres bloqueados incluso para auto-generación y edición manual. */
export const RESERVED_USERNAMES = new Set([
  "admin",
  "denveler",
  "api",
  "willy",
  "kevin",
  "soporte",
  "moderador",
  "null",
  "undefined",
]);

/** Pure: convierte un nombre de perfil en un username base (sin chequear unicidad). */
export function baseUsername(name: string): string {
  const slug = slugify(name).slice(0, 20).replace(/-+$/, "");
  const base = slug.length >= 3 ? slug : `usuario-${Math.abs(hashCode(name)) % 10000}`.slice(0, 20);
  return RESERVED_USERNAMES.has(base) ? `${base}-1` : base;
}

/** Pure: dado un base y el set de usernames ya tomados, devuelve la primera variante libre. */
export function resolveUsername(base: string, taken: Set<string>): string {
  if (!taken.has(base) && !RESERVED_USERNAMES.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`) || RESERVED_USERNAMES.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return h;
}
```

- [ ] **Step 4: Correr los tests y confirmar que pasan**

```bash
npx vitest run src/lib/username.test.ts
```

Expected: 9/9 PASS.

- [ ] **Step 5: Agregar los modelos al schema**

En `launchpad/prisma/schema.prisma`, dentro de `model User { ... }`, agregar (después de `suspendedAt`):

```prisma
  /// @handle único. Nullable a nivel de BD (Postgres permite múltiples NULL
  /// bajo UNIQUE) — la app siempre asigna uno al registrarse; el backfill
  /// llena a los usuarios existentes (ver prisma/backfill-usernames.ts).
  username          String?   @unique
  /// Se puede editar una sola vez: NULL = todavía no lo cambió manualmente.
  usernameChangedAt DateTime? @map("username_changed_at")
```

Y en las relaciones del mismo `model User`, agregar:

```prisma
  badges        UserBadge[]
  badgesGranted UserBadge[] @relation("BadgesGranted")
```

En `enum NotificationType`, agregar `MENTION`:

```prisma
enum NotificationType {
  UPVOTE
  COMMENT
  MENTION
}
```

Al final del archivo, agregar los dos modelos nuevos:

```prisma
// ---------------------------------------------------------------------------
// Insignias
// ---------------------------------------------------------------------------

/// Catálogo fijo de insignias. Agregar una nueva es una fila (seed), no
/// requiere código nuevo salvo que también necesite un trigger automático.
model Badge {
  id          String   @id @default(cuid())
  slug        String   @unique
  name        String
  description String
  icon        String
  createdAt   DateTime @default(now()) @map("created_at")

  users UserBadge[]

  @@map("badges")
}

model UserBadge {
  id          String   @id @default(cuid())
  userId      String   @map("user_id")
  badgeId     String   @map("badge_id")
  /// NULL = otorgada automáticamente por el sistema. No-NULL = admin que la otorgó a mano.
  grantedById String?  @map("granted_by_id")
  createdAt   DateTime @default(now()) @map("created_at")

  user      User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  badge     Badge @relation(fields: [badgeId], references: [id], onDelete: Cascade)
  grantedBy User? @relation("BadgesGranted", fields: [grantedById], references: [id], onDelete: SetNull)

  @@unique([userId, badgeId])
  @@index([userId])
  @@map("user_badges")
}
```

- [ ] **Step 6: Generar la migración local**

```bash
cd /Users/willy/Desktop/launchpad/launchpad
npx prisma migrate dev --name comunidad_visible
```

Expected: crea `prisma/migrations/<timestamp>_comunidad_visible/migration.sql` y la aplica a la base local sin errores. Revisar que el SQL generado incluya: `ALTER TABLE "users" ADD COLUMN "username" TEXT, ADD COLUMN "username_changed_at" TIMESTAMP(3);`, `CREATE UNIQUE INDEX "users_username_key" ON "users"("username");`, `CREATE TABLE "badges" (...)`, `CREATE TABLE "user_badges" (...)`, y el `ALTER TYPE "NotificationType" ADD VALUE 'MENTION';`.

- [ ] **Step 7: Regenerar el cliente de Prisma**

```bash
npx prisma generate
```

Expected: sin errores — confirma que las dos relaciones nombradas (`badges`/`badgesGranted`) compilan.

- [ ] **Step 8: Seed del catálogo de insignias (local + referencia para prod)**

En `launchpad/prisma/seed.ts`, dentro de `async function main() { ... }`, agregar después del bloque de categorías:

```ts
  // --- Insignias (catálogo fijo) -------------------------------------------
  const badgeData = [
    { slug: "fundador", name: "Fundador", description: "Uno de los primeros 10 makers en lanzar en Denveler", icon: "🏛️" },
    { slug: "primer-lanzamiento", name: "Primer lanzamiento", description: "Publicó su primer producto en Denveler", icon: "🚀" },
    { slug: "top-10-mes", name: "Top 10 del mes", description: "Producto entre los 10 más votados del mes", icon: "🏆" },
    { slug: "vendido", name: "Vendido", description: "Concretó la venta de su producto a través de Denveler", icon: "🤝" },
  ];
  for (const b of badgeData) {
    await prisma.badge.upsert({ where: { slug: b.slug }, update: {}, create: b });
  }
```

- [ ] **Step 9: Correr el seed local y confirmar**

```bash
npm run db:seed
```

Expected: corre sin errores; `npx prisma studio` (opcional, manual) muestra 4 filas en `badges`.

- [ ] **Step 10: Commit**

```bash
git add prisma/schema.prisma prisma/migrations prisma/seed.ts src/lib/username.ts src/lib/username.test.ts
git commit -m "feat(schema): username único, insignias (Badge/UserBadge) y NotificationType.MENTION"
```

---

### Task 2: Backfill de usernames + endpoints de perfil

**Files:**
- Create: `launchpad/prisma/backfill-usernames.ts`
- Modify: `launchpad/package.json` (nuevo script `db:backfill-usernames`)
- Modify: `launchpad/src/lib/validation.ts` (agregar `usernameSchema`, extender `registerSchema`/`updateProfileSchema`)
- Modify: `launchpad/src/app/api/auth/register/route.ts` (o donde esté el registro — asignar username al crear el usuario)
- Modify: `launchpad/src/app/api/me/route.ts` (PATCH acepta `username`, respeta el límite de un cambio)
- Modify: `launchpad/src/app/api/users/[id]/route.ts` (incluir `username` en el select, resolver también por username)
- Modify: `launchpad/src/lib/frontend/types.ts` (agregar `username` a `PublicUser`/`MeProfile`)

**Interfaces:**
- Consumes: `baseUsername`, `resolveUsername`, `RESERVED_USERNAMES` de `src/lib/username.ts` (Task 1).
- Produces: usuarios nuevos y existentes con `username` poblado; `GET /api/users/:idOrUsername` acepta ambos; `PATCH /api/me` acepta `{ username?: string }`.

- [ ] **Step 1: Agregar `usernameSchema` a `validation.ts`**

En `launchpad/src/lib/validation.ts`, importar el nuevo módulo y agregar el schema (junto a `registerSchema`, cerca del inicio del archivo):

```ts
import { RESERVED_USERNAMES } from "@/lib/username";
```

```ts
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(30)
  .regex(/^[a-z0-9-]+$/, "Solo minúsculas, números y guiones")
  .refine((v) => !RESERVED_USERNAMES.has(v), "Ese nombre de usuario no está disponible");
```

En `updateProfileSchema`, agregar el campo:

```ts
export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  bio: z.string().trim().max(500).optional(),
  avatarUrl: imageUrlSchema.optional().nullable(),
  username: usernameSchema.optional(),
});
```

- [ ] **Step 2: Escribir test de `usernameSchema`**

Agregar a `launchpad/src/lib/validation.test.ts` (leer el archivo primero para seguir su estilo `describe`/`it` exacto):

```ts
describe("usernameSchema", () => {
  it("acepta un username válido", () => {
    expect(usernameSchema.parse("willy-dev")).toBe("willy-dev");
  });

  it("normaliza a minúsculas", () => {
    expect(usernameSchema.parse("Willy-Dev")).toBe("willy-dev");
  });

  it("rechaza menos de 3 caracteres", () => {
    expect(() => usernameSchema.parse("ab")).toThrow();
  });

  it("rechaza caracteres fuera de [a-z0-9-]", () => {
    expect(() => usernameSchema.parse("willy_dev")).toThrow();
    expect(() => usernameSchema.parse("willy dev")).toThrow();
  });

  it("rechaza nombres reservados", () => {
    expect(() => usernameSchema.parse("admin")).toThrow();
    expect(() => usernameSchema.parse("DENVELER")).toThrow();
  });
});
```

- [ ] **Step 3: Correr y confirmar que pasa (junto con el resto del archivo)**

```bash
cd /Users/willy/Desktop/launchpad/launchpad
npx vitest run src/lib/validation.test.ts
```

Expected: todos los tests del archivo PASS, incluidos los 5 nuevos.

- [ ] **Step 4: Leer el endpoint de registro actual**

```bash
cat src/app/api/auth/register/route.ts 2>/dev/null || find src/app/api -iname "*register*"
```

Localizar el archivo real (puede estar en otra ruta, ej. `src/app/api/register/route.ts`). Leerlo completo antes de modificarlo.

- [ ] **Step 5: Asignar username al crear el usuario**

En el handler que hace `prisma.user.create(...)` durante el registro, ANTES del `create`, agregar la resolución del username:

```ts
import { baseUsername, resolveUsername } from "@/lib/username";
```

```ts
  const base = baseUsername(input.name);
  const existing = await prisma.user.findMany({
    where: { username: { startsWith: base } },
    select: { username: true },
  });
  const taken = new Set(existing.map((u) => u.username).filter((u): u is string => u !== null));
  const username = resolveUsername(base, taken);
```

Y en el `data` del `prisma.user.create`, agregar `username,`.

- [ ] **Step 6: Test manual del registro**

```bash
npm run dev
```

En otra terminal:

```bash
curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Prueba Comunidad","email":"prueba-comunidad@test.com","password":"changeme123"}' | python3 -m json.tool
```

Expected: `data.username` presente, algo como `"prueba-comunidad"`. Repetir el mismo curl con otro email — el segundo debe recibir `"prueba-comunidad-2"`. Borrar ambos usuarios de prueba de la base local después (`npx prisma studio` o un `DELETE` manual) — no dejar datos de prueba en la DB de desarrollo compartida si aplica.

- [ ] **Step 7: Crear el script de backfill**

Crear `launchpad/prisma/backfill-usernames.ts`:

```ts
/**
 * Backfill de `username` para usuarios creados antes de este feature.
 * NO es SQL a mano — corre una sola vez, local o contra producción, apuntando
 * DATABASE_URL a la base correspondiente:
 *
 *   DATABASE_URL="postgres://...prod..." npx tsx prisma/backfill-usernames.ts
 *
 * Idempotente: solo toca usuarios con username NULL, así que correrlo dos
 * veces no hace nada la segunda vez.
 */
import { PrismaClient } from "@prisma/client";
import { baseUsername, resolveUsername } from "../src/lib/username";

const prisma = new PrismaClient();

async function main() {
  const withUsername = await prisma.user.findMany({
    where: { username: { not: null } },
    select: { username: true },
  });
  const taken = new Set(withUsername.map((u) => u.username as string));

  const pending = await prisma.user.findMany({
    where: { username: null },
    select: { id: true, name: true },
    orderBy: { createdAt: "asc" },
  });

  console.log(`[backfill-usernames] ${pending.length} usuario(s) sin username.`);

  for (const user of pending) {
    const base = baseUsername(user.name);
    const username = resolveUsername(base, taken);
    taken.add(username);
    await prisma.user.update({ where: { id: user.id }, data: { username } });
    console.log(`[backfill-usernames] ${user.id} -> ${username}`);
  }

  console.log("[backfill-usernames] listo.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 8: Agregar el script npm**

En `launchpad/package.json`, dentro de `"scripts"`, agregar (junto a `"db:seed"`):

```json
    "db:backfill-usernames": "tsx prisma/backfill-usernames.ts",
```

- [ ] **Step 9: Correr el backfill local**

```bash
npm run db:backfill-usernames
```

Expected: reporta cuántos usuarios del seed local quedaron sin username antes del cambio (probablemente 0 si el seed ya corrió después de Task 1 — si es 0, confirmar igual que el script no falla con lista vacía).

- [ ] **Step 10: Extender `GET /api/users/:id` para aceptar username y devolverlo**

Leer `launchpad/src/app/api/users/[id]/route.ts` completo primero. Reemplazar el cuerpo del `GET` para resolver por `id` O `username`, y agregar `username` al `select`:

```ts
export const GET = withErrorHandling(async (_req: Request, { params }: Params) => {
  const user = await prisma.user.findFirst({
    where: { OR: [{ id: params.id }, { username: params.id }] },
    select: {
      id: true,
      name: true,
      username: true,
      avatarUrl: true,
      bio: true,
      createdAt: true,
      _count: {
        select: {
          products: { where: { status: "LIVE" } },
          upvotes: true,
          comments: true,
        },
      },
    },
  });
  if (!user) throw new ApiError(404, "User not found");

  return ok(user);
});
```

- [ ] **Step 11: Extender `PATCH /api/me` para aceptar `username` con el límite de un cambio**

Leer `launchpad/src/app/api/me/route.ts` completo primero. En el handler `PATCH`, antes de construir el `data` para `prisma.user.update`, agregar la validación del límite:

```ts
  const input = await parseBody(req, updateProfileSchema);

  if (input.username !== undefined) {
    const current = await prisma.user.findUnique({
      where: { id: user.id },
      select: { username: true, usernameChangedAt: true },
    });
    if (current?.usernameChangedAt) {
      throw new ApiError(400, "Ya usaste tu único cambio de nombre de usuario.");
    }
    if (input.username !== current?.username) {
      const taken = await prisma.user.findUnique({
        where: { username: input.username },
        select: { id: true },
      });
      if (taken) throw new ApiError(400, "Ese nombre de usuario ya está en uso.");
    }
  }
```

Y en el objeto `data` que se pasa a `prisma.user.update`, agregar condicionalmente:

```ts
      ...(input.username !== undefined ? { username: input.username, usernameChangedAt: new Date() } : {}),
```

- [ ] **Step 12: Agregar `username` a los tipos de frontend**

En `launchpad/src/lib/frontend/types.ts`, en `PublicUser` y `MeProfile` (o el tipo equivalente que devuelve `/api/users/:id` y `/api/me`), agregar el campo:

```ts
  username: string | null;
```

- [ ] **Step 13: Actualizar `/makers/[id]` para que también funcione con username**

`launchpad/src/app/makers/[id]/page.tsx` y `maker-profile-client.tsx` no necesitan cambios de código — ya pasan el segmento `[id]` tal cual a `fetchUser`, y el backend (Step 10) ahora resuelve por `id` O `username`. Verificar manualmente:

```bash
curl -s http://localhost:3000/api/users/prueba-comunidad-2 | python3 -m json.tool
```

Expected: si quedó algún usuario de prueba con ese username, devuelve sus datos igual que por `id`. Si ya se borraron, probar con el username de cualquier usuario del seed (ej. `willy` o el que haya resultado del backfill).

- [ ] **Step 14: Correr toda la suite y confirmar que nada se rompió**

```bash
npm test
```

Expected: todos los tests PASS (incluye los nuevos de Task 1 y Task 2).

- [ ] **Step 15: Commit**

```bash
git add prisma/backfill-usernames.ts package.json src/lib/validation.ts src/lib/validation.test.ts \
  src/app/api/auth/register/route.ts src/app/api/me/route.ts src/app/api/users/[id]/route.ts \
  src/lib/frontend/types.ts
git commit -m "feat(username): asignación al registro, backfill, edición limitada y resolución por handle"
```

---

### Task 3: Menciones @usuario en comentarios

**Files:**
- Create: `launchpad/src/lib/mentions.ts`
- Test: `launchpad/src/lib/mentions.test.ts`
- Modify: `launchpad/src/app/api/products/[slug]/comments/route.ts`
- Modify: `launchpad/src/lib/frontend/types.ts` (`NotificationType` union)
- Modify: `launchpad/src/components/layout/notifications-bell.tsx`
- Modify: `launchpad/src/components/product/comment-section.tsx`

**Interfaces:**
- Consumes: `notify()` de `src/lib/notifications.ts` (ya existente, usado en el mismo endpoint para `COMMENT`).
- Produces: `extractMentions(body: string): string[]` — usado tanto en el backend (para crear notificaciones) como en el frontend (para renderizar links), así que vive en `src/lib/mentions.ts` sin dependencias de Node/Prisma para poder importarse en un client component.

- [ ] **Step 1: Escribir los tests de `extractMentions`**

Crear `launchpad/src/lib/mentions.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { extractMentions } from "@/lib/mentions";

describe("extractMentions", () => {
  it("devuelve vacío sin menciones", () => {
    expect(extractMentions("hola a todos")).toEqual([]);
  });

  it("extrae una mención", () => {
    expect(extractMentions("gracias @willy por el feedback")).toEqual(["willy"]);
  });

  it("extrae varias menciones en orden de aparición", () => {
    expect(extractMentions("@willy y @kevin ambos ayudaron")).toEqual(["willy", "kevin"]);
  });

  it("deduplica menciones repetidas", () => {
    expect(extractMentions("@willy @willy @willy")).toEqual(["willy"]);
  });

  it("normaliza a minúsculas", () => {
    expect(extractMentions("@Willy")).toEqual(["willy"]);
  });

  it("tope de 5 menciones por comentario", () => {
    const body = "@a1 @a2 @a3 @a4 @a5 @a6 @a7";
    expect(extractMentions(body)).toEqual(["a1", "a2", "a3", "a4", "a5"]);
  });

  it("ignora un @ pegado a texto sin formato de username válido", () => {
    expect(extractMentions("mi email es alguien@dominio.com")).toEqual(["dominio"]);
  });

  it("no matchea un username de menos de 3 caracteres", () => {
    expect(extractMentions("hola @ab")).toEqual([]);
  });
});
```

Nota sobre el caso de email: el regex no distingue un `@` de mención de un `@` dentro de un email — es una limitación aceptada explícitamente (edge case raro: alguien pegando su email en un comentario). El test documenta el comportamiento real, no lo oculta.

- [ ] **Step 2: Correr y confirmar que falla**

```bash
cd /Users/willy/Desktop/launchpad/launchpad
npx vitest run src/lib/mentions.test.ts
```

Expected: FAIL — módulo no existe.

- [ ] **Step 3: Implementar `mentions.ts`**

Crear `launchpad/src/lib/mentions.ts`:

```ts
/** Extrae hasta 5 @usernames con sintaxis válida de un texto, sin duplicados, en orden de aparición. */
export function extractMentions(body: string): string[] {
  const matches = body.match(/@([a-z0-9-]{3,30})\b/gi) ?? [];
  const unique = [...new Set(matches.map((m) => m.slice(1).toLowerCase()))];
  return unique.slice(0, 5);
}
```

- [ ] **Step 4: Correr y confirmar que pasa**

```bash
npx vitest run src/lib/mentions.test.ts
```

Expected: 8/8 PASS.

- [ ] **Step 5: Integrar en el endpoint de comentarios**

En `launchpad/src/app/api/products/[slug]/comments/route.ts`, agregar el import:

```ts
import { extractMentions } from "@/lib/mentions";
```

Y en el handler `POST`, después de crear el `comment` y de la llamada a `notify(...)` para `COMMENT` (que notifica al maker), agregar:

```ts
  const mentionedUsernames = extractMentions(input.body);
  if (mentionedUsernames.length > 0) {
    const mentionedUsers = await prisma.user.findMany({
      where: { username: { in: mentionedUsernames }, suspendedAt: null, id: { not: user.id } },
      select: { id: true },
    });
    await Promise.all(
      mentionedUsers.map((mentioned) =>
        notify({
          userId: mentioned.id,
          actorId: user.id,
          type: "MENTION",
          productId: product.id,
          commentId: comment.id,
        })
      )
    );
  }
```

- [ ] **Step 6: Confirmar la firma de `notify()` acepta `"MENTION"`**

```bash
cat src/lib/notifications.ts
```

Si el parámetro `type` está tipado como `NotificationType` importado de `@prisma/client`, no requiere cambios (el enum ya incluye `MENTION` desde Task 1). Si está tipado con un union literal propio (`"UPVOTE" | "COMMENT"`), extenderlo a `"UPVOTE" | "COMMENT" | "MENTION"`.

- [ ] **Step 7: Test manual end-to-end**

```bash
npm run dev
```

Con dos usuarios de prueba logueados en pestañas distintas (o vía curl con sesión), publicar un comentario que mencione el username del otro usuario en un producto LIVE, y verificar en `GET /api/notifications` (autenticado como el mencionado) que aparece una notificación `type: "MENTION"`.

- [ ] **Step 8: Actualizar el tipo `NotificationType` del frontend**

En `launchpad/src/lib/frontend/types.ts`:

```ts
export type NotificationType = "UPVOTE" | "COMMENT" | "MENTION";
```

- [ ] **Step 9: Agregar el texto de la notificación**

En `launchpad/src/components/layout/notifications-bell.tsx`, en `notificationText`:

```ts
function notificationText(n: NotificationItem): string {
  if (n.type === "UPVOTE") return "votó tu producto";
  if (n.type === "MENTION") return "te mencionó en un comentario en";
  return "comentó en";
}
```

- [ ] **Step 10: Renderizar @menciones como links en los comentarios**

Leer `launchpad/src/components/product/comment-section.tsx` completo (ya se tiene su contenido de la fase de diseño). Agregar un helper de render arriba del componente:

```tsx
import { extractMentions } from "@/lib/mentions";

function renderBody(body: string) {
  const mentioned = new Set(extractMentions(body));
  const parts = body.split(/(@[a-z0-9-]{3,30}\b)/gi);
  return parts.map((part, i) => {
    const match = /^@([a-z0-9-]{3,30})$/i.exec(part);
    if (match && mentioned.has(match[1].toLowerCase())) {
      return (
        <a key={i} href={`/makers/${match[1].toLowerCase()}`} className="font-semibold text-primary hover:underline">
          {part}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}
```

Y en el JSX donde hoy se imprime `{c.body}` directo, reemplazar por `{renderBody(c.body)}`.

- [ ] **Step 11: Correr toda la suite**

```bash
npm test
```

Expected: todos PASS.

- [ ] **Step 12: Commit**

```bash
git add src/lib/mentions.ts src/lib/mentions.test.ts src/app/api/products/[slug]/comments/route.ts \
  src/lib/frontend/types.ts src/components/layout/notifications-bell.tsx src/components/product/comment-section.tsx
git commit -m "feat(mentions): menciones @usuario en comentarios con notificación interna"
```

---

### Task 4: Otorgamiento automático de insignias (Fundador + Primer lanzamiento)

**Files:**
- Create: `launchpad/src/lib/badges.ts`
- Test: `launchpad/src/lib/badges.test.ts`
- Modify: `launchpad/src/app/api/products/[slug]/route.ts` (hook en el `PATCH` cuando `status` pasa a `LIVE`)

**Interfaces:**
- Produces: `shouldGrantFundador(liveMakerCountIncludingThis: number): boolean`, `shouldGrantPrimerLanzamiento(makerLiveProductCountIncludingThis: number): boolean` — funciones puras de condición, testeadas sin Prisma.
- Produces: `grantBadgeIfMissing(userId: string, badgeSlug: string, grantedById: string | null): Promise<void>` — helper impuro reutilizado también por el cron (Task 5) y por el endpoint admin (Task 6).

- [ ] **Step 1: Escribir los tests de las condiciones puras**

Crear `launchpad/src/lib/badges.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { shouldGrantFundador, shouldGrantPrimerLanzamiento } from "@/lib/badges";

describe("shouldGrantFundador", () => {
  it("otorga cuando el conteo (incluyendo a este maker) es <= 10", () => {
    expect(shouldGrantFundador(1)).toBe(true);
    expect(shouldGrantFundador(10)).toBe(true);
  });

  it("no otorga a partir del maker 11", () => {
    expect(shouldGrantFundador(11)).toBe(false);
    expect(shouldGrantFundador(50)).toBe(false);
  });
});

describe("shouldGrantPrimerLanzamiento", () => {
  it("otorga cuando es el primer producto LIVE del maker", () => {
    expect(shouldGrantPrimerLanzamiento(1)).toBe(true);
  });

  it("no otorga en el segundo producto LIVE en adelante", () => {
    expect(shouldGrantPrimerLanzamiento(2)).toBe(false);
    expect(shouldGrantPrimerLanzamiento(5)).toBe(false);
  });
});
```

- [ ] **Step 2: Correr y confirmar que falla**

```bash
cd /Users/willy/Desktop/launchpad/launchpad
npx vitest run src/lib/badges.test.ts
```

Expected: FAIL — módulo no existe.

- [ ] **Step 3: Implementar `badges.ts`**

Crear `launchpad/src/lib/badges.ts`:

```ts
import { prisma } from "@/lib/db";

/** Pure: ¿corresponde otorgar "Fundador"? `count` incluye al maker que se está evaluando. */
export function shouldGrantFundador(liveMakerCountIncludingThis: number): boolean {
  return liveMakerCountIncludingThis <= 10;
}

/** Pure: ¿corresponde otorgar "Primer lanzamiento"? `count` incluye el producto que se está evaluando. */
export function shouldGrantPrimerLanzamiento(makerLiveProductCountIncludingThis: number): boolean {
  return makerLiveProductCountIncludingThis === 1;
}

/**
 * Otorga una insignia si el usuario todavía no la tiene. Idempotente gracias
 * al `@@unique([userId, badgeId])` — un intento duplicado no explota, se ignora.
 */
export async function grantBadgeIfMissing(
  userId: string,
  badgeSlug: string,
  grantedById: string | null
): Promise<void> {
  const badge = await prisma.badge.findUnique({ where: { slug: badgeSlug }, select: { id: true } });
  if (!badge) {
    console.error(`[badges] slug desconocido: ${badgeSlug}`);
    return;
  }
  const existing = await prisma.userBadge.findUnique({
    where: { userId_badgeId: { userId, badgeId: badge.id } },
    select: { id: true },
  });
  if (existing) return;
  await prisma.userBadge.create({ data: { userId, badgeId: badge.id, grantedById } });
}
```

- [ ] **Step 4: Correr y confirmar que pasa**

```bash
npx vitest run src/lib/badges.test.ts
```

Expected: 4/4 PASS.

- [ ] **Step 5: Enganchar en la transición a LIVE**

En `launchpad/src/app/api/products/[slug]/route.ts`, importar:

```ts
import { shouldGrantFundador, shouldGrantPrimerLanzamiento, grantBadgeIfMissing } from "@/lib/badges";
```

En el handler `PATCH`, después de `const product = await prisma.product.update({ ... })` y antes del `return ok(product);`, agregar:

```ts
  // Insignias automáticas: solo al pasar A "LIVE" desde otro estado.
  if (input.status === "LIVE" && base.status !== "LIVE") {
    const [liveMakerCount, makerLiveProductCount] = await Promise.all([
      prisma.user.count({ where: { products: { some: { status: "LIVE" } } } }),
      prisma.product.count({ where: { makerId: base.makerId, status: "LIVE" } }),
    ]);
    if (shouldGrantFundador(liveMakerCount)) {
      await grantBadgeIfMissing(base.makerId, "fundador", null);
    }
    if (shouldGrantPrimerLanzamiento(makerLiveProductCount)) {
      await grantBadgeIfMissing(base.makerId, "primer-lanzamiento", null);
    }
  }
```

**Nota:** `liveMakerCount`/`makerLiveProductCount` se calculan DESPUÉS del `update`, así que ya incluyen al producto/maker recién publicado — coherente con que las funciones puras esperan el conteo "incluyendo a este".

- [ ] **Step 6: Test manual**

```bash
npm run dev
```

Publicar un producto nuevo (pasar su `status` a `LIVE` vía el flujo normal de la UI o `PATCH /api/products/:slug`). Confirmar en `npx prisma studio` que aparecieron filas en `user_badges` para ese maker con las insignias correspondientes según cuántos makers LIVE hay ya en la base local (el seed trae varios, así que probablemente NO reciba "Fundador" si ya hay 10+ — es el comportamiento esperado, verificar el conteo real antes de asumir).

- [ ] **Step 7: Correr toda la suite**

```bash
npm test
```

Expected: todos PASS.

- [ ] **Step 8: Commit**

```bash
git add src/lib/badges.ts src/lib/badges.test.ts src/app/api/products/[slug]/route.ts
git commit -m "feat(badges): otorgamiento automático de Fundador y Primer lanzamiento al publicar"
```

---

### Task 5: Cron mensual "Top 10 del mes"

**Files:**
- Create: `launchpad/src/lib/top-month.ts`
- Test: `launchpad/src/lib/top-month.test.ts`
- Create: `launchpad/src/app/api/cron/top-month-badges/route.ts`
- Modify: `launchpad/vercel.json`

**Interfaces:**
- Consumes: `grantBadgeIfMissing` de `src/lib/badges.ts` (Task 4).
- Produces: `previousCalendarMonthRange(now: Date): { start: Date; end: Date }` — función pura testeada con fechas fijas, consumida por el endpoint del cron.

- [ ] **Step 1: Escribir los tests de `previousCalendarMonthRange`**

Crear `launchpad/src/lib/top-month.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { previousCalendarMonthRange } from "@/lib/top-month";

describe("previousCalendarMonthRange", () => {
  it("devuelve junio completo cuando `now` es el 1 de julio", () => {
    const { start, end } = previousCalendarMonthRange(new Date("2026-07-01T14:00:00Z"));
    expect(start.toISOString()).toBe("2026-06-01T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-07-01T00:00:00.000Z");
  });

  it("cruza el año correctamente en enero", () => {
    const { start, end } = previousCalendarMonthRange(new Date("2027-01-01T00:00:00Z"));
    expect(start.toISOString()).toBe("2026-12-01T00:00:00.000Z");
    expect(end.toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });
});
```

- [ ] **Step 2: Correr y confirmar que falla**

```bash
cd /Users/willy/Desktop/launchpad/launchpad
npx vitest run src/lib/top-month.test.ts
```

Expected: FAIL — módulo no existe.

- [ ] **Step 3: Implementar `top-month.ts`**

Crear `launchpad/src/lib/top-month.ts`:

```ts
/** Pure: dado "ahora", devuelve el rango [start, end) del mes calendario ANTERIOR en UTC. */
export function previousCalendarMonthRange(now: Date): { start: Date; end: Date } {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  return { start, end };
}
```

- [ ] **Step 4: Correr y confirmar que pasa**

```bash
npx vitest run src/lib/top-month.test.ts
```

Expected: 2/2 PASS.

- [ ] **Step 5: Crear el endpoint del cron**

Crear `launchpad/src/app/api/cron/top-month-badges/route.ts` (mismo patrón que `src/app/api/cron/offer-nudge/route.ts` — auth por `CRON_SECRET`):

```ts
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/auth";
import { withErrorHandling, ok } from "@/lib/api";
import { previousCalendarMonthRange } from "@/lib/top-month";
import { grantBadgeIfMissing } from "@/lib/badges";

/**
 * GET /api/cron/top-month-badges — corre el día 1 de cada mes vía Vercel
 * Cron. Calcula el top 10 de productos por votos recibidos durante el mes
 * calendario anterior y otorga "top-10-mes" a cada maker dueño (skip-if-exists,
 * es un logro de una sola vez — ver Nota de diseño en el spec).
 */
export const GET = withErrorHandling(async (req: Request) => {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    throw new ApiError(401, "Unauthorized");
  }

  const { start, end } = previousCalendarMonthRange(new Date());

  const topProducts = await prisma.product.findMany({
    where: { status: "LIVE" },
    select: {
      makerId: true,
      _count: { select: { upvotes: { where: { createdAt: { gte: start, lt: end } } } } },
    },
  });

  const top10 = topProducts
    .map((p) => ({ makerId: p.makerId, votes: p._count.upvotes }))
    .filter((p) => p.votes > 0)
    .sort((a, b) => b.votes - a.votes)
    .slice(0, 10);

  for (const { makerId } of top10) {
    await grantBadgeIfMissing(makerId, "top-10-mes", null);
  }

  return ok({ monthStart: start.toISOString(), monthEnd: end.toISOString(), granted: top10.length });
});
```

- [ ] **Step 6: Registrar el cron en `vercel.json`**

En `launchpad/vercel.json`, agregar la segunda entrada en el array `crons`:

```json
{
  "crons": [
    { "path": "/api/cron/offer-nudge", "schedule": "0 14 * * *" },
    { "path": "/api/cron/top-month-badges", "schedule": "0 6 1 * *" }
  ]
}
```

(`0 6 1 * *` = 06:00 UTC el día 1 de cada mes.)

- [ ] **Step 7: Test manual**

```bash
npm run dev
curl -s http://localhost:3000/api/cron/top-month-badges | python3 -m json.tool
```

Expected: `{ "data": { "monthStart": ..., "monthEnd": ..., "granted": N } }` sin error. `N` puede ser 0 en local si no hay votos con `createdAt` dentro del mes calendario anterior — es un resultado válido, no un fallo.

- [ ] **Step 8: Correr toda la suite**

```bash
npm test
```

Expected: todos PASS.

- [ ] **Step 9: Commit**

```bash
git add src/lib/top-month.ts src/lib/top-month.test.ts src/app/api/cron/top-month-badges vercel.json
git commit -m "feat(badges): cron mensual que otorga Top 10 del mes"
```

---

### Task 6: Endpoints admin de otorgar/revocar insignias + UI

**Files:**
- Create: `launchpad/src/app/api/admin/users/[id]/badges/route.ts`
- Modify: `launchpad/src/lib/validation.ts` (`grantBadgeSchema`)
- Modify: `launchpad/src/lib/frontend/types.ts` (`Badge`, `UserBadgeItem`)
- Modify: `launchpad/src/lib/frontend/api-client.ts` (`fetchBadgeCatalog`, `grantBadge`, `revokeBadge`)
- Create: `launchpad/src/components/admin/badges-section.tsx`
- Modify: `launchpad/src/app/admin/admin-client.tsx`

**Interfaces:**
- Consumes: `grantBadgeIfMissing` de `src/lib/badges.ts` (Task 4), patrón de `src/components/admin/users-section.tsx` (búsqueda + `useApi` + `act()`).
- Produces: `POST /api/admin/users/:id/badges` `{ badgeSlug: string }` → 201; `DELETE /api/admin/users/:id/badges/:badgeSlug` → 204.

- [ ] **Step 1: Agregar el schema de validación**

En `launchpad/src/lib/validation.ts`, junto a `adminUpdateUserSchema`:

```ts
export const grantBadgeSchema = z.object({
  badgeSlug: z.string().min(1).max(60),
});
```

- [ ] **Step 2: Crear el endpoint admin**

Crear `launchpad/src/app/api/admin/users/[id]/badges/route.ts`:

```ts
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { requireAdmin, ApiError } from "@/lib/auth";
import { grantBadgeSchema } from "@/lib/validation";
import { withErrorHandling, parseBody, created, noContent } from "@/lib/api";
import { grantBadgeIfMissing } from "@/lib/badges";

type Params = { params: { id: string } };

/** POST /api/admin/users/:id/badges — otorga una insignia del catálogo. Admin only. */
export const POST = withErrorHandling(async (req: Request, { params }: Params) => {
  const admin = await requireAdmin();
  const target = await prisma.user.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!target) throw new ApiError(404, "Usuario no encontrado");

  const input = await parseBody(req, grantBadgeSchema);
  const badge = await prisma.badge.findUnique({ where: { slug: input.badgeSlug } });
  if (!badge) throw new ApiError(404, "Insignia no encontrada");

  await grantBadgeIfMissing(target.id, input.badgeSlug, admin.id);

  return created({ userId: target.id, badgeSlug: input.badgeSlug });
});

/** DELETE /api/admin/users/:id/badges?slug=xxx — revoca una insignia. Admin only. */
export const DELETE = withErrorHandling(async (req: Request, { params }: Params) => {
  await requireAdmin();
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");
  if (!slug) throw new ApiError(400, "Falta el parámetro slug");

  const badge = await prisma.badge.findUnique({ where: { slug }, select: { id: true } });
  if (!badge) throw new ApiError(404, "Insignia no encontrada");

  await prisma.userBadge.deleteMany({ where: { userId: params.id, badgeId: badge.id } });

  return noContent();
});
```

- [ ] **Step 3: Agregar tipos de frontend**

En `launchpad/src/lib/frontend/types.ts`:

```ts
export interface Badge {
  slug: string;
  name: string;
  description: string;
  icon: string;
}

export interface UserBadgeItem extends Badge {
  grantedByAdmin: boolean;
  createdAt: string;
}
```

- [ ] **Step 4: Agregar helpers al api-client**

En `launchpad/src/lib/frontend/api-client.ts`, junto a las funciones `fetchAdmin*` existentes:

```ts
export function grantBadge(userId: string, badgeSlug: string) {
  return request<{ userId: string; badgeSlug: string }>(`/api/admin/users/${userId}/badges`, {
    method: "POST",
    body: JSON.stringify({ badgeSlug }),
  });
}

export function revokeBadge(userId: string, badgeSlug: string) {
  return request<null>(`/api/admin/users/${userId}/badges?slug=${encodeURIComponent(badgeSlug)}`, {
    method: "DELETE",
  });
}
```

(Usar el mismo helper interno `request<T>` que ya usan `updateAdminUser`/`deleteAdminUser` — leer `api-client.ts` para confirmar su firma exacta antes de escribir estas dos funciones.)

- [ ] **Step 5: Crear el componente `BadgesSection`**

Leer `launchpad/src/components/admin/users-section.tsx` completo primero (ya capturado en la fase de diseño) y replicar exactamente su estructura: buscador de usuario (reusa `fetchAdminUsers` ya existente), lista de resultados, y por cada usuario seleccionado, sus insignias actuales con botón "Revocar" por cada una y un selector con botón "Otorgar" para las que le faltan del catálogo fijo de 4 (`fundador`, `primer-lanzamiento`, `top-10-mes`, `vendido` — hardcodeados en el componente, ya que el catálogo no tiene UI de administración en esta iteración). Usar `useApi`/`useState busyId`/`act()` con el mismo patrón que `users-section.tsx`.

Crear `launchpad/src/components/admin/badges-section.tsx` con esa estructura (seguir el estilo literal del archivo leído — mismos imports de `Card`/`CardContent`, `Skeleton`, `ErrorState`, `EmptyState`).

- [ ] **Step 6: Agregar la pestaña en `/admin`**

En `launchpad/src/app/admin/admin-client.tsx`: agregar `"badges"` al union type `Section`, agregarla al array `items` (gateada por `isAdmin`, igual que `"users"`/`"products"`), importar `BadgesSection` y renderizar `{section === "badges" && <BadgesSection />}`.

- [ ] **Step 7: Test manual**

```bash
npm run dev
```

Entrar a `/admin` con una cuenta ADMIN, ir a la pestaña nueva, buscar un usuario, otorgarle "Fundador" manualmente, confirmar que aparece en la lista, revocarla, confirmar que desaparece.

- [ ] **Step 8: Correr toda la suite**

```bash
npm test
```

Expected: todos PASS.

- [ ] **Step 9: Commit**

```bash
git add src/app/api/admin/users/[id]/badges src/lib/validation.ts src/lib/frontend/types.ts \
  src/lib/frontend/api-client.ts src/components/admin/badges-section.tsx src/app/admin/admin-client.tsx
git commit -m "feat(admin): otorgar y revocar insignias manualmente desde el panel"
```

---

### Task 7: Visualización de insignias (perfil de maker + comentarios)

**Files:**
- Modify: `launchpad/src/app/api/users/[id]/route.ts` (incluir `badges` en el select)
- Modify: `launchpad/src/lib/frontend/types.ts` (`PublicUser.badges`)
- Modify: `launchpad/src/app/makers/[id]/maker-profile-client.tsx`
- Modify: `launchpad/src/app/api/products/[slug]/comments/route.ts` (incluir `badges` del autor en `commentSelect`)
- Modify: `launchpad/src/lib/frontend/types.ts` (`CommentItem.user.badges`)
- Modify: `launchpad/src/components/product/comment-section.tsx`

**Interfaces:**
- Consumes: modelo `UserBadge`/`Badge` de Task 1.

- [ ] **Step 1: Incluir insignias en `GET /api/users/:id`**

En `launchpad/src/app/api/users/[id]/route.ts`, en el `select` del `findFirst`, agregar:

```ts
      badges: {
        select: { badge: { select: { slug: true, name: true, description: true, icon: true } }, grantedById: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      },
```

Y antes del `return ok(user)`, transformar la forma para que el frontend reciba una lista plana:

```ts
  return ok({
    ...user,
    badges: user.badges.map((ub) => ({
      ...ub.badge,
      grantedByAdmin: ub.grantedById !== null,
      createdAt: ub.createdAt.toISOString(),
    })),
  });
```

- [ ] **Step 2: Agregar el campo al tipo `PublicUser`**

En `launchpad/src/lib/frontend/types.ts`, en la interfaz `PublicUser` (o como se llame el tipo devuelto por `fetchUser`):

```ts
  badges: UserBadgeItem[];
```

- [ ] **Step 3: Renderizar los chips en el perfil del maker**

Leer `launchpad/src/app/makers/[id]/maker-profile-client.tsx` completo. Agregar, cerca de donde se muestra el nombre/bio del maker, una fila de chips:

```tsx
{profile.badges.length > 0 && (
  <div className="mt-3 flex flex-wrap gap-2">
    {profile.badges.map((b) => (
      <span
        key={b.slug}
        title={b.description}
        className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary"
      >
        <span>{b.icon}</span>
        {b.name}
      </span>
    ))}
  </div>
)}
```

- [ ] **Step 4: Incluir insignias del autor en los comentarios**

En `launchpad/src/app/api/products/[slug]/comments/route.ts`, en el `commentSelect` compartido por `GET` y `POST`, extender el `user` seleccionado:

```ts
const commentSelect = {
  id: true,
  body: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: {
      id: true,
      name: true,
      avatarUrl: true,
      badges: {
        select: { badge: { select: { slug: true, icon: true, name: true } } },
        orderBy: { createdAt: "asc" as const },
      },
    },
  },
} as const;
```

Y, dado que el GET/POST devuelven el comentario tal cual sale de Prisma (sin transformación hoy), agregar una función de mapeo compartida en el mismo archivo:

```ts
const BADGE_PRIORITY = ["fundador", "vendido", "top-10-mes", "primer-lanzamiento"];

function toCommentDto(c: Awaited<ReturnType<typeof prisma.comment.findFirstOrThrow<{ select: typeof commentSelect }>>>) {
  const badges = c.user.badges
    .map((ub) => ub.badge)
    .sort((a, b) => BADGE_PRIORITY.indexOf(a.slug) - BADGE_PRIORITY.indexOf(b.slug))
    .slice(0, 2);
  return { ...c, user: { id: c.user.id, name: c.user.name, avatarUrl: c.user.avatarUrl, badges } };
}
```

Aplicar `toCommentDto` al resultado de `prisma.comment.findMany` en `GET` (`items.map(toCommentDto)`) y al `comment` recién creado en `POST` (`toCommentDto(comment)`) antes de devolverlos.

**Nota:** si el tipo genérico de `toCommentDto` no compila tal cual contra la versión exacta de Prisma del proyecto, simplificar a un tipo explícito escrito a mano en vez de derivarlo — lo importante es el comportamiento (mapear insignias, cortar a 2, ordenar por prioridad), no la técnica exacta de inferencia de tipos.

- [ ] **Step 5: Actualizar el tipo `CommentItem`**

En `launchpad/src/lib/frontend/types.ts`, en `CommentItem.user`, agregar:

```ts
    badges: { slug: string; icon: string; name: string }[];
```

- [ ] **Step 6: Renderizar los mini-íconos junto al nombre en cada comentario**

En `launchpad/src/components/product/comment-section.tsx`, donde se imprime `{c.user.name}`, agregar al lado:

```tsx
{c.user.badges.map((b) => (
  <span key={b.slug} title={b.name} className="ml-1">
    {b.icon}
  </span>
))}
```

- [ ] **Step 7: Test manual**

```bash
npm run dev
```

Entrar a `/makers/<username-de-alguien-con-insignias>` y confirmar que los chips aparecen. Comentar como ese mismo usuario en un producto y confirmar que los íconos aparecen junto a su nombre.

- [ ] **Step 8: Correr toda la suite**

```bash
npm test
```

Expected: todos PASS.

- [ ] **Step 9: Commit**

```bash
git add src/app/api/users/[id]/route.ts src/lib/frontend/types.ts \
  src/app/makers/[id]/maker-profile-client.tsx src/app/api/products/[slug]/comments/route.ts \
  src/components/product/comment-section.tsx
git commit -m "feat(badges): mostrar insignias en el perfil del maker y junto al nombre en comentarios"
```

---

### Task 8: Badge SVG embebible

**Files:**
- Create: `launchpad/src/app/api/badge.svg/route.ts`
- Test: `launchpad/src/lib/badge-svg.test.ts`
- Create: `launchpad/src/lib/badge-svg.ts`
- Modify: `launchpad/src/app/products/[slug]/product-detail-client.tsx` (o el componente equivalente de la página de producto — confirmar nombre exacto leyendo `launchpad/src/app/products/[slug]/`)

**Interfaces:**
- Produces: `renderBadgeSvg(productName: string | null, theme: "dark" | "light"): string` — función pura testeada sin Next/Request, consumida por la ruta.

- [ ] **Step 1: Escribir los tests de `renderBadgeSvg`**

Crear `launchpad/src/lib/badge-svg.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { renderBadgeSvg } from "@/lib/badge-svg";

describe("renderBadgeSvg", () => {
  it("incluye el nombre del producto cuando se pasa", () => {
    expect(renderBadgeSvg("FocusFlow", "dark")).toContain("FocusFlow");
  });

  it("usa el badge genérico de marca cuando el nombre es null", () => {
    const svg = renderBadgeSvg(null, "dark");
    expect(svg).toContain("Denveler");
    expect(svg).not.toContain("null");
  });

  it("escapa caracteres especiales del nombre del producto", () => {
    const svg = renderBadgeSvg('<script>alert("x")</script>', "dark");
    expect(svg).not.toContain("<script>");
    expect(svg).toContain("&lt;script&gt;");
  });

  it("produce SVG válido (empieza y termina correctamente)", () => {
    const svg = renderBadgeSvg("Algo", "light");
    expect(svg.trim().startsWith("<svg")).toBe(true);
    expect(svg.trim().endsWith("</svg>")).toBe(true);
  });

  it("cambia colores entre tema oscuro y claro", () => {
    const dark = renderBadgeSvg("Algo", "dark");
    const light = renderBadgeSvg("Algo", "light");
    expect(dark).not.toBe(light);
  });
});
```

- [ ] **Step 2: Correr y confirmar que falla**

```bash
cd /Users/willy/Desktop/launchpad/launchpad
npx vitest run src/lib/badge-svg.test.ts
```

Expected: FAIL — módulo no existe.

- [ ] **Step 3: Implementar `badge-svg.ts`**

Crear `launchpad/src/lib/badge-svg.ts`:

```ts
const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const THEMES = {
  dark: { bg: "#001B4D", fg: "#ffffff", accent: "#22d3ee" },
  light: { bg: "#ffffff", fg: "#001B4D", accent: "#2563eb" },
} as const;

/** Pure: genera el SVG del badge embebible. `productName` null = badge genérico de marca. */
export function renderBadgeSvg(productName: string | null, theme: "dark" | "light"): string {
  const t = THEMES[theme];
  const label = productName ? esc(productName) : "Denveler";
  const sub = productName ? "Lanzado en Denveler" : "denveler.com";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="54" viewBox="0 0 220 54">
  <rect width="220" height="54" rx="8" fill="${t.bg}" stroke="${t.accent}" stroke-width="1"/>
  <rect x="10" y="14" width="26" height="26" rx="7" fill="${t.accent}"/>
  <text x="46" y="26" font-family="sans-serif" font-size="14" font-weight="700" fill="${t.fg}">${label}</text>
  <text x="46" y="42" font-family="sans-serif" font-size="11" fill="${t.fg}" opacity="0.7">${sub}</text>
</svg>`;
}
```

- [ ] **Step 4: Correr y confirmar que pasa**

```bash
npx vitest run src/lib/badge-svg.test.ts
```

Expected: 5/5 PASS.

- [ ] **Step 5: Crear la ruta**

Crear `launchpad/src/app/api/badge.svg/route.ts`:

```ts
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { renderBadgeSvg } from "@/lib/badge-svg";

/**
 * GET /api/badge.svg?product=<slug>&theme=dark|light — badge embebible
 * estático. Si el producto no existe o no está LIVE, devuelve el badge
 * genérico de marca (nunca 404 — evita un ícono roto en el sitio del maker).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = url.searchParams.get("product");
  const theme = url.searchParams.get("theme") === "light" ? "light" : "dark";

  let productName: string | null = null;
  if (slug) {
    const product = await prisma.product.findUnique({
      where: { slug },
      select: { name: true, status: true },
    });
    if (product?.status === "LIVE") productName = product.name;
  }

  const svg = renderBadgeSvg(productName, theme);

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
```

Nota: esta ruta NO usa `withErrorHandling` (no devuelve JSON, y no hay ningún camino de error que deba propagar un `ApiError` — un producto ausente cae al badge genérico en vez de lanzar).

- [ ] **Step 6: Test manual del endpoint**

```bash
npm run dev
curl -s "http://localhost:3000/api/badge.svg?product=focusflow&theme=dark" | head -5
curl -s "http://localhost:3000/api/badge.svg?product=no-existe&theme=light" | head -5
```

Expected: el primero contiene el nombre real del producto (si `focusflow` existe y está LIVE en el seed local); el segundo contiene "Denveler" en vez de fallar.

- [ ] **Step 7: Agregar la UI en la página de producto**

Localizar el componente client de la página de producto:

```bash
ls src/app/products/[slug]/
```

Leerlo completo. En la sección donde ya se muestra "Configuración de oferta" (visible solo si `product.upvotedByMe` no aplica — el check real es de ownership, el mismo que ya usa esa sección: `session?.user?.id === product.maker.id` o equivalente), agregar un bloque nuevo:

```tsx
const [badgeTheme, setBadgeTheme] = useState<"dark" | "light">("dark");
const badgeUrl = `https://denveler.com/api/badge.svg?product=${product.slug}&theme=${badgeTheme}`;
const embedSnippet = `<a href="https://denveler.com/products/${product.slug}"><img src="${badgeUrl}" alt="Lanzado en Denveler" /></a>`;
```

```tsx
{isOwner && (
  <div className="mt-6 rounded-lg border p-4">
    <h3 className="font-bold">Insertar badge en tu sitio</h3>
    <div className="mt-3 flex items-center gap-3">
      <img src={badgeUrl} alt="Lanzado en Denveler" width={220} height={54} />
      <div className="flex gap-2">
        <button type="button" onClick={() => setBadgeTheme("dark")} className={badgeTheme === "dark" ? "font-bold underline" : ""}>
          Oscuro
        </button>
        <button type="button" onClick={() => setBadgeTheme("light")} className={badgeTheme === "light" ? "font-bold underline" : ""}>
          Claro
        </button>
      </div>
    </div>
    <textarea
      readOnly
      value={embedSnippet}
      className="mt-3 w-full rounded border p-2 font-mono text-xs"
      rows={2}
      onClick={(e) => (e.target as HTMLTextAreaElement).select()}
    />
  </div>
)}
```

Ajustar `isOwner`/`product.slug`/imports (`useState`) al patrón exacto ya usado en ese archivo — leerlo primero, no asumir nombres de variables.

- [ ] **Step 8: Test manual de la UI**

```bash
npm run dev
```

Como maker dueño de un producto LIVE, entrar a su página de producto, confirmar que la sección aparece con el preview del badge, cambiar el tema y confirmar que el preview cambia, hacer clic en el textarea y confirmar que selecciona el snippet completo.

- [ ] **Step 9: Correr toda la suite**

```bash
npm test
```

Expected: todos PASS.

- [ ] **Step 10: Commit**

```bash
git add src/lib/badge-svg.ts src/lib/badge-svg.test.ts src/app/api/badge.svg \
  "src/app/products/[slug]"
git commit -m "feat(badge): badge SVG embebible con snippet para insertar en el sitio del maker"
```

---

### Task 9: Verificación E2E + doc de migración prod + PR

**Files:**
- Create: `docs/MIGRACION-PROD-USERNAMES.md`

**Interfaces:** ninguna nueva — este task consolida y verifica todo lo anterior.

- [ ] **Step 1: Suite completa + typecheck + build**

```bash
cd /Users/willy/Desktop/launchpad/launchpad
npm test
npm run typecheck
npm run build
```

Expected: los tres comandos terminan sin error.

- [ ] **Step 2: Escribir el doc de migración de producción**

Crear `docs/MIGRACION-PROD-USERNAMES.md`, siguiendo el formato de `docs/MIGRACION-PROD-ADMIN.md` (leerlo primero para copiar el formato exacto). Debe incluir:

1. El SQL a pegar en el editor de Supabase — obtenido de `cat prisma/migrations/<timestamp>_comunidad_visible/migration.sql` (Task 1), pegado completo en el doc.
2. La fila correspondiente en `_prisma_migrations` con el checksum real (obtenerlo del archivo de migración generado en Task 1, mismo patrón que la migración de admin).
3. Una sección aparte, claramente separada, titulada **"Paso adicional: backfill de usernames (no es SQL)"**, explicando que después de aplicar el SQL hay que correr `DATABASE_URL="<url de prod>" npx tsx prisma/backfill-usernames.ts` una sola vez desde una máquina con acceso a la `DATABASE_URL` de producción, y que es idempotente (correrlo dos veces no hace daño).
4. Instrucción de correr `npm run db:seed` — específicamente la parte del seed de insignias — contra producción también requiere el mismo cuidado: **NO correr `db:seed` completo contra producción** (crearía usuarios/productos de demo), sino aplicar solo el `INSERT`/`upsert` de las 4 filas de `badges` a mano vía SQL. Escribir el SQL equivalente explícito en el doc:
   ```sql
   INSERT INTO badges (id, slug, name, description, icon, created_at) VALUES
     (gen_random_uuid()::text, 'fundador', 'Fundador', 'Uno de los primeros 10 makers en lanzar en Denveler', '🏛️', now()),
     (gen_random_uuid()::text, 'primer-lanzamiento', 'Primer lanzamiento', 'Publicó su primer producto en Denveler', '🚀', now()),
     (gen_random_uuid()::text, 'top-10-mes', 'Top 10 del mes', 'Producto entre los 10 más votados del mes', '🏆', now()),
     (gen_random_uuid()::text, 'vendido', 'Vendido', 'Concretó la venta de su producto a través de Denveler', '🤝', now())
   ON CONFLICT (slug) DO NOTHING;
   ```
   (Ajustar el nombre real de la función de generación de cuid según lo que Prisma haya usado — verificar contra el `id` real de una fila creada localmente por el seed; si Prisma usa `cuid()` en vez de un UUID, generar los IDs con el mismo formato que ya usan las demás tablas, revisando una fila existente cualquiera con `SELECT id FROM categories LIMIT 1;` para confirmar el formato.)

- [ ] **Step 3: Verificación E2E manual completa**

Con el servidor de desarrollo corriendo y usando el seed local:

1. Crear un usuario nuevo → confirmar que recibe `username` automáticamente.
2. Publicar un producto → confirmar insignias automáticas si corresponde según el conteo real de la base local.
3. Comentar mencionando a otro usuario → confirmar notificación `MENTION`.
4. Entrar a `/admin` → pestaña de insignias → otorgar y revocar una insignia a mano.
5. Entrar al perfil de un maker con insignias → confirmar que se ven los chips.
6. Entrar a la página de un producto propio → confirmar la sección del badge embebible y copiar el snippet.
7. `GET /api/badge.svg?product=<slug>` directo en el navegador → confirmar que renderiza una imagen válida.

- [ ] **Step 4: Commit del doc**

```bash
git add docs/MIGRACION-PROD-USERNAMES.md
git commit -m "docs: ritual de migración de producción para comunidad-visible (schema + backfill + seed de insignias)"
```

- [ ] **Step 5: Push y crear el PR**

```bash
git push -u origin comunidad-visible
gh pr create --title "Comunidad Visible: @handles, menciones, insignias y badge embebible" --body "$(cat <<'EOF'
## Resumen
- @handle único por usuario (auto-generado, editable una vez), perfiles resolubles por id o username.
- Menciones @usuario en comentarios con notificación interna (tope 5/comentario, sin auto-mención).
- Insignias: catálogo de 4 (Fundador, Primer lanzamiento, Top 10 del mes, Vendido), las 3 primeras automáticas, otorgamiento/revocación manual desde /admin.
- Badge SVG embebible para que los makers linkeen de vuelta a Denveler desde su sitio.

## Antes de mergear
- [ ] Correr el SQL de `docs/MIGRACION-PROD-USERNAMES.md` en Supabase.
- [ ] Correr el backfill de usernames contra producción (ver el mismo doc).
- [ ] Insertar el catálogo de 4 insignias en producción (SQL en el mismo doc).

## Test plan
- [ ] `npm test`, `npm run typecheck`, `npm run build` — todos verdes.
- [ ] Verificación E2E manual (Task 9, Step 3) confirmada en local.
EOF
)"
```

Expected: PR creado. Reportar la URL.

**IMPORTANTE — no mergear sin confirmación explícita del usuario**, siguiendo el mismo patrón que las features anteriores (admin dashboard, señal de tracción): el SQL de producción se corre PRIMERO, el usuario confirma, y solo entonces se mergea.

---

## Self-review de este plan

**Cobertura del spec:** las 4 secciones del spec (`@handle`, menciones, insignias, badge embebible) están cubiertas por Tasks 1-3 (handles+menciones), 4-6 (insignias), 8 (badge). El testing pedido en el spec está cubierto: `extractMentions` (Task 3), generación/colisión de username (Task 1), triggers automáticos (Task 4), endpoint de otorgar/revocar (Task 6), `GET /api/badge.svg` (Task 8).

**Desviación consciente del spec, documentada:** el spec sugería un patrón de 3 pasos (nullable → backfill → `NOT NULL`) para `username`; este plan usa nullable + `@unique` permanente (Postgres permite múltiples `NULL` bajo `UNIQUE`), evitando una segunda migración innecesaria sin perder ninguna garantía funcional — la app siempre asigna un username, así que en la práctica nunca queda `NULL`.

**Riesgo identificado y no resuelto en el plan (a vigilar durante implementación):** no existe en el repo ningún archivo de test que mockee Prisma ni ningún test sobre `src/app/api/**` — todas las pruebas nuevas de este plan son de funciones puras extraídas a `src/lib/*.ts`, consistente con la convención real del proyecto. La integración de esas funciones puras dentro de los endpoints (Tasks 2, 3, 4, 6, 8) se verifica solo manualmente (`curl`/UI), no con tests automatizados — igual que el resto de los endpoints del proyecto hasta la fecha.
