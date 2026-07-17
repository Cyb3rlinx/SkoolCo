# 🗄️ Migración de producción — Comunidad Visible (usernames, insignias, menciones)

**Willy: pegar TODO el bloque SQL de abajo en el SQL Editor de Supabase** (proyecto `skoolco`, base `main`/producción) → **Run** → debe decir **"Success. No rows returned"**.

Correr esto **ANTES de mergear el PR** de la rama `comunidad-visible`. Es aditiva: agrega columnas nullable a `users`, agrega un valor al enum `NotificationType`, y crea dos tablas nuevas (`badges`, `user_badges`) — no toca ni borra nada existente.

Esta migración tiene **dos pasos extra** que los cambios anteriores no tuvieron: un backfill que corre como script (no SQL) y un seed manual del catálogo de insignias. Ver las secciones 2 y 3 más abajo, después del SQL principal.

## 1. Migración completa (copiar todo el bloque)

```sql
-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'MENTION';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "username" TEXT,
ADD COLUMN     "username_changed_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "badges" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_badges" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "badge_id" TEXT NOT NULL,
    "granted_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_badges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "badges_slug_key" ON "badges"("slug");

-- CreateIndex
CREATE INDEX "user_badges_user_id_idx" ON "user_badges"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_badges_user_id_badge_id_key" ON "user_badges"("user_id", "badge_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- AddForeignKey
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "badges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_granted_by_id_fkey" FOREIGN KEY ("granted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "_prisma_migrations"
  (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
VALUES
  (gen_random_uuid(), 'd1aee38162761428abf233e4e5f4252aff38957bc39aa6d29a5faeb6394e30b8',
   now(), '20260717020006_comunidad_visible', NULL, NULL, now(), 1);
```

## 2. Paso adicional: backfill de usernames (NO es SQL)

La lógica de generación de username (slugify + resolución de colisiones) vive en TypeScript, así que este paso corre como **script**, no como SQL pegado en Supabase. Es idempotente — correrlo dos veces no hace daño, solo toca usuarios con `username IS NULL`.

Desde una máquina con acceso a la `DATABASE_URL` de producción (Willy, localmente):

```bash
cd launchpad
DATABASE_URL="<la URL de producción, la misma que usa Vercel>" npx tsx prisma/backfill-usernames.ts
```

Debe imprimir una línea `[backfill-usernames] N usuario(s) sin username.` seguida de un `id -> username` por cada uno, y terminar con `[backfill-usernames] listo.`.

## 3. Paso adicional: seed del catálogo de insignias (SQL manual, NO correr `db:seed` completo)

**No correr `npm run db:seed` contra producción** — crearía usuarios y productos de demo. En vez de eso, pegar este SQL (también en el SQL Editor de Supabase, después del bloque principal):

```sql
INSERT INTO badges (id, slug, name, description, icon, created_at) VALUES
  (gen_random_uuid()::text, 'fundador', 'Fundador', 'Uno de los primeros 10 makers en lanzar en Denveler', '🏛️', now()),
  (gen_random_uuid()::text, 'primer-lanzamiento', 'Primer lanzamiento', 'Publicó su primer producto en Denveler', '🚀', now()),
  (gen_random_uuid()::text, 'top-10-mes', 'Top 10 del mes', 'Producto entre los 10 más votados del mes', '🏆', now()),
  (gen_random_uuid()::text, 'vendido', 'Vendido', 'Concretó la venta de su producto a través de Denveler', '🤝', now())
ON CONFLICT (slug) DO NOTHING;
```

## Verificación posterior

```sql
SELECT migration_name FROM _prisma_migrations WHERE migration_name LIKE '%comunidad_visible%';
SELECT slug FROM badges ORDER BY slug;
SELECT count(*) AS sin_username FROM users WHERE username IS NULL;
```

- La primera debe devolver **1 fila**.
- La segunda debe devolver **4 filas** (`fundador`, `primer-lanzamiento`, `top-10-mes`, `vendido`).
- La tercera debe devolver **0** (si el backfill ya corrió).

## Después de mergear

1. Vercel despliega solo (push a `main` dispara el deploy).
2. El cron mensual `top-month-badges` queda registrado automáticamente vía `vercel.json` (corre el día 1 de cada mes a las 06:00 UTC) — no requiere ningún paso manual adicional.
3. Verificación rápida: `curl https://denveler.com/api/badge.svg?product=<slug-real>` debe devolver un SVG con el nombre del producto.
4. Entrar a **denveler.com/admin** → pestaña **Insignias**: buscar un usuario y confirmar que el otorgar/revocar funciona igual que en local.
