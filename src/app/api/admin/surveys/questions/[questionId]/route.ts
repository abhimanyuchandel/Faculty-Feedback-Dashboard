import { NextRequest } from "next/server";
import { forbidden, ok, serverError, unauthorized } from "@/lib/http";
import { getApiAdminUser, hasAnyRole } from "@/lib/auth/api";
import { deleteQuestion } from "@/services/survey-service";

export async function DELETE(request: NextRequest, context: { params: Promise<{ questionId: string }> }) {
  try {
    const admin = await getApiAdminUser();
    if (!admin) {
      return unauthorized();
    }

    if (!hasAnyRole(admin, ["admin"])) {
      return forbidden();
    }

    const { questionId } = await context.params;
    await deleteQuestion(questionId, admin.id);

    return ok({ ok: true });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
