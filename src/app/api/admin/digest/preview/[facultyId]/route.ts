import { NextRequest } from "next/server";
import { forbidden, notFound, ok, serverError, unauthorized } from "@/lib/http";
import { getApiAdminUser, hasAnyRole } from "@/lib/auth/api";
import { previewDigestForFaculty } from "@/services/digest-service";

export async function GET(request: NextRequest, context: { params: Promise<{ facultyId: string }> }) {
  try {
    const admin = await getApiAdminUser();
    if (!admin) {
      return unauthorized();
    }

    if (!hasAnyRole(admin, ["admin"])) {
      return forbidden();
    }

    const { facultyId } = await context.params;
    const preview = await previewDigestForFaculty(facultyId);

    if (!preview) {
      return notFound("No feedback found for this faculty in the last 6 months");
    }

    return ok(preview);
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
