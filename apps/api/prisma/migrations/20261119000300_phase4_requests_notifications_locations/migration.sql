ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_block_check";
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_floor_check";
UPDATE "users"
SET "room" = CASE
  WHEN upper(trim("room")) ~ '^[A-Z][0-9]{1,3}$' THEN upper(trim("room"))
  WHEN "block" IS NOT NULL AND upper(trim("block"::text || trim("room"))) ~ '^[A-Z][0-9]{1,3}$'
    THEN upper(trim("block"::text || trim("room")))
  ELSE NULL
END;
ALTER TABLE "users" DROP COLUMN "block";
ALTER TABLE "users" ALTER COLUMN "floor" DROP NOT NULL;
DROP INDEX IF EXISTS "users_community_id_block_floor_idx";
CREATE INDEX "users_community_id_floor_idx" ON "users"("community_id", "floor");
ALTER TABLE "users" ADD CONSTRAINT "users_floor_check" CHECK ("floor" IS NULL OR "floor" BETWEEN 0 AND 5);
ALTER TABLE "users" ADD CONSTRAINT "users_room_format_check" CHECK ("room" IS NULL OR "room" ~ '^[A-Z][0-9]{1,3}$');

ALTER TABLE "requests" ADD COLUMN "returned_at" TIMESTAMPTZ(6);
ALTER TABLE "requests" ADD COLUMN "decline_reason" VARCHAR(200);
ALTER TABLE "requests" ADD COLUMN "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;
DROP INDEX IF EXISTS "requests_item_id_idx";
CREATE INDEX "requests_item_id_status_idx" ON "requests"("item_id", "status");
CREATE UNIQUE INDEX "requests_one_active_per_borrower_item_idx" ON "requests"("borrower_id", "item_id") WHERE "status" IN ('pending', 'accepted');

CREATE TYPE "NotificationType" AS ENUM ('request_made', 'request_accepted', 'request_declined', 'request_cancelled', 'request_returned');
CREATE TABLE "notifications" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "type" "NotificationType" NOT NULL,
  "request_id" UUID NOT NULL,
  "message" TEXT NOT NULL,
  "read" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "notifications_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at" DESC);
CREATE INDEX "notifications_request_id_idx" ON "notifications"("request_id");
