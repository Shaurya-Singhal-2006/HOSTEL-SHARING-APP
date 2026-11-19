CREATE INDEX "users_community_id_block_floor_idx" ON "users"("community_id", "block", "floor");
CREATE INDEX "items_community_id_created_at_idx" ON "items"("community_id", "created_at" DESC);
CREATE INDEX "items_community_id_category_created_at_idx" ON "items"("community_id", "category", "created_at" DESC);
