import Link from "next/link";
import { prisma } from "@/lib/db/prisma";

export default async function AdminHomePage() {
  const [facultyCount, activeFacultyCount, submissionCount, activeSurvey, sessionCount, pendingEnrollmentRequests] =
    await Promise.all([
    prisma.faculty.count(),
    prisma.faculty.count({ where: { activeStatus: true } }),
    prisma.feedbackSubmission.count(),
    prisma.surveyVersion.findFirst({ where: { status: "PUBLISHED" } }),
    prisma.teachingSession.count(),
    prisma.facultyEnrollmentRequest.count({ where: { status: "PENDING" } })
  ]);

  return (
    <div className="grid two">
      <article className="card">
        <h2>System Snapshot</h2>
        <p>Total faculty: {facultyCount}</p>
        <p>Active faculty: {activeFacultyCount}</p>
        <p>Total submissions: {submissionCount}</p>
        <p>Teaching sessions: {sessionCount}</p>
        <p>Active survey: {activeSurvey ? `v${activeSurvey.versionNumber} (${activeSurvey.label})` : "none"}</p>
        <p>Pending faculty requests: {pendingEnrollmentRequests}</p>
        {pendingEnrollmentRequests > 0 ? (
          <p>
            <Link href="/admin/faculty" className="btn ghost">
              Review pending requests
            </Link>
          </p>
        ) : null}
      </article>

      <article className="card">
        <h2>Quick Actions</h2>
        <div className="grid">
          <Link className="btn primary" href="/admin/faculty">
            Manage Faculty
          </Link>
          <Link className="btn primary" href="/admin/surveys">
            Manage Surveys
          </Link>
          <Link className="btn primary" href="/admin/digest">
            Run Digest Tools
          </Link>
          <Link className="btn ghost" href="/admin/sessions">
            Generate Session QR Packets
          </Link>
        </div>
      </article>
    </div>
  );
}
