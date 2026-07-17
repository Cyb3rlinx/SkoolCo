# 🗄️ Migración de producción — Historial de comprador, auto-flagging y bitácora

**Willy: pegar TODO el bloque SQL de abajo en el SQL Editor de Supabase** (proyecto `skoolco`, base `main`/producción) → **Run** → debe decir **"Success. No rows returned"**.

Correr esto **ANTES de mergear el PR** de la rama `mejoras-comunidad-2`. Ambos cambios son aditivos: uno relaja una restricción (`NOT NULL` → nullable, no pierde datos existentes), el otro crea una tabla nueva.

## Migración completa (copiar todo el bloque)

```sql
-- 1) reporter_id nullable — NULL representa un reporte auto-generado por el
--    sistema (detección de contenido sospechoso), no un reporte de usuario.
ALTER TABLE "moderation_reports" ALTER COLUMN "reporter_id" DROP NOT NULL;

-- 2) Bitácora de progreso del maker
CREATE TABLE "product_updates" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_updates_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "product_updates_product_id_created_at_idx" ON "product_updates"("product_id", "created_at");

ALTER TABLE "product_updates" ADD CONSTRAINT "product_updates_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "_prisma_migrations"
  (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
VALUES
  (gen_random_uuid(), 'b6493ec8ac3fcb6169939ed4777fd7e53bd5cf13ac3dd11afb2a43827ba7b31b',
   now(), '20260717025539_auto_flag_nullable_reporter', NULL, NULL, now(), 1),
  (gen_random_uuid(), '44b32da2fc4d6af4762940b16d905d9ef4a8465d0254189918353694755671c9',
   now(), '20260717030212_add_product_updates', NULL, NULL, now(), 1);
```

**Nota de proceso:** estas dos migraciones se escribieron y aplicaron a mano en local (no vía `prisma migrate dev`, que exige una terminal interactiva no disponible en esta sesión nocturna) — el SQL en sí es idéntico a lo que Prisma habría generado para estos cambios de schema, y los checksums de arriba sí son el sha256 real de cada `migration.sql`.

## Verificación posterior

```sql
SELECT column_name, is_nullable FROM information_schema.columns
WHERE table_name = 'moderation_reports' AND column_name = 'reporter_id';

SELECT count(*) FROM product_updates;
```

- La primera debe mostrar `is_nullable = YES`.
- La segunda debe devolver `0` (tabla nueva y vacía) sin error.

## Después de mergear

1. Vercel despliega solo.
2. Verificación rápida: publicar un comentario con un enlace acortado (ej. `bit.ly/algo`) en cualquier producto y confirmar que aparece en `/admin` → Reportes con el texto "🤖 Auto-detectado por el sistema".
3. Como maker dueño de un producto, entrar a su página y confirmar que aparece "Bitácora de progreso" con el composer.
