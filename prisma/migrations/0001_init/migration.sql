-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "DigestSubscriptionStatus" AS ENUM ('SUBSCRIBED', 'UNSUBSCRIBED');

-- CreateEnum
CREATE TYPE "SurveyVersionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('LIKERT', 'MULTIPLE_CHOICE', 'MULTI_SELECT', 'NUMERIC', 'FREE_TEXT');

-- CreateEnum
CREATE TYPE "EmailTokenType" AS ENUM ('UNSUBSCRIBE', 'RESUBSCRIBE');

-- CreateEnum
CREATE TYPE "DigestRunType" AS ENUM ('AUTOMATED', 'TEST', 'PREVIEW');

-- CreateEnum
CREATE TYPE "AuditActorType" AS ENUM ('ADMIN', 'SYSTEM');

-- CreateTable
CREATE TABLE "faculty" (
    "id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "primary_email" TEXT NOT NULL,
    "secondary_email" TEXT,
    "department" TEXT NOT NULL DEFAULT 'Department of Medicine',
    "active_status" BOOLEAN NOT NULL DEFAULT true,
    "digest_subscription_status" "DigestSubscriptionStatus" NOT NULL DEFAULT 'SUBSCRIBED',
    "public_token" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deactivated_at" TIMESTAMP(3),

    CONSTRAINT "faculty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curriculum_phases" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "active_status" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "curriculum_phases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_versions" (
    "id" TEXT NOT NULL,
    "version_number" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "status" "SurveyVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMP(3),
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "survey_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_questions" (
    "id" TEXT NOT NULL,
    "survey_version_id" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "help_text" TEXT,
    "type" "QuestionType" NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "active_status" BOOLEAN NOT NULL DEFAULT true,
    "order_index" INTEGER NOT NULL,
    "config" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "survey_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_question_options" (
    "id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL,
    "active_status" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "survey_question_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback_submissions" (
    "id" TEXT NOT NULL,
    "faculty_id" TEXT NOT NULL,
    "survey_version_id" TEXT NOT NULL,
    "curriculum_phase_id" TEXT NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submission_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "digested_at" TIMESTAMP(3),
    "digest_history_id" TEXT,
    "captcha_score" DOUBLE PRECISION,

    CONSTRAINT "feedback_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback_answers" (
    "id" TEXT NOT NULL,
    "submission_id" TEXT NOT NULL,
    "question_id" TEXT,
    "question_prompt_snapshot" TEXT NOT NULL,
    "question_type_snapshot" "QuestionType" NOT NULL,
    "answer_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teaching_sessions" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "curriculum_phase_id" TEXT NOT NULL,
    "session_date" DATE NOT NULL,
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3) NOT NULL,
    "location" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teaching_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teaching_session_faculty" (
    "teaching_session_id" TEXT NOT NULL,
    "faculty_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teaching_session_faculty_pkey" PRIMARY KEY ("teaching_session_id","faculty_id")
);

-- CreateTable
CREATE TABLE "digest_history" (
    "id" TEXT NOT NULL,
    "faculty_id" TEXT NOT NULL,
    "run_type" "DigestRunType" NOT NULL DEFAULT 'AUTOMATED',
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "window_start" TIMESTAMP(3) NOT NULL,
    "window_end" TIMESTAMP(3) NOT NULL,
    "submission_count" INTEGER NOT NULL,
    "phase_summary" JSONB NOT NULL,
    "email_provider_message_id" TEXT,
    "created_by_admin_id" TEXT,

    CONSTRAINT "digest_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_tokens" (
    "id" TEXT NOT NULL,
    "faculty_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "token_type" "EmailTokenType" NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password_hash" TEXT,
    "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
    "mfa_secret_encrypted" TEXT,
    "active_status" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_user_roles" (
    "user_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,

    CONSTRAINT "admin_user_roles_pkey" PRIMARY KEY ("user_id","role_id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actor_type" "AuditActorType" NOT NULL DEFAULT 'ADMIN',
    "admin_user_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "admin_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_sessions" (
    "id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "faculty_primary_email_key" ON "faculty"("primary_email");

-- CreateIndex
CREATE UNIQUE INDEX "faculty_secondary_email_key" ON "faculty"("secondary_email");

-- CreateIndex
CREATE UNIQUE INDEX "faculty_public_token_key" ON "faculty"("public_token");

-- CreateIndex
CREATE INDEX "faculty_last_name_first_name_idx" ON "faculty"("last_name", "first_name");

-- CreateIndex
CREATE INDEX "faculty_active_status_digest_subscription_status_idx" ON "faculty"("active_status", "digest_subscription_status");

-- CreateIndex
CREATE UNIQUE INDEX "curriculum_phases_name_key" ON "curriculum_phases"("name");

-- CreateIndex
CREATE INDEX "curriculum_phases_active_status_sort_order_idx" ON "curriculum_phases"("active_status", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "survey_versions_version_number_key" ON "survey_versions"("version_number");

-- CreateIndex
CREATE INDEX "survey_versions_status_idx" ON "survey_versions"("status");

-- CreateIndex
CREATE INDEX "survey_questions_survey_version_id_active_status_idx" ON "survey_questions"("survey_version_id", "active_status");

-- CreateIndex
CREATE UNIQUE INDEX "survey_questions_survey_version_id_order_index_key" ON "survey_questions"("survey_version_id", "order_index");

-- CreateIndex
CREATE UNIQUE INDEX "survey_question_options_question_id_value_key" ON "survey_question_options"("question_id", "value");

-- CreateIndex
CREATE UNIQUE INDEX "survey_question_options_question_id_order_index_key" ON "survey_question_options"("question_id", "order_index");

-- CreateIndex
CREATE INDEX "feedback_submissions_faculty_id_digested_at_idx" ON "feedback_submissions"("faculty_id", "digested_at");

-- CreateIndex
CREATE INDEX "feedback_submissions_curriculum_phase_id_submission_date_idx" ON "feedback_submissions"("curriculum_phase_id", "submission_date");

-- CreateIndex
CREATE INDEX "feedback_submissions_survey_version_id_idx" ON "feedback_submissions"("survey_version_id");

-- CreateIndex
CREATE INDEX "feedback_answers_submission_id_idx" ON "feedback_answers"("submission_id");

-- CreateIndex
CREATE INDEX "feedback_answers_question_id_idx" ON "feedback_answers"("question_id");

-- CreateIndex
CREATE INDEX "teaching_sessions_session_date_curriculum_phase_id_idx" ON "teaching_sessions"("session_date", "curriculum_phase_id");

-- CreateIndex
CREATE INDEX "digest_history_faculty_id_sent_at_idx" ON "digest_history"("faculty_id", "sent_at");

-- CreateIndex
CREATE UNIQUE INDEX "email_tokens_token_hash_key" ON "email_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "email_tokens_faculty_id_token_type_expires_at_idx" ON "email_tokens"("faculty_id", "token_type", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "admin_roles_name_key" ON "admin_roles"("name");

-- CreateIndex
CREATE INDEX "audit_logs_admin_user_id_created_at_idx" ON "audit_logs"("admin_user_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "admin_accounts_provider_provider_account_id_key" ON "admin_accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "admin_sessions_session_token_key" ON "admin_sessions"("session_token");

-- CreateIndex
CREATE UNIQUE INDEX "admin_verification_tokens_token_key" ON "admin_verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "admin_verification_tokens_identifier_token_key" ON "admin_verification_tokens"("identifier", "token");

-- AddForeignKey
ALTER TABLE "survey_versions" ADD CONSTRAINT "survey_versions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_questions" ADD CONSTRAINT "survey_questions_survey_version_id_fkey" FOREIGN KEY ("survey_version_id") REFERENCES "survey_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_question_options" ADD CONSTRAINT "survey_question_options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "survey_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_submissions" ADD CONSTRAINT "feedback_submissions_faculty_id_fkey" FOREIGN KEY ("faculty_id") REFERENCES "faculty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_submissions" ADD CONSTRAINT "feedback_submissions_survey_version_id_fkey" FOREIGN KEY ("survey_version_id") REFERENCES "survey_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_submissions" ADD CONSTRAINT "feedback_submissions_curriculum_phase_id_fkey" FOREIGN KEY ("curriculum_phase_id") REFERENCES "curriculum_phases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_submissions" ADD CONSTRAINT "feedback_submissions_digest_history_id_fkey" FOREIGN KEY ("digest_history_id") REFERENCES "digest_history"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_answers" ADD CONSTRAINT "feedback_answers_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "feedback_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_answers" ADD CONSTRAINT "feedback_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "survey_questions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teaching_sessions" ADD CONSTRAINT "teaching_sessions_curriculum_phase_id_fkey" FOREIGN KEY ("curriculum_phase_id") REFERENCES "curriculum_phases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teaching_session_faculty" ADD CONSTRAINT "teaching_session_faculty_teaching_session_id_fkey" FOREIGN KEY ("teaching_session_id") REFERENCES "teaching_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teaching_session_faculty" ADD CONSTRAINT "teaching_session_faculty_faculty_id_fkey" FOREIGN KEY ("faculty_id") REFERENCES "faculty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "digest_history" ADD CONSTRAINT "digest_history_faculty_id_fkey" FOREIGN KEY ("faculty_id") REFERENCES "faculty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "digest_history" ADD CONSTRAINT "digest_history_created_by_admin_id_fkey" FOREIGN KEY ("created_by_admin_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_tokens" ADD CONSTRAINT "email_tokens_faculty_id_fkey" FOREIGN KEY ("faculty_id") REFERENCES "faculty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_user_roles" ADD CONSTRAINT "admin_user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_user_roles" ADD CONSTRAINT "admin_user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "admin_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_accounts" ADD CONSTRAINT "admin_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Custom SQL for search/performance/privacy constraints
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS faculty_first_name_trgm_idx ON "faculty" USING GIN ("first_name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS faculty_last_name_trgm_idx ON "faculty" USING GIN ("last_name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS faculty_primary_email_trgm_idx ON "faculty" USING GIN ("primary_email" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS faculty_secondary_email_trgm_idx ON "faculty" USING GIN ("secondary_email" gin_trgm_ops);

ALTER TABLE "faculty"
  ADD CONSTRAINT faculty_department_check
  CHECK ("department" = 'Department of Medicine');

CREATE UNIQUE INDEX IF NOT EXISTS one_published_survey_version_idx
  ON "survey_versions" ((status))
  WHERE status = 'PUBLISHED';
