# Colaboraciones Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build "Colaboraciones", a two-sided listings board where any registered user posts "necesito X" (`NEEDS`) or "ofrezco X" (`OFFERS`) service listings, and other users request contact through Denveler's existing in-app contact-request pattern.

**Architecture:** New `Collaboration` and `CollaborationContactRequest` Prisma models, parallel to (not reusing) the existing `Product`/`ContactRequest` pair — same UX pattern (list → detail → request contact → author shares/dismisses → email), fully isolated so neither system can break the other. `ModerationReport` gets a third nullable target (`collaborationId`) alongside its existing `productId`/`commentId`. A daily cron hard-deletes listings older than 35 days.

**Tech Stack:** Next.js 14 App Router, TypeScript, Prisma 5/PostgreSQL, NextAuth (JWT sessions), Zod, next-intl (ES/EN/ZH), Vitest.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-17-colaboraciones-design.md` — this plan implements it exactly; do not add scope beyond it (no editing of published listings, no admin tab, no chat/DM, no payments).
- Neutral Latin American Spanish everywhere in copy — no Argentine voseo (see project CLAUDE.md).
- Prisma migrations are additive-only. Apply locally via `prisma db execute --stdin` + `prisma migrate resolve --applied` (this shell is non-interactive, so `prisma migrate dev` cannot be used). Production is applied by hand in Supabase's SQL editor, documented in its own `docs/MIGRACION-PROD-*.md` — never run `prisma migrate deploy` against prod directly.
- Every model follows the existing `@@map("snake_case_plural")` / field `@map("snake_case")` convention (see `prisma/schema.prisma`).
- API routes: `withErrorHandling` wrapper, `requireUser`/`requireAdmin`/`requireModerator` from `@/lib/auth`, Zod validation via `parseBody`, rate limiting via `checkRateLimit`. This codebase has **no automated route-handler tests** — routes are verified manually/E2E; only pure functions (Zod schemas, selectors) get Vitest unit tests. Follow that same split here.
- Frontend: `@/i18n/navigation`'s `Link`/`useRouter`/`usePathname` (not `next/navigation`) on every locale-aware page; `useTranslations`/`next-intl` for all copy; add every new string to `messages/es.json`, `messages/en.json`, `messages/zh.json` in the same task that introduces it.
- Never commit without running the affected tests first. Never `git push`/merge without the user's explicit go-ahead (established project workflow).

---

## File Structure

**New files:**
- `prisma/migrations/20260717130000_add_collaborations/migration.sql`
- `src/lib/collaborations.ts` — shared `collaborationSelect` Prisma select (mirrors `src/lib/products.ts`'s `productListSelect`)
- `src/lib/collaboration-cleanup.ts` + `src/lib/collaboration-cleanup.test.ts` — pure selector for the 35-day cron
- `src/lib/collaboration-emails.ts` — email templates (mirrors `src/lib/offer-emails.ts`)
- `src/app/api/collaborations/route.ts` — GET list, POST create
- `src/app/api/collaborations/[id]/route.ts` — GET detail, DELETE
- `src/app/api/collaborations/[id]/contact-requests/route.ts` — POST
- `src/app/api/collaboration-contact-requests/[id]/route.ts` — PATCH
- `src/app/api/me/collaborations/route.ts` — GET
- `src/app/api/me/collaboration-contact-requests/route.ts` — GET (received)
- `src/app/api/me/sent-collaboration-contact-requests/route.ts` — GET (sent)
- `src/app/api/cron/collaboration-cleanup/route.ts` — GET (cron)
- `src/components/collaboration/collaboration-card.tsx` — list item
- `src/components/collaboration/create-collaboration-dialog.tsx` — publish form (dialog, mirrors `report-button.tsx`'s dialog shape)
- `src/components/collaboration/collaboration-contact-card.tsx` — contact-request UI (mirrors `offer-card.tsx`)
- `src/components/collaboration/delete-collaboration-button.tsx` — author/admin delete
- `src/app/[locale]/colaboraciones/page.tsx` + `colaboraciones-client.tsx`
- `src/app/[locale]/colaboraciones/[id]/page.tsx` + `collaboration-detail-client.tsx`
- `src/components/profile/collaborations-section.tsx` — "Mis colaboraciones"
- `src/components/profile/collaboration-contact-requests-section.tsx` — recibidas
- `src/components/profile/sent-collaboration-contact-requests-section.tsx` — enviadas
- `docs/MIGRACION-PROD-COLABORACIONES.md` — written in the final task

**Modified files:**
- `prisma/schema.prisma` — new enum/models, `User` relations, `ModerationReport.collaborationId`
- `src/lib/validation.ts` — new schemas
- `src/lib/validation.test.ts` — new schema tests
- `src/lib/rate-limit.ts` — two new `RATE_LIMITS` entries
- `src/app/api/reports/route.ts` — accept `collaborationId`
- `vercel.json` — new cron entry
- `src/lib/frontend/types.ts` — new frontend types
- `src/lib/frontend/api-client.ts` — new client functions
- `src/lib/frontend/mock-data.ts` — demo-fallback mock data
- `src/components/layout/site-header.tsx` — new nav link
- `src/app/[locale]/profile/profile-client.tsx` — mount the 3 new sections
- `src/app/sitemap.ts` — collaboration URLs
- `src/app/admin/admin-client.tsx` — `ReportRow` target branch for collaborations
- `messages/es.json`, `messages/en.json`, `messages/zh.json` — `nav.collaborations` + new `collaborations` namespace

---

### Task 1: Schema Prisma + migración local

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260717130000_add_collaborations/migration.sql`

**Interfaces:**
- Produces: Prisma models `Collaboration`, `CollaborationContactRequest`, enum `CollaborationType` (`NEEDS` | `OFFERS`), `ModerationReport.collaborationId` (nullable). Every later task's Prisma queries depend on these exact field names.

- [ ] **Step 1: Add the new enum and models to `prisma/schema.prisma`**

Add this block near `model ContactRequest` (same file, any position — Prisma doesn't care about model order):

```prisma
enum CollaborationType {
  NEEDS // "necesito" — busca que alguien le resuelva algo
  OFFERS // "ofrezco" — puede resolverle algo a alguien
}

/// Tablón de anuncios de dos lados: alguien necesita un servicio, alguien
/// puede brindarlo. Sin edición post-publicación (borrar y republicar si
/// hace falta corregir algo) y sin estado de cierre: un anuncio vive hasta
/// que el autor, un admin, o el cron de 35 días lo borra.
model Collaboration {
  id          String            @id @default(cuid())
  authorId    String            @map("author_id")
  type        CollaborationType
  title       String
  description String
  tags        String[]
  createdAt   DateTime          @default(now()) @map("created_at")
  updatedAt   DateTime          @updatedAt @map("updated_at")

  author          User                           @relation(fields: [authorId], references: [id], onDelete: Cascade)
  contactRequests CollaborationContactRequest[]
  reports         ModerationReport[]

  @@index([type, createdAt])
  @@index([authorId])
  @@map("collaborations")
}

/// Solicitud de contacto sobre una Collaboration. Mismo patrón que
/// ContactRequest (productos) pero en tabla separada: el "quién resuelve"
/// es el autor del anuncio, no el maker de un producto, y mezclar ambos
/// flujos en una sola tabla obligaría a volver nullable productId en
/// ContactRequest y tocar todas sus queries existentes.
model CollaborationContactRequest {
  id              String               @id @default(cuid())
  collaborationId String               @map("collaboration_id")
  responderId     String               @map("responder_id")
  message         String
  status          ContactRequestStatus @default(PENDING)
  createdAt       DateTime             @default(now()) @map("created_at")

  collaboration Collaboration @relation(fields: [collaborationId], references: [id], onDelete: Cascade)
  responder     User          @relation(fields: [responderId], references: [id], onDelete: Cascade)

  // Un mismo usuario solo puede solicitar contacto una vez por anuncio.
  @@unique([collaborationId, responderId])
  @@index([collaborationId, status])
  @@map("collaboration_contact_requests")
}
```

Edit `model User` — add these two relation lines next to the existing `contactRequestsSent` / `savedProducts` lines:

```prisma
  collaborations                   Collaboration[]
  collaborationContactRequestsSent CollaborationContactRequest[]
```

Edit `model ModerationReport` — add a third nullable target next to `productId`/`commentId`:

```prisma
  collaborationId String? @map("collaboration_id")
```

and a matching relation line next to the existing `product`/`comment` relation lines:

```prisma
  collaboration Collaboration? @relation(fields: [collaborationId], references: [id], onDelete: Cascade)
```

- [ ] **Step 2: Write the migration SQL by hand**

Create `prisma/migrations/20260717130000_add_collaborations/migration.sql`:

```sql
-- CreateEnum
CREATE TYPE "CollaborationType" AS ENUM ('NEEDS', 'OFFERS');

-- CreateTable
CREATE TABLE "collaborations" (
    "id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "type" "CollaborationType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "tags" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collaborations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collaboration_contact_requests" (
    "id" TEXT NOT NULL,
    "collaboration_id" TEXT NOT NULL,
    "responder_id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "ContactRequestStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collaboration_contact_requests_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "moderation_reports" ADD COLUMN "collaboration_id" TEXT;

-- CreateIndex
CREATE INDEX "collaborations_type_created_at_idx" ON "collaborations"("type", "created_at");
CREATE INDEX "collaborations_author_id_idx" ON "collaborations"("author_id");
CREATE UNIQUE INDEX "collaboration_contact_requests_collaboration_id_responder_id_key" ON "collaboration_contact_requests"("collaboration_id", "responder_id");
CREATE INDEX "collaboration_contact_requests_collaboration_id_status_idx" ON "collaboration_contact_requests"("collaboration_id", "status");

-- AddForeignKey
ALTER TABLE "collaborations" ADD CONSTRAINT "collaborations_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "collaboration_contact_requests" ADD CONSTRAINT "collaboration_contact_requests_collaboration_id_fkey" FOREIGN KEY ("collaboration_id") REFERENCES "collaborations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "collaboration_contact_requests" ADD CONSTRAINT "collaboration_contact_requests_responder_id_fkey" FOREIGN KEY ("responder_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "moderation_reports" ADD CONSTRAINT "moderation_reports_collaboration_id_fkey" FOREIGN KEY ("collaboration_id") REFERENCES "collaborations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

- [ ] **Step 3: Apply it locally and regenerate the client**

Run (from `launchpad/launchpad/`):

```bash
cat prisma/migrations/20260717130000_add_collaborations/migration.sql | npx prisma db execute --stdin --schema prisma/schema.prisma
npx prisma migrate resolve --applied 20260717130000_add_collaborations
npx prisma generate
```

Expected: all three commands exit 0. `npx prisma studio` (optional, skip if no browser available) would show the two new empty tables.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors (this step only touches the schema + generated client, no app code yet).

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260717130000_add_collaborations
git commit -m "feat(colaboraciones): schema Prisma + migración local"
```

---

### Task 2: Validación Zod + rate limits (TDD)

**Files:**
- Modify: `src/lib/validation.ts`
- Modify: `src/lib/validation.test.ts`
- Modify: `src/lib/rate-limit.ts`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: `COLLABORATION_TYPES` (`["NEEDS", "OFFERS"] as const`), `createCollaborationSchema`, `listCollaborationsQuerySchema`, `createCollaborationContactRequestSchema` (all exported from `@/lib/validation`), extended `createReportSchema` (now accepts `collaborationId`), `RATE_LIMITS.collaborationCreate`, `RATE_LIMITS.collaborationContactRequest`. Task 3+ import all of these by exact name.

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/validation.test.ts` (match the file's existing `describe`/`it` style — open the file first to place these alongside the other schema tests):

```typescript
describe("createCollaborationSchema", () => {
  const valid = {
    type: "NEEDS" as const,
    title: "Busco quien automatice mi soporte",
    description: "Necesito integrar WhatsApp con Shopify y GPT-4o para atención al cliente automática.",
    tags: ["automatizacion", "whatsapp"],
  };

  it("accepts a valid NEEDS listing", () => {
    expect(createCollaborationSchema.parse(valid)).toMatchObject(valid);
  });

  it("accepts a valid OFFERS listing", () => {
    expect(createCollaborationSchema.parse({ ...valid, type: "OFFERS" }).type).toBe("OFFERS");
  });

  it("rejects an invalid type", () => {
    expect(() => createCollaborationSchema.parse({ ...valid, type: "MAYBE" })).toThrow();
  });

  it("rejects a title shorter than 5 chars", () => {
    expect(() => createCollaborationSchema.parse({ ...valid, title: "Hi" })).toThrow();
  });

  it("rejects a description shorter than 20 chars", () => {
    expect(() => createCollaborationSchema.parse({ ...valid, description: "muy corto" })).toThrow();
  });

  it("defaults tags to an empty array when omitted", () => {
    const { tags, ...withoutTags } = valid;
    expect(createCollaborationSchema.parse(withoutTags).tags).toEqual([]);
  });

  it("rejects more than 8 tags", () => {
    expect(() =>
      createCollaborationSchema.parse({ ...valid, tags: Array.from({ length: 9 }, (_, i) => `tag${i}`) })
    ).toThrow();
  });

  it("lowercases tags", () => {
    expect(createCollaborationSchema.parse({ ...valid, tags: ["Automatización"] }).tags).toEqual([
      "automatización",
    ]);
  });
});

describe("listCollaborationsQuerySchema", () => {
  it("defaults page/pageSize", () => {
    const parsed = listCollaborationsQuerySchema.parse({});
    expect(parsed.page).toBe(1);
    expect(parsed.pageSize).toBe(20);
  });

  it("accepts an optional type filter", () => {
    expect(listCollaborationsQuerySchema.parse({ type: "OFFERS" }).type).toBe("OFFERS");
  });

  it("rejects an invalid type filter", () => {
    expect(() => listCollaborationsQuerySchema.parse({ type: "NOPE" })).toThrow();
  });
});

describe("createCollaborationContactRequestSchema", () => {
  it("accepts a message of at least 20 chars", () => {
    const msg = "Hola, me interesa mucho tu propuesta, hablemos.";
    expect(createCollaborationContactRequestSchema.parse({ message: msg }).message).toBe(msg);
  });

  it("rejects a message shorter than 20 chars", () => {
    expect(() => createCollaborationContactRequestSchema.parse({ message: "muy corto" })).toThrow();
  });
});

describe("createReportSchema with collaborationId", () => {
  it("accepts a report targeting a collaboration", () => {
    const parsed = createReportSchema.parse({ collaborationId: "abc123", reason: "Contenido de spam" });
    expect(parsed.collaborationId).toBe("abc123");
  });

  it("rejects a report with both productId and collaborationId", () => {
    expect(() =>
      createReportSchema.parse({ productId: "p1", collaborationId: "c1", reason: "Motivo válido" })
    ).toThrow();
  });

  it("rejects a report with no target", () => {
    expect(() => createReportSchema.parse({ reason: "Motivo válido" })).toThrow();
  });
});
```

Add the corresponding imports at the top of `src/lib/validation.test.ts` (extend the existing `import { ... } from "./validation"` line with `createCollaborationSchema, listCollaborationsQuerySchema, createCollaborationContactRequestSchema, createReportSchema`).

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/validation.test.ts`
Expected: FAIL — `createCollaborationSchema is not defined` (and similar) for every new `describe` block.

- [ ] **Step 3: Implement the schemas**

In `src/lib/validation.ts`, add near `createContactRequestSchema` (around line 69):

```typescript
export const COLLABORATION_TYPES = ["NEEDS", "OFFERS"] as const;

export const createCollaborationSchema = z.object({
  type: z.enum(COLLABORATION_TYPES),
  title: z.string().trim().min(5).max(120),
  description: z.string().trim().min(20).max(2000),
  tags: z
    .array(z.string().trim().toLowerCase().min(2).max(30))
    .max(8)
    .default([]),
});

export const listCollaborationsQuerySchema = z.object({
  type: z.enum(COLLABORATION_TYPES).optional(),
  q: z.string().trim().min(1).max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export const createCollaborationContactRequestSchema = z.object({
  message: z.string().trim().min(20).max(1000),
});
```

Replace the existing `createReportSchema` (around line 100) with:

```typescript
export const createReportSchema = z
  .object({
    productId: z.string().optional(),
    commentId: z.string().optional(),
    collaborationId: z.string().optional(),
    reason: z.string().trim().min(5).max(1000),
    category: z.enum(REPORT_CATEGORIES).optional(),
  })
  .refine((v) => [v.productId, v.commentId, v.collaborationId].filter(Boolean).length === 1, {
    message: "Provide exactly one of productId, commentId, or collaborationId",
  });
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/validation.test.ts`
Expected: all tests PASS, including the pre-existing ones (this confirms the `createReportSchema` change didn't break the existing product/comment report tests).

- [ ] **Step 5: Add the rate limits**

In `src/lib/rate-limit.ts`, add two entries to the `RATE_LIMITS` object (next to `productCreate`/`contactRequest`):

```typescript
  collaborationCreate: { limit: 5, windowMs: 60 * 60_000 }, // 5 anuncios / hora / usuario
  collaborationContactRequest: { limit: 5, windowMs: 24 * 60 * 60_000 }, // 5 solicitudes / día / usuario
```

- [ ] **Step 6: Typecheck + run the full suite**

Run: `npx tsc --noEmit -p tsconfig.json && npx vitest run`
Expected: no type errors, all tests pass (107 previous + the new ones from this task).

- [ ] **Step 7: Commit**

```bash
git add src/lib/validation.ts src/lib/validation.test.ts src/lib/rate-limit.ts
git commit -m "feat(colaboraciones): validación Zod + rate limits (TDD)"
```

---

### Task 3: Backend — listar, crear, ver detalle y borrar

**Files:**
- Create: `src/lib/collaborations.ts`
- Create: `src/app/api/collaborations/route.ts`
- Create: `src/app/api/collaborations/[id]/route.ts`

**Interfaces:**
- Consumes: `createCollaborationSchema`, `listCollaborationsQuerySchema`, `COLLABORATION_TYPES` (Task 2); `requireUser`, `getSessionUser`, `ApiError` (`@/lib/auth`); `withErrorHandling`, `parseBody`, `ok`, `created`, `errorResponse` (`@/lib/api`); `checkRateLimit`, `RATE_LIMITS` (Task 2).
- Produces: `collaborationSelect` (exported from `@/lib/collaborations`, imported by both route files below and by Task 6's cron/report code if needed later). `GET /api/collaborations`, `POST /api/collaborations`, `GET /api/collaborations/:id`, `DELETE /api/collaborations/:id`. Response shape for a list item / detail (both use `collaborationSelect`):
  ```typescript
  {
    id: string; type: "NEEDS" | "OFFERS"; title: string; description: string;
    tags: string[]; createdAt: string; updatedAt: string;
    author: { id: string; name: string; avatarUrl: string | null };
  }
  ```
  List response: `{ items: CollaborationItem[]; page: number; pageSize: number; total: number; totalPages: number }`.

- [ ] **Step 1: Create `src/lib/collaborations.ts`**

Shared Prisma select, mirroring `src/lib/products.ts`'s `productListSelect` so it isn't redefined in every route file:

```typescript
export const collaborationSelect = {
  id: true,
  type: true,
  title: true,
  description: true,
  tags: true,
  createdAt: true,
  updatedAt: true,
  author: { select: { id: true, name: true, avatarUrl: true } },
} as const;
```

- [ ] **Step 2: Create `src/app/api/collaborations/route.ts`**

```typescript
export const dynamic = "force-dynamic";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { createCollaborationSchema, listCollaborationsQuerySchema } from "@/lib/validation";
import { collaborationSelect } from "@/lib/collaborations";
import { withErrorHandling, parseBody, ok, created, errorResponse } from "@/lib/api";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

/**
 * GET /api/collaborations — tablón público. Query: type? (NEEDS|OFFERS)
 * q? (busca en título/descripción/tags) page? pageSize?
 */
export const GET = withErrorHandling(async (req: Request) => {
  const url = new URL(req.url);
  const query = listCollaborationsQuerySchema.parse(Object.fromEntries(url.searchParams));

  const where: Prisma.CollaborationWhereInput = {};
  if (query.type) where.type = query.type;
  if (query.q) {
    where.OR = [
      { title: { contains: query.q, mode: "insensitive" } },
      { description: { contains: query.q, mode: "insensitive" } },
      { tags: { has: query.q.toLowerCase() } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.collaboration.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: collaborationSelect,
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.collaboration.count({ where }),
  ]);

  return ok({
    items,
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.ceil(total / query.pageSize),
  });
});

/**
 * POST /api/collaborations — publicar un anuncio (cualquier usuario autenticado).
 * Body: { type, title, description, tags? }
 */
export const POST = withErrorHandling(async (req: Request) => {
  const user = await requireUser();

  if (!(await checkRateLimit(`collaboration:${user.id}`, RATE_LIMITS.collaborationCreate))) {
    return errorResponse(429, "Estás publicando demasiado rápido. Intenta más tarde.");
  }

  const input = await parseBody(req, createCollaborationSchema);

  const collaboration = await prisma.collaboration.create({
    data: {
      authorId: user.id,
      type: input.type,
      title: input.title,
      description: input.description,
      tags: input.tags,
    },
    select: collaborationSelect,
  });

  return created(collaboration);
});
```

- [ ] **Step 3: Create `src/app/api/collaborations/[id]/route.ts`**

```typescript
export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { getSessionUser, ApiError } from "@/lib/auth";
import { collaborationSelect } from "@/lib/collaborations";
import { withErrorHandling, ok, noContent } from "@/lib/api";

/** GET /api/collaborations/:id — detalle público. */
export const GET = withErrorHandling(
  async (_req: Request, { params }: { params: { id: string } }) => {
    const collaboration = await prisma.collaboration.findUnique({
      where: { id: params.id },
      select: collaborationSelect,
    });
    if (!collaboration) throw new ApiError(404, "Colaboración no encontrada.");
    return ok(collaboration);
  }
);

/** DELETE /api/collaborations/:id — el autor o un admin/moderador la borran. */
export const DELETE = withErrorHandling(
  async (_req: Request, { params }: { params: { id: string } }) => {
    const user = await getSessionUser();
    if (!user) throw new ApiError(401, "Authentication required");

    const collaboration = await prisma.collaboration.findUnique({
      where: { id: params.id },
      select: { id: true, authorId: true },
    });
    if (!collaboration) throw new ApiError(404, "Colaboración no encontrada.");

    const isStaff = user.role === "ADMIN" || user.role === "MODERATOR";
    if (collaboration.authorId !== user.id && !isStaff) {
      throw new ApiError(403, "No puedes borrar esta colaboración.");
    }

    await prisma.collaboration.delete({ where: { id: collaboration.id } });
    return noContent();
  }
);
```

Note: `getSessionUser` (from `@/lib/auth`) returns `{ id, role, name, email } | null` — see `src/lib/auth.ts:94`. Confirm `noContent` is exported from `@/lib/api` (it is — `src/lib/api.ts:13`).

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors.

- [ ] **Step 5: Manual verification (no route-handler tests in this codebase — see Global Constraints)**

Start the dev server, sign in, and with `curl` or the browser devtools console (session cookie carried automatically):

```bash
curl -s http://localhost:3000/api/collaborations | head -c 300
```

Expected: `{"data":{"items":[],"page":1,"pageSize":20,"total":0,"totalPages":0}}` (empty — no data yet). Full end-to-end POST/GET/DELETE verification happens in Task 9 once the UI exists; this task's job is just to confirm the routes compile and the empty-list shape is correct.

- [ ] **Step 6: Commit**

```bash
git add src/lib/collaborations.ts src/app/api/collaborations
git commit -m "feat(colaboraciones): listar, crear, ver y borrar (backend)"
```

---

### Task 4: Backend — solicitud de contacto + emails

**Files:**
- Create: `src/lib/collaboration-emails.ts`
- Create: `src/app/api/collaborations/[id]/contact-requests/route.ts`
- Create: `src/app/api/collaboration-contact-requests/[id]/route.ts`

**Interfaces:**
- Consumes: `createCollaborationContactRequestSchema` (Task 2); `sendEmail` (`@/lib/email`); `requireUser`, `ApiError` (`@/lib/auth`).
- Produces: `sendCollaborationContactRequestNotification`, `sendCollaborationContactSharedNotification` (both from `@/lib/collaboration-emails`); `POST /api/collaborations/:id/contact-requests`; `PATCH /api/collaboration-contact-requests/:id`.

- [ ] **Step 1: Write the email templates**

Create `src/lib/collaboration-emails.ts`, mirroring `src/lib/offer-emails.ts` exactly (same `esc()` helper, same text+html dual-format pattern):

```typescript
import { sendEmail } from "./email";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Avisa al autor del anuncio que alguien pidió contacto. */
export async function sendCollaborationContactRequestNotification(input: {
  authorEmail: string;
  authorName: string;
  responderName: string;
  collaborationTitle: string;
  message: string;
  baseUrl: string;
}): Promise<void> {
  const subject = `Solicitud de contacto por "${input.collaborationTitle}" en Denveler`;
  const text = [
    `Hola ${input.authorName},`,
    ``,
    `${input.responderName} vio tu anuncio "${input.collaborationTitle}" y pidió tu contacto.`,
    `Su mensaje:`,
    `"${input.message}"`,
    ``,
    `Entra a tu perfil para compartir tu email o descartar la solicitud:`,
    `${input.baseUrl}/profile`,
  ].join("\n");
  await sendEmail({
    to: input.authorEmail,
    subject,
    text,
    html: `<p>Hola ${esc(input.authorName)},</p>
<p><strong>${esc(input.responderName)}</strong> vio tu anuncio <strong>${esc(input.collaborationTitle)}</strong> y pidió tu contacto.</p>
<blockquote>${esc(input.message)}</blockquote>
<p><a href="${input.baseUrl}/profile">Entra a tu perfil</a> para compartir tu email o descartar la solicitud.</p>`,
  });
}

/** Avisa a quien respondió que el autor aceptó compartir su email. */
export async function sendCollaborationContactSharedNotification(input: {
  responderEmail: string;
  responderName: string;
  authorName: string;
  authorEmail: string;
  collaborationTitle: string;
}): Promise<void> {
  const subject = `${input.authorName} compartió su contacto por "${input.collaborationTitle}"`;
  const text = [
    `Hola ${input.responderName},`,
    ``,
    `${input.authorName}, autor de "${input.collaborationTitle}", aceptó compartir su contacto contigo:`,
    input.authorEmail,
    ``,
    `Escríbele directamente para continuar la conversación. Denveler no participa en la negociación.`,
  ].join("\n");
  await sendEmail({
    to: input.responderEmail,
    subject,
    text,
    html: `<p>Hola ${esc(input.responderName)},</p>
<p><strong>${esc(input.authorName)}</strong>, autor de <strong>${esc(input.collaborationTitle)}</strong>, aceptó compartir su contacto contigo:</p>
<p><a href="mailto:${esc(input.authorEmail)}">${esc(input.authorEmail)}</a></p>
<p>Escríbele directamente para continuar la conversación. Denveler no participa en la negociación.</p>`,
  });
}
```

- [ ] **Step 2: Create `src/app/api/collaborations/[id]/contact-requests/route.ts`**

```typescript
export const dynamic = "force-dynamic";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser, ApiError } from "@/lib/auth";
import { createCollaborationContactRequestSchema } from "@/lib/validation";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { sendCollaborationContactRequestNotification } from "@/lib/collaboration-emails";
import { withErrorHandling, parseBody, created, errorResponse } from "@/lib/api";

/**
 * POST /api/collaborations/:id/contact-requests — pedir contacto al autor
 * de un anuncio. 1 por usuario por anuncio (unique en DB).
 */
export const POST = withErrorHandling(
  async (req: Request, { params }: { params: { id: string } }) => {
    const user = await requireUser();

    if (
      !(await checkRateLimit(
        `collaborationContact:${user.id}`,
        RATE_LIMITS.collaborationContactRequest
      ))
    ) {
      return errorResponse(429, "Demasiadas solicitudes por hoy. Intenta mañana.");
    }

    const collaboration = await prisma.collaboration.findUnique({
      where: { id: params.id },
      select: { id: true, title: true, authorId: true, author: { select: { name: true, email: true } } },
    });
    if (!collaboration) throw new ApiError(404, "Colaboración no encontrada.");

    if (collaboration.authorId === user.id) {
      throw new ApiError(400, "No puedes solicitar contacto por tu propio anuncio.");
    }

    const { message } = await parseBody(req, createCollaborationContactRequestSchema);

    let request;
    try {
      request = await prisma.collaborationContactRequest.create({
        data: { collaborationId: collaboration.id, responderId: user.id, message },
        select: { id: true, status: true, createdAt: true },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new ApiError(409, "Ya solicitaste contacto por esta colaboración.");
      }
      throw err;
    }

    try {
      await sendCollaborationContactRequestNotification({
        authorEmail: collaboration.author.email,
        authorName: collaboration.author.name,
        responderName: user.name,
        collaborationTitle: collaboration.title,
        message,
        baseUrl: process.env.NEXTAUTH_URL ?? "http://localhost:3000",
      });
    } catch (err) {
      console.error("[collaboration-contact-request] email al autor falló:", err);
    }

    return created(request);
  }
);
```

- [ ] **Step 3: Create `src/app/api/collaboration-contact-requests/[id]/route.ts`**

```typescript
export const dynamic = "force-dynamic";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, ApiError } from "@/lib/auth";
import { sendCollaborationContactSharedNotification } from "@/lib/collaboration-emails";
import { withErrorHandling, parseBody, ok } from "@/lib/api";

const resolveSchema = z.object({ status: z.enum(["SHARED", "DISMISSED"]) });

/**
 * PATCH /api/collaboration-contact-requests/:id — el autor del anuncio
 * comparte su email (SHARED) o descarta la solicitud (DISMISSED).
 */
export const PATCH = withErrorHandling(
  async (req: Request, { params }: { params: { id: string } }) => {
    const user = await requireUser();
    const { status } = await parseBody(req, resolveSchema);

    const request = await prisma.collaborationContactRequest.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        status: true,
        responder: { select: { name: true, email: true } },
        collaboration: {
          select: { title: true, authorId: true, author: { select: { name: true, email: true } } },
        },
      },
    });
    if (!request || request.collaboration.authorId !== user.id) {
      throw new ApiError(404, "Solicitud no encontrada.");
    }
    if (request.status !== "PENDING") {
      throw new ApiError(400, "Esta solicitud ya fue resuelta.");
    }

    const updated = await prisma.collaborationContactRequest.update({
      where: { id: request.id },
      data: { status },
      select: { id: true, status: true },
    });

    if (status === "SHARED") {
      try {
        await sendCollaborationContactSharedNotification({
          responderEmail: request.responder.email,
          responderName: request.responder.name,
          authorName: request.collaboration.author.name,
          authorEmail: request.collaboration.author.email,
          collaborationTitle: request.collaboration.title,
        });
      } catch (err) {
        console.error("[collaboration-contact-request] email al responder falló:", err);
      }
    }

    return ok(updated);
  }
);
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/collaboration-emails.ts src/app/api/collaborations/[id]/contact-requests src/app/api/collaboration-contact-requests
git commit -m "feat(colaboraciones): solicitud de contacto + emails (backend)"
```

---

### Task 5: Backend — endpoints "/me"

**Files:**
- Create: `src/app/api/me/collaborations/route.ts`
- Create: `src/app/api/me/collaboration-contact-requests/route.ts`
- Create: `src/app/api/me/sent-collaboration-contact-requests/route.ts`

**Interfaces:**
- Consumes: `requireUser` (`@/lib/auth`); `withErrorHandling`, `ok` (`@/lib/api`).
- Produces: `GET /api/me/collaborations`, `GET /api/me/collaboration-contact-requests`, `GET /api/me/sent-collaboration-contact-requests`.

- [ ] **Step 1: Create `src/app/api/me/collaborations/route.ts`**

```typescript
export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { withErrorHandling, ok } from "@/lib/api";

/** GET /api/me/collaborations — mis anuncios publicados. */
export const GET = withErrorHandling(async () => {
  const user = await requireUser();

  const collaborations = await prisma.collaboration.findMany({
    where: { authorId: user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, type: true, title: true, createdAt: true },
  });

  return ok(collaborations);
});
```

- [ ] **Step 2: Create `src/app/api/me/collaboration-contact-requests/route.ts`**

```typescript
export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { withErrorHandling, ok } from "@/lib/api";

/** GET /api/me/collaboration-contact-requests — solicitudes recibidas por MIS anuncios. */
export const GET = withErrorHandling(async () => {
  const user = await requireUser();

  const requests = await prisma.collaborationContactRequest.findMany({
    where: { collaboration: { authorId: user.id } },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      message: true,
      status: true,
      createdAt: true,
      responder: { select: { name: true } },
      collaboration: { select: { id: true, title: true } },
    },
  });

  return ok(requests);
});
```

- [ ] **Step 3: Create `src/app/api/me/sent-collaboration-contact-requests/route.ts`**

```typescript
export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { withErrorHandling, ok } from "@/lib/api";

/** GET /api/me/sent-collaboration-contact-requests — solicitudes que YO envié. */
export const GET = withErrorHandling(async () => {
  const user = await requireUser();

  const requests = await prisma.collaborationContactRequest.findMany({
    where: { responderId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      message: true,
      status: true,
      createdAt: true,
      collaboration: { select: { id: true, title: true } },
    },
  });

  return ok(requests);
});
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/me/collaborations src/app/api/me/collaboration-contact-requests src/app/api/me/sent-collaboration-contact-requests
git commit -m "feat(colaboraciones): endpoints /me (backend)"
```

---

### Task 6: Backend — reportar + cron de limpieza a los 35 días

**Files:**
- Modify: `src/app/api/reports/route.ts`
- Create: `src/lib/collaboration-cleanup.ts`
- Create: `src/lib/collaboration-cleanup.test.ts`
- Create: `src/app/api/cron/collaboration-cleanup/route.ts`
- Modify: `vercel.json`

**Interfaces:**
- Consumes: `createReportSchema` (Task 2, already extended).
- Produces: `selectExpiredCollaborations` (pure function, `@/lib/collaboration-cleanup`), `GET /api/cron/collaboration-cleanup`. `POST /api/reports` now accepts `collaborationId`.

- [ ] **Step 1: Extend `src/app/api/reports/route.ts`'s POST handler**

In the `POST` handler, after the existing `if (input.commentId) { ... }` block, add:

```typescript
  if (input.collaborationId) {
    const exists = await prisma.collaboration.findUnique({
      where: { id: input.collaborationId },
      select: { id: true },
    });
    if (!exists) throw new ApiError(404, "Collaboration not found");
  }
```

In the `prisma.moderationReport.create({ data: { ... } })` call, add `collaborationId: input.collaborationId ?? null,` next to the existing `commentId: input.commentId ?? null,` line.

In the `GET` handler's `select`, add `collaboration: { select: { id: true, title: true } },` next to the existing `comment: { select: { id: true, body: true } },` line.

- [ ] **Step 2: Write the failing test for the cleanup selector**

Create `src/lib/collaboration-cleanup.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { selectExpiredCollaborations, COLLABORATION_MAX_AGE_DAYS } from "./collaboration-cleanup";

const DAY_MS = 24 * 60 * 60 * 1000;
const now = new Date("2026-07-17T00:00:00Z");

describe("selectExpiredCollaborations", () => {
  it("selects a collaboration exactly at the age threshold", () => {
    const createdAt = new Date(now.getTime() - COLLABORATION_MAX_AGE_DAYS * DAY_MS);
    expect(selectExpiredCollaborations([{ id: "1", createdAt }], now)).toHaveLength(1);
  });

  it("selects a collaboration older than the threshold", () => {
    const createdAt = new Date(now.getTime() - (COLLABORATION_MAX_AGE_DAYS + 5) * DAY_MS);
    expect(selectExpiredCollaborations([{ id: "1", createdAt }], now)).toHaveLength(1);
  });

  it("excludes a collaboration younger than the threshold", () => {
    const createdAt = new Date(now.getTime() - (COLLABORATION_MAX_AGE_DAYS - 1) * DAY_MS);
    expect(selectExpiredCollaborations([{ id: "1", createdAt }], now)).toHaveLength(0);
  });

  it("returns an empty array for an empty input", () => {
    expect(selectExpiredCollaborations([], now)).toEqual([]);
  });

  it("preserves extra caller fields (generic)", () => {
    const createdAt = new Date(now.getTime() - (COLLABORATION_MAX_AGE_DAYS + 1) * DAY_MS);
    const result = selectExpiredCollaborations([{ id: "1", createdAt, title: "x" }], now);
    expect(result[0]?.title).toBe("x");
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/lib/collaboration-cleanup.test.ts`
Expected: FAIL — `Cannot find module './collaboration-cleanup'`.

- [ ] **Step 4: Implement the pure selector**

Create `src/lib/collaboration-cleanup.ts`:

```typescript
/**
 * Selección de colaboraciones a borrar (más de 35 días de antigüedad).
 * Función pura: la consulta a la base y el borrado viven en el endpoint del
 * cron. Mismo patrón que src/lib/offer-nudge.ts.
 */

export const COLLABORATION_MAX_AGE_DAYS = 35;

export interface ExpirableCollaboration {
  createdAt: Date;
}

/** Filtra las colaboraciones con más de COLLABORATION_MAX_AGE_DAYS de antigüedad. */
export function selectExpiredCollaborations<T extends ExpirableCollaboration>(
  collaborations: T[],
  now: Date
): T[] {
  const cutoff = now.getTime() - COLLABORATION_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  return collaborations.filter((c) => c.createdAt.getTime() <= cutoff);
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/lib/collaboration-cleanup.test.ts`
Expected: all 5 tests PASS.

- [ ] **Step 6: Create the cron route**

Create `src/app/api/cron/collaboration-cleanup/route.ts`:

```typescript
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/auth";
import { withErrorHandling, ok } from "@/lib/api";
import { selectExpiredCollaborations } from "@/lib/collaboration-cleanup";

/**
 * GET /api/cron/collaboration-cleanup — corre a diario vía Vercel Cron.
 * Borra (hard delete) las colaboraciones con más de 35 días de antigüedad.
 * Protegido con CRON_SECRET igual que /api/cron/offer-nudge.
 */
export const GET = withErrorHandling(async (req: Request) => {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    throw new ApiError(401, "Unauthorized");
  }

  const collaborations = await prisma.collaboration.findMany({
    select: { id: true, createdAt: true },
  });

  const expired = selectExpiredCollaborations(collaborations, new Date());

  if (expired.length > 0) {
    await prisma.collaboration.deleteMany({
      where: { id: { in: expired.map((c) => c.id) } },
    });
  }

  return ok({ checked: collaborations.length, deleted: expired.length });
});
```

- [ ] **Step 7: Add the cron schedule**

Edit `vercel.json` — add a third entry to the `crons` array:

```json
{
  "crons": [
    { "path": "/api/cron/offer-nudge", "schedule": "0 14 * * *" },
    { "path": "/api/cron/top-month-badges", "schedule": "0 6 1 * *" },
    { "path": "/api/cron/collaboration-cleanup", "schedule": "0 5 * * *" }
  ]
}
```

- [ ] **Step 8: Typecheck + run the full suite**

Run: `npx tsc --noEmit -p tsconfig.json && npx vitest run`
Expected: no type errors, all tests pass.

- [ ] **Step 9: Commit**

```bash
git add src/app/api/reports/route.ts src/lib/collaboration-cleanup.ts src/lib/collaboration-cleanup.test.ts src/app/api/cron/collaboration-cleanup vercel.json
git commit -m "feat(colaboraciones): reportar + cron de limpieza a los 35 días (TDD)"
```

---

### Task 7: Tipos frontend + api-client

**Files:**
- Modify: `src/lib/frontend/types.ts`
- Modify: `src/lib/frontend/api-client.ts`
- Modify: `src/lib/frontend/mock-data.ts`

**Interfaces:**
- Consumes: nothing new (mirrors the backend response shapes from Tasks 3–5).
- Produces: types `CollaborationType`, `CollaborationItem`, `CollaborationContactRequestItem`, `CollaborationListQuery`, `CreateCollaborationInput`; functions `fetchCollaborations`, `fetchCollaboration`, `createCollaboration`, `deleteCollaboration`, `requestCollaborationContact`, `fetchMyCollaborations`, `fetchMyCollaborationContactRequests`, `fetchSentCollaborationContactRequests`, `resolveCollaborationContactRequest` (all from `@/lib/frontend/api-client`). Task 8+ import these by exact name.

- [ ] **Step 1: Add types to `src/lib/frontend/types.ts`**

Add near the existing `ContactRequestStatus`/`ContactRequestItem` types:

```typescript
export type CollaborationType = "NEEDS" | "OFFERS";

export interface CollaborationItem {
  id: string;
  type: CollaborationType;
  title: string;
  description: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  author: { id: string; name: string; avatarUrl: string | null };
}

export interface CollaborationListQuery {
  type?: CollaborationType;
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateCollaborationInput {
  type: CollaborationType;
  title: string;
  description: string;
  tags?: string[];
}

export interface CollaborationContactRequestItem {
  id: string;
  message: string;
  status: ContactRequestStatus;
  createdAt: string;
  responder?: { name: string };
  collaboration: { id: string; title: string };
}
```

(`ContactRequestStatus` already exists in this file — reuse it, don't redeclare.)

- [ ] **Step 2: Add client functions to `src/lib/frontend/api-client.ts`**

Add a new section, mirroring the "Puente de compraventa" block (near line 184), and add the new types to the existing `import type { ... } from "./types"` line at the top of the file:

```typescript
// ---------------------------------------------------------------------------
// Colaboraciones
// ---------------------------------------------------------------------------

/** GET /api/collaborations */
export function fetchCollaborations(query: CollaborationListQuery = {}) {
  return request<Paginated<CollaborationItem>>(
    `/api/collaborations${qs(query as Record<string, string | number | boolean | undefined>)}`
  );
}

/** GET /api/collaborations/:id */
export function fetchCollaboration(id: string) {
  return request<CollaborationItem>(`/api/collaborations/${encodeURIComponent(id)}`);
}

/** POST /api/collaborations (auth) — publicar un anuncio. */
export function createCollaboration(input: CreateCollaborationInput) {
  return request<CollaborationItem>(`/api/collaborations`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** DELETE /api/collaborations/:id (auth) — autor o admin/moderador. */
export function deleteCollaboration(id: string) {
  return request<void>(`/api/collaborations/${encodeURIComponent(id)}`, { method: "DELETE" });
}

/** POST /api/collaborations/:id/contact-requests (auth) — pedir contacto al autor. */
export function requestCollaborationContact(id: string, message: string) {
  return request<{ id: string; status: string; createdAt: string }>(
    `/api/collaborations/${encodeURIComponent(id)}/contact-requests`,
    { method: "POST", body: JSON.stringify({ message }) }
  );
}

/** GET /api/me/collaborations (auth) — mis anuncios publicados. */
export function fetchMyCollaborations() {
  return request<{ id: string; type: CollaborationType; title: string; createdAt: string }[]>(
    `/api/me/collaborations`
  );
}

/** GET /api/me/collaboration-contact-requests (auth) — solicitudes recibidas. */
export function fetchMyCollaborationContactRequests() {
  return request<CollaborationContactRequestItem[]>(`/api/me/collaboration-contact-requests`);
}

/** GET /api/me/sent-collaboration-contact-requests (auth) — solicitudes que YO envié. */
export function fetchSentCollaborationContactRequests() {
  return request<CollaborationContactRequestItem[]>(`/api/me/sent-collaboration-contact-requests`);
}

/** PATCH /api/collaboration-contact-requests/:id (auth) — compartir email o descartar. */
export function resolveCollaborationContactRequest(id: string, status: "SHARED" | "DISMISSED") {
  return request<{ id: string; status: string }>(
    `/api/collaboration-contact-requests/${encodeURIComponent(id)}`,
    { method: "PATCH", body: JSON.stringify({ status }) }
  );
}
```

- [ ] **Step 3: Add demo-fallback mock data**

Open `src/lib/frontend/mock-data.ts`, find the existing `mockProductDetails`/`mockReports`-style arrays, and add (matching whatever export-array convention that file already uses):

```typescript
export const mockCollaborations: CollaborationItem[] = [
  {
    id: "mock-collab-1",
    type: "NEEDS",
    title: "Necesito automatizar soporte al cliente",
    description: "Busco a alguien que integre WhatsApp + GPT-4o + Shopify para atención automática 24/7.",
    tags: ["automatizacion", "whatsapp", "ia"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    author: { id: "mock-user-1", name: "Ana Maker", avatarUrl: null },
  },
  {
    id: "mock-collab-2",
    type: "OFFERS",
    title: "Ofrezco diseño UI/UX para SaaS",
    description: "5 años diseñando dashboards y onboarding para productos B2B. Portfolio disponible.",
    tags: ["diseño", "ui", "ux"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    author: { id: "mock-user-2", name: "Luis Diseñador", avatarUrl: null },
  },
];
```

Add `CollaborationItem` to that file's existing `import type { ... } from "./types"` line.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/frontend/types.ts src/lib/frontend/api-client.ts src/lib/frontend/mock-data.ts
git commit -m "feat(colaboraciones): tipos frontend + api-client"
```

---

### Task 8: UI pública — listado y publicar

**Files:**
- Create: `src/components/collaboration/collaboration-card.tsx`
- Create: `src/components/collaboration/create-collaboration-dialog.tsx`
- Create: `src/app/[locale]/colaboraciones/page.tsx`
- Create: `src/app/[locale]/colaboraciones/colaboraciones-client.tsx`
- Modify: `messages/es.json`, `messages/en.json`, `messages/zh.json`

**Interfaces:**
- Consumes: `fetchCollaborations`, `createCollaboration` (Task 7); `useApi`, `useMutation` (`@/lib/frontend/hooks`); `Tabs`, `Input`, `Dialog`, `Textarea`, `Select`, `Button`, `Card` (`@/components/ui/*`); `Link`, `useRouter` (`@/i18n/navigation`).
- Produces: route `/colaboraciones`, reusable `<CollaborationCard>` (consumed again by Task 10's profile section).

- [ ] **Step 1: Add the `collaborations` translation namespace to `messages/es.json`**

Add a new top-level key (alongside `collections`, `launches`, etc.):

```json
"collaborations": {
  "metaTitle": "Colaboraciones",
  "metaDescription": "Conectá con quien necesita un servicio o con quien puede brindarlo.",
  "heading": "Colaboraciones",
  "subheading": "Conectá con quien necesita un servicio o con quien puede brindarlo.",
  "tabAll": "Todos",
  "tabNeeds": "Necesito",
  "tabOffers": "Ofrezco",
  "search": "Buscar",
  "searchPlaceholder": "Buscar por título o tag…",
  "publish": "Publicar colaboración",
  "emptyTitle": "Todavía no hay colaboraciones",
  "emptyDescription": "Sé el primero en publicar un anuncio.",
  "typeNeeds": "Necesito",
  "typeOffers": "Ofrezco",
  "createDialogTitle": "Publicar una colaboración",
  "createDialogDescription": "Contá qué necesitás o qué podés ofrecer. No se puede editar después de publicar.",
  "fieldType": "Tipo",
  "fieldTitle": "Título",
  "fieldTitlePlaceholder": "Ej.: Necesito automatizar soporte al cliente",
  "fieldDescription": "Descripción",
  "fieldDescriptionPlaceholder": "Contá los detalles: qué necesitás, con qué herramientas, presupuesto si aplica…",
  "fieldTags": "Tags (separados por coma)",
  "fieldTagsPlaceholder": "automatización, whatsapp, ia",
  "cancel": "Cancelar",
  "publishing": "Publicando…",
  "publishAction": "Publicar",
  "errorGeneric": "No pudimos publicar tu colaboración."
}
```

Add `"collaborations": "Colaboraciones"` to the existing `nav` namespace, next to `"collections": "Colecciones"`.

Repeat both additions in `messages/en.json` (English copy) and `messages/zh.json` (Chinese copy), same key structure, translated content. Validate all three files after editing:

```bash
python3 -c "import json; json.load(open('messages/es.json')); json.load(open('messages/en.json')); json.load(open('messages/zh.json')); print('ok')"
```

- [ ] **Step 2: Create `src/components/collaboration/collaboration-card.tsx`**

```typescript
"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CollaborationItem } from "@/lib/frontend/types";

export function CollaborationCard({ collaboration }: { collaboration: CollaborationItem }) {
  const t = useTranslations("collaborations");
  return (
    <Link href={`/colaboraciones/${collaboration.id}`}>
      <Card className="transition-shadow hover:shadow-md">
        <CardContent className="space-y-2 p-5">
          <div className="flex items-center gap-2">
            <Badge variant={collaboration.type === "NEEDS" ? "warning" : "success"}>
              {collaboration.type === "NEEDS" ? t("typeNeeds") : t("typeOffers")}
            </Badge>
            <span className="text-xs text-muted-foreground">{collaboration.author.name}</span>
          </div>
          <h3 className="font-bold">{collaboration.title}</h3>
          <p className="line-clamp-2 text-sm text-muted-foreground">{collaboration.description}</p>
          {collaboration.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {collaboration.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
```

- [ ] **Step 3: Create `src/components/collaboration/create-collaboration-dialog.tsx`**

```typescript
"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { createCollaboration } from "@/lib/frontend/api-client";
import { useMutation } from "@/lib/frontend/hooks";
import type { CollaborationType } from "@/lib/frontend/types";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";

export function CreateCollaborationDialog({ onCreated }: { onCreated: () => void }) {
  const t = useTranslations("collaborations");
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<CollaborationType>("NEEDS");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const { mutate, submitting, error, clearError } = useMutation(createCollaboration);

  function openDialog() {
    clearError();
    setType("NEEDS");
    setTitle("");
    setDescription("");
    setTags("");
    setOpen(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const parsedTags = tags
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const result = await mutate({ type, title: title.trim(), description: description.trim(), tags: parsedTags });
    if (result) {
      setOpen(false);
      onCreated();
    }
  }

  return (
    <>
      <Button onClick={openDialog} className={buttonVariants({ variant: "gradient" })}>
        <Plus className="h-4 w-4" aria-hidden />
        {t("publish")}
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={t("createDialogTitle")}
        description={t("createDialogDescription")}
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="collab-type">{t("fieldType")}</Label>
            <Select id="collab-type" value={type} onChange={(e) => setType(e.target.value as CollaborationType)}>
              <option value="NEEDS">{t("typeNeeds")}</option>
              <option value="OFFERS">{t("typeOffers")}</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="collab-title">{t("fieldTitle")}</Label>
            <Input
              id="collab-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("fieldTitlePlaceholder")}
              maxLength={120}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="collab-description">{t("fieldDescription")}</Label>
            <Textarea
              id="collab-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("fieldDescriptionPlaceholder")}
              className="min-h-[120px]"
              maxLength={2000}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="collab-tags">{t("fieldTags")}</Label>
            <Input
              id="collab-tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder={t("fieldTagsPlaceholder")}
            />
          </div>
          {error && <Alert variant="destructive">{error}</Alert>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={submitting || title.trim().length < 5 || description.trim().length < 20}>
              {submitting ? t("publishing") : t("publishAction")}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
```

- [ ] **Step 4: Create `src/app/[locale]/colaboraciones/page.tsx`**

```typescript
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ColaboracionesClient } from "./colaboraciones-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("collaborations");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default function ColaboracionesPage() {
  return <ColaboracionesClient />;
}
```

- [ ] **Step 5: Create `src/app/[locale]/colaboraciones/colaboraciones-client.tsx`**

```typescript
"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { fetchCollaborations } from "@/lib/frontend/api-client";
import { mockCollaborations } from "@/lib/frontend/mock-data";
import { useApi } from "@/lib/frontend/hooks";
import type { CollaborationType } from "@/lib/frontend/types";
import { PageHeader } from "@/components/layout/page-header";
import { Tabs } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/states";
import { Skeleton } from "@/components/ui/skeleton";
import { CollaborationCard } from "@/components/collaboration/collaboration-card";
import { CreateCollaborationDialog } from "@/components/collaboration/create-collaboration-dialog";

type Tab = "all" | "NEEDS" | "OFFERS";

export function ColaboracionesClient() {
  const t = useTranslations("collaborations");
  const [tab, setTab] = useState<Tab>("all");
  const [q, setQ] = useState("");

  const TAB_ITEMS: { value: Tab; label: string }[] = [
    { value: "all", label: t("tabAll") },
    { value: "NEEDS", label: t("tabNeeds") },
    { value: "OFFERS", label: t("tabOffers") },
  ];

  const query = useMemo(
    () => ({
      type: tab === "all" ? undefined : (tab as CollaborationType),
      q: q || undefined,
      pageSize: 50,
    }),
    [tab, q]
  );

  const { data, loading, error, refetch } = useApi(() => fetchCollaborations(query), {
    fallback: () => ({ items: mockCollaborations, page: 1, pageSize: 50, total: mockCollaborations.length, totalPages: 1 }),
    deps: [tab, q],
  });

  const onCreated = useCallback(() => refetch(), [refetch]);

  return (
    <div className="container-page space-y-8 py-10">
      <PageHeader
        title={t("heading")}
        description={t("subheading")}
        actions={<CreateCollaborationDialog onCreated={onCreated} />}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs items={TAB_ITEMS} value={tab} onChange={(v) => setTab(v as Tab)} />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("searchPlaceholder")}
          aria-label={t("search")}
          className="sm:w-64"
        />
      </div>

      {loading && (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-2xl" aria-busy="true" />
          ))}
        </div>
      )}

      {!loading && error && <EmptyState title={t("errorGeneric")} description={error} />}

      {!loading && !error && (data?.items.length ?? 0) === 0 && (
        <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
      )}

      {!loading && !error && (data?.items.length ?? 0) > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {data!.items.map((c) => (
            <CollaborationCard key={c.id} collaboration={c} />
          ))}
        </div>
      )}
    </div>
  );
}
```

Note: verify `EmptyState`'s exact prop names (`title`/`description`, possibly also `action`) and `Tabs`'s exact prop names (`items`/`value`/`onChange`) against `src/components/ui/states.tsx` and `src/components/ui/tabs.tsx` before writing this file — they were confirmed via `src/app/[locale]/launches/launches-client.tsx` usage earlier in this session, but re-check signatures if the component files differ.

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors.

- [ ] **Step 7: Manual verification**

Start the dev server (clear `.next` first if it was interleaved with a build — see project's known `.next` cache-corruption issue), sign in, go to `/colaboraciones`, publish one `NEEDS` and one `OFFERS` listing, confirm both appear, confirm the tab filter and search work.

- [ ] **Step 8: Commit**

```bash
git add src/components/collaboration/collaboration-card.tsx src/components/collaboration/create-collaboration-dialog.tsx "src/app/[locale]/colaboraciones" messages/es.json messages/en.json messages/zh.json
git commit -m "feat(colaboraciones): UI pública — listado y publicar"
```

---

### Task 9: UI pública — detalle, contacto, reportar, borrar

**Files:**
- Create: `src/components/collaboration/collaboration-contact-card.tsx`
- Create: `src/components/collaboration/delete-collaboration-button.tsx`
- Create: `src/app/[locale]/colaboraciones/[id]/page.tsx`
- Create: `src/app/[locale]/colaboraciones/[id]/collaboration-detail-client.tsx`
- Modify: `messages/es.json`, `messages/en.json`, `messages/zh.json`
- Modify: `src/lib/validation.ts` (already has `collaborationId` support from Task 2 — no change needed here, confirming only)

**Interfaces:**
- Consumes: `fetchCollaboration`, `requestCollaborationContact`, `deleteCollaboration` (Task 7); `createReport` (existing, from `report-button.tsx`'s import); `useRouter` (`@/i18n/navigation`).
- Produces: route `/colaboraciones/[id]`.

- [ ] **Step 1: Add translation keys**

Add to the `collaborations` namespace in `messages/es.json` (and `en`/`zh` equivalents):

```json
"requestContact": "Solicitar contacto",
"loginToRequest": "Inicia sesión para solicitar contacto",
"requestSent": "Solicitud enviada. El autor decidirá si comparte su contacto.",
"contactDialogTitle": "Solicitar contacto",
"contactDialogDescription": "Contale al autor quién sos y por qué te interesa. Si acepta, vas a recibir su email.",
"messagePlaceholder": "Ej.: Vi tu anuncio y me interesa conversar, tengo experiencia en…",
"minChars": "Mínimo 20 caracteres. {count}/1000",
"sendRequest": "Enviar solicitud",
"sending": "Enviando…",
"cancel": "Cancelar",
"deleteTitle": "Borrar colaboración",
"deleteConfirm": "¿Seguro que querés borrar este anuncio? No se puede deshacer.",
"deleteAction": "Borrar",
"deleting": "Borrando…",
"notFoundTitle": "Esta colaboración ya no existe",
"notFoundDescription": "Puede que el autor la haya borrado o que haya expirado.",
"backToList": "Volver a Colaboraciones"
```

Validate all three JSON files after editing (same `python3 -c "import json; ..."` check as Task 8).

- [ ] **Step 2: Create `src/components/collaboration/collaboration-contact-card.tsx`**

```typescript
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { Handshake } from "lucide-react";
import { ApiClientError, requestCollaborationContact } from "@/lib/frontend/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { Link } from "@/i18n/navigation";

export function CollaborationContactCard({
  collaborationId,
  authorId,
}: {
  collaborationId: string;
  authorId: string;
}) {
  const t = useTranslations("collaborations");
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const isAuthor = session?.user?.id === authorId;
  if (isAuthor) return null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await requestCollaborationContact(collaborationId, message.trim());
      setSent(true);
      setOpen(false);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t("errorGeneric"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="border-primary/25">
      <CardContent className="space-y-3 p-5">
        <p className="flex items-center gap-2 text-sm font-bold">
          <Handshake className="h-4 w-4 text-primary" aria-hidden />
          {t("requestContact")}
        </p>

        {sent ? (
          <Alert>{t("requestSent")}</Alert>
        ) : status === "authenticated" ? (
          <Button size="sm" className="w-full" onClick={() => setOpen(true)}>
            {t("requestContact")}
          </Button>
        ) : (
          <Link href="/login" className={buttonVariants({ variant: "outline", size: "sm" }) + " w-full"}>
            {t("loginToRequest")}
          </Link>
        )}
      </CardContent>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={t("contactDialogTitle")}
        description={t("contactDialogDescription")}
      >
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t("messagePlaceholder")}
            className="min-h-[120px]"
            maxLength={1000}
            required
          />
          <p className="text-xs text-muted-foreground">{t("minChars", { count: message.trim().length })}</p>
          {error && <Alert variant="destructive">{error}</Alert>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={busy || message.trim().length < 20}>
              {busy ? t("sending") : t("sendRequest")}
            </Button>
          </div>
        </form>
      </Dialog>
    </Card>
  );
}
```

- [ ] **Step 3: Create `src/components/collaboration/delete-collaboration-button.tsx`**

```typescript
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { Trash2 } from "lucide-react";
import { deleteCollaboration } from "@/lib/frontend/api-client";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useRouter } from "@/i18n/navigation";

export function DeleteCollaborationButton({
  collaborationId,
  authorId,
}: {
  collaborationId: string;
  authorId: string;
}) {
  const t = useTranslations("collaborations");
  const { data: session } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const isStaff = session?.user?.role === "ADMIN" || session?.user?.role === "MODERATOR";
  const canDelete = session?.user?.id === authorId || isStaff;
  if (!canDelete) return null;

  async function onDelete() {
    setBusy(true);
    try {
      await deleteCollaboration(collaborationId);
      router.push("/colaboraciones");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setOpen(true)}>
        <Trash2 className="h-3.5 w-3.5" aria-hidden />
        {t("deleteTitle")}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={t("deleteTitle")} description={t("deleteConfirm")}>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {t("cancel")}
          </Button>
          <Button variant="destructive" disabled={busy} onClick={onDelete}>
            {busy ? t("deleting") : t("deleteAction")}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
```

- [ ] **Step 4: Create `src/app/[locale]/colaboraciones/[id]/page.tsx`**

```typescript
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { CollaborationDetailClient } from "./collaboration-detail-client";

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const collaboration = await prisma.collaboration
    .findUnique({ where: { id: params.id }, select: { title: true, description: true } })
    .catch(() => null);

  if (!collaboration) return { title: "Colaboración" };

  return { title: collaboration.title, description: collaboration.description };
}

export default function CollaborationDetailPage({ params }: Props) {
  return <CollaborationDetailClient id={params.id} />;
}
```

- [ ] **Step 5: Create `src/app/[locale]/colaboraciones/[id]/collaboration-detail-client.tsx`**

```typescript
"use client";

import { useTranslations } from "next-intl";
import { fetchCollaboration } from "@/lib/frontend/api-client";
import { useApi } from "@/lib/frontend/hooks";
import { formatDate } from "@/lib/frontend/format";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/states";
import { CollaborationContactCard } from "@/components/collaboration/collaboration-contact-card";
import { DeleteCollaborationButton } from "@/components/collaboration/delete-collaboration-button";
import { ReportButton } from "@/components/product/report-button";

export function CollaborationDetailClient({ id }: { id: string }) {
  const t = useTranslations("collaborations");
  const { data: collaboration, loading, error } = useApi(() => fetchCollaboration(id), { deps: [id] });

  if (loading) {
    return (
      <div className="container-page space-y-4 py-10">
        <Skeleton className="h-8 w-2/3" aria-busy="true" />
        <Skeleton className="h-40 w-full" aria-busy="true" />
      </div>
    );
  }

  if (error || !collaboration) {
    return (
      <div className="container-page py-10">
        <EmptyState title={t("notFoundTitle")} description={t("notFoundDescription")} />
      </div>
    );
  }

  return (
    <div className="container-page grid gap-8 py-10 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={collaboration.type === "NEEDS" ? "warning" : "success"}>
            {collaboration.type === "NEEDS" ? t("typeNeeds") : t("typeOffers")}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {collaboration.author.name} · {formatDate(collaboration.createdAt)}
          </span>
        </div>
        <h1 className="text-2xl font-extrabold">{collaboration.title}</h1>
        <p className="whitespace-pre-wrap text-foreground/90">{collaboration.description}</p>
        {collaboration.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {collaboration.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                {tag}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-3 pt-2">
          <ReportButton productId={undefined as unknown as string} />
          <DeleteCollaborationButton collaborationId={collaboration.id} authorId={collaboration.author.id} />
        </div>
      </div>

      <div className="space-y-4">
        <CollaborationContactCard collaborationId={collaboration.id} authorId={collaboration.author.id} />
      </div>
    </div>
  );
}
```

`ReportButton` as it exists today (`src/components/product/report-button.tsx`) only accepts `{ productId: string }` and calls `createReport({ productId, reason, category })` — it does NOT support a `collaborationId` target yet. Replace that line with a small local adaptation instead of importing the product-only component: change `src/components/product/report-button.tsx`'s prop signature to accept EITHER target, e.g.:

```typescript
export function ReportButton({ productId, collaborationId }: { productId?: string; collaborationId?: string }) {
```

and its `mutate` call site to:

```typescript
const result = await mutate({ productId, collaborationId, reason: reason.trim(), category });
```

Then in `collaboration-detail-client.tsx`, use it as:

```typescript
<ReportButton collaborationId={collaboration.id} />
```

Also update the one existing caller in `src/components/product/product-detail-client.tsx` (search for `<ReportButton` there) — no change needed to that call site since `productId` stays a valid prop, just now optional at the type level; add an explicit check that at least one of `productId`/`collaborationId` is always passed by convention (both call sites already satisfy this).

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors. Pay special attention to the `ReportButton` prop-signature change — confirm the existing product-detail call site still compiles.

- [ ] **Step 7: Manual verification (full E2E for this task)**

1. Sign in as user A, publish a collaboration.
2. Sign in as user B (different browser/incognito or sign out+in), open the listing, click "Solicitar contacto", send a message ≥20 chars.
3. Sign back in as user A, go to `/colaboraciones/<id>` — confirm the request doesn't show there yet (it shows in the profile, built in Task 10) but the email was attempted (check server logs for `[collaboration-contact-request]` or the Resend dashboard).
4. Report the listing as user B, confirm it appears in `/admin` → Reportes (built out in Task 11).
5. As user A (author), delete the listing, confirm redirect to `/colaboraciones` and the listing is gone.
6. Publish a new listing as user A, sign in as an admin account, confirm the delete button appears and works for staff too.

- [ ] **Step 8: Commit**

```bash
git add src/components/collaboration/collaboration-contact-card.tsx src/components/collaboration/delete-collaboration-button.tsx "src/app/[locale]/colaboraciones/[id]" src/components/product/report-button.tsx messages/es.json messages/en.json messages/zh.json
git commit -m "feat(colaboraciones): UI pública — detalle, contacto, reportar, borrar"
```

---

### Task 10: Perfil, nav header, sitemap

**Files:**
- Create: `src/components/profile/collaborations-section.tsx`
- Create: `src/components/profile/collaboration-contact-requests-section.tsx`
- Create: `src/components/profile/sent-collaboration-contact-requests-section.tsx`
- Modify: `src/app/[locale]/profile/profile-client.tsx`
- Modify: `src/components/layout/site-header.tsx`
- Modify: `src/app/sitemap.ts`
- Modify: `messages/es.json`, `messages/en.json`, `messages/zh.json`

**Interfaces:**
- Consumes: `fetchMyCollaborations`, `fetchMyCollaborationContactRequests`, `fetchSentCollaborationContactRequests`, `resolveCollaborationContactRequest`, `deleteCollaboration` (Task 7).
- Produces: 3 new profile sections; `/colaboraciones` nav link; collaboration URLs in the sitemap.

- [ ] **Step 1: Add translation keys**

Add to the `collaborations` namespace:

```json
"myCollaborations": "Mis colaboraciones",
"noneYet": "Todavía no publicaste ninguna colaboración.",
"contactRequestsReceived": "Solicitudes de contacto (colaboraciones)",
"contactRequestsSent": "Mis solicitudes enviadas (colaboraciones)",
"shareEmail": "Compartir mi email",
"dismiss": "Descartar",
"pending": "Pendiente",
"emailShared": "Email compartido",
"dismissed": "Descartada",
"waitingResponse": "Esperando respuesta"
```

Add `"collaborations": "Colaboraciones"` to `nav` (already added in Task 8 — confirm it's there, don't duplicate).

- [ ] **Step 2: Create `src/components/profile/collaborations-section.tsx`**

```typescript
"use client";

import { useTranslations } from "next-intl";
import { Handshake, Trash2 } from "lucide-react";
import { fetchMyCollaborations, deleteCollaboration } from "@/lib/frontend/api-client";
import { useApi } from "@/lib/frontend/hooks";
import { formatDate } from "@/lib/frontend/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";
import { Link } from "@/i18n/navigation";

/** Anuncios de "Colaboraciones" publicados por el usuario, con borrado directo. */
export function CollaborationsSection() {
  const t = useTranslations("collaborations");
  const { data, loading, error, refetch } = useApi(fetchMyCollaborations, {});

  if (!loading && !error && (data?.length ?? 0) === 0) return null;

  async function onDelete(id: string) {
    await deleteCollaboration(id);
    refetch();
  }

  return (
    <section className="space-y-4" aria-labelledby="my-collaborations-title">
      <h2 id="my-collaborations-title" className="flex items-center gap-2 text-xl font-extrabold">
        <Handshake className="h-5 w-5 text-primary" aria-hidden />
        {t("myCollaborations")}
      </h2>

      {loading && <Skeleton className="h-24 w-full rounded-2xl" aria-busy="true" />}
      {!loading && error && <ErrorState message={error} onRetry={refetch} />}

      <div className="space-y-3">
        {data?.map((c) => (
          <Card key={c.id}>
            <CardContent className="flex items-center justify-between gap-3 p-5">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant={c.type === "NEEDS" ? "warning" : "success"}>
                    {c.type === "NEEDS" ? t("typeNeeds") : t("typeOffers")}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{formatDate(c.createdAt)}</span>
                </div>
                <Link href={`/colaboraciones/${c.id}`} className="font-bold hover:text-primary hover:underline">
                  {c.title}
                </Link>
              </div>
              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => onDelete(c.id)}>
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Create `src/components/profile/collaboration-contact-requests-section.tsx`**

```typescript
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Handshake } from "lucide-react";
import {
  ApiClientError,
  fetchMyCollaborationContactRequests,
  resolveCollaborationContactRequest,
} from "@/lib/frontend/api-client";
import { useApi } from "@/lib/frontend/hooks";
import { formatDate } from "@/lib/frontend/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";
import { Link } from "@/i18n/navigation";

/** Solicitudes de contacto recibidas por las colaboraciones del usuario. */
export function CollaborationContactRequestsSection() {
  const t = useTranslations("collaborations");
  const requests = useApi(fetchMyCollaborationContactRequests, {});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const STATUS_CHIP = {
    PENDING: { text: t("pending"), variant: "warning" as const },
    SHARED: { text: t("emailShared"), variant: "success" as const },
    DISMISSED: { text: t("dismissed"), variant: "outline" as const },
  };

  async function resolve(id: string, status: "SHARED" | "DISMISSED") {
    setError(null);
    setBusyId(id);
    try {
      await resolveCollaborationContactRequest(id, status);
      requests.refetch();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "No se pudo actualizar.");
    } finally {
      setBusyId(null);
    }
  }

  if (!requests.loading && !requests.error && (requests.data?.length ?? 0) === 0) return null;

  return (
    <section className="space-y-4" aria-labelledby="collab-contact-requests-title">
      <h2 id="collab-contact-requests-title" className="flex items-center gap-2 text-xl font-extrabold">
        <Handshake className="h-5 w-5 text-primary" aria-hidden />
        {t("contactRequestsReceived")}
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
                  <span className="font-bold">{r.responder?.name}</span>
                  <span className="text-muted-foreground">está interesado en</span>
                  <Link
                    href={`/colaboraciones/${r.collaboration.id}`}
                    className="font-bold text-primary hover:underline"
                  >
                    {r.collaboration.title}
                  </Link>
                  <Badge variant={chip.variant}>{chip.text}</Badge>
                  <span className="ml-auto text-xs text-muted-foreground">{formatDate(r.createdAt)}</span>
                </div>
                <p className="rounded-xl bg-muted p-3 text-sm">{r.message}</p>
                {r.status === "PENDING" && (
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" disabled={busyId === r.id} onClick={() => resolve(r.id, "SHARED")}>
                      {t("shareEmail")}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={busyId === r.id}
                      onClick={() => resolve(r.id, "DISMISSED")}
                    >
                      {t("dismiss")}
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

- [ ] **Step 4: Create `src/components/profile/sent-collaboration-contact-requests-section.tsx`**

```typescript
"use client";

import { useTranslations } from "next-intl";
import { Send } from "lucide-react";
import { fetchSentCollaborationContactRequests } from "@/lib/frontend/api-client";
import { useApi } from "@/lib/frontend/hooks";
import { formatDate } from "@/lib/frontend/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";
import { Link } from "@/i18n/navigation";

/** Solicitudes de contacto que YO envié sobre colaboraciones ajenas. */
export function SentCollaborationContactRequestsSection() {
  const t = useTranslations("collaborations");
  const requests = useApi(fetchSentCollaborationContactRequests, {});

  const STATUS_CHIP = {
    PENDING: { text: t("waitingResponse"), variant: "warning" as const },
    SHARED: { text: t("emailShared"), variant: "success" as const },
    DISMISSED: { text: t("dismissed"), variant: "outline" as const },
  };

  if (!requests.loading && !requests.error && (requests.data?.length ?? 0) === 0) return null;

  return (
    <section className="space-y-4" aria-labelledby="sent-collab-contact-requests-title">
      <h2 id="sent-collab-contact-requests-title" className="flex items-center gap-2 text-xl font-extrabold">
        <Send className="h-5 w-5 text-primary" aria-hidden />
        {t("contactRequestsSent")}
      </h2>

      {requests.loading && <Skeleton className="h-24 w-full rounded-2xl" aria-busy="true" />}
      {!requests.loading && requests.error && (
        <ErrorState message={requests.error} onRetry={requests.refetch} />
      )}

      <div className="space-y-3">
        {requests.data?.map((r) => {
          const chip = STATUS_CHIP[r.status];
          return (
            <Card key={r.id}>
              <CardContent className="space-y-2 p-5">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Solicitud a</span>
                  <Link
                    href={`/colaboraciones/${r.collaboration.id}`}
                    className="font-bold text-primary hover:underline"
                  >
                    {r.collaboration.title}
                  </Link>
                  <Badge variant={chip.variant}>{chip.text}</Badge>
                  <span className="ml-auto text-xs text-muted-foreground">{formatDate(r.createdAt)}</span>
                </div>
                <p className="rounded-xl bg-muted p-3 text-sm">{r.message}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Mount the 3 sections in `src/app/[locale]/profile/profile-client.tsx`**

Add the three imports next to the existing `ContactRequestsSection`/`SavedProductsSection`/`SentContactRequestsSection` imports:

```typescript
import { CollaborationsSection } from "@/components/profile/collaborations-section";
import { CollaborationContactRequestsSection } from "@/components/profile/collaboration-contact-requests-section";
import { SentCollaborationContactRequestsSection } from "@/components/profile/sent-collaboration-contact-requests-section";
```

Add the three components right after the existing `<SentContactRequestsSection />` line:

```typescript
      <CollaborationsSection />
      <CollaborationContactRequestsSection />
      <SentCollaborationContactRequestsSection />
```

- [ ] **Step 6: Add the nav link in `src/components/layout/site-header.tsx`**

In the `NAV_LINKS` array, add a new entry after `{ href: "/colecciones", label: t("collections") }`:

```typescript
    { href: "/colaboraciones", label: t("collaborations") },
```

(The `t("collaborations")` key was already added to the `nav` namespace in Task 8, Step 1.)

- [ ] **Step 7: Add collaboration URLs to the sitemap**

In `src/app/sitemap.ts`, add `"/colaboraciones"` to the `STATIC_ROUTES` array, and add a new query + entries block mirroring the existing `products`/`makers` blocks:

```typescript
  const [products, makers, collaborations] = await Promise.all([
    prisma.product.findMany({
      where: { status: "LIVE" },
      select: { slug: true, updatedAt: true },
    }),
    prisma.user.findMany({
      where: { products: { some: { status: "LIVE" } } },
      select: { id: true },
    }),
    prisma.collaboration.findMany({
      select: { id: true, updatedAt: true },
    }),
  ]);
```

Add a matching entries block next to `productEntries`/`makerEntries`:

```typescript
  const collaborationEntries: MetadataRoute.Sitemap = collaborations.map((c) => ({
    url: `${siteUrl}/colaboraciones/${c.id}`,
    lastModified: c.updatedAt,
    changeFrequency: "daily",
  }));
```

And include it in the final `return`:

```typescript
  return [...staticEntries, ...productEntries, ...makerEntries, ...collaborationEntries];
```

- [ ] **Step 8: Typecheck + full test suite**

Run: `npx tsc --noEmit -p tsconfig.json && npx vitest run`
Expected: no errors, all tests pass.

- [ ] **Step 9: Manual verification**

Reload `/profile` while signed in as a user with at least one published collaboration and one sent/received contact request — confirm all 3 new sections render, the "compartir email"/"descartar" buttons work, and deleting from "Mis colaboraciones" removes the card. Confirm "Colaboraciones" shows in the header nav in all 3 locales. Load `/sitemap.xml` and confirm collaboration URLs appear.

- [ ] **Step 10: Commit**

```bash
git add src/components/profile src/app/[locale]/profile/profile-client.tsx src/components/layout/site-header.tsx src/app/sitemap.ts messages/es.json messages/en.json messages/zh.json
git commit -m "feat(colaboraciones): perfil, nav header, sitemap"
```

---

### Task 11: Admin — mostrar colaboraciones reportadas

**Files:**
- Modify: `src/app/admin/admin-client.tsx`
- Modify: `src/lib/frontend/types.ts` (if `ModerationReportItem` needs a `collaboration` field — check first)

**Interfaces:**
- Consumes: the `collaboration: { id, title }` field added to `GET /api/reports`'s response (Task 6).

- [ ] **Step 1: Extend `ModerationReportItem` in `src/lib/frontend/types.ts`**

Find the existing `ModerationReportItem` interface and add a `collaboration` field next to the existing `product`/`comment` fields:

```typescript
  collaboration?: { id: string; title: string } | null;
```

- [ ] **Step 2: Extend the `target` resolution logic in `admin-client.tsx`'s `ReportRow`**

Replace the existing `target` computation:

```typescript
  const target = report.product
    ? { label: report.product.name, href: `/products/${report.product.slug}` }
    : report.comment
      ? { label: `Comentario: "${report.comment.body.slice(0, 60)}…"`, href: null }
      : { label: "Contenido eliminado", href: null };
```

with:

```typescript
  const target = report.product
    ? { label: report.product.name, href: `/products/${report.product.slug}` }
    : report.comment
      ? { label: `Comentario: "${report.comment.body.slice(0, 60)}…"`, href: null }
      : report.collaboration
        ? { label: report.collaboration.title, href: `/colaboraciones/${report.collaboration.id}` }
        : { label: "Contenido eliminado", href: null };
```

And the type-label line:

```typescript
              {report.product ? "Producto" : "Comentario"} · {timeAgo(report.createdAt)}
```

with:

```typescript
              {report.product ? "Producto" : report.comment ? "Comentario" : "Colaboración"} · {timeAgo(report.createdAt)}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors.

- [ ] **Step 4: Manual verification**

Report a collaboration (from Task 9's flow), go to `/admin` → Reportes, confirm it shows with the "Colaboración" label and a working link to `/colaboraciones/:id`. Resolve/dismiss it and confirm the status updates.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/admin-client.tsx src/lib/frontend/types.ts
git commit -m "feat(colaboraciones): admin — mostrar colaboraciones reportadas"
```

---

### Task 12: Verificación E2E completa + doc de migración de producción + PR

**Files:**
- Create: `docs/MIGRACION-PROD-COLABORACIONES.md`

**Interfaces:**
- Consumes: everything from Tasks 1–11.

- [ ] **Step 1: Full local verification**

```bash
npm test
npx tsc --noEmit -p tsconfig.json
npm run build
```

Expected: all green. If `.next` is corrupted from interleaving `dev`/`build` (known issue this session), `rm -rf .next` and retry.

- [ ] **Step 2: Full E2E pass in the browser**

Sign in with two different accounts (or one account + an incognito/second session) and walk through:
1. Publish a `NEEDS` collaboration and an `OFFERS` collaboration.
2. Browse `/colaboraciones`, filter by each tab, search by a tag.
3. Open a listing, request contact with a ≥20-char message as the other account.
4. As the author, go to `/profile`, see the request under "Solicitudes de contacto (colaboraciones)", click "Compartir mi email" — confirm the email attempt logs (or arrives, if Resend is configured) and the status updates.
5. Publish a second listing, send a request, click "Descartar" this time — confirm status updates without an email being sent.
6. Report a listing, confirm it lands in `/admin` → Reportes with the right label and link, resolve it.
7. Delete a listing as its author; publish another and delete it as an admin account.
8. Switch language to EN and ZH, confirm `/colaboraciones` and the nav link are translated, with no raw translation keys showing.
9. Load `/sitemap.xml`, confirm collaboration URLs are present.

- [ ] **Step 3: Compute the real migration checksum**

```bash
shasum -a 256 prisma/migrations/20260717130000_add_collaborations/migration.sql
```

Copy the resulting hash — it goes into the production doc below.

- [ ] **Step 4: Write `docs/MIGRACION-PROD-COLABORACIONES.md`**

Follow the exact structure of `docs/MIGRACION-PROD-COMUNIDAD-4-SOCIAL.md` (title, "pegar TODO el bloque SQL", the migration SQL from Task 1 Step 2 verbatim, a `_prisma_migrations` INSERT using the checksum from Step 3 above and migration name `20260717130000_add_collaborations`, a verification-queries section, and a post-merge checklist mirroring Step 2's E2E list above).

- [ ] **Step 5: Commit the migration doc**

```bash
git add docs/MIGRACION-PROD-COLABORACIONES.md
git commit -m "docs: migración de producción para Colaboraciones"
```

- [ ] **Step 6: Push and open the PR**

```bash
git push -u origin colaboraciones
gh pr create --title "feat(colaboraciones): tablón busco/ofrezco servicio" --body "$(cat <<'EOF'
## Resumen
Nueva sección "Colaboraciones": cualquier usuario registrado publica un
anuncio "necesito X" u "ofrezco X" (tags libres), otro usuario solicita
contacto in-app (mismo patrón que el puente de compraventa de productos),
el autor comparte o descarta. El autor o un admin pueden borrar un
anuncio en cualquier momento; un cron diario borra los que superan 35 días.

Spec: docs/superpowers/specs/2026-07-17-colaboraciones-design.md
Plan: docs/superpowers/plans/2026-07-17-colaboraciones.md

## Test plan
- [x] npm test
- [x] npx tsc --noEmit
- [x] npm run build
- [x] E2E manual: publicar, filtrar/buscar, solicitar contacto, compartir/descartar, reportar, borrar (autor y admin), 3 idiomas, sitemap
EOF
)"
```

Wait for the user's explicit go-ahead before merging (established project workflow — never merge without confirmation), same as every previous PR this session.

---

## Self-Review Notes

- **Spec coverage:** every section of `2026-07-17-colaboraciones-design.md` maps to a task — data model → Task 1; validation/rate limits → Task 2; CRUD → Task 3; contact bridge → Tasks 4–5; moderation + cron → Task 6; frontend types → Task 7; public UI → Tasks 8–9; profile/nav/sitemap → Task 10; admin → Task 11; migration doc + PR → Task 12.
- **Deviation from spec, called out explicitly:** the spec said "dialog o página" for the publish form — this plan picks the dialog (`CreateCollaborationDialog`), matching `ReportButton`'s existing dialog pattern and avoiding an extra route for a 4-field form (YAGNI).
- **Naming refinement:** the spec used `Listing`/`ListingContactRequest`; this plan uses `Collaboration`/`CollaborationContactRequest` throughout (schema, routes, files) to match the feature's actual name and avoid confusion with product "listings" terminology already used elsewhere in the codebase (`listProductsQuerySchema`). Purely a naming choice — the structure is unchanged from the approved spec.
- **Correction from spec:** the spec's error-cases table said contact-request messages are "10–1000 chars"; the actual codebase convention (confirmed in `createContactRequestSchema` and `OfferCard`'s `minChars` copy) is 20–1000. This plan uses 20, matching the real pattern it's copying.
- **`ReportButton` becomes dual-purpose:** Task 9 changes its prop signature from `{ productId }` to `{ productId?; collaborationId? }`. This is a small, backward-compatible widening (the existing product call site is unaffected) rather than a new component, avoiding duplicated report-dialog code.
