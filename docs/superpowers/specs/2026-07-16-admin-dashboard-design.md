# Dashboard de administración — Design

**Contexto:** el `/admin` actual tiene 2 pestañas (Reportes y Logros de la extensión). Willy y Kevin (ambos ADMIN en producción) necesitan un panel completo para operar Denveler: ver los números del negocio, gestionar usuarios y productos, y moderar — todo en un solo lugar.

**Enfoque elegido:** expandir la página `/admin` existente con 3 pestañas nuevas (Resumen, Usuarios, Productos) manteniendo el patrón de pestañas y el estilo actual. Sin sidebar multi-página, sin herramientas externas.

## Pestañas y permisos

| Pestaña | Quién la ve | Contenido |
|---|---|---|
| Resumen | Solo ADMIN | Métricas del negocio + pendientes de moderación |
| Usuarios | Solo ADMIN | Lista + cambiar rol / suspender / borrar |
| Productos | Solo ADMIN | Lista completa (todos los estados) + archivar |
| Reportes | ADMIN y MODERATOR | Lo que ya existe, sin cambios |
| Logros | ADMIN y MODERATOR | Lo que ya existe, sin cambios |

Un MODERATOR que entra a `/admin` ve solo Reportes y Logros (como hoy). El gate por pestaña se resuelve client-side con el rol de la sesión, y **siempre** server-side en cada endpoint.

## Feature 1 — Pestaña Resumen (métricas)

### Endpoint

`GET /api/admin/stats` (nuevo, solo ADMIN):

```ts
{ data: {
  users:            { total, last7, last30 },
  productsLive:     { total, last7, last30 },   // status LIVE; last7/30 por launchDate
  upvotes:          { total, last7, last30 },
  comments:         { total, last7, last30 },
  contactRequests:  { total, last7, last30 },
  offerViews:       { total },                   // suma de offerViewCount (sin serie temporal)
  openToOffers:     { total },                   // productos LIVE con openToOffers=true
  pending:          { reports, communityLinks }  // PENDING de cada cola
} }
```

`last7`/`last30` se calculan con `createdAt >= now - 7/30 días` (`launchDate` para productos). Una sola llamada, ~10 counts de Prisma en `Promise.all` — sin tablas nuevas, sin agregaciones por día (decisión: números + tendencia simple, no gráficas).

### UI

Grid de tarjetas (mismo `Card` del design system): valor grande + subtítulo "+N últimos 7 días · +M últimos 30". Al final, fila "Pendientes de moderación": tarjeta de reportes y de logros con contador y botón que cambia a esa pestaña.

## Feature 2 — Pestaña Usuarios

### Schema (cambio aditivo)

```prisma
model User {
  // ... existente ...
  suspendedAt DateTime? @map("suspended_at")
}
```

Migración local `add_user_suspension` + doc `docs/MIGRACION-PROD-ADMIN.md` con el ritual SQL de Supabase (mismo formato que las anteriores).

### Efecto de la suspensión

1. **Login bloqueado:** en el `authorize()` de NextAuth (credentials), si `user.suspendedAt != null` → rechazar con el mensaje "Tu cuenta está suspendida.".
2. **Sesiones existentes bloqueadas para actuar:** `requireUser()` (en `src/lib/auth.ts`) consulta el usuario y lanza 403 "Tu cuenta está suspendida." si `suspendedAt != null`. Con eso, TODA acción autenticada (votar, comentar, publicar, solicitudes) queda bloqueada sin tocar cada endpoint. `getSessionUser()` (solo lectura) no cambia.

Nota de rendimiento: `requireUser()` hoy no consulta la base (lee el JWT). Pasa a hacer un `findUnique` por request autenticada — aceptable al volumen actual y es lo que garantiza que la suspensión aplique de inmediato.

### Endpoints (nuevos, solo ADMIN)

- `GET /api/admin/users?q=&page=` — lista paginada (20 por página): `{ id, name, email, role, createdAt, suspendedAt, _count: { products } }`. `q` busca en nombre y email (insensible a mayúsculas).
- `PATCH /api/admin/users/[id]` — body Zod: `{ role?: "USER"|"MODERATOR"|"ADMIN", suspended?: boolean }` (al menos uno). `suspended: true` → `suspendedAt = now()`; `false` → `null`.
- `DELETE /api/admin/users/[id]` — borra la cuenta (las relaciones ya tienen `onDelete: Cascade`).

### Protecciones (server-side, en los 3 endpoints de mutación)

- No puedes cambiarte el rol, suspenderte ni borrarte a ti mismo (`id === session.user.id` → 400).
- No se puede bajar de rol, suspender ni borrar al **último ADMIN activo**: si el usuario objetivo es ADMIN sin suspender y el total de ADMINs sin suspender es 1, la operación se rechaza con 400.
- Confirmación doble en la UI para borrar (escribir el nombre del usuario, mismo patrón del Danger Zone del perfil).

### UI

Buscador + tabla: nombre, email, chip de rol, fecha de registro, nº productos, chip "Suspendido" si aplica. Menú de acciones por fila: Rol → (3 opciones), Suspender/Reactivar, Borrar. Estados de carga por fila (`busyId`), errores en `Alert`.

## Feature 3 — Pestaña Productos

### Endpoint

`GET /api/admin/products?q=&status=&page=` (nuevo, solo ADMIN) — lista paginada con TODOS los estados (DRAFT/SCHEDULED/LIVE/ARCHIVED, que la vista pública no expone): `{ id, name, slug, status, launchDate, createdAt, maker: { name, email }, _count: { upvotes, comments } }`.

### Acciones

- **Ver** → link a `/products/[slug]` (el staff ya puede ver no-LIVE por el bypass existente).
- **Archivar** → reutiliza `DELETE /api/products/[slug]` existente (staff ya autorizado, soft-delete a ARCHIVED). Sin endpoint nuevo.
- Destacar/editar desde el panel: **fuera de alcance** (destacar es Sprint 3; editar ya se puede desde la página del producto como staff).

### UI

Buscador + filtro por estado (chips) + tabla: logo mini, nombre, maker, estado, votos, fecha. Acción por fila: Ver / Archivar (confirmación simple).

## Fuera de alcance

- Gráficas por día (decisión explícita: tarjetas con deltas 7/30).
- Destacar lanzamientos / cobros (Sprint 3).
- Logs de auditoría de acciones admin (YAGNI por ahora).
- Notificar por email al usuario suspendido/borrado.
- Cambios a las pestañas Reportes y Logros existentes.

## Seguridad (piso innegociable)

- Todos los endpoints nuevos: `requireUser()` + chequeo `role === "ADMIN"` server-side (los de moderación existentes siguen aceptando MODERATOR).
- Bodies validados con Zod; `q` con `.trim().max(100)`; paginación con tope (`pageSize` fijo 20).
- Sin claves nuevas ni datos sensibles al cliente: la lista de usuarios expone email (necesario para administrar) solo a ADMIN.
- Migración aditiva; producción vía ritual SQL en Supabase.

## Testing

- Unit: schema Zod del PATCH de usuarios (rol inválido, body vacío → 400).
- Integración (patrón `flows.test.ts`): stats devuelve counts coherentes; PATCH rol funciona y bloquea auto-cambio y último-ADMIN; suspensión bloquea `requireUser` (una acción autenticada devuelve 403) y reactivación la desbloquea; DELETE borra en cascada; los 3 endpoints devuelven 403 para MODERATOR y USER.
- E2E manual contra dev server antes del PR (ritual de siempre).
