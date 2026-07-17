# 🗄️ Migración de producción — Colecciones, seguir makers, MRR verificado, vendido

**Willy: pegar TODO el bloque SQL de abajo en el SQL Editor de Supabase** (proyecto `skoolco`, base `main`/producción) → **Run** → debe decir **"Success. No rows returned"**.

Correr esto **ANTES de mergear el PR** de la rama `comunidad-3-descubrimiento-y-mas`. Es aditiva: agrega columnas nullable, crea 3 tablas nuevas, agrega un valor al enum `NotificationType`, y relaja una restricción (`reporter_id` deja de ser obligatorio) — no toca ni borra nada existente.

## Migración completa (copiar todo el bloque)

```sql
-- AlterTable
ALTER TABLE "products" ADD COLUMN "mrr_verified_at" TIMESTAMP(3);
ALTER TABLE "products" ADD COLUMN "sold_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "collections" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collection_products" (
    "id" TEXT NOT NULL,
    "collection_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collection_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follows" (
    "id" TEXT NOT NULL,
    "follower_id" TEXT NOT NULL,
    "following_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "collections_slug_key" ON "collections"("slug");

-- CreateIndex
CREATE INDEX "collection_products_collection_id_sort_idx" ON "collection_products"("collection_id", "sort");

-- CreateIndex
CREATE UNIQUE INDEX "collection_products_collection_id_product_id_key" ON "collection_products"("collection_id", "product_id");

-- CreateIndex
CREATE INDEX "follows_following_id_idx" ON "follows"("following_id");

-- CreateIndex
CREATE UNIQUE INDEX "follows_follower_id_following_id_key" ON "follows"("follower_id", "following_id");

-- AddForeignKey
ALTER TABLE "collections" ADD CONSTRAINT "collections_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_products" ADD CONSTRAINT "collection_products_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_products" ADD CONSTRAINT "collection_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_following_id_fkey" FOREIGN KEY ("following_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'FOLLOWED_LAUNCH';

-- AlterTable
-- reporter_id nullable: NULL = reporte auto-generado por el sistema.
ALTER TABLE "moderation_reports" ALTER COLUMN "reporter_id" DROP NOT NULL;

INSERT INTO "_prisma_migrations"
  (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
VALUES
  (gen_random_uuid(), '668608fd9115ac22f79d62ec0c194ee67d228475225e8afe2eedd4adb86534c1',
   now(), '20260717063913_descubrimiento_batch', NULL, NULL, now(), 1);
```

**Nota de proceso:** esta migración se escribió y aplicó a mano en local (no vía `prisma migrate dev`, que exige una terminal interactiva no disponible en esta sesión) — el SQL es idéntico a lo que Prisma habría generado, y el checksum de arriba es el sha256 real del `migration.sql`.

⚠️ **Coordinación con PR #10** (`mejoras-comunidad-2`, ya fusionado o pendiente): esa rama también relaja `moderation_reports.reporter_id` a nullable. Si el SQL de esa rama ya corrió en producción, **omitir la línea `ALTER TABLE "moderation_reports" ALTER COLUMN "reporter_id" DROP NOT NULL;`** de este bloque — Postgres no se queja si se repite (es idempotente para esta operación puntual), pero es más prolijo saltarla si ya se aplicó.

## Verificación posterior

```sql
SELECT migration_name FROM _prisma_migrations WHERE migration_name LIKE '%descubrimiento_batch%';
SELECT count(*) FROM collections;
SELECT count(*) FROM follows;
SELECT column_name, is_nullable FROM information_schema.columns
WHERE table_name = 'products' AND column_name IN ('mrr_verified_at', 'sold_at');
```

- La primera debe devolver **1 fila**.
- Las dos siguientes deben devolver **0** (tablas nuevas, vacías).
- La última debe mostrar ambas columnas con `is_nullable = YES`.

## Después de mergear

1. Vercel despliega solo.
2. Entrar a **denveler.com/admin** → pestaña **Colecciones**: crear una colección de prueba, agregar un producto, confirmar que aparece en `/colecciones`.
3. Verificación rápida: `curl https://denveler.com/api/feed.rss` debe devolver XML válido.
4. Confirmar que el checkbox "Solo abiertos a ofertas" filtra correctamente en `/launches`.
