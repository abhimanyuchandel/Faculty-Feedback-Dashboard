import { NextRequest } from "next/server";
import { forbidden, ok, serverError, unauthorized } from "@/lib/http";
import { getApiAdminUser, hasAnyRole } from "@/lib/auth/api";
import { getFeedbackOverview } from "@/services/feedback-service";

export async function GET(request: NextRequest) {
  try {
    const admin = await getApiAdminUser();
    if (!admin) {
      return unauthorized();
    }

    if (!hasAnyRole(admin, ["admin", "reporting"])) {
      return forbidden();
    }

    const facultyId = request.nextUrl.searchParams.get("facultyId") ?? undefined;
    const curriculumPhaseId = request.nextUrl.searchParams.get("curriculumPhaseId") ?? undefined;
    const location = request.nextUrl.searchParams.get("location") ?? undefined;
    const yearRaw = request.nextUrl.searchParams.get("year");
    const year = yearRaw ? Number(yearRaw) : undefined;
    const fromDate = request.nextUrl.searchParams.get("fromDate");
    const toDate = request.nextUrl.searchParams.get("toDate");

    const data = await getFeedbackOverview({
      facultyId,
      curriculumPhaseId,
      location,
      year: Number.isFinite(year) ? year : undefined,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined
    });

    return ok(data);
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
