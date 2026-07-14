# 🗄️ Migración de producción — Señal del puente de compraventa

**Willy: pegar TODO el bloque SQL de abajo en el SQL Editor de Supabase** (proyecto `skoolco`, base `main`/producción) → **Run** → debe decir **"Success. No rows returned"**.

Correr esto **ANTES de mergear el PR** de la rama `senal-puente-compraventa`. Es aditiva: agrega dos columnas nuevas (con default/nullable) a una tabla existente, no toca ni borra nada.

## Verificación previa (opcional, solo lectura)

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'products' AND column_name IN ('offer_view_count', 'offer_nudge_sent_at');
```

Si devuelve 0 filas, la migración todavía no se aplicó — sigue con el bloque de abajo.

## Migración completa (copiar todo el bloque)

```sql
-- AlterTable
ALTER TABLE "products" ADD COLUMN     "offer_nudge_sent_at" TIMESTAMP(3),
ADD COLUMN     "offer_view_count" INTEGER NOT NULL DEFAULT 0;

INSERT INTO "_prisma_migrations"
  (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
VALUES
  (gen_random_uuid(), '8f68091f3166472bb8d08c5fd16fb5ab0327a9fc0ddf6c9fd51e67106cf0b8fe',
   now(), '20260714004135_add_offer_signal', NULL, NULL, now(), 1);
```

## Verificación posterior

```sql
SELECT migration_name FROM _prisma_migrations WHERE migration_name LIKE '%add_offer_signal%';
```

Debe devolver **1 fila**. Con eso, producción queda lista para el redeploy de Vercel (automático al mergear el PR).

## Después de mergear

1. Vercel despliega solo (push a `main` dispara el deploy).
2. **Configurar la variable de entorno `CRON_SECRET` en el proyecto de Vercel** (Settings → Environment Variables). Usa un valor aleatorio largo, por ejemplo generado con:
   ```
   openssl rand -hex 32
   ```
   Sin esta variable, el endpoint `/api/cron/offer-nudge` queda sin autenticación en producción — cualquiera podría dispararlo manualmente (no es grave por sí solo, ya que es idempotente y solo manda un email por producto una vez en su vida, pero conviene protegerlo igual).
3. Confirmar que el cron aparece en el dashboard de Vercel: **Settings → Cron Jobs** → debe listar `/api/cron/offer-nudge` con el schedule `0 14 * * *`.
4. Verificación rápida: `curl https://denveler.com/api/products/focusflow` debe incluir `"offerViewCount"` en la respuesta.
5. Verificación de que `CRON_SECRET` quedó bien configurado: `curl -i https://denveler.com/api/cron/offer-nudge` (sin header) debe devolver **401** — si devuelve 200, la variable no se guardó.
