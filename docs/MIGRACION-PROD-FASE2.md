# 🗄️ Migración de producción — Fase 2 (puente de compraventa)

**Willy: pegar TODO el bloque SQL de abajo en el SQL Editor de Supabase** (proyecto `skoolco`, base `main`/producción) → **Run** → debe decir **"Success. No rows returned"**.

Correr esto **ANTES de mergear el PR** de la rama `fase-2-puente-compraventa`. El código nuevo tolera que la tabla ya exista antes del deploy; la tabla sin el código desplegado todavía no molesta a nada de lo que ya está en producción.

## Verificación previa (opcional, solo lectura)

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'products' AND column_name IN ('open_to_offers', 'declared_mrr_usd', 'monetization_note');
```

Si devuelve 0 filas, la migración todavía no se aplicó — sigue con el bloque de abajo.

## Migración completa (copiar todo el bloque)

```sql
-- CreateEnum
CREATE TYPE "ContactRequestStatus" AS ENUM ('PENDING', 'SHARED', 'DISMISSED');

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "declared_mrr_usd" INTEGER,
ADD COLUMN     "monetization_note" TEXT,
ADD COLUMN     "open_to_offers" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "contact_requests" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "buyer_id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "ContactRequestStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contact_requests_product_id_status_idx" ON "contact_requests"("product_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "contact_requests_product_id_buyer_id_key" ON "contact_requests"("product_id", "buyer_id");

-- AddForeignKey
ALTER TABLE "contact_requests" ADD CONSTRAINT "contact_requests_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_requests" ADD CONSTRAINT "contact_requests_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "_prisma_migrations"
  (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
VALUES
  (gen_random_uuid(), 'b0d24896ebc65932b562bcc36c1fba00f3cf084e47454bc325f5fee9ec0ec03d',
   now(), '20260713222156_add_offer_bridge', NULL, NULL, now(), 1);
```

## Verificación posterior

```sql
SELECT migration_name FROM _prisma_migrations WHERE migration_name LIKE '%add_offer_bridge%';
```

Debe devolver **1 fila**. Con eso, producción queda lista para el redeploy de Vercel (automático al mergear el PR).

## Después de mergear

1. Vercel despliega solo (push a `main` dispara el deploy).
2. Verificación rápida: `curl https://denveler.com/api/products/focusflow` debe incluir `"openToOffers":false` en la respuesta.
3. Prueba real (opcional): marca un producto tuyo como "Abierto a ofertas" desde su página y pide que Kevin te mande una solicitud de contacto desde su cuenta. Revisa `/profile` para compartir o descartar.
