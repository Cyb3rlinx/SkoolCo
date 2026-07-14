-- AlterTable
ALTER TABLE "products" ADD COLUMN     "offer_nudge_sent_at" TIMESTAMP(3),
ADD COLUMN     "offer_view_count" INTEGER NOT NULL DEFAULT 0;
