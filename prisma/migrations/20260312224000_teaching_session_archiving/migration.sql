ALTER TABLE "teaching_sessions"
ADD COLUMN "active_status" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "archived_at" TIMESTAMP(3);

CREATE INDEX "teaching_sessions_active_status_session_date_idx"
ON "teaching_sessions"("active_status", "session_date");
