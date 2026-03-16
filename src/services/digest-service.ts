import {
  DigestRunType,
  DigestSubscriptionStatus,
  EmailTokenType,
  Prisma,
  QuestionType
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { appUrl } from "@/lib/app-url";
import { sendTransactionalEmail } from "@/lib/email/provider";
import { generateOpaqueToken, hashToken } from "@/lib/security";
import {
  DIGEST_WINDOW_MONTHS,
  latestScheduledDigestWindow,
  rollingDigestWindow
} from "@/lib/digest-schedule";
import { facultyFeedbackUrl, generateQrDataUrl } from "@/services/qr-service";

type PhaseDigestSummary = {
  phaseName: string;
  responseCount: number;
  responses: Array<{
    submissionId: string;
    surveyVersionId: string;
    surveyLabel: string;
    surveyVersionNumber: number;
    monthYearLabel: string;
    sortSubmittedAt: string;
    answers: Array<{ prompt: string; value: string }>;
  }>;
};

type DigestPayload = {
  facultyId: string;
  facultyName: string;
  primaryEmail: string;
  publicToken: string;
  totalResponses: number;
  phaseSummaries: PhaseDigestSummary[];
  windowStart: Date;
  windowEnd: Date;
};

type DigestWindow = {
  windowStart: Date;
  windowEnd: Date;
};

const ENROLL_COLLEAGUE_URL = appUrl("/enroll");

function monthYearLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(date);
}

function parseNumericAnswer(value: Prisma.JsonValue): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function formatAnswerForDigest(type: QuestionType, value: Prisma.JsonValue): string | null {
  if (type === QuestionType.FREE_TEXT) {
    return typeof value === "string" && value.trim() ? value.trim() : null;
  }

  if (type === QuestionType.MULTI_SELECT) {
    if (!Array.isArray(value)) {
      return null;
    }

    const selected = value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0);
    return selected.length ? selected.join(", ") : null;
  }

  if (type === QuestionType.LIKERT || type === QuestionType.NUMERIC) {
    const numeric = parseNumericAnswer(value);
    return numeric === null ? null : String(numeric);
  }

  if (type === QuestionType.MULTIPLE_CHOICE) {
    return typeof value === "string" && value.trim() ? value.trim() : null;
  }

  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  return null;
}

export async function createEmailToken(facultyId: string, tokenType: EmailTokenType, ttlDays = 30): Promise<string> {
  const rawToken = generateOpaqueToken(32);
  const tokenHash = hashToken(rawToken);

  await prisma.emailToken.create({
    data: {
      facultyId,
      tokenType,
      tokenHash,
      expiresAt: new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000)
    }
  });

  return rawToken;
}

export async function consumeEmailToken(rawToken: string, tokenType: EmailTokenType) {
  const tokenHash = hashToken(rawToken);

  const token = await prisma.emailToken.findUnique({
    where: { tokenHash },
    include: { faculty: true }
  });

  if (!token) {
    throw new Error("Token not found");
  }

  if (token.tokenType !== tokenType) {
    throw new Error("Token type mismatch");
  }

  if (token.usedAt) {
    throw new Error("Token already used");
  }

  if (token.expiresAt < new Date()) {
    throw new Error("Token expired");
  }

  await prisma.emailToken.update({
    where: { id: token.id },
    data: { usedAt: new Date() }
  });

  return token.faculty;
}

export async function unsubscribeFaculty(rawToken: string) {
  const faculty = await consumeEmailToken(rawToken, EmailTokenType.UNSUBSCRIBE);

  await prisma.faculty.update({
    where: { id: faculty.id },
    data: { digestSubscriptionStatus: DigestSubscriptionStatus.UNSUBSCRIBED }
  });

  return faculty;
}

export async function resubscribeFaculty(rawToken: string) {
  const faculty = await consumeEmailToken(rawToken, EmailTokenType.RESUBSCRIBE);

  await prisma.faculty.update({
    where: { id: faculty.id },
    data: { digestSubscriptionStatus: DigestSubscriptionStatus.SUBSCRIBED }
  });

  return faculty;
}

async function getAutomatedDigestPlans(asOf = new Date()) {
  const candidates = await prisma.faculty.findMany({
    where: {
      activeStatus: true,
      digestSubscriptionStatus: DigestSubscriptionStatus.SUBSCRIBED
    },
    select: {
      id: true,
      createdAt: true,
      publicToken: true,
      digestHistory: {
        where: { runType: DigestRunType.AUTOMATED },
        orderBy: { sentAt: "desc" },
        take: 1,
        select: { sentAt: true }
      }
    }
  });

  const plans: Array<{ facultyId: string; windowStart: Date; windowEnd: Date; cycleDueAt: Date }> = [];

  for (const faculty of candidates) {
    const scheduledWindow = latestScheduledDigestWindow(faculty.createdAt, faculty.publicToken, asOf);
    if (!scheduledWindow) {
      continue;
    }

    const lastAutomatedDigest = faculty.digestHistory[0]?.sentAt ?? null;
    if (lastAutomatedDigest && lastAutomatedDigest >= scheduledWindow.cycleDueAt) {
      continue;
    }

    const recentSubmissionCount = await prisma.feedbackSubmission.count({
      where: {
        facultyId: faculty.id,
        submittedAt: {
          gte: scheduledWindow.windowStart,
          lte: scheduledWindow.windowEnd
        }
      }
    });

    if (recentSubmissionCount === 0) {
      continue;
    }

    plans.push({
      facultyId: faculty.id,
      windowStart: scheduledWindow.windowStart,
      windowEnd: scheduledWindow.windowEnd,
      cycleDueAt: scheduledWindow.cycleDueAt
    });
  }

  return plans;
}

async function buildDigestPayloadForFaculty(facultyId: string, window: DigestWindow): Promise<DigestPayload | null> {
  const faculty = await prisma.faculty.findUnique({
    where: { id: facultyId },
    include: {
      feedbackSubmissions: {
        where: {
          submittedAt: {
            gte: window.windowStart,
            lte: window.windowEnd
          }
        },
        include: {
          curriculumPhase: true,
          surveyVersion: {
            select: {
              id: true,
              label: true,
              versionNumber: true
            }
          },
          answers: {
            orderBy: { createdAt: "asc" }
          }
        },
        orderBy: { submittedAt: "desc" }
      }
    }
  });

  if (!faculty || faculty.feedbackSubmissions.length === 0) {
    return null;
  }

  const byPhase = new Map<
    string,
    {
      phaseName: string;
      phaseSortOrder: number;
      responses: PhaseDigestSummary["responses"];
    }
  >();

  for (const submission of faculty.feedbackSubmissions) {
    const phase = submission.curriculumPhase;
    const submittedDate = submission.submissionDate ?? submission.submittedAt;
    const surveyLabel =
      submission.surveyVersion.label?.trim() || `Survey v${submission.surveyVersion.versionNumber}`;

    if (!byPhase.has(phase.id)) {
      byPhase.set(phase.id, {
        phaseName: phase.name,
        phaseSortOrder: phase.sortOrder,
        responses: []
      });
    }

    const phaseBucket = byPhase.get(phase.id)!;
    const responseEntry: PhaseDigestSummary["responses"][number] = {
      submissionId: submission.id,
      surveyVersionId: submission.surveyVersionId,
      surveyLabel,
      surveyVersionNumber: submission.surveyVersion.versionNumber,
      monthYearLabel: monthYearLabel(submittedDate),
      sortSubmittedAt: submission.submittedAt.toISOString(),
      answers: []
    };

    for (const answer of submission.answers) {
      if (!answer.includeInDigestSnapshot) {
        continue;
      }

      const renderedValue = formatAnswerForDigest(answer.questionTypeSnapshot, answer.answerJson);
      if (!renderedValue) {
        continue;
      }

      responseEntry.answers.push({
        prompt: answer.questionPromptSnapshot,
        value: renderedValue
      });
    }

    phaseBucket.responses.push(responseEntry);
  }

  const phaseSummaries: PhaseDigestSummary[] = Array.from(byPhase.values())
    .sort((a, b) => a.phaseSortOrder - b.phaseSortOrder)
    .map((phaseData) => {
      const responses = [...phaseData.responses].sort((a, b) => b.sortSubmittedAt.localeCompare(a.sortSubmittedAt));
      return {
        phaseName: phaseData.phaseName,
        responseCount: responses.length,
        responses
      };
    });

  return {
    facultyId: faculty.id,
    facultyName: `${faculty.firstName} ${faculty.lastName}`,
    primaryEmail: faculty.primaryEmail,
    publicToken: faculty.publicToken,
    totalResponses: faculty.feedbackSubmissions.length,
    phaseSummaries,
    windowStart: window.windowStart,
    windowEnd: window.windowEnd
  };
}

function digestEmailHtml(payload: DigestPayload, unsubscribeUrl: string, resubscribeUrl: string, qrDataUrl: string) {
  const sections = payload.phaseSummaries
    .map((phase) => {
      const responseSections = phase.responses
        .map((response, index) => {
          const answers = response.answers
            .map((answer) => `<li><strong>${escapeHtml(answer.prompt)}</strong>: ${escapeHtml(answer.value)}</li>`)
            .join("");

          return `<div style="border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; margin-bottom: 12px;">
            <h4 style="margin: 0 0 4px 0;">Response ${index + 1}</h4>
            <p style="margin: 0 0 8px 0;">
              <strong>Survey:</strong> ${escapeHtml(response.surveyLabel)} (v${response.surveyVersionNumber})<br/>
              <strong>Completed:</strong> ${escapeHtml(response.monthYearLabel)}
            </p>
            <ul>${answers || "<li>No digest-visible answers</li>"}</ul>
          </div>`;
        })
        .join("");

      return `<h3>${escapeHtml(phase.phaseName)}</h3>
        <p><strong>Total responses for phase:</strong> ${phase.responseCount}</p>
        ${responseSections}`;
    })
    .join("<hr/>");

  return `<div style="font-family: Arial, sans-serif; color: #111; max-width: 760px;">
    <h2>Faculty Feedback Digest</h2>
    <p>Hello ${escapeHtml(payload.facultyName)},</p>
    <p>Here is your anonymized feedback digest covering the past ${DIGEST_WINDOW_MONTHS} months. Exact submission timestamps are intentionally omitted to preserve student anonymity.</p>
    <p><strong>Total responses in this digest:</strong> ${payload.totalResponses}</p>
    ${sections}
    <hr/>
    <p>Share your personalized QR code with students:</p>
    <img src="${qrDataUrl}" alt="Faculty QR code" style="width: 180px; height: 180px;" />
    <p>Direct feedback URL: <a href="${facultyFeedbackUrl(payload.publicToken)}">${facultyFeedbackUrl(payload.publicToken)}</a></p>
    <p>Know a colleague not yet enrolled? <a href="${ENROLL_COLLEAGUE_URL}">Enroll a colleague</a>.</p>
    <p><a href="${unsubscribeUrl}">Unsubscribe</a> | <a href="${resubscribeUrl}">Re-subscribe</a></p>
  </div>`;
}

function digestEmailText(payload: DigestPayload, unsubscribeUrl: string, resubscribeUrl: string) {
  const phaseText = payload.phaseSummaries
    .map((phase) => {
      const responseSections = phase.responses
        .map((response, index) => {
          const answers = response.answers.map((answer) => `- ${answer.prompt}: ${answer.value}`).join("\n");
          return [
            `Response ${index + 1}`,
            `Survey: ${response.surveyLabel} (v${response.surveyVersionNumber})`,
            `Completed: ${response.monthYearLabel}`,
            answers || "- No digest-visible answers"
          ].join("\n");
        })
        .join("\n\n");

      return `${phase.phaseName}\nTotal responses for phase: ${phase.responseCount}\n\n${responseSections}`;
    })
    .join("\n\n");

  return [
    `Faculty Feedback Digest for ${payload.facultyName}`,
    "",
    `This digest is anonymized and covers the past ${DIGEST_WINDOW_MONTHS} months.`,
    `Total responses in this digest: ${payload.totalResponses}`,
    "",
    phaseText,
    "",
    `Direct feedback URL: ${facultyFeedbackUrl(payload.publicToken)}`,
    `Enroll a colleague: ${ENROLL_COLLEAGUE_URL}`,
    `Unsubscribe: ${unsubscribeUrl}`,
    `Re-subscribe: ${resubscribeUrl}`
  ].join("\n");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function markSubmissionsAsDigested(
  facultyId: string,
  digestHistoryId: string,
  window: DigestWindow
): Promise<number> {
  const result = await prisma.feedbackSubmission.updateMany({
    where: {
      facultyId,
      submittedAt: {
        gte: window.windowStart,
        lte: window.windowEnd
      }
    },
    data: {
      digestedAt: new Date(),
      digestHistoryId
    }
  });

  return result.count;
}

function resolveDigestWindow(opts?: { windowStart?: Date; windowEnd?: Date }): DigestWindow {
  if (opts?.windowStart && opts?.windowEnd) {
    return {
      windowStart: opts.windowStart,
      windowEnd: opts.windowEnd
    };
  }

  return rollingDigestWindow();
}

export async function sendDigestForFaculty(
  facultyId: string,
  opts?: { runType?: DigestRunType; createdByAdminId?: string; windowStart?: Date; windowEnd?: Date }
) {
  const runType = opts?.runType ?? DigestRunType.AUTOMATED;
  const window = resolveDigestWindow(opts);
  const payload = await buildDigestPayloadForFaculty(facultyId, window);

  if (!payload) {
    return { sent: false, reason: `No feedback submitted in the last ${DIGEST_WINDOW_MONTHS} months` as const };
  }

  const [unsubscribeToken, resubscribeToken, qrDataUrl] = await Promise.all([
    createEmailToken(payload.facultyId, EmailTokenType.UNSUBSCRIBE),
    createEmailToken(payload.facultyId, EmailTokenType.RESUBSCRIBE),
    generateQrDataUrl(payload.publicToken)
  ]);

  const unsubscribeUrl = appUrl(`/api/digest/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`);
  const resubscribeUrl = appUrl(`/api/digest/resubscribe?token=${encodeURIComponent(resubscribeToken)}`);

  const subject = `Department of Medicine feedback digest (${payload.totalResponses} responses in the last ${DIGEST_WINDOW_MONTHS} months)`;
  const html = digestEmailHtml(payload, unsubscribeUrl, resubscribeUrl, qrDataUrl);
  const text = digestEmailText(payload, unsubscribeUrl, resubscribeUrl);

  let providerMessageId: string | null;
  try {
    providerMessageId = await sendTransactionalEmail({
      to: payload.primaryEmail,
      subject,
      html,
      text
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown email provider failure";
    return {
      sent: false,
      reason: `Email delivery failed: ${message}`
    };
  }

  const digestRow = await prisma.digestHistory.create({
    data: {
      facultyId: payload.facultyId,
      runType,
      windowStart: payload.windowStart,
      windowEnd: payload.windowEnd,
      submissionCount: payload.totalResponses,
      phaseSummary: payload.phaseSummaries,
      emailProviderMessageId: providerMessageId,
      createdByAdminId: opts?.createdByAdminId
    }
  });

  const markedCount =
    runType === DigestRunType.AUTOMATED
      ? await markSubmissionsAsDigested(payload.facultyId, digestRow.id, window)
      : payload.totalResponses;

  return {
    sent: true,
    digestHistoryId: digestRow.id,
    submissionCount: markedCount
  };
}

export async function runAutomatedDigestCycle() {
  const plans = await getAutomatedDigestPlans();
  const results: Array<{ facultyId: string; sent: boolean; reason?: string }> = [];

  for (const plan of plans) {
    try {
      const result = await sendDigestForFaculty(plan.facultyId, {
        runType: DigestRunType.AUTOMATED,
        windowStart: plan.windowStart,
        windowEnd: plan.windowEnd
      });

      if (result.sent) {
        results.push({ facultyId: plan.facultyId, sent: true });
      } else {
        results.push({ facultyId: plan.facultyId, sent: false, reason: result.reason });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown digest error";
      results.push({ facultyId: plan.facultyId, sent: false, reason: message });
    }
  }

  return {
    checkedFaculty: plans.length,
    sentCount: results.filter((entry) => entry.sent).length,
    results
  };
}

export async function previewDigestForFaculty(facultyId: string) {
  const payload = await buildDigestPayloadForFaculty(facultyId, rollingDigestWindow());
  if (!payload) {
    return null;
  }

  const unsubscribeUrl = appUrl("/digest/unsubscribe/preview");
  const resubscribeUrl = appUrl("/digest/resubscribe/preview");
  const qrDataUrl = await generateQrDataUrl(payload.publicToken);

  return {
    payload,
    html: digestEmailHtml(payload, unsubscribeUrl, resubscribeUrl, qrDataUrl),
    text: digestEmailText(payload, unsubscribeUrl, resubscribeUrl)
  };
}
