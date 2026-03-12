import { NextRequest } from "next/server";
import { badRequest, forbidden, ok, serverError, unauthorized } from "@/lib/http";
import { getApiAdminUser, hasAnyRole } from "@/lib/auth/api";
import { surveyQuestionDraftSchema } from "@/lib/validation/schemas";
import { upsertQuestion } from "@/services/survey-service";

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
    const parsed = surveyQuestionDraftSchema.safeParse(body);

    if (!parsed.success) {
      return badRequest("Invalid question payload", parsed.error.flatten());
    }

    const { id } = await context.params;
    const question = await upsertQuestion(
      id,
      {
        id: typeof body.id === "string" ? body.id : undefined,
        prompt: parsed.data.prompt,
        helpText: parsed.data.helpText,
        type: parsed.data.type,
        required: parsed.data.required,
        includeInDigest: parsed.data.includeInDigest,
        activeStatus: parsed.data.activeStatus,
        options: parsed.data.options,
        config: parsed.data.config
      },
      admin.id
    );

    return ok({ question });
  } catch (error) {
    console.error(error);
    if (error instanceof Error) {
      return badRequest(error.message);
    }
    return serverError();
  }
}
