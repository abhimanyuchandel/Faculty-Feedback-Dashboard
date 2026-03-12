import { NextRequest } from "next/server";
import { badRequest, forbidden, ok, serverError, unauthorized } from "@/lib/http";
import { getApiAdminUser, hasAnyRole } from "@/lib/auth/api";
import { updateQuestionOrder } from "@/services/survey-service";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getApiAdminUser();
    if (!admin) {
      return unauthorized();
    }
    if (!hasAnyRole(admin, ["admin"])) {
      return forbidden();
    }

    const body = await request.json();
    if (!Array.isArray(body.questionIds)) {
      return badRequest("questionIds array is required");
    }

    if (typeof body.scope !== "string") {
      return badRequest("scope is required and must be a string");
    }

    if (body.scope === "ALL") {
      return badRequest("Reordering in ALL scope is disabled. Select a specific phase or GLOBAL.");
    }

    const { id } = await context.params;
    await updateQuestionOrder(id, body.questionIds, admin.id, body.scope);

    return ok({ ok: true });
  } catch (error) {
    console.error(error);
    if (error instanceof Error) {
      return badRequest(error.message);
    }
    return serverError();
  }
}
