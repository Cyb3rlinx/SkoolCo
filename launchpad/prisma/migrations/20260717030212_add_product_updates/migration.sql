-- CreateTable
CREATE TABLE "product_updates" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_updates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_updates_product_id_created_at_idx" ON "product_updates"("product_id", "created_at");

-- AddForeignKey
ALTER TABLE "product_updates" ADD CONSTRAINT "product_updates_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
