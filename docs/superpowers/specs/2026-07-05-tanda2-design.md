# Diseño — Tanda 2: DX, features de producto y tests de integración

**Fecha:** 5 de julio de 2026
**Estado:** Aprobado por Willy (diseño presentado en chat)

Contexto: sigue a `2026-07-05-backend-hardening-design.md`. Backend ya endurecido,
subido a `Cyb3rlinx/SkoolCo`, CI en verde.

## Features

1. **OpenAPI + docs** — `public/openapi.yaml` (contrato completo de todos los
   endpoints: bodies, respuestas, errores, auth) + `GET /api/docs` sirviendo
   Swagger UI (CDN) apuntando a `/openapi.yaml`.
2. **Tests de integración con DB real** — `tests/integration/` (Vitest, config
   propia, script `test:integration`, solo corre con `DATABASE_URL`). Flujos:
   registro, producto→upvote→leaderboard, forgot→reset. Sesión simulada mockeando
   `getServerSession`. CI: service container Postgres 16 + `migrate deploy`.
3. **Seed demo rico** — ~8 productos en varias categorías, upvotes y comentarios
   distribuidos, leaderboard poblado.
4. **Borrado de cuenta** — `DELETE /api/me` con confirmación por contraseña en el
   body. Cascadas ya definidas en schema; reports resueltos conservan historial
   con `resolvedBy = null`.
5. **Auditoría de moderación** — `resolvedAt DateTime?` en `ModerationReport`
   (migración), seteado al resolver/descartar; expuesto en listados.
6. **Notificaciones in-app** — modelo `Notification { userId, type (UPVOTE|COMMENT),
   actorId, productId?, commentId?, readAt?, createdAt }` (migración). Se crean al
   recibir upvote/comentario (nunca self). Endpoints: `GET /api/notifications`
   (propias, paginadas) y `PATCH /api/notifications/read` ({ ids? } — sin ids marca
   todas).
7. **Búsqueda** — param `q` en `GET /api/products`: `contains` case-insensitive
   sobre name/tagline/description. YAGNI: sin tsvector hasta que el volumen lo pida.
8. **Node 22 en CI** — bump de `node-version`.

## Decisiones

- Borrar cuenta exige contraseña (destructivo; sesión sola no alcanza).
- Notificaciones: creación inline en las rutas de upvote/comment (sin colas; MVP
  single-server). Nunca notificar al propio actor.
- Swagger UI vía CDN: aceptable (página de docs para devs, no producto).
- Integración: mock de `getServerSession` (no se testea NextAuth en sí).

## Orden de ejecución

8 → 5 → 4 → 7 → 6 → 3 → 1 → 2 (migraciones chicas primero; docs y tests al final
porque documentan/prueban todo lo anterior).

## Fuera de alcance

- tsvector/full-text, colas para notificaciones, emails de notificación,
  push/websockets, panel de admin.
