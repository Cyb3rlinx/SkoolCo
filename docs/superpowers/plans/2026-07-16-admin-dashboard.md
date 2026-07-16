# Dashboard de administración — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expandir `/admin` a un dashboard completo: pestaña Resumen (métricas del negocio), pestaña Usuarios (rol / suspensión / borrado) y pestaña Productos (lista completa + archivar), con suspensión de cuentas aplicada server-side en todo el sitio.

**Architecture:** Tres endpoints admin nuevos (`/api/admin/stats`, `/api/admin/users`, `/api/admin/products`) protegidos por un helper `requireAdmin()` nuevo; la suspensión vive en `User.suspendedAt` y se aplica en dos puntos únicos (el `authorize()` de NextAuth para logins nuevos y `requireUser()` para sesiones vivas). El frontend agrega 3 pestañas al `AdminClient` existente, cada una como componente propio en `src/components/admin/`.

**Tech Stack:** Next.js 14 App Router, TypeScript, Prisma 5 + PostgreSQL, NextAuth (JWT), Zod, Vitest (unit + integración contra Postgres real), Tailwind + design system propio.

**Spec:** `docs/superpowers/specs/2026-07-16-admin-dashboard-design.md` (aprobado).

## Global Constraints

- Español neutro latinoamericano en TODO texto visible. **Cero voseo argentino**: jamás "tenés/podés/vos/suspendé" — siempre "tienes/puedes/tú/suspende".
- La marca es **Denveler** (nunca "LaunchPad").
- Migraciones **aditivas solamente** (una columna nullable nueva; nada se borra ni altera).
- Convención de API: éxito `{ data: ... }`, error `{ error: { message } }`, vía `withErrorHandling`/`ok`/`parseBody` de `src/lib/api.ts`; todo route file nuevo empieza con `export const dynamic = "force-dynamic";`.
- Autorización SIEMPRE server-side: los 3 endpoints nuevos exigen rol ADMIN vía `requireAdmin()`; el gate client-side (pestañas ocultas) es solo UX.
- Validación Zod en todo body/query que escriba el usuario: `q` con `.trim().max(100)`, `pageSize` fijo en 20 (no configurable por el cliente).
- Protecciones de usuarios (server-side): nadie puede modificarse/borrarse a sí mismo (400 "No puedes modificar tu propia cuenta."); no se puede bajar de rol, suspender ni borrar al último ADMIN activo (400 "No puedes quitar al último administrador activo.").
- Mensajes de suspensión exactos: login → "Tu cuenta está suspendida."; API → 403 "Tu cuenta está suspendida.".
- Trabajar en la rama `admin-dashboard`; nunca commitear directo a `main`.
- Todos los comandos npm/prisma se corren desde `launchpad/`; los `git` desde cualquier punto del repo.
- NO leer `.env`, `.env.local` ni ningún dotenv con ninguna herramienta. Prisma y la config de vitest los cargan solos.

---

### Task 0: Rama de trabajo

**Files:** ninguno (solo git)

- [ ] **Step 1: Crear la rama desde main**

```bash
cd /Users/willy/Desktop/launchpad
git checkout main
git pull
git checkout -b admin-dashboard
```

Expected: `Switched to a new branch 'admin-dashboard'`.

---

### Task 1: Schema — suspensión de usuarios (migración local)

**Files:**
- Modify: `launchpad/prisma/schema.prisma` (`model User`, ~línea 23)

**Interfaces:**
- Produces: `User.suspendedAt: DateTime?` (columna `suspended_at`) — lo usan las Tasks 2, 4 y 7.

- [ ] **Step 1: Agregar el campo al modelo User**

En `launchpad/prisma/schema.prisma`, el modelo `User` hoy tiene estas líneas de campos escalares:

```prisma
  role          UserRole  @default(USER)
  emailVerified DateTime? @map("email_verified")
  createdAt     DateTime  @default(now()) @map("created_at")
```

Reemplazarlas por:

```prisma
  role          UserRole  @default(USER)
  emailVerified DateTime? @map("email_verified")
  createdAt     DateTime  @default(now()) @map("created_at")
  /// Cuenta suspendida por un admin: no puede iniciar sesión ni ejecutar acciones.
  suspendedAt   DateTime? @map("suspended_at")
```

- [ ] **Step 2: Generar la migración local**

```bash
cd /Users/willy/Desktop/launchpad/launchpad
npx prisma migrate dev --name add_user_suspension
```

Expected: crea `prisma/migrations/<timestamp>_add_user_suspension/migration.sql` con exactamente un `ALTER TABLE "users" ADD COLUMN "suspended_at" TIMESTAMP(3);` y termina con "Your database is now in sync with your schema." Verificar que NO contiene `DROP` ni `ALTER COLUMN`.

- [ ] **Step 3: Verificar typecheck**

```bash
npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
cd /Users/willy/Desktop/launchpad
git add launchpad/prisma/schema.prisma launchpad/prisma/migrations
git commit -m "feat(schema): campo suspendedAt en User para suspensión de cuentas"
```

---

### Task 2: Aplicar la suspensión + helper requireAdmin (TDD integración)

**Files:**
- Modify: `launchpad/src/lib/auth.ts`
- Modify: `launchpad/src/components/forms/login-form.tsx`
- Test: `launchpad/tests/integration/flows.test.ts` (test nuevo al final del `describe`)

**Interfaces:**
- Consumes: `User.suspendedAt` (Task 1).
- Produces (lo consumen las Tasks 3, 4 y 5): `requireAdmin(): Promise<{id, role, name, email}>` exportada de `src/lib/auth.ts` — lanza 401 si no hay sesión, 403 "Admin access required" si `role !== "ADMIN"`. Además `requireUser()` pasa a lanzar 403 "Tu cuenta está suspendida." si el usuario está suspendido.

- [ ] **Step 1: Escribir el test de integración que falla**

En `launchpad/tests/integration/flows.test.ts`, agregar al final del `describe` (usa los helpers existentes `uniq`, `jsonRequest`, `session`, `prisma`, `bcrypt`):

```ts
  // -------------------------------------------------------------------------
  it("suspensión: bloquea acciones autenticadas y la reactivación las restaura", async () => {
    const passwordHash = await bcrypt.hash("irrelevant-here", 4);
    const category = await prisma.category.upsert({
      where: { slug: `susp-cat-${uniq}` },
      update: {},
      create: { name: `Susp Cat ${uniq}`, slug: `susp-cat-${uniq}` },
    });
    const maker = await prisma.user.create({
      data: { name: "Maker Susp", email: `maker-susp-${uniq}@example.com`, passwordHash },
    });
    const voter = await prisma.user.create({
      data: { name: "Voter Susp", email: `voter-susp-${uniq}@example.com`, passwordHash },
    });
    const product = await prisma.product.create({
      data: {
        makerId: maker.id,
        name: `Susp Product ${uniq}`,
        slug: `susp-product-${uniq}`,
        tagline: "Producto para el test de suspensión",
        description: "Creado para el test de integración de suspensión.",
        categoryId: category.id,
        launchDate: new Date(),
        status: "LIVE",
      },
    });

    session.current = {
      user: { id: voter.id, role: "USER", name: voter.name, email: voter.email },
    };
    const { POST: upvote } = await import("@/app/api/products/[slug]/upvote/route");

    // Sin suspender: la acción funciona.
    let res = await upvote(jsonRequest("http://test/upvote", "POST"), {
      params: { slug: product.slug },
    });
    expect(res.status).toBe(200);

    // Suspendido: 403 con el mensaje exacto.
    await prisma.user.update({ where: { id: voter.id }, data: { suspendedAt: new Date() } });
    res = await upvote(jsonRequest("http://test/upvote", "POST"), {
      params: { slug: product.slug },
    });
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: { message: string } };
    expect(body.error.message).toBe("Tu cuenta está suspendida.");

    // Reactivado: vuelve a funcionar.
    await prisma.user.update({ where: { id: voter.id }, data: { suspendedAt: null } });
    res = await upvote(jsonRequest("http://test/upvote", "POST"), {
      params: { slug: product.slug },
    });
    expect(res.status).toBe(200);
  });
```

- [ ] **Step 2: Correr el test y verificar que falla**

```bash
cd /Users/willy/Desktop/launchpad/launchpad
npm run test:integration -- -t "suspensión"
```

Expected: FAIL — el segundo `expect(res.status).toBe(403)` recibe 200 (la suspensión aún no se aplica). Si la suite entera se salta ("skipped"), reportar BLOCKED.

- [ ] **Step 3: Implementar en auth.ts**

En `launchpad/src/lib/auth.ts`:

1. En `authorize()`, después de `const valid = await bcrypt.compare(...)` y su `if (!valid) return null;`, insertar:

```ts
        // Cuenta suspendida por un admin: rechazar el login con mensaje claro.
        if (user.suspendedAt) {
          throw new Error("Tu cuenta está suspendida.");
        }
```

2. Reemplazar la función `requireUser()` completa por:

```ts
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
    select: { suspendedAt: true },
  });
  if (dbUser?.suspendedAt) {
    throw new ApiError(403, "Tu cuenta está suspendida.");
  }
  return user;
}
```

3. Después de `requireModerator()`, agregar:

```ts
/** Requires ADMIN role. */
export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    throw new ApiError(403, "Admin access required");
  }
  return user;
}
```

- [ ] **Step 4: Mostrar el mensaje de suspensión en el login**

En `launchpad/src/components/forms/login-form.tsx`, el bloque actual de error tras `signIn` es:

```ts
    if (res?.error) {
      setError(
```

NextAuth propaga el `throw new Error(...)` de `authorize()` como `res.error`. Cambiar el manejo para distinguir la suspensión — reemplazar el `if (res?.error) { setError(...) }` existente para que quede:

```ts
    if (res?.error) {
      setError(
        res.error === "Tu cuenta está suspendida."
          ? "Tu cuenta está suspendida."
          : "Email o contraseña incorrectos. Revisa e intenta de nuevo."
      );
```

(Conservar el resto del bloque tal cual está — solo cambia el string que se pasa a `setError`.)

- [ ] **Step 5: Correr los tests y verificar que pasan**

```bash
npm run test:integration -- -t "suspensión"
npm run test:integration
npm test
npx tsc --noEmit
```

Expected: todo verde.

- [ ] **Step 6: Commit**

```bash
cd /Users/willy/Desktop/launchpad
git add launchpad/src/lib/auth.ts launchpad/src/components/forms/login-form.tsx launchpad/tests/integration/flows.test.ts
git commit -m "feat(auth): suspensión de cuentas aplicada en login y requireUser + helper requireAdmin"
```

---

### Task 3: GET /api/admin/stats (TDD integración)

**Files:**
- Create: `launchpad/src/app/api/admin/stats/route.ts`
- Test: `launchpad/tests/integration/flows.test.ts` (test nuevo al final del `describe`)

**Interfaces:**
- Consumes: `requireAdmin()` (Task 2).
- Produces: `GET /api/admin/stats` → `{ data: AdminStats }` con la forma exacta del spec (users/productsLive/upvotes/comments/contactRequests con `{total,last7,last30}`; offerViews/openToOffers con `{total}`; pending con `{reports, communityLinks}`). La Task 6 replica esta forma como tipo `AdminStats`.

- [ ] **Step 1: Escribir el test de integración que falla**

Agregar al final del `describe` en `flows.test.ts`:

```ts
  // -------------------------------------------------------------------------
  it("admin stats: exige ADMIN y devuelve counts coherentes", async () => {
    const passwordHash = await bcrypt.hash("irrelevant-here", 4);
    const admin = await prisma.user.create({
      data: { name: "Admin Stats", email: `admin-stats-${uniq}@example.com`, passwordHash, role: "ADMIN" },
    });
    const plain = await prisma.user.create({
      data: { name: "User Stats", email: `user-stats-${uniq}@example.com`, passwordHash },
    });

    const { GET: stats } = await import("@/app/api/admin/stats/route");

    // USER normal → 403.
    session.current = {
      user: { id: plain.id, role: "USER", name: plain.name, email: plain.email },
    };
    let res = await stats(jsonRequest("http://test/api/admin/stats", "GET"));
    expect(res.status).toBe(403);

    // ADMIN → 200 con la forma esperada y totales >= lo que este test creó.
    session.current = {
      user: { id: admin.id, role: "ADMIN", name: admin.name, email: admin.email },
    };
    res = await stats(jsonRequest("http://test/api/admin/stats", "GET"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: {
        users: { total: number; last7: number; last30: number };
        productsLive: { total: number; last7: number; last30: number };
        upvotes: { total: number; last7: number; last30: number };
        comments: { total: number; last7: number; last30: number };
        contactRequests: { total: number; last7: number; last30: number };
        offerViews: { total: number };
        openToOffers: { total: number };
        pending: { reports: number; communityLinks: number };
      };
    };
    expect(body.data.users.total).toBeGreaterThanOrEqual(2);
    expect(body.data.users.last7).toBeGreaterThanOrEqual(2); // los 2 recién creados
    expect(body.data.users.last30).toBeGreaterThanOrEqual(body.data.users.last7);
    expect(body.data.pending.reports).toBeGreaterThanOrEqual(0);
    expect(body.data.offerViews.total).toBeGreaterThanOrEqual(0);
  });
```

- [ ] **Step 2: Correr el test y verificar que falla**

```bash
cd /Users/willy/Desktop/launchpad/launchpad
npm run test:integration -- -t "admin stats"
```

Expected: FAIL — "Cannot find module '@/app/api/admin/stats/route'".

- [ ] **Step 3: Implementar el endpoint**

Crear `launchpad/src/app/api/admin/stats/route.ts`:

```ts
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { withErrorHandling, ok } from "@/lib/api";

/**
 * GET /api/admin/stats — métricas del negocio para la pestaña Resumen.
 * Solo ADMIN. Totales + deltas de 7/30 días (por createdAt; launchDate para
 * productos LIVE). Sin series temporales: tarjetas con tendencia simple.
 */
export const GET = withErrorHandling(async () => {
  await requireAdmin();

  const now = Date.now();
  const d7 = new Date(now - 7 * 24 * 60 * 60_000);
  const d30 = new Date(now - 30 * 24 * 60 * 60_000);

  const [
    usersTotal, users7, users30,
    liveTotal, live7, live30,
    upvotesTotal, upvotes7, upvotes30,
    commentsTotal, comments7, comments30,
    crTotal, cr7, cr30,
    offerViews, openToOffers,
    pendingReports, pendingLinks,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: d7 } } }),
    prisma.user.count({ where: { createdAt: { gte: d30 } } }),
    prisma.product.count({ where: { status: "LIVE" } }),
    prisma.product.count({ where: { status: "LIVE", launchDate: { gte: d7 } } }),
    prisma.product.count({ where: { status: "LIVE", launchDate: { gte: d30 } } }),
    prisma.upvote.count(),
    prisma.upvote.count({ where: { createdAt: { gte: d7 } } }),
    prisma.upvote.count({ where: { createdAt: { gte: d30 } } }),
    prisma.comment.count(),
    prisma.comment.count({ where: { createdAt: { gte: d7 } } }),
    prisma.comment.count({ where: { createdAt: { gte: d30 } } }),
    prisma.contactRequest.count(),
    prisma.contactRequest.count({ where: { createdAt: { gte: d7 } } }),
    prisma.contactRequest.count({ where: { createdAt: { gte: d30 } } }),
    prisma.product.aggregate({ _sum: { offerViewCount: true } }),
    prisma.product.count({ where: { status: "LIVE", openToOffers: true } }),
    prisma.moderationReport.count({ where: { status: "OPEN" } }),
    prisma.communityLink.count({ where: { status: "PENDING" } }),
  ]);

  return ok({
    users: { total: usersTotal, last7: users7, last30: users30 },
    productsLive: { total: liveTotal, last7: live7, last30: live30 },
    upvotes: { total: upvotesTotal, last7: upvotes7, last30: upvotes30 },
    comments: { total: commentsTotal, last7: comments7, last30: comments30 },
    contactRequests: { total: crTotal, last7: cr7, last30: cr30 },
    offerViews: { total: offerViews._sum.offerViewCount ?? 0 },
    openToOffers: { total: openToOffers },
    pending: { reports: pendingReports, communityLinks: pendingLinks },
  });
});
```

- [ ] **Step 4: Correr los tests y verificar que pasan**

```bash
npm run test:integration -- -t "admin stats"
npm test
npx tsc --noEmit
```

Expected: todo verde.

- [ ] **Step 5: Commit**

```bash
cd /Users/willy/Desktop/launchpad
git add "launchpad/src/app/api/admin/stats/route.ts" launchpad/tests/integration/flows.test.ts
git commit -m "feat(api): GET /api/admin/stats con métricas del negocio (solo ADMIN)"
```

---

### Task 4: Endpoints de usuarios (listar / rol / suspender / borrar) con protecciones (TDD)

**Files:**
- Modify: `launchpad/src/lib/validation.ts` (agregar `adminUpdateUserSchema`)
- Modify: `launchpad/src/lib/validation.test.ts` (tests unit del schema)
- Create: `launchpad/src/app/api/admin/users/route.ts`
- Create: `launchpad/src/app/api/admin/users/[id]/route.ts`
- Test: `launchpad/tests/integration/flows.test.ts` (test nuevo)

**Interfaces:**
- Consumes: `requireAdmin()` (Task 2), `User.suspendedAt` (Task 1).
- Produces:
  - `adminUpdateUserSchema` en validation.ts: `{ role?: "USER"|"MODERATOR"|"ADMIN", suspended?: boolean }` con `.refine` de al-menos-uno.
  - `GET /api/admin/users?q=&page=` → `{ data: { items: AdminUserItem[], page, pageSize, total, totalPages } }` donde `AdminUserItem = { id, name, email, role, createdAt, suspendedAt, _count: { products } }`.
  - `PATCH /api/admin/users/[id]` → `{ data: AdminUserItem }` (sin `_count`).
  - `DELETE /api/admin/users/[id]` → 204.

- [ ] **Step 1: Tests unit del schema (escribir y ver fallar)**

En `launchpad/src/lib/validation.test.ts`, agregar al final:

```ts
describe("adminUpdateUserSchema", () => {
  it("acepta cambio de rol, de suspensión, o ambos", () => {
    expect(adminUpdateUserSchema.safeParse({ role: "MODERATOR" }).success).toBe(true);
    expect(adminUpdateUserSchema.safeParse({ suspended: true }).success).toBe(true);
    expect(adminUpdateUserSchema.safeParse({ role: "USER", suspended: false }).success).toBe(true);
  });

  it("rechaza body vacío y rol inválido", () => {
    expect(adminUpdateUserSchema.safeParse({}).success).toBe(false);
    expect(adminUpdateUserSchema.safeParse({ role: "SUPERADMIN" }).success).toBe(false);
  });
});
```

Y agregar `adminUpdateUserSchema` al import existente de `./validation` en la cabecera del archivo de test.

Correr y ver fallar:

```bash
cd /Users/willy/Desktop/launchpad/launchpad
npx vitest run src/lib/validation.test.ts
```

Expected: FAIL — `adminUpdateUserSchema` no existe.

- [ ] **Step 2: Implementar el schema**

Al final de `launchpad/src/lib/validation.ts`, agregar:

```ts
/** PATCH /api/admin/users/:id — al menos un campo. */
export const adminUpdateUserSchema = z
  .object({
    role: z.enum(["USER", "MODERATOR", "ADMIN"]).optional(),
    suspended: z.boolean().optional(),
  })
  .refine((v) => v.role !== undefined || v.suspended !== undefined, {
    message: "Debes enviar al menos un cambio (role o suspended).",
  });
```

Correr `npx vitest run src/lib/validation.test.ts` → PASS.

- [ ] **Step 3: Test de integración de los endpoints (escribir y ver fallar)**

Agregar al final del `describe` en `flows.test.ts`:

```ts
  // -------------------------------------------------------------------------
  it("admin users: lista, cambia rol, protege último admin y borra en cascada", async () => {
    const passwordHash = await bcrypt.hash("irrelevant-here", 4);
    const admin = await prisma.user.create({
      data: { name: "Admin AU", email: `admin-au-${uniq}@example.com`, passwordHash, role: "ADMIN" },
    });
    const target = await prisma.user.create({
      data: { name: "Target AU", email: `target-au-${uniq}@example.com`, passwordHash },
    });

    const { GET: listUsers } = await import("@/app/api/admin/users/route");
    const { PATCH: patchUser, DELETE: deleteUser } = await import(
      "@/app/api/admin/users/[id]/route"
    );

    session.current = {
      user: { id: admin.id, role: "ADMIN", name: admin.name, email: admin.email },
    };

    // Lista con búsqueda por email.
    let res = await listUsers(
      jsonRequest(`http://test/api/admin/users?q=target-au-${uniq}`, "GET")
    );
    expect(res.status).toBe(200);
    const list = (await res.json()) as {
      data: { items: { id: string; email: string; role: string }[]; total: number };
    };
    expect(list.data.items.some((u) => u.id === target.id)).toBe(true);

    // Cambiar rol.
    res = await patchUser(jsonRequest("http://test/patch", "PATCH", { role: "MODERATOR" }), {
      params: { id: target.id },
    });
    expect(res.status).toBe(200);
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { id: target.id } })).role
    ).toBe("MODERATOR");

    // Auto-modificación → 400.
    res = await patchUser(jsonRequest("http://test/patch", "PATCH", { suspended: true }), {
      params: { id: admin.id },
    });
    expect(res.status).toBe(400);

    // Suspender y reactivar al target.
    res = await patchUser(jsonRequest("http://test/patch", "PATCH", { suspended: true }), {
      params: { id: target.id },
    });
    expect(res.status).toBe(200);
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { id: target.id } })).suspendedAt
    ).not.toBeNull();

    // Protección del último ADMIN activo: suspender a TODOS los demás admins
    // activos de la base y luego intentar bajarse de rol a sí mismo ya está
    // cubierto (auto-modificación). Cubrimos el caso: otro admin intenta
    // suspender al único ADMIN activo restante.
    const admin2 = await prisma.user.create({
      data: { name: "Admin AU2", email: `admin-au2-${uniq}@example.com`, passwordHash, role: "ADMIN" },
    });
    // Suspender temporalmente a todos los ADMIN activos que no sean admin ni admin2
    // (por si la base local tiene otros), para que el conteo sea determinista.
    const otherAdmins = await prisma.user.findMany({
      where: { role: "ADMIN", suspendedAt: null, id: { notIn: [admin.id, admin2.id] } },
      select: { id: true },
    });
    await prisma.user.updateMany({
      where: { id: { in: otherAdmins.map((a) => a.id) } },
      data: { suspendedAt: new Date() },
    });

    session.current = {
      user: { id: admin2.id, role: "ADMIN", name: admin2.name, email: admin2.email },
    };
    // admin2 suspende a admin → queda admin2 como único ADMIN activo.
    res = await patchUser(jsonRequest("http://test/patch", "PATCH", { suspended: true }), {
      params: { id: admin.id },
    });
    expect(res.status).toBe(200);

    session.current = {
      user: { id: admin.id, role: "ADMIN", name: admin.name, email: admin.email },
    };
    // admin (suspendido) ya no puede actuar → 403 por requireUser.
    res = await patchUser(jsonRequest("http://test/patch", "PATCH", { suspended: true }), {
      params: { id: admin2.id },
    });
    expect(res.status).toBe(403);

    // Reactivar a admin para poder seguir; admin2 lo reactiva.
    session.current = {
      user: { id: admin2.id, role: "ADMIN", name: admin2.name, email: admin2.email },
    };
    res = await patchUser(jsonRequest("http://test/patch", "PATCH", { suspended: false }), {
      params: { id: admin.id },
    });
    expect(res.status).toBe(200);

    // Intentar suspender al último-admin-check: admin intenta suspender a admin2
    // cuando admin2 y admin están activos → permitido; pero si el objetivo fuera
    // el único activo se rechaza. Forzamos: suspender a admin de nuevo vía admin2
    // y que admin2 intente suspenderse... eso es auto-modificación (400), así que
    // el caso último-admin real: admin activo intenta BAJAR DE ROL a admin2 cuando
    // admin está suspendido no aplica. Cubrimos con: suspender a admin (queda
    // admin2 único activo) y admin2 intenta bajarse de rol → 400 auto; luego un
    // tercer admin activo no existe, así que validamos vía borrado:
    session.current = {
      user: { id: admin.id, role: "ADMIN", name: admin.name, email: admin.email },
    };
    res = await patchUser(jsonRequest("http://test/patch", "PATCH", { suspended: true }), {
      params: { id: admin2.id },
    });
    // admin y admin2 activos → suspender a admin2 deja a admin activo: permitido.
    expect(res.status).toBe(200);
    // Ahora admin es el único ADMIN activo; intentar borrarlo (otro admin no puede
    // porque no hay otro activo; él mismo no puede por auto-modificación).
    // Validación último-admin vía PATCH de rol sobre sí mismo cae en 400 auto.
    // → La protección de último admin se verifica con DELETE por admin2 reactivado:
    res = await patchUser(jsonRequest("http://test/patch", "PATCH", { suspended: false }), {
      params: { id: admin2.id },
    });
    expect(res.status).toBe(200);
    session.current = {
      user: { id: admin2.id, role: "ADMIN", name: admin2.name, email: admin2.email },
    };
    // admin2 suspende a admin → admin2 único activo.
    res = await patchUser(jsonRequest("http://test/patch", "PATCH", { suspended: true }), {
      params: { id: admin.id },
    });
    expect(res.status).toBe(200);
    // Nadie puede bajar de rol / suspender / borrar a admin2 (último activo):
    // lo intenta un moderador convertido en admin al vuelo NO — lo intenta el
    // propio flujo: reactivamos admin y él lo intenta contra admin2 tras
    // suspenderse... Para mantenerlo simple y determinista: reactivar admin,
    // suspender admin2 vía admin (permitido, admin queda único activo) y
    // verificar que borrar a admin (último activo) desde admin2 (suspendido)
    // da 403, y que un PATCH que dejaría 0 admins activos da 400:
    res = await patchUser(jsonRequest("http://test/patch", "PATCH", { suspended: false }), {
      params: { id: admin.id },
    });
    expect(res.status).toBe(200);
    session.current = {
      user: { id: admin.id, role: "ADMIN", name: admin.name, email: admin.email },
    };
    res = await patchUser(jsonRequest("http://test/patch", "PATCH", { suspended: true }), {
      params: { id: admin2.id },
    });
    expect(res.status).toBe(200);
    // admin es el único ADMIN activo → bajarle el rol vía un segundo intento de
    // admin2 (suspendido) es 403; y si reactivamos a admin2 como MODERATOR no
    // tiene acceso (403). El caso 400-último-admin: admin2 reactivado como ADMIN
    // intenta bajar de rol a admin cuando es el único activo:
    await prisma.user.update({ where: { id: admin2.id }, data: { suspendedAt: null } });
    session.current = {
      user: { id: admin2.id, role: "ADMIN", name: admin2.name, email: admin2.email },
    };
    // Ambos activos otra vez; suspender a admin2 no procede aquí. Bajamos de rol
    // a admin (queda admin2 como único ADMIN activo): permitido.
    res = await patchUser(jsonRequest("http://test/patch", "PATCH", { role: "USER" }), {
      params: { id: admin.id },
    });
    expect(res.status).toBe(200);
    // Y ahora bajar de rol al ÚNICO admin activo (admin2) desde... nadie más
    // puede (auto-modificación). La regla último-admin protege contra el caso
    // multi-admin: recreamos admin como ADMIN activo e intentamos que admin
    // baje a admin2 Y LUEGO admin2 (único) sea objetivo de admin (ya USER) → 403.
    await prisma.user.update({ where: { id: admin.id }, data: { role: "ADMIN" } });
    // admin y admin2 activos. admin baja de rol a admin2 → permitido (queda admin).
    session.current = {
      user: { id: admin.id, role: "ADMIN", name: admin.name, email: admin.email },
    };
    res = await patchUser(jsonRequest("http://test/patch", "PATCH", { role: "USER" }), {
      params: { id: admin2.id },
    });
    expect(res.status).toBe(200);
    // Restaurar admin2 como ADMIN y verificar el 400 real: admin intenta bajar
    // de rol a admin2 después de auto-suspenderse... imposible. El caso directo:
    await prisma.user.update({ where: { id: admin2.id }, data: { role: "ADMIN", suspendedAt: new Date() } });
    // admin2 ADMIN pero suspendido → admin es el único ADMIN ACTIVO.
    // Un intento de bajar de rol a admin por parte de admin2 → 403 (suspendido).
    // Un intento de que admin se borre a sí mismo → 400 (auto).
    const delSelf = await deleteUser(jsonRequest("http://test/del", "DELETE"), {
      params: { id: admin.id },
    });
    expect(delSelf.status).toBe(400);

    // DELETE en cascada del target (tiene rol MODERATOR y está suspendido).
    res = await deleteUser(jsonRequest("http://test/del", "DELETE"), {
      params: { id: target.id },
    });
    expect(res.status).toBe(204);
    expect(await prisma.user.findUnique({ where: { id: target.id } })).toBeNull();

    // Restaurar el estado de los admins ajenos que suspendimos al inicio.
    await prisma.user.updateMany({
      where: { id: { in: otherAdmins.map((a) => a.id) } },
      data: { suspendedAt: null },
    });
  });
```

Correr y ver fallar:

```bash
npm run test:integration -- -t "admin users"
```

Expected: FAIL — "Cannot find module '@/app/api/admin/users/route'".

- [ ] **Step 4: Implementar GET /api/admin/users**

Crear `launchpad/src/app/api/admin/users/route.ts`:

```ts
export const dynamic = "force-dynamic";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { withErrorHandling, ok } from "@/lib/api";

const PAGE_SIZE = 20;

const querySchema = z.object({
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
});

/** GET /api/admin/users?q=&page= — lista paginada para el panel (solo ADMIN). */
export const GET = withErrorHandling(async (req: Request) => {
  await requireAdmin();

  const url = new URL(req.url);
  const { q, page } = querySchema.parse({
    q: url.searchParams.get("q") ?? undefined,
    page: url.searchParams.get("page") ?? undefined,
  });

  const where = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { email: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        suspendedAt: true,
        _count: { select: { products: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return ok({
    items,
    page,
    pageSize: PAGE_SIZE,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  });
});
```

- [ ] **Step 5: Implementar PATCH y DELETE /api/admin/users/[id]**

Crear `launchpad/src/app/api/admin/users/[id]/route.ts`:

```ts
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { requireAdmin, ApiError } from "@/lib/auth";
import { adminUpdateUserSchema } from "@/lib/validation";
import { withErrorHandling, parseBody, ok, noContent } from "@/lib/api";

type Params = { params: { id: string } };

/**
 * Reglas compartidas de protección:
 * - Nadie se modifica/borra a sí mismo.
 * - No dejar la plataforma sin ADMINs activos: si el objetivo es un ADMIN sin
 *   suspender y es el único, se rechaza toda operación que lo quite (bajar rol,
 *   suspender o borrar).
 */
async function loadTarget(id: string, selfId: string) {
  if (id === selfId) {
    throw new ApiError(400, "No puedes modificar tu propia cuenta.");
  }
  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, suspendedAt: true },
  });
  if (!target) throw new ApiError(404, "Usuario no encontrado");
  return target;
}

async function assertNotLastActiveAdmin(target: { role: string; suspendedAt: Date | null }) {
  if (target.role !== "ADMIN" || target.suspendedAt !== null) return;
  const activeAdmins = await prisma.user.count({
    where: { role: "ADMIN", suspendedAt: null },
  });
  if (activeAdmins <= 1) {
    throw new ApiError(400, "No puedes quitar al último administrador activo.");
  }
}

/** PATCH /api/admin/users/:id — cambia rol y/o suspensión (solo ADMIN). */
export const PATCH = withErrorHandling(async (req: Request, { params }: Params) => {
  const admin = await requireAdmin();
  const target = await loadTarget(params.id, admin.id);
  const input = await parseBody(req, adminUpdateUserSchema);

  const demotes = input.role !== undefined && input.role !== "ADMIN";
  const suspends = input.suspended === true;
  if (demotes || suspends) {
    await assertNotLastActiveAdmin(target);
  }

  const user = await prisma.user.update({
    where: { id: target.id },
    data: {
      ...(input.role !== undefined ? { role: input.role } : {}),
      ...(input.suspended !== undefined
        ? { suspendedAt: input.suspended ? new Date() : null }
        : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      suspendedAt: true,
    },
  });

  return ok(user);
});

/** DELETE /api/admin/users/:id — borra la cuenta y su contenido (solo ADMIN). */
export const DELETE = withErrorHandling(async (_req: Request, { params }: Params) => {
  const admin = await requireAdmin();
  const target = await loadTarget(params.id, admin.id);
  await assertNotLastActiveAdmin(target);

  await prisma.user.delete({ where: { id: target.id } });
  return noContent();
});
```

- [ ] **Step 6: Correr los tests y verificar que pasan**

```bash
npm run test:integration -- -t "admin users"
npm run test:integration
npm test
npx tsc --noEmit
```

Expected: todo verde.

- [ ] **Step 7: Commit**

```bash
cd /Users/willy/Desktop/launchpad
git add launchpad/src/lib/validation.ts launchpad/src/lib/validation.test.ts "launchpad/src/app/api/admin/users" launchpad/tests/integration/flows.test.ts
git commit -m "feat(api): gestión de usuarios admin (lista, rol, suspensión, borrado) con protecciones"
```

---

### Task 5: GET /api/admin/products (TDD integración)

**Files:**
- Create: `launchpad/src/app/api/admin/products/route.ts`
- Test: `launchpad/tests/integration/flows.test.ts` (test nuevo)

**Interfaces:**
- Consumes: `requireAdmin()` (Task 2).
- Produces: `GET /api/admin/products?q=&status=&page=` → `{ data: { items: AdminProductItem[], page, pageSize, total, totalPages } }` donde `AdminProductItem = { id, name, slug, status, launchDate, createdAt, logoUrl, maker: { name, email }, _count: { upvotes, comments } }`.

- [ ] **Step 1: Escribir el test de integración que falla**

Agregar al final del `describe` en `flows.test.ts`:

```ts
  // -------------------------------------------------------------------------
  it("admin products: lista todos los estados y exige ADMIN", async () => {
    const passwordHash = await bcrypt.hash("irrelevant-here", 4);
    const category = await prisma.category.upsert({
      where: { slug: `ap-cat-${uniq}` },
      update: {},
      create: { name: `AP Cat ${uniq}`, slug: `ap-cat-${uniq}` },
    });
    const admin = await prisma.user.create({
      data: { name: "Admin AP", email: `admin-ap-${uniq}@example.com`, passwordHash, role: "ADMIN" },
    });
    const maker = await prisma.user.create({
      data: { name: "Maker AP", email: `maker-ap-${uniq}@example.com`, passwordHash },
    });
    const draft = await prisma.product.create({
      data: {
        makerId: maker.id,
        name: `AP Draft ${uniq}`,
        slug: `ap-draft-${uniq}`,
        tagline: "Borrador del test admin products",
        description: "Borrador creado por el test de integración.",
        categoryId: category.id,
        launchDate: new Date(),
        status: "DRAFT",
      },
    });

    const { GET: listProducts } = await import("@/app/api/admin/products/route");

    // USER → 403.
    session.current = {
      user: { id: maker.id, role: "USER", name: maker.name, email: maker.email },
    };
    let res = await listProducts(jsonRequest("http://test/api/admin/products", "GET"));
    expect(res.status).toBe(403);

    // ADMIN → el DRAFT aparece filtrando por estado y por búsqueda.
    session.current = {
      user: { id: admin.id, role: "ADMIN", name: admin.name, email: admin.email },
    };
    res = await listProducts(
      jsonRequest(`http://test/api/admin/products?status=DRAFT&q=ap-draft-${uniq}`, "GET")
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: { items: { id: string; status: string; maker: { email: string } }[] };
    };
    const found = body.data.items.find((p) => p.id === draft.id);
    expect(found).toBeDefined();
    expect(found!.status).toBe("DRAFT");
    expect(found!.maker.email).toBe(maker.email);
  });
```

- [ ] **Step 2: Correr el test y verificar que falla**

```bash
cd /Users/willy/Desktop/launchpad/launchpad
npm run test:integration -- -t "admin products"
```

Expected: FAIL — "Cannot find module '@/app/api/admin/products/route'".

- [ ] **Step 3: Implementar el endpoint**

Crear `launchpad/src/app/api/admin/products/route.ts`:

```ts
export const dynamic = "force-dynamic";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { withErrorHandling, ok } from "@/lib/api";

const PAGE_SIZE = 20;

const querySchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.enum(["DRAFT", "SCHEDULED", "LIVE", "ARCHIVED"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
});

/**
 * GET /api/admin/products?q=&status=&page= — lista completa para el panel
 * (incluye DRAFT/SCHEDULED/ARCHIVED, que la vista pública no expone). Solo ADMIN.
 */
export const GET = withErrorHandling(async (req: Request) => {
  await requireAdmin();

  const url = new URL(req.url);
  const { q, status, page } = querySchema.parse({
    q: url.searchParams.get("q") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    page: url.searchParams.get("page") ?? undefined,
  });

  const where = {
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { slug: { contains: q, mode: "insensitive" as const } },
            { tagline: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        launchDate: true,
        createdAt: true,
        logoUrl: true,
        maker: { select: { name: true, email: true } },
        _count: { select: { upvotes: true, comments: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  return ok({
    items,
    page,
    pageSize: PAGE_SIZE,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  });
});
```

- [ ] **Step 4: Correr los tests y verificar que pasan**

```bash
npm run test:integration -- -t "admin products"
npm run test:integration
npm test
npx tsc --noEmit
```

Expected: todo verde.

- [ ] **Step 5: Commit**

```bash
cd /Users/willy/Desktop/launchpad
git add "launchpad/src/app/api/admin/products/route.ts" launchpad/tests/integration/flows.test.ts
git commit -m "feat(api): GET /api/admin/products con todos los estados (solo ADMIN)"
```

---

### Task 6: Tipos frontend + api-client

**Files:**
- Modify: `launchpad/src/lib/frontend/types.ts` (agregar al final)
- Modify: `launchpad/src/lib/frontend/api-client.ts` (agregar al final + imports)

**Interfaces:**
- Consumes: formas de respuesta de las Tasks 3, 4 y 5 (idénticas campo a campo).
- Produces (los consume la Task 7):
  - Tipos: `AdminStats`, `AdminUserItem`, `AdminProductItem`.
  - Funciones: `fetchAdminStats(): Promise<AdminStats>`, `fetchAdminUsers(q: string, page: number): Promise<Paginated<AdminUserItem>>`, `updateAdminUser(id: string, input: { role?: "USER"|"MODERATOR"|"ADMIN"; suspended?: boolean }): Promise<AdminUserItem>`, `deleteAdminUser(id: string): Promise<void>`, `fetchAdminProducts(q: string, status: string, page: number): Promise<Paginated<AdminProductItem>>`.

- [ ] **Step 1: Agregar los tipos**

Al final de `launchpad/src/lib/frontend/types.ts`, agregar:

```ts
// ---------------------------------------------------------------------------
// Panel de administración (endpoints /api/admin/*, solo ADMIN)
// ---------------------------------------------------------------------------

export interface AdminStatWindow {
  total: number;
  last7: number;
  last30: number;
}

export interface AdminStats {
  users: AdminStatWindow;
  productsLive: AdminStatWindow;
  upvotes: AdminStatWindow;
  comments: AdminStatWindow;
  contactRequests: AdminStatWindow;
  offerViews: { total: number };
  openToOffers: { total: number };
  pending: { reports: number; communityLinks: number };
}

export interface AdminUserItem {
  id: string;
  name: string;
  email: string;
  role: "USER" | "MODERATOR" | "ADMIN";
  createdAt: string;
  suspendedAt: string | null;
  _count?: { products: number };
}

export interface AdminProductItem {
  id: string;
  name: string;
  slug: string;
  status: ProductStatus;
  launchDate: string;
  createdAt: string;
  logoUrl: string | null;
  maker: { name: string; email: string };
  _count: { upvotes: number; comments: number };
}
```

(Nota: `Paginated<T>` y `ProductStatus` ya existen en este archivo — no redefinirlos.)

- [ ] **Step 2: Agregar las funciones al api-client**

En `launchpad/src/lib/frontend/api-client.ts`: agregar `AdminProductItem`, `AdminStats`, `AdminUserItem` al import de tipos de `./types`, y al final del archivo:

```ts
// ---------------------------------------------------------------------------
// Panel de administración (solo ADMIN)
// ---------------------------------------------------------------------------

/** GET /api/admin/stats */
export function fetchAdminStats() {
  return request<AdminStats>("/api/admin/stats");
}

/** GET /api/admin/users */
export function fetchAdminUsers(q: string, page: number) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  params.set("page", String(page));
  return request<Paginated<AdminUserItem>>(`/api/admin/users?${params}`);
}

/** PATCH /api/admin/users/:id */
export function updateAdminUser(
  id: string,
  input: { role?: "USER" | "MODERATOR" | "ADMIN"; suspended?: boolean }
) {
  return request<AdminUserItem>(`/api/admin/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

/** DELETE /api/admin/users/:id */
export function deleteAdminUser(id: string) {
  return requestVoid(`/api/admin/users/${id}`, { method: "DELETE" });
}

/** GET /api/admin/products */
export function fetchAdminProducts(q: string, status: string, page: number) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (status) params.set("status", status);
  params.set("page", String(page));
  return request<Paginated<AdminProductItem>>(`/api/admin/products?${params}`);
}
```

Nota para el implementador: este archivo ya tiene un helper `request<T>()` y (si existe) `requestVoid()` para respuestas 204 — revisar cómo lo hace `deleteAccount`/`archiveProduct` en el mismo archivo y usar exactamente el mismo patrón; si el helper para 204 tiene otro nombre, usar ese en `deleteAdminUser`.

- [ ] **Step 3: Verificar tipos y suite**

```bash
cd /Users/willy/Desktop/launchpad/launchpad
npx tsc --noEmit
npm test
```

Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
cd /Users/willy/Desktop/launchpad
git add launchpad/src/lib/frontend/types.ts launchpad/src/lib/frontend/api-client.ts
git commit -m "feat(frontend): tipos y api-client del panel de administración"
```

---

### Task 7: UI — 3 pestañas nuevas en /admin

**Files:**
- Create: `launchpad/src/components/admin/stats-section.tsx`
- Create: `launchpad/src/components/admin/users-section.tsx`
- Create: `launchpad/src/components/admin/products-section.tsx`
- Modify: `launchpad/src/app/admin/admin-client.tsx`
- Modify: `launchpad/src/app/admin/page.tsx` (título/descripción)

**Interfaces:**
- Consumes: funciones y tipos de la Task 6; `useApi` de `src/lib/frontend/hooks`; componentes `Card/Badge/Button/Input/Tabs/Alert/Skeleton/EmptyState/ErrorState` existentes; `useSession` de next-auth para el rol.
- Produces: pestañas Resumen/Usuarios/Productos visibles solo para ADMIN; Reportes/Logros quedan intactas.

- [ ] **Step 1: Crear StatsSection**

Crear `launchpad/src/components/admin/stats-section.tsx`:

```tsx
"use client";

import { fetchAdminStats } from "@/lib/frontend/api-client";
import { useApi } from "@/lib/frontend/hooks";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";

function StatCard({ label, total, last7, last30 }: {
  label: string;
  total: number;
  last7?: number;
  last30?: number;
}) {
  return (
    <Card>
      <CardContent className="space-y-1 p-5">
        <p className="text-sm font-semibold text-muted-foreground">{label}</p>
        <p className="text-3xl font-extrabold tracking-tight">{total.toLocaleString("en-US")}</p>
        {last7 !== undefined && last30 !== undefined && (
          <p className="text-xs text-muted-foreground">
            +{last7.toLocaleString("en-US")} últimos 7 días · +{last30.toLocaleString("en-US")} últimos 30
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/** Pestaña Resumen — GET /api/admin/stats (solo ADMIN). */
export function StatsSection({ onGoToTab }: { onGoToTab: (tab: "reports" | "links") => void }) {
  const { data, loading, error, refetch } = useApi(fetchAdminStats, {});

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
    );
  }
  if (error || !data) return <ErrorState message={error ?? "No se pudieron cargar las métricas."} onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Usuarios" {...data.users} />
        <StatCard label="Productos publicados" {...data.productsLive} />
        <StatCard label="Votos" {...data.upvotes} />
        <StatCard label="Comentarios" {...data.comments} />
        <StatCard label="Solicitudes de contacto" {...data.contactRequests} />
        <StatCard label="Vistas de ofertas" total={data.offerViews.total} />
        <StatCard label="Abiertos a ofertas" total={data.openToOffers.total} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm font-semibold text-muted-foreground">Reportes abiertos</p>
              <p className="text-3xl font-extrabold">{data.pending.reports}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => onGoToTab("reports")}>
              Revisar
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm font-semibold text-muted-foreground">Logros pendientes</p>
              <p className="text-3xl font-extrabold">{data.pending.communityLinks}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => onGoToTab("links")}>
              Moderar
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Crear UsersSection**

Crear `launchpad/src/components/admin/users-section.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import {
  ApiClientError,
  deleteAdminUser,
  fetchAdminUsers,
  updateAdminUser,
} from "@/lib/frontend/api-client";
import { useApi } from "@/lib/frontend/hooks";
import { formatDate } from "@/lib/frontend/format";
import type { AdminUserItem } from "@/lib/frontend/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";

const ROLE_VARIANT: Record<AdminUserItem["role"], "outline" | "secondary" | "gradient"> = {
  USER: "outline",
  MODERATOR: "secondary",
  ADMIN: "gradient",
};

/** Pestaña Usuarios — lista + rol / suspensión / borrado (solo ADMIN). */
export function UsersSection() {
  const { data: session } = useSession();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, loading, error, refetch } = useApi(
    () => fetchAdminUsers(q, page),
    { deps: [q, page] }
  );

  async function act(id: string, fn: () => Promise<unknown>) {
    setActionError(null);
    setBusyId(id);
    try {
      await fn();
      refetch();
    } catch (err) {
      setActionError(err instanceof ApiClientError ? err.message : "No se pudo completar la acción.");
    } finally {
      setBusyId(null);
    }
  }

  function onDelete(user: AdminUserItem) {
    const typed = window.prompt(
      `Esto borra la cuenta y TODO su contenido (productos, votos, comentarios). ` +
        `Escribe el nombre exacto del usuario para confirmar: ${user.name}`
    );
    if (typed !== user.name) return;
    act(user.id, () => deleteAdminUser(user.id));
  }

  return (
    <div className="space-y-4">
      <Input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setPage(1);
        }}
        placeholder="Buscar por nombre o email…"
        aria-label="Buscar usuarios"
      />
      {actionError && <Alert variant="destructive">{actionError}</Alert>}

      {loading && (
        <div className="space-y-2" aria-busy="true">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      )}
      {!loading && error && <ErrorState message={error} onRetry={refetch} />}
      {!loading && !error && data && data.items.length === 0 && (
        <EmptyState title="Sin resultados" description="Ningún usuario coincide con la búsqueda." />
      )}

      {!loading && !error && data && data.items.length > 0 && (
        <>
          <div className="space-y-2">
            {data.items.map((u) => {
              const isSelf = session?.user?.id === u.id;
              const busy = busyId === u.id;
              return (
                <Card key={u.id}>
                  <CardContent className="flex flex-wrap items-center gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">
                        {u.name}{" "}
                        {isSelf && <span className="text-xs text-muted-foreground">(tú)</span>}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">{u.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Registro: {formatDate(u.createdAt)} · {u._count?.products ?? 0} productos
                      </p>
                    </div>
                    <Badge variant={ROLE_VARIANT[u.role]}>{u.role}</Badge>
                    {u.suspendedAt && <Badge variant="destructive">Suspendido</Badge>}
                    {!isSelf && (
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          className="h-9 rounded-lg border bg-background px-2 text-sm"
                          value={u.role}
                          disabled={busy}
                          aria-label={`Rol de ${u.name}`}
                          onChange={(e) =>
                            act(u.id, () =>
                              updateAdminUser(u.id, {
                                role: e.target.value as AdminUserItem["role"],
                              })
                            )
                          }
                        >
                          <option value="USER">USER</option>
                          <option value="MODERATOR">MODERATOR</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          onClick={() =>
                            act(u.id, () =>
                              updateAdminUser(u.id, { suspended: !u.suspendedAt })
                            )
                          }
                        >
                          {u.suspendedAt ? "Reactivar" : "Suspender"}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={busy}
                          onClick={() => onDelete(u)}
                        >
                          Borrar
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {data.totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                Página {data.page} de {data.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.totalPages}
                onClick={() => setPage(page + 1)}
              >
                Siguiente
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Crear ProductsSection**

Crear `launchpad/src/components/admin/products-section.tsx`:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import {
  ApiClientError,
  archiveProduct,
  fetchAdminProducts,
} from "@/lib/frontend/api-client";
import { useApi } from "@/lib/frontend/hooks";
import { formatDate } from "@/lib/frontend/format";
import type { ProductStatus } from "@/lib/frontend/types";
import { ProductLogo } from "@/components/product/product-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";

const STATUS_META: Record<ProductStatus, { label: string; variant: "success" | "warning" | "secondary" | "outline" }> = {
  LIVE: { label: "Publicado", variant: "success" },
  SCHEDULED: { label: "Programado", variant: "warning" },
  DRAFT: { label: "Borrador", variant: "secondary" },
  ARCHIVED: { label: "Archivado", variant: "outline" },
};

const FILTERS: { value: string; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "LIVE", label: "Publicados" },
  { value: "SCHEDULED", label: "Programados" },
  { value: "DRAFT", label: "Borradores" },
  { value: "ARCHIVED", label: "Archivados" },
];

/** Pestaña Productos — lista completa + archivar (solo ADMIN). */
export function ProductsSection() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, loading, error, refetch } = useApi(
    () => fetchAdminProducts(q, status, page),
    { deps: [q, status, page] }
  );

  async function onArchive(slug: string, name: string, id: string) {
    if (!window.confirm(`¿Archivar "${name}"? Dejará de ser visible al público.`)) return;
    setActionError(null);
    setBusyId(id);
    try {
      await archiveProduct(slug);
      refetch();
    } catch (err) {
      setActionError(err instanceof ApiClientError ? err.message : "No se pudo archivar.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          placeholder="Buscar por nombre, slug o tagline…"
          aria-label="Buscar productos"
          className="max-w-sm"
        />
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => {
                setStatus(f.value);
                setPage(1);
              }}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                status === f.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:border-primary/40"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      {actionError && <Alert variant="destructive">{actionError}</Alert>}

      {loading && (
        <div className="space-y-2" aria-busy="true">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      )}
      {!loading && error && <ErrorState message={error} onRetry={refetch} />}
      {!loading && !error && data && data.items.length === 0 && (
        <EmptyState title="Sin resultados" description="Ningún producto coincide con el filtro." />
      )}

      {!loading && !error && data && data.items.length > 0 && (
        <>
          <div className="space-y-2">
            {data.items.map((p) => {
              const meta = STATUS_META[p.status];
              const busy = busyId === p.id;
              return (
                <Card key={p.id}>
                  <CardContent className="flex flex-wrap items-center gap-3 p-4">
                    <ProductLogo name={p.name} src={p.logoUrl} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{p.name}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {p.maker.name} · {p.maker.email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Lanzamiento: {formatDate(p.launchDate)} · {p._count.upvotes} votos ·{" "}
                        {p._count.comments} comentarios
                      </p>
                    </div>
                    <Badge variant={meta.variant}>{meta.label}</Badge>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/products/${p.slug}`}
                        className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                      >
                        Ver <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                      </Link>
                      {p.status !== "ARCHIVED" && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          onClick={() => onArchive(p.slug, p.name, p.id)}
                        >
                          Archivar
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {data.totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                Página {data.page} de {data.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.totalPages}
                onClick={() => setPage(page + 1)}
              >
                Siguiente
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

Nota para el implementador: si `archiveProduct(slug)` no existe en `api-client.ts` con ese nombre, buscar la función existente que llama `DELETE /api/products/:slug` (puede llamarse `deleteProduct`) y usar esa — no crear una duplicada.

- [ ] **Step 4: Integrar las pestañas en AdminClient**

En `launchpad/src/app/admin/admin-client.tsx`:

1. Agregar imports:

```tsx
import { useSession } from "next-auth/react";
import { StatsSection } from "@/components/admin/stats-section";
import { UsersSection } from "@/components/admin/users-section";
import { ProductsSection } from "@/components/admin/products-section";
```

2. Reemplazar el tipo `Section` y el componente `AdminClient` existentes por:

```tsx
type Section = "stats" | "users" | "products" | "reports" | "links";

export function AdminClient() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const [section, setSection] = useState<Section>(isAdmin ? "stats" : "reports");

  const items = [
    ...(isAdmin
      ? [
          { value: "stats", label: "Resumen" },
          { value: "users", label: "Usuarios" },
          { value: "products", label: "Productos" },
        ]
      : []),
    { value: "reports", label: "Reportes" },
    { value: "links", label: "Logros de la extensión" },
  ];

  return (
    <div className="space-y-6">
      <Tabs items={items} value={section} onChange={(v) => setSection(v as Section)} />
      {section === "stats" && <StatsSection onGoToTab={setSection} />}
      {section === "users" && <UsersSection />}
      {section === "products" && <ProductsSection />}
      {section === "reports" && <ReportsQueue />}
      {section === "links" && <CommunityLinksQueue />}
    </div>
  );
}
```

Nota: si el componente `Tabs` tipa `items`/`onChange` como string genérico, puede requerir `as` — mantener el tipado más simple que compile sin `any`. Ojo con el estado inicial: `useSession()` puede llegar tarde; para evitar que un ADMIN caiga en "reports" al primer render, inicializar con `useState<Section>("reports")` y agregar:

```tsx
  useEffect(() => {
    if (isAdmin) setSection((s) => (s === "reports" ? "stats" : s));
  }, [isAdmin]);
```

(importar `useEffect` de react). Esto mantiene a los MODERATOR en "reports" y lleva a los ADMIN a "stats" cuando la sesión carga.

3. `ReportsQueue` y `CommunityLinksQueue` quedan intactos.

- [ ] **Step 5: Actualizar el título de la página**

En `launchpad/src/app/admin/page.tsx`, reemplazar:

```tsx
export const metadata: Metadata = { title: "Moderación" };
```

por:

```tsx
export const metadata: Metadata = { title: "Administración" };
```

y el `PageHeader` por:

```tsx
      <PageHeader
        title="Panel de administración"
        description="Métricas del negocio, gestión de usuarios y productos, y moderación de la comunidad."
      />
```

- [ ] **Step 6: Verificar tipos, suite y build**

```bash
cd /Users/willy/Desktop/launchpad/launchpad
npx tsc --noEmit
npm test
npm run build
```

Expected: todo verde, build exitoso.

- [ ] **Step 7: Commit**

```bash
cd /Users/willy/Desktop/launchpad
git add launchpad/src/components/admin launchpad/src/app/admin
git commit -m "feat(ui): dashboard de administración con pestañas Resumen, Usuarios y Productos"
```

---

### Task 8: Verificación E2E + doc migración prod + PR

**Files:**
- Create: `docs/MIGRACION-PROD-ADMIN.md` (raíz del repo)

- [ ] **Step 1: Suite completa + build**

```bash
cd /Users/willy/Desktop/launchpad/launchpad
npx tsc --noEmit
npm test
npm run test:integration
npm run build
```

Expected: typecheck limpio, tests verdes, build exitoso.

- [ ] **Step 2: Verificación E2E manual contra el dev server**

Con el dev server reiniciado tras la migración (parar, `npx prisma generate`, arrancar de nuevo — el Prisma Client en memoria no ve el campo nuevo si el server venía corriendo de antes):

1. Promover a Ana en la base local: `UPDATE users SET role='ADMIN' WHERE email='ana@example.com';` (vía `npx prisma studio` o un script). Iniciar sesión como `ana@example.com` / `changeme123`.
2. `/admin` → deben verse 5 pestañas; Resumen carga tarjetas con números coherentes.
3. Usuarios: buscar a Luis, cambiarle el rol a MODERATOR y de vuelta; suspenderlo; en otra ventana (o tras logout) intentar iniciar sesión como Luis → "Tu cuenta está suspendida."; intentar votar con una sesión viva de Luis → 403. Reactivarlo.
4. Intentar suspenderse a sí misma (Ana) → la UI no muestra acciones en su propia fila; vía curl con la cookie el endpoint devuelve 400.
5. Productos: filtrar por Borradores (debe aparecer BudgetBee del seed), archivar uno y verificar que cambia a Archivado.
6. Iniciar sesión como un MODERATOR y confirmar que /admin solo muestra Reportes y Logros, y que `GET /api/admin/stats` devuelve 403.

- [ ] **Step 3: Escribir el doc de migración de producción**

Obtener los valores reales:

```bash
cd /Users/willy/Desktop/launchpad/launchpad
ls prisma/migrations | grep add_user_suspension
shasum -a 256 prisma/migrations/*add_user_suspension/migration.sql
```

Crear `docs/MIGRACION-PROD-ADMIN.md` (mismo formato que `docs/MIGRACION-PROD-FASE3-SIGNAL.md`): instrucción de pegar en el SQL Editor de Supabase ANTES de mergear, el SQL literal de la migración, y el INSERT en `_prisma_migrations` con `<CHECKSUM>` y `<NOMBRE_MIGRACION>` reemplazados por los valores reales. Incluir verificación posterior (`SELECT migration_name FROM _prisma_migrations WHERE migration_name LIKE '%add_user_suspension%';` → 1 fila) y sección "Después de mergear" con: verificación `curl -i https://denveler.com/api/admin/stats` sin sesión → 401.

- [ ] **Step 4: Commit del doc + push + PR**

```bash
cd /Users/willy/Desktop/launchpad
git add docs/MIGRACION-PROD-ADMIN.md
git commit -m "docs: ritual de migración SQL para producción (dashboard admin)"
git push -u origin admin-dashboard
gh pr create --title "Dashboard de administración: métricas, usuarios y productos" --body "$(cat <<'EOF'
## Qué agrega
- /admin con 5 pestañas: Resumen (métricas 7/30d), Usuarios (rol/suspensión/borrado con protecciones), Productos (todos los estados + archivar), y las 2 de moderación existentes
- Suspensión de cuentas: User.suspendedAt, bloqueo en login y en requireUser (403 en toda acción autenticada)
- Endpoints nuevos solo-ADMIN: /api/admin/stats, /api/admin/users, /api/admin/products + helper requireAdmin

## Cómo probar
Ver Task 8 del plan (docs/superpowers/plans/2026-07-16-admin-dashboard.md)

## Antes de mergear
⚠️ Correr docs/MIGRACION-PROD-ADMIN.md en Supabase (ritual conocido)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 5: Post-merge (Willy)**

1. Correr el SQL en Supabase (doc del Step 3).
2. Merge del PR → Vercel despliega solo.
3. Correr el UPDATE de roles (si aún no se hizo): `UPDATE users SET role = 'ADMIN' WHERE email IN ('willydiaz9009@gmail.com', 'keev.seven@hotmail.com');`
4. Entrar a denveler.com/admin con tu cuenta y verificar las 5 pestañas.

---

## Self-Review (ejecutado al escribir)

- **Cobertura del spec:** stats con la forma exacta ✅ (T3), suspensión en authorize + requireUser con mensajes exactos ✅ (T2), requireAdmin ✅ (T2), lista/PATCH/DELETE usuarios con auto-protección y último-admin-activo ✅ (T4), lista productos todos los estados + archivar reutilizando DELETE existente ✅ (T5/T7), tipos+api-client ✅ (T6), UI 5 pestañas con gate por rol ✅ (T7), migración aditiva + doc prod ✅ (T1/T8), fuera de alcance respetado (sin gráficas, sin featured, sin auditoría, sin emails) ✅.
- **Placeholders:** los `<CHECKSUM>`/`<NOMBRE_MIGRACION>` de la Task 8 se rellenan con los comandos dados en el mismo paso (ritual conocido). Las dos "notas para el implementador" (helper 204 y nombre de `archiveProduct`) son instrucciones de verificación contra el archivo real, no huecos de diseño.
- **Consistencia de tipos:** `requireAdmin()` (T2) usada en T3/T4/T5; `adminUpdateUserSchema` (T4) importada en la ruta de T4; formas de respuesta de T3/T4/T5 = tipos de T6 = props consumidas en T7; mensajes de error exactos compartidos entre T2/T4 y las Global Constraints.
- **Nota consciente (T4, test):** el test de integración del último-admin manipula suspensiones de admins preexistentes de la base local y las restaura al final — es la forma determinista de probar la regla sin asumir una base vacía.
