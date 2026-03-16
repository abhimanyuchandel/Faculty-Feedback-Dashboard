import { FacultyEnrollmentRequestStatus } from "@prisma/client";
import { badRequest, forbidden, ok, serverError, unauthorized } from "@/lib/http";
import { getApiAdminUser, hasAnyRole } from "@/lib/auth/api";
import {
  countPendingFacultyEnrollmentRequests,
  listFacultyEnrollmentRequests
} from "@/services/faculty-enrollment-service";

export async function GET(request: Request) {
  try {
    const admin = await getApiAdminUser();
    if (!admin) {
      return unauthorized();
    }

    if (!hasAnyRole(admin, ["admin"])) {
      return forbidden();
    }

    const url = new URL(request.url);
    const statusParam = url.searchParams.get("status")?.toUpperCase();
    const status =
      statusParam && statusParam in FacultyEnrollmentRequestStatus
        ? FacultyEnrollmentRequestStatus[statusParam as keyof typeof FacultyEnrollmentRequestStatus]
        : undefined;

    if (statusParam && !status) {
      return badRequest("status must be pending, approved, denied, or omitted");
    }

    const [requests, pendingCount] = await Promise.all([
      listFacultyEnrollmentRequests(status),
      countPendingFacultyEnrollmentRequests()
    ]);

    return ok({ requests, pendingCount });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
