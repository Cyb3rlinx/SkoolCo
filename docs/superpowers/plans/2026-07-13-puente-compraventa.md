# Puente de Compraventa (Fase 2) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que un maker declare métricas (MRR) y se marque "Abierto a ofertas", y que compradores interesados soliciten contacto — midiendo demanda real de compraventa sin construir un marketplace.

**Architecture:** 3 campos nuevos en `Product` + modelo `ContactRequest` (Prisma/Postgres). El maker edita sus campos vía el `PATCH /api/products/:slug` existente; los compradores usan un endpoint nuevo `POST /api/products/:slug/contact-requests`. El maker gestiona solicitudes desde `/profile` (compartir su email o descartar). Emails vía el helper `sendEmail` existente (Resend o log en dev). Sin mensajería interna, sin pagos, sin escrow.

**Tech Stack:** Next.js 14 App Router, Prisma 5 + PostgreSQL, Zod, NextAuth (sesión vía `requireUser`), Vitest, Resend (opcional).

## Global Constraints

- Español neutro latinoamericano en TODO el copy — PROHIBIDO el voseo ("tenés", "podés", "reservá"): usar tú/usted.
- La marca es **Denveler** (nunca "LaunchPad").
- Validación server-side con Zod en todo input; límites explícitos en cada campo.
- Rate limit en todo endpoint abusable (patrón existente en `src/lib/rate-limit.ts`).
- Migraciones aditivas, nunca destructivas. NUNCA correr `prisma migrate` contra producción — la migración de prod se aplica con el SQL manual del Task 10 (ritual Supabase existente).
- Convención API: éxito `{ data: … }`, error `{ error: { message } }` (helpers en `src/lib/api.ts`).
- Rutas API nuevas empiezan con `export const dynamic = "force-dynamic";` (convención del repo para Vercel).
- Trabajar en la rama `fase-2-puente-compraventa`, commits pequeños, PR al final (NO push directo a `main` en esta fase — el repo ahora tiene 2 devs activos).
- Directorio raíz del repo: `/Users/willy/Desktop/launchpad`. La app vive en `launchpad/`, con `npm` corrido desde `launchpad/`.

---

### Task 0: Rama de trabajo

**Files:** ninguno (solo git)

- [ ] **Step 1: Crear la rama desde main actualizado**

```bash
cd /Users/willy/Desktop/launchpad
git checkout main && git pull origin main
git checkout -b fase-2-puente-compraventa
```

Expected: `Switched to a new branch 'fase-2-puente-compraventa'`

---

### Task 1: Schema Prisma + migración local

**Files:**
- Modify: `launchpad/prisma/schema.prisma` (modelo `Product` líneas ~85-110, y nueva sección después de `ProductImage`)

**Interfaces:**
- Produces: campos `Product.openToOffers: Boolean`, `Product.declaredMrrUsd: Int?`, `Product.monetizationNote: String?`; modelo `ContactRequest { id, productId, buyerId, message, status, createdAt }` con enum `ContactRequestStatus = PENDING | SHARED | DISMISSED`; relaciones `Product.contactRequests` y `User.contactRequestsSent`.

- [ ] **Step 1: Agregar campos al modelo Product**

En `launchpad/prisma/schema.prisma`, dentro de `model Product`, después de la línea `status ProductStatus @default(DRAFT)`, agregar:

```prisma
  // --- Puente de compraventa (Fase 2): métricas declaradas + interés ---
  openToOffers     Boolean @default(false) @map("open_to_offers")
  declaredMrrUsd   Int?    @map("declared_mrr_usd") // USD/mes, declarado por el maker, NO verificado
  monetizationNote String? @map("monetization_note")
```

Y dentro del bloque de relaciones de `Product` (junto a `images ProductImage[]`), agregar:

```prisma
  contactRequests ContactRequest[]
```

- [ ] **Step 2: Agregar relación al modelo User**

En `model User`, junto a `uploadedImages UploadedImage[]`, agregar:

```prisma
  contactRequestsSent     ContactRequest[]
```

- [ ] **Step 3: Agregar el modelo ContactRequest**

Después del modelo `ProductImage`, agregar:

```prisma
/// Solicitud de contacto de un comprador interesado en un producto
/// "abierto a ofertas". El maker decide compartir su email (SHARED) o
/// descartar (DISMISSED). Sin mensajería interna: el contacto sigue por email.
enum ContactRequestStatus {
  PENDING
  SHARED
  DISMISSED
}

model ContactRequest {
  id        String               @id @default(cuid())
  productId String               @map("product_id")
  buyerId   String               @map("buyer_id")
  message   String
  status    ContactRequestStatus @default(PENDING)
  createdAt DateTime             @default(now()) @map("created_at")

  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  buyer   User    @relation(fields: [buyerId], references: [id], onDelete: Cascade)

  // Un comprador solo puede solicitar contacto una vez por producto (anti-spam).
  @@unique([productId, buyerId])
  @@index([productId, status])
  @@map("contact_requests")
}
```

- [ ] **Step 4: Correr la migración local y generar el cliente**

```bash
cd /Users/willy/Desktop/launchpad/launchpad
npx prisma migrate dev --name add_offer_bridge
```

Expected: `Your database is now in sync with your schema.` + `Generated Prisma Client`. Se crea `prisma/migrations/<timestamp>_add_offer_bridge/migration.sql`.

- [ ] **Step 5: Commit**

```bash
cd /Users/willy/Desktop/launchpad
git add launchpad/prisma
git commit -m "feat(schema): campos de oferta en Product + modelo ContactRequest (puente compraventa)"
```

---

### Task 2: Validación Zod (TDD)

**Files:**
- Modify: `launchpad/src/lib/validation.ts` (sección Products, ~línea 24)
- Test: `launchpad/src/lib/validation.test.ts` (agregar bloque al final)

**Interfaces:**
- Produces: `createProductSchema`/`updateProductSchema` aceptan `openToOffers?: boolean`, `declaredMrrUsd?: number|null`, `monetizationNote?: string|null`; nuevo `createContactRequestSchema = z.object({ message })` (20–1000 chars).

- [ ] **Step 1: Escribir los tests que fallan**

Agregar al final de `launchpad/src/lib/validation.test.ts`:

```ts
import { createContactRequestSchema } from "./validation";

describe("offer bridge fields (createProductSchema)", () => {
  const base = {
    name: "Producto",
    tagline: "Una tagline válida",
    description: "Una descripción suficientemente larga.",
    categoryId: "cat1",
    launchDate: "2026-07-13T12:00:00.000Z",
  };

  it("accepts declared offer fields", () => {
    const parsed = createProductSchema.parse({
      ...base,
      openToOffers: true,
      declaredMrrUsd: 1500,
      monetizationNote: "Suscripciones mensuales",
    });
    expect(parsed.openToOffers).toBe(true);
    expect(parsed.declaredMrrUsd).toBe(1500);
  });

  it("rejects negative or non-integer MRR", () => {
    expect(() => createProductSchema.parse({ ...base, declaredMrrUsd: -5 })).toThrow();
    expect(() => createProductSchema.parse({ ...base, declaredMrrUsd: 10.5 })).toThrow();
  });

  it("rejects monetizationNote over 200 chars", () => {
    expect(() =>
      createProductSchema.parse({ ...base, monetizationNote: "x".repeat(201) })
    ).toThrow();
  });
});

describe("createContactRequestSchema", () => {
  it("accepts a reasonable message", () => {
    const parsed = createContactRequestSchema.parse({
      message: "Hola, me interesa tu producto. ¿Podemos hablar de una posible compra?",
    });
    expect(parsed.message.length).toBeGreaterThan(19);
  });

  it("rejects short and giant messages", () => {
    expect(() => createContactRequestSchema.parse({ message: "hola" })).toThrow();
    expect(() => createContactRequestSchema.parse({ message: "x".repeat(1001) })).toThrow();
  });
});
```

Nota: `createProductSchema` ya está importado arriba del archivo de test existente; si no, agregarlo al import de `./validation`.

- [ ] **Step 2: Correr los tests y verificar que fallan**

```bash
cd /Users/willy/Desktop/launchpad/launchpad && npx vitest run src/lib/validation.test.ts
```

Expected: FAIL — `createContactRequestSchema` no existe / campos desconocidos rechazados.

- [ ] **Step 3: Implementar en validation.ts**

En `launchpad/src/lib/validation.ts`, dentro de `createProductSchema` (después de la línea `status: z.enum(...)`), agregar:

```ts
  // --- Puente de compraventa: métricas DECLARADAS por el maker (no verificadas) ---
  openToOffers: z.boolean().optional(),
  declaredMrrUsd: z.number().int().min(0).max(10_000_000).optional().nullable(),
  monetizationNote: z.string().trim().max(200).optional().nullable(),
```

(`updateProductSchema` los hereda automáticamente vía `.partial()`.)

Después de `MAX_PRODUCT_IMAGES`, agregar:

```ts
export const createContactRequestSchema = z.object({
  message: z.string().trim().min(20).max(1000),
});
```

- [ ] **Step 4: Correr los tests y verificar que pasan**

```bash
npx vitest run src/lib/validation.test.ts
```

Expected: PASS (todos, incluidos los previos).

- [ ] **Step 5: Commit**

```bash
cd /Users/willy/Desktop/launchpad
git add launchpad/src/lib/validation.ts launchpad/src/lib/validation.test.ts
git commit -m "feat(validation): campos de oferta declarada + schema de solicitud de contacto"
```

---

### Task 3: Rate limit + endpoint POST de solicitudes + email al maker

**Files:**
- Modify: `launchpad/src/lib/rate-limit.ts` (objeto `RATE_LIMITS`, ~línea 24)
- Create: `launchpad/src/lib/offer-emails.ts`
- Create: `launchpad/src/app/api/products/[slug]/contact-requests/route.ts`
- Modify: `launchpad/src/app/api/products/[slug]/route.ts` (`detailSelect`, ~línea 9)

**Interfaces:**
- Consumes: `createContactRequestSchema` (Task 2), modelos Prisma (Task 1), `requireUser`/`ApiError` de `@/lib/auth`, `withErrorHandling/parseBody/created` de `@/lib/api`, `checkRateLimit/RATE_LIMITS` de `@/lib/rate-limit`, `sendEmail` de `@/lib/email`.
- Produces: `POST /api/products/:slug/contact-requests` → 201 `{ data: { id, status, createdAt } }`; `detailSelect` incluye `openToOffers, declaredMrrUsd, monetizationNote`; funciones `sendContactRequestNotification(...)` y `sendContactSharedNotification(...)` en `offer-emails.ts`.

- [ ] **Step 1: Agregar la regla de rate limit**

En `RATE_LIMITS` (`launchpad/src/lib/rate-limit.ts`), después de la línea `upload: ...`:

```ts
  contactRequest: { limit: 5, windowMs: 24 * 60 * 60_000 }, // 5 solicitudes de contacto / día / usuario
```

- [ ] **Step 2: Crear los emails del puente**

Crear `launchpad/src/lib/offer-emails.ts`:

```ts
import { sendEmail } from "./email";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Avisa al maker que alguien pidió contacto por su producto. */
export async function sendContactRequestNotification(input: {
  makerEmail: string;
  makerName: string;
  buyerName: string;
  productName: string;
  message: string;
  baseUrl: string;
}): Promise<void> {
  const subject = `Solicitud de contacto por ${input.productName} en Denveler`;
  const text = [
    `Hola ${input.makerName},`,
    ``,
    `${input.buyerName} está interesado en ${input.productName} y pidió tu contacto.`,
    `Su mensaje:`,
    `"${input.message}"`,
    ``,
    `Entra a tu perfil para compartir tu email o descartar la solicitud:`,
    `${input.baseUrl}/profile`,
  ].join("\n");
  await sendEmail({
    to: input.makerEmail,
    subject,
    text,
    html: `<p>Hola ${esc(input.makerName)},</p>
<p><strong>${esc(input.buyerName)}</strong> está interesado en <strong>${esc(input.productName)}</strong> y pidió tu contacto.</p>
<blockquote>${esc(input.message)}</blockquote>
<p><a href="${input.baseUrl}/profile">Entra a tu perfil</a> para compartir tu email o descartar la solicitud.</p>`,
  });
}

/** Avisa al comprador que el maker aceptó compartir su email. */
export async function sendContactSharedNotification(input: {
  buyerEmail: string;
  buyerName: string;
  makerName: string;
  makerEmail: string;
  productName: string;
}): Promise<void> {
  const subject = `${input.makerName} compartió su contacto por ${input.productName}`;
  const text = [
    `Hola ${input.buyerName},`,
    ``,
    `${input.makerName}, maker de ${input.productName}, aceptó compartir su contacto contigo:`,
    input.makerEmail,
    ``,
    `Escríbele directamente para continuar la conversación. Denveler no participa en la negociación.`,
  ].join("\n");
  await sendEmail({
    to: input.buyerEmail,
    subject,
    text,
    html: `<p>Hola ${esc(input.buyerName)},</p>
<p><strong>${esc(input.makerName)}</strong>, maker de <strong>${esc(input.productName)}</strong>, aceptó compartir su contacto contigo:</p>
<p><a href="mailto:${input.makerEmail}">${input.makerEmail}</a></p>
<p>Escríbele directamente para continuar la conversación. Denveler no participa en la negociación.</p>`,
  });
}
```

- [ ] **Step 3: Exponer los campos nuevos en el detalle del producto**

En `launchpad/src/app/api/products/[slug]/route.ts`, dentro de `detailSelect`, después de `updatedAt: true,`:

```ts
  openToOffers: true,
  declaredMrrUsd: true,
  monetizationNote: true,
```

- [ ] **Step 4: Crear el endpoint POST**

Crear `launchpad/src/app/api/products/[slug]/contact-requests/route.ts`:

```ts
export const dynamic = "force-dynamic";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser, ApiError } from "@/lib/auth";
import { createContactRequestSchema } from "@/lib/validation";
import { findProduct } from "@/lib/products";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { sendContactRequestNotification } from "@/lib/offer-emails";
import { withErrorHandling, parseBody, created } from "@/lib/api";

/**
 * POST /api/products/:slug/contact-requests — un comprador registrado pide
 * el contacto del maker de un producto abierto a ofertas. 1 por comprador
 * por producto (unique en DB). El maker recibe un email y decide en /profile.
 */
export const POST = withErrorHandling(
  async (req: Request, { params }: { params: { slug: string } }) => {
    const user = await requireUser();

    if (!checkRateLimit(`contactRequest:${user.id}`, RATE_LIMITS.contactRequest)) {
      throw new ApiError(429, "Demasiadas solicitudes por hoy. Intenta mañana.");
    }

    const base = await findProduct(params.slug);
    if (base.makerId === user.id) {
      throw new ApiError(400, "No puedes solicitar contacto por tu propio producto.");
    }

    const product = await prisma.product.findUniqueOrThrow({
      where: { id: base.id },
      select: {
        name: true,
        status: true,
        openToOffers: true,
        maker: { select: { name: true, email: true } },
      },
    });
    if (product.status !== "LIVE" || !product.openToOffers) {
      throw new ApiError(400, "Este producto no está abierto a ofertas.");
    }

    const { message } = await parseBody(req, createContactRequestSchema);

    let request;
    try {
      request = await prisma.contactRequest.create({
        data: { productId: base.id, buyerId: user.id, message },
        select: { id: true, status: true, createdAt: true },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new ApiError(409, "Ya solicitaste contacto por este producto.");
      }
      throw err;
    }

    // El email no debe tumbar la solicitud si el proveedor falla.
    try {
      await sendContactRequestNotification({
        makerEmail: product.maker.email,
        makerName: product.maker.name,
        buyerName: user.name,
        productName: product.name,
        message,
        baseUrl: process.env.NEXTAUTH_URL ?? "http://localhost:3000",
      });
    } catch (err) {
      console.error("[contact-request] email al maker falló:", err);
    }

    return created(request);
  }
);
```

Nota: `requireUser()` devuelve el usuario de sesión; verificar en `src/lib/auth.ts` que expone `name` (si solo expone `id/role/email`, buscar el nombre con `prisma.user.findUnique({ where: { id: user.id }, select: { name: true } })` y usar ese valor).

- [ ] **Step 5: Typecheck**

```bash
cd /Users/willy/Desktop/launchpad/launchpad && npm run typecheck
```

Expected: sin errores.

- [ ] **Step 6: Commit**

```bash
cd /Users/willy/Desktop/launchpad
git add launchpad/src/lib/rate-limit.ts launchpad/src/lib/offer-emails.ts "launchpad/src/app/api/products/[slug]/contact-requests" "launchpad/src/app/api/products/[slug]/route.ts"
git commit -m "feat(api): solicitudes de contacto (POST) + campos de oferta en el detalle + email al maker"
```

---

### Task 4: Endpoints del maker — listar y resolver solicitudes

**Files:**
- Create: `launchpad/src/app/api/me/contact-requests/route.ts`
- Create: `launchpad/src/app/api/contact-requests/[id]/route.ts`

**Interfaces:**
- Consumes: `sendContactSharedNotification` (Task 3), modelos Prisma (Task 1).
- Produces: `GET /api/me/contact-requests` → `{ data: Array<{ id, message, status, createdAt, buyer: { name }, product: { name, slug } }> }`; `PATCH /api/contact-requests/:id` body `{ status: "SHARED" | "DISMISSED" }` → `{ data: { id, status } }`.

- [ ] **Step 1: Crear GET /api/me/contact-requests**

Crear `launchpad/src/app/api/me/contact-requests/route.ts`:

```ts
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { withErrorHandling, ok } from "@/lib/api";

/** GET /api/me/contact-requests — solicitudes recibidas por MIS productos. */
export const GET = withErrorHandling(async () => {
  const user = await requireUser();

  const requests = await prisma.contactRequest.findMany({
    where: { product: { makerId: user.id } },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      message: true,
      status: true,
      createdAt: true,
      buyer: { select: { name: true } },
      product: { select: { name: true, slug: true } },
    },
  });

  return ok(requests);
});
```

- [ ] **Step 2: Crear PATCH /api/contact-requests/[id]**

Crear `launchpad/src/app/api/contact-requests/[id]/route.ts`:

```ts
export const dynamic = "force-dynamic";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, ApiError } from "@/lib/auth";
import { sendContactSharedNotification } from "@/lib/offer-emails";
import { withErrorHandling, parseBody, ok } from "@/lib/api";

const resolveSchema = z.object({ status: z.enum(["SHARED", "DISMISSED"]) });

/**
 * PATCH /api/contact-requests/:id — el maker del producto comparte su email
 * (SHARED → se le envía al comprador) o descarta la solicitud (DISMISSED).
 */
export const PATCH = withErrorHandling(
  async (req: Request, { params }: { params: { id: string } }) => {
    const user = await requireUser();
    const { status } = await parseBody(req, resolveSchema);

    const request = await prisma.contactRequest.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        status: true,
        buyer: { select: { name: true, email: true } },
        product: { select: { name: true, makerId: true, maker: { select: { name: true, email: true } } } },
      },
    });
    if (!request || request.product.makerId !== user.id) {
      throw new ApiError(404, "Solicitud no encontrada.");
    }
    if (request.status !== "PENDING") {
      throw new ApiError(400, "Esta solicitud ya fue resuelta.");
    }

    const updated = await prisma.contactRequest.update({
      where: { id: request.id },
      data: { status },
      select: { id: true, status: true },
    });

    if (status === "SHARED") {
      try {
        await sendContactSharedNotification({
          buyerEmail: request.buyer.email,
          buyerName: request.buyer.name,
          makerName: request.product.maker.name,
          makerEmail: request.product.maker.email,
          productName: request.product.name,
        });
      } catch (err) {
        console.error("[contact-request] email al comprador falló:", err);
      }
    }

    return ok(updated);
  }
);
```

- [ ] **Step 3: Typecheck + tests**

```bash
cd /Users/willy/Desktop/launchpad/launchpad && npm run typecheck && npm test
```

Expected: typecheck limpio, todos los tests PASS.

- [ ] **Step 4: Commit**

```bash
cd /Users/willy/Desktop/launchpad
git add launchpad/src/app/api/me/contact-requests launchpad/src/app/api/contact-requests
git commit -m "feat(api): el maker lista y resuelve solicitudes de contacto (compartir email / descartar)"
```

---

### Task 5: Tipos frontend + api-client

**Files:**
- Modify: `launchpad/src/lib/frontend/types.ts` (interfaces `ProductDetail` y `CreateProductInput`; nuevo tipo al final de la sección de productos)
- Modify: `launchpad/src/lib/frontend/api-client.ts` (después de `deleteProductImage`, ~línea 166)

**Interfaces:**
- Produces: `ProductDetail.openToOffers/declaredMrrUsd/monetizationNote`; tipo `ContactRequestItem`; funciones `requestContact(slug, message)`, `fetchMyContactRequests()`, `resolveContactRequest(id, status)`.

- [ ] **Step 1: Ampliar tipos**

En `launchpad/src/lib/frontend/types.ts`, dentro de `interface ProductDetail`, después de `images?: ProductImage[];`:

```ts
  /** Puente de compraventa — declarado por el maker, NO verificado. */
  openToOffers?: boolean;
  declaredMrrUsd?: number | null;
  monetizationNote?: string | null;
```

En `interface CreateProductInput` (mismo archivo), agregar al final de sus campos:

```ts
  openToOffers?: boolean;
  declaredMrrUsd?: number | null;
  monetizationNote?: string | null;
```

Después de `ProductDetail`, agregar:

```ts
export type ContactRequestStatus = "PENDING" | "SHARED" | "DISMISSED";

export interface ContactRequestItem {
  id: string;
  message: string;
  status: ContactRequestStatus;
  createdAt: string;
  buyer: { name: string };
  product: { name: string; slug: string };
}
```

- [ ] **Step 2: Ampliar api-client**

En `launchpad/src/lib/frontend/api-client.ts`, importar el tipo (en el bloque de imports de `./types` agregar `ContactRequestItem`) y después de `deleteProductImage`:

```ts
// ---------------------------------------------------------------------------
// Puente de compraventa (Fase 2)
// ---------------------------------------------------------------------------

/** POST /api/products/:slug/contact-requests (auth) — pedir contacto al maker. */
export function requestContact(slug: string, message: string) {
  return request<{ id: string; status: string; createdAt: string }>(
    `/api/products/${encodeURIComponent(slug)}/contact-requests`,
    { method: "POST", body: JSON.stringify({ message }) }
  );
}

/** GET /api/me/contact-requests (auth) — solicitudes recibidas por mis productos. */
export function fetchMyContactRequests() {
  return request<ContactRequestItem[]>(`/api/me/contact-requests`);
}

/** PATCH /api/contact-requests/:id (auth) — compartir email o descartar. */
export function resolveContactRequest(id: string, status: "SHARED" | "DISMISSED") {
  return request<{ id: string; status: string }>(
    `/api/contact-requests/${encodeURIComponent(id)}`,
    { method: "PATCH", body: JSON.stringify({ status }) }
  );
}
```

- [ ] **Step 3: Typecheck + commit**

```bash
cd /Users/willy/Desktop/launchpad/launchpad && npm run typecheck
cd /Users/willy/Desktop/launchpad
git add launchpad/src/lib/frontend/types.ts launchpad/src/lib/frontend/api-client.ts
git commit -m "feat(frontend): tipos y api-client del puente de compraventa"
```

---

### Task 6: UI pública — tarjeta "Abierto a ofertas" en el detalle

**Files:**
- Create: `launchpad/src/components/product/offer-card.tsx`
- Modify: `launchpad/src/app/products/[slug]/product-detail-client.tsx` (sidebar, después de `<MakerCard …/>`, ~línea 155; + import)

**Interfaces:**
- Consumes: `requestContact` (Task 5), `useSession` de next-auth, UI kit (`Card`, `Button`, `Dialog`, `Textarea`, `Alert`, `buttonVariants`), `ApiClientError`.
- Produces: componente `OfferCard({ slug, makerId, openToOffers, declaredMrrUsd, monetizationNote })`.

- [ ] **Step 1: Crear el componente**

Crear `launchpad/src/components/product/offer-card.tsx`:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { BadgeDollarSign, Handshake } from "lucide-react";
import { ApiClientError, requestContact } from "@/lib/frontend/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";

/**
 * Tarjeta pública del puente de compraventa: badge "Abierto a ofertas",
 * MRR declarado (con disclaimer) y solicitud de contacto. Solo se muestra
 * si el maker activó openToOffers; el propio maker no la ve (él tiene
 * OfferSettings). Nada de precios ni negociación dentro de la plataforma.
 */
export function OfferCard({
  slug,
  makerId,
  openToOffers,
  declaredMrrUsd,
  monetizationNote,
}: {
  slug: string;
  makerId: string;
  openToOffers?: boolean;
  declaredMrrUsd?: number | null;
  monetizationNote?: string | null;
}) {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const isMaker = session?.user?.id === makerId;
  if (!openToOffers || isMaker) return null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await requestContact(slug, message.trim());
      setSent(true);
      setOpen(false);
    } catch (err) {
      setError(
        err instanceof ApiClientError ? err.message : "No pudimos enviar tu solicitud."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="border-primary/25">
      <CardContent className="space-y-3 p-5">
        <p className="flex items-center gap-2 text-sm font-bold">
          <Handshake className="h-4 w-4 text-primary" aria-hidden />
          Abierto a ofertas
        </p>

        {typeof declaredMrrUsd === "number" && (
          <div>
            <p className="flex items-center gap-1.5 text-sm">
              <BadgeDollarSign className="h-4 w-4 text-muted-foreground" aria-hidden />
              <span className="font-semibold">
                MRR declarado: ${declaredMrrUsd.toLocaleString("en-US")}/mes
              </span>
            </p>
            <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
              Métrica declarada por el maker. Denveler no la verifica ni participa en
              la negociación.
            </p>
          </div>
        )}

        {monetizationNote && (
          <p className="text-xs text-muted-foreground">Monetización: {monetizationNote}</p>
        )}

        {sent ? (
          <Alert>Solicitud enviada. El maker decidirá si comparte su contacto.</Alert>
        ) : status === "authenticated" ? (
          <Button size="sm" className="w-full" onClick={() => setOpen(true)}>
            Solicitar contacto
          </Button>
        ) : (
          <Link
            href="/login"
            className={buttonVariants({ variant: "outline", size: "sm" }) + " w-full"}
          >
            Inicia sesión para solicitar contacto
          </Link>
        )}
      </CardContent>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Solicitar contacto"
        description="Cuéntale al maker quién eres y por qué te interesa. Si acepta, recibirás su email."
      >
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ej.: Soy operador de micro-SaaS, me interesa conocer más del producto y conversar una posible compra…"
            className="min-h-[120px]"
            maxLength={1000}
            required
          />
          <p className="text-xs text-muted-foreground">
            Mínimo 20 caracteres. {message.trim().length}/1000
          </p>
          {error && <Alert variant="destructive">{error}</Alert>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={busy || message.trim().length < 20}>
              {busy ? "Enviando…" : "Enviar solicitud"}
            </Button>
          </div>
        </form>
      </Dialog>
    </Card>
  );
}
```

- [ ] **Step 2: Insertarlo en el detalle del producto**

En `launchpad/src/app/products/[slug]/product-detail-client.tsx`:

Import (junto a los demás de `@/components/product/`):

```tsx
import { OfferCard } from "@/components/product/offer-card";
```

En el `<aside>` del sidebar, inmediatamente después de `<MakerCard maker={product.maker} />`:

```tsx
          <OfferCard
            slug={product.slug}
            makerId={product.maker.id}
            openToOffers={product.openToOffers}
            declaredMrrUsd={product.declaredMrrUsd}
            monetizationNote={product.monetizationNote}
          />
```

- [ ] **Step 3: Typecheck + commit**

```bash
cd /Users/willy/Desktop/launchpad/launchpad && npm run typecheck
cd /Users/willy/Desktop/launchpad
git add launchpad/src/components/product/offer-card.tsx "launchpad/src/app/products/[slug]/product-detail-client.tsx"
git commit -m "feat(ui): tarjeta pública Abierto a ofertas con MRR declarado y solicitud de contacto"
```

---

### Task 7: UI del maker — configurar la oferta desde su producto

**Files:**
- Create: `launchpad/src/components/product/offer-settings.tsx`
- Modify: `launchpad/src/app/products/[slug]/product-detail-client.tsx` (sidebar, después del `<OfferCard …/>` del Task 6; + import)

**Interfaces:**
- Consumes: `updateProduct` (existente en api-client), `useSession`.
- Produces: componente `OfferSettings({ slug, makerId, openToOffers, declaredMrrUsd, monetizationNote, onUpdated })`.

- [ ] **Step 1: Crear el componente**

Crear `launchpad/src/components/product/offer-settings.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Handshake } from "lucide-react";
import { ApiClientError, updateProduct } from "@/lib/frontend/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";

/**
 * Panel del maker (solo él lo ve) para activar "Abierto a ofertas" y declarar
 * MRR/monetización. Guarda vía PATCH /api/products/:slug (endpoint existente).
 */
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
  const { data: session } = useSession();
  const [editing, setEditing] = useState(false);
  const [open, setOpen] = useState(Boolean(openToOffers));
  const [mrr, setMrr] = useState(declaredMrrUsd != null ? String(declaredMrrUsd) : "");
  const [note, setNote] = useState(monetizationNote ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (session?.user?.id !== makerId) return null;

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const mrrValue = mrr.trim() === "" ? null : Number(mrr);
    if (mrrValue !== null && (!Number.isInteger(mrrValue) || mrrValue < 0)) {
      setError("El MRR debe ser un número entero positivo (USD/mes).");
      return;
    }
    setBusy(true);
    try {
      await updateProduct(slug, {
        openToOffers: open,
        declaredMrrUsd: mrrValue,
        monetizationNote: note.trim() || null,
      });
      setEditing(false);
      onUpdated();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="border-dashed">
      <CardContent className="space-y-3 p-5">
        <p className="flex items-center gap-2 text-sm font-bold">
          <Handshake className="h-4 w-4 text-primary" aria-hidden />
          Ofertas (solo tú ves esto)
        </p>

        {!editing ? (
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
        ) : (
          <form onSubmit={onSave} className="space-y-3" noValidate>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={open}
                onChange={(e) => setOpen(e.target.checked)}
                className="h-4 w-4 accent-[hsl(var(--primary))]"
              />
              Abierto a ofertas
            </label>
            <div className="space-y-1">
              <label htmlFor="offer-mrr" className="text-xs font-semibold">
                MRR declarado (USD/mes, opcional)
              </label>
              <Input
                id="offer-mrr"
                inputMode="numeric"
                value={mrr}
                onChange={(e) => setMrr(e.target.value)}
                placeholder="1500"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="offer-note" className="text-xs font-semibold">
                Cómo monetiza (opcional)
              </label>
              <Input
                id="offer-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={200}
                placeholder="Suscripciones, ads, one-time…"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Las métricas son declaradas bajo tu responsabilidad; Denveler no las verifica.
            </p>
            {error && <Alert variant="destructive">{error}</Alert>}
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={busy}>
                {busy ? "Guardando…" : "Guardar"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Insertarlo en el detalle**

En `product-detail-client.tsx`, import:

```tsx
import { OfferSettings } from "@/components/product/offer-settings";
```

En el `<aside>`, después del `<OfferCard …/>`:

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

- [ ] **Step 3: Typecheck + commit**

```bash
cd /Users/willy/Desktop/launchpad/launchpad && npm run typecheck
cd /Users/willy/Desktop/launchpad
git add launchpad/src/components/product/offer-settings.tsx "launchpad/src/app/products/[slug]/product-detail-client.tsx"
git commit -m "feat(ui): panel del maker para configurar Abierto a ofertas y MRR declarado"
```

---

### Task 8: Perfil — sección "Solicitudes de contacto"

**Files:**
- Create: `launchpad/src/components/profile/contact-requests-section.tsx`
- Modify: `launchpad/src/app/profile/profile-client.tsx` (insertar sección entre "Mis lanzamientos" y "Zona de peligro", ~línea 194; + import)

**Interfaces:**
- Consumes: `fetchMyContactRequests`, `resolveContactRequest`, tipo `ContactRequestItem` (Task 5), `useApi` de `@/lib/frontend/hooks`, `formatDate` de `@/lib/frontend/format`.
- Produces: componente `ContactRequestsSection()` (sin props).

- [ ] **Step 1: Crear el componente**

Crear `launchpad/src/components/profile/contact-requests-section.tsx`:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Handshake } from "lucide-react";
import {
  ApiClientError,
  fetchMyContactRequests,
  resolveContactRequest,
} from "@/lib/frontend/api-client";
import { useApi } from "@/lib/frontend/hooks";
import { formatDate } from "@/lib/frontend/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";

const STATUS_CHIP = {
  PENDING: { text: "Pendiente", variant: "warning" as const },
  SHARED: { text: "Email compartido", variant: "success" as const },
  DISMISSED: { text: "Descartada", variant: "outline" as const },
};

/** Solicitudes de contacto recibidas por los productos del usuario (puente de compraventa). */
export function ContactRequestsSection() {
  const requests = useApi(fetchMyContactRequests, {});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function resolve(id: string, status: "SHARED" | "DISMISSED") {
    setError(null);
    setBusyId(id);
    try {
      await resolveContactRequest(id, status);
      requests.refetch();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "No se pudo actualizar.");
    } finally {
      setBusyId(null);
    }
  }

  // Sin solicitudes → no ocupar espacio en el perfil.
  if (!requests.loading && !requests.error && (requests.data?.length ?? 0) === 0) {
    return null;
  }

  return (
    <section className="space-y-4" aria-labelledby="contact-requests-title">
      <h2 id="contact-requests-title" className="flex items-center gap-2 text-xl font-extrabold">
        <Handshake className="h-5 w-5 text-primary" aria-hidden />
        Solicitudes de contacto
      </h2>

      {requests.loading && <Skeleton className="h-24 w-full rounded-2xl" aria-busy="true" />}
      {!requests.loading && requests.error && (
        <ErrorState message={requests.error} onRetry={requests.refetch} />
      )}
      {error && <Alert variant="destructive">{error}</Alert>}

      <div className="space-y-3">
        {requests.data?.map((r) => {
          const chip = STATUS_CHIP[r.status];
          return (
            <Card key={r.id}>
              <CardContent className="space-y-2 p-5">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-bold">{r.buyer.name}</span>
                  <span className="text-muted-foreground">está interesado en</span>
                  <Link
                    href={`/products/${r.product.slug}`}
                    className="font-bold text-primary hover:underline"
                  >
                    {r.product.name}
                  </Link>
                  <Badge variant={chip.variant}>{chip.text}</Badge>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {formatDate(r.createdAt)}
                  </span>
                </div>
                <p className="rounded-xl bg-muted p-3 text-sm">{r.message}</p>
                {r.status === "PENDING" && (
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      disabled={busyId === r.id}
                      onClick={() => resolve(r.id, "SHARED")}
                    >
                      Compartir mi email
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={busyId === r.id}
                      onClick={() => resolve(r.id, "DISMISSED")}
                    >
                      Descartar
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Insertarlo en el perfil**

En `launchpad/src/app/profile/profile-client.tsx`, import:

```tsx
import { ContactRequestsSection } from "@/components/profile/contact-requests-section";
```

Entre el cierre de la sección "My launches" (`</section>`) y el comentario `{/* Danger zone */}`:

```tsx
      {/* Solicitudes de contacto (puente de compraventa) */}
      <ContactRequestsSection />
```

- [ ] **Step 3: Typecheck + commit**

```bash
cd /Users/willy/Desktop/launchpad/launchpad && npm run typecheck
cd /Users/willy/Desktop/launchpad
git add launchpad/src/components/profile launchpad/src/app/profile/profile-client.tsx
git commit -m "feat(ui): sección de solicitudes de contacto en el perfil (compartir email / descartar)"
```

---

### Task 9: OpenAPI 0.7.0 + cláusula legal en Términos

**Files:**
- Modify: `launchpad/public/openapi.yaml` (version ~línea 4; paths después de `/api/products/{slug}/images/{id}`)
- Modify: `launchpad/src/app/terminos/page.tsx` (nueva sección antes de `<h2>Responsabilidad</h2>`)

- [ ] **Step 1: OpenAPI — bump + endpoints nuevos**

En `launchpad/public/openapi.yaml` cambiar `version: 0.6.1` → `version: 0.7.0`, y después del bloque `/api/products/{slug}/images/{id}` agregar:

```yaml
  /api/products/{slug}/contact-requests:
    post:
      tags: [Productos]
      summary: Solicitar contacto al maker (producto abierto a ofertas)
      description: |
        Requiere sesión. Rate limit: 5/día/usuario. Solo productos LIVE con
        openToOffers=true. Una solicitud por comprador por producto (409 si repite).
      security:
        - sessionCookie: []
      parameters:
        - name: slug
          in: path
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [message]
              properties:
                message: { type: string, minLength: 20, maxLength: 1000 }
      responses:
        '201': { description: 'Creada — `{ data: { id, status, createdAt } }`' }
        '400': { description: Producto no abierto a ofertas, o propio producto }
        '401': { $ref: '#/components/responses/Unauthorized' }
        '409': { description: Ya existe una solicitud de este comprador }
        '429': { $ref: '#/components/responses/RateLimited' }

  /api/me/contact-requests:
    get:
      tags: [Perfil]
      summary: Solicitudes de contacto recibidas por mis productos
      security:
        - sessionCookie: []
      responses:
        '200': { description: 'Lista — `{ data: [{ id, message, status, createdAt, buyer, product }] }`' }
        '401': { $ref: '#/components/responses/Unauthorized' }

  /api/contact-requests/{id}:
    patch:
      tags: [Perfil]
      summary: Resolver una solicitud (compartir email o descartar)
      security:
        - sessionCookie: []
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [status]
              properties:
                status: { type: string, enum: [SHARED, DISMISSED] }
      responses:
        '200': { description: 'Actualizada — `{ data: { id, status } }`. SHARED envía email al comprador' }
        '400': { description: Ya resuelta }
        '401': { $ref: '#/components/responses/Unauthorized' }
        '404': { description: No encontrada o no es tu producto }
```

- [ ] **Step 2: Términos — cláusula de métricas declaradas**

En `launchpad/src/app/terminos/page.tsx`, antes de `<h2>Responsabilidad</h2>`, agregar (y actualizar `updated=` a la fecha del día que se ejecute):

```tsx
      <h2>Métricas declaradas y contacto entre usuarios</h2>
      <p>
        Un maker puede declarar métricas de su producto (como MRR) y marcarse
        “abierto a ofertas”. Esas métricas las declara el maker bajo su exclusiva
        responsabilidad: Denveler <strong>no las verifica</strong> ni garantiza su
        exactitud. Las solicitudes de contacto solo intercambian mensajes y, si el
        maker acepta, su email. Cualquier conversación, acuerdo o transacción
        posterior ocurre fuera de la plataforma y es responsabilidad exclusiva de
        las partes; Denveler no participa, no intermedia ni cobra por ello.
      </p>
```

- [ ] **Step 3: Typecheck + commit**

```bash
cd /Users/willy/Desktop/launchpad/launchpad && npm run typecheck
cd /Users/willy/Desktop/launchpad
git add launchpad/public/openapi.yaml launchpad/src/app/terminos/page.tsx
git commit -m "docs(api+legal): OpenAPI 0.7.0 con endpoints del puente + cláusula de métricas declaradas"
```

---

### Task 10: Verificación E2E local + PR + SQL para producción

**Files:**
- Create: `docs/MIGRACION-PROD-FASE2.md`

- [ ] **Step 1: Suite completa**

```bash
cd /Users/willy/Desktop/launchpad/launchpad
npm run typecheck && npm test && npm run build
```

Expected: typecheck limpio, todos los tests PASS, build con 30+ rutas.

- [ ] **Step 2: Verificación E2E en dev**

Levantar el dev server (preview del harness o `npm run dev`) y, con la sesión de `ana@example.com` / `changeme123` (seed), verificar vía consola del navegador:

1. `PATCH /api/products/focusflow` con `{"openToOffers":true,"declaredMrrUsd":1200}` → 200.
2. Cerrar sesión de Ana; entrar como `luis@example.com` / `changeme123`; en `/products/focusflow` debe verse la tarjeta "Abierto a ofertas" con "MRR declarado: $1,200/mes" + disclaimer.
3. Enviar solicitud con un mensaje ≥20 chars → 201; reintentar → 409; y en la consola del server debe aparecer `[email:dev] to=ana@example.com`.
4. Como Ana, `/profile` debe listar la solicitud → "Compartir mi email" → status pasa a "Email compartido" y el server loguea `[email:dev] to=luis@example.com` con el email de Ana.
5. Como Luis, `POST /api/products/meteoro-ia/contact-requests` (producto NO abierto) → 400.

- [ ] **Step 3: Escribir el SQL de migración para producción**

Crear `docs/MIGRACION-PROD-FASE2.md` con el ritual conocido (rellenar `<CHECKSUM>` y `<NOMBRE_MIGRACION>` con los valores reales):

```bash
# Obtener los valores:
ls /Users/willy/Desktop/launchpad/launchpad/prisma/migrations | grep add_offer_bridge
shasum -a 256 /Users/willy/Desktop/launchpad/launchpad/prisma/migrations/*add_offer_bridge/migration.sql
```

Contenido del doc: el SQL completo de `migration.sql` (cópialo literal) seguido de:

```sql
INSERT INTO "_prisma_migrations"
  (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
VALUES
  (gen_random_uuid(), '<CHECKSUM>', now(), '<NOMBRE_MIGRACION>', NULL, NULL, now(), 1);
```

Con la instrucción: "Willy: pegar TODO en el SQL Editor de Supabase (proyecto skoolco, main) → Run → debe decir Success. Correr ANTES de mergear el PR (el código nuevo tolera la tabla existente; la tabla sin código no molesta)."

- [ ] **Step 4: Push de la rama + PR**

```bash
cd /Users/willy/Desktop/launchpad
git add docs/MIGRACION-PROD-FASE2.md
git commit -m "docs: SQL de migración de producción para la Fase 2"
git push -u origin fase-2-puente-compraventa
gh pr create --title "Fase 2: puente de compraventa (ofertas declaradas + solicitudes de contacto)" --body "$(cat <<'EOF'
## Qué agrega
- Campos declarados en Product: openToOffers, declaredMrrUsd, monetizationNote (PATCH existente)
- ContactRequest: solicitud de contacto de comprador → email al maker → maker comparte email o descarta (email al comprador)
- UI: tarjeta pública en el detalle + panel del maker + sección en /profile
- OpenAPI 0.7.0 + cláusula legal de métricas declaradas en Términos

## Cómo probar
Ver Task 10 del plan (docs/superpowers/plans/2026-07-13-puente-compraventa.md)

## Antes de mergear
⚠️ Correr docs/MIGRACION-PROD-FASE2.md en Supabase (ritual conocido)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 5: Post-merge (Willy + Kevin)**

1. Willy corre el SQL en Supabase (doc del Step 3) y verifica: `SELECT migration_name FROM _prisma_migrations WHERE migration_name LIKE '%add_offer_bridge%';` → 1 fila.
2. Kevin (o Willy) aprueba y mergea el PR → Vercel despliega solo.
3. Verificación en prod: `curl https://denveler.com/api/products/meteoro-ia` debe incluir `"openToOffers":false`.
4. Prueba real: Willy marca METEORO IA como abierto a ofertas desde la página del producto y Kevin le manda una solicitud desde su cuenta. Si el email de Resend aún no está configurado con el dominio, los emails solo se loguean — el flujo en la web funciona igual (todo se ve en `/profile`).

---

## Self-Review (ejecutado al escribir)

- **Cobertura del spec:** campos declarados ✅ (T1/T2/T3/T7), badge público + disclaimer ✅ (T6), solicitud de contacto ✅ (T3/T6), gestión del maker + emails ✅ (T4/T8), legal ✅ (T9), sin escrow/pagos/mensajería ✅ (fuera de alcance en todo el plan), migración prod segura ✅ (T10).
- **Placeholders:** ninguno — todo código completo.
- **Consistencia de tipos:** `requestContact(slug, message)` (T5) = firma usada en T6; `fetchMyContactRequests()/resolveContactRequest(id, status)` (T5) = usadas en T8; campos `openToOffers/declaredMrrUsd/monetizationNote` idénticos en Prisma (T1), Zod (T2), select (T3), tipos (T5) y componentes (T6/T7). `ContactRequestItem` (T5) coincide con el select del GET (T4).
- **Nota consciente:** la restricción `@@unique([productId, buyerId])` impide re-solicitar tras un DISMISSED — decisión anti-spam deliberada para v1.
