ALTER TABLE "users"
  ADD COLUMN "onboarding_tour_completed" BOOLEAN NOT NULL DEFAULT false;

-- Existing members already know the product; keep first-run onboarding for new profiles.
UPDATE "users"
SET "onboarding_tour_completed" = true
WHERE "floor" IS NOT NULL AND "room" IS NOT NULL;

CREATE TABLE "feedback" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "message" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "feedback_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "feedback_created_at_idx" ON "feedback"("created_at" DESC);
