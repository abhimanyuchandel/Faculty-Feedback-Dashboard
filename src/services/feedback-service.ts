import { Prisma, QuestionType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { verifyCaptcha } from "@/lib/privacy/captcha";
import { redactPotentialPII } from "@/lib/privacy/redaction";
import { extractTargetPhaseIds, selectQuestionSetForPhase } from "@/lib/survey/question-config";

export type SubmissionInput = {
  facultyToken: string;
  curriculumPhaseId: string;
  surveyVersionId: string;
  teachingSessionId?: string;
  teachingSessionDate?: string;
  remoteIp?: string;
  captchaToken: string;
  answers: Array<{
    questionId: string;
    questionType: QuestionType;
    value: number | string | string[] | null;
  }>;
};

export type FeedbackFilters = {
  facultyId?: string;
  curriculumPhaseId?: string;
  location?: string;
  year?: number;
  fromDate?: Date;
  toDate?: Date;
  hasCompletedPrivateQuestion?: boolean;
};

function parseDateOnly(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const [year, month, day] = value.split("-").map((part) => Number(part));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() + 1 !== month ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  return parsed;
}

function requiresStudentSessionDate(phaseName: string): boolean {
  const normalized = phaseName.trim().toLowerCase();
  return (
    /\bics\b/.test(normalized) ||
    /\bicr\b/.test(normalized) ||
    normalized.includes("clinical skills") ||
    normalized.includes("clinical reasoning")
  );
}

export async function submitAnonymousFeedback(input: SubmissionInput) {
  const faculty = await prisma.faculty.findUnique({ where: { publicToken: input.facultyToken } });
  const surveyVersion = await prisma.surveyVersion.findUnique({ where: { id: input.surveyVersionId } });
  const curriculumPhase = await prisma.curriculumPhase.findUnique({ where: { id: input.curriculumPhaseId } });

  if (!faculty || !faculty.activeStatus) {
    throw new Error("Faculty is not available for submissions");
  }

  if (!surveyVersion) {
    throw new Error("Invalid survey version");
  }

  if (!curriculumPhase || !curriculumPhase.activeStatus) {
    throw new Error("Invalid curriculum phase");
  }

  const phaseRequiresStudentDate = requiresStudentSessionDate(curriculumPhase.name);
  let submissionDate = new Date();

  if (input.teachingSessionDate) {
    const parsedDate = parseDateOnly(input.teachingSessionDate);
    if (!parsedDate) {
      throw new Error("Invalid teaching session date");
    }
    submissionDate = parsedDate;
  }

  if (phaseRequiresStudentDate && !input.teachingSessionDate) {
    throw new Error("Teaching session date is required for ICS/ICR submissions");
  }

  let teachingSession:
    | {
        id: string;
        curriculumPhaseId: string;
        location: string;
        facultyAssignments: Array<{ facultyId: string }>;
      }
    | null = null;

  if (input.teachingSessionId) {
    teachingSession = await prisma.teachingSession.findFirst({
      where: {
        id: input.teachingSessionId,
        activeStatus: true
      },
      select: {
        id: true,
        curriculumPhaseId: true,
        location: true,
        facultyAssignments: {
          where: { facultyId: faculty.id },
          select: { facultyId: true }
        }
      }
    });

    if (!teachingSession) {
      throw new Error("Selected teaching session was not found");
    }

    if (teachingSession.curriculumPhaseId !== curriculumPhase.id) {
      throw new Error("Selected teaching session does not match the chosen curriculum phase");
    }

    if (teachingSession.facultyAssignments.length === 0) {
      throw new Error("Selected teaching session is not assigned to this faculty member");
    }
  }

  const captcha = await verifyCaptcha(input.captchaToken, input.remoteIp);
  if (!captcha.success) {
    throw new Error("Captcha verification failed");
  }

  const questions = await prisma.surveyQuestion.findMany({
    where: {
      surveyVersionId: surveyVersion.id,
      activeStatus: true
    },
    include: {
      options: {
        where: { activeStatus: true }
      }
    }
  });

  const applicableQuestions = selectQuestionSetForPhase(
    questions,
    curriculumPhase.id,
    (question) => extractTargetPhaseIds(question.config)
  );

  const questionById = new Map(applicableQuestions.map((question) => [question.id, question]));

  for (const answer of input.answers) {
    if (!questionById.has(answer.questionId)) {
      throw new Error("Question is not available for the selected curriculum phase");
    }
  }

  const requiredQuestionIds = applicableQuestions.filter((q) => q.required).map((q) => q.id);
  const answeredQuestionIds = new Set(input.answers.map((answer) => answer.questionId));

  for (const requiredId of requiredQuestionIds) {
    if (!answeredQuestionIds.has(requiredId)) {
      throw new Error("Required question missing");
    }
  }

  const submission = await prisma.feedbackSubmission.create({
    data: {
      facultyId: faculty.id,
      surveyVersionId: surveyVersion.id,
      curriculumPhaseId: curriculumPhase.id,
      submissionDate,
      teachingSessionId: teachingSession?.id ?? null,
      sessionLocationSnapshot: teachingSession?.location ?? null,
      captchaScore: captcha.score ?? null,
      answers: {
        create: input.answers.map((answer) => {
          const question = questionById.get(answer.questionId);
          if (!question) {
            throw new Error(`Question not found: ${answer.questionId}`);
          }

          const value =
            typeof answer.value === "string" && question.type === "FREE_TEXT"
              ? redactPotentialPII(answer.value)
              : answer.value;

          const answerJson = value === null ? Prisma.JsonNull : (value as Prisma.InputJsonValue);

          return {
            questionId: question.id,
            questionPromptSnapshot: question.prompt,
            questionTypeSnapshot: question.type,
            includeInDigestSnapshot: question.includeInDigest,
            answerJson
          };
        })
      }
    }
  });

  return {
    submissionId: submission.id
  };
}

export async function getFeedbackOverview(filters?: FeedbackFilters) {
  const baseWhere = buildBaseWhere(filters);
  const privateSubmissionIds = await findSubmissionIdsWithCompletedPrivateAnswers(baseWhere);
  const submissionWhere = applyPrivateQuestionFilter(baseWhere, filters, privateSubmissionIds);

  const [submissionsForReport, recentSubmissionsRaw, phases, faculty] = await Promise.all([
    prisma.feedbackSubmission.findMany({
      where: submissionWhere,
      orderBy: { submittedAt: "desc" },
      include: {
        faculty: {
          select: { id: true, firstName: true, lastName: true, primaryEmail: true }
        },
        curriculumPhase: {
          select: { id: true, name: true }
        },
        teachingSession: {
          select: { id: true, title: true, location: true }
        },
        answers: {
          select: {
            includeInDigestSnapshot: true,
            answerJson: true
          }
        }
      }
    }),
    prisma.feedbackSubmission.findMany({
      where: submissionWhere,
      orderBy: { submittedAt: "desc" },
      take: 15,
      include: {
        faculty: {
          select: { id: true, firstName: true, lastName: true, primaryEmail: true }
        },
        curriculumPhase: {
          select: { id: true, name: true }
        },
        teachingSession: {
          select: { id: true, title: true, location: true }
        },
        answers: true
      }
    }),
    prisma.curriculumPhase.findMany({
      where: { activeStatus: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true }
    }),
    prisma.faculty.findMany({
      where: { activeStatus: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: { id: true, firstName: true, lastName: true, primaryEmail: true }
    })
  ]);

  const byPhaseMap = new Map<string, { curriculumPhaseId: string; phaseName: string; count: number }>();
  const byLocationMap = new Map<string, number>();
  const byYearMap = new Map<number, number>();
  const breakdownMap = new Map<
    string,
    {
      year: number;
      curriculumPhaseId: string;
      curriculumPhaseName: string;
      submissionCount: number;
      privateSubmissionCount: number;
    }
  >();

  for (const submission of submissionsForReport) {
    const location = submissionLocation(submission);
    const year = submission.submissionDate.getUTCFullYear();
    const phaseKey = submission.curriculumPhase.id;
    const hasCompletedPrivateQuestion = submission.answers.some(
      (answer) => !answer.includeInDigestSnapshot && hasMeaningfulAnswer(answer.answerJson)
    );

    byLocationMap.set(location, (byLocationMap.get(location) ?? 0) + 1);
    byYearMap.set(year, (byYearMap.get(year) ?? 0) + 1);

    const existingPhase = byPhaseMap.get(phaseKey);
    if (existingPhase) {
      existingPhase.count += 1;
    } else {
      byPhaseMap.set(phaseKey, {
        curriculumPhaseId: submission.curriculumPhase.id,
        phaseName: submission.curriculumPhase.name,
        count: 1
      });
    }

    const breakdownKey = [year, submission.curriculumPhase.id].join("|");

    const existingBreakdown = breakdownMap.get(breakdownKey);
    if (existingBreakdown) {
      existingBreakdown.submissionCount += 1;
      if (hasCompletedPrivateQuestion) {
        existingBreakdown.privateSubmissionCount += 1;
      }
    } else {
      breakdownMap.set(breakdownKey, {
        year,
        curriculumPhaseId: submission.curriculumPhase.id,
        curriculumPhaseName: submission.curriculumPhase.name,
        submissionCount: 1,
        privateSubmissionCount: hasCompletedPrivateQuestion ? 1 : 0
      });
    }
  }

  return {
    count: submissionsForReport.length,
    byPhase: [...byPhaseMap.values()].sort((a, b) => a.phaseName.localeCompare(b.phaseName)),
    byLocation: [...byLocationMap.entries()]
      .map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count || a.location.localeCompare(b.location)),
    byYear: [...byYearMap.entries()]
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => b.year - a.year),
    breakdown: [...breakdownMap.values()].sort(
      (a, b) =>
        b.year - a.year ||
        a.curriculumPhaseName.localeCompare(b.curriculumPhaseName)
    ),
    filters: {
      faculty: faculty.map((entry) => ({
        id: entry.id,
        name: `${entry.firstName} ${entry.lastName}`,
        primaryEmail: entry.primaryEmail
      })),
      curriculumPhases: phases,
      locations: [...byLocationMap.keys()].sort((a, b) => a.localeCompare(b)),
      years: [...byYearMap.keys()].sort((a, b) => b - a)
    },
    recentSubmissions: recentSubmissionsRaw.map((submission) => ({
      ...submission,
      year: submission.submissionDate.getUTCFullYear()
    }))
  };
}

export async function getFeedbackExportRows(filters?: FeedbackFilters) {
  const baseWhere = buildBaseWhere(filters);
  const privateSubmissionIds = filters?.hasCompletedPrivateQuestion
    ? await findSubmissionIdsWithCompletedPrivateAnswers(baseWhere)
    : new Set<string>();
  const submissionWhere = applyPrivateQuestionFilter(baseWhere, filters, privateSubmissionIds);

  const submissions = await prisma.feedbackSubmission.findMany({
    where: submissionWhere,
    orderBy: [{ submissionDate: "desc" }, { submittedAt: "desc" }],
    include: {
      faculty: {
        select: { firstName: true, lastName: true, primaryEmail: true }
      },
      curriculumPhase: {
        select: { name: true }
      },
      teachingSession: {
        select: { location: true }
      },
      answers: {
        orderBy: { createdAt: "asc" }
      }
    }
  });

  return submissions.flatMap((submission) => {
    const location = submissionLocation(submission);
    const submissionDate = submission.submissionDate.toISOString().slice(0, 10);
    const facultyName = `${submission.faculty.firstName} ${submission.faculty.lastName}`;

    return submission.answers.map((answer) => ({
      submissionId: submission.id,
      submissionDate,
      year: submission.submissionDate.getUTCFullYear(),
      facultyName,
      facultyEmail: submission.faculty.primaryEmail,
      curriculumPhaseName: submission.curriculumPhase.name,
      location,
      questionPrompt: answer.questionPromptSnapshot,
      questionType: answer.questionTypeSnapshot,
      includeInDigest: answer.includeInDigestSnapshot,
      answerValue: answerToText(answer.answerJson)
    }));
  });
}

function buildBaseWhere(filters?: FeedbackFilters): Prisma.FeedbackSubmissionWhereInput {
  if (!filters) {
    return {};
  }

  const conditions: Prisma.FeedbackSubmissionWhereInput[] = [];

  if (filters.facultyId) {
    conditions.push({ facultyId: filters.facultyId });
  }

  if (filters.curriculumPhaseId) {
    conditions.push({ curriculumPhaseId: filters.curriculumPhaseId });
  }

  const dateFilter = buildDateFilter(filters);
  if (dateFilter) {
    conditions.push({ submissionDate: dateFilter });
  }

  if (filters.location) {
    conditions.push({
      OR: [
        { sessionLocationSnapshot: filters.location },
        { teachingSession: { is: { location: filters.location } } }
      ]
    });
  }

  if (!conditions.length) {
    return {};
  }

  return { AND: conditions };
}

function applyPrivateQuestionFilter(
  baseWhere: Prisma.FeedbackSubmissionWhereInput,
  filters: FeedbackFilters | undefined,
  privateSubmissionIds: Set<string>
): Prisma.FeedbackSubmissionWhereInput {
  if (!filters?.hasCompletedPrivateQuestion) {
    return baseWhere;
  }

  const matchingIds = [...privateSubmissionIds];
  if (matchingIds.length === 0) {
    return { id: { in: [] } };
  }

  if (Object.keys(baseWhere).length === 0) {
    return { id: { in: matchingIds } };
  }

  return {
    AND: [baseWhere, { id: { in: matchingIds } }]
  };
}

function buildDateFilter(filters: FeedbackFilters) {
  let gte = filters.fromDate ? startOfDay(filters.fromDate) : undefined;
  let lte = filters.toDate ? endOfDay(filters.toDate) : undefined;

  if (filters.year) {
    const yearStart = new Date(Date.UTC(filters.year, 0, 1));
    const yearEnd = new Date(Date.UTC(filters.year, 11, 31, 23, 59, 59, 999));
    gte = !gte || gte < yearStart ? yearStart : gte;
    lte = !lte || lte > yearEnd ? yearEnd : lte;
  }

  if (!gte && !lte) {
    return undefined;
  }

  return {
    ...(gte ? { gte } : {}),
    ...(lte ? { lte } : {})
  };
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function endOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function submissionLocation(submission: {
  sessionLocationSnapshot: string | null;
  teachingSession: { location: string } | null;
}) {
  return submission.sessionLocationSnapshot ?? submission.teachingSession?.location ?? "Unspecified";
}

function answerToText(value: Prisma.JsonValue): string {
  if (value === null) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map((entry) => (entry == null ? "" : String(entry))).join(" | ");
  }

  return JSON.stringify(value);
}

async function findSubmissionIdsWithCompletedPrivateAnswers(where: Prisma.FeedbackSubmissionWhereInput) {
  const answers = await prisma.feedbackAnswer.findMany({
    where: {
      includeInDigestSnapshot: false,
      submission: {
        is: where
      }
    },
    select: {
      submissionId: true,
      answerJson: true
    }
  });

  const submissionIds = new Set<string>();
  for (const answer of answers) {
    if (hasMeaningfulAnswer(answer.answerJson)) {
      submissionIds.add(answer.submissionId);
    }
  }

  return submissionIds;
}

function hasMeaningfulAnswer(value: Prisma.JsonValue): boolean {
  if (value === null) {
    return false;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return true;
  }

  if (Array.isArray(value)) {
    return value.some((entry) => {
      if (entry === null) {
        return false;
      }

      if (typeof entry === "string") {
        return entry.trim().length > 0;
      }

      return true;
    });
  }

  return Object.keys(value).length > 0;
}
