import { NextRequest } from "next/server";
import { forbidden, ok, serverError, unauthorized } from "@/lib/http";
import { getApiAdminUser, hasAnyRole } from "@/lib/auth/api";
import { publishSurveyVersion } from "@/services/survey-service";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getApiAdminUser();
    if (!admin) {
      return unauthorized();
    }

    if (!hasAnyRole(admin, ["admin"])) {
      return forbidden();
    }

    const { id } = await context.params;
    const version = await publishSurveyVersion(id, admin.id);

    return ok({ version });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
