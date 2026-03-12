import { badRequest, forbidden, ok, serverError, unauthorized } from "@/lib/http";
import { getApiAdminUser, hasAnyRole } from "@/lib/auth/api";
import {
  approveFacultyEnrollmentRequest,
  denyFacultyEnrollmentRequest
} from "@/services/faculty-enrollment-service";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getApiAdminUser();
    if (!admin) {
      return unauthorized();
    }

    if (!hasAnyRole(admin, ["admin"])) {
      return forbidden();
    }

    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const action = typeof body.action === "string" ? body.action : "";
    const decisionNotes = typeof body.decisionNotes === "string" ? body.decisionNotes : undefined;

    if (action === "approve") {
      const result = await approveFacultyEnrollmentRequest(id, admin.id, decisionNotes);
      return ok({ result });
    }

    if (action === "deny") {
      const result = await denyFacultyEnrollmentRequest(id, admin.id, decisionNotes);
      return ok({ result });
    }

    return badRequest("action must be 'approve' or 'deny'");
  } catch (error) {
    console.error(error);
    if (error instanceof Error) {
      return badRequest(error.message);
    }
    return serverError();
  }
}
