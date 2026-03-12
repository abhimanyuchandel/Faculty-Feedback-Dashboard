import { NextRequest } from "next/server";
import { badRequest, created, serverError, tooManyRequests } from "@/lib/http";
import { feedbackSubmissionSchema } from "@/lib/validation/schemas";
import { submitAnonymousFeedback } from "@/services/feedback-service";
import { enforceSimpleRateLimit } from "@/lib/rate-limit";

function clientIp(request: NextRequest): string {
  const header = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip");
  return header?.split(",")[0]?.trim() ?? "unknown";
}

export async function POST(request: NextRequest) {
  try {
    const ip = clientIp(request);
    const rate = enforceSimpleRateLimit(`submit:${ip}`, { windowMs: 60_000, max: 25 });

    if (!rate.allowed) {
      return tooManyRequests(rate.retryAfterSeconds);
    }

    const body = await request.json();
    const parsed = feedbackSubmissionSchema.safeParse(body);

    if (!parsed.success) {
      return badRequest("Invalid feedback payload", parsed.error.flatten());
    }

    const result = await submitAnonymousFeedback({
      facultyToken: parsed.data.facultyToken,
      curriculumPhaseId: parsed.data.curriculumPhaseId,
      surveyVersionId: parsed.data.surveyVersionId,
      teachingSessionId: parsed.data.teachingSessionId,
      teachingSessionDate: parsed.data.teachingSessionDate,
      captchaToken: parsed.data.captchaToken,
      answers: parsed.data.answers.map((answer) => ({
        questionId: answer.questionId,
        questionType: answer.questionType,
        value: answer.value
      }))
    });

    return created({ ok: true, submissionId: result.submissionId });
  } catch (error) {
    console.error(error);
    if (error instanceof Error) {
      return badRequest(error.message);
    }

    return serverError();
  }
}
