# 🗄️ Migración de producción — Favoritos, respuestas, verificación y categorías de reporte

**Willy: pegar TODO el bloque SQL de abajo en el SQL Editor de Supabase** (proyecto `skoolco`, base `main`/producción) → **Run** → debe decir **"Success. No rows returned"**.

Correr esto **ANTES de mergear el PR** de la rama `comunidad-4-social-y-mas`. Todo es aditivo: una columna nueva nullable, una tabla nueva, una columna nueva con default, un enum nuevo.

## Migración completa (copiar todo el bloque)

```sql
-- 1) Insignia de maker verificado
ALTER TABLE "users" ADD COLUMN "verified_at" TIMESTAMP(3);

-- 2) Favoritos/guardados
CREATE TABLE "saved_products" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_products_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "saved_products_user_id_idx" ON "saved_products"("user_id");
CREATE UNIQUE INDEX "saved_products_user_id_product_id_key" ON "saved_products"("user_id", "product_id");

ALTER TABLE "saved_products" ADD CONSTRAINT "saved_products_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "saved_products" ADD CONSTRAINT "saved_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 3) Respuestas a comentarios (un nivel)
ALTER TABLE "comments" ADD COLUMN "parent_id" TEXT;

CREATE INDEX "comments_parent_id_idx" ON "comments"("parent_id");

ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 4) Categorías de motivo en reportes
CREATE TYPE "ReportCategory" AS ENUM ('SPAM', 'SCAM', 'INAPPROPRIATE', 'OTHER');

ALTER TABLE "moderation_reports" ADD COLUMN "category" "ReportCategory" NOT NULL DEFAULT 'OTHER';

INSERT INTO "_prisma_migrations"
  (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
VALUES
  (gen_random_uuid(), 'deb66c2cbd72a9431d45643d6d19bae4a3e111db91ebf91b2b7c89eec5a0e43e',
   now(), '20260717080540_social_batch', NULL, NULL, now(), 1);
```

**Nota de proceso:** esta migración se escribió y aplicó a mano en local (`prisma db execute --stdin` + `prisma migrate resolve --applied`, ya que `prisma migrate dev` exige una terminal interactiva no disponible en esta sesión) — el SQL en sí es idéntico a lo que Prisma habría generado para este cambio de schema, y el checksum de arriba es el sha256 real de `migration.sql`.

**Nota de alcance:** "feed de actividad de seguidos" quedó fuera de este lote — depende del modelo `Follow` del PR #11 (`comunidad-3-descubrimiento-y-mas`), que todavía no está mergeado. Recrearlo acá en una rama independiente crearía una tabla `follows` duplicada y un choque real al mergear ambos PRs.

## Verificación posterior

```sql
SELECT column_name, is_nullable FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'verified_at';

SELECT count(*) FROM saved_products;

SELECT column_name FROM information_schema.columns
WHERE table_name = 'comments' AND column_name = 'parent_id';

SELECT category, count(*) FROM moderation_reports GROUP BY category;
```

- La primera debe mostrar `is_nullable = YES`.
- La segunda debe devolver `0` (tabla nueva y vacía) sin error.
- La tercera debe devolver la fila `parent_id`.
- La cuarta debe agrupar los reportes existentes, todos bajo `OTHER` (el default).

## Después de mergear

1. Vercel despliega solo.
2. Verificación rápida:
   - Comentar en un producto y usar "Responder" en un comentario ajeno — confirmar que aparece anidado y sin su propio botón de responder.
   - Desde `/admin` → Usuarios, verificar a un maker y confirmar el check azul en su tarjeta de producto y en su perfil público.
   - Guardar un producto desde su página y confirmar que aparece en "Guardados" del perfil.
   - Reportar un producto eligiendo una categoría distinta de "Otro" y confirmar que se ve en `/admin` → Reportes.
   - Como dueño de un producto, confirmar que aparece "Insights (últimos 14 días)" con las líneas de votos/comentarios.
   - Archivar un producto propio y confirmar que aparece "Relanzamiento rápido"; usarlo y confirmar que crea un borrador nuevo con slug propio.
