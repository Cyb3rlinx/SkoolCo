-- CreateTable
CREATE TABLE "saved_community_links" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "link_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_community_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "saved_community_links_user_id_idx" ON "saved_community_links"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "saved_community_links_user_id_link_id_key" ON "saved_community_links"("user_id", "link_id");

-- AddForeignKey
ALTER TABLE "saved_community_links" ADD CONSTRAINT "saved_community_links_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_community_links" ADD CONSTRAINT "saved_community_links_link_id_fkey" FOREIGN KEY ("link_id") REFERENCES "community_links"("id") ON DELETE CASCADE ON UPDATE CASCADE;
