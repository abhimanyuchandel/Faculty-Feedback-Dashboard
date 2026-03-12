-- AlterTable
ALTER TABLE "survey_questions"
  ADD COLUMN "include_in_digest" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "feedback_answers"
  ADD COLUMN "include_in_digest_snapshot" BOOLEAN NOT NULL DEFAULT true;
