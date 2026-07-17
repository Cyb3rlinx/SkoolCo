# Comunidad Visible (Insignias + Menciones + Badge embebible) — Diseño

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar a la comunidad de Denveler tres mecanismos de identidad y reconocimiento social: un `@handle` único por usuario, menciones `@usuario` en comentarios con notificación, un sistema de insignias (automáticas + otorgadas a mano por un admin), y un badge SVG embebible que el maker pega en su propio sitio para linkear de vuelta a Denveler.

**Architecture:** Todo se apoya en patrones ya existentes en el codebase: Prisma + migraciones aditivas, Zod para validación, `requireUser`/`requireAdmin` de `src/lib/auth.ts`, el sistema de notificaciones ya construido (`Notification` + `NotificationType`), y el panel de admin ya construido (`/admin`, tabs). No se introduce infraestructura nueva.

**Tech Stack:** Next.js 14 App Router, Prisma 5 + PostgreSQL, Zod, TypeScript. Sin dependencias nuevas — el SVG del badge se genera con un template string, sin librería de renderizado.

## Global Constraints

- Español neutro latinoamericano en TODO texto de cara al usuario (labels, mensajes de error, emails, notificaciones). Cero voseo argentino.
- Toda migración Prisma es **aditiva únicamente**. La producción se actualiza pegando el SQL a mano en el editor de Supabase (nunca `prisma migrate deploy` directo contra prod) — documentar en `docs/MIGRACION-PROD-<slug>.md` siguiendo el formato de `docs/MIGRACION-PROD-ADMIN.md`.
- Toda ruta API nueva empieza con `export const dynamic = "force-dynamic";` y sigue la convención `{ data: … }` / `{ error: { message } }` vía `withErrorHandling`/`parseBody`/`ok`/`created` de `src/lib/api.ts`.
- Autenticación con `requireUser()` (endpoints de usuario) o `requireAdmin()` (endpoints de otorgar/revocar insignias manuales) de `src/lib/auth.ts`. Nunca autenticación casera.
- Todo input de usuario se valida server-side con Zod, incluso si ya se validó en el cliente.
- Ninguna acción nueva debe permitir enumerar usuarios/emails ni filtrar quién existe en la plataforma más de lo que ya es público hoy (nombre + perfil ya son públicos).

---

## 1. `@handle` único por usuario

### Schema

```prisma
model User {
  // ...campos existentes...
  username String @unique
}
```

- Migración aditiva: columna `username` nullable primero, backfill de todos los usuarios existentes, luego `NOT NULL` + índice único — igual patrón en 3 pasos que ya se usó en otras migraciones de este proyecto cuando se necesitó un `NOT NULL` sobre una tabla con filas existentes.
- Regla de generación: `slugify(name)` (función ya existente en `src/lib/validation.ts`) recortado a 20 caracteres, con sufijo numérico incremental (`-2`, `-3`, …) si hay colisión. Lista de reservados bloqueados incluso para auto-generación y para edición manual: `admin`, `denveler`, `api`, `willy`, `kevin`, `soporte`, `moderador`, `null`, `undefined`.
- Validación Zod (`usernameSchema` en `src/lib/validation.ts`):
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
- El usuario puede cambiar su `username` **una sola vez** desde `/profile` (nuevo campo `usernameChangedAt DateTime?` en `User` para hacer cumplir el límite — si es `null`, puede cambiarlo; si tiene valor, el campo queda de solo lectura en la UI y el backend rechaza el intento con 400).
- `GET /api/products/…` y demás respuestas que ya incluyen `maker: { name, avatarUrl }` agregan `username`.

### Ruteo de perfil

- `/makers/[id]/page.tsx` ya existe y resuelve por `id`. Se extiende el `findUnique` a `where: { OR: [{ id: param }, { username: param }] }` para que **ambas** URLs funcionen — no se rompen los links viejos que ya se compartieron con el `id`.
- Nuevo helper en `src/lib/frontend/api-client.ts`: `fetchMakerProfile(idOrUsername)`.

---

## 2. Menciones `@usuario` en comentarios

### Parser (unidad pura, testeable sin DB)

`src/lib/mentions.ts` — nuevo archivo:

```ts
/** Extrae hasta 5 @usernames válidos (sintaxis) de un texto, sin duplicados, en orden de aparición. */
export function extractMentions(body: string): string[] {
  const matches = body.match(/@([a-z0-9-]{3,30})\b/gi) ?? [];
  const unique = [...new Set(matches.map((m) => m.slice(1).toLowerCase()))];
  return unique.slice(0, 5);
}
```

- Límite de 5 menciones por comentario: anti-spam, evita que un comentario "@fulano @fulano @fulano…" bombardee notificaciones.
- El parser NO valida contra la base de datos (eso es responsabilidad del caller) — se mantiene puro para poder testearlo sin Prisma.

### Flujo al crear un comentario

`POST /api/products/[slug]/comments` (endpoint existente, se extiende):

1. Se crea el comentario como hoy.
2. `extractMentions(body)` sobre el texto guardado.
3. Para cada username extraído: `prisma.user.findUnique({ where: { username } })`. Si existe y **no es el autor del comentario** (sin auto-mención) y no es un usuario suspendido, se crea una `Notification` tipo `MENTION` con `actorId` = autor del comentario, `commentId` = el comentario recién creado.
4. Los usernames que no resuelven a ningún usuario simplemente no generan notificación — no es un error, el texto igual se guarda tal cual lo escribió el usuario.

### Schema

```prisma
enum NotificationType {
  UPVOTE
  COMMENT
  MENTION   // nuevo
}
```

Sin cambios estructurales en `Notification` — reutiliza `commentId` ya existente para que el clic en la notificación lleve al comentario donde lo mencionaron (mismo patrón que `COMMENT`).

### Render

- En el componente de comentario (`src/components/product/comment-*.tsx` o equivalente ya existente), el texto del `body` se procesa con el mismo `extractMentions` para envolver cada `@username` válido en un `<Link href="/makers/${username}">` — solo se linkea si el username coincide con la lista de menciones detectadas al momento de renderizar (no se hace un fetch adicional; si el usuario ya no existe, se muestra el texto plano `@username` sin link, sin romper nada).

---

## 3. Insignias

### Schema

```prisma
model Badge {
  id          String   @id @default(cuid())
  slug        String   @unique   // "fundador", "primer-lanzamiento", "top-10-mes", "vendido"
  name        String              // "Fundador"
  description String              // "Uno de los primeros 10 makers en lanzar en Denveler"
  icon        String              // emoji, ej. "🏛️"
  createdAt   DateTime @default(now()) @map("created_at")

  users UserBadge[]

  @@map("badges")
}

model UserBadge {
  id        String   @id @default(cuid())
  userId    String   @map("user_id")
  badgeId   String   @map("badge_id")
  grantedById String? @map("granted_by_id")  // null = otorgada automáticamente por el sistema
  createdAt DateTime @default(now()) @map("created_at")

  user      User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  badge     Badge @relation(fields: [badgeId], references: [id], onDelete: Cascade)
  grantedBy User? @relation("BadgesGranted", fields: [grantedById], references: [id], onDelete: SetNull)

  @@unique([userId, badgeId])
  @@map("user_badges")
}
```

`User` gana dos campos de relación nuevos para que ambos lados de `UserBadge` compilen en Prisma:

```prisma
model User {
  // ...campos existentes...
  badges         UserBadge[]
  badgesGranted  UserBadge[] @relation("BadgesGranted")
}
```

- `Badge` es un catálogo fijo, sembrado por seed/migración con 4 filas iniciales: `fundador`, `primer-lanzamiento`, `top-10-mes`, `vendido`. Agregar una insignia nueva en el futuro es una fila más, no una migración de código.
- `grantedById NULL` distingue automáticas de manuales para mostrarlo en el admin ("otorgada por el sistema" vs. "otorgada por Willy el 17-jul").

### Otorgamiento automático

Tres triggers, cada uno como función pura + punto de invocación (para poder testear la lógica de condición sin tocar Prisma):

1. **Fundador** — al pasar un producto a `LIVE` por primera vez (en el mismo endpoint que ya cambia `status` a `LIVE`), si `prisma.user.count({ where: { products: { some: { status: "LIVE" } } } }) <= 10` (contando al maker actual), se otorga `fundador` a ese maker si no la tiene ya. **Nota:** el corte es "entre los primeros 10 makers con al menos un producto LIVE", no "primeros 10 productos" — un mismo maker con 3 productos LIVE no ocupa 3 cupos.
2. **Primer lanzamiento** — mismo punto de enganche (transición a `LIVE`): si es el primer producto `LIVE` de ese maker, se otorga `primer-lanzamiento`. No excluyente con Fundador — un mismo evento puede otorgar ambas.
3. **Top 10 del mes** — nuevo cron mensual (mismo patrón que el cron de señal de tracción ya existente: `vercel.json` + endpoint `/api/cron/…`), corre el día 1 de cada mes, calcula el top 10 de productos por votos recibidos **durante el mes calendario anterior** y otorga `top-10-mes` a cada maker dueño de esos productos. Es una insignia de una sola vez, igual que las otras tres: el `@@unique([userId, badgeId])` la vuelve un logro binario (la tienes o no), así que el cron hace skip-if-exists en vez de intentar crear una fila duplicada — volver a quedar en el top 10 en un mes futuro no genera error ni una segunda fila.

### Otorgamiento manual

- `POST /api/admin/users/[id]/badges` y `DELETE /api/admin/users/[id]/badges/[badgeId]` — `requireAdmin()`. Body: `{ badgeSlug: string }`.
- Nueva sección en `/admin` (reutiliza el patrón de `users-section.tsx`: buscar usuario, ver sus insignias actuales, botón para otorgar cualquier insignia del catálogo, botón para revocar cualquiera que tenga.
- Un admin no puede otorgarse insignias a sí mismo por esta vía tampoco — incluida por consistencia con la regla ya existente de "no puedes modificar tu propia cuenta" en el endpoint de usuarios, pero aquí es una restricción nueva y menor: se permite auto-otorgamiento porque no hay riesgo de last-admin-lockout ni de escalar privilegios (una insignia no da permisos). Sin restricción especial.

### Visualización

- Perfil del maker (`/makers/[id]`): fila de chips con ícono + nombre de cada insignia.
- Junto al nombre del autor en cada comentario: hasta 2 insignias más "importantes" como mini-íconos (orden fijo de prioridad: fundador > vendido > top-10-mes > primer-lanzamiento), para no saturar visualmente un hilo de comentarios.

---

## 4. Badge embebible

### Endpoint

`GET /api/badge.svg?product=<slug>&theme=dark|light` (default `theme=dark`)

- `dynamic = "force-dynamic"` no aplica aquí — es el único endpoint de este paquete que se beneficia de cache: `Cache-Control: public, max-age=86400, immutable` en la respuesta, porque el contenido es estático (no muestra votos ni datos que cambien).
- Si `product` no existe o no está `LIVE`, devuelve el badge genérico de marca (sin nombre de producto) en vez de 404 — así un link roto no se ve como un ícono de imagen caída en el sitio del maker.
- El SVG es un template string fijo (dos variantes ya diseñadas, oscuro/claro) con el nombre del producto interpolado y **escapado** (mismo patrón `esc()` que ya se usa en `email.ts` — previene inyección de markup si el nombre del producto tuviera caracteres especiales, aunque el SVG solo se sirve como imagen, es la misma disciplina de escapado que ya es un requisito duro del proyecto).

### UI

- En la página del producto, solo visible para el maker dueño (mismo check de ownership que ya existe para "Configuración de oferta"): sección "Insertar badge en tu sitio" con:
  - Preview del SVG.
  - Selector oscuro/claro.
  - Textarea de solo lectura con el snippet HTML para copiar:
    ```html
    <a href="https://denveler.com/products/mi-producto">
      <img src="https://denveler.com/api/badge.svg?product=mi-producto&theme=dark" alt="Lanzado en Denveler" />
    </a>
    ```
  - Botón "Copiar".

---

## Testing

TDD en las piezas con lógica pura o de negocio, siguiendo el patrón ya establecido en el proyecto (tests junto al endpoint/lib, `vitest` o el runner ya configurado):

- `extractMentions`: sin menciones, una mención, duplicadas, más de 5, mayúsculas/minúsculas, `@` pegado a texto sin espacio previo, username inválido sintácticamente (no matchea el regex).
- Generación de `username`: colisión simple, colisión encadenada (3 usuarios con el mismo nombre), nombre con tildes/caracteres especiales pasa por `slugify` primero, nombre que golpea la lista de reservados.
- Trigger "Fundador": maker #10 la recibe, maker #11 no, un maker que ya tenía 2 productos LIVE y lanza un tercero no la vuelve a otorgar (constraint único ya lo previene, pero el test confirma que no explota).
- Trigger "Primer lanzamiento": segundo producto del mismo maker no la re-otorga.
- Endpoint de otorgar/revocar insignia manual: 403 sin `requireAdmin`, 404 con `badgeSlug` inexistente, idempotencia de otorgar dos veces la misma (no debe crear un duplicado ni explotar por el `@@unique`).
- `GET /api/badge.svg`: producto inexistente devuelve el badge genérico (no 404), nombre con caracteres especiales sale escapado en el SVG.

---

## Fuera de alcance (explícitamente, para esta iteración)

- Insignia "Vendido" **no se auto-otorga** — no existe en el schema actual ningún estado que represente "esta venta se concretó" (`ContactRequestStatus` solo tiene `PENDING/SHARED/DISMISSED`, y `SHARED` únicamente significa que el maker compartió su contacto, no que hubo una transacción). Queda como insignia 100% manual hasta que exista una feature de "marcar como vendido" — decisión que le corresponde al Paquete 3 (Compraventa v2), no a este.
- Badge embebible con conteo de votos en vivo — decidido explícitamente en la fase de preguntas: solo variante estática.
- Editor de insignias personalizadas desde el admin (crear nuevas filas de `Badge` sin tocar código) — el catálogo de 4 es fijo por ahora; agregar una quinta insignia en el futuro es una migración chica, no justifica una UI de administración de catálogo hoy.
