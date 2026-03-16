import { NextRequest } from "next/server";
import { forbidden, serverError, unauthorized } from "@/lib/http";
import { getApiAdminUser, hasAnyRole } from "@/lib/auth/api";
import { getFeedbackExportRows } from "@/services/feedback-service";

export async function GET(request: NextRequest) {
  try {
    const admin = await getApiAdminUser();
    if (!admin) {
      return unauthorized();
    }

    if (!hasAnyRole(admin, ["admin"])) {
      return forbidden();
    }

    const facultyId = request.nextUrl.searchParams.get("facultyId") ?? undefined;
    const curriculumPhaseId = request.nextUrl.searchParams.get("curriculumPhaseId") ?? undefined;
    const location = request.nextUrl.searchParams.get("location") ?? undefined;
    const yearRaw = request.nextUrl.searchParams.get("year");
    const year = yearRaw ? Number(yearRaw) : undefined;
    const fromDate = request.nextUrl.searchParams.get("fromDate");
    const toDate = request.nextUrl.searchParams.get("toDate");

    const rows = await getFeedbackExportRows({
      facultyId,
      curriculumPhaseId,
      location,
      year: Number.isFinite(year) ? year : undefined,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined
    });

    const header = [
      "submission_id",
      "submission_date",
      "year",
      "faculty_name",
      "faculty_email",
      "curriculum_phase",
      "location",
      "question_prompt",
      "question_type",
      "included_in_faculty_digest",
      "answer_value"
    ];

    const lines = rows.map((row) =>
      [
        row.submissionId,
        row.submissionDate,
        row.year.toString(),
        row.facultyName,
        row.facultyEmail,
        row.curriculumPhaseName,
        row.location,
        row.questionPrompt,
        row.questionType,
        row.includeInDigest ? "yes" : "no",
        row.answerValue
      ]
        .map(escapeCsv)
        .join(",")
    );

    const csv = [header.join(","), ...lines].join("\n");

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=feedback-report-detailed.csv"
      }
    });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

function escapeCsv(value: string) {
  const escaped = value.replaceAll("\"", "\"\"");
  return `"${escaped}"`;
}
