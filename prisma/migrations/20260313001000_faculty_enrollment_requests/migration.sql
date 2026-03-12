CREATE TYPE "FacultyEnrollmentRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED');

CREATE TABLE "faculty_enrollment_requests" (
  "id" TEXT NOT NULL,
  "first_name" TEXT NOT NULL,
  "last_name" TEXT NOT NULL,
  "primary_email" TEXT NOT NULL,
  "secondary_email" TEXT,
  "notes" TEXT,
  "status" "FacultyEnrollmentRequestStatus" NOT NULL DEFAULT 'PENDING',
  "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewed_at" TIMESTAMP(3),
  "reviewed_by_admin_id" TEXT,
  "created_faculty_id" TEXT,
  "decision_notes" TEXT,
  CONSTRAINT "faculty_enrollment_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "faculty_enrollment_requests_status_requested_at_idx"
ON "faculty_enrollment_requests"("status", "requested_at");

CREATE INDEX "faculty_enrollment_requests_primary_email_status_idx"
ON "faculty_enrollment_requests"("primary_email", "status");

CREATE INDEX "faculty_enrollment_requests_secondary_email_status_idx"
ON "faculty_enrollment_requests"("secondary_email", "status");

ALTER TABLE "faculty_enrollment_requests"
ADD CONSTRAINT "faculty_enrollment_requests_reviewed_by_admin_id_fkey"
FOREIGN KEY ("reviewed_by_admin_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "faculty_enrollment_requests"
ADD CONSTRAINT "faculty_enrollment_requests_created_faculty_id_fkey"
FOREIGN KEY ("created_faculty_id") REFERENCES "faculty"("id") ON DELETE SET NULL ON UPDATE CASCADE;
