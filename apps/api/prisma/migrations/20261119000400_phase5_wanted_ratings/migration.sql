ALTER TYPE "WantedStatus" ADD VALUE IF NOT EXISTS 'closed';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'wanted_response';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'wanted_helper_selected';

ALTER TABLE "wanted_posts" ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT 'Other';
ALTER TABLE "wanted_posts" ADD COLUMN IF NOT EXISTS "helper_id" UUID;
ALTER TABLE "wanted_posts" ALTER COLUMN "needed_by" DROP NOT NULL;
CREATE INDEX IF NOT EXISTS "wanted_posts_status_created_at_idx"
  ON "wanted_posts"("status", "created_at" DESC);
ALTER TABLE "wanted_posts" ADD CONSTRAINT "wanted_posts_helper_id_fkey"
  FOREIGN KEY ("helper_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

DELETE FROM "wanted_responses" a
USING "wanted_responses" b
WHERE a."wanted_post_id" = b."wanted_post_id"
  AND a."responder_id" = b."responder_id"
  AND (a."created_at", a."id") > (b."created_at", b."id");
CREATE UNIQUE INDEX IF NOT EXISTS "wanted_responses_wanted_post_id_responder_id_key"
  ON "wanted_responses"("wanted_post_id", "responder_id");

ALTER TABLE "notifications" ALTER COLUMN "request_id" DROP NOT NULL;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "wanted_post_id" UUID;
CREATE INDEX IF NOT EXISTS "notifications_wanted_post_id_idx" ON "notifications"("wanted_post_id");
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_wanted_post_id_fkey"
  FOREIGN KEY ("wanted_post_id") REFERENCES "wanted_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_exactly_one_target_check"
  CHECK (("request_id" IS NOT NULL) <> ("wanted_post_id" IS NOT NULL));

ALTER TABLE "ratings" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX IF NOT EXISTS "ratings_to_user_id_created_at_idx"
  ON "ratings"("to_user_id", "created_at" DESC);
