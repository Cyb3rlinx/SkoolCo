# 🗄️ Migración de producción — Logros guardados (SavedCommunityLink)

**Willy: pegar TODO el bloque SQL de abajo en el SQL Editor de Supabase** (proyecto `skoolco`, base `main`/producción) → **Run** → debe decir **"Success. No rows returned"**.

Correr esto **ANTES de mergear el PR**. Todo es aditivo: una sola tabla nueva (`saved_community_links`), sin tocar nada existente.

## Migración completa (copiar todo el bloque)

```sql
-- 1) Tabla de logros guardados
CREATE TABLE "saved_community_links" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "link_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_community_links_pkey" PRIMARY KEY ("id")
);

-- 2) Índices
CREATE INDEX "saved_community_links_user_id_idx" ON "saved_community_links"("user_id");
CREATE UNIQUE INDEX "saved_community_links_user_id_link_id_key" ON "saved_community_links"("user_id", "link_id");

-- 3) Foreign keys
ALTER TABLE "saved_community_links" ADD CONSTRAINT "saved_community_links_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "saved_community_links" ADD CONSTRAINT "saved_community_links_link_id_fkey" FOREIGN KEY ("link_id") REFERENCES "community_links"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 4) Marcar la migración como aplicada (recién cuando todo lo anterior corrió sin error)
INSERT INTO "_prisma_migrations"
  (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
VALUES
  (gen_random_uuid(), 'c6ee5df3ac6639d5788668847e04661547065a957343e95b023c637ec28e31a8',
   now(), '20260717211506_add_saved_community_links', NULL, NULL, now(), 1);
```

## Verificación posterior

```sql
SELECT count(*) FROM saved_community_links;

SELECT indexname FROM pg_indexes WHERE tablename = 'saved_community_links';
```

- La primera debe devolver `0` (tabla nueva y vacía) sin error.
- La segunda debe listar `saved_community_links_pkey`, `saved_community_links_user_id_idx` y `saved_community_links_user_id_link_id_key`.

## Después de mergear

1. Vercel despliega solo.
2. Verificación rápida en producción:
   - Entrar a `/logros` (link "Logros" nuevo en el header, reemplaza a Colecciones).
   - Con sesión iniciada, guardar un logro con el botón de marcador y confirmar que aparece en `/profile` bajo "Logros guardados".
   - Quitarlo desde el perfil y confirmar que desaparece.
