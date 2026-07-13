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
