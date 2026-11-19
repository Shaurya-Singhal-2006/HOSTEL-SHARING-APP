ALTER TABLE "users"
  ADD COLUMN "google_id" TEXT,
  ADD COLUMN "avatar_url" TEXT,
  ADD COLUMN "joined_hostel" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "users"
  ALTER COLUMN "block" DROP NOT NULL,
  ALTER COLUMN "floor" DROP NOT NULL,
  ALTER COLUMN "room" DROP NOT NULL;

CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");
