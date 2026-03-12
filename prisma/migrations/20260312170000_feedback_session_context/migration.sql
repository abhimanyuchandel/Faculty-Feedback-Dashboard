-- AlterTable
ALTER TABLE "feedback_submissions"
  ADD COLUMN "teaching_session_id" TEXT,
  ADD COLUMN "session_location_snapshot" TEXT;

-- CreateIndex
CREATE INDEX "feedback_submissions_teaching_session_id_submission_date_idx"
  ON "feedback_submissions"("teaching_session_id", "submission_date");

-- AddForeignKey
ALTER TABLE "feedback_submissions"
  ADD CONSTRAINT "feedback_submissions_teaching_session_id_fkey"
  FOREIGN KEY ("teaching_session_id") REFERENCES "teaching_sessions"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
