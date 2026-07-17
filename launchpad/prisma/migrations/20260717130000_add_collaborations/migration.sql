-- CreateEnum
CREATE TYPE "CollaborationType" AS ENUM ('NEEDS', 'OFFERS');

-- CreateTable
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

-- CreateTable
CREATE TABLE "collaboration_contact_requests" (
    "id" TEXT NOT NULL,
    "collaboration_id" TEXT NOT NULL,
    "responder_id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "ContactRequestStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collaboration_contact_requests_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "moderation_reports" ADD COLUMN "collaboration_id" TEXT;

-- CreateIndex
CREATE INDEX "collaborations_type_created_at_idx" ON "collaborations"("type", "created_at");
CREATE INDEX "collaborations_author_id_idx" ON "collaborations"("author_id");
CREATE UNIQUE INDEX "collaboration_contact_requests_collaboration_id_responder_id_key" ON "collaboration_contact_requests"("collaboration_id", "responder_id");
CREATE INDEX "collaboration_contact_requests_collaboration_id_status_idx" ON "collaboration_contact_requests"("collaboration_id", "status");

-- AddForeignKey
ALTER TABLE "collaborations" ADD CONSTRAINT "collaborations_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "collaboration_contact_requests" ADD CONSTRAINT "collaboration_contact_requests_collaboration_id_fkey" FOREIGN KEY ("collaboration_id") REFERENCES "collaborations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "collaboration_contact_requests" ADD CONSTRAINT "collaboration_contact_requests_responder_id_fkey" FOREIGN KEY ("responder_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "moderation_reports" ADD CONSTRAINT "moderation_reports_collaboration_id_fkey" FOREIGN KEY ("collaboration_id") REFERENCES "collaborations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
