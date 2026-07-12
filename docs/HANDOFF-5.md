# 🤝 Handoff #5 — Uploads reales + pendientes accionables cerrados

**Fecha:** 12 de julio de 2026
**Repo:** https://github.com/Cyb3rlinx/SkoolCo
**Commits de esta tanda:** `288ff6f` (uploads) · `9b2d513` (pendientes) · este doc
**Anteriores:** `HANDOFF-4.md` (rediseño landing) y anteriores. Todo sigue vigente.

---

## 1. Resumen en 30 segundos

Dos tandas: **(a)** subida real de imágenes — logos de producto y avatares, con
botón "Cambiar logo" en el detalle del producto — y **(b)** el cierre de casi
todos los `TODO(backend)` y pendientes de producto: cola de moderación real,
perfil público de maker, `?maker=me`, páginas legales, `og:image` por producto
y rate limiter listo para Vercel serverless (Upstash). Todo verificado E2E en
navegador antes de subir. **31/31 tests · typecheck limpio · build de prod OK.**

⚠️ **Hay una migración nueva de Prisma** (`add_uploaded_images`). Después del
pull: `npm run db:migrate` (dev) / `npm run db:deploy` (prod).

## 2. Qué hay de nuevo

### a) Subida de imágenes (`288ff6f`)

| Pieza | Detalle |
|---|---|
| `POST /api/uploads` | Auth + rate limit 20/h. Multipart campo `file`. PNG/JPEG/WebP ≤2MB. Valida mime declarado **y magic bytes** (un GIF renombrado a .png se rechaza). SVG excluido a propósito (puede llevar scripts). |
| `GET /api/uploads/:id` | Sirve la imagen: pública, inmutable, `Cache-Control` 1 año, `nosniff`. |
| Almacenamiento | **Postgres (bytea)** — si la DB es Supabase, las imágenes ya viven en Supabase. Migrar a Supabase Storage después = cambiar solo el interior del endpoint; las URLs `/api/uploads/:id` no cambian. |
| `/submit` | El botón de logo sube de verdad (antes solo era preview local). |
| `/profile` | Subida de avatar con preview. |
| Detalle de producto | Botón **"Cambiar logo"** (solo maker/staff) → sube + PATCH. |
| Validación | `logoUrl`/`avatarUrl` aceptan URL https o ruta interna `/api/uploads/:id`. |

### b) Pendientes cerrados (`9b2d513`)

| Pieza | Detalle |
|---|---|
| `GET /api/community-links?status=` (staff) | La cola de `/admin` ya usa datos reales (adiós mock). Orden: más viejos primero. |
| `GET /api/users/:id` | Perfil público de maker — solo campos comunitarios (sin email/rol) + conteos. |
| `GET /api/products?maker=me\|<id>` | `me` (auth): todos tus estados en 1 llamada — `/profile` pasó de 4 requests a 1. `<id>`: vista pública solo LIVE. |
| `/makers/:id` | Página pública del maker (perfil + lanzamientos). La maker-card enlaza ahí. |
| `/privacidad` `/terminos` `/normas` | Contenido legal real (requisito para usuarios reales y Chrome Web Store). Los links del footer ya no dan 404. |
| `og:image` por producto | `opengraph-image.tsx` dinámica (1200×630, marca, votos, maker) + `generateMetadata` server-side con título/descripción reales + twitter card. `metadataBase` sale de `NEXTAUTH_URL`. |
| **Rate limiter dual** | Con `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` en el env → límites compartidos entre instancias vía Upstash Redis (fixed window por REST, **cero dependencias nuevas**, fail-open si Redis cae). Sin esas vars → in-memory como siempre. `checkRateLimit` ahora es **async** (todos los call sites actualizados). |

OpenAPI: **0.5.0** (`/api/uploads*`, `/api/users/{id}`, params `maker` y `status`).

## 3. Por qué el rate limiter importa en Vercel (leer antes de lanzar)

El limiter in-memory era correcto para 1 servidor Node (plan Render). **Vercel
es serverless**: cada invocación puede caer en una instancia distinta y la
memoria no se comparte → los límites de login/registro/subidas pierden efecto.
Solución ya integrada: crear una DB Redis gratis en Upstash (~2 min) y pegar
las 2 variables en Vercel. Sin código adicional.

## 4. Verificación de esta tanda

- `npm run typecheck` limpio · `npm test` 31/31 (7 nuevos de uploads) · `npm run build` OK.
- E2E en navegador (dev): upload 201 → servida 200 con mime real → PATCH logo 200 y visible en la página; sin sesión 401; GIF renombrado 400; SVG 400.
- Cola admin con datos reales (login admin, 200 con el pendiente del seed; usuario normal 403). `maker=me` devuelve DRAFT+LIVE propios; `maker=<id>` ajeno solo LIVE. `GET /api/users/:id` sin email. `/makers/:id`, `/privacidad`, `/terminos`, `/normas` 200. `og:image` 200 `image/png`.

## 5. Qué queda (con dueño)

| Pendiente | Dueño | Nota |
|---|---|---|
| Deploy Vercel completo + `npm run db:deploy` en Supabase | Cofounder | La migración `add_uploaded_images` DEBE correr |
| Upstash Redis (2 vars en Vercel) | Cofounder | Gratis; ver sección 3 |
| `NEXTAUTH_URL` con la URL real en Vercel | Cofounder | También alimenta las og:image absolutas |
| Dominio + Resend (SPF/DKIM) | Willy | Sin esto no salen emails de verificación/reset |
| Protección de rama `main` (PR + CI verde) | Cyb3rlinx | Seguimos pusheando directo |
| Galería de screenshots por producto | Próxima tanda | Fácil ahora: reusar `/api/uploads` + tabla producto↔imagen |
| Chrome Web Store (íconos; la privacy policy ya existe) | Willy | Post-deploy |
| 5–10 usuarios reales | Ambos | La regla de oro — todo lo demás es secundario |
