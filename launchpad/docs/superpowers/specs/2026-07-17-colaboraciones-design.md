# Colaboraciones — Design

**Fecha:** 2026-07-17
**Estado:** Aprobado por Willy, pendiente de plan de implementación.

## Contexto y objetivo

Denveler conecta makers que lanzan productos con una comunidad que los prueba,
vota y comenta. Falta una pieza distinta: conectar a alguien que **necesita**
un servicio con alguien que **puede brindarlo** — no limitado al ejemplo
original (técnico ↔ comercial), sino abierto a cualquier tipo de servicio
(diseño, marketing, legal, desarrollo, ventas, etc.).

Objetivo: una sección de tablón de anuncios de dos lados — "necesito X" /
"ofrezco X" — con contacto in-app, abierta a cualquier usuario registrado
(no solo makers con producto publicado), con limpieza automática de
contenido viejo.

## Alcance

**Incluye:**
- Publicar un anuncio (`Listing`): tipo (necesito/ofrezco), título,
  descripción, tags libres.
- Listado público con filtro por tipo y búsqueda por tag/texto.
- Solicitud de contacto in-app entre quien responde y el autor del anuncio
  (mismo patrón que el puente de compraventa de productos).
- Borrado: por el autor, por un admin, o automático a los 35 días.
- Reportar un anuncio (se integra al tablón de moderación existente).

**Fuera de alcance (YAGNI, no se construye en esta pasada):**
- Mensajería directa en vivo (chat) — se sigue usando el patrón de
  solicitud de contacto + email, igual que en productos.
- Pestaña nueva en `/admin` — el botón de borrar en el detalle del anuncio
  alcanza; no se justifica una vista de gestión aparte todavía.
- Pagos, comisiones o cualquier flujo de dinero sobre estas colaboraciones.
- Edición de un anuncio ya publicado — si el autor se equivocó, lo borra y
  publica uno nuevo (mismo criterio que ya se usa en otras partes del
  producto para mantener el modelo simple).
- Categorías fijas — son tags de texto libre, sin taxonomía curada por ahora.

## Modelo de datos (Prisma, aditivo)

```prisma
enum ListingType {
  NEEDS   // "necesito" — busca que alguien le resuelva algo
  OFFERS  // "ofrezco" — puede resolverle algo a alguien
}

model Listing {
  id          String      @id @default(cuid())
  authorId    String      @map("author_id")
  type        ListingType
  title       String
  description String
  tags        String[]
  createdAt   DateTime    @default(now()) @map("created_at")
  updatedAt   DateTime    @updatedAt @map("updated_at")

  author          User                    @relation(fields: [authorId], references: [id], onDelete: Cascade)
  contactRequests ListingContactRequest[]
  reports         ModerationReport[]

  @@index([type, createdAt])
  @@index([authorId])
  @@map("listings")
}

model ListingContactRequest {
  id          String               @id @default(cuid())
  listingId   String               @map("listing_id")
  responderId String               @map("responder_id")
  message     String
  status      ContactRequestStatus @default(PENDING)
  createdAt   DateTime             @default(now()) @map("created_at")

  listing   Listing @relation(fields: [listingId], references: [id], onDelete: Cascade)
  responder User    @relation(fields: [responderId], references: [id], onDelete: Cascade)

  // Un mismo usuario solo puede solicitar contacto una vez por anuncio.
  @@unique([listingId, responderId])
  @@index([listingId, status])
  @@map("listing_contact_requests")
}
```

Reutiliza el enum `ContactRequestStatus` (`PENDING` / `SHARED` / `DISMISSED`)
que ya existe para el puente de compraventa — mismos tres estados, mismo
significado.

**Extensión de `ModerationReport`** (aditiva, mismo patrón que ya usa con
`productId`/`commentId`):

```prisma
model ModerationReport {
  // ...campos existentes sin cambios...
  listingId String? @map("listing_id")
  listing   Listing? @relation(fields: [listingId], references: [id], onDelete: Cascade)
}
```

**Por qué una tabla separada (`ListingContactRequest`) y no reutilizar
`ContactRequest`:** `ContactRequest.productId` es NOT NULL con un unique
compuesto `[productId, buyerId]`; volverlo nullable para admitir listings
obligaría a tocar todas las queries y el flujo de resolución existentes (que
hoy asumen "el maker del producto resuelve"), cuando acá quien resuelve es
"el autor del anuncio" — un concepto distinto. Una tabla paralela que copia
el mismo patrón mantiene ambos flujos aislados y cada uno fácil de razonar
por separado, sin arriesgar el flujo de productos que ya está en producción.

## Backend (API)

Todas las rutas siguen el patrón ya establecido: `withErrorHandling`,
`requireUser`/`requireAdmin` de `@/lib/auth`, validación con Zod en
`@/lib/validation`, rate limiting con `@/lib/rate-limit`.

| Método | Ruta | Quién | Qué hace |
|---|---|---|---|
| GET | `/api/listings` | público | Lista paginada (`page`/`pageSize`, mismo patrón que `/api/products`), filtra por `type` y `q` (busca en título/tags) |
| POST | `/api/listings` | usuario autenticado | Crea un anuncio (rate-limited) |
| GET | `/api/listings/:id` | público | Detalle |
| DELETE | `/api/listings/:id` | autor o admin | Borra (hard delete) |
| POST | `/api/listings/:id/contact-requests` | usuario autenticado | Solicita contacto (rate-limited, no a su propio anuncio, 1 vez) |
| PATCH | `/api/listing-contact-requests/:id` | autor del anuncio | `SHARED` (le llega el email al que respondió) o `DISMISSED` |
| GET | `/api/me/listings` | usuario autenticado | Mis anuncios publicados |
| GET | `/api/me/listing-contact-requests` | usuario autenticado | Solicitudes recibidas en mis anuncios |
| GET | `/api/me/sent-listing-contact-requests` | usuario autenticado | Solicitudes que yo envié |
| GET | `/api/cron/listing-cleanup` | cron (header secreto) | Borra anuncios con `createdAt` > 35 días |

**Validación (`@/lib/validation`):**
- `createListingSchema`: `type` enum, `title` (5–120 chars), `description`
  (20–2000 chars), `tags` (array de 0–8 strings, cada uno 2–30 chars,
  normalizados a minúsculas).
- `createListingContactRequestSchema`: `message` (10–1000 chars), mismo
  rango que `createContactRequestSchema` de productos.

**Rate limits (`@/lib/rate-limit`):** nuevas entradas `RATE_LIMITS.listingCreate`
y `RATE_LIMITS.listingContactRequest`, mismo orden de magnitud que sus
equivalentes de productos (`productCreate`, `contactRequest`).

**Cron de limpieza (`/api/cron/listing-cleanup`):** sigue el patrón exacto
de `/api/cron/offer-nudge` (protegido con el mismo header `CRON_SECRET`,
agregado a `vercel.json` con schedule diario). La selección de candidatos
("¿qué listings tienen más de 35 días?") se escribe como función pura
testeable (`selectExpiredListings(listings, now, days=35)`), mismo patrón
TDD que ya se usó para `offer-nudge.ts` y `top-month.ts`.

## Frontend

- **`/colaboraciones`** — listado público. Tabs "Necesito" / "Ofrezco" /
  "Todos" (mismo componente `Tabs` que ya usa `/launches`), buscador por
  tag/texto, botón "Publicar colaboración".
- **`/colaboraciones/[id]`** — detalle: tipo, título, descripción, tags,
  autor (`MakerCard` reutilizado), botón de solicitar contacto
  (adaptación de `OfferCard`), `ReportButton` (reutilizado, ya soporta
  categorías), botón "Borrar" visible solo para el autor o un admin.
- **Formulario de publicación** — dialog o página `/colaboraciones/nueva`
  con los 4 campos (tipo, título, descripción, tags como chips).
- **Perfil (`/profile`)** — nueva sección "Mis colaboraciones" (lista +
  borrar) junto a las solicitudes recibidas/enviadas, mismo patrón visual
  que `ContactRequestsSection`.
- **Header** — nuevo link "Colaboraciones" en `NAV_LINKS` de
  `site-header.tsx`, traducido en `messages/{es,en,zh}.json`.
- **Sitemap** — se agregan las URLs de `/colaboraciones/:id` a
  `src/app/sitemap.ts`, mismo criterio que los productos.

## Errores y casos borde

- Anuncio no encontrado o ya borrado → 404 en detalle y en solicitud de
  contacto.
- Solicitar contacto en el propio anuncio → 400.
- Solicitar contacto dos veces al mismo anuncio → 409 (constraint unique,
  mismo manejo de `P2002` que ya existe para `ContactRequest`).
- Anuncio borrado mientras alguien tiene una solicitud `PENDING` → cascade
  delete (`onDelete: Cascade` en `ListingContactRequest.listing`), no hace
  falta lógica extra.
- Cron corre y no hay nada que borrar → no-op, mismo criterio que
  `offer-nudge` cuando no hay candidatos.

## Testing

- Zod: `createListingSchema`, `createListingContactRequestSchema` (límites
  de longitud, tags inválidos, tipo inválido).
- Función pura `selectExpiredListings` (TDD, igual que `offer-nudge.test.ts`).
- Rutas API: casos felices + los 400/404/409 de la tabla de arriba.
- E2E manual antes de mergear: publicar un anuncio de cada tipo, solicitar
  contacto, compartir/descartar desde el autor, reportarlo, borrarlo como
  autor y como admin.

## Migración de producción

Aditiva: 1 tabla nueva (`listings`), 1 tabla nueva
(`listing_contact_requests`), 1 columna nueva nullable (`listing_id` en
`moderation_reports`), 1 enum nuevo (`ListingType`). Mismo ritual que las
migraciones anteriores: SQL a mano en el editor de Supabase antes de
mergear el PR, documentado en su propio `docs/MIGRACION-PROD-*.md`.
