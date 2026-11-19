CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TYPE "ItemStatus" AS ENUM ('available', 'lent', 'hidden');
CREATE TYPE "RequestStatus" AS ENUM ('pending', 'accepted', 'declined', 'returned', 'cancelled');
CREATE TYPE "WantedStatus" AS ENUM ('open', 'fulfilled');

CREATE TABLE "communities" (
  "id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "communities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "users" (
  "id" UUID NOT NULL,
  "community_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "block" CHAR(1) NOT NULL,
  "floor" INTEGER NOT NULL,
  "room" TEXT NOT NULL,
  "phone" TEXT,
  "trust_score" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "users_block_check" CHECK ("block" IN ('A', 'B', 'C', 'D', 'E')),
  CONSTRAINT "users_floor_check" CHECK ("floor" BETWEEN 1 AND 5)
);

CREATE TABLE "items" (
  "id" UUID NOT NULL,
  "community_id" UUID NOT NULL,
  "owner_id" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "condition" TEXT NOT NULL,
  "photos" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "status" "ItemStatus" NOT NULL DEFAULT 'available',
  "max_lend_days" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "items_max_lend_days_check" CHECK ("max_lend_days" BETWEEN 1 AND 365),
  CONSTRAINT "items_photos_limit_check" CHECK (cardinality("photos") <= 3)
);

CREATE TABLE "requests" (
  "id" UUID NOT NULL,
  "item_id" UUID NOT NULL,
  "borrower_id" UUID NOT NULL,
  "owner_id" UUID NOT NULL,
  "from_date" DATE NOT NULL,
  "to_date" DATE NOT NULL,
  "note" TEXT NOT NULL,
  "status" "RequestStatus" NOT NULL DEFAULT 'pending',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "requests_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "requests_not_own_item_check" CHECK ("borrower_id" <> "owner_id"),
  CONSTRAINT "requests_date_order_check" CHECK ("from_date" <= "to_date")
);

CREATE TABLE "wanted_posts" (
  "id" UUID NOT NULL,
  "community_id" UUID NOT NULL,
  "author_id" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "note" TEXT NOT NULL,
  "needed_by" DATE NOT NULL,
  "status" "WantedStatus" NOT NULL DEFAULT 'open',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "wanted_posts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "wanted_responses" (
  "id" UUID NOT NULL,
  "wanted_post_id" UUID NOT NULL,
  "responder_id" UUID NOT NULL,
  "message" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "wanted_responses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ratings" (
  "id" UUID NOT NULL,
  "request_id" UUID NOT NULL,
  "from_user_id" UUID NOT NULL,
  "to_user_id" UUID NOT NULL,
  "thumbs_up" BOOLEAN NOT NULL,
  "comment" TEXT,
  CONSTRAINT "ratings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ratings_distinct_users_check" CHECK ("from_user_id" <> "to_user_id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "users_community_id_idx" ON "users"("community_id");
CREATE INDEX "items_status_idx" ON "items"("status");
CREATE INDEX "items_community_id_idx" ON "items"("community_id");
CREATE INDEX "items_owner_id_idx" ON "items"("owner_id");
CREATE INDEX "items_search_idx" ON "items" USING GIN (to_tsvector('english', "title" || ' ' || "description"));
CREATE INDEX "requests_status_idx" ON "requests"("status");
CREATE INDEX "requests_owner_id_idx" ON "requests"("owner_id");
CREATE INDEX "requests_borrower_id_idx" ON "requests"("borrower_id");
CREATE INDEX "requests_item_id_idx" ON "requests"("item_id");
CREATE INDEX "wanted_posts_community_id_status_idx" ON "wanted_posts"("community_id", "status");
CREATE INDEX "wanted_responses_wanted_post_id_idx" ON "wanted_responses"("wanted_post_id");
CREATE UNIQUE INDEX "ratings_request_id_from_user_id_key" ON "ratings"("request_id", "from_user_id");
CREATE INDEX "ratings_to_user_id_idx" ON "ratings"("to_user_id");

ALTER TABLE "requests" ADD CONSTRAINT "requests_no_accepted_overlap"
  EXCLUDE USING gist (
    "item_id" WITH =,
    daterange("from_date", "to_date", '[]') WITH &&
  ) WHERE ("status" = 'accepted');

ALTER TABLE "users" ADD CONSTRAINT "users_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "items" ADD CONSTRAINT "items_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "items" ADD CONSTRAINT "items_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "requests" ADD CONSTRAINT "requests_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "requests" ADD CONSTRAINT "requests_borrower_id_fkey" FOREIGN KEY ("borrower_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "requests" ADD CONSTRAINT "requests_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "wanted_posts" ADD CONSTRAINT "wanted_posts_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "wanted_posts" ADD CONSTRAINT "wanted_posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "wanted_responses" ADD CONSTRAINT "wanted_responses_wanted_post_id_fkey" FOREIGN KEY ("wanted_post_id") REFERENCES "wanted_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "wanted_responses" ADD CONSTRAINT "wanted_responses_responder_id_fkey" FOREIGN KEY ("responder_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_to_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
