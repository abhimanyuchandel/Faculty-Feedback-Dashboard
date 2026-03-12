import { describe, expect, it } from "vitest";
import { feedbackSubmissionSchema } from "@/lib/validation/schemas";

describe("feedbackSubmissionSchema", () => {
  it("accepts valid payload", () => {
    const parsed = feedbackSubmissionSchema.safeParse({
      facultyToken: "X83K2L9Q",
      curriculumPhaseId: "ckzxx12340001abcde1234567",
      surveyVersionId: "ckzxx12340002abcde1234567",
      captchaToken: "captcha-token",
      answers: [
        {
          questionId: "ckzxx12340003abcde1234567",
          questionType: "FREE_TEXT",
          value: "Great teaching"
        }
      ]
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects empty answers", () => {
    const parsed = feedbackSubmissionSchema.safeParse({
      facultyToken: "X83K2L9Q",
      curriculumPhaseId: "ckzxx12340001abcde1234567",
      surveyVersionId: "ckzxx12340002abcde1234567",
      captchaToken: "captcha-token",
      answers: []
    });

    expect(parsed.success).toBe(false);
  });
});
