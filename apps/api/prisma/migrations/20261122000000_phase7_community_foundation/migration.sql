CREATE TYPE "CommunityType" AS ENUM ('hostel', 'apartment', 'office', 'college', 'other');
CREATE TYPE "CommunityJoinMode" AS ENUM ('open_with_code', 'approval_required');
CREATE TYPE "CommunityMemberRole" AS ENUM ('admin', 'member');
CREATE TYPE "CommunityMemberStatus" AS ENUM ('active', 'pending', 'removed');
CREATE TYPE "ReportTargetType" AS ENUM ('user', 'item');
CREATE TYPE "ReportStatus" AS ENUM ('open', 'dismissed', 'actioned');

ALTER TABLE "communities"
  ADD COLUMN "type" "CommunityType" NOT NULL DEFAULT 'other',
  ADD COLUMN "description" TEXT,
  ADD COLUMN "invite_code" VARCHAR(8),
  ADD COLUMN "created_by" UUID,
  ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "join_mode" "CommunityJoinMode" NOT NULL DEFAULT 'open_with_code',
  ADD COLUMN "icon" TEXT,
  ADD COLUMN "accent_color" VARCHAR(7),
  ADD COLUMN "level1_label" TEXT NOT NULL DEFAULT 'Floor',
  ADD COLUMN "level2_label" TEXT NOT NULL DEFAULT 'Room',
  ADD COLUMN "level1_options" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE TABLE "community_members" (
  "id" UUID NOT NULL,
  "community_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "role" "CommunityMemberRole" NOT NULL DEFAULT 'member',
  "status" "CommunityMemberStatus" NOT NULL DEFAULT 'active',
  "level1_value" TEXT,
  "level2_value" VARCHAR(10),
  "trust_score" INTEGER NOT NULL DEFAULT 0,
  "accepted_guidelines_at" TIMESTAMPTZ(6),
  "joined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "community_members_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "community_members_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "community_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

ALTER TABLE "requests" ADD COLUMN "community_id" UUID;
ALTER TABLE "wanted_responses" ADD COLUMN "community_id" UUID;
ALTER TABLE "ratings" ADD COLUMN "community_id" UUID;
ALTER TABLE "notifications" ADD COLUMN "community_id" UUID;
ALTER TABLE "feedback" ADD COLUMN "community_id" UUID;

CREATE TABLE "reports" (
  "id" UUID NOT NULL,
  "community_id" UUID NOT NULL,
  "reporter_id" UUID NOT NULL,
  "target_type" "ReportTargetType" NOT NULL,
  "target_id" UUID NOT NULL,
  "reason" TEXT NOT NULL,
  "note" TEXT,
  "status" "ReportStatus" NOT NULL DEFAULT 'open',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "reports_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "reports_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "user_blocks" (
  "blocker_id" UUID NOT NULL,
  "blocked_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_blocks_pkey" PRIMARY KEY ("blocker_id", "blocked_id"),
  CONSTRAINT "user_blocks_blocker_id_fkey" FOREIGN KEY ("blocker_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "user_blocks_blocked_id_fkey" FOREIGN KEY ("blocked_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "user_blocks_not_self_check" CHECK ("blocker_id" <> "blocked_id")
);

-- Reuse an existing community as the seed where possible. Other legacy rows
-- are retained but deactivated; user columns remain as a compatibility copy
-- until membership-aware API code replaces their consumers in Phase 7B.
DO $$
DECLARE
  seed_community_id UUID;
  first_user_id UUID;
  legacy_community_id UUID;
  generated_code TEXT;
BEGIN
  SELECT "id" INTO seed_community_id
  FROM "communities"
  ORDER BY "created_at", "id"
  LIMIT 1;

  IF seed_community_id IS NULL THEN
    seed_community_id := gen_random_uuid();
    INSERT INTO "communities" (
      "id", "name", "type", "invite_code", "is_active", "join_mode",
      "level1_label", "level2_label", "level1_options"
    ) VALUES (
      seed_community_id, 'My Community', 'other', 'LENDLEND', true, 'open_with_code',
      'Floor', 'Room', ARRAY['Basement', '1', '2', '3', '4', '5']::TEXT[]
    );
  ELSE
    UPDATE "communities"
    SET "name" = 'My Community',
        "type" = 'other',
        "invite_code" = 'LENDLEND',
        "is_active" = true,
        "join_mode" = 'open_with_code',
        "level1_label" = 'Floor',
        "level2_label" = 'Room',
        "level1_options" = ARRAY['Basement', '1', '2', '3', '4', '5']::TEXT[]
    WHERE "id" = seed_community_id;
  END IF;

  SELECT "id" INTO first_user_id
  FROM "users"
  ORDER BY "created_at", "id"
  LIMIT 1;

  UPDATE "communities" SET "created_by" = first_user_id WHERE "id" = seed_community_id;
  UPDATE "users" SET "community_id" = seed_community_id, "joined_hostel" = true;
  UPDATE "items" SET "community_id" = seed_community_id;
  UPDATE "requests" SET "community_id" = seed_community_id;
  UPDATE "wanted_posts" SET "community_id" = seed_community_id;
  UPDATE "wanted_responses" SET "community_id" = seed_community_id;
  UPDATE "ratings" SET "community_id" = seed_community_id;
  UPDATE "notifications" SET "community_id" = seed_community_id;
  UPDATE "feedback" SET "community_id" = seed_community_id;

  INSERT INTO "community_members" (
    "id", "community_id", "user_id", "role", "status", "level1_value",
    "level2_value", "trust_score", "joined_at"
  )
  SELECT
    gen_random_uuid(),
    seed_community_id,
    "id",
    CASE WHEN "id" = first_user_id THEN 'admin'::"CommunityMemberRole" ELSE 'member'::"CommunityMemberRole" END,
    'active',
    CASE WHEN "floor" IS NULL THEN NULL WHEN "floor" = 0 THEN 'Basement' ELSE "floor"::TEXT END,
    "room",
    "trust_score",
    "created_at"
  FROM "users";

  FOR legacy_community_id IN
    SELECT "id" FROM "communities" WHERE "id" <> seed_community_id
  LOOP
    LOOP
      SELECT string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', floor(random() * 32)::INTEGER + 1, 1), '')
      INTO generated_code
      FROM generate_series(1, 8);
      EXIT WHEN NOT EXISTS (SELECT 1 FROM "communities" WHERE "invite_code" = generated_code);
    END LOOP;

    UPDATE "communities"
    SET "is_active" = false, "invite_code" = generated_code
    WHERE "id" = legacy_community_id;
  END LOOP;
END $$;

ALTER TABLE "communities" ALTER COLUMN "invite_code" SET NOT NULL;
ALTER TABLE "requests" ALTER COLUMN "community_id" SET NOT NULL;
ALTER TABLE "wanted_responses" ALTER COLUMN "community_id" SET NOT NULL;
ALTER TABLE "ratings" ALTER COLUMN "community_id" SET NOT NULL;
ALTER TABLE "notifications" ALTER COLUMN "community_id" SET NOT NULL;
ALTER TABLE "feedback" ALTER COLUMN "community_id" SET NOT NULL;

ALTER TABLE "communities" ADD CONSTRAINT "communities_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "requests" ADD CONSTRAINT "requests_community_id_fkey"
  FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "wanted_responses" ADD CONSTRAINT "wanted_responses_community_id_fkey"
  FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_community_id_fkey"
  FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_community_id_fkey"
  FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_community_id_fkey"
  FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "communities_invite_code_key" ON "communities"("invite_code");
CREATE UNIQUE INDEX "community_members_community_id_user_id_key" ON "community_members"("community_id", "user_id");
CREATE INDEX "community_members_community_id_status_idx" ON "community_members"("community_id", "status");
CREATE INDEX "community_members_user_id_status_idx" ON "community_members"("user_id", "status");
CREATE INDEX "requests_community_id_idx" ON "requests"("community_id");
CREATE INDEX "wanted_posts_community_id_idx" ON "wanted_posts"("community_id");
CREATE INDEX "wanted_responses_community_id_idx" ON "wanted_responses"("community_id");
CREATE INDEX "ratings_community_id_idx" ON "ratings"("community_id");
CREATE INDEX "notifications_community_id_idx" ON "notifications"("community_id");
CREATE INDEX "feedback_community_id_idx" ON "feedback"("community_id");
CREATE INDEX "reports_community_id_status_created_at_idx" ON "reports"("community_id", "status", "created_at" DESC);
CREATE INDEX "reports_reporter_id_created_at_idx" ON "reports"("reporter_id", "created_at" DESC);
CREATE INDEX "reports_target_type_target_id_idx" ON "reports"("target_type", "target_id");
CREATE INDEX "user_blocks_blocked_id_idx" ON "user_blocks"("blocked_id");
