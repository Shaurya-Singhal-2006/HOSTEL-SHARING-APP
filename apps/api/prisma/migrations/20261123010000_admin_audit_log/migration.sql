CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "community_id" UUID NOT NULL,
    "actor_id" UUID NOT NULL,
    "action" VARCHAR(80) NOT NULL,
    "target_type" VARCHAR(40) NOT NULL,
    "target_id" VARCHAR(80),
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "audit_logs_community_id_created_at_idx" ON "audit_logs"("community_id", "created_at" DESC);
CREATE INDEX "audit_logs_actor_id_created_at_idx" ON "audit_logs"("actor_id", "created_at" DESC);

ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_community_id_fkey"
    FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey"
    FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
