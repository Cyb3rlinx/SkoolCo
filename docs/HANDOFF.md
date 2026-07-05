# 🤝 Handoff — Backend LaunchPad (Cofounder 2)

**Fecha:** 5 de julio de 2026
**Estado:** ✅ MVP backend completo, verificado y listo para integrar
**Entregable:** `launchpad-backend-git.zip` (incluye historial git con commit inicial)

---

## 1. Qué es esto

Backend completo de la plataforma comunitaria de lanzamiento de productos (inspirada a alto nivel en plataformas tipo Product Hunt, sin copiar marca ni funcionalidad propietaria). Los usuarios crean cuenta, publican sus productos, descubren lanzamientos, dan upvotes, comentan y suben en un leaderboard.

## 2. Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 14 (App Router, API REST) |
| Lenguaje | TypeScript estricto |
| Base de datos | PostgreSQL (compatible con Supabase) |
| ORM | Prisma + migraciones SQL |
| Autenticación | NextAuth — email/contraseña (bcrypt), sesiones JWT, roles |
| Validación | Zod en todos los endpoints de escritura |

## 3. Cómo levantarlo (primera vez)

```bash
unzip launchpad-backend-git.zip && cd launchpad
cp .env.example .env        # rellenar DATABASE_URL y NEXTAUTH_SECRET
npm install
npm run db:generate         # genera el cliente Prisma
npm run db:deploy           # crea TODAS las tablas y la vista del leaderboard
npm run db:seed             # datos de prueba
npm run dev                 # http://localhost:3000
```

**Variables de entorno** (nunca subir `.env` al repo — ya está en `.gitignore`):

| Variable | Qué es |
|---|---|
| `DATABASE_URL` | Cadena de conexión de Supabase (Settings → Database → Connection string, "Session pooler") o Postgres local |
| `NEXTAUTH_SECRET` | Secreto para firmar sesiones. Generar con `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `http://localhost:3000` en desarrollo; la URL real en producción |
| `SEED_USER_PASSWORD` | (Opcional, solo dev) contraseña de las cuentas demo |

**Cuentas demo del seed** (contraseña `changeme123`):
`admin@example.com` (ADMIN) · `mod@example.com` (MODERATOR) · `ana@example.com` y `luis@example.com` (USER)

⚠️ Ambos cofundadores deben apuntar al **mismo** `DATABASE_URL` para compartir datos durante el desarrollo.

## 4. Modelo de datos (8 entidades)

- **users** — cuentas con rol `USER / MODERATOR / ADMIN`, contraseña con bcrypt
- **categories** — categorías con slug
- **products** — lanzamientos con `status: DRAFT / SCHEDULED / LIVE / ARCHIVED`, slug único para las páginas de detalle
- **upvotes** — constraint único `(user_id, product_id)`: **el voto duplicado es imposible a nivel de base de datos**, incluso con requests simultáneos
- **comments** — soft-delete (`deleted_at`) para conservar rastro de moderación
- **moderation_reports** — reportes contra producto o comentario, con flujo de estados
- **leaderboard_entries** — **vista SQL** calculada en vivo (nunca queda desactualizada). Score = lanzamientos LIVE ×10 + upvotes recibidos ×2 + comentarios ×1. Los pesos se ajustan en `prisma/migrations/20260705000002_leaderboard_view/migration.sql`
- **community_links + extension_events** — soporte de la extensión (ver sección 7)

## 5. Contrato de la API

Todas las respuestas: `{ data: … }` en éxito, `{ error: { message, details? } }` en error. Autenticación vía cookie de sesión de NextAuth.

**Auth y perfil**
- `POST /api/auth/register` — crear cuenta `{ name, email, password }`
- `/api/auth/[...nextauth]` — login/logout/sesión (usar `signIn("credentials", { email, password })` de `next-auth/react`)
- `GET /api/me` · `PATCH /api/me` — perfil propio (nombre, bio, avatarUrl)

**Productos**
- `GET /api/products` — lista paginada. Query: `status`, `category` (slug), `sort=newest|top|launching`, `page`, `pageSize`. Anónimos solo ven LIVE; los borradores solo los ve su creador o staff
- `POST /api/products` — publicar (slug se genera solo, a prueba de colisiones)
- `GET /api/products/:slug` — detalle (acepta slug **o** id) e incluye `upvotedByMe` para pintar el botón de voto
- `PATCH /api/products/:slug` · `DELETE` (archiva) — solo creador o staff
- `GET /api/categories` — categorías con conteo de productos live

**Interacción**
- `POST /api/products/:id/upvote` · `DELETE` — idempotentes; solo productos LIVE
- `GET /api/products/:id/comments` · `POST` — comentarios paginados, 1–2000 caracteres
- `DELETE /api/comments/:id` — dueño o staff (soft-delete)
- `GET /api/leaderboard?limit=25`

**Moderación**
- `POST /api/reports` — reportar `{ productId|commentId, reason }`
- `GET /api/reports?status=OPEN` · `PATCH /api/reports/:id` — solo moderador/admin

**Extensión "Logros"**
- `GET /api/community-links` — links verificados (`?mine=1` con sesión: los propios, incl. pendientes)
- `POST /api/community-links` — enviar manualmente un link público `https://…skool.com`
- `PATCH /api/community-links/:id` — verificar/rechazar (staff, revisión humana)
- `DELETE /api/community-links/:id` — el autor borra el suyo
- `POST /api/extension/events` — registrar acción explícita del usuario

## 6. Protección anti-abuso

Rate limits por usuario (ventana deslizante, `src/lib/rate-limit.ts`): upvotes 30/min, comentarios 10/min, publicaciones 5/h, reportes 10/h, links 10/h, registros 5/h por IP.
⚠️ Es en memoria: perfecto para un servidor único (`next start`). Si despliegan en serverless/multi-instancia (Vercel), cambiar el store a Upstash Redis — solo se toca ese módulo.

## 7. Seguridad de la extensión (importante)

Es segura **por construcción**, no solo por política:
1. Toda escritura exige sesión iniciada + acción explícita del usuario
2. **No existe ningún endpoint que actúe sobre Skool** → auto-upvote y bulk-upvote son imposibles de construir sobre esta API
3. El schema **no tiene dónde guardar** credenciales/cookies de Skool
4. El servidor nunca hace fetch a Skool (cero scraping); solo guarda título + URL pública que el usuario envió
5. Los links se publican solo tras verificación humana de un moderador
6. Límite de envíos + constraint único (usuario, URL)

## 8. Estructura del código

```
prisma/schema.prisma          ← todas las entidades
prisma/migrations/            ← tablas + vista del leaderboard
prisma/seed.ts                ← datos demo
src/lib/                      ← db, auth, validación, rate-limit, helpers
src/app/api/…                 ← todos los endpoints (ver sección 5)
src/app/layout.tsx, page.tsx  ← placeholders mínimos — el diseño es del frontend
src/types/next-auth.d.ts      ← tipado de sesión (user.id + user.role)
```

## 9. Qué fue verificado

- ✅ Migraciones aplicadas contra PostgreSQL 16 real
- ✅ Matemática del leaderboard confirmada con datos de prueba (borradores excluidos)
- ✅ Constraint anti-upvote-duplicado probado a nivel SQL
- ✅ Rate limiter y generación de slugs con tests pasando
- ✅ Typecheck limpio (los únicos avisos restantes desaparecen con `npm run db:generate`, que requiere internet)

## 10. Pendientes (fuera del MVP, para después de validar)

- Subir el repo a GitHub (el zip ya incluye `.git` con el commit inicial: `git remote add origin <url> && git push -u origin main`)
- Login con Google/GitHub (opcional; el resto del código solo depende de `session.user.id` y `role`)
- Subida de archivos para logos (hoy se pasa URL)
- Notificaciones por email
- Mover rate limiting a Redis si se despliega serverless
- El código de la extensión de navegador en sí (proyecto aparte; el backend ya la soporta)

**Regla de oro:** primero conectar el frontend y ponerlo en manos de 5–10 personas reales de la comunidad. Que ellas dicten qué se construye después.
