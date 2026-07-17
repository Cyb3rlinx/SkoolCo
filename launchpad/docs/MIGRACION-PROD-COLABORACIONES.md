# 🗄️ Migración de producción — Colaboraciones (tablón busco/ofrezco servicio)

**Willy: pegar TODO el bloque SQL de abajo en el SQL Editor de Supabase** (proyecto `skoolco`, base `main`/producción) → **Run** → debe decir **"Success. No rows returned"**.

Correr esto **ANTES de mergear el PR** de la rama `colaboraciones`. Todo es aditivo: un enum nuevo, dos tablas nuevas, una columna nueva nullable en `moderation_reports`.

## Migración completa (copiar todo el bloque)

```sql
-- 1) Enum del tipo de anuncio
CREATE TYPE "CollaborationType" AS ENUM ('NEEDS', 'OFFERS');

-- 2) Tabla de anuncios
CREATE TABLE "collaborations" (
    "id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "type" "CollaborationType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "tags" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collaborations_pkey" PRIMARY KEY ("id")
);

-- 3) Tabla de solicitudes de contacto sobre anuncios
CREATE TABLE "collaboration_contact_requests" (
    "id" TEXT NOT NULL,
    "collaboration_id" TEXT NOT NULL,
    "responder_id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "ContactRequestStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collaboration_contact_requests_pkey" PRIMARY KEY ("id")
);

-- 4) Reportes de moderación sobre anuncios
ALTER TABLE "moderation_reports" ADD COLUMN "collaboration_id" TEXT;

-- 5) Índices
CREATE INDEX "collaborations_type_created_at_idx" ON "collaborations"("type", "created_at");
CREATE INDEX "collaborations_author_id_idx" ON "collaborations"("author_id");
CREATE UNIQUE INDEX "collaboration_contact_requests_collab_responder_key" ON "collaboration_contact_requests"("collaboration_id", "responder_id");
CREATE INDEX "collaboration_contact_requests_collaboration_id_status_idx" ON "collaboration_contact_requests"("collaboration_id", "status");

-- 6) Foreign keys
ALTER TABLE "collaborations" ADD CONSTRAINT "collaborations_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "collaboration_contact_requests" ADD CONSTRAINT "collaboration_contact_requests_collaboration_id_fkey" FOREIGN KEY ("collaboration_id") REFERENCES "collaborations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "collaboration_contact_requests" ADD CONSTRAINT "collaboration_contact_requests_responder_id_fkey" FOREIGN KEY ("responder_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "moderation_reports" ADD CONSTRAINT "moderation_reports_collaboration_id_fkey" FOREIGN KEY ("collaboration_id") REFERENCES "collaborations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 7) Marcar la migración como aplicada (recién cuando todo lo anterior corrió sin error)
INSERT INTO "_prisma_migrations"
  (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
VALUES
  (gen_random_uuid(), '562946a6639a4451837ce156c35d533961b056f3c76cd69666621305880542f4',
   now(), '20260717130000_add_collaborations', NULL, NULL, now(), 1);
```

**Nota:** el nombre del índice único (`collaboration_contact_requests_collab_responder_key`) es deliberadamente corto — el nombre "natural" de Prisma superaba el límite de 63 bytes de Postgres y se truncaba en silencio. El `map:` explícito en `schema.prisma` mantiene todo consistente.

**Nota de proceso:** migración escrita y aplicada a mano en local (`prisma db execute --stdin` + `prisma migrate resolve --applied`); el checksum de arriba es el sha256 real de `migration.sql`.

## Verificación posterior

```sql
SELECT count(*) FROM collaborations;

SELECT count(*) FROM collaboration_contact_requests;

SELECT column_name FROM information_schema.columns
WHERE table_name = 'moderation_reports' AND column_name = 'collaboration_id';

SELECT indexname FROM pg_indexes WHERE tablename = 'collaboration_contact_requests';
```

- Las dos primeras deben devolver `0` (tablas nuevas y vacías) sin error.
- La tercera debe devolver la fila `collaboration_id`.
- La cuarta debe listar `collaboration_contact_requests_pkey`, `collaboration_contact_requests_collab_responder_key` y `collaboration_contact_requests_collaboration_id_status_idx`.

## Después de mergear

1. Vercel despliega solo (incluye el cron diario nuevo `/api/cron/collaboration-cleanup` a las 05:00 UTC, definido en `vercel.json`).
2. Verificación rápida en producción:
   - Entrar a `/colaboraciones` (link "Colaboraciones" en el header) y publicar un anuncio de prueba de cada tipo.
   - Con otra cuenta, solicitar contacto en uno — confirmar que llega el email al autor.
   - Desde el perfil del autor, "Compartir mi email" — confirmar que llega el email a quien respondió.
   - Reportar un anuncio y confirmar que aparece en `/admin` → Reportes con la etiqueta "Colaboración" y link.
   - Borrar el anuncio de prueba como autor (botón en el detalle) y confirmar el redirect al listado.
   - Cambiar de idioma (EN / 中文) y confirmar que la sección está traducida.
