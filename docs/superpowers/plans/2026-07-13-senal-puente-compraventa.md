# Señal del puente de compraventa — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dos features chicas que generan señal medible del puente de compraventa: un contador de vistas de la oferta (visible solo para el maker) y un email único de invitación a activar "Abierto a ofertas" para makers con 10+ votos, disparado por un cron diario de Vercel.

**Architecture:** El contador es un entero en `Product` que se incrementa server-side dentro del `GET /api/products/:slug` existente cuando un no-maker ve un producto con `openToOffers=true`; se muestra en el panel `OfferSettings` que ya es maker-only. El email de tracción usa un campo `offerNudgeSentAt` para garantizar envío único, una función pura testeable para elegir candidatos, y un endpoint `GET /api/cron/offer-nudge` protegido por `CRON_SECRET` que Vercel Cron llama una vez al día.

**Tech Stack:** Next.js 14 App Router, TypeScript, Prisma 5 + PostgreSQL, Vitest (unit + integración contra Postgres real), Resend vía el helper `sendEmail` existente, Vercel Cron.

**Spec:** `docs/superpowers/specs/2026-07-13-senal-puente-compraventa-design.md` (aprobado).

## Global Constraints

- Español neutro latinoamericano en TODO texto visible (UI, emails, docs). **Cero voseo argentino**: jamás "tenés/podés/vos/activá/fijate" — siempre "tienes/puedes/tú/activa/fíjate".
- La marca es **Denveler** (nunca "LaunchPad").
- Sin precios, negociación, escrow ni mensajería interna — fuera de alcance, igual que en la Fase 2.
- Migraciones **aditivas solamente**: columnas nuevas con default/nullable; nada se borra ni se altera.
- Convención de API: éxito `{ data: ... }`, error `{ error: { message } }`, vía los helpers `withErrorHandling`/`ok` de `src/lib/api.ts`; todo route file nuevo empieza con `export const dynamic = "force-dynamic";`.
- Emails HTML: TODA interpolación de strings controlados por usuarios pasa por el helper `esc()` local de `src/lib/offer-emails.ts`. Un fallo de email jamás tumba la respuesta principal (try/catch propio + `console.error`).
- Umbral de tracción: `OFFER_NUDGE_UPVOTE_THRESHOLD = 10` (constante con nombre, definida una sola vez en `src/lib/offer-nudge.ts`).
- El email de tracción se envía **una sola vez por producto** en toda su vida (`offerNudgeSentAt` como candado).
- OpenAPI (`public/openapi.yaml`) queda **fuera de alcance** de este plan: el cron es un endpoint interno y el spec aprobado no incluye documentar el campo nuevo.
- Trabajar en la rama `senal-puente-compraventa`; nunca commitear directo a `main`.
- Todos los comandos se corren desde `launchpad/` (el subdirectorio de la app), salvo los `git` que funcionan desde cualquier punto del repo.
- NO leer `.env`, `.env.local` ni ningún archivo dotenv con ninguna herramienta. Prisma y la config de vitest los cargan solos en runtime; no hay razón para inspeccionarlos.

---

### Task 0: Rama de trabajo

**Files:** ninguno (solo git)

- [ ] **Step 1: Crear la rama desde main**

```bash
cd /Users/willy/Desktop/launchpad
git checkout main
git pull
git checkout -b senal-puente-compraventa
```

Expected: `Switched to a new branch 'senal-puente-compraventa'`.

---

### Task 1: Schema Prisma + migración local

**Files:**
- Modify: `launchpad/prisma/schema.prisma` (bloque de Fase 2 dentro de `model Product`, ~línea 100)

**Interfaces:**
- Produces: campos `Product.offerViewCount: Int` (default 0, columna `offer_view_count`) y `Product.offerNudgeSentAt: DateTime?` (columna `offer_nudge_sent_at`) — los usan las Tasks 2 y 5.

- [ ] **Step 1: Agregar los dos campos al modelo Product**

En `launchpad/prisma/schema.prisma`, el bloque de Fase 2 dentro de `model Product` dice hoy:

```prisma
  // --- Puente de compraventa (Fase 2): métricas declaradas + interés ---
  openToOffers     Boolean @default(false) @map("open_to_offers")
  declaredMrrUsd   Int?    @map("declared_mrr_usd") // USD/mes, declarado por el maker, NO verificado
  monetizationNote String? @map("monetization_note")
```

Reemplazarlo por:

```prisma
  // --- Puente de compraventa (Fase 2): métricas declaradas + interés ---
  openToOffers     Boolean @default(false) @map("open_to_offers")
  declaredMrrUsd   Int?    @map("declared_mrr_usd") // USD/mes, declarado por el maker, NO verificado
  monetizationNote String? @map("monetization_note")
  // Señal del puente: vistas de la oferta (sin deduplicar) y candado del email de tracción.
  offerViewCount   Int       @default(0) @map("offer_view_count")
  offerNudgeSentAt DateTime? @map("offer_nudge_sent_at")
```

- [ ] **Step 2: Generar la migración local**

```bash
cd /Users/willy/Desktop/launchpad/launchpad
npx prisma migrate dev --name add_offer_signal
```

Expected: crea `prisma/migrations/<timestamp>_add_offer_signal/migration.sql` con exactamente dos `ADD COLUMN` sobre `"products"` (`offer_view_count` INTEGER NOT NULL DEFAULT 0 y `offer_nudge_sent_at` TIMESTAMP(3)) y termina con "Your database is now in sync with your schema." Verificar que el SQL NO contiene `DROP` ni `ALTER COLUMN`.

- [ ] **Step 3: Verificar typecheck**

```bash
npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
cd /Users/willy/Desktop/launchpad
git add launchpad/prisma/schema.prisma launchpad/prisma/migrations
git commit -m "feat(schema): contador de vistas de oferta + candado del email de tracción"
```

---

### Task 2: Contador de vistas en el GET del producto (backend + test de integración)

**Files:**
- Modify: `launchpad/vitest.integration.config.ts`
- Modify: `launchpad/src/app/api/products/[slug]/route.ts` (el handler `GET` y `detailSelect`)
- Test: `launchpad/tests/integration/flows.test.ts` (test nuevo al final del `describe`)

**Interfaces:**
- Consumes: `Product.offerViewCount` (Task 1); `findProduct` de `src/lib/products.ts` (devuelve `{ id, slug, makerId, status }`); `getSessionUser` de `src/lib/auth.ts`.
- Produces: el `GET /api/products/:slug` devuelve `offerViewCount: number` dentro de `data` (lo consume la Task 3) e incrementa el contador cuando corresponde.

- [ ] **Step 1: Hacer que la suite de integración cargue el .env sola**

Hoy `tests/integration/flows.test.ts` se salta entera si `DATABASE_URL` no está exportada en el shell. Next.js ya trae `@next/env` (el mismo cargador de `.env` que usa la app), así que la config puede cargarlo automáticamente. Reemplazar el contenido completo de `launchpad/vitest.integration.config.ts` por:

```ts
import { defineConfig } from "vitest/config";
import { resolve } from "node:path";
import { loadEnvConfig } from "@next/env";

// Carga .env/.env.local igual que Next, para que DATABASE_URL esté disponible
// sin exportarla a mano. Sin .env, la suite se salta sola (comportamiento actual).
loadEnvConfig(__dirname);

/**
 * Integration tests — they hit a REAL Postgres (DATABASE_URL required) and
 * exercise the route handlers end to end. Run with: npm run test:integration
 * (after `prisma migrate deploy` against the test database).
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    // DB tests share state; run serially to stay deterministic.
    fileParallelism: false,
    testTimeout: 30_000,
  },
  resolve: { alias: { "@": resolve(__dirname, "src") } },
});
```

- [ ] **Step 2: Escribir el test de integración que falla**

En `launchpad/tests/integration/flows.test.ts`, agregar este test al final del `describe` (antes del cierre `});` final del archivo). Usa los mismos helpers ya definidos en el archivo (`uniq`, `jsonRequest`, `session`, `prisma`, `bcrypt`):

```ts
  // -------------------------------------------------------------------------
  it("offer views: suma para no-maker y anónimo, nunca para el maker", async () => {
    const passwordHash = await bcrypt.hash("irrelevant-here", 4);
    const category = await prisma.category.upsert({
      where: { slug: `ov-cat-${uniq}` },
      update: {},
      create: { name: `OV Cat ${uniq}`, slug: `ov-cat-${uniq}` },
    });
    const maker = await prisma.user.create({
      data: { name: "Maker OV", email: `maker-ov-${uniq}@example.com`, passwordHash },
    });
    const viewer = await prisma.user.create({
      data: { name: "Viewer OV", email: `viewer-ov-${uniq}@example.com`, passwordHash },
    });
    const product = await prisma.product.create({
      data: {
        makerId: maker.id,
        name: `OV Product ${uniq}`,
        slug: `ov-product-${uniq}`,
        tagline: "Producto para el test de vistas",
        description: "Creado para el test de integración del contador de vistas.",
        categoryId: category.id,
        launchDate: new Date(),
        status: "LIVE",
        openToOffers: true,
      },
    });

    const { GET: getProduct } = await import("@/app/api/products/[slug]/route");
    const count = async () =>
      (
        await prisma.product.findUniqueOrThrow({
          where: { id: product.id },
          select: { offerViewCount: true },
        })
      ).offerViewCount;

    // Un usuario logueado que no es el maker suma una vista.
    session.current = {
      user: { id: viewer.id, role: "USER", name: viewer.name, email: viewer.email },
    };
    let res = await getProduct(jsonRequest("http://test/p", "GET"), {
      params: { slug: product.slug },
    });
    expect(res.status).toBe(200);
    expect(await count()).toBe(1);
    // La respuesta expone el campo (valor previo al incremento, da igual para la señal).
    const body = (await res.json()) as { data: { offerViewCount: number } };
    expect(typeof body.data.offerViewCount).toBe("number");

    // El maker viendo su propio producto NO suma.
    session.current = {
      user: { id: maker.id, role: "USER", name: maker.name, email: maker.email },
    };
    res = await getProduct(jsonRequest("http://test/p", "GET"), {
      params: { slug: product.slug },
    });
    expect(res.status).toBe(200);
    expect(await count()).toBe(1);

    // Un visitante anónimo suma.
    session.current = null;
    res = await getProduct(jsonRequest("http://test/p", "GET"), {
      params: { slug: product.slug },
    });
    expect(res.status).toBe(200);
    expect(await count()).toBe(2);

    // Con la oferta cerrada, nadie suma.
    await prisma.product.update({
      where: { id: product.id },
      data: { openToOffers: false },
    });
    res = await getProduct(jsonRequest("http://test/p", "GET"), {
      params: { slug: product.slug },
    });
    expect(res.status).toBe(200);
    expect(await count()).toBe(2);
  });
```

- [ ] **Step 3: Correr el test y verificar que falla**

```bash
cd /Users/willy/Desktop/launchpad/launchpad
npm run test:integration -- -t "offer views"
```

Expected: FAIL — `offerViewCount` queda en 0 porque el GET todavía no incrementa (el primer `expect(await count()).toBe(1)` falla). Si en cambio la suite entera se SALTA ("skipped"), significa que `.env` no tiene `DATABASE_URL` — reportar BLOCKED en vez de seguir a ciegas.

- [ ] **Step 4: Implementar el incremento en el GET**

En `launchpad/src/app/api/products/[slug]/route.ts`:

1. Agregar `offerViewCount: true,` a `detailSelect`, justo después de `monetizationNote: true,`:

```ts
const detailSelect = {
  ...productListSelect,
  description: true,
  updatedAt: true,
  openToOffers: true,
  declaredMrrUsd: true,
  monetizationNote: true,
  offerViewCount: true,
  images: {
    select: { id: true, url: true, sort: true },
    orderBy: { sort: "asc" as const },
  },
} as const;
```

2. En el handler `GET`, después del bloque que calcula `upvotedByMe` y antes del `return ok(...)`, insertar:

```ts
  // Señal del puente: una vista de la oferta por cada carga de un no-maker.
  // Efecto secundario: si falla, no tumba la respuesta.
  if (product.openToOffers && user?.id !== base.makerId) {
    try {
      await prisma.product.update({
        where: { id: base.id },
        data: { offerViewCount: { increment: 1 } },
      });
    } catch (err) {
      console.error("[offer-views] no se pudo incrementar:", err);
    }
  }
```

El `GET` completo queda:

```ts
export const GET = withErrorHandling(async (_req: Request, { params }: Params) => {
  const base = await findProduct(params.slug);
  const user = await getSessionUser();
  const isStaff = user && (user.role === "ADMIN" || user.role === "MODERATOR");

  if (base.status !== "LIVE" && !isStaff && user?.id !== base.makerId) {
    throw new ApiError(404, "Product not found");
  }

  const product = await prisma.product.findUniqueOrThrow({
    where: { id: base.id },
    select: detailSelect,
  });

  const upvotedByMe = user
    ? Boolean(
        await prisma.upvote.findUnique({
          where: { userId_productId: { userId: user.id, productId: base.id } },
          select: { id: true },
        })
      )
    : false;

  // Señal del puente: una vista de la oferta por cada carga de un no-maker.
  // Efecto secundario: si falla, no tumba la respuesta.
  if (product.openToOffers && user?.id !== base.makerId) {
    try {
      await prisma.product.update({
        where: { id: base.id },
        data: { offerViewCount: { increment: 1 } },
      });
    } catch (err) {
      console.error("[offer-views] no se pudo incrementar:", err);
    }
  }

  return ok({ ...product, upvotedByMe });
});
```

- [ ] **Step 5: Correr el test y verificar que pasa**

```bash
npm run test:integration -- -t "offer views"
```

Expected: PASS (1 passed). Correr también la suite completa de integración y la unitaria para descartar regresiones:

```bash
npm run test:integration
npm test
npx tsc --noEmit
```

Expected: todo verde, sin errores de tipos.

- [ ] **Step 6: Commit**

```bash
cd /Users/willy/Desktop/launchpad
git add launchpad/vitest.integration.config.ts "launchpad/src/app/api/products/[slug]/route.ts" launchpad/tests/integration/flows.test.ts
git commit -m "feat(api): contador de vistas de la oferta en el GET del producto"
```

---

### Task 3: UI — el maker ve sus vistas en OfferSettings

**Files:**
- Modify: `launchpad/src/lib/frontend/types.ts` (interface `ProductDetail`, ~línea 97)
- Modify: `launchpad/src/components/product/offer-settings.tsx`
- Modify: `launchpad/src/app/products/[slug]/product-detail-client.tsx` (el uso de `<OfferSettings ...>`, ~línea 179)

**Interfaces:**
- Consumes: `data.offerViewCount: number` del `GET /api/products/:slug` (Task 2).
- Produces: nada que consuman tasks posteriores.

- [ ] **Step 1: Agregar el campo al tipo ProductDetail**

En `launchpad/src/lib/frontend/types.ts`, dentro de `interface ProductDetail`, después de `monetizationNote?: string | null;` agregar:

```ts
  /** Vistas de la oferta (sin deduplicar); solo tiene sentido para el maker. */
  offerViewCount?: number;
```

- [ ] **Step 2: Mostrar el contador en OfferSettings**

En `launchpad/src/components/product/offer-settings.tsx`:

1. Agregar la prop. La firma del componente pasa de:

```ts
export function OfferSettings({
  slug,
  makerId,
  openToOffers,
  declaredMrrUsd,
  monetizationNote,
  onUpdated,
}: {
  slug: string;
  makerId: string;
  openToOffers?: boolean;
  declaredMrrUsd?: number | null;
  monetizationNote?: string | null;
  onUpdated: () => void;
}) {
```

a:

```ts
export function OfferSettings({
  slug,
  makerId,
  openToOffers,
  declaredMrrUsd,
  monetizationNote,
  offerViewCount,
  onUpdated,
}: {
  slug: string;
  makerId: string;
  openToOffers?: boolean;
  declaredMrrUsd?: number | null;
  monetizationNote?: string | null;
  offerViewCount?: number;
  onUpdated: () => void;
}) {
```

2. En la vista de solo-lectura (la rama `!editing`), el bloque actual es:

```tsx
          <>
            <p className="text-xs text-muted-foreground">
              {openToOffers
                ? `Tu producto está abierto a ofertas${
                    declaredMrrUsd != null
                      ? ` · MRR declarado $${declaredMrrUsd.toLocaleString("en-US")}/mes`
                      : ""
                  }.`
                : "Activa esto si te interesa recibir solicitudes de compra por tu producto."}
            </p>
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              Configurar
            </Button>
          </>
```

Reemplazarlo por:

```tsx
          <>
            <p className="text-xs text-muted-foreground">
              {openToOffers
                ? `Tu producto está abierto a ofertas${
                    declaredMrrUsd != null
                      ? ` · MRR declarado $${declaredMrrUsd.toLocaleString("en-US")}/mes`
                      : ""
                  }.`
                : "Activa esto si te interesa recibir solicitudes de compra por tu producto."}
            </p>
            {openToOffers && (
              <p className="text-xs text-muted-foreground">
                {(offerViewCount ?? 0) > 0
                  ? `👀 ${(offerViewCount ?? 0).toLocaleString("en-US")} ${
                      offerViewCount === 1 ? "vista" : "vistas"
                    } en tu oferta`
                  : "Todavía nadie vio tu oferta."}
              </p>
            )}
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              Configurar
            </Button>
          </>
```

- [ ] **Step 3: Pasar la prop desde la página de detalle**

En `launchpad/src/app/products/[slug]/product-detail-client.tsx`, el uso actual es:

```tsx
          <OfferSettings
            slug={product.slug}
            makerId={product.maker.id}
            openToOffers={product.openToOffers}
            declaredMrrUsd={product.declaredMrrUsd}
            monetizationNote={product.monetizationNote}
            onUpdated={refetch}
          />
```

Reemplazarlo por:

```tsx
          <OfferSettings
            slug={product.slug}
            makerId={product.maker.id}
            openToOffers={product.openToOffers}
            declaredMrrUsd={product.declaredMrrUsd}
            monetizationNote={product.monetizationNote}
            offerViewCount={product.offerViewCount}
            onUpdated={refetch}
          />
```

- [ ] **Step 4: Verificar tipos y tests**

```bash
cd /Users/willy/Desktop/launchpad/launchpad
npx tsc --noEmit
npm test
```

Expected: sin errores, 36+ tests pasando.

- [ ] **Step 5: Commit**

```bash
cd /Users/willy/Desktop/launchpad
git add launchpad/src/lib/frontend/types.ts launchpad/src/components/product/offer-settings.tsx "launchpad/src/app/products/[slug]/product-detail-client.tsx"
git commit -m "feat(ui): el maker ve las vistas de su oferta en el panel de configuración"
```

---

### Task 4: Selector puro de candidatos al email de tracción (TDD)

**Files:**
- Create: `launchpad/src/lib/offer-nudge.ts`
- Test: `launchpad/src/lib/offer-nudge.test.ts`

**Interfaces:**
- Produces (los consume la Task 6):
  - `OFFER_NUDGE_UPVOTE_THRESHOLD: number` (= 10)
  - `interface OfferNudgeProduct { status: string; openToOffers: boolean; offerNudgeSentAt: Date | null; upvoteCount: number }`
  - `selectOfferNudgeCandidates<T extends OfferNudgeProduct>(products: T[]): T[]` — genérica para que el caller conserve sus campos extra (slug, maker, etc.).

- [ ] **Step 1: Escribir los tests que fallan**

Crear `launchpad/src/lib/offer-nudge.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  selectOfferNudgeCandidates,
  OFFER_NUDGE_UPVOTE_THRESHOLD,
} from "./offer-nudge";

const base = {
  status: "LIVE",
  openToOffers: false,
  offerNudgeSentAt: null as Date | null,
  upvoteCount: OFFER_NUDGE_UPVOTE_THRESHOLD,
};

describe("selectOfferNudgeCandidates", () => {
  it("incluye productos LIVE que alcanzan el umbral exacto o lo superan", () => {
    expect(selectOfferNudgeCandidates([{ ...base }])).toHaveLength(1);
    expect(
      selectOfferNudgeCandidates([{ ...base, upvoteCount: OFFER_NUDGE_UPVOTE_THRESHOLD + 1 }])
    ).toHaveLength(1);
  });

  it("excluye productos por debajo del umbral", () => {
    expect(
      selectOfferNudgeCandidates([{ ...base, upvoteCount: OFFER_NUDGE_UPVOTE_THRESHOLD - 1 }])
    ).toHaveLength(0);
  });

  it("excluye productos que ya están abiertos a ofertas", () => {
    expect(selectOfferNudgeCandidates([{ ...base, openToOffers: true }])).toHaveLength(0);
  });

  it("excluye productos cuyo aviso ya se envió", () => {
    expect(
      selectOfferNudgeCandidates([{ ...base, offerNudgeSentAt: new Date("2026-07-01") }])
    ).toHaveLength(0);
  });

  it("excluye productos no publicados", () => {
    expect(selectOfferNudgeCandidates([{ ...base, status: "DRAFT" }])).toHaveLength(0);
    expect(selectOfferNudgeCandidates([{ ...base, status: "ARCHIVED" }])).toHaveLength(0);
  });

  it("conserva los campos extra del caller (genérica)", () => {
    const result = selectOfferNudgeCandidates([{ ...base, slug: "mi-producto" }]);
    expect(result[0]?.slug).toBe("mi-producto");
  });
});
```

- [ ] **Step 2: Correr los tests y verificar que fallan**

```bash
cd /Users/willy/Desktop/launchpad/launchpad
npx vitest run src/lib/offer-nudge.test.ts
```

Expected: FAIL — "Cannot find module './offer-nudge'" (o equivalente).

- [ ] **Step 3: Implementar el selector**

Crear `launchpad/src/lib/offer-nudge.ts`:

```ts
/**
 * Selección de candidatos para el email de tracción ("tu producto genera
 * interés — puedes activar Abierto a ofertas"). Función pura: la consulta
 * a la base y el envío viven en el endpoint del cron.
 */

export const OFFER_NUDGE_UPVOTE_THRESHOLD = 10;

export interface OfferNudgeProduct {
  status: string;
  openToOffers: boolean;
  offerNudgeSentAt: Date | null;
  upvoteCount: number;
}

/** Filtra los productos que califican para recibir el aviso (una sola vez). */
export function selectOfferNudgeCandidates<T extends OfferNudgeProduct>(products: T[]): T[] {
  return products.filter(
    (p) =>
      p.status === "LIVE" &&
      !p.openToOffers &&
      p.offerNudgeSentAt === null &&
      p.upvoteCount >= OFFER_NUDGE_UPVOTE_THRESHOLD
  );
}
```

- [ ] **Step 4: Correr los tests y verificar que pasan**

```bash
npx vitest run src/lib/offer-nudge.test.ts
npm test
npx tsc --noEmit
```

Expected: los 6 tests nuevos pasan; la suite completa sigue verde.

- [ ] **Step 5: Commit**

```bash
cd /Users/willy/Desktop/launchpad
git add launchpad/src/lib/offer-nudge.ts launchpad/src/lib/offer-nudge.test.ts
git commit -m "feat(offer-nudge): selector puro de candidatos al email de tracción (TDD)"
```

---

### Task 5: Template del email de tracción

**Files:**
- Modify: `launchpad/src/lib/offer-emails.ts` (agregar una función al final)

**Interfaces:**
- Consumes: `sendEmail` y el helper local `esc()` ya presentes en el archivo.
- Produces (lo consume la Task 6): `sendOfferNudgeEmail(input: { makerEmail: string; makerName: string; productName: string; upvoteCount: number; productUrl: string }): Promise<void>`.

- [ ] **Step 1: Agregar la función al final de offer-emails.ts**

Al final de `launchpad/src/lib/offer-emails.ts`, agregar:

```ts
/** Invita al maker a activar "Abierto a ofertas" cuando su producto tiene tracción. */
export async function sendOfferNudgeEmail(input: {
  makerEmail: string;
  makerName: string;
  productName: string;
  upvoteCount: number;
  productUrl: string;
}): Promise<void> {
  const subject = `Tu producto ${input.productName} está generando interés en Denveler`;
  const text = [
    `Hola ${input.makerName},`,
    ``,
    `${input.productName} ya tiene ${input.upvoteCount} votos de la comunidad.`,
    `Si te interesa recibir ofertas de compra, puedes activar "Abierto a ofertas" desde la página de tu producto:`,
    input.productUrl,
    ``,
    `Es opcional y puedes desactivarlo cuando quieras. Denveler no participa en la negociación.`,
  ].join("\n");
  await sendEmail({
    to: input.makerEmail,
    subject,
    text,
    html: `<p>Hola ${esc(input.makerName)},</p>
<p><strong>${esc(input.productName)}</strong> ya tiene <strong>${input.upvoteCount}</strong> votos de la comunidad.</p>
<p>Si te interesa recibir ofertas de compra, puedes activar "Abierto a ofertas" desde <a href="${input.productUrl}">la página de tu producto</a>.</p>
<p>Es opcional y puedes desactivarlo cuando quieras. Denveler no participa en la negociación.</p>`,
  });
}
```

Notas de seguridad ya resueltas por diseño: `makerName` y `productName` son controlados por usuarios y van con `esc()`; `upvoteCount` es un número generado por el servidor; `productUrl` la construye el servidor como `baseUrl + "/products/" + slug` y el slug solo contiene `[a-z0-9-]` (lo garantiza `slugify`), así que es seguro en el `href`.

- [ ] **Step 2: Verificar tipos y suite**

```bash
cd /Users/willy/Desktop/launchpad/launchpad
npx tsc --noEmit
npm test
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
cd /Users/willy/Desktop/launchpad
git add launchpad/src/lib/offer-emails.ts
git commit -m "feat(offer-emails): email de tracción para invitar a activar Abierto a ofertas"
```

---

### Task 6: Endpoint del cron + registro en Vercel (con test de integración)

**Files:**
- Create: `launchpad/src/app/api/cron/offer-nudge/route.ts`
- Create: `launchpad/vercel.json`
- Test: `launchpad/tests/integration/flows.test.ts` (test nuevo al final del `describe`)

**Interfaces:**
- Consumes: `selectOfferNudgeCandidates`, `OfferNudgeProduct` (Task 4); `sendOfferNudgeEmail` (Task 5); helpers `withErrorHandling`/`ok` de `src/lib/api.ts`; `ApiError` de `src/lib/auth.ts`; `prisma` de `src/lib/db.ts`.
- Produces: `GET /api/cron/offer-nudge` → `{ data: { checked: number, sent: number } }`; registro diario en `vercel.json`.

- [ ] **Step 1: Escribir el test de integración que falla**

En `launchpad/tests/integration/flows.test.ts`, agregar al final del `describe` (después del test de la Task 2):

```ts
  // -------------------------------------------------------------------------
  it("offer nudge cron: 401 sin secreto, envía una sola vez a quien califica", async () => {
    const passwordHash = await bcrypt.hash("irrelevant-here", 4);
    const category = await prisma.category.upsert({
      where: { slug: `ng-cat-${uniq}` },
      update: {},
      create: { name: `NG Cat ${uniq}`, slug: `ng-cat-${uniq}` },
    });
    const maker = await prisma.user.create({
      data: { name: "Maker NG", email: `maker-ng-${uniq}@example.com`, passwordHash },
    });
    const productData = (suffix: string) => ({
      makerId: maker.id,
      name: `NG ${suffix} ${uniq}`,
      slug: `ng-${suffix}-${uniq}`,
      tagline: "Producto para el test del cron",
      description: "Creado para el test de integración del email de tracción.",
      categoryId: category.id,
      launchDate: new Date(),
      status: "LIVE" as const,
    });
    const hot = await prisma.product.create({ data: productData("hot") }); // 10 votos → califica
    const cold = await prisma.product.create({ data: productData("cold") }); // 9 votos → no

    const voters = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        prisma.user.create({
          data: { name: `Voter NG ${i}`, email: `voter-ng-${i}-${uniq}@example.com`, passwordHash },
        })
      )
    );
    await prisma.upvote.createMany({
      data: voters.map((v) => ({ userId: v.id, productId: hot.id })),
    });
    await prisma.upvote.createMany({
      data: voters.slice(0, 9).map((v) => ({ userId: v.id, productId: cold.id })),
    });

    // Forzar modo determinista: auth exigida y emails solo-log (sin red).
    const prevSecret = process.env.CRON_SECRET;
    const prevResend = process.env.RESEND_API_KEY;
    process.env.CRON_SECRET = `it-cron-${uniq}`;
    delete process.env.RESEND_API_KEY;
    try {
      const { GET: cron } = await import("@/app/api/cron/offer-nudge/route");

      // Sin header de autorización → 401.
      const denied = await cron(new Request("http://test/api/cron/offer-nudge"));
      expect(denied.status).toBe(401);
      expect((await prisma.product.findUniqueOrThrow({
        where: { id: hot.id },
        select: { offerNudgeSentAt: true },
      })).offerNudgeSentAt).toBeNull();

      // Autorizado → envía y marca al que califica.
      const authed = () =>
        cron(
          new Request("http://test/api/cron/offer-nudge", {
            headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
          })
        );
      const res = await authed();
      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: { checked: number; sent: number } };
      // >= 1 y no === 1: la base local puede tener otros productos con tracción
      // (seeds); lo que este test garantiza es hot sí / cold no.
      expect(body.data.sent).toBeGreaterThanOrEqual(1);

      const hotAfter = await prisma.product.findUniqueOrThrow({
        where: { id: hot.id },
        select: { offerNudgeSentAt: true },
      });
      expect(hotAfter.offerNudgeSentAt).not.toBeNull();
      const coldAfter = await prisma.product.findUniqueOrThrow({
        where: { id: cold.id },
        select: { offerNudgeSentAt: true },
      });
      expect(coldAfter.offerNudgeSentAt).toBeNull();

      // Idempotente: la segunda corrida no reenvía nada.
      const again = await authed();
      const body2 = (await again.json()) as { data: { checked: number; sent: number } };
      expect(body2.data.sent).toBe(0);
    } finally {
      if (prevSecret === undefined) delete process.env.CRON_SECRET;
      else process.env.CRON_SECRET = prevSecret;
      if (prevResend !== undefined) process.env.RESEND_API_KEY = prevResend;
    }
  });
```

- [ ] **Step 2: Correr el test y verificar que falla**

```bash
cd /Users/willy/Desktop/launchpad/launchpad
npm run test:integration -- -t "offer nudge cron"
```

Expected: FAIL — "Cannot find module '@/app/api/cron/offer-nudge/route'" (el endpoint no existe todavía).

- [ ] **Step 3: Implementar el endpoint**

Crear `launchpad/src/app/api/cron/offer-nudge/route.ts`:

```ts
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/auth";
import { withErrorHandling, ok } from "@/lib/api";
import { selectOfferNudgeCandidates } from "@/lib/offer-nudge";
import { sendOfferNudgeEmail } from "@/lib/offer-emails";

/**
 * GET /api/cron/offer-nudge — corre a diario vía Vercel Cron. Busca productos
 * LIVE con tracción (umbral en offer-nudge.ts) que aún no activaron "Abierto a
 * ofertas" ni recibieron este aviso, y les envía UN email (offerNudgeSentAt
 * como candado). Protegido con CRON_SECRET (Vercel lo manda como Bearer);
 * sin CRON_SECRET configurado (dev local) no exige auth, igual que el modo
 * solo-log de sendEmail sin RESEND_API_KEY.
 */
export const GET = withErrorHandling(async (req: Request) => {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    throw new ApiError(401, "Unauthorized");
  }

  const products = await prisma.product.findMany({
    where: { status: "LIVE", openToOffers: false, offerNudgeSentAt: null },
    select: {
      id: true,
      slug: true,
      name: true,
      status: true,
      openToOffers: true,
      offerNudgeSentAt: true,
      _count: { select: { upvotes: true } },
      maker: { select: { name: true, email: true } },
    },
  });

  const candidates = selectOfferNudgeCandidates(
    products.map((p) => ({ ...p, upvoteCount: p._count.upvotes }))
  );

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  let sent = 0;
  for (const p of candidates) {
    // Un email fallido no debe frenar el resto del lote.
    try {
      await sendOfferNudgeEmail({
        makerEmail: p.maker.email,
        makerName: p.maker.name,
        productName: p.name,
        upvoteCount: p.upvoteCount,
        productUrl: `${baseUrl}/products/${p.slug}`,
      });
      await prisma.product.update({
        where: { id: p.id },
        data: { offerNudgeSentAt: new Date() },
      });
      sent++;
    } catch (err) {
      console.error(`[offer-nudge] aviso para ${p.slug} falló:`, err);
    }
  }

  return ok({ checked: products.length, sent });
});
```

- [ ] **Step 4: Registrar el cron en Vercel**

Crear `launchpad/vercel.json` (no existe hoy; va en `launchpad/` porque el Root Directory del proyecto de Vercel es ese subdirectorio):

```json
{
  "crons": [{ "path": "/api/cron/offer-nudge", "schedule": "0 14 * * *" }]
}
```

(14:00 UTC ≈ media mañana en América Latina. Cuando `CRON_SECRET` existe como variable de entorno del proyecto, Vercel lo manda automáticamente como `Authorization: Bearer …` en cada invocación del cron.)

- [ ] **Step 5: Correr los tests y verificar que pasan**

```bash
npm run test:integration -- -t "offer nudge cron"
npm run test:integration
npm test
npx tsc --noEmit
```

Expected: todo verde.

- [ ] **Step 6: Commit**

```bash
cd /Users/willy/Desktop/launchpad
git add launchpad/src/app/api/cron/offer-nudge/route.ts launchpad/vercel.json launchpad/tests/integration/flows.test.ts
git commit -m "feat(cron): email diario de tracción para makers que aún no abren ofertas"
```

---

### Task 7: Verificación completa + doc de migración prod + PR

**Files:**
- Create: `docs/MIGRACION-PROD-FASE3-SIGNAL.md` (en la raíz del repo, junto a `docs/MIGRACION-PROD-FASE2.md`)

- [ ] **Step 1: Suite completa + build**

```bash
cd /Users/willy/Desktop/launchpad/launchpad
npx tsc --noEmit
npm test
npm run test:integration
npm run build
```

Expected: typecheck limpio, todos los tests verdes, build de producción exitoso.

- [ ] **Step 2: Verificación E2E manual contra el dev server**

Con el dev server corriendo (reiniciarlo si venía de antes de la migración, para que el Prisma Client en memoria esté al día):

1. Como usuaria seed `ana@example.com` (password `changeme123`), activar "Abierto a ofertas" en un producto suyo si no está activo.
2. Como `luis@example.com`, visitar la página de ese producto 2 veces → como Ana, verificar que OfferSettings muestra "👀 2 vistas en tu oferta" (o el acumulado que corresponda).
3. Como Ana viendo su propio producto, verificar que el contador NO sube.
4. Llamar `GET /api/cron/offer-nudge` sin `CRON_SECRET` seteado en `.env` local → 200 con `{ data: { checked, sent } }`; verificar en la consola del server los logs `[email:dev]` de los avisos enviados, y que una segunda llamada devuelve `sent: 0`.

- [ ] **Step 3: Escribir el doc de migración de producción**

Obtener los valores reales:

```bash
cd /Users/willy/Desktop/launchpad/launchpad
ls prisma/migrations | grep add_offer_signal
shasum -a 256 prisma/migrations/*add_offer_signal/migration.sql
```

Crear `docs/MIGRACION-PROD-FASE3-SIGNAL.md` (mismo formato que `docs/MIGRACION-PROD-FASE2.md`) con:

1. Instrucción de pegar el bloque en el SQL Editor de Supabase ANTES de mergear el PR.
2. El contenido literal completo de `prisma/migrations/<NOMBRE_MIGRACION>/migration.sql`.
3. A continuación, dentro del mismo bloque SQL:

```sql
INSERT INTO "_prisma_migrations"
  (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
VALUES
  (gen_random_uuid(), '<CHECKSUM>', now(), '<NOMBRE_MIGRACION>', NULL, NULL, now(), 1);
```

reemplazando `<CHECKSUM>` y `<NOMBRE_MIGRACION>` por los valores reales obtenidos arriba.

4. Verificación posterior: `SELECT migration_name FROM _prisma_migrations WHERE migration_name LIKE '%add_offer_signal%';` → 1 fila.
5. Sección "Después de mergear" que incluya: **configurar la variable de entorno `CRON_SECRET` en el proyecto de Vercel** (Settings → Environment Variables, un valor aleatorio largo, p. ej. el resultado de `openssl rand -hex 32`) — sin ella el endpoint del cron queda sin autenticación en producción; y que el cron aparece en Settings → Cron Jobs tras el deploy.

- [ ] **Step 4: Commit del doc + push + PR**

```bash
cd /Users/willy/Desktop/launchpad
git add docs/MIGRACION-PROD-FASE3-SIGNAL.md
git commit -m "docs: ritual de migración SQL para producción (señal del puente de compraventa)"
git push -u origin senal-puente-compraventa
gh pr create --title "Señal del puente: contador de vistas + email de tracción (cron diario)" --body "$(cat <<'EOF'
## Qué agrega
- Product.offerViewCount: vistas de la oferta (no-maker, sin deduplicar), visibles solo para el maker en OfferSettings
- Product.offerNudgeSentAt + cron diario (Vercel Cron, 14:00 UTC): email único invitando a activar "Abierto a ofertas" a makers con 10+ votos
- Tests: unit (selector puro) + integración (contador y cron contra Postgres real)

## Cómo probar
Ver Task 7 del plan (docs/superpowers/plans/2026-07-13-senal-puente-compraventa.md)

## Antes de mergear
⚠️ Correr docs/MIGRACION-PROD-FASE3-SIGNAL.md en Supabase (ritual conocido)
⚠️ Configurar CRON_SECRET en las variables de entorno de Vercel

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 5: Post-merge (Willy)**

1. Willy corre el SQL en Supabase y configura `CRON_SECRET` en Vercel (doc del Step 3).
2. Merge del PR → Vercel despliega solo.
3. Verificación en prod: el cron aparece en el dashboard de Vercel (Settings → Cron Jobs); `curl https://denveler.com/api/products/focusflow` incluye `"offerViewCount"`; y `curl https://denveler.com/api/cron/offer-nudge` SIN header devuelve 401 (confirma que `CRON_SECRET` quedó configurado).

---

## Self-Review (ejecutado al escribir)

- **Cobertura del spec:** contador simple sin deduplicar ✅ (T1/T2), visible solo para el maker en OfferSettings ✅ (T3), campo en el select/tipos ✅ (T2/T3), incremento con try/catch que no tumba la respuesta ✅ (T2), `offerNudgeSentAt` como candado de envío único ✅ (T1/T6), función pura con umbral nombrado ✅ (T4), email con `esc()` ✅ (T5), cron con `CRON_SECRET`-si-existe ✅ (T6), `vercel.json` con schedule diario 14:00 UTC ✅ (T6), respuesta `{ checked, sent }` ✅ (T6), tests unit del selector (umbral 9/10/11, excluidos) ✅ (T4), tests integración del contador (no-maker/maker/anónimo) ✅ (T2), tests integración del cron (401 + marca + idempotencia) ✅ (T6), migración aditiva + doc prod ✅ (T1/T7), fuera de alcance respetado (sin pagos/mensajería/n8n/analytics) ✅.
- **Placeholders:** los `<CHECKSUM>`/`<NOMBRE_MIGRACION>` de la Task 7 son deliberados — se rellenan con valores que solo existen al ejecutar la Task 1, con el comando exacto para obtenerlos dado en el mismo paso (mismo ritual que la Fase 2). No hay otros.
- **Consistencia de tipos:** `selectOfferNudgeCandidates<T extends OfferNudgeProduct>` (T4) = firma usada en T6; `sendOfferNudgeEmail({makerEmail, makerName, productName, upvoteCount, productUrl})` (T5) = llamada en T6; `offerViewCount`/`offerNudgeSentAt` idénticos en Prisma (T1), select (T2), tipos frontend (T3) y cron (T6); la prop `offerViewCount?: number` de OfferSettings (T3) coincide con `ProductDetail.offerViewCount?: number` (T3).
- **Decisión consciente (T2):** `loadEnvConfig` en la config de integración hace que la suite corra sola contra la base local de dev — es la misma base que ya usan los seeds y el dev server, y los tests existentes ya generan datos con sufijos únicos. El test del cron fuerza `delete process.env.RESEND_API_KEY` para que ningún email real salga durante los tests aunque la clave esté en `.env`.
- **Decisión consciente (T6):** `expect(sent).toBeGreaterThanOrEqual(1)` y no `toBe(1)` porque la base local puede tener productos seed con 10+ votos que también califican en la primera corrida; las aserciones fuertes son sobre las filas `hot`/`cold` del propio test más la idempotencia (`sent: 0` en la segunda corrida).
